import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { CloudFailure } from "./cloud-access.mjs";

const accountEmail = "nexopen-cloud-test@users.nexopen.invalid";
const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

function checked(result, message) {
  if (result.error) {
    if (
      [401, 403].includes(Number(result.error.status)) ||
      [401, 403].includes(Number(result.status))
    )
      throw new CloudFailure(
        503,
        "O Supabase recusou a chave do servidor. Confira SUPABASE_SECRET_KEY no projeto correto.",
      );
    throw new CloudFailure(503, message);
  }
  return result.data;
}
export function createOwnerProvider(config) {
  const admin = createClient(config.url, config.secret, { auth: authOptions });
  let cached, pending;
  async function initialize() {
    const password = `Aa1!${createHmac("sha256", config.secret).update(`nexopen-test-owner:${config.accessKey}`).digest("base64url")}`;
    let identity = checked(
      await admin.rpc("get_cloud_test_owner"),
      "Instale a atualização 008 do banco para ativar o escritório de testes.",
    );
    if (!identity?.user_id) {
      const result = await admin.auth.admin.createUser({
        email: accountEmail,
        password,
        email_confirm: true,
        app_metadata: { nexopen_cloud_test: true },
        user_metadata: { name: "Escritório de testes" },
      });
      // A second cold start may have provisioned the same identity concurrently.
      if (result.error)
        identity = checked(
          await admin.rpc("get_cloud_test_owner"),
          "Não foi possível preparar a identidade de testes.",
        );
      else identity = { user_id: result.data.user.id, email: accountEmail };
      if (!identity?.user_id)
        throw new CloudFailure(
          503,
          "Não foi possível preparar a identidade exclusiva de testes. Confira o banco e a chave do servidor.",
        );
    }
    const workspace = checked(
      await admin.rpc("prepare_cloud_test_owner", {
        test_owner: identity.user_id,
      }),
      "Não foi possível preparar o escritório de testes. Confira a atualização 008.",
    );
    // Separate instance: never replace the privileged admin client's identity.
    const verifier = createClient(config.url, config.secret, {
      auth: authOptions,
    });
    let result = await verifier.auth.signInWithPassword({
      email: accountEmail,
      password,
    });
    if (
      result.error?.code === "invalid_credentials" ||
      result.error?.message === "Invalid login credentials"
    ) {
      // A server-key/link-key rotation changes this machine credential; preserve
      // the managed account UUID and all its data while renewing the credential.
      checked(
        await admin.auth.admin.updateUserById(identity.user_id, {
          password,
          email_confirm: true,
        }),
        "Não foi possível renovar a autorização de testes no servidor.",
      );
      result = await verifier.auth.signInWithPassword({
        email: accountEmail,
        password,
      });
    }
    const auth = checked(
      result,
      "Não foi possível abrir a sessão de testes no servidor.",
    );
    if (!auth.session || auth.user?.id !== identity.user_id)
      throw new CloudFailure(
        503,
        "A identidade da sessão de testes não confere.",
      );
    const token = auth.session.access_token;
    const owner = createClient(config.url, config.secret, {
      auth: authOptions,
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    cached = {
      owner,
      admin,
      workspace,
      token,
      expiresAt: auth.session.expires_at || 0,
    };
    return cached;
  }
  return async function getOwner() {
    if (cached && cached.expiresAt > Date.now() / 1000 + 90) return cached;
    if (!pending)
      pending = initialize().finally(() => {
        pending = undefined;
      });
    return pending;
  };
}
