# Amostra INVENTADA da v0.6.16 (nenhum dado real): painel congelado em B4 e lista suspensa em C4:C63 (defeito D-59).
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation
wb = Workbook(); ws = wb.active; ws.title = 'Lista'
ws['A1'] = 'Controle inventado'; ws.append([]); ws.append(['Dia', 'Hora', 'Ponto', 'Local', 'Valor'])
pontos = ['Ponto 1', 'Ponto 2', 'Ponto 3']
for i in range(60):
    ws.append([f'{(i % 28) + 1:02d}/01/2026', f'{7 + i % 10:02d}:{(i * 7) % 60:02d}', pontos[i % 3], ['Oficina', 'Refeitório', 'Galpão'][i % 3], round(0.1 + i * 0.01, 2)])
dv = DataValidation(type='list', formula1='"Ponto 1,Ponto 2,Ponto 3"', allow_blank=True); ws.add_data_validation(dv); dv.add('C4:C63')
ws.freeze_panes = 'B4'
for c, w in zip('ABCDE', [14, 10, 16, 16, 10]): ws.column_dimensions[c].width = w
wb.save('amostra-v0616.xlsx')
