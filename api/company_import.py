"""Read the seven-column legacy XLS report without executing formulas or macros.
Files are processed in memory and are not persisted or logged.
"""
from datetime import datetime
from hashlib import sha256
from http.server import BaseHTTPRequestHandler
import json
import re
import unicodedata
import xlrd

MAX_BYTES = 4 * 1024 * 1024
MAX_ROWS = 1000


def normalized(value):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFD', str(value)).encode('ascii', 'ignore').decode().lower())


def parse_xls(data):
    if not data or len(data) > MAX_BYTES:
        raise ValueError('Selecione um arquivo XLS de até 4 MB.')
    if not data.startswith(bytes.fromhex('D0CF11E0A1B11AE1')):
        raise ValueError('O arquivo não é uma planilha XLS binária. Use XLS ou o JSON de importação preparado.')
    try:
        book = xlrd.open_workbook(file_contents=data, on_demand=True, formatting_info=True)
    except Exception as error:
        raise ValueError('Não foi possível ler o XLS. Confira se o arquivo está íntegro e sem senha.') from error
    try:
        if book.nsheets != 1:
            raise ValueError('Envie uma planilha com uma única aba para evitar importar dados de outro relatório.')
        sheet = book.sheet_by_index(0)
        if sheet.nrows < 2 or sheet.nrows > MAX_ROWS + 1 or sheet.ncols < 7 or sheet.ncols > 20:
            raise ValueError('A planilha deve conter cabeçalho, até 1.000 cadastros e as sete colunas combinadas.')
        headers = [normalized(sheet.cell_value(0, i)) for i in range(7)]
        accepted = [set(['codigo']), set(['razaosocial']), set(['tipoinsc', 'tipodeinscricao', 'tipoinscricao']), set(['inscricao']), set(['status']), set(['datainativacao', 'datadeinativacao']), set(['cnaepreponderante'])]
        if any(value not in allowed for value, allowed in zip(headers, accepted)):
            raise ValueError('Use a sequência: Código, Razão Social, Tipo de Inscrição, Inscrição, Status, Data de Inativação, CNAE Preponderante.')
        if any(sheet.cell_value(r, c) not in ('', None) for r in range(sheet.nrows) for c in range(7, sheet.ncols)):
            raise ValueError('Existem dados em colunas extras. Exporte somente as sete colunas do cadastro.')
        rows, errors = [], []
        for index in range(1, sheet.nrows):
            values = sheet.row_values(index)[:7]
            if not any(value not in ('', None) for value in values):
                continue
            try:
                if any(sheet.cell(index, c).ctype == xlrd.XL_CELL_ERROR for c in range(7)):
                    raise ValueError('Há uma célula com erro do Excel.')
                def string(column):
                    cell = sheet.cell(index, column)
                    if cell.value in ('', None):
                        return ''
                    if cell.ctype == xlrd.XL_CELL_NUMBER:
                        if not float(cell.value).is_integer():
                            raise ValueError('Código e inscrição numéricos devem ser inteiros.')
                        value = str(int(cell.value))
                        fmt = book.format_map.get(book.xf_list[cell.xf_index].format_key) if cell.xf_index < len(book.xf_list) else None
                        if fmt and re.fullmatch('0+', fmt.format_str):
                            value = value.zfill(len(fmt.format_str))
                        return value
                    return str(cell.value).strip()
                kind = string(2).upper()
                registration = string(3)
                if sheet.cell(index, 3).ctype == xlrd.XL_CELL_NUMBER and kind in ('CPF', 'CNPJ'):
                    registration = registration.zfill(11 if kind == 'CPF' else 14)
                inactive = sheet.cell(index, 5)
                date = ''
                if inactive.value not in ('', None):
                    if inactive.ctype == xlrd.XL_CELL_DATE:
                        date = xlrd.xldate_as_datetime(inactive.value, book.datemode).date().isoformat()
                    else:
                        raw = string(5)
                        for fmt in ('%d/%m/%Y', '%Y-%m-%d'):
                            try:
                                date = datetime.strptime(raw, fmt).date().isoformat()
                                break
                            except ValueError:
                                pass
                        if not date:
                            raise ValueError('Data de inativação inválida.')
                rows.append({'line': index + 1, 'code': string(0), 'legalName': string(1), 'registrationType': kind, 'registration': registration, 'status': string(4), 'inactiveAt': date, 'predominantCnae': string(6)})
            except (ValueError, xlrd.XLDateError) as error:
                errors.append({'line': index + 1, 'message': str(error)})
        return {'format': 'nexo-company-import-v1', 'source': {'name': 'Planilha de empresas', 'sha256': sha256(data).hexdigest()}, 'rows': rows, 'errors': errors}
    finally:
        book.release_resources()


class handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def do_POST(self):
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if size <= 0 or size > MAX_BYTES:
                raise ValueError('Selecione um arquivo XLS de até 4 MB.')
            if self.headers.get('Content-Type', '').split(';')[0] not in ('application/octet-stream', 'application/vnd.ms-excel'):
                raise ValueError('Formato de envio inválido.')
            payload = parse_xls(self.rfile.read(size))
            status = 200
        except ValueError as error:
            payload, status = {'error': str(error)}, 400
        except Exception:
            payload, status = {'error': 'Não foi possível processar a planilha. Tente o JSON preparado ou confira o arquivo.'}, 422
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
