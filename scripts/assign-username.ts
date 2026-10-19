// Trusted operator tool, never shipped in the browser. Preserves the account UUID,
// password, workspace ownership and administrator permissions when replacing an
// existing email-based account with a username. Never accepts or prints a password.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import { usernameIdentity } from "../src/backend/username";

export async function assignUsername(
  admin: SupabaseClient,
  userId: string,
  input: string,
) {
  if (!userId || !/^[0-9a-f-]{36}$/i.test(userId) || !input)
    throw new Error(
      "Uso: npx tsx scripts/assign-username.ts UUID NOME-DE-USUARIO",
    );
  const identity = usernameIdentity(input);
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user)
    throw new Error(
      "Não foi possível localizar a conta. Confira o UUID e o projeto.",
    );
  const result = await admin.auth.admin.updateUserById(userId, {
    email: identity.email,
    email_confirm: true,
    user_metadata: { ...data.user.user_metadata, username: identity.username },
  });
  if (result.error)
    throw new Error(
      "Não foi possível atribuir o usuário. Confira as permissões e se o nome já está em uso.",
    );
  return identity.username;
}
async function main() {
  const [userId, input] = process.argv.slice(2);
  if (!userId || !input)
    throw new Error(
      "Uso: npx tsx scripts/assign-username.ts UUID NOME-DE-USUARIO",
    );
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY somente no ambiente administrativo.",
    );
  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const username = await assignUsername(admin, userId, input);
  console.log(
    `Nome de usuário atribuído: ${username}. UUID e senha da conta preservados.`,
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
