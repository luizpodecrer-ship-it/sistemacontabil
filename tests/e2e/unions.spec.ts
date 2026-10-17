import { test, expect, type Page } from "@playwright/test";
async function enter(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar a prévia", exact: true })
    .click();
  await page.getByRole("button", { name: "Sindicatos", exact: true }).click();
}
test("Sindicatos abaixo de Empresas: cadastro, máscaras, CEP, duplicidade, edição e persistência", async ({
  page,
}) => {
  await page.route("https://viacep.com.br/**", (r) =>
    r.fulfill({
      json: {
        logradouro: "Rua Teste",
        bairro: "Centro",
        localidade: "Cuiabá",
        uf: "MT",
      },
    }),
  );
  await enter(page);
  const order = await page
    .locator("[data-page]")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-page")));
  expect(order.indexOf("unions")).toBe(order.indexOf("company") + 1);
  await expect(
    page.getByLabel("Empresa em contexto", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Consultar CNES", exact: true }),
  ).toHaveAttribute("href", /^https:\/\/www3\.mte\.gov\.br\//);
  await page
    .getByRole("button", { name: "Novo sindicato", exact: true })
    .click();
  await page.getByLabel("CNPJ", { exact: true }).fill("123");
  await page
    .getByLabel("Denominação / razão social", { exact: true })
    .fill("Sindicato de Teste");
  await page
    .getByRole("button", { name: "Salvar sindicato", exact: true })
    .click();
  await expect(page.getByLabel("CNPJ", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByLabel("CNPJ", { exact: true }).fill("11444777000161");
  await expect(page.getByLabel("CNPJ", { exact: true })).toHaveValue(
    "11.444.777/0001-61",
  );
  await page
    .getByLabel("Representação", { exact: true })
    .selectOption("Laboral");
  await page
    .getByLabel("Telefone com DDD", { exact: true })
    .fill("11999991234");
  await expect(
    page.getByLabel("Telefone com DDD", { exact: true }),
  ).toHaveValue("(11) 99999-1234");
  await page
    .getByLabel("Situação na fonte CNES", { exact: true })
    .fill("Informação de teste a conferir");
  await page
    .getByLabel("Data de referência da fonte", { exact: true })
    .fill("2026-01-01");
  await page.getByLabel("CEP", { exact: true }).fill("78005000");
  await expect(page.getByLabel("Logradouro", { exact: true })).toHaveValue(
    "Rua Teste",
  );
  await expect(page.getByLabel("UF da sede", { exact: true })).toHaveValue(
    "MT",
  );
  await page
    .getByRole("button", { name: "Salvar sindicato", exact: true })
    .click();
  await expect(
    page.getByText("Sindicato salvo com sucesso.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Novo sindicato", exact: true })
    .click();
  await page.getByLabel("CNPJ", { exact: true }).fill("11444777000161");
  await page
    .getByLabel("Denominação / razão social", { exact: true })
    .fill("Duplicado");
  await page
    .getByRole("button", { name: "Salvar sindicato", exact: true })
    .click();
  await expect(
    page.getByText("CNPJ já cadastrado no escritório.", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", { name: "Explorar a prévia", exact: true })
    .click();
  await page.getByRole("button", { name: "Sindicatos", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Editar sindicato Sindicato de Teste",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Telefone com DDD", { exact: true }),
  ).toHaveValue("(11) 99999-1234");
  await page
    .getByLabel("Situação interna", { exact: true })
    .selectOption("Inativo");
  await page
    .getByRole("button", { name: "Salvar sindicato", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Inativo", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Informação de teste a conferir", { exact: false }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("CNES Excel real: conversão local, mapeamento, revisão de duplicados e reimportação", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Importar CNES", exact: true })
    .click();
  await page
    .getByLabel("Arquivo CNES", { exact: true })
    .setInputFiles("tests/fixtures/union-import.xlsx");
  await expect(page.getByLabel("Aba CNES", { exact: true })).toHaveValue("0");
  await page
    .getByLabel("Data de referência do arquivo", { exact: true })
    .fill("2026-01-01");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "1 novos · 0 já cadastrados · 3 para revisão" }),
  ).toBeVisible();
  await page
    .getByLabel("Confirmar origem e revisão CNES", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Importar 1 sindicatos", exact: true })
    .click();
  await expect(
    page.getByText(/Importação concluída: 1 novos sindicatos/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Fechar importação", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "04.252.011/0001-10", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Importar CNES", exact: true })
    .click();
  await page
    .getByLabel("Arquivo CNES", { exact: true })
    .setInputFiles("tests/fixtures/union-import.xlsx");
  await expect(page.getByLabel("Aba CNES", { exact: true })).toHaveValue("0");
  await page
    .getByLabel("Data de referência do arquivo", { exact: true })
    .fill("2026-01-01");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "0 novos · 1 já cadastrados · 3 para revisão" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Importar 0 sindicatos", exact: true }),
  ).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
