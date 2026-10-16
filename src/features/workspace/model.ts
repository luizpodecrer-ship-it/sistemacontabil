import { digits } from "@/lib/formats";
export type Values = Record<string, string>;
export type Item = {
  id: string;
  module: string;
  companyId: string;
  period: string;
  values: Values;
  file?: File;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
};
export type Line = { accountId: string; debit: number; credit: number };
export type Entry = {
  id: string;
  companyId: string;
  period: string;
  date: string;
  description: string;
  lines: Line[];
  sourceId?: string;
  reverses?: string;
  createdAt: string;
};
export type Account = {
  id: string;
  code: string;
  name: string;
  kind: "Ativo" | "Passivo" | "Patrimônio líquido" | "Receita" | "Despesa";
};
export type Closing = {
  companyId: string;
  period: string;
  state: "Aberto" | "Em revisão" | "Fechado";
  reason: string;
  at: string;
};
export type Audit = {
  id: string;
  at: string;
  action: string;
  entity: string;
  companyId: string;
  period: string;
  reason: string;
};
export type Data = {
  schema: 1;
  revision: number;
  items: Item[];
  entries: Entry[];
  accounts: Account[];
  closings: Closing[];
  audit: Audit[];
};
export const newId = () => crypto.randomUUID();
export const today = () => new Date().toLocaleDateString("sv-SE");
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const cents = (v: string) => Number(digits(v) || 0);
export const initialData = (): Data => ({
  schema: 1,
  revision: 0,
  items: [],
  entries: [],
  closings: [],
  audit: [],
  accounts: [
    { id: "cash", code: "1.1.01", name: "Caixa e bancos", kind: "Ativo" },
    {
      id: "receivable",
      code: "1.1.02",
      name: "Clientes a receber",
      kind: "Ativo",
    },
    { id: "assets", code: "1.2.01", name: "Imobilizado", kind: "Ativo" },
    {
      id: "depreciation",
      code: "1.2.09",
      name: "Depreciação acumulada",
      kind: "Ativo",
    },
    {
      id: "payable",
      code: "2.1.01",
      name: "Fornecedores a pagar",
      kind: "Passivo",
    },
    {
      id: "capital",
      code: "2.3.01",
      name: "Capital social",
      kind: "Patrimônio líquido",
    },
    {
      id: "revenue",
      code: "3.1.01",
      name: "Receita de serviços",
      kind: "Receita",
    },
    {
      id: "expense",
      code: "4.1.01",
      name: "Despesas operacionais",
      kind: "Despesa",
    },
    {
      id: "depExpense",
      code: "4.1.02",
      name: "Despesa de depreciação",
      kind: "Despesa",
    },
  ],
});
export function assertOpen(data: Data, companyId: string, period: string) {
  if (
    data.closings.some(
      (c) =>
        c.companyId === companyId &&
        c.period === period &&
        c.state === "Fechado",
    )
  )
    throw new Error(
      "Competência fechada. Solicite a reabertura com justificativa.",
    );
}
export function checkEntry(data: Data, entry: Entry) {
  assertOpen(data, entry.companyId, entry.period);
  if (
    !entry.companyId ||
    !/^\d{4}-\d{2}$/.test(entry.period) ||
    !entry.date.startsWith(entry.period) ||
    !entry.description.trim()
  )
    throw new Error(
      "Informe empresa, data da competência e histórico do lançamento.",
    );
  if (entry.lines.length < 2) throw new Error("Inclua ao menos duas partidas.");
  let debit = 0,
    credit = 0;
  for (const l of entry.lines) {
    if (!data.accounts.some((a) => a.id === l.accountId))
      throw new Error("Selecione uma conta válida em cada partida.");
    if (
      !Number.isSafeInteger(l.debit) ||
      !Number.isSafeInteger(l.credit) ||
      l.debit < 0 ||
      l.credit < 0 ||
      (!l.debit && !l.credit) ||
      (l.debit && l.credit)
    )
      throw new Error(
        "Cada partida deve ter um único valor positivo, em débito ou crédito.",
      );
    debit += l.debit;
    credit += l.credit;
  }
  if (debit !== credit)
    throw new Error("O total de débitos deve ser igual ao total de créditos.");
  if (
    entry.sourceId &&
    data.entries.some(
      (e) => e.companyId === entry.companyId && e.sourceId === entry.sourceId,
    )
  )
    throw new Error("Este registro já foi integrado à contabilidade.");
  if (entry.reverses && data.entries.some((e) => e.reverses === entry.reverses))
    throw new Error("Este lançamento já foi estornado.");
}
export function addEntry(data: Data, entry: Entry) {
  checkEntry(data, entry);
  data.entries.push(entry);
  audit(
    data,
    "Lançamento registrado",
    entry.id,
    entry.companyId,
    entry.period,
    entry.description,
  );
}
export function audit(
  data: Data,
  action: string,
  entity: string,
  companyId: string,
  period: string,
  reason = "",
) {
  data.audit.push({
    id: newId(),
    at: new Date().toISOString(),
    action,
    entity,
    companyId,
    period,
    reason,
  });
}
export function transitionClosing(
  data: Data,
  companyId: string,
  period: string,
  state: Closing["state"],
  reason: string,
) {
  if (!companyId) throw new Error("Selecione uma empresa.");
  const old = data.closings.find(
    (c) => c.companyId === companyId && c.period === period,
  );
  if (old?.state === "Fechado" && state !== "Aberto")
    throw new Error("Reabra a competência antes de alterar a revisão.");
  if (old?.state === "Fechado" && !reason.trim())
    throw new Error("Informe o motivo da reabertura.");
  if (state === "Fechado") {
    if (old?.state !== "Em revisão")
      throw new Error("Encaminhe a competência para revisão antes de fechar.");
    const blocking = data.items.filter(
      (i) =>
        !i.archived &&
        i.companyId === companyId &&
        i.period === period &&
        ["tasks", "obligations"].includes(i.module) &&
        i.values.blocking === "Sim" &&
        i.values.status !== "Concluído",
    );
    if (blocking.length)
      throw new Error(
        `Existem ${blocking.length} pendências impeditivas. Conclua-as antes de fechar.`,
      );
    if (
      !data.entries.some(
        (e) => e.companyId === companyId && e.period === period,
      )
    )
      throw new Error("Não há lançamentos para revisar nesta competência.");
    if (!reason.trim())
      throw new Error("Registre a justificativa da aprovação.");
  }
  data.closings = data.closings.filter(
    (c) => c.companyId !== companyId || c.period !== period,
  );
  data.closings.push({
    companyId,
    period,
    state,
    reason,
    at: new Date().toISOString(),
  });
  audit(
    data,
    `Competência: ${state}`,
    `${companyId}:${period}`,
    companyId,
    period,
    reason,
  );
}
export function balance(data: Data, companyId: string, period: string) {
  return data.accounts.map((account) => {
    const opening = data.entries
      .filter((e) => e.companyId === companyId && e.period < period)
      .flatMap((e) => e.lines)
      .filter((l) => l.accountId === account.id)
      .reduce((s, l) => s + l.debit - l.credit, 0);
    const lines = data.entries
      .filter((e) => e.companyId === companyId && e.period === period)
      .flatMap((e) => e.lines)
      .filter((l) => l.accountId === account.id);
    const debit = lines.reduce((s, l) => s + l.debit, 0),
      credit = lines.reduce((s, l) => s + l.credit, 0);
    return {
      ...account,
      opening,
      debit,
      credit,
      closing: opening + debit - credit,
    };
  });
}
export function depreciation(value: number, residual: number, months: number) {
  if (
    !Number.isSafeInteger(value) ||
    !Number.isSafeInteger(residual) ||
    value <= 0 ||
    residual < 0 ||
    residual >= value ||
    !Number.isInteger(months) ||
    months < 1
  )
    throw new Error(
      "Informe custo maior que o residual e vida útil em meses inteiros.",
    );
  return Math.round((value - residual) / months);
}
export function payrollSummary(
  items: Item[],
  companyId: string,
  period: string,
  employeeId?: string,
) {
  const rows = items.filter(
    (i) =>
      !i.archived &&
      i.module === "payrollEvents" &&
      i.companyId === companyId &&
      i.period === period &&
      (!employeeId || i.values.employeeId === employeeId),
  );
  const earnings = rows
    .filter((i) => i.values.type === "Provento")
    .reduce((s, i) => s + cents(i.values.amount), 0);
  const deductions = rows
    .filter((i) => i.values.type === "Desconto")
    .reduce((s, i) => s + cents(i.values.amount), 0);
  return { earnings, deductions, net: earnings - deductions };
}
export function parseOfx(text: string) {
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) || [];
  if (!blocks.length)
    throw new Error("Arquivo OFX sem transações reconhecidas.");
  return blocks.map((block) => {
    const tag = (name: string) =>
      block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, "i"))?.[1].trim() || "";
    const amount = Number(tag("TRNAMT"));
    const raw = tag("DTPOSTED");
    if (!tag("FITID") || !Number.isFinite(amount) || !/^\d{8}/.test(raw))
      throw new Error(
        "Transação OFX sem identificador, valor ou data válidos.",
      );
    return {
      externalId: tag("FITID"),
      amount: Math.round(amount * 100),
      date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
      description: tag("MEMO") || tag("NAME") || "Movimento bancário",
    };
  });
}

export function generateNextTask(data: Data, item: Item): string {
  if (
    !["tasks", "obligations"].includes(item.module) ||
    item.values.recurrence !== "Mensal"
  )
    throw new Error("Selecione uma tarefa com recorrência mensal.");
  const [year, month] = item.period.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month, 1));
  const period = nextDate.toISOString().slice(0, 7);
  assertOpen(data, item.companyId, period);
  const template = item.values.templateId || item.id;
  const origin = `recurring:${template}:${period}`;
  if (
    data.items.some(
      (i) => i.companyId === item.companyId && i.values.origin === origin,
    )
  )
    throw new Error("A próxima ocorrência já foi gerada.");
  const day = Math.min(28, Number((item.values.due || "").slice(-2)) || 1);
  const at = new Date().toISOString();
  data.items.push({
    ...item,
    id: newId(),
    period,
    createdAt: at,
    updatedAt: at,
    values: {
      ...item.values,
      status: "Pendente",
      due: `${period}-${String(day).padStart(2, "0")}`,
      evidence: "",
      protocol: "",
      delivery: item.module === "obligations" ? "Preparação" : "",
      templateId: template,
      origin,
    },
  });
  audit(data, "Recorrência mensal gerada", template, item.companyId, period);
  return period;
}
