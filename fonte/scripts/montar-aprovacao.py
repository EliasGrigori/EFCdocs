"""EFCdocs — monta a página de aprovação da v0.6.2 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" <testes-de-regras> <testes-no-navegador>"""
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.6.2'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
GR, GG, GJ, GD = 'A. Faixa de cima nova e ícones novos (seu pedido principal)', 'B. Correções do Grok na v0.6.0', 'C. Janelas e margens', 'D. Decisões e lembretes'
ITENS = [
    ('R01', 'Quatro estilos de faixa para você escolher', GR,
     '<p>A faixa de cima agora tem <b>quatro estilos</b>: <b>B · Camadas</b> (cartões suaves, o que vai no computador), <b>C · Linha fina</b> (só um traço entre os grupos), <b>D · Quadrinho</b> (cada botão num quadrinho) e <b>E · Compacta</b> (só o ícone, botões maiores para o dedo; vai no celular). Em <b>Automático</b> o app escolhe: B no computador e E no celular. Você troca no botão da faixa (o de "Opções de exibição") ou em <b>Opções › Estilo da faixa</b>, e a escolha fica guardada.</p>',
     'Qual estilo você quer como padrão no computador: B, C, D ou E? (Pode comentar misturas, ex.: "C com os ícones do D".)',
     [('Antes (v0.6.1)', 'antes-faixa-inicio'), ('B · Camadas', 'depois-faixa-B-inicio'), ('C · Linha fina', 'depois-faixa-C-inicio'), ('D · Quadrinho', 'depois-faixa-D-inicio'), ('E · Compacta', 'depois-faixa-E-inicio')], 'um'),
    ('R02', 'Ícones novos: uma cor, com um toque suave', GR,
     '<p>Cada comando tem <b>um ícone só</b> (antes alguns repetiam o mesmo desenho), todos em <b>uma cor</b> com um <b>toque suave de cor</b> no detalhe principal (o "traço com toque de cor" que você escolheu). Valem para as abas Página Inicial, Inserir, Dados, Layout, Fórmulas, Revisão e Exibir, e também no Documento e nos Quadros.</p>',
     'Os ícones estão claros? Algum que você não entendeu ou quer diferente?',
     [('Antes: Inserir', 'antes-faixa-inserir'), ('Depois: Inserir', 'depois-faixa-B-inserir'), ('Antes: Dados', 'antes-faixa-dados'), ('Depois: Dados', 'depois-faixa-B-dados')], 'par'),
    ('R03', 'Um botão principal em cada aba', GR,
     '<p>Cada aba tem um <b>botão principal</b> maior e com cor (Colar na Página Inicial, Gráfico em Inserir, Validação em Dados...). Junto, a <b>Área de transferência</b> (Colar, Recortar, Copiar, Pincel) ficou como no Excel.</p>',
     'Os botões principais ajudam ou atrapalham?',
     [('Antes', 'antes-faixa-inicio'), ('Depois (B)', 'depois-faixa-B-inicio')], 'um'),
    ('R04', 'Menu da faixa com a escolha do estilo', GR,
     '<p>No mesmo botão das opções da faixa (o do canto, que também esconde a faixa ou deixa só as abas) agora há a lista <b>Estilo da faixa</b>. Esc fecha o menu.</p>', '',
     [('Menu', 'depois-faixa-menu')], 'um'),
    ('R05', 'Celular: faixa Compacta por padrão', GR,
     '<p>No celular o estilo <b>E</b> vem por padrão: só ícones, botões de 40 px que o dedo acerta, sem rolagem lateral da página. O botão <b>Abas</b> abre e fecha a faixa.</p>',
     'Ficou fácil de usar com o dedo?',
     [('Antes (v0.6.1)', 'antes-cel-faixa'), ('Depois (E)', 'depois-cel-faixa')], 'par'),
    ('G01', 'PDF: datas "####", texto cortado, Alt+Enter e mesclada', GG,
     '<p>Usei uma planilha inventada (<code>amostra-impressao.xlsx</code>) com datas em coluna estreita, texto longo, uma célula com <b>Alt+Enter</b> e uma mesclada que atravessa a quebra de página. Causa: no papel a letra saía <b>11% maior</b> que na tela dentro da mesma coluna. Agora a proporção é a da tela; data que ainda não cabe <b>encolhe a letra (até 70%)</b> antes de virar "####"; a quebra de linha do Alt+Enter <b>aparece no PDF</b> (e a célula já liga "Quebrar texto" sozinha, como o Excel); e o texto da mesclada sai <b>uma vez só</b>, na página onde ela começa.</p>',
     'No PDF a Data, o texto e a mesclada ficaram bons?',
     [('Antes (v0.6.1): ######## e texto cortado', 'pdf-antes-1'), ('Depois: datas inteiras e texto completo', 'pdf-depois-1')], 'par'),
    ('G02', 'Aviso quando a letra fica pequena demais', GG,
     '<p>"Aba toda numa página" ou uma porcentagem muito baixa podia reduzir a letra a 10% <b>sem avisar</b>. Agora, abaixo de 50%, aparece um aviso no cartão "Ajustar ao papel" dizendo quanto ficou e o que tentar (deitar a página, usar mais páginas ou imprimir só uma parte).</p>', '',
     [('Antes', 'antes-escala'), ('Depois', 'depois-escala')], 'par'),
    ('G03', 'Esc na "Nova regra" volta para a lista', GG,
     '<p>Na Formatação condicional, o Esc dentro da <b>Nova regra</b> (inclusive depois de "Pegar de uma célula") fechava tudo. Agora volta para a <b>lista de regras</b>; o segundo Esc fecha a janela. Vale também para o clique fora.</p>',
     'Esse caminho do Esc está natural?', [], ''),
    ('G04', 'Localizar e substituir arrumado', GG,
     '<p>Antes: sem rodapé e com os nomes colados nos campos. Agora no estilo Camadas: subtítulo, <b>cartão</b> com os campos e rótulos com espaço, botões no <b>rodapé</b> (Fechar à esquerda; Trocar todos e Achar o próximo à direita), o campo já com o cursor e Enter para achar.</p>', '',
     [('Antes', 'antes-localizar'), ('Depois', 'depois-localizar')], 'par'),
    ('G05', 'Aviso de leitura certo no fundo escuro e frase corrigida', GG,
     '<p>Letra preta sobre fundo escuro dizia "use uma letra mais <b>escura</b>" (ao contrário). Agora o conselho olha as cores: fundo escuro pede <b>letra mais clara</b>; fundo claro, letra mais escura; mexendo no fundo, letra clara pede fundo mais escuro e letra escura pede fundo mais claro. A frase "as células com sem preenchimento" virou "as células <b>sem</b> preenchimento passam a ter a cor escolhida".</p>', '',
     [('Antes: conselho ao contrário', 'antes-leitura'), ('Depois', 'depois-leitura')], 'par'),
    ('J01', 'Janelas mais compactas (E01)', GJ,
     '<p>As janelas começam mais perto do topo (5% da altura, antes 10%), têm cabeçalho, margens e rodapé mais enxutos e <b>nunca passam da tela</b>: o que sobra rola por dentro, com o título e os botões sempre à vista. Conferi 10 janelas em 1366×800 e 1366×600. Se pudesse ser ainda um pouco maior em tela grande, me diga.</p>',
     'Ficaram no tamanho bom? (Em um notebook pequeno, 1366×600, como abaixo.)',
     [('Antes: Validação de dados', 'antes-janela-pequena'), ('Depois', 'depois-janela-pequena')], 'par'),
    ('J02', 'Margens arrastáveis na prévia do Imprimir (P02)', GJ,
     '<p>Na prévia da página aparecem <b>quatro linhas tracejadas</b> (margens de cima, de baixo, da esquerda e da direita). Você <b>puxa com o mouse ou com o dedo</b> e a prévia, as páginas e os números de "Margens" acompanham na hora (a lista muda para "Personalizadas"). Com o teclado: foco na linha e setas (0,1 cm; com Shift, 0,5 cm). Nunca deixa a área de impressão sumir.</p>',
     'Dá para ajustar a margem do jeito que você imaginava?',
     [('Antes: só números', 'antes-imprimir'), ('Depois: linhas para puxar', 'depois-imprimir')], 'par'),
    ('D01', 'Aba "Gráfico" que aparece sozinha: v0.6.3?', GD,
     '<p>Você aprovou a ideia (F5): ao clicar num gráfico, surge uma aba <b>Gráfico</b> na faixa (Editar, Estilo rápido, Cores, Semáforo, Excluir), como no Excel. Ela mexe em comandos e seleção, por isso proponho entregar na <b>v0.6.3</b>, junto dos 10 botões que faltam, para não misturar com a faixa nova.</p>',
     'Pode ficar para a v0.6.3?', [], ''),
    ('D02', 'Lembretes que não ficam para trás', GD,
     '<ul><li><b>Editor de gráficos (seu comentário E02)</b>: quando fecharmos a lista de botões, eu reviso o que dá para acrescentar ao editor e te mostro.</li><li><b>ECharts</b>: o motor de gráficos continua o nosso; dá para trocar pelo ECharts quando você quiser.</li><li><b>F05 · Excel de verdade</b>: falta o seu retorno de como os arquivos salvos aqui abrem no Excel (principalmente os gráficos).</li></ul>', '', [], ''),
    ('P01', 'Publicação da v0.6.2', GD,
     '<p>Depois da sua aprovação, publico a v0.6.2 no GitHub (commit só com esta versão). Os seus arquivos não vão para o GitHub nem para os pacotes (só amostras inventadas). <b>Nada a configurar no Firebase.</b></p>',
     'Pode publicar? (diga se quer algum ajuste antes)', [], ''),
    ('P02', 'Próximas versões', GD,
     '<p><b>v0.6.3 · Sonnet 5.5 · alto</b>: os 10 botões que faltam (Tabela, Imagem, Link, Botão de aba, Coluna de status, Classificar, Filtrar, Duplicados, Ortografia e Travar) e, se você concordar, a aba Gráfico. <b>v0.6.4 · Opus 5.5 · alto</b>: o Painel, numa versão só dele.</p>',
     'Pode ser essa a ordem?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A v0.6.2 traz a <b>faixa nova</b> em quatro estilos (você escolhe) e os <b>ícones novos</b> de uma cor com toque suave; no celular vai o estilo Compacta.</li>'
    '<li>Corrige o que o Grok achou na v0.6.0: <b>PDF</b> (datas "####", texto cortado, Alt+Enter, mesclada), aviso de letra pequena, Esc na Nova regra, Localizar e substituir e o conselho de leitura das cores.</li>'
    '<li>As <b>janelas ficaram mais compactas</b> e dá para <b>puxar as margens na prévia do Imprimir</b>.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Faixa nova, ícones novos e correções do PDF')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
