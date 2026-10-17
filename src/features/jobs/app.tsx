import { useEffect, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Plus, Save, Trash2 } from "lucide-react";
import { FormField, type FieldSpec } from "@/components/ui/form-field";
import { money, type Data, type Item } from "../workspace/model";
import { mutateData } from "../workspace/storage";
import { CboPicker } from "./cbo-picker";
import {
  cboByCode,
  formatCbo,
  newJob,
  normalize,
  rows,
  saveJob,
  validateJob,
  type Salary,
} from "./model";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-40";
const fields: FieldSpec[] = [
  { key: "code", label: "Código", required: true, maxLength: 10 },
  { key: "title", label: "Descrição do cargo", required: true, maxLength: 160 },
  { key: "esocialId", label: "Identificação eSocial", maxLength: 30 },
  {
    key: "kind",
    label: "Tipo de cargo",
    options: ["Privado", "Público efetivo", "Público em comissão", "Outro"],
  },
  { key: "vacancies", label: "Número de vagas", maxLength: 6 },
  {
    key: "status",
    label: "Status",
    required: true,
    options: ["Ativo", "Inativo"],
  },
  { key: "lawNumber", label: "Número da lei", maxLength: 60 },
  { key: "lawDate", label: "Data da lei", type: "date" },
  {
    key: "lawSituation",
    label: "Situação gerada pela lei",
    options: ["Criação", "Alteração", "Extinção"],
  },
  { key: "accumulable", label: "Cargo acumulável", options: ["Sim", "Não"] },
  { key: "accumulation", label: "Acumulação de cargo", maxLength: 160 },
  { key: "specialTime", label: "Contagem de tempo especial", maxLength: 160 },
  { key: "exclusive", label: "Dedicação exclusiva", options: ["Sim", "Não"] },
  { key: "budgetUnit", label: "Unidade orçamentária", maxLength: 160 },
  {
    key: "activities",
    label: "Descrição da atividade exercida",
    type: "textarea",
    maxLength: 4000,
    wide: true,
  },
];
export function Jobs({
  data,
  companyId,
  onSaved,
  onDirtyChange,
}: {
  data: Data;
  companyId: string;
  onSaved: (data: Data) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<Item | null>(null),
    [changed, setChanged] = useState(false),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("Todos"),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [message, setMessage] = useState("");
  useEffect(() => {
    onDirtyChange(changed);
    return () => onDirtyChange(false);
  }, [changed, onDirtyChange]);
  const update = (key: string, value: string) => {
    setDraft((old) =>
      old ? { ...old, values: { ...old.values, [key]: value } } : old,
    );
    setChanged(true);
    setErrors({});
    setMessage("");
  };
  const cancel = () => {
    if (
      changed &&
      !window.confirm("Há alterações não salvas no cargo. Descartar?")
    )
      return;
    setDraft(null);
    setChanged(false);
    setErrors({});
    setMessage("");
  };
  const save = async () => {
    if (!draft) return;
    const found = validateJob(draft, data);
    setErrors(found);
    if (Object.keys(found).length) {
      setMessage("Revise os campos indicados antes de salvar.");
      return;
    }
    setBusy(true);
    try {
      const next = await mutateData((state) => saveJob(state, draft));
      onSaved(next);
      setChanged(false);
      setDraft(null);
      setMessage("Cargo salvo com sucesso.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const jobs = data.items
    .filter(
      (i) =>
        i.module === "jobs" &&
        i.companyId === companyId &&
        (status === "Todos" || i.values.status === status) &&
        normalize(
          [
            i.values.code,
            i.values.title,
            i.values.cbo,
            formatCbo(i.values.cbo || ""),
            i.values.cboTitle,
          ].join(" "),
        ).includes(normalize(query)),
    )
    .sort((a, b) => Number(a.values.code) - Number(b.values.code));
  if (draft) {
    const requirements = rows<string>(draft.values.requirements),
      salaries = rows<Salary>(draft.values.salaries);
    return (
      <section aria-label="Cadastro de cargo">
        <button
          type="button"
          className="mb-5 flex items-center gap-2 text-xs"
          onClick={cancel}
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para cargos
        </button>
        <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold">
          <BriefcaseBusiness className="h-5 w-5" />
          {data.items.some((i) => i.id === draft.id)
            ? "Editar cargo"
            : "Novo cargo"}
        </h2>
        <p className="mb-5 text-xs text-neutral-500">
          A CBO identifica a ocupação. Não define piso salarial, convenção
          coletiva nem regulamentação profissional.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="space-y-5"
        >
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            <fieldset
              disabled={busy}
              className="rounded-2xl border border-neutral-200 bg-white p-5"
            >
              <legend className="px-2 text-sm font-semibold">
                Dados do cargo
              </legend>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {fields.slice(0, 2).map((spec) => (
                  <FormField
                    key={spec.key}
                    spec={spec}
                    layoutClassName={
                      spec.key === "title" ? "xl:col-span-3" : undefined
                    }
                    value={draft.values[spec.key] || ""}
                    error={errors[spec.key]}
                    onChange={(v) => update(spec.key, v)}
                  />
                ))}
                <CboPicker
                  code={draft.values.cbo}
                  error={errors.cbo}
                  onChange={(code) => {
                    setDraft((old) =>
                      old
                        ? {
                            ...old,
                            values: {
                              ...old.values,
                              cbo: code,
                              cboTitle: cboByCode.get(code)!.title,
                              title:
                                old.values.title || cboByCode.get(code)!.title,
                            },
                          }
                        : old,
                    );
                    setChanged(true);
                    setErrors({});
                  }}
                />
                {fields.slice(2, 6).map((spec) => (
                  <FormField
                    key={spec.key}
                    spec={spec}
                    value={draft.values[spec.key] || ""}
                    error={errors[spec.key]}
                    onChange={(v) => update(spec.key, v)}
                  />
                ))}
              </div>
            </fieldset>
            <details className="rounded-2xl border border-neutral-200 bg-white p-5">
              <summary className="cursor-pointer text-sm font-semibold">
                Dados legais e complementares
              </summary>
              <p className="my-4 text-xs text-neutral-500">
                Preencha quando aplicável. Informações legais e de acumulação
                exigem conferência do responsável.
              </p>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {fields.slice(6, 14).map((spec) => (
                  <FormField
                    key={spec.key}
                    spec={spec}
                    value={draft.values[spec.key] || ""}
                    error={errors[spec.key]}
                    onChange={(v) => update(spec.key, v)}
                  />
                ))}
              </div>
            </details>
            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <FormField
                spec={fields[14]}
                value={draft.values.activities || ""}
                error={errors.activities}
                onChange={(v) => update("activities", v)}
              />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                <h3 className="mb-4 text-sm font-semibold">
                  Requisitos do cargo
                </h3>
                {requirements.map((r, i) => (
                  <div key={i} className="mb-3 flex gap-2">
                    <input
                      className="form-control"
                      aria-label={`Requisito ${i + 1}`}
                      maxLength={300}
                      value={r}
                      onChange={(e) =>
                        update(
                          "requirements",
                          JSON.stringify(
                            requirements.map((v, n) =>
                              n === i ? e.target.value : v,
                            ),
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      className={button}
                      aria-label={`Remover requisito ${i + 1}`}
                      onClick={() =>
                        update(
                          "requirements",
                          JSON.stringify(
                            requirements.filter((_, n) => n !== i),
                          ),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={button}
                  disabled={requirements.length >= 100}
                  onClick={() =>
                    update(
                      "requirements",
                      JSON.stringify([...requirements, ""]),
                    )
                  }
                >
                  <Plus className="h-4 w-4" /> Adicionar requisito
                </button>
                {errors.requirements && (
                  <p role="alert" className="mt-2 text-xs text-red-700">
                    {errors.requirements}
                  </p>
                )}
              </section>
              <section className="rounded-2xl border border-neutral-200 bg-white p-5">
                <h3 className="mb-2 text-sm font-semibold">
                  Histórico salarial do cargo
                </h3>
                <p className="mb-4 text-xs text-neutral-500">
                  Referências por vigência. Não altera automaticamente contratos
                  nem calcula reajustes legais.
                </p>
                {salaries.map((row, i) => (
                  <div
                    key={i}
                    className="mb-3 grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2"
                  >
                    <FormField
                      spec={{
                        key: `salary-date-${i}`,
                        label: `Vigência ${i + 1}`,
                        type: "date",
                      }}
                      value={row.date}
                      onChange={(value) =>
                        update(
                          "salaries",
                          JSON.stringify(
                            salaries.map((r, n) =>
                              n === i ? { ...r, date: value } : r,
                            ),
                          ),
                        )
                      }
                    />
                    <FormField
                      spec={{
                        key: `salary-value-${i}`,
                        label: `Salário ${i + 1}`,
                        mask: "money",
                      }}
                      value={row.value ? money(Number(row.value)) : ""}
                      onChange={(value) =>
                        update(
                          "salaries",
                          JSON.stringify(
                            salaries.map((r, n) =>
                              n === i
                                ? { ...r, value: value.replace(/\D/g, "") }
                                : r,
                            ),
                          ),
                        )
                      }
                    />
                    <button
                      type="button"
                      className={button}
                      aria-label={`Remover vigência ${i + 1}`}
                      onClick={() =>
                        update(
                          "salaries",
                          JSON.stringify(salaries.filter((_, n) => n !== i)),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className={button}
                  disabled={salaries.length >= 100}
                  onClick={() =>
                    update(
                      "salaries",
                      JSON.stringify([...salaries, { date: "", value: "" }]),
                    )
                  }
                >
                  <Plus className="h-4 w-4" /> Adicionar vigência
                </button>
                {errors.salaries && (
                  <p role="alert" className="mt-2 text-xs text-red-700">
                    {errors.salaries}
                  </p>
                )}
              </section>
            </div>
            {message && (
              <p
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"
              >
                {message}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={cancel}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={busy}
                className={`${button} !bg-neutral-900 !text-white`}
              >
                <Save className="h-4 w-4" />
                {busy ? "Salvando…" : "Salvar cargo"}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    );
  }
  return (
    <section aria-label="Cargos da empresa">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <BriefcaseBusiness className="h-5 w-5" /> Cargos
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Cadastre cargos e suas ocupações CBO para a empresa selecionada.
          </p>
        </div>
        <button
          type="button"
          disabled={!companyId}
          className={button}
          onClick={() => {
            setDraft(newJob(data, companyId));
            setChanged(false);
            setErrors({});
            setMessage("");
          }}
        >
          <Plus className="h-4 w-4" /> Novo cargo
        </button>
      </div>
      {!companyId ? (
        <p className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
          Selecione uma empresa acima para consultar e cadastrar seus cargos.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-3">
            <input
              aria-label="Buscar cargos"
              className="form-control max-w-md"
              placeholder="Buscar por código, cargo ou CBO"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Filtrar status dos cargos"
              className="form-control sm:!w-40"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>Todos</option>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
          </div>
          <p className="mb-3 text-xs text-neutral-500">
            {jobs.length} cargo(s) encontrado(s)
          </p>
          <div className="relative overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500">
                <tr>
                  {[
                    "Código",
                    "Descrição",
                    "CBO",
                    "Descrição CBO",
                    "Nº da lei",
                    "Status",
                    "",
                  ].map((s, i) => (
                    <th key={i} className="p-3 font-medium">
                      {s || <span className="sr-only">Ações</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-t border-neutral-100">
                    <td className="p-3">{job.values.code}</td>
                    <td className="p-3 font-medium">{job.values.title}</td>
                    <td className="p-3 whitespace-nowrap font-mono">
                      {formatCbo(job.values.cbo)}
                    </td>
                    <td className="p-3 text-neutral-500">
                      {job.values.cboTitle}
                    </td>
                    <td className="p-3">{job.values.lawNumber || "—"}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 ${job.values.status === "Ativo" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}
                      >
                        {job.values.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        className="underline"
                        aria-label={`Editar cargo ${job.values.title}`}
                        onClick={() => {
                          setDraft(structuredClone(job));
                          setChanged(false);
                          setErrors({});
                          setMessage("");
                        }}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!jobs.length && (
              <p className="p-5 text-sm text-neutral-500">
                Nenhum cargo encontrado.
              </p>
            )}
          </div>
        </>
      )}
      {message && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-neutral-200 bg-white p-3 text-sm"
        >
          {message}
        </p>
      )}
    </section>
  );
}
