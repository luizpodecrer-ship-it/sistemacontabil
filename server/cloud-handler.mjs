import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import {
  CloudFailure,
  jsonLimit,
  readJson,
  requireSameOrigin,
  sendJson,
  serverConfig,
  sessionCookie,
  validAccessKey,
  validCookie,
} from "./cloud-access.mjs";
import { createOwnerProvider } from "./cloud-owner.mjs";
import {
  cleanTransport,
  handleFiles,
  readPrivateFile,
  storeTransport,
  upstreamHeaders,
} from "./cloud-files.mjs";

const functions = new Set([
  "ensure_own_workspace",
  "get_workspace_brand",
  "get_platform_brand",
  "is_platform_admin",
  "platform_branding_version",
  "save_workspace_brand",
  "save_platform_brand",
  "save_company",
  "save_operational_state",
  "import_companies",
  "restore_workspace_backup",
]);
function allowedRoute(route, method) {
  if (
    method === "GET" &&
    ["rest/v1/companies", "rest/v1/operational_state"].includes(route)
  )
    return true;
  return (
    method === "POST" &&
    route.startsWith("rest/v1/rpc/") &&
    functions.has(route.slice("rest/v1/rpc/".length))
  );
}

export function createCloudHandler(env = process.env, dependencies = {}) {
  let ownerProvider, providerKey;
  const request = dependencies.fetch || fetch;
  return async function cloudHandler(req, res) {
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Vary", "Cookie");
    try {
      const config = serverConfig(env);
      const incoming = new URL(
        req.url,
        `https://${req.headers.host || "localhost"}`,
      );
      const route = incoming.pathname.startsWith("/api/cloud/")
        ? incoming.pathname.slice("/api/cloud/".length)
        : "";
      if (route === "status" && req.method === "GET")
        return sendJson(res, 200, {
          mode: config.mode,
          configured: !config.missing.length,
          missing: config.missing,
          session:
            !config.missing.length && validCookie(req.headers.cookie, config),
        });
      if (config.mode !== "direct-cloud")
        throw new CloudFailure(404, "Acesso direto não ativado.");
      if (config.missing.length)
        throw new CloudFailure(
          503,
          `Configure no servidor: ${config.missing.join(", ")}.`,
        );
      if (!["GET", "POST"].includes(req.method))
        throw new CloudFailure(405, "Método não permitido.");
      if (req.method === "POST") requireSameOrigin(req);
      const cookieValid = validCookie(req.headers.cookie, config);
      const secure =
        env.VERCEL === "1" || req.headers["x-forwarded-proto"] === "https";
      if (
        route === "session" &&
        req.method === "POST" &&
        incoming.searchParams.get("action") === "end"
      ) {
        res.setHeader("Set-Cookie", sessionCookie(config, secure, true));
        return sendJson(res, 200, { ended: true });
      }
      if (route === "session" && req.method === "POST") {
        const supplied = (req.headers.authorization || "").replace(
          /^Bearer /,
          "",
        );
        if (!cookieValid && !validAccessKey(supplied, config))
          throw new CloudFailure(
            401,
            "Abra o link privado do ambiente de testes para entrar.",
          );
      } else if (!cookieValid)
        throw new CloudFailure(
          401,
          "O acesso ao ambiente de testes expirou. Abra novamente seu link privado.",
        );
      const key = createHash("sha256")
        .update(`${config.url}\n${config.secret}\n${config.accessKey}`)
        .digest("hex");
      if (!ownerProvider || key !== providerKey) {
        ownerProvider = dependencies.getOwner || createOwnerProvider(config);
        providerKey = key;
      }
      const context = await ownerProvider();
      if (route === "session" && req.method === "POST") {
        res.setHeader("Set-Cookie", sessionCookie(config, secure));
        return sendJson(res, 200, {
          ready: true,
          workspace: context.workspace,
        });
      }
      if (route.startsWith("files/"))
        return await handleFiles(
          req,
          res,
          route,
          incoming.searchParams,
          config,
          context,
          request,
        );
      if (!allowedRoute(route, req.method))
        throw new CloudFailure(
          403,
          "Operação não permitida no ambiente de testes.",
        );
      const headers = {
        ...upstreamHeaders(config, context),
        "Content-Type": "application/json",
      };
      for (const name of ["accept", "prefer", "range", "range-unit"])
        if (req.headers[name]) headers[name] = req.headers[name];
      let body, staged;
      if (req.method === "POST") {
        staged = req.headers["x-nexopen-json-file"];
        if (staged) {
          if (!staged.startsWith(`${context.workspace}/_transport/`))
            throw new CloudFailure(403, "Transferência inválida.");
          try {
            body = gunzipSync(
              await readPrivateFile(config, context, staged, request),
              { maxOutputLength: jsonLimit },
            ).toString();
            JSON.parse(body);
          } catch {
            throw new CloudFailure(400, "Transferência de dados inválida.");
          }
        } else body = JSON.stringify(await readJson(req));
      }
      let upstream;
      try {
        upstream = await request(`${config.url}/${route}${incoming.search}`, {
          method: req.method,
          headers,
          body,
        });
      } finally {
        if (staged) await cleanTransport(context, staged).catch(() => {});
      }
      const bytes = Buffer.from(await upstream.arrayBuffer());
      if (bytes.length > jsonLimit)
        throw new CloudFailure(
          413,
          "O conjunto de dados ultrapassou o limite de transferência. Contate a administração.",
        );
      res.statusCode = upstream.status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      if (upstream.headers.get("content-range"))
        res.setHeader("Content-Range", upstream.headers.get("content-range"));
      if (bytes.length > 128 * 1024) {
        const compressed = gzipSync(bytes);
        if (compressed.length > 3 * 1024 * 1024) {
          const path = await storeTransport(context, compressed);
          res.setHeader("X-Nexopen-Response-File", path);
          return res.end("{}");
        }
        res.setHeader("Content-Encoding", "gzip");
        return res.end(compressed);
      }
      res.end(bytes);
    } catch (error) {
      const known = error instanceof CloudFailure;
      sendJson(res, known ? error.status : 503, {
        message: known
          ? error.message
          : "Não foi possível concluir a operação na nuvem. Tente novamente; nenhum dado foi salvo no navegador.",
      });
    }
  };
}
