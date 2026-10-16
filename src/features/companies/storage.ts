import type { Company } from "./model";
const database = "nexo-companies-v1";
export async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("Armazenamento indisponível neste navegador."));
      return;
    }
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("companies", { keyPath: "id" });
    request.onerror = () =>
      reject(new Error("Não foi possível abrir o armazenamento local."));
    request.onblocked = () =>
      reject(new Error("Feche outras abas do sistema e tente novamente."));
    request.onsuccess = () => {
      const db = request.result;
      let tx: IDBTransaction;
      let op: IDBRequest<T>;
      try {
        tx = db.transaction("companies", mode);
        op = operation(tx.objectStore("companies"));
      } catch {
        db.close();
        reject(
          new Error(
            "Não foi possível salvar. Confira o espaço e as permissões do navegador.",
          ),
        );
        return;
      }
      let result: T;
      op.onsuccess = () => {
        result = op.result;
      };
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => {
        db.close();
        reject(
          new Error(
            "Não foi possível salvar. Confira o espaço disponível no navegador.",
          ),
        );
      };
      tx.onabort = () => {
        db.close();
        reject(new Error("Operação interrompida. Os dados não foram salvos."));
      };
    };
  });
}
export const listCompanies = () =>
  withStore<Company[]>("readonly", (s) => s.getAll());
export const saveCompany = (company: Company) =>
  withStore("readwrite", (s) => s.put(company));
