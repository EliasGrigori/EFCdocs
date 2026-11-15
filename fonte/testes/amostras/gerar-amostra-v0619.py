"""Vértice Docs v0.6.19 "Tabelas vivas": planilha inventada (nenhum dado real).
Aba Coletas: tabela "Coletas" A1:E9 (TableStyleMedium2, linhas em tiras, filtro), coluna calculada em E (=C*D).
Aba Estoque: tabela "Estoque" A1:C7 com linha de totais (TableStyleLight9, SUBTOTAL), primeira coluna em destaque.
Aba Resumo: tabela "Metas" B2:D6 (TableStyleDark2, colunas em tiras, sem linhas em tiras).
Gera amostra-v0619.xlsx ao lado deste arquivo."""
from pathlib import Path
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo, TableColumn

wb = Workbook()
ws = wb.active
ws.title = 'Coletas'
ws.append(['Data', 'Ponto', 'Volume', 'Fator', 'Total'])
pontos = ['Poço 1', 'Poço 2', 'Caixa A', 'Caixa B', 'Torneira', 'Poço 1', 'Caixa A', 'Torneira']
for i, p in enumerate(pontos):
    r = i + 2
    ws.append([f'0{(i % 9) + 1}/03/2026', p, 10 + i * 3, 1.5 + (i % 3) * 0.5, f'=C{r}*D{r}'])
t1 = Table(displayName='Coletas', ref='A1:E9')
t1.tableStyleInfo = TableStyleInfo(name='TableStyleMedium2', showFirstColumn=False, showLastColumn=False, showRowStripes=True, showColumnStripes=False)
ws.add_table(t1)
for col, w in zip('ABCDE', (12, 12, 10, 8, 10)):
    ws.column_dimensions[col].width = w

ws2 = wb.create_sheet('Estoque')
ws2.append(['Item', 'Qtd', 'Valor'])
for nome, q, v in [('Frasco 500 ml', 40, 2.5), ('Luva P', 120, 0.4), ('Luva M', 90, 0.4), ('Reagente X', 6, 38.0), ('Fita pH', 15, 12.0)]:
    ws2.append([nome, q, v])
ws2.append(['Total', '=SUBTOTAL(109,Estoque[Qtd])', '=SUBTOTAL(109,Estoque[Valor])'])
t2 = Table(displayName='Estoque', ref='A1:C7', totalsRowCount=1)
t2.tableStyleInfo = TableStyleInfo(name='TableStyleLight9', showFirstColumn=True, showLastColumn=False, showRowStripes=True, showColumnStripes=False)
t2._initialise_columns()
for tc, nm in zip(t2.tableColumns, ('Item', 'Qtd', 'Valor')):
    tc.name = nm
t2.tableColumns[0].totalsRowLabel = 'Total'
t2.tableColumns[1].totalsRowFunction = 'sum'
t2.tableColumns[2].totalsRowFunction = 'sum'
t2.autoFilter.ref = 'A1:C6'
ws2.add_table(t2)
ws2.column_dimensions['A'].width = 16

ws3 = wb.create_sheet('Resumo')
ws3['B2'], ws3['C2'], ws3['D2'] = 'Mês', 'Meta', 'Feito'
for i, (m, a, b) in enumerate([('Jan', 30, 28), ('Fev', 30, 33), ('Mar', 35, 31), ('Abr', 35, 36)]):
    ws3.cell(row=3 + i, column=2, value=m); ws3.cell(row=3 + i, column=3, value=a); ws3.cell(row=3 + i, column=4, value=b)
t3 = Table(displayName='Metas', ref='B2:D6')
t3.tableStyleInfo = TableStyleInfo(name='TableStyleDark2', showFirstColumn=False, showLastColumn=False, showRowStripes=False, showColumnStripes=True)
ws3.add_table(t3)

wb.save(Path(__file__).with_name('amostra-v0619.xlsx'))
print('ok')
