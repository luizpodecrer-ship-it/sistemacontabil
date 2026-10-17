import { test, expect, type Page } from "@playwright/test";
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
test("Escritório: prévia ampliada, formatos máximos, branco e proporção persistente", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Personalização", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu escritório, sua identidade." }),
  ).toBeVisible();
  await page
    .getByLabel("Enviar logo", { exact: true })
    .setInputFiles(await imageFile(page, 501, 500));
  await expect(page.getByRole("alert")).toContainText("500 × 500");
  await page.getByLabel("Formato do logo").selectOption("horizontal");
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
  await page
    .getByRole("button", { name: "Personalização", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome do escritório", { exact: true }),
  ).toHaveValue("Escritório de teste");
  await expect(page.getByLabel("Formato do logo")).toHaveValue("horizontal");
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
  await page
    .getByRole("button", { name: "Identidade do sistema", exact: true })
    .click();
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
  await page
    .getByRole("button", { name: "Personalização", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome do escritório", { exact: true }),
  ).toHaveValue("Queiroz Contabilidade");
  await page.getByRole("button", { name: /Luiz Queiroz/ }).click();
  await expect(page.locator("[data-platform-logo] img")).toBeVisible();
  await page.reload();
  await expect(page).toHaveTitle("Plataforma Teste — Gestão contábil");
});
