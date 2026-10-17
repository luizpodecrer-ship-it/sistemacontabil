import { test, expect, type Page } from "@playwright/test";
const seed = {
  id: "company-1",
  values: {
    cnpj: "11.222.333/0001-81",
    legalName: "Empresa Operacional",
    code: "EMP-001",
  },
  branches: [],
  activities: [],
  regimes: [],
  people: [],
  attachments: [],
  history: [],
  status: "Rascunho",
  updatedAt: "",
};
async function start(page: Page) {
  await page.goto("/");
  await page.evaluate(async (company) => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("nexo-companies-v1", 1);
      r.onupgradeneeded = () =>
        r.result.createObjectStore("companies", { keyPath: "id" });
      r.onsuccess = () => {
        const d = r.result;
        const tx = d.transaction("companies", "readwrite");
        tx.objectStore("companies").put(company);
        tx.oncomplete = () => {
          d.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
    localStorage.setItem("nexo-company-context", company.id);
    localStorage.setItem("nexo-period-context", "2026-10");
  }, seed);
  await page.getByRole("button", { name: "Explorar a prévia" }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
}
async function nav(page: Page, name: string) {
  await page.getByRole("button", { name, exact: true }).click();
  await expect(
    page.getByText("Carregando operação…", { exact: true }),
  ).not.toBeVisible();
}
async function createTask(page: Page) {
  await nav(page, "Processos e tarefas");
  await page.getByRole("button", { name: "Novo registro" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Conferência mensal");
  await page.getByLabel("Responsável", { exact: true }).fill("Luiz");
  await page.getByLabel("Prazo", { exact: true }).fill("2026-10-30");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(
    page.getByText("Registro salvo.", { exact: true }),
  ).toBeVisible();
}
test("Todos os módulos da navegação abrem com cabeçalho e sem erros de execução", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  const names = await page
    .locator("button[data-page]")
    .evaluateAll((nodes) => nodes.map((n) => n.textContent?.trim() || ""));
  for (const name of names) {
    await nav(page, name);
    await expect(page.locator("#content h1")).toBeVisible();
  }
  expect(errors).toEqual([]);
  expect(names.length).toBeGreaterThan(30);
});
test("Jornada: tarefa impeditiva, lançamento balanceado, revisão, fechamento, bloqueio e reabertura", async ({
  page,
}) => {
  await start(page);
  await createTask(page);
  await nav(page, "Contabilidade");
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  await page.getByLabel("Histórico", { exact: true }).fill("Capital inicial");
  await page.getByLabel("Conta da partida 1").selectOption("cash");
  await page.getByLabel("Conta da partida 2").selectOption("capital");
  await page.getByLabel("Débito", { exact: true }).nth(0).fill("10000");
  await page.getByLabel("Crédito", { exact: true }).nth(1).fill("9000");
  await page.getByRole("button", { name: "Registrar lançamento" }).click();
  await expect(page.getByRole("status")).toContainText("igual");
  await page.getByLabel("Crédito", { exact: true }).nth(1).fill("10000");
  await page.getByRole("button", { name: "Registrar lançamento" }).click();
  await expect(page.getByRole("status")).toContainText("balanceadas");
  await nav(page, "Revisão e fechamento");
  await page
    .getByLabel("Justificativa / revisão")
    .fill("Conferido pelo revisor");
  await page.getByRole("button", { name: "Encaminhar à revisão" }).click();
  await expect(page.getByRole("status")).toContainText("Em revisão");
  await page.getByRole("button", { name: "Aprovar fechamento" }).click();
  await expect(page.getByRole("status")).toContainText("impeditivas");
  await nav(page, "Processos e tarefas");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Situação", { exact: true }).selectOption("Concluído");
  await page
    .getByLabel("Evidência / conclusão")
    .fill("Conferência documental realizada");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("status")).toContainText("Registro salvo");
  await nav(page, "Revisão e fechamento");
  await page
    .getByLabel("Justificativa / revisão")
    .fill("Todos os itens conferidos");
  await page.getByRole("button", { name: "Aprovar fechamento" }).click();
  await expect(page.getByRole("status")).toContainText("Fechado");
  await nav(page, "Processos e tarefas");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Título", { exact: true }).fill("Não deve salvar");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("status")).toContainText("fechada");
  page.once("dialog", (d) => d.accept());
  await nav(page, "Revisão e fechamento");
  await page.getByLabel("Justificativa / revisão").fill("Correção autorizada");
  await page.getByRole("button", { name: "Abrir / reabrir" }).click();
  await expect(page.getByRole("status")).toContainText("Aberto");
});
test("Contrato gera cobrança uma única vez, liquidação exige comprovante e financeiro do escritório é separado", async ({
  page,
}) => {
  await start(page);
  await nav(page, "Contratos e honorários");
  await page.getByRole("button", { name: "Novo registro" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Honorários mensais");
  await page.getByLabel("Valor", { exact: true }).fill("50000");
  await page.getByLabel("Início do contrato").fill("2026-01-01");
  await page.getByLabel("Dia de vencimento").fill("10");
  await page.getByLabel("Serviços contratados").fill("Contabilidade");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("status")).toContainText("salvo");
  await page.getByRole("button", { name: "Gerar cobrança" }).click();
  await expect(page.getByRole("status")).toContainText("gerada");
  await page.getByRole("button", { name: "Gerar cobrança" }).click();
  await expect(page.getByRole("status")).toContainText("já gerada");
  await nav(page, "Cobranças");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Situação", { exact: true }).selectOption("Liquidado");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("alert")).toContainText("evidência");
  await page.getByLabel("Data do recebimento").fill("2026-10-10");
  await page
    .getByLabel("Comprovante / referência")
    .fill("Comprovante bancário 001");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("status")).toContainText("salvo");
  await nav(page, "Financeiro do escritório");
  await expect(page.getByText("1 registro(s)", { exact: false })).toBeVisible();
  await expect(
    page.getByRole("cell", {
      name: "Honorários: Honorários mensais",
      exact: true,
    }),
  ).toBeVisible();
  await nav(page, "Financeiro dos clientes");
  await expect(page.getByText("0 registro(s)", { exact: false })).toBeVisible();
});
test("Documento aprovado aparece na prévia do portal, backup contém o arquivo e restaura em contexto vazio", async ({
  page,
  browser,
}) => {
  await start(page);
  await nav(page, "Documentos");
  await page.getByRole("button", { name: "Novo registro" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Demonstrativo mensal");
  await page.getByLabel("Tipo", { exact: true }).selectOption("Demonstrativo");
  await page.getByLabel("Disponibilizar para").selectOption("Cliente");
  await page.getByLabel("Situação", { exact: true }).selectOption("Aprovado");
  await page.getByLabel("Arquivo original").setInputFiles({
    name: "relatorio.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 teste"),
  });
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("status")).toContainText("salvo");
  await nav(page, "Portal do cliente");
  await expect(
    page.getByText("Demonstrativo mensal", { exact: true }),
  ).toBeVisible();
  await nav(page, "Backup e recuperação");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar backup completo" }).click();
  const download = await event;
  const path = await download.path();
  expect(path).toBeTruthy();
  const other = await browser.newContext();
  const restored = await other.newPage();
  await restored.goto("/");
  await restored.getByRole("button", { name: "Explorar a prévia" }).click();
  await nav(restored, "Backup e recuperação");
  restored.once("dialog", (d) => d.accept());
  await restored.getByLabel("Restaurar backup JSON").setInputFiles(path!);
  await expect(restored.getByRole("status")).toContainText("restaurado");
  await restored.getByLabel("Empresa em contexto").selectOption("company-1");
  await nav(restored, "Portal do cliente");
  await expect(
    restored.getByText("Demonstrativo mensal", { exact: true }),
  ).toBeVisible();
  await other.close();
});

test("Importações OFX e NF-e preservam origem e bloqueiam duplicidade", async ({
  page,
}) => {
  await start(page);
  await nav(page, "Financeiro dos clientes");
  const ofx =
    "<OFX><STMTTRN><DTPOSTED>20261002120000<TRNAMT>123.45<FITID>unique-1<MEMO>Recebimento</STMTTRN></OFX>";
  await page.locator("input[type=file]").setInputFiles({
    name: "extrato.ofx",
    mimeType: "application/x-ofx",
    buffer: Buffer.from(ofx),
  });
  await expect(page.getByRole("status")).toContainText("importados");
  await expect(
    page.getByRole("cell", { name: "Recebimento", exact: true }),
  ).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "extrato.ofx",
    mimeType: "application/x-ofx",
    buffer: Buffer.from(ofx),
  });
  await expect(page.getByRole("status")).toContainText(
    "Nenhuma transação nova",
  );
  await nav(page, "Escrita fiscal");
  const xml =
    '<nfeProc><NFe><infNFe Id="NFe' +
    "1".repeat(44) +
    '"><ide><nNF>123</nNF><dhEmi>2026-10-02T10:00:00-04:00</dhEmi></ide><emit><CNPJ>11222333000181</CNPJ><xNome>Empresa Operacional</xNome></emit><total><ICMSTot><vNF>500.00</vNF></ICMSTot></total></infNFe></NFe></nfeProc>';
  await page.locator("input[type=file]").setInputFiles({
    name: "nota.xml",
    mimeType: "application/xml",
    buffer: Buffer.from(xml),
  });
  await expect(page.getByRole("status")).toContainText("importado");
  await expect(
    page.getByRole("cell", { name: "NF-e 123", exact: true }),
  ).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({
    name: "nota.xml",
    mimeType: "application/xml",
    buffer: Buffer.from(xml),
  });
  await expect(page.getByRole("status")).toContainText("já importado");
  await page.getByRole("button", { name: "Contabilizar", exact: true }).click();
  await expect(page.getByLabel("Conta da partida 1")).toHaveValue("receivable");
  await expect(page.getByLabel("Conta da partida 2")).toHaveValue("revenue");
  await page.getByRole("button", { name: "Registrar lançamento" }).click();
  await expect(page.getByRole("status")).toContainText("balanceadas");
});
test("Bem gera depreciação apenas uma vez na competência e não excede a base", async ({
  page,
}) => {
  await start(page);
  await nav(page, "Patrimônio");
  await page.getByRole("button", { name: "Novo registro" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Computador");
  await page.getByLabel("Código patrimonial").fill("PAT-001");
  await page.getByLabel("Data", { exact: true }).fill("2026-09-01");
  await page.getByLabel("Valor", { exact: true }).fill("120000");
  await page.getByLabel("Vida útil em meses").fill("12");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("status")).toContainText("salvo");
  await page.getByRole("button", { name: "Depreciar mês" }).click();
  await expect(page.getByRole("status")).toContainText("contabilizada");
  await page.getByRole("button", { name: "Depreciar mês" }).click();
  await expect(page.getByRole("status")).toContainText("já contabilizada");
  await nav(page, "Contabilidade");
  await expect(
    page.getByText("Depreciação linear: Computador", { exact: true }),
  ).toBeVisible();
});

test("Busca global encontra registros e recorrência mensal evita duplicidade", async ({
  page,
}) => {
  await start(page);
  await nav(page, "Processos e tarefas");
  await page.getByRole("button", { name: "Novo registro" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Revisão recorrente");
  await page.getByLabel("Responsável", { exact: true }).fill("Luiz");
  await page.getByLabel("Prazo", { exact: true }).fill("2026-10-20");
  await page.getByLabel("Recorrência", { exact: true }).selectOption("Mensal");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await expect(page.getByRole("status")).toContainText("salvo");
  await page.getByRole("button", { name: "Gerar próximo mês" }).click();
  await expect(page.getByRole("status")).toContainText("gerada");
  await page.getByRole("button", { name: "Gerar próximo mês" }).click();
  await expect(page.getByRole("status")).toContainText("já foi gerada");
  await page
    .getByRole("button", { name: "Buscar no sistema", exact: false })
    .click();
  await page
    .getByRole("textbox", { name: "O que você procura?" })
    .fill("recorrente");
  await expect(
    page.getByRole("cell", { name: "Revisão recorrente", exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Detalhes", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
});
