import { createHmac, timingSafeEqual } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";

export const chunkSize = 2 * 1024 * 1024;
export const fileLimit = 30 * 1024 * 1024;
export const jsonLimit = 40 * 1024 * 1024;
const cookieName = "nexopen_cloud_test";
const lifetime = 8 * 60 * 60;

export class CloudFailure extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function serverConfig(env) {
  const mode =
    env.NEXOPEN_ACCESS_MODE === "accounts" ? "accounts" : "direct-cloud";
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/, "");
  const secret = (
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  ).trim();
  const accessKey = (env.NEXOPEN_TEST_ACCESS_KEY || "").trim();
  const missing = [];
  try {
    const parsed = new URL(url);
    if (
      (parsed.protocol !== "https:" &&
        !(
          parsed.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(parsed.hostname)
        )) ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      parsed.username ||
      parsed.password
    )
      throw Error();
  } catch {
    missing.push("SUPABASE_URL");
  }
  let privileged = secret.startsWith("sb_secret_");
  if (!privileged && secret.split(".").length === 3) {
    try {
      privileged =
        JSON.parse(Buffer.from(secret.split(".")[1], "base64url").toString())
          .role === "service_role";
    } catch {
      /* invalid key */
    }
  }
  if (!privileged) missing.push("SUPABASE_SECRET_KEY");
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(accessKey))
    missing.push("NEXOPEN_TEST_ACCESS_KEY");
  return { mode, url, secret, accessKey, missing };
}
function equal(a, b) {
  const left = Buffer.from(a || ""),
    right = Buffer.from(b || "");
  return left.length === right.length && timingSafeEqual(left, right);
}
export function validAccessKey(value, config) {
  return equal(value, config.accessKey);
}
function signature(payload, config) {
  return createHmac("sha256", config.accessKey)
    .update(`nexopen-test:${payload}`)
    .digest("base64url");
}
export function validCookie(cookie, config, now = Date.now()) {
  const token =
    (cookie || "")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1) || "";
  const [expiry, mac, extra] = token.split(".");
  return (
    !extra &&
    /^\d+$/.test(expiry || "") &&
    Number(expiry) > Math.floor(now / 1000) &&
    equal(mac, signature(expiry, config))
  );
}
export function sessionCookie(config, secure, clear = false, now = Date.now()) {
  const expiry = String(Math.floor(now / 1000) + lifetime);
  return `${cookieName}=${clear ? "" : `${expiry}.${signature(expiry, config)}`}; Path=/api/cloud; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : lifetime}${secure ? "; Secure" : ""}`;
}
export function requireSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || new URL(origin).host !== req.headers.host)
    throw new CloudFailure(403, "Solicitação de outra origem recusada.");
}
export function scopedPath(value, workspace, transport = true) {
  const pattern = transport
    ? /^[0-9a-f-]{36}\/(?:_transport\/)?[0-9a-f]{64}$/
    : /^[0-9a-f-]{36}\/[0-9a-f]{64}$/;
  if (
    typeof value !== "string" ||
    !pattern.test(value) ||
    !value.startsWith(`${workspace}/`)
  )
    throw new CloudFailure(403, "Arquivo fora do escritório de testes.");
  return value;
}
export async function readBody(req, max = chunkSize + 1024) {
  let body;
  if (req.body !== undefined)
    body = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(
          typeof req.body === "string" ? req.body : JSON.stringify(req.body),
        );
  else {
    const parts = [];
    let size = 0;
    for await (const part of req) {
      size += part.length;
      if (size > max)
        throw new CloudFailure(413, "Envio maior que o limite permitido.");
      parts.push(Buffer.from(part));
    }
    body = Buffer.concat(parts);
  }
  if (body.length > max)
    throw new CloudFailure(413, "Envio maior que o limite permitido.");
  return body;
}
export async function readJson(req) {
  try {
    let bytes = await readBody(req, 3 * 1024 * 1024);
    if (req.headers["x-nexopen-body-encoding"] === "gzip")
      bytes = gunzipSync(bytes, { maxOutputLength: jsonLimit });
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    if (error instanceof CloudFailure) throw error;
    throw new CloudFailure(400, "Conteúdo de envio inválido.");
  }
}
export function sendJson(res, status, data) {
  const body = Buffer.from(JSON.stringify(data));
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, private");
  if (body.length > 128 * 1024) {
    res.setHeader("Content-Encoding", "gzip");
    res.end(gzipSync(body));
  } else res.end(body);
}
