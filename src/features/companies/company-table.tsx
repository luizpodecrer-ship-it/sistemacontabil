import { useEffect, useRef, useState } from "react";
import {
  Building2,
  MoreHorizontal,
  Download,
  ArrowUpRight,
  Pencil,
} from "lucide-react";
import { formatCnpj, formatCpf, formatCnae } from "@/lib/formats";
import type { Company } from "./model";

const columns = [
  "Código",
  "Razão Social",
  "Tipo de Inscrição",
  "Inscrição",
  "Status",
  "Data de Inativação",
  "CNAE Preponderante",
];
function cells(c: Company) {
  const v = c.values;
  const cpf = v.personType === "Pessoa física";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(v.inactiveAt || "")
    ? v.inactiveAt.split("-").reverse().join("/")
    : v.inactiveAt || "";
  return [
    v.code || "",
    v.legalName || "",
    cpf ? "CPF" : "CNPJ",
    v.cnpj ? (cpf ? formatCpf(v.cnpj) : formatCnpj(v.cnpj)) : "",
    v.officeStatus || "",
    date,
    v.predominantCnae ? formatCnae(v.predominantCnae) : "",
  ];
}
function csvCell(value: string) {
  return (
    '"' +
    (/^[=+@\-\t\r\n]/.test(value) ? "'" + value : value).replaceAll('"', '""') +
    '"'
  );
}
export function CompanyTable({
  rows,
  onOpen,
}: {
  rows: Company[];
  onOpen: (company: Company) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const allRef = useRef<HTMLInputElement>(null);
  const visible = rows.map((c) => c.id).join("|");
  useEffect(() => {
    const ids = new Set(rows.map((c) => c.id));
    setSelected((old) => old.filter((id) => ids.has(id)));
    setMenu(null);
  }, [visible]);
  const chosen = rows.filter((c) => selected.includes(c.id));
  const all = rows.length > 0 && chosen.length === rows.length;
  useEffect(() => {
    if (allRef.current)
      allRef.current.indeterminate = chosen.length > 0 && !all;
  }, [chosen.length, all]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => {
      if (
        !(e.target instanceof Element) ||
        !e.target.closest("[data-company-actions]")
      )
        setMenu(null);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [menu]);
  function exportSelected() {
    const csv =
      "\uFEFF" +
      [columns, ...chosen.map(cells)]
        .map((row) => row.map(csvCell).join(";"))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "empresas-selecionadas.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          const trigger = menu
            ? document.getElementById(`company-actions-${menu}`)
            : null;
          setMenu(null);
          trigger?.focus();
        }
      }}
    >
      {!!chosen.length && (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-neutral-900 px-5 py-3 text-white"
          aria-label="Ações em lote"
        >
          <p className="text-sm" role="status">
            {chosen.length} empresa(s) selecionada(s)
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportSelected}
              className="flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs hover:bg-neutral-800"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar selecionadas
            </button>
            <button
              onClick={() => setSelected([])}
              className="rounded-lg border border-neutral-700 px-3 py-2 text-xs hover:bg-neutral-800"
            >
              Limpar seleção
            </button>
          </div>
        </div>
      )}
      <div
        id="companies"
        className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white"
      >
        <div
          role="region"
          aria-label="Tabela de empresas — role horizontalmente para ver todas as colunas"
          tabIndex={0}
          className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-neutral-500"
        >
          <table
            className="w-full min-w-[1100px] text-sm text-left"
            aria-label="Empresas cadastradas"
          >
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                <th scope="col" className="w-12 px-4 py-3">
                  <input
                    ref={allRef}
                    type="checkbox"
                    aria-label="Selecionar todas as empresas exibidas"
                    checked={all}
                    onChange={() =>
                      setSelected(all ? [] : rows.map((c) => c.id))
                    }
                    className="h-4 w-4 accent-neutral-900"
                  />
                </th>
                {columns.map((label) => (
                  <th scope="col" key={label} className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((c) => {
                const values = cells(c);
                const checked = selected.includes(c.id);
                return (
                  <tr
                    key={c.id}
                    className={
                      checked ? "bg-neutral-50" : "hover:bg-neutral-50/70"
                    }
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Selecionar empresa ${c.values.code || c.values.legalName}`}
                        checked={checked}
                        onChange={() =>
                          setSelected((old) =>
                            checked
                              ? old.filter((id) => id !== c.id)
                              : [...old, c.id],
                          )
                        }
                        className="h-4 w-4 accent-neutral-900"
                      />
                    </td>
                    <td className="px-4 py-4 text-xs tabular-nums text-neutral-500">
                      {values[0] || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-500">
                          <Building2
                            strokeWidth={1.6}
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </span>
                        <div className="min-w-[200px] max-w-sm">
                          <button
                            onClick={() => onOpen(c)}
                            className="text-left font-medium text-neutral-900 hover:underline focus-visible:underline"
                          >
                            {values[1] || "Empresa sem razão social"}
                          </button>
                          {c.values.tradeName &&
                            c.values.tradeName !== values[1] && (
                              <p className="mt-1 text-xs text-neutral-500">
                                {c.values.tradeName}
                              </p>
                            )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-neutral-500">
                      {values[2]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs tabular-nums text-neutral-500">
                      {values[3] || "—"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${values[4] === "Ativa" ? "bg-emerald-50 text-emerald-700" : values[4] === "Inativa" || values[4] === "Encerrada" ? "bg-neutral-100 text-neutral-600" : "bg-amber-50 text-amber-800"}`}
                      >
                        {values[4] || "Não informado"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs tabular-nums text-neutral-500">
                      {values[5] || "—"}
                    </td>
                    <td
                      className="px-4 py-4 text-xs tabular-nums text-neutral-500"
                      title={c.values.predominantCnaeDescription}
                    >
                      {values[6] || "—"}
                    </td>
                    <td className="px-4 py-4" data-company-actions>
                      <button
                        id={`company-actions-${c.id}`}
                        aria-label={`Ações da empresa ${c.values.code || c.values.legalName}`}
                        aria-expanded={menu === c.id}
                        aria-controls={`company-action-panel-${c.id}`}
                        onClick={() => setMenu(menu === c.id ? null : c.id)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {menu === c.id && (
                        <div
                          id={`company-action-panel-${c.id}`}
                          className="mt-2 min-w-36 space-y-1 rounded-lg border border-neutral-200 p-1"
                        >
                          <button
                            onClick={() => onOpen(c)}
                            className="flex w-full items-center gap-2 rounded px-2 py-2 text-xs hover:bg-neutral-100"
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            Abrir cadastro
                          </button>
                          <button
                            onClick={() => onOpen(c)}
                            className="flex w-full items-center gap-2 rounded px-2 py-2 text-xs hover:bg-neutral-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Editar cadastro
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
