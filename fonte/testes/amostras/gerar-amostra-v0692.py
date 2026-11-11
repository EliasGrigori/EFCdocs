# Amostra INVENTADA da v0.6.9.2 (nenhum dado real).
# BORDAS: células vazias, só com borda (C2:E4) e bem longe dos dados (CV1:DF5); cor de fundo vazia longe (DA7:DC8).
# CONGELADA: aba com o congelamento maior que a tela do celular (D-10).
# OCULTA: coluna G oculta com largura 16.   REF: fórmulas que o Excel já marcou com #REF!, algumas que o EFCdocs consegue ler.
from openpyxl import Workbook
from openpyxl.styles import Border, Side, PatternFill
wb = Workbook()
ws = wb.active
ws.title = 'BORDAS'
s = Side(style='thin', color='FF000000')
b = Border(left=s, right=s, top=s, bottom=s)
ws['A1'] = 'Controle'
ws['H1'] = 'Total'
ws['H2'] = 10
for r in range(1, 6):
    for c in range(100, 111):  # CV..DF
        ws.cell(row=r, column=c).border = b
for r in range(2, 5):
    for c in range(3, 6):  # C..E
        ws.cell(row=r, column=c).border = b
for r in range(7, 9):
    for c in range(105, 108):  # DA..DC
        ws.cell(row=r, column=c).fill = PatternFill('solid', fgColor='FFFFE699')
ws.column_dimensions['G'].width = 16
ws.column_dimensions['G'].hidden = True
r = wb.create_sheet('REF')
r['A1'] = 5
r['B1'] = '=SUM(#REF!)'
r['B2'] = '=#REF!+1'
r['B3'] = '=IF(A1>0,#REF!,0)'
r['B4'] = '=SUM(A1,2)'
# CONGELADA: painel congelado grande (45 linhas e 2 colunas), como no celular: ele ocupa a tela toda e a parte que rola não aparece.
g = wb.create_sheet('CONGELADA')
for i in range(1, 80):
    g.cell(row=i, column=1, value=f'Linha {i}')
    g.cell(row=i, column=2, value=i * 3)
    g.cell(row=i, column=3, value=i * 7)
g.freeze_panes = 'C46'
wb.save('amostra-v0692.xlsx')
