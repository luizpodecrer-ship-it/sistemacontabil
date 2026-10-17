import { cloudConfigured } from "../../backend/client";
import { cloudCompanies, cloudImportCompanies } from "../../backend/repository";
import { normalizeCompany, type Company } from "./model";
import {
  planCompanyImport,
  type ImportPayload,
  type ImportPlan,
} from "./import-model";
export async function commitCompanyImport(
  payload: ImportPayload,
): Promise<ImportPlan> {
  if (cloudConfigured) {
    const current = (await cloudCompanies()).map(normalizeCompany);
    const plan = planCompanyImport(payload, current);
    if (plan.companies.length) await cloudImportCompanies(plan.companies);
    return plan;
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("nexo-companies-v1", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("companies", { keyPath: "id" });
    request.onerror = () =>
      reject(new Error("Não foi possível abrir o armazenamento."));
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("companies", "readwrite");
      const store = tx.objectStore("companies");
      let plan: ImportPlan;
      let message = "";
      const read = store.getAll();
      read.onsuccess = () => {
        try {
          plan = planCompanyImport(
            payload,
            (read.result as Company[]).map(normalizeCompany),
          );
          for (const company of plan.companies) store.put(company);
        } catch (e) {
          message = e instanceof Error ? e.message : "Arquivo inválido.";
          tx.abort();
        }
      };
      tx.oncomplete = () => {
        db.close();
        resolve(plan);
      };
      tx.onabort = tx.onerror = () => {
        db.close();
        reject(
          new Error(
            message ||
              "A importação não foi salva. Confira o espaço e as permissões do navegador.",
          ),
        );
      };
    };
  });
}
