"""EFCdocs — monta a página de aprovação da v0.6.1 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" <testes-de-regras> <testes-no-navegador>"""
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.6.1'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
GX, GE, GV, GC, GD = 'A. Gráficos do Excel com a cara original (seu pedido, F6)', 'B. Editor de gráficos (F5)', 'C. Velocímetro', 'D. Correções e os seus dois pedidos de hoje', 'E. Decisões'
ITENS = [
    ('X01', 'Velocímetro do Excel aparece como no Excel', GX,
     '<p>Antes, o EFCdocs lia só o tipo, as séries e uma cor de cada gráfico; o velocímetro (rosca com metade invisível + pizza que faz o ponteiro) virava uma pizza colorida. Agora ele lê <b>tudo</b>: cor de cada fatia (também as cores do tema do Excel, com mais claro e mais escuro), <b>fatia invisível</b>, <b>giro</b>, <b>furo</b> e a rosca junto com a pizza. Amostra inventada que imita o seu arquivo (os seus arquivos não entram aqui).</p>',
     'Ficou como no seu Excel?', [('Antes (v0.6.0)', 'antes-velo'), ('Depois', 'depois-velo')], 'um'),
    ('X02', 'Painel escuro: fundo, contorno, brilho, degradê, R$, linha curva e eixo da direita', GX,
     '<p><b>Fundo escuro</b> do gráfico, barras <b>só com contorno</b> e brilho, colunas em <b>degradê</b>, rótulos e eixos em <b>R$</b> (o formato do Excel), linha <b>curva</b> com marcadores e tracejado, <b>eixo da direita</b> com mínimo −0,2 e máximo 1, legenda com item escondido, títulos e letras com tamanho, cor e negrito. Barras deitadas com a 1ª categoria embaixo, como o Excel.</p>',
     'Algum detalhe do seu painel ainda diferente?', [('Antes (v0.6.0)', 'antes-painel'), ('Depois', 'depois-painel')], 'um'),
    ('X03', 'Pizza com muitas fatias nas cores do tema', GX,
     '<p>Sem cor escrita no arquivo, o Excel pinta pelas cores do <b>tema</b> (e repete mais escuras e mais claras depois da 6ª). Agora é igual; as porcentagens pequenas vão para fora da fatia.</p>', '',
     [('Antes (v0.6.0)', 'antes-resumo'), ('Depois', 'depois-resumo')], 'par'),
    ('X04', 'Salvar como Excel: o gráfico do Excel volta IGUAL', GX,
     '<p>O mais importante: ao salvar, cada gráfico que veio do Excel e <b>não foi mexido</b> aqui volta <b>exatamente como veio</b> (por dentro, o mesmo XML do gráfico; conferido nos 7 gráficos da amostra, no teste e no navegador). Se você mexer num gráfico, só ele é refeito, agora com toda a formatação. Inserir linhas acima dos dados e renomear a aba também funcionam (as referências acompanham). Na imagem: o arquivo salvo aberto no <b>LibreOffice</b>, com um estilo mudado ("Gasto por ponto"), os gráficos do Excel intactos, um velocímetro e um semáforo feitos aqui. Falta o seu <b>Excel de verdade</b>.</p>',
     'Abre igual no seu Excel? (lembrete do F05)', [('Arquivo salvo, aberto no LibreOffice', 'lo-salvo')], 'um'),
    ('E01', 'Editor novo: prévia grande e seis partes', GE,
     '<p>Como você pediu: fácil e diferente do Excel, mas com as funções de lá. <b>Dois cliques</b> no gráfico abrem a janela larga: <b>prévia grande à esquerda</b> com os <b>estilos rápidos</b> embaixo, e à direita seis partes: <b>Tipo e dados, Estilo, Séries, Eixos, Textos, Fundo</b>. Cancelar não muda nada; Salvar muda; Ctrl+Z volta.</p>',
     'A organização está boa?', [('Antes (v0.6.0)', 'antes-editor'), ('Depois', 'depois-editor')], 'um'),
    ('E02', 'Clique na parte que quer mudar', GE,
     '<p>Clicou numa <b>barra</b> da prévia: abre <b>Séries</b> já com aquela série e aquele ponto. Clicou no <b>eixo</b>: abre Eixos. Título ou legenda: Textos. Fundo: Fundo. Em Séries: tipo da série (colunas, linha, área) e <b>eixo da direita</b>; preenchimento (cor, <b>degradê</b>, nenhum); contorno (cor, espessura, tracejado); linha <b>curva</b>; marcador; <b>brilho</b> e <b>sombra</b>; números na série (valor, %, categoria, nome; onde ficam; formato <b>R$, %, data</b>; letra); <b>linha de tendência</b>; e <b>cor de cada ponto</b>, com a opção <b>invisível</b> (o truque do velocímetro).</p>',
     '', [('Clicou na coluna: Séries', 'depois-editor-series')], 'um'),
    ('E03', 'Estilos rápidos, layout rápido, cores e semáforo', GE,
     '<p>Os 6 estilos da proposta, aprovados: <b>Clássico, Limpo, Apresentação, Escuro, Semáforo da qualidade e Mínimo</b>: um clique muda tudo junto. Também: <b>Layout rápido</b> (5), <b>Cores</b> (8 conjuntos) e o <b>Semáforo</b> em qualquer gráfico (meta, faixa "perto" em %, maior ou menor é melhor). No Excel, o semáforo vai como a cor de cada barra. Em gráfico que veio do Excel, o formato dos números (R$, %) continua ao trocar o estilo.</p>',
     'Os estilos estão bonitos? Algum que você quer diferente?', [('Os 6 estilos (dados inventados)', 'estilos-grade'), ('Aba Estilo do editor', 'depois-editor-estilo')], 'um'),
    ('E04', 'Eixos, Textos e Fundo', GE,
     '<p><b>Eixos</b>: mostrar/esconder, nome, <b>mínimo, máximo e de quanto em quanto</b>, formato, ordem ao contrário, grade, linha do eixo, letra. <b>Textos</b>: título (letra, cor, alinhamento), <b>legenda</b> em 5 posições, letra do gráfico. <b>Fundo</b>: cor, degradê ou nenhum, borda, cantos arredondados, área do desenho, <b>espaço entre barras</b> e sobreposição, <b>giro e furo</b> da pizza e da rosca.</p>',
     '', [('Eixos (eixo da direita)', 'depois-editor-eixos'), ('Textos', 'depois-editor-textos'), ('Fundo', 'depois-editor-fundo')], 'par'),
    ('E05', 'Editor no celular', GE, '<p>A prévia fica em cima e as partes embaixo, sem rolagem lateral.</p>', '',
     [('Celular (390×844)', 'depois-cel-editor')], 'par'),
    ('V01', 'Velocímetro do EFCdocs', GV,
     '<p>Tipo novo em Inserir › Gráfico (e para o Painel, depois): escolha <b>uma célula</b>, diga a <b>meta</b>, o mínimo, o máximo e se "melhor é mais alto ou mais baixo"; as cores (vermelho, amarelo, verde) saem da meta. No Excel, vai do jeito que o Excel faz velocímetro (rosca com metade invisível + pizza ponteiro).</p>',
     'Quer faixas com mais cores, como as 16 do seu arquivo?', [('Inserir gráfico › Velocímetro', 'depois-velocimetro-janela'), ('Na planilha', 'depois-velocimetro-grade')], 'um'),
    ('C01', 'Correções do Grok nos gráficos', GC,
     '<ul><li>Uma célula só escolhida: a região <b>para nos dados</b> (antes ia até a linha 403 por causa das fórmulas vazias).</li><li><b>Empilhado</b> e <b>100%</b> em Colunas, Barras e Área.</li><li>O gráfico <b>nasce inteiro na tela</b> (à direita dos dados, menor, embaixo ou no meio da tela); no celular o aviso diz <b>"toque duas vezes"</b>.</li><li>No Excel: <b>datas como datas</b> (o LibreOffice mostrava número), sem linha vazia escondida, Meta como linha separada; gráficos feitos pelo <b>openpyxl</b> agora abrem; a contagem do "Ficou de fora" está certa.</li><li><b>Coluna ou linha oculta</b>: fica fora do gráfico, como no Excel, e o editor avisa ("1 oculta fora"), com a opção de mostrar.</li><li>Zoom 200%: conferi que o gráfico fica preso às mesmas células (cresce a partir do canto, como as células).</li></ul>',
     '', [], ''),
    ('C02', 'Lista suspensa por faixa (erro crítico do Grok)', GC,
     '<p>Lista por faixa digitada sem $ (A2:A10): a 2ª linha <b>perdia o 1º item</b>. Agora a faixa vale igual para todas as linhas e é salva travada ($A$2:$A$10), como o Excel faz quando você escolhe com o mouse. E <b>renomear a aba</b> de onde vem a lista não deixa mais a lista vazia (também vale para as regras de cor).</p>', '', [], ''),
    ('C03', 'Botão da faixa como no Excel (seu pedido de hoje)', GC,
     '<p>Antes eram dois botões, e o menu do "v" ficava escondido dentro da linha das abas: a faixa não voltava. Agora é <b>um botão só</b>, como as "Opções de exibição da faixa" do Excel: <b>Mostrar a faixa sempre</b>, <b>Só as abas</b> (a faixa aparece ao clicar numa aba), <b>Esconder a faixa e as abas</b> e <b>Juntar o título com as abas</b>. O menu flutua por cima de tudo; <b>Ctrl+F1</b> mostra ou esconde; Esc fecha.</p>',
     'Ficou como você queria?', [('Antes (v0.6.0): o menu não aparece', 'antes-faixa-menu'), ('Depois', 'depois-faixa-menu')], 'par'),
    ('C04', 'Parte congelada com mescladas (seu pedido de hoje)', GC,
     '<p>Reproduzi com uma planilha inventada no mesmo arranjo (linhas 1 a 7 congeladas, cinzas mescladas que atravessam a linha do congelamento). Ao rolar, a mesclada era desenhada com altura "ao contrário" e o cinza pintava por cima do título. Agora cada parte da mesclada fica no seu lugar: a congelada parada, a de baixo rolando. Também: texto comprido não passa mais por cima de mesclada nem apaga o fundo cinza da vizinha.</p>',
     'Confere no seu arquivo de potabilidade?', [('Antes (v0.6.0), depois de rolar', 'antes-congelada'), ('Depois, depois de rolar', 'depois-congelada')], 'um'),
    ('D01', 'Lembretes que não ficam para trás', GD,
     '<ul><li><b>ECharts</b>: o motor de gráficos continua o nosso (agora com a formatação do Excel toda). Dá para trocar pelo ECharts quando você quiser.</li><li><b>F05 · Excel de verdade</b>: falta o seu retorno de como os arquivos salvos aqui abrem no Excel (gráficos, Layout da Página).</li></ul>',
     '', [], ''),
    ('D02', 'Botões que faltam agora dizem "chega na v0.6.3"', GD,
     '<p>Seguindo o plano combinado (v0.6.2 faixa, ícones e correções; v0.6.3 botões; v0.6.4 Painel), Tabela, Imagem, Link, Botão de aba, Coluna de status, Classificar, Filtrar, Remover duplicados, Ortografia e Travar modelo dizem "chega na v0.6.3".</p>', '', [], ''),
    ('P01', 'Publicação da v0.6.1', GD,
     '<p>Depois da sua aprovação, publico a v0.6.1 no GitHub (commit só com esta versão). Os seus arquivos não vão para o GitHub nem para os pacotes (só amostras inventadas). <b>Nada a configurar no Firebase.</b></p>',
     'Pode publicar? (diga se quer algum ajuste antes)', [], ''),
    ('P02', 'Próxima versão', GD,
     '<p><b>v0.6.2 · Sonnet 5.5 · alto</b>: a faixa nova (estilos B, C, D e E à sua escolha; Compacta no celular) e os ícones novos de uma cor com toque suave; as outras correções do Grok (PDF com datas "####", texto longo e quebra de linha, mesclada cortada, Esc no Pegar de uma célula, Localizar, textos); janelas compactas (E01) e margens arrastáveis na prévia de impressão (P02).</p>',
     'Pode ser essa a próxima?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A v0.6.1 faz os <b>gráficos do Excel</b> aparecerem como no Excel (velocímetro, painel escuro, R$, degradê...) e <b>voltarem iguais</b> ao salvar.</li>'
    '<li>Traz o <b>editor de gráficos</b> novo (clique na parte que quer mudar), os <b>6 estilos rápidos</b>, o <b>velocímetro</b>, as correções do Grok nos gráficos e na lista suspensa, e os seus dois pedidos de hoje (<b>botão da faixa</b> e <b>parte congelada</b>).</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Gráficos do Excel, editor de gráficos, velocímetro')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
