import { useEffect, useRef, useState } from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import {
  cboByCode,
  cboMetadata,
  families,
  formatCbo,
  groups,
  searchCbo,
} from "./model";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs hover:bg-neutral-50 disabled:opacity-40";
export function CboPicker({
  code,
  onChange,
  error,
}: {
  code: string;
  onChange: (code: string) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [group, setGroup] = useState(""),
    [family, setFamily] = useState(""),
    [order, setOrder] = useState("code"),
    [page, setPage] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null),
    search = useRef<HTMLInputElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const results = searchCbo(query, family || group, order),
    pages = Math.max(1, Math.ceil(results.length / 50));
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      search.current?.focus();
    } else {
      dialog.current?.close();
      trigger.current?.focus();
    }
  }, [open]);
  const selected = cboByCode.get(code);
  return (
    <div className="md:col-span-2">
      <span className="mb-1.5 block text-xs font-semibold text-neutral-700">
        CBO <span className="text-neutral-400">*</span>
      </span>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <span className="min-w-0 flex-1 text-sm" aria-live="polite">
          {selected
            ? `${formatCbo(code)} · ${selected.title}`
            : "Selecione uma ocupação"}
        </span>
        <button
          ref={trigger}
          type="button"
          className={button}
          onClick={() => {
            setQuery("");
            setGroup("");
            setFamily("");
            setPage(0);
            setOpen(true);
          }}
        >
          <Search className="h-4 w-4" /> Consultar base CBO
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="cbo-dialog-title"
        className="m-auto max-h-[90dvh] w-[min(960px,94vw)] overflow-auto rounded-2xl border border-neutral-200 bg-white p-5 backdrop:bg-black/40"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id="cbo-dialog-title" className="font-semibold">
            Classificação Brasileira de Ocupações
          </h2>
          <button
            type="button"
            aria-label="Fechar consulta CBO"
            className={button}
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-neutral-500">
          {cboMetadata.title}. {cboMetadata.count.toLocaleString("pt-BR")}{" "}
          ocupações disponíveis. Cópia de referência; atualização oficial
          vigente ainda não conferida.{" "}
          <a
            className="underline"
            href={cboMetadata.official}
            target="_blank"
            rel="noreferrer"
          >
            Portal do Ministério do Trabalho ↗
          </a>
        </p>
        <div className="grid gap-3 sm:grid-cols-2 mb-3">
          <label className="text-xs font-medium sm:col-span-2">
            Buscar por código, descrição ou sinônimo
            <input
              ref={search}
              aria-label="Buscar ocupação CBO"
              className="form-control mt-1"
              placeholder="Ex.: 5174-05, porteiro, operador…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label className="text-xs font-medium">
            Grande grupo
            <select
              aria-label="Grande grupo CBO"
              className="form-control mt-1"
              value={group}
              onChange={(e) => {
                setGroup(e.target.value);
                setFamily("");
                setPage(0);
              }}
            >
              <option value="">Todos os grupos</option>
              {groups.map((name, i) => (
                <option key={i} value={String(i)}>
                  {i} · {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Família ocupacional
            <select
              aria-label="Família CBO"
              className="form-control mt-1"
              value={family}
              onChange={(e) => {
                setFamily(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Todas as famílias</option>
              {[
                ...new Set(searchCbo("", group).map((r) => r.code.slice(0, 4))),
              ].map((code) => (
                <option key={code} value={code}>
                  {code} · {families[code] || `Família ${code}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
          <p role="status">
            {results.length.toLocaleString("pt-BR")} ocupações encontradas
          </p>
          <label>
            Ordenar por{" "}
            <select
              aria-label="Ordenar CBO"
              className="rounded border border-neutral-200 p-2 text-neutral-700"
              value={order}
              onChange={(e) => {
                setOrder(e.target.value);
                setPage(0);
              }}
            >
              <option value="code">Código</option>
              <option value="title">Descrição</option>
            </select>
          </label>
        </div>
        <div className="relative overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Descrição CBO</th>
                <th className="p-3">
                  <span className="sr-only">Ação</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {results.slice(page * 50, page * 50 + 50).map((row) => (
                <tr
                  key={row.code}
                  className="border-t border-neutral-100 hover:bg-neutral-50"
                >
                  <td className="p-3 font-mono whitespace-nowrap">
                    {formatCbo(row.code)}
                  </td>
                  <td className="p-3">{row.title}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      className={button}
                      aria-label={`Selecionar ${formatCbo(row.code)} ${row.title}`}
                      onClick={() => {
                        onChange(row.code);
                        setOpen(false);
                      }}
                    >
                      Selecionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!results.length && (
            <p className="p-5 text-sm text-neutral-500">
              Nenhuma ocupação encontrada. Tente outro termo ou remova os
              filtros.
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs">
          <button
            type="button"
            className={button}
            disabled={page === 0}
            onClick={() => setPage((n) => n - 1)}
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <span>
            Página {page + 1} de {pages}
          </span>
          <button
            type="button"
            className={button}
            disabled={page + 1 >= pages}
            onClick={() => setPage((n) => n + 1)}
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </dialog>
    </div>
  );
}
