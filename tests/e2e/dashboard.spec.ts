import { test, expect } from "@playwright/test";
test("Dashboard filtra datas, exporta valores e se adapta ao celular, tablet e computador", async ({
  page,
}, testInfo) => {
  await page.clock.install({ time: new Date("2026-10-17T12:00:00Z") });
  await page.goto("/");
  await page.evaluate(async () => {
    const at = "2026-01-01T12:00:00Z";
    const items = [
      {
        id: "task",
        module: "tasks",
        companyId: "client",
        period: "2026-10",
        createdAt: at,
        updatedAt: at,
        values: {
          title: "Entrega teste",
          status: "Concluído",
          completedAt: "2026-10-05",
        },
      },
      {
        id: "fee",
        module: "collections",
        companyId: "client",
        period: "2026-10",
        createdAt: at,
        updatedAt: at,
        values: {
          title: "Honorários teste",
          status: "Liquidado",
          settledAt: "2026-10-05",
          amount: "R$ 500,00",
        },
      },
    ];
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("nexo-workspace-v1", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("state");
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const db = r.result,
          tx = db.transaction("state", "readwrite");
        tx.objectStore("state").put(
          {
            schema: 1,
            revision: 0,
            items,
            entries: [],
            accounts: [],
            closings: [],
            audit: [],
          },
          "current",
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page
    .getByRole("button", { name: "Explorar a prévia", exact: true })
    .click();
  const dashboard = page.getByRole("region", {
    name: "Indicadores do Dashboard",
  });
  const task = dashboard
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Tarefas concluídas",
        exact: true,
      }),
    });
  await expect(task.getByText("1", { exact: true })).toBeVisible();
  await dashboard.getByRole("button", { name: "7 dias", exact: true }).click();
  await expect(task.getByText("0", { exact: true })).toBeVisible();
  await expect(
    dashboard.getByText("Nenhuma conclusão com data registrada neste período."),
  ).toBeVisible();
  await dashboard.getByRole("button", { name: "30 dias", exact: true }).click();
  await expect(task.getByText("1", { exact: true })).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await dashboard
    .getByRole("button", { name: "Exportar", exact: true })
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe(
    "dashboard-2026-09-18-2026-10-17.csv",
  );
  const stream = await download.createReadStream();
  let csv = "";
  for await (const chunk of stream!) csv += chunk.toString();
  expect(csv).toContain("500,00");
  expect(csv).toContain("Tarefas concluídas");
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      dashboard.getByRole("button", { name: "Exportar", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`dashboard-${width}.png`),
      fullPage: true,
    });
  }
  await dashboard
    .getByRole("button", { name: "Competência atual", exact: true })
    .click();
  await expect(
    dashboard.getByText(/01\/10\/2026 a 31\/10\/2026/),
  ).toBeVisible();
});
