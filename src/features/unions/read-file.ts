import SpreadsheetWorker from "./spreadsheet.worker?worker&inline";
import { parseCsv, validateWorkbook, type Workbook } from "./import-model";
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;
export async function readUnionFile(
  file: File,
  signal?: AbortSignal,
): Promise<Workbook> {
  if (!file.size || file.size > MAX_IMPORT_BYTES)
    throw new Error("Selecione uma planilha Excel ou CSV de até 20 MB.");
  const bytes = await file.arrayBuffer();
  if (signal?.aborted)
    throw new DOMException("Leitura cancelada", "AbortError");
  const digest = await crypto.subtle.digest("SHA-256", bytes),
    sha256 = [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  if (signal?.aborted)
    throw new DOMException("Leitura cancelada", "AbortError");
  if (/\.csv$/i.test(file.name)) {
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      text = new TextDecoder("windows-1252").decode(bytes);
    }
    return validateWorkbook({
      sheets: [{ name: "CSV", rows: parseCsv(text) }],
      sha256,
    });
  }
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new SpreadsheetWorker();
    } catch {
      reject(
        new Error(
          "O navegador não conseguiu iniciar o leitor de Excel. Atualize a página e tente novamente.",
        ),
      );
      return;
    }
    const clean = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      worker.terminate();
    };
    const cancel = () => {
      clean();
      reject(new DOMException("Leitura cancelada", "AbortError"));
    };
    const timer = setTimeout(() => {
      clean();
      reject(
        new Error(
          "A leitura demorou demais. Salve uma cópia da planilha com apenas a aba de dados e tente novamente.",
        ),
      );
    }, 45000);
    signal?.addEventListener("abort", cancel, { once: true });
    worker.onmessage = (event) => {
      clean();
      if (event.data?.error) {
        reject(new Error(event.data.error));
        return;
      }
      try {
        resolve(validateWorkbook(event.data?.book));
      } catch (error) {
        reject(error);
      }
    };
    worker.onerror = () => {
      clean();
      reject(
        new Error(
          "Falha ao ler o Excel. Atualize a página e selecione a planilha novamente.",
        ),
      );
    };
    if (signal?.aborted) {
      cancel();
      return;
    }
    worker.postMessage({ bytes, sha256 }, [bytes]);
  });
}
