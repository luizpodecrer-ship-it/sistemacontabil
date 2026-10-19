const chunkSize = 2 * 1024 * 1024;
const fileLimit = 30 * 1024 * 1024;
const api = "/api/cloud/";

async function checked(response: Response) {
  if (!response.ok) {
    let message = "Não foi possível concluir a operação na nuvem.";
    try {
      message = (await response.json()).message || message;
    } catch {
      /* no raw server output */
    }
    throw new Error(message);
  }
  return response;
}
export async function directSession(accessKey = "", end = false) {
  const response = await checked(
    await fetch(`${api}session${end ? "?action=end" : ""}`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: accessKey ? { Authorization: `Bearer ${accessKey}` } : {},
    }),
  );
  return response.json();
}
export async function uploadDirectFile(path: string, file: Blob) {
  if (file.size > fileLimit) throw new Error("O arquivo deve ter até 30 MB.");
  const query = `path=${encodeURIComponent(path)}`;
  for (let part = 0; part < Math.ceil(file.size / chunkSize); part++) {
    await checked(
      await fetch(`${api}files/part?${query}&part=${part}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/octet-stream" },
        body: file.slice(part * chunkSize, (part + 1) * chunkSize),
      }),
    );
  }
  await checked(
    await fetch(`${api}files/finish?${query}`, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: file.size, type: file.type }),
    }),
  );
}
export async function downloadDirectFile(path: string, type: string) {
  const query = `path=${encodeURIComponent(path)}`;
  const meta = await (
    await checked(
      await fetch(`${api}files/meta?${query}`, {
        credentials: "same-origin",
        cache: "no-store",
      }),
    )
  ).json();
  if (
    !Number.isSafeInteger(meta.size) ||
    meta.size < 0 ||
    meta.size > fileLimit
  )
    throw new Error("Tamanho de arquivo inválido.");
  const parts: Blob[] = [];
  for (let part = 0; part < Math.ceil(meta.size / chunkSize); part++) {
    const response = await checked(
      await fetch(`${api}files/data?${query}&part=${part}`, {
        credentials: "same-origin",
        cache: "no-store",
      }),
    );
    const bytes = await response.blob();
    if (bytes.size !== Math.min(chunkSize, meta.size - part * chunkSize))
      throw new Error(
        "O download do arquivo ficou incompleto. Tente novamente.",
      );
    parts.push(bytes);
  }
  return new Blob(parts, { type });
}
async function clean(path: string) {
  await fetch(`${api}files/cleanup?path=${encodeURIComponent(path)}`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => {});
}
async function compressed(blob: Blob) {
  return new Response(
    blob.stream().pipeThrough(new CompressionStream("gzip")),
  ).blob();
}
export const directFetch: typeof fetch = async (input, init = {}) => {
  const headers = new Headers(
    init.headers || (input instanceof Request ? input.headers : {}),
  );
  headers.delete("apikey");
  headers.delete("Authorization");
  let body = init.body;
  if (typeof body === "string" && body.length > 512 * 1024) {
    if (typeof CompressionStream === "undefined") {
      if (new Blob([body]).size > 3 * 1024 * 1024)
        throw new Error(
          "Atualize seu navegador para transferir este volume de dados.",
        );
    } else {
      const zipped = await compressed(new Blob([body]));
      headers.set("Content-Type", "application/octet-stream");
      if (zipped.size > 3 * 1024 * 1024) {
        const hash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest("SHA-256", await zipped.arrayBuffer()),
          ),
          (v) => v.toString(16).padStart(2, "0"),
        ).join("");
        // Session endpoint returns only a workspace id, never a database credential.
        const { workspace } = await directSession();
        const path = `${workspace}/_transport/${hash}`;
        await uploadDirectFile(
          path,
          new Blob([zipped], { type: "application/gzip" }),
        );
        headers.set("X-Nexopen-Json-File", path);
        body = "";
      } else {
        headers.set("X-Nexopen-Body-Encoding", "gzip");
        body = zipped;
      }
    }
  }
  const response = await fetch(input, {
    ...init,
    body,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const path = response.headers.get("X-Nexopen-Response-File");
  if (!path) return response;
  const blob = await downloadDirectFile(path, "application/gzip");
  const decoded = blob.stream().pipeThrough(new DecompressionStream("gzip"));
  const resultHeaders = new Headers(response.headers);
  resultHeaders.delete("Content-Length");
  resultHeaders.delete("Content-Encoding");
  resultHeaders.delete("X-Nexopen-Response-File");
  // Consume before removing the staged cloud transport object.
  const result = new Response(await new Response(decoded).blob(), {
    status: response.status,
    headers: resultHeaders,
  });
  await clean(path);
  return result;
};
