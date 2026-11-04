"""EFCdocs — monta a página de aprovação da v0.6.9 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" <testes-de-regras> <testes-no-navegador>"""
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.6.9'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
GA = 'A. Congelamento (o que você viu na tela de toque)'
GB = 'B. Largura e altura'
GC = 'C. Grade'
GP = 'P. Publicação'
ITENS = [
    ('A01', 'O que fica parado agora é desenhado por cima do que rola', GA,
     '<p>Pelos seus prints, o problema aparece <b>depois de rolar</b>: os riscos das células somem dentro do quadro verde (a parte congelada). A causa é como a tela era montada: o cabeçalho, os números das linhas e os painéis congelados eram desenhados <b>dentro da mesma área que rola</b>. No computador com <b>tela de toque</b> o navegador rola por conta própria, fora do nosso código, e nesse intervalo a parte congelada chega a deslizar junto — e o que está rolando passa por cima dela.</p>'
     '<p>Agora o que fica parado vai num <b>desenho próprio, por cima e fora da área que rola</b>. Por mais rápido que o dedo role, o cabeçalho e as colunas congeladas ficam inteiros, com os riscos no lugar.</p>'
     '<p class="obs">Aviso honesto: no meu computador (sem tela de toque) eu <b>não consegui fazer o defeito acontecer</b> — testei com mouse, com toque simulado, em 100%, 80% e com a tela em 125%, e a grade continuou lá. Então esta correção ataca a causa mais provável, mas quem confirma é você, no seu aparelho.</p>',
     'Na sua tela de toque, os riscos continuam no lugar depois de rolar?',
     [('Antes (v0.6.8): depois de rolar e voltar', 'antes-congelado'), ('Depois (v0.6.9)', 'depois-congelado')], 'par'),
    ('A02', 'Testado com uma amostra que imita a sua planilha', GA,
     '<p>Fiz uma amostra <b>inventada</b> (<code>amostra-v069.xlsx</code>) com a mesma estrutura da sua: congelada nos <b>dois sentidos</b> (8 colunas e 7 linhas), cabeçalho alto nas linhas 1 a 5 mescladas, <b>coluna F oculta</b>, <b>coluna H quase invisível</b> (0,109 de largura, igual à sua), linhas ocultas logo abaixo das congeladas e mais de 400 linhas. A sua planilha ficou só aqui comigo para eu reproduzir; ela não entra nos testes nem nos pacotes.</p>',
     'Aprovado?', [], ''),
    ('B01', 'Várias colunas (ou linhas) mudam de tamanho juntas', GB,
     '<p>Como no Excel: com várias colunas inteiras escolhidas, arrastar a divisa de uma <b>muda todas</b>. O mesmo com linhas. Um Ctrl+Z devolve todas de uma vez ("Largura de 3 colunas"). Se a coluna arrastada estiver fora da seleção, muda só ela.</p>',
     'Aprovado?',
     [('Antes (v0.6.8): só a arrastada muda', 'antes-larguras'), ('Depois (v0.6.9): as três ficam iguais', 'depois-larguras')], 'par'),
    ('B02', 'A guia acompanha o cursor enquanto você arrasta', GB,
     '<p>Antes a largura só mudava <b>quando você soltava</b>: nada acompanhava o movimento. Agora uma linha fina da cor do tema anda junto com o mouse (ou com o dedo) mostrando onde a borda vai ficar, junto com a etiqueta "Largura: N px". Ao soltar, a coluna fica exatamente onde a guia estava.</p>',
     'Aprovado?',
     [('Antes (v0.6.8): arrastando, nada se move', 'antes-arrastando'), ('Depois (v0.6.9): a guia segue o cursor', 'depois-arrastando')], 'par'),
    ('C01', 'Grade com mais contraste', GC,
     '<p>A grade vinha da cor de borda do tema e ficava mais fraca que a do Excel, ainda mais com a tela em 125%. Agora a cor é afastada do fundo até aparecer de verdade, sem virar borda preta — e isso vale em todos os temas, claro e escuro. Prints com a tela em 125%.</p>',
     'Ficou melhor de ler?',
     [('Antes (v0.6.8)', 'antes-grade'), ('Depois (v0.6.9)', 'depois-grade')], 'par'),
    ('P01', 'Publicação', GP,
     '<p>A v0.6.9 corrige o que você mandou hoje de madrugada. Se aprovar, publico sozinha (a v0.6.7 e a v0.6.8 já estão no ar desde ontem, commit 44c573c) e sigo com a <b>v0.7.0 (Documento e gráfico no Quadro)</b>, que eu já tinha começado. <b>Nada a configurar no Firebase.</b></p>',
     'Pode publicar a v0.6.9?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>Congelamento: o cabeçalho e os painéis congelados passam a ser desenhados por cima do que rola (é o que explica os riscos sumindo na sua tela de toque).</li>'
    '<li>Largura e altura: várias colunas ou linhas mudam juntas, e uma guia acompanha o cursor enquanto você arrasta.</li>'
    '<li>Grade com mais contraste, em todos os temas.</li>'
    '<li>Testado com uma amostra inventada que imita a estrutura da sua planilha (amostra-v069.xlsx); a sua planilha não entrou nos testes. Nada a configurar no Firebase.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Congelamento na tela de toque, largura de várias colunas e grade')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
