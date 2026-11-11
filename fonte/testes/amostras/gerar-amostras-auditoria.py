# Amostras INVENTADAS da Fase 0 (auditoria): (1) mescladas com borda em todas as células, tabela com título quebrado e congelamento; (2) planilha grande para medir desempenho.
from openpyxl import Workbook
from openpyxl.styles import Border, Side, PatternFill, Alignment, Font
from openpyxl.worksheet.table import Table, TableStyleInfo
import random
random.seed(7)
s = Side(style='thin', color='FF000000'); B = Border(left=s, right=s, top=s, bottom=s)
wb = Workbook(); ws = wb.active; ws.title = 'RELATORIO'
# cabeçalho de formulário com mescladas (cada célula com as 4 bordas, como o Excel grava)
for r in range(1, 6):
    for c in range(1, 15): ws.cell(row=r, column=c).border = B
ws.merge_cells('A1:B5'); ws.merge_cells('C1:K5'); ws['C1'] = 'RELATÓRIO DE ANÁLISE DE EXEMPLO'; ws['C1'].font = Font(bold=True, size=20); ws['C1'].alignment = Alignment(horizontal='center', vertical='center')
for i, t in enumerate(['FOR 0000 EXEMPLO LAB', 'Setor: Laboratório', 'Data da revisão: 01-Jan-24', 'Revisão: 00', 'Página 1 de 2'], start=1):
    ws.merge_cells(start_row=i, start_column=12, end_row=i, end_column=13); ws.cell(row=i, column=12, value=t)
tit = ['Nº Amostra', 'Semana', 'Cód. Ticket', 'Data\nColheita', 'Data\nAnálise', 'Turno', 'Hora da\nColeta', 'Hora da\nAnálise', 'Rastreabilidade', 'Etapa', 'Massa Total (g)', 'Massa Verde', '% Verde', 'Observações']
for c, t in enumerate(tit, start=1):
    x = ws.cell(row=7, column=c, value=t); x.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); x.font = Font(bold=True, color='FFFFFFFF'); x.fill = PatternFill('solid', fgColor='FF2F6B4F')
ws.row_dimensions[7].height = 40
for r in range(8, 60):
    ws.row_dimensions[r].height = 32
    vals = [600 + r, 45, 51900 + r, '03/11/2026', '03/11/2026', 'A', '08:00', '09:30', str(2611030000 + r), 'CAMPO', 800 + r * 3, 20 + r % 9, None, '']
    for c, v in enumerate(vals, start=1):
        x = ws.cell(row=r, column=c, value=v); x.alignment = Alignment(horizontal='center', vertical='center')
    ws.cell(row=r, column=13, value=f'=L{r}/K{r}').number_format = '0%'
t = Table(displayName='TabAnalises', ref='A7:N59'); t.tableStyleInfo = TableStyleInfo(name='TableStyleMedium4', showRowStripes=True); ws.add_table(t)
ws.freeze_panes = 'A8'
for c, w in zip('ABCDEFGHIJKLMN', [10, 9, 11, 12, 12, 9, 11, 11, 16, 14, 16, 16, 10, 36]): ws.column_dimensions[c].width = w
wb.save('amostra-auditoria.xlsx')

# planilha grande: 12.000 linhas x 30 colunas, bordas, cores, fórmulas, congelada
wb = Workbook(); ws = wb.active; ws.title = 'GRANDE'
for c in range(1, 31): ws.cell(row=1, column=c, value=f'Coluna {c}').font = Font(bold=True)
fill = PatternFill('solid', fgColor='FFEAF3EC')
for r in range(2, 12002):
    for c in range(1, 31):
        if c == 30: x = ws.cell(row=r, column=c, value=f'=SUM(B{r}:F{r})/G{r}')
        elif c in (1, 9, 10): x = ws.cell(row=r, column=c, value=f'Item {r}-{c}')
        else: x = ws.cell(row=r, column=c, value=round(random.random() * 1000, 2) + 1)
        x.border = B
        if r % 2 == 0: x.fill = fill
ws.freeze_panes = 'C2'
wb.save('amostra-grande.xlsx')
