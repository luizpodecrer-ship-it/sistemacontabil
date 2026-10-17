import { cnpjKey, formatCnpj } from "@/lib/formats";
import { audit, newId, type Data, type Item } from "../workspace/model";
import { fields, newUnion, normalize, validateUnion } from "./model";
export type Sheet = { name: string; rows: string[][] };
export type Workbook = { sheets: Sheet[]; sha256: string };
export const importFields = fields.filter(
  (f) => !["code", "status", "sourceDate", "notes"].includes(f.key),
);
const aliases: Record<string, string[]> = {
  title: [
    "denominacao",
    "razaosocial",
    "nomeentidade",
    "denominacaodaentidade",
    "nome",
    "entidade",
  ],
  cnpj: ["cnpj", "cnpjentidade", "cnpjdaentidade"],
  sigla: ["sigla"],
  entityType: ["tipoentidade", "grau", "tipodeentidade"],
  representation: ["representacao", "grupo", "classificacao"],
  category: ["categoria", "categoriarepresentada", "categorias"],
  territory: ["baseterritorial", "abrangencia", "base"],
  uf: ["uf", "ufdasede", "estado"],
  city: ["municipio", "municipiodasede", "cidade"],
  cnesStatus: ["situacao", "situacaocadastral", "status", "situacaocnes"],
  registration: [
    "codigosindical",
    "registrosindical",
    "registro",
    "numeroregistro",
  ],
  process: ["processo", "numeroprocesso"],
  email: ["email", "correioeletronico"],
  phone: ["telefone", "fone", "telefonecomddd"],
  website: ["site", "website"],
  cep: ["cep"],
  street: ["logradouro", "endereco"],
  number: ["numero"],
  district: ["bairro"],
  complement: ["complemento"],
  contact: ["responsavel", "contato"],
};
export function suggestMapping(headers: string[]) {
  return Object.fromEntries(
    importFields.map((f) => [
      f.key,
      String(
        headers.findIndex((h) =>
          (aliases[f.key] || [normalize(f.label)]).includes(normalize(h)),
        ),
      ),
    ]),
  );
}
export function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/, 1)[0],
    separator = first.includes(";") ? ";" : first.includes("\t") ? "\t" : ",";
  const result: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    cells = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (char === separator || char === "\n")) {
      row.push(cell.replace(/\r$/, "").trim());
      cell = "";
      cells++;
      if (cells > 1200000 || row.length > 80)
        throw new Error("CSV excede o limite de células ou colunas.");
      if (char === "\n") {
        result.push(row);
        row = [];
        if (result.length > 50001)
          throw new Error("Limite de 50.000 entidades por arquivo.");
      }
    } else cell += char;
  }
  if (quoted) throw new Error("CSV com aspas incompletas.");
  if (cell || row.length) {
    row.push(cell.trim());
    result.push(row);
  }
  return result;
}
export function validateWorkbook(value: unknown): Workbook {
  const book = value as Workbook;
  if (
    !book ||
    !Array.isArray(book.sheets) ||
    book.sheets.length > 12 ||
    !book.sheets.length ||
    !/^([a-f0-9]{64})$/.test(book.sha256)
  )
    throw new Error("Resposta do leitor de planilha inválida.");
  let cells = 0;
  for (const sheet of book.sheets) {
    if (
      typeof sheet.name !== "string" ||
      !Array.isArray(sheet.rows) ||
      sheet.rows.length > 50001
    )
      throw new Error("Aba inválida.");
    for (const row of sheet.rows) {
      if (
        !Array.isArray(row) ||
        row.length > 80 ||
        row.some((v) => typeof v !== "string")
      )
        throw new Error("Células inválidas.");
      cells += row.length;
    }
  }
  if (cells > 1200000) throw new Error("Excesso de células na planilha.");
  return book;
}
export type Source = { name: string; sha256: string; date: string };
export type Plan = {
  ready: { line: number; item: Item }[];
  review: { line: number; reason: string }[];
  existing: number;
};
export function planUnionImport(
  sheet: Sheet,
  header: number,
  mapping: Record<string, string>,
  source: Source,
  data: Data,
): Plan {
  if (
    !["cnpj", "title"].every(
      (key) =>
        /^\d+$/.test(mapping[key] || "") &&
        Number(mapping[key]) < (sheet.rows[header]?.length || 0),
    )
  )
    throw new Error("Mapeie as colunas CNPJ e Denominação antes de importar.");
  const assigned = Object.values(mapping).filter((v) => Number(v) >= 0);
  if (new Set(assigned).size !== assigned.length)
    throw new Error(
      "Uma coluna não pode preencher dois campos. Revise o mapeamento.",
    );
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(source.date) ||
    isNaN(Date.parse(source.date)) ||
    new Date(source.date).toISOString().slice(0, 10) !== source.date
  )
    throw new Error("Informe a data de referência do arquivo.");
  const mapped = sheet.rows
    .slice(header + 1)
    .map((row, index) => ({
      line: header + index + 2,
      raw: Object.fromEntries(
        importFields.map((f) => [
          f.key,
          (row[Number(mapping[f.key])] || "").trim(),
        ]),
      ),
    }))
    .filter((r) => Object.values(r.raw).some(Boolean));
  for (const r of mapped) {
    if (/^\d{1,14}$/.test(r.raw.cnpj))
      r.raw.cnpj = r.raw.cnpj.padStart(14, "0");
    r.raw.uf = r.raw.uf.toUpperCase();
  }
  const counts = new Map<string, number>();
  for (const r of mapped) {
    const key = cnpjKey(r.raw.cnpj);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const plan: Plan = { ready: [], review: [], existing: 0 };
  const next = { ...data, items: [] };
  const existing = new Set(
    data.items
      .filter((i) => i.module === "unions")
      .map((i) => cnpjKey(i.values.cnpj || "")),
  );
  let code = Math.max(
    0,
    ...data.items
      .filter((i) => i.module === "unions")
      .map((i) => Number(i.values.code) || 0),
  );
  for (const { line, raw } of mapped) {
    const key = cnpjKey(raw.cnpj);
    if (counts.get(key) !== 1) {
      plan.review.push({
        line,
        reason:
          "CNPJ repetido no arquivo: todas as ocorrências ficam para revisão.",
      });
      continue;
    }
    if (existing.has(key)) {
      plan.existing++;
      continue;
    }
    if (Object.values(raw).some((v) => /^#(FORMULA|ERRO)/.test(v))) {
      plan.review.push({
        line,
        reason: "Célula com fórmula ou erro. Converta para valores e confira.",
      });
      continue;
    }
    const item = newUnion(next);
    item.values.code = String(++code);
    item.values = {
      ...item.values,
      ...raw,
      cnpj: formatCnpj(raw.cnpj),
      entityType:
        fields
          .find((f) => f.key === "entityType")!
          .options!.find((s) => normalize(s) === normalize(raw.entityType)) ||
        "Não informado",
      representation:
        fields
          .find((f) => f.key === "representation")!
          .options!.find(
            (s) => normalize(s) === normalize(raw.representation),
          ) || "Não informado",
      source: "Arquivo CNES informado pelo usuário · conferir",
      sourceDate: source.date,
      sourceFile: source.name,
      sourceHash: source.sha256,
      importedAt: new Date().toISOString(),
      sourceEntityType: raw.entityType,
      sourceRepresentation: raw.representation,
    };
    const errors = validateUnion(item, next);
    if (Object.keys(errors).length) {
      plan.review.push({ line, reason: Object.values(errors).join(" ") });
      continue;
    }
    if (data.items.length + plan.ready.length >= 50000) {
      plan.review.push({
        line,
        reason: "Limite de registros operacionais atingido.",
      });
      continue;
    }
    plan.ready.push({ line, item });
  }
  return plan;
}
export function commitUnionPlan(data: Data, plan: Plan) {
  let inserted = 0,
    skipped = 0,
    code = Math.max(
      0,
      ...data.items
        .filter((i) => i.module === "unions")
        .map((i) => Number(i.values.code) || 0),
    );
  const existing = new Set(
      data.items
        .filter((i) => i.module === "unions")
        .map((i) => cnpjKey(i.values.cnpj || "")),
    ),
    ids = new Set(data.items.map((i) => i.id));
  for (const { item } of plan.ready) {
    const key = cnpjKey(item.values.cnpj);
    if (existing.has(key)) {
      skipped++;
      continue;
    }
    const next = {
      ...structuredClone(item),
      id: ids.has(item.id) ? newId() : item.id,
      companyId: "",
      period: "",
      updatedAt: new Date().toISOString(),
      values: { ...item.values, code: String(++code) },
    };
    const errors = validateUnion(next, { ...data, items: [] });
    if (next.module !== "unions" || Object.keys(errors).length)
      throw new Error("Dados da importação inválidos. Refaça a prévia.");
    if (data.items.length >= 50000)
      throw new Error("Limite de registros operacionais atingido.");
    data.items.push(next);
    existing.add(key);
    ids.add(next.id);
    inserted++;
  }
  if (inserted)
    audit(
      data,
      "Importação de sindicatos",
      plan.ready[0]?.item.values.sourceHash || "",
      "",
      "",
      `${inserted} novos; ${skipped} já existentes preservados.`,
    );
  return { inserted, skipped };
}
