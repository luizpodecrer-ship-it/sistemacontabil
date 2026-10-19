import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { createCloudHandler } from "../server/cloud-handler.mjs";
import {
  serverConfig,
  sessionCookie,
  validCookie,
  chunkSize,
} from "../server/cloud-access.mjs";
import {
  fixture,
  env,
  testAccess,
  testSecret,
  workspace,
} from "./support/direct-cloud.mjs";

test("Servidor de testes: sessão privada, CSRF, escopo, anexos grandes e falhas sem fallback", async (t) => {
  const mock = fixture();
  let provisions = 0;
  const handler = createCloudHandler(env, {
    fetch: mock.fetch,
    getOwner: async () => {
      provisions++;
      return mock.context;
    },
  });
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address() as { port: number };
  const base = `http://127.0.0.1:${address.port}`;
  const call = (path: string, init: RequestInit = {}) =>
    fetch(base + "/api/cloud/" + path, init);
  const status = await (await call("status")).json();
  assert.equal(status.mode, "direct-cloud");
  assert.equal(status.configured, true);
  assert.equal((await call("rest/v1/companies")).status, 401);
  assert.equal(
    (await call("session", { method: "POST", headers: { Origin: base } }))
      .status,
    401,
  );
  assert.equal(
    provisions,
    0,
    "invalid private links must not provision an account",
  );
  assert.equal(
    (
      await call("session", {
        method: "POST",
        headers: {
          Origin: "https://foreign.invalid",
          Authorization: `Bearer ${testAccess}`,
        },
      })
    ).status,
    403,
  );
  const session = await call("session", {
    method: "POST",
    headers: { Origin: base, Authorization: `Bearer ${testAccess}` },
  });
  assert.equal(session.status, 200);
  const cookie = session.headers.get("set-cookie")!.split(";")[0];
  assert.match(session.headers.get("set-cookie")!, /HttpOnly/);
  assert.match(session.headers.get("set-cookie")!, /SameSite=Strict/);
  const payload = await session.text();
  assert.ok(!payload.includes(testSecret));
  assert.ok(!payload.includes(mock.context.token));
  const headers = { Cookie: cookie, Origin: base };
  assert.equal(
    (await call("auth/v1/admin/users", { method: "POST", headers })).status,
    403,
  );
  assert.equal(
    (
      await call("rest/v1/rpc/prepare_cloud_test_owner", {
        method: "POST",
        headers,
      })
    ).status,
    403,
  );
  assert.equal((await call("rest/v1/companies", { headers })).status, 200);
  const rewritten = await fetch(
    base + "/api/cloud?__nexopen_path=rest%2Fv1%2Fcompanies&select=payload",
    { headers },
  );
  assert.equal(
    rewritten.status,
    200,
    "Vercel rewrite must reach nested REST routes",
  );
  assert.equal(
    mock.state.requests.at(-1)!.query,
    "?select=payload",
    "internal routing parameter must not reach PostgREST",
  );
  const forwarded = mock.state.requests.at(-1)!;
  assert.equal(forwarded.auth, `Bearer ${mock.context.token}`);
  assert.equal(forwarded.apikey, testSecret);
  assert.equal(
    (
      await call("rest/v1/rpc/save_company", {
        method: "POST",
        headers: { Cookie: cookie },
        body: "{}",
      })
    ).status,
    403,
  );
  const data = randomBytes(3 * 1024 * 1024 + 37);
  const path =
    workspace + "/" + createHash("sha256").update(data).digest("hex");
  for (let part = 0; part < Math.ceil(data.length / chunkSize); part++)
    assert.equal(
      (
        await call(`files/part?path=${path}&part=${part}`, {
          method: "POST",
          headers,
          body: data.subarray(part * chunkSize, (part + 1) * chunkSize),
        })
      ).status,
      200,
    );
  assert.equal(
    (
      await call(`files/finish?path=${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          size: data.length,
          type: "application/octet-stream",
        }),
      })
    ).status,
    200,
  );
  assert.ok(mock.files.get(path)!.equals(data));
  assert.equal(
    [...mock.files.keys()].some((k) => k.includes("/_parts/")),
    false,
  );
  const parts: Buffer[] = [];
  for (let part = 0; part < Math.ceil(data.length / chunkSize); part++)
    parts.push(
      Buffer.from(
        await (
          await call(`files/data?path=${path}&part=${part}`, { headers })
        ).arrayBuffer(),
      ),
    );
  assert.ok(Buffer.concat(parts).equals(data));
  assert.equal(
    (
      await call(
        `files/meta?path=${path.replace(workspace, "22222222-2222-4222-8222-222222222222")}`,
        { headers },
      )
    ).status,
    403,
  );
  const body = {
    expected_revision: 0,
    body: {
      revision: 1,
      items: [{ name: "Cargo importado" }],
      padding: "á".repeat(600000),
    },
  };
  const saved = await call("rest/v1/rpc/save_operational_state", {
    method: "POST",
    headers: { ...headers, "X-Nexopen-Body-Encoding": "gzip" },
    body: gzipSync(JSON.stringify(body)),
  });
  assert.equal(saved.status, 200);
  assert.equal(mock.state.operation.items[0].name, "Cargo importado");
  mock.state.fail = true;
  assert.equal(
    (await call("rest/v1/operational_state", { headers })).status,
    503,
  );
  const end = await call("session?action=end", { method: "POST", headers });
  assert.match(end.headers.get("set-cookie")!, /Max-Age=0/);
  const cfg = serverConfig(env);
  const issued = sessionCookie(cfg, true, false, 1000000);
  assert.equal(validCookie(issued, cfg, 1000000), true);
  assert.equal(validCookie(issued, cfg, 1000000 + 9 * 3600000), false);
  assert.equal(
    validCookie(issued, { ...cfg, accessKey: "new-key" }, 1000000),
    false,
  );
});

test("Dados maiores que o corpo Vercel: resposta e envio por transporte privado em partes", async (t) => {
  const mock = fixture();
  const huge = randomBytes(5 * 1024 * 1024).toString("base64");
  mock.state.operation = { huge };
  const server = createServer(createCloudHandler(env, mock));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/cloud/`;
  const headers = {
    Cookie: sessionCookie(serverConfig(env), false).split(";")[0],
    Origin: new URL(base).origin,
  };
  const result = await fetch(base + "rest/v1/operational_state", { headers });
  const pointer = result.headers.get("X-Nexopen-Response-File")!;
  assert.ok(pointer.startsWith(workspace + "/_transport/"));
  assert.equal(
    JSON.parse(gunzipSync(mock.files.get(pointer)!).toString()).payload.huge,
    huge,
  );
  const zipped = gzipSync(
    JSON.stringify({ expected_revision: 0, body: { revision: 1, huge } }),
  );
  const path =
    workspace +
    "/_transport/" +
    createHash("sha256").update(zipped).digest("hex");
  mock.files.set(path, zipped);
  mock.state.operation = null;
  const saved = await fetch(base + "rest/v1/rpc/save_operational_state", {
    method: "POST",
    headers: { ...headers, "X-Nexopen-Json-File": path },
    body: "",
  });
  assert.equal(saved.status, 200);
  assert.equal(mock.state.operation.huge, huge);
  assert.equal(mock.files.has(path), false);
});
