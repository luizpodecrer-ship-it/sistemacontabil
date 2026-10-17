import { Select } from "@/components/ui/select";
import { useEffect, useState } from "react";
import {
  Plus,
  Save,
  ArrowLeft,
  Landmark,
  Download,
  Upload,
  ExternalLink,
} from "lucide-react";
import { FormField } from "@/components/ui/form-field";
import { digits } from "@/lib/formats";
import { ufs } from "../companies/model";
import { lookupCep } from "../companies/cep";
import { type Data, type Item } from "../workspace/model";
import { mutateData } from "../workspace/storage";
import {
  CNES_PORTAL,
  CNES_SEARCH,
  fields,
  newUnion,
  normalize,
  saveUnion,
  validateUnion,
} from "./model";
import { UnionImport } from "./import";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-40";
function template() {
  const blob = new Blob(
    [
      "\ufeffCNPJ;Denominação;Sigla;Tipo de entidade;Representação;Categoria;Base territorial;UF;Município;Situação CNES;Registro sindical;Email;Telefone\r\n",
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "modelo-sindicatos.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Unions({
  data,
  onSaved,
  onDirtyChange,
}: {
  data: Data;
  onSaved: (data: Data) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [page, setPage] = useState(0);
  const [draft, setDraft] = useState<Item | null>(null),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [importing, setImporting] = useState(false),
    [importDirty, setImportDirty] = useState(false),
    [query, setQuery] = useState(""),
    [uf, setUf] = useState(""),
    [status, setStatus] = useState(""),
    [representation, setRepresentation] = useState(""),
    [message, setMessage] = useState(""),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [cepNotice, setCepNotice] = useState("");
  useEffect(() => {
    onDirtyChange(dirty || importDirty);
    return () => onDirtyChange(false);
  }, [dirty, importDirty, onDirtyChange]);
  useEffect(() => setPage(0), [query, uf, status, representation, data]);
  const cep = digits(draft?.values.cep || "");
  useEffect(() => {
    if (!draft || !dirty || cep.length !== 8) return;
    const controller = new AbortController();
    const id = draft.id;
    const timer = setTimeout(() => {
      setCepNotice("Buscando CEP…");
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
              if (!next[key] && values[key]) next[key] = values[key];
            return { ...current, values: next };
          });
          setCepNotice(
            "Endereço consultado. Campos preenchidos foram preservados.",
          );
        })
        .catch((e) => {
          if (!controller.signal.aborted) setCepNotice(e.message);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [cep, draft?.id]);
  const change = (key: string, value: string) => {
    setDraft((old) =>
      old ? { ...old, values: { ...old.values, [key]: value } } : old,
    );
    setDirty(true);
    setErrors((old) => ({ ...old, [key]: "" }));
    setMessage("");
  };
  const cancel = () => {
    if (
      dirty &&
      !window.confirm("Descartar alterações não salvas do sindicato?")
    )
      return;
    setDraft(null);
    setDirty(false);
    setErrors({});
    setMessage("");
    setCepNotice("");
  };
  async function save() {
    if (!draft) return;
    const found = validateUnion(draft, data);
    setErrors(found);
    if (Object.keys(found).length) {
      setMessage("Revise os campos indicados.");
      return;
    }
    setBusy(true);
    try {
      const next = await mutateData((state) => saveUnion(state, draft));
      onSaved(next);
      setDraft(null);
      setDirty(false);
      setMessage("Sindicato salvo com sucesso.");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const rows = data.items
    .filter(
      (i) =>
        i.module === "unions" &&
        (!uf || i.values.uf === uf) &&
        (!status || i.values.status === status) &&
        (!representation || i.values.representation === representation) &&
        normalize(
          [
            i.values.title,
            i.values.cnpj,
            i.values.sigla,
            i.values.registration,
            i.values.category,
            i.values.code,
          ].join(" "),
        ).includes(normalize(query)),
    )
    .sort((a, b) => a.values.title.localeCompare(b.values.title, "pt-BR"));
  function editUnion(row: Item) {
    setDraft(structuredClone(row));
    setDirty(false);
    setErrors({});
    setMessage("");
  }
  if (importing)
    return (
      <UnionImport
        data={data}
        onSaved={onSaved}
        onDirty={setImportDirty}
        onComplete={(message) => {
          setImportDirty(false);
          setImporting(false);
          setMessage(message);
          setPage(0);
        }}
        onClose={() => {
          if (importDirty && !window.confirm("Sair sem importar esta prévia?"))
            return;
          setImporting(false);
          setImportDirty(false);
        }}
      />
    );
  if (draft)
    return (
      <section aria-label="Cadastro de sindicato">
        <button
          type="button"
          disabled={busy}
          className="mb-5 flex items-center gap-2 text-xs"
          onClick={cancel}
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para sindicatos
        </button>
        <h2 className="mb-4 text-lg font-semibold">
          {data.items.some((i) => i.id === draft.id)
            ? "Editar sindicato"
            : "Novo sindicato"}
        </h2>
        <p className="mb-4 text-xs text-neutral-500">
          Fonte: {draft.values.source || "Cadastro manual"}
          {draft.values.sourceFile ? ` · ${draft.values.sourceFile}` : ""}.
          Situação no CNES depende de conferência na fonte oficial.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={busy} className="min-w-0 space-y-5">
            {[
              ["Identificação e representação", fields.slice(0, 14)],
              ["Endereço e contatos", fields.slice(14, 25)],
              ["Informações adicionais", fields.slice(25)],
            ].map(([label, specs]) => (
              <fieldset
                key={String(label)}
                className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-5"
              >
                <legend className="px-2 text-sm font-semibold">
                  {String(label)}
                </legend>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {(specs as typeof fields).map((spec) => (
                    <FormField
                      key={spec.key}
                      spec={spec}
                      value={draft.values[spec.key] || ""}
                      error={errors[spec.key]}
                      onChange={(v) => change(spec.key, v)}
                      layoutClassName={
                        spec.wide ? "min-w-0 md:col-span-2" : "min-w-0"
                      }
                    />
                  ))}
                </div>
              </fieldset>
            ))}
            {cepNotice && (
              <p role="status" className="text-xs text-neutral-500">
                {cepNotice}
              </p>
            )}
            {message && (
              <p
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm"
              >
                {message}
              </p>
            )}
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" className={button} onClick={cancel}>
                Cancelar
              </button>
              <button
                type="submit"
                className={`${button} !bg-neutral-900 !text-white`}
              >
                <Save className="h-4 w-4" />
                {busy ? "Salvando…" : "Salvar sindicato"}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    );
  return (
    <section aria-label="Catálogo de sindicatos">
      <div className="mb-5 flex flex-wrap justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-neutral-500">
          <Landmark className="h-4 w-4" /> Entidades sindicais compartilhadas
          entre as empresas do escritório.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={button}
            onClick={() => setImporting(true)}
          >
            <Upload className="h-4 w-4" /> Importar CNES
          </button>
          <button
            type="button"
            className={button}
            onClick={() => {
              setDraft(newUnion(data));
              setDirty(false);
              setErrors({});
              setMessage("");
            }}
          >
            <Plus className="h-4 w-4" /> Novo sindicato
          </button>
        </div>
      </div>
      <div className="mb-5 rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-xs text-neutral-600">
          CNES · Ministério do Trabalho e Emprego. Consulte a entidade na
          ferramenta oficial ou obtenha a base no portal do MTE. Esta tela não
          consulta nem certifica a situação sindical em tempo real.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <a
            href={CNES_SEARCH}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            Consultar CNES <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href={CNES_PORTAL}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Portal do MTE e base de dados ↗
          </a>
          <button
            type="button"
            className="inline-flex items-center gap-1 underline"
            onClick={template}
          >
            <Download className="h-3 w-3" /> Modelo CSV
          </button>
        </div>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
        <input
          aria-label="Buscar sindicatos"
          className="form-control min-w-0"
          placeholder="Nome, sigla, CNPJ, categoria ou registro"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select
          aria-label="Filtrar sindicatos por UF"
          className="form-control min-w-0"
          value={uf}
          onChange={(e) => setUf(e.target.value)}
        >
          <option value="">Todas as UFs</option>
          {ufs.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar sindicatos por representação"
          className="form-control min-w-0"
          value={representation}
          onChange={(e) => setRepresentation(e.target.value)}
        >
          <option value="">Todas as representações</option>
          <option>Laboral</option>
          <option>Patronal</option>
          <option>Não informado</option>
        </Select>
        <Select
          aria-label="Filtrar situação interna"
          className="form-control min-w-0"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todas as situações internas</option>
          <option>Ativo</option>
          <option>Inativo</option>
        </Select>
      </div>
      <p className="mb-3 text-xs text-neutral-500">
        {rows.length} sindicato(s) encontrado(s)
      </p>
      <div className="space-y-3 md:hidden" aria-label="Lista de sindicatos">
        {rows.slice(page * 50, page * 50 + 50).map((row) => (
          <article
            key={row.id}
            className="min-w-0 rounded-xl border border-neutral-200 bg-white p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3 text-xs text-neutral-500">
              <span>Código {row.values.code}</span>
              <UnionStatus status={row.values.status} />
            </div>
            <h3 className="text-sm font-semibold leading-6 [overflow-wrap:anywhere]">
              {row.values.title}
            </h3>
            {row.values.sigla && (
              <p className="mt-1 text-xs text-neutral-500 [overflow-wrap:anywhere]">
                {row.values.sigla}
              </p>
            )}
            <dl className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-3 text-xs">
              <div>
                <dt className="text-neutral-500">CNPJ</dt>
                <dd className="mt-1 whitespace-nowrap tabular-nums">
                  {row.values.cnpj}
                </dd>
              </div>
              <div>
                <dt className="text-neutral-500">UF</dt>
                <dd className="mt-1">{row.values.uf || "—"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-neutral-500">Representação</dt>
                <dd className="mt-1">{row.values.representation}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-neutral-500">Situação no CNES</dt>
                <dd className="mt-1 leading-5 [overflow-wrap:anywhere]">
                  {row.values.cnesStatus || "Não informado"}
                  <span className="block text-neutral-500">
                    {sourceDateLabel(row)}
                  </span>
                </dd>
              </div>
            </dl>
            <button
              type="button"
              className={`${button} mt-4 w-full min-h-11`}
              aria-label={`Editar sindicato ${row.values.title}`}
              onClick={() => editUnion(row)}
            >
              Editar cadastro
            </button>
          </article>
        ))}
      </div>
      <p className="mb-2 hidden text-xs text-neutral-500 md:block xl:hidden">
        Deslize a tabela para consultar todas as colunas.
      </p>
      <div
        role="region"
        aria-label="Tabela de sindicatos"
        tabIndex={0}
        className="relative hidden overflow-x-auto rounded-2xl border border-neutral-200 bg-white focus-visible:outline-2 focus-visible:outline-neutral-500 md:block"
      >
        <table className="w-full min-w-[1180px] table-fixed text-left text-xs leading-5">
          <colgroup>
            <col className="w-[76px]" />
            <col />
            <col className="w-[166px]" />
            <col className="w-[132px]" />
            <col className="w-[52px]" />
            <col className="w-[190px]" />
            <col className="w-[112px]" />
            <col className="w-[76px]" />
          </colgroup>
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              {[
                "Código",
                "Entidade",
                "CNPJ",
                "Representação",
                "UF",
                "Situação no CNES",
                "Situação interna",
                "Ações",
              ].map((label) => (
                <th
                  className="whitespace-nowrap px-4 py-3 font-medium"
                  key={label}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * 50, page * 50 + 50).map((row) => (
              <tr
                key={row.id}
                className="border-t border-neutral-100 align-top hover:bg-neutral-50/60"
              >
                <td className="px-4 py-4 whitespace-nowrap tabular-nums text-neutral-500">
                  {row.values.code}
                </td>
                <td className="px-4 py-4">
                  <strong className="block font-medium [overflow-wrap:anywhere]">
                    {row.values.title}
                  </strong>
                  {row.values.sigla && (
                    <span className="mt-1 block text-neutral-500 [overflow-wrap:anywhere]">
                      {row.values.sigla}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap tabular-nums">
                  {row.values.cnpj}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {row.values.representation}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {row.values.uf || "—"}
                </td>
                <td className="px-4 py-4 text-neutral-500">
                  <span className="block [overflow-wrap:anywhere]">
                    {row.values.cnesStatus || "Não informado"}
                  </span>
                  <span className="mt-1 block whitespace-nowrap text-[11px]">
                    {sourceDateLabel(row)}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <UnionStatus status={row.values.status} />
                </td>
                <td className="px-4 py-2">
                  <button
                    type="button"
                    className="min-h-11 underline underline-offset-4"
                    aria-label={`Editar sindicato ${row.values.title}`}
                    onClick={() => editUnion(row)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
          Nenhum sindicato encontrado. Cadastre uma entidade ou importe o
          arquivo do CNES.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <button
          type="button"
          className={button}
          disabled={page === 0}
          onClick={() => setPage((n) => n - 1)}
        >
          Anterior
        </button>
        <span>
          Página {page + 1} de {Math.max(1, Math.ceil(rows.length / 50))}
        </span>
        <button
          type="button"
          className={button}
          disabled={(page + 1) * 50 >= rows.length}
          onClick={() => setPage((n) => n + 1)}
        >
          Próxima
        </button>
      </div>
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}

function sourceDateLabel(row: Item) {
  return row.values.sourceDate
    ? `Referência: ${row.values.sourceDate.split("-").reverse().join("/")}`
    : "Sem data de referência";
}
function UnionStatus({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium leading-4 ${status === "Ativo" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}
    >
      {status}
    </span>
  );
}
