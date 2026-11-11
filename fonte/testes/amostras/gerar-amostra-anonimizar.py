# Amostra INVENTADA para testar o anonimizador (nenhum dado real): tudo aqui é de mentira, de propósito "com cara de dado sensível".
from openpyxl import Workbook
from openpyxl.styles import Border, Side, Font, Alignment, PatternFill
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.comments import Comment
from openpyxl.drawing.image import Image as XImage
from openpyxl.cell.rich_text import CellRichText, TextBlock
from openpyxl.cell.text import InlineFont
from openpyxl.workbook.defined_name import DefinedName
from PIL import Image
import datetime, io
wb = Workbook(); ws = wb.active; ws.title = 'VENDAS'
wb.properties.creator = 'Fulano Inventado da Silva'; wb.properties.lastModifiedBy = 'Beltrana Exemplo'; wb.properties.title = 'Relatório secreto da Empresa Fictícia'
s = Side(style='thin', color='FF000000'); B = Border(left=s, right=s, top=s, bottom=s)
ws.merge_cells('A1:F2'); ws['A1'] = 'EMPRESA FICTÍCIA LTDA · CONTROLE DE VENDAS'; ws['A1'].font = Font(bold=True, size=16); ws['A1'].alignment = Alignment(horizontal='center', vertical='center')
tit = ['Cliente ', 'Código do\nPedido', 'Data', 'Valor (R$)', 2024, 'Situação']
for c, t in enumerate(tit, start=1):
    x = ws.cell(row=4, column=c, value=t); x.font = Font(bold=True, color='FFFFFFFF'); x.fill = PatternFill('solid', fgColor='FF2F6B4F'); x.border = B; x.alignment = Alignment(wrap_text=True)
ws['F4'] = CellRichText('Situ', TextBlock(InlineFont(b=True, color='FFFFFFFF'), 'ação'))
dados = [('Maria Exemplo de Souza', '0042', datetime.date(2026, 3, 5), 1520.75, 12, 'Aprovado'), ('João Inventado Lima', '0043', datetime.date(2026, 3, 9), 880.10, 7, 'Reprovado'), ('Ana Fictícia Rocha', '10457', datetime.date(2026, 4, 1), 43.5, 0, 'Aprovado'), ('Carlos Modelo Dias', '0099', datetime.date(2026, 4, 17), 2999.99, 1, 'Em análise')]
for r, d in enumerate(dados, start=5):
    for c, v in enumerate(d, start=1): ws.cell(row=r, column=c, value=v).border = B
    ws.cell(row=r, column=3).number_format = 'dd/mm/yyyy'; ws.cell(row=r, column=4).number_format = '#,##0.00'
ws['H5'] = datetime.time(8, 30); ws['H5'].number_format = 'hh:mm'
ws['H6'] = 26110318350; ws['H7'] = 0.04; ws['H7'].number_format = '0%'
t = Table(displayName='TabVendas', ref='A4:F8'); t.tableStyleInfo = TableStyleInfo(name='TableStyleMedium4', showRowStripes=True); ws.add_table(t)
ws['A10'] = 'Total aprovado'; ws['B10'] = '=SUMIF(TabVendas[Situação],"Aprovado",TabVendas[Valor (R$)])'
ws['A11'] = 'Maior'; ws['B11'] = '=IF(MAX(TabVendas[Valor (R$)])>2000,"Venda grande para Maria","normal")'
ws['A12'] = 'Formato'; ws['B12'] = '=TEXT(C5,"dd/mm/yyyy")'
dv = DataValidation(type='list', formula1='"Aprovado,Reprovado,Em análise"', allow_blank=True); dv.promptTitle = 'Situação do pedido'; dv.prompt = 'Escolha a situação combinada com a Maria'; dv.add('F5:F8'); ws.add_data_validation(dv)
ws['A5'].comment = Comment('Cliente indicado pelo Fulano Inventado', 'Fulano Inventado da Silva')
ws['A14'] = 'Site do cliente'; ws['A14'].hyperlink = 'https://empresa-ficticia-secreta.example.com/pedidos'
ws.freeze_panes = 'A5'; ws.column_dimensions['A'].width = 28; ws.column_dimensions['G'].width = 16; ws.column_dimensions['G'].hidden = True
ws.oddHeader.center.text = 'Empresa Fictícia · página &P de &N'
img = io.BytesIO(); Image.new('RGB', (120, 60), (200, 30, 30)).save(img, 'PNG'); img.seek(0); xi = XImage(img); ws.add_image(xi, 'H1')
w2 = wb.create_sheet('RESUMO'); w2['A1'] = 'Resumo por cliente'; w2['A2'] = "=VENDAS!A5"; w2['B2'] = '=VLOOKUP(A2,VENDAS!A5:D8,4,FALSE)'
wb.defined_names['MetaDoMes'] = DefinedName('MetaDoMes', attr_text='VENDAS!$D$5')
wb.save('amostra-anonimizar.xlsx')
