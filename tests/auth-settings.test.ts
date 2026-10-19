import { test } from "node:test";
import assert from "node:assert/strict";
import {
  publicAuthConfig,
  checkUsernameSignup,
} from "../src/backend/auth-settings";

test("Configuração copiada com espaços e barra final usa a mesma URL e chave no acesso", async () => {
  const { url, key } = publicAuthConfig(
    " https://test.supabase.co/// \n",
    " sb_publishable_test \n",
  );
  assert.equal(url, "https://test.supabase.co");
  assert.equal(key, "sb_publishable_test");
  await checkUsernameSignup(url, key, async (input, init) => {
    assert.equal(input, "https://test.supabase.co/auth/v1/settings");
    assert.deepEqual(init?.headers, { apikey: key });
    return Response.json({
      disable_signup: false,
      mailer_autoconfirm: true,
      external: { email: true },
    });
  });
  assert.deepEqual(publicAuthConfig(undefined, undefined), {
    url: "",
    key: "",
  });
});

test("Consulta distingue chave recusada, URL incorreta, limites e indisponibilidade sem expor resposta", async () => {
  for (const [status, code] of [
    [401, "auth_public_key_rejected"],
    [403, "auth_public_key_rejected"],
    [404, "auth_endpoint_not_found"],
    [429, "over_request_rate_limit"],
    [500, "auth_service_unavailable"],
    [400, "auth_configuration_invalid"],
  ] as const) {
    await assert.rejects(
      checkUsernameSignup(
        "https://test.supabase.co",
        "test",
        async () => new Response("Private diagnostic", { status }),
      ),
      { code },
    );
  }
  await assert.rejects(
    checkUsernameSignup(
      "https://test.supabase.co",
      "test",
      async () => new Response("<html>Wrong website</html>"),
    ),
    { code: "auth_settings_invalid" },
  );
  await assert.rejects(
    checkUsernameSignup("https://test.supabase.co", "test", async () =>
      Response.json({ branding: {} }),
    ),
    { code: "auth_settings_invalid" },
  );
});

test("Cadastro permanece bloqueado quando depende de confirmação ou provedor desativado", async () => {
  for (const [settings, code] of [
    [
      {
        disable_signup: false,
        mailer_autoconfirm: false,
        external: { email: true },
      },
      "username_signup_not_configured",
    ],
    [
      {
        disable_signup: true,
        mailer_autoconfirm: true,
        external: { email: true },
      },
      "signup_disabled",
    ],
    [
      {
        disable_signup: false,
        mailer_autoconfirm: true,
        external: { email: false },
      },
      "email_provider_disabled",
    ],
  ] as const) {
    await assert.rejects(
      checkUsernameSignup("https://test.supabase.co", "test", async () =>
        Response.json(settings),
      ),
      { code },
    );
  }
});
