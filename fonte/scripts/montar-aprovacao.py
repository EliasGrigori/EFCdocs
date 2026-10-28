"""EFCdocs — monta a página de aprovação da v0.6.0 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" <testes-de-regras> <testes-no-navegador>"""
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.6.0'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
GE, GG, GP, GO, GD = 'A. Estilo Camadas (o que você escolheu)', 'B. Gráficos', 'C. Imprimir e PDF', 'D. Outras novidades', 'E. Decisões'
ITENS = [
    ('E01', 'Janelas no estilo Camadas, em todo o app', GE,
     '<p>Como você escolheu (C · Camadas): cantos de <b>12 px</b>, cabeçalho com o <b>ícone num quadrinho</b> e faixa suave, <b>rodapé</b> numa faixa clara com os botões, cada parte num <b>cartão</b>, sombra em camadas. Botões e campos com 8 px. Vale para <b>todas</b> as janelas (Formatação condicional, Validação, Comentário, Cores, Abrir Excel, Opções, Inserir função, Localizar, Assinatura...). O padrão virou a habilidade <b>efcdocs-estilo-camadas</b> (você salvou pelo cartão).</p>',
     'Ficou como na proposta? Alguma janela que você quer ver de perto?',
     [('Antes (v0.5.1)', 'antes-condicional'), ('Depois: Formatação condicional › Nova regra', 'depois-condicional')], 'um'),
    ('E02', 'Painel de cores com os 6 módulos', GE,
     '<p>Em Cor de preenchimento, Cor da fonte, Cor da aba e na Formatação condicional: abas <b>Paleta / Desta planilha / Recentes</b>; <b>Pegar de uma célula</b> (a janela some, você toca na célula, a cor vem); <b>copiar o código</b> (ícone sobre a amostra e botão Copiar); <b>Trocar na aba toda</b> (todas as células com a cor da célula ativa mudam de uma vez; um Ctrl+Z volta); <b>aviso de leitura</b> (diz se a letra fica legível no fundo). Escolha e <b>Aplicar</b>, ou dois cliques na amostra.</p>',
     'Os módulos estão fáceis de usar?',
     [('Antes (v0.5.1)', 'antes-cor'), ('Depois: Paleta e aviso de leitura', 'depois-cor'), ('Desta planilha', 'depois-cor-doc'), ('Pegar de uma célula', 'depois-contagotas')], 'par'),
    ('E03', 'Cor da aba: ponto de cor', GE, '<p>Como você escolheu (formato 2): um ponto da cor antes do nome da aba.</p>', '',
     [('Antes', 'antes-aba'), ('Depois', 'depois-aba')], 'par'),
    ('E04', 'Esc fecha uma janela por vez', GE,
     '<p>Janela sobre janela (ou menu sobre janela): o <b>Esc fecha só a de cima</b> e o teclado volta para a de baixo. Exemplo testado: Cor de preenchimento › Pegar de uma célula › Esc (sai do conta-gotas, a janela continua) › Esc (fecha a janela). Vale para menus, listas, menu Novo e botão direito.</p>', '', [], ''),
    ('G01', 'Inserir gráfico: recomendado, miniaturas e prévia ao vivo', GG,
     '<p>Escolha as células (pode incluir os títulos e a coluna dos nomes) › <b>Inserir › Gráfico</b>. A janela olha os dados e <b>recomenda</b> o tipo (datas + números = linha; nomes + um número = colunas/Pareto; só números = histograma), mostra <b>3 miniaturas</b>, todos os tipos e a <b>prévia ao vivo</b>. Com uma célula só escolhida, pega a região em volta (como o Excel). Opções: título, títulos dos eixos, legenda, mostrar valores, empilhado, <b>meta</b>, cores das séries.</p>',
     'Faltou alguma opção que você usa no Excel?',
     [('Inserir gráfico (dados de Coletas)', 'depois-grafico-janela'), ('Os 11 tipos (desenho do EFCdocs)', 'graficos-tipos')], 'um'),
    ('G02', 'Carta de controle e Pareto (os da Qualidade)', GG,
     '<p><b>Carta de controle</b> de valores individuais: média, <b>LSC e LIC</b> calculados (média ± 3σ pela amplitude móvel; dá para escrever os seus), meta tracejada, <b>pontos fora em vermelho</b>, e o rodapé da janela diz "Média · σ · N fora dos limites". <b>Pareto</b>: barras em ordem, linha do <b>% acumulado</b> e a linha dos <b>80%</b>.</p>',
     'A carta e o Pareto estão do jeito que a Qualidade usa?',
     [('Carta de controle com meta', 'depois-grafico-controle'), ('Pareto', 'depois-grafico-pareto')], 'um'),
    ('G03', 'O gráfico na planilha', GG,
     '<p>Fica sobre a grade, ao lado dos dados: <b>arraste</b> para mover, puxe o canto para o <b>tamanho</b>, <b>dois cliques</b> editam, Delete exclui, Ctrl+Z desfaz cada passo. Mudou um valor: o gráfico redesenha. Inseriu linhas ou colunas: a faixa dos dados acompanha.</p>', '',
     [('Gráfico ao lado dos dados', 'depois-grafico-grade')], 'um'),
    ('G04', 'Gráfico vai para o Excel como gráfico do Excel (e volta)', GG,
     '<p>Salvar como Excel grava um <b>gráfico nativo do Excel</b> (editável, ligado às células) nos 11 tipos. Pareto, carta e histograma vão como colunas/linhas com os valores calculados escritos no gráfico. Conferi abrindo no <b>LibreOffice</b> (imagem ao lado); falta o seu <b>Excel de verdade</b>. Abrir de novo no EFCdocs traz o gráfico igual. Gráficos <b>feitos no Excel</b> (colunas, barras, linha, área, pizza, rosca, dispersão, combinado) agora <b>vêm</b> ao abrir; radar, bolhas, cascata, funil e mapa ficam no relatório com o motivo.</p>',
     'Abre no seu Excel? (lembrete do F05 da v0.5.1: o seu retorno do "Salvar como Excel" também)',
     [('Arquivo salvo pelo EFCdocs aberto no LibreOffice', 'excel-lo')], 'um'),
    ('P01', 'Imprimir e PDF com prévia (Ctrl+P)', GP,
     '<p>Como você pediu (D01 da v0.5.0, "toda a função de paginar, cabeçalhos de impressão, redimensionar"): papel (A4, Carta, Ofício), <b>retrato/paisagem</b>, <b>margens</b> (Normal, Estreita, Larga, Personalizadas), <b>escala</b> (Tamanho real, Aba toda numa página, Todas as colunas numa página, Todas as linhas, Caber em N páginas, Porcentagem), <b>títulos de impressão</b> (linhas no topo e colunas à esquerda repetem em toda página), <b>cabeçalho e rodapé</b> com Página, Total, Data, Hora, Aba e Arquivo, linhas de grade, letras e números, centralizar, ordem das páginas. A <b>prévia</b> mostra página por página.</p>',
     'Falta alguma opção do Excel que você usa?',
     [('Antes: "chega na v0.6.0"', 'antes-pdf'), ('Depois: Imprimir e PDF', 'depois-imprimir'), ('2ª página repete o título', 'depois-imprimir-p2')], 'um'),
    ('P02', 'PDF com texto de verdade', GP,
     '<p><b>Baixar PDF</b> gera o PDF aqui mesmo, sem internet: <b>texto de verdade</b> (dá para selecionar e procurar), cores, bordas, mescladas, gráficos nítidos, cabeçalho e rodapé. <b>Imprimir</b> abre o diálogo do navegador com as mesmas páginas. Tudo que sai do sistema continua sendo Excel, com o PDF como exceção para impressão (como combinado no D01 da v0.5.1).</p>', '',
     [('Página 1 do PDF (paisagem, título repetido, colunas numa página)', 'pdf-pagina')], 'um'),
    ('P03', 'Aba nova da faixa: Layout da Página', GP,
     '<p>Como no Excel: <b>Margens, Orientação, Definir área de impressão</b> (a seleção), <b>Inserir quebra de página</b> (antes da célula escolhida), <b>Imprimir títulos</b>, Limpar área, Remover quebras, Cabeçalho e rodapé, <b>Ajustar à página</b>, Configurar página e Exportar PDF. Tudo isso vai para o Excel (Layout da Página do Excel mostra igual) e volta ao abrir; antes, as "áreas de impressão" dos seus arquivos ficavam de fora (eram 37).</p>', '',
     [('Faixa Layout da Página', 'depois-faixa-layout')], 'um'),
    ('O01', 'Baixar o original', GO,
     '<p><b>Arquivo › Baixar o original</b> devolve o arquivo do Excel <b>exatamente como veio</b> (bytes iguais), sem as mudanças feitas aqui: com macros, imagens, tabelas dinâmicas e tudo que o EFCdocs ainda não traz. Fica guardado só no aparelho onde o arquivo foi aberto (a partir desta versão).</p>', '',
     [('Faixa Arquivo', 'depois-faixa-arquivo')], 'um'),
    ('O02', 'Copiar e colar leva a lista suspensa, a cor por regra e o comentário', GO,
     '<p>A limitação da v0.5.1 foi resolvida: copiar uma célula com lista suspensa e colar em outra leva a <b>seta</b>; a regra de cor e o comentário também vão. Recortar tira da origem.</p>', '', [], ''),
    ('O03', 'Relatório do Excel e celular', GO,
     '<p>O relatório antes de abrir conta os <b>gráficos</b> que vieram. No celular, Imprimir e PDF cabe na tela (prévia em cima, opções embaixo).</p>', '',
     [('Relatório', 'depois-relatorio'), ('Celular: Imprimir e PDF', 'depois-cel-imprimir')], 'par'),
    ('D01', 'Gráficos com motor próprio (sem ECharts)', GD,
     '<p>Você escolheu na conversa: o npm e os CDNs estão fechados aqui, então os gráficos são desenhados por um <b>motor próprio em SVG</b> (como o leitor de Excel). Fica leve (o app cresceu uns 60 KB) e no estilo Camadas. Se um dia quiser ECharts, dá para trocar sem mexer no resto (o desenho é uma peça só).</p>', '', [], ''),
    ('D02', 'Botões que ficam para a v0.6.1', GD,
     '<p>No plano antigo, a v0.6.0 também tinha: Tabela, Imagem, Link, Botão de aba, Coluna de status, Classificar, Filtrar, Remover duplicados, Ortografia e Travar modelo. Para não atrasar gráficos e impressão, eles agora dizem <b>"chega na v0.6.1"</b>, junto com a fase 2 dos gráficos (gauge, mapa de calor, cascata, funil, Gantt, minigráfico na célula).</p>',
     'Pode ser? Quais destes você quer primeiro?', [], ''),
    ('V01', 'Publicação da v0.6.0', GD,
     '<p>Depois da sua aprovação, publico a v0.6.0 no GitHub (commit só com esta versão). Os seus arquivos não vão para o GitHub nem para os pacotes (só a amostra inventada). <b>Nada a configurar no Firebase.</b> O relatório do Grok da v0.5.1 ainda não chegou; ele entra junto com o desta.</p>',
     'Pode publicar? (diga se quer algum ajuste antes)', [], ''),
    ('V02', 'Próxima versão', GD,
     '<p>Opção 1: <b>v0.6.1 · Sonnet 5.5 · alto</b>: os botões do D02 (Classificar, Filtrar, Tabela, Imagem, Link...) e a fase 2 dos gráficos. Opção 2: <b>v0.7.0 · Opus 5.5 · alto</b>: Documento (Docx) com assinatura, como no plano.</p>',
     'Qual vem primeiro?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A v0.6.0 traz o <b>estilo Camadas</b> em todo o app (com o painel de cores de 6 módulos, a aba com ponto de cor e o Esc em pilha), os <b>gráficos</b> (11 tipos, carta de controle e Pareto, nativos no Excel) e o <b>Imprimir e PDF</b> completo da planilha.</li>'
    '<li>Também: <b>Baixar o original</b>, <b>copiar e colar com as regras</b>, aba <b>Layout da Página</b> e Ctrl+P.</li>'
    '<li>Os prints usam só a amostra inventada; os seus arquivos não foram para o GitHub nem para os pacotes. Nada a configurar no Firebase.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Estilo Camadas, gráficos, Imprimir e PDF')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
