import { openModule } from "./navigation-helper";
import { selectOption } from "./select-helper";
import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function enter(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
}
async function imageFile(page: Page, width: number, height: number) {
  const data = await page.evaluate(
    ({ width, height }) => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#164e63";
      ctx.fillRect(0, 0, width, height);
      return canvas.toDataURL("image/png").split(",")[1];
    },
    { width, height },
  );
  return {
    name: "logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(data, "base64"),
  };
}
test("Identidade pode ser transferida com textos e logos, conferida na prévia e salva", async ({
  page,
}) => {
  await enter(page);
  await openModule(page, "Identidade do sistema");
  await page
    .getByLabel("Nome do sistema", { exact: true })
    .fill("Nexopen Transferido");
  await page
    .getByLabel("Título do formulário", { exact: true })
    .fill("Olá! Seja bem-vindo!");
  await page
    .getByLabel("Título do painel lateral", { exact: true })
    .fill("Plataforma Contábil\nde Alta Performance");
  await page
    .getByLabel("Enviar ícone do lado esquerdo", { exact: true })
    .setInputFiles(await imageFile(page, 96, 96));
  await page
    .getByLabel("Enviar logo do lado direito", { exact: true })
    .setInputFiles(await imageFile(page, 400, 200));
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar identidade", exact: true })
    .click();
  const download = await downloadPromise;
  const contents = await readFile((await download.path())!, "utf8");
  const exported = JSON.parse(contents);
  expect(exported.scope).toBe("platform");
  expect(exported.branding.loginIcon).toMatch(/^data:image\/png;base64,/);
  expect(exported.branding.loginLogo).toMatch(/^data:image\/png;base64,/);
  expect(
    await page.evaluate(() => localStorage.getItem("nexo-platform-brand")),
  ).toBeNull();
  await page
    .getByLabel("Título do formulário", { exact: true })
    .fill("Outro texto");
  await page
    .getByLabel("Importar identidade", { exact: true })
    .setInputFiles({
      name: "identidade.json",
      mimeType: "application/json",
      buffer: Buffer.from(contents),
    });
  await expect(page.getByRole("alert")).toContainText("carregada na prévia");
  await expect(
    page.getByLabel("Título do formulário", { exact: true }),
  ).toHaveValue(exported.branding.loginTitle);
  expect(
    await page.evaluate(() => localStorage.getItem("nexo-platform-brand")),
  ).toBeNull();
  await page
    .getByLabel("Importar identidade", { exact: true })
    .setInputFiles({
      name: "arquivo-errado.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify({ ...exported, scope: "office" })),
    });
  await expect(page.getByRole("alert")).toContainText("outro tipo");
  await expect(
    page.getByLabel("Título do formulário", { exact: true }),
  ).toHaveValue(exported.branding.loginTitle);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", {
      name: "Salvar identidade do sistema local",
      exact: true,
    })
    .click();
  await expect(page).toHaveTitle("Nexopen Transferido — Gestão contábil");
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await page
    .getByRole("button", { name: "Sair do sistema", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator("h1")).toHaveText(exported.branding.loginTitle);
  await expect(page.locator("h2")).toHaveText(exported.branding.loginHeadline);
  await expect(page.locator('[data-login-side="left"] img')).toHaveAttribute(
    "src",
    exported.branding.loginIcon,
  );
  await expect(page.locator('[data-login-side="right"] img')).toHaveAttribute(
    "src",
    exported.branding.loginLogo,
  );
  await page.reload();
  await expect(page.locator("h2")).toHaveText(exported.branding.loginHeadline);
});
test("Escritório: prévia ampliada, formatos máximos, branco e proporção persistente", async ({
  page,
}) => {
  await enter(page);
  await openModule(page, "Personalização do escritório");
  await expect(
    page.getByRole("heading", { name: "Seu escritório, sua identidade." }),
  ).toBeVisible();
  await page
    .getByLabel("Enviar logo", { exact: true })
    .setInputFiles(await imageFile(page, 501, 500));
  await expect(page.getByRole("alert")).toContainText("500 × 500");
  await selectOption(page.getByLabel("Formato do logo"), "horizontal");
  await page
    .getByLabel("Enviar logo", { exact: true })
    .setInputFiles(await imageFile(page, 500, 251));
  await expect(page.getByRole("alert")).toContainText("500 × 250");
  await page
    .getByLabel("Enviar logo", { exact: true })
    .setInputFiles(await imageFile(page, 500, 250));
  await expect(
    page.getByRole("img", { name: "Logo do escritório", exact: true }),
  ).toBeVisible();
  const source = page.getByRole("img", {
    name: "Logo do escritório",
    exact: true,
  });
  expect(
    await source.evaluate((el: HTMLImageElement) => [
      el.naturalWidth,
      el.naturalHeight,
    ]),
  ).toEqual([500, 250]);
  await page.getByRole("button", { name: "Cor Branco", exact: true }).click();
  await expect(page.getByTestId("brand-preview-header")).toHaveCSS(
    "background-color",
    "rgb(255, 255, 255)",
  );
  await expect(page.getByTestId("brand-preview-header")).toHaveCSS(
    "color",
    "rgb(23, 23, 23)",
  );
  await page
    .getByLabel("Nome do escritório", { exact: true })
    .fill("Escritório de teste");
  await page
    .getByRole("button", { name: "Salvar personalização local", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Identidade visual salva",
  );
  await page.reload();
  await enter(page);
  await openModule(page, "Personalização do escritório");
  await expect(
    page.getByLabel("Nome do escritório", { exact: true }),
  ).toHaveValue("Escritório de teste");
  await expect(page.getByLabel("Formato do logo")).toHaveAttribute(
    "value",
    "horizontal",
  );
  await expect(
    page.getByRole("button", { name: "Cor Branco", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("Administração separa marca da plataforma, aplica logo, ícone e favicon e mantém escritório", async ({
  page,
}) => {
  await enter(page);
  await openModule(page, "Identidade do sistema");
  await expect(
    page.getByText(/Demonstração local da administração/),
  ).toBeVisible();
  await page
    .getByLabel("Nome do sistema", { exact: true })
    .fill("Plataforma Teste");
  await page
    .getByLabel("Enviar logo", { exact: true })
    .setInputFiles(await imageFile(page, 500, 250));
  await page
    .getByLabel("Enviar ícone", { exact: true })
    .setInputFiles(await imageFile(page, 120, 60));
  await expect(page.getByRole("alert")).toContainText("quadrado");
  await page
    .getByLabel("Enviar ícone", { exact: true })
    .setInputFiles(await imageFile(page, 120, 120));
  await page
    .getByRole("button", {
      name: "Salvar identidade do sistema local",
      exact: true,
    })
    .click();
  await expect(page).toHaveTitle("Plataforma Teste — Gestão contábil");
  await expect(
    page.locator(".brand-row [data-platform-logo] img"),
  ).toBeVisible();
  expect(await page.locator('link[rel="icon"]').getAttribute("href")).toMatch(
    /^data:image\/png;base64,/,
  );
  await page
    .getByRole("button", { name: "Recolher menu", exact: true })
    .click();
  await expect(
    page.locator(".brand-row [data-platform-icon] img"),
  ).toBeVisible();
  await expect(
    page.locator(".brand-row [data-platform-logo]"),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Expandir menu", exact: true })
    .click();
  await openModule(page, "Personalização do escritório");
  await expect(
    page.getByLabel("Nome do escritório", { exact: true }),
  ).toHaveValue("Queiroz Contabilidade");
  await page
    .getByRole("button", { name: "Sair do sistema", exact: true })
    .click();
  await expect(page.locator("[data-login-logo] img").first()).toBeVisible();
  await page.reload();
  await expect(page).toHaveTitle("Plataforma Teste — Gestão contábil");
});

test("Login personalizado e ícone transparente têm fundo correto; links de demonstração removidos", async ({
  page,
}) => {
  await enter(page);
  await openModule(page, "Identidade do sistema");
  const blackIcon = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 120;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#000000";
    ctx.fillRect(20, 20, 80, 80);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Enviar ícone", { exact: true }).setInputFiles({
    name: "icon.png",
    mimeType: "image/png",
    buffer: Buffer.from(blackIcon, "base64"),
  });
  await page
    .getByLabel("Enviar logo do lado direito", { exact: true })
    .setInputFiles(await imageFile(page, 400, 200));
  await page
    .getByLabel("Enviar ícone do lado esquerdo", { exact: true })
    .setInputFiles(await imageFile(page, 120, 80));
  await expect(page.getByRole("alert")).toContainText("quadrado");
  await page
    .getByLabel("Enviar ícone do lado esquerdo", { exact: true })
    .setInputFiles(await imageFile(page, 96, 96));
  await page
    .getByRole("button", { name: "Aumentar ícone esquerdo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Diminuir logo direito", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Alinhamento do ícone esquerdo", exact: true })
    .getByRole("button", { name: "Direita", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Alinhamento do logo direito", exact: true })
    .getByRole("button", { name: "Esquerda", exact: true })
    .click();
  await page
    .getByLabel("Fundo do ícone esquerdo", { exact: true })
    .fill("#eeeeee");
  await page
    .getByLabel("Cor do painel lateral", { exact: true })
    .fill("#164e63");
  await page
    .getByLabel("Título do formulário", { exact: true })
    .fill("Seu escritório conectado");
  await page
    .getByLabel("Subtítulo do formulário", { exact: true })
    .fill("Bem-vindo ao seu ambiente.");
  await page
    .getByLabel("Texto do botão de entrada", { exact: true })
    .fill("Entrar no ambiente");
  await page
    .getByLabel("Título do painel lateral", { exact: true })
    .fill("Mais organização.\nMais resultados.");
  await page
    .getByLabel("Descrição do painel lateral", { exact: true })
    .fill("Sua rotina em um só lugar.");
  await page
    .getByLabel("Texto do rodapé do painel", { exact: true })
    .fill("Uma marca do seu escritório.");
  await expect(
    page.getByRole("region", { name: "Prévia da área de login" }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Salvar identidade do sistema local",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Recolher menu", exact: true })
    .click();
  const icon = page.locator(".brand-row [data-platform-icon]");
  await expect(icon).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(icon).toHaveCSS("padding", "4px");
  await expect(icon.locator("img")).toHaveCSS("object-fit", "contain");
  await page
    .getByRole("button", { name: "Expandir menu", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Sair do sistema", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seu escritório conectado",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Entrar no ambiente", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('[data-login-panel] [data-login-text="loginHeadline"]'),
  ).toHaveText("Mais organização.\nMais resultados.");
  const loginLogo = page.locator('[data-login-logo][data-login-side="right"]');
  await expect(loginLogo).toHaveCSS("background-color", "rgb(255, 255, 255)");
  expect(
    await loginLogo
      .locator("img")
      .evaluate((image: HTMLImageElement) => [
        image.naturalWidth,
        image.naturalHeight,
      ]),
  ).toEqual([400, 200]);
  await expect(loginLogo.locator("img")).toHaveCSS("object-fit", "contain");
  const leftIcon = page.locator('[data-login-side="left"]');
  await expect(leftIcon).toHaveCSS("width", "72px");
  await expect(leftIcon).toHaveCSS("height", "72px");
  await expect(leftIcon).toHaveCSS("background-color", "rgb(238, 238, 238)");
  await expect(loginLogo).toHaveCSS("width", "232px");
  await expect(loginLogo).toHaveCSS("height", "116px");
  await expect(page.locator("[data-login-panel]")).toHaveCSS(
    "background-color",
    "rgb(22, 78, 99)",
  );
  expect(
    await leftIcon
      .locator("img")
      .evaluate((image: HTMLImageElement) => [
        image.naturalWidth,
        image.naturalHeight,
      ]),
  ).toEqual([96, 96]);
  expect(
    await leftIcon.evaluate((el) =>
      parseFloat(getComputedStyle(el).marginLeft),
    ),
  ).toBeGreaterThan(0);
  await expect(loginLogo).toHaveCSS("margin-left", "0px");
  await expect(
    page.getByRole("link", { name: /Ver Dot Pattern|Ver Dock/ }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Seu escritório conectado",
      exact: true,
    }),
  ).toBeVisible();
  await expect(leftIcon).toHaveCSS("width", "72px");
  await expect(loginLogo).toHaveCSS("width", "232px");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("[data-login-panel]")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("Logo do menu: tamanho ajustável, prévia, persistência e ícone independente", async ({
  page,
}) => {
  await enter(page);
  await openModule(page, "Identidade do sistema");
  await page
    .getByLabel("Enviar logo", { exact: true })
    .setInputFiles(await imageFile(page, 300, 150));
  const size = page.getByLabel("Tamanho do logo no menu", { exact: true });
  await expect(size).toHaveValue("64");
  await page
    .getByRole("button", { name: "Aumentar logo do menu", exact: true })
    .click();
  await expect(size).toHaveValue("68");
  await page
    .getByRole("button", { name: "Diminuir logo do menu", exact: true })
    .click();
  await expect(size).toHaveValue("64");
  await size.fill("96");
  await expect(
    page.getByAltText("Logo do menu na prévia", { exact: true }),
  ).toHaveCSS("height", "96px");
  await page
    .getByRole("button", {
      name: "Salvar identidade do sistema local",
      exact: true,
    })
    .click();
  const logo = page.locator(".rail [data-platform-logo]");
  await expect(logo).toHaveCSS("height", "96px");
  await expect(logo.locator("img")).toHaveCSS("object-fit", "contain");
  await page
    .getByRole("button", { name: "Recolher menu", exact: true })
    .click();
  await expect(logo).toBeHidden();
  await expect(page.locator(".rail [data-platform-icon]")).toHaveCSS(
    "height",
    "40px",
  );
  await page
    .getByRole("button", { name: "Expandir menu", exact: true })
    .click();
  await expect(logo).toHaveCSS("height", "96px");
  await page.reload();
  await enter(page);
  await expect(page.locator(".rail [data-platform-logo]")).toHaveCSS(
    "height",
    "96px",
  );
  await openModule(page, "Identidade do sistema");
  await expect(size).toHaveValue("96");
  await size.fill("112");
  await expect(
    page.getByRole("button", { name: "Aumentar logo do menu", exact: true }),
  ).toBeDisabled();
  await size.fill("32");
  await expect(
    page.getByRole("button", { name: "Diminuir logo do menu", exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await expect(page.locator(".rail [data-platform-logo]")).toHaveCSS(
    "height",
    "96px",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
