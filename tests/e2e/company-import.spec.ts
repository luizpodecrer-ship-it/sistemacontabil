import { test, expect } from "@playwright/test";
test("Importa XLS com revisão de duplicados, persiste e não repete cadastros", async ({
  page,
}) => {
  const row = {
    line: 2,
    code: "15",
    legalName: "Empresa Importada Fictícia",
    registrationType: "CNPJ",
    registration: "11222333000181",
    status: "Inativa",
    inactiveAt: "2025-01-15",
    predominantCnae: "6920601 - Atividades de contabilidade",
  };
  const payload = {
    format: "nexo-company-import-v1",
    source: { name: "teste.xls", sha256: "a".repeat(64) },
    rows: [
      row,
      { ...row, line: 3, code: "639", registration: "04252011000110" },
      { ...row, line: 4, code: "1095", registration: "04252011000110" },
    ],
    errors: [],
  };
  await page.route("**/api/company_import", (r) =>
    r.fulfill({ json: payload }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page
    .getByRole("button", { name: "Importar empresas", exact: true })
    .click();
  await page.getByLabel("Arquivo de empresas").setInputFiles({
    name: "teste.xls",
    mimeType: "application/vnd.ms-excel",
    buffer: Buffer.from("synthetic test fixture"),
  });
  await expect(page.getByText(/Código 639/)).toBeVisible();
  await expect(page.getByText(/Código 1095/)).toBeVisible();
  await page
    .getByRole("button", { name: "Importar 1 cadastros", exact: true })
    .click();
  await expect(page.getByText(/Importação concluída: 1 novos/)).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Empresa Importada Fictícia",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page
    .getByRole("button", { name: "Importar empresas", exact: true })
    .click();
  await page.getByLabel("Arquivo de empresas").setInputFiles({
    name: "teste.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await expect(page.getByText(/1 já importados/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Importar 0 cadastros" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Fechar importação" }).click();
  await page.getByRole("button", { name: /^Ações da empresa/ }).click();
  await page
    .getByRole("button", { name: "Abrir cadastro", exact: true })
    .click();
  await expect(
    page.getByLabel("Data de inativação", { exact: true }),
  ).toHaveValue("2025-01-15");
  await page
    .getByRole("tab", { name: "Fiscal e atividades", exact: true })
    .click();
  await expect(
    page.getByLabel("CNAE preponderante", { exact: true }),
  ).toHaveValue("6920-6/01");
});
