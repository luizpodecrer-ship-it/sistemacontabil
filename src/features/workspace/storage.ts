import { cloudConfigured } from "../../backend/client";
import { cloudLoadData, cloudMutate } from "../../backend/repository";
import { initialData, type Data } from "./model";
const dbName = "nexo-workspace-v1";
async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(dbName, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("state");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(new Error("Não foi possível acessar os dados locais."));
  });
}
export async function loadData(): Promise<Data> {
  if (cloudConfigured) return cloudLoadData();
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readonly");
    const r = tx.objectStore("state").get("current");
    r.onsuccess = () => resolve(r.result || initialData());
    r.onerror = () => reject(new Error("Falha ao ler os dados."));
    tx.oncomplete = () => db.close();
  });
}
export async function mutateData(change: (data: Data) => void): Promise<Data> {
  if (cloudConfigured) return cloudMutate(change);
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    const store = tx.objectStore("state");
    const r = store.get("current");
    let next: Data;
    let failure = "";
    r.onsuccess = () => {
      try {
        next = r.result || initialData();
        change(next);
        next.revision++;
        store.put(next, "current");
      } catch (e) {
        failure = e instanceof Error ? e.message : "Operação inválida.";
        tx.abort();
      }
    };
    tx.oncomplete = () => {
      db.close();
      resolve(next);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        new Error(
          failure ||
            "Não foi possível salvar. Verifique o espaço do navegador.",
        ),
      );
    };
  });
}
