import { test, expect } from "@playwright/test";
async function enter(page: any) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
}
async function createCompany(page: any, name: string, cnpj: string) {
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
test.beforeEach(async ({ page }) => {
  await page.route("https://brasilapi.com.br/**", (r) =>
    r.fulfill({ status: 503, json: { message: "teste" } }),
  );
  await page.route("https://viacep.com.br/**", (r) =>
    r.fulfill({
      json: {
        logradouro: "Rua de teste",
        bairro: "Centro",
        localidade: "Cuiabá",
        uf: "MT",
      },
    }),
  );
});
test("Colaboradores por empresa: CTPS derivada do CPF, dependentes, persistência e cadastro canônico", async ({
  page,
}) => {
  await enter(page);
  await createCompany(page, "Empresa A Teste", "11222333000181");
  await page.getByRole("tab", { name: "Colaboradores", exact: true }).click();
  await page
    .getByRole("button", { name: "Novo colaborador", exact: true })
    .click();
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Colaborador de Teste");
  await page.getByLabel("CPF", { exact: true }).fill("52998224725");
  await page.getByLabel("Matrícula interna", { exact: true }).fill("001");
  await page
    .getByRole("button", { name: "Documentos e pagamento", exact: true })
    .click();
  await page
    .getByLabel("Tipo de carteira de trabalho", { exact: true })
    .selectOption("Digital");
  await expect(
    page.getByLabel("Número da Carteira Digital", { exact: true }),
  ).toHaveValue("529.982.247-25");
  await expect(
    page.getByLabel("Número da Carteira Digital", { exact: true }),
  ).toHaveAttribute("readonly", "");
  await expect(
    page.getByLabel("Série da CTPS em papel", { exact: true }),
  ).not.toBeVisible();
  await page.getByLabel("CPF", { exact: true }).fill("11144477735");
  await expect(
    page.getByLabel("Número da Carteira Digital", { exact: true }),
  ).toHaveValue("111.444.777-35");
  await page.getByLabel("CPF", { exact: true }).fill("123");
  await expect(
    page.getByLabel("Número da Carteira Digital", { exact: true }),
  ).toHaveValue("");
  await page.getByLabel("CPF", { exact: true }).fill("52998224725");
  await page
    .getByLabel("Tipo de carteira de trabalho", { exact: true })
    .selectOption("Papel");
  await page
    .getByLabel("Número da CTPS em papel", { exact: true })
    .fill("00123");
  await page.getByLabel("Série da CTPS em papel", { exact: true }).fill("005");
  await page
    .getByLabel("Tipo de carteira de trabalho", { exact: true })
    .selectOption("Digital");
  await page.getByLabel("CEP", { exact: true }).fill("78005000");
  await expect(page.getByLabel("Logradouro", { exact: true })).toHaveValue(
    "Rua de teste",
  );
  await page
    .getByRole("button", {
      name: "Dependentes, benefícios e férias",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Adicionar dependente", exact: true })
    .click();
  await page
    .getByLabel("Nome do dependente", { exact: true })
    .fill("Dependente Sintético");
  await page
    .getByLabel("CPF do dependente", { exact: true })
    .fill("11144477735");
  await page.getByLabel("Parentesco", { exact: true }).fill("Filho(a)");
  await page
    .getByRole("button", {
      name: "Salvar rascunho do colaborador",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Rascunho do colaborador salvo.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await enter(page);
  await page
    .getByRole("button", { name: "Empresa A Teste", exact: true })
    .click();
  await page.getByRole("tab", { name: "Colaboradores", exact: true }).click();
  await page
    .getByRole("button", { name: "Colaborador de Teste", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Documentos e pagamento", exact: true })
    .click();
  await expect(
    page.getByLabel("Número da Carteira Digital", { exact: true }),
  ).toHaveValue("529.982.247-25");
  await page
    .getByLabel("Tipo de carteira de trabalho", { exact: true })
    .selectOption("Papel");
  await expect(
    page.getByLabel("Número da CTPS em papel", { exact: true }),
  ).toHaveValue("00123");
  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("tab", { name: "Dados gerais", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Colaboradores", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("tab", { name: "Dados gerais", exact: true }).click();
  await page
    .getByRole("button", { name: "Voltar para empresas", exact: true })
    .click();
  await createCompany(page, "Empresa B Teste", "04252011000110");
  await page.getByRole("tab", { name: "Colaboradores", exact: true }).click();
  await expect(
    page.getByText("Nenhum colaborador cadastrado nesta empresa.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pessoal e vínculos", exact: true })
    .click();
  await page
    .getByLabel("Empresa em contexto", { exact: true })
    .selectOption({ label: "Empresa A Teste" });
  await expect(
    page.getByRole("button", { name: "Colaborador de Teste", exact: true }),
  ).toBeVisible();
});
test("Novo cadastro valida conclusão e permanece responsivo, sem buscar carteira no governo", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1")) external.push(r.url());
  });
  await enter(page);
  await createCompany(page, "Empresa Teste", "11222333000181");
  await page.getByRole("tab", { name: "Colaboradores", exact: true }).click();
  await page
    .getByRole("button", { name: "Novo colaborador", exact: true })
    .click();
  await page.getByLabel("Nome completo", { exact: true }).fill("Teste");
  await page.getByLabel("CPF", { exact: true }).fill("52998224725");
  await page
    .getByRole("button", { name: "Concluir colaborador", exact: true })
    .click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(
    page.getByLabel("Matrícula interna", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Matrícula interna", { exact: true }).fill("002");
  await page
    .getByLabel("Data de nascimento", { exact: true })
    .fill("1990-01-01");
  await page.getByLabel("Admissão", { exact: true }).fill("2025-01-15");
  await page.getByLabel("Cargo", { exact: true }).fill("Analista de teste");
  await page
    .getByLabel("Tipo de vínculo", { exact: true })
    .selectOption("Empregado");
  await page
    .getByLabel("Prazo do contrato", { exact: true })
    .selectOption("Indeterminado");
  await page
    .getByLabel("Situação do colaborador", { exact: true })
    .selectOption("Ativo");
  await page.getByLabel("Salário contratual", { exact: true }).fill("250000");
  await page
    .getByLabel("Tipo de salário", { exact: true })
    .selectOption("Mensal");
  await page
    .getByLabel("Vigência do salário", { exact: true })
    .fill("2025-01-15");
  await page.getByLabel("CBO", { exact: true }).fill("252105");
  await page.getByLabel("Matrícula eSocial", { exact: true }).fill("EMP-002");
  await page
    .getByLabel("Código da categoria eSocial", { exact: true })
    .fill("101");
  await page
    .getByRole("button", { name: "Documentos e pagamento", exact: true })
    .click();
  await page
    .getByLabel("Tipo de carteira de trabalho", { exact: true })
    .selectOption("Digital");
  await page
    .getByRole("button", { name: "Concluir colaborador", exact: true })
    .click();
  await expect(
    page.getByText("Cadastro do colaborador concluído.", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(external.filter((url) => /ctps|cpf|carteira/i.test(url))).toEqual([]);
});
