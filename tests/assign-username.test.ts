import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createClient } from "@supabase/supabase-js";
import { assignUsername } from "../scripts/assign-username";
import { usernameIdentity } from "../src/backend/username";

test("Associar usuário usa API administrativa, preserva UUID e metadados sem alterar senha", async () => {
  const userId = "11111111-1111-4111-8111-111111111111";
  let patch: Record<string, unknown> = {};
  let conflict = false;
  const server = createServer(async (request, response) => {
    assert.equal(request.url, `/auth/v1/admin/users/${userId}`);
    assert.equal(request.headers.apikey, "test-service-key");
    response.setHeader("Content-Type", "application/json");
    if (request.method === "PUT") {
      let body = "";
      for await (const part of request) body += part;
      patch = JSON.parse(body);
      if (conflict) {
        response.writeHead(422);
        response.end(
          JSON.stringify({
            error_code: "email_exists",
            msg: "Email already registered",
          }),
        );
        return;
      }
    }
    response.end(
      JSON.stringify({
        user: {
          id: userId,
          email: "old@example.com",
          user_metadata: { display_name: "Operador" },
        },
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const port = (server.address() as { port: number }).port;
    const admin = createClient(`http://127.0.0.1:${port}`, "test-service-key", {
      auth: { persistSession: false },
    });
    assert.equal(
      await assignUsername(admin, userId, "Luiz.Queiroz"),
      "luiz.queiroz",
    );
    assert.deepEqual(patch, {
      email: usernameIdentity("luiz.queiroz").email,
      email_confirm: true,
      user_metadata: { display_name: "Operador", username: "luiz.queiroz" },
    });
    assert.equal(Object.hasOwn(patch, "password"), false);
    assert.equal(Object.hasOwn(patch, "id"), false);
    conflict = true;
    await assert.rejects(
      assignUsername(admin, userId, "Outro.Usuario"),
      /nome já está em uso/,
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
