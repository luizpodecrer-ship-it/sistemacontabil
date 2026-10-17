import { test } from "node:test";
import assert from "node:assert/strict";
import { dashboard } from "../src/features/dashboard/model";
import { initialData, type Item } from "../src/features/workspace/model";
import type { Company } from "../src/features/companies/model";
const item = (
  id: string,
  module: string,
  values: Record<string, string>,
): Item => ({
  id,
  module,
  values,
  companyId: "client",
  period: "2026-10",
  createdAt: "2026-01-01T12:00:00Z",
  updatedAt: "2026-10-17T12:00:00Z",
});
test("Dashboard agrega escritório, usa data real de conclusão, separa vencidas e não duplica honorários", () => {
  const data = initialData();
  data.items = [
    item("t", "tasks", { status: "Concluído", completedAt: "2026-10-17" }),
    item("old", "tasks", { status: "Concluído", completedAt: "2026-10-10" }),
    item("missing", "tasks", { status: "Concluído" }),
    item("p", "obligations", { status: "Pendente", due: "2026-10-16" }),
    item("future", "obligations", { status: "Pendente", due: "2026-10-20" }),
    item("o", "obligations", {
      status: "Concluído",
      completedAt: "2026-10-15",
    }),
    item("c", "collections", {
      status: "Liquidado",
      amount: "R$ 123,45",
      settledAt: "2026-10-17",
    }),
    item("mirror", "officeFinance", {
      status: "Liquidado",
      amount: "R$ 123,45",
      settledAt: "2026-10-17",
      origin: "collection:c",
    }),
  ];
  data.items.push({
    ...item("archived", "tasks", {
      status: "Concluído",
      completedAt: "2026-10-17",
    }),
    archived: true,
  });
  const d = dashboard(
    data,
    [
      { values: { officeStatus: "Ativa" } },
      { values: { officeStatus: "Inativa" } },
    ] as Company[],
    "7d",
    "2026-10",
    "2026-10-17",
  );
  assert.equal(d.active, 1);
  assert.equal(d.done, 1);
  assert.equal(d.doneDelta, 0);
  assert.equal(d.pending, 1);
  assert.equal(d.overdue, 1);
  assert.equal(d.fees, 12345);
  assert.equal(d.undated, 1);
  assert.equal(
    d.tasks.reduce((a, b) => a + b),
    1,
  );
  assert.equal(
    d.obligations.reduce((a, b) => a + b),
    1,
  );
  const month = dashboard(data, [], "competence", "2026-10", "2026-10-17");
  assert.equal(month.start, "2026-10-01");
  assert.equal(month.end, "2026-10-31");
  assert.equal(month.pending, 2);
});
test("Dashboard vazio não inventa comparações ou barras; competência considera ano bissexto", () => {
  const d = dashboard(initialData(), [], "competence", "2024-02", "2026-10-17");
  assert.equal(d.end, "2024-02-29");
  assert.equal(d.previousStart, "2024-01-03");
  assert.equal(d.doneDelta, null);
  assert.equal(d.feeDelta, null);
  assert.ok(d.tasks.every((n) => n === 0));
});
