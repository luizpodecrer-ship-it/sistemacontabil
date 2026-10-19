import { test } from "node:test";
import assert from "node:assert/strict";
import { authErrorMessage } from "../src/backend/auth-errors";

test("Acesso distingue credenciais, liberação, cadastro e limites sem pedir e-mail", () => {
  for (const [code, message] of [
    ["invalid_credentials", /Nome de usuário ou senha inválidos/],
    ["email_not_confirmed", /conta ainda não foi liberada/],
    ["signup_disabled", /criação de contas está desativada/],
    ["email_provider_disabled", /acesso por senha está desativado/],
    ["over_email_send_rate_limit", /limite de tentativas/],
    ["email_address_not_authorized", /cadastro por nome de usuário/],
    ["username_signup_not_configured", /cadastro por nome de usuário/],
    ["auth_public_key_rejected", /conferir a chave pública/],
    ["auth_endpoint_not_found", /conferir a URL/],
    ["auth_service_unavailable", /indisponível/],
    ["weak_password", /requisitos desta instalação/],
    ["session_expired", /sessão expirou/],
  ] as const)
    assert.match(authErrorMessage({ code }), message);
});

test("Erros conhecidos de infraestrutura são explicados sem reproduzir dados internos", () => {
  assert.match(
    authErrorMessage({ message: "Invalid API key" }),
    /não está configurado corretamente/,
  );
  assert.match(
    authErrorMessage({ message: "Error sending confirmation email" }),
    /cadastro por nome de usuário/,
  );
  assert.match(
    authErrorMessage({ name: "AuthRetryableFetchError" }),
    /Não foi possível conectar/,
  );
  const generic = authErrorMessage({
    code: "unknown",
    message: "Internal: token=private; user@example.com",
  });
  assert.doesNotMatch(generic, /private|user@example|token/);
  assert.equal(authErrorMessage(undefined), generic);
  assert.equal(
    authErrorMessage({ code: "user_already_exists" }),
    authErrorMessage({ code: "email_exists" }),
  );
  assert.equal(
    authErrorMessage({ message: "Invalid login credentials" }),
    authErrorMessage({ code: "invalid_credentials" }),
  );
  assert.equal(
    authErrorMessage({ message: "Email not confirmed" }),
    authErrorMessage({ code: "email_not_confirmed" }),
  );
});
