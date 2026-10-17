import catalog from "./cbo-data.json";
import { audit, newId, type Data, type Item } from "../workspace/model";
export const cboMetadata = catalog.metadata;
export const occupations = catalog.occupations;
export const families = catalog.families as Record<string, string>;
export const cboByCode = new Map(occupations.map((row) => [row.code, row]));
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const formatCbo = (code: string) =>
  code.replace(/^(\d{4})(\d{2})$/, "$1-$2");
export const groups = [
  "Forças Armadas, policiais e bombeiros militares",
  "Dirigentes e gerentes",
  "Profissionais das ciências e das artes",
  "Técnicos de nível médio",
  "Trabalhadores de serviços administrativos",
  "Trabalhadores dos serviços e vendedores",
  "Trabalhadores agropecuários, florestais e da pesca",
  "Trabalhadores da produção de bens e serviços industriais",
  "Trabalhadores da produção de bens e serviços industriais",
  "Trabalhadores em serviços de reparação e manutenção",
];
export function searchCbo(query: string, prefix = "", order = "code") {
  const term = normalize(query),
    code = query.replace(/\D/g, "");
  return occupations
    .filter(
      (row) =>
        row.code.startsWith(prefix) &&
        (!term ||
          (code && /^[\d\s-]+$/.test(query)
            ? row.code.includes(code)
            : normalize([row.title, ...row.aliases].join(" ")).includes(term))),
    )
    .sort((a, b) =>
      order === "title"
        ? a.title.localeCompare(b.title, "pt-BR")
        : a.code.localeCompare(b.code),
    );
}
export function newJob(data: Data, companyId: string): Item {
  const codes = data.items
    .filter((i) => i.module === "jobs" && i.companyId === companyId)
    .map((i) => Number(i.values.code) || 0);
  const now = new Date().toISOString();
  return {
    id: newId(),
    module: "jobs",
    companyId,
    period: "",
    createdAt: now,
    updatedAt: now,
    values: {
      code: String(Math.max(0, ...codes) + 1),
      title: "",
      cbo: "",
      status: "Ativo",
      requirements: "[]",
      salaries: "[]",
    },
  };
}
export type Salary = { date: string; value: string };
export function rows<T>(value: string): T[] {
  try {
    const list = JSON.parse(value);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
export function validateJob(job: Item, data: Data): Record<string, string> {
  const v = job.values,
    errors: Record<string, string> = {};
  if (!/^\d{1,10}$/.test(v.code || "") || Number(v.code) < 1)
    errors.code = "Informe um código numérico maior que zero.";
  if (!v.title?.trim() || v.title.length > 160)
    errors.title = "Informe a descrição do cargo, com até 160 caracteres.";
  if (!cboByCode.has(v.cbo)) errors.cbo = "Selecione uma ocupação da base CBO.";
  if (!["Ativo", "Inativo"].includes(v.status))
    errors.status = "Selecione o status.";
  if (
    data.items.some(
      (i) =>
        i.module === "jobs" &&
        i.companyId === job.companyId &&
        i.id !== job.id &&
        Number(i.values.code) === Number(v.code),
    )
  )
    errors.code = "Este código já está cadastrado nesta empresa.";
  if (v.vacancies && !/^\d{1,6}$/.test(v.vacancies))
    errors.vacancies = "Informe uma quantidade inteira de vagas.";
  if (
    v.lawDate &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(v.lawDate) ||
      Number.isNaN(Date.parse(v.lawDate)) ||
      new Date(v.lawDate).toISOString().slice(0, 10) !== v.lawDate)
  )
    errors.lawDate = "Informe uma data válida.";
  if (v.lawDate && !v.lawNumber?.trim())
    errors.lawNumber = "Informe o número da lei para registrar sua data.";
  if ((v.activities || "").length > 4000)
    errors.activities = "Use até 4.000 caracteres.";
  for (const key of ["requirements", "salaries"]) {
    try {
      if (!Array.isArray(JSON.parse(v[key]))) errors[key] = "Lista inválida.";
    } catch {
      errors[key] = "Lista inválida.";
    }
  }
  for (const [key, limit] of [
    ["esocialId", 30],
    ["lawNumber", 60],
    ["accumulation", 160],
    ["specialTime", 160],
    ["budgetUnit", 160],
  ] as const)
    if ((v[key] || "").length > limit)
      errors[key] = `Use até ${limit} caracteres.`;
  const options: Record<string, string[]> = {
    kind: ["Privado", "Público efetivo", "Público em comissão", "Outro"],
    lawSituation: ["Criação", "Alteração", "Extinção"],
    accumulable: ["Sim", "Não"],
    exclusive: ["Sim", "Não"],
  };
  for (const [key, list] of Object.entries(options))
    if (v[key] && !list.includes(v[key]))
      errors[key] = "Selecione uma opção válida.";
  const requirements = rows<string>(v.requirements);
  if (
    requirements.length > 100 ||
    requirements.some(
      (r) => typeof r !== "string" || !r.trim() || r.length > 300,
    )
  )
    errors.requirements =
      "Preencha os requisitos, com até 300 caracteres cada.";
  const salaries = rows<Salary>(v.salaries),
    dates = new Set<string>();
  for (const row of salaries) {
    const date = row?.date || "";
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date ||
      dates.has(date) ||
      !/^\d{1,12}$/.test(row?.value || "") ||
      Number(row.value) <= 0
    )
      errors.salaries =
        "Informe datas válidas e únicas e valores salariais maiores que zero.";
    dates.add(date);
  }
  if (salaries.length > 100)
    errors.salaries = "Limite de 100 vigências por cargo.";
  return errors;
}
export function saveJob(data: Data, job: Item) {
  if (!job.companyId || job.module !== "jobs")
    throw new Error("Selecione a empresa do cargo.");
  const previous = data.items.find((i) => i.id === job.id);
  if (
    previous &&
    (previous.module !== "jobs" || previous.companyId !== job.companyId)
  )
    throw new Error("Cargo pertence a outro contexto.");
  if (previous && previous.updatedAt !== job.updatedAt)
    throw new Error(
      "O cargo foi alterado em outra aba. Recarregue antes de salvar.",
    );
  const errors = validateJob(job, data);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  const occupation = cboByCode.get(job.values.cbo)!;
  const next = structuredClone(job);
  next.values.title = next.values.title.trim();
  next.values.cboTitle = occupation.title;
  next.values.cboVersion = cboMetadata.version;
  next.updatedAt = new Date().toISOString();
  if (previous) data.items[data.items.indexOf(previous)] = next;
  else data.items.push(next);
  audit(
    data,
    previous ? "Alteração de cargo" : "Cadastro de cargo",
    job.id,
    job.companyId,
    "",
  );
}
