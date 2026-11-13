#!/usr/bin/env python3
"""Conferente de fora (v0.6.14): confere as partes de um .xlsx/.xlsm contra os esquemas oficiais do formato
(ECMA-376, transicional). É o mais perto que dá de saber, sem o Excel, se ele vai reclamar de "conteúdo com problema".

Uso: python3 conferir-xsd.py arquivo.xlsx [--json saida.json]
Os esquemas NÃO ficam no projeto: a pasta vem de EFC_XSD (padrão /tmp/f0/xsd) e precisa ter sml.xsd, dml-chart.xsd,
dml-spreadsheetDrawing.xsd e os que eles importam (conjunto do python-docx, licença MIT, pasta ref/xsd).

O que é extensão da Microsoft (mc:AlternateContent, atributos x14ac:, xr:, etc.) sai antes de conferir: o esquema
oficial não conhece e o Excel aceita. Dentro de <extLst> o esquema já deixa passar qualquer coisa.
"""
import json, os, re, sys, zipfile
from lxml import etree

PASTA = os.environ.get('EFC_XSD', '/tmp/f0/xsd')
MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006'
CONHECIDOS = {
    'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'http://schemas.openxmlformats.org/drawingml/2006/main',
    'http://schemas.openxmlformats.org/drawingml/2006/chart',
    'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing',
    'http://schemas.openxmlformats.org/drawingml/2006/chartDrawing',
    'http://schemas.openxmlformats.org/drawingml/2006/picture',
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'http://schemas.openxmlformats.org/officeDocument/2006/sharedTypes',
}
RAIZES = {'worksheet', 'workbook', 'styleSheet', 'sst', 'comments', 'table', 'wsDr', 'chartSpace', 'metadata', 'calcChain', 'userShapes'}


def esquema():
    tudo = os.path.join(PASTA, '_tudo.xsd')
    if not os.path.exists(tudo):
        with open(tudo, 'w', encoding='utf-8') as f:
            f.write('<?xml version="1.0" encoding="utf-8"?><xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:efc:tudo">'
                    '<xsd:import namespace="http://schemas.openxmlformats.org/spreadsheetml/2006/main" schemaLocation="sml.xsd"/>'
                    '<xsd:import namespace="http://schemas.openxmlformats.org/drawingml/2006/chart" schemaLocation="dml-chart.xsd"/>'
                    '<xsd:import namespace="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" schemaLocation="dml-spreadsheetDrawing.xsd"/>'
                    '</xsd:schema>')
    return etree.XMLSchema(etree.parse(tudo))


def ns(tag):
    return tag[1:].split('}')[0] if tag.startswith('{') else ''


def dentro_de_ext(el):
    p = el.getparent()
    while p is not None:
        if etree.QName(p).localname == 'ext': return True
        p = p.getparent()
    return False


def limpar(raiz):
    # AlternateContent: fica o Fallback (o que o leitor antigo veria); sem Fallback, sai
    for ac in list(raiz.iter('{%s}AlternateContent' % MC)):
        pai = ac.getparent()
        if pai is None: continue
        fb = ac.find('{%s}Fallback' % MC)
        i = pai.index(ac)
        pai.remove(ac)
        if fb is not None:
            for k, f in enumerate(list(fb)): pai.insert(i + k, f)
    for el in list(raiz.iter()):
        if not isinstance(el.tag, str): continue
        if ns(el.tag) not in CONHECIDOS and not dentro_de_ext(el) and el is not raiz:
            pai = el.getparent()
            if pai is not None: pai.remove(el)
            continue
        for a in list(el.attrib):
            if a.startswith('{') and ns(a) not in CONHECIDOS: del el.attrib[a]


def conferir(arq):
    sch = esquema()
    z = zipfile.ZipFile(arq)
    erros = []
    partes = 0
    for p in z.namelist():
        if not p.endswith('.xml') or not p.startswith('xl/'): continue
        if z.getinfo(p).file_size > 60 * 1024 * 1024: erros.append({'parte': p, 'linha': 0, 'msg': 'não conferida (grande demais)'}); continue
        try:
            doc = etree.fromstring(z.read(p))
        except etree.XMLSyntaxError as e:
            erros.append({'parte': p, 'linha': 0, 'msg': 'XML quebrado: ' + str(e)[:200]}); continue
        if etree.QName(doc).localname not in RAIZES or ns(doc.tag) not in CONHECIDOS: continue
        partes += 1
        limpar(doc)
        if not sch.validate(doc):
            for e in sch.error_log:
                erros.append({'parte': p, 'linha': e.line, 'msg': re.sub(r'\{[^}]*\}', '', e.message)[:300]})
    return partes, erros


def main():
    if len(sys.argv) < 2: print(__doc__); return 2
    partes, erros = conferir(sys.argv[1])
    grupos = {}
    for e in erros:
        chave = e['parte'].split('/')[-2] if '/' in e['parte'] else e['parte']
        k = f"{re.sub(r'[0-9]+', 'N', e['parte'])}: {re.sub(r'.*?Element ', 'Element ', e['msg'])[:160]}"
        g = grupos.setdefault(k, {'quantas': 0, 'exemplos': []}); g['quantas'] += 1
        if len(g['exemplos']) < 3: g['exemplos'].append(f"{e['parte']} linha {e['linha']}")
    if '--json' in sys.argv: json.dump({'partes': partes, 'total': len(erros), 'grupos': grupos}, open(sys.argv[sys.argv.index('--json') + 1], 'w'), ensure_ascii=False, indent=1)
    print(f'esquema oficial: {partes} partes conferidas, {len(erros)} problema(s)')
    for k, g in sorted(grupos.items(), key=lambda x: -x[1]['quantas']): print(f"  {g['quantas']:5d}  {k} ({'; '.join(g['exemplos'])})")
    return 1 if erros else 0


if __name__ == '__main__': sys.exit(main())
