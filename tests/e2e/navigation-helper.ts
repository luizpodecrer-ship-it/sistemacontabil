import { expect, type Page } from "@playwright/test";
export async function openModule(page: Page, name: string) {
  const button = page
    .locator("[data-page]")
    .filter({ hasText: name })
    .and(page.getByRole("button", { name, exact: true, includeHidden: true }));
  if (!(await button.isVisible())) {
    const mobile = page.getByRole("button", {
      name: "Abrir menu",
      exact: true,
    });
    if (
      (await mobile.isVisible()) &&
      (await mobile.getAttribute("aria-expanded")) !== "true"
    )
      await mobile.click();
    const section = button.locator("xpath=ancestor::section[@data-nav-group]");
    if (await section.count()) {
      const group = section.locator("button[data-group]");
      if (
        (await group.getAttribute("aria-expanded")) !== "true" ||
        !(await button.isVisible())
      )
        await group.click();
    }
  }
  await expect(button).toBeVisible();
  await button.click();
}
