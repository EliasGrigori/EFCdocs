"""Amostra inventada da v0.6.40 (T2, um filtro por tabela): na mesma aba, uma tabela filtrada (Pomar), uma tabela com setas
sem critério (Estoque), uma tabela sem setas (Lotes) e um filtro comum da aba fora das tabelas.
Uso: python3 gerar-amostra-v0640.py <saida.xlsx>"""
import sys
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.filters import AutoFilter, FilterColumn, Filters
wb = Workbook(); ws = wb.active; ws.title = 'Campo'
ws.append(['Talhão', 'Fruta', 'Kg'])
for r in [['T1', 'Mamão', 120], ['T2', 'Acerola', 45], ['T3', 'Mamão', 98], ['T4', 'Goiaba', 80], ['T5', 'Mamão', 60]]: ws.append(r)
t = Table(displayName='Pomar', ref='A1:C6')
t.autoFilter = AutoFilter(ref='A1:C6', filterColumn=[FilterColumn(colId=1, filters=Filters(filter=['Mamão']))])
t.tableStyleInfo = TableStyleInfo(name='TableStyleMedium2', showRowStripes=True)
ws.add_table(t)
for l in (3, 5): ws.row_dimensions[l].hidden = True
for i, r in enumerate([['Item', 'Qtd'], ['Caixa', 30], ['Sacola', 12], ['Etiqueta', 500]]):
    ws.cell(9 + i, 1, r[0]); ws.cell(9 + i, 2, r[1])
t2 = Table(displayName='Estoque', ref='A9:B12'); t2.autoFilter = AutoFilter(ref='A9:B12')
t2.tableStyleInfo = TableStyleInfo(name='TableStyleLight9', showRowStripes=True); ws.add_table(t2)
for i, r in enumerate([['Lote', 'Data'], ['L1', 'seg'], ['L2', 'ter']]):
    ws.cell(15 + i, 1, r[0]); ws.cell(15 + i, 2, r[1])
t3 = Table(displayName='Lotes', ref='A15:B17'); t3.tableStyleInfo = TableStyleInfo(name='TableStyleLight1', showRowStripes=True); ws.add_table(t3)
for i, r in enumerate([['Ponto', 'Valor'], ['Poço', 7.1], ['Rede', 7.4], ['Poço', 6.9], ['Caixa', 7.0], ['Rede', 7.2]]):
    ws.cell(20 + i, 1, r[0]); ws.cell(20 + i, 2, r[1])
ws.auto_filter.ref = 'A20:B25'
ws.auto_filter.add_filter_column(0, ['Poço'])
for l in (22, 24, 25): ws.row_dimensions[l].hidden = True
wb.save(sys.argv[1])
# o openpyxl sempre põe <autoFilter> na tabela; a Lotes fica sem setas (como "Botão de filtro" desmarcado no Excel)
import re, zipfile, io
with zipfile.ZipFile(sys.argv[1]) as z: partes = [(i, z.read(i.filename)) for i in z.infolist()]
with zipfile.ZipFile(sys.argv[1], 'w', zipfile.ZIP_DEFLATED) as z:
    for i, b in partes:
        if b'name="Lotes"' in b and i.filename.startswith('xl/tables/'): b = re.sub(rb'<autoFilter[^>]*/>', b'', b)
        z.writestr(i, b)
