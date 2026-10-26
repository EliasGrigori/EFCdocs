"""EFCdocs — monta a página de aprovação da v0.4.6 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.4.6'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
G1, G2, G3 = 'A. Funções novas', 'B. Ajuda e limites', 'C. Decisões'
ITENS = [
    ('S01', 'TETO e ARREDMULTB: arredondar para um múltiplo', G1,
     '<p><b>TETO(2,1;0,5) = 2,5</b> arredonda para cima até o próximo múltiplo; <b>ARREDMULTB(17;5) = 15</b> arredonda para baixo. Seguem as regras do Excel: negativos (TETO(-2,5;2) = -2; ARREDMULTB(-2,5;2) = -4), múltiplo 0 (TETO dá 0; ARREDMULTB dá #DIV/0!) e sinais trocados (#NÚM!). Sem o ruído do computador (TETO(0,3;0,1) dá 0,3 e não 0,30000000000000004). Também funcionam sobre uma faixa inteira (derramam).</p>',
     'Para o dia a dia (calibração, lote em caixas de 5, tolerância de 0,5), faltou alguma variação (por exemplo o ARRED.MULT, que arredonda para o múltiplo mais perto)?',
     [('Antes: #NOME?', 'antes-planilha-funcoes'), ('Depois: valores certos', 'depois-planilha-funcoes')], 'par'),
    ('S02', 'MODO, PERCENTIL, QUARTIL e ORDEM (os nomes que mais se usam)', G1,
     '<p>O EFCdocs já tinha MODO.ÚNICO, PERCENTIL.INC, QUARTIL.INC e ORDEM.EQ. Agora os <b>nomes antigos</b>, que são os que a maioria digita e que aparecem nos arquivos do Excel, também funcionam e dão <b>o mesmo resultado</b>: MODO (o valor que mais se repete; sem repetido dá #N/D), PERCENTIL (0 a 1), QUARTIL (0 a 4) e ORDEM (posição, 0 = do maior para o menor; empate fica na mesma posição). Na hora de salvar um .xlsx (v0.5.0) o nome sai como o Excel espera.</p>',
     '', [('Antes: #NOME?', 'antes-planilha-funcoes'), ('Depois', 'depois-planilha-funcoes')], 'par'),
    ('S03', 'CORREL: o quanto duas colunas andam juntas', G1,
     '<p>Dá um número de <b>-1 a 1</b>: perto de 1, as duas colunas sobem juntas (ex.: cloro e peso); perto de -1, uma sobe e a outra desce; perto de 0, não têm relação. Pares em que um lado é texto ou vazio ficam de fora (como no Excel); colunas de tamanhos diferentes dão #N/D; um par só, ou uma coluna sem variação, dá #DIV/0!. O <b>Explicar</b> descreve a conta com o nome das colunas e o que significa.</p>',
     '', [('Antes: Explicar não sabia', 'antes-explicar-correl'), ('Depois: Explicar com o nome das colunas', 'depois-explicar-correl')], 'par'),
    ('S04', 'FREQUÊNCIA: quantos valores cabem em cada faixa', G1,
     '<p>Digite os <b>limites</b> das faixas (ex.: 1; 1,5; 2) e <b>=FREQUÊNCIA(A2:A9;G2:G4)</b>: aparece uma <b>coluna</b> com quantos valores caem até 1, entre 1 e 1,5, entre 1,5 e 2 e <b>acima de 2</b> (uma linha a mais do que os limites). Texto e vazios não contam. A soma da coluna é o total de números. Dica de uso: é a base de um histograma ou de "quantas amostras ficaram fora do limite".</p>',
     'Preferia que a coluna do FREQUÊNCIA já saísse com um rótulo ao lado (ex.: "até 1", "de 1 a 1,5")? Isso fica para quando tiver gráfico (v0.6.0), a não ser que você peça antes.',
     [('Antes: #NOME?', 'antes-planilha-frequencia'), ('Depois: a contagem derrama', 'depois-planilha-frequencia')], 'par'),
    ('S05', 'Ajuda ao digitar', G2,
     '<ul><li>Ao digitar <b>=QUART</b>, <b>=TET</b>, <b>=CORR</b> ou <b>=FREQ</b> aparecem as funções novas, com o que cada argumento é e um exemplo.</li>'
     '<li>Elas saíram da lista de "função que o EFCdocs ainda não calcula", então deixam de aparecer em <b>Problemas</b> e de dar o aviso amarelo.</li></ul>',
     '', [('Antes', 'antes-autocompletar'), ('Depois', 'depois-autocompletar')], 'par'),
    ('S06', 'O que ainda não calcula (para você saber)', G2,
     '<p>Continuam fora, avisando com clareza ("ainda não sabe calcular"): <b>TETO.MAT, ARREDMULTB.MAT, ARRED.MULT</b>, ORDEM.MED, INCLINAÇÃO, INTERCEPÇÃO, TENDÊNCIA, PREVISÃO, DIST.NORM.N e outras estatísticas. Entram em versões seguintes, se você pedir.</p>',
     'Quer algum desses antes do v0.5.0 (abrir e salvar Excel)? Se não, sigo direto.', [], ''),
    ('S07', 'O que mais incomoda?', G3,
     '<p>Esta versão só mexe em funções: nada de tela mudou.</p>',
     'Ainda tem alguma tela que incomoda (cite qual e o quê)?', [], ''),
    ('S08', 'Publicação: a v0.4.5 e a v0.4.6 juntas, ou uma de cada vez?', G3,
     '<p>A <b>v0.4.6 foi feita em cima da v0.4.5 (Assinatura)</b>, que ainda espera a sua aprovação (itens R01 a R09). Opções: (1) publicar as duas num só passo, depois que você aprovar as duas páginas; (2) publicar a v0.4.5 primeiro e a v0.4.6 em seguida (dois commits). Nada vai ao GitHub antes da sua resposta.</p>',
     'Pode publicar? Como prefere: as duas juntas (recomendo, é o mesmo trabalho) ou uma de cada vez?', [], ''),
    ('S09', 'Próxima versão', G3,
     '<p>Próxima: <b>v0.5.0 (Opus 5.5 · alto)</b>, abrir e salvar arquivos do Excel (.xlsx), com relatório do que não foi aproveitado e teste de ida e volta. Para isso preciso de <b>3 a 5 arquivos .xlsx reais</b> (com os dados trocados, sem nomes, senhas nem números verdadeiros): uma planilha simples, uma com fórmulas, uma com formatação e colunas largas, uma com várias abas e, se tiver, uma com gráfico ou tabela dinâmica. Antes dela posso fazer versões pequenas dos menus N01 a N16 que sobraram.</p>',
     'Quer a v0.5.0 já, ou antes alguma versão pequena de menus?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A v0.4.6 é o <b>primeiro bloco de funções</b>: TETO, ARREDMULTB, MODO, PERCENTIL, QUARTIL, ORDEM, CORREL e FREQUÊNCIA, com a ajuda ao digitar e o Explicar.</li>'
    '<li>Foi feita em cima da v0.4.5 (Assinatura), que ainda aguarda a sua aprovação. Nada foi publicado.</li>'
    '<li>Nada a configurar no Firebase. Só funções: nenhuma tela mudou.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'TETO, ARREDMULTB, MODO, PERCENTIL, QUARTIL, ORDEM, CORREL e FREQUÊNCIA')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
