import { createHash } from "node:crypto";
import {
  CloudFailure,
  chunkSize,
  fileLimit,
  readBody,
  readJson,
  scopedPath,
  sendJson,
} from "./cloud-access.mjs";
const bucket = "workspace-files";

export function storageUrl(config, path) {
  return `${config.url}/storage/v1/object/authenticated/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
export function upstreamHeaders(config, context) {
  return { apikey: config.secret, Authorization: `Bearer ${context.token}` };
}
export async function readPrivateFile(config, context, path, request = fetch) {
  scopedPath(path, context.workspace);
  const response = await request(storageUrl(config, path), {
    headers: upstreamHeaders(config, context),
  });
  if (!response.ok)
    throw new CloudFailure(
      502,
      "Não foi possível ler o arquivo privado na nuvem.",
    );
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > fileLimit)
    throw new CloudFailure(413, "Arquivo maior que 30 MB.");
  return bytes;
}
export async function storeTransport(context, bytes) {
  const hash = createHash("sha256").update(bytes).digest("hex");
  const path = `${context.workspace}/_transport/${hash}`;
  const result = await context.admin.storage
    .from(bucket)
    .upload(path, bytes, { upsert: true, contentType: "application/gzip" });
  if (result.error)
    throw new CloudFailure(
      502,
      "Não foi possível preparar a transferência na nuvem.",
    );
  return path;
}
export async function cleanTransport(context, path) {
  scopedPath(path, context.workspace);
  if (path.startsWith(`${context.workspace}/_transport/`))
    await context.admin.storage.from(bucket).remove([path]);
}
export async function handleFiles(
  req,
  res,
  route,
  query,
  config,
  context,
  request = fetch,
) {
  const path = scopedPath(query.get("path"), context.workspace);
  const url = storageUrl(config, path);
  const headers = upstreamHeaders(config, context);
  if (route === "files/meta" && req.method === "GET") {
    const response = await request(url, { method: "HEAD", headers });
    if (!response.ok)
      throw new CloudFailure(
        response.status === 404 ? 404 : 502,
        "Não foi possível consultar o arquivo privado.",
      );
    const size = Number(response.headers.get("content-length"));
    if (!Number.isSafeInteger(size) || size < 0 || size > fileLimit)
      throw new CloudFailure(413, "Arquivo maior que o limite de 30 MB.");
    return sendJson(res, 200, { size });
  }
  if (route === "files/data" && req.method === "GET") {
    const part = Number(query.get("part"));
    if (
      !Number.isSafeInteger(part) ||
      part < 0 ||
      part >= Math.ceil(fileLimit / chunkSize)
    )
      throw new CloudFailure(400, "Parte de arquivo inválida.");
    const start = part * chunkSize;
    const response = await request(url, {
      headers: { ...headers, Range: `bytes=${start}-${start + chunkSize - 1}` },
    });
    if (!response.ok)
      throw new CloudFailure(502, "Não foi possível baixar o arquivo privado.");
    let bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > fileLimit)
      throw new CloudFailure(413, "Arquivo maior que o limite permitido.");
    if (response.status !== 206)
      bytes = bytes.subarray(start, start + chunkSize);
    if (bytes.length > chunkSize)
      throw new CloudFailure(502, "Resposta de arquivo inválida.");
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "no-store, private");
    return res.end(bytes);
  }
  if (route === "files/part" && req.method === "POST") {
    const part = Number(query.get("part"));
    if (
      !Number.isSafeInteger(part) ||
      part < 0 ||
      part >= Math.ceil(fileLimit / chunkSize)
    )
      throw new CloudFailure(400, "Parte de arquivo inválida.");
    const bytes = await readBody(req, chunkSize);
    const temporary = `${context.workspace}/_parts/${path.slice(context.workspace.length + 1).replaceAll("/", "-")}/${part}`;
    const result = await context.admin.storage
      .from(bucket)
      .upload(temporary, bytes, {
        upsert: true,
        contentType: "application/octet-stream",
      });
    if (result.error)
      throw new CloudFailure(
        502,
        "Não foi possível enviar uma parte do arquivo à nuvem.",
      );
    return sendJson(res, 200, { uploaded: true });
  }
  if (route === "files/finish" && req.method === "POST") {
    const { size, type } = await readJson(req);
    if (
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > fileLimit ||
      typeof type !== "string" ||
      type.length > 150
    )
      throw new CloudFailure(400, "Metadados de arquivo inválidos.");
    const parts = [];
    const temporaryPaths = [];
    for (let part = 0; part < Math.ceil(size / chunkSize); part++) {
      const temporary = `${context.workspace}/_parts/${path.slice(context.workspace.length + 1).replaceAll("/", "-")}/${part}`;
      const result = await context.admin.storage
        .from(bucket)
        .download(temporary);
      if (result.error)
        throw new CloudFailure(
          502,
          "Arquivo incompleto. Tente o envio novamente.",
        );
      const bytes = Buffer.from(await result.data.arrayBuffer());
      if (bytes.length !== Math.min(chunkSize, size - part * chunkSize))
        throw new CloudFailure(400, "Parte de arquivo inconsistente.");
      parts.push(bytes);
      temporaryPaths.push(temporary);
    }
    const bytes = Buffer.concat(parts);
    if (
      createHash("sha256").update(bytes).digest("hex") !==
      path.split("/").at(-1)
    )
      throw new CloudFailure(400, "A integridade do arquivo não confere.");
    const uploaded = await context.owner.storage
      .from(bucket)
      .upload(path, bytes, {
        upsert: false,
        contentType: type || "application/octet-stream",
      });
    if (uploaded.error && String(uploaded.error.statusCode) !== "409")
      throw new CloudFailure(
        502,
        "Não foi possível finalizar o arquivo privado.",
      );
    if (temporaryPaths.length)
      await context.admin.storage.from(bucket).remove(temporaryPaths);
    return sendJson(res, 200, { uploaded: true });
  }
  if (route === "files/cleanup" && req.method === "POST") {
    await cleanTransport(context, path);
    return sendJson(res, 200, { removed: true });
  }
  throw new CloudFailure(404, "Operação de arquivo não encontrada.");
}
