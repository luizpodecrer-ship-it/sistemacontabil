import { useEffect, useState } from "react";
import { Building2, MoreHorizontal, ArrowUpRight, Pencil } from "lucide-react";
import { formatCnpj, formatCpf, formatCnae } from "@/lib/formats";
import type { Company } from "./model";

const columns = [
  "Código",
  "Razão Social",
  "Tipo de Insc",
  "Inscrição",
  "Status",
  "Data de Inativação",
  "CNAE",
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
export function CompanyTable({
  rows,
  onOpen,
}: {
  rows: Company[];
  onOpen: (company: Company) => void;
}) {
  const [menu, setMenu] = useState<string | null>(null);
  const visible = rows.map((c) => c.id).join("|");
  useEffect(() => {
    setMenu(null);
  }, [visible]);
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
            className="w-full min-w-[1050px] text-sm text-left"
            aria-label="Empresas cadastradas"
          >
            <colgroup>
              <col className="w-16" />
              <col />
              <col className="w-28" />
              <col className="w-40" />
              <col className="w-24" />
              <col className="w-36" />
              <col className="w-28" />
              <col className="w-14" />
            </colgroup>
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] uppercase tracking-wider text-neutral-500">
                {columns.map((label) => (
                  <th
                    scope="col"
                    key={label}
                    className="whitespace-nowrap px-3 py-3 font-medium"
                  >
                    {label}
                  </th>
                ))}
                <th scope="col" className="px-3 py-3">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((c) => {
                const values = cells(c);
                return (
                  <tr key={c.id} className="hover:bg-neutral-50/70">
                    <td className="px-3 py-3 text-xs tabular-nums text-neutral-500">
                      {values[0] || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-neutral-100 text-neutral-500">
                          <Building2
                            strokeWidth={1.6}
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </span>
                        <div className="min-w-[220px] break-words">
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
                    <td className="px-3 py-3 text-xs text-neutral-500">
                      {values[2]}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-neutral-500">
                      {values[3] || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${values[4] === "Ativa" ? "bg-emerald-50 text-emerald-700" : values[4] === "Inativa" || values[4] === "Encerrada" ? "bg-neutral-100 text-neutral-600" : "bg-amber-50 text-amber-800"}`}
                      >
                        {values[4] || "Não informado"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums text-neutral-500">
                      {values[5] || "—"}
                    </td>
                    <td
                      className="px-3 py-3 text-xs tabular-nums text-neutral-500"
                      title={c.values.predominantCnaeDescription}
                    >
                      {values[6] || "—"}
                    </td>
                    <td className="px-3 py-3" data-company-actions>
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
