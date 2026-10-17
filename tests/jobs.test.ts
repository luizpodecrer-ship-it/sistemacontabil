import { test } from "node:test";
import assert from "node:assert/strict";
import { initialData } from "../src/features/workspace/model";
import {
  cboByCode,
  cboMetadata,
  searchCbo,
  newJob,
  saveJob,
  validateJob,
} from "../src/features/jobs/model";
import { parseCboCsv } from "../scripts/import-cbo.mjs";
test("CBO: catálogo completo da cópia, códigos únicos, pesquisa por código e sem acentos", () => {
  assert.equal(cboByCode.size, cboMetadata.count);
  assert.equal(cboByCode.size, 2693);
  for (const [code, row] of cboByCode) {
    assert.match(code, /^\d{6}$/);
    assert.ok(row.title);
  }
  assert.equal(searchCbo("5174-05")[0].title, "Porteiro (hotel)");
  assert.ok(searchCbo("maquinas").some((r) => r.code === "715125"));
  assert.ok(searchCbo("", "0").every((r) => r.code.startsWith("0")));
  assert.ok(cboByCode.has("010110"));
  assert.equal(searchCbo("nao existe ocupacao assim").length, 0);
});
test("Cargos: código por empresa, CBO obrigatório, isolamento, concorrência e histórico válido", () => {
  const data = initialData(),
    job = newJob(data, "empresa-a");
  job.values.title = "Operador";
  job.values.cbo = "715125";
  assert.deepEqual(validateJob(job, data), {});
  saveJob(data, job);
  assert.equal(
    data.items[0].values.cboTitle,
    "Operador de máquinas de construção civil e mineração",
  );
  assert.equal(newJob(data, "empresa-a").values.code, "2");
  assert.equal(newJob(data, "empresa-b").values.code, "1");
  const duplicate = newJob(data, "empresa-a");
  duplicate.values = { ...job.values };
  assert.ok(validateJob(duplicate, data).code);
  const wrong = structuredClone(data.items[0]);
  wrong.companyId = "empresa-b";
  assert.throws(() => saveJob(data, wrong), /contexto/);
  const stale = structuredClone(data.items[0]);
  stale.updatedAt = "2000-01-01";
  assert.throws(() => saveJob(data, stale), /outra aba/);
  const bad = structuredClone(data.items[0]);
  bad.values.cbo = "999999";
  bad.values.vacancies = "1.5";
  bad.values.salaries = JSON.stringify([{ date: "2026-02-30", value: "1000" }]);
  assert.ok(validateJob(bad, data).cbo);
  assert.ok(validateJob(bad, data).vacancies);
  assert.ok(validateJob(bad, data).salaries);
  bad.values.salaries = JSON.stringify([
    { date: "2026-01-01", value: "1000" },
    { date: "2026-01-01", value: "2000" },
  ]);
  assert.ok(validateJob(bad, data).salaries);
  bad.values.requirements = "{oops";
  assert.ok(validateJob(bad, data).requirements);
});
test("Atualização CBO: CSV oficial UTF-8/Latin-1, títulos com aspas e duplicidades", () => {
  assert.deepEqual(
    parseCboCsv(
      Buffer.from(
        'CODIGO;TITULO\n010110;"Oficial; exército"\n517405;Porteiro (hotel)\n',
      ),
    )[0],
    { code: "010110", title: "Oficial; exército", aliases: [] },
  );
  assert.equal(
    parseCboCsv(Buffer.from("CODIGO;TITULO\n010110;Exército\n", "latin1"))[0]
      .title,
    "Exército",
  );
  assert.throws(
    () => parseCboCsv(Buffer.from("CODIGO;TITULO\n517405;X\n517405;Y\n")),
    /duplicado/,
  );
});
