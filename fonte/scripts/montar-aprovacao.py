"""EFCdocs — monta a página de aprovação da v0.4.2 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.4.2'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
G1, G2, G3 = 'A. Funções do Excel e mensagens da fórmula', 'B. Faixa de cima mais compacta, com dicas', 'C. O que vem depois'
ITENS = [
    ('H01', 'Função do Excel que o EFCdocs ainda não calcula não é mais "corrigida" para outra (E1 e N24)', G1,
     '<p><b>Antes:</b> ao digitar <code>=CORREL(A1:A3;A1:A3)</code>, o app achava que era erro de digitação de CORRESP, oferecia "Usar CORRESP" e <b>não deixava gravar</b>. CORREL é função real do Excel; só não está implementada aqui ainda.</p>'
     '<p><b>Agora:</b> o app conhece uma lista de funções reais do Excel que ainda faltam (CORREL, TENDÊNCIA, FREQUÊNCIA, MODO, TETO, DIST.NORM.N, TEXTOANTES e outras). Para elas, a caixa de ajuda só informa: '
     '<i>"é uma função do Excel que o EFCdocs ainda não sabe calcular. A fórmula fica guardada como você digitou (e o Excel calcula ao abrir), mas aqui a célula mostra #NOME? até a função chegar."</i> A fórmula grava e continua visível na barra.</p>'
     '<p>A sugestão "Usar X" só aparece quando é erro de digitação mesmo (por exemplo SOMAA vira SOMA) e fica mais rígida: nome com menos de 5 letras nunca é trocado, e a diferença permitida é de 1 letra (2 em nomes longos). Função que não existe em lugar nenhum recebe o aviso "Não conheço a função X".</p>',
     'O comportamento serve (grava e avisa, em vez de bloquear)?',
     [('Antes (v0.4.1): sugere CORRESP', 'antes-correl'), ('Antes: o Enter foi bloqueado', 'antes-correl-gravada'), ('Depois: só informa', 'depois-correl'), ('Depois: gravada, fórmula na barra', 'depois-correl-gravada')], ''),
    ('H02', 'Sem prévia de erro enquanto a função está incompleta (Y06)', G1,
     '<p>Ao digitar <code>=PROCV(A2)</code> a ajuda já explica o que falta, e ainda mostrava por baixo "Prévia: #VALOR!", repetindo o problema com um texto confuso. Agora, se a fórmula tem erro de escrita (falta parte, parêntese, nome), <b>a prévia some</b> e fica só a explicação. Assim que a conta está completa, a prévia volta (por exemplo =SOMA(A1:A3) mostra 6).</p>',
     '', [('Antes (v0.4.1)', 'antes-procv'), ('Depois', 'depois-procv')], 'par'),
    ('H03', 'Explicação do #DIV/0! com a saída mais prática (E2)', G1,
     '<p>No painel de detalhes, o texto do #DIV/0! agora termina com um exemplo que dá para copiar: <i>"mostre outra coisa no lugar, por exemplo =SEERRO(A1/B1;0)"</i>.</p>',
     '', [('Antes (v0.4.1)', 'antes-erro-painel'), ('Depois', 'depois-erro-painel')], 'par'),
    ('H04', 'Faixa de cima mais compacta: Copiar, Colar e Recortar só com ícone (pedido do Elias)', G2,
     '<p>Os ícones ficaram mais juntos e a faixa ocupa menos espaço. <b>Colar, Recortar, Copiar e Pincel</b> agora são ícones pequenos, sem texto; o mesmo vale para as outras linhas de comandos simples (fonte, alinhamento, número, células, edição). Os botões grandes ficam só para o que precisa de nome (AutoSoma, Destacar regra, Tabela, Filtrar, Localizar). '
     'Em 1366 px de largura, todas as abas da planilha e do quadro de post-its cabem sem barra de rolagem (E3).</p>',
     'O tamanho e a distância dos ícones servem?',
     [('Antes (v0.4.1): Página Inicial', 'antes-faixa-inicio'), ('Depois: Página Inicial', 'depois-faixa-inicio'), ('Antes: Fórmulas', 'antes-faixa-formulas'), ('Depois: Fórmulas', 'depois-faixa-formulas')], ''),
    ('H05', 'Ao parar o mouse em cima: nome, o que faz e o atalho', G2,
     '<p>Parando o mouse sobre qualquer botão da faixa por meio segundo, aparece um quadro com o <b>nome</b>, uma frase dizendo <b>o que faz</b> e o <b>atalho</b>, quando existe (só aparecem atalhos que de fato funcionam naquele módulo: por exemplo Ctrl+N negrito na planilha, Ctrl+D duplicar no quadro). '
     'Some ao clicar, digitar ou rolar. No celular não aparece (não tem mouse); o nome continua lido pelos leitores de tela.</p>',
     'As frases curtas ajudam? Tem algum botão cuja frase ficou confusa?',
     [('Negrito, com atalho', 'depois-dica-negrito'), ('Copiar, com atalho', 'depois-dica-copiar')], ''),
    ('H06', 'Tela estreita: o que não cabe vai para o botão "Mais" (E3)', G2,
     '<p>Em telas menores que o necessário, a faixa não rola mais de lado escondendo botões: o que não cabe passa para um botão <b>Mais</b> no fim da faixa, que abre um quadro com os grupos que sobraram. Alargando a janela, tudo volta ao lugar sozinho. O celular continua com o jeito próprio dele.</p>',
     '', [('Antes (v0.4.1): corta e rola de lado', 'antes-faixa-estreita'), ('Depois: botão Mais', 'depois-faixa-estreita'), ('Depois: Mais aberto', 'depois-faixa-mais')], ''),
    ('H07', 'Novo botão "Reexibir colunas" (E4 e N05)', G2,
     '<p>Havia "Reexibir linhas", mas faltava o par das colunas. Agora, em <b>Exibir › Linhas e colunas</b>, "Reexibir colunas" mostra de novo as colunas escondidas dentro da seleção (selecione as colunas dos dois lados da escondida). Também aparece na busca (Ctrl K) por "mostrar colunas ocultas".</p>',
     '', [('Coluna B oculta (vai de A para C)', 'depois-colunas-ocultas'), ('Depois de Reexibir colunas', 'depois-colunas-de-volta')], 'par'),
    ('H08', 'Próximas versões e novas funções (decisão)', G3,
     '<p><b>v0.4.3 (Opus 5.5 · alto):</b> as ajudas da fórmula que estavam planejadas — "Explicar esta conta" (PL11), "Por que deu erro?" (PL12), painel Problemas (PL13), a conta desenhada como fluxograma (PL15) e montar a conta respondendo uma pergunta (PL18) — mais o menu de botão direito nos cabeçalhos de linha e coluna (N04).</p>'
     '<p><b>v0.4.4 (Sonnet 5.5 · alto):</b> a <b>Assinatura</b>: linha em branco com o nome completo escrito embaixo, onde você coloca a assinatura/rubrica (desenhando com mouse ou dedo, ou com uma foto). Primeiro no quadro de post-its; depois Docx e Planilha. A imagem fica só no arquivo, no seu aparelho, nunca no código nem no GitHub. Exportar para EFCquiz e EFClaudian fica com você, no outro projeto.</p>'
     '<p>Depois vêm os menus da lista N01–N16 que você já aprovou, em blocos pequenos, antes da v0.5.0 (abrir e salvar Excel, PDF e imprimir a planilha). A v0.5.0 continua precisando de <b>3 a 5 arquivos .xlsx reais com dados trocados</b>.</p>'
     '<p>Ainda sem decisão: as <b>funções novas N17 a N23</b> (qualidade). Sugiro aprovar primeiro N17 a N20 e N22.</p>',
     'Pode seguir para a v0.4.3 depois desta?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>90/90 testes de regras</span><span>77/77 testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A <b>v0.4.1 já está no GitHub</b> (commit 5ca553f). Esta v0.4.2 é a rodada de ajustes: tudo do relatório do Grok (E1 a E4, Y06) mais a faixa compacta com dicas que você pediu.</li>'
    '<li>Também: a tela Início deixou de dizer que a planilha chega depois; agora diz que quadro de post-its e planilha já funcionam e que o documento chega na v0.7.0.</li>'
    '<li>Testes novos: regras (funções que faltam, SOMAA continua virando SOMA, dicas de todos os botões) e navegador (grava CORREL, sem prévia no PROCV, faixa cabe em 1366 px em todas as abas, Mais em 1000 px, dica ao parar o mouse, Reexibir colunas).</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Funções do Excel que faltam, faixa compacta e dicas')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
