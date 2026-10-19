import { test, expect, type Page, type Route } from "@playwright/test";
import {
  defaultOffice,
  defaultPlatform,
} from "../../src/features/branding/model";
import { usernameIdentity } from "../../src/backend/username";

const userId = "11111111-1111-4111-8111-111111111111";
const account = usernameIdentity("tester.nexopen");
function sessionFixture() {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: userId,
    email: account.email,
    aud: "authenticated",
    role: "authenticated",
    created_at: new Date().toISOString(),
    user_metadata: { username: account.username },
    app_metadata: { provider: "email" },
  };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, exp: now + 3600, iat: now, aud: "authenticated", role: "authenticated" })}.test-signature`,
    refresh_token: "test-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user,
  };
}
async function json(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    headers: {
      "x-supabase-api-version": "2024-01-01",
      "access-control-expose-headers": "X-Supabase-Api-Version",
    },
    body: JSON.stringify(data),
  });
}
async function workspaceResponse(route: Route) {
  const path = new URL(route.request().url()).pathname;
  if (path.endsWith("get_platform_brand"))
    return json(route, { revision: 0, branding: defaultPlatform });
  if (path.endsWith("get_workspace_brand"))
    return json(route, { revision: 0, branding: defaultOffice });
  if (path.endsWith("is_platform_admin")) return json(route, false);
  if (path.endsWith("ensure_own_workspace")) return json(route, userId);
  if (path.endsWith("/auth/v1/user")) return json(route, sessionFixture().user);
  return json(route, []);
}
async function credentials(page: Page) {
  await page
    .getByLabel("Nome de usuário", { exact: true })
    .fill("  TESTER.NEXOPEN  ");
  await page.getByLabel("Senha", { exact: true }).fill("Test-password-123");
}

test("Usuário e senha entram no Dashboard, preservam sessão e saem com autenticação real do SDK", async ({
  page,
}) => {
  let loginRequests = 0;
  await page.route("https://nexopen-auth-test.supabase.co/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/v1/token")) {
      loginRequests++;
      expect(route.request().postDataJSON()).toMatchObject({
        email: account.email,
        password: "Test-password-123",
      });
      return json(route, sessionFixture());
    }
    if (path.endsWith("/auth/v1/logout")) return route.fulfill({ status: 204 });
    return workspaceResponse(route);
  });
  await page.goto("/");
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveCount(0);
  await credentials(page);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  expect(loginRequests).toBe(1);
  await page
    .getByRole("button", { name: "Sair do sistema", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome de usuário", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeEnabled();
});

test("Acesso distingue usuário ou senha inválidos, conta pendente e chave incorreta sem expor mensagens internas", async ({
  page,
}) => {
  let failure = {
    code: "invalid_credentials",
    message: "Invalid login credentials",
  };
  await page.route("https://nexopen-auth-test.supabase.co/**", (route) => {
    if (route.request().url().includes("/auth/v1/token"))
      return json(route, failure, 400);
    return workspaceResponse(route);
  });
  await page.goto("/");
  await credentials(page);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Nome de usuário ou senha inválidos",
  );
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeEnabled();
  failure = { code: "email_not_confirmed", message: "Email not confirmed" };
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "conta ainda não foi liberada",
  );
  failure = { code: "", message: "Invalid API key" };
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "serviço de acesso não está configurado corretamente",
  );
});

test("Cadastro identifica chave recusada e URL incorreta sem tentar criar uma conta", async ({
  page,
}) => {
  let status = 401;
  let signups = 0;
  await page.route("https://nexopen-auth-test.supabase.co/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/v1/settings")) {
      expect(new URL(route.request().url()).pathname).toBe("/auth/v1/settings");
      expect(route.request().headers().apikey).toBe("sb_publishable_test_only");
      return json(route, { message: "Internal diagnostic" }, status);
    }
    if (path.endsWith("/auth/v1/signup")) signups++;
    return workspaceResponse(route);
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await credentials(page);
  const create = page
    .locator("form")
    .getByRole("button", { name: "Criar conta", exact: true });
  await create.click();
  await expect(page.getByRole("status")).toContainText(
    "conferir a chave pública",
  );
  await expect(create).toBeEnabled();
  status = 404;
  await create.click();
  await expect(page.getByRole("status")).toContainText("conferir a URL");
  expect(signups).toBe(0);
});

test("Cadastro sem e-mail só cria conta com liberação imediata configurada e entra no escritório", async ({
  page,
}) => {
  let ready = false,
    disabled = false,
    failure = "weak_password",
    requests = 0;
  await page.route("https://nexopen-auth-test.supabase.co/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/v1/settings"))
      return json(route, {
        mailer_autoconfirm: ready,
        disable_signup: disabled,
        external: { email: true },
      });
    if (path.endsWith("/auth/v1/signup")) {
      requests++;
      expect(route.request().postDataJSON()).toMatchObject({
        email: account.email,
        data: { username: account.username },
      });
      return failure
        ? json(
            route,
            {
              code: failure,
              message: "Internal diagnostic must not be rendered",
            },
            422,
          )
        : json(route, sessionFixture());
    }
    return workspaceResponse(route);
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveCount(0);
  await credentials(page);
  await page.getByLabel("Senha", { exact: true }).fill("short");
  const create = page
    .locator("form")
    .getByRole("button", { name: "Criar conta", exact: true });
  await create.click();
  await expect(page.getByRole("status")).toContainText(
    "pelo menos 12 caracteres",
  );
  expect(requests).toBe(0);
  await page.getByLabel("Senha", { exact: true }).fill("Test-password-123");
  await create.click();
  await expect(page.getByRole("status")).toContainText(
    "cadastro por nome de usuário ainda não está habilitado",
  );
  expect(requests).toBe(0);
  ready = true;
  disabled = true;
  await create.click();
  await expect(page.getByRole("status")).toContainText(
    "criação de contas está desativada",
  );
  expect(requests).toBe(0);
  disabled = false;
  await create.click();
  await expect(page.getByRole("status")).toContainText(
    "senha não atende aos requisitos",
  );
  failure = "";
  await create.click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  expect(requests).toBe(2);
});

test("Ajuda de acesso não solicita e-mail nem envia recuperação automática", async ({
  page,
}) => {
  let authRequests = 0;
  await page.route("https://nexopen-auth-test.supabase.co/**", (route) => {
    if (new URL(route.request().url()).pathname.startsWith("/auth/"))
      authRequests++;
    return workspaceResponse(route);
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Preciso de ajuda para entrar", exact: true })
    .click();
  await expect(
    page.getByText("Solicite ao administrador a redefinição da sua senha.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(page.locator("form")).toHaveCount(0);
  expect(authRequests).toBe(0);
  await page
    .getByRole("button", { name: "Voltar ao login", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome de usuário", { exact: true }),
  ).toBeVisible();
});

test("Entrada em nuvem mantém textos padrão na falha e recupera a identidade sem recarregar", async ({
  page,
}) => {
  let available = false;
  await page.route(
    "https://nexopen-auth-test.supabase.co/**",
    async (route) => {
      await route.fulfill({
        status: available ? 200 : 503,
        contentType: "application/json",
        body: JSON.stringify(
          available
            ? {
                revision: 1,
                branding: {
                  ...defaultPlatform,
                  name: "Nexopen",
                  loginTitle: "Olá! Seja bem-vindo!",
                  loginHeadline: "Plataforma Contábil\nde Alta Performance",
                },
              }
            : { message: "Temporarily unavailable" },
        ),
      });
    },
  );
  await page.goto("/");
  await expect(
    page.getByText("Exibindo a apresentação padrão.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator("h1")).toHaveText(defaultPlatform.loginTitle);
  await expect(page.locator("h2")).toHaveText(defaultPlatform.loginHeadline);
  await expect(page.locator('[data-login-text="loginDescription"]')).toHaveText(
    defaultPlatform.loginDescription,
  );
  await expect(page.locator('[data-login-text="loginFooter"]')).toHaveText(
    defaultPlatform.loginFooter,
  );
  available = true;
  await page
    .getByRole("button", { name: "Tentar carregar personalização novamente" })
    .click();
  await expect(page.locator("h1")).toHaveText("Olá! Seja bem-vindo!");
  await expect(page.locator("h2")).toHaveText(
    "Plataforma Contábil\nde Alta Performance",
  );
  await expect(
    page.getByRole("button", {
      name: "Tentar carregar personalização novamente",
    }),
  ).toHaveCount(0);
});

test("Identidade pública da nuvem prevalece sobre a local e mantém textos ao alternar o acesso", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "nexo-platform-brand",
      JSON.stringify({ loginTitle: "Somente no navegador antigo" }),
    ),
  );
  const brand = {
    ...defaultPlatform,
    name: "Nexopen",
    loginTitle: "Entrada personalizada",
    loginButton: "Acessar",
    loginHeadline: "Tudo em sintonia",
    loginFormFooter: "Identidade em nuvem",
  };
  await page.route("https://nexopen-auth-test.supabase.co/**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ revision: 1, branding: brand }),
    }),
  );
  await page.goto("/");
  await expect(page.locator("h1")).toHaveText(brand.loginTitle);
  await expect(
    page.getByRole("button", { name: "Acessar", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("Crie seu escritório");
  await expect(page.locator("h2")).toHaveText(brand.loginHeadline);
  await page
    .getByRole("button", { name: "Voltar ao acesso", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText(brand.loginTitle);
  await page
    .getByRole("button", { name: "Preciso de ajuda para entrar", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText("Recuperar acesso");
  await page
    .getByRole("button", { name: "Voltar ao login", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText(brand.loginTitle);
  await expect(page.locator('[data-login-text="loginFormFooter"]')).toHaveText(
    brand.loginFormFooter,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
