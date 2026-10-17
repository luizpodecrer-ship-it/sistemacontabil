import {
  cnpjKey,
  digits,
  formatCnpj,
  formatCpf,
  formatCnae,
  validCnpj,
  validCpf,
} from "@/lib/formats";
import { newCompany, type Company, type Values } from "./model";
export type ImportRow = {
  line: number;
  code: string;
  legalName: string;
  registrationType: string;
  registration: string;
  status: string;
  inactiveAt: string;
  predominantCnae: string;
};
export type ImportPayload = {
  format: "nexo-company-import-v1";
  source: { name: string; sha256: string };
  rows: ImportRow[];
  errors: { line: number; message: string }[];
};
export type ImportPlan = {
  companies: Company[];
  created: number;
  updated: number;
  unchanged: number;
  issues: { line: number; code: string; reason: string }[];
  sourceRows: number;
  excludedDuplicates: number;
};
function plain(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
export function parseImportPayload(input: unknown): ImportPayload {
  if (
    !plain(input) ||
    input.format !== "nexo-company-import-v1" ||
    !Array.isArray(input.rows) ||
    input.rows.length > 1000 ||
    !plain(input.source) ||
    typeof input.source.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(input.source.sha256)
  )
    throw new Error("Arquivo de importação inválido ou incompatível.");
  const rows: ImportRow[] = input.rows.map((value) => {
    if (
      !plain(value) ||
      !Number.isSafeInteger(value.line) ||
      Number(value.line) < 2
    )
      throw new Error("A planilha contém uma linha inválida.");
    const row = { line: Number(value.line) } as ImportRow;
    for (const key of [
      "code",
      "legalName",
      "registrationType",
      "registration",
      "status",
      "inactiveAt",
      "predominantCnae",
    ] as const) {
      if (typeof value[key] !== "string" || value[key].length > 1000)
        throw new Error("Há valores inválidos na planilha.");
      row[key] = value[key].trim();
    }
    return row;
  });
  const errors = Array.isArray(input.errors)
    ? input.errors.map((e) => {
        if (
          !plain(e) ||
          !Number.isSafeInteger(e.line) ||
          typeof e.message !== "string"
        )
          throw new Error("Relatório de erros inválido.");
        return { line: Number(e.line), message: e.message.slice(0, 1000) };
      })
    : [];
  return {
    format: "nexo-company-import-v1",
    source: {
      name:
        typeof input.source.name === "string"
          ? input.source.name.slice(0, 200)
          : "Planilha de empresas",
      sha256: input.source.sha256,
    },
    rows,
    errors,
  };
}
function statusOf(value: string): string {
  const v = value.trim().toLocaleLowerCase("pt-BR");
  return (
    (
      {
        ativa: "Ativa",
        ativo: "Ativa",
        inativa: "Inativa",
        inativo: "Inativa",
        suspensa: "Suspensa",
        suspenso: "Suspensa",
        encerrada: "Encerrada",
        encerrado: "Encerrada",
        "em implantação": "Em implantação",
      } as Values
    )[v] || ""
  );
}
function parsedCnae(value: string) {
  if (!value) return { code: "", description: "" };
  const match = value.match(
    /^(\d{4}-?\d\/?\d{2}|\d{7})(?:\s*[-–—]\s*|\s+)?(.*)$/,
  );
  if (!match || digits(match[1]).length !== 7 || Number(digits(match[1])) === 0)
    throw new Error("CNAE preponderante inválido.");
  return { code: formatCnae(match[1]), description: match[2].trim() };
}
export function planCompanyImport(
  payload: ImportPayload,
  existing: Company[],
): ImportPlan {
  const counts = new Map<string, number>();
  for (const row of payload.rows) {
    const key = cnpjKey(row.registration);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  const result: ImportPlan = {
    companies: [],
    created: 0,
    updated: 0,
    unchanged: 0,
    issues: payload.errors.map((e) => ({
      line: e.line,
      code: "",
      reason: e.message,
    })),
    sourceRows: payload.rows.length + payload.errors.length,
    excludedDuplicates: 0,
  };
  const knownCodes = new Map(
    existing
      .filter((c) => c.values.code)
      .map((c) => [c.values.code, cnpjKey(c.values.cnpj || "")]),
  );
  for (const row of payload.rows) {
    try {
      const registration = cnpjKey(row.registration);
      if ((counts.get(registration) || 0) > 1) {
        result.excludedDuplicates++;
        throw new Error(
          "Inscrição repetida no arquivo: separada para revisão, sem cadastrar nenhuma das linhas deste CNPJ/CPF.",
        );
      }
      if (
        !row.code ||
        row.code.length > 30 ||
        !row.legalName ||
        row.legalName.length > 200
      )
        throw new Error("Informe código e razão social válidos.");
      const kind = row.registrationType.toUpperCase();
      if (!["CPF", "CNPJ"].includes(kind))
        throw new Error("Tipo de inscrição deve ser CPF ou CNPJ.");
      if (!(kind === "CPF" ? validCpf(registration) : validCnpj(registration)))
        throw new Error(
          "Inscrição inválida: confira os dígitos verificadores.",
        );
      const status = statusOf(row.status);
      if (!status)
        throw new Error("Status não reconhecido. Revise o valor original.");
      if (
        row.inactiveAt &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(row.inactiveAt) ||
          new Date(row.inactiveAt + "T00:00:00Z").toISOString().slice(0, 10) !==
            row.inactiveAt)
      )
        throw new Error("Data de inativação inválida.");
      const cnae = parsedCnae(row.predominantCnae);
      if (knownCodes.has(row.code) && knownCodes.get(row.code) !== registration)
        throw new Error(
          "Código já utilizado por outra inscrição. Revise antes de importar.",
        );
      knownCodes.set(row.code, registration);
      const current = existing.find(
        (c) => cnpjKey(c.values.cnpj || "") === registration,
      );
      if (
        current?.history.some((h) =>
          h.fields.includes(`import:${payload.source.sha256}:${row.line}`),
        )
      ) {
        result.unchanged++;
        continue;
      }
      const company = current ? structuredClone(current) : newCompany();
      const values: Values = {
        code: row.code,
        legalName: row.legalName,
        personType: kind === "CPF" ? "Pessoa física" : "Pessoa jurídica",
        cnpj:
          kind === "CPF" ? formatCpf(registration) : formatCnpj(registration),
        officeStatus: status,
        inactiveAt: row.inactiveAt,
        predominantCnae: cnae.code,
        predominantCnaeDescription: cnae.description,
      };
      if (current) {
        for (const [k, v] of Object.entries(values))
          if (v && !company.values[k]?.trim()) company.values[k] = v;
        if (company.values.code !== row.code) {
          const aliases = new Set(
            (company.values.alternateCodes || "").split("|").filter(Boolean),
          );
          aliases.add(row.code);
          company.values.alternateCodes = [...aliases].join("|");
        }
      } else company.values = { ...company.values, ...values };
      company.values.importSource = payload.source.name;
      company.values.importHash = payload.source.sha256;
      company.values.importLine = String(row.line);
      company.values.importStatus = row.status;
      company.values.importPredominantCnae = row.predominantCnae;
      const at = new Date().toISOString();
      company.updatedAt = at;
      if (!current) company.status = "Rascunho";
      company.history.push({
        at,
        action: current
          ? "Cadastro complementado por importação (campos vazios)"
          : "Rascunho importado de planilha",
        fields: [
          `import:${payload.source.sha256}:${row.line}`,
          ...Object.keys(values),
        ],
      });
      result.companies.push(company);
      if (current) result.updated++;
      else result.created++;
    } catch (e) {
      result.issues.push({
        line: row.line,
        code: row.code,
        reason: e instanceof Error ? e.message : "Linha inválida.",
      });
    }
  }
  return result;
}
