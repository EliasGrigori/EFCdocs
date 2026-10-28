"""EFCdocs — monta a página de aprovação da v0.6.5 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" <testes-de-regras> <testes-no-navegador>"""
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.6.5'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
GA, GB, GC = 'A. Formas que vêm do Excel', 'B. Formas no EFCdocs', 'C. Decisões e o que vem depois'
ITENS = [
    ('A01', 'Painel do Excel com as formas: fundo, título, botões, setas, documento, desenho livre', GA,
     '<p>As <b>formas</b> do Excel agora vêm: painel de fundo (com degradê), caixas de texto, botões com cantos em diagonal e sombra, setas (de bloco e de linha, com ponta), formas de fluxograma, desenho livre e figuras dentro de grupo. Elas ficam <b>na mesma ordem do Excel</b> (o painel embaixo, os gráficos por cima). A amostra é inventada (<code>amostra-formas.xlsx</code>), no mesmo estilo do seu painel.</p>',
     'Ficou como você esperava? Teste também com a sua cópia inventada do painel.', [('Antes (v0.6.4): só o gráfico', 'antes-painel'), ('Depois (v0.6.5)', 'depois-painel')], 'par'),
    ('A02', 'Botões de navegação: um clique leva à aba', GA,
     '<p>Forma com link (como os seus botões "Coletas", "Solo", "Frutas"...) funciona igual ao Excel: <b>um clique leva à aba</b>. Para escolher, mover ou mudar: <b>Ctrl + clique</b> (no celular, segure o dedo) e Enter. Num grupo de botões, cada botão leva para o seu lugar. Link para site também abre.</p>',
     'Aprovado?', [('Passando o mouse', 'depois-botao-hover'), ('Depois do clique em "Ações": foi para a aba Ações Corretivas', 'depois-botao-foi'), ('Ctrl + clique escolhe o grupo', 'depois-escolhida')], 'par'),
    ('A03', 'Texto ligado a uma célula (o valor muda sozinho)', GA,
     '<p>Caixa de texto do Excel ligada a uma célula (<code>=C40</code>) mostra <b>o valor da célula</b> e acompanha quando ele muda (no print, o 34 é a soma da aba Dados). Isso deve trazer os <b>números embaixo dos velocímetros</b> que faltavam, se no seu painel eles forem caixas de texto ligadas. Se forem texto dentro do próprio gráfico, ficam para a v0.6.6.</p>',
     'Os números embaixo dos seus velocímetros apareceram?', [], ''),
    ('A04', 'Grupos: gráfico dentro do grupo, figura no grupo, segmentação de dados', GA,
     '<p>Antes, um grupo com gráfico dentro virava <b>um gráfico do tamanho do grupo todo</b> (por isso os gráficos ficavam empilhados e fora do lugar). Agora o gráfico sai solto <b>no lugar e no tamanho dele</b>, e o resto do grupo vem como forma. Figura dentro do grupo vem (com o recorte, por exemplo redonda). <b>Segmentação de dados</b> (slicer) ainda não: ela fica fora e o relatório da importação avisa.</p>',
     'Os gráficos do seu painel ficaram no lugar certo?', [], ''),
    ('A05', 'Salvar como Excel: as formas voltam, e o tema do arquivo também', GA,
     '<p>Forma <b>sem mexer volta com o XML original</b> (só a posição é refeita); forma mexida ou nova é escrita de novo. Os links passam a apontar para o nome novo se a aba mudar de nome. O <b>botão do EFCdocs</b> (v0.6.3) agora vai como <b>forma com link</b>: no Excel, um clique leva à aba (sem macro). E o <b>tema do arquivo volta</b> (era um dos itens da v0.6.6): sem ele, cores do tema (como o laranja dos botões e as cores dos gráficos) mudavam em outros programas. Prints abaixo: o arquivo salvo aberto no LibreOffice.</p>',
     'Teste no seu Excel: abra, salve como Excel sem mexer e abra o arquivo salvo. As formas e as cores voltaram iguais?', [('Arquivo original', 'original-lo'), ('Salvo pela v0.6.4 (formas perdidas)', 'antes-lo'), ('Salvo pela v0.6.5', 'depois-lo')], 'tres'),
    ('B01', 'Inserir › Forma (novo)', GB,
     '<p>Na faixa <b>Inserir › Ilustrações › Forma</b>: 22 desenhos (retângulo, arredondado, elipse, setas, estrela, documento, balão, linha, seta de linha, caixa de texto...). Na mesma janela: <b>texto</b>, letra (tamanho, cor, negrito), alinhamento, <b>preenchimento</b> (cor, degradê ou nenhum), <b>contorno</b>, <b>sombra</b>, <b>ligar à célula</b> e <b>ao clicar</b> (ir para uma aba ou abrir um site).</p>',
     'Aprovado?', [('Janela', 'depois-inserir-forma'), ('A forma na planilha', 'depois-forma-nova'), ('Antes: faixa Inserir', 'antes-faixa-inserir'), ('Depois: faixa Inserir', 'depois-faixa-inserir')], 'par'),
    ('B02', 'Mudar uma forma que veio do Excel', GB,
     '<p>Dois cliques (ou Enter com ela escolhida) abrem a mesma janela. Num <b>grupo</b>, você escolhe a parte (por exemplo, um botão só); a parte escolhida fica marcada na prévia. Ctrl+Z desfaz.</p>',
     'Aprovado?', [('Grupo de botões', 'depois-janela-grupo')], 'um'),
    ('B03', 'Imprimir e PDF com as formas', GB,
     '<p>A prévia, a impressão e o PDF levam as formas (painel, textos, setas), no lugar delas.</p>', 'Aprovado?', [('Prévia', 'depois-imprimir')], 'um'),
    ('B04', 'Celular', GB,
     '<p>No celular as formas aparecem igual, e a janela da forma cabe na tela (sem rolar para o lado).</p>', 'Aprovado?', [('Antes', 'antes-celular'), ('Depois', 'depois-celular')], 'par'),
    ('C01', 'O que ainda não vem e quando', GC,
     '<p>Ficam para depois: <b>caixas de texto dentro do próprio gráfico</b>, títulos e legendas (acabamento dos gráficos: <b>v0.6.6</b>, junto com a <b>largura padrão das colunas</b> e as <b>quebras de página</b> ao salvar); <b>segmentação de dados</b> (slicers) e efeitos 3D/bisel das formas (sem data ainda; o relatório avisa quando o arquivo tem). Desenhos à tinta também ficam fora.</p>',
     'Pode ser essa a ordem?', [], ''),
    ('P01', 'Publicação da v0.6.5', GC,
     '<p>Depois da sua aprovação, publico a v0.6.5 no GitHub (commit só com esta versão). Os seus arquivos não vão para o GitHub nem para os pacotes. <b>Nada a configurar no Firebase.</b></p>',
     'Pode publicar?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>Formas do Excel: painéis de fundo, botões com link para outra aba, setas, caixas de texto (também ligadas a células), grupos com figura e gráfico dentro. Inserir › Forma no EFCdocs. Ao salvar, as formas e o tema do arquivo voltam para o Excel.</li>'
    '<li>Os prints usam só amostras inventadas; os seus arquivos não foram para o GitHub nem para os pacotes. Nada a configurar no Firebase.</li>'
    '</ul>'
)

partes = []
grupo = None
for cod, titulo, g, texto, pergunta, fotos, estilo in ITENS:
    if g != grupo:
        partes.append(f'<h2 class="grupo">{html.escape(g)}</h2>')
        grupo = g
    figs = ''.join(f'<figure><figcaption>{html.escape(leg)}</figcaption><img src="{img[k]}" alt="{html.escape(leg)}"></figure>' for leg, k in fotos)
    fotos_html = f'<div class="fotos {estilo}">{figs}</div>' if fotos else ''
    q = f'<p class="q">{html.escape(pergunta)}</p>' if pergunta else ''
    partes.append(f'''<article class="item" data-cod="{cod}" data-titulo="{html.escape(titulo)}">
  <div class="cab"><b class="cod">{cod}</b><h3>{html.escape(titulo)}</h3></div>
  <div class="txt">{texto}{q}</div>
  {fotos_html}
  <div class="resp">
    <label class="op sim"><input type="radio" name="{cod}" value="APROVADO">Aprovado</label>
    <label class="op nao"><input type="radio" name="{cod}" value="REPROVADO">Reprovado</label>
    <textarea placeholder="Comentário (opcional)" aria-label="Comentário {cod}"></textarea>
  </div>
</article>''')

modelo = open('scripts/aprovacao.modelo.html', encoding='utf-8').read()
saida_html = (modelo.replace('{{ITENS}}', '\n'.join(partes)).replace('{{RESUMO}}', resumo)
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Formas do Excel')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
