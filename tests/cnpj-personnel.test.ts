import { test } from "node:test";
import assert from "node:assert/strict";
import { mapCnpj, lookupCnpj } from "../src/features/companies/cnpj";
import {
  newCompany,
  normalizeCompany,
  validateCompany,
  type Company,
} from "../src/features/companies/model";
test("Consulta cadastral mapeia dados e não infere regras tributárias nem importa CPF mascarado", () => {
  const result = mapCnpj(
    {
      razao_social: "Empresa Exemplo Ltda.",
      capital_social: 12500.5,
      cnae_fiscal: 6920601,
      cnae_fiscal_descricao: "Atividades de contabilidade",
      cnaes_secundarios: [
        { codigo: 6920602, descricao: "Auditoria" },
        { codigo: 6920601, descricao: "Duplicado" },
      ],
      cep: "78005000",
      logradouro: "Rua A",
      descricao_tipo_de_logradouro: "Rua",
      ddd_telefone_1: "65999991234",
      ddd_telefone_2: "65999991234",
      optante_pelo_simples: true,
      qsa: [{ nome_socio: "Fulano", cnpj_cpf_do_socio: "***123***" }],
    },
    "11222333000181",
  );
  assert.equal(result.values.legalName, "Empresa Exemplo Ltda.");
  assert.match(result.values.capital, /12\.500,50/);
  assert.equal(result.activities.length, 2);
  assert.equal(result.phones.length, 1);
  assert.equal(result.values.cep, "78005-000");
  assert.equal(result.values.regime, undefined);
  assert.equal(
    (result as unknown as Record<string, unknown>).people,
    undefined,
  );
});
test("CNPJ inválido e alfanumérico não usam endpoint numérico", async () => {
  await assert.rejects(() => lookupCnpj("00000000000000"), /válido/);
  await assert.rejects(() => lookupCnpj("12ABC34501DE35"), /alfanumérico/);
});
test("Cadastros antigos migram telefones sem perder anexos e aceitam CPF como inscrição do cliente", () => {
  const legacy = newCompany();
  legacy.values.phone = "(65) 3322-1234";
  legacy.values.mobile = "(65) 99999-1234";
  const raw = { ...legacy } as Partial<Company>;
  delete raw.phones;
  delete raw.payrollPeriods;
  delete raw.patPeriods;
  delete raw.esocialPeriods;
  const c = normalizeCompany(raw as Company);
  assert.equal(c.phones.length, 2);
  assert.equal(c.values.phone, undefined);
  assert.deepEqual(c.payrollPeriods, []);
  assert.equal(normalizeCompany(c).phones.length, 2);
  c.values.personType = "Pessoa física";
  c.values.cnpj = "529.982.247-25";
  c.values.legalName = "Cliente Teste";
  assert.deepEqual(validateCompany(c, [], false), {});
  c.values.cnpj = "11111111111";
  assert.ok(validateCompany(c, [], false).cnpj);
});
test("Parâmetros de pessoal validam vigências, percentuais e contagens; atividades concomitantes preservam configurações próprias", () => {
  const c = newCompany();
  c.values.cnpj = "11.222.333/0001-81";
  c.values.legalName = "Empresa";
  c.payrollPeriods = [
    {
      id: "a",
      values: {
        start: "2026-01",
        desoneration: "Sim",
        desonerationRate: "101",
        cnae: "6920-6/01",
      },
    },
    { id: "b", values: { start: "2026-03", cnae: "6920-6/01" } },
  ];
  c.patPeriods = [
    {
      id: "p",
      values: {
        adherent: "Sim",
        start: "2026-01-01",
        upToFive: "-1",
        basketRate: "120",
      },
    },
  ];
  let errors = validateCompany(c, [], false);
  assert.ok(errors["payrollPeriods.a.desonerationRate"]);
  assert.ok(errors["payrollPeriods.b.start"]);
  assert.ok(errors["patPeriods.p.upToFive"]);
  assert.ok(errors["patPeriods.p.basketRate"]);
  c.payrollPeriods[1].values.cnae = "6201-5/01";
  errors = validateCompany(c, [], false);
  assert.equal(errors["payrollPeriods.b.start"], undefined);
});

test("CNAE numérico iniciado em zero preserva os sete dígitos oficiais", () => {
  const result = mapCnpj(
    {
      razao_social: "Empresa rural",
      cnae_fiscal: 111301,
      cnae_fiscal_descricao: "Cultivo",
      cnaes_secundarios: [{ codigo: 0, descricao: "Não informado" }],
    },
    "11222333000181",
  );
  assert.equal(result.activities[0].cnae, "0111301");
  assert.equal(result.activities.length, 1);
});

test("Resposta com inscrição divergente é rejeitada", () => {
  assert.throws(
    () =>
      mapCnpj(
        { razao_social: "Empresa incorreta", cnpj: "04.252.011/0001-10" },
        "11222333000181",
      ),
    /inscrição diferente/,
  );
});
