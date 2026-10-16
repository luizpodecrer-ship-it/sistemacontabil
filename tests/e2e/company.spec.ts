import { test, expect, type Page } from "@playwright/test";
async function enter(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page.getByRole("button", { name: "Nova empresa" }).click();
}
async function identity(page: Page) {
  await page.getByLabel("CNPJ", { exact: true }).fill("11222333000181");
  await page
    .getByLabel("Razão social", { exact: true })
    .fill("Empresa de Teste Ltda.");
}
async function tab(page: Page, name: string) {
  await page.getByRole("tab", { name, exact: true }).click();
}
const cepResult = {
  logradouro: "Rua de Teste",
  bairro: "Centro",
  localidade: "Cuiabá",
  uf: "MT",
  ibge: "5103403",
};
test("Máscaras, rascunho persistido, edição e CNPJ duplicado", async ({
  page,
}) => {
  await enter(page);
  await identity(page);
  await expect(page.getByLabel("CNPJ", { exact: true })).toHaveValue(
    "11.222.333/0001-81",
  );
  await tab(page, "Endereço e contatos");
  await page.getByLabel("Telefone fixo", { exact: true }).fill("6533221234");
  await expect(page.getByLabel("Telefone fixo", { exact: true })).toHaveValue(
    "(65) 3322-1234",
  );
  await page
    .getByLabel("Celular / WhatsApp", { exact: true })
    .fill("65999991234");
  await expect(
    page.getByLabel("Celular / WhatsApp", { exact: true }),
  ).toHaveValue("(65) 99999-1234");
  await page.getByLabel("E-mail principal", { exact: true }).fill("inválido");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Revise 1 campo(s)")).toBeVisible();
  await page
    .getByLabel("E-mail principal", { exact: true })
    .fill("contato@teste.com.br");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo neste navegador.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Empresa de Teste Ltda." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Abrir cadastro" }).click();
  await page
    .getByLabel("Nome fantasia", { exact: true })
    .fill("Empresa Atualizada");
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.getByText("Rascunho salvo neste navegador.")).toBeVisible();
  await page.getByRole("button", { name: "Voltar para empresas" }).click();
  await expect(
    page.getByRole("heading", { name: "Empresa Atualizada" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nova empresa" }).click();
  await identity(page);
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(page.locator("#field-cnpj-error")).toContainText(
    "já está cadastrado",
  );
});
test("CEP automático, resposta não encontrada e preservação de campos manuais", async ({
  page,
}) => {
  await page.route("https://viacep.com.br/ws/**", async (route) => {
    const wrong = route.request().url().includes("00000000");
    await route.fulfill({ json: wrong ? { erro: true } : cepResult });
  });
  await enter(page);
  await tab(page, "Endereço e contatos");
  await page.getByLabel("Número", { exact: true }).fill("120");
  await page.getByLabel("Complemento", { exact: true }).fill("Sala 2");
  await page.getByLabel("CEP", { exact: true }).fill("78005000");
  await expect(page.getByLabel("Logradouro", { exact: true })).toHaveValue(
    "Rua de Teste",
  );
  await expect(page.getByLabel("CEP", { exact: true })).toHaveValue(
    "78005-000",
  );
  await expect(page.getByLabel("Número", { exact: true })).toHaveValue("120");
  await expect(page.getByLabel("Complemento", { exact: true })).toHaveValue(
    "Sala 2",
  );
  await page.getByLabel("CEP", { exact: true }).fill("00000000");
  await expect(
    page.getByRole("status").filter({ hasText: "CEP não encontrado" }),
  ).toBeVisible();
  await page.getByLabel("Logradouro", { exact: true }).fill("Endereço manual");
  await expect(page.getByLabel("Logradouro", { exact: true })).toHaveValue(
    "Endereço manual",
  );
});
test("Conclusão exige as abas essenciais, guarda histórico e anexos após recarga", async ({
  page,
}) => {
  await page.route("https://viacep.com.br/ws/**", (route) =>
    route.fulfill({ json: cepResult }),
  );
  await enter(page);
  await identity(page);
  await page.getByRole("button", { name: "Concluir cadastro" }).click();
  await expect(page.locator("#company-errors")).toBeVisible();
  await tab(page, "Endereço e contatos");
  await page.getByLabel("CEP", { exact: true }).fill("78005000");
  await expect(page.getByLabel("Município", { exact: true })).toHaveValue(
    "Cuiabá",
  );
  await page.getByLabel("Número", { exact: true }).fill("120");
  await page
    .getByLabel("E-mail principal", { exact: true })
    .fill("contato@teste.com.br");
  await tab(page, "Atividades");
  await page.getByRole("button", { name: "Adicionar atividade" }).click();
  await page.getByLabel("CNAE", { exact: true }).fill("6920601");
  await page
    .getByLabel("Descrição da atividade", { exact: true })
    .fill("Atividades de contabilidade");
  await tab(page, "Enquadramentos");
  await page.getByRole("button", { name: "Adicionar enquadramento" }).click();
  await page
    .getByLabel("Regime tributário", { exact: true })
    .selectOption("Simples Nacional");
  await page
    .getByLabel("Início da vigência", { exact: true })
    .fill("2026-01-01");
  await page
    .getByLabel("Responsável pela conferência", { exact: true })
    .fill("Responsável Teste");
  await tab(page, "Atendimento");
  await page
    .getByLabel("Contador responsável", { exact: true })
    .fill("Responsável Teste");
  await page
    .getByLabel("Início da responsabilidade", { exact: true })
    .fill("2026-01-01");
  await page
    .getByLabel("Primeira competência", { exact: true })
    .fill("2026-01");
  await page.getByLabel("Contábil", { exact: true }).check();
  await tab(page, "Documentos");
  await page.getByLabel("Selecionar documento").setInputFiles({
    name: "contrato-teste.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nDocumento de teste"),
  });
  await expect(
    page.getByText("contrato-teste.pdf", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Concluir cadastro" }).click();
  await expect(
    page.getByText("Cadastro concluído neste navegador."),
  ).toBeVisible();
  await tab(page, "Histórico");
  await expect(
    page.getByText("Cadastro concluído", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page.getByRole("button", { name: "Abrir cadastro" }).click();
  await tab(page, "Documentos");
  await expect(
    page.getByText("contrato-teste.pdf", { exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar contrato-teste.pdf" }).click();
  expect((await download).suggestedFilename()).toBe("contrato-teste.pdf");
});
test("Celular, teclado, confirmação de descarte e preservação ao recolher sidebar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.getByRole("button", { name: "Empresas", exact: true }).click();
  await page.getByRole("button", { name: "Nova empresa" }).click();
  await identity(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await tab(page, "Identificação");
  await page
    .getByRole("tab", { name: "Identificação", exact: true })
    .press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Endereço e contatos", exact: true }),
  ).toBeFocused();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Voltar para empresas" }).click();
  await expect(
    page.getByRole("heading", { name: "Nova empresa", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Recolher menu" }).click();
  await tab(page, "Identificação");
  await expect(page.getByLabel("Razão social", { exact: true })).toHaveValue(
    "Empresa de Teste Ltda.",
  );
  await page.screenshot({
    path: "/tmp/nexo-company-desktop.png",
    fullPage: true,
  });
});

test("Falha no CEP permite digitação manual e resposta antiga não substitui nova consulta", async ({
  page,
}) => {
  await page.route("https://viacep.com.br/ws/**", async (route) => {
    if (route.request().url().includes("11111111")) {
      await route.abort();
      return;
    }
    if (route.request().url().includes("78005000")) {
      await new Promise((resolve) => setTimeout(resolve, 900));
    }
    await route
      .fulfill({
        json: {
          ...cepResult,
          logradouro: route.request().url().includes("01001000")
            ? "Praça da Sé"
            : "Resposta antiga",
        },
      })
      .catch(() => {});
  });
  await enter(page);
  await tab(page, "Endereço e contatos");
  await page.getByLabel("CEP", { exact: true }).fill("11111111");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /Failed to fetch|fetch|Consulta|consulta/ }),
  ).toBeVisible();
  await page.getByLabel("CEP", { exact: true }).fill("78005000");
  await page.waitForRequest("**/78005000/json/");
  await page.getByLabel("CEP", { exact: true }).fill("01001000");
  await expect(page.getByLabel("Logradouro", { exact: true })).toHaveValue(
    "Praça da Sé",
  );
  await expect(page.getByLabel("CEP", { exact: true })).toHaveValue(
    "01001-000",
  );
});

test("Campos repetíveis, remoção com confirmação e apagar separador de máscara", async ({
  page,
}) => {
  await enter(page);
  await identity(page);
  const cnpj = page.getByLabel("CNPJ", { exact: true });
  await cnpj.evaluate((el: HTMLInputElement) => {
    el.focus();
    el.setSelectionRange(3, 3);
  });
  await cnpj.press("Backspace");
  await expect(cnpj).toHaveValue("12.223.330/0018-1");
  await cnpj.fill("11222333000181");
  await tab(page, "Sócios e representantes");
  await page.getByRole("button", { name: "Adicionar pessoa" }).click();
  await page
    .getByLabel("Nome / razão social", { exact: true })
    .fill("Pessoa de Teste");
  await page.getByLabel("CPF", { exact: true }).fill("52998224725");
  await expect(page.getByLabel("CPF", { exact: true })).toHaveValue(
    "529.982.247-25",
  );
  await page
    .getByLabel("Tipo de pessoa", { exact: true })
    .selectOption("Pessoa jurídica");
  await expect(page.getByLabel("CNPJ", { exact: true })).toHaveValue("");
  await page
    .getByRole("button", { name: "Remover Sócios e representantes 1" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Cancelar", exact: true })
    .press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Remover Sócios e representantes 1" })
    .click();
  await page.getByRole("button", { name: "Remover", exact: true }).click();
  await expect(
    page.getByText("Nenhum registro adicionado.", { exact: true }),
  ).toBeVisible();
});

test("Falha no armazenamento não informa sucesso nem perde os campos digitados", async ({
  page,
}) => {
  await enter(page);
  await identity(page);
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = () => {
      throw new DOMException("Quota excedida", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Salvar rascunho" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Não foi possível salvar" }),
  ).toBeVisible();
  await expect(page.getByLabel("Razão social", { exact: true })).toHaveValue(
    "Empresa de Teste Ltda.",
  );
  await expect(
    page.getByRole("button", { name: "Salvar rascunho" }),
  ).toBeEnabled();
  await expect(
    page.getByText("Rascunho salvo neste navegador."),
  ).not.toBeVisible();
});
