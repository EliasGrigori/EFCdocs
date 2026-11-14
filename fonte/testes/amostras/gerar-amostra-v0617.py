# Amostra INVENTADA da v0.6.17 (nenhum dado real): ficha de solicitação com campos do Cwork por nome de célula (efc_...),
# células mescladas (laboratório, coletor, identificação), data com formato de data, lista de 6 linhas e uma conta (F15).
from openpyxl import Workbook
from openpyxl.styles import Border, Side, Font, Alignment, PatternFill
from openpyxl.workbook.defined_name import DefinedName
wb = Workbook(); ws = wb.active; ws.title = 'Ficha'
fino = Side('thin', color='8D846C'); cx = Border(left=fino, right=fino, top=fino, bottom=fino)
ws.merge_cells('A1:F1'); ws['A1'] = 'Ficha de solicitação de análise (modelo inventado)'; ws['A1'].font = Font(bold=True, size=14); ws['A1'].alignment = Alignment(horizontal='center')
rot = Font(bold=True)
def campo(rotulo, ref_rot, ref_val, mescla=None, fmt=None, exemplo=None):
    ws[ref_rot] = rotulo; ws[ref_rot].font = rot
    if mescla: ws.merge_cells(mescla)
    if exemplo is not None: ws[ref_val] = exemplo
    if fmt: ws[ref_val].number_format = fmt
    faixa = mescla or ref_val
    for linha in (ws[faixa] if ':' in faixa else [[ws[faixa]]]):
        for c in linha: c.border = cx
campo('Laboratório', 'A3', 'B3', 'B3:D3', exemplo='(nome do laboratório)')
campo('OS', 'E3', 'F3')
campo('Data da coleta', 'A4', 'B4', fmt='DD/MM/YYYY')
campo('Amostras', 'E4', 'F4')
campo('Coletor', 'A5', 'B5', 'B5:D5')
campo('Caixas', 'E5', 'F5')
for i, t in enumerate(['Nº', 'Identificação', None, 'Data', 'Hora', 'Análise']):
    c = ws.cell(row=7, column=i + 1, value=t); c.font = rot; c.border = cx; c.fill = PatternFill('solid', fgColor='F2EEE4')
ws.merge_cells('B7:C7')
for r in range(8, 14):
    ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=3)
    for col in range(1, 7): ws.cell(row=r, column=col).border = cx
    ws.cell(row=r, column=4).number_format = 'DD/MM/YYYY'
ws['B8'] = '(exemplo)'
ws.merge_cells('C15:E15'); ws['C15'] = 'Linhas preenchidas'; ws['C15'].font = rot; ws['C15'].alignment = Alignment(horizontal='right'); ws['F15'] = '=COUNTA(B8:B13)'
for col, w in zip('ABCDEF', [16, 16, 10, 14, 10, 22]): ws.column_dimensions[col].width = w
nomes = {'efc_lab_nome': '$B$3:$D$3', 'efc_coleta_os': '$F$3', 'efc_coleta_data': '$B$4', 'efc_envio_amostras': '$F$4', 'efc_coleta_coletor': '$B$5:$D$5', 'efc_envio_caixas': '$F$5',
         'efc_amostras_n': '$A$8:$A$13', 'efc_amostras_identificacao': '$B$8:$B$13', 'efc_amostras_data': '$D$8:$D$13', 'efc_amostras_hora': '$E$8:$E$13', 'efc_amostras_analise': '$F$8:$F$13'}
for n, r in nomes.items(): wb.defined_names[n] = DefinedName(n, attr_text=f'Ficha!{r}')
ws.print_area = 'A1:F15'
wb.save('amostra-v0617.xlsx')
