// Rebuild the bundled catalog from the official CBO CSV. No network or credentials.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
export function parseCboCsv(bytes) {
  let text = new TextDecoder("utf-8", { fatal: true });
  try {
    text = text.decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes);
  }
  text = text.replace(/^\uFEFF/, "");
  const delimiter = text.slice(0, text.indexOf("\n")).includes(";") ? ";" : ",";
  const table = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === delimiter || c === "\n")) {
      row.push(cell.replace(/\r$/, "").trim());
      cell = "";
      if (c === "\n") {
        table.push(row);
        row = [];
      }
    } else cell += c;
  }
  if (quoted) throw new Error("CSV com aspas incompletas.");
  if (cell || row.length) {
    row.push(cell.trim());
    table.push(row);
  }
  const headers = (table.shift() || []).map((v) =>
    v
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
  );
  const codeIndex = headers.findIndex((v) => /^(codigo|cod.?cbo|cbo)$/.test(v)),
    titleIndex = headers.findIndex((v) =>
      /^(titulo|descricao|termo|ocupacao)$/.test(v),
    );
  if (codeIndex < 0 || titleIndex < 0)
    throw new Error(
      "Use o CSV oficial de OCUPAÇÃO, com colunas CODIGO e TITULO.",
    );
  const unique = new Map();
  for (const values of table) {
    if (values.every((v) => !v.trim())) continue;
    const code = (values[codeIndex] || "").replace(/[-\s]/g, "");
    const title = values[titleIndex];
    if (!/^\d{6}$/.test(code) || !title)
      throw new Error("Código ou título inválido no CSV.");
    if (unique.has(code)) throw new Error("Código CBO duplicado no CSV.");
    unique.set(code, { code, title, aliases: [] });
  }
  return [...unique.values()].sort((a, b) => a.code.localeCompare(b.code));
}
if (
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], "file:").href
) {
  const [input, edition, source, output = "src/features/jobs/cbo-data.json"] =
    process.argv.slice(2);
  if (!input || !edition || !source || !/^https:\/\//.test(source))
    throw new Error(
      'Uso: node scripts/import-cbo.mjs arquivo-oficial.csv "Edição conferida" https://fonte-oficial output.json',
    );
  const bytes = await readFile(input),
    occupations = parseCboCsv(bytes);
  if (occupations.length < 2000)
    throw new Error(
      "Arquivo incompleto: esperado o catálogo inteiro, com pelo menos 2.000 ocupações.",
    );
  const data = {
    metadata: {
      title: edition,
      version: edition,
      source,
      official: "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/cbo",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      count: occupations.length,
      verifiedCurrent: false,
      aliasesSource: "",
    },
    families: {},
    occupations,
  };
  await writeFile(output, JSON.stringify(data) + "\n");
  console.log(
    `Catálogo gerado: ${occupations.length} ocupações. Revise e execute os testes antes de publicar.`,
  );
}
