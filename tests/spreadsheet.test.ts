import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseSpreadsheet } from "../src/features/unions/spreadsheet";
import { detectImportStart } from "../src/features/unions/import-model";
const hash = "a".repeat(64);
const bytes = (text: string) => new TextEncoder().encode(text).buffer;
test("Excel local: XLS binário e XLSX mantêm zeros, acentos e detectam o cabeçalho depois do título", async () => {
  for (const name of ["union-legacy.xls", "union-import.xlsx"]) {
    const file = await readFile(new URL(`./fixtures/${name}`, import.meta.url));
    const book = parseSpreadsheet(Uint8Array.from(file).buffer, hash);
    const start = detectImportStart(book);
    assert.equal(start.header, name.endsWith(".xlsx") ? 0 : 2);
    const row = book.sheets[start.sheet].rows[start.header + 1];
    assert.equal(row[Number(start.mapping.cnpj)], "04252011000110");
    assert.match(row[Number(start.mapping.title)], /Sindicato/);
  }
});
test("XLS exportado como HTML e XML Spreadsheet 2003 são lidos sem servidor", () => {
  const html =
    '<html><head><meta charset="utf-8"></head><body><table><tr><th>CNPJ</th><th>Denominação</th></tr><tr><td>04252011000110</td><td>Sindicato de ação</td></tr></table></body></html>';
  const xml =
    '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Entidades"><Table><Row><Cell><Data ss:Type="String">CNPJ</Data></Cell><Cell><Data ss:Type="String">Denominação</Data></Cell></Row><Row><Cell><Data ss:Type="String">04252011000110</Data></Cell><Cell><Data ss:Type="String">Sindicato XML</Data></Cell></Row></Table></Worksheet></Workbook>';
  for (const text of [html, xml]) {
    const book = parseSpreadsheet(bytes(text), hash);
    assert.equal(book.sheets[0].rows[1][0], "04252011000110");
    assert.match(book.sheets[0].rows[1][1], /Sindicato/);
  }
});
test("Leitor rejeita página de erro disfarçada de XLS, ZIP incompleto e XML com entidades", () => {
  assert.throws(
    () => parseSpreadsheet(bytes("<html>Não autorizado</html>"), hash),
    /não contém/,
  );
  assert.throws(
    () => parseSpreadsheet(new Uint8Array([80, 75, 3, 4]).buffer, hash),
    /incompleto/,
  );
  assert.throws(
    () =>
      parseSpreadsheet(
        bytes('<!DOCTYPE Workbook [<!ENTITY x "x">]><Workbook/>'),
        hash,
      ),
    /entidades/,
  );
});
