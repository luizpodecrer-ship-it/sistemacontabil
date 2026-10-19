import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { testAccess } from "../support/direct-cloud.mjs";
import { newCompany } from "../../src/features/companies/model";
import { initialData } from "../../src/features/workspace/model";
import {
  defaultOffice,
  defaultPlatform,
} from "../../src/features/branding/model";
import { openModule } from "./navigation-helper";
const link = "/#test_access=" + testAccess;
async function noLocalData(context: BrowserContext) {
  await context.addInitScript(() => {
    (window as any).__localAttempts = [];
    for (const name of ["getItem", "setItem", "removeItem", "clear"] as const) {
      Storage.prototype[name] = function () {
        (window as any).__localAttempts.push(name);
        throw new Error("Browser storage disabled for cloud test");
      } as any;
    }
    indexedDB.open = function () {
      (window as any).__localAttempts.push("indexedDB.open");
      throw new Error("IndexedDB disabled for cloud test");
    } as any;
  });
}
async function enter(page: Page) {
  await page.goto(link);
  await expect(page.getByRole("status")).toContainText(
    "Seu escritório está pronto",
  );
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Acessar ambiente de testes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
  await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
}
async function clear(page: Page) {
  await page.request.get("/__test/cloud?reset");
}

test("Entrada apresenta a marca em computador, tablet e celular sem abrir dados públicos", async ({
  page,
  context,
}) => {
  await clear(page);
  await noLocalData(context);
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", {
        name: "Bom ter você de volta.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText("link privado");
    await page
      .getByRole("button", { name: "Acessar ambiente de testes", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("link privado");
    await expect(
      page.getByRole("heading", { name: "Dashboard", exact: true }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(await page.evaluate(() => (window as any).__localAttempts)).toEqual(
    [],
  );
});

test("Link privado abre sem cadastro, não usa armazenamento local e persiste cadastros entre dispositivos", async ({
  page,
  browser,
  context,
}) => {
  await clear(page);
  await noLocalData(context);
  await enter(page);
  await openModule(page, "Sindicatos");
  await expect(
    page.getByRole("heading", { name: "Sindicatos", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Novo sindicato", exact: true })
    .click();
  await page
    .getByLabel("Denominação / razão social", { exact: true })
    .fill("Sindicato Teste na Nuvem");
  await page.getByLabel("CNPJ", { exact: true }).fill("11.222.333/0001-81");
  await page
    .getByRole("button", { name: "Salvar sindicato", exact: true })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Tabela de sindicatos" })
      .getByText("Sindicato Teste na Nuvem", { exact: true }),
  ).toBeVisible();
  const second = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  await noLocalData(second);
  const other = await second.newPage();
  try {
    await enter(other);
    await openModule(other, "Sindicatos");
    await expect(
      other
        .getByLabel("Lista de sindicatos")
        .getByText("Sindicato Teste na Nuvem", { exact: true }),
    ).toBeVisible();
    expect(await other.evaluate(() => (window as any).__localAttempts)).toEqual(
      [],
    );
    expect(
      await other.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await second.close();
  }
  expect(await page.evaluate(() => (window as any).__localAttempts)).toEqual(
    [],
  );
  await page
    .getByRole("button", { name: "Sair do sistema", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("link privado");
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("link privado");
});

test("Backup completo importa empresas, cargos, sindicatos e arquivo em partes, recuperados em outra sessão", async ({
  page,
  browser,
  context,
}) => {
  await clear(page);
  await noLocalData(context);
  await enter(page);
  const company = newCompany();
  Object.assign(company.values, {
    cnpj: "11.222.333/0001-81",
    legalName: "Empresa Importada na Nuvem",
  });
  const data = initialData();
  const now = new Date().toISOString();
  const make = (
    id: string,
    module: string,
    values: Record<string, string>,
    companyId = "",
  ) => ({
    id,
    module,
    values,
    companyId,
    period: "2026-10",
    status: "Ativo",
    createdAt: now,
    updatedAt: now,
  });
  data.items = [
    make("job-test", "jobs", {
      description: "Administrador",
      cboCode: "252105",
      cboTitle: "Administrador",
    }),
    make("union-test", "unions", {
      name: "Sindicato Importado",
      cnpj: "11222333000181",
      uf: "SP",
    }),
    make(
      "employee-test",
      "employees",
      { name: "Colaborador de Teste" },
      company.id,
    ),
    make("doc-test", "documents", { title: "Anexo importado" }, company.id),
  ] as any;
  const attachment = randomBytes(3 * 1024 * 1024 + 13);
  const backup = {
    format: "nexo-backup-v1",
    companies: [company],
    data,
    companyFiles: {},
    files: {
      "doc-test": {
        name: "anexo.bin",
        type: "application/octet-stream",
        base64: attachment.toString("base64"),
      },
    },
    brands: {
      office: { ...defaultOffice, name: "Escritório Compartilhado" },
      platform: {
        ...defaultPlatform,
        name: "Nexopen Nuvem",
        loginTitle: "Apresentação na nuvem",
      },
    },
  };
  await openModule(page, "Backup e recuperação");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Restaurar backup JSON").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByText("Backup importado. Os dados estão salvos na nuvem.", {
      exact: true,
    }),
  ).toBeVisible({ timeout: 20000 });
  const stored = await (await page.request.get("/__test/cloud")).json();
  expect(stored.companies[0].values.legalName).toBe(company.values.legalName);
  expect(stored.operation.items).toHaveLength(4);
  expect(stored.files.some((name: string) => !name.includes("/_parts/"))).toBe(
    true,
  );
  const downloads = stored.downloads;
  const second = await browser.newContext();
  await noLocalData(second);
  const other = await second.newPage();
  try {
    await enter(other);
    await expect(other.locator("header")).toContainText(
      "Escritório Compartilhado",
    );
    await expect(other).toHaveTitle("Nexopen Nuvem — Gestão contábil");
    await openModule(other, "Backup e recuperação");
    const downloadPromise = other.waitForEvent("download");
    await other.getByRole("button", { name: "Baixar cópia dos dados" }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream!) chunks.push(chunk);
    const restored = JSON.parse(Buffer.concat(chunks).toString());
    expect(restored.files["doc-test"].base64).toBe(
      attachment.toString("base64"),
    );
    expect(restored.brands.platform.loginTitle).toBe("Apresentação na nuvem");
    expect(
      (await (await page.request.get("/__test/cloud")).json()).downloads,
    ).toBeGreaterThan(downloads);
    expect(await other.evaluate(() => (window as any).__localAttempts)).toEqual(
      [],
    );
  } finally {
    await second.close();
  }
  // Existing records cannot be overwritten by a second backup import.
  await page.getByLabel("Restaurar backup JSON").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByText("Este escritório já contém dados.", { exact: false }),
  ).toBeVisible();
});

test("Falha do banco recusa salvar sem cópia local e acesso público não abre dados", async ({
  page,
  context,
}) => {
  await clear(page);
  await noLocalData(context);
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("link privado");
  await enter(page);
  await openModule(page, "Sindicatos");
  await page
    .getByRole("button", { name: "Novo sindicato", exact: true })
    .click();
  await page
    .getByLabel("Denominação / razão social", { exact: true })
    .fill("Não deve ser salvo");
  await page.getByLabel("CNPJ", { exact: true }).fill("11.222.333/0001-81");
  await page.request.get("/__test/cloud?fail=true");
  await page
    .getByRole("button", { name: "Salvar sindicato", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Não foi possível", {
    timeout: 15000,
  });
  const stored = await (await page.request.get("/__test/cloud")).json();
  expect(stored.operation).toBeNull();
  expect(await page.evaluate(() => (window as any).__localAttempts)).toEqual(
    [],
  );
  await page.request.get("/__test/cloud?fail=false");
});

test("Catálogo em nuvem recupera todas as empresas além do limite de mil linhas do Supabase", async ({
  page,
  context,
}) => {
  await clear(page);
  await page.request.get("/__test/cloud?seedCompanies");
  await noLocalData(context);
  await enter(page);
  const ids = await page.evaluate(async () => {
    const path = "/src/backend/repository.ts";
    const { cloudCompanies } = await import(path);
    return (await cloudCompanies()).map((company: any) => company.id);
  });
  expect(ids).toHaveLength(1501);
  expect(new Set(ids).size).toBe(1501);
  expect(ids.at(-1)).toBe("company-1500");
});

test("Site publicado com API indisponível bloqueia a entrada e nunca oferece a prévia local", async ({
  page,
  context,
}) => {
  await noLocalData(context);
  await page.route("https://nexopen-live-test.invalid/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/cloud/status")
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Unavailable" }),
      });
    const response = await route.fetch({
      url: "http://127.0.0.1:5176" + url.pathname + url.search,
    });
    await route.fulfill({ response });
  });
  await page.goto("https://nexopen-live-test.invalid/");
  await expect(
    page.getByRole("heading", { name: "Conexão com a nuvem indisponível" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Nenhum dado será salvo neste navegador",
  );
  await expect(
    page.getByRole("button", { name: "Explorar a prévia" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__localAttempts)).toEqual(
    [],
  );
});
