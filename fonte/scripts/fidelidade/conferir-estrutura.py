"""Conferência estrutural de um .xlsx (v0.6.13): o que o Excel cobra para não pedir reparo. Mostra só nomes de partes e contagens, nunca o conteúdo das células.
Uso: python3 conferir-estrutura.py arquivo.xlsx  (sai com erro se achar problema)"""
import sys,zipfile,re,posixpath,collections
from xml.dom import minidom
z=zipfile.ZipFile(sys.argv[1]); nomes=set(z.namelist()); erros=[]
ct=z.read('[Content_Types].xml').decode()
over={m.group(1).lstrip('/') for m in re.finditer(r'<Override\b[^>]*PartName="([^"]*)"',ct)}
dfl={m.group(1).lower() for m in re.finditer(r'<Default\b[^>]*Extension="([^"]*)"',ct)}
for n in nomes:
    if n.endswith('/') or n=='[Content_Types].xml': continue
    if n not in over and n.rsplit('.',1)[-1].lower() not in dfl: erros.append('sem tipo: '+n)
for o in over:
    if o not in nomes: erros.append('tipo de parte que não existe: '+o)
for n in nomes:
    if re.search(r'\.(xml|rels|vml)$',n):
        try: minidom.parseString(z.read(n))
        except Exception as e: erros.append(f'XML quebrado: {n}: {str(e)[:80]}')
def rels(n):
    x=z.read(n).decode(); ids=collections.Counter(); out=[]
    for m in re.finditer(r'<Relationship\b([^>]*)/?>',x):
        a=dict(re.findall(r'(\w+)="([^"]*)"',m.group(1))); ids[a.get('Id')]+=1; out.append(a)
    for k,v in ids.items():
        if v>1: erros.append(f'id repetido {k} em {n}')
    return out
for n in [x for x in nomes if x.endswith('.rels')]:
    dono=n.replace('_rels/','').rsplit('.rels',1)[0]; base=posixpath.dirname(dono)
    if dono and dono not in nomes: erros.append('relações de parte que não existe: '+n)
    for a in rels(n):
        if a.get('TargetMode')=='External': continue
        t=a['Target']
        if t.startswith('#'): continue
        alvo=t.lstrip('/') if t.startswith('/') else posixpath.normpath(posixpath.join(base,t))
        if alvo not in nomes: erros.append(f'alvo ausente {alvo} ({n})')
    # r:id usados no dono existem nas relações
    if dono in nomes and re.search(r'\.(xml|vml)$',dono):
        ids={a['Id'] for a in rels(n)}; x=z.read(dono).decode('utf-8','replace')
        for u in set(re.findall(r'\br:(?:id|embed|link|pict)="([^"]*)"',x))|set(re.findall(r'\bo:relid="([^"]*)"',x)):
            if u and u not in ids: erros.append(f'r:id {u} sem relação em {dono}')
# partes com r:id sem arquivo de relações
for n in nomes:
    if re.search(r'\.(xml|vml)$',n) and not n.endswith('.rels'):
        x=z.read(n).decode('utf-8','replace')
        if re.search(r'\br:(?:id|embed)="[^"]+"',x) and posixpath.join(posixpath.dirname(n),'_rels',posixpath.basename(n)+'.rels') not in nomes and n!='[Content_Types].xml': erros.append('usa r:id e não tem relações: '+n)
wb=z.read('xl/workbook.xml').decode()
dn=set(re.findall(r'<definedName\b[^>]*name="([^"]*)"',wb))
for n in [x for x in nomes if re.match(r'xl/slicerCaches/',x) and x.endswith('.xml')]:
    nm=re.search(r'<\w*:?slicerCacheDefinition\b[^>]*\bname="([^"]*)"',z.read(n).decode())
    if nm and nm.group(1) not in dn: erros.append('memória de segmentação sem nome definido: '+n)
ids=re.findall(r'<pivotCache\b[^>]*cacheId="(\d+)"',wb)
if len(ids)!=len(set(ids)): erros.append('cacheId repetido')
# ordem dos elementos da aba (Excel é exigente)
ORDEM=['sheetPr','dimension','sheetViews','sheetFormatPr','cols','sheetData','sheetCalcPr','sheetProtection','protectedRanges','scenarios','autoFilter','sortState','dataConsolidate','customSheetViews','mergeCells','phoneticPr','conditionalFormatting','dataValidations','hyperlinks','printOptions','pageMargins','pageSetup','headerFooter','rowBreaks','colBreaks','customProperties','cellWatches','ignoredErrors','smartTags','drawing','legacyDrawing','legacyDrawingHF','drawingHF','picture','oleObjects','controls','webPublishItems','tableParts','extLst']
for n in sorted(x for x in nomes if re.match(r'xl/worksheets/sheet\d+\.xml$',x)):
    x=z.read(n).decode(); x=re.sub(r'<sheetData>.*?</sheetData>','<sheetData/>',x,flags=re.S)
    x=re.sub(r'<mc:AlternateContent\b.*?</mc:AlternateContent>','<controls/>',x,flags=re.S)
    corpo=x[x.index('>',x.index('<worksheet'))+1:]
    filhos=[]; prof=0
    for m in re.finditer(r'<(/?)([\w:]+)[^>]*?(/?)>',corpo):
        if m.group(1): prof-=1; continue
        if prof==0: filhos.append(m.group(2).split(':')[-1])
        if not m.group(3): prof+=1
    pos=[ORDEM.index(f) for f in filhos if f in ORDEM]
    if pos!=sorted(pos): erros.append(f'ordem errada em {n}: {filhos}')
    rep=[k for k,v in collections.Counter(filhos).items() if v>1 and k not in ('conditionalFormatting','controls')]
    if rep: erros.append(f'elemento repetido em {n}: {rep}')
c=collections.Counter(re.sub(r'\d+','N',n.rsplit('/',1)[0]) for n in nomes if re.search(r'pivot|slicer|timeline|ctrlProp|vbaProject|webextension|vml',n))
print('partes:',dict(c)); print('erros:',len(erros))
for e in erros[:40]: print(' ',e)
sys.exit(1 if erros else 0)
