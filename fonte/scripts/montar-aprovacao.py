"""EFCdocs — monta a página de aprovação da v0.3.1 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.3.1'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
ITENS = [
    ('D01', 'Páginas dentro do quadro (PQ01)', 'Post-its e Quadro (v0.3.1)',
     '<p>Nova peça <b>Página</b> (Inserir › Página): uma moldura tracejada com título, que fica atrás de tudo. Você pode ter várias no mesmo quadro, mudar o tamanho e o título. '
     'Arrastar a página pelo título <b>leva junto tudo o que está dentro</b>. Pertence à página o que tem o centro dentro dela.</p>'
     '<p>No <b>PDF</b> e na <b>impressão</b> cada página vira uma folha A4 paisagem; o que ficou fora de todas as páginas sai numa última folha "Fora das páginas". '
     'O PNG continua sendo o quadro inteiro. O rodapé do app mostra quantas páginas o quadro tem.</p>',
     'O fluxograma grande da RNC cabe melhor em uma folha ou em várias? Dá para ajustar o tamanho padrão da página (hoje 560 × 380).',
     [('Página em volta dos 3 primeiros passos, legenda ao lado', 'depois-paginas-legenda')], 'um'),
    ('D02', 'Legenda automática do fluxograma (PQ02)', 'Post-its e Quadro (v0.3.1)',
     '<p>Inserir › Legenda cria uma caixa que mostra <b>só as formas que o quadro usa</b> (Início/Fim, Atividade, Decisão, Entrada/Saída, Post-it, Seta) e se atualiza sozinha quando você acrescenta ou tira formas. '
     'Para trocar o texto de uma linha: escolha a legenda e abra Detalhes. Apagar o texto volta ao padrão.</p>'
     '<p>A legenda também sai no PDF, no PNG e na impressão.</p>',
     '', [('Folha 2 do PDF: fluxograma com a legenda', 'pdf-2')], 'um'),
    ('D03', 'Post-it de tarefa: responsável, prazo e GUT (PQ03)', 'Post-its e Quadro (v0.3.1)',
     '<p>Em Detalhes, todo post-it ganha <b>Responsável</b>, <b>Prazo</b> e as notas <b>G, U e T</b> (1 a 5). O rodapé do post-it mostra "Resp.", o prazo e a etiqueta GUT colorida. '
     'GUT = G × U × T. Prioridade <b>Alta</b> de 64 a 125, <b>Média</b> de 27 a 63, <b>Baixa</b> de 1 a 26.</p>'
     '<p>Prazo vencido fica em vermelho ("Vencido: data"), exceto se o post-it já está na <b>última coluna</b> do Kanban (concluído). '
     'A data só aceita data de verdade: não deixa 30/02 nem "2O26" com a letra O. Post-it sem nada preenchido continua sendo um post-it comum.</p>',
     'As faixas do GUT (64 e 27) servem para a sua rotina? Se usa outras, diga no comentário.',
     [('Post-its com tarefa e painel de Detalhes', 'depois-tarefa-assistente')], 'um'),
    ('D04', 'Kanban mostra a tarefa e ordena pelo GUT', 'Post-its e Quadro (v0.3.1)',
     '<p>No Kanban, o cartão mostra responsável, prazo e GUT. O botão <b>GUT</b> ao lado de Quadro/Kanban (ou Organizar › Ordenar GUT) ordena <b>cada coluna</b> da maior nota para a menor; '
     'quem não tem nota fica no fim, na ordem de antes. Dá para desfazer com Ctrl+Z.</p>',
     '', [('Kanban depois de ordenar pelo GUT', 'depois-kanban-gut')], 'um'),
    ('D05', 'Barra de ferramentas vertical no computador (PQ06)', 'Post-its e Quadro (v0.3.1)',
     '<p>No computador aparece, à esquerda do quadro, uma barra com as peças sempre à mão: Post-it, Início/Fim, Atividade, Decisão, Entrada/Saída, Texto, Página, Legenda e Seta. '
     'Um clique cria a peça no meio da tela; Seta liga dois itens. Dá para esconder no X ou em Exibir › Ferramentas. No celular ela <b>não aparece</b>, porque não há espaço.</p>',
     '', [('Antes (v0.3.0)', 'antes-fluxo'), ('Depois', 'depois-rnc')], ''),
    ('D06', 'Cores à mão no celular (PQ07)', 'Post-its e Quadro (v0.3.1)',
     '<p>No celular, ao escolher um item aparece embaixo uma faixa com <b>Editar</b> e todas as cores em círculos. Um toque troca a cor, sem abrir janela. '
     'A barra da seleção (lixeira, ligar, duplicar) continua acima da faixa.</p>',
     '', [('Antes (v0.3.0)', 'antes-celular-selecao'), ('Depois', 'depois-celular-selecao')], 'cel'),
    ('D07', 'Assistente do quadro (PQ08)', 'Post-its e Quadro (v0.3.1)',
     '<p>A lâmpada (embaixo à direita; no celular, no alto) mostra quantas pendências o quadro tem e abre a lista; <b>Ir</b> leva até o item. Ele só avisa, nunca muda nada. Regras:</p>'
     '<ul><li><b>Erro</b>: decisão sem duas saídas; tarefa com prazo vencido.</li>'
     '<li><b>Aviso</b>: saída de decisão sem Sim/Não; passo solto ou sem entrada; falta Início ou Fim do fluxo; tarefa com prazo ou GUT sem responsável.</li></ul>'
     '<p>As regras do fluxo só valem quando há formas de fluxograma; um quadro só de post-its não recebe aviso de "passo solto".</p>',
     'Falta alguma regra que você conferiria no fluxograma da qualidade (por exemplo, "toda ação precisa de responsável")?',
     [('Computador: aviso de prazo vencido', 'depois-tarefa-assistente'), ('Celular', 'depois-celular-assistente')], ''),
    ('D08', 'Modelos de quadro da qualidade (PQ05)', 'Post-its e Quadro (v0.3.1)',
     '<p>Inserir › Modelos (ou o botão "Modelos" do quadro vazio): <b>Fluxograma de RNC</b>, <b>Ishikawa 6M</b>, <b>5W2H</b>, <b>Matriz GUT</b>, <b>PDCA</b>, <b>Kanban</b>, <b>Mapa mental</b> e <b>Linha do tempo</b>. '
     'Entram com textos de exemplo para você trocar, com códigos Q em ordem, e já vêm com as setas ligadas. Se o quadro já tem itens, o modelo entra <b>embaixo</b> deles. '
     'Desfazer (Ctrl+Z) tira o modelo inteiro de uma vez. Nenhum modelo tem nome de pessoa, setor ou dado da fazenda.</p>',
     'Algum modelo que você usa e que não está na lista (8D, A3, FMEA, 5 porquês)? Diga quais entram na próxima rodada.',
     [('Janela de modelos', 'depois-modelos'), ('Fluxograma de RNC inserido', 'depois-rnc')], ''),
    ('D09', 'PDF e impressão com uma folha por página', 'Post-its e Quadro (v0.3.1)',
     '<p>Com páginas no quadro, o PDF sai com <b>uma folha por página</b>, cada uma com título, data e "folha 1 de 2" no rodapé. O Kanban também mostra responsável, prazo e GUT nos cartões do PDF. '
     'Sem páginas, tudo continua igual à v0.3.0 (uma folha com o quadro inteiro).</p>',
     '', [('Folha 1: a página', 'pdf-1'), ('Folha 2: fora das páginas', 'pdf-2')], ''),
    ('D10', 'Nomes das formas: Atividade e Entrada/Saída', 'Ajustes',
     '<p>Na faixa, na busca e na legenda: <b>Processo</b> virou <b>Atividade</b> e <b>Dados</b> virou <b>Entrada/Saída</b>, que é como o fluxograma da qualidade costuma chamar. '
     'Quem digitar "processo" ou "dados" na busca (Ctrl+K) ainda acha as duas formas. Quadros antigos abrem normalmente.</p>',
     '', [('Antes (v0.3.0)', 'antes-inserir'), ('Depois', 'depois-paginas-legenda')], ''),
    ('D11', 'Correções pequenas', 'Ajustes',
     '<p>Raia, página e legenda <b>não recebem seta</b> (nem pelo "próximo passo"): são fundo ou explicação, não etapa do fluxo. '
     'Dois toques <b>dentro</b> de uma página ou de uma raia (fora do título) criam um post-it ali; dois toques no <b>título</b> trocam o nome. '
     'Post-it criado dentro do Kanban agora já nasce com a posição certa na coluna, e a ordem do cartão não se perde ao ordenar pelo GUT.</p>',
     '', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>53/53 testes de regras</span><span>37/37 testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>Sai o que você aprovou na Proposta 03 como <b>PQ10 · A</b>: os ajustes do quadro de post-its <b>antes</b> de começar a Planilha (v0.4.0). A Planilha só começa quando você disser "pode iniciar".</li>'
    '<li>Entram páginas, legenda automática, post-it de tarefa com GUT, barra vertical, cores no celular, Assistente e 8 modelos. Ficam para depois: gráfico ligado à planilha (v0.6.0) e arquivar com motivo (v0.8.0).</li>'
    '<li>Quadros da v0.3.0 abrem sem mudança: nada que já existia foi renomeado dentro do arquivo, só o que aparece na tela.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Post-its: páginas, tarefa e modelos')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
