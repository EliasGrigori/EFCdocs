#!/usr/bin/env python3
"""Vértice Docs — página de aprovação do layout da família (v0.6.21, faixa igual ao Excel, parte 1: Página Inicial).
Formato da família (o mesmo do EFCwork v0.6.15): número do ITEM grande, HOJE e PROPOSTA tirados do app de verdade,
imagens que ampliam, "Ver funcionando no app" (o app de verdade dentro da página, com arquivos inventados na memória),
Aprovado/Reprovado, comentário e Copiar respostas. Um arquivo só, tudo embutido.

Uso: python3 scripts/montar-aprovacao-layout.py <pasta dos prints> <dist HOJE> <dist PROPOSTA> <saida.html> <resumo.json>"""
import base64, gzip, io, json, os, re, sys
from PIL import Image

PRINTS, DIST_HOJE, DIST_PROP, SAIDA, RESUMO = sys.argv[1:6]
AQUI = os.path.dirname(os.path.abspath(__file__))
R = json.load(open(RESUMO, encoding='utf-8'))
b64 = lambda b: base64.b64encode(b).decode()

def imagem(nome, larg=None, q=82):
    im = Image.open(os.path.join(PRINTS, nome + '.png')).convert('RGB')
    if larg and im.width > larg: im = im.resize((larg, round(im.height * larg / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=q, method=6)
    return f'data:image/webp;base64,{b64(buf.getvalue())}', im.width, im.height

def app(dist):
    """O app montado, num texto só: CSS com as letras embutidas e o código; os dois compactados para a página não pesar."""
    idx = open(os.path.join(dist, 'index.html'), encoding='utf-8').read()
    css = open(os.path.join(dist, 'assets', re.search(r'href="\./assets/(app-[^"]+\.css)"', idx).group(1)), encoding='utf-8').read()
    js = open(os.path.join(dist, 'assets', re.search(r'src="\./assets/(app-[^"]+\.js)"', idx).group(1)), encoding='utf-8').read()
    css = re.sub(r'url\("?\./(app-[A-Z0-9]+\.woff2)"?\)', lambda m: 'url(data:font/woff2;base64,' + b64(open(os.path.join(dist, 'assets', m.group(1)), 'rb').read()) + ')', css)
    assert '.woff2' not in css, 'sobrou letra de fora'
    icone = io.BytesIO(); Image.open(os.path.join(dist, 'icon-192.png')).convert('RGBA').resize((68, 68), Image.LANCZOS).save(icone, 'PNG')
    assert 'src:"icon-192.png"' in js
    js = js.replace('src:"icon-192.png"', 'src:"data:image/png;base64,' + b64(icone.getvalue()) + '"').replace('</script', '<\\/script')
    z = lambda t: b64(gzip.compress(t.encode('utf-8'), 9))
    return z(css), z(js)

itens, grupos_vistos = [], set()
def grupo(t): itens.append(f'<h2 class="grupo">{t}</h2>')
def par(leg, nome, cel=False, larg=None):
    h, w1, h1 = imagem(nome + '-hoje', larg); p, w2, h2 = imagem(nome + '-prop', larg)
    fig = lambda cls, rot, lado, src, w, a, alt: f'<figure class="{cls}"><figcaption>{rot}</figcaption><button type="button" class="zoom" data-par="{nome}" data-lado="{lado}" aria-label="Ampliar: {rot.lower()} · {leg}"><img loading="lazy" width="{w}" height="{a}" src="{src}" alt="{alt}: {leg}"></button></figure>'
    return f'<div class="par{" par-cel" if cel else ""}"><p class="leg">{leg}</p><div class="lado">{fig("hoje", "HOJE", "hoje", h, w1, h1, "Como está hoje")}{fig("prop", "PROPOSTA", "prop", p, w2, h2, "Proposta")}</div></div>'
def filme(leg, nomes, rotulos):
    def tira(lado, rot):
        qs = ''.join(f'<figure><img loading="lazy" width="{w}" height="{a}" src="{s}" alt="{rot}, {r}"><figcaption>{r}</figcaption></figure>' for (s, w, a), r in ((imagem(f'{n}-{lado}', 420, 74), r) for n, r in zip(nomes, rotulos)))
        return f'<div class="tira"><b>{rot}</b><div class="qs">{qs}</div></div>'
    return f'<div class="filme"><p class="leg">{leg}</p>{tira("hoje", "HOJE")}{tira("prop", "PROPOSTA")}</div>'
def vivo(n, rota, dica, atraso=0):
    return (f'<div class="vivo" data-n="{n}" data-rota="{rota}" data-atraso="{atraso}"><div class="vbar"><button type="button" class="bt pr" data-v="abre">Ver funcionando no app</button>'
            '<span class="vctl" hidden><span class="seg" role="group" aria-label="Versão"><button type="button" data-v="hoje" aria-pressed="false">HOJE</button><button type="button" data-v="prop" aria-pressed="true">PROPOSTA</button></span>'
            '<button type="button" class="bt" data-v="denovo">Ver de novo</button><span class="seg" role="group" aria-label="Aparelho"><button type="button" data-v="ap" data-ap="pc" aria-pressed="true">PC</button><button type="button" data-v="ap" data-ap="cel" aria-pressed="false">Celular</button></span>'
            '<span class="seg" role="group" aria-label="Tema"><button type="button" data-v="tema" data-tema="papel" aria-pressed="true">Claro</button><button type="button" data-v="tema" data-tema="dark" aria-pressed="false">Escuro</button></span>'
            '<button type="button" class="bt" data-v="cheia">Tela cheia</button><button type="button" class="bt" data-v="fecha">Fechar o app</button></span></div>'
            f'<p class="vdica" hidden>{dica}</p><div class="vpal" hidden></div></div>')
def item(n, titulo, texto, ref, corpo):
    itens.append(f'<article class="it" id="item-{n}" data-n="{n}" data-t="{titulo}"><header><div class="num">ITEM <span>{n}</span></div><div class="cab"><h3>{titulo}</h3>{texto}<p class="ref"><b>De onde vem</b> {ref}</p></div></header>{corpo}'
                 f'<div class="resp"><div class="voto"><input type="radio" name="v{n}" id="ok{n}" value="APROVADO"><label class="ok" for="ok{n}">Aprovado</label><input type="radio" name="v{n}" id="no{n}" value="REPROVADO"><label class="no" for="no{n}">Reprovado</label></div>'
                 f'<label class="com">Comentário<textarea id="c{n}" rows="1" placeholder="O que mudar, se quiser (opcional)"></textarea></label></div></article>')
L = lambda url, t: f'<a href="{url}" target="_blank" rel="noopener">{t}</a>'

# ------------------------------------------------------------------ os itens
import json as _j
def so_prop(leg, nome, larg=None):
    s, w, a = imagem(nome + '-prop', larg)
    return f'<div class="par so"><p class="leg">{leg}</p><div class="lado um"><figure class="prop"><figcaption>PROPOSTA (hoje não existe)</figcaption><button type="button" class="zoom" data-par="{nome}" data-lado="prop" aria-label="Ampliar: {leg}"><img loading="lazy" width="{w}" height="{a}" src="{s}" alt="Proposta: {leg}"></button></figure></div></div>'
def mov(n, rota, passos, rotulo='Ver o movimento no app'):
    """O app de verdade dentro da página, com um roteiro que roda sozinho (clica, digita, aperta tecla)."""
    return vivo(n, rota, 'O app faz os passos sozinho, um por um. Depois você pode mexer à vontade. “Ver de novo” repete os passos sem recarregar.').replace('class="vivo"', "class=\"vivo\" data-passos='" + _j.dumps(passos, ensure_ascii=False).replace("'", '&#39;') + "'").replace('Ver funcionando no app', rotulo)
E = lambda ms: ['espera', ms]
C = lambda sel, n=0: ['clica', sel, n]
D = lambda t: ['diz', t]
T = lambda k, **m: ['tecla', k, m]
REN = '.tb-arq tr.arq .iconbtn[aria-label^="Renomear"]'
FLU = 'Regra fixa de fluidez (pacote fluidez-comandos-efc), item '

ABRE = [E(500), C('.tb-arq tr.arq .abre', 0), E(1800)]
VAI = lambda ref: [['digita', '.pl-nome', ref], T('Enter'), E(500)]
LISTA = lambda v: C('.rb-lista [data-valor="' + v + '"]')
CMD = lambda c: C('.ribbon [data-cmd="' + c + '"]')
EXCEL = 'Seu pedido: “bem parecido com Excel, locais e posicionamento, para atrair quem é do Excel, mas com sua graça própria”. Regra R25 (faixa igual ao Excel).'

grupo('Página Inicial nos lugares do Excel')
item(1, 'Os grupos na ordem do Excel, com os botões nos mesmos lugares',
     '<p>A Página Inicial passa a ter os sete grupos na ordem do Excel: Área de transferência, Fonte, Alinhamento, Número, Estilos, Células e Edição. Dentro de cada grupo os botões ficam em duas linhas, na mesma posição em que ficam no Excel. Quem vem do Excel acha tudo sem procurar.</p>'
     '<p>As cores, as letras e o desenho dos ícones continuam os do Vértice (marfim e ouro). Não copiei nenhum ícone do Excel.</p>',
     EXCEL,
     par('Planilha aberta, tema Claro (HOJE = v0.6.20)', 'faixa') + par('Tema Escuro', 'faixa-escuro')
     + mov(1, '#/planilha', ABRE + [D('A Página Inicial nova. Pode mexer à vontade.'), E(1500)], 'Ver a faixa nova no app'))
item(2, 'Fonte: caixa da letra, caixa do tamanho e os botões A maior e A menor',
     '<p>Hoje, para trocar a letra ou o tamanho, é preciso abrir uma janela. Na proposta, como no Excel, a primeira linha do grupo traz a caixa com o nome da letra, a caixa com o tamanho e os dois botões que aumentam e diminuem um degrau. A segunda linha traz negrito, itálico, sublinhado, bordas, cor de fundo e cor da letra.</p>'
     '<p>As caixas mostram sempre a letra e o tamanho da célula escolhida. Na lista, cada letra aparece escrita com ela mesma. A janela completa continua em “Mais opções de letra…”.</p>',
     EXCEL,
     par('Grupo Fonte', 'g-fonte', larg=860) + so_prop('Lista das letras aberta', 'l-fonte') + so_prop('Lista dos tamanhos aberta', 'l-tamanho')
     + mov(2, '#/planilha', ABRE + VAI('A1') + [D('Abrindo a lista das letras'), C('[data-cx=fonte]'), E(1500), D('Escolhendo Times New Roman'), LISTA('formatar.fonte|f:Times New Roman'), E(1200), D('Tamanho 16'), C('[data-cx=tamanho]'), E(1300), LISTA('formatar.fonte|t:16'), E(1100), D('A maior, duas vezes'), CMD('formatar.aumentarFonte'), E(700), CMD('formatar.aumentarFonte'), E(900), D('A menor'), CMD('formatar.diminuirFonte'), E(900), D('Negrito'), CMD('formatar.negrito'), E(1200)], 'Ver trocar a letra no app'))
item(3, 'Alinhamento: em cima, no meio e embaixo (três botões novos)',
     '<p>O Excel tem duas linhas de alinhamento: a de cima escolhe a altura do texto na célula (em cima, no meio, embaixo) e a de baixo escolhe o lado (esquerda, centro, direita). O Vértice só tinha a de baixo. Agora tem as duas, com “Quebrar texto” e “Mesclar” à direita, como no Excel.</p>'
     '<p>O alinhamento na altura já existia dentro do arquivo (vinha do Excel e era respeitado); faltava o botão. Não cria campo novo.</p>',
     EXCEL,
     par('Grupo Alinhamento', 'g-alinhamento', larg=860) + so_prop('Resultado na planilha: “Cultura” no meio, “Colhido (kg)” em cima e no centro, valores em moeda', 'efeito')
     + mov(3, '#/planilha', ABRE + VAI('A1') + [D('Deixando a linha 1 mais alta (letra 24)'), C('[data-cx=tamanho]'), E(900), LISTA('formatar.fonte|t:24'), E(900)] + VAI('B1') + [D('“Cultura” em cima'), CMD('formatar.cima'), E(1300), D('No meio'), CMD('formatar.meio'), E(1300), D('No centro'), CMD('formatar.centro'), E(1300), D('De volta para baixo'), CMD('formatar.baixo'), E(1200)], 'Ver alinhar no app'))
item(4, 'Número: caixa com o formato da célula',
     '<p>Como no Excel, o grupo Número ganha em cima a caixa que diz o formato da célula escolhida (Geral, Número, Moeda, Data, Porcentagem…) e deixa trocar ali mesmo. Embaixo ficam moeda, porcentagem, separador de milhar e os dois botões de casas decimais. A caixa acompanha os botões: clicou em %, ela passa a dizer Porcentagem.</p>',
     EXCEL,
     par('Grupo Número', 'g-numero', larg=860) + so_prop('Lista dos formatos aberta', 'l-numero')
     + mov(4, '#/planilha', ABRE + VAI('D2') + [D('Abrindo a lista dos formatos'), C('[data-cx=numero]'), E(1600), D('Moeda (R$)'), LISTA('formatar.formatoNumero|moeda'), E(1400)] + VAI('C3') + [D('Botão de porcentagem: a caixa acompanha'), CMD('formatar.porcentagem'), E(1500), D('Voltando para Geral pela caixa'), C('[data-cx=numero]'), E(1100), LISTA('formatar.formatoNumero|geral'), E(1200)], 'Ver trocar o formato no app'))
item(5, 'Células: Inserir, Excluir e Formatar, três botões que abrem lista',
     '<p>Hoje o grupo Células são seis ícones parecidos, sem nome. Na proposta são os três botões do Excel, com nome: <b>Inserir</b> (linha, coluna, aba nova), <b>Excluir</b> (linha, coluna) e <b>Formatar</b> (ocultar e reexibir linhas e colunas). O grupo também foi para o lugar do Excel, depois de Estilos.</p>',
     EXCEL + ' Decisão que tomei por você não ter respondido: seguir o Excel (três botões com lista).',
     par('Grupo Células', 'g-celulas', larg=860) + so_prop('Lista do Inserir', 'l-inserir') + so_prop('Lista do Formatar', 'l-formatar')
     + mov(5, '#/planilha', ABRE + VAI('A3') + [D('Inserir › Inserir linha acima'), C('[data-menu-faixa=inserir]'), E(1500), C('.rb-lista [data-cmd="planilha.inserirLinha"]'), E(1500), D('Excluir › Excluir linha'), C('[data-menu-faixa=excluir]'), E(1500), C('.rb-lista [data-cmd="planilha.excluirLinha"]'), E(1400)], 'Ver inserir e excluir no app'))
item(6, 'Edição: AutoSoma, Preencher e Limpar em coluna',
     '<p>No Excel o grupo Edição começa com três botões pequenos em coluna: AutoSoma, Preencher e Limpar. Ficou igual. <b>Preencher</b> abre “para baixo” e “para a direita” (com os atalhos Ctrl+D e Ctrl+R); <b>Limpar</b> abre “limpar o conteúdo” e “limpar a formatação”. Filtrar e Localizar continuam grandes, à direita.</p>'
     '<p>A “Linha do tempo” saiu deste grupo: ela já fica na barra de cima, ao lado do desfazer.</p>',
     EXCEL,
     par('Grupo Edição', 'g-edicao', larg=860) + so_prop('Lista do Preencher', 'l-preencher') + so_prop('Lista do Limpar', 'l-limpar'))
grupo('Tamanho da tela e movimento')
item(7, 'Tela apertada: os botões encolhem antes de ir para o “Mais”',
     '<p>Com a tela larga, os botões pequenos mostram o nome (Recortar, Copiar, Pincel, Quebrar texto, Mesclar). Quando a tela aperta, eles ficam só com o ícone, como o Excel faz, e os sete grupos continuam à vista. Só se ainda assim não couber é que o último grupo vai para o “Mais”. Em 1280 com o menu lateral aberto cabe tudo.</p>'
     '<p>Achei e corrigi um defeito antigo no caminho: a conta do que cabe não somava o espaço entre os grupos, e o último podia ficar cortado na borda.</p>',
     'Regra da faixa: nunca passar da tela (v0.6.4, R02).',
     so_prop('Tela larga (1920): com os nomes', 'larga') + so_prop('Tela de 1280 com o menu aberto: só os ícones nos botões pequenos, tudo à vista', 'faixa'))
item(8, 'As listas da faixa seguem a regra de fluidez',
     '<p>As listas novas (letra, tamanho, formato, Inserir, Excluir, Formatar, Preencher, Limpar) nascem do botão em 250 ms e fecham encolhendo em 150 ms; os itens entram em sequência; a seta do botão gira; o valor da caixa troca com um movimento curto; a caixa ganha um traço de ouro que cresce da esquerda. Esc fecha só a lista (uma camada) e o foco volta ao botão. As setas do teclado andam pelos itens. Com “reduzir movimento” ligado no aparelho, nada se move.</p>',
     FLU + 'c (lista cresce do botão e fecha encolhendo) e g (itens em sequência).',
     mov(8, '#/planilha', ABRE + [D('Lista dos formatos abrindo'), C('[data-cx=numero]'), E(1600), D('Esc fecha só a lista'), T('Escape'), E(1100), D('Lista das letras'), C('[data-cx=fonte]'), E(1500), T('Escape'), E(900), D('Formatar'), C('[data-menu-faixa=formatar]'), E(1500), T('Escape'), E(900), D('Preencher'), C('[data-menu-faixa=preencher]'), E(1500), T('Escape'), E(800)]))
item(9, 'No celular: a barra curta não muda; a faixa completa traz as caixas novas',
     '<p>No celular a barra curta de cima continua igual (o que mais se usa). Ao tocar em “Abas”, a faixa completa aparece numa linha que rola de lado, agora com a caixa da letra, a do tamanho e a do formato. As listas abrem com itens de 44 px para o dedo.</p>',
     'Regra L07 (celular) e toque de 44 px.',
     par('Celular, “Abas” aberto', 'cel-abas', cel=True))

N = sum(1 for i in itens if i.startswith('<article'))
css_h, js_h = app(DIST_HOJE); css_p, js_p = app(DIST_PROP)
SEM = open(os.path.join(PRINTS, 'sementes.json'), encoding='utf-8').read()
MAPA = json.load(open(os.path.join(PRINTS, 'mapa.json'), encoding='utf-8'))
MAPA_HTML = '<div class="mapa"><table><thead><tr><th>Área</th><th>Aba de dentro</th><th>Movimento</th><th>Teste</th></tr></thead><tbody>' + ''.join(f"<tr><td>{m['area']}</td><td>{m['aba']}</td><td>{m['movimento']}</td><td>{'passou' if m['ok'] else 'FALTA'}</td></tr>" for m in MAPA) + '</tbody></table></div>'
ARM = open(os.path.join(PRINTS, 'armazem.json'), encoding='utf-8').read()
PRE = open(os.path.join(AQUI, 'layout', 'vivo-pre.js'), encoding='utf-8').read()
assert '</script' not in SEM and '</script' not in PRE
fmt_fal = lambda t: 'nenhuma' if not t else str(t)

PAGINA = r'''<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vértice Docs v0.6.21 · Faixa igual ao Excel, parte 1</title>
<style>/* Página de aprovação do Vértice Docs, no formato da família EFClaudian (o mesmo do EFCwork v0.6.15): marfim e ouro (Claro),
   azul-noite e ouro (Escuro), títulos Fraunces, texto Source Sans 3 (embutidas). Uma coluna; cada item é um cartão com o número grande. */
@FONTES@
:root{--bg:#f6f3ea;--c:#fffdf8;--c2:#f1ece0;--bd:#e2dac8;--tx:#1e1b14;--tx2:#5b5443;--tx3:#746c55;--a:#9a7128;--aS:rgba(154,113,40,.12);--aTx:#7d5a1c;--ok:#2f7d4f;--okS:rgba(47,125,79,.13);--cr:#b3372f;--crS:rgba(179,55,47,.11);
  --ouro:linear-gradient(135deg,#f7df9e 0%,#d9b46a 42%,#b4862f 100%);--fd:'Fraunces',Georgia,serif;--f:'Source Sans 3',system-ui,-apple-system,'Segoe UI',sans-serif;--r:10px;--rs:7px}
@media (prefers-color-scheme:dark){:root{--bg:#0b0d16;--c:#121524;--c2:#191c2e;--bd:#2a2d3d;--tx:#f3eee3;--tx2:#bcb3a1;--tx3:#948c7c;--a:#d9b46a;--aS:rgba(217,180,106,.15);--aTx:#f0d48f;--ok:#7fbf98;--okS:rgba(127,191,152,.16);--cr:#e38b7d;--crS:rgba(227,139,125,.15);color-scheme:dark}}
*{box-sizing:border-box}
[hidden]{display:none!important}
html{scroll-padding-top:64px}
body{margin:0;background:var(--bg);color:var(--tx);font:16px/1.5 var(--f)}
main{max-width:1120px;margin:0 auto;padding:22px 16px 80px;display:flex;flex-direction:column;gap:16px}
h1{font:600 30px/1.2 var(--fd);margin:8px 0 0;text-wrap:balance}
.sub{margin:0;color:var(--tx2);max-width:74ch}
.como{margin:0;padding-left:20px;color:var(--tx2);max-width:74ch;display:flex;flex-direction:column;gap:2px}
a{color:var(--aTx)}
button{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--a);outline-offset:2px}
.topo{position:sticky;top:0;z-index:20;background:var(--c);border-bottom:1px solid var(--bd)}
.topo-in{max-width:1120px;margin:0 auto;padding:8px 16px;display:flex;align-items:center;gap:12px}
.topo-in b{font-family:var(--fd);font-size:17px}
#cont{color:var(--tx3);font-variant-numeric:tabular-nums}
.sp{flex:1}
.bt{height:36px;padding:0 14px;border-radius:var(--rs);border:1px solid var(--bd);background:var(--c);display:inline-flex;align-items:center;justify-content:center;gap:7px;font-weight:600;font-size:14px;white-space:nowrap;cursor:pointer;color:var(--tx)}
.bt:hover{border-color:var(--a)}
.bt.pr{background:var(--ouro);border-color:#c99d48;color:#1c1406}
.bt.gr{height:44px;padding:0 22px;font-size:16px}
@media (pointer:coarse){.bt{height:44px}}
.grupo{font:600 13px/1 var(--f);color:var(--tx3);margin:14px 0 -6px;padding-bottom:8px;border-bottom:1px solid var(--bd)}
.it{background:var(--c);border:1px solid var(--bd);border-radius:var(--r);padding:18px;display:flex;flex-direction:column;gap:14px}
.it.ok{border-color:var(--ok)}.it.no{border-color:var(--cr)}
.it header{display:flex;gap:18px;align-items:flex-start}
.num{flex:none;width:92px;font:600 13px/1 var(--f);color:var(--aTx);display:flex;flex-direction:column;gap:2px}
.num span{font:600 56px/1 var(--fd);color:var(--a);font-variant-numeric:tabular-nums}
.cab{min-width:0;display:flex;flex-direction:column;gap:6px}
.cab h3{font:600 21px/1.25 var(--fd);margin:0;text-wrap:balance}
.cab p{margin:0;color:var(--tx2);max-width:78ch}
.ref{font-size:14.5px;color:var(--tx3)!important}
.ref b{color:var(--tx2);font-weight:600;margin-right:4px}
.leg{margin:0 0 6px;font-size:13.5px;font-weight:600;color:var(--tx3)}
.lado{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}
.par-cel .lado{grid-template-columns:repeat(2,minmax(0,300px))}
.lado.um{grid-template-columns:minmax(0,560px)}
.mapa{overflow:auto;border:1px solid var(--bd);border-radius:8px}
.mapa table{border-collapse:collapse;width:100%;font-size:14px}
.mapa th,.mapa td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--bd);vertical-align:top}
.mapa th{font-weight:600;background:var(--c2)}
.par+.par,.par+.filme,.filme+.par{margin-top:2px}
figure{margin:0;min-width:0}
figcaption{font-size:12.5px;font-weight:700;color:var(--tx3);margin-bottom:4px}
figure.prop>figcaption{color:var(--aTx)}
.zoom{display:block;width:100%;padding:0;border:1px solid var(--bd);border-radius:var(--rs);background:var(--c2);cursor:zoom-in;overflow:hidden}
figure.prop .zoom{border-color:var(--a)}
img{max-width:100%;height:auto;display:block}
.zoom img{width:100%}
.filme{display:flex;flex-direction:column;gap:8px}
.tira{display:grid;grid-template-columns:86px 1fr;gap:10px;align-items:center}
.tira>b{font-size:12.5px;color:var(--tx3)}
.tira:last-child>b{color:var(--aTx)}
.qs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.qs figure{border:1px solid var(--bd);border-radius:6px;overflow:hidden;background:var(--c2)}
.qs figcaption{margin:0;padding:2px 6px;font-weight:600;border-top:1px solid var(--bd);background:var(--c)}
.vivo{border:1px dashed var(--bd);border-radius:var(--rs);padding:10px;display:flex;flex-direction:column;gap:8px}
.vbar,.vctl{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.vdica{margin:0;font-size:14px;color:var(--tx3)}
.seg{display:inline-flex;border:1px solid var(--bd);border-radius:var(--rs);overflow:hidden;background:var(--c)}
.seg button{height:34px;padding:0 14px;border:0;background:transparent;font-weight:700;font-size:13px;cursor:pointer;color:var(--tx2)}
.seg button[aria-pressed="true"]{background:var(--a);color:var(--c)}
@media (pointer:coarse){.seg button{height:42px}}
.vq{position:relative;overflow:hidden;border:1px solid var(--bd);border-radius:var(--rs);background:var(--c2);min-height:120px;margin:0 auto;width:100%}
.vq iframe{position:absolute;top:0;left:0;border:0;transform-origin:0 0;background:#f6f3ea}
.vesp{position:absolute;inset:0;display:grid;place-items:center;color:var(--tx2);font-weight:600;background:var(--c2);z-index:2;text-align:center;padding:16px}
.vivo.cheia{position:fixed;inset:0;z-index:60;background:var(--bg);border:0;border-radius:0;padding:10px 12px;overflow:auto}
.vivo.cheia .vdica{display:none}
.resp{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:start;border-top:1px solid var(--bd);padding-top:14px}
.voto{display:flex;gap:8px}
.voto input{position:absolute;opacity:0;pointer-events:none}
.voto label{height:44px;min-width:128px;padding:0 16px;border:1px solid var(--bd);border-radius:var(--rs);display:grid;place-items:center;font-weight:700;cursor:pointer;background:var(--c)}
.voto label:hover{border-color:var(--tx3)}
.voto input:focus-visible+label{outline:2px solid var(--a);outline-offset:2px}
.voto input:checked+label.ok{background:var(--okS);border-color:var(--ok);color:var(--ok)}
.voto input:checked+label.no{background:var(--crS);border-color:var(--cr);color:var(--cr)}
.com{display:flex;flex-direction:column;gap:4px;font-size:13.5px;font-weight:600;color:var(--tx3)}
textarea{width:100%;min-height:44px;border:1px solid var(--bd);border-radius:var(--rs);background:var(--bg);color:var(--tx);padding:8px 10px;font:400 15px/1.4 var(--f);resize:vertical}
.fim{background:var(--c);border:1px solid var(--bd);border-radius:var(--r);padding:18px;display:flex;flex-direction:column;gap:10px;align-items:flex-start}
.fim h2{font:600 20px/1.2 var(--fd);margin:6px 0 0}.fim p,.fim ul{margin:0;color:var(--tx2);max-width:78ch}.fim ul{padding-left:20px}
.nums{display:flex;flex-wrap:wrap;gap:6px}
.nums span{border:1px solid var(--bd);border-radius:5px;background:var(--c2);padding:1px 8px;font-size:13.5px;color:var(--tx2)}
.nums b{color:var(--tx)}
#copiado{color:var(--ok);font-weight:600;min-height:1.5em}
#lb{position:fixed;inset:0;z-index:80;background:rgba(8,9,14,.92);display:flex;flex-direction:column}
#lb[hidden]{display:none}
.lb-bar{display:flex;gap:10px;align-items:center;padding:8px 12px;color:#f3eee3;flex-wrap:wrap}
#lb-t{flex:1;min-width:120px;font-weight:600}
.lb-pal{flex:1;min-height:0;overflow:auto;display:grid;place-items:center;padding:0 12px 12px;cursor:pointer}
#lb-img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;border-radius:6px;background:#f6f3ea}
@media(max-width:699px){
  h1{font-size:25px}
  .it{padding:14px}
  .it header{flex-direction:column;gap:6px}
  .num{width:auto;flex-direction:row;align-items:baseline;gap:8px}.num span{font-size:44px}
  .lado{grid-template-columns:1fr}
  .par-cel .lado{grid-template-columns:1fr 1fr}
  .tira{grid-template-columns:1fr}.qs{grid-template-columns:repeat(2,1fr)}
  .resp{grid-template-columns:1fr}.voto label{flex:1;min-width:0}.voto{width:100%}
  .topo-in b{display:none}
}
@media (prefers-reduced-motion:no-preference){.bt,.voto label{transition:border-color .15s ease-out,background-color .15s ease-out}}
</style></head>
<body>
<div class="topo"><div class="topo-in"><b>Vértice Docs v0.6.21 · faixa igual ao Excel, parte 1</b><span id="cont">0 de @N@ respondidos</span><span class="sp"></span><button type="button" class="bt pr" id="copiar">Copiar respostas</button></div></div>
<main>
<h1>Faixa igual ao Excel: Página Inicial</h1>
<p class="sub">Primeira parte da faixa de cima nos lugares do Excel: só a aba <b>Página Inicial</b> da Planilha (@N@ itens). <b>HOJE</b> é a v0.6.20 que você aprovou; <b>PROPOSTA</b> é a v0.6.21. Tudo tirado do app de verdade, com dados inventados. As outras abas (Inserir, Fórmulas, Dados…) vêm nas próximas partes. Nada foi publicado.</p>
<ul class="como"><li>Toque numa imagem para ampliar. Na imagem ampliada, toque de novo para alternar entre HOJE e PROPOSTA no mesmo lugar.</li><li>“Ver … no app” abre o Vértice de verdade dentro desta página e faz os passos sozinho; depois você pode mexer. Os arquivos são inventados e ficam só na memória: nada é lido nem gravado no seu aparelho.</li><li>O desenho dos ícones não mudou nesta parte (só entraram cinco ícones novos, no mesmo traço). O redesenho dos ícones fica para uma parte só dele.</li><li>Nada foi publicado. Só publico quando você disser “pode publicar”.</li></ul>
@ITENS@
<section class="fim">
<h2>Conferências desta parte</h2>
<div class="nums"><span><b>@REGRAS@</b> testes de regra</span><span><b>@NAVEGADOR@</b> testes no navegador</span><span><b>@LAYOUT@</b> conferências de layout, fluidez e faixa</span><span>console <b>sem erro</b></span><span>app <b>@TAMANHO@</b></span></div>
<ul>@AUDITORIAS@</ul>
<h2>Dúvidas (responda no comentário de qualquer item ou na conversa)</h2>
<ul><li><b>D1 · Nomes do grupo Estilos.</b> No Excel os botões se chamam “Formatação Condicional” e “Formatar como Tabela”. No Vértice estão “Destacar regra” e “Tabela”. Troco pelos nomes do Excel? Minha sugestão: sim, para quem vem do Excel reconhecer.</li>
<li><b>D2 · Formatar › altura da linha e largura da coluna.</b> No Excel o botão Formatar também tem “Altura da linha”, “Largura da coluna” e “Ajustar automaticamente”. O Vértice hoje só faz isso arrastando a borda. Quer que eu crie esses três comandos na próxima parte? Minha sugestão: sim.</li>
<li><b>D3 · Telas médias (1366 a 1440).</b> Nelas os botões pequenos ficam só com o ícone, e os nomes só aparecem a partir de uns 1500 px de largura. Está bom assim, ou prefere que eu esconda o menu lateral sozinho quando a planilha abre para ganhar espaço?</li>
<li><b>D4 · Excel tem “Classificar e Filtrar” e “Localizar e Selecionar” como botões com lista.</b> Mantive “Filtrar” e “Localizar” diretos, porque “Classificar” ainda está marcado como “em breve”. Junto quando o Classificar chegar?</li></ul>
<h2>Sugestões</h2>
<ul><li>Recuo e orientação do texto (os botões do meio do grupo Alinhamento do Excel) não existem no Vértice; posso incluir junto com a D2.</li><li>Os dois botões de “Ocultar” e os dois de “Reexibir” usam o mesmo desenho dois a dois; entram no redesenho dos ícones.</li></ul>
<h2>O que não deu para provar</h2>
<ul><li>Não tive os prints da faixa do seu Excel; segui a posição padrão do Excel 365 em português. Se o seu for diferente em algum ponto, me diga no comentário.</li><li>Na demonstração dentro da página os passos são cliques simulados; arrastar para escolher várias células não entra, então cada passo mexe em uma célula.</li><li>Letras como Calibri e Verdana só aparecem com o desenho certo se estiverem instaladas no aparelho (igual à janela de Fonte que já existia).</li></ul>
<h2>Banco (Firebase)</h2>
<p>Nada a configurar. Esta parte só muda a tela; não cria campo novo. O alinhamento na altura usa um campo que o arquivo já tinha.</p>
<h2>Próximos passos</h2>
<ul><li>Você responde esta página e cola a resposta na conversa.</li><li>Parte 2 da faixa: abas Inserir e Fórmulas nos lugares do Excel (e o que você responder em D1 e D2).</li><li>Depois: Dados, Layout da Página, Revisão e Exibir; por último o redesenho dos ícones. Em seguida, os post-its com traço à mão (modelo Looseleaf).</li><li>Continuam esperando você: “pode publicar” da v0.6.19 e da v0.6.20, e a resposta D01 da v0.6.19 (desfazer em um passo ou dois).</li></ul>
<p><b>Modelo/Esforço da próxima etapa (faixa, parte 2): Fable 5.2 · alto.</b></p>
<button type="button" class="bt pr gr" id="copiar2">Copiar respostas</button><span id="copiado" role="status"></span>
</section>
</main>
<div id="lb" hidden role="dialog" aria-modal="true" aria-label="Imagem ampliada"><div class="lb-bar"><span id="lb-t"></span><span class="seg" role="group" aria-label="Versão"><button type="button" id="lb-h" aria-pressed="false">HOJE</button><button type="button" id="lb-p" aria-pressed="true">PROPOSTA</button></span><button type="button" class="bt" id="lb-x">Fechar</button></div><div class="lb-pal" id="lb-pal"><img id="lb-img" alt=""></div></div>
<script type="text/plain" id="app-hoje-css">@CSS_H@</script><script type="text/plain" id="app-hoje-js">@JS_H@</script>
<script type="text/plain" id="app-prop-css">@CSS_P@</script><script type="text/plain" id="app-prop-js">@JS_P@</script>
<script type="application/json" id="sementes">@SEM@</script><script type="application/json" id="armazem">@ARM@</script>
<script type="text/plain" id="vivo-pre">@PRE@</script>
<script>
(function () {
  'use strict';
  var CHAVE = 'vertice-aprovacao-v0621-faixa-1', $ = function (s, e) { return (e || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || document).querySelectorAll(s)); };
  var salvo; try { salvo = JSON.parse(localStorage.getItem(CHAVE) || '{}'); } catch (e) { salvo = {}; }
  var guarda = function () { try { localStorage.setItem(CHAVE, JSON.stringify(salvo)); } catch (e) { /* sem armazenamento: vale só nesta visita */ } };
  var itens = $$('.it');
  function conta() { var n = 0; itens.forEach(function (it) { var v = (salvo[it.dataset.n] || {}).v; it.classList.toggle('ok', v === 'APROVADO'); it.classList.toggle('no', v === 'REPROVADO'); if (v) n++; }); $('#cont').textContent = n + ' de ' + itens.length + ' respondidos'; }
  itens.forEach(function (it) {
    var n = it.dataset.n; salvo[n] = salvo[n] || {};
    $$('input[type=radio]', it).forEach(function (r) { r.checked = salvo[n].v === r.value; r.addEventListener('change', function () { salvo[n].v = r.value; guarda(); conta(); }); });
    var t = $('textarea', it); t.value = salvo[n].c || ''; t.addEventListener('input', function () { salvo[n].c = t.value; guarda(); });
  });
  conta();
  function copiar() {
    var l = ['RESPOSTAS · ' + document.title];
    itens.forEach(function (it) { var s = salvo[it.dataset.n] || {}; l.push('ITEM ' + it.dataset.n + ' · ' + it.dataset.t + ': ' + (s.v || 'SEM RESPOSTA')); if (s.c && s.c.trim()) l.push('  Comentário: ' + s.c.trim()); });
    var txt = l.join('\n'), feito = function () { $('#copiado').textContent = 'Copiado. Cole na conversa.'; setTimeout(function () { $('#copiado').textContent = ''; }, 4000); };
    var reserva = function () { var a = document.createElement('textarea'); a.value = txt; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) { /* sem área de transferência */ } a.remove(); feito(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(feito, reserva); else reserva();
  }
  $('#copiar').addEventListener('click', copiar); $('#copiar2').addEventListener('click', copiar);

  /* ---- ampliar a imagem e alternar HOJE / PROPOSTA no mesmo lugar ---- */
  var lb = $('#lb'), parAtual = null, ladoAtual = 'prop', voltaFoco = null;
  function mostra() {
    var b = $('.zoom[data-par="' + parAtual + '"][data-lado="' + ladoAtual + '"]'); if (!b) return;
    $('#lb-img').src = $('img', b).src; $('#lb-img').alt = $('img', b).alt; $('#lb-t').textContent = b.closest('.par').querySelector('.leg').textContent;
    $('#lb-h').setAttribute('aria-pressed', String(ladoAtual === 'hoje')); $('#lb-p').setAttribute('aria-pressed', String(ladoAtual === 'prop'));
  }
  $$('.zoom').forEach(function (b) { b.addEventListener('click', function () { voltaFoco = b; parAtual = b.dataset.par; ladoAtual = b.dataset.lado; lb.hidden = false; mostra(); $('#lb-x').focus(); }); });
  var fecha = function () { lb.hidden = true; if (voltaFoco) voltaFoco.focus(); };
  $('#lb-pal').addEventListener('click', function () { ladoAtual = ladoAtual === 'hoje' ? 'prop' : 'hoje'; mostra(); });
  $('#lb-h').addEventListener('click', function () { ladoAtual = 'hoje'; mostra(); }); $('#lb-p').addEventListener('click', function () { ladoAtual = 'prop'; mostra(); });
  $('#lb-x').addEventListener('click', fecha);

  /* ---- o app de verdade dentro da página ---- */
  var pecas = {}, SEM = null, PRE = $('#vivo-pre').textContent, ARM = $('#armazem').textContent;
  function abre64(id) {
    var bin = atob($('#' + id).textContent), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  function appHtml(lado, cfg) {
    if (!pecas[lado]) pecas[lado] = Promise.all([abre64('app-' + lado + '-css'), abre64('app-' + lado + '-js')]);
    if (!SEM) SEM = $('#sementes').textContent;
    return pecas[lado].then(function (p) {
      var F = '</scr' + 'ipt>';
      return '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vértice Docs (demonstração)</title><style>' + p[0] + '</style></head><body><div id="raiz"></div>' +
        '<script>window.__VIVO={sementes:' + SEM + ',armazem:' + ARM + ',atraso:' + (cfg.atraso || 0) + ',rota:' + JSON.stringify(cfg.rota) + ',tema:' + JSON.stringify(cfg.tema) + '};' + F + '<script>' + PRE + F + '<script type="module">' + p[1] + F + '</body></html>';
    });
  }
  /* a rolagem da página no quadro anterior: se o foco dentro do app puxar a página, ela volta para cá */
  var yAntes = 0, yAgora = 0; (function guarda() { yAntes = yAgora; yAgora = pageYOffset; requestAnimationFrame(guarda); })();
  $$('.vivo').forEach(function (v) {
    var est = { lado: 'prop', ap: innerWidth < 700 ? 'cel' : 'pc', tema: 'papel' }, pal = $('.vpal', v), ctl = $('.vctl', v), dica = $('.vdica', v), abre = $('[data-v=abre]', v);
    function medir() { var q = $('.vq', pal); if (!q) return; var w = est.ap === 'pc' ? 1280 : 390, h = est.ap === 'pc' ? 800 : 844, f = $('iframe', q); q.style.maxWidth = est.ap === 'pc' ? '' : '390px'; var e = Math.min(1, q.clientWidth / w); f.style.width = w + 'px'; f.style.height = h + 'px'; f.style.transform = 'scale(' + e + ')'; q.style.height = Math.round(h * e) + 'px'; }
    function carrega() {
      if (typeof DecompressionStream !== 'function') { pal.innerHTML = '<div class="vq"><div class="vesp">Este navegador não consegue abrir a demonstração. Abra a página no Chrome ou no Edge.</div></div>'; return; }
      pal.innerHTML = '<div class="vq"><div class="vesp">Abrindo o Vértice…</div><iframe title="Vértice Docs em demonstração"></iframe></div>'; medir();
      appHtml(est.lado, { rota: v.dataset.rota, atraso: +v.dataset.atraso || 0, tema: est.tema }).then(function (h) { var f = $('iframe', pal); if (!f) return; f.srcdoc = h; f.addEventListener('load', function () { try { f.contentDocument.addEventListener('focusin', function () { if (Math.abs(pageYOffset - yAntes) > 2) scrollTo(pageXOffset, yAntes); }, true); } catch (e2) {} var e = $('.vesp', pal); if (e) e.remove(); var vez = (v._vez = (v._vez || 0) + 1); pronto(f, vez, roda); }); }, function () { pal.innerHTML = '<div class="vq"><div class="vesp">Não deu para abrir a demonstração neste navegador.</div></div>'; });
    }
    function pronto(f, vez, feito) { var n = 0; (function olha() { if (v._vez !== vez) return; var d = null; try { d = f.contentDocument; } catch (e) {} if (d && d.querySelector('.wk-main')) return setTimeout(feito, 500); if (++n > 80) return; setTimeout(olha, 150); })(); }
    function roda() {
      var f = $('iframe', pal), lista = []; try { lista = JSON.parse(v.dataset.passos || '[]'); } catch (e) {}
      if (!f || !lista.length) return; var vez = (v._vez = (v._vez || 0) + 1), i = 0, base = dica.dataset.base || (dica.dataset.base = dica.textContent);
      function fim() { dica.textContent = base; }
      function prox() {
        if (v._vez !== vez) return; if (i >= lista.length) return fim();
        if (!f.isConnected || !f.contentWindow) return;
        var s = lista[i++], w = f.contentWindow, d = w.document, t = 80;
        try {
          if (s[0] === 'espera') t = s[1];
          else if (s[0] === 'rota') w.location.hash = s[1];
          else if (s[0] === 'diz') dica.textContent = 'Agora: ' + s[1];
          else if (s[0] === 'clica' || s[0] === 'aperta') { var el = d.querySelectorAll(s[1])[s[2] || 0]; if (el) { if (s[0] === 'aperta') { var r = el.getBoundingClientRect(); el.dispatchEvent(new w.PointerEvent('pointerdown', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); } el.click(); } }
          else if (s[0] === 'arrasta') { var de = d.querySelectorAll(s[1])[s[2] || 0], pa = d.querySelector(s[3]); if (de && pa) { var r1 = de.getBoundingClientRect(), r2 = pa.getBoundingClientRect(), x1 = r1.left + 40, y1 = r1.top + 26, x2 = r2.left + 70, y2 = r2.top + 30, k = 0, N = 14;
            var ev = function (tipo, x, y) { return new w.PointerEvent(tipo, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, pointerType: 'mouse', isPrimary: true }); };
            de.dispatchEvent(ev('pointerdown', x1, y1)); (function anda() { if (v._vez !== vez) return; k++; var q = k / N, alvo = d.querySelector('.kb') || de; alvo.dispatchEvent(ev('pointermove', x1 + (x2 - x1) * q, y1 + (y2 - y1) * q)); if (k < N) setTimeout(anda, 45); else setTimeout(function () { alvo.dispatchEvent(ev('pointerup', x2, y2)); }, 350); })(); t = 45 * N + 500; } }
          else if (s[0] === 'tecla') { var o = { key: s[1], bubbles: true, cancelable: true }; for (var k in (s[2] || {})) o[k] = s[2][k]; (d.activeElement || d.body).dispatchEvent(new w.KeyboardEvent('keydown', o)); }
          else if (s[0] === 'digita') { var c = d.querySelector(s[1]); if (c) { c.focus(); var poe = Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set, txt = s[2], j = 0; (function letra() { if (v._vez !== vez) return; poe.call(c, txt.slice(0, j)); c.dispatchEvent(new w.Event('input', { bubbles: true })); if (j++ < txt.length) setTimeout(letra, 90); })(); t = 90 * (txt.length + 1) + 80; } }
        } catch (e) {}
        setTimeout(prox, t);
      }
      prox();
    }
    function marca() { $$('[data-v=hoje],[data-v=prop]', v).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === est.lado)); }); $$('[data-v=ap]', v).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.ap === est.ap)); }); $$('[data-v=tema]', v).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tema === est.tema)); }); }
    v.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-v]'); if (!b) return; var a = b.dataset.v;
      if (a === 'abre') { marca(); abre.hidden = true; ctl.hidden = false; dica.hidden = false; pal.hidden = false; carrega(); }
      else if (a === 'hoje' || a === 'prop') { est.lado = a; marca(); carrega(); }
      else if (a === 'denovo') { var fr = $('iframe', pal), dd = null; try { dd = fr && fr.contentDocument; } catch (e) {} if (v.dataset.passos && dd && dd.querySelector('.wk-main')) { try { var ab = dd.querySelector('.fundo, [data-gaveta], .col-menu, .novo-drive-m, .filtro-p'); if (ab) (dd.activeElement || dd.body).dispatchEvent(new fr.contentWindow.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); fr.contentWindow.location.hash = v.dataset.rota; } catch (e) {} roda(); } else carrega(); }
      else if (a === 'ap') { est.ap = b.dataset.ap; marca(); carrega(); }
      else if (a === 'tema') { est.tema = b.dataset.tema; marca(); carrega(); }
      else if (a === 'cheia') { v.classList.toggle('cheia'); b.textContent = v.classList.contains('cheia') ? 'Sair da tela cheia' : 'Tela cheia'; medir(); }
      else if (a === 'fecha') { v._vez = (v._vez || 0) + 1; v.classList.remove('cheia'); pal.innerHTML = ''; pal.hidden = true; ctl.hidden = true; dica.hidden = true; abre.hidden = false; }
    });
    addEventListener('resize', medir);
  });
  document.addEventListener('keydown', function (ev) { if (ev.key !== 'Escape') return; if (!lb.hidden) { fecha(); return; } var c = $('.vivo.cheia'); if (c) $('[data-v=cheia]', c).click(); });
})();
</script>
</body></html>'''

FONTES = ''.join(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{p};font-display:swap;src:url(data:font/woff2;base64,{b64(open(os.path.join(AQUI, '..', 'src', 'fontes', a), 'rb').read())}) format('woff2')}}"
                 for fam, p, a in [('Source Sans 3', 400, 'source-sans-3-latin-400-normal.woff2'), ('Source Sans 3', 600, 'source-sans-3-latin-600-normal.woff2'), ('Source Sans 3', 700, 'source-sans-3-latin-700-normal.woff2'), ('Fraunces', 600, 'fraunces-latin-600-normal.woff2')])
AUD = ''.join(f'<li>{x}</li>' for x in R['auditorias'])
troca = {'@FONTES@': FONTES, '@N@': str(N), '@ITENS@': ''.join(itens), '@REGRAS@': R['regras'], '@NAVEGADOR@': R['navegador'], '@LAYOUT@': R['layout'], '@TAMANHO@': R['tamanho'], '@AUDITORIAS@': AUD,
         '@CSS_H@': css_h, '@JS_H@': js_h, '@CSS_P@': css_p, '@JS_P@': js_p, '@SEM@': SEM, '@PRE@': PRE, '@ARM@': ARM}
for k, v in troca.items():
    assert k in PAGINA, k
    PAGINA = PAGINA.replace(k, v)
open(SAIDA, 'w', encoding='utf-8').write(PAGINA)
print('página:', SAIDA, round(len(PAGINA.encode()) / 1024), 'KB,', N, 'itens')
