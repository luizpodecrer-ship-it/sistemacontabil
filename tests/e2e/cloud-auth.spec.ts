import { test, expect } from "@playwright/test";
import { defaultPlatform } from "../../src/features/branding/model";

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
    .getByRole("button", { name: "Já tenho conta", exact: true })
    .click();
  await expect(page.locator("h1")).toHaveText(brand.loginTitle);
  await page
    .getByRole("button", { name: "Esqueci minha senha", exact: true })
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
