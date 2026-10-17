import { test, expect, type Page } from "@playwright/test";
const fixture = {
  razao_social: "Empresa da Consulta Ltda.",
  nome_fantasia: "Consulta Exemplo",
  data_inicio_atividade: "2021-03-05",
  capital_social: 60000,
  codigo_natureza_juridica: 2062,
  natureza_juridica: "Sociedade Empresária Limitada",
  descricao_situacao_cadastral: "ATIVA",
  cep: "78005000",
  logradouro: "Rua Exemplo",
  descricao_tipo_de_logradouro: "Rua",
  numero: "120",
  bairro: "Centro",
  municipio: "Cuiabá",
  uf: "MT",
  codigo_municipio_ibge: 5103403,
  ddd_telefone_1: "6533221234",
  email: "contato@exemplo.com.br",
  cnae_fiscal: 6920601,
  cnae_fiscal_descricao: "Atividades de contabilidade",
  cnaes_secundarios: [{ codigo: 6920602, descricao: "Consultoria contábil" }],
};
async function enter(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page.getByRole("button", { name: "Nova empresa" }).click();
}
async function tab(page: Page, name: string) {
  await page.getByRole("tab", { name, exact: true }).click();
}
test("CNPJ automático preenche campos vazios, preserva digitação e permite substituição explícita", async ({
  page,
}) => {
  await page.route("https://brasilapi.com.br/api/cnpj/v1/**", (r) =>
    r.fulfill({ json: fixture }),
  );
  await enter(page);
  await page
    .getByLabel("Razão social", { exact: true })
    .fill("Nome digitado manualmente");
  await page.getByLabel("CNPJ", { exact: true }).fill("11222333000181");
  await expect(page.getByLabel("Nome fantasia", { exact: true })).toHaveValue(
    "Consulta Exemplo",
  );
  await expect(page.getByLabel("Razão social", { exact: true })).toHaveValue(
    "Nome digitado manualmente",
  );
  await page.getByText("Revisar dados da consulta", { exact: false }).click();
  await page.getByRole("checkbox", { name: /Razão social/ }).check();
  await page
    .getByRole("button", { name: "Aplicar campos selecionados" })
    .click();
  await expect(page.getByLabel("Razão social", { exact: true })).toHaveValue(
    "Empresa da Consulta Ltda.",
  );
  await tab(page, "Endereço e contatos");
  await expect(page.getByLabel("Logradouro", { exact: true })).toHaveValue(
    "Rua Exemplo",
  );
  await expect(page.getByLabel("CEP", { exact: true })).toHaveValue(
    "78005-000",
  );
  await expect(page.getByLabel("Número com DDD", { exact: true })).toHaveValue(
    "(65) 3322-1234",
  );
  await tab(page, "Atividades");
  await expect(page.getByLabel("CNAE", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo neste navegador.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page.getByRole("button", { name: /^Ações da empresa/ }).click();
  await page
    .getByRole("button", { name: "Abrir cadastro", exact: true })
    .click();
  await expect(page.locator("button[role=tab] svg")).toHaveCount(10);
});
test("Resposta antiga e indisponibilidade não substituem o novo CNPJ nem impedem preenchimento manual", async ({
  page,
}) => {
  await page.route("https://brasilapi.com.br/api/cnpj/v1/**", async (route) => {
    if (route.request().url().includes("11222333000181")) {
      await new Promise((r) => setTimeout(r, 1000));
      await route.fulfill({ json: fixture }).catch(() => {});
    } else await route.fulfill({ status: 429, json: { message: "Limite" } });
  });
  await enter(page);
  await page.getByLabel("CNPJ", { exact: true }).fill("11222333000181");
  await page.waitForRequest("**/11222333000181");
  await page.getByLabel("CNPJ", { exact: true }).fill("04252011000110");
  await expect(
    page.getByRole("status").filter({ hasText: "limite de consultas" }),
  ).toBeVisible();
  await expect(page.getByLabel("Nome fantasia", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByLabel("Razão social", { exact: true })
    .fill("Cadastro manual");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo neste navegador.")).toBeVisible();
});
test("CPF, telefones e configurações de pessoal persistem sem exigir parâmetros fiscais de pessoa jurídica", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByLabel("Tipo de cliente", { exact: true })
    .selectOption("Pessoa física");
  await page.getByLabel("CPF", { exact: true }).fill("52998224725");
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Cliente Pessoa Física");
  await expect(page.getByLabel("Capital social", { exact: true })).toHaveCount(
    0,
  );
  await tab(page, "Configurações de pessoal");
  await page
    .getByRole("button", { name: "Adicionar configuração da folha" })
    .click();
  await page.getByLabel("Competência inicial da configuração").fill("2026-01");
  await page
    .getByLabel("Desoneração da folha", { exact: true })
    .selectOption("Sim");
  await page
    .getByLabel("Alíquota de desoneração (%)", { exact: true })
    .fill("150");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.locator("#company-errors")).toContainText("percentual");
  await page
    .getByLabel("Alíquota de desoneração (%)", { exact: true })
    .fill("2,50");
  await page.getByRole("button", { name: "Adicionar vigência PAT" }).click();
  await page.getByLabel("Participa do PAT").selectOption("Sim");
  await page.getByLabel("Início da vigência do PAT").fill("2026-01-01");
  await page.getByLabel("Participantes até 5 salários mínimos").fill("24");
  await page
    .getByLabel("Origem das quantidades")
    .selectOption("Levantamento manual");
  await page
    .getByRole("button", { name: "Adicionar configuração eSocial" })
    .click();
  await page.getByLabel("Grupo no eSocial").selectOption("Grupo 3");
  await page
    .getByLabel("Início da vigência da configuração eSocial")
    .fill("2026-01-01");
  await page.getByLabel("Início de cadastros e tabelas").fill("2021-03-05");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo neste navegador.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page.getByRole("button", { name: /^Ações da empresa/ }).click();
  await page
    .getByRole("button", { name: "Abrir cadastro", exact: true })
    .click();
  await expect(page.getByLabel("CPF", { exact: true })).toHaveValue(
    "529.982.247-25",
  );
  await tab(page, "Configurações de pessoal");
  await expect(
    page.getByLabel("Participantes até 5 salários mínimos"),
  ).toHaveValue("24");
  await expect(page.getByLabel("Grupo no eSocial")).toHaveValue("Grupo 3");
});
test("Cadastro antigo mantém os telefones e campos de endereço/cartório ao editar", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const r = indexedDB.open("nexo-companies-v1", 1);
      r.onupgradeneeded = () =>
        r.result.createObjectStore("companies", { keyPath: "id" });
      r.onsuccess = () => {
        const tx = r.result.transaction("companies", "readwrite");
        tx.objectStore("companies").put({
          id: "legacy",
          values: {
            cnpj: "11.222.333/0001-81",
            legalName: "Empresa antiga",
            phone: "(65) 3322-1234",
          },
          branches: [],
          activities: [],
          regimes: [],
          people: [],
          attachments: [],
          history: [],
          updatedAt: "",
          status: "Rascunho",
        });
        tx.oncomplete = () => {
          r.result.close();
          resolve();
        };
      };
    });
  });
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page.getByRole("button", { name: /^Ações da empresa/ }).click();
  await page
    .getByRole("button", { name: "Abrir cadastro", exact: true })
    .click();
  await tab(page, "Endereço e contatos");
  await expect(page.getByLabel("Número com DDD", { exact: true })).toHaveValue(
    "(65) 3322-1234",
  );
  await page.getByLabel("Andar", { exact: true }).fill("2");
  await page.getByLabel("Sala / conjunto", { exact: true }).fill("204");
  await tab(page, "Estabelecimentos");
  await page.getByLabel("Cartório / termo").fill("Cartório Teste");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo neste navegador.")).toBeVisible();
});
