"""Gera testes/amostras/amostra-v0646.xlsx (v0.6.46, D-75). Só dados inventados.
Parte da amostra-varredura.xlsx (linhas 1 a 4 congeladas, lista suspensa em C12) e troca a imagem por uma em D2, que começa
dentro das linhas congeladas e passa da linha fixa (240 x 140 px).
Uso: python3 gerar-amostra-v0646.py [entrada] [saída]"""
import sys, io
from openpyxl import load_workbook
from openpyxl.drawing.image import Image as XImg
from PIL import Image, ImageDraw
ent = sys.argv[1] if len(sys.argv) > 1 else 'amostra-varredura.xlsx'
saida = sys.argv[2] if len(sys.argv) > 2 else 'amostra-v0646.xlsx'
wb = load_workbook(ent); ws = wb['Ficha']; ws._images = []
im = Image.new('RGB', (240, 140), (180, 60, 40)); d = ImageDraw.Draw(im); d.rectangle([10, 10, 230, 130], outline=(255, 255, 255), width=4)
b = io.BytesIO(); im.save(b, 'PNG'); b.seek(0); ws.add_image(XImg(b), 'D2')
wb.save(saida)
