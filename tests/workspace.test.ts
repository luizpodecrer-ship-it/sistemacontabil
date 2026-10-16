import { generateNextTask } from "../src/features/workspace/model";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addEntry,
  initialData,
  transitionClosing,
  balance,
  depreciation,
  parseOfx,
  payrollSummary,
  type Entry,
  type Item,
} from "../src/features/workspace/model";
const entry = (): Entry => ({
  id: crypto.randomUUID(),
  companyId: "company-1",
  period: "2026-10",
  date: "2026-10-01",
  description: "Integralização do capital",
  createdAt: new Date().toISOString(),
  lines: [
    { accountId: "cash", debit: 10000, credit: 0 },
    { accountId: "capital", debit: 0, credit: 10000 },
  ],
});
test("Partidas balanceadas, origem única, balancete e estorno preservado", () => {
  const d = initialData();
  const e = entry();
  e.sourceId = "source";
  addEntry(d, e);
  assert.equal(
    balance(d, "company-1", "2026-10").find((a) => a.id === "cash")?.closing,
    10000,
  );
  assert.throws(
    () =>
      addEntry(d, {
        ...entry(),
        lines: [
          { accountId: "cash", debit: 9999, credit: 0 },
          { accountId: "capital", debit: 0, credit: 10000 },
        ],
      }),
    /igual/,
  );
  assert.throws(
    () => addEntry(d, { ...entry(), sourceId: "source" }),
    /já foi integrado/,
  );
  addEntry(d, {
    ...entry(),
    reverses: e.id,
    lines: e.lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit })),
  });
  assert.equal(d.entries.length, 2);
  assert.equal(
    balance(d, "company-1", "2026-10").find((a) => a.id === "cash")?.closing,
    0,
  );
  assert.throws(
    () => addEntry(d, { ...entry(), reverses: e.id }),
    /já foi estornado/,
  );
});
test("Fechamento exige revisão, evidência e ausência de bloqueios; período fechado impede lançamentos", () => {
  const d = initialData();
  addEntry(d, entry());
  assert.throws(
    () => transitionClosing(d, "company-1", "2026-10", "Fechado", "Revisado"),
    /revisão/,
  );
  transitionClosing(d, "company-1", "2026-10", "Em revisão", "");
  d.items.push({
    id: "task",
    module: "tasks",
    companyId: "company-1",
    period: "2026-10",
    createdAt: "",
    updatedAt: "",
    values: { title: "Revisar", blocking: "Sim", status: "Pendente" },
  });
  assert.throws(
    () => transitionClosing(d, "company-1", "2026-10", "Fechado", "Revisado"),
    /impeditivas/,
  );
  d.items[0].values.status = "Concluído";
  transitionClosing(d, "company-1", "2026-10", "Fechado", "Conferido");
  assert.throws(() => addEntry(d, entry()), /fechada/);
  assert.throws(
    () => transitionClosing(d, "company-1", "2026-10", "Aberto", ""),
    /motivo/,
  );
  transitionClosing(
    d,
    "company-1",
    "2026-10",
    "Aberto",
    "Ajuste de classificação",
  );
  addEntry(d, entry());
  assert.equal(d.audit.length, 5);
});
test("Depreciação e soma de eventos manuais por empresa e empregado", () => {
  assert.equal(depreciation(120000, 0, 12), 10000);
  assert.throws(() => depreciation(10000, 20000, 12));
  const mk = (
    id: string,
    type: string,
    amount: string,
    companyId = "c",
  ): Item => ({
    id,
    module: "payrollEvents",
    companyId,
    period: "2026-10",
    values: { type, amount, employeeId: "e" },
    createdAt: "",
    updatedAt: "",
  });
  assert.deepEqual(
    payrollSummary(
      [
        mk("1", "Provento", "R$ 3.000,00"),
        mk("2", "Desconto", "R$ 100,00"),
        mk("3", "Provento", "R$ 9.000,00", "other"),
      ],
      "c",
      "2026-10",
    ),
    { earnings: 300000, deductions: 10000, net: 290000 },
  );
});
test("OFX exige identificador e preserva direção, data e valor", () => {
  const text =
    "<OFX><STMTTRN><DTPOSTED>20261002120000<TRNAMT>-123.45<FITID>unique-1<MEMO>Aluguel</STMTTRN></OFX>";
  assert.deepEqual(parseOfx(text), [
    {
      externalId: "unique-1",
      amount: -12345,
      date: "2026-10-02",
      description: "Aluguel",
    },
  ]);
  assert.throws(() => parseOfx(text.replace("<FITID>unique-1", "")));
  assert.throws(() => parseOfx("invalid"));
});

test("Recorrência mensal preserva modelo e evita duplicidade na mudança de ano", () => {
  const data = initialData();
  const task: Item = {
    id: "task",
    module: "tasks",
    companyId: "c",
    period: "2026-12",
    values: {
      title: "Fechamento",
      due: "2026-12-31",
      recurrence: "Mensal",
      status: "Concluído",
      evidence: "Conferido",
    },
    createdAt: "",
    updatedAt: "",
  };
  data.items.push(task);
  assert.equal(generateNextTask(data, task), "2027-01");
  const generated = data.items[1];
  assert.equal(generated.values.due, "2027-01-28");
  assert.equal(generated.values.evidence, "");
  assert.equal(generated.values.status, "Pendente");
  assert.throws(() => generateNextTask(data, task), /já foi gerada/);
});
