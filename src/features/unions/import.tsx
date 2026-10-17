import { Select } from "@/components/ui/select";
import { readUnionFile } from "./read-file";
import { FileSpreadsheet, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Data } from "../workspace/model";
import { mutateData } from "../workspace/storage";
import {
  importFields,
  detectImportStart,
  suggestMapping,
  planUnionImport,
  commitUnionPlan,
  type Workbook,
} from "./import-model";
const button =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold hover:bg-neutral-50 disabled:opacity-40";
export function UnionImport({
  data,
  onSaved,
  onClose,
  onDirty,
  onComplete,
}: {
  data: Data;
  onSaved: (next: Data) => void;
  onClose: () => void;
  onDirty: (dirty: boolean) => void;
  onComplete: (message: string) => void;
}) {
  const [book, setBook] = useState<Workbook>(),
    [fileName, setFileName] = useState(""),
    [sheet, setSheet] = useState(0),
    [header, setHeader] = useState(0),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [date, setDate] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState("");
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    onDirty(!!book && !done);
    return () => onDirty(false);
  }, [book, done, onDirty]);
  const plan = useMemo(() => {
    if (!book) return undefined;
    try {
      return planUnionImport(
        book.sheets[sheet],
        header,
        mapping,
        { name: fileName, sha256: book.sha256, date },
        data,
      );
    } catch (e) {
      return (e as Error).message;
    }
  }, [book, sheet, header, mapping, fileName, date, data]);
  async function read(file?: File) {
    if (!file) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setBook(undefined);
    setFileName(file.name);
    setDate("");
    setDone("");
    setError("");
    setBusy(true);
    try {
      const value = await readUnionFile(file, current.signal);
      if (current.signal.aborted) return;
      const start = detectImportStart(value);
      setBook(value);
      setSheet(start.sheet);
      setHeader(start.header);
      setMapping(start.mapping);
    } catch (error) {
      if (!current.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Não foi possível ler a planilha.",
        );
    } finally {
      if (controller.current === current && !current.signal.aborted)
        setBusy(false);
    }
  }
  async function save() {
    if (!plan || typeof plan === "string" || !plan.ready.length) return;
    setBusy(true);
    setError("");
    try {
      let result = { inserted: 0, skipped: 0 };
      const next = await mutateData((state) => {
        result = commitUnionPlan(state, plan);
      });
      onSaved(next);
      const message = `Importação concluída: ${result.inserted} novos sindicatos; ${result.skipped} já existentes preservados.`;
      setDone(message);
      onComplete(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const headers = book?.sheets[sheet].rows[header] || [];
  return (
    <section
      aria-label="Importação de sindicatos"
      className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5"
    >
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-lg font-semibold">Importar base CNES</h2>
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={onClose}
        >
          Fechar importação
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Selecione a planilha e clique em Cadastrar sindicatos para adicioná-los
        ao catálogo de teste. Excel XLS, XLSX, exportações HTML/XML e CSV são
        aceitos, até 20 MB. Cadastros existentes serão preservados.
      </p>
      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5">
        <label
          className={`relative inline-flex items-center gap-2 overflow-hidden rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold ${busy ? "opacity-50" : "cursor-pointer hover:bg-neutral-100"}`}
        >
          <Upload className="h-4 w-4" />{" "}
          {busy ? "Lendo planilha…" : "Selecionar planilha Excel"}
          <input
            aria-label="Arquivo CNES"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            type="file"
            accept=".xls,.xlsx,.csv,.xml,.html,.htm,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            disabled={busy}
            onChange={(event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              void read(file).finally(() => {
                input.value = "";
              });
            }}
          />
        </label>
        <p className="mt-3 flex items-center gap-2 break-all text-xs text-neutral-500">
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          {fileName ||
            "Nenhuma planilha selecionada. Clique no botão acima para escolher o arquivo."}
        </p>
        {book && (
          <p role="status" className="mt-2 text-xs text-emerald-700">
            Planilha lida: {book.sheets.length} aba(s). Confira os dados abaixo
            para concluir o cadastro.
          </p>
        )}
      </div>
      {busy && (
        <p role="status" className="text-xs">
          Processando arquivo…
        </p>
      )}
      {book && !done && (
        <>
          <details
            open={Number(mapping.cnpj) < 0 || Number(mapping.title) < 0}
            className="rounded-xl border border-neutral-200 p-4"
          >
            <summary className="cursor-pointer text-sm font-semibold">
              Ajustes avançados: aba e colunas
            </summary>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs">
                Aba
                <Select
                  className="form-control mt-1"
                  aria-label="Aba CNES"
                  value={sheet}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setSheet(n);
                    setHeader(0);
                    setMapping(suggestMapping(book.sheets[n].rows[0] || []));
                  }}
                >
                  {book.sheets.map((s, i) => (
                    <option key={i} value={i}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-xs">
                Linha do cabeçalho
                <Select
                  className="form-control mt-1"
                  aria-label="Linha do cabeçalho CNES"
                  value={header}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setHeader(n);
                    setMapping(
                      suggestMapping(book.sheets[sheet].rows[n] || []),
                    );
                  }}
                >
                  {book.sheets[sheet].rows.slice(0, 25).map((_, i) => (
                    <option key={i} value={i}>
                      Linha {i + 1}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-xs">
                Data de referência do arquivo (opcional)
                <input
                  type="date"
                  aria-label="Data de referência do arquivo"
                  className="form-control mt-1"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {importFields.map((field) => (
                <label key={field.key} className="text-xs font-medium">
                  {field.label}
                  {["cnpj", "title"].includes(field.key) ? " *" : ""}
                  <Select
                    aria-label={`Coluna ${field.label}`}
                    className="form-control mt-1"
                    value={mapping[field.key] ?? "-1"}
                    onChange={(e) =>
                      setMapping((old) => ({
                        ...old,
                        [field.key]: e.target.value,
                      }))
                    }
                  >
                    <option value="-1">Não importar</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {i + 1} · {h || "Sem título"}
                      </option>
                    ))}
                  </Select>
                </label>
              ))}
            </div>
          </details>
          {typeof plan === "string" ? (
            <p role="status" className="text-xs text-neutral-500">
              {plan}
            </p>
          ) : (
            plan && (
              <>
                <p role="status" className="text-sm">
                  {plan.ready.length} novos · {plan.existing} já cadastrados ·{" "}
                  {plan.review.length} para revisão
                </p>
                <div className="relative overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-neutral-50">
                      <tr>
                        {[
                          "Linha",
                          "Denominação",
                          "CNPJ",
                          "UF",
                          "Situação na fonte",
                        ].map((s) => (
                          <th key={s} className="p-3">
                            {s}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {plan.ready.slice(0, 30).map(({ line, item }) => (
                        <tr key={line} className="border-t border-neutral-100">
                          <td className="p-3">{line}</td>
                          <td className="p-3">{item.values.title}</td>
                          <td className="p-3 whitespace-nowrap">
                            {item.values.cnpj}
                          </td>
                          <td className="p-3">{item.values.uf || "—"}</td>
                          <td className="p-3">
                            {item.values.cnesStatus || "Não informado"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Prévia dos primeiros 30 novos registros. Linhas para revisão
                  não são cadastradas.
                </p>
                {plan.review.length > 0 && (
                  <details className="rounded-xl border border-amber-200 p-3">
                    <summary className="cursor-pointer text-xs">
                      Revisar {plan.review.length} linhas excluídas
                    </summary>
                    <ul className="mt-3 space-y-2 text-xs">
                      {plan.review.slice(0, 100).map((r) => (
                        <li key={r.line}>
                          Linha {r.line}: {r.reason}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <button
                  type="button"
                  className={button}
                  disabled={busy || !plan.ready.length}
                  onClick={() => void save()}
                >
                  Cadastrar {plan.ready.length} sindicatos
                </button>
              </>
            )
          )}
        </>
      )}
      {done && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm"
        >
          {done}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm"
        >
          {error}
        </p>
      )}
    </section>
  );
}
