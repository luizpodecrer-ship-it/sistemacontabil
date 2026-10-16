import { createClient } from "@supabase/supabase-js";
const url = import.meta.env?.VITE_SUPABASE_URL;
export const recoveryFlow =
  typeof window !== "undefined" &&
  window.location.hash.includes("type=recovery");
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloudConfigured = Boolean(url && key);
export const cloud = cloudConfigured ? createClient(url, key) : null;
let workspacePromise: Promise<string> | undefined;
export async function workspaceId(): Promise<string> {
  if (!cloud) throw new Error("Banco em nuvem não configurado.");
  if (!workspacePromise)
    workspacePromise = (async () => {
      const { data, error } = await cloud!.rpc("ensure_own_workspace");
      if (error)
        throw new Error(
          "Não foi possível abrir o escritório em nuvem. Confira a autenticação e a instalação do banco.",
        );
      return String(data);
    })().catch((e) => {
      workspacePromise = undefined;
      throw e;
    });
  return workspacePromise;
}
export function clearWorkspace() {
  workspacePromise = undefined;
}
