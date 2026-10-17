import { test } from "node:test";
import assert from "node:assert/strict";
import { initialData } from "../src/features/workspace/model";
import {
  newUnion,
  saveUnion,
  validateUnion,
} from "../src/features/unions/model";
import {
  parseCsv,
  suggestMapping,
  planUnionImport,
  commitUnionPlan,
  validateWorkbook,
} from "../src/features/unions/import-model";
test("Sindicatos: CNPJ único, validação, cadastro compartilhado, concorrência e situação CNES separada", () => {
  const data = initialData(),
    item = newUnion(data);
  item.values.title = "Sindicato sintético";
  item.values.cnpj = "11.222.333/0001-81";
  item.values.cnesStatus = "Situação conforme arquivo";
  assert.deepEqual(validateUnion(item, data), {});
  saveUnion(data, item);
  assert.equal(data.items[0].companyId, "");
  assert.equal(data.items[0].values.status, "Ativo");
  assert.equal(data.items[0].values.cnesStatus, "Situação conforme arquivo");
  const duplicate = newUnion(data);
  duplicate.values.title = "Outro";
  duplicate.values.cnpj = item.values.cnpj;
  assert.ok(validateUnion(duplicate, data).cnpj);
  const stale = structuredClone(data.items[0]);
  stale.updatedAt = "old";
  assert.throws(() => saveUnion(data, stale), /outra aba/);
  const bad = structuredClone(data.items[0]);
  bad.values.phone = "123";
  bad.values.email = "invalido";
  assert.ok(validateUnion(bad, data).phone);
  assert.ok(validateUnion(bad, data).email);
});
test("Importação CNES: colunas variáveis, zeros no CNPJ, duplicados separados e reimportação idempotente", () => {
  const text =
    "CNPJ;Denominação;UF;Situação CNES\n04252011000110;Entidade A;mt;Registro informado\n11222333000181;Entidade B;SP;Ativa na fonte\n11222333000181;Entidade C;SP;Ativa na fonte\n123;Inválido;SP;X\n";
  const sheet = { name: "Base", rows: parseCsv(text) },
    mapping = suggestMapping(sheet.rows[0]),
    data = initialData(),
    source = { name: "cnes.csv", sha256: "a".repeat(64), date: "2026-01-01" };
  const plan = planUnionImport(sheet, 0, mapping, source, data);
  assert.equal(plan.ready.length, 1);
  assert.equal(plan.review.length, 3);
  assert.equal(plan.ready[0].item.values.cnpj, "04.252.011/0001-10");
  assert.equal(plan.ready[0].item.values.uf, "MT");
  const result = commitUnionPlan(data, plan);
  assert.equal(result.inserted, 1);
  assert.equal(data.items[0].values.sourceHash, source.sha256);
  assert.equal(data.items[0].values.cnesStatus, "Registro informado");
  assert.equal(commitUnionPlan(data, plan).skipped, 1);
  assert.equal(data.items.length, 1);
  assert.throws(
    () => planUnionImport(sheet, 0, { ...mapping, cnpj: "-1" }, source, data),
    /Mapeie/,
  );
  assert.throws(
    () =>
      planUnionImport(
        sheet,
        0,
        { ...mapping, title: mapping.cnpj },
        source,
        data,
      ),
    /dois campos/,
  );
  assert.throws(
    () =>
      planUnionImport(
        sheet,
        0,
        mapping,
        { ...source, date: "2026-02-30" },
        data,
      ),
    /referência/,
  );
});
test("CSV e planilha: aspas, células com fórmulas e resposta malformada não geram cadastros", () => {
  assert.equal(
    parseCsv('CNPJ;Denominação\n11222333000181;"Sindicato; teste"')[1][1],
    "Sindicato; teste",
  );
  assert.throws(() => parseCsv('CNPJ;"incompleto'), /aspas/);
  assert.throws(() => validateWorkbook({ sheets: [], sha256: "" }), /inválida/);
  const sheet = {
    name: "Base",
    rows: [
      ["CNPJ", "Denominação"],
      ["11222333000181", "#FORMULA_OU_ERRO"],
    ],
  };
  const plan = planUnionImport(
    sheet,
    0,
    suggestMapping(sheet.rows[0]),
    { name: "arquivo.xlsx", date: "2026-01-01", sha256: "b".repeat(64) },
    initialData(),
  );
  assert.equal(plan.ready.length, 0);
  assert.match(plan.review[0].reason, /fórmula/);
});

test("CSV preserva linhas vazias para os números do relatório de revisão", () => {
  const rows = parseCsv("CNPJ;Denominação\n\n123;Inválido\n");
  const plan = planUnionImport(
    { name: "CSV", rows },
    0,
    suggestMapping(rows[0]),
    { name: "base.csv", sha256: "a".repeat(64), date: "2026-01-01" },
    initialData(),
  );
  assert.equal(plan.review[0].line, 3);
});
