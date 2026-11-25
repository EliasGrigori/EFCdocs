"""Vértice Docs v0.6.44 (S3) — conferente de fora das segmentações gravadas num .xlsx (só leitura).
Confere: todo XML bem formado; toda relação aponta para parte que existe; toda parte tem tipo de conteúdo; cada memória
(slicerCache) tem nome definido #N/A, está na lista do livro e aponta para tabela e coluna que existem; cada segmentação
aponta para memória que existe e tem o quadro no desenho da aba; números de objeto (cNvPr id) sem repetir no desenho.
Uso: python3 -I conferir-segmentacao-xlsx.py arquivo.xlsx [...]"""
import sys, zipfile, re, posixpath
from xml.dom import minidom
def rels(z, parte):
    p = posixpath.join(posixpath.dirname(parte), '_rels', posixpath.basename(parte) + '.rels')
    if p not in z.namelist(): return []
    out = []
    for m in re.finditer(r'<Relationship\b([^>]*?)/?>', z.read(p).decode()):
        a = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        if a.get('TargetMode') == 'External': continue
        t = a['Target']; alvo = t[1:] if t.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(parte), t))
        out.append((a['Id'], a['Type'], alvo))
    return out
def conferir(arq):
    z = zipfile.ZipFile(arq); nomes = set(z.namelist()); erros = []
    for n in nomes:
        if n.endswith(('.xml', '.rels')):
            try: minidom.parseString(z.read(n))
            except Exception as e: erros.append(f'XML ruim em {n}: {e}')
    ct = z.read('[Content_Types].xml').decode()
    padrao = set(re.findall(r'<Default Extension="([^"]+)"', ct)); over = set(p[1:] for p in re.findall(r'<Override PartName="([^"]+)"', ct))
    for n in nomes:
        if n.endswith('/') or n == '[Content_Types].xml': continue
        if n not in over and n.rsplit('.', 1)[-1] not in padrao: erros.append(f'sem tipo de conteúdo: {n}')
    for n in nomes:
        if '/_rels/' in n or n.startswith('_rels/'):
            base = n.replace('_rels/', '').rsplit('.rels', 1)[0]
            for i, t, alvo in rels(z, base):
                if alvo not in nomes: erros.append(f'relação {i} de {base} aponta para {alvo}, que não existe')
    wb = z.read('xl/workbook.xml').decode(); rw = {i: a for i, t, a in rels(z, 'xl/workbook.xml')}
    lista = re.findall(r'<x14:slicerCache r:id="([^"]+)"', wb)
    tabelas = {}
    for n in nomes:
        if re.match(r'xl/tables/[^/]+\.xml$', n):
            x = z.read(n).decode(); tid = re.search(r'<table\b[^>]*\bid="(\d+)"', x).group(1); tabelas[tid] = set(re.findall(r'<tableColumn\b[^>]*\bid="(\d+)"', x))
    caches = {}
    for rid in lista:
        p = rw.get(rid)
        if not p: erros.append(f'livro: {rid} sem relação'); continue
        x = z.read(p).decode(); nome = re.search(r'<slicerCacheDefinition\b[^>]*\bname="([^"]+)"', x).group(1); caches[nome] = p
        if f'<definedName name="{nome}">#N/A</definedName>' not in wb: erros.append(f'memória {nome} sem nome definido')
        ts = re.search(r'tableSlicerCache tableId="(\d+)" column="(\d+)"', x)
        if ts and (ts.group(1) not in tabelas or ts.group(2) not in tabelas[ts.group(1)]): erros.append(f'memória {nome} aponta para tabela/coluna que não existe')
    for n in nomes:
        if re.match(r'xl/slicerCaches/[^/]+\.xml$', n) and n not in caches.values(): erros.append(f'memória fora da lista do livro: {n}')
    total = 0
    for m in re.finditer(r'<sheet\b[^>]*\br:id="([^"]+)"', wb):
        aba = rw[m.group(1)]; ra = rels(z, aba); sx = z.read(aba).decode()
        rid_seg = re.findall(r'<x14:slicer r:id="([^"]+)"', sx); mapa = {i: a for i, t, a in ra}
        desenho = next((a for i, t, a in ra if t.endswith('/drawing')), None); dx = z.read(desenho).decode() if desenho else ''
        ids = re.findall(r'<xdr:cNvPr\b[^>]*?\bid="(\d+)"', dx); ids = [i for i in ids if i != '0']
        if len(ids) != len(set(ids)): erros.append(f'{desenho}: número de objeto repetido')
        for rid in rid_seg:
            for s in re.finditer(r'<(?:\w+:)?slicer\b([^>]*)/>', z.read(mapa[rid]).decode()):
                a = dict(re.findall(r'(\w+)="([^"]*)"', s.group(1))); total += 1
                if a.get('cache') not in caches: erros.append(f'segmentação {a.get("name")} sem memória')
                if f'name="{a.get("name")}"/>' not in dx: erros.append(f'segmentação {a.get("name")} sem quadro no desenho')
    print(f'{arq}: {total} segmentações, {len(caches)} memórias, {len(erros)} problema(s)')
    for e in erros: print('  ' + e)
    return not erros
sys.exit(0 if all([conferir(a) for a in sys.argv[1:]]) else 1)
