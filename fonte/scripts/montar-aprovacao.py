"""EFCdocs — monta a página de aprovação da v0.6.6 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" <testes-de-regras> <testes-no-navegador>"""
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.6.6'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
GA, GB, GC, GD = 'A. Correções do relatório do Grok (v0.6.5)', 'B. Pendências que vinham da v0.6.4', 'C. Acabamento dos gráficos do Excel e tamanho padrão', 'D. Publicação'
ITENS = [
    ('A01', 'PDF com as formas: sem retângulos brancos e com o título branco', GA,
     '<p>No PDF, cada forma e cada gráfico virava uma imagem com <b>fundo branco</b>: o painel escuro ficava cheio de retângulos brancos e o texto branco sumia (o mesmo defeito dos velocímetros). Agora a imagem vai <b>com transparência</b> (o painel aparece por baixo). Imagem sem parte transparente continua leve (JPEG).</p>',
     'O PDF do seu painel ficou certo?', [('Antes (v0.6.5): PDF', 'antes-pdf'), ('Depois (v0.6.6): PDF', 'depois-pdf')], 'par'),
    ('A02', 'Painel maior que o papel: já vem "Aba toda numa página"', GA,
     '<p>O painel saía partido em 4 páginas. Agora, quando a aba tem uma forma maior que o papel e a escala nunca foi escolhida, o Imprimir já vem com <b>Aba toda numa página</b> e a página <b>deitada</b>, com um aviso. Você pode trocar; a escolha salva na aba é respeitada.</p>',
     'Aprovado?', [('Antes: 4 páginas', 'antes-imprimir'), ('Depois: 1 página, com o aviso', 'depois-imprimir')], 'par'),
    ('A03', 'Aba renomeada: o gráfico do arquivo salvo acompanha', GA,
     '<p>Renomeando a aba <code>Dados</code> para <code>Base</code> e salvando, o gráfico continuava apontando para <code>Dados</code> e saía <b>vazio</b> no Excel. Agora o XML original do gráfico volta com o <b>nome novo</b> nas fórmulas (o título ligado, os rótulos e a caixa por cima do gráfico também). Prints: o arquivo salvo aberto no LibreOffice.</p>',
     'Aprovado?', [('Antes: gráfico vazio', 'antes-formas-lo'), ('Depois: com as barras', 'depois-formas-lo')], 'par'),
    ('A04', 'Inserir linhas no meio do painel: o painel de fundo cresce junto', GA,
     '<p>Como no Excel ("mover e dimensionar com células"): forma que vem do Excel <b>estica</b> quando linhas ou colunas entram no meio dela e <b>encolhe</b> quando saem; as outras formas descem. Gráfico e imagem só descem. E a caixa ligada a uma célula (o 34, ligado à C40) <b>continua mostrando o total</b>: antes, depois de inserir linhas acima, ela ficava apontando para a célula antiga, vazia. Print: 3 linhas inseridas na linha 12.</p>',
     'Aprovado?', [('Antes: a última forma passa da borda', 'antes-inserir-linhas'), ('Depois: o painel cresceu', 'depois-inserir-linhas')], 'par'),
    ('A05', 'Aba travada: a forma não abre para mudar; o link continua funcionando', GA,
     '<p>Com a aba travada (Revisão › Travar modelo), Ctrl + clique e Enter numa forma, gráfico, imagem ou assinatura <b>não abrem a janela de mudar</b>: aparece o aviso de aba travada. Um clique no botão com link continua levando à aba.</p>',
     'Aprovado?', [('Depois: o aviso', 'depois-travada')], 'um'),
    ('A06', 'Linha diagonal, cantos recortados e grupo de uma forma só', GA,
     '<p><b>Linha</b>: desenho mais liso nas linhas finas e inclinadas (aqui não consegui ver a linha ondulada; se ainda aparecer, mande um print). <b>Cantos recortados</b>: conferi contra o LibreOffice, e o "recorte duplo" corta dois cantos (em cima à direita e embaixo à esquerda), o simples corta um; na prévia da janela a forma aparece maior agora. <b>Grupo</b>: quando um grupo tinha um gráfico e só mais uma forma, a forma fica sozinha (o grupo é desfeito) e não sobra grupo de uma forma só ao salvar. E o <b>clique no vão entre os botões</b> pega o painel de fundo, porque ele está ali embaixo, como no Excel.</p>',
     'Aprovado?', [('Depois: linha e cantos recortados', 'depois-recortes')], 'um'),
    ('B01', 'Alt+Enter: a linha cresce para mostrar as duas linhas', GB,
     '<p>O texto ia em duas linhas, mas a linha da planilha continuava baixa e só a última aparecia. Agora a linha <b>cresce</b> (se a altura dela não foi escolhida à mão). A barra fx fechada mostra a 1ª linha e <b>+1 linha</b>; esticada, mostra tudo.</p>',
     'Aprovado?', [('Antes', 'antes-alt-enter'), ('Depois', 'depois-alt-enter')], 'par'),
    ('B02', '"Descartar" legível', GB,
     '<p>O botão vermelho ficava ilegível com o mouse em cima (fundo claro com letra branca) e nos temas escuros. Agora é vermelho fechado com letra branca em todos os temas.</p>',
     'Aprovado?', [('Antes (mouse em cima)', 'antes-descartar'), ('Depois (mouse em cima)', 'depois-descartar')], 'par'),
    ('B03', 'Tabela do Excel e zeroHeight voltam ao salvar', GB,
     '<p>A <b>tabela do Excel</b> (nome, área, títulos, estilo e filtro) agora volta no arquivo salvo e cresce quando você insere linhas no meio dela. Se os títulos ficarem repetidos ou vazios (o Excel pediria para reparar), ela vai como faixa normal, com aviso. A aba com <b>zeroHeight</b> (linhas escondidas por padrão) volta igual: as que aparecem continuam aparecendo. As quebras de página da aba também voltam (C03).</p>',
     'Teste no seu Excel: o arquivo salvo abre sem pedir para reparar?', [], ''),
    ('B04', 'Faixa: Reexibir na Página Inicial, setinha repetida e leitor de tela', GB,
     '<p><b>Reexibir</b> linhas e colunas também em <b>Página Inicial › Células</b>. Os dois botões com a mesma setinha (ao lado das abas e no fim da faixa): o das opções agora mostra o desenho do modo da faixa. Botões de ligar/desligar dizem ao leitor de tela se estão ligados (<code>aria-pressed</code>). O <b>furo da rosca</b> anda de 1 em 1 (o furo 58% do Excel aparece 58). E a grade se redesenha nítida quando <b>só a densidade da tela muda</b> (outro monitor).</p>',
     'Aprovado?', [('Antes', 'antes-faixa'), ('Depois', 'depois-faixa')], 'par'),
    ('C01', 'Gráficos do Excel: título ligado à célula, rótulos das células, legenda e área no lugar, caixa de texto por cima', GC,
     '<p>Na amostra inventada (<code>amostra-v066.xlsx</code>): o título vem da <b>célula B2</b>; os rótulos <b>Baixo/Bom/Alto</b> vêm das células (o "valor das células" do Excel); a <b>legenda e a área do desenho</b> ficam onde foram postas no Excel; e a <b>caixa "0,62" por cima do gráfico</b> (ligada à C3) aparece e muda com a célula. Isso deve trazer o número embaixo dos seus velocímetros quando ele for texto dentro do gráfico. Ao salvar, tudo volta (a caixa por cima numa parte própria do arquivo).</p>',
     'Os seus velocímetros ficaram com os números e títulos?', [('Antes (v0.6.5)', 'antes-v066'), ('Depois (v0.6.6)', 'depois-v066'), ('Arquivo original (LibreOffice)', 'original-v066-lo'), ('Salvo pela v0.6.6, aba renomeada (LibreOffice)', 'depois-v066-lo')], 'par'),
    ('C02', 'Largura e altura padrão do arquivo', GC,
     '<p>As colunas e linhas sem tamanho próprio ficavam com o tamanho do EFCdocs (80 × 22 px). Agora ficam com o <b>padrão do arquivo</b> (64 × 20 px no Excel comum; 89 px de largura na aba Painel da amostra), e voltam assim ao salvar. Por isso o painel de formas fica do tamanho do Excel. Planilha criada no EFCdocs continua com 80 × 22 px.</p>',
     'Aprovado?', [('Antes', 'antes-painel'), ('Depois: mesmo tamanho do Excel', 'depois-painel')], 'par'),
    ('C03', 'Quebras de página', GC,
     '<p>As quebras de página do arquivo (linha e coluna) aparecem no Imprimir e voltam ao salvar. Conferido com a aba Dados da amostra (quebra na linha 10 e na coluna C).</p>',
     'Aprovado?', [], ''),
    ('P01', 'Publicação da v0.6.6', GD,
     '<p>Depois da sua aprovação, publico a v0.6.6 no GitHub (commit só com esta versão). Os seus arquivos não vão para o GitHub nem para os pacotes. <b>Nada a configurar no Firebase.</b></p>',
     'Pode publicar?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>Correções do relatório do Grok da v0.6.5: PDF com transparência, painel numa página, aba renomeada no gráfico salvo, formas que esticam com as linhas, aba travada, grupo de uma forma só.</li>'
    '<li>Pendências da v0.6.4: Alt+Enter, Descartar legível, tabela do Excel e zeroHeight ao salvar, Reexibir, faixa, furo da rosca, densidade da tela.</li>'
    '<li>Acabamento dos gráficos do Excel (título ligado, rótulos das células, legenda e área no lugar, caixa por cima) e largura e altura padrão do arquivo.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Correções do Grok e acabamento dos gráficos')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
