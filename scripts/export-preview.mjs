import { writeFile } from "node:fs/promises";
import { build } from "vite";
// The live app splits the account SDK so direct cloud access never initializes
// browser authentication/storage. Build a separate single-file local preview.
const result = await build({
  logLevel: "warn",
  build: {
    write: false,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true, format: "iife" } },
  },
});
const assets = result.output;
let css = String(
  assets.find(
    (asset) => asset.type === "asset" && asset.fileName.endsWith(".css"),
  ).source,
);
for (const asset of assets.filter(
  (asset) => asset.type === "asset" && /\.woff2?$/.test(asset.fileName),
)) {
  const mime = asset.fileName.endsWith(".woff2") ? "font/woff2" : "font/woff";
  css = css.replaceAll(
    "/" + asset.fileName,
    `data:${mime};base64,${Buffer.from(asset.source).toString("base64")}`,
  );
}
const js = assets.find((asset) => asset.type === "chunk" && asset.isEntry).code;
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nexo — Prévia navegável</title><style>${css}</style></head><body><div id="app"></div><script>${js.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
await writeFile(new URL("../Nexo-previa.html", import.meta.url), html);
console.log("Nexo-previa.html gerado: HTML independente, sem servidor ou CDN.");
