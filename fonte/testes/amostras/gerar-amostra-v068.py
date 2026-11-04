"""EFCdocs — gera testes/amostras/amostra-v068.xlsx (DADOS INVENTADOS).
Imita a ESTRUTURA de uma planilha real de controle de água (sem nenhum dado dela):
- aba AUX VEL com as fórmulas que o Excel 365 grava: FILTER/UNIQUE/SORT que derramam (matriz dinâmica com cm="1" e
  xl/metadata.xml), ANCHORARRAY (A2#), LET com _xlpm., TRIMRANGE (_xlfn._TRO_TRAILING), XLOOKUP, IFS, TEXTJOIN,
  matriz antiga ({=...}), _xlfn.SINGLE (@), COUNTIFS com abas de nome com ponto e acento;
- aba VERIF. CLORO protegida (com senha), colunas C e F ocultas, linhas 8 a 12 ocultas logo abaixo das congeladas
  (congela até a linha 12), títulos de impressão 1:7, filtro antigo (_FilterDatabase), o logotipo passando por cima da
  coluna oculta C e um "velocímetro": grupo com painel arredondado + gráfico de rosca DENTRO do grupo, passando pela
  coluna oculta F;
- aba DASH com o mesmo logotipo (a imagem repetida em duas abas) e um gráfico de barras deitadas com o eixo das
  categorias à direita (crosses="max");
- aba VALIDAÇ DADOS protegida sem senha.
Uso: python3 testes/amostras/gerar-amostra-v068.py"""
import io, os, re, struct, zipfile, zlib
from openpyxl import Workbook
from openpyxl.chart import BarChart, DoughnutChart, Reference
from openpyxl.drawing.image import Image as XlImage
from openpyxl.worksheet.protection import SheetProtection

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, 'amostra-v068.xlsx')
EMU = 9525


def png(w, h, cor):
    linha = b'\x00' + bytes(cor) * w
    def bloco(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + bloco(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + bloco(b'IDAT', zlib.compress(linha * h)) + bloco(b'IEND', b'')


LOGO = png(40, 40, (46, 120, 180))
wb = Workbook()
d = wb.active; d.title = 'Dados'
d.append(['Ponto', 'Local', 'Cloro', 'Custo'])
for i in range(2, 21):
    d.append([f'BR {i:02d}', ['Refeitório', 'Oficina', 'Packing'][i % 3], round(0.2 + (i % 7) * 0.1, 2), 100 + i * 7])
a = wb.create_sheet('AUX VEL')
v = wb.create_sheet('VERIF. CLORO')
dash = wb.create_sheet('DASH')
val = wb.create_sheet('VALIDAÇ DADOS')
# CON. COLETA: congela até a linha 7 e as linhas 8 a 12 (logo abaixo, na parte que rola) estão ocultas; o cabeçalho é alto
co = wb.create_sheet('CON. COLETA')
co['C3'] = 'CONTROLE DE COLETA (inventado)'
for j, t in enumerate(['SEM', 'DATA', 'PONTO DE COLETA', 'TIPO DE ANÁLISE', 'COLETOR'], start=1):
    co.cell(7, j, t)
co.row_dimensions[7].height = 30
for r in range(8, 13):
    co.cell(r, 1, f'oculta {r}'); co.row_dimensions[r].hidden = True
for r in range(13, 900):
    co.cell(r, 1, f'{r // 7}°'); co.cell(r, 2, f'{1 + r % 28:02d}/03/2026'); co.cell(r, 3, f'BR {r % 6:02d}'); co.cell(r, 4, 'MICROBIOLOGIA'); co.cell(r, 5, 'COLETOR TESTE')
co.freeze_panes = 'A8'
co.column_dimensions['C'].width = 22; co.column_dimensions['D'].width = 26
val['Z1'] = 1

# VERIF. CLORO: cabeçalho, linhas ocultas abaixo das congeladas, colunas ocultas, proteção com senha
v['B2'] = 'CONTROLE DE CLORO (inventado)'
for j, t in enumerate(['DATA', 'OCULTA', 'PONTO', 'LOCAL', 'OCULTA2', 'CLORO', 'STATUS'], start=2):
    v.cell(7, j, t)
for r in range(8, 13):
    v.cell(r, 2, f'oculta {r}')
    v.row_dimensions[r].hidden = True
for r in range(13, 300):
    v.cell(r, 2, f'{1 + r % 28:02d}/01/2026'); v.cell(r, 4, f'BR {r % 6:02d}'); v.cell(r, 5, 'Refeitório'); v.cell(r, 7, round(0.2 + (r % 9) * 0.07, 2)); v.cell(r, 8, 'CONFORME')
v.column_dimensions['C'].hidden = True
v.column_dimensions['F'].hidden = True
v.freeze_panes = 'A13'
v.merge_cells('I1:I6')  # célula mesclada logo acima do cabeçalho congelado
v.row_dimensions[7].height = 34  # cabeçalho alto (texto em duas linhas)
v['I7'] = 'PONTO DE\nCOLETA'
v.print_title_rows = '1:7'
v.auto_filter.ref = 'B7:H299'
v.protection = SheetProtection(sheet=True, password='teste', formatColumns=False)
val.protection = SheetProtection(sheet=True)
v['K2'] = 0.57
for i, x in enumerate([0.3, 0.4, 0.3, 1.0], start=2):
    v.cell(i, 26, x)

# logotipo em duas abas (o mesmo arquivo de imagem)
img = XlImage(io.BytesIO(LOGO)); img.width, img.height = 150, 90; v.add_image(img, 'B1')
img2 = XlImage(io.BytesIO(LOGO)); img2.width, img2.height = 150, 90; dash.add_image(img2, 'A1')
img3 = XlImage(io.BytesIO(LOGO)); img3.width, img3.height = 170, 120; co.add_image(img3, 'B1')

# gráfico de rosca (vira o velocímetro dentro do grupo) e barras no DASH
ro = DoughnutChart(); ro.add_data(Reference(v, min_col=26, min_row=2, max_row=5)); ro.legend = None
v.add_chart(ro, 'E1')
br = BarChart(); br.type = 'bar'; br.title = 'Gasto por ponto (inventado)'
br.add_data(Reference(d, min_col=4, min_row=1, max_row=6), titles_from_data=True)
br.set_categories(Reference(d, min_col=1, min_row=2, max_row=6))
br.y_axis.crosses = 'max'
br.x_axis.title = 'GASTOS POR PONTO'
dash.add_chart(br, 'A8')
buf = io.BytesIO(); wb.save(buf)

z = zipfile.ZipFile(io.BytesIO(buf.getvalue()))
arq = {n: z.read(n) for n in z.namelist()}
nomes = {}
wbx = arq['xl/workbook.xml'].decode(); rels = arq['xl/_rels/workbook.xml.rels'].decode()
for m in re.finditer(r'<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"', wbx):
    t = re.search(r'Id="%s"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="%s"' % (m.group(2), m.group(2)), rels)
    nomes[m.group(1)] = 'xl/' + (t.group(1) or t.group(2)).replace('/xl/', '')

# fórmulas do Excel 365 na AUX VEL
CELS = [
    ('A1', None, 'Pontos acima', 'str', ''),
    ('A2', ('_xlfn._xlws.FILTER(Dados!A2:A20,Dados!C2:C20&gt;0.5)', 't="array" ref="A2:A10"'), 'BR 04', 'str', ' cm="1"'),
    *[(f'A{r}', None, f'BR {x:02d}', 'str', '') for r, x in zip(range(3, 11), [5, 6, 11, 12, 13, 18, 19, 20])],
    ('B2', ('_xlfn.UNIQUE(Dados!B2:B20)', 't="array" ref="B2:B4"'), 'Packing', 'str', ' cm="1"'),
    ('B3', None, 'Refeitório', 'str', ''), ('B4', None, 'Oficina', 'str', ''),
    ('C2', 'COUNTA(_xlfn.ANCHORARRAY(A2))', '9', None, ''),
    ('C3', '_xlfn.LET(_xlpm.x,Dados!C2,_xlpm.y,2,_xlpm.x*_xlpm.y)', '0.8', None, ''),
    ('C4', 'COUNTA(_xlfn._TRO_TRAILING(Dados!A:A))', '20', None, ''),
    ('C5', '_xlfn.XLOOKUP("BR 05",Dados!A2:A20,Dados!C2:C20,"")', '0.7', None, ''),
    ('C6', '_xlfn.IFS(Dados!C2&gt;0.5,"alto",TRUE,"ok")', 'ok', 'str', ''),
    ('C7', '_xlfn.TEXTJOIN(", ",TRUE,_xlfn.ANCHORARRAY(B2))', 'Packing, Refeitório, Oficina', 'str', ''),
    ('C8', ('SUM(Dados!C2:C4*{1,2,3})', 't="array" ref="C8"'), '2', None, ''),
    ('C9', '_xlfn.SINGLE(Dados!C2:C20)', '0.4', None, ''),
    ('C10', 'IFERROR(VLOOKUP("x",Dados!A:C,3,FALSE),"")', '', 'str', ''),
    ('C11', 'COUNTIFS(\'VERIF. CLORO\'!$D:$D,"BR*",\'VALIDAÇ DADOS\'!$Z:$Z,"&lt;&gt;")', '0', None, ''),
    ('C12', 'ROUNDUP(WEEKNUM(DATE(2026,10,28),2),0)&amp;"°"', '44°', 'str', ''),
    ('C13', 'SUBTOTAL(9,Dados!C2:C20)', '9', None, ''),
    ('D2', ('_xlfn._xlws.SORT(_xlfn.UNIQUE(Dados!B2:B20))', 't="array" ref="D2:D4"'), 'Oficina', 'str', ' cm="1"'),
    ('D3', None, 'Packing', 'str', ''), ('D4', None, 'Refeitório', 'str', ''),
    ('E2', '_xlfn.MAP(Dados!C2:C4,_xlfn.LAMBDA(_xlpm.v,_xlpm.v*10))', '6', None, ''),
]
def linhas_xml(cels):
    linhas = {}
    for r, f, val_, t, extra in cels:
        n = int(re.sub(r'[A-Z]+', '', r)); tv = f' t="{t}"' if t else ''
        if f is None: s = f'<c r="{r}"{tv}><v>{val_}</v></c>'
        else:
            ft, fa = (f if isinstance(f, tuple) else (f, ''))
            s = f'<c r="{r}"{tv}{extra}><f{(" " + fa) if fa else ""}>{ft}</f><v>{val_}</v></c>'
        linhas.setdefault(n, []).append(s)
    col = lambda s: re.match(r'<c r="([A-Z]+)', s).group(1)
    return ''.join(f'<row r="{n}">' + ''.join(sorted(linhas[n], key=lambda s: (len(col(s)), col(s)))) + '</row>' for n in sorted(linhas))
p = nomes['AUX VEL']; x = arq[p].decode()
x = re.sub(r'<sheetData\s*/>|<sheetData>.*</sheetData>', '<sheetData>' + linhas_xml(CELS) + '</sheetData>', x, flags=re.S)
arq[p] = x.encode()
arq['xl/metadata.xml'] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<metadata xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:xda="http://schemas.microsoft.com/office/spreadsheetml/2017/dynamicarray"><metadataTypes count="1"><metadataType name="XLDAPR" minSupportedVersion="120000" copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1" clearComments="1" assign="1" coerce="1" cellMeta="1"/></metadataTypes><futureMetadata name="XLDAPR" count="1"><bk><extLst><ext uri="{bdbb8cdc-fa1e-496e-a857-3c3f30c029c3}"><xda:dynamicArrayProperties fDynamic="1" fCollapsed="0"/></ext></extLst></bk></futureMetadata><cellMetadata count="1"><bk><rc t="1" v="0"/></bk></cellMetadata></metadata>').encode()
arq['[Content_Types].xml'] = arq['[Content_Types].xml'].replace(b'</Types>', b'<Override PartName="/xl/metadata.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheetMetadata+xml"/></Types>')
arq['xl/_rels/workbook.xml.rels'] = arq['xl/_rels/workbook.xml.rels'].replace(b'</Relationships>', b'<Relationship Id="rIdMeta" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sheetMetadata" Target="metadata.xml"/></Relationships>')

# o velocímetro: o gráfico de rosca vai para DENTRO de um grupo com um painel arredondado (como no Excel)
pv = nomes['VERIF. CLORO']
rv = re.search(r'<drawing\b[^>]*r:id="([^"]+)"', arq[pv].decode()).group(1)
srels = arq[pv.replace('worksheets/', 'worksheets/_rels/') + '.rels'].decode()
mt = re.search(r'<Relationship\b[^>]*Id="%s"[^>]*>' % rv, srels).group(0)
dpath = 'xl/' + re.search(r'Target="([^"]+)"', mt).group(1).replace('../', '').replace('/xl/', '')
dx = arq[dpath].decode()
W, H = 260 * EMU, 110 * EMU
NSX = ('xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
       'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"')
def de_ate(c1, r1, c2, r2, off2=(0, 0)):
    return (f'<xdr:from><xdr:col>{c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{r1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
            f'<xdr:to><xdr:col>{c2}</xdr:col><xdr:colOff>{off2[0]}</xdr:colOff><xdr:row>{r2}</xdr:row><xdr:rowOff>{off2[1]}</xdr:rowOff></xdr:to>')
# logotipo de B1 até E6 (passa pela coluna C, oculta)
logo = ('<xdr:twoCellAnchor editAs="oneCell">' + de_ate(1, 0, 4, 5) +
        '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="Logotipo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>'
        '<xdr:blipFill><a:blip r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'
        f'<xdr:spPr><a:xfrm><a:off x="{64 * EMU}" y="0"/><a:ext cx="{128 * EMU}" cy="{100 * EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>')
# velocímetro: grupo (painel + rosca) de E1 até I6 (passa pela coluna F, oculta)
gf = ('<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="52" name="Gráfico do velocímetro"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>'
      f'<xdr:xfrm><a:off x="{30 * EMU}" y="{10 * EMU}"/><a:ext cx="{200 * EMU}" cy="{90 * EMU}"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">'
      '<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame>')
grupo = ('<xdr:twoCellAnchor>' + de_ate(4, 0, 8, 5, (4 * EMU, 10 * EMU)) +
         '<xdr:grpSp><xdr:nvGrpSpPr><xdr:cNvPr id="50" name="Velocímetro Refeitório"/><xdr:cNvGrpSpPr/></xdr:nvGrpSpPr>'
         f'<xdr:grpSpPr><a:xfrm><a:off x="{4 * 64 * EMU}" y="0"/><a:ext cx="{W}" cy="{H}"/><a:chOff x="0" y="0"/><a:chExt cx="{W}" cy="{H}"/></a:xfrm></xdr:grpSpPr>'
         '<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="51" name="Painel do velocímetro"/><xdr:cNvSpPr/></xdr:nvSpPr>'
         f'<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{W}" cy="{H}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="E8EEF2"/></a:solidFill><a:ln><a:noFill/></a:ln></xdr:spPr>'
         '<xdr:txBody><a:bodyPr anchor="b"/><a:lstStyle/><a:p><a:pPr algn="ctr"/><a:r><a:rPr lang="pt-BR" sz="900" b="1"/><a:t>REFEITÓRIO</a:t></a:r></a:p></xdr:txBody></xdr:sp>'
         + gf + '</xdr:grpSp><xdr:clientData/></xdr:twoCellAnchor>')
arq[dpath] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' f'<xdr:wsDr {NSX}>' + logo + grupo + '</xdr:wsDr>').encode()
rd = dpath.replace('drawings/', 'drawings/_rels/') + '.rels'
assert 'rId1' in arq[rd].decode() and 'rId2' in arq[rd].decode(), arq[rd]

out = zipfile.ZipFile(SAIDA, 'w', zipfile.ZIP_DEFLATED)
for n, b in arq.items(): out.writestr(n, b)
out.close()
print('ok', SAIDA)
