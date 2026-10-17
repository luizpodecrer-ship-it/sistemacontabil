import { test, expect, type Page } from "@playwright/test";
async function createCompany(page: Page, name: string, cnpj: string) {
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page.getByRole("button", { name: "Nova empresa", exact: true }).click();
  await page.getByLabel("CNPJ", { exact: true }).fill(cnpj);
  await page.getByLabel("Razão social", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "Salvar rascunho", exact: true })
    .click();
  await expect(
    page.getByText("Rascunho salvo neste navegador.", { exact: true }),
  ).toBeVisible();
}
async function openJobs(page: Page, company: string) {
  await page.getByRole("button", { name: "Visão geral", exact: true }).click();
  await page
    .getByLabel("Empresa em contexto", { exact: true })
    .selectOption({ label: company });
  await page.getByRole("tab", { name: "Cargos", exact: true }).click();
}
test("Cargos por empresa: catálogo CBO, validação, salários, requisitos, edição e persistência", async ({
  page,
}) => {
  await page.route("https://brasilapi.com.br/**", (r) =>
    r.fulfill({ status: 503, json: { message: "teste" } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar a prévia", exact: true })
    .click();
  await page.getByRole("tab", { name: "Cargos", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Novo cargo", exact: true }),
  ).toBeDisabled();
  await createCompany(page, "Empresa Cargos A", "11222333000181");
  await createCompany(page, "Empresa Cargos B", "11444777000161");
  await openJobs(page, "Empresa Cargos A");
  await page.getByRole("button", { name: "Novo cargo", exact: true }).click();
  await expect(page.getByLabel("Código", { exact: true })).toHaveValue("1");
  await page.getByRole("button", { name: "Salvar cargo", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Selecione uma ocupação da base CBO." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Consultar base CBO", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Classificação Brasileira de Ocupações",
    exact: true,
  });
  await expect(dialog.getByRole("status")).toHaveText(
    "2.693 ocupações encontradas",
  );
  await dialog.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(
    dialog.getByText("Página 2 de 54", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Buscar ocupação CBO", { exact: true })
    .fill("inexistente xxxxxxxxx");
  await expect(
    dialog.getByText(
      "Nenhuma ocupação encontrada. Tente outro termo ou remova os filtros.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByLabel("Buscar ocupação CBO", { exact: true }).fill("5174-05");
  await dialog
    .getByRole("button", {
      name: "Selecionar 5174-05 Porteiro (hotel)",
      exact: true,
    })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByLabel("Descrição do cargo", { exact: true }),
  ).toHaveValue("Porteiro (hotel)");
  await page
    .getByLabel("Descrição do cargo", { exact: true })
    .fill("Porteiro da recepção");
  await page
    .getByRole("button", { name: "Adicionar requisito", exact: true })
    .click();
  await page
    .getByLabel("Requisito 1", { exact: true })
    .fill("Ensino médio completo");
  await page
    .getByRole("button", { name: "Adicionar vigência", exact: true })
    .click();
  await page.getByLabel("Vigência 1", { exact: true }).fill("2026-01-01");
  await page.getByLabel("Salário 1", { exact: true }).fill("200000");
  await expect(page.getByLabel("Salário 1", { exact: true })).toHaveValue(
    /2\.000,00/,
  );
  await page.getByRole("button", { name: "Salvar cargo", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Cargo salvo com sucesso." }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Porteiro da recepção", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Buscar cargos", { exact: true }).fill("5174-05");
  await expect(
    page.getByRole("cell", { name: "Porteiro da recepção", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Buscar cargos", { exact: true }).fill("");
  await page
    .getByLabel("Empresa em contexto", { exact: true })
    .selectOption({ label: "Empresa Cargos B" });
  await expect(
    page.getByText("Nenhum cargo encontrado.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Novo cargo", exact: true }).click();
  await expect(page.getByLabel("Código", { exact: true })).toHaveValue("1");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByLabel("Empresa em contexto", { exact: true })
    .selectOption({ label: "Empresa Cargos A" });
  await page
    .getByRole("button", {
      name: "Editar cargo Porteiro da recepção",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Salário 1", { exact: true })).toHaveValue(
    /2\.000,00/,
  );
  await expect(page.getByLabel("Requisito 1", { exact: true })).toHaveValue(
    "Ensino médio completo",
  );
  await page.getByLabel("Status", { exact: true }).selectOption("Inativo");
  await page.getByRole("button", { name: "Salvar cargo", exact: true }).click();
  await page
    .getByLabel("Filtrar status dos cargos", { exact: true })
    .selectOption("Ativo");
  await expect(
    page.getByText("Nenhum cargo encontrado.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Explorar a prévia", exact: true })
    .click();
  await page.getByRole("tab", { name: "Cargos", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Porteiro da recepção", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Inativo", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", {
      name: "Editar cargo Porteiro da recepção",
      exact: true,
    })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Consultar base CBO", exact: true })
    .click();
  await page.getByLabel("Grande grupo CBO", { exact: true }).selectOption("7");
  await page.getByLabel("Família CBO", { exact: true }).selectOption("7151");
  await page
    .getByLabel("Buscar ocupação CBO", { exact: true })
    .fill("maquinas");
  await expect(
    page.getByRole("button", {
      name: "Selecionar 7151-25 Operador de máquinas de construção civil e mineração",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
