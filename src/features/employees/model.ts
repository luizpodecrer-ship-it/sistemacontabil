import { digits, formatCpf, validCpf } from "@/lib/formats";
import { validateField, type Values } from "../companies/model";
import {
  audit,
  newId,
  assertOpen,
  today,
  type Data,
  type Item,
} from "../workspace/model";
import { blocks, repeating, sectionRepeats } from "./fields";
export type DetailRow = { id: string; values: Values };
export type Change = {
  at: string;
  fields: string[];
  before: Values;
  after: Values;
};
export function rowsOf(values: Values, key: string): DetailRow[] {
  try {
    const data = JSON.parse(values[key] || "[]");
    return Array.isArray(data)
      ? data.filter(
          (r) =>
            r &&
            typeof r.id === "string" &&
            r.values &&
            typeof r.values === "object",
        )
      : [];
  } catch {
    return [];
  }
}
export function changesOf(values: Values): Change[] {
  try {
    const v = JSON.parse(values.changeHistory || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function deriveCtps(values: Values): Values {
  const next = { ...values };
  // CTPS Digital uses CPF as its identification, not the paper CTPS series.
  next.ctpsDigitalNumber =
    next.ctpsType === "Digital" && validCpf(next.cpf || "")
      ? formatCpf(next.cpf)
      : "";
  return next;
}
export function newEmployee(companyId: string): Item {
  return {
    id: newId(),
    module: "employees",
    companyId,
    period: "",
    createdAt: "",
    updatedAt: "",
    values: { recordStatus: "Rascunho" },
  };
}
export function visibleFields(blockId: string, values: Values) {
  return (blocks.find((b) => b.id === blockId)?.fields || []).filter((f) => {
    if (f.key.startsWith("ctpsPaper")) return values.ctpsType !== "Digital";
    if (["disabilityType", "disabilityQuota", "rehabilitated"].includes(f.key))
      return values.disabled === "Sim";
    if (["medicalReportDate", "healthNotes"].includes(f.key))
      return values.seriousIllness === "Sim";
    if (
      [
        "arrival",
        "naturalized",
        "brazilianSpouse",
        "brazilianChildren",
        "immigrationCondition",
        "rne",
        "rneIssuer",
        "rneIssued",
        "rneExpires",
      ].includes(f.key)
    )
      return values.foreignWorker === "Sim";
    if (
      ["replacedCpf", "temporaryReason", "temporaryDescription"].includes(f.key)
    )
      return values.temporary === "Sim";
    if (f.key === "specialScheduleDescription")
      return values.specialSchedule === "Sim";
    return true;
  });
}
export function validateEmployee(
  item: Item,
  all: Item[],
  complete = false,
): Values {
  const v = deriveCtps(item.values),
    errors: Values = {};
  for (const block of blocks)
    for (const f of visibleFields(block.id, v)) {
      const e = validateField(f, v[f.key] || "", complete);
      if (e) errors[f.key] = e;
    }
  if (!v.title?.trim()) errors.title = "Informe o nome completo.";
  if (!validCpf(v.cpf || "")) errors.cpf = "Informe um CPF válido.";
  if (complete)
    for (const key of [
      "registration",
      "admission",
      "birth",
      "workerKind",
      "contractType",
      "role",
      "status",
    ])
      if (!v[key]?.trim()) errors[key] = "Preencha este campo para concluir.";
  if (
    complete &&
    ["Empregado", "Aprendiz", "Trabalhador temporário"].includes(v.workerKind)
  ) {
    for (const key of [
      "ctpsType",
      "salary",
      "salaryType",
      "salarySince",
      "cbo",
    ])
      if (!v[key]?.trim())
        errors[key] = "Informe este dado do vínculo empregatício.";
    if (v.salary && Number(digits(v.salary)) <= 0)
      errors.salary = "Informe um salário maior que zero.";
    if (v.ctpsType === "Papel")
      for (const key of ["ctpsPaperNumber", "ctpsPaperSeries"])
        if (!v[key]?.trim())
          errors[key] = "Informe este dado da CTPS em papel.";
  }
  if (complete) {
    if (
      [
        "Empregado",
        "Aprendiz",
        "Trabalhador temporário",
        "Servidor público",
      ].includes(v.workerKind) &&
      !v.esocialRegistration?.trim()
    )
      errors.esocialRegistration = "Informe a matrícula eSocial do vínculo.";
    if (!v.esocialCategory?.trim())
      errors.esocialCategory = "Confira e informe a categoria eSocial.";
  }
  if (v.esocialCategory && !/^\d{3}$/.test(v.esocialCategory))
    errors.esocialCategory =
      "Use o código de três dígitos da tabela oficial vigente.";
  if (v.cbo && !/^\d{4}-?\d{2}$/.test(v.cbo))
    errors.cbo = "Informe os seis dígitos do CBO.";
  if (v.pis && digits(v.pis).length !== 11)
    errors.pis = "Informe os 11 dígitos do PIS / PASEP / NIT.";
  const specs = blocks.flatMap((b) => b.fields);
  for (const f of specs)
    if (f.type === "date" && v[f.key] && !validDate(v[f.key]))
      errors[f.key] = "Informe uma data válida.";
  if (v.birth && v.admission && v.birth >= v.admission)
    errors.admission = "A admissão deve ser posterior ao nascimento.";
  if (v.birth && v.birth > new Date().toLocaleDateString("sv-SE"))
    errors.birth = "Nascimento não pode estar no futuro.";
  for (const [start, end] of [
    ["admission", "termination"],
    ["admission", "contractEnd"],
    ["rgIssued", "rgExpires"],
    ["cnhIssued", "cnhExpires"],
    ["professionalIssued", "professionalExpires"],
    ["rneIssued", "rneExpires"],
  ])
    if (v[start] && v[end] && v[end] < v[start])
      errors[end] = "A data final não pode ser anterior à inicial.";
  if (v.status === "Desligado" && !v.termination)
    errors.termination = "Informe a data do desligamento.";
  if (
    complete &&
    v.contractType &&
    v.contractType !== "Indeterminado" &&
    !v.contractEnd &&
    !v.contractEndEvent
  )
    errors.contractEnd =
      "Informe a data ou o fato que determina o término do contrato.";
  for (const key of [
    "experienceDays",
    "extensionDays",
    "brazilianChildren",
    "punchTolerance",
    "dailyTolerance",
  ])
    if (v[key] && !/^\d+$/.test(v[key]))
      errors[key] = "Informe uma quantidade inteira, sem sinal.";
  if (Number(v.experienceDays || 0) + Number(v.extensionDays || 0) > 90)
    errors.extensionDays =
      "O contrato de experiência, incluindo prorrogação, não pode exceder 90 dias (CLT, art. 445).";
  if (
    v.fgtsRate &&
    (!/^\d{1,3}([,.]\d{1,4})?$/.test(v.fgtsRate) ||
      Number(v.fgtsRate.replace(",", ".")) > 100)
  )
    errors.fgtsRate = "Informe um percentual entre 0 e 100.";
  for (const key of ["weeklyHours", "monthlyHours"])
    if (v[key] && !/^\d{1,3}:[0-5]\d$/.test(v[key]))
      errors[key] = "Use horas e minutos, por exemplo 44:00.";
  const others = all.filter(
    (e) =>
      e.module === "employees" &&
      e.companyId === item.companyId &&
      e.id !== item.id,
  );
  if (
    v.registration &&
    others.some(
      (e) =>
        (e.values.registration || "").trim().toLocaleLowerCase() ===
        v.registration.trim().toLocaleLowerCase(),
    )
  )
    errors.registration =
      "Matrícula já utilizada nesta empresa, inclusive em vínculo anterior.";
  if (
    v.esocialRegistration &&
    others.some((e) => e.values.esocialRegistration === v.esocialRegistration)
  )
    errors.esocialRegistration =
      "Matrícula eSocial já utilizada nesta empresa.";
  const same = others.filter(
    (e) => digits(e.values.cpf || "") === digits(v.cpf || ""),
  );
  if (
    same.some(
      (e) =>
        !v.admission ||
        !e.values.admission ||
        ((!e.values.termination || v.admission <= e.values.termination) &&
          (!v.termination || e.values.admission <= v.termination)),
    )
  )
    errors.cpf =
      "CPF já possui vínculo no mesmo período nesta empresa. Para readmissão, encerre o vínculo anterior e informe nova matrícula e admissão posterior.";
  for (const group of repeating) {
    const rows = rowsOf(v, group.id);
    const seen = new Set<string>();
    for (const row of rows) {
      for (const f of group.fields) {
        const value = row.values[f.key] || "";
        const e = validateField(f, value, complete);
        if (e) errors[`${group.id}.${row.id}.${f.key}`] = e;
        if (f.type === "date" && value && !validDate(value))
          errors[`${group.id}.${row.id}.${f.key}`] = "Data inválida.";
      }
      const p = `${group.id}.${row.id}.`;
      if (
        row.values.start &&
        row.values.end &&
        row.values.end < row.values.start
      )
        errors[p + "end"] =
          "A data final deve ser posterior ou igual à inicial.";
      if (group.id === "dependents") {
        const cpf = digits(row.values.cpf || "");
        if (cpf && (cpf === digits(v.cpf || "") || seen.has(cpf)))
          errors[p + "cpf"] = "CPF repetido ou igual ao do colaborador.";
        if (cpf) seen.add(cpf);
        if (
          row.values.birth &&
          row.values.birth > new Date().toLocaleDateString("sv-SE")
        )
          errors[p + "birth"] = "Nascimento não pode estar no futuro.";
      }
      if (group.id === "workdays") {
        const r = row.values;
        if (r.type === "Trabalho" && complete && (!r.startTime || !r.endTime))
          errors[p + "startTime"] = "Informe entrada e saída.";
        if (
          r.startTime &&
          r.endTime &&
          r.endTime <= r.startTime &&
          r.overnight !== "Sim"
        )
          errors[p + "endTime"] =
            "Informe jornada que atravessa a meia-noite ou corrija a saída.";
        if (!!r.breakStart !== !!r.breakEnd)
          errors[p + "breakEnd"] = "Informe início e fim do intervalo.";
        if (
          r.breakStart &&
          r.breakEnd &&
          r.breakEnd <= r.breakStart &&
          r.overnight !== "Sim"
        )
          errors[p + "breakEnd"] = "Confira a ordem do intervalo.";
      }
    }
  }
  return errors;
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const n = new Date(value + "T00:00:00Z");
  return !isNaN(n.getTime()) && n.toISOString().slice(0, 10) === value;
}
export function blockForError(key: string) {
  return (
    blocks.find(
      (b) =>
        b.fields.some((f) => f.key === key) ||
        sectionRepeats[b.id]?.some((g) => key.startsWith(g + ".")),
    )?.id || "personal"
  );
}
export function saveEmployeeInData(data: Data, item: Item, complete: boolean) {
  if (item.module !== "employees" || !item.companyId)
    throw new Error("Vínculo de empresa inválido.");
  const old = data.items.find((i) => i.id === item.id);
  if (old && (old.module !== "employees" || old.companyId !== item.companyId))
    throw new Error("Não é permitido mover este vínculo para outra empresa.");
  if (old && old.updatedAt !== item.updatedAt)
    throw new Error(
      "Colaborador alterado em outra aba. Recarregue antes de editar.",
    );
  assertOpen(data, item.companyId, today().slice(0, 7));
  const next = { ...structuredClone(item), values: deriveCtps(item.values) };
  const errors = validateEmployee(next, data.items, complete);
  if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
  if (
    data.entries.some((e) => e.sourceId === item.id) &&
    old &&
    JSON.stringify(old.values) !== JSON.stringify(next.values)
  )
    throw new Error(
      "Registro já contabilizado. Preserve a origem e registre a correção pelo fluxo de estorno.",
    );
  next.values.recordStatus = complete ? "Concluído" : "Rascunho";
  const at = new Date().toISOString();
  const keys = Object.keys({ ...old?.values, ...next.values }).filter(
    (k) => k !== "changeHistory" && old?.values[k] !== next.values[k],
  );
  const changes = changesOf(old?.values || {});
  changes.push({
    at,
    fields: keys,
    before: Object.fromEntries(keys.map((k) => [k, old?.values[k] || ""])),
    after: Object.fromEntries(keys.map((k) => [k, next.values[k] || ""])),
  });
  next.values.changeHistory = JSON.stringify(changes);
  next.values.recordStatus = complete ? "Concluído" : "Rascunho";
  next.createdAt = old?.createdAt || at;
  next.updatedAt = at;
  data.items = data.items.filter((i) => i.id !== next.id);
  data.items.push(next);
  audit(
    data,
    old ? "Colaborador atualizado" : "Colaborador cadastrado",
    next.id,
    next.companyId,
    next.period,
    complete ? "Cadastro concluído" : "Rascunho",
  );
  return next;
}
