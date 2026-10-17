import { cloudConfigured } from "../../backend/client";
import { createRoot, type Root } from "react-dom/client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Building2,
  Search,
  Save,
  Check,
  Trash2,
  Download,
  LoaderCircle,
  MapPin,
  Activity,
  Landmark,
  Users,
  Network,
  Handshake,
  BriefcaseBusiness,
  FileText,
  History,
  Phone,
  Utensils,
} from "lucide-react";
import { FormField, type FieldSpec } from "@/components/ui/form-field";
import { digits, cnpjKey, formatCnae, validPhone } from "@/lib/formats";
import { CompanyTable } from "./company-table";
import { CompanyImport } from "./company-import";
import { CnpjLookup } from "./cnpj-lookup";
import type { CnpjResult } from "./cnpj";
import {
  phoneFields,
  personnelBase,
  visiblePayrollFields,
  visiblePatFields,
  esocialFields,
} from "./personnel";
import { lookupCep } from "./cep";
import { listCompanies, saveCompany } from "./storage";
import {
  tabs,
  identity,
  identityFields,
  contactFields,
  normalizeCompany,
  address,
  contacts,
  activityFields,
  predominantActivityFields,
  regimeFields,
  peopleFields,
  branchFields,
  matrixFields,
  serviceFields,
  newCompany,
  uid,
  validateField,
  validateCompany,
  errorTab,
  type Company,
  type Values,
  type Row,
} from "./model";
let root: Root | undefined;
let unsaved = false;
export function canLeaveCompanies() {
  return (
    !unsaved ||
    window.confirm(
      "Há alterações não salvas no cadastro. Deseja sair e descartá-las?",
    )
  );
}
export function unmountCompanies() {
  document.body.classList.remove("company-module");
  root?.unmount();
  root = undefined;
  unsaved = false;
}
export function mountCompanies(container: HTMLElement) {
  unmountCompanies();
  document.body.classList.add("company-module");
  root = createRoot(container);
  root.render(<CompanyApp />);
}
const tabIcons = [
  Building2,
  MapPin,
  Activity,
  Landmark,
  Users,
  Network,
  Handshake,
  BriefcaseBusiness,
  FileText,
  History,
];
const action =
  "btn fx-20 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait";
function Grid({
  specs,
  values,
  errors,
  onChange,
  onBlur,
  prefix = "",
}: {
  specs: FieldSpec[];
  values: Values;
  errors: Values;
  onChange: (key: string, value: string) => void;
  onBlur: (key: string, spec: FieldSpec) => void;
  prefix?: string;
}) {
  return (
    <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
      {specs.map((spec) => (
        <FormField
          key={spec.key}
          spec={{ ...spec, key: prefix + spec.key }}
          value={values[spec.key] || ""}
          error={errors[prefix + spec.key]}
          onChange={(value) => onChange(spec.key, value)}
          onBlur={() => onBlur(prefix + spec.key, spec)}
        />
      ))}
    </div>
  );
}
function AddressFields({
  values,
  errors,
  onChange,
  onBlur,
  prefix = "",
}: {
  values: Values;
  errors: Values;
  onChange: (key: string, value: string) => void;
  onBlur: (key: string, spec: FieldSpec) => void;
  prefix?: string;
}) {
  const cep = digits(values.cep || "");
  const initialCep = useRef(cep);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const latest = useRef({ values, onChange });
  latest.current = { values, onChange };
  useEffect(() => {
    if (cep === initialCep.current && retry === 0) {
      setLoading(false);
      setStatus("");
      return;
    }
    if (cep.length !== 8) {
      setStatus("");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      setStatus("Consultando endereço…");
      const baseline = { ...latest.current.values };
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 10000);
      try {
        const result = await lookupCep(cep, controller.signal);
        if (!active) return;
        Object.entries(result).forEach(([key, value]) => {
          if (
            value &&
            latest.current.values[key] !== value &&
            latest.current.values[key] === baseline[key]
          )
            latest.current.onChange(key, value);
        });
        setStatus(
          result.street
            ? "Endereço encontrado. Confira os dados e informe o número."
            : "CEP encontrado. Complete o logradouro, bairro e número.",
        );
      } catch (error) {
        if (
          active &&
          (!(error instanceof Error) || error.name !== "AbortError" || timedOut)
        )
          setStatus(
            timedOut
              ? "A consulta demorou demais. Você pode preencher manualmente."
              : error instanceof Error
                ? error.message
                : "Consulta indisponível. Preencha manualmente.",
          );
      } finally {
        clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [cep, retry]);
  return (
    <>
      <div className="mb-5 rounded-xl border border-neutral-200 bg-neutral-50 p-3 flex flex-wrap gap-3 items-center text-xs text-neutral-500">
        {loading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <MapPin className="h-4 w-4" aria-hidden="true" />
        )}
        <span role="status" className="flex-1">
          {status || "Preencha o CEP para buscar o endereço automaticamente."}
        </span>
        {cep.length === 8 && !loading && (
          <button
            type="button"
            className="underline underline-offset-4"
            onClick={() => setRetry((n) => n + 1)}
          >
            Consultar novamente
          </button>
        )}
      </div>
      <Grid
        specs={address}
        values={values}
        errors={errors}
        onChange={onChange}
        onBlur={onBlur}
        prefix={prefix}
      />
    </>
  );
}
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const Icon = /telefone|contato/i.test(title)
    ? Phone
    : /PAT/.test(title)
      ? Utensils
      : /eSocial/i.test(title)
        ? Network
        : /pessoal|folha/i.test(title)
          ? BriefcaseBusiness
          : /endereço/i.test(title)
            ? MapPin
            : /sócios|responsáveis/i.test(title)
              ? Users
              : /histórico/i.test(title)
                ? History
                : /atendimento/i.test(title)
                  ? Handshake
                  : /documentos/i.test(title)
                    ? FileText
                    : /atividade/i.test(title)
                      ? Activity
                      : /inscriç|enquadramento/i.test(title)
                        ? Landmark
                        : Building2;
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-7 mb-5">
      <h2 className="text-base font-semibold flex items-center gap-2.5">
        <Icon
          className="h-4 w-4 text-neutral-500"
          strokeWidth={1.6}
          aria-hidden="true"
        />
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
          {description}
        </p>
      )}
      <div className="mt-6">{children}</div>
    </section>
  );
}
function CompanyApp() {
  const [importing, setImporting] = useState(false);
  const [records, setRecords] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lookupResult, setLookupResult] = useState<CnpjResult | null>(null);
  const [lookupSelection, setLookupSelection] = useState<string[]>([]);
  const [editing, setEditing] = useState<Company | null>(null);
  const [tab, setTab] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Todos");
  const [errors, setErrors] = useState<Values>({});
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [documentType, setDocumentType] = useState("Contrato social");
  const [documentExpiry, setDocumentExpiry] = useState("");
  const [removeRow, setRemoveRow] = useState<{
    group: Group;
    id: string;
  } | null>(null);
  useEffect(() => {
    if (removeRow) dialogRef.current?.showModal();
  }, [removeRow]);
  type Group =
    | "activities"
    | "regimes"
    | "people"
    | "branches"
    | "phones"
    | "payrollPeriods"
    | "patPeriods"
    | "esocialPeriods";
  useEffect(() => {
    let active = true;
    listCompanies()
      .then((rows) => {
        if (active) setRecords(rows);
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
  }, []);
  useEffect(() => {
    unsaved = dirty;
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      unsaved = false;
    };
  }, [dirty]);
  const clearError = (key: string) =>
    setErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  const change = (key: string, value: string) => {
    if (
      key === "personType" &&
      editing &&
      value !== editing.values.personType
    ) {
      if (editing.branches.length) {
        setNotice(
          "Remova ou transfira as filiais antes de alterar o tipo do cliente.",
        );
        return;
      }
      if (
        editing.values.cnpj &&
        !window.confirm(
          "Alterar o tipo de cliente limpará a inscrição atual. Os demais dados serão preservados para conferência. Continuar?",
        )
      )
        return;
      setEditing((c) =>
        c ? { ...c, values: { ...c.values, personType: value, cnpj: "" } } : c,
      );
      setLookupResult(null);
      setErrors({});
      setDirty(true);
      return;
    }
    setEditing((c) =>
      c ? { ...c, values: { ...c.values, [key]: value } } : c,
    );
    setDirty(true);
    clearError(key);
  };
  const rowChange = (group: Group, id: string, key: string, value: string) => {
    setEditing((c) =>
      c
        ? {
            ...c,
            [group]: c[group].map((row) =>
              row.id === id
                ? {
                    ...row,
                    values: {
                      ...row.values,
                      [key]: value,
                      ...(group === "people" && key === "type"
                        ? { document: "" }
                        : {}),
                    },
                  }
                : row,
            ),
          }
        : c,
    );
    setDirty(true);
    clearError(`${group}.${id}.${key}`);
    clearError(group);
  };
  const blur = (key: string, spec: FieldSpec) => {
    if (!editing) return;
    const segments = key.split(".");
    let value = editing.values[key] || "";
    if (segments.length === 3) {
      const [group, id, name] = segments;
      value =
        editing[group as Group].find((r) => r.id === id)?.values[name] || "";
    }
    const error = validateField(spec, value, false);
    setErrors((old) => ({ ...old, [key]: error }));
  };
  const open = (company: Company) => {
    setEditing(structuredClone(normalizeCompany(company)));
    setLookupResult(null);
    setLookupSelection([]);
    setDirty(false);
    setErrors({});
    setNotice("");
    setTab(0);
  };
  const back = () => {
    if (!canLeaveCompanies()) return;
    setEditing(null);
    setDirty(false);
    setErrors({});
    setRemoveRow(null);
  };
  const add = (group: Group) => {
    setEditing((c) =>
      c
        ? {
            ...c,
            [group]: [
              ...c[group],
              {
                id: uid(),
                values:
                  group === "activities"
                    ? { kind: c.activities.length ? "Secundária" : "Principal" }
                    : group === "people"
                      ? { type: "Pessoa física" }
                      : group === "regimes"
                        ? { mei: "Não" }
                        : group === "phones"
                          ? {
                              type: "Fixo",
                              primary: c.phones.some(
                                (p) => p.values.primary === "Sim",
                              )
                                ? "Não"
                                : "Sim",
                            }
                          : group === "patPeriods"
                            ? { adherent: "Não" }
                            : { country: "Brasil" },
              },
            ],
          }
        : c,
    );
    setDirty(true);
    clearError(group);
  };
  const save = async (complete: boolean) => {
    if (!editing) return;
    const check = validateCompany(editing, records, complete);
    setErrors(check);
    const entries = Object.entries(check).filter(([, v]) => v);
    if (entries.length) {
      setNotice("Revise os campos indicados antes de salvar.");
      const first = entries[0][0];
      setTab(errorTab(first));
      setTimeout(() => {
        const summary = document.getElementById("company-errors");
        summary?.focus();
      }, 0);
      return;
    }
    setSaving(true);
    setNotice("");
    try {
      const fresh = await listCompanies();
      const collision = fresh.find(
        (c) =>
          c.id !== editing.id &&
          cnpjKey(c.values.cnpj || "") === cnpjKey(editing.values.cnpj || ""),
      );
      if (collision) {
        setErrors({ cnpj: "Este CNPJ já foi cadastrado em outra aba." });
        setTab(0);
        setNotice("CNPJ duplicado.");
        return;
      }
      const old = fresh.find((c) => c.id === editing.id);
      if (old && old.updatedAt !== editing.updatedAt) {
        setNotice(
          "Este cadastro foi alterado em outra aba. Volte à lista e recarregue a página antes de editar.",
        );
        return;
      }
      const fields = Object.keys(editing.values).filter(
        (k) => editing.values[k] !== old?.values[k],
      );
      (
        [
          "activities",
          "regimes",
          "people",
          "branches",
          "phones",
          "payrollPeriods",
          "patPeriods",
          "esocialPeriods",
        ] as Group[]
      ).forEach((g) => {
        if (JSON.stringify(editing[g]) !== JSON.stringify(old?.[g] || []))
          fields.push(g);
      });
      if (
        editing.attachments.map((a) => a.id).join() !==
        old?.attachments.map((a) => a.id).join()
      )
        fields.push("attachments");
      const at = new Date().toISOString();
      const normalizedValues = Object.fromEntries(
        Object.entries(editing.values).map(([k, v]) => [k, v.trim()]),
      );
      const record: Company = {
        ...editing,
        values: normalizedValues,
        status: complete ? "Concluído" : "Rascunho",
        updatedAt: at,
        history: [
          ...editing.history,
          {
            at,
            action: complete
              ? "Cadastro concluído"
              : old
                ? "Rascunho atualizado"
                : "Rascunho criado",
            fields,
          },
        ],
      };
      await saveCompany(record);
      setRecords([...fresh.filter((c) => c.id !== record.id), record]);
      setEditing(record);
      setDirty(false);
      setNotice(
        `${complete ? "Cadastro concluído" : "Rascunho salvo"} ${cloudConfigured ? "no escritório em nuvem" : "neste navegador"}.`,
      );
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      setSaving(false);
    }
  };
  const grid = (
    specs: FieldSpec[],
    values = editing?.values || {},
    prefix = "",
    group?: Group,
    id?: string,
  ) => (
    <Grid
      specs={specs}
      values={values}
      prefix={prefix}
      errors={errors}
      onChange={group && id ? (k, v) => rowChange(group, id, k, v) : change}
      onBlur={blur}
    />
  );
  const repeated = (group: Group, title: string, specs: FieldSpec[]) => {
    const rows = editing?.[group] || [];
    return (
      <Section
        title={title}
        description={
          group === "regimes"
            ? "Registre uma linha por vigência, sem sobreposição. Alterações permanecem no histórico local."
            : group === "branches"
              ? "O cadastro principal representa a matriz. Adicione abaixo suas filiais."
              : "Adicione os registros necessários. Campos com * são exigidos para concluir."
        }
      >
        {errors[group] && (
          <p role="alert" className="text-xs text-red-700 mb-4">
            {errors[group]}
          </p>
        )}
        {!rows.length && (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-400 mb-4">
            Nenhum registro adicionado.
          </div>
        )}
        {rows.map((row, index) => {
          let fields = specs;
          if (group === "payrollPeriods")
            fields = visiblePayrollFields(row.values);
          if (group === "patPeriods") fields = visiblePatFields(row.values);
          if (group === "people" && row.values.type === "Pessoa jurídica")
            fields = specs.map((f) =>
              f.key === "document"
                ? {
                    ...f,
                    label: "CNPJ",
                    mask: "cnpj",
                    placeholder: "00.000.000/0000-00",
                  }
                : f,
            );
          if (group === "regimes") {
            const r = row.values.regime;
            fields = [
              ...fields,
              ...(r === "Simples Nacional"
                ? [
                    {
                      key: "recognition",
                      label: "Reconhecimento de receitas",
                      options: ["Caixa", "Competência", "Em conferência"],
                    },
                  ]
                : r === "Lucro Real"
                  ? [
                      {
                        key: "assessment",
                        label: "Periodicidade de apuração",
                        options: ["Anual", "Trimestral", "Em conferência"],
                      },
                    ]
                  : r === "Lucro Presumido"
                    ? [
                        {
                          key: "recognition",
                          label: "Reconhecimento de receitas",
                          options: ["Caixa", "Competência", "Em conferência"],
                        },
                      ]
                    : []),
            ];
          }
          const prefix = `${group}.${row.id}.`;
          return (
            <div
              key={row.id}
              className="rounded-xl border border-neutral-200 p-4 md:p-5 mb-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {title} · {index + 1}
                </h3>
                <button
                  type="button"
                  className="p-2 text-neutral-400 hover:text-red-700"
                  aria-label={`Remover ${title} ${index + 1}`}
                  onClick={() => setRemoveRow({ group, id: row.id })}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {group === "branches" ? (
                <>
                  {grid(
                    fields.filter((f) => !address.some((a) => a.key === f.key)),
                    row.values,
                    prefix,
                    group,
                    row.id,
                  )}
                  <div className="mt-6">
                    <AddressFields
                      values={row.values}
                      prefix={prefix}
                      errors={errors}
                      onChange={(k, v) => rowChange(group, row.id, k, v)}
                      onBlur={blur}
                    />
                  </div>
                </>
              ) : (
                grid(fields, row.values, prefix, group, row.id)
              )}
            </div>
          );
        })}
        <button type="button" className={action} onClick={() => add(group)}>
          <Plus className="w-4 h-4" />
          Adicionar{" "}
          {group === "activities"
            ? "atividade"
            : group === "regimes"
              ? "enquadramento"
              : group === "people"
                ? "pessoa"
                : group === "phones"
                  ? "telefone"
                  : group === "payrollPeriods"
                    ? "configuração da folha"
                    : group === "patPeriods"
                      ? "vigência PAT"
                      : group === "esocialPeriods"
                        ? "configuração eSocial"
                        : "filial"}
        </button>
      </Section>
    );
  };
  const downloadAttachment = (file: File, name: string) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  if (loading)
    return (
      <p
        role="status"
        className="flex items-center gap-2 text-sm text-neutral-500"
      >
        <LoaderCircle className="w-4 h-4 animate-spin" />
        Carregando empresas…
      </p>
    );
  if (loadError)
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-6"
      >
        <h1 className="font-semibold">
          Não foi possível acessar seus cadastros
        </h1>
        <p className="text-sm mt-3">
          {loadError} Verifique se o armazenamento do navegador está habilitado
          e recarregue a página.
        </p>
      </div>
    );
  const banner = (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900 leading-relaxed mb-6">
      <strong>Cadastro em validação.</strong>{" "}
      {cloudConfigured
        ? "Dados e anexos vinculados ao escritório em nuvem autenticado. Use dados de teste até a homologação."
        : "Dados e anexos ficam somente neste navegador, sem compartilhamento ou backup no servidor. O CEP consulta o ViaCEP e a consulta de CNPJ usa a BrasilAPI. Na importação, o arquivo XLS é enviado ao leitor de planilhas para conversão, sem armazenamento do arquivo."}
    </div>
  );
  if (!editing) {
    const q = query
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    const rows = records.filter(
      (c) =>
        (filter === "Todos" ||
          c.status === filter ||
          c.values.officeStatus === filter) &&
        [c.values.legalName, c.values.tradeName, c.values.cnpj, c.values.code]
          .filter(Boolean)
          .join(" ")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(q),
    );
    return (
      <div>
        <div className="flex flex-wrap gap-4 justify-between items-end mb-7">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
            <p className="mt-2 text-sm text-neutral-500">
              Cadastros, estabelecimentos e responsáveis em um só lugar.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className={action} onClick={() => setImporting((v) => !v)}>
              <Download className="w-4 h-4" />
              Importar empresas
            </button>
            <button
              id="new-company"
              className={action}
              onClick={() => open(newCompany())}
            >
              <Plus className="w-4 h-4" />
              Nova empresa
            </button>
          </div>
        </div>
        {banner}
        {importing && (
          <CompanyImport
            records={records}
            onClose={() => setImporting(false)}
            onImported={async () => setRecords(await listCompanies())}
          />
        )}
        <div className="flex flex-wrap gap-3 justify-between mb-6">
          <div className="relative w-full sm:max-w-sm">
            <Search
              className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400"
              aria-hidden="true"
            />
            <input
              id="company-search"
              className="form-control !pl-10"
              placeholder="Buscar por nome, CPF/CNPJ ou código"
              aria-label="Buscar empresas"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="form-control !w-auto"
            aria-label="Filtrar empresas por status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {[
              "Todos",
              "Ativa",
              "Inativa",
              "Em implantação",
              "Suspensa",
              "Encerrada",
              "Rascunho",
              "Concluído",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-neutral-400 mb-4">
          {rows.length} empresa(s) encontrada(s)
        </p>
        {!rows.length ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
            <Building2 className="w-8 h-8 mx-auto text-neutral-300 mb-4" />
            <h2 className="font-medium">
              {records.length
                ? "Nenhuma empresa corresponde aos filtros."
                : "Vamos cadastrar a primeira empresa?"}
            </h2>
            <p className="text-sm text-neutral-400 mt-2">
              {records.length
                ? "Tente outro nome ou situação."
                : "Comece pelo CNPJ e razão social. Você pode salvar um rascunho."}
            </p>
          </div>
        ) : (
          <CompanyTable
            rows={[...rows].sort((a, b) =>
              (a.values.code || "").localeCompare(
                b.values.code || "",
                "pt-BR",
                { numeric: true },
              ),
            )}
            onOpen={open}
          />
        )}
      </div>
    );
  }
  const currentErrors = Object.entries(errors).filter(([, v]) => v);
  return (
    <div>
      <button
        type="button"
        className="flex gap-2 items-center text-xs text-neutral-500 mb-5"
        onClick={back}
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para empresas
      </button>
      <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-neutral-400 mb-2">
            {editing.values.code} · {editing.status}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {editing.updatedAt ? "Cadastro da empresa" : "Nova empresa"}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            {editing.values.legalName ||
              "Preencha os dados da matriz. As filiais têm uma aba própria."}
          </p>
        </div>
        <span className="text-xs text-neutral-400">
          {dirty
            ? "Alterações não salvas"
            : editing.updatedAt
              ? `Salvo em ${new Date(editing.updatedAt).toLocaleString("pt-BR")}`
              : "Novo cadastro"}
        </span>
      </div>
      {banner}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-neutral-200 bg-white p-4 text-sm mb-5"
        >
          {notice}
        </div>
      )}
      {currentErrors.length > 0 && (
        <div
          id="company-errors"
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 mb-5"
        >
          <h2 className="font-semibold text-sm text-red-800">
            Revise {currentErrors.length} campo(s)
          </h2>
          <ul className="mt-2 space-y-1">
            {currentErrors.map(([key, message]) => (
              <li key={key}>
                <button
                  type="button"
                  className="text-xs text-red-700 underline text-left"
                  onClick={() => {
                    setTab(errorTab(key));
                    setTimeout(
                      () => document.getElementById("field-" + key)?.focus(),
                      0,
                    );
                  }}
                >
                  {tabs[errorTab(key)]}: {message}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div
        role="tablist"
        aria-label="Seções do cadastro"
        className="flex overflow-x-auto gap-1 border-b border-neutral-200 mb-6 pb-1"
      >
        {tabs.map((label, i) => (
          <button
            type="button"
            key={label}
            id={`company-tab-${i}`}
            role="tab"
            aria-label={label}
            aria-selected={tab === i}
            aria-controls={`company-panel-${i}`}
            tabIndex={tab === i ? 0 : -1}
            onKeyDown={(e) => {
              if (["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? tabs.length - 1
                      : (tab +
                          (e.key === "ArrowRight" ? 1 : -1) +
                          tabs.length) %
                        tabs.length;
                setTab(next);
                document.getElementById(`company-tab-${next}`)?.focus();
              }
            }}
            onClick={() => setTab(i)}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-3 text-xs rounded-t-lg border-b-2 ${tab === i ? "text-neutral-900 border-neutral-900 bg-white font-semibold" : "border-transparent text-neutral-400 hover:text-neutral-700"}`}
          >
            {(() => {
              const Icon = tabIcons[i];
              return (
                <Icon
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
              );
            })()}
            {label}
            {currentErrors.some(([k]) => errorTab(k) === i) && (
              <span className="ml-1 text-red-700">•</span>
            )}
          </button>
        ))}
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save(true);
        }}
      >
        <div
          role="tabpanel"
          id={`company-panel-${tab}`}
          aria-labelledby={`company-tab-${tab}`}
        >
          {tab === 0 && (
            <Section
              title="Identificação da matriz"
              description="Inscrição e nome/razão social são suficientes para iniciar um rascunho. Demais campos com * serão exigidos para concluir."
            >
              {editing.values.personType !== "Pessoa física" && (
                <CnpjLookup
                  key={editing.id}
                  registration={editing.values.cnpj || ""}
                  onResult={(result) => {
                    if (result.cnpj !== cnpjKey(editing.values.cnpj || ""))
                      return;
                    setLookupResult(result);
                    setLookupSelection([]);
                    setEditing((c) => {
                      if (!c || cnpjKey(c.values.cnpj || "") !== result.cnpj)
                        return c;
                      const values = { ...c.values };
                      Object.entries(result.values).forEach(([k, v]) => {
                        if (v && !values[k]?.trim()) values[k] = v;
                      });
                      values.lookupProvider = result.provider;
                      values.lookupAt = result.at;
                      values.lookupCnpj = result.cnpj;
                      const phones = [...c.phones];
                      for (const phone of result.phones) {
                        if (
                          validPhone(phone.number) &&
                          !phones.some(
                            (p) =>
                              digits(p.values.number || "") ===
                              digits(phone.number),
                          )
                        )
                          phones.push({
                            id: uid(),
                            values: {
                              ...phone,
                              primary: phones.some(
                                (p) => p.values.primary === "Sim",
                              )
                                ? "Não"
                                : "Sim",
                            },
                          });
                      }
                      return {
                        ...c,
                        values,
                        phones,
                        activities: c.activities.length
                          ? c.activities
                          : result.activities.map((a) => ({
                              id: uid(),
                              values: { ...a, cnae: formatCnae(a.cnae) },
                            })),
                      };
                    });
                    setDirty(true);
                  }}
                />
              )}
              {lookupResult &&
                lookupResult.cnpj === cnpjKey(editing.values.cnpj || "") && (
                  <details className="mb-6 rounded-xl border border-neutral-200 p-4 text-xs">
                    <summary className="cursor-pointer text-neutral-600">
                      Revisar dados da consulta ·{" "}
                      {new Date(lookupResult.at).toLocaleString("pt-BR")}
                    </summary>
                    <p className="text-neutral-400 mt-3 mb-4">
                      Selecione os campos já preenchidos que deseja substituir.
                      Nenhuma alteração é aplicada sem esta ação.
                    </p>
                    <div className="space-y-3">
                      {Object.entries(lookupResult.values)
                        .filter(
                          ([k, v]) =>
                            v && editing.values[k] && editing.values[k] !== v,
                        )
                        .map(([k, v]) => (
                          <label key={k} className="flex gap-3 items-start">
                            <input
                              type="checkbox"
                              checked={lookupSelection.includes(k)}
                              onChange={(e) =>
                                setLookupSelection((old) =>
                                  e.target.checked
                                    ? [...old, k]
                                    : old.filter((x) => x !== k),
                                )
                              }
                            />
                            <span>
                              <strong className="font-medium">
                                {[...identity, ...address, ...contacts].find(
                                  (f) => f.key === k,
                                )?.label || k}
                              </strong>
                              : {editing.values[k]} → {v}
                            </span>
                          </label>
                        ))}
                    </div>
                    <button
                      type="button"
                      disabled={!lookupSelection.length}
                      className={`${action} mt-4`}
                      onClick={() => {
                        setEditing((c) =>
                          c
                            ? {
                                ...c,
                                values: {
                                  ...c.values,
                                  ...Object.fromEntries(
                                    lookupSelection.map((k) => [
                                      k,
                                      lookupResult.values[k],
                                    ]),
                                  ),
                                },
                              }
                            : c,
                        );
                        setLookupSelection([]);
                        setDirty(true);
                        setNotice(
                          "Campos selecionados atualizados. Confira e salve o cadastro.",
                        );
                      }}
                    >
                      Aplicar campos selecionados
                    </button>
                  </details>
                )}
              {grid(identityFields(editing.values))}
            </Section>
          )}
          {tab === 1 && (
            <>
              <Section
                title="Endereço da matriz"
                description="A busca pelo CEP não altera número ou complemento."
              >
                <AddressFields
                  values={editing.values}
                  errors={errors}
                  onChange={change}
                  onBlur={blur}
                />
              </Section>
              <Section
                title="Contato da empresa"
                description="Os exemplos em cinza mostram o formato esperado; não são valores preenchidos."
              >
                {grid(contactFields)}
              </Section>
              {repeated("phones", "Telefones", phoneFields)}
            </>
          )}
          {tab === 2 && (
            <>
              <Section
                title="CNAE preponderante"
                description="Informação independente do CNAE principal; confira conforme os documentos da empresa."
              >
                {grid(predominantActivityFields)}
              </Section>
              {repeated("activities", "Atividades econômicas", activityFields)}
            </>
          )}
          {tab === 3 &&
            repeated("regimes", "Enquadramentos tributários", regimeFields)}
          {tab === 4 && (
            <>
              {repeated("people", "Sócios e representantes", peopleFields)}
              <Section title="Responsável pelo cliente">
                {grid([
                  {
                    key: "legalResponsibleId",
                    label: "Responsável vinculado",
                    choices: editing.people
                      .filter((p) => p.values.name)
                      .map((p) => ({
                        value: p.id,
                        label: `${p.values.name} · ${p.values.role || "Qualificação pendente"}`,
                      })),
                    hint: "Cadastre as pessoas acima e selecione o responsável.",
                  },
                ])}
              </Section>
            </>
          )}
          {tab === 5 && (
            <>
              <Section
                title="Inscrições da matriz"
                description="Inscrições estaduais dependem da UF e não possuem uma máscara nacional única."
              >
                {grid(matrixFields)}
              </Section>
              {editing.values.personType === "Pessoa física" ? (
                <p className="text-xs text-neutral-500 mb-5">
                  Filiais são utilizadas em cadastros de pessoa jurídica.
                </p>
              ) : (
                repeated("branches", "Estabelecimentos / filiais", branchFields)
              )}
            </>
          )}
          {tab === 6 && (
            <Section
              title="Atendimento e operação"
              description="Defina quem atende a empresa e o início da responsabilidade do escritório."
            >
              {grid(serviceFields)}
              <fieldset className="mt-6">
                <legend className="text-xs font-semibold mb-3">
                  Áreas atendidas <span className="text-neutral-400">*</span>
                </legend>
                <div className="flex flex-wrap gap-3">
                  {[
                    "Contábil",
                    "Fiscal",
                    "Departamento Pessoal",
                    "Patrimônio",
                    "BPO",
                  ].map((name) => (
                    <label
                      key={name}
                      className="text-xs border border-neutral-200 rounded-lg py-3 px-4 inline-flex gap-2 items-center"
                    >
                      <input
                        type="checkbox"
                        checked={(editing.values.services || "")
                          .split("|")
                          .includes(name)}
                        onChange={(e) => {
                          const items = (editing.values.services || "")
                            .split("|")
                            .filter(Boolean);
                          change(
                            "services",
                            (e.target.checked
                              ? [...items, name]
                              : items.filter((s) => s !== name)
                            ).join("|"),
                          );
                        }}
                      />
                      {name}
                    </label>
                  ))}
                </div>
                {errors.services && (
                  <p className="text-xs text-red-700 mt-2">{errors.services}</p>
                )}
              </fieldset>
            </Section>
          )}
          {tab === 7 && (
            <>
              <Section
                title="Configurações de pessoal"
                description="Parâmetros cadastrais por vigência, sujeitos à revisão profissional. Não executam cálculos ou transmissões. Percentuais e datas não são preenchidos com valores das imagens de referência."
              >
                {grid(personnelBase)}
              </Section>
              {repeated(
                "payrollPeriods",
                "Parâmetros da folha por vigência",
                [],
              )}
              {repeated(
                "patPeriods",
                "Programa de Alimentação do Trabalhador — PAT",
                [],
              )}
              <p className="mb-5 text-xs text-neutral-500">
                Participantes do PAT são informados com a origem do
                levantamento. Percentuais são validados individualmente; não há
                soma automática ou recálculo da folha.
              </p>
              {repeated(
                "esocialPeriods",
                "Implantação eSocial por vigência",
                esocialFields,
              )}
              <p className="text-xs text-neutral-500 mb-5">
                Marcos de implantação não comprovam envio ou recepção de
                eventos. As datas de substituição de obrigações são registros
                históricos.
              </p>
            </>
          )}
          {tab === 8 && (
            <Section
              title="Documentos cadastrais"
              description="PDF, PNG ou JPG, até 10 MB por arquivo e 30 MB por cadastro. Anexos ficam neste navegador. Não envie certificados digitais ou senhas."
            >
              <div className="grid md:grid-cols-2 gap-5">
                <FormField
                  spec={{
                    key: "docType",
                    label: "Tipo de documento",
                    options: [
                      "Contrato social",
                      "Alteração contratual",
                      "Comprovante CNPJ",
                      "Inscrição / enquadramento",
                      "Procuração / autorização",
                      "Outro",
                    ],
                  }}
                  value={documentType}
                  onChange={setDocumentType}
                />
                <FormField
                  spec={{
                    key: "docExpiry",
                    label: "Validade, se aplicável",
                    type: "date",
                  }}
                  value={documentExpiry}
                  onChange={setDocumentExpiry}
                />
              </div>
              <label className="block mt-5 text-xs font-medium">
                Selecionar documento
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                  className="form-control mt-2"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    const total = editing.attachments.reduce(
                      (s, a) => s + a.size,
                      0,
                    );
                    if (
                      !["application/pdf", "image/png", "image/jpeg"].includes(
                        f.type,
                      ) ||
                      f.size > 10 * 1024 * 1024 ||
                      total + f.size > 30 * 1024 * 1024
                    ) {
                      setNotice(
                        "Escolha PDF, PNG ou JPG de até 10 MB. O total por cadastro é de 30 MB.",
                      );
                      return;
                    }
                    setEditing((c) =>
                      c
                        ? {
                            ...c,
                            attachments: [
                              ...c.attachments,
                              {
                                id: uid(),
                                name: f.name,
                                size: f.size,
                                type: documentType,
                                expires: documentExpiry,
                                addedAt: new Date().toISOString(),
                                file: f,
                              },
                            ],
                          }
                        : c,
                    );
                    setDirty(true);
                    setNotice(
                      "Documento adicionado. Salve o cadastro para manter o anexo.",
                    );
                  }}
                />
              </label>
              <div className="mt-6 space-y-3">
                {editing.attachments.length === 0 && (
                  <p className="text-sm text-neutral-400">
                    Nenhum documento anexado.
                  </p>
                )}
                {editing.attachments.map((a) => (
                  <div
                    key={a.id}
                    className="border border-neutral-200 rounded-xl p-4 flex flex-wrap gap-3 items-center"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-all">{a.name}</p>
                      <p className="text-[11px] text-neutral-400 mt-1">
                        {a.type} · {(a.size / 1024).toFixed(0)} KB{" "}
                        {a.expires &&
                          `· Validade: ${a.expires.split("-").reverse().join("/")}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Baixar ${a.name}`}
                      className="p-2"
                      onClick={() => downloadAttachment(a.file, a.name)}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remover ${a.name}`}
                      className="p-2 text-neutral-400 hover:text-red-700"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Remover o anexo ${a.name}? A remoção será aplicada ao salvar.`,
                          )
                        ) {
                          setEditing((c) =>
                            c
                              ? {
                                  ...c,
                                  attachments: c.attachments.filter(
                                    (x) => x.id !== a.id,
                                  ),
                                }
                              : c,
                          );
                          setDirty(true);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}
          {tab === 9 && (
            <Section
              title="Histórico do cadastro"
              description="Registro local de salvamentos; não substitui auditoria de um sistema com usuários autenticados."
            >
              {editing.history.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  O histórico aparecerá após o primeiro salvamento.
                </p>
              ) : (
                <ol className="space-y-4">
                  {[...editing.history].reverse().map((h, i) => (
                    <li key={i} className="border-l-2 border-neutral-200 pl-4">
                      <p className="text-sm font-semibold">{h.action}</p>
                      <p className="text-xs text-neutral-400 mt-1">
                        {new Date(h.at).toLocaleString("pt-BR")} · Usuário local
                        de demonstração
                      </p>
                      <p className="text-xs text-neutral-500 mt-2">
                        {h.fields.length} campo(s) ou seção(ões) alterado(s).
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </Section>
          )}
        </div>
        <div className="sticky bottom-0 z-10 rounded-xl border border-neutral-200 bg-white/95 backdrop-blur p-4 flex flex-wrap justify-between gap-3">
          <div className="flex gap-2 items-center">
            <button
              type="button"
              disabled={tab === 0}
              className="p-2 text-xs text-neutral-500 disabled:opacity-30"
              onClick={() => setTab((n) => n - 1)}
            >
              Anterior
            </button>
            <span className="text-xs text-neutral-400">
              {tab + 1} / {tabs.length}
            </span>
            <button
              type="button"
              disabled={tab === tabs.length - 1}
              className="p-2 text-xs text-neutral-500 disabled:opacity-30"
              onClick={() => setTab((n) => n + 1)}
            >
              Próxima
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              className={action}
              onClick={() => void save(false)}
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar rascunho
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`${action} !bg-neutral-900 !text-white`}
            >
              <Check className="h-4 w-4" />
              Concluir cadastro
            </button>
          </div>
        </div>
      </form>
      {removeRow && (
        <dialog
          ref={dialogRef}
          onCancel={() => setRemoveRow(null)}
          aria-labelledby="remove-title"
          className="m-auto rounded-2xl bg-white p-6 max-w-md w-[calc(100%-40px)] backdrop:bg-black/30"
        >
          <h2 id="remove-title" className="font-semibold">
            Remover este registro?
          </h2>
          <p className="text-sm text-neutral-500 mt-3">
            A remoção será aplicada quando você salvar o cadastro.
          </p>
          <div className="flex gap-3 mt-6">
            <button
              autoFocus
              type="button"
              className={action}
              onClick={() => setRemoveRow(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={action}
              onClick={() => {
                setEditing((c) =>
                  c
                    ? {
                        ...c,
                        [removeRow.group]: c[removeRow.group].filter(
                          (r: Row) => r.id !== removeRow.id,
                        ),
                      }
                    : c,
                );
                setDirty(true);
                setErrors({});
                setRemoveRow(null);
              }}
            >
              Remover
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
