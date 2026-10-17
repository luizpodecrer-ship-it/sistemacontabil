import { test } from "node:test";
import assert from "node:assert/strict";
import {
  planCompanyImport,
  parseImportPayload,
  type ImportPayload,
} from "../src/features/companies/import-model";
const row = {
  line: 2,
  code: "15",
  legalName: "Empresa fictícia",
  registrationType: "CNPJ",
  registration: "11222333000181",
  status: "Inativa",
  inactiveAt: "2025-01-15",
  predominantCnae: "6920601 - Atividades de contabilidade",
};
const payload: ImportPayload = {
  format: "nexo-company-import-v1",
  source: { name: "teste.xls", sha256: "a".repeat(64) },
  rows: [row],
  errors: [],
};
test("Importação preserva campos, separa todas as inscrições repetidas e é idempotente", () => {
  const first = planCompanyImport(parseImportPayload(payload), []);
  assert.equal(first.created, 1);
  const c = first.companies[0];
  assert.equal(c.values.code, "15");
  assert.equal(c.values.officeStatus, "Inativa");
  assert.equal(c.values.inactiveAt, "2025-01-15");
  assert.equal(c.values.predominantCnae, "6920-6/01");
  assert.equal(c.status, "Rascunho");
  assert.equal(c.activities.length, 0);
  const repeat = planCompanyImport(payload, [c]);
  assert.equal(repeat.unchanged, 1);
  assert.equal(repeat.companies.length, 0);
  c.values.legalName = "Nome editado";
  c.values.email = "teste@example.com";
  const next = planCompanyImport(
    { ...payload, source: { ...payload.source, sha256: "b".repeat(64) } },
    [c],
  );
  assert.equal(next.updated, 1);
  assert.equal(next.companies[0].values.legalName, "Nome editado");
  assert.equal(next.companies[0].values.email, "teste@example.com");
  const duplicate = planCompanyImport(
    { ...payload, rows: [row, { ...row, line: 3, code: "16" }] },
    [],
  );
  assert.equal(duplicate.created, 0);
  assert.equal(duplicate.excludedDuplicates, 2);
  assert.equal(duplicate.issues.length, 2);
});
test("Linhas com data inválida, inscrição ou código conflitante não são cadastradas", () => {
  assert.equal(
    planCompanyImport(
      { ...payload, rows: [{ ...row, inactiveAt: "2025-02-30" }] },
      [],
    ).created,
    0,
  );
  assert.equal(
    planCompanyImport(
      { ...payload, rows: [{ ...row, registration: "123" }] },
      [],
    ).issues.length,
    1,
  );
  const current = planCompanyImport(payload, []).companies[0];
  assert.equal(
    planCompanyImport(
      { ...payload, rows: [{ ...row, registration: "04252011000110" }] },
      [current],
    ).created,
    0,
  );
  assert.throws(() => parseImportPayload({ format: "other" }));
});
