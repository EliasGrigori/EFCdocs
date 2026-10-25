"""EFCdocs — monta a página de aprovação da v0.4.3 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.4.3'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
G1, G2, G3, G4 = 'A. Entender a conta (PL11, PL12, PL13, PL15, PL18)', 'B. Menu dos cabeçalhos (N04)', 'C. Achados do Grok na v0.4.2', 'D. Decisões'
ITENS = [
    ('I01', 'Explicar esta conta: a fórmula em linhas, o valor de cada pedaço e uma frase em português (PL11)', G1,
     '<p>Em <b>Fórmulas › Explicar conta</b> (ou no botão direito da célula, ou no painel de detalhes), a fórmula aparece quebrada em linhas numeradas, com recuo, como num editor de código. '
     'Ao lado de cada pedaço vem o valor que ele deu (o <i>E(B2&gt;=0,5;B2&lt;=2)</i> deu VERDADEIRO), e a referência mostra o nome da coluna (B2 ‹Cloro livre›).</p>'
     '<p>Embaixo vem a frase: <i>"Se o Cloro livre (B2 = 1,2) estiver entre 0,5 e 2, mostra "OK"; se não, mostra "Ajustar". Agora mostra "OK"."</i> '
     'As frases conhecem SE, E/OU, SOMA, MÉDIA, CONT.SE, SOMASE, PROCV, PROCX, SEERRO e as contas de + − × ÷; as outras funções recebem uma frase geral.</p>'
     '<p><b>Editar em linhas</b>: dá para mexer na fórmula ali mesmo, com as quebras; ao aplicar, ela volta para uma linha só (como o Excel guarda).</p>',
     'A explicação ficou clara?',
     [('Antes (v0.4.2): "chega na v0.4.3"', 'antes-explicar'), ('Depois', 'depois-explicar')], ''),
    ('I02', '"Por que deu erro?" vai até onde o erro começa (PL12)', G1,
     '<p>Numa célula com erro, a mesma janela abre com o quadro <b>Por que deu erro?</b>. O app segue a cadeia: o H2 dá #DIV/0! porque soma o F3, e o F3 divide pelo D3, que está vazio. '
     'Diz isso em uma frase e oferece o conserto de um toque: <b>Ir para F3</b>, <b>Ir para D3</b> ou <b>Usar SEERRO em F3</b> (a célula passa a mostrar vazio no lugar do erro; Ctrl+Z desfaz).</p>'
     '<ul><li><b>#N/D</b> do PROCV/PROCX: diz o que não foi achado e onde; se existe quase igual (espaço sobrando, maiúscula, número guardado como texto), aponta a célula.</li>'
     '<li><b>#VALOR!</b>: aponta a célula com texto que entrou na conta; se o texto parece número, oferece "Converter em número".</li>'
     '<li><b>#DESPEJAR!</b>: diz quantas células o resultado precisa e qual delas está ocupada.</li>'
     '<li><b>#NOME?</b>, <b>#REF!</b> e conta circular também ganham a sua frase.</li></ul>',
     '', [('Antes (v0.4.2): só a frase geral no painel', 'antes-erro'), ('Depois', 'depois-erro')], ''),
    ('I03', 'Painel Problemas: todos os erros e avisos da planilha numa lista (PL13)', G1,
     '<p>No canto da grade fica a lâmpada <b>Problemas</b> com o número de pendências (o mesmo jeito do Assistente do quadro). A lista pega:</p>'
     '<ul><li><b>erros</b>, um por origem ("mais 2 células mostram este erro por causa desta");</li>'
     '<li><b>conta circular</b>;</li><li><b>número guardado como texto</b> (a causa nº 1 de SOMA dar errado), com <b>Converter</b>;</li>'
     '<li><b>fórmula diferente das vizinhas</b> (ex.: F4 divide por D5 enquanto as de cima e de baixo usam a própria linha), com <b>Igualar</b>;</li>'
     '<li><b>número fixo dentro da conta</b> (=F2*1,15 em várias linhas), com <b>Dar nome ao número</b>: o 1,15 vira um nome (ex.: Fator_Ajuste) e todas as fórmulas passam a usar o nome; para trocar o valor depois, Fórmulas › Nomes › <b>Mudar</b> (botão novo), uma vez só;</li>'
     '<li><b>funções que o EFCdocs ainda não calcula</b> (CORREL, LAMBDA...).</li></ul>'
     '<p>Cada linha tem <b>Ir</b>, que leva até a célula. A lista é refeita sozinha um instante depois de cada mudança.</p>',
     'A lista ajuda? Algum aviso incomoda mais do que ajuda?',
     [('Depois: lâmpada aberta', 'depois-problemas')], 'um'),
    ('I04', 'A conta desenhada como fluxograma (PL15)', G1,
     '<p>Em <b>Fórmulas › Desenhar a conta</b> (ou no "De onde vem / quem usa"), cada célula vira uma caixa com o nome da coluna, a fórmula e o valor; as setas mostram o caminho até o resultado. '
     'Vai até 3 níveis para trás e mostra à direita quem usa o resultado. Dentro de uma faixa pequena, as contas que dão erro aparecem também (no exemplo, o F3 dentro de F2:F5). Tocar numa caixa leva até a célula.</p>'
     '<p><b>Mandar para um quadro novo</b> cria um quadro de post-its com as mesmas caixas e setas (contas viram Atividade, valores viram Entrada/Saída), para anotar e usar em treinamento. A planilha não muda.</p>',
     '', [('Depois: a conta do Total (H2)', 'depois-fluxo'), ('Depois: o mesmo desenho num quadro novo', 'depois-quadro')], ''),
    ('I05', 'Montar a conta respondendo uma pergunta (PL18)', G1,
     '<p>Em <b>Fórmulas › Montar a conta</b>, a pessoa escolhe o que quer fazer, não o nome da função: <i>Contar quantos..., Somar quando..., Média de..., Buscar um valor em outra tabela, Se for maior ou menor que mostrar..., Está dentro da faixa?, Dias entre duas datas, Porcentagem de..., Juntar textos, Tirar espaços sobrando.</i></p>'
     '<p>As colunas aparecem pelo título (Situação, Cloro livre...), de qualquer aba. A janela mostra a fórmula montada e o resultado <b>antes</b> de pôr na célula. Se faltar o valor a comparar, o botão fica desligado (para não contar vazias sem querer). A porcentagem já entra com o formato 0,0%.</p>',
     'As receitas cobrem o que mais se usa no laboratório? Falta alguma?',
     [('Depois: Contar quantos "Ajustar" na Situação', 'depois-montar')], 'um'),
    ('I06', 'Botão direito no cabeçalho (A, B, 1, 2...) (N04)', G2,
     '<p>Antes, o botão direito no cabeçalho abria o menu da célula que estava selecionada (no print, "Excluir linha 2 / Excluir coluna H" com o clique na coluna C). '
     'Agora ele <b>seleciona a coluna (ou a linha) clicada</b> e oferece: <b>Inserir antes</b> e <b>Inserir depois</b>, <b>Excluir</b>, <b>Ocultar</b>, <b>Reexibir</b>, <b>Largura...</b> (ou Altura...), <b>Ajustar à largura do texto</b> (ou altura padrão), Copiar e Limpar conteúdo. '
     'Com várias colunas selecionadas, vale para todas. No celular, segurar o dedo no cabeçalho abre o mesmo menu.</p>',
     '', [('Antes (v0.4.2)', 'antes-cabecalho'), ('Depois', 'depois-cabecalho')], 'par'),
    ('I07', 'LAMBDA não trava mais o Enter (Grok, erro 1)', G3,
     '<p><code>=LAMBDA(x;x*2)(4)</code> dava "Não sei o que é x" e não gravava. Agora o leitor entende a chamada logo depois da função e os nomes de parâmetro do LAMBDA (e do LET). '
     'A fórmula grava, fica igual para o Excel e a célula mostra #NOME? até o LAMBDA ser calculado aqui.</p>',
     '', [('Antes (v0.4.2)', 'antes-lambda'), ('Depois', 'depois-lambda')], 'par'),
    ('I08', 'Prévia sem "Confira a grafia" quando a grafia está certa (Grok, sugestão 2)', G3,
     '<p>Com função real do Excel que ainda falta aqui (CORREL, TETO, MODO...), a prévia dizia "#NOME? — ... Confira a grafia", o que contradizia o aviso. Agora diz: <i>"#NOME? por enquanto. Pode gravar sem medo: a fórmula fica guardada e funciona quando abrir no Excel."</i></p>'
     '<p>E as letras trocadas de lugar passam a ter sugestão (Grok, item 8): <b>PROVC</b> sugere <b>PROCV</b>, SOMSE sugere SOMASE. ARREDOND continua sem sugestão, porque pode ser ARRED ou ARREDONDAR.PARA.CIMA/BAIXO.</p>',
     '', [('Antes (v0.4.2)', 'antes-correl'), ('Depois', 'depois-correl'), ('Depois: PROVC sugere PROCV', 'depois-provc')], ''),
    ('I09', 'Negrito em Ctrl+B, dicas próprias do quadro e as 7 dicas que estavam vazias (Grok, ressalvas do H05 e itens 3, 4 e 6)', G3,
     '<ul><li>No Chrome, o Ctrl+N abre uma janela nova e o site não consegue impedir. A dica do Negrito agora mostra <b>Ctrl+B</b> (o Ctrl+N continua aceito quando o navegador deixa).</li>'
     '<li>No quadro, Colar, Copiar, Recortar, Pincel, Localizar e Cor têm frases próprias, sem falar de fórmula nem de Excel; Negrito, Itálico e Sublinhado funcionam no post-it com <b>Ctrl+B, Ctrl+I e Ctrl+U</b> e mostram o atalho.</li>'
     '<li>Mostrar tudo, Só as abas, Esconder, Completo, Só ícones, Faixa tipo Excel e Barra e painel ganharam frase.</li>'
     '<li>A dica já some ao rolar a roda do mouse em cima da faixa.</li></ul>',
     '', [('Antes: Colar no quadro', 'antes-quadro-faixa'), ('Depois: Colar no quadro', 'depois-quadro-faixa'), ('Depois: Negrito com Ctrl+B', 'depois-dica-negrito')], ''),
    ('I10', 'Quadro com a faixa compacta e seta "tem mais" em telas estreitas (Grok, observação do H04 e falha do H06 em 800 px)', G3,
     '<p>No quadro, Duplicar, Excluir, Selecionar tudo, Localizar, Linha do tempo e Cor viraram ícones, como na planilha (com a dica ao parar o mouse).</p>'
     '<p>Abaixo de 900 px o app usa o jeito do celular, em que a faixa rola de lado. Agora aparece uma <b>seta no fim da faixa</b> (e outra no começo, depois de rolar) mostrando que tem mais botões; tocar nela rola a faixa. É o item N02 da lista de menus.</p>',
     '', [('Antes: 800 px', 'antes-faixa-800'), ('Depois: 800 px, com a seta', 'depois-faixa-800')], ''),
    ('I11', 'Textos: "Chega depois da v1.0.0" e "Abrir e salvar Excel chega na v0.5.0" (Grok, itens 5 e 7)', G3,
     '<p>A Tabela dinâmica dizia "Chega na depois da v1.0.0"; agora diz "Chega depois da v1.0.0" (dica, busca e aviso). O cartão da planilha no Início dizia "abre e salva Excel"; agora diz "Abrir e salvar Excel chega na v0.5.0".</p>',
     '', [('Antes', 'antes-dica-dinamica'), ('Depois', 'depois-dica-dinamica'), ('Antes: Início', 'antes-inicio'), ('Depois: Início', 'depois-inicio')], ''),
    ('I12', 'Funções novas para a qualidade (N17 a N23): qual bloco entra primeiro?', G4,
     '<p>O Grok listou as funções do Excel que deram #NOME? e você usa. Sugestão de ordem (a mesma do Grok):</p>'
     '<ol><li><b>Primeiro bloco</b> (fáceis e muito usadas): TETO, ARREDMULTB, MODO, PERCENTIL, QUARTIL, ORDEM, CORREL, FREQUÊNCIA (N18, N22 e parte do N19).</li>'
     '<li><b>Segundo bloco</b> (carta de controle e comparar lotes): DIST.NORM.N, INV.NORM.N, PADRONIZAR, INT.CONFIANÇA, CURT, DISTORÇÃO, TESTE.T, INCLINAÇÃO, PREVISÃO.LINEAR, TENDÊNCIA (N17, N19, N20).</li>'
     '<li><b>Depois</b>: texto e listas (TEXTOANTES, DIVIDIRTEXTO, EMPILHARV, TOMAR...), HIPERLINK e LAMBDA calculado (N21, N23).</li></ol>'
     '<p>Proposta: o primeiro bloco numa <b>v0.4.5 curta (Sonnet 5.5 · alto)</b>, depois da Assinatura.</p>',
     'Aprova os blocos e a ordem?', [], ''),
    ('I13', 'Próxima: v0.4.4 Assinatura', G4,
     '<p><b>v0.4.4 (Sonnet 5.5 · alto)</b>: a Assinatura, como já decidido: linha em branco com o nome completo embaixo, onde vai a assinatura/rubrica (desenhada com mouse ou dedo, ou foto). Primeiro no quadro de post-its; depois Docx e Planilha. A imagem fica só no arquivo, no aparelho.</p>'
     '<p>Continua faltando para a v0.5.0: 3 a 5 arquivos .xlsx reais com dados trocados.</p>',
     'Pode seguir para a v0.4.4 depois desta?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>98/98 testes de regras</span><span>87/87 testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A <b>v0.4.2 já está no GitHub</b> (commit eb49e35). Esta v0.4.3 traz as cinco ajudas para entender a conta, o menu do cabeçalho (N04) e todos os achados do Grok na v0.4.2.</li>'
    '<li>Testes novos: 8 de regras (LAMBDA, letras trocadas, explicação, causa do erro, problemas, desenho, receitas, dicas) e 10 no navegador (cada ajuda usada de verdade, consertos de um toque, quadro novo, cabeçalho, Ctrl+B, 800 px).</li>'
    '<li>Nada vai ao GitHub antes da sua resposta. Nada a configurar no Firebase.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Entender a conta, menu do cabeçalho e achados do Grok')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
