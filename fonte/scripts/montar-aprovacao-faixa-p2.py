#!/usr/bin/env python3
"""Vértice Docs — página de aprovação do layout da família (v0.6.21, faixa igual ao Excel, parte 2: abas Inserir e Fórmulas e o Sabiá 2.1 no projeto).
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

import json as _j2
ABAS = _j2.load(open(os.path.join(PRINTS, 'abas.json'), encoding='utf-8'))
TAB = lambda nome: C('.tabs .tab', ABAS.index(nome))
EXCEL = 'Seu pedido: “bem parecido com Excel, locais e posicionamento, para atrair quem é do Excel, mas com sua graça própria”. Regra R25 (faixa igual ao Excel).'

grupo('Abas Inserir e Fórmulas nos lugares do Excel')
item(1, 'Aba Inserir: os grupos na ordem do Excel',
     '<p>A aba Inserir passa a ter os grupos do Excel, na mesma ordem: <b>Tabelas</b> (Tabela dinâmica, Tabela), <b>Ilustrações</b> (Imagens, Formas), <b>Gráficos</b>, <b>Links</b>, <b>Comentários</b> e <b>Texto</b> (Linha de assinatura). O que é só do Vértice fica junto no fim, no grupo <b>Do Vértice</b>: Painel, Coluna de status, Botão e Foto na célula.</p>'
     '<p>Nova aba, Inserir linha e Inserir coluna saíram desta aba e ficam em Página Inicial › Células › Inserir, que é onde o Excel põe. Nenhum comando sumiu: o teste confere um por um.</p>',
     EXCEL,
     par('Planilha aberta na aba Inserir (HOJE = v0.6.21 parte 1, que você aprovou)', 'inserir')
     + mov(1, '#/planilha', ABRE + [D('Abrindo a aba Inserir'), TAB('Inserir'), E(1800)], 'Ver a aba Inserir no app'))
item(2, 'Gráficos: um ícone por tipo, e o gráfico já abre no tipo que você clicou',
     '<p>Como no Excel, ao lado do botão grande “Gráfico” ficam os ícones dos tipos em duas linhas: colunas, linha, pizza e rosca em cima; barras, área, dispersão e “Outros gráficos” embaixo. A lista “Outros gráficos” traz combinado, Pareto, controle, histograma e velocímetro, e “Escolher pelos dados…”.</p>'
     '<p>Clicou em Pizza, a janela “Inserir gráfico” já abre em Pizza, com os dados ao redor da célula escolhida. Na primeira tentativa ela abria em Colunas (o tipo se perdia ao montar a janela); achei pelo teste, corrigi, e o teste agora prova.</p>',
     EXCEL,
     so_prop('Grupo Gráficos de perto', 'g-graficos') + so_prop('Lista “Outros gráficos”', 'l-outros') + so_prop('Clicou em Pizza: a janela abre já em Pizza', 'janela-pizza')
     + mov(2, '#/planilha', ABRE + VAI('A1') + [TAB('Inserir'), E(900), D('Clicando no ícone da pizza'), CMD('inserir.grafico|pizza'), E(2600), T('Escape'), E(800)], 'Ver o gráfico de pizza no app'))
item(3, 'Aba Fórmulas: Biblioteca de funções com as gavetas do Excel',
     '<p>O grupo Biblioteca de funções fica igual ao do Excel: “Inserir função” grande à esquerda e, ao lado, três colunas de botões com lista: <b>AutoSoma</b>, <b>Lógica</b>, <b>Texto</b> / <b>Data e hora</b>, <b>Pesquisa e referência</b>, <b>Matemática</b> / <b>Estatística</b>, <b>Mais funções</b>.</p>'
     '<p>Cada gaveta mostra as funções do Vértice em ordem alfabética; parar o mouse em uma mostra para que ela serve, ao lado da lista (para não cobrir os itens de baixo). Escolher uma começa a conta na célula, por exemplo <b>=SE(</b>. A última linha, “Procurar nesta lista…”, abre a janela Inserir função já na gaveta. Toda função do Vértice está em uma gaveta só; o teste confere.</p>',
     EXCEL,
     par('Planilha aberta na aba Fórmulas', 'formulas') + so_prop('Biblioteca de funções de perto', 'g-biblioteca') + so_prop('Gaveta Lógica, com a dica ao lado', 'l-logica')
     + so_prop('Gaveta Matemática, com um título para cada parte', 'l-matematica') + so_prop('“Procurar nesta lista…” abre Inserir função já na gaveta', 'janela-funcoes')
     + mov(3, '#/planilha', ABRE + VAI('F2') + [TAB('Fórmulas'), E(900), D('Abrindo a gaveta Lógica'), C('[data-menu-faixa=fnLogica]'), E(1700), D('Escolhendo SE: a conta começa na célula'), C('.rb-lista [data-cmd="formula.inserir|IF"]'), E(1800), T('Escape'), E(600)], 'Ver a Biblioteca no app'))
item(4, 'AutoSoma com seta: Soma, Média, Contar números, Máximo e Mínimo',
     '<p>O botão AutoSoma soma os números de cima (ou da esquerda), como sempre. A seta ao lado, como no Excel, abre as outras contas: Média, Contar números, Máximo e Mínimo, e “Mais funções…”. A conta escolhida já vem com a faixa certa, e Ctrl+Z desfaz em um passo.</p>',
     EXCEL,
     so_prop('Lista da AutoSoma', 'l-autosoma') + so_prop('Escolheu Média: a conta aparece na célula com a faixa de cima', 'autosoma-media')
     + mov(4, '#/planilha', ABRE + VAI('C6') + [TAB('Fórmulas'), E(900), D('Abrindo a seta da AutoSoma'), C('[data-menu-faixa=autosoma]'), E(1600), D('Média'), C('.rb-lista [data-cmd="formula.autosoma|MÉDIA"]'), E(1800), T('Escape'), E(600)], 'Ver a AutoSoma no app'))
item(5, 'Nomes definidos e Auditoria de fórmulas com os nomes do Excel',
     '<p>“Gerenciador de nomes” grande, com “Definir nome” e “Criar a partir da linha de títulos” ao lado. Na Auditoria de fórmulas: “Rastrear precedentes”, “Rastrear dependentes” e “Verificação de erros” em coluna, e “Explicar conta” grande. “Montar a conta” (que é só do Vértice) fica no grupo Do Vértice, no fim.</p>',
     EXCEL,
     so_prop('Nomes definidos e Auditoria de fórmulas', 'g-nomes'))
grupo('Suas dúvidas da parte 1')
item(6, 'D1 · Estilos com os nomes do Excel',
     '<p>Você não respondeu à D1; segui a minha sugestão: os botões passam a se chamar <b>Formatação condicional</b> e <b>Formatar como tabela</b>, como no Excel. Na aba Inserir o botão continua “Tabela”, que também é o nome do Excel lá. Os nomes são mais compridos e tomam espaço: em 1280 com o menu aberto, o grupo Edição passa a mostrar AutoSoma, Preencher e Limpar só com o ícone (o nome fica na dica). Se preferir os nomes antigos, reprove este item.</p>',
     'Dúvida D1 da página da parte 1.',
     par('Grupo Estilos', 'g-estilos'))
item(7, 'D2 · Formatar › altura da linha e largura da coluna',
     '<p>Também segui a sugestão da D2: o botão Formatar ganha, no alto da lista e na ordem do Excel, <b>Altura da linha…</b>, <b>Ajustar a altura da linha</b>, <b>Largura da coluna…</b> e <b>Ajustar a largura da coluna</b>; depois vêm ocultar e reexibir, como antes.</p>'
     '<p>A pergunta já vem com o tamanho de hoje e recusa número fora da faixa (largura de 4 a 600, altura de 6 a 400). Vale para todas as linhas ou colunas escolhidas de uma vez, num passo só de desfazer. “Ajustar” deixa a coluna do tamanho do maior texto. O menu do cabeçalho (botão direito na letra da coluna) usa as mesmas contas.</p>',
     'Dúvida D2 da página da parte 1.',
     par('Lista do Formatar', 'l-formatar') + so_prop('Largura da coluna: a pergunta', 'largura')
     + mov(7, '#/planilha', ABRE + VAI('B2') + [D('Formatar › Largura da coluna…'), C('[data-menu-faixa=formatar]'), E(1500), C('.rb-lista [data-cmd="planilha.larguraColuna"]'), E(2400), T('Escape'), E(600)], 'Ver a largura da coluna no app'))
grupo('Tamanho da tela e tema')
item(8, 'Tela apertada: mais um degrau antes do “Mais”',
     '<p>As abas novas têm muitos botões. Com a tela larga (1920) tudo aparece com o nome. Em 1280 com o menu lateral aberto, tudo cabe. Em 1100 e 1024, antes de mandar um grupo para o “Mais”, os botões das colunas ficam só com o ícone (e continuam com o nome para o leitor de tela e na dica). No celular a faixa completa rola de lado, com botões de 44 px; no tema escuro as listas usam o fundo do tema.</p>',
     'Regra da faixa: nunca passar da tela (v0.6.4, R02); toque de 44 px; tema escuro.',
     so_prop('Tela de 1100, aba Inserir: colunas só com o ícone', 'tela-1100') + so_prop('Tela de 1920, aba Fórmulas: com os nomes', 'tela-1920')
     + par('Tema escuro, aba Fórmulas', 'formulas-escuro') + par('Celular, aba Fórmulas', 'cel-formulas', cel=True))
grupo('Método Sabiá 2.1 no projeto')
item(9, 'Kit 2.1.0, ficha e memória pelos modelos novos',
     '<p>Conferi o EFC-Claude-Base: o kit do projeto era o 2.0 e diferia só no cabeçalho de versão dos programas; troquei a pasta <code>scripts/sabia</code> pela cópia do repositório e criei o <code>KIT-VERSAO</code> com <b>2.1.0</b>. O <code>METODO-SABIA-2.md</code> saiu; entraram <code>docs/METODO-SABIA.md</code> e o histórico. A habilidade metodo-sabia da conta é igual à do repositório.</p>'
     '<p>A <b>ficha</b> foi refeita pelo modelo novo, com a <b>Ligação</b> (repositório e versão), o <b>Plano de volta</b> e a <b>Lista de publicação</b>. A <b>memória</b> foi reorganizada nas 10 seções do modelo, com as regras novas R32 a R41 (fluidez, Sabiá 2.1, regra única de barrar, trilhos e revisor novo, ida e volta, Floorplan, Fase 3 de 7 dias, revisão total do Grok, regras fixas do material, publicar só com a sua ordem) e a tabela das versões com os dois números (tempo gasto e defeitos depois da entrega).</p>',
     'Seu pedido de 15/11, passos 1 a 3 e 6 e 7.', '')
item(10, 'Linha de base das cinco auditorias e uma regra só para barrar',
     '<p>Medi as cinco auditorias com os programas do kit 2.1.0 na parte 1 aprovada, antes de mexer: é a linha de base (<code>docs/auditorias/base-v0.6.21-parte1</code>). Regra: nenhuma medida de programa pode piorar contra ela, e tela nova tem de bater a meta. Os números de hoje, contra a base, estão no fim desta página.</p>'
     '<p>Base: visual 12 de 14 telas dentro das metas (fora: o relatório de “Abrir Excel”, 8 tamanhos de letra para a meta de 7); rapidez digitar 50 ms, mover 34 ms, desfazer 34 ms; fidelidade sem diferença nova; segurança 0 achados; código 0 avisos ao montar.</p>',
     'Seu pedido de 15/11, passo 4.', '')
item(11, 'Programa de ida e volta (planilha, documento e post-it) com conferente de fora',
     '<p>Como o Vértice grava arquivos, ele agora tem o programa de ida e volta exigido antes da Fase 2: cria uma planilha, um documento e um quadro inventados, grava no banco do aparelho, reabre e confere campo por campo; lê o PDF do Quadro com um leitor de fora (pypdf) e o Word com python-docx. São 46 conferências, 0 diferenças.</p>'
     '<p>Para provar que o conferente enxerga, os testes estragam um dado de propósito e conferem que ele acusa. Ele roda sozinho dentro da auditoria de fidelidade.</p>',
     'Seu pedido de 15/11, passo 5.', '')
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
<title>Vértice Docs v0.6.21 · Faixa igual ao Excel, parte 2</title>
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
<div class="topo"><div class="topo-in"><b>Vértice Docs v0.6.21 · faixa igual ao Excel, parte 2</b><span id="cont">0 de @N@ respondidos</span><span class="sp"></span><button type="button" class="bt pr" id="copiar">Copiar respostas</button></div></div>
<main>
<h1>Faixa igual ao Excel: Inserir e Fórmulas</h1>
<p class="sub">Segunda parte da faixa de cima nos lugares do Excel: as abas <b>Inserir</b> e <b>Fórmulas</b> da Planilha, as respostas que segui para D1 e D2, e o Método Sabiá 2.1 dentro do projeto (@N@ itens). <b>HOJE</b> é a parte 1 que você aprovou; <b>PROPOSTA</b> é a parte 2. Tudo tirado do app de verdade, com dados inventados. Nada foi publicado.</p>
<ul class="como"><li>Toque numa imagem para ampliar. Na imagem ampliada, toque de novo para alternar entre HOJE e PROPOSTA no mesmo lugar.</li><li>“Ver … no app” abre o Vértice de verdade dentro desta página e faz os passos sozinho; depois você pode mexer. Os arquivos são inventados e ficam só na memória: nada é lido nem gravado no seu aparelho.</li><li>O desenho dos ícones não mudou nesta parte (só entraram cinco ícones novos, no mesmo traço). O redesenho dos ícones fica para uma parte só dele.</li><li>Nada foi publicado. Só publico quando você disser “pode publicar”.</li></ul>
@ITENS@
<section class="fim">
<h2>Conferências desta parte</h2>
<div class="nums"><span><b>@REGRAS@</b> testes de regra</span><span><b>@NAVEGADOR@</b> testes no navegador</span><span><b>@LAYOUT@</b> conferências de layout, fluidez e faixa</span><span>console <b>sem erro</b></span><span>app <b>@TAMANHO@</b></span></div>
<ul>@AUDITORIAS@</ul>
<h2>Dúvidas (responda no comentário de qualquer item ou na conversa)</h2>
<ul><li><b>D3 · Telas médias (1366 a 1440)</b>, da parte 1, continua sem resposta. Segui o mesmo: os botões pequenos ficam só com o ícone e o menu lateral não se esconde sozinho.</li>
<li><b>D4 · “Classificar e Filtrar” e “Localizar e Selecionar”</b>, da parte 1, continua sem resposta. Mantive “Filtrar” e “Localizar” diretos até o Classificar chegar.</li>
<li><b>D5 · O que vai em “Mais funções”.</b> O Excel põe ali Estatística, Engenharia, Cubo, Informações, Compatibilidade e Web. O Vértice não tem Engenharia, Cubo nem Web; “Mais funções” traz Informações e o que sobrou. Está bom assim?</li>
<li><b>D6 · Você não tem mais o Fable.</b> A habilidade metodo-sabia diz “Forte (hoje Fable 5.2 ou Opus 5.5)”. Quer que eu proponha, no EFC-Claude-Base, trocar para “Forte (hoje Opus 5.5, alto)”? Isso muda material do repositório: só com a sua aprovação e passando por revisor novo.</li>
<li><b>D01 da v0.6.19 (desfazer a tabela viva em um passo ou dois)</b> continua esperando você.</li></ul>
<h2>Sugestões</h2>
<ul><li>Quando o Classificar chegar, juntar “Classificar e Filtrar” num botão com lista, como no Excel (D4).</li><li>Os ícones de função e de gráfico são novos, no traço do Vértice; entram no redesenho geral dos ícones, a última parte da faixa.</li></ul>
<h2>O que não deu para provar</h2>
<ul><li>Não tive os prints do seu Excel; segui o Excel 365 em português. Se o seu tiver alguma coisa em outro lugar, diga no comentário.</li><li>Na demonstração dentro da página os passos são cliques simulados; arrastar para escolher várias células não entra.</li><li>A ida e volta usa leitores de fora (openpyxl, LibreOffice, pypdf, python-docx), não o Excel nem o Word de verdade.</li><li>Pressão e toque com caneta de verdade só no seu aparelho (roteiro do Grok).</li></ul>
<h2>Banco (Firebase)</h2>
<p>Nada a configurar. Esta parte só muda a tela e os programas de teste; a altura e a largura usam campos que o arquivo já tinha.</p>
<h2>Próximos passos</h2>
<ul><li>Você responde esta página e cola a resposta na conversa.</li><li>Parte 3 da faixa: abas Dados, Layout da Página, Revisão e Exibir nos lugares do Excel. Depois o redesenho dos ícones, e então o traço à mão nos post-its (modelo Looseleaf).</li><li>Guardado para depois de tudo, a seu pedido: a escrita à mão no Quadro (ideia do brainotes).</li><li>As v0.6.19, v0.6.20 e v0.6.21 parte 1 seguem prontas e não publicadas, como você pediu.</li></ul>
<p><b>Modelo/Esforço da próxima etapa (faixa, parte 3): Opus 5.5 · alto.</b></p>
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
  var CHAVE = 'vertice-aprovacao-v0621-faixa-2', $ = function (s, e) { return (e || document).querySelector(s); }, $$ = function (s, e) { return [].slice.call((e || document).querySelectorAll(s)); };
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
