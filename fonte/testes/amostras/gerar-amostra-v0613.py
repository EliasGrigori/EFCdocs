"""Gera testes/amostras/amostra-v0613.xlsx (v0.6.13, D-29: guardar e devolver). Só dados inventados.

Aba DADOS: tabela TabVendas (Mês, Região, Valor), 8 linhas.
Aba RESUMO: tabela dinâmica "Dinâmica Regiões" (soma de Valor por Região, fonte = faixa DADOS!A1:C9),
  segmentação de dados ligada à tabela dinâmica (campo Região), segmentação ligada à tabela TabVendas (coluna Mês),
  uma caixa de seleção ligada a RESUMO!B2 e um botão (controles de formulário, sem macro).
O openpyxl monta a base; as partes que ele não sabe fazer são escritas aqui, no formato do Excel.
Uso: python3 gerar-amostra-v0613.py [saída]"""
import sys, zipfile, io, re
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo

saida = sys.argv[1] if len(sys.argv) > 1 else 'amostra-v0613.xlsx'
linhas = [('jan', 'Norte', 120), ('jan', 'Sul', 80), ('fev', 'Norte', 95), ('fev', 'Sul', 130), ('mar', 'Norte', 60), ('mar', 'Sul', 75), ('mar', 'Leste', 40), ('abr', 'Leste', 55)]
wb = Workbook(); ws = wb.active; ws.title = 'DADOS'
ws.append(['Mês', 'Região', 'Valor'])
for l in linhas: ws.append(list(l))
t = Table(displayName='TabVendas', ref='A1:C9'); t.tableStyleInfo = TableStyleInfo(name='TableStyleMedium2', showRowStripes=True); ws.add_table(t)
r = wb.create_sheet('RESUMO')
r['A1'] = 'Resumo por região'; r['A2'] = 'Conferido?'; r['B2'] = False
# valores que a tabela dinâmica mostra (o Excel guarda nas células)
regioes = ['Leste', 'Norte', 'Sul']; soma = {g: sum(v for _, gg, v in linhas if gg == g) for g in regioes}
r['E3'] = 'Rótulos de Linha'; r['F3'] = 'Soma de Valor'
for i, g in enumerate(regioes): r.cell(row=4 + i, column=5, value=g); r.cell(row=4 + i, column=6, value=soma[g])
r.cell(row=7, column=5, value='Total Geral'); r.cell(row=7, column=6, value=sum(soma.values()))
buf = io.BytesIO(); wb.save(buf)

zin = zipfile.ZipFile(io.BytesIO(buf.getvalue()))
partes = {n: zin.read(n) for n in zin.namelist()}
T = lambda n: partes[n].decode('utf-8')
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
CAB = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
meses = ['jan', 'fev', 'mar', 'abr']

# ---------- tabela dinâmica ----------
def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('"', '&quot;')
reg_ordem = ['Norte', 'Sul', 'Leste']  # ordem em que aparecem nos dados
partes['xl/pivotCache/pivotCacheDefinition1.xml'] = (CAB + f'<pivotCacheDefinition xmlns="{NS}" xmlns:r="{R}" r:id="rId1" refreshedBy="Vertice" refreshedDate="46000.5" createdVersion="8" refreshedVersion="8" minRefreshableVersion="3" recordCount="8">'
  '<cacheSource type="worksheet"><worksheetSource ref="A1:C9" sheet="DADOS"/></cacheSource><cacheFields count="3">'
  f'<cacheField name="Mês" numFmtId="0"><sharedItems count="4">{"".join(f"<s v=\"{m}\"/>" for m in meses)}</sharedItems></cacheField>'
  f'<cacheField name="Região" numFmtId="0"><sharedItems count="3">{"".join(f"<s v=\"{g}\"/>" for g in reg_ordem)}</sharedItems></cacheField>'
  '<cacheField name="Valor" numFmtId="0"><sharedItems containsSemiMixedTypes="0" containsString="0" containsNumber="1" containsInteger="1" minValue="40" maxValue="130"/></cacheField>'
  '</cacheFields></pivotCacheDefinition>').encode()
recs = ''.join(f'<r><x v="{meses.index(m)}"/><x v="{reg_ordem.index(g)}"/><n v="{v}"/></r>' for m, g, v in linhas)
partes['xl/pivotCache/pivotCacheRecords1.xml'] = (CAB + f'<pivotCacheRecords xmlns="{NS}" xmlns:r="{R}" count="8">{recs}</pivotCacheRecords>').encode()
partes['xl/pivotCache/_rels/pivotCacheDefinition1.xml.rels'] = (CAB + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheRecords" Target="pivotCacheRecords1.xml"/></Relationships>').encode()
# itens do campo Região em ordem alfabética (Leste, Norte, Sul) = índices 2, 0, 1 do cache
partes['xl/pivotTables/pivotTable1.xml'] = (CAB + f'<pivotTableDefinition xmlns="{NS}" name="Dinâmica Regiões" cacheId="1" applyNumberFormats="0" applyBorderFormats="0" applyFontFormats="0" applyPatternFormats="0" applyAlignmentFormats="0" applyWidthHeightFormats="1" dataCaption="Valores" updatedVersion="8" minRefreshableVersion="3" useAutoFormatting="1" itemPrintTitles="1" createdVersion="8" indent="0" outline="1" outlineData="1" multipleFieldFilters="0">'
  '<location ref="E3:F7" firstHeaderRow="1" firstDataRow="1" firstDataCol="1"/><pivotFields count="3">'
  '<pivotField showAll="0"/>'
  '<pivotField axis="axisRow" showAll="0"><items count="4"><item x="2"/><item x="0"/><item x="1"/><item t="default"/></items></pivotField>'
  '<pivotField dataField="1" showAll="0"/></pivotFields>'
  '<rowFields count="1"><field x="1"/></rowFields><rowItems count="4"><i><x/></i><i><x v="1"/></i><i><x v="2"/></i><i t="grand"><x/></i></rowItems>'
  '<colItems count="1"><i/></colItems><dataFields count="1"><dataField name="Soma de Valor" fld="2" baseField="0" baseItem="0"/></dataFields>'
  '<pivotTableStyleInfo name="PivotStyleLight16" showRowHeaders="1" showColHeaders="1" showRowStripes="0" showColStripes="0" showLastColumn="1"/></pivotTableDefinition>').encode()
partes['xl/pivotTables/_rels/pivotTable1.xml.rels'] = (CAB + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheDefinition" Target="../pivotCache/pivotCacheDefinition1.xml"/></Relationships>').encode()

# ---------- segmentações ----------
X14 = 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/main'
X15 = 'http://schemas.microsoft.com/office/spreadsheetml/2010/11/main'
MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006'
partes['xl/slicerCaches/slicerCache1.xml'] = (CAB + f'<slicerCacheDefinition xmlns="{X14}" xmlns:mc="{MC}" mc:Ignorable="x" xmlns:x="{NS}" name="SegmentaçãodeDados_Região" sourceName="Região"><pivotTables><pivotTable tabId="2" name="Dinâmica Regiões"/></pivotTables><data><tabular pivotCacheId="1"><items count="3"><i x="2" s="1"/><i x="0" s="1"/><i x="1" s="1"/></items></tabular></data></slicerCacheDefinition>').encode()
partes['xl/slicerCaches/slicerCache2.xml'] = (CAB + f'<slicerCacheDefinition xmlns="{X14}" xmlns:mc="{MC}" mc:Ignorable="x xr10" xmlns:x="{NS}" xmlns:x15="{X15}" xmlns:xr10="http://schemas.microsoft.com/office/spreadsheetml/2016/revision10" name="SegmentaçãodeDados_Mês" sourceName="Mês"><extLst><x:ext xmlns:x15="{X15}" uri="{{2F2917AC-EB37-4324-AD4E-5DD8C200BD13}}"><x15:tableSlicerCache tableId="1" column="1"/></x:ext></extLst></slicerCacheDefinition>').encode()
partes['xl/slicers/slicer1.xml'] = (CAB + f'<slicers xmlns="{X14}" xmlns:mc="{MC}" mc:Ignorable="x xr10" xmlns:x="{NS}" xmlns:xr10="http://schemas.microsoft.com/office/spreadsheetml/2016/revision10"><slicer name="Região" cache="SegmentaçãodeDados_Região" caption="Região" rowHeight="241300"/><slicer name="Mês" cache="SegmentaçãodeDados_Mês" caption="Mês" rowHeight="241300"/></slicers>').encode()

# ---------- controles de formulário ----------
partes['xl/ctrlProps/ctrlProp1.xml'] = (CAB + '<formControlPr xmlns="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" objectType="CheckBox" fmlaLink="$B$2" lockText="1" noThreeD="1"/>').encode()
partes['xl/ctrlProps/ctrlProp2.xml'] = (CAB + '<formControlPr xmlns="http://schemas.microsoft.com/office/spreadsheetml/2009/9/main" objectType="Button" lockText="1"/>').encode()
vml = ('<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">'
  '<o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="1"/></o:shapelayout>'
  '<v:shapetype id="_x0000_t201" coordsize="21600,21600" o:spt="201" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path shadowok="f" o:extrusionok="f" strokeok="f" fillok="f" o:connecttype="rect"/><o:lock v:ext="edit" shapetype="t"/></v:shapetype>'
  '<v:shape id="_x0000_s1025" type="#_x0000_t201" style="position:absolute;margin-left:120pt;margin-top:15pt;width:90pt;height:18pt;z-index:1" filled="f" stroked="f" strokecolor="windowText [64]" o:insetmode="auto"><v:path shadowok="t" strokeok="t" fillok="t"/><o:lock v:ext="edit" rotation="t"/><v:textbox style="mso-direction-alt:auto" o:singleclick="f"><div style="text-align:left"><font face="Calibri" size="220" color="#000000">Conferido</font></div></v:textbox><x:ClientData ObjectType="Checkbox"><x:SizeWithCells/><x:Anchor>2, 10, 1, 2, 3, 30, 2, 6</x:Anchor><x:AutoFill>False</x:AutoFill><x:AutoLine>False</x:AutoLine><x:TextVAlign>Center</x:TextVAlign><x:FmlaLink>$B$2</x:FmlaLink><x:NoThreeD/></x:ClientData></v:shape>'
  '<v:shape id="_x0000_s1026" type="#_x0000_t201" style="position:absolute;margin-left:120pt;margin-top:40pt;width:90pt;height:22pt;z-index:2" o:button="t" fillcolor="buttonFace [67]" strokecolor="windowText [64]" o:insetmode="auto"><v:fill color2="buttonFace [67]" o:detectmouseclick="t"/><o:lock v:ext="edit" rotation="t"/><v:textbox style="mso-direction-alt:auto" o:singleclick="f"><div style="text-align:center"><font face="Calibri" size="220" color="#000000">Atualizar</font></div></v:textbox><x:ClientData ObjectType="Button"><x:Anchor>2, 10, 3, 4, 3, 30, 4, 10</x:Anchor><x:PrintObject>False</x:PrintObject><x:AutoFill>False</x:AutoFill><x:TextHAlign>Center</x:TextHAlign><x:TextVAlign>Center</x:TextVAlign></x:ClientData></v:shape></xml>')
partes['xl/drawings/vmlDrawing1.vml'] = vml.encode()

# ---------- desenho da aba RESUMO: 2 segmentações e as 2 formas-gêmeas dos controles ----------
def ancora(c1, l1, c2, l2, dentro): return f'<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>{c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{l1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>{c2}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{l2}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>{dentro}<xdr:clientData/></xdr:twoCellAnchor>'
def seg(i, nome):
    # como o Excel grava: a âncora por fora, o AlternateContent (segmentação ou forma de reserva) por dentro
    c1, l1, c2, l2 = 7, 2 + i * 9, 10, 10 + i * 9
    return (f'<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>{c1}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{l1}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>{c2}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{l2}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'
      f'<mc:AlternateContent xmlns:mc="{MC}"><mc:Choice xmlns:sle15="http://schemas.microsoft.com/office/drawing/2012/slicer" Requires="sle15">'
      f'<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="{10 + i}" name="{nome}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/drawing/2010/slicer"><sle:slicer xmlns:sle="http://schemas.microsoft.com/office/drawing/2010/slicer" name="{nome}"/></a:graphicData></a:graphic></xdr:graphicFrame>'
      '</mc:Choice><mc:Fallback><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="0" name=""/><xdr:cNvSpPr><a:spLocks noTextEdit="1"/></xdr:cNvSpPr></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1828800" cy="2524125"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr><xdr:txBody><a:bodyPr vertOverflow="clip" horzOverflow="clip"/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" sz="1100"/><a:t>Esta forma representa uma segmentação de dados.</a:t></a:r></a:p></xdr:txBody></xdr:sp></mc:Fallback></mc:AlternateContent><xdr:clientData/></xdr:twoCellAnchor>')
def gemea(id_, spid, l1, l2, texto):
    return ('<mc:AlternateContent xmlns:mc="' + MC + '"><mc:Choice xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" Requires="a14">'
      + ancora(2, l1, 3, l2, f'<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="{id_}" name="{texto} {id_}" hidden="1"><a:extLst><a:ext uri="{{63B3BB69-23CF-44E3-9099-C40C66FF867C}}"><a14:compatExt spid="{spid}"/></a:ext></a:extLst></xdr:cNvPr><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr><xdr:txBody><a:bodyPr vertOverflow="clip" wrap="square" lIns="27432" tIns="18288" rIns="0" bIns="18288" anchor="ctr" upright="1"/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" sz="1100"/><a:t>{texto}</a:t></a:r></a:p></xdr:txBody></xdr:sp>')
      + '</mc:Choice></mc:AlternateContent>')
partes['xl/drawings/drawing1.xml'] = (CAB + '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
  + seg(0, 'Região') + seg(1, 'Mês') + gemea(1025, '_x0000_s1025', 1, 2, 'Conferido') + gemea(1026, '_x0000_s1026', 3, 4, 'Atualizar') + '</xdr:wsDr>').encode()
partes['xl/drawings/_rels/drawing1.xml.rels'] = (CAB + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>').encode()

# ---------- aba RESUMO: desenho, desenho antigo, controles e lista de segmentações ----------
sx = T('xl/worksheets/sheet2.xml')
sx = sx.replace('<worksheet ', f'<worksheet xmlns:mc="{MC}" xmlns:x14="{X14}" xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision" mc:Ignorable="x14ac xr" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac" ', 1) if 'xmlns:mc=' not in sx else sx
raiz_tem_r = lambda x, tag: 'xmlns:r=' in re.search(r'<' + tag + r'\b[^>]*>', x).group(0)
if not raiz_tem_r(sx, 'worksheet'): sx = sx.replace('<worksheet ', f'<worksheet xmlns:r="{R}" ', 1)
sx = re.sub(r'<sheetPr\b[^>]*/>|<sheetPr\b[^>]*>.*?</sheetPr>', '', sx, flags=re.S)
sx = sx.replace('<dimension', '<sheetPr codeName="Planilha2"/><dimension', 1)
controles = ('<mc:AlternateContent><mc:Choice Requires="x14"><controls>'
  '<mc:AlternateContent><mc:Choice Requires="x14"><control shapeId="1025" r:id="rIdC1" name="Conferido"><controlPr defaultSize="0" autoFill="0" autoLine="0" autoPict="0"><anchor moveWithCells="1"><from><xdr:col xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">2</xdr:col><xdr:colOff xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">0</xdr:colOff><xdr:row xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">1</xdr:row><xdr:rowOff xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">0</xdr:rowOff></from><to><xdr:col xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">3</xdr:col><xdr:colOff xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">0</xdr:colOff><xdr:row xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">2</xdr:row><xdr:rowOff xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">0</xdr:rowOff></to></anchor></controlPr></control></mc:Choice></mc:AlternateContent>'
  '<mc:AlternateContent><mc:Choice Requires="x14"><control shapeId="1026" r:id="rIdC2" name="Atualizar"><controlPr defaultSize="0" print="0" autoFill="0" autoPict="0"><anchor moveWithCells="1" sizeWithCells="1"><from><xdr:col xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">2</xdr:col><xdr:colOff xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">0</xdr:colOff><xdr:row xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">3</xdr:row><xdr:rowOff xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">0</xdr:rowOff></from><to><xdr:col xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">3</xdr:col><xdr:colOff xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">0</xdr:colOff><xdr:row xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">4</xdr:row><xdr:rowOff xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">0</xdr:rowOff></to></anchor></controlPr></control></mc:Choice></mc:AlternateContent>'
  '</controls></mc:Choice></mc:AlternateContent>')
ext = f'<extLst><ext uri="{{A8765BA9-456A-4dab-B4F3-ACF838C121DE}}" xmlns:x14="{X14}"><x14:slicerList><x14:slicer r:id="rIdS1"/></x14:slicerList></ext></extLst>'
sx = sx.replace('</worksheet>', '<drawing r:id="rIdD1"/><legacyDrawing r:id="rIdV1"/>' + controles + ext + '</worksheet>')
partes['xl/worksheets/sheet2.xml'] = sx.encode()
partes['xl/worksheets/_rels/sheet2.xml.rels'] = (CAB + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  '<Relationship Id="rIdP1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotTable" Target="../pivotTables/pivotTable1.xml"/>'
  '<Relationship Id="rIdD1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>'
  '<Relationship Id="rIdV1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/vmlDrawing" Target="../drawings/vmlDrawing1.vml"/>'
  '<Relationship Id="rIdC1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/ctrlProp" Target="../ctrlProps/ctrlProp1.xml"/>'
  '<Relationship Id="rIdC2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/ctrlProp" Target="../ctrlProps/ctrlProp2.xml"/>'
  '<Relationship Id="rIdS1" Type="http://schemas.microsoft.com/office/2007/relationships/slicer" Target="../slicers/slicer1.xml"/></Relationships>').encode()

# ---------- livro ----------
wx = T('xl/workbook.xml')
wx = re.sub(r'<workbookPr\b[^>]*/>', '<workbookPr codeName="EstaPastaDeTrabalho"/>', wx) if '<workbookPr' in wx else wx.replace('<bookViews', '<workbookPr codeName="EstaPastaDeTrabalho"/><bookViews', 1)
dn = '<definedName name="SegmentaçãodeDados_Região">#N/A</definedName><definedName name="SegmentaçãodeDados_Mês">#N/A</definedName>'
wx = wx.replace('<definedNames/>', '')
wx = wx.replace('</definedNames>', dn + '</definedNames>') if '<definedNames>' in wx else wx.replace('<calcPr', f'<definedNames>{dn}</definedNames><calcPr', 1)
if '<calcPr' not in wx: wx = wx.replace('</workbook>', '<calcPr calcId="191029"/></workbook>')
wx = wx.replace('</workbook>', f'<pivotCaches><pivotCache cacheId="1" r:id="rIdPC1"/></pivotCaches><extLst><ext uri="{{BBE1A952-AA13-448e-AADC-164F8A28A991}}" xmlns:x14="{X14}"><x14:slicerCaches><x14:slicerCache r:id="rIdSC1"/></x14:slicerCaches></ext><ext uri="{{46BE6895-7355-4a93-B00E-2C351335B9C9}}" xmlns:x15="{X15}"><x15:slicerCaches xmlns:x14="{X14}"><x14:slicerCache r:id="rIdSC2"/></x15:slicerCaches></ext></extLst></workbook>')
if not raiz_tem_r(wx, 'workbook'): wx = wx.replace('<workbook ', f'<workbook xmlns:r="{R}" ', 1)
partes['xl/workbook.xml'] = wx.encode()
rw = T('xl/_rels/workbook.xml.rels').replace('</Relationships>',
  '<Relationship Id="rIdPC1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheDefinition" Target="pivotCache/pivotCacheDefinition1.xml"/>'
  '<Relationship Id="rIdSC1" Type="http://schemas.microsoft.com/office/2007/relationships/slicerCache" Target="slicerCaches/slicerCache1.xml"/>'
  '<Relationship Id="rIdSC2" Type="http://schemas.microsoft.com/office/2007/relationships/slicerCache" Target="slicerCaches/slicerCache2.xml"/></Relationships>')
partes['xl/_rels/workbook.xml.rels'] = rw.encode()
ct = T('[Content_Types].xml')
SS = 'application/vnd.openxmlformats-officedocument.spreadsheetml.'
mais = ''.join(f'<Override PartName="/{n}" ContentType="{c}"/>' for n, c in [
  ('xl/pivotCache/pivotCacheDefinition1.xml', SS + 'pivotCacheDefinition+xml'), ('xl/pivotCache/pivotCacheRecords1.xml', SS + 'pivotCacheRecords+xml'),
  ('xl/pivotTables/pivotTable1.xml', SS + 'pivotTable+xml'), ('xl/slicerCaches/slicerCache1.xml', 'application/vnd.ms-excel.slicerCache+xml'),
  ('xl/slicerCaches/slicerCache2.xml', 'application/vnd.ms-excel.slicerCache+xml'), ('xl/slicers/slicer1.xml', 'application/vnd.ms-excel.slicer+xml'),
  ('xl/ctrlProps/ctrlProp1.xml', 'application/vnd.ms-excel.controlproperties+xml'), ('xl/ctrlProps/ctrlProp2.xml', 'application/vnd.ms-excel.controlproperties+xml'),
  ('xl/drawings/drawing1.xml', 'application/vnd.openxmlformats-officedocument.drawing+xml')])
if 'Extension="vml"' not in ct: mais += '<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/>'
partes['[Content_Types].xml'] = ct.replace('</Types>', mais + '</Types>').encode()

with zipfile.ZipFile(saida, 'w', zipfile.ZIP_DEFLATED) as z:
    for n in ['[Content_Types].xml'] + [n for n in partes if n != '[Content_Types].xml']:
        zi = zipfile.ZipInfo(n, date_time=(2026, 11, 12, 0, 0, 0)); zi.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(zi, partes[n])
print('ok', saida)
