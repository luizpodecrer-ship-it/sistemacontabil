import { EmployeeJobPicker } from "../jobs/employee-picker";
import { loadJobsData } from "../jobs/storage";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  Plus,
  Users,
  Save,
  ArrowLeft,
  Trash2,
  FileCheck2,
  LoaderCircle,
} from "lucide-react";
import { FormField, type FieldSpec } from "@/components/ui/form-field";
import { digits, formatCpf } from "@/lib/formats";
import { type Company, type Values } from "../companies/model";
import { lookupCep } from "../companies/cep";
import { mutateData } from "../workspace/storage";
import { type Item } from "../workspace/model";
import { blocks, repeating, sectionRepeats } from "./fields";
import {
  deriveCtps,
  newEmployee,
  validateEmployee,
  saveEmployeeInData,
  rowsOf,
  changesOf,
  visibleFields,
  blockForError,
} from "./model";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-40";
const addLabels: Record<string, string> = {
  dependents: "dependente",
  benefitRows: "benefício",
  vacations: "período aquisitivo",
  workdays: "dia",
  salaryHistory: "vigência",
  serviceTakers: "tomador",
  cipaHistory: "mandato",
  training: "treinamento",
  calls: "convocação",
};
export function CompanyEmployees({
  company,
  onDirtyChange,
  onEditingChange,
}: {
  company: Company;
  onDirtyChange: (value: boolean) => void;
  onEditingChange: (value: boolean) => void;
}) {
  const [jobs, setJobs] = useState<Item[]>([]);
  const [items, setItems] = useState<Item[]>([]),
    [draft, setDraft] = useState<Item | null>(null),
    [errors, setErrors] = useState<Values>({}),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [expanded, setExpanded] = useState<string[]>(["personal"]);
  const [cepNotice, setCepNotice] = useState(""),
    [cepRetry, setCepRetry] = useState(0),
    [photo, setPhoto] = useState("");
  const initialCep = useRef(""),
    initialEmployee = useRef("");
  useEffect(() => {
    let active = true;
    loadJobsData()
      .then((data) => {
        if (active) {
          setJobs(
            data.items.filter((i) => i.module === "jobs" && !i.companyId),
          );
          setItems(
            data.items.filter(
              (i) => i.module === "employees" && i.companyId === company.id,
            ),
          );
        }
      })
      .catch((e) => {
        if (active) setLoadError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [company.id]);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onEditingChange(!!draft);
  }, [!!draft, onEditingChange]);
  useEffect(
    () => () => {
      onDirtyChange(false);
      onEditingChange(false);
    },
    [onDirtyChange, onEditingChange],
  );
  useEffect(() => {
    if (!draft?.file) {
      setPhoto("");
      return;
    }
    const url = URL.createObjectURL(draft.file);
    setPhoto(url);
    return () => URL.revokeObjectURL(url);
  }, [draft?.file]);
  const cep = digits(draft?.values.cep || "");
  useEffect(() => {
    if (
      !draft ||
      cep.length !== 8 ||
      (draft.id === initialEmployee.current &&
        cep === initialCep.current &&
        !cepRetry)
    )
      return;
    const controller = new AbortController(),
      id = draft.id;
    const addressAtStart = { ...draft.values };
    setCepNotice("Consultando CEP…");
    lookupCep(cep, controller.signal)
      .then((values) => {
        if (controller.signal.aborted) return;
        setDraft((current) => {
          if (
            !current ||
            current.id !== id ||
            digits(current.values.cep || "") !== cep
          )
            return current;
          const next = { ...current.values };
          for (const key of ["street", "district", "city", "uf"])
            if (values[key] && !next[key] && next[key] === addressAtStart[key])
              next[key] = values[key];
          return { ...current, values: next };
        });
        setCepNotice(
          "Endereço consultado. Campos já preenchidos foram preservados; confira os dados.",
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setCepNotice(e.message);
      });
    return () => controller.abort();
  }, [cep, draft?.id, cepRetry]);
  function open(item: Item) {
    if (dirty && !window.confirm("Descartar alterações do colaborador?"))
      return;
    initialEmployee.current = item.id;
    initialCep.current = digits(item.values.cep || "");
    setCepRetry(0);
    setDraft({ ...structuredClone(item), values: deriveCtps(item.values) });
    setDirty(false);
    setErrors({});
    setNotice("");
    setCepNotice("");
    setExpanded(["personal"]);
  }
  function change(key: string, value: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            values: deriveCtps({ ...current.values, [key]: value }),
          }
        : current,
    );
    setDirty(true);
    setErrors((old) => ({ ...old, [key]: "" }));
  }
  function close() {
    if (
      dirty &&
      !window.confirm("Descartar alterações não salvas do colaborador?")
    )
      return;
    setDraft(null);
    setDirty(false);
    setErrors({});
    setNotice("");
  }
  async function save(complete: boolean) {
    if (!draft) return;
    const found = validateEmployee(draft, [...items, ...jobs], complete);
    setErrors(found);
    if (Object.keys(found).length) {
      setExpanded((old) => [
        ...new Set([...old, ...Object.keys(found).map(blockForError)]),
      ]);
      setNotice("Revise os campos indicados.");
      setTimeout(() => document.getElementById("employee-errors")?.focus(), 0);
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      let saved: Item | undefined;
      const data = await mutateData((next) => {
        saved = saveEmployeeInData(next, draft, complete);
      });
      setItems(
        data.items.filter(
          (i) => i.module === "employees" && i.companyId === company.id,
        ),
      );
      setJobs(data.items.filter((i) => i.module === "jobs" && !i.companyId));
      setDraft(saved!);
      setDirty(false);
      setNotice(
        complete
          ? "Cadastro do colaborador concluído."
          : "Rascunho do colaborador salvo.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  function field(
    spec: FieldSpec,
    values: Values = draft!.values,
    prefix = "",
    rowChange?: (key: string, value: string) => void,
  ) {
    if (
      !prefix &&
      [
        "registration",
        "birth",
        "workerKind",
        "contractType",
        "role",
        "status",
        "admission",
        "esocialCategory",
      ].includes(spec.key)
    )
      spec = { ...spec, required: true };
    if (!prefix && spec.key === "cbo") return null;
    if (!prefix && spec.key === "role")
      return (
        <EmployeeJobPicker
          key="role-picker"
          company={company}
          jobs={jobs}
          values={values}
          error={errors.role || errors.cbo}
          onRefresh={async () => {
            try {
              const state = await loadJobsData();
              setJobs(
                state.items.filter((i) => i.module === "jobs" && !i.companyId),
              );
            } catch (e) {
              setNotice((e as Error).message);
            }
          }}
          onSelect={(job) => {
            setDraft((current) =>
              current
                ? {
                    ...current,
                    values: {
                      ...current.values,
                      roleId: job?.id || "",
                      role: job?.values.title || "",
                      roleCode: job?.values.code || "",
                      cbo: job?.values.cbo || "",
                      roleCboVersion: job?.values.cboVersion || "",
                    },
                  }
                : current,
            );
            setDirty(true);
            setErrors((old) => ({ ...old, role: "", cbo: "" }));
          }}
        />
      );
    if (!prefix && spec.key === "establishment")
      spec = {
        ...spec,
        choices: [
          { value: company.id, label: `Matriz · ${company.values.legalName}` },
          ...company.branches.map((branch) => ({
            value: branch.id,
            label:
              branch.values.legalName ||
              branch.values.tradeName ||
              branch.values.cnpj ||
              branch.id,
          })),
        ],
      };
    return (
      <FormField
        key={prefix + spec.key}
        spec={{ ...spec, key: prefix + spec.key }}
        value={values[spec.key] || ""}
        error={errors[prefix + spec.key]}
        onChange={(value) =>
          rowChange ? rowChange(spec.key, value) : change(spec.key, value)
        }
        layoutClassName={
          spec.wide
            ? "min-w-0 md:col-span-2 xl:col-span-4"
            : /title|Name|description|street|mother|father|email|Email|notes/i.test(
                  spec.key,
                )
              ? "min-w-0 md:col-span-2"
              : "min-w-0"
        }
      />
    );
  }
  function rowsEditor(groupId: string) {
    const group = repeating.find((g) => g.id === groupId)!;
    const rows = rowsOf(draft!.values, groupId);
    return (
      <section
        key={groupId}
        className="mt-5 border-t border-neutral-100 pt-4"
        aria-label={group.title}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-semibold">
            {group.title}{" "}
            <span className="text-neutral-400">({rows.length})</span>
          </h4>
          <button
            type="button"
            className={button}
            onClick={() =>
              change(
                groupId,
                JSON.stringify([
                  ...rows,
                  { id: crypto.randomUUID(), values: {} },
                ]),
              )
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar {addLabels[groupId]}
          </button>
        </div>
        {!rows.length && (
          <p className="text-xs text-neutral-400">
            Nenhum registro adicionado.
          </p>
        )}
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="mb-3 rounded-xl border border-neutral-200 bg-neutral-50/50 p-4"
          >
            <div className="mb-3 flex justify-between gap-2">
              <h5 className="text-xs font-medium">
                {group.title} · {index + 1}
              </h5>
              <button
                type="button"
                aria-label={`Remover ${group.title} ${index + 1}`}
                className="text-neutral-500 hover:text-red-700"
                onClick={() => {
                  if (
                    window.confirm(
                      "Remover este registro do formulário? Salve o colaborador para confirmar a alteração.",
                    )
                  )
                    change(
                      groupId,
                      JSON.stringify(rows.filter((r) => r.id !== row.id)),
                    );
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {group.fields.map((spec) =>
                field(spec, row.values, `${groupId}.${row.id}.`, (key, value) =>
                  change(
                    groupId,
                    JSON.stringify(
                      rows.map((r) =>
                        r.id === row.id
                          ? { ...r, values: { ...r.values, [key]: value } }
                          : r,
                      ),
                    ),
                  ),
                ),
              )}
            </div>
          </div>
        ))}
      </section>
    );
  }
  if (loading)
    return (
      <p role="status" className="p-5 text-sm text-neutral-500">
        Carregando colaboradores…
      </p>
    );
  if (loadError)
    return (
      <p
        role="alert"
        className="rounded-xl border border-red-200 p-5 text-sm text-red-700"
      >
        {loadError} Recarregue a página para tentar novamente.
      </p>
    );
  if (!draft) {
    const q = query
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const rows = items.filter((item) =>
      [
        item.values.title,
        item.values.registration,
        item.values.role,
        item.values.cpf,
        digits(item.values.cpf || ""),
      ]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(q),
    );
    return (
      <section
        className="rounded-2xl border border-neutral-200 bg-white p-4 md:p-5 mb-4"
        aria-label="Colaboradores da empresa"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Users strokeWidth={1.6} className="h-4 w-4" />
              Colaboradores
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              {items.length} vínculo(s) nesta empresa · mesmo cadastro de
              Pessoal e vínculos.
            </p>
          </div>
          <button
            type="button"
            className={button}
            disabled={!company.updatedAt}
            onClick={() => open(newEmployee(company.id))}
          >
            <Plus className="h-4 w-4" />
            Novo colaborador
          </button>
        </div>
        {!company.updatedAt && (
          <p className="mb-4 text-sm text-amber-800">
            Salve primeiro o rascunho da empresa para cadastrar seus
            colaboradores.
          </p>
        )}
        <input
          className="form-control mb-4 sm:max-w-sm"
          aria-label="Buscar colaboradores"
          placeholder="Buscar por nome, CPF, matrícula ou cargo"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!rows.length ? (
          <p className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-400">
            {items.length
              ? "Nenhum colaborador corresponde à busca."
              : "Nenhum colaborador cadastrado nesta empresa."}
          </p>
        ) : (
          <div
            className="relative overflow-x-auto rounded-xl border border-neutral-200"
            tabIndex={0}
            role="region"
            aria-label="Lista de colaboradores"
          >
            <table
              className="w-full min-w-[760px] text-left text-xs"
              aria-label="Colaboradores cadastrados"
            >
              <thead className="border-b border-neutral-200 bg-neutral-50 text-[10px] uppercase tracking-wide text-neutral-500">
                <tr>
                  {[
                    "Matrícula",
                    "Nome",
                    "CPF",
                    "Cargo",
                    "Admissão",
                    "Situação",
                    "Cadastro",
                    "Ações",
                  ].map((c) => (
                    <th scope="col" className="px-3 py-3 font-medium" key={c}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50">
                    <td className="px-3 py-3">
                      {item.values.registration || "—"}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => open(item)}
                        className="text-left font-medium hover:underline"
                      >
                        {item.values.title}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      {formatCpf(item.values.cpf || "")}
                    </td>
                    <td className="px-3 py-3">{item.values.role || "—"}</td>
                    <td className="px-3 py-3">
                      {item.values.admission?.split("-").reverse().join("/") ||
                        "—"}
                    </td>
                    <td className="px-3 py-3">
                      {item.archived
                        ? "Arquivado"
                        : item.values.status || "Não informada"}
                    </td>
                    <td className="px-3 py-3 text-neutral-500">
                      {item.values.recordStatus || "Legado"}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => open(item)}
                        className="underline"
                      >
                        Abrir colaborador
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }
  return (
    <div className="mb-4" aria-label="Cadastro do colaborador">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="flex items-center gap-2 text-xs text-neutral-500"
          onClick={close}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para colaboradores
        </button>
        <span className="text-xs text-neutral-400">
          {dirty
            ? "Alterações não salvas"
            : draft.values.recordStatus || "Cadastro legado"}
        </span>
      </div>
      <h2 className="mb-2 text-lg font-semibold">
        {draft.values.title || "Novo colaborador"}
      </h2>
      <p className="mb-4 text-xs leading-relaxed text-neutral-500">
        Vínculo com {company.values.legalName}. Nome e CPF válido permitem
        salvar rascunho; campos com * e dados essenciais do vínculo são
        conferidos ao concluir.
      </p>
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-neutral-200 bg-white p-3 text-sm"
        >
          {notice}
        </p>
      )}
      {!!Object.values(errors).filter(Boolean).length && (
        <div
          id="employee-errors"
          tabIndex={-1}
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm font-semibold text-red-800">
            Revise o cadastro do colaborador
          </p>
          <ul className="mt-2 space-y-1">
            {Object.entries(errors)
              .filter(([, value]) => value)
              .map(([key, value]) => (
                <li key={key}>
                  <button
                    type="button"
                    className="text-left text-xs text-red-700 underline"
                    onClick={() => {
                      const id = blockForError(key);
                      setExpanded((old) => [...new Set([...old, id])]);
                      setTimeout(
                        () => document.getElementById(`field-${key}`)?.focus(),
                        0,
                      );
                    }}
                  >
                    {key.includes(".")
                      ? repeating.find((g) => key.startsWith(g.id + "."))?.title
                      : blocks
                          .flatMap((b) => b.fields)
                          .find((f) => f.key === key)?.label}
                    : {value}
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
      {blocks.map((block) => (
        <section
          key={block.id}
          className="mb-3 overflow-hidden rounded-xl border border-neutral-200 bg-white"
        >
          <h3>
            <button
              type="button"
              id={`employee-section-${block.id}`}
              aria-expanded={expanded.includes(block.id)}
              aria-controls={`employee-content-${block.id}`}
              className="flex w-full items-center justify-between px-4 py-4 text-left text-sm font-semibold hover:bg-neutral-50"
              onClick={() =>
                setExpanded((old) =>
                  old.includes(block.id)
                    ? old.filter((id) => id !== block.id)
                    : [...old, block.id],
                )
              }
            >
              {block.title}
              <span aria-hidden="true" className="text-neutral-400">
                {expanded.includes(block.id) ? "−" : "+"}
              </span>
            </button>
          </h3>
          <div
            id={`employee-content-${block.id}`}
            hidden={!expanded.includes(block.id)}
            aria-labelledby={`employee-section-${block.id}`}
            className="border-t border-neutral-100 p-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {visibleFields(block.id, draft.values).map((spec) => (
                <Fragment key={spec.key}>
                  {field(spec)}
                  {spec.key === "ctpsType" &&
                    draft.values.ctpsType === "Digital" && (
                      <div className="md:col-span-2">
                        <label
                          htmlFor="employee-digital-ctps"
                          className="mb-1.5 block text-xs font-semibold text-neutral-700"
                        >
                          Número da Carteira Digital
                        </label>
                        <input
                          id="employee-digital-ctps"
                          className="form-control bg-neutral-50"
                          readOnly
                          value={draft.values.ctpsDigitalNumber || ""}
                          placeholder="Informe um CPF válido"
                          aria-describedby="employee-digital-hint"
                        />
                        <p
                          id="employee-digital-hint"
                          className="mt-1 text-[11px] text-neutral-500"
                        >
                          Identificação pelo CPF. Não confirma emissão, ativação
                          ou vínculos no governo. CTPS Digital não usa série.
                        </p>
                      </div>
                    )}
                </Fragment>
              ))}
            </div>
            {block.id === "personal" && (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p role="status" className="text-xs text-neutral-500">
                    {cepNotice ||
                      "O CEP preenche somente os campos vazios do endereço."}
                  </p>
                  {cep.length === 8 && (
                    <button
                      type="button"
                      className="text-xs underline"
                      onClick={() => setCepRetry((n) => n + 1)}
                    >
                      Consultar CEP
                    </button>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {photo &&
                    (draft.file?.type.startsWith("image/") ? (
                      <img
                        src={photo}
                        alt="Foto do colaborador"
                        className="h-16 w-16 rounded-xl object-cover"
                      />
                    ) : (
                      <a
                        href={photo}
                        download={draft.file?.name}
                        className="text-xs underline"
                      >
                        Baixar anexo existente · {draft.file?.name}
                      </a>
                    ))}
                  <label className="text-xs font-medium">
                    Foto do colaborador
                    <input
                      className="mt-1 block max-w-full text-xs"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (
                          file.size > 2 * 1024 * 1024 ||
                          !["image/jpeg", "image/png"].includes(file.type)
                        ) {
                          setNotice(
                            "Selecione uma foto JPG ou PNG de até 2 MB.",
                          );
                          e.target.value = "";
                          return;
                        }
                        if (
                          draft.file &&
                          !draft.file.type.startsWith("image/") &&
                          !window.confirm(
                            "Este cadastro já contém um anexo. Deseja substituí-lo pela foto? Baixe o original antes de substituir.",
                          )
                        ) {
                          e.target.value = "";
                          return;
                        }
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                file,
                                values: { ...d.values, photoName: file.name },
                              }
                            : d,
                        );
                        setDirty(true);
                      }}
                    />
                  </label>
                  {draft.file && (
                    <button
                      type="button"
                      className="text-xs underline"
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Remover o arquivo deste cadastro? Salve o colaborador para confirmar.",
                          )
                        )
                          return;
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                file: undefined,
                                values: { ...d.values, photoName: "" },
                              }
                            : d,
                        );
                        setDirty(true);
                      }}
                    >
                      {draft.file.type.startsWith("image/")
                        ? "Remover foto"
                        : "Remover anexo"}
                    </button>
                  )}
                </div>
              </>
            )}
            {(sectionRepeats[block.id] || []).map(rowsEditor)}
          </div>
        </section>
      ))}
      <details className="mb-4 rounded-xl border border-neutral-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Histórico do colaborador ({changesOf(draft.values).length})
        </summary>
        <ol className="mt-3 space-y-3">
          {changesOf(draft.values).map((entry, index) => (
            <li
              key={index}
              className="border-t border-neutral-100 pt-2 text-xs"
            >
              <p className="font-medium">
                {new Date(entry.at).toLocaleString("pt-BR")}
              </p>
              <p className="mt-1 text-neutral-500">
                {entry.fields
                  .map(
                    (key) =>
                      blocks.flatMap((b) => b.fields).find((f) => f.key === key)
                        ?.label ||
                      repeating.find((r) => r.id === key)?.title ||
                      key,
                  )
                  .join(", ")}
              </p>
              <details className="mt-1">
                <summary className="cursor-pointer text-neutral-500">
                  Ver valores registrados
                </summary>
                <dl className="mt-2 space-y-1">
                  {entry.fields
                    .filter((key) => !repeating.some((g) => g.id === key))
                    .map((key) => (
                      <div key={key} className="break-words">
                        <dt className="font-medium">
                          {blocks
                            .flatMap((b) => b.fields)
                            .find((f) => f.key === key)?.label || key}
                        </dt>
                        <dd>
                          {entry.before[key] || "—"} → {entry.after[key] || "—"}
                        </dd>
                      </div>
                    ))}
                </dl>
              </details>
            </li>
          ))}
        </ol>
      </details>
      <p className="mb-4 text-xs leading-relaxed text-neutral-500">
        Parâmetros cadastrais sujeitos à conferência profissional nas{" "}
        <a
          href="https://www.gov.br/esocial/pt-br/documentacao-tecnica"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          tabelas vigentes do eSocial
        </a>
        . Este cadastro não consulta CPF/CTPS no governo, não apura encargos e
        não transmite admissões ou eventos.{" "}
        <a
          href="https://www.gov.br/pt-br/servicos/obter-a-carteira-de-trabalho"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Orientação sobre CTPS Digital
        </a>
        .
      </p>
      <div className="sticky bottom-0 z-10 flex flex-wrap justify-end gap-2 rounded-xl border border-neutral-200 bg-white/95 p-4">
        <button
          type="button"
          disabled={busy}
          className={button}
          onClick={() => void save(false)}
        >
          {busy ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar rascunho do colaborador
        </button>
        <button
          type="button"
          disabled={busy}
          className={`${button} !bg-neutral-900 !text-white`}
          onClick={() => void save(true)}
        >
          <FileCheck2 className="h-4 w-4" />
          Concluir colaborador
        </button>
      </div>
    </div>
  );
}
