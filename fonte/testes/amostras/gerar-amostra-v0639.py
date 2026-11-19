"""Amostra inventada da v0.6.39 (T0): tabela do Excel com linha de totais (rótulo e função por coluna),
coluna calculada e ordenação guardada. Uso: python3 gerar-amostra-v0639.py <saida.xlsx>"""
import sys
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo, TableColumn, TableFormula
from openpyxl.worksheet.filters import AutoFilter, SortState, SortCondition
wb = Workbook(); ws = wb.active; ws.title = 'Colheita'
ws.append(['Talhão', 'Fruta', 'Kg', 'Caixas'])
for r in [['T1', 'Mamão', 120], ['T2', 'Acerola', 45], ['T3', 'Mamão', 98], ['T4', 'Goiaba', 80]]:
    ws.append(r)
for i in range(2, 6): ws[f'D{i}'] = f'=Colheita[[#This Row],[Kg]]/20'
ws['A6'] = 'Total'; ws['C6'] = '=SUBTOTAL(109,Colheita[Kg])'; ws['D6'] = '=SUBTOTAL(101,Colheita[Caixas])'
t = Table(displayName='Colheita', ref='A1:D6', totalsRowCount=1)
t.tableColumns = [TableColumn(id=1, name='Talhão', totalsRowLabel='Total'), TableColumn(id=2, name='Fruta'),
                  TableColumn(id=3, name='Kg', totalsRowFunction='sum'), TableColumn(id=4, name='Caixas', totalsRowFunction='average')]
t.tableColumns[3].calculatedColumnFormula = TableFormula(attr_text='Colheita[[#This Row],[Kg]]/20')
t.autoFilter = AutoFilter(ref='A1:D5')
t.autoFilter.sortState = SortState(ref='A2:D5', sortCondition=[SortCondition(ref='C2:C5', descending=True)])
t.tableStyleInfo = TableStyleInfo(name='TableStyleMedium2', showRowStripes=True)
ws.add_table(t)
wb.save(sys.argv[1])
