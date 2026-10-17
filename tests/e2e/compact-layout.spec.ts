import { test, expect } from "@playwright/test";
import { openModule } from "./navigation-helper";
test("Padrão compacto: ações, contexto e filtros proporcionais sem perder toque no celular", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar a prévia", exact: true })
    .click();
  await openModule(page, "Processos e tarefas");
  const create = page.getByRole("button", {
    name: "Novo registro",
    exact: true,
  });
  for (const width of [1440, 1920, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const company = page.getByRole("combobox", {
        name: "Empresa em contexto",
        exact: true,
      }),
      context = page.locator(".workspace-context");
    const companyBox = (await company.boundingBox())!,
      ctx = (await context.boundingBox())!,
      action = (await create.boundingBox())!;
    if (width >= 1024) {
      expect(companyBox.width).toBeLessThanOrEqual(440);
      expect(ctx.width).toBeLessThan(800);
      expect(action.height).toBe(36);
      const search = (await page
          .getByRole("textbox", { name: "Buscar registros", exact: true })
          .boundingBox())!,
        status = (await page
          .getByRole("combobox", { name: "Filtrar situação", exact: true })
          .boundingBox())!;
      expect(status.x - search.x - search.width).toBeLessThanOrEqual(12);
    }
    if (width < 768) expect(action.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`tarefas-${width}.png`),
      fullPage: true,
    });
  }
});
