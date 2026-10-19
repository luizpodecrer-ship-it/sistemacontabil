import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultOffice, defaultPlatform } from "../src/features/branding/model";
import {
  exportIdentity,
  importIdentity,
  identityFileLimit,
} from "../src/features/branding/transfer";

test("Transferência preserva todos os textos, imagens e ajustes sem dados de autenticação", () => {
  const logo =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=";
  const brand = {
    ...defaultPlatform,
    name: "Nexopen",
    loginTitle: "Olá! Seja bem-vindo!",
    loginHeadline: "Plataforma Contábil\nde Alta Performance",
    loginDescription: "Empresas, documentos e prazos conectados.",
    loginFormFooter: "",
    logo,
    icon: logo,
    loginLogo: logo,
    loginIcon: logo,
    loginIconSize: "120",
    loginLogoAlign: "right",
    menuLogoSize: "96",
  };
  const contents = exportIdentity(brand, "platform");
  assert.deepEqual(importIdentity(contents, "platform"), brand);
  assert.deepEqual(Object.keys(JSON.parse(contents)).sort(), [
    "branding",
    "exportedAt",
    "format",
    "scope",
  ]);
  assert.deepEqual(
    importIdentity(exportIdentity(defaultOffice, "office"), "office"),
    defaultOffice,
  );
});

test("Importação rejeita outro tipo de identidade, campos estranhos, texto inválido e imagens externas", () => {
  const file = JSON.parse(exportIdentity(defaultPlatform, "platform"));
  assert.throws(
    () => importIdentity(JSON.stringify(file), "office"),
    /escritório/,
  );
  for (const change of [
    { service_role: "untrusted" },
    { loginTitle: "" },
    { loginButton: 3 },
    { loginPanelColor: "red;display:none" },
    { loginIconSize: "900" },
    { loginLogo: "https://example.com/logo.png" },
    { logo: "data:image/png;base64,YWJj" },
    { loginDescription: "x".repeat(601) },
  ]) {
    assert.throws(() =>
      importIdentity(
        JSON.stringify({
          ...file,
          branding: { ...defaultPlatform, ...change },
        }),
        "platform",
      ),
    );
  }
  assert.throws(() => importIdentity("not JSON", "platform"));
  assert.throws(() =>
    importIdentity(" ".repeat(identityFileLimit + 1), "platform"),
  );
  assert.throws(() =>
    importIdentity(JSON.stringify({ ...file, branding: {} }), "platform"),
  );
});

test("Importação de identidade antiga preenche apenas campos novos ausentes e valida dimensões", () => {
  const { menuLogoSize: _, ...oldBrand } = defaultPlatform;
  const wrap = (branding: unknown) =>
    JSON.stringify({
      format: "nexopen-identity-v1",
      scope: "platform",
      branding,
    });
  assert.equal(
    (importIdentity(wrap(oldBrand), "platform") as typeof defaultPlatform)
      .menuLogoSize,
    "64",
  );
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
  const dims = Buffer.alloc(8);
  dims.writeUInt32BE(501, 0);
  dims.writeUInt32BE(250, 4);
  const logo = `data:image/png;base64,${Buffer.concat([png, dims]).toString("base64")}`;
  assert.throws(
    () => importIdentity(wrap({ ...defaultPlatform, logo }), "platform"),
    /500/,
  );
});
