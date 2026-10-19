import type { SupabaseClient } from "@supabase/supabase-js";
import { PostgrestClient } from "@supabase/postgrest-js";
import { publicAuthConfig, checkUsernameSignup } from "./auth-settings";
import { directFetch } from "./direct-transport";
const { url, key } = publicAuthConfig(
  import.meta.env?.VITE_SUPABASE_URL,
  import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY,
);
export const recoveryFlow =
  typeof window !== "undefined" &&
  window.location.hash.includes("type=recovery");
export let cloudConfigured = Boolean(url && key);
export let directCloud = false;
export let cloud: SupabaseClient | null = null;
let initialization: Promise<void> | undefined;
export function initializeBackend() {
  if (!initialization)
    initialization = (async () => {
      const local =
        typeof location === "undefined" ||
        location.protocol === "file:" ||
        ["localhost", "127.0.0.1"].includes(location.hostname);
      if (typeof location !== "undefined" && location.protocol !== "file:") {
        try {
          const response = await fetch("/api/cloud/status", {
            cache: "no-store",
            credentials: "same-origin",
          });
          const status = await response.json();
          if (status.mode === "direct-cloud") {
            directCloud = cloudConfigured = true;
            // Direct mode needs only REST/RPC. Do not load the browser auth SDK:
            // its diagnostic storage probe touches localStorage even with persistence disabled.
            const rest = new PostgrestClient(
              `${location.origin}/api/cloud/rest/v1`,
              { fetch: directFetch },
            );
            cloud = {
              from: rest.from.bind(rest),
              rpc: rest.rpc.bind(rest),
            } as unknown as SupabaseClient;
            return;
          }
          if (!local && (status.mode !== "accounts" || !cloudConfigured))
            throw Error();
        } catch {
          if (!local) {
            directCloud = cloudConfigured = true;
            throw new Error(
              "Não foi possível conectar ao servidor da nuvem. Nenhum dado será salvo neste navegador.",
            );
          }
        }
      }
      if (cloudConfigured) {
        const { createClient } = await import("@supabase/supabase-js");
        cloud = createClient(url, key);
      } else cloud = null;
    })();
  return initialization;
}
export async function assertUsernameSignupReady() {
  await checkUsernameSignup(url, key);
}
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
