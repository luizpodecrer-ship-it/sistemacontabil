import { expect, type Locator } from "@playwright/test";
export async function selectOption(
  control: Locator,
  value: string | { label: string },
) {
  await control.click();
  const list = control.page().getByRole("listbox");
  const option =
    typeof value === "string"
      ? list
          .locator('[role="option"]')
          .and(list.locator(`[data-value=${JSON.stringify(value)}]`))
      : list.getByRole("option", { name: value.label, exact: true });
  await expect(option).toBeEnabled();
  const label = (await option.innerText()).trim();
  await option.click();
  await expect(control).toContainText(label);
  await expect(control).toHaveAttribute("aria-expanded", "false");
}
