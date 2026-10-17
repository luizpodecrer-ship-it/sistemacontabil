import { parseSpreadsheet } from "./spreadsheet";
const scope = globalThis as unknown as {
  onmessage:
    | ((event: MessageEvent<{ bytes: ArrayBuffer; sha256: string }>) => void)
    | null;
  postMessage: (value: unknown) => void;
};
scope.onmessage = (event) => {
  try {
    scope.postMessage({
      book: parseSpreadsheet(event.data.bytes, event.data.sha256),
    });
  } catch (error) {
    scope.postMessage({
      error:
        error instanceof Error
          ? error.message
          : "Não foi possível ler a planilha.",
    });
  }
};
