#!/usr/bin/env python3
"""Conferente de fora (v0.6.14): regras que o esquema oficial não pega e que fazem o Excel pedir reparo.
Mostra só partes, endereços e contagens, nunca o conteúdo das células.
Uso: python3 conferir-regras.py arquivo.xlsx  (sai com erro se achar problema)

Confere: linhas e células em ordem e sem repetir; s="" dentro dos estilos; índice de texto compartilhado; cm/vm dentro do
metadata; mescladas sem sobreposição; tabelas (cabeçalho = nome da coluna, nomes únicos, sem sobrepor outra tabela ou
mesclada, id e nome únicos no livro); estilos (fontId/fillId/borderId/numFmtId/dxfId existentes); nomes definidos;
desenhos (de/até em ordem, ids únicos, gráfico usado uma vez só); comentários dentro de uma aba com legacyDrawing.
"""
import re, sys, zipfile, posixpath, collections
from lxml import etree

S = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
X = '{http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing}'
erros = []


def col_num(letras):
    n = 0
    for ch in letras: n = n * 26 + ord(ch) - 64
    return n


def ref(a):
    m = re.fullmatch(r'\$?([A-Z]{1,3})\$?(\d+)', a)
    return (int(m.group(2)), col_num(m.group(1))) if m else None


def faixa(t):
    p = t.split(':')
    a = ref(p[0]); b = ref(p[-1])
    if not a or not b: return None
    return (min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1]))


def cruza(f, g):
    return not (f[2] < g[0] or g[2] < f[0] or f[3] < g[1] or g[3] < f[1])


def rels_de(z, parte):
    rp = posixpath.join(posixpath.dirname(parte), '_rels', posixpath.basename(parte) + '.rels')
    if rp not in z.namelist(): return {}
    out = {}
    for el in etree.fromstring(z.read(rp)):
        t = el.get('Target', '')
        alvo = t if el.get('TargetMode') == 'External' or t.startswith('#') else (t.lstrip('/') if t.startswith('/') else posixpath.normpath(posixpath.join(posixpath.dirname(parte), t)))
        out[el.get('Id')] = (el.get('Type', '').rsplit('/', 1)[-1], alvo)
    return out


def main(arq):
    z = zipfile.ZipFile(arq)
    nomes = set(z.namelist())
    # v0.6.14: prefixo sem declaração (o Excel não aceita; outros leitores só avisam) e Requires/Ignorable com prefixo sem declaração
    for n in sorted(nomes):
        if not re.search(r'\.(xml|rels)$', n): continue
        if z.getinfo(n).file_size > 60 * 1024 * 1024: continue
        par = etree.XMLParser(huge_tree=True)
        try: doc = etree.fromstring(z.read(n), par)
        except etree.XMLSyntaxError as e: erros.append(f'{n}: XML quebrado ({str(e)[:80]})'); continue
        for e in par.error_log:
            if 'amespace' in e.message: erros.append(f'{n} linha {e.line}: {e.message[:120]}')
        for el in doc.iter():
            if not isinstance(el.tag, str): continue
            for at in ('Requires', '{http://schemas.openxmlformats.org/markup-compatibility/2006}Ignorable', '{http://schemas.openxmlformats.org/markup-compatibility/2006}ProcessContent'):
                v = el.get(at)
                if not v: continue
                for pf in v.split():
                    pf = pf.split(':')[0]
                    if pf not in (el.nsmap or {}): erros.append(f'{n}: "{pf}" em {at.split("}")[-1]} sem declaração (<{etree.QName(el).localname}>)')
    # estilos
    st = etree.fromstring(z.read('xl/styles.xml'))
    def qtd(tag, filho): el = st.find(S + tag); return len(el.findall(S + filho)) if el is not None else 0
    nfont, nfill, nbord, nxf, ndxf = qtd('fonts', 'font'), qtd('fills', 'fill'), qtd('borders', 'border'), qtd('cellXfs', 'xf'), qtd('dxfs', 'dxf')
    nsxf = qtd('cellStyleXfs', 'xf')
    fmts = {int(n.get('numFmtId')) for n in st.iter(S + 'numFmt')}
    for i, xf in enumerate(st.find(S + 'cellXfs').findall(S + 'xf')):
        if int(xf.get('fontId', 0)) >= nfont: erros.append(f'estilo {i}: fonte {xf.get("fontId")} não existe ({nfont})')
        if int(xf.get('fillId', 0)) >= nfill: erros.append(f'estilo {i}: preenchimento {xf.get("fillId")} não existe')
        if int(xf.get('borderId', 0)) >= nbord: erros.append(f'estilo {i}: borda {xf.get("borderId")} não existe')
        if int(xf.get('xfId', 0)) >= max(1, nsxf): erros.append(f'estilo {i}: xfId {xf.get("xfId")} não existe')
        nf = int(xf.get('numFmtId', 0))
        if nf >= 164 and nf not in fmts: erros.append(f'estilo {i}: formato {nf} não existe')
    if nfill < 2: erros.append('styles: precisa de pelo menos 2 preenchimentos (none e gray125)')
    nsst = 0
    if 'xl/sharedStrings.xml' in nomes:
        nsst = sum(1 for _ in etree.fromstring(z.read('xl/sharedStrings.xml')).iter(S + 'si'))
    nmeta_c = nmeta_v = 0
    if 'xl/metadata.xml' in nomes:
        md = etree.fromstring(z.read('xl/metadata.xml'))
        cm = md.find(S + 'cellMetadata'); vm = md.find(S + 'valueMetadata')
        nmeta_c = len(cm.findall(S + 'bk')) if cm is not None else 0
        nmeta_v = len(vm.findall(S + 'bk')) if vm is not None else 0
    wb = etree.fromstring(z.read('xl/workbook.xml'))
    wrels = rels_de(z, 'xl/workbook.xml')
    abas = []
    for sh in wb.iter(S + 'sheet'):
        t = wrels.get(sh.get('{%s}id' % R))
        abas.append((sh.get('name'), t[1] if t else None, t[0] if t else None))
    nomes_abas = [a[0] for a in abas]
    if len(set(n.lower() for n in nomes_abas)) != len(nomes_abas): erros.append('nome de aba repetido')
    for n in nomes_abas:
        if len(n) > 31 or re.search(r'[\[\]:*?/\\]', n) or n.startswith("'") or n.endswith("'"): erros.append(f'nome de aba inválido ({len(n)} letras)')
    # nomes definidos
    vistos = set()
    for d in wb.iter(S + 'definedName'):
        k = (d.get('name', '').lower(), d.get('localSheetId'))
        if k in vistos: erros.append(f'nome definido repetido: {d.get("name")} (aba {d.get("localSheetId")})')
        vistos.add(k)
        if d.get('localSheetId') is not None and int(d.get('localSheetId')) >= len(abas): erros.append(f'nome {d.get("name")}: aba {d.get("localSheetId")} não existe')
        if not (d.text or '').strip(): erros.append(f'nome {d.get("name")} sem fórmula')
    tabelas_livro = {}
    for (nome_aba, parte, tipo) in abas:
        if tipo != 'worksheet' or not parte or parte not in nomes: continue
        rels = rels_de(z, parte)
        celulas = {}
        ult_l = 0; nc = 0
        merges = []
        for ev, el in etree.iterparse(z.open(parte), events=('end',), tag=(S + 'row', S + 'mergeCell')):
            if el.tag == S + 'mergeCell':
                f = faixa(el.get('ref', '')); merges.append(f) if f else erros.append(f'{parte}: mesclada inválida')
                el.clear(); continue
            r = int(el.get('r', ult_l + 1))
            if r <= ult_l: erros.append(f'{parte}: linha {r} fora de ordem ou repetida')
            ult_l = r
            if el.get('s') and int(el.get('s')) >= nxf: erros.append(f'{parte}: linha {r} com estilo {el.get("s")} que não existe')
            ult_c = 0
            for c in el.findall(S + 'c'):
                nc += 1
                rr = c.get('r'); p = ref(rr) if rr else (r, ult_c + 1)
                if not p or p[0] != r: erros.append(f'{parte}: célula {rr} fora da linha {r}'); continue
                if p[1] <= ult_c: erros.append(f'{parte}: célula {rr} fora de ordem ou repetida')
                ult_c = p[1]
                s = int(c.get('s', 0))
                if s >= nxf: erros.append(f'{parte}: {rr} com estilo {s} que não existe ({nxf})')
                if c.get('cm') and int(c.get('cm')) > nmeta_c: erros.append(f'{parte}: {rr} cm={c.get("cm")} sem metadata')
                if c.get('vm') and int(c.get('vm')) > nmeta_v: erros.append(f'{parte}: {rr} vm={c.get("vm")} sem metadata')
                v = c.find(S + 'v')
                if c.get('t') == 's':
                    if v is None or not (v.text or '').strip().isdigit() or int(v.text) >= nsst: erros.append(f'{parte}: {rr} texto compartilhado fora da lista')
                if c.get('t') == 'n' or (c.get('t') is None and v is not None):
                    try: float(v.text) if v is not None and v.text else None
                    except ValueError: erros.append(f'{parte}: {rr} número inválido')
                if c.get('t') == 'b' and v is not None and v.text not in ('0', '1'): erros.append(f'{parte}: {rr} lógico inválido')
                if c.get('t') == 'e' and v is not None and v.text not in ('#NULL!', '#DIV/0!', '#VALUE!', '#REF!', '#NAME?', '#NUM!', '#N/A', '#GETTING_DATA', '#SPILL!', '#CALC!', '#FIELD!', '#BLOCKED!', '#CONNECT!', '#UNKNOWN!', '#BUSY!', '#EXTERNAL!', '#PYTHON!'): erros.append(f'{parte}: {rr} erro inválido')
                if c.get('t') == 's' or c.get('t') == 'str' or c.get('t') == 'inlineStr' or c.find(S + 'f') is not None or v is not None:
                    celulas[p] = c.get('t'), (v.text if v is not None and c.get('t') == 's' else None)
            el.clear()
        for i, f in enumerate(merges):
            for g in merges[i + 1:]:
                if cruza(f, g): erros.append(f'{parte}: mescladas que se cruzam'); break
        sst = None
        tabs = []
        for rid, (tp, alvo) in rels.items():
            if tp == 'table' and alvo in nomes:
                t = etree.fromstring(z.read(alvo))
                f = faixa(t.get('ref', ''))
                if not f: erros.append(f'{alvo}: faixa inválida'); continue
                nm = t.get('displayName') or t.get('name')
                if nm.lower() in tabelas_livro: erros.append(f'{alvo}: nome de tabela repetido no livro')
                if t.get('id') in [x[1] for x in tabelas_livro.values()]: erros.append(f'{alvo}: id de tabela repetido no livro')
                tabelas_livro[nm.lower()] = (alvo, t.get('id'))
                cols = [tc.get('name') for tc in t.iter(S + 'tableColumn')]
                if len(cols) != f[3] - f[1] + 1: erros.append(f'{alvo}: {len(cols)} colunas para uma faixa de {f[3] - f[1] + 1}')
                if len(set(c.lower() for c in cols)) != len(cols): erros.append(f'{alvo}: nomes de coluna repetidos')
                if int(t.get('headerRowCount', '1')) != 0:
                    if sst is None:
                        sst = [''.join(si.itertext()) for si in etree.fromstring(z.read('xl/sharedStrings.xml')).iter(S + 'si')] if nsst else []
                    for k, nmc in enumerate(cols):
                        cel = celulas.get((f[0], f[1] + k))
                        if cel is None: erros.append(f'{alvo}: cabeçalho {k + 1} vazio na aba'); continue
                        if cel[0] == 's':
                            txt = sst[int(cel[1])] if cel[1] and int(cel[1]) < len(sst) else None
                            if txt is not None and txt.replace('\r', '') != (nmc or '').replace('\r', '').replace('_x000a_', '\n').replace('_x000d_', '').replace('_x000D_', '').replace('_x000A_', '\n'):
                                erros.append(f'{alvo}: cabeçalho {k + 1} diferente do nome da coluna')
                        elif cel[0] not in ('str', 'inlineStr'): erros.append(f'{alvo}: cabeçalho {k + 1} não é texto ({cel[0] or "número"})')
                for g in merges:
                    if cruza(f, g): erros.append(f'{alvo}: tabela sobre célula mesclada'); break
                for (alvo2, f2) in tabs:
                    if cruza(f, f2): erros.append(f'{alvo}: tabela sobre outra tabela ({alvo2})')
                tabs.append((alvo, f))
        # desenhos
        for rid, (tp, alvo) in rels.items():
            if tp != 'drawing' or alvo not in nomes: continue
            d = etree.fromstring(z.read(alvo)); dr = rels_de(z, alvo)
            ids = collections.Counter(e.get('id') for e in d.iter(X + 'cNvPr'))
            rep = [k for k, v in ids.items() if v > 1]
            if rep: erros.append(f'{alvo}: id de objeto repetido {rep[:5]}')
            usados = collections.Counter(e.get('{%s}id' % R) for e in d.iter('{http://schemas.openxmlformats.org/drawingml/2006/chart}chart'))
            for k, v in usados.items():
                if v > 1: erros.append(f'{alvo}: o mesmo gráfico ({k}) usado {v} vezes')
                if k not in dr: erros.append(f'{alvo}: gráfico {k} sem relação')
            for an in d:
                if etree.QName(an).localname == 'AlternateContent': continue
                fr, to = an.find(X + 'from'), an.find(X + 'to')
                if fr is not None and to is not None:
                    a = (int(fr.findtext(X + 'row')), int(fr.findtext(X + 'rowOff')), int(fr.findtext(X + 'col')), int(fr.findtext(X + 'colOff')))
                    b = (int(to.findtext(X + 'row')), int(to.findtext(X + 'rowOff')), int(to.findtext(X + 'col')), int(to.findtext(X + 'colOff')))
                    if (b[0], b[1]) < (a[0], a[1]) or (b[2], b[3]) < (a[2], a[3]): erros.append(f'{alvo}: âncora com "até" antes de "de"')
                    if min(a + b) < 0: erros.append(f'{alvo}: âncora com número negativo')
                if len([e for e in an if etree.QName(e).localname in ('sp', 'grpSp', 'graphicFrame', 'pic', 'cxnSp', 'contentPart', 'AlternateContent')]) != 1:
                    erros.append(f'{alvo}: âncora sem objeto ou com mais de um')
                if an.find(X + 'clientData') is None and etree.QName(an).localname != 'absoluteAnchor' and an.find(X + 'clientData') is None:
                    erros.append(f'{alvo}: âncora sem clientData')
    print(f'regras: {len(erros)} problema(s)')
    for e in erros[:60]: print('  ', e)
    return 1 if erros else 0


if __name__ == '__main__': sys.exit(main(sys.argv[1]))
