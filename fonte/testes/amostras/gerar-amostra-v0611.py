# Amostra INVENTADA da v0.6.11: mescladas com borda em todas as células (como o Excel grava "Todas as bordas" numa mesclada)
# e mesclada com borda só na célula do canto (a "caixinha" do D-17). Nenhum dado real.
from openpyxl import Workbook
from openpyxl.styles import Border, Side, Alignment, Font
wb = Workbook(); ws = wb.active; ws.title = 'MESCLAS'
fina = Side(style='thin', color='000000'); grossa = Side(style='medium', color='000000')
toda = Border(left=fina, right=fina, top=fina, bottom=fina)
for r in range(2, 5):
    for c in range(2, 5): ws.cell(row=r, column=c).border = toda
ws['B2'] = 'MESCLADA COM BORDA EM TODAS AS CÉLULAS'; ws['B2'].alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
ws.merge_cells('B2:D4')
ws['F2'] = 'SÓ O CANTO TEM BORDA'; ws['F2'].border = Border(left=grossa, right=grossa, top=grossa, bottom=grossa)
ws['F2'].alignment = Alignment(horizontal='center', vertical='center'); ws.merge_cells('F2:H3')
for col in 'BCDFGH': ws.column_dimensions[col].width = 14
for r in range(2, 5): ws.row_dimensions[r].height = 24
ws['B6'] = 'Normal com borda'; ws['B6'].border = toda; ws['C6'].border = toda
# filtro da ABA (sem tabela) com critério de data: o app guarda em fil.cx e devolve; se a pessoa mexer no filtro, avisa
import datetime as dt
from openpyxl.worksheet.filters import FilterColumn, Filters, DateGroupItem
fd = wb.create_sheet('FILTRO DATA'); fd.append(['Data', 'Lote'])
for i in range(10): fd.append([dt.datetime(2026, 10, 27) + dt.timedelta(days=i), 'L-%02d' % (i + 1)])
for r in range(2, 12): fd.cell(row=r, column=1).number_format = 'dd/mm/yyyy'
fd.auto_filter.ref = 'A1:B11'
fd.auto_filter.filterColumn.append(FilterColumn(colId=0, filters=Filters(dateGroupItem=[DateGroupItem(year=2026, month=11, dateTimeGrouping='month')])))
for r in range(2, 7): fd.row_dimensions[r].hidden = True  # 27 a 31 de outubro: ocultas pelo filtro
# v0.6.11.1 (D-28): tabela cujo primeiro título é só um espaço (" "), como na planilha de coletas do Elias
from openpyxl.worksheet.table import Table, TableStyleInfo
te = wb.create_sheet('TITULO ESPACO'); te.append([' ', 'Item', 'Qtd']); te.append(['x', 'Frasco', 12]); te.append(['', 'Tampa', 30])
t3 = Table(displayName='TabEspaco', ref='A1:C3'); t3.tableStyleInfo = TableStyleInfo(name='TableStyleLight9', showRowStripes=True); te.add_table(t3)
wb.save('amostra-v0611.xlsx')
