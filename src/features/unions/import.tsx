import { useEffect, useMemo, useState } from "react";
import type { Data } from "../workspace/model";
import { mutateData } from "../workspace/storage";
import {
  importFields,
  parseCsv,
  suggestMapping,
  validateWorkbook,
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
}: {
  data: Data;
  onSaved: (next: Data) => void;
  onClose: () => void;
  onDirty: (dirty: boolean) => void;
}) {
  const [book, setBook] = useState<Workbook>(),
    [fileName, setFileName] = useState(""),
    [sheet, setSheet] = useState(0),
    [header, setHeader] = useState(0),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [date, setDate] = useState(""),
    [ack, setAck] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState("");
  useEffect(() => {
    onDirty(!!book && !done);
    return () => onDirty(false);
  }, [book, done, onDirty]);
  useEffect(() => setAck(false), [book, sheet, header, mapping, date]);
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
    setBook(undefined);
    setDate("");
    setDone("");
    setError("");
    setAck(false);
    if (!file) return;
    const csv = /\.csv$/i.test(file.name);
    if (file.size > (csv ? 20 : 4) * 1024 * 1024) {
      setError(
        csv
          ? "CSV deve ter até 20 MB."
          : "Excel deve ter até 4 MB. Exporte CSV para arquivos maiores.",
      );
      return;
    }
    setBusy(true);
    try {
      let value: Workbook;
      if (csv) {
        const bytes = await file.arrayBuffer();
        let text;
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        } catch {
          text = new TextDecoder("windows-1252").decode(bytes);
        }
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        value = {
          sheets: [{ name: "CSV", rows: parseCsv(text) }],
          sha256: [...new Uint8Array(digest)]
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""),
        };
      } else {
        const response = await fetch("/api/union_import", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: file,
        });
        const parsed = await response.json();
        if (!response.ok || parsed.error)
          throw new Error(
            parsed.error || "Não foi possível ler o Excel. Use CSV.",
          );
        value = parsed;
      }
      value = validateWorkbook(value);
      setBook(value);
      setFileName(file.name);
      setSheet(0);
      setHeader(0);
      setMapping(suggestMapping(value.sheets[0].rows[0] || []));
    } catch (e) {
      setError(
        (e as Error).message ||
          "Não foi possível ler o arquivo. Tente exportar CSV.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!plan || typeof plan === "string" || !ack || !plan.ready.length) return;
    setBusy(true);
    setError("");
    try {
      let result = { inserted: 0, skipped: 0 };
      const next = await mutateData((state) => {
        result = commitUnionPlan(state, plan);
      });
      onSaved(next);
      setDone(
        `Importação concluída: ${result.inserted} novos sindicatos; ${result.skipped} já existentes preservados.`,
      );
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
        Selecione o Excel XLS/XLSX baixado do CNES ou uma exportação CSV.
        Confira a aba, o cabeçalho e a correspondência das colunas antes de
        gravar. Cadastros existentes não serão sobrescritos. Excel é convertido
        pelo servidor do aplicativo, sem armazenar o arquivo; CSV é lido neste
        navegador.
      </p>
      <label className="block text-xs font-semibold">
        Arquivo CNES
        <input
          aria-label="Arquivo CNES"
          className="mt-2 block w-full text-xs"
          type="file"
          accept=".xls,.xlsx,.csv"
          disabled={busy}
          onChange={(e) => void read(e.target.files?.[0])}
        />
      </label>
      {busy && (
        <p role="status" className="text-xs">
          Processando arquivo…
        </p>
      )}
      {book && !done && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs">
              Aba
              <select
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
              </select>
            </label>
            <label className="text-xs">
              Linha do cabeçalho
              <select
                className="form-control mt-1"
                aria-label="Linha do cabeçalho CNES"
                value={header}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setHeader(n);
                  setMapping(suggestMapping(book.sheets[sheet].rows[n] || []));
                }}
              >
                {book.sheets[sheet].rows.slice(0, 25).map((_, i) => (
                  <option key={i} value={i}>
                    Linha {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs">
              Data de referência do arquivo
              <input
                type="date"
                aria-label="Data de referência do arquivo"
                className="form-control mt-1"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <details open className="rounded-xl border border-neutral-200 p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              Correspondência das colunas
            </summary>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {importFields.map((field) => (
                <label key={field.key} className="text-xs font-medium">
                  {field.label}
                  {["cnpj", "title"].includes(field.key) ? " *" : ""}
                  <select
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
                  </select>
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
                <label className="flex items-start gap-2 text-xs">
                  <input
                    aria-label="Confirmar origem e revisão CNES"
                    className="mt-0.5"
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                  />
                  Obtive este arquivo no CNES e conferi a data, as colunas e a
                  prévia. A importação não comprova a situação sindical atual.
                </label>
                <button
                  type="button"
                  className={button}
                  disabled={busy || !ack || !plan.ready.length}
                  onClick={() => void save()}
                >
                  Importar {plan.ready.length} sindicatos
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
