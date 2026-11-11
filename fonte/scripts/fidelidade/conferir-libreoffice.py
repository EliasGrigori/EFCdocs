#!/usr/bin/env python3
"""EFCdocs · conferente de fora 2 (Método Sabiá 2.0, lente 6.3): o LibreOffice recalcula o .xlsx que o EFCdocs SALVOU e
compara cada fórmula: o valor que o EFCdocs gravou contra o valor que o LibreOffice calculou.
Uso: python3 conferir-libreoffice.py <salvo.xlsx> [--json saida.json] [--pasta-temp DIR]
Sai com código 1 se houver diferença; código 3 se o LibreOffice não estiver instalado.
Mostra o endereço e o nome das funções da fórmula, nunca o conteúdo das células de texto."""
import json, os, re, shutil, subprocess, sys, tempfile, zipfile, warnings
warnings.filterwarnings('ignore')
import openpyxl
from openpyxl.utils import get_column_letter

def soffice():
    for n in ('soffice', 'libreoffice'):
        p = shutil.which(n)
        if p: return p
    return None

def com_recalculo(orig, dest):
    """Copia o .xlsx pedindo recálculo ao abrir (fullCalcOnLoad)."""
    with zipfile.ZipFile(orig) as zi, zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as zo:
        for it in zi.infolist():
            d = zi.read(it.filename)
            if it.filename == 'xl/workbook.xml':
                t = d.decode('utf-8')
                if '<calcPr' in t:
                    t = re.sub(r'<calcPr\b([^>]*?)(/?)>', lambda m: '<calcPr' + re.sub(r'\s*fullCalcOnLoad="[^"]*"', '', m.group(1)) + ' fullCalcOnLoad="1"' + m.group(2) + '>', t, count=1)
                else:
                    t = t.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>')
                d = t.encode('utf-8')
            zo.writestr(it, d)

def recalcular(arq, pasta):
    so = soffice()
    if not so: return None
    entrada = os.path.join(pasta, 'entrada.xlsx'); com_recalculo(arq, entrada)
    saida = os.path.join(pasta, 'lo'); os.makedirs(saida, exist_ok=True)
    perfil_dir = os.path.join(pasta, 'perfil-lo'); perfil = 'file://' + perfil_dir
    # Mesma língua do Excel do Elias (pt-BR): TEXTO(data;"mmmm") dá "janeiro", não "January"
    os.makedirs(os.path.join(perfil_dir, 'user'), exist_ok=True)
    reg = os.path.join(perfil_dir, 'user', 'registrymodifications.xcu')
    if not os.path.exists(reg):
        open(reg, 'w').write('<?xml version="1.0" encoding="UTF-8"?><oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
          '<item oor:path="/org.openoffice.Setup/L10N"><prop oor:name="ooSetupSystemLocale" oor:op="fuse"><value>pt-BR</value></prop></item>'
          '<item oor:path="/org.openoffice.Setup/L10N"><prop oor:name="ooLocale" oor:op="fuse"><value>pt-BR</value></prop></item>'
          '<item oor:path="/org.openoffice.Office.Linguistic/General"><prop oor:name="DefaultLocale" oor:op="fuse"><value>pt-BR</value></prop></item></oor:items>')
    subprocess.run([so, f'-env:UserInstallation={perfil}', '--headless', '--norestore', '--convert-to', 'xlsx:Calc MS Excel 2007 XML', '--outdir', saida, entrada],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=600, check=False)
    r = os.path.join(saida, 'entrada.xlsx')
    return r if os.path.exists(r) else None

FUNC = re.compile(r'([A-Z][A-Z0-9.]*)\(')
def funcoes(f): return sorted(set(re.sub(r'^_?(XLFN|XLWS|XLPM)\.', '', x) for x in FUNC.findall(str(f).upper())))
# Funções que o LibreOffice desta máquina pode não conhecer (matriz dinâmica): o #NOME? dele não é erro do EFCdocs
SO_EXCEL_NOVO = {'FILTER','UNIQUE','SORT','SORTBY','SEQUENCE','RANDARRAY','XLOOKUP','XMATCH','TEXTSPLIT','VSTACK','HSTACK','TOCOL','TOROW','CHOOSECOLS','CHOOSEROWS','TAKE','DROP','EXPAND','WRAPCOLS','WRAPROWS','LET','LAMBDA','ANCHORARRAY','SINGLE'}

def normal(v):
    if v is None or v == '': return ('vazio', None)
    if isinstance(v, bool): return ('lógico', v)
    if isinstance(v, (int, float)): return ('número', float(v))
    if hasattr(v, 'isoformat'): return ('data', v.isoformat()[:19])
    s = str(v)
    if s.startswith('#'): return ('erro', s.rstrip('!?').upper())
    return ('texto', s)

def iguais(a, b):
    if a == b: return True
    if a[0] == 'número' and b[0] == 'número':
        x, y = a[1], b[1]; return abs(x - y) <= 1e-7 * max(1.0, abs(x), abs(y))
    if a[0] == 'erro' and b[0] == 'erro': return True  # o tipo exato do erro varia entre programas
    if {a[0], b[0]} == {'data', 'número'}: return True  # LibreOffice às vezes devolve a data como número de série
    return False

def comparar(salvo, pasta):
    lo = recalcular(salvo, pasta)
    if lo is None: return None
    F = openpyxl.load_workbook(salvo)                  # fórmulas
    E = openpyxl.load_workbook(salvo, data_only=True)  # valores que o EFCdocs gravou
    L = openpyxl.load_workbook(lo, data_only=True)     # valores que o LibreOffice calculou
    dif = []; total = 0; naoSabe = []
    for nome in F.sheetnames:
        if nome not in L.sheetnames: dif.append({'onde': nome, 'funcoes': [], 'efcdocs': 'aba', 'libreoffice': 'sumiu'}); continue
        f, e, l = F[nome], E[nome], L[nome]
        for row in f.iter_rows():
            for c in row:
                v = c.value
                txt = v.text if type(v).__name__ == 'ArrayFormula' else v
                if not (isinstance(txt, str) and txt.startswith('=')): continue
                total += 1
                a = normal(e.cell(c.row, c.column).value); b = normal(l.cell(c.row, c.column).value)
                if not iguais(a, b):
                    if b == ('erro', '#NAME') and set(funcoes(txt)) & SO_EXCEL_NOVO: naoSabe.append(f'{nome}!{get_column_letter(c.column)}{c.row}'); continue
                    dif.append({'onde': f'{nome}!{get_column_letter(c.column)}{c.row}', 'funcoes': funcoes(txt),
                                'efcdocs': a[0] if a[0] == 'texto' else a, 'libreoffice': b[0] if b[0] == 'texto' else b})
    return {'formulas': total, 'diferencas': dif, 'libreoffice_nao_conhece': naoSabe}

def main():
    if len(sys.argv) < 2: print(__doc__); return 2
    if not soffice(): print('libreoffice: não instalado, conferência pulada'); return 3
    pasta = sys.argv[sys.argv.index('--pasta-temp') + 1] if '--pasta-temp' in sys.argv else tempfile.mkdtemp(prefix='efc-lo-')
    os.makedirs(pasta, exist_ok=True)
    r = comparar(sys.argv[1], pasta)
    if r is None: print('libreoffice: não conseguiu converter o arquivo'); return 1
    if '--json' in sys.argv: json.dump(r, open(sys.argv[sys.argv.index('--json') + 1], 'w'), ensure_ascii=False, indent=1, default=str)
    print(f"libreoffice: {r['formulas']} fórmulas recalculadas, {len(r['diferencas'])} diferença(s)" + (f", {len(r['libreoffice_nao_conhece'])} com função que este LibreOffice não conhece (não conferidas)" if r['libreoffice_nao_conhece'] else ''))
    por = {}
    for d in r['diferencas']:
        k = ','.join(d['funcoes']) or '(sem função)'; g = por.setdefault(k, []); g.append(d)
    for k, g in sorted(por.items(), key=lambda x: -len(x[1])):
        ex = g[0]; print(f"  {len(g):5d}  {k}: {ex['onde']} EFCdocs {ex['efcdocs']} · LibreOffice {ex['libreoffice']}")
    return 1 if r['diferencas'] else 0
if __name__ == '__main__': sys.exit(main())
