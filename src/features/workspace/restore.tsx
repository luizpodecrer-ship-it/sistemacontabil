import { cloudConfigured } from "../../backend/client";
import { useState } from "react";
import { listCompanies, saveCompany, withStore } from "../companies/storage";
import { validCnpj } from "@/lib/formats";
import { loadData, mutateData } from "./storage";
import { checkEntry, initialData, type Data } from "./model";
import type { Company } from "../companies/model";
type FileRecord = { name: string; type: string; base64: string };
function decode(record: FileRecord): File {
  if (
    !record ||
    typeof record.name !== "string" ||
    typeof record.type !== "string" ||
    typeof record.base64 !== "string" ||
    record.base64.length > 45 * 1024 * 1024
  )
    throw new Error("Anexo inválido no backup.");
  const bytes = Uint8Array.from(atob(record.base64), (c) => c.charCodeAt(0));
  return new File([bytes], record.name, { type: record.type });
}
export function validateBackup(value: unknown): {
  data: Data;
  companies: Company[];
} {
  const raw = value as {
    format: string;
    data: Data;
    companies: Company[];
    files: Record<string, FileRecord>;
    companyFiles: Record<string, FileRecord>;
  };
  if (
    !raw ||
    raw.format !== "nexo-backup-v1" ||
    !raw.data ||
    raw.data.schema !== 1 ||
    !Array.isArray(raw.companies)
  )
    throw new Error("Formato ou versão de backup incompatível.");
  const data = raw.data;
  for (const array of [
    data.items,
    data.entries,
    data.accounts,
    data.closings,
    data.audit,
  ])
    if (!Array.isArray(array) || array.length > 50000)
      throw new Error("Estrutura ou volume de backup inválido.");
  const allIds = new Set<string>();
  for (const c of raw.companies) {
    if (
      !c ||
      typeof c.id !== "string" ||
      !c.values ||
      !validCnpj(c.values.cnpj || "") ||
      !c.values.legalName ||
      !Array.isArray(c.attachments) ||
      !Array.isArray(c.history) ||
      !Array.isArray(c.branches) ||
      !Array.isArray(c.activities) ||
      !Array.isArray(c.regimes) ||
      !Array.isArray(c.people) ||
      allIds.has(c.id)
    )
      throw new Error("Empresa inválida ou repetida no backup.");
    allIds.add(c.id);
    for (const a of c.attachments) {
      a.file = decode(raw.companyFiles?.[a.id]);
    }
  }
  const accountIds = new Set<string>();
  for (const a of data.accounts) {
    if (
      !a ||
      typeof a.id !== "string" ||
      typeof a.name !== "string" ||
      typeof a.code !== "string" ||
      ![
        "Ativo",
        "Passivo",
        "Patrimônio líquido",
        "Receita",
        "Despesa",
      ].includes(a.kind) ||
      accountIds.has(a.id)
    )
      throw new Error("Plano de contas inválido.");
    accountIds.add(a.id);
  }
  const itemIds = new Set<string>();
  for (const i of data.items) {
    if (
      !i ||
      typeof i.id !== "string" ||
      typeof i.module !== "string" ||
      !i.values ||
      Object.values(i.values).some((v) => typeof v !== "string") ||
      typeof i.period !== "string" ||
      typeof i.companyId !== "string" ||
      (i.companyId && !allIds.has(i.companyId)) ||
      itemIds.has(i.id)
    )
      throw new Error("Registro operacional inválido.");
    itemIds.add(i.id);
    if (raw.files?.[i.id]) i.file = decode(raw.files[i.id]);
    else delete i.file;
  }
  const checking = { ...initialData(), accounts: data.accounts };
  for (const e of data.entries) {
    if (
      !e ||
      !Array.isArray(e.lines) ||
      !allIds.has(e.companyId) ||
      checking.entries.some((r) => r.id === e.id)
    )
      throw new Error("Lançamento inválido.");
    checkEntry(checking, e);
    checking.entries.push(e);
  }
  for (const closing of data.closings)
    if (
      !allIds.has(closing.companyId) ||
      !/^\d{4}-\d{2}$/.test(closing.period) ||
      !["Aberto", "Em revisão", "Fechado"].includes(closing.state)
    )
      throw new Error("Fechamento inválido.");
  for (const a of data.audit)
    if (
      typeof a?.action !== "string" ||
      typeof a?.at !== "string" ||
      typeof a?.entity !== "string" ||
      typeof a?.reason !== "string"
    )
      throw new Error("Histórico inválido.");
  return { data, companies: raw.companies };
}
export function RestoreBackup({
  onRestored,
  onError,
}: {
  onRestored: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="mt-8 border-t border-neutral-200 pt-6">
      <h3 className="text-sm font-semibold mb-3">
        Restaurar em instalação vazia
      </h3>
      <p className="text-xs text-neutral-500 mb-4">
        A restauração é permitida somente sem empresas ou movimentos locais para
        impedir sobrescrita de trabalho existente. Escolha um backup exportado
        pelo sistema.
      </p>
      <label className="btn fx-20 inline-flex cursor-pointer">
        {busy ? "Restaurando…" : "Selecionar backup JSON"}
        <input
          disabled={busy}
          className="sr-only"
          aria-label="Restaurar backup JSON"
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            const inserted: string[] = [];
            try {
              if (cloudConfigured)
                throw new Error(
                  "A restauração na nuvem requer um procedimento administrativo. Esta ferramenta restaura somente dados locais.",
                );
              if (file.size > 100 * 1024 * 1024)
                throw new Error("O backup deve ter até 100 MB.");
              const [current, companies] = await Promise.all([
                loadData(),
                listCompanies(),
              ]);
              if (
                companies.length ||
                current.items.length ||
                current.entries.length ||
                current.audit.length
              )
                throw new Error(
                  "Esta instalação contém dados. Use um navegador vazio ou outro perfil para restaurar sem sobrescrever.",
                );
              const next = validateBackup(JSON.parse(await file.text()));
              if (
                !window.confirm(
                  `Restaurar ${next.companies.length} empresas e ${next.data.items.length} registros neste navegador?`,
                )
              )
                return;
              for (const c of next.companies) {
                await saveCompany(c);
                inserted.push(c.id);
              }
              await mutateData((d) => {
                if (d.items.length || d.entries.length || d.audit.length)
                  throw new Error(
                    "Dados foram criados em outra aba. Restauração cancelada.",
                  );
                Object.assign(d, next.data);
              });
              await onRestored();
            } catch (err) {
              for (const id of inserted) {
                await withStore("readwrite", (s) => s.delete(id)).catch(
                  () => {},
                );
              }
              onError(
                err instanceof Error
                  ? err.message
                  : "Não foi possível restaurar o backup.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
    </div>
  );
}
