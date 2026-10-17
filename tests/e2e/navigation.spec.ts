import { test, expect } from "@playwright/test";
import { openModule } from "./navigation-helper";
async function enter(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar a prévia", exact: true })
    .click();
}
test("Menu organizado: grupos exclusivos, página ativa, ícones e preservação do formulário", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await enter(page);
  const nav = page.getByRole("navigation", { name: "Navegação principal" });
  await expect(nav.locator(".direct-navigation [data-page]")).toHaveCount(4);
  await expect(nav.locator("[data-group]")).toHaveCount(8);
  await expect(nav.locator('[data-group][aria-expanded="true"]')).toHaveCount(
    0,
  );
  await nav.getByRole("button", { name: "Operação", exact: true }).click();
  await expect(
    nav.getByRole("button", { name: "Processos e tarefas", exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Financeiro", exact: true }).click();
  await expect(
    nav.getByRole("button", { name: "Processos e tarefas", exact: true }),
  ).toBeHidden();
  await expect(nav.locator('[data-group][aria-expanded="true"]')).toHaveCount(
    1,
  );
  await openModule(page, "Plano de contas");
  await expect(
    nav.getByRole("button", { name: "Contábil e fiscal", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    nav.getByRole("button", { name: "Plano de contas", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("button", { name: "Recolher menu", exact: true })
    .click();
  await expect(page.locator(".rail")).toHaveClass(/collapsed/);
  await expect(
    nav.getByRole("button", { name: "Cargos", exact: true }),
  ).toHaveAttribute("title", "Cargos");
  await nav
    .getByRole("button", { name: "Pessoal e folha", exact: true })
    .click();
  await expect(page.locator(".rail")).not.toHaveClass(/collapsed/);
  await expect(
    nav.getByRole("button", { name: "Pessoal e vínculos", exact: true }),
  ).toBeFocused();
  await openModule(page, "Empresas");
  await page.getByRole("button", { name: "Nova empresa", exact: true }).click();
  await page
    .getByLabel("Razão social", { exact: true })
    .fill("Cadastro preservado");
  await page.keyboard.press("Control+b");
  await expect(page.locator(".rail")).not.toHaveClass(/collapsed/);
  await page
    .getByRole("button", { name: "Recolher menu", exact: true })
    .focus();
  await page.keyboard.press("Control+b");
  await expect(page.locator(".rail")).toHaveClass(/collapsed/);
  await page.keyboard.press("Control+b");
  await expect(page.getByLabel("Razão social", { exact: true })).toHaveValue(
    "Cadastro preservado",
  );
  await page.screenshot({ path: info.outputPath("menu-desktop.png") });
});
test("Menu mobile: foco contido, Escape, fechamento ao navegar e adaptação ao tablet", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enter(page);
  const trigger = page.getByRole("button", { name: "Abrir menu", exact: true });
  await trigger.click();
  const drawer = page.getByRole("dialog", { name: "Menu do Nexopen" });
  await expect(drawer).toBeVisible();
  await expect(
    drawer.getByRole("button", { name: "Fechar menu", exact: true }),
  ).toBeFocused();
  await expect(page.locator("#main-shell")).toHaveAttribute("inert", "");
  await page.keyboard.press("Shift+Tab");
  await expect(
    drawer.getByRole("button", { name: "Sair do sistema", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    drawer.getByRole("button", { name: "Fechar menu", exact: true }),
  ).toBeFocused();
  await drawer.getByRole("button", { name: "Operação", exact: true }).click();
  await page.screenshot({ path: info.outputPath("menu-mobile.png") });
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(drawer).toHaveCount(0);
  await trigger.click();
  await openModule(page, "Agenda de obrigações");
  await expect(page.locator(".rail")).toBeHidden();
  await expect(page.locator("#main-shell")).not.toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Operação", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.locator(".rail")).toBeVisible();
  await expect(page.locator("#nav-backdrop")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("menu-tablet.png") });
});
