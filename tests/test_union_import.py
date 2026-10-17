import unittest
from io import BytesIO
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import openpyxl
from api.union_import import parse_excel


class UnionImportTest(unittest.TestCase):
    def workbook(self):
        book = openpyxl.Workbook()
        sheet = book.active
        sheet.title = 'CNES'
        sheet.append(['CNPJ', 'Denominação', 'UF', 'Situação'])
        sheet.append(['04252011000110', 'Sindicato sintético', 'MT', 'Conforme arquivo'])
        sheet.append(['11222333000181', '=HYPERLINK("https://example.org", "Não executar")', 'SP', ''])
        stream = BytesIO()
        book.save(stream)
        return stream.getvalue()

    def test_xlsx_preserves_text_zeroes_and_marks_formula_without_executing(self):
        result = parse_excel(self.workbook())
        self.assertEqual(result['sheets'][0]['rows'][1][0], '04252011000110')
        self.assertEqual(result['sheets'][0]['rows'][2][1], '#FORMULA_OU_ERRO')
        self.assertEqual(len(result['sha256']), 64)

    def test_reads_xls_without_assuming_column_order(self):
        result = parse_excel((Path(__file__).parent/'fixtures/company-import.xls').read_bytes())
        self.assertEqual(len(result['sheets']), 1)
        self.assertGreater(len(result['sheets'][0]['rows']), 1)

    def test_rejects_non_excel_zip_and_oversized_payload(self):
        for value in [b'', b'<html>invalid</html>', b'x'*(4*1024*1024+1)]:
            with self.assertRaises(ValueError):
                parse_excel(value)
        stream = BytesIO()
        with ZipFile(stream, 'w', ZIP_DEFLATED) as archive:
            archive.writestr('not-excel', 'test')
        with self.assertRaises(ValueError):
            parse_excel(stream.getvalue())
