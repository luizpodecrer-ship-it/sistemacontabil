import { test, expect } from "@playwright/test";
test("Tabela: cabeçalhos compactos, ausência de seleção, filtro, ações e celular", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page
    .getByRole("button", { name: "Importar empresas", exact: true })
    .click();
  const row = {
    line: 2,
    code: "15",
    legalName: "Empresa Ativa Teste",
    registrationType: "CNPJ",
    registration: "11222333000181",
    status: "Ativa",
    inactiveAt: "",
    predominantCnae: "6920601 - Contabilidade",
  };
  const payload = {
    format: "nexo-company-import-v1",
    source: { name: "teste.json", sha256: "d".repeat(64) },
    rows: [
      row,
      {
        ...row,
        line: 3,
        code: "20",
        legalName: "Empresa Inativa Teste",
        registration: "04252011000110",
        status: "Inativa",
        inactiveAt: "2025-01-15",
      },
    ],
    errors: [],
  };
  await page.getByLabel("Arquivo de empresas").setInputFiles({
    name: "teste.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await page.getByRole("button", { name: "Importar 2 cadastros" }).click();
  await expect(page.getByText(/Importação concluída/)).toBeVisible();
  await page.getByRole("button", { name: "Fechar importação" }).click();
  const table = page.getByRole("table", { name: "Empresas cadastradas" });
  for (const name of [
    "Código",
    "Razão Social",
    "Tipo de Insc",
    "Inscrição",
    "Status",
    "Data de Inativação",
    "CNAE",
  ])
    await expect(
      table.getByRole("columnheader", { name, exact: true }),
    ).toBeVisible();
  const inactive = table
    .getByRole("row")
    .filter({ hasText: "Empresa Inativa Teste" });
  await expect(
    inactive.getByRole("cell", { name: "Inativa", exact: true }),
  ).toBeVisible();
  await expect(
    inactive.getByRole("cell", { name: "15/01/2025", exact: true }),
  ).toBeVisible();
  await expect(
    inactive.getByRole("cell", { name: "6920-6/01", exact: true }),
  ).toBeVisible();
  await expect(table.getByText("Rascunho", { exact: true })).toHaveCount(0);
  await expect(table.getByRole("checkbox")).toHaveCount(0);
  await page.getByLabel("Filtrar empresas por status").selectOption("Inativa");
  await expect(table.getByRole("row")).toHaveCount(2);
  await page.getByRole("button", { name: "Ações da empresa 20" }).click();
  await expect(
    page.getByRole("button", { name: "Editar cadastro", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Editar cadastro", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Ações da empresa 20" }).click();
  await page
    .getByRole("button", { name: "Editar cadastro", exact: true })
    .click();
  await expect(page.getByLabel("Razão social", { exact: true })).toHaveValue(
    "Empresa Inativa Teste",
  );
  await page.getByRole("button", { name: "Voltar para empresas" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(table).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const region = page.getByRole("region", { name: /Tabela de empresas/ });
  expect(await region.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
});
