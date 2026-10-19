import { test } from "node:test";
import assert from "node:assert/strict";
import { usernameIdentity } from "../src/backend/username";

test("Usuário tem identidade canônica sem e-mail pessoal e sem colisões de pontuação", () => {
  const user = usernameIdentity("  Luiz.Queiroz  ");
  assert.equal(user.username, "luiz.queiroz");
  assert.deepEqual(user, usernameIdentity("luiz.queiroz"));
  assert.match(user.email, /^[a-f0-9]+@users\.nexopen\.invalid$/);
  assert.notEqual(usernameIdentity("luiz-queiroz").email, user.email);
  assert.notEqual(usernameIdentity("luiz_queiroz").email, user.email);
  assert.equal(usernameIdentity("a".repeat(32)).email.split("@")[0].length, 64);
  // Dots do not become email-local-part delimiters or provider-specific aliases.
  assert.match(usernameIdentity("abc..def").email, /^[a-f0-9]+@/);
});

test("Usuário rejeita e-mail real, nomes fora do limite e caracteres incompatíveis", () => {
  for (const username of [
    "",
    "ab",
    "a".repeat(33),
    "luiz@example.com",
    "luíz",
    "luiz queiroz",
    ".luiz",
    "luiz-",
    "<script>",
  ])
    assert.throws(() => usernameIdentity(username), /3 a 32/);
});
