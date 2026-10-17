import { test } from "node:test";
import assert from "node:assert/strict";
import { initialData } from "../src/features/workspace/model";
import {
  cboByCode,
  cboMetadata,
  searchCbo,
  newJob,
  migrateCompanyJobs,
  availableJobs,
  segmentForCnae,
  employeeJobError,
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
test("Cargos: catálogo compartilhado, código único, CBO obrigatório e concorrência", () => {
  const data = initialData(),
    job = newJob(data);
  job.values.title = "Operador";
  job.values.cbo = "715125";
  assert.deepEqual(validateJob(job, data), {});
  saveJob(data, job);
  assert.equal(
    data.items[0].values.cboTitle,
    "Operador de máquinas de construção civil e mineração",
  );
  assert.equal(newJob(data).values.code, "2");
  assert.equal(newJob(data).values.code, "2");
  const duplicate = newJob(data);
  duplicate.values = { ...job.values };
  assert.ok(validateJob(duplicate, data).code);
  const wrong = structuredClone(data.items[0]);
  wrong.companyId = "empresa-b";
  assert.throws(() => saveJob(data, wrong), /compartilhado/);
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

test("Catálogo: migração preserva cargos e resolve códigos repetidos sem excluir registros", () => {
  const data = initialData();
  const first = newJob(data);
  first.companyId = "empresa-a";
  first.values.title = "Cargo A";
  first.values.cbo = "252105";
  const second = structuredClone(first);
  second.id = "segundo";
  second.companyId = "empresa-b";
  data.items.push(first, second);
  migrateCompanyJobs(data);
  assert.equal(data.items.length, 2);
  assert.ok(data.items.every((j) => j.companyId === ""));
  assert.equal(new Set(data.items.map((j) => j.values.code)).size, 2);
  assert.equal(data.items[1].id, "segundo");
  assert.equal(data.items[1].values.originalCompanyCode, "1");
  assert.equal(data.items[1].values.sourceCompanyId, "empresa-b");
  const snapshot = JSON.stringify(data);
  migrateCompanyJobs(data);
  assert.equal(JSON.stringify(data), snapshot);
});
test("Segmentos sugerem cargos sem restringir acesso aos demais; vínculos preservam histórico", () => {
  const data = initialData();
  const job = newJob(data);
  job.values.title = "Operador";
  job.values.cbo = "715125";
  job.values.segments = '["F"]';
  saveJob(data, job);
  const stored = data.items[0];
  assert.equal(segmentForCnae("4120-4/00"), "F");
  assert.equal(segmentForCnae("4711-3/02"), "G");
  assert.equal(segmentForCnae("123"), undefined);
  assert.equal(availableJobs(data.items, ["G"]).length, 0);
  assert.equal(availableJobs(data.items, ["F"]).length, 1);
  assert.equal(availableJobs(data.items).length, 1);
  const employee = {
    ...structuredClone(stored),
    id: "emp",
    module: "employees",
    companyId: "empresa-a",
    values: { roleId: stored.id, role: "Operador", cbo: "715125" },
  };
  assert.equal(employeeJobError(employee, data.items, false), "");
  assert.ok(
    employeeJobError(
      { ...employee, values: { ...employee.values, cbo: "252105" } },
      data.items,
      false,
    ),
  );
  const old = structuredClone(employee);
  data.items.push(old);
  stored.values.status = "Inativo";
  assert.equal(employeeJobError(employee, data.items, true), "");
  assert.equal(availableJobs(data.items).length, 0);
  assert.ok(employeeJobError({ ...employee, id: "new" }, data.items, false));
  assert.ok(
    employeeJobError(
      { ...employee, id: "new", values: { role: "Livre", cbo: "715125" } },
      data.items,
      true,
    ),
  );
});
