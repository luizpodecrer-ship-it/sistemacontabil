"""Run with Python and xlrd installed: python -m unittest discover -s tests -p 'test_*.py'."""
import unittest
from pathlib import Path
from api.company_import import parse_xls


class CompanyImportTest(unittest.TestCase):
    def test_synthetic_xls_preserves_zeroes_and_excel_dates(self):
        result = parse_xls((Path(__file__).parent / 'fixtures/company-import.xls').read_bytes())
        self.assertEqual(result['errors'], [])
        self.assertEqual(len(result['rows']), 1)
        row = result['rows'][0]
        self.assertEqual(row['code'], '0015')
        self.assertEqual(row['registration'], '04252011000110')
        self.assertEqual(row['inactiveAt'], '2025-01-15')
        self.assertEqual(row['predominantCnae'], '0111301 - Cultivo de arroz')

    def test_rejects_non_xls_and_oversized_input(self):
        for data in (b'', b'<html>not a spreadsheet</html>', b'x' * (4 * 1024 * 1024 + 1)):
            with self.assertRaises(ValueError):
                parse_xls(data)
