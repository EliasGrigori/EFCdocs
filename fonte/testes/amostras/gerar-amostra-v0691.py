"""EFCdocs — gera testes/amostras/amostra-v0691.xlsx (DADOS INVENTADOS).
- aba COLETAS: uma tabela do Excel (TabColetas) com títulos que têm espaço no fim e quebra de linha, como os da planilha
  que trouxe o defeito (o Excel exige que o nome da coluna da tabela seja IGUAL ao texto da célula);
- aba RESUMO: fórmulas que já nascem com #REF! (referência apagada), como as 14.200 da planilha real.
Uso: python3 testes/amostras/gerar-amostra-v0691.py"""
import os
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo

SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'amostra-v0691.xlsx')
wb = Workbook()
ws = wb.active
ws.title = 'COLETAS'
cab = ['Nº Amostra', 'Data \nColeta', 'Hora da Coleta ', 'Ponto\nde coleta', 'Cloro (ppm)']
ws.append(cab)
for i in range(1, 9):
    ws.append([100 + i, '2026-11-0%d' % (1 + i % 5), '0%d:30' % (7 + i % 3), 'Ponto %d' % (1 + i % 4), round(0.8 + i * 0.07, 2)])
t = Table(displayName='TabColetas', ref='A1:E9')
t.tableStyleInfo = TableStyleInfo(name='TableStyleMedium9', showRowStripes=True)
ws.add_table(t)
for col, w in zip('ABCDE', (14, 14, 18, 14, 14)):
    ws.column_dimensions[col].width = w
rs = wb.create_sheet('RESUMO')
rs['A1'] = 'Resumo (amostra inventada)'
for r in range(3, 8):
    rs['A%d' % r] = '=IF(COLETAS!#REF!=0,"",COLETAS!#REF!)'
    rs['B%d' % r] = '=SUM(COLETAS!E2:E9)'
wb.save(SAIDA)
print('amostra:', SAIDA)
