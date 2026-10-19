import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createOwnerProvider } from "../server/cloud-owner.mjs";
import { testSecret, testAccess, workspace } from "./support/direct-cloud.mjs";

test("SDK Supabase: criação automática sem confirmação, sessão de proprietário e rotação preservando dados", async (t) => {
  let identity = false,
    password = "",
    creates = 0,
    updates = 0,
    tokenRequests = 0;
  const calls: { path: string; auth?: string }[] = [];
  const user = {
    id: workspace,
    email: "nexopen-cloud-test@users.nexopen.invalid",
    aud: "authenticated",
    role: "authenticated",
    created_at: new Date().toISOString(),
    app_metadata: { nexopen_cloud_test: true },
    user_metadata: {},
  };
  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = JSON.parse(Buffer.concat(chunks).toString() || "{}");
    const url = new URL(req.url!, "http://localhost");
    calls.push({ path: url.pathname, auth: req.headers.authorization });
    res.setHeader("Content-Type", "application/json");
    if (url.pathname.endsWith("/rpc/get_cloud_test_owner"))
      return res.end(
        JSON.stringify(
          identity ? { user_id: workspace, email: user.email } : null,
        ),
      );
    if (url.pathname === "/auth/v1/admin/users" && req.method === "POST") {
      creates++;
      assert.equal(body.email_confirm, true);
      assert.equal(body.app_metadata.nexopen_cloud_test, true);
      password = body.password;
      identity = true;
      return res.end(JSON.stringify(user));
    }
    if (
      url.pathname === `/auth/v1/admin/users/${workspace}` &&
      req.method === "PUT"
    ) {
      updates++;
      password = body.password;
      return res.end(JSON.stringify(user));
    }
    if (url.pathname.endsWith("/rpc/prepare_cloud_test_owner")) {
      assert.equal(body.test_owner, workspace);
      return res.end(JSON.stringify(workspace));
    }
    if (url.pathname === "/auth/v1/token") {
      tokenRequests++;
      if (body.password !== password) {
        res.statusCode = 400;
        return res.end(
          JSON.stringify({
            error_code: "invalid_credentials",
            msg: "Invalid login credentials",
          }),
        );
      }
      const encode = (data: unknown) =>
        Buffer.from(JSON.stringify(data)).toString("base64url");
      const token =
        encode({ alg: "HS256", typ: "JWT" }) +
        "." +
        encode({
          sub: workspace,
          role: "authenticated",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }) +
        ".signature";
      return res.end(
        JSON.stringify({
          access_token: token,
          refresh_token: "server-only-refresh",
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
    }
    if (url.pathname.endsWith("/rpc/ensure_own_workspace"))
      return res.end(JSON.stringify(workspace));
    res.statusCode = 404;
    res.end("{}");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const config = {
    url: `http://127.0.0.1:${(server.address() as any).port}`,
    secret: testSecret,
    accessKey: testAccess,
  };
  const getOwner = createOwnerProvider(config);
  const [first, second] = await Promise.all([getOwner(), getOwner()]);
  assert.equal(first, second);
  assert.equal(creates, 1);
  assert.equal(tokenRequests, 1);
  assert.equal((await first.owner.rpc("ensure_own_workspace")).data, workspace);
  assert.equal(calls.at(-1)!.auth, `Bearer ${first.token}`);
  assert.notEqual(calls.at(-1)!.auth, `Bearer ${testSecret}`);
  const cold = await createOwnerProvider(config)();
  assert.equal(cold.workspace, first.workspace);
  assert.equal(creates, 1);
  assert.equal(updates, 0);
  const rotated = await createOwnerProvider({
    ...config,
    accessKey: "rotated_test_link_012345678901234567890",
  })();
  assert.equal(rotated.workspace, first.workspace);
  assert.equal(creates, 1);
  assert.equal(updates, 1);
});
