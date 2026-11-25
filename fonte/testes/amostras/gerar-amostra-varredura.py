"""Gera testes/amostras/amostra-varredura.xlsx (24/11/2026, varredura da estabilização D-69 a D-75). Só dados inventados.
Aba Ficha: linhas 1 a 4 congeladas; mescla B10:F10; lista suspensa (50 a 100) em C12; imagem em C20; 120 linhas.
Aba Grande: 3000 linhas x 40 colunas com números. Aba Oculta (oculta) e Escondida (muito oculta).
Uso: python3 gerar-amostra-varredura.py [saída]"""
import sys, io
from openpyxl import Workbook
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.drawing.image import Image as XImg
from openpyxl.styles import PatternFill, Font, Alignment
from PIL import Image, ImageDraw
saida = sys.argv[1] if len(sys.argv) > 1 else 'amostra-varredura.xlsx'
wb = Workbook(); ws = wb.active; ws.title = 'Ficha'
ws['A1'] = 'FICHA DE TESTE'; ws.merge_cells('A1:H1'); ws['A1'].fill = PatternFill('solid', fgColor='2F5597'); ws['A1'].font = Font(color='FFFFFF', bold=True)
ws['A3'] = 'Nº'; ws['B3'] = '0102'; ws['E3'] = 'Data'; ws['F3'] = '24/11/2026'
ws.freeze_panes = 'A5'
ws['A10'] = 'Observação'; ws['B10'] = 'Texto longo da observação'; ws.merge_cells('B10:F10')
ws['B10'].alignment = Alignment(horizontal='left')
ws['B12'] = 'Peso'; dv = DataValidation(type='list', formula1='"' + ','.join(str(x) for x in range(50, 101, 5)) + '"'); ws.add_data_validation(dv); dv.add('C12')
for l in range(14, 121): ws.cell(l, 1, f'Item {l}'); ws.cell(l, 2, l * 3)
im = Image.new('RGB', (240, 140), (40, 80, 140)); d = ImageDraw.Draw(im); d.rectangle([20, 20, 220, 120], outline=(255, 255, 255), width=4)
b = io.BytesIO(); im.save(b, 'PNG'); b.seek(0); xi = XImg(b); ws.add_image(xi, 'C20')
g = wb.create_sheet('Grande')
for l in range(1, 3001):
    g.append([l * c for c in range(1, 41)])
o = wb.create_sheet('Oculta'); o['A1'] = 'aba oculta'; o.sheet_state = 'hidden'
e = wb.create_sheet('Escondida'); e['A1'] = 'aba muito oculta'; e.sheet_state = 'veryHidden'
wb.save(saida)
