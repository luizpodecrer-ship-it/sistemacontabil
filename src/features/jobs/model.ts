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
export function newJob(data: Data): Item {
  const codes = data.items
    .filter((i) => i.module === "jobs")
    .map((i) => Number(i.values.code) || 0);
  const now = new Date().toISOString();
  return {
    id: newId(),
    module: "jobs",
    companyId: "",
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
      segments: "[]",
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
        i.id !== job.id &&
        Number(i.values.code) === Number(v.code),
    )
  )
    errors.code = "Este código já está cadastrado no catálogo de cargos.";
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
  for (const key of ["requirements", "salaries", "segments"]) {
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
  if (
    rows<string>(v.segments).some(
      (s) => !segments.some((segment) => segment.code === s),
    )
  )
    errors.segments = "Selecione segmentos válidos.";
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
  if (job.companyId || job.module !== "jobs")
    throw new Error(
      "O cargo deve pertencer ao catálogo compartilhado do escritório.",
    );
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

export const segments = [
  ["A", "Agropecuária e pesca", 1, 3],
  ["B", "Indústrias extrativas", 5, 9],
  ["C", "Indústrias de transformação", 10, 33],
  ["D", "Eletricidade e gás", 35, 35],
  ["E", "Água, esgoto e resíduos", 36, 39],
  ["F", "Construção", 41, 43],
  ["G", "Comércio e reparação de veículos", 45, 47],
  ["H", "Transporte e armazenagem", 49, 53],
  ["I", "Alojamento e alimentação", 55, 56],
  ["J", "Informação e comunicação", 58, 63],
  ["K", "Atividades financeiras e seguros", 64, 66],
  ["L", "Atividades imobiliárias", 68, 68],
  ["M", "Atividades profissionais, científicas e técnicas", 69, 75],
  ["N", "Serviços administrativos e complementares", 77, 82],
  ["O", "Administração pública", 84, 84],
  ["P", "Educação", 85, 85],
  ["Q", "Saúde e serviços sociais", 86, 88],
  ["R", "Artes, cultura, esporte e recreação", 90, 93],
  ["S", "Outros serviços", 94, 96],
  ["T", "Serviços domésticos", 97, 97],
  ["U", "Organismos internacionais", 99, 99],
].map(([code, label, from, to]) => ({
  code: String(code),
  label: String(label),
  from: Number(from),
  to: Number(to),
}));
export function segmentForCnae(cnae: string) {
  const code = cnae.replace(/\D/g, "");
  if (code.length !== 7) return undefined;
  const division = Number(code.slice(0, 2));
  return segments.find((s) => division >= s.from && division <= s.to)?.code;
}
export function companySegments(company: import("../companies/model").Company) {
  const cnaes = (company.activities || [])
    .filter(
      (a) =>
        !a.values.end || a.values.end >= new Date().toISOString().slice(0, 10),
    )
    .map((a) => a.values.cnae || "");
  if (!cnaes.length && company.values.predominantCnae)
    cnaes.push(company.values.predominantCnae);
  return [
    ...new Set(cnaes.map(segmentForCnae).filter((s): s is string => !!s)),
  ];
}
export function availableJobs(items: Item[], segmentCodes: string[] = []) {
  return items
    .filter(
      (i) =>
        i.module === "jobs" &&
        !i.companyId &&
        !i.archived &&
        i.values.status === "Ativo" &&
        (!segmentCodes.length ||
          !rows<string>(i.values.segments).length ||
          rows<string>(i.values.segments).some((s) =>
            segmentCodes.includes(s),
          )),
    )
    .sort((a, b) => a.values.title.localeCompare(b.values.title, "pt-BR"));
}
export function migrateCompanyJobs(data: Data) {
  const jobs = data.items.filter((i) => i.module === "jobs");
  const used = new Set<number>(
    jobs.filter((i) => !i.companyId).map((i) => Number(i.values.code)),
  );
  let max = Math.max(0, ...jobs.map((i) => Number(i.values.code) || 0));
  for (const job of jobs) {
    if (!job.companyId) continue;
    const source = job.companyId;
    job.values.sourceCompanyId = source;
    job.values.originalCompanyCode = job.values.code;
    if (used.has(Number(job.values.code))) job.values.code = String(++max);
    used.add(Number(job.values.code));
    job.companyId = "";
    job.values.segments ||= "[]";
    audit(
      data,
      "Cargo transferido ao catálogo compartilhado",
      job.id,
      source,
      "",
      "Código original preservado; vínculo de origem registrado.",
    );
  }
}
export function employeeJobError(
  item: Item,
  all: Item[],
  complete: boolean,
): string {
  const old = all.find(
    (i) =>
      i.id === item.id &&
      i.module === "employees" &&
      i.companyId === item.companyId,
  );
  const v = item.values;
  const unchanged =
    !!old?.values.role &&
    old.values.roleId === v.roleId &&
    old.values.role === v.role &&
    old.values.cbo === v.cbo;
  if (!v.roleId)
    return complete && !unchanged
      ? "Selecione um cargo cadastrado no catálogo do escritório."
      : "";
  if (unchanged) return "";
  const job = all.find(
    (i) =>
      i.id === v.roleId && i.module === "jobs" && !i.companyId && !i.archived,
  );
  if (!job || job.values.status !== "Ativo")
    return "O cargo selecionado não está mais disponível. Selecione um cargo ativo.";
  if (
    v.role !== job.values.title ||
    v.cbo.replace(/\D/g, "") !== job.values.cbo
  )
    return "O cargo foi atualizado. Selecione-o novamente para conferir o CBO.";
  return "";
}
