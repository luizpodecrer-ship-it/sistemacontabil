import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deriveCtps,
  newEmployee,
  saveEmployeeInData,
  validateEmployee,
  changesOf,
} from "../src/features/employees/model";
import { initialData } from "../src/features/workspace/model";
const employee = (company = "company-a") => {
  const item = newEmployee(company);
  item.values = {
    title: "Colaborador sintético",
    cpf: "529.982.247-25",
    registration: "001",
    ctpsType: "Digital",
    admission: "2025-01-15",
    birth: "1990-01-01",
  };
  return item;
};
test("CTPS Digital deriva CPF validado, acompanha alterações e preserva CTPS papel", () => {
  const values = {
    cpf: "52998224725",
    ctpsType: "Digital",
    ctpsPaperNumber: "12345",
    ctpsPaperSeries: "99",
  };
  assert.equal(deriveCtps(values).ctpsDigitalNumber, "529.982.247-25");
  assert.equal(deriveCtps({ ...values, cpf: "123" }).ctpsDigitalNumber, "");
  assert.equal(
    deriveCtps({ ...values, cpf: "11144477735" }).ctpsDigitalNumber,
    "111.444.777-35",
  );
  assert.equal(
    deriveCtps({ ...values, ctpsType: "Papel" }).ctpsDigitalNumber,
    "",
  );
  assert.equal(deriveCtps(values).ctpsPaperSeries, "99");
  assert.equal(values.cpf, "52998224725");
});
test("Colaborador usa cadastro canônico, valida concorrência, matrícula e isolamento por empresa", () => {
  const data = initialData();
  const first = saveEmployeeInData(data, employee(), false);
  assert.equal(data.items[0].module, "employees");
  assert.equal(first.companyId, "company-a");
  assert.equal(data.audit.length, 1);
  assert.equal(changesOf(first.values).length, 1);
  assert.throws(
    () => saveEmployeeInData(data, employee(), false),
    /Matrícula|CPF/,
  );
  assert.equal(
    saveEmployeeInData(data, employee("company-b"), false).companyId,
    "company-b",
  );
  const edited = structuredClone(first);
  edited.values.salary = "R$ 2.500,00";
  const saved = saveEmployeeInData(data, edited, false);
  assert.equal(changesOf(saved.values).length, 2);
  assert.equal(changesOf(saved.values)[1].after.salary, "R$ 2.500,00");
  assert.throws(
    () => saveEmployeeInData(data, { ...first, updatedAt: "stale" }, false),
    /outra aba/,
  );
  assert.throws(
    () => saveEmployeeInData(data, { ...saved, companyId: "company-b" }, false),
    /mover/,
  );
});
test("Readmissão exige encerramento, matrícula nova e admissão posterior; valida dependentes e datas", () => {
  const old = employee();
  old.values.termination = "2025-12-31";
  const fresh = employee();
  fresh.values.registration = "002";
  fresh.values.admission = "2026-01-02";
  assert.equal(validateEmployee(fresh, [old]).cpf, undefined);
  fresh.values.admission = "2025-12-31";
  assert.ok(validateEmployee(fresh, [old]).cpf);
  fresh.values.birth = "2026-02-30";
  fresh.values.termination = "2020-01-01";
  fresh.values.dependents = JSON.stringify([
    { id: "d1", values: { cpf: fresh.values.cpf } },
    { id: "d2", values: { cpf: "123" } },
  ]);
  const errors = validateEmployee(fresh, [], true);
  assert.ok(errors.birth);
  assert.ok(errors.termination);
  assert.ok(errors["dependents.d1.cpf"]);
  assert.ok(errors["dependents.d2.cpf"]);
  assert.ok(errors.esocialCategory);
  assert.ok(errors.role);
  fresh.values.experienceDays = "45";
  fresh.values.extensionDays = "46";
  assert.ok(validateEmployee(fresh, []).extensionDays);
  const later = employee();
  later.values.registration = "003";
  later.values.admission = "2026-01-02";
  assert.equal(validateEmployee(old, [later]).cpf, undefined);
});
test("Competência fechada bloqueia alteração e dados específicos não são preenchidos por suposição", () => {
  const data = initialData();
  const month = new Date().toLocaleDateString("sv-SE").slice(0, 7);
  data.closings.push({
    companyId: "company-a",
    period: month,
    state: "Fechado",
    at: new Date().toISOString(),
    reason: "teste",
  });
  assert.throws(() => saveEmployeeInData(data, employee(), false), /fechada/);
  assert.equal(employee().values.fgtsRate, undefined);
  assert.equal(employee().values.esocialCategory, undefined);
});
