"""EFCdocs — monta a página de aprovação da v0.4.3.1 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.4.4'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
G1, G2, G3 = 'A. Revisão de layout (o que você pediu: menos texto, temas retráteis, mais limpo)', 'B. Defeitos achados no caminho', 'C. Decisões'
ITENS = [
    ('M01', 'Cantos retos e abas da faixa planas', G1,
     '<p>Todos os cantos ficaram quase retos (3 a 4 px no lugar de 8 a 12 px e das pílulas). As abas da faixa (Arquivo, Página Inicial...) deixaram de ser pílulas laranja: agora são texto simples e a aba ativa ganha um <b>sublinhado</b> na cor do tema, como no Excel. Vale para todos os 17 temas.</p>',
     'Gostou dos cantos retos e das abas sublinhadas?',
     [('Antes (computador)', 'antes-pc-planilha'), ('Depois (computador)', 'depois-pc-planilha')], 'par'),
    ('M02', 'Início: sem texto repetido, Novo numa linha e um filtro só', G1,
     '<ul><li>Saíram o título repetido ("Início" já está na barra de cima) e o parágrafo sobre versões.</li>'
     '<li>Os três cartões grandes de <b>Novo</b> viraram três botões compactos numa linha (no celular, três quadrados lado a lado). A descrição de cada um aparece ao parar o mouse em cima.</li>'
     '<li><b>Filtro único recolhível</b> em Recentes, do jeito que você gosta: um botão com o resumo ("Planilha · Mais recentes") que abre um painel com <b>Nome</b>, <b>Tipo</b> e <b>Ordem</b> (mais recentes, mais antigos, nome de A a Z) e <b>Limpar</b>. A contagem mostra "1 de 2" quando está filtrando. Esc fecha o painel. O filtro continua igual quando você volta para a página.</li></ul>',
     '', [('Antes', 'antes-pc-inicio'), ('Depois', 'depois-pc-inicio'), ('Depois: filtro aberto (só planilhas)', 'depois-pc-filtro')], 'par'),
    ('M03', 'Listas de Planilhas, Documentos e Lixeira enxutas', G1,
     '<p>Cada lista começa com um botão só (<b>Nova planilha</b>, <b>Novo quadro</b>...) e logo abaixo os arquivos com o mesmo filtro. Documentos mostra o aviso "o editor chega na v0.7.0" uma vez (antes eram três). A Lixeira tem uma linha de explicação no lugar de um parágrafo.</p>',
     '', [('Antes: Planilhas', 'antes-pc-planilhas'), ('Depois: Planilhas', 'depois-pc-planilhas'), ('Antes: Documentos', 'antes-pc-documentos'), ('Depois: Documentos', 'depois-pc-documentos'), ('Antes: Lixeira', 'antes-pc-lixeira'), ('Depois: Lixeira', 'depois-pc-lixeira')], 'par'),
    ('M04', 'Opções retráteis: Tema, Tela, Perfil e Sobre abrem e fecham', G1,
     '<p>Opções agora são quatro linhas que <b>abrem e fecham</b>. Cada linha mostra o que está escolhido (ex.: "Petróleo · relevo", "Faixa tipo Excel · Mostrar tudo · menu completo"), então dá para conferir sem abrir. Os 17 temas só aparecem ao tocar em <b>Tema</b>, em amostras menores. O que você deixar aberto continua aberto na próxima vez. O comando "Tema" (busca ou Exibir) abre já na seção Tema. A janela fechada tem 225 px de altura (antes ocupava mais de uma tela no celular).</p>',
     'Ficou do jeito que você imaginou os temas retráteis?',
     [('Antes', 'antes-pc-opcoes'), ('Depois: fechada', 'depois-pc-opcoes'), ('Depois: Tela aberta', 'depois-pc-opcoes-tela'), ('Depois: Tema aberto', 'depois-pc-opcoes-tema')], 'par'),
    ('M05', 'Celular: as mesmas mudanças, e mais espaço para a planilha', G1,
     '<ul><li>Início com os três botões de Novo lado a lado e as Opções retráteis.</li>'
     '<li>Na planilha, a barra de baixo que só dizia "Planilha" sumiu; ela volta sozinha quando há Soma/Média para mostrar (ao selecionar números). A grade ganhou cerca de duas linhas.</li>'
     '<li>Quadro vazio com uma linha de texto ("Dois toques no quadro criam um post-it. Ou comece por:").</li></ul>',
     '', [('Antes: Início', 'antes-cel-inicio'), ('Depois: Início', 'depois-cel-inicio'), ('Antes: Opções', 'antes-cel-opcoes'), ('Depois: Opções', 'depois-cel-opcoes'), ('Antes: planilha', 'antes-cel-planilha'), ('Depois: planilha', 'depois-cel-planilha'), ('Antes: quadro vazio', 'antes-cel-quadro'), ('Depois: quadro vazio', 'depois-cel-quadro'), ('Depois: Tema aberto', 'depois-cel-opcoes-tema'), ('Depois: Planilhas', 'depois-cel-planilhas')], 'quatro'),
    ('M06', 'Dois defeitos corrigidos no caminho', G2,
     '<ul><li>A <b>dica</b> (balão que aparece ao parar o mouse) ficava na tela ao trocar de página. Agora some.</li>'
     '<li>No celular, tocar em "Fluxograma" no quadro vazio e logo em seguida na forma nova (no mesmo lugar) abria a edição do texto como se fossem dois toques. Agora só conta quando os dois toques são no quadro.</li></ul>', '', [], ''),
    ('M07', 'O que mais incomoda?', G3,
     '<p>Fiz a revisão com base no que você disse ("feio, contra intuitivo, temas retráteis, muito texto e pouca funcionalidade") e nas suas regras de tela (sem cantos arredondados, sem poluição, filtro único recolhível, lixeira no canto). <b>Não mexi</b> no desenho das cores dos temas nem na faixa de botões da planilha e do quadro, que seguem o EFClaudian.</p>',
     'Ainda tem alguma tela que incomoda (cite qual e o quê)? Se não, sigo para a Assinatura.', [], ''),
    ('M08', 'Publicação e próxima versão', G3,
     '<p>A v0.4.4 já inclui a <b>v0.4.3.1 revisada</b> (que ainda espera as suas respostas K01 a K08). Se aprovar as duas páginas, publico <b>só a v0.4.4</b> de uma vez no GitHub. Próxima: <b>v0.4.5 Assinatura</b> (Sonnet 5.5 · alto): linha em branco com o nome completo embaixo, rubrica desenhada ou foto, primeiro no quadro, depois Docx e Planilha.</p>',
     'Pode publicar a v0.4.4 (com a v0.4.3.1 dentro) e seguir para a Assinatura?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>106/106 testes de regras</span><span>100/100 testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>Revisão de layout que você aprovou no J07 da v0.4.3.1: menos texto, Opções retráteis, cantos retos, filtro único. Nada de função foi tirado.</li>'
    '<li>Feita em cima da v0.4.3.1 revisada (que ainda aguarda K01 a K08). Os prints de "antes" são da v0.4.3.1.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'revisão de layout: menos texto, Opções retráteis, cantos retos')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
