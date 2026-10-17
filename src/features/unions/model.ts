import type { FieldSpec } from "@/components/ui/form-field";
import { cnpjKey, formatCnpj } from "@/lib/formats";
import { ufs, validateField } from "../companies/model";
import { audit, newId, type Data, type Item } from "../workspace/model";
export const CNES_PORTAL =
  "https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/relacoes-do-trabalho/entidades-sindicais";
export const CNES_SEARCH =
  "https://www3.mte.gov.br/sistemas/cnes/cons_sindical.asp";
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
export const fields: FieldSpec[] = [
  { key: "code", label: "Código interno", required: true, maxLength: 10 },
  {
    key: "cnpj",
    label: "CNPJ",
    mask: "cnpj",
    required: true,
    placeholder: "00.000.000/0000-00",
  },
  {
    key: "title",
    label: "Denominação / razão social",
    required: true,
    maxLength: 300,
    wide: true,
  },
  { key: "sigla", label: "Sigla", maxLength: 60 },
  {
    key: "entityType",
    label: "Tipo de entidade",
    options: [
      "Sindicato",
      "Federação",
      "Confederação",
      "Central sindical",
      "Outra",
      "Não informado",
    ],
  },
  {
    key: "representation",
    label: "Representação",
    options: ["Laboral", "Patronal", "Não informado"],
  },
  {
    key: "status",
    label: "Situação interna",
    required: true,
    options: ["Ativo", "Inativo"],
  },
  { key: "registration", label: "Registro / código sindical", maxLength: 100 },
  { key: "process", label: "Número do processo", maxLength: 100 },
  {
    key: "cnesStatus",
    label: "Situação na fonte CNES",
    maxLength: 160,
    hint: "Preencha conforme consulta ou arquivo. Não há verificação automática em tempo real.",
  },
  { key: "sourceDate", label: "Data de referência da fonte", type: "date" },
  {
    key: "category",
    label: "Categoria representada",
    type: "textarea",
    maxLength: 4000,
    wide: true,
  },
  {
    key: "territory",
    label: "Base territorial / abrangência",
    type: "textarea",
    maxLength: 4000,
    wide: true,
  },
  { key: "cep", label: "CEP", mask: "cep", placeholder: "00000-000" },
  { key: "street", label: "Logradouro", maxLength: 250, wide: true },
  { key: "number", label: "Número", maxLength: 30 },
  { key: "complement", label: "Complemento", maxLength: 100 },
  { key: "district", label: "Bairro", maxLength: 100 },
  { key: "city", label: "Município da sede", maxLength: 120 },
  { key: "uf", label: "UF da sede", options: ufs },
  { key: "contact", label: "Contato / responsável", maxLength: 160 },
  {
    key: "email",
    label: "E-mail",
    type: "email",
    placeholder: "contato@sindicato.org.br",
    maxLength: 180,
  },
  {
    key: "phone",
    label: "Telefone com DDD",
    mask: "phone",
    placeholder: "(00) 00000-0000",
  },
  {
    key: "website",
    label: "Site",
    type: "url",
    placeholder: "https://sindicato.org.br",
    maxLength: 300,
  },
  {
    key: "notes",
    label: "Observações",
    type: "textarea",
    maxLength: 4000,
    wide: true,
  },
];
export function newUnion(data: Data): Item {
  const code =
    Math.max(
      0,
      ...data.items
        .filter((i) => i.module === "unions")
        .map((i) => Number(i.values.code) || 0),
    ) + 1;
  const at = new Date().toISOString();
  return {
    id: newId(),
    module: "unions",
    companyId: "",
    period: "",
    createdAt: at,
    updatedAt: at,
    values: {
      code: String(code),
      cnpj: "",
      title: "",
      status: "Ativo",
      entityType: "Sindicato",
      representation: "Não informado",
      source: "Cadastro manual",
    },
  };
}
export function validateUnion(item: Item, data: Data) {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const value = item.values[field.key] || "";
    const error = validateField(field, value, true);
    if (error) errors[field.key] = error;
    if (field.maxLength && value.length > field.maxLength)
      errors[field.key] = `Use até ${field.maxLength} caracteres.`;
    if (field.options && value && !field.options.includes(value))
      errors[field.key] = "Selecione uma opção válida.";
    if (
      field.type === "date" &&
      value &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        isNaN(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      errors[field.key] = "Informe uma data válida.";
  }
  if (
    !/^\d{1,10}$/.test(item.values.code || "") ||
    Number(item.values.code) <= 0
  )
    errors.code = "Informe um código numérico maior que zero.";
  for (const other of data.items.filter(
    (i) => i.module === "unions" && i.id !== item.id,
  )) {
    if (Number(other.values.code) === Number(item.values.code))
      errors.code = "Código interno já cadastrado.";
    if (cnpjKey(other.values.cnpj || "") === cnpjKey(item.values.cnpj || ""))
      errors.cnpj = "CNPJ já cadastrado no escritório.";
  }
  return errors;
}
export function saveUnion(data: Data, item: Item) {
  if (item.module !== "unions" || item.companyId)
    throw new Error("Sindicato deve pertencer ao catálogo do escritório.");
  const old = data.items.find((i) => i.id === item.id);
  if (old && (old.module !== "unions" || old.companyId))
    throw new Error("Registro pertence a outro contexto.");
  if (old && old.updatedAt !== item.updatedAt)
    throw new Error(
      "Sindicato alterado em outra aba. Recarregue antes de editar.",
    );
  const errors = validateUnion(item, data);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  if (!old && data.items.length >= 50000)
    throw new Error("Limite de 50.000 registros operacionais atingido.");
  const next = structuredClone(item);
  next.values.title = next.values.title.trim();
  next.values.cnpj = formatCnpj(next.values.cnpj);
  next.updatedAt = new Date().toISOString();
  if (old) data.items[data.items.indexOf(old)] = next;
  else data.items.push(next);
  audit(
    data,
    old ? "Sindicato atualizado" : "Sindicato cadastrado",
    next.id,
    "",
    "",
    next.values.source || "Cadastro manual",
  );
}
