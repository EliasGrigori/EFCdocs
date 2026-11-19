"""Gera testes/amostras/amostra-v0641.xlsx (v0.6.41, S1: segmentação de dados de tabela). Só dados inventados.

Aba Coletas: tabela TabColetas (Talhão, Fruta, Kg), 8 linhas, filtrada em Fruta = Mamão (4 linhas escondidas);
  segmentações "Fruta" (E2:G11) e "Talhão" (I2:K11) ligadas à tabela.
Aba Painel: segmentação "Fruta 1", outra cópia da segmentação da Fruta (mesmo cache), longe da tabela.
O openpyxl monta a base; as segmentações são escritas aqui, no formato do Excel 2013 em diante (x15:tableSlicerCache).
Uso: python3 gerar-amostra-v0641.py [saída]"""
import sys, zipfile, io, re
from openpyxl import Workbook
from openpyxl.worksheet.table import Table, TableStyleInfo
from openpyxl.worksheet.filters import AutoFilter, FilterColumn, Filters

saida = sys.argv[1] if len(sys.argv) > 1 else 'amostra-v0641.xlsx'
linhas = [('T1', 'Mamão', 120), ('T2', 'Acerola', 45), ('T3', 'Mamão', 98), ('T4', 'Goiaba', 80), ('T1', 'Acerola', 30), ('T2', 'Mamão', 60), ('T3', 'Goiaba', 25), ('T4', 'Mamão', 70)]
wb = Workbook(); ws = wb.active; ws.title = 'Coletas'
ws.append(['Talhão', 'Fruta', 'Kg'])
for l in linhas: ws.append(list(l))
t = Table(displayName='TabColetas', ref='A1:C9')
t.autoFilter = AutoFilter(ref='A1:C9', filterColumn=[FilterColumn(colId=1, filters=Filters(filter=['Mamão']))])
t.tableStyleInfo = TableStyleInfo(name='TableStyleMedium2', showRowStripes=True); ws.add_table(t)
for i, l in enumerate(linhas):
    if l[1] != 'Mamão': ws.row_dimensions[i + 2].hidden = True
p = wb.create_sheet('Painel'); p['A1'] = 'Painel da colheita'
buf = io.BytesIO(); wb.save(buf)

zin = zipfile.ZipFile(io.BytesIO(buf.getvalue()))
partes = {n: zin.read(n) for n in zin.namelist()}
T = lambda n: partes[n].decode('utf-8')
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
X14 = 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/main'
X15 = 'http://schemas.microsoft.com/office/spreadsheetml/2010/11/main'
MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006'
CAB = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
EMU = 9525

def cache(nome, fonte, coluna):
    return (CAB + f'<slicerCacheDefinition xmlns="{X14}" xmlns:mc="{MC}" mc:Ignorable="x xr10" xmlns:x="{NS}" xmlns:x15="{X15}" xmlns:xr10="http://schemas.microsoft.com/office/spreadsheetml/2016/revision10" name="{nome}" sourceName="{fonte}">'
      f'<extLst><x:ext xmlns:x15="{X15}" uri="{{2F2917AC-EB37-4324-AD4E-5DD8C200BD13}}"><x15:tableSlicerCache tableId="1" column="{coluna}"/></x:ext></extLst></slicerCacheDefinition>').encode()
partes['xl/slicerCaches/slicerCache1.xml'] = cache('SegmentaçãodeDados_Fruta', 'Fruta', 2)
partes['xl/slicerCaches/slicerCache2.xml'] = cache('SegmentaçãodeDados_Talhão', 'Talhão', 1)
def slicers(itens):
    return (CAB + f'<slicers xmlns="{X14}" xmlns:mc="{MC}" mc:Ignorable="x xr10" xmlns:x="{NS}" xmlns:xr10="http://schemas.microsoft.com/office/spreadsheetml/2016/revision10">'
      + ''.join(f'<slicer name="{n}" xr10:uid="{{0000000{i}-0000-0000-0000-000000000000}}" cache="{c}" caption="{cap}"{extra} rowHeight="241300"/>' for i, (n, c, cap, extra) in enumerate(itens)) + '</slicers>').encode()
partes['xl/slicers/slicer1.xml'] = slicers([('Fruta', 'SegmentaçãodeDados_Fruta', 'Fruta', ''), ('Talhão', 'SegmentaçãodeDados_Talhão', 'Talhão', ' columnCount="2"')])
partes['xl/slicers/slicer2.xml'] = slicers([('Fruta 1', 'SegmentaçãodeDados_Fruta', 'Fruta da colheita', '')])

def seg(i, nome, c1, l1, c2, l2):
    return (f'<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>{c1}</xdr:col><xdr:colOff>{4 * EMU}</xdr:colOff><xdr:row>{l1}</xdr:row><xdr:rowOff>{3 * EMU}</xdr:rowOff></xdr:from><xdr:to><xdr:col>{c2}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{l2}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'
      f'<mc:AlternateContent xmlns:mc="{MC}"><mc:Choice xmlns:sle15="http://schemas.microsoft.com/office/drawing/2012/slicer" Requires="sle15">'
      f'<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="{2 + i}" name="{nome}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/drawing/2010/slicer"><sle:slicer xmlns:sle="http://schemas.microsoft.com/office/drawing/2010/slicer" name="{nome}"/></a:graphicData></a:graphic></xdr:graphicFrame>'
      '</mc:Choice><mc:Fallback><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="0" name=""/><xdr:cNvSpPr><a:spLocks noTextEdit="1"/></xdr:cNvSpPr></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1828800" cy="2524125"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr><xdr:txBody><a:bodyPr vertOverflow="clip" horzOverflow="clip"/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" sz="1100"/><a:t>Esta forma representa uma segmentação de dados de tabela.</a:t></a:r></a:p></xdr:txBody></xdr:sp></mc:Fallback></mc:AlternateContent><xdr:clientData/></xdr:twoCellAnchor>')
DR = '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
partes['xl/drawings/drawing1.xml'] = (CAB + DR + seg(0, 'Fruta', 4, 1, 7, 11) + seg(1, 'Talhão', 8, 1, 11, 11) + '</xdr:wsDr>').encode()
partes['xl/drawings/drawing2.xml'] = (CAB + DR + seg(0, 'Fruta 1', 1, 2, 4, 12) + '</xdr:wsDr>').encode()

EXT = lambda rid: f'<extLst><ext uri="{{3A4CF648-6AED-40f4-86FF-DC5316D8AED3}}" xmlns:x15="{X15}"><x14:slicerList xmlns:x14="{X14}"><x14:slicer r:id="{rid}"/></x14:slicerList></ext></extLst>'
def aba(n, rels_extra, rid_d, rid_s):
    sx = T(f'xl/worksheets/sheet{n}.xml')
    if 'xmlns:r=' not in re.search(r'<worksheet\b[^>]*>', sx).group(0): sx = sx.replace('<worksheet ', f'<worksheet xmlns:r="{R}" ', 1)
    sx = sx.replace('</worksheet>', f'<drawing r:id="{rid_d}"/>' + EXT(rid_s) + '</worksheet>')
    partes[f'xl/worksheets/sheet{n}.xml'] = sx.encode()
    relp = f'xl/worksheets/_rels/sheet{n}.xml.rels'
    base = T(relp) if relp in partes else CAB + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'
    partes[relp] = base.replace('</Relationships>', rels_extra + '</Relationships>').encode()
REL = lambda i, t, alvo: f'<Relationship Id="{i}" Type="{t}" Target="{alvo}"/>'
D_T = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing'; S_T = 'http://schemas.microsoft.com/office/2007/relationships/slicer'
aba(1, REL('rIdD1', D_T, '../drawings/drawing1.xml') + REL('rIdS1', S_T, '../slicers/slicer1.xml'), 'rIdD1', 'rIdS1')
aba(2, REL('rIdD2', D_T, '../drawings/drawing2.xml') + REL('rIdS2', S_T, '../slicers/slicer2.xml'), 'rIdD2', 'rIdS2')

wx = T('xl/workbook.xml')
if 'xmlns:r=' not in re.search(r'<workbook\b[^>]*>', wx).group(0): wx = wx.replace('<workbook ', f'<workbook xmlns:r="{R}" ', 1)
dn = '<definedName name="SegmentaçãodeDados_Fruta">#N/A</definedName><definedName name="SegmentaçãodeDados_Talhão">#N/A</definedName>'
wx = wx.replace('<definedNames/>', '')
wx = wx.replace('</definedNames>', dn + '</definedNames>') if '<definedNames>' in wx else wx.replace('<calcPr', f'<definedNames>{dn}</definedNames><calcPr', 1)
if '<calcPr' not in wx: wx = wx.replace('</workbook>', f'<definedNames>{dn}</definedNames><calcPr calcId="191029"/></workbook>') if dn not in wx else wx.replace('</workbook>', '<calcPr calcId="191029"/></workbook>')
wx = wx.replace('</workbook>', f'<extLst><ext uri="{{46BE6895-7355-4a93-B00E-2C351335B9C9}}" xmlns:x15="{X15}"><x15:slicerCaches xmlns:x14="{X14}"><x14:slicerCache r:id="rIdSC1"/><x14:slicerCache r:id="rIdSC2"/></x15:slicerCaches></ext></extLst></workbook>')
partes['xl/workbook.xml'] = wx.encode()
SC_T = 'http://schemas.microsoft.com/office/2007/relationships/slicerCache'
partes['xl/_rels/workbook.xml.rels'] = T('xl/_rels/workbook.xml.rels').replace('</Relationships>', REL('rIdSC1', SC_T, 'slicerCaches/slicerCache1.xml') + REL('rIdSC2', SC_T, 'slicerCaches/slicerCache2.xml') + '</Relationships>').encode()
ct = T('[Content_Types].xml')
mais = ''.join(f'<Override PartName="/{n}" ContentType="{c}"/>' for n, c in [
  ('xl/slicerCaches/slicerCache1.xml', 'application/vnd.ms-excel.slicerCache+xml'), ('xl/slicerCaches/slicerCache2.xml', 'application/vnd.ms-excel.slicerCache+xml'),
  ('xl/slicers/slicer1.xml', 'application/vnd.ms-excel.slicer+xml'), ('xl/slicers/slicer2.xml', 'application/vnd.ms-excel.slicer+xml'),
  ('xl/drawings/drawing1.xml', 'application/vnd.openxmlformats-officedocument.drawing+xml'), ('xl/drawings/drawing2.xml', 'application/vnd.openxmlformats-officedocument.drawing+xml')])
partes['[Content_Types].xml'] = ct.replace('</Types>', mais + '</Types>').encode()

with zipfile.ZipFile(saida, 'w', zipfile.ZIP_DEFLATED) as z:
    for n in zin.namelist(): z.writestr(n, partes[n])
    for n in partes:
        if n not in zin.namelist(): z.writestr(n, partes[n])
