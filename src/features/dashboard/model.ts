import { cents, type Data, type Item } from "../workspace/model";
import type { Company } from "../companies/model";
export type Range = "7d" | "30d" | "90d" | "competence";
const day = 86400000;
const date = (v: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(v) ? Date.parse(v + "T12:00:00Z") : NaN;
const iso = (v: number) => new Date(v).toISOString().slice(0, 10);
export function dashboard(
  data: Data,
  companies: Company[],
  range: Range,
  period: string,
  today: string,
) {
  const end =
    range === "competence"
      ? Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0, 12)
      : date(today);
  const start =
    range === "competence"
      ? date(period + "-01")
      : end - (Number(range.slice(0, -1)) - 1) * day;
  const days = Math.round((end - start) / day) + 1,
    previousStart = start - days * day;
  const items = data.items.filter((i) => !i.archived);
  const within = (v: string, a = start, b = end) => {
    const d = date(v);
    return d >= a && d <= b;
  };
  const completion = (i: Item) => i.values.completedAt || "";
  const tasks = items.filter(
    (i) => i.module === "tasks" && i.values.status === "Concluído",
  );
  const obligations = items.filter((i) => i.module === "obligations");
  const received = items.filter(
    (i) => i.module === "collections" && i.values.status === "Liquidado",
  );
  const pending = obligations.filter(
    (i) => i.values.status !== "Concluído" && within(i.values.due),
  );
  const series = (
    list: Item[],
    field: (i: Item) => string,
    value: (i: Item) => number = () => 1,
  ) => {
    const bars = Array<number>(12).fill(0);
    for (const i of list) {
      const d = date(field(i));
      if (d >= start && d <= end)
        bars[Math.min(11, Math.floor((((d - start) / day) * 12) / days))] +=
          value(i);
    }
    return bars;
  };
  const knownSince = Math.min(
    ...items.map((i) => Date.parse(i.createdAt)).filter(Number.isFinite),
  );
  const compare = (current: number, previous: number) =>
    knownSince <= previousStart && previous > 0
      ? ((current - previous) / previous) * 100
      : null;
  const done = tasks.filter((i) => within(completion(i))).length;
  const fees = received
    .filter((i) => within(i.values.settledAt))
    .reduce((n, i) => n + cents(i.values.amount), 0);
  return {
    start: iso(start),
    end: iso(end),
    previousStart: iso(previousStart),
    previousEnd: iso(start - day),
    active: companies.filter((c) => c.values.officeStatus === "Ativa").length,
    done,
    pending: pending.length,
    overdue: pending.filter((i) => i.values.due < today).length,
    fees,
    doneDelta: compare(
      done,
      tasks.filter((i) => within(completion(i), previousStart, start - day))
        .length,
    ),
    feeDelta: compare(
      fees,
      received
        .filter((i) => within(i.values.settledAt, previousStart, start - day))
        .reduce((n, i) => n + cents(i.values.amount), 0),
    ),
    tasks: series(tasks, completion),
    obligations: series(
      obligations.filter((i) => i.values.status === "Concluído"),
      completion,
    ),
    pendingBars: series(pending, (i) => i.values.due),
    feesBars: series(
      received,
      (i) => i.values.settledAt,
      (i) => cents(i.values.amount),
    ),
    undated: items.filter(
      (i) =>
        ["tasks", "obligations"].includes(i.module) &&
        i.values.status === "Concluído" &&
        !completion(i),
    ).length,
  };
}
