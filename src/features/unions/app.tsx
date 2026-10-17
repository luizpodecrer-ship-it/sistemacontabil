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
  if (importing)
    return (
      <UnionImport
        data={data}
        onSaved={onSaved}
        onDirty={setImportDirty}
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
        <select
          aria-label="Filtrar sindicatos por UF"
          className="form-control min-w-0"
          value={uf}
          onChange={(e) => setUf(e.target.value)}
        >
          <option value="">Todas as UFs</option>
          {ufs.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Filtrar sindicatos por representação"
          className="form-control min-w-0"
          value={representation}
          onChange={(e) => setRepresentation(e.target.value)}
        >
          <option value="">Todas as representações</option>
          <option>Laboral</option>
          <option>Patronal</option>
          <option>Não informado</option>
        </select>
        <select
          aria-label="Filtrar situação interna"
          className="form-control min-w-0"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todas as situações internas</option>
          <option>Ativo</option>
          <option>Inativo</option>
        </select>
      </div>
      <p className="mb-3 text-xs text-neutral-500">
        {rows.length} sindicato(s) encontrado(s)
      </p>
      <div className="relative overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              {[
                "Código",
                "Entidade",
                "CNPJ",
                "Representação",
                "UF",
                "Situação na fonte CNES",
                "Situação interna",
                "Ações",
              ].map((s) => (
                <th className="p-3 font-medium" key={s}>
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * 50, page * 50 + 50).map((row) => (
              <tr key={row.id} className="border-t border-neutral-100">
                <td className="p-3">{row.values.code}</td>
                <td className="p-3">
                  <strong className="font-medium">{row.values.title}</strong>
                  <span className="mt-1 block text-neutral-500">
                    {row.values.sigla}
                  </span>
                </td>
                <td className="p-3 whitespace-nowrap">{row.values.cnpj}</td>
                <td className="p-3">{row.values.representation}</td>
                <td className="p-3">{row.values.uf || "—"}</td>
                <td className="p-3 text-neutral-500">
                  {row.values.cnesStatus || "Não informado"}
                  <span className="mt-1 block text-[10px]">
                    {row.values.sourceDate
                      ? `Referência: ${row.values.sourceDate.split("-").reverse().join("/")}`
                      : "Sem data de referência"}
                  </span>
                </td>
                <td className="p-3">{row.values.status}</td>
                <td className="p-3">
                  <button
                    type="button"
                    className="underline"
                    aria-label={`Editar sindicato ${row.values.title}`}
                    onClick={() => {
                      setDraft(structuredClone(row));
                      setDirty(false);
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
        {!rows.length && (
          <p className="p-5 text-sm text-neutral-500">
            Nenhum sindicato encontrado. Cadastre uma entidade ou importe o
            arquivo do CNES.
          </p>
        )}
      </div>
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
