# Amostra INVENTADA da v0.6.18 (nenhum dado real): "Guardar e devolver 2".
#  - aba Indicadores: barras de dados (formatação condicional) de quatro jeitos: só a antiga (B), Excel 2010 lisa com borda (C),
#    com números negativos e eixo (D), sem mostrar o número e com mínimo e máximo fixos (E); e um gráfico de cascata (cx) solto;
#  - aba de gráfico (chartsheet) "Gráfico" com um gráfico de colunas;
#  - aba Painel: um GRUPO com fundo, título, um gráfico comum e um gráfico de funil (cx), como os painéis do Excel 2016;
#    e, embaixo, um mapa de árvore (cx de um tipo que o app ainda não desenha).
import io, re, zipfile
from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.formatting.rule import DataBarRule
from openpyxl.styles import Font

SAIDA = 'amostra-v0618.xlsx'
EMU = 9525
wb = Workbook(); ws = wb.active; ws.title = 'Indicadores'
ws.append(['Mês', 'Meta', 'Realizado', 'Variação', 'Nota'])
meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago']
meta = [40, 42, 45, 45, 48, 50, 50, 52]
real = [38, 47, 41, 52, 44, 58, 49, 60]
nota = [72, 85, 64, 93, 70, 98, 81, 100]
for i, m in enumerate(meses):
    ws.append([m, meta[i], real[i], real[i] - meta[i], nota[i]])
ws['A10'] = 'Saldo'; ws['D10'] = '=SUM(D2:D9)'
for c in 'ABCDE': ws[c + '1'].font = Font(bold=True)
for col, w in zip('ABCDE', [10, 10, 12, 12, 10]): ws.column_dimensions[col].width = w
# barra antiga (sem o bloco do Excel 2010): com degradê e mínimo/máximo dos valores
ws.conditional_formatting.add('B2:B9', DataBarRule(start_type='min', end_type='max', color='638EC6'))
# as outras três entram depois, à mão (o openpyxl só grava a antiga)

# dados do funil e do gráfico comum do painel
wp = wb.create_sheet('Painel')
for r in [['Etapa', 'Quantidade'], ['Recebidas', 120], ['Conferidas', 96], ['Analisadas', 80], ['Laudos', 64], ['Entregues', 60]]:
    wp.append(r)
wp['A1'].font = wp['B1'].font = Font(bold=True)

# aba de gráfico
cs = wb.create_chartsheet('Gráfico')
ch = BarChart(); ch.type = 'col'; ch.title = 'Meta e realizado'
ch.add_data(Reference(ws, min_col=2, min_row=1, max_col=3, max_row=9), titles_from_data=True)
ch.set_categories(Reference(ws, min_col=1, min_row=2, max_row=9))
cs.add_chart(ch)
wb.move_sheet('Gráfico', offset=-1)  # fica entre Indicadores e Painel

buf = io.BytesIO(); wb.save(buf)
z = zipfile.ZipFile(io.BytesIO(buf.getvalue()))
arq = {n: z.read(n) for n in z.namelist()}

wbx = arq['xl/workbook.xml'].decode(); wrels = arq['xl/_rels/workbook.xml.rels'].decode()
def parte_da_aba(nome):
    rid = re.search(r'<sheet\b[^>]*name="%s"[^>]*r:id="([^"]+)"' % nome, wbx).group(1)
    t = re.search(r'<Relationship\b[^>]*Id="%s"[^>]*>' % rid, wrels).group(0)
    return 'xl/' + re.search(r'Target="([^"]+)"', t).group(1).replace('/xl/', '')
p_ind, p_pai = parte_da_aba('Indicadores'), parte_da_aba('Painel')

NS_X14 = 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/main'
NS_XM = 'http://schemas.microsoft.com/office/excel/2006/main'
def regra_principal(sqref, prio, cor, gid, cfvos='<cfvo type="min"/><cfvo type="max"/>', mostrar=True):
    return (f'<conditionalFormatting sqref="{sqref}"><cfRule type="dataBar" priority="{prio}"><dataBar{"" if mostrar else " showValue=\"0\""}>{cfvos}<color rgb="FF{cor}"/></dataBar>'
            f'<extLst><ext uri="{{B025F937-C7B1-47D3-B67F-A62EFF666E3E}}" xmlns:x14="{NS_X14}"><x14:id>{gid}</x14:id></ext></extLst></cfRule></conditionalFormatting>')
def regra_x14(sqref, gid, atrib, cfvos, filhos):
    return (f'<x14:conditionalFormatting xmlns:xm="{NS_XM}"><x14:cfRule type="dataBar" id="{gid}"><x14:dataBar {atrib}>{cfvos}{filhos}</x14:dataBar></x14:cfRule>'
            f'<xm:sqref>{sqref}</xm:sqref></x14:conditionalFormatting>')
G1, G2, G3 = '{6A1E0001-0000-4000-8000-000000000001}', '{6A1E0001-0000-4000-8000-000000000002}', '{6A1E0001-0000-4000-8000-000000000003}'
auto = '<x14:cfvo type="autoMin"/><x14:cfvo type="autoMax"/>'
principais = (regra_principal('C2:C9', 2, '63BE7B', G1) + regra_principal('D2:D9', 3, '5A8AC6', G2)
              + regra_principal('E2:E9', 4, 'FFB628', G3, '<cfvo type="num" val="0"/><cfvo type="num" val="100"/>', mostrar=False))
x14 = (regra_x14('C2:C9', G1, 'minLength="0" maxLength="100" gradient="0" border="1"', auto, '<x14:borderColor rgb="FF3E9A5A"/><x14:negativeFillColor rgb="FFFF0000"/><x14:axisColor rgb="FF000000"/>')
       + regra_x14('D2:D9', G2, 'minLength="0" maxLength="100" axisPosition="automatic"', auto, '<x14:negativeFillColor rgb="FFFF0000"/><x14:axisColor rgb="FF000000"/>')
       + regra_x14('E2:E9', G3, 'minLength="0" maxLength="100" showValue="0" gradient="0"', '<x14:cfvo type="num"><xm:f>0</xm:f></x14:cfvo><x14:cfvo type="num"><xm:f>100</xm:f></x14:cfvo>', '<x14:negativeFillColor rgb="FFFF0000"/><x14:axisColor rgb="FF000000"/>'))
sx = arq[p_ind].decode()
sx = sx.replace('</conditionalFormatting>', '</conditionalFormatting>' + principais, 1)
ext_cf = f'<ext uri="{{78C0D931-6437-407d-A8EE-F0AAD7539E65}}" xmlns:x14="{NS_X14}"><x14:conditionalFormattings>{x14}</x14:conditionalFormattings></ext>'

# ---------- gráficos novos (cx): cascata solta na Indicadores e funil dentro do grupo do Painel ----------
NS_CX = 'http://schemas.microsoft.com/office/drawing/2014/chartex'
def lvl_str(vals): return f'<cx:lvl ptCount="{len(vals)}">' + ''.join(f'<cx:pt idx="{i}">{v}</cx:pt>' for i, v in enumerate(vals)) + '</cx:lvl>'
def lvl_num(vals): return f'<cx:lvl ptCount="{len(vals)}" formatCode="General">' + ''.join(f'<cx:pt idx="{i}">{v}</cx:pt>' for i, v in enumerate(vals)) + '</cx:lvl>'
def titulo(t): return f'<cx:title pos="t" align="ctr" overlay="0"><cx:tx><cx:txData><cx:v>{t}</cx:v></cx:txData></cx:tx></cx:title>'
var = [r - m for r, m in zip(real, meta)]
cascata = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cx:chartSpace xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
           f'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:cx="{NS_CX}"><cx:chartData><cx:data id="0">'
           f'<cx:strDim type="cat"><cx:f>Indicadores!$A$2:$A$10</cx:f>{lvl_str(meses + ["Saldo"])}</cx:strDim>'
           f'<cx:numDim type="val"><cx:f>Indicadores!$D$2:$D$10</cx:f>{lvl_num(var + [sum(var)])}</cx:numDim></cx:data></cx:chartData>'
           f'<cx:chart>{titulo("Variação mês a mês")}<cx:plotArea><cx:plotAreaRegion><cx:series layoutId="waterfall" uniqueId="{{6A1E0001-0000-4000-8000-0000000000A1}}">'
           '<cx:tx><cx:txData><cx:f>Indicadores!$D$1</cx:f><cx:v>Variação</cx:v></cx:txData></cx:tx>'
           '<cx:dataLabels pos="outEnd"><cx:visibility seriesName="0" categoryName="0" value="1"/></cx:dataLabels><cx:dataId val="0"/>'
           '<cx:layoutPr><cx:subtotals><cx:idx val="8"/></cx:subtotals></cx:layoutPr></cx:series></cx:plotAreaRegion>'
           '<cx:axis id="0"><cx:catScaling gapWidth="0.5"/><cx:tickLabels/></cx:axis><cx:axis id="1"><cx:valScaling/><cx:majorGridlines/><cx:tickLabels/></cx:axis>'
           '</cx:plotArea><cx:legend pos="t" align="ctr" overlay="0"/></cx:chart></cx:chartSpace>')
etapas = ['Recebidas', 'Conferidas', 'Analisadas', 'Laudos', 'Entregues']; qtd = [120, 96, 80, 64, 60]
funil = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cx:chartSpace xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
         f'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:cx="{NS_CX}"><cx:chartData><cx:data id="0">'
         f'<cx:strDim type="cat"><cx:f>Painel!$A$2:$A$6</cx:f>{lvl_str(etapas)}</cx:strDim>'
         f'<cx:numDim type="val"><cx:f>Painel!$B$2:$B$6</cx:f>{lvl_num(qtd)}</cx:numDim></cx:data></cx:chartData>'
         f'<cx:chart>{titulo("Amostras por etapa")}<cx:plotArea><cx:plotAreaRegion><cx:series layoutId="funnel" uniqueId="{{6A1E0001-0000-4000-8000-0000000000A2}}">'
         '<cx:tx><cx:txData><cx:f>Painel!$B$1</cx:f><cx:v>Quantidade</cx:v></cx:txData></cx:tx>'
         '<cx:spPr><a:solidFill><a:srgbClr val="2E8B57"/></a:solidFill></cx:spPr>'
         '<cx:dataLabels pos="inEnd"><cx:visibility seriesName="0" categoryName="0" value="1"/></cx:dataLabels><cx:dataId val="0"/></cx:series></cx:plotAreaRegion>'
         '<cx:axis id="0"><cx:catScaling gapWidth="0.06"/><cx:tickLabels/></cx:axis><cx:axis id="1" hidden="1"><cx:valScaling/></cx:axis></cx:plotArea></cx:chart></cx:chartSpace>')
# mapa de árvore (tipo que o app ainda não desenha: aparece como quadro com o nome e volta igual)
arvore = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cx:chartSpace xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
          f'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:cx="{NS_CX}"><cx:chartData><cx:data id="0">'
          f'<cx:strDim type="cat"><cx:f>Painel!$A$2:$A$6</cx:f>{lvl_str(etapas)}</cx:strDim>'
          f'<cx:numDim type="size"><cx:f>Painel!$B$2:$B$6</cx:f>{lvl_num(qtd)}</cx:numDim></cx:data></cx:chartData>'
          f'<cx:chart>{titulo("Peso de cada etapa")}<cx:plotArea><cx:plotAreaRegion><cx:series layoutId="treemap" uniqueId="{{6A1E0001-0000-4000-8000-0000000000A3}}">'
          '<cx:tx><cx:txData><cx:f>Painel!$B$1</cx:f><cx:v>Quantidade</cx:v></cx:txData></cx:tx><cx:dataId val="0"/><cx:layoutPr><cx:parentLabelLayout val="overlapping"/></cx:layoutPr></cx:series></cx:plotAreaRegion></cx:plotArea></cx:chart></cx:chartSpace>')
arq['xl/charts/chartEx1.xml'] = cascata.encode(); arq['xl/charts/chartEx2.xml'] = funil.encode(); arq['xl/charts/chartEx3.xml'] = arvore.encode()

# gráfico comum do painel (colunas da quantidade por etapa), escrito à mão
NS_C = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
def cache(tipo, vals):
    if tipo == 'str': return f'<c:strCache><c:ptCount val="{len(vals)}"/>' + ''.join(f'<c:pt idx="{i}"><c:v>{v}</c:v></c:pt>' for i, v in enumerate(vals)) + '</c:strCache>'
    return f'<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="{len(vals)}"/>' + ''.join(f'<c:pt idx="{i}"><c:v>{v}</c:v></c:pt>' for i, v in enumerate(vals)) + '</c:numCache>'
colunas = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<c:chartSpace xmlns:c="{NS_C}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
           'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:p><a:r><a:t>Quantidade</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>'
           '<c:autoTitleDeleted val="0"/><c:plotArea><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>'
           f'<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:strRef><c:f>Painel!$B$1</c:f>{cache("str", ["Quantidade"])}</c:strRef></c:tx>'
           f'<c:cat><c:strRef><c:f>Painel!$A$2:$A$6</c:f>{cache("str", etapas)}</c:strRef></c:cat><c:val><c:numRef><c:f>Painel!$B$2:$B$6</c:f>{cache("num", qtd)}</c:numRef></c:val></c:ser>'
           '<c:gapWidth val="80"/><c:axId val="10"/><c:axId val="20"/></c:barChart>'
           '<c:catAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="20"/></c:catAx>'
           '<c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:crossAx val="10"/></c:valAx>'
           '</c:plotArea><c:plotVisOnly val="1"/></c:chart></c:chartSpace>')
n_chart = 1 + max(int(m) for m in re.findall(r'xl/charts/chart(\d+)\.xml', ' '.join(arq)))
p_col = f'xl/charts/chart{n_chart}.xml'; arq[p_col] = colunas.encode()

NSX = ('xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
       'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"')
def de_ate(c1, r1, c2, r2):
    return (f'<xdr:from><xdr:col>{c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{r1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
            f'<xdr:to><xdr:col>{c2}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{r2}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>')
def cx_frame(id_, nome, rid, x, y, w, h):
    return ('<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">'
            '<mc:Choice xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" Requires="cx1">'
            f'<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="{id_}" name="{nome}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>'
            f'<xdr:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></xdr:xfrm><a:graphic><a:graphicData uri="{NS_CX}">'
            f'<cx:chart xmlns:cx="{NS_CX}" r:id="{rid}"/></a:graphicData></a:graphic></xdr:graphicFrame></mc:Choice>'
            '<mc:Fallback><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="0" name=""/><xdr:cNvSpPr><a:spLocks noTextEdit="1"/></xdr:cNvSpPr></xdr:nvSpPr>'
            f'<xdr:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{w}" cy="{h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:prstClr val="white"/></a:solidFill>'
            '<a:ln w="1"><a:solidFill><a:prstClr val="green"/></a:solidFill></a:ln></xdr:spPr><xdr:txBody><a:bodyPr vertOverflow="clip" horzOverflow="clip"/><a:lstStyle/>'
            '<a:p><a:r><a:rPr lang="pt-BR" sz="1100"/><a:t>Este gráfico não está disponível na sua versão do Excel.</a:t></a:r></a:p></xdr:txBody></xdr:sp></mc:Fallback></mc:AlternateContent>')
REL_CX = 'http://schemas.microsoft.com/office/2014/relationships/chartEx'
REL_C = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart'
def rels(lista):
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + ''.join(f'<Relationship Id="{i}" Type="{t}" Target="{a}"/>' for i, t, a in lista) + '</Relationships>')
n_dr = 1 + max([0] + [int(m) for m in re.findall(r'xl/drawings/drawing(\d+)\.xml', ' '.join(arq))])
d_ind, d_pai = f'xl/drawings/drawing{n_dr}.xml', f'xl/drawings/drawing{n_dr + 1}.xml'
# cascata solta de G2 a N19
arq[d_ind] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' f'<xdr:wsDr {NSX}><xdr:twoCellAnchor>' + de_ate(6, 1, 13, 18)
              + cx_frame(2, 'Cascata', 'rId1', 0, 0, 0, 0) + '<xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>').encode()
arq[d_ind.replace('drawings/', 'drawings/_rels/') + '.rels'] = rels([('rId1', REL_CX, '../charts/chartEx1.xml')]).encode()
# painel: grupo com fundo, título, colunas e funil (D1 a N22)
W, H = 640 * EMU, 400 * EMU
grupo = ('<xdr:twoCellAnchor>' + de_ate(3, 0, 13, 21)
         + '<xdr:grpSp><xdr:nvGrpSpPr><xdr:cNvPr id="10" name="Painel de amostras"/><xdr:cNvGrpSpPr/></xdr:nvGrpSpPr>'
         f'<xdr:grpSpPr><a:xfrm><a:off x="{3 * 64 * EMU}" y="0"/><a:ext cx="{W}" cy="{H}"/><a:chOff x="0" y="0"/><a:chExt cx="{W}" cy="{H}"/></a:xfrm></xdr:grpSpPr>'
         '<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="11" name="Fundo do painel"/><xdr:cNvSpPr/></xdr:nvSpPr>'
         f'<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{W}" cy="{H}"/></a:xfrm><a:prstGeom prst="roundRect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="EEF2F5"/></a:solidFill><a:ln><a:noFill/></a:ln></xdr:spPr></xdr:sp>'
         '<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="12" name="Título do painel"/><xdr:cNvSpPr txBox="1"/></xdr:nvSpPr>'
         f'<xdr:spPr><a:xfrm><a:off x="{12 * EMU}" y="{8 * EMU}"/><a:ext cx="{400 * EMU}" cy="{28 * EMU}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></xdr:spPr>'
         '<xdr:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" sz="1400" b="1"/><a:t>PAINEL DE AMOSTRAS (inventado)</a:t></a:r></a:p></xdr:txBody></xdr:sp>'
         '<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="13" name="Colunas"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>'
         f'<xdr:xfrm><a:off x="{12 * EMU}" y="{44 * EMU}"/><a:ext cx="{300 * EMU}" cy="{340 * EMU}"/></xdr:xfrm><a:graphic><a:graphicData uri="{NS_C}">'
         f'<c:chart xmlns:c="{NS_C}" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame>'
         + cx_frame(14, 'Funil', 'rId2', 324 * EMU, 44 * EMU, 304 * EMU, 340 * EMU)
         + '</xdr:grpSp><xdr:clientData/></xdr:twoCellAnchor>')
mapa = '<xdr:twoCellAnchor>' + de_ate(0, 23, 8, 40) + cx_frame(20, 'Mapa de árvore', 'rId3', 0, 0, 0, 0) + '<xdr:clientData/></xdr:twoCellAnchor>'
arq[d_pai] = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' f'<xdr:wsDr {NSX}>' + grupo + mapa + '</xdr:wsDr>').encode()
arq[d_pai.replace('drawings/', 'drawings/_rels/') + '.rels'] = rels([('rId1', REL_C, f'../charts/chart{n_chart}.xml'), ('rId2', REL_CX, '../charts/chartEx2.xml'), ('rId3', REL_CX, '../charts/chartEx3.xml')]).encode()

# ligar os desenhos às abas (e o bloco das barras novas no fim da Indicadores)
def ligar_desenho(p_aba, p_dr, xml_aba):
    rp = p_aba.replace('worksheets/', 'worksheets/_rels/') + '.rels'
    rr = arq.get(rp, rels([]).encode()).decode()
    rr = rr.replace('</Relationships>', f'<Relationship Id="rIdDr" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/{p_dr.split("/")[-1]}"/></Relationships>')
    arq[rp] = rr.encode()
    if 'xmlns:r=' not in xml_aba.split('>', 1)[0]: xml_aba = xml_aba.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ', 1)
    return re.sub(r'(</worksheet>)', r'<drawing r:id="rIdDr"/>\1', xml_aba)
sx = ligar_desenho(p_ind, d_ind, sx)
sx = sx.replace('</worksheet>', f'<extLst>{ext_cf}</extLst></worksheet>')
arq[p_ind] = sx.encode()
arq[p_pai] = ligar_desenho(p_pai, d_pai, arq[p_pai].decode()).encode()

ct = arq['[Content_Types].xml'].decode()
mais = (f'<Override PartName="/{d_ind}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
        f'<Override PartName="/{d_pai}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
        f'<Override PartName="/{p_col}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>'
        '<Override PartName="/xl/charts/chartEx1.xml" ContentType="application/vnd.ms-office.chartex+xml"/>'
        '<Override PartName="/xl/charts/chartEx2.xml" ContentType="application/vnd.ms-office.chartex+xml"/>'
        '<Override PartName="/xl/charts/chartEx3.xml" ContentType="application/vnd.ms-office.chartex+xml"/>')
arq['[Content_Types].xml'] = ct.replace('</Types>', mais + '</Types>').encode()

out = zipfile.ZipFile(SAIDA, 'w', zipfile.ZIP_DEFLATED)
for n, b in arq.items(): out.writestr(n, b)
out.close()
print('ok', SAIDA)
