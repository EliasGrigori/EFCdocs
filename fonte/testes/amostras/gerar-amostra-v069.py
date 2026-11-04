"""EFCdocs — gera testes/amostras/amostra-v069.xlsx (DADOS INVENTADOS).
Imita a ESTRUTURA de um relatório de análises (sem nenhum dado real):
- aba RESUMO: congelada nos DOIS sentidos (xSplit=8, ySplit=7), como a planilha que trouxe o problema;
  cabeçalho alto nas linhas 1 a 5 (mescladas), coluna F oculta e coluna H de 0,1 de largura (quase invisível),
  linhas 8 a 12 ocultas logo abaixo das congeladas e muitas linhas de dados;
- aba LARGURAS: colunas de larguras diferentes, para arrastar a divisa com várias selecionadas.
Uso: python3 testes/amostras/gerar-amostra-v069.py"""
import os
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, 'amostra-v069.xlsx')

CAB = ['Data Colheita', 'Data Análise', 'Hora da Coleta', 'Hora da Análise', 'Rastreabilidade', 'Oculta',
       'Etapa', 'Fina', 'Área', 'Variedade', '% Verde', '% Madura', 'Brix', 'Vitamina C', 'Razão', 'Acidez', 'Situação']
FINA = Side(style='thin', color='FF9FB6C4')
BORDA = Border(left=FINA, right=FINA, top=FINA, bottom=FINA)


def resumo(ws):
    ws.merge_cells('A1:E5')
    ws['A1'] = 'RELATÓRIO DE ANÁLISE (amostra inventada)'
    ws['A1'].font = Font(size=18, bold=True)
    ws['A1'].alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    ws.merge_cells('I1:Q5')
    ws['I1'] = 'RELATÓRIO DE ANÁLISE (amostra inventada)'
    ws['I1'].font = Font(size=18, bold=True)
    ws['I1'].alignment = Alignment(horizontal='center', vertical='center')
    for i in range(1, 6):
        ws.row_dimensions[i].height = 26
    ws.row_dimensions[6].height = 20
    ws.row_dimensions[7].height = 34
    for i, nome in enumerate(CAB, start=1):
        cel = ws.cell(row=7, column=i, value=nome)
        cel.font = Font(bold=True)
        cel.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cel.fill = PatternFill('solid', fgColor='FFEDF2F7')
        cel.border = BORDA
    # dados inventados
    for n in range(8, 420):
        ws.cell(row=n, column=1, value='0%d/03/2026' % (1 + n % 9))
        ws.cell(row=n, column=2, value='0%d/03/2026' % (1 + n % 9))
        ws.cell(row=n, column=3, value='%02d:%02d' % (6 + n % 10, n % 60))
        ws.cell(row=n, column=4, value='%02d:%02d' % (8 + n % 10, (n * 7) % 60))
        ws.cell(row=n, column=5, value=2600000000 + n)
        ws.cell(row=n, column=7, value='CAMPO' if n % 2 else 'PACKING')
        ws.cell(row=n, column=9, value='AREA-%03d' % (n % 40))
        ws.cell(row=n, column=10, value='VAR %d' % (n % 5))
        ws.cell(row=n, column=13, value=round(6 + (n % 30) / 10, 2))
        ws.cell(row=n, column=14, value=round(2800 + (n % 90) * 11.5, 2))
        ws.cell(row=n, column=15, value='=SE(M%d=0;"";N%d/M%d)' % (n, n, n))
        ws.cell(row=n, column=16, value=round(1.2 + (n % 8) / 10, 2))
        ws.cell(row=n, column=17, value='Aprovado' if n % 3 else 'Reter')
    # linhas ocultas logo abaixo das congeladas
    for n in range(8, 13):
        ws.row_dimensions[n].hidden = True
    ws.column_dimensions['F'].hidden = True
    ws.column_dimensions['F'].width = 8.9
    ws.column_dimensions['H'].width = 0.109375  # quase invisível, como no arquivo que deu problema
    for letra, larg in [('A', 16.3), ('B', 13.5), ('C', 11.4), ('D', 11.4), ('E', 18.3), ('G', 15.5),
                        ('I', 12.6), ('J', 14.5), ('K', 14), ('L', 15.3), ('M', 10), ('N', 13), ('O', 12),
                        ('P', 10), ('Q', 12)]:
        ws.column_dimensions[letra].width = larg
    ws.freeze_panes = 'I8'  # congela 8 colunas e 7 linhas
    ws.sheet_view.zoomScale = 80


def larguras(ws):
    ws['A1'] = 'Arraste a divisa com várias colunas selecionadas'
    for i, larg in enumerate([9, 14, 9, 20, 9, 30, 9], start=1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = larg
        ws.cell(row=2, column=i, value='col %d' % i)
    for n in range(3, 40):
        ws.row_dimensions[n].height = 15 + (n % 4) * 6
        ws.cell(row=n, column=1, value=n)


wb = Workbook()
resumo(wb.active)
wb.active.title = 'RESUMO'
larguras(wb.create_sheet('LARGURAS'))
wb.save(SAIDA)
print('gerado:', SAIDA)
