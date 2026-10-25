"""EFCdocs — monta a página de aprovação da v0.4.1 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.4.1'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
G1, G2, G3 = 'A. Prioridade máxima: nada se perde com duas abas', 'B. Correções da aprovação da v0.4.0', 'C. O que vem depois'
ITENS = [
    ('G01', 'O mesmo arquivo aberto em duas abas do navegador', G1,
     '<p><b>Antes:</b> as duas abas gravavam por cima uma da outra, sem aviso. O que a aba 2 digitava sumia (planilha e quadro de post-its).</p>'
     '<p><b>Agora:</b> as abas conversam. A primeira que abriu o arquivo edita; a segunda mostra o aviso <b>"Este arquivo está aberto em outra aba"</b> e fica só para ver, recebendo na hora o que a primeira grava. '
     'Quem quiser editar na segunda toca em <b>Editar aqui</b>: ela passa a editar e a outra fica só para ver. Fechar a aba que edita libera a outra sozinha.</p>'
     '<p>Segunda proteção, por baixo: cada gravação leva uma marca. Se mesmo assim alguém gravar no meio (por exemplo, uma aba antiga ainda na v0.4.0, ou o computador que dormiu), a gravação <b>não acontece</b> e aparece a escolha: '
     '<b>Ver a versão gravada</b> ou <b>Gravar a minha por cima</b>. Nada some em silêncio.</p>'
     '<p>Vale para as abas do mesmo navegador no mesmo aparelho. Entre aparelhos diferentes, a mesma ideia vem junto com a nuvem (Firebase), no plano.</p>',
     'O jeito serve (a segunda aba só vê, com "Editar aqui")?',
     [('Antes (v0.4.0): a aba 2 digita e nada avisa', 'antes-duas-abas'), ('Depois: a aba 2 avisa e fica só para ver', 'depois-duas-abas'), ('Depois: gravação no meio, a escolha aparece', 'depois-conflito')], ''),
    ('G02', 'Linha congelada: o número 1 não fica mais em cima do número da linha rolada (F01)', G2,
     '<p>Com a linha 1 congelada e a planilha rolada, o cabeçalho da linha 1 era desenhado por cima do número da linha que passava por baixo. Agora a parte congelada e a parte que rola são desenhadas cada uma no seu espaço (nas linhas e nas colunas).</p>',
     '', [('Antes (v0.4.0)', 'antes-congelado'), ('Depois', 'depois-congelado')], 'par'),
    ('G03', 'Conta com data mostra data; 25:00 continua 25:00 (F04)', G2,
     '<p><code>=A2+1</code> com A2 sendo data mostrava 45353; <code>=DATA(2024;2;29)</code> mostrava 45351. Agora a fórmula pega o formato como o Excel faz, quando a célula está em Geral:</p>'
     '<ul><li>DATA, HOJE, DATAM, FIMMÊS, DIATRABALHO e DATA.VALOR saem como data; AGORA sai com data e hora; TEMPO e VALOR.TEMPO saem como hora.</li>'
     '<li><code>=A2</code> copia o formato de A2; <code>=A2+1</code> com data continua data; SOMA, MÍNIMO, MÁXIMO, MÉDIA, ARRED, SE e SEERRO passam adiante o formato do que recebem (R$ continua R$).</li>'
     '<li>Data menos data dá o número de dias (fica número, como no Excel).</li></ul>'
     '<p><b>25:00</b> virava 01:00. Agora hora acima de 24 é guardada como horas somadas (formato <code>[h]:mm</code>), igual ao Excel: 25:00 continua 25:00, e 123:15 também funciona (bom para somar horas de turno).</p>',
     '', [('Antes (v0.4.0)', 'antes-datas'), ('Depois', 'depois-datas')], 'par'),
    ('G04', 'A dica do SE continua com o cursor no fim da fórmula (F07)', G2,
     '<p>Ao fechar o último parêntese, a dica sumia. Agora, com o cursor logo depois do ")", a dica da função que acabou de fechar continua, com a descrição e o exemplo (como o Grok pediu). Se o cursor está dentro de outra função ainda aberta, a dica é dela.</p>',
     '', [('Antes (v0.4.0)', 'antes-dica-fim'), ('Depois', 'depois-dica-fim')], 'par'),
    ('G05', 'Mensagens de erro em português mais humano (F08)', G2,
     '<p>As mensagens agora dizem <b>o que aconteceu</b>, <b>como consertar</b> e, quando ajuda, <b>um exemplo</b>. Alguns casos:</p>'
     '<ul><li>"Entre A2 e A3 vai ponto e vírgula (;). No Brasil a vírgula é só para casas decimais, como em 0,5."</li>'
     '<li>"A função PROCV precisa de 3 partes separadas por ponto e vírgula. Falta: matriz_tabela, núm_índice_coluna. Exemplo: =PROCV(A2;Lotes!A:C;3;0)"</li>'
     '<li>"Não sei o que é "OK": não é uma célula (como B2), nem uma função, nem um nome definido. Se for um texto, ele vai entre aspas."</li>'
     '<li>Erros na célula: "#DIV/0!: a conta divide por zero, ou por uma célula vazia. Confira o divisor, ou use SEERRO para mostrar outra coisa."</li></ul>'
     '<p><b>Atenção:</b> o texto das sugestões S02 a S09 do relatório do Grok não chegou até mim (só o pedido). Reescrevi todas as mensagens seguindo a ideia. Se puder colar aqui as S02 a S09, ajusto o que ficar diferente na v0.4.2.</p>',
     'O tom das mensagens serve?', [('Antes (v0.4.0)', 'antes-mensagens'), ('Depois', 'depois-mensagens'), ('Depois: argumento faltando, com exemplo', 'depois-mensagens2')], ''),
    ('G06', 'Celular: o primeiro número digitado depois dos dois toques não se perde (F14)', G2,
     '<p>Depois dos dois toques na célula, o campo de edição recebia o foco um instante depois, e o primeiro dígito ia para lugar nenhum. Agora o campo já abre com o foco, ainda dentro do toque (o teclado do celular sobe na hora). '
     'No teste com celular simulado, os três dígitos chegam. Vale conferir no seu celular de verdade.</p>',
     '', [('Antes (v0.4.0): digitou 123, ficou vazio', 'antes-celular'), ('Depois: 123', 'depois-celular')], 'cel'),
    ('G07', 'Cor da letra legível em todos os temas (F15)', G2,
     '<p>Só muda na tela; o arquivo guarda a cor que você escolheu (vai igual para o Excel).</p>'
     '<ul><li><b>Temas escuros:</b> letra preta, cinza escuro ou branca que some no fundo passa a usar a cor normal do texto do tema (antes ficava um cinza fraco).</li>'
     '<li><b>Cores com matiz</b> (amarelo, laranja, azul escuro...): mantêm o matiz e só escurecem ou clareiam até ler bem. Amarelo no tema claro vira ocre; azul escuro no tema escuro vira azul claro.</li>'
     '<li>O que já se lê fica exatamente como está (vermelho, cinza no branco).</li></ul>',
     '', [('Antes, tema claro', 'antes-cores-claro'), ('Depois, tema claro', 'depois-cores-claro'), ('Antes, tema escuro', 'antes-cores-escuro'), ('Depois, tema escuro', 'depois-cores-escuro')], 'quatro'),
    ('G08', 'Leitor vê o aviso "Só leitura" ao tentar digitar (F18)', G2,
     '<p>Antes, o Leitor digitava e nada acontecia. Agora aparece o aviso: "Só leitura: seu perfil de teste (Leitor) só vê a planilha. Para editar, troque o perfil em Opções." O mesmo vale para Delete, Backspace, colar e dois cliques. O aviso aparece no máximo a cada 2,5 s, para não incomodar.</p>',
     '', [('Antes (v0.4.0)', 'antes-leitor'), ('Depois', 'depois-leitor')], 'par'),
    ('G09', 'Barra de fórmulas mostra o número inteiro (X08 do Grok)', G2,
     '<p>Com 123456789012345 na célula, a barra de fórmulas mostrava 1,23457E+14. Agora mostra o número completo (até 15 dígitos, como o Excel). Na célula, em Geral, continua 1,2346E+14 quando não cabe, igual ao Excel; alargar a coluna ou pôr formato de número mostra tudo.</p>',
     '', [('Antes (v0.4.0)', 'antes-barra-numero'), ('Depois', 'depois-barra-numero')], 'par'),
    ('G10', 'Próxima: v0.4.2 com as ajudas que estavam na v0.4.1', G3,
     '<p>Como a v0.4.1 virou a versão das correções, as ajudas passam para a <b>v0.4.2</b> (Opus 5.5 · alto): "Explicar esta conta" (PL11), "Por que deu erro?" (PL12), painel Problemas (PL13), a conta desenhada como fluxograma (PL15) e montar a conta respondendo uma pergunta (PL18). '
     'O botão "Explicar conta" agora mostra "chega na v0.4.2".</p>'
     '<p>Depois vem a <b>v0.5.0</b> (abrir e salvar Excel, PDF e imprimir a planilha). Para ela continuam faltando os 3 a 5 arquivos .xlsx reais com dados trocados.</p>',
     'Pode seguir para a v0.4.2 depois desta?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>86/86 testes de regras</span><span>70/70 testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A <b>v0.4.0 já está no GitHub</b> (commit da64aab). Esta v0.4.1 traz só as correções pedidas na aprovação e o item novo de prioridade máxima (duas abas).</li>'
    '<li>Testes novos: 7 de regras (formato herdado, 25:00, número inteiro, dica no fim, mensagens, cores, duas abas gravando) e 8 no navegador (duas abas na planilha e no quadro, gravação no meio, datas, dica, congelado, celular, Leitor). Cada teste novo falha na v0.4.0 e passa agora.</li>'
    '<li>Nada vai ao GitHub antes da sua resposta.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Correções da Planilha e duas abas')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
