import {
  cnpjKey,
  digits,
  formatCep,
  formatMoney,
  formatPhone,
  validCnpj,
} from "@/lib/formats";
import type { Values } from "./model";
export type CnpjResult = {
  values: Values;
  activities: { cnae: string; description: string; kind: string }[];
  phones: { number: string; type: string }[];
  at: string;
  provider: string;
  cnpj: string;
};
function cnaeCode(value: unknown) {
  const code = digits(text(value));
  return code.length <= 7 && Number(code) > 0 ? code.padStart(7, "0") : "";
}
function text(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : typeof value === "number"
      ? String(value)
      : "";
}
export function mapCnpj(
  payload: Record<string, unknown>,
  registration: string,
): CnpjResult {
  if (payload.cnpj && cnpjKey(text(payload.cnpj)) !== cnpjKey(registration))
    throw new Error(
      "A fonte retornou uma inscrição diferente da consultada. Confira manualmente.",
    );
  const legalName = text(payload.razao_social);
  if (!legalName)
    throw new Error(
      "A fonte não retornou a razão social. Preencha manualmente.",
    );
  const prefix = text(payload.descricao_tipo_de_logradouro);
  const street = text(payload.logradouro);
  const fullStreet =
    prefix && !street.toLowerCase().startsWith(prefix.toLowerCase() + " ")
      ? `${prefix} ${street}`.trim()
      : street;
  const moneyValue = Number(payload.capital_social);
  const values: Values = {
    legalName,
    tradeName: text(payload.nome_fantasia),
    openedAt: text(payload.data_inicio_atividade),
    registryDate: text(payload.data_situacao_cadastral),
    registryStatus: text(payload.descricao_situacao_cadastral)
      .toLowerCase()
      .replace(/^./, (x) => x.toUpperCase()),
    legalNature: [
      text(payload.codigo_natureza_juridica).replace(/^(\d{3})(\d)$/, "$1-$2"),
      text(payload.natureza_juridica),
    ]
      .filter(Boolean)
      .join(" — "),
    street: fullStreet,
    number: text(payload.numero),
    complement: text(payload.complemento),
    district: text(payload.bairro),
    city: text(payload.municipio),
    uf: text(payload.uf),
    cep: formatCep(text(payload.cep)),
    ibge: text(payload.codigo_municipio_ibge),
    country: "Brasil",
    email: text(payload.email),
    size: /^micro empresa$/i.test(text(payload.porte))
      ? "ME"
      : /pequeno porte/i.test(text(payload.porte))
        ? "EPP"
        : /^demais$/i.test(text(payload.porte))
          ? "Demais"
          : "",
  };
  if (
    payload.capital_social !== null &&
    payload.capital_social !== undefined &&
    Number.isFinite(moneyValue) &&
    moneyValue >= 0
  )
    values.capital = formatMoney(String(Math.round(moneyValue * 100)));
  const activities: CnpjResult["activities"] = [];
  const cnae = cnaeCode(payload.cnae_fiscal);
  if (digits(cnae).length === 7)
    activities.push({
      cnae: digits(cnae),
      description: text(payload.cnae_fiscal_descricao),
      kind: "Principal",
    });
  if (Array.isArray(payload.cnaes_secundarios))
    for (const row of payload.cnaes_secundarios) {
      if (row && typeof row === "object") {
        const item = row as Record<string, unknown>;
        const code = cnaeCode(item.codigo);
        if (code.length === 7 && !activities.some((a) => a.cnae === code))
          activities.push({
            cnae: code,
            description: text(item.descricao),
            kind: "Secundária",
          });
      }
    }
  const phones: CnpjResult["phones"] = [];
  for (const key of ["ddd_telefone_1", "ddd_telefone_2"]) {
    const n = digits(text(payload[key]));
    if (
      (n.length === 10 || n.length === 11) &&
      !phones.some((p) => digits(p.number) === n)
    )
      phones.push({
        number: formatPhone(n),
        type: n.length === 11 ? "Celular" : "Fixo",
      });
  }
  return {
    values,
    activities,
    phones,
    at: new Date().toISOString(),
    provider: "BrasilAPI · dados cadastrais públicos",
    cnpj: registration,
  };
}
export async function lookupCnpj(
  registration: string,
  signal?: AbortSignal,
): Promise<CnpjResult> {
  const key = cnpjKey(registration);
  if (!validCnpj(key))
    throw new Error("Informe um CNPJ válido para consultar.");
  if (!/^\d{14}$/.test(key))
    throw new Error(
      "A fonte de consulta utilizada ainda não atende CNPJ alfanumérico. Preencha os dados manualmente.",
    );
  let response: Response;
  try {
    response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${key}`, {
      signal,
      referrerPolicy: "no-referrer",
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      "Consulta de CNPJ indisponível. Você pode continuar preenchendo manualmente.",
    );
  }
  if (response.status === 404)
    throw new Error(
      "CNPJ não encontrado na fonte consultada. Confira a inscrição ou preencha manualmente.",
    );
  if (response.status === 429)
    throw new Error(
      "O serviço atingiu o limite de consultas. Aguarde e tente novamente ou preencha manualmente.",
    );
  if (!response.ok)
    throw new Error(
      "A fonte de CNPJ está indisponível. Tente novamente ou preencha manualmente.",
    );
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      "A fonte retornou uma resposta inválida. Preencha manualmente.",
    );
  }
  if (!payload || typeof payload !== "object")
    throw new Error("Resposta cadastral inválida.");
  return mapCnpj(payload as Record<string, unknown>, key);
}
