import { useState } from "react";
import { Download } from "lucide-react";
import type { Company } from "../companies/model";
import { money, today, type Data } from "../workspace/model";
import { dashboard, type Range } from "./model";
const fmt = (v: string) => v.split("-").reverse().join("/");
export function Dashboard({
  data,
  companies,
  period,
}: {
  data: Data;
  companies: Company[];
  period: string;
}) {
  const [range, setRange] = useState<Range>("30d");
  const d = dashboard(data, companies, range, period, today());
  const cards = [
    {
      label: "Empresas ativas",
      value: String(d.active),
      note: "Posição atual do escritório",
      bars: [] as number[],
      delta: null,
    },
    {
      label: "Tarefas concluídas",
      value: String(d.done),
      note: "Concluídas no período",
      bars: d.tasks,
      delta: d.doneDelta,
    },
    {
      label: "Obrigações pendentes",
      value: String(d.pending),
      note: `${d.overdue} vencida(s) · posição atual com prazo no período`,
      bars: d.pendingBars,
      delta: null,
    },
    {
      label: "Honorários recebidos",
      value: money(d.fees),
      note: "Cobranças liquidadas no período",
      bars: d.feesBars,
      delta: d.feeDelta,
    },
  ];
  function exportData() {
    const rows = [
      ["Indicador", "Valor", "Início", "Fim", "Observação"],
      ...cards.map((c) => [c.label, c.value, d.start, d.end, c.note]),
      ["Comparação", `${d.previousStart} a ${d.previousEnd}`],
      ["Registros concluídos sem data", String(d.undated)],
      [],
      ["Intervalo", "Tarefas concluídas", "Obrigações concluídas"],
      ...d.tasks.map((n, i) => [
        String(i + 1),
        String(n),
        String(d.obligations[i]),
      ]),
    ];
    const blob = new Blob(
      [
        "\ufeff" +
          rows
            .map((row) =>
              row.map((s) => '"' + s.replace(/"/g, '""') + '"').join(";"),
            )
            .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-${d.start}-${d.end}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const max = Math.ceil(Math.max(2, ...d.tasks, ...d.obligations) / 2) * 2;
  const points = (values: number[]) =>
    values.map((n, i) => `${40 + i * 64},${185 - (n / max) * 150}`).join(" ");
  return (
    <section
      aria-label="Indicadores do Dashboard"
      className="min-w-0 space-y-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-600">
            Visão do escritório · todas as empresas
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {fmt(d.start)} a {fmt(d.end)} · comparação: {fmt(d.previousStart)} a{" "}
            {fmt(d.previousEnd)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-white p-1"
            aria-label="Período do Dashboard"
          >
            {(
              [
                ["7d", "7 dias"],
                ["30d", "30 dias"],
                ["90d", "90 dias"],
                ["competence", "Competência atual"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                aria-pressed={range === key}
                onClick={() => setRange(key)}
                className={`rounded-lg px-3 py-2 text-xs ${range === key ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={exportData}
            className="action-button inline-flex items-center gap-2 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs"
          >
            <Download size={15} />
            Exportar
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <article
            key={c.label}
            className="min-w-0 rounded-xl border border-neutral-200 bg-white p-5"
          >
            <h2 className="text-xs text-neutral-500">{c.label}</h2>
            <p className="mt-3 break-words text-2xl font-semibold tracking-tight tabular-nums">
              {c.value}
            </p>
            {c.delta !== null ? (
              <span
                className={`mt-2 inline-block rounded-full px-2 py-1 text-[11px] ${c.delta >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
              >
                {c.delta >= 0 ? "+" : ""}
                {c.delta.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
              </span>
            ) : (
              <p className="mt-2 text-[11px] text-neutral-400">
                {c.label === "Empresas ativas"
                  ? "Total atual"
                  : c.label === "Obrigações pendentes"
                    ? "Pendências atuais"
                    : "Sem comparação disponível"}
              </p>
            )}
            <p className="mt-2 text-[11px] leading-5 text-neutral-500">
              {c.note}
            </p>
            {c.bars.length > 0 && (
              <div
                aria-hidden="true"
                className="mt-4 flex h-10 items-end gap-1"
              >
                {c.bars.map((n, i) => (
                  <span
                    key={i}
                    className={`flex-1 rounded-sm ${i === 11 ? "bg-neutral-800" : "bg-neutral-200"}`}
                    style={{
                      height: `${n ? Math.max(4, (n / Math.max(1, ...c.bars)) * 100) : 0}%`,
                    }}
                  />
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Evolução das conclusões</h2>
          <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
            <span>● Tarefas</span>
            <span className="text-neutral-500">◌ Obrigações</span>
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Quantidade concluída em 12 intervalos do período selecionado.
        </p>
        {d.tasks.some(Boolean) || d.obligations.some(Boolean) ? (
          <svg
            role="img"
            aria-label="Evolução de tarefas e obrigações concluídas"
            viewBox="0 0 790 220"
            className="mt-5 w-full"
          >
            {[0, 0.5, 1].map((n) => (
              <g key={n}>
                <line
                  x1="40"
                  x2="750"
                  y1={185 - n * 150}
                  y2={185 - n * 150}
                  stroke="#eee"
                />
                <text x="2" y={189 - n * 150} fontSize="11" fill="#737373">
                  {Math.round(max * n)}
                </text>
              </g>
            ))}
            <polyline
              points={points(d.tasks)}
              fill="none"
              stroke="#171717"
              strokeWidth="2.5"
            />
            <polyline
              points={points(d.obligations)}
              fill="none"
              stroke="#737373"
              strokeDasharray="5 4"
              strokeWidth="2"
            />
          </svg>
        ) : (
          <div className="mt-5 flex h-48 items-center justify-center rounded-lg bg-neutral-50 p-5 text-center text-sm text-neutral-500">
            Nenhuma conclusão com data registrada neste período.
          </div>
        )}
        <div className="mt-3 flex justify-between text-[11px] text-neutral-500">
          <span>{fmt(d.start)}</span>
          <span>{fmt(d.end)}</span>
        </div>
        {d.undated > 0 && (
          <p className="mt-4 text-xs text-neutral-500">
            {d.undated} registro(s) concluído(s) sem data de conclusão não
            entram no gráfico nem na comparação.
          </p>
        )}
      </div>
    </section>
  );
}
