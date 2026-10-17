import { selectOption } from "./select-helper";
import { test, expect, type Page } from "@playwright/test";
async function enter(page: Page) {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Continuar com Google/i }),
  ).toHaveCount(0);
  await expect(page.getByText("OU", { exact: true })).toHaveCount(0);
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
  await selectOption(
    page.getByLabel("Representação", { exact: true }),
    "Laboral",
  );
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
  await expect(page.getByLabel("UF da sede", { exact: true })).toHaveAttribute(
    "value",
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
  await selectOption(
    page.getByLabel("Situação interna", { exact: true }),
    "Inativo",
  );
  await page
    .getByRole("button", { name: "Salvar sindicato", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "Inativo", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Tabela de sindicatos", exact: true })
      .getByText("Informação de teste a conferir", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("CNES Excel real: leitura no navegador, mapeamento, revisão de duplicados e reimportação", async ({
  page,
}) => {
  const conversionRequests: string[] = [];
  await page.route("**/api/union_import", (route) => {
    conversionRequests.push(route.request().url());
    return route.abort();
  });
  await enter(page);
  await page
    .getByRole("button", { name: "Importar CNES", exact: true })
    .click();
  await page
    .getByLabel("Arquivo CNES", { exact: true })
    .setInputFiles("tests/fixtures/union-import.xlsx");
  await expect(page.getByLabel("Aba CNES", { exact: true })).toHaveAttribute(
    "value",
    "0",
  );
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "1 novos · 0 já cadastrados · 3 para revisão" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cadastrar 1 sindicatos", exact: true })
    .click();
  await expect(
    page.getByText(/Importação concluída: 1 novos sindicatos/),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "04.252.011/0001-10", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Importar CNES", exact: true })
    .click();
  await page
    .getByLabel("Arquivo CNES", { exact: true })
    .setInputFiles("tests/fixtures/union-import.xlsx");
  await expect(page.getByLabel("Aba CNES", { exact: true })).toHaveAttribute(
    "value",
    "0",
  );
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "0 novos · 1 já cadastrados · 3 para revisão" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cadastrar 0 sindicatos", exact: true }),
  ).toBeDisabled();
  expect(conversionRequests).toHaveLength(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

for (const format of ["binary", "html", "xml"] as const) {
  test(`Excel ${format}: seletor de arquivo abre e sindicatos são cadastrados sem API`, async ({
    page,
  }) => {
    const conversions: string[] = [];
    await page.route("**/api/union_import", (route) => {
      conversions.push(route.request().url());
      return route.fulfill({ status: 503, body: "Servidor indisponível" });
    });
    await enter(page);
    await page
      .getByRole("button", { name: "Importar CNES", exact: true })
      .click();
    const html =
      '<html><head><meta charset="utf-8"></head><body><script>window.executedImport=true</script><table><tr><th>CNPJ</th><th>Denominação</th><th>UF</th></tr><tr><td>04252011000110</td><td>Sindicato HTML Fictício</td><td>MT</td></tr></table></body></html>';
    const xml =
      '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="CNES"><Table><Row><Cell><Data ss:Type="String">CNPJ</Data></Cell><Cell><Data ss:Type="String">Denominação</Data></Cell></Row><Row><Cell><Data ss:Type="String">04252011000110</Data></Cell><Cell><Data ss:Type="String">Sindicato XML Fictício</Data></Cell></Row></Table></Worksheet></Workbook>';
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByText("Selecionar planilha Excel", { exact: true }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles(
      format === "binary"
        ? "tests/fixtures/union-legacy.xls"
        : {
            name: `sindicatos-${format}.xls`,
            mimeType: "application/vnd.ms-excel",
            buffer: Buffer.from(format === "html" ? html : xml),
          },
    );
    await expect(
      page.getByRole("status").filter({ hasText: "Planilha lida:" }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Linha do cabeçalho CNES", { exact: true }),
    ).toHaveAttribute("value", format === "binary" ? "2" : "0");
    await page
      .getByRole("button", { name: "Cadastrar 1 sindicatos", exact: true })
      .click();
    await expect(
      page.getByText(/Importação concluída: 1 novos sindicatos/),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: "04.252.011/0001-10", exact: true }),
    ).toBeVisible();
    expect(conversions).toHaveLength(0);
    expect(await page.evaluate(() => !!(window as any).executedImport)).toBe(
      false,
    );
  });
}
test("Arquivo inválido explica o problema e permite selecionar novamente o mesmo nome", async ({
  page,
}) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Importar CNES", exact: true })
    .click();
  await page.getByLabel("Arquivo CNES", { exact: true }).setInputFiles({
    name: "cnes.xls",
    mimeType: "application/vnd.ms-excel",
    buffer: Buffer.from("<html>Login necessário</html>"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "não contém uma tabela Excel",
  );
  const html =
    "<table><tr><th>CNPJ</th><th>Denominação</th></tr><tr><td>04252011000110</td><td>Sindicato de teste</td></tr></table>";
  await page.getByLabel("Arquivo CNES", { exact: true }).setInputFiles({
    name: "cnes.xls",
    mimeType: "application/vnd.ms-excel",
    buffer: Buffer.from(html),
  });
  await expect(
    page.getByRole("status").filter({ hasText: "Planilha lida:" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("Sindicatos: nomes longos e dados legíveis em celular, tablet e computador", async ({
  page,
}, testInfo) => {
  await enter(page);
  await page
    .getByRole("button", { name: "Importar CNES", exact: true })
    .click();
  const title =
    "Sindicato dos Agentes Comunitários de Saúde e Técnicos em Agentes Comunitários de Saúde e de Combate às Endemias da Regional de Caxias – Maranhão";
  await page.getByLabel("Arquivo CNES", { exact: true }).setInputFiles({
    name: "sindicatos-responsivos.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(
      `CNPJ;Denominação;UF\n04252011000110;${title};MA\n11444777000161;${"Sindicato".repeat(30)};MT`,
    ),
  });
  await page
    .getByRole("button", { name: "Cadastrar 2 sindicatos", exact: true })
    .click();
  for (const width of [360, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    const catalog = page.getByRole("region", {
      name: "Tabela de sindicatos",
      exact: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width < 768) {
      await expect(catalog).toBeHidden();
      const card = page.getByRole("article").filter({ hasText: title });
      await expect(card.getByRole("heading", { name: title })).toBeVisible();
      await expect(
        card.getByText("04.252.011/0001-10", { exact: true }),
      ).toBeVisible();
      await expect(
        card.getByRole("button", { name: `Editar sindicato ${title}` }),
      ).toBeVisible();
      expect(
        await card.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
    } else {
      await expect(catalog).toBeVisible();
      const table = catalog.getByRole("table");
      expect(
        await table.evaluate((el) => el.getBoundingClientRect().width),
      ).toBeGreaterThanOrEqual(1180);
      for (const label of [
        "CNPJ",
        "Representação",
        "Situação no CNES",
        "Situação interna",
        "Ações",
      ]) {
        const header = catalog.getByRole("columnheader", {
          name: label,
          exact: true,
        });
        expect(
          await header.evaluate((el) => getComputedStyle(el).whiteSpace),
        ).toBe("nowrap");
      }
      await catalog.evaluate((el) => {
        el.scrollLeft = el.scrollWidth;
      });
      await expect(
        catalog.getByRole("button", {
          name: `Editar sindicato ${title}`,
          exact: true,
        }),
      ).toBeVisible();
      await catalog.evaluate((el) => {
        el.scrollLeft = 0;
      });
    }
    await page.screenshot({
      path: testInfo.outputPath(`sindicatos-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: `Editar sindicato ${title}`, exact: true })
    .click();
  await expect(
    page.getByLabel("Denominação / razão social", { exact: true }),
  ).toHaveValue(title);
});
