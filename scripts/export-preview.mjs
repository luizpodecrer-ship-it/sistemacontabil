import { readFile, writeFile, readdir } from 'node:fs/promises';
const assets = await readdir(new URL('../dist/assets/', import.meta.url));
let css = await readFile(new URL('../dist/assets/' + assets.find(f => f.endsWith('.css')), import.meta.url), 'utf8');
// Embed font files so the downloadable preview remains independent.
for (const asset of assets.filter(f => /\.woff2?$/.test(f))) {
  const bytes = await readFile(new URL('../dist/assets/' + asset, import.meta.url));
  const mime = asset.endsWith('.woff2') ? 'font/woff2' : 'font/woff';
  css = css.replaceAll('/assets/' + asset, `data:${mime};base64,${bytes.toString('base64')}`);
}
const js = await readFile(new URL('../dist/assets/' + assets.find(f => f.endsWith('.js')), import.meta.url), 'utf8');
const html = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nexo — Prévia navegável</title><style>${css}</style></head><body><div id="app"></div><script>${js.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
await writeFile(new URL('../Nexo-previa.html', import.meta.url), html);
console.log('Nexo-previa.html gerado: HTML independente, sem servidor ou CDN.');
