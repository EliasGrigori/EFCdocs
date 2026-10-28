"""EFCdocs — monta a página de aprovação da v0.6.4 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" <testes-de-regras> <testes-no-navegador>"""
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.6.4'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
GA, GB, GC, GD = 'A. Planilha: o que você viu no Excel e no teste', 'B. Editor de gráficos', 'C. Faixa e filtro', 'D. Decisões e lembretes'
ITENS = [
    ('A01', 'Linhas ocultas do Excel vêm ocultas (e os gráficos ficam do tamanho certo)', GA,
     '<p>Muitos arquivos do Excel marcam "as linhas que eu não listo ficam escondidas". Antes o EFCdocs mostrava todas, e isso também <b>esticava os gráficos</b> presos a essas linhas. Agora elas ficam ocultas (até 1.000 linhas depois da última listada) e <b>Layout › Reexibir</b> mostra de novo.</p>',
     'As linhas ocultas e o tamanho dos gráficos agora batem com o seu Excel?', [('Antes', 'antes-congelada'), ('Depois', 'depois-congelada')], 'par'),
    ('A02', 'Rolar com linhas congeladas termina numa linha inteira', GA,
     '<p>Ao rolar, a rolagem agora <b>encaixa numa linha inteira</b> (como o Excel). Nenhuma linha fica pela metade embaixo da parte fixa.</p>',
     'Resolveu "as linhas sobrepondo a parte fixada"? Se ainda aparecer algo por cima, diga onde.', [('Depois (a linha de baixo está inteira)', 'depois-congelada')], 'um'),
    ('A03', 'Alt+Enter igual à quebra de texto', GA,
     '<p>Texto com <b>Alt+Enter</b> era desenhado numa linha só, com um espaço no lugar da quebra. Agora as linhas aparecem separadas, como na quebra de texto.</p>',
     'Ficou igual à quebra de texto?', [('Antes', 'antes-altenter'), ('Depois', 'depois-altenter')], 'par'),
    ('A04', 'Letras sem borrar no zoom', GA,
     '<p>As letras são desenhadas <b>no pixel da tela</b> e a planilha se redesenha quando o zoom do navegador muda. Se ainda borrar, me diga o zoom e a tela (Windows 125%? celular?).</p>',
     'Está nítido nos seus zooms de costume?', [], ''),
    ('A05', 'Tirar o link, link que acompanha copiar e colar', GA,
     '<p>Inserir › <b>Tirar link</b> (e no clique direito). Copiar e colar uma célula com link <b>leva o link</b>. Desfazer devolve.</p>',
     'Está onde você esperava?', [], ''),
    ('A06', 'Vínculos e fórmulas', GA,
     '<p>Fórmula digitada como <code>=SOMA(Coletas[Cloro])</code> agora funciona (vira endereço, como na importação). Travar/destravar <b>pede a senha</b> quando a aba veio do Excel com senha; as permissões finas do Excel e o "Ctrl+Z destrava" foram corrigidos. Gráfico ligado a <b>outro arquivo</b> avisa na importação; GIF animado avisa que fica parado.</p>',
     '', [], ''),
    ('B01', 'Editor do gráfico: Ctrl+Z, Ctrl+Y e Tirar a formatação', GB,
     '<p>Dentro do editor, <b>Ctrl+Z / Ctrl+Y</b> (e os botões) desfazem e refazem cada mudança, inclusive Estilo rápido. O botão <b>Tirar a formatação</b> volta ao padrão. O furo da rosca ficou na aba <b>Tipo</b>. Com <b>uma célula</b> escolhida, o velocímetro lê aquela célula e não a tabela inteira.</p>',
     'Está bom assim?', [('Depois', 'depois-editor')], 'um'),
    ('B02', 'Cancelar pergunta antes de perder a mudança', GB,
     '<p>Se você mexeu, <b>Cancelar</b> (ou Esc, ou clicar fora) pergunta: continuar editando, descartar ou salvar.</p>',
     'Aprovado?', [('Depois', 'depois-editor-cancelar')], 'um'),
    ('B03', 'Gráfico no PDF não é cortado entre duas páginas', GB,
     '<p>Gráfico ou imagem que cabe numa página vai <b>inteiro</b> para a página seguinte em vez de ser partido ao meio.</p>', '', [], ''),
    ('B04', 'Aba Gráfico: ligar e desligar', GB,
     '<p><b>Exibir › Aba Gráfico</b> (e dentro da própria aba) liga e desliga o aparecimento automático da aba. Escolher uma célula pela caixa de nome também solta o gráfico.</p>',
     'Está onde você queria?', [('Exibir', 'depois-exibir-abagrafico')], 'um'),
    ('C01', 'Janela do filtro mais limpa', GC,
     '<p>Menu mais enxuto (ordenar em linha, sem caixas dentro de caixas). Ao <b>procurar</b> e dar OK, ficam marcados <b>só os itens achados</b>, sem desmarcar um por um, e aparece "<b>N de M linhas aparecem</b>". A seta do título ficou mais <b>quadrada</b>.</p>',
     'Ficou clean o bastante?', [('Antes', 'antes-filtro'), ('Depois', 'depois-filtro')], 'par'),
    ('C02', 'Faixa: estilo E em 1366, Exibir na mesma altura, Ctrl+F1 em um lugar só', GC,
     '<p>No estilo E o botão <b>Mais</b> não é mais coberto pelo de recolher. A aba <b>Exibir</b> tinha 136 px e as outras 110: agora todas têm a mesma altura (a planilha não pula). <b>Ctrl+F1</b> aparece só no menu da faixa. No celular, a faixa é só de ícones.</p>',
     'Aprovado?', [('Antes: estilo E', 'antes-faixa-E'), ('Depois: estilo E', 'depois-faixa-E'), ('Antes: Exibir', 'antes-faixa-exibir'), ('Depois: Exibir', 'depois-faixa-exibir')], 'par'),
    ('C03', 'Celular: faixa só de ícones', GC,
     '<p>No celular, também o botão principal (Colar etc.) fica só com o ícone; o nome continua para leitor de tela e dica.</p>',
     'Aprovado?', [('Antes', 'antes-celular'), ('Depois', 'depois-celular')], 'par'),
    ('D01', 'Imagens que você mandou: o que fica para as próximas versões', GD,
     '<p>Pelos seus prints: <b>v0.6.5</b> importa as <b>formas do Excel</b> (painéis de fundo, setas, botões de navegação com link para outra aba, texto dentro delas); <b>v0.6.6</b> faz o acabamento dos gráficos (rótulos ligados a células embaixo dos velocímetros, títulos e legendas que somem, caixas de texto sobre gráficos). <b>v0.6.7</b>: o Painel e a aba nova de edição de gráfico (exportar como imagem, duplicar, meta arrastável, estilo como modelo, barras de erro). <b>v0.7.0</b>: Documento e gráfico nos post-its. Os arquivos da empresa <b>não entram nos testes</b>: uso cópias inventadas.</p>',
     'Pode ser essa a ordem?', [], ''),
    ('D02', 'Salvar em Excel: o que se perde', GD,
     '<p>Pelo seu teste de abrir e salvar: sem mexer, os gráficos saem <b>idênticos</b>; com um editado, só ele muda. Perdem-se: o <b>tema do arquivo</b> (a largura padrão das colunas muda um pouco e o quadro do gráfico do Painel desloca levemente) e as <b>quebras de página</b> da impressão. Entram na v0.6.6.</p>',
     'Aceita esperar até a v0.6.6?', [], ''),
    ('P01', 'Publicação da v0.6.4', GD,
     '<p>Depois da sua aprovação, publico a v0.6.4 no GitHub (commit só com esta versão). Os seus arquivos não vão para o GitHub nem para os pacotes. <b>Nada a configurar no Firebase.</b></p>',
     'Pode publicar?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>Correções do relatório do Grok (v0.6.1 a v0.6.3) e dos seus testes com planilhas reais: linhas ocultas, Alt+Enter, zoom, congelamento, link, filtro, editor de gráfico e faixa.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Correções do Grok e dos seus testes reais')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
