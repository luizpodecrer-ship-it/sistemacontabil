import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatCep,
  formatPhone,
  formatCpf,
  formatCnpj,
  formatMoney,
  validCnpj,
  validCpf,
  validPhone,
} from "../lib/formats";
import {
  newCompany,
  validateCompany,
  validateField,
} from "../src/features/companies/model";
test("Máscaras brasileiras e verificação dos documentos", () => {
  assert.equal(formatCnpj("11222333000181"), "11.222.333/0001-81");
  assert.equal(formatCnpj("12abc34501de35"), "12.ABC.345/01DE-35");
  assert.equal(formatCpf("52998224725"), "529.982.247-25");
  assert.equal(formatCep("78005000"), "78005-000");
  assert.equal(formatPhone("65999991234"), "(65) 99999-1234");
  assert.equal(formatPhone("6533221234"), "(65) 3322-1234");
  assert.match(formatMoney("123456"), /1\.234,56/);
  assert.ok(validCnpj("11222333000181"));
  assert.ok(validCnpj("12ABC34501DE35"));
  assert.ok(!validCnpj("11222333000180"));
  assert.ok(!validCnpj("00000000000000"));
  assert.ok(validCpf("52998224725"));
  assert.ok(!validCpf("11111111111"));
  assert.ok(validPhone("65999991234"));
  assert.ok(!validPhone("00999991234"));
});
test("Rascunho mínimo, duplicidade e validação de preenchimentos opcionais", () => {
  const c = newCompany();
  c.values.cnpj = "11.222.333/0001-81";
  c.values.legalName = "Empresa Teste";
  assert.deepEqual(validateCompany(c, [], false), {});
  assert.ok(validateCompany(c, [{ ...c, id: "other" }], false).cnpj);
  c.values.email = "inválido";
  assert.ok(validateCompany(c, [], false).email);
  assert.ok(Object.keys(validateCompany(c, [], true)).length > 5);
  assert.ok(
    validateField(
      { key: "email", label: "Email", type: "email" },
      "teste@",
      false,
    ),
  );
});
test("Vigências sobrepostas, MEI incompatível e participações acima de 100%", () => {
  const c = newCompany();
  c.values.cnpj = "11.222.333/0001-81";
  c.values.legalName = "Empresa Teste";
  c.regimes = [
    {
      id: "1",
      values: {
        regime: "Simples Nacional",
        mei: "Não",
        start: "2025-01-01",
        end: "2026-06-30",
      },
    },
    {
      id: "2",
      values: { regime: "Lucro Real", mei: "Sim", start: "2026-06-01" },
    },
  ];
  c.people = [
    { id: "1", values: { share: "70" } },
    { id: "2", values: { share: "40" } },
  ];
  const errors = validateCompany(c, [], false);
  assert.ok(errors["regimes.2.start"]);
  assert.ok(errors["regimes.2.mei"]);
  assert.ok(errors.people);
});
test("Filial duplicada ou de outra raiz é bloqueada", () => {
  const c = newCompany();
  c.values.cnpj = "11.222.333/0001-81";
  c.values.legalName = "Empresa Teste";
  c.branches = [{ id: "1", values: { cnpj: c.values.cnpj } }];
  assert.ok(validateCompany(c, [], false)["branches.1.cnpj"]);
  c.branches = [{ id: "1", values: { cnpj: "04.252.011/0001-10" } }];
  assert.ok(validateCompany(c, [], false)["branches.1.cnpj"]);
});
