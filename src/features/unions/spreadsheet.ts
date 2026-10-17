import { read, utils, type CellObject } from "@e965/xlsx";
import type { Workbook } from "./import-model";
export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;
const MAX_ROWS = 50001,
  MAX_COLUMNS = 80,
  MAX_CELLS = 1200000;
function checkZip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0)
    throw new Error("Arquivo XLSX incompleto. Baixe a planilha novamente.");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true),
    total = 0,
    excel = false;
  if (count > 2000 || count === 65535)
    throw new Error("Planilha compactada excede os limites de leitura.");
  for (let i = 0; i < count; i++) {
    if (
      offset + 46 > bytes.length ||
      view.getUint32(offset, true) !== 0x02014b50
    )
      throw new Error("Estrutura do XLSX inválida.");
    const length = view.getUint16(offset + 28, true),
      extra = view.getUint16(offset + 30, true),
      comment = view.getUint16(offset + 32, true),
      size = view.getUint32(offset + 24, true);
    if (view.getUint16(offset + 8, true) & 1)
      throw new Error(
        "A planilha está protegida por senha. Salve uma cópia sem senha.",
      );
    total += size;
    if (size === 0xffffffff || total > 64 * 1024 * 1024)
      throw new Error(
        "Planilha excede 64 MB de dados descompactados. Divida o arquivo em partes.",
      );
    if (offset + 46 + length + extra + comment > bytes.length)
      throw new Error("Arquivo XLSX incompleto.");
    const name = new TextDecoder().decode(
      bytes.subarray(offset + 46, offset + 46 + length),
    );
    if (name === "[Content_Types].xml") excel = true;
    offset += 46 + length + extra + comment;
  }
  if (!excel)
    throw new Error("O arquivo selecionado não é uma planilha Excel XLSX.");
}
function textOf(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe)
    return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff)
    return new TextDecoder("utf-16be").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
function cellText(cell: CellObject | undefined): string {
  if (!cell) return "";
  if (cell.f || cell.t === "e") return "#FORMULA_OU_ERRO";
  if (cell.v === undefined || cell.v === null) return "";
  if (
    cell.t === "n" &&
    typeof cell.v === "number" &&
    Number.isInteger(cell.v)
  ) {
    const zeros =
      typeof cell.z === "string" && /^0+$/.test(cell.z) ? cell.z.length : 0;
    return String(cell.v).padStart(zeros, "0");
  }
  return String(cell.v).trim();
}
export function parseSpreadsheet(
  buffer: ArrayBuffer,
  sha256: string,
): Workbook {
  const bytes = new Uint8Array(buffer);
  if (!bytes.length || bytes.length > MAX_IMPORT_BYTES)
    throw new Error("Selecione uma planilha de até 20 MB.");
  const ole = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1].every(
    (v, i) => bytes[i] === v,
  );
  const zip = bytes[0] === 0x50 && bytes[1] === 0x4b;
  let input: ArrayBuffer | string = buffer;
  if (zip) checkZip(bytes);
  else if (!ole) {
    const text = textOf(bytes);
    if (/<!DOCTYPE[^>]+\[|<!ENTITY/i.test(text))
      throw new Error("O XML contém definições de entidades não permitidas.");
    if (!/<table[\s>]/i.test(text) && !/<(?:\w+:)?Workbook[\s>]/i.test(text))
      throw new Error(
        "O arquivo não contém uma tabela Excel reconhecida. Confira se o download foi concluído.",
      );
    input = text;
  }
  let book;
  try {
    book = read(input, {
      type: typeof input === "string" ? "string" : "array",
      raw: true,
      cellFormula: true,
      cellHTML: false,
      cellText: false,
      cellNF: true,
      bookVBA: false,
      bookDeps: false,
      bookFiles: false,
      sheetRows: MAX_ROWS + 1,
    });
  } catch {
    throw new Error(
      "Não foi possível abrir a planilha. Confira se está íntegra e sem senha. XLS, XLSX e tabelas HTML/XML exportadas como XLS são aceitos.",
    );
  }
  if (book.SheetNames.length > 12)
    throw new Error(
      "Limite de 12 abas por arquivo. Salve apenas as abas de dados.",
    );
  let cells = 0;
  const sheets: Workbook["sheets"] = [];
  for (const name of book.SheetNames) {
    const sheet = book.Sheets[name],
      ref = sheet["!fullref"] || sheet["!ref"];
    if (!ref) continue;
    const range = utils.decode_range(ref);
    if (range.e.r >= MAX_ROWS || range.e.c >= MAX_COLUMNS)
      throw new Error(
        "A planilha deve ter até 50.000 linhas de dados e 80 colunas. Divida o arquivo ou remova linhas/colunas vazias formatadas.",
      );
    cells += (range.e.r + 1) * (range.e.c + 1);
    if (cells > MAX_CELLS)
      throw new Error(
        "A planilha excede 1,2 milhão de células. Divida o arquivo em partes.",
      );
    const rows: string[][] = [];
    for (let r = 0; r <= range.e.r; r++) {
      const row: string[] = [];
      for (let c = 0; c <= range.e.c; c++)
        row.push(cellText(sheet[utils.encode_cell({ r, c })]));
      rows.push(row);
    }
    if (rows.some((row) => row.some(Boolean))) sheets.push({ name, rows });
  }
  if (!sheets.length)
    throw new Error("A planilha não contém dados para importar.");
  return { sheets, sha256 };
}
