import { useState } from "react";
import type { Company } from "../companies/model";
import type { Item, Values } from "../workspace/model";
import {
  availableJobs,
  companySegments,
  segments,
  normalize,
  formatCbo,
} from "./model";
export function EmployeeJobPicker({
  company,
  jobs,
  values,
  error,
  onSelect,
  onRefresh,
}: {
  company: Company;
  jobs: Item[];
  values: Values;
  error?: string;
  onSelect: (job: Item | undefined) => void;
  onRefresh: () => Promise<void>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState(""),
    [segment, setSegment] = useState("suggested");
  const suggested = companySegments(company);
  const codes =
    segment === "all" ? [] : segment === "suggested" ? suggested : [segment];
  const matches = availableJobs(jobs, codes).filter((job) =>
    normalize(
      [
        job.values.title,
        job.values.code,
        job.values.cbo,
        formatCbo(job.values.cbo),
      ].join(" "),
    ).includes(normalize(query)),
  );
  const current = jobs.find((j) => j.id === values.roleId),
    included = matches.some((j) => j.id === values.roleId);
  return (
    <div className="min-w-0 md:col-span-2 xl:col-span-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="mb-3 text-xs text-neutral-500">
        Selecione um cargo do catálogo do escritório. O CBO será preenchido
        automaticamente.{" "}
        {suggested.length
          ? `Sugestões pelos CNAEs cadastrados: ${segments
              .filter((s) => suggested.includes(s.code))
              .map((s) => s.label)
              .join(", ")}.`
          : "Empresa sem segmento identificado pelos CNAEs; todos os cargos ativos estão disponíveis."}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold">
          Buscar cargo
          <input
            aria-label="Buscar cargo do colaborador"
            className="form-control mt-1.5"
            placeholder="Nome, código ou CBO"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="text-xs font-semibold">
          Filtrar por segmento
          <select
            aria-label="Filtrar cargos por segmento"
            className="form-control mt-1.5"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
          >
            <option value="suggested">Segmentos da empresa</option>
            <option value="all">Todos os segmentos</option>
            {segments.map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          Cargo <span className="text-neutral-400">*</span>
          <select
            aria-label="Cargo"
            aria-required="true"
            aria-invalid={!!error}
            aria-describedby={error ? "employee-job-error" : undefined}
            className="form-control mt-1.5"
            value={values.roleId || (values.role ? "__legacy" : "")}
            onChange={(e) =>
              onSelect(matches.find((j) => j.id === e.target.value))
            }
          >
            <option value="">Selecione um cargo cadastrado</option>
            {!values.roleId && values.role && (
              <option value="__legacy" disabled>
                Cadastro anterior · {values.role}
              </option>
            )}
            {values.roleId && !included && (
              <option value={values.roleId} disabled>
                {values.role} ·{" "}
                {current?.values.status === "Inativo"
                  ? "inativo, vínculo preservado"
                  : "seleção atual preservada"}
              </option>
            )}
            {matches.map((job) => (
              <option key={job.id} value={job.id}>
                {job.values.code} · {job.values.title} ·{" "}
                {formatCbo(job.values.cbo)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          CBO
          <input
            aria-label="CBO"
            className="form-control mt-1.5 !bg-neutral-100"
            value={formatCbo((values.cbo || "").replace(/\D/g, ""))}
            placeholder="Preenchido ao selecionar o cargo"
            readOnly
          />
        </label>
      </div>
      {!matches.length && (
        <p className="mt-3 text-xs text-neutral-500">
          Nenhum cargo ativo corresponde à busca. Consulte todos os segmentos ou
          cadastre um cargo no menu Cargos.
        </p>
      )}
      <button
        type="button"
        disabled={refreshing}
        className="mt-3 text-xs underline disabled:opacity-40"
        onClick={async () => {
          setRefreshing(true);
          try {
            await onRefresh();
          } finally {
            setRefreshing(false);
          }
        }}
      >
        {refreshing ? "Atualizando cargos…" : "Atualizar lista de cargos"}
      </button>
      {error && (
        <p id="employee-job-error" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
