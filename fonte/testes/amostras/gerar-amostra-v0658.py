"""Vértice Docs v0.6.58 — gera testes/amostras/amostra-v0658.xlsx (DADOS INVENTADOS).
D-30: formas cuja cor do texto vem de lugares diferentes (estilo fontRef, rPr com lumMod, lstStyle, defRPr do parágrafo,
duas cores no mesmo texto), forma com foto de fundo (blipFill), âncora de uma célula e absoluta, figura recortada em elipse.
D-17: tabela com ESTILO PRÓPRIO do arquivo (tableStyles + dxf: título escuro com letra branca, listras claras, borda)."""
import io, os, struct, zipfile, zlib, re
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, 'amostra-v0658.xlsx')
EMU = 9525
wb = Workbook()
ws = wb.active; ws.title = 'Painel'
ws['A1'] = 'Painel de formas (dados inventados)'
tb = wb.create_sheet('Tabela')
tb.append(['Lote', 'Talhão', 'Brix', 'Situação'])
for i, (t, b, s) in enumerate([('T1', 11.2, 'Aprovado'), ('T2', 9.8, 'Reprovado'), ('T3', 12.4, 'Aprovado'), ('T4', 10.1, 'Aprovado'), ('T5', 8.9, 'Reprovado'), ('T6', 11.7, 'Aprovado')], start=1):
    tb.append([f'L-{100 + i}', t, b, s])
tab = Table(displayName='Lotes', ref='A1:D7')
tab.tableStyleInfo = TableStyleInfo(name='Estilo da Qualidade', showRowStripes=True)
tb.add_table(tab)
buf = io.BytesIO(); wb.save(buf)

def png(w, h, cor):
    linha = b'\x00' + bytes(cor) * w
    def bloco(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + bloco(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + bloco(b'IDAT', zlib.compress(linha * h)) + bloco(b'IEND', b'')

def dois(c1, r1, c2, r2, dentro):
    return (f'<xdr:twoCellAnchor><xdr:from><xdr:col>{c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{r1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
            f'<xdr:to><xdr:col>{c2}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{r2}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>{dentro}<xdr:clientData/></xdr:twoCellAnchor>')
def xfrm(x, y, w, h): return f'<a:xfrm><a:off x="{x * EMU}" y="{y * EMU}"/><a:ext cx="{w * EMU}" cy="{h * EMU}"/></a:xfrm>'
C, L = 64, 20
def sp(id_, nome, x, y, w, h, preench, corpo_txt, estilo=''):
    return (f'<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="{id_}" name="{nome}"/><xdr:cNvSpPr/></xdr:nvSpPr>'
            f'<xdr:spPr>{xfrm(x, y, w, h)}<a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom>{preench}<a:ln><a:noFill/></a:ln></xdr:spPr>{estilo}{corpo_txt}</xdr:sp>')
ESTILO = ('<xdr:style><a:lnRef idx="2"><a:schemeClr val="accent1"><a:shade val="50000"/></a:schemeClr></a:lnRef><a:fillRef idx="1"><a:schemeClr val="accent1"/></a:fillRef>'
          '<a:effectRef idx="0"><a:schemeClr val="accent1"/></a:effectRef><a:fontRef idx="minor"><a:schemeClr val="lt1"/></a:fontRef></xdr:style>')
def corpo(runs, lst='<a:lstStyle/>', ppr='<a:pPr algn="ctr"/>'):
    return f'<xdr:txBody><a:bodyPr anchor="ctr"/>{lst}<a:p>{ppr}{runs}</a:p></xdr:txBody>'
def run(t, fill=''): return f'<a:r><a:rPr lang="pt-BR" sz="1100" b="1">{fill}</a:rPr><a:t>{t}</a:t></a:r>'
SOL = lambda c: f'<a:solidFill><a:srgbClr val="{c}"/></a:solidFill>'
anc = []
# 1. forma com foto de fundo (blipFill)
anc.append(dois(1, 2, 4, 6, sp(2, 'Forma com foto', C, 2 * L, 3 * C, 4 * L,
    '<a:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></a:blipFill>',
    corpo(run('Foto de fundo', SOL('FFFFFF'))))))
# 2. cor do texto só pelo estilo (fontRef lt1 = branco)
anc.append(dois(5, 2, 8, 6, sp(3, 'Texto pelo estilo', 5 * C, 2 * L, 3 * C, 4 * L, '<a:solidFill><a:srgbClr val="1F3B4D"/></a:solidFill>', corpo(run('Branco pelo estilo')), ESTILO)))
# 3. cor do tema com lumMod no rPr
anc.append(dois(9, 2, 12, 6, sp(4, 'Texto com lumMod', 9 * C, 2 * L, 3 * C, 4 * L, '<a:solidFill><a:srgbClr val="F2F2F2"/></a:solidFill>',
    corpo(run('Azul escuro do tema', '<a:solidFill><a:schemeClr val="accent1"><a:lumMod val="50000"/></a:schemeClr></a:solidFill>')))))
# 4. cor na lista (lstStyle)
anc.append(dois(1, 7, 4, 11, sp(5, 'Texto na lista', C, 7 * L, 3 * C, 4 * L, '<a:solidFill><a:srgbClr val="FFF4B8"/></a:solidFill>',
    corpo(run('Vermelho da lista'), lst=f'<a:lstStyle><a:lvl1pPr><a:defRPr>{SOL("C00000")}</a:defRPr></a:lvl1pPr></a:lstStyle>'))))
# 5. cor no parágrafo (pPr/defRPr)
anc.append(dois(5, 7, 8, 11, sp(6, 'Texto no paragrafo', 5 * C, 7 * L, 3 * C, 4 * L, '<a:solidFill><a:srgbClr val="E2F0D9"/></a:solidFill>',
    corpo(run('Verde do parágrafo'), ppr=f'<a:pPr algn="ctr"><a:defRPr>{SOL("2E7D32")}</a:defRPr></a:pPr>'))))
# 6. duas cores no mesmo texto
anc.append(dois(9, 7, 12, 11, sp(7, 'Duas cores', 9 * C, 7 * L, 3 * C, 4 * L, '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>',
    corpo(run('Meta ', SOL('1F4E79')) + run('batida', SOL('E36C09'))))))
# 7. âncora de uma célula
anc.append('<xdr:oneCellAnchor><xdr:from><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>12</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
           f'<xdr:ext cx="{3 * C * EMU}" cy="{3 * L * EMU}"/>' + sp(8, 'Uma celula', C, 12 * L, 3 * C, 3 * L, '<a:solidFill><a:srgbClr val="7030A0"/></a:solidFill>', corpo(run('Âncora de uma célula', SOL('FFFFFF')))) + '<xdr:clientData/></xdr:oneCellAnchor>')
# 8. âncora absoluta
anc.append(f'<xdr:absoluteAnchor><xdr:pos x="{5 * C * EMU}" y="{12 * L * EMU}"/><xdr:ext cx="{3 * C * EMU}" cy="{3 * L * EMU}"/>'
           + sp(9, 'Absoluta', 5 * C, 12 * L, 3 * C, 3 * L, '<a:solidFill><a:srgbClr val="00B0F0"/></a:solidFill>', corpo(run('Âncora absoluta', SOL('002060')))) + '<xdr:clientData/></xdr:absoluteAnchor>')
# 9. figura recortada em elipse
anc.append(dois(9, 12, 12, 16, '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="10" name="Figura em elipse"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>'
    '<xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId2"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>'
    f'<xdr:spPr>{xfrm(9 * C, 12 * L, 3 * C, 4 * L)}<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic>'))
drawing = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" '
           'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' + ''.join(anc) + '</xdr:wsDr>')
rels_d = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>'
          '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image2.png"/></Relationships>')
ESTILO_TAB = ('<dxfs count="3"><dxf><border><left style="thin"><color rgb="FF1F3B4D"/></left><right style="thin"><color rgb="FF1F3B4D"/></right>'
              '<top style="thin"><color rgb="FF1F3B4D"/></top><bottom style="thin"><color rgb="FF1F3B4D"/></bottom></border></dxf>'
              '<dxf><font><b/><color rgb="FFFFFFFF"/></font><fill><patternFill patternType="solid"><bgColor rgb="FF1F3B4D"/></patternFill></fill></dxf>'
              '<dxf><fill><patternFill patternType="solid"><bgColor rgb="FFDCEBF5"/></patternFill></fill></dxf></dxfs>'
              '<tableStyles count="1" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"><tableStyle name="Estilo da Qualidade" pivot="0" count="3">'
              '<tableStyleElement type="wholeTable" dxfId="0"/><tableStyleElement type="headerRow" dxfId="1"/><tableStyleElement type="firstRowStripe" dxfId="2"/></tableStyle></tableStyles>')
zin = zipfile.ZipFile(io.BytesIO(buf.getvalue()))
with zipfile.ZipFile(SAIDA, 'w', zipfile.ZIP_DEFLATED) as zout:
    nomes = zin.namelist()
    for item in zin.infolist():
        d = zin.read(item.filename)
        if item.filename == 'xl/styles.xml':
            s = d.decode()
            s = re.sub(r'<dxfs[^>]*/>|<dxfs.*?</dxfs>', '', s, flags=re.S); s = re.sub(r'<tableStyles[^>]*/>|<tableStyles.*?</tableStyles>', '', s, flags=re.S)
            s = s.replace('</cellStyles>', '</cellStyles>' + ESTILO_TAB) if '</cellStyles>' in s else s.replace('</styleSheet>', ESTILO_TAB + '</styleSheet>')
            d = s.encode()
        if item.filename == 'xl/worksheets/sheet1.xml':
            s = d.decode(); s = s.replace('</worksheet>', '<drawing xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rIdD1"/></worksheet>'); d = s.encode()
        if item.filename == '[Content_Types].xml':
            s = d.decode()
            s = s.replace('</Types>', '<Default Extension="png" ContentType="image/png"/><Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>') if 'Extension="png"' not in s else s.replace('</Types>', '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>')
            d = s.encode()
        zout.writestr(item, d)
    rels1 = 'xl/worksheets/_rels/sheet1.xml.rels'
    if rels1 not in nomes:
        zout.writestr(rels1, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdD1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>')
    zout.writestr('xl/drawings/drawing1.xml', drawing)
    zout.writestr('xl/drawings/_rels/drawing1.xml.rels', rels_d)
    zout.writestr('xl/media/image1.png', png(24, 16, (60, 140, 90)))
    zout.writestr('xl/media/image2.png', png(20, 20, (200, 120, 40)))
print('gravado', SAIDA)
