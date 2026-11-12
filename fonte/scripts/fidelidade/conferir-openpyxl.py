#!/usr/bin/env python3
"""EFCdocs · conferente de fora 1 (Método Sabiá 2.0, lente 6.3): o openpyxl compara o .xlsx ORIGINAL com o .xlsx que o EFCdocs SALVOU.
Confere abas, valores e fórmulas, formato de número, fonte, preenchimento, bordas, alinhamento, mesclas, congelamento,
larguras, alturas, ocultas, tabelas, validações, formatação condicional, imagens e nomes definidos.
Uso: python3 conferir-openpyxl.py <original.xlsx> <salvo.xlsx> [--json saida.json]
Sai com código 1 se houver diferença. Os exemplos mostram só o endereço e o tipo de diferença."""
import colorsys, json, re, sys, warnings, zipfile
warnings.filterwarnings('ignore')
import openpyxl
from openpyxl.utils import get_column_letter

TEMA = {}
def ler_tema(wb):
    TEMA.clear()
    xml = wb.loaded_theme.decode('utf-8', 'ignore') if getattr(wb, 'loaded_theme', None) else ''
    m = re.search(r'<a:clrScheme\b[^>]*>(.*?)</a:clrScheme>', xml, re.S)
    if not m: return
    cores = []
    for nome in ('dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'):
        b = re.search(r'<a:%s>(.*?)</a:%s>' % (nome, nome), m.group(1), re.S)
        v = re.search(r'(?:srgbClr val|lastClr)="([0-9A-Fa-f]{6})"', b.group(1)) if b else None
        cores.append(v.group(1).upper() if v else None)
    # índice do Excel: 0 = lt1, 1 = dk1, 2 = lt2, 3 = dk2, 4.. = destaques
    ordem = [cores[1], cores[0], cores[3], cores[2]] + cores[4:]
    for i, v in enumerate(ordem): TEMA[i] = v

def aplicar_tom(hexa, tint):
    if not tint: return hexa
    r, g, b = (int(hexa[i:i + 2], 16) / 255 for i in (0, 2, 4))
    h, l, s_ = colorsys.rgb_to_hls(r, g, b)
    l = l * (1 + tint) if tint < 0 else l * (1 - tint) + tint
    r, g, b = colorsys.hls_to_rgb(h, l, s_)
    return '%02X%02X%02X' % tuple(round(x * 255) for x in (r, g, b))

def cor(c):
    if c is None: return None
    t = getattr(c, 'type', None)
    if t == 'rgb':
        v = (c.rgb or '').upper()
        if not isinstance(v, str): return None
        return None if v in ('00000000',) else v[-6:]
    if t == 'theme':
        base = TEMA.get(c.theme)
        return aplicar_tom(base, c.tint) if base else f'tema{c.theme}{"%+.2f" % c.tint if c.tint else ""}'
    if t == 'indexed': return None if c.indexed in (64, 65) else f'idx{c.indexed}'
    return None

def borda(b):
    o = {}
    for lado in ('left', 'right', 'top', 'bottom'):
        s = getattr(b, lado)
        if s is not None and s.style: o[lado] = (s.style, cor(s.color) or '000000')
    return o

def estilo(c):
    f = c.font; fl = c.fill; al = c.alignment
    e = {}
    if f is not None:
        if f.b: e['negrito'] = True
        if f.i: e['itálico'] = True
        if f.u and f.u != 'none': e['sublinhado'] = f.u
        if f.strike: e['tachado'] = True
        if f.sz and abs(float(f.sz) - 11) > 0.01: e['tamanho'] = round(float(f.sz), 1)
        k = cor(f.color)
        if k and k not in ('000000', 'tema1'): e['cor'] = k
    if fl is not None and fl.fill_type == 'solid':
        k = cor(fl.fgColor) or cor(fl.start_color)
        if k: e['fundo'] = k
    b = borda(c.border)
    if b: e['borda'] = b
    if al is not None:
        if al.horizontal and al.horizontal != 'general': e['horizontal'] = al.horizontal
        if al.vertical and al.vertical != 'bottom': e['vertical'] = al.vertical
        if al.wrap_text: e['quebra'] = True
        if al.text_rotation: e['giro'] = al.text_rotation
        if al.indent: e['recuo'] = al.indent
    nf = c.number_format or 'General'
    nf = PT_BR.get(nf, nf)
    if nf != 'General': e['formato'] = nf
    return e

# Formatos embutidos de data e hora: o openpyxl dá o nome em inglês; o Excel em português mostra assim (é o que o EFCdocs grava)
PT_BR = {'mm-dd-yy': 'dd/mm/yyyy', 'h:mm': 'hh:mm', 'h:mm:ss': 'hh:mm:ss', 'm/d/yy h:mm': 'dd/mm/yyyy hh:mm'}

def perto(x, y):
    if x == y: return True
    if isinstance(x, str) and isinstance(y, str) and re.fullmatch(r'[0-9A-F]{6}', x) and re.fullmatch(r'[0-9A-F]{6}', y):
        return all(abs(int(x[i:i + 2], 16) - int(y[i:i + 2], 16)) <= 2 for i in (0, 2, 4))
    if isinstance(x, dict) and isinstance(y, dict) and set(x) == set(y): return all(perto(x[k], y[k]) for k in x)
    if isinstance(x, tuple) and isinstance(y, tuple) and len(x) == len(y): return all(perto(a, b) for a, b in zip(x, y))
    return False

def visivel(e): return bool(e.get('borda') or e.get('fundo'))

def norm_formula(v):
    s = str(v)[1:] if str(v).startswith('=') else str(v)
    s = s.replace('_xlfn.', '').replace('_xlws.', '').replace('_xlpm.', '')
    return re.sub(r'\s+', '', s).upper()

def valor(c):
    v = c.value
    if v is None: return None
    if isinstance(v, str) and v.startswith('='): return ('fórmula', norm_formula(v))
    if hasattr(v, 'text') and not isinstance(v, str): v = getattr(v, 'text', v)  # ArrayFormula
    if type(v).__name__ == 'ArrayFormula': return ('fórmula', norm_formula(v.text))
    if type(v).__name__ == 'CellRichText': return ('texto', str(v))
    if isinstance(v, bool): return ('lógico', v)
    if isinstance(v, (int, float)): return ('número', round(float(v), 9))
    if hasattr(v, 'isoformat'): return ('data', v.isoformat()[:19])
    return ('texto', str(v))

def larguras(ws):
    o = {}
    for k, d in ws.column_dimensions.items():
        for col in range(d.min or 0, (d.max or 0) + 1):
            if col <= 0 or col > 16384: continue
            if d.hidden: o[col] = 'oculta'
            elif d.customWidth and d.width: o[col] = round(float(d.width) * 2) / 2
    return o

def alturas(ws):
    o = {}
    padrao = float(ws.sheet_format.defaultRowHeight or 15)
    for r, d in ws.row_dimensions.items():
        if d.hidden: o[r] = 'oculta'
        elif d.ht and abs(float(d.ht) - padrao) > 0.6: o[r] = round(float(d.ht) / 0.75)
    return o

def validacoes_x14(arq):
    """Validações guardadas na extensão x14 (lista que aponta para outra aba): o openpyxl não lê; lemos direto do XML."""
    out = {}
    with zipfile.ZipFile(arq) as z:
        wb = z.read('xl/workbook.xml').decode('utf-8', 'ignore')
        rels = z.read('xl/_rels/workbook.xml.rels').decode('utf-8', 'ignore')
        alvo = {m.group(1): m.group(2) for m in re.finditer(r'<Relationship\b[^>]*?Id="([^"]+)"[^>]*?Target="([^"]+)"', rels)}
        alvo.update({m.group(2): m.group(1) for m in re.finditer(r'<Relationship\b[^>]*?Target="([^"]+)"[^>]*?Id="([^"]+)"', rels)})
        for i, m in enumerate(re.finditer(r'<sheet\b[^>]*?r:id="([^"]+)"', wb)):
            t = alvo.get(m.group(1), ''); t = t.lstrip('/'); t = t if t.startswith('xl/') else 'xl/' + t
            try: x = z.read(t).decode('utf-8', 'ignore')
            except KeyError: continue
            for dv in re.finditer(r'<x14:dataValidation\b([^>]*)>(.*?)</x14:dataValidation>', x, re.S):
                tp = re.search(r'\btype="([^"]+)"', dv.group(1)); f1 = re.search(r'<x14:formula1>\s*<xm:f>(.*?)</xm:f>', dv.group(2), re.S)
                f2 = re.search(r'<x14:formula2>\s*<xm:f>(.*?)</xm:f>', dv.group(2), re.S); sq = re.search(r'<xm:sqref>(.*?)</xm:sqref>', dv.group(2), re.S)
                un = lambda v: v.replace('&amp;', '&').replace('&quot;', '"').replace('&lt;', '<').replace('&gt;', '>').replace('$', '') if v else ''
                out.setdefault(i, []).append((tp.group(1) if tp else 'any', sq.group(1) if sq else '', un(f1.group(1) if f1 else ''), un(f2.group(1) if f2 else '')))
    return out

def comparar(orig, salvo):
    A = openpyxl.load_workbook(orig); B = openpyxl.load_workbook(salvo)
    x14 = validacoes_x14(orig)
    dif = []
    def add(cat, onde, como): dif.append({'categoria': cat, 'onde': onde, 'como': como})
    if len(A.sheetnames) != len(B.sheetnames): add('abas', '(pasta)', f'{len(A.sheetnames)} abas → {len(B.sheetnames)} abas')
    for i, nome in enumerate(A.sheetnames):
        if i >= len(B.sheetnames): continue
        nomeB = B.sheetnames[i]
        if nomeB != nome:
            add('nome da aba: espaço no começo ou no fim sumiu' if nomeB == nome.strip() else 'nome da aba', f'aba {i + 1}', f'{len(nome)} letras → {len(nomeB)} letras')
        ler_tema(A); a = A[nome]; b = B[nomeB]
        if a.sheet_state != b.sheet_state: add('aba oculta', nome, f'{a.sheet_state} → {b.sheet_state}')
        maxL = maxC = maxLdados = 0
        for row in a.iter_rows():
            for c in row:
                if c.value is not None: maxL = max(maxL, c.row); maxC = max(maxC, c.column)
                if c.value is not None and not (isinstance(c.value, str) and c.value.startswith('=')) and c.value != '': maxLdados = max(maxLdados, c.row)
        fimB = b.max_row
        ca = {(c.row, c.column): c for row in a.iter_rows() for c in row}
        cb = {(c.row, c.column): c for row in b.iter_rows() for c in row}
        for (r, k), c in ca.items():
            ref = f'{nome}!{get_column_letter(k)}{r}'
            va = valor(c); d = cb.get((r, k)); vb = valor(d) if d is not None else None
            if va == ('texto', '') : va = None
            if vb == ('texto', '') : vb = None
            if r > fimB and d is None:
                if va and va[0] == 'fórmula' and r > maxLdados: add('fórmula de folga cortada', ref, 'fórmula depois do último dado não voltou')
                elif va is not None or visivel(estilo(c)): add('linha depois do corte (não voltou)', ref, 'o EFCdocs parou antes desta linha')
                continue
            if va != vb:
                if va and vb and va[0] == 'fórmula' and vb[0] == 'fórmula':
                    if re.search(r'[A-Z_][A-Z0-9_.]*\[', va[1]) and not re.search(r'[A-Z_][A-Z0-9_.]*\[', vb[1]): add('fórmula: referência de tabela virou endereço', ref, 'mesma conta, escrita com endereços')
                    else: add('fórmula', ref, 'texto da fórmula diferente')
                elif va and vb and va[0] == 'texto' and vb[0] == 'texto' and va[1].replace('_x000D_', '').replace('\r', '') == vb[1].replace('_x000D_', '').replace('\r', ''):
                    add('texto: quebra de linha do Windows (\\r\\n) virou \\n', ref, 'mesmo texto na tela')
                elif va and va[0] == 'fórmula' and not vb and r > maxLdados: add('fórmula de folga cortada', ref, 'fórmula depois do último dado não voltou')
                elif va and vb and va[0] == 'número' and vb[0] == 'número' and abs(va[1] - vb[1]) <= 1e-9 * max(1, abs(va[1])): pass
                elif va and vb and va[0] == 'número' and vb[0] == 'texto' and vb[1] in (str(int(va[1])) if float(va[1]).is_integer() else str(va[1]),): add('número virou o mesmo texto', ref, 'número → texto igual')
                else: add('valor', ref, f'{va[0] if va else "vazia"} → {vb[0] if vb else "vazia"}')
            ler_tema(A); ea = estilo(c); ler_tema(B); eb = estilo(d) if d is not None else {}
            if not perto(ea, eb):
                if not va and not visivel(ea) and not visivel(eb): continue
                if not va and (r > maxL + 1000 or k > maxC + 2) and not visivel(eb):
                    if visivel(ea): add('formatação vazia longe dos dados', ref, 'descartada')
                    continue
                for chave in sorted(set(ea) | set(eb)):
                    if not perto(ea.get(chave), eb.get(chave)): add('estilo: ' + chave, ref, 'diferente')
        if set(map(str, a.merged_cells.ranges)) != set(map(str, b.merged_cells.ranges)):
            sa, sb = set(map(str, a.merged_cells.ranges)), set(map(str, b.merged_cells.ranges))
            for m in sorted(sa - sb)[:20]: add('mescla', f'{nome}!{m}', 'sumiu')
            for m in sorted(sb - sa)[:20]: add('mescla', f'{nome}!{m}', 'apareceu')
        def painel(ws):
            pn = ws.sheet_view.pane
            return (pn.xSplit or 0, pn.ySplit or 0, pn.state) if pn is not None and pn.state in ('frozen', 'frozenSplit') else None
        if painel(a) != painel(b): add('congelamento', nome, f'{painel(a)} → {painel(b)}')
        elif (a.freeze_panes or None) != (b.freeze_panes or None): add('posição da rolagem ao abrir (congelamento igual)', nome, f'{a.freeze_panes} → {b.freeze_panes}')
        def criterios(ws):
            r = []
            for t in ws.tables.values():
                af = t.autoFilter
                if af is not None: r += [(t.name, fc.colId) for fc in (af.filterColumn or [])]
            if ws.auto_filter is not None: r += [('(aba)', fc.colId) for fc in (ws.auto_filter.filterColumn or [])]
            return sorted(r)
        ka, kb = criterios(a), criterios(b)
        for x in sorted(set(ka) - set(kb)): add('filtro: critério sumiu (as linhas continuam ocultas)', f'{nome}!{x[0]}', f'coluna {x[1] + 1} da faixa')
        for x in sorted(set(kb) - set(ka)): add('filtro: critério apareceu', f'{nome}!{x[0]}', f'coluna {x[1] + 1} da faixa')
        la, lb = larguras(a), larguras(b)
        for col in sorted(set(la) | set(lb)):
            x, y = la.get(col), lb.get(col)
            if x == 'oculta' and y is None: add('coluna oculta voltou a aparecer', f'{nome}!{get_column_letter(col)}', 'oculta → visível')
            elif x != y and not (isinstance(x, float) and isinstance(y, float) and abs(x - y) <= 0.75): add('largura', f'{nome}!{get_column_letter(col)}', f'{x} → {y}')
        ha, hb = alturas(a), alturas(b)
        for r in sorted(set(ha) | set(hb)):
            x, y = ha.get(r), hb.get(r)
            if x != y and not (isinstance(x, int) and isinstance(y, int) and abs(x - y) <= 1): add('altura', f'{nome}!{r}', f'{x} → {y}')
        ta = {t.name: t for t in a.tables.values()}; tb = {t.name: t for t in b.tables.values()}
        for n in sorted(set(ta) | set(tb)):
            x, y = ta.get(n), tb.get(n)
            if not x or not y: add('tabela', f'{nome}!{n}', 'sumiu' if x else 'apareceu'); continue
            if x.ref != y.ref: add('tabela', f'{nome}!{n}', f'faixa {x.ref} → {y.ref}')
            if [c.name for c in x.tableColumns] != [c.name for c in y.tableColumns]: add('tabela', f'{nome}!{n}', 'nomes das colunas diferentes')
            sx = x.tableStyleInfo.name if x.tableStyleInfo else None; sy = y.tableStyleInfo.name if y.tableStyleInfo else None
            if sx != sy: add('tabela', f'{nome}!{n}', f'estilo {sx} → {sy}')
        def vals(ws): return sorted((dv.type or 'any', str(dv.sqref), str(dv.formula1 or '').replace('$', ''), str(dv.formula2 or '').replace('$', '')) for dv in ws.data_validations.dataValidation)
        va_, vb_ = sorted(vals(a) + x14.get(i, [])), vals(b)
        if va_ != vb_:
            for v in sorted(set(va_) - set(vb_))[:10]: add('validação', f'{nome}!{v[1]}', f'{v[0]} sumiu ou mudou')
            for v in sorted(set(vb_) - set(va_))[:10]: add('validação', f'{nome}!{v[1]}', f'{v[0]} apareceu ou mudou')
        def conds(ws): return sorted((str(rg.sqref), r.type) for rg in ws.conditional_formatting for r in rg.rules)
        if conds(a) != conds(b): add('formatação condicional', nome, f'{len(conds(a))} regras → {len(conds(b))} regras')
        if len(a._images) != len(b._images): add('imagem', nome, f'{len(a._images)} → {len(b._images)}')
        if len(getattr(a, '_charts', [])) != len(getattr(b, '_charts', [])): add('gráfico (openpyxl)', nome, f'{len(a._charts)} → {len(b._charts)}')
    da = sorted(n for n in A.defined_names); db = sorted(n for n in B.defined_names)
    if da != db: add('nome definido', '(pasta)', f'{len(da)} → {len(db)}')
    return dif

def main():
    if len(sys.argv) < 3: print(__doc__); return 2
    dif = comparar(sys.argv[1], sys.argv[2])
    grupos = {}
    for d in dif: g = grupos.setdefault(d['categoria'], {'quantas': 0, 'exemplos': []}); g['quantas'] += 1; len(g['exemplos']) < 3 and g['exemplos'].append(f"{d['onde']} ({d['como']})")
    if '--json' in sys.argv: json.dump({'total': len(dif), 'grupos': grupos}, open(sys.argv[sys.argv.index('--json') + 1], 'w'), ensure_ascii=False, indent=1)
    print(f'openpyxl: {len(dif)} diferença(s)')
    for k, g in sorted(grupos.items(), key=lambda x: -x[1]['quantas']): print(f"  {g['quantas']:5d}  {k}: {'; '.join(g['exemplos'])}")
    return 1 if dif else 0
if __name__ == '__main__': sys.exit(main())
