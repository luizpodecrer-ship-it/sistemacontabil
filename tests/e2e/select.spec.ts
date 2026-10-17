import { test, expect } from "@playwright/test";
test("Seleção padrão: teclado, busca por código, foco, cancelamento e limites da tela", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar a prévia", exact: true })
    .click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page.getByRole("button", { name: "Nova empresa", exact: true }).click();
  const type = page.getByRole("combobox", {
    name: "Tipo de cliente",
    exact: true,
  });
  await type.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(type).toHaveAttribute("value", "Pessoa física");
  await expect(type).toBeFocused();
  const uf = page.getByRole("combobox", { name: "UF", exact: true });
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await uf.click();
    const search = page.getByRole("combobox", {
      name: "Buscar UF",
      exact: true,
    });
    await expect(search).toBeFocused();
    await search.fill("zzzz");
    await expect(
      page.getByText("Nenhuma opção encontrada.", { exact: true }),
    ).toBeVisible();
    await search.fill("mt");
    await expect(page.getByRole("option")).toHaveCount(1);
    await expect(
      page.getByRole("option", { name: "MT", exact: true }),
    ).toBeVisible();
    const list = page.locator(".system-select-popup");
    const bounds = await list.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(850);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`seletor-${width}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Enter");
    await expect(uf).toHaveAttribute("value", "MT");
    await expect(uf).toBeFocused();
  }
  await uf.click();
  await page.keyboard.press("Escape");
  await expect(uf).toBeFocused();
  await expect(uf).toHaveAttribute("value", "MT");
  await uf.click();
  await page
    .getByRole("heading", { name: "Nova empresa", exact: true })
    .click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await uf.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("listbox")).toHaveCount(0);
  await expect(uf).not.toBeFocused();
});
test("Seletores em janela CBO: busca sem acentos e Escape fecha somente a lista", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar a prévia", exact: true })
    .click();
  await page.getByRole("button", { name: "Cargos", exact: true }).click();
  await page.getByRole("button", { name: "Novo cargo", exact: true }).click();
  await page
    .getByRole("button", { name: "Consultar base CBO", exact: true })
    .click();
  const group = page.getByRole("combobox", {
    name: "Grande grupo CBO",
    exact: true,
  });
  await group.click();
  const search = page.getByRole("combobox", {
    name: "Buscar Grande grupo CBO",
    exact: true,
  });
  await search.fill("producao");
  await expect(page.getByRole("option").first()).toContainText(/produção/i);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(group).toBeFocused();
  await group.click();
  await page.getByRole("option").filter({ hasText: "7" }).first().click();
  await expect(group).toHaveAttribute("value", "7");
  await expect(page.getByRole("dialog")).toBeVisible();
});
