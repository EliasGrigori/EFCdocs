# Amostra INVENTADA da v0.6.10 (rede de segurança): reproduz, com dado inventado, os 4 defeitos de ida e volta que a rede
# achou na planilha anonimizada do Elias. Nenhum dado real.
#   D-20  tabela cujo título é um número (2024)             -> aba TITULO, tabela TabAnos
#   D-22  nome de aba com espaço no fim                     -> aba "Resumo "
#   D-23  colunas ocultas até o fim da aba (AY até XFD)     -> aba Coletas
#   D-24  filtro por mês na tabela + SUBTOTAL que depende dele -> aba Coletas (TabColetas) e "Resumo "!B2
import datetime as dt
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.filters import AutoFilter, FilterColumn, Filters, DateGroupItem
from openpyxl.utils import get_column_letter

wb = Workbook(); ws = wb.active; ws.title = 'Coletas'
ws.append(['Data', 'Ponto', 'Cloro (mg/L)'])
pontos = ['Poço 1', 'Reservatório', 'Torneira A', 'Torneira B']
d0 = dt.datetime(2026, 10, 20)
for i in range(30):
    ws.append([d0 + dt.timedelta(days=i), pontos[i % 4], round(0.4 + (i % 7) * 0.15, 2)])
for r in range(2, 32): ws.cell(row=r, column=1).number_format = 'dd/mm/yyyy'
t = Table(displayName='TabColetas', ref='A1:C31'); t.tableStyleInfo = TableStyleInfo(name='TableStyleMedium2', showRowStripes=True)
# filtro por mês: só novembro de 2026 aparece; as linhas de outubro ficam ocultas PELO FILTRO
t.autoFilter = AutoFilter(ref='A1:C31', filterColumn=[FilterColumn(colId=0, filters=Filters(dateGroupItem=[DateGroupItem(year=2026, month=11, dateTimeGrouping='month')]))])
ws.add_table(t)
for i in range(30):
    if (d0 + dt.timedelta(days=i)).month != 11: ws.row_dimensions[i + 2].hidden = True
# colunas ocultas da AY até o fim da aba
ws.column_dimensions.group('AY', 'XFD', hidden=True)

rs = wb.create_sheet('Resumo ')
rs['A1'] = 'Indicador'; rs['B1'] = 'Valor'
rs['A2'] = 'Soma do cloro (só o que o filtro mostra)'; rs['B2'] = '=SUBTOTAL(9,Coletas!C2:C31)'
rs['A3'] = 'Soma do cloro (todas as linhas)'; rs['B3'] = '=SUM(Coletas!C2:C31)'
rs.column_dimensions['A'].width = 42

ta = wb.create_sheet('TITULO')
ta.append(['Indicador', 2024, 2025])
ta.append(['Coletas', 120, 135]); ta.append(['Fora do padrão', 4, 2])
t2 = Table(displayName='TabAnos', ref='A1:C3'); t2.tableStyleInfo = TableStyleInfo(name='TableStyleLight9', showRowStripes=True); ta.add_table(t2)
wb.save('amostra-v0610.xlsx')
