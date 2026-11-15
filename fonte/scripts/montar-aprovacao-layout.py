#!/usr/bin/env python3
"""Vértice Docs — página de aprovação do layout da família (v0.6.20, parte 1: as listas).
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
grupo('Cabeçalho e tabela')
item(1, 'Título grande na página, com a linha de pílulas e as ações ao lado',
     '<p>Hoje cada tela de lista começa de um jeito: em Planilhas vem o botão “Nova planilha”, em Documentos vem um aviso, em Documentos internos vem a contagem. Proposta: todas começam igual, como no EFCwork. O título grande, embaixo dele a linha de pílulas (quantos arquivos, avisos curtos) e, à direita, o filtro e o botão de criar. A altura é a mesma em todas as telas, então nada pula ao trocar de tela.</p>'
     '<p>O botão “Nova planilha” deixa de ser um cartão e vira um botão comum, da mesma altura do filtro. O aviso “O editor de documento chega na v0.7.0” vira a pílula “Editor na v0.7.0”.</p>',
     f'Regra R5 da família (cabeçalhos com a mesma medida). Referência: {L("https://linear.app/now/how-we-redesigned-the-linear-ui", "Linear · como o cabeçalho, as abas e os painéis foram redesenhados")}.',
     par('PC · Planilhas', 'planilhas') + par('PC · Documentos internos', 'internos') + vivo(1, '#/planilha', 'Troque de tela pelo menu da esquerda: o título, as pílulas e a tabela ficam sempre na mesma altura.'))
item(2, 'A barra de cima mostra o caminho',
     '<p>Com o título grande na página, a barra de cima passa a mostrar onde a pessoa está: “Meus arquivos / Planilhas”, “Organizar / Documentos internos”. É o mesmo desenho do EFCwork (“Almoxarifado / Materiais”).</p>'
     '<p><b>Uma dúvida minha:</b> na v0.4.4.1 você pediu para o título não aparecer duas vezes. Aqui o nome aparece no caminho (pequeno) e no título (grande), como você aprovou no EFCwork. Se preferir, reprove e diga no comentário: eu deixo a barra de cima só com “Meus arquivos”, sem repetir o nome.</p>',
     'Regra R5 da família, aplicada como nas telas do EFCwork v0.6.15.',
     par('PC · topo da tela de Planilhas', 'trilha'))
item(3, 'A lista vira tabela, e só a tabela rola',
     '<p>Hoje as planilhas são cartões em três colunas, e a tela inteira rola: ao descer, o botão de criar, a contagem e o filtro somem. Proposta: uma tabela com as colunas Nome e Alterado em (e Tipo, onde há mais de um tipo). Do cabeçalho da tabela para cima nada se mexe; a rodinha e o dedo só rolam a tabela, e os nomes das colunas ficam parados no alto dela. Lápis e lixeira continuam em cada linha.</p>'
     '<p>No celular nada trava: a página rola normalmente (item 8).</p>',
     f'Regra R1 da família (tela parada: só a tabela rola). Referência: {L("https://design.visa.com/components/table/usage/", "Visa Design System · tabela com cabeçalho fixo")}.',
     par('PC · Planilhas, com 250 arquivos, depois de rolar', 'rola2') + filme('O mesmo gesto de rolar, em quatro momentos', ['rola0', 'rola1', 'rola2', 'rola3'], ['parado', 'rolou um pouco', 'rolou mais', 'rolou muito'])
     + par('PC · Planilhas no tema Escuro', 'escuro') + vivo(3, '#/planilha', 'Role com a rodinha em cima da tabela e em cima do título. Em HOJE a tela inteira sobe; na PROPOSTA só a tabela.'))
item(4, 'Sem o rodapé do app embaixo da lista; a tabela vai até o fundo',
     '<p>Hoje a faixa “Vértice Docs v0.6.19 · 31 arquivos neste aparelho” ocupa o fim da tela em todas as listas. Proposta: ela sai das telas de lista e a tabela desce até 16 px do fim da janela. A versão continua no menu da esquerda e em Opções; a quantidade de arquivos continua nos números do menu. Com um arquivo aberto, a barra de baixo (Salvo, Soma, Média) continua igual.</p>'
     '<p>A tabela mostra 100 linhas; ao chegar no fim, as próximas 100 entram sozinhas, sem botão “Mostrar mais” e sem voltar ao topo.</p>',
     'Regra R2 da família (sem “Mostrando X de Y” e sem rodapé debaixo da tabela).',
     par('PC · o fim da tela de Planilhas', 'fundo') + vivo(4, '#/planilha', 'A demonstração tem 140 planilhas. Role a tabela até o fim: as linhas de 101 em diante entram sozinhas.'))
item(5, 'O total vira o selo do cabeçalho; com filtro, “total filtrado”',
     '<p>Hoje a contagem fica solta à direita (“6 documentos”) e, com filtro, vira “1 de 6 documentos”. Proposta: a contagem é a primeira pílula debaixo do título. Com filtro ela fica em dourado suave e diz “1 documento · total filtrado”. O Vértice não tem valores em dinheiro nas listas, então o total é a quantidade de arquivos.</p>',
     'Regra R3 da família (o total no selo do cabeçalho).',
     par('PC · Documentos, filtrando por “reuni”', 'filtro') + vivo(5, '#/docx', 'Abra o filtro (botão “Mais recentes”) e escreva um pedaço do nome. O selo muda para “· total filtrado”.'))
item(6, 'Documentos internos: o filtro na linha das abas',
     '<p>Hoje os Documentos internos não têm filtro. Proposta: o mesmo filtro único e recolhível das outras listas (nome e ordem), no canto direito da linha das abas, como os ícones de tabela do EFCwork. O filtro vale para todas as sub-abas, e os números das abas seguem o filtro. A tabela ganha as colunas Código, Nome, Tipo, Alterado em e Situação.</p>'
     '<p>A situação (“Não compartilhado”, “Na caixa do Cwork”) fica como está hoje; ela vira bolinha e texto na parte 2 (regra R6).</p>',
     f'Regra R4 da família (ferramentas da tabela na linha das abas). Referência: {L("https://primer.style/product/components/underline-nav", "GitHub Primer · abas com contador")}.',
     par('PC · Documentos internos, a parte de cima', 'abas') + vivo(6, '#/internos', 'Troque de sub-aba e use o filtro da direita.'))

grupo('Carregamento e botão')
item(7, 'Linhas cinzas enquanto os arquivos não chegam',
     '<p>Hoje, se o aparelho demora a ler os arquivos guardados, a lista abre dizendo “Nenhuma planilha ainda.” e “0 planilhas”, e a pessoa pode achar que perdeu tudo. Proposta: enquanto a leitura não termina, a tabela mostra seis linhas cinzas pulsando de leve e o texto “Carregando…”, sem total. Se a leitura é rápida (o normal), nada disso aparece: as linhas cinzas só entram depois de 150 ms de espera.</p>',
     f'Regra R10 da família (esqueleto enquanto carrega). Referência: {L("https://www.nngroup.com/articles/empty-state-interface-design/", "Nielsen Norman Group · telas vazias")}.',
     par('PC · Planilhas com o aparelho lento', 'lento') + vivo(7, '#/planilha', 'A demonstração segura a leitura dos arquivos por 2,5 s. Compare HOJE e PROPOSTA e use “Ver de novo”.', 2500))
item(8, 'Botão dourado com sombra curta e nítida',
     '<p>Hoje o botão “Novo” tem um brilho dourado borrado em volta. Proposta: sombra curta e nítida, como ficou no EFCwork. Vale para todos os botões dourados do Vértice (Novo, Salvar das janelas). É um detalhe pequeno: amplie a imagem para ver.</p>',
     'Regra R11 da família (botão dourado com sombra nítida).',
     par('Botão Novo, ampliado 3 vezes, tema Claro', 'ouro-claro') + par('Botão Novo, ampliado 3 vezes, tema Escuro', 'ouro-escuro'))

grupo('Outras telas')
item(9, 'Celular: lista de uma coluna, com os botões na mesma linha',
     '<p>No celular a página continua rolando inteira. A tabela vira uma lista de uma coluna (nome em cima, data embaixo), o selo do total fica no alto e o filtro e o botão de criar ficam lado a lado, com a mesma altura e largura (44 px de toque). O título grande não aparece no celular: a barra de cima já mostra o nome da tela.</p>',
     f'Regras R1 e R5 da família, na parte do celular. Referência: {L("https://m3.material.io/components/navigation-bar/overview", "Material Design 3 · barra de navegação")}.',
     par('Celular · Planilhas', 'cel-planilhas', cel=True) + par('Celular · Documentos internos', 'cel-internos', cel=True))
item(10, 'Lixeira e Início no mesmo desenho',
     '<p><b>Lixeira:</b> tabela com Nome, Tipo e “Na lixeira desde”. Os botões Restaurar e Apagar para sempre ficam lado a lado com a mesma largura.</p>'
     '<p><b>Início:</b> os três cartões de criar continuam. “Abrir arquivo do Excel” sobe para a direita do título (antes ocupava uma linha só para ele). Os Recentes viram a mesma tabela, com o selo do total ao lado do nome “Recentes”.</p>',
     'Regras R1, R3 e R5 da família, e o seu padrão de botões lado a lado alinhados.',
     par('PC · Lixeira', 'lixeira') + par('PC · Início', 'inicio') + vivo(10, '#/lixeira', 'Veja a Lixeira e, pelo menu, o Início.'))

grupo('Duas decisões suas')
item(11, 'Tirar a entrada em fila das linhas da lista',
     '<p>Na v0.6.15 do Vértice você aprovou a lista “em cascata”: ao abrir, os arquivos entram um depois do outro (40 ms entre eles). Eu <b>mantive</b> isso nas linhas da tabela. Mas a regra nova da família pede que nada entre em fila: ou aparece de uma vez, ou desliza para o lugar. As duas coisas não combinam.</p>'
     '<p><b>Aprovado</b> = eu tiro a cascata das tabelas (as linhas aparecem de uma vez, como no EFCwork). <b>Reprovado</b> = fica como está, entrando em fila.</p>',
     'Regra R7 da família (nada de entrar um por um em sequência) contra o item F04 que você aprovou no Vértice v0.6.15.',
     vivo(11, '#/planilha', 'Use “Ver de novo” e repare nas primeiras linhas entrando uma depois da outra.'))
item(12, 'O app ficou 7 KB maior com as peças da família',
     f'<p>Esta parte traz as peças do layout da família (as mesmas do EFCwork) e o app passou de 588 para {R["kb"]} KB compactado: 7 KB a mais (1,2%). Somando com a v0.6.19, que ainda não foi publicada, são 18 KB (3,1%) acima da v0.6.18 que está no ar. A auditoria de rapidez trava a versão quando o app cresce mais de 2% sem o seu OK.</p>'
     f'<p>Não ficou mais lento de usar: a auditoria mediu {R["tempos"]}, dentro da meta de 100 ms e sem piora contra a linha de base. As peças já trazem o que as partes 2 e 3 vão usar (gaveta, linha do tempo, menu da coluna), então as próximas partes crescem menos.</p>'
     '<p><b>Aprovado</b> = aceito o crescimento, e a medida de tamanho passa a contar a partir desta versão. <b>Reprovado</b> = eu corto peso antes de seguir.</p>',
     'Auditoria de rapidez do Método Sabiá (o app não cresce mais de 2% sem motivo aprovado).', '')

N = sum(1 for i in itens if i.startswith('<article'))
css_h, js_h = app(DIST_HOJE); css_p, js_p = app(DIST_PROP)
SEM = open(os.path.join(PRINTS, 'sementes.json'), encoding='utf-8').read()
PRE = open(os.path.join(AQUI, 'layout', 'vivo-pre.js'), encoding='utf-8').read()
assert '</script' not in SEM and '</script' not in PRE
fmt_fal = lambda t: 'nenhuma' if not t else str(t)

PAGINA = r'''<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vértice Docs v0.6.20 · Layout da família, parte 1</title>
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
<div class="topo"><div class="topo-in"><b>Vértice Docs v0.6.20 · layout, parte 1</b><span id="cont">0 de @N@ respondidos</span><span class="sp"></span><button type="button" class="bt pr" id="copiar">Copiar respostas</button></div></div>
<main>
<h1>Layout da família no Vértice, parte 1: as listas</h1>
<p class="sub">O layout que você aprovou no EFCwork v0.6.15, agora nas telas de lista do Vértice (Início, Planilhas, Documentos, Quadros, Documentos internos e Lixeira). São @N@ itens, uma mudança por item. Cada um mostra o <b>app de verdade</b> em <b>HOJE</b> (v0.6.19) e <b>PROPOSTA</b> (v0.6.20), de onde veio a ideia e um botão para ver funcionando. Marque <b>Aprovado</b> ou <b>Reprovado</b>; no comentário, diga o que mudar. O que for reprovado eu desfaço.</p>
<ul class="como"><li>Toque numa imagem para ampliar. Na imagem ampliada, toque de novo para alternar entre HOJE e PROPOSTA no mesmo lugar.</li><li>“Ver funcionando no app” abre o Vértice de verdade dentro desta página, com arquivos inventados que ficam só na memória. Nada é lido nem gravado no seu aparelho; salvar no Excel, imprimir e instalar ficam de fora da demonstração.</li><li>As cores, as letras e o que você já aprovou continuam como estão. A faixa de cima (a igual ao Excel) fica para depois, como combinamos.</li><li>Nada foi publicado. Só publico quando você disser “pode publicar”.</li></ul>
@ITENS@
<section class="fim">
<h2>Conferências desta parte</h2>
<div class="nums"><span><b>@REGRAS@</b> testes de regra</span><span><b>@NAVEGADOR@</b> testes no navegador</span><span><b>@LAYOUT@</b> conferências das regras de layout</span><span>console <b>sem erro</b></span><span>app <b>@TAMANHO@</b></span></div>
<ul>@AUDITORIAS@</ul>
<h2>O que não deu para provar</h2>
<ul><li>O toque de verdade no seu computador de tela sensível: os testes de celular rodam num navegador que imita o toque.</li><li>A demora de leitura de verdade num aparelho lento: o item 7 foi provado segurando a leitura de propósito por alguns segundos.</li><li>As demonstrações desta página usam um banco só na memória; o app publicado usa o banco do aparelho (o que os testes automáticos usam).</li></ul>
<h2>Banco (Firebase)</h2>
<p>Nada a configurar. Esta parte só muda a tela; não cria campo novo.</p>
<h2>Próximos passos</h2>
<ul><li>Você responde esta página e cola as respostas na conversa.</li><li>Parte 2: situação com bolinha e texto, cartões sem faixa lateral, gaveta do arquivo com setas e X, histórico com a gota (regras R6 a R9).</li><li>Parte 3: busca Ctrl K suave, menu da coluna que desliza e a escala de movimento (regras R12 a R14).</li><li>Depois: a faixa de cima, no mesmo estilo e com o app de verdade.</li></ul>
<p><b>Modelo/Esforço da parte 2: Fable 5.2 · alto.</b></p>
<button type="button" class="bt pr gr" id="copiar2">Copiar respostas</button><span id="copiado" role="status"></span>
</section>
</main>
<div id="lb" hidden role="dialog" aria-modal="true" aria-label="Imagem ampliada"><div class="lb-bar"><span id="lb-t"></span><span class="seg" role="group" aria-label="Versão"><button type="button" id="lb-h" aria-pressed="false">HOJE</button><button type="button" id="lb-p" aria-pressed="true">PROPOSTA</button></span><button type="button" class="bt" id="lb-x">Fechar</button></div><div class="lb-pal" id="lb-pal"><img id="lb-img" alt=""></div></div>
<script type="text/plain" id="app-hoje-css">@CSS_H@</script><script type="text/plain" id="app-hoje-js">@JS_H@</script>
<script type="text/plain" id="app-prop-css">@CSS_P@</script><script type="text/plain" id="app-prop-js">@JS_P@</script>
<script type="application/json" id="sementes">@SEM@</script>
<script type="text/plain" id="vivo-pre">@PRE@</script>
<script>
(function () {
  'use strict';
  var CHAVE = 'vertice-aprovacao-v0620-layout-1', $ = function (s, e) { return (e || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || document).querySelectorAll(s)); };
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
  var pecas = {}, SEM = null, PRE = $('#vivo-pre').textContent;
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
        '<script>window.__VIVO={sementes:' + SEM + ',atraso:' + (cfg.atraso || 0) + ',rota:' + JSON.stringify(cfg.rota) + ',tema:' + JSON.stringify(cfg.tema) + '};' + F + '<script>' + PRE + F + '<script type="module">' + p[1] + F + '</body></html>';
    });
  }
  $$('.vivo').forEach(function (v) {
    var est = { lado: 'prop', ap: 'pc', tema: 'papel' }, pal = $('.vpal', v), ctl = $('.vctl', v), dica = $('.vdica', v), abre = $('[data-v=abre]', v);
    function medir() { var q = $('.vq', pal); if (!q) return; var w = est.ap === 'pc' ? 1280 : 390, h = est.ap === 'pc' ? 800 : 844, f = $('iframe', q); q.style.maxWidth = est.ap === 'pc' ? '' : '390px'; var e = Math.min(1, q.clientWidth / w); f.style.width = w + 'px'; f.style.height = h + 'px'; f.style.transform = 'scale(' + e + ')'; q.style.height = Math.round(h * e) + 'px'; }
    function carrega() {
      if (typeof DecompressionStream !== 'function') { pal.innerHTML = '<div class="vq"><div class="vesp">Este navegador não consegue abrir a demonstração. Abra a página no Chrome ou no Edge.</div></div>'; return; }
      pal.innerHTML = '<div class="vq"><div class="vesp">Abrindo o Vértice…</div><iframe title="Vértice Docs em demonstração"></iframe></div>'; medir();
      appHtml(est.lado, { rota: v.dataset.rota, atraso: +v.dataset.atraso || 0, tema: est.tema }).then(function (h) { var f = $('iframe', pal); if (!f) return; f.srcdoc = h; f.addEventListener('load', function () { var e = $('.vesp', pal); if (e) e.remove(); }); }, function () { pal.innerHTML = '<div class="vq"><div class="vesp">Não deu para abrir a demonstração neste navegador.</div></div>'; });
    }
    function marca() { $$('[data-v=hoje],[data-v=prop]', v).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === est.lado)); }); $$('[data-v=ap]', v).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.ap === est.ap)); }); $$('[data-v=tema]', v).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.tema === est.tema)); }); }
    v.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-v]'); if (!b) return; var a = b.dataset.v;
      if (a === 'abre') { abre.hidden = true; ctl.hidden = false; dica.hidden = false; pal.hidden = false; carrega(); }
      else if (a === 'hoje' || a === 'prop') { est.lado = a; marca(); carrega(); }
      else if (a === 'denovo') carrega();
      else if (a === 'ap') { est.ap = b.dataset.ap; marca(); carrega(); }
      else if (a === 'tema') { est.tema = b.dataset.tema; marca(); carrega(); }
      else if (a === 'cheia') { v.classList.toggle('cheia'); b.textContent = v.classList.contains('cheia') ? 'Sair da tela cheia' : 'Tela cheia'; medir(); }
      else if (a === 'fecha') { v.classList.remove('cheia'); pal.innerHTML = ''; pal.hidden = true; ctl.hidden = true; dica.hidden = true; abre.hidden = false; }
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
         '@CSS_H@': css_h, '@JS_H@': js_h, '@CSS_P@': css_p, '@JS_P@': js_p, '@SEM@': SEM, '@PRE@': PRE}
for k, v in troca.items():
    assert k in PAGINA, k
    PAGINA = PAGINA.replace(k, v)
open(SAIDA, 'w', encoding='utf-8').write(PAGINA)
print('página:', SAIDA, round(len(PAGINA.encode()) / 1024), 'KB,', N, 'itens')
