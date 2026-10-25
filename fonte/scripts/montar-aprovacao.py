"""EFCdocs — monta a página de aprovação da v0.3.2 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.3.2'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
ITENS = [
    ('E01', 'Colar muitas linhas sem perder nem cobrir nada (achados 1 e 2 do Grok)', 'Achados do Grok na v0.3.0',
     '<p>O Grok colou 62 linhas e saíram só <b>30</b> post-its, sem aviso; e eles caíram <b>por cima</b> do fluxograma que já estava no quadro.</p>'
     '<p>Agora cada linha vira um post-it, até <b>200</b> de uma vez. Passou disso, aparece o aviso "Colei as primeiras 200 linhas. Sobraram N". '
     'Se o quadro já tem itens, os colados entram em grade <b>embaixo de tudo</b> e a tela vai até eles; se o quadro está vazio, entram no meio da tela. Ctrl+Z desfaz o lote inteiro.</p>',
     'Serve o limite de 200 linhas por colagem?', [('Antes (v0.3.1): 30 post-its por cima do fluxo, quando eram 62', 'antes-colar'), ('Depois: 62 post-its embaixo do fluxo', 'depois-colar')], ''),
    ('E02', 'Palavra gigante e texto longo (achado 3 do Grok)', 'Achados do Grok na v0.3.0',
     '<p>No PDF e no PNG, uma palavra enorme depois de outra palavra saía <b>pelos lados</b> do post-it. Agora ela é partida em linhas dentro da caixa.</p>'
     '<p>Na tela, o texto que não cabe passa a terminar em reticências (<b>…</b>) em vez de ser cortado seco embaixo. Para ver tudo, aumente o post-it ou abra o texto com dois toques.</p>',
     '', [('Antes (v0.3.1): PNG exportado', 'antes-longo-export'), ('Depois: PNG exportado', 'depois-longo-export'), ('Depois: na tela', 'depois-longo')], ''),
    ('E03', 'Seta reta e seta em cotovelo (V07 do Grok)', 'Achados do Grok na v0.3.0',
     '<p>O Grok achou que o botão não funcionava. Não era defeito: com os dois itens <b>alinhados</b>, a seta reta e a seta em cotovelo são o mesmo desenho. Desalinhando os itens, o desenho muda (agora há um teste que confere isso).</p>'
     '<p>O que confunde é o botão: o nome dele mostra o estilo <b>para onde vai</b> ("Seta reta" enquanto a seta ainda é cotovelo).</p>',
     'Quer que o botão mostre o estilo atual (por exemplo "Estilo: cotovelo") e abra as duas opções? Se não, fica como está.', [], ''),
    ('E04', 'PDF como imagem, sem texto selecionável (achado 4 do Grok)', 'Achados do Grok na v0.3.0',
     '<p>Hoje o PDF é a foto do quadro dentro da folha A4: acentos e R$ saem certos, mas o texto não dá para selecionar nem pesquisar. Foi uma escolha da v0.3.0 para o PDF sair igual à tela, com qualquer fonte e forma.</p>'
     '<p>Fazer um PDF com texto de verdade é possível, mas é um trabalho grande (desenhar cada forma, seta e texto como PDF). Sugestão: <b>deixar como está</b> por enquanto e rever na v1.0.0, quando o quadro estiver completo.</p>',
     'Deixar como está até a v1.0.0 (sugestão) ou colocar o PDF com texto no plano antes?', [], ''),
    ('E05', 'Data de prazo recusada sem aviso e "Resp.: —" (V04 do Grok na v0.3.1)', 'Achados do Grok na v0.3.1',
     '<p>O Grok digitou datas de 1999 e do ano 0026 no Prazo: o campo continuava mostrando a data, mas ela não era gravada, e <b>nenhum aviso</b> aparecia.</p>'
     '<p>Agora, uma data fora de 01/01/2000 a 31/12/2100 mostra em vermelho "Data não aceita. Use uma data de 01/01/2000 a 31/12/2100." e, ao sair do campo, volta para o último prazo válido. '
     'Sem responsável, o post-it mostra <b>"Sem responsável"</b> (em itálico) no lugar de "Resp.: —".</p>',
     'Serve o limite de 2000 a 2100 para datas?', [('Antes (v0.3.1): "Resp.: —"', 'antes-semresp'), ('Depois: "Sem responsável"', 'depois-semresp')], ''),
    ('E06', 'Texto de 500 letras por cima do código e do rodapé da tarefa (Grok na v0.3.1)', 'Achados do Grok na v0.3.1',
     '<p>Com responsável e prazo preenchidos, um texto muito longo passava por cima do código Q-001 e das linhas de responsável e prazo (só no PDF saía certo).</p>'
     '<p>Agora o texto fica <b>dentro da área livre</b> do post-it e termina em reticências; o rodapé da tarefa nunca é coberto.</p>',
     '', [('Antes (v0.3.1)', 'antes-tarefa500'), ('Depois', 'depois-tarefa500')], ''),
    ('E07', '"Entrada/Saída" cortado na barra vertical (Grok na v0.3.1)', 'Achados do Grok na v0.3.1',
     '<p>O nome da forma aparecia cortado na barra vertical. A barra ficou um pouco mais larga e, se a tela for baixa, ela rola em vez de esconder botões.</p>',
     '', [('Antes (v0.3.1)', 'antes-barra'), ('Depois', 'depois-barra')], ''),
    ('E08', 'Prazo vencido depois da meia-noite (Grok na v0.3.1)', 'Achados do Grok na v0.3.1',
     '<p>Com o app aberto de um dia para o outro, o prazo de ontem só aparecia como vencido no PDF. Agora a tela confere a data a cada 30 segundos e quando você volta para a aba, e passa a mostrar "Vencido: data" sozinha. Há um teste que simula a virada da meia-noite.</p>',
     '', [], ''),
    ('E09', 'Três páginas seguidas uma em cima da outra (Grok na v0.3.1)', 'Achados do Grok na v0.3.1',
     '<p>Inserir Página três vezes empilhava todas no mesmo lugar. Agora cada nova página entra ao lado da anterior (três por linha, depois uma nova linha) sem cobrir as outras.</p>',
     '', [('Antes (v0.3.1): páginas empilhadas', 'antes-paginas'), ('Depois: três páginas lado a lado', 'depois-paginas')], ''),
    ('E10', 'Cada post-it gastava 2 desfazer (Grok na v0.3.1)', 'Achados do Grok na v0.3.1',
     '<p>Criar um post-it e escrever o primeiro texto contava como duas ações de desfazer. Agora o <b>criar + primeiro texto</b> é uma só: um Ctrl+Z remove o post-it. Edições posteriores continuam separadas.</p>',
     'Está bom assim, ou prefere que desfazer só apague o texto e deixe o post-it vazio?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>55/55 testes de regras</span><span>43/43 testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A <b>v0.3.1 já está no GitHub</b> (commit ef17e62), aprovada por você (D01 a D11). Esta é uma versão pequena, só com o que o Grok achou na verificação da v0.3.0 e da v0.3.1.</li>'
    '<li>Dos achados da v0.3.0: 2 viraram correção (E01, E02), 1 não era defeito (E03) e 1 é decisão sua (E04). Da v0.3.1: 6 correções (E05 a E10); o V01 a V12 do roteiro passaram, só o V04 falhou. Nada vai ao GitHub antes da sua resposta.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Post-its: achados do Grok')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
