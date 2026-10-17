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
async function openJobs(page: Page) {
  await page.getByRole("button", { name: "Cargos", exact: true }).click();
}
test("Catálogo compartilhado: catálogo CBO, validação, salários, requisitos, edição e persistência", async ({
  page,
}) => {
  await page.route("https://brasilapi.com.br/**", (r) =>
    r.fulfill({ status: 503, json: { message: "teste" } }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explorar a prévia", exact: true })
    .click();
  await openJobs(page);
  await expect(
    page.getByRole("button", { name: "Novo cargo", exact: true }),
  ).toBeEnabled();
  await createCompany(page, "Empresa Cargos A", "11222333000181");
  await createCompany(page, "Empresa Cargos B", "11444777000161");
  await openJobs(page);
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
  await page.getByRole("button", { name: "Visão geral", exact: true }).click();
  await expect(
    page.getByRole("tab", { name: "Cargos", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Empresa em contexto", { exact: true })
    .selectOption({ label: "Empresa Cargos B" });
  await openJobs(page);
  await expect(
    page.getByRole("cell", { name: "Porteiro da recepção", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Empresa em contexto", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Novo cargo", exact: true }).click();
  await expect(page.getByLabel("Código", { exact: true })).toHaveValue("2");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
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
  await openJobs(page);
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

test("Cargos ficam abaixo de Visão geral e são selecionados no colaborador pelo segmento", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const company = (id: string, name: string, cnpj: string, cnae: string) => ({
      id,
      values: {
        legalName: name,
        cnpj,
        personType: "Pessoa jurídica",
        officeStatus: "Ativa",
        code: id,
      },
      activities: [
        {
          id: `activity-${id}`,
          values: {
            cnae,
            kind: "Principal",
            description: "Atividade de teste",
          },
        },
      ],
      branches: [],
      regimes: [],
      people: [],
      attachments: [],
      history: [],
      status: "Rascunho",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const job = (
      id: string,
      title: string,
      code: string,
      cbo: string,
      segment: string,
      companyId = "",
      status = "Ativo",
    ) => ({
      id,
      module: "jobs",
      companyId,
      period: "",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      values: {
        code,
        title,
        cbo,
        status,
        segments: JSON.stringify(segment ? [segment] : []),
        requirements: "[]",
        salaries: "[]",
      },
    });
    const companies = [
      company("construtora", "Construtora Teste", "11222333000181", "4120400"),
      company("comercio", "Comércio Teste", "11444777000161", "4711302"),
    ];
    const state = {
      schema: 1,
      revision: 0,
      items: [
        job("obras", "Operador de obras", "1", "715125", "F", "construtora"),
        job("vendas", "Vendedor", "1", "521110", "G", "comercio"),
        job("comum", "Assistente administrativo", "10", "411010", ""),
        job("inativo", "Cargo inativo", "11", "252105", "", "", "Inativo"),
      ],
      accounts: [],
      entries: [],
      closings: [],
      audit: [],
    };
    async function seed(
      name: string,
      storeName: string,
      records: any[],
      key?: string,
    ) {
      await new Promise<void>((resolve, reject) => {
        const r = indexedDB.open(name, 1);
        r.onupgradeneeded = () =>
          r.result.createObjectStore(
            storeName,
            key ? undefined : { keyPath: "id" },
          );
        r.onerror = () => reject(r.error);
        r.onsuccess = () => {
          const db = r.result;
          const tx = db.transaction(storeName, "readwrite");
          for (const record of records) {
            if (key) tx.objectStore(storeName).put(record, key);
            else tx.objectStore(storeName).put(record);
          }
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      });
    }
    await seed("nexo-companies-v1", "companies", companies);
    await seed("nexo-workspace-v1", "state", [state], "current");
  });
  await page
    .getByRole("button", { name: "Explorar a prévia", exact: true })
    .click();
  const navigation = await page
    .locator("[data-page]")
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-page")));
  expect(navigation.indexOf("jobs")).toBe(navigation.indexOf("home") + 1);
  await openJobs(page);
  await expect(
    page.getByRole("cell", { name: "Operador de obras", exact: true }),
  ).toBeVisible();
  const migrated = await page.evaluate(
    async () =>
      new Promise<any>((resolve, reject) => {
        const r = indexedDB.open("nexo-workspace-v1", 1);
        r.onsuccess = () => {
          const db = r.result;
          const tx = db.transaction("state", "readonly");
          const get = tx.objectStore("state").get("current");
          get.onsuccess = () => resolve(get.result);
          tx.oncomplete = () => db.close();
        };
        r.onerror = () => reject(r.error);
      }),
  );
  const jobs = migrated.items.filter((i: any) => i.module === "jobs");
  expect(jobs).toHaveLength(4);
  expect(jobs.every((j: any) => j.companyId === "")).toBe(true);
  expect(new Set(jobs.map((j: any) => j.values.code)).size).toBe(4);
  async function openCompany(name: string) {
    await page.getByRole("button", { name: "Empresas", exact: true }).click();
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByRole("tab", { name: "Colaboradores", exact: true }).click();
  }
  await openCompany("Construtora Teste");
  await page
    .getByRole("button", { name: "Novo colaborador", exact: true })
    .click();
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Colaborador das obras");
  await page.getByLabel("CPF", { exact: true }).fill("52998224725");
  await page
    .getByRole("button", { name: "Contrato e remuneração", exact: true })
    .click();
  const role = page.getByLabel("Cargo", { exact: true });
  await expect(role.locator('option[value="obras"]')).toHaveCount(1);
  await expect(role.locator('option[value="comum"]')).toHaveCount(1);
  await expect(role.locator('option[value="vendas"]')).toHaveCount(0);
  await expect(role.locator('option[value="inativo"]')).toHaveCount(0);
  await role.selectOption("obras");
  await expect(page.getByLabel("CBO", { exact: true })).toHaveValue("7151-25");
  await expect(page.getByLabel("CBO", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await page
    .getByLabel("Filtrar cargos por segmento", { exact: true })
    .selectOption("all");
  await expect(role.locator('option[value="vendas"]')).toHaveCount(1);
  await page
    .getByRole("button", {
      name: "Salvar rascunho do colaborador",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Rascunho do colaborador salvo.", { exact: true }),
  ).toBeVisible();
  await openJobs(page);
  await page
    .getByRole("button", {
      name: "Editar cargo Operador de obras",
      exact: true,
    })
    .click();
  await page.getByLabel("Status", { exact: true }).selectOption("Inativo");
  await page.getByRole("button", { name: "Salvar cargo", exact: true }).click();
  await openCompany("Construtora Teste");
  await page
    .getByRole("button", { name: "Colaborador das obras", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Contrato e remuneração", exact: true })
    .click();
  await expect(page.getByLabel("Cargo", { exact: true })).toHaveValue("obras");
  await expect(page.getByLabel("CBO", { exact: true })).toHaveValue("7151-25");
  await page
    .getByRole("button", {
      name: "Salvar rascunho do colaborador",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Rascunho do colaborador salvo.", { exact: true }),
  ).toBeVisible();
  await openCompany("Comércio Teste");
  await page
    .getByRole("button", { name: "Novo colaborador", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Contrato e remuneração", exact: true })
    .click();
  await expect(
    page.getByLabel("Cargo", { exact: true }).locator('option[value="vendas"]'),
  ).toHaveCount(1);
  await expect(
    page.getByLabel("Cargo", { exact: true }).locator('option[value="obras"]'),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
