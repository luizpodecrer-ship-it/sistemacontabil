import { createClient } from "@supabase/supabase-js";
const url = import.meta.env?.VITE_SUPABASE_URL;
export const recoveryFlow =
  typeof window !== "undefined" &&
  window.location.hash.includes("type=recovery");
const key = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
export const cloudConfigured = Boolean(url && key);
export const cloud = cloudConfigured ? createClient(url, key) : null;
export async function assertUsernameSignupReady() {
  const response = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: key },
  });
  if (!response.ok)
    throw Object.assign(new Error("Authentication configuration unavailable"), {
      code: "auth_configuration_invalid",
    });
  const settings = await response.json();
  if (settings.disable_signup === true)
    throw Object.assign(new Error("Registration disabled"), {
      code: "signup_disabled",
    });
  if (settings.external?.email === false)
    throw Object.assign(new Error("Password provider disabled"), {
      code: "email_provider_disabled",
    });
  // Do not create an account that cannot sign in because a non-deliverable
  // technical identifier was sent a confirmation email. The owner must explicitly
  // configure this username-only installation first.
  if (settings.mailer_autoconfirm !== true)
    throw Object.assign(new Error("Username registration unavailable"), {
      code: "username_signup_not_configured",
    });
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
