import { useState } from "react";
import {
  parseImportPayload,
  planCompanyImport,
  type ImportPayload,
  type ImportPlan,
} from "./import-model";
import { commitCompanyImport } from "./import-storage";
import type { Company } from "./model";

export function CompanyImport({
  records,
  onImported,
  onClose,
}: {
  records: Company[];
  onImported: () => Promise<void>;
  onClose: () => void;
}) {
  const [payload, setPayload] = useState<ImportPayload>();
  const [plan, setPlan] = useState<ImportPlan>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function read(file?: File) {
    setPayload(undefined);
    setPlan(undefined);
    setError("");
    setDone(false);
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      setError("O limite é de 4 MB por arquivo.");
      return;
    }
    setBusy(true);
    try {
      let input: unknown;
      if (file.name.toLowerCase().endsWith(".json"))
        input = JSON.parse(await file.text());
      else {
        const response = await fetch("/api/company_import", {
          method: "POST",
          headers: { "Content-Type": "application/octet-stream" },
          body: file,
        });
        if (!response.ok) {
          throw new Error(
            "Não foi possível ler a planilha. Confira se é um arquivo .xls ou use o arquivo JSON preparado.",
          );
        }
        input = await response.json();
      }
      const next = parseImportPayload(input);
      next.source.name = file.name;
      setPayload(next);
      setPlan(planCompanyImport(next, records));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível ler o arquivo.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!payload) return;
    setBusy(true);
    setError("");
    try {
      const result = await commitCompanyImport(payload);
      setPlan(result);
      setDone(true);
      await onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="rounded-2xl border border-neutral-200 bg-white p-6 mb-6"
      aria-label="Importação de empresas"
      aria-busy={busy}
    >
      <div className="flex justify-between gap-4">
        <h2 className="text-lg font-semibold">Importar empresas</h2>
        <button
          type="button"
          className="underline text-sm"
          disabled={busy}
          onClick={onClose}
        >
          Fechar importação
        </button>
      </div>
      <p className="text-sm text-neutral-500 mt-2 mb-4">
        Selecione a planilha com Código, Razão Social, Tipo de Inscrição,
        Inscrição, Status, Data de Inativação e CNAE Preponderante. Os cadastros
        novos ficarão como rascunho para completar depois. Campos já preenchidos
        serão preservados.
      </p>
      <p className="text-sm text-neutral-500 mb-4">
        O arquivo XLS é enviado ao leitor de planilhas do site para conversão,
        sem armazenamento do arquivo. Inscrições repetidas no arquivo ficam fora
        da importação para revisão.
      </p>
      <input
        type="file"
        accept=".xls,.json"
        aria-label="Arquivo de empresas"
        disabled={busy}
        onChange={(e) => void read(e.target.files?.[0])}
        className="form-control"
      />
      {busy && (
        <p role="status" className="mt-3 text-sm">
          Processando arquivo…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {plan && (
        <div className="mt-4 space-y-3">
          <p role="status" className="text-sm font-medium">
            {done ? "Importação concluída:" : "Conferência:"} {plan.created}{" "}
            novos cadastros · {plan.updated} complementados · {plan.unchanged}{" "}
            já importados · {plan.issues.length} separados para revisão.
          </p>
          {!!plan.issues.length && (
            <details open>
              <summary className="cursor-pointer text-sm">
                Registros separados para revisão
              </summary>
              <ul className="mt-2 space-y-2 text-sm text-neutral-600">
                {plan.issues.map((issue, i) => (
                  <li key={i}>
                    Linha {issue.line}
                    {issue.code ? ` · Código ${issue.code}` : ""}:{" "}
                    {issue.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {!done && (
            <button
              type="button"
              disabled={busy || !plan.companies.length}
              onClick={() => void save()}
              className="rounded-lg bg-neutral-900 text-white px-5 py-3 text-sm disabled:opacity-40"
            >
              Importar {plan.companies.length} cadastros
            </button>
          )}
          {done && (
            <p className="text-sm text-neutral-500">
              Abra cada empresa para conferir e completar o cadastro. Os
              registros separados não foram cadastrados.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
