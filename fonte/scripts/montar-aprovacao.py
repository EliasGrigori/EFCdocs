"""EFCdocs — monta a página de aprovação da v0.5.0 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.5.0'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
G1, G2, G3, G4 = 'A. Abrir arquivo do Excel', 'B. Salvar como Excel', 'C. O que ainda não vem e decisões de rumo', 'D. Decisões'
TABELA_4 = (
    '<table class="tab"><thead><tr><th>Arquivo</th><th>Abas</th><th>Células que vieram</th><th>Fórmulas iguais ao Excel</th><th>Ler e mostrar o relatório</th><th>Abrir a planilha</th><th>Salvar como Excel</th></tr></thead><tbody>'
    '<tr><td>Estoque</td><td>6</td><td>9.643</td><td><b>2.891 de 2.891</b> (100%)</td><td>0,3 s</td><td>0,6 s</td><td>0,1 s</td></tr>'
    '<tr><td>Acerola</td><td>4</td><td>63.497</td><td><b>11.730 de 11.731</b> (99,99%)</td><td>1,4 s</td><td>1,2 s</td><td>0,3 s</td></tr>'
    '<tr><td>Potabilidade</td><td>7</td><td>41.189 (de 1,1 milhão)</td><td><b>8.909 de 8.910</b> (99,99%)</td><td>5 a 8 s</td><td>1,4 s</td><td>0,4 s</td></tr>'
    '<tr><td>Coletas</td><td>31</td><td>106.299 (de 2,2 milhões)</td><td><b>18.825 de 18.829</b> (99,98%)</td><td>5 s</td><td>2,3 s</td><td>0,7 s</td></tr>'
    '</tbody></table>')
ITENS = [
    ('E01', 'Abrir arquivo do Excel: no Início, no Novo e na faixa', G1,
     '<p>Antes, "Abrir Excel/Word" só dizia que chegava na v0.5.0. Agora tem um botão <b>Abrir arquivo do Excel (.xlsx ou .xlsm)</b> logo embaixo dos cartões do Início, a opção <b>Abrir do Excel</b> no botão <b>Novo</b> do menu (como o "Upload" do Google Drive) e os botões <b>Abrir Excel</b>, <b>Salvar como Excel</b> e <b>O que veio do Excel</b> nas abas Arquivo e Dados. Dá para escolher o arquivo ou <b>arrastar</b> para a janela. O arquivo original <b>não muda</b>: vem uma cópia para o EFCdocs.</p>',
     'O lugar dos botões ficou bom? Quer o "Abrir arquivo do Excel" também como um quarto cartão grande?',
     [('Antes: Início (v0.5.0)', 'antes-inicio'), ('Depois: botão embaixo dos cartões', 'depois-inicio'), ('Antes: "chega na v0.5.0"', 'antes-abrir'), ('Depois: escolher ou arrastar o arquivo', 'depois-escolher'), ('Depois: Novo › Abrir do Excel', 'depois-novo')], 'par'),
    ('E02', 'Relatório antes de abrir: o que veio, o que ficou de fora e o que é bom saber', G1,
     '<p>O arquivo é lido numa linha separada (a tela não trava; aparece a barra de progresso, aba por aba). Antes de abrir, o EFCdocs mostra um <b>relatório</b>: quantas abas, células e fórmulas, o que <b>veio</b>, o que <b>ficou de fora</b> (com a quantidade) e o que é <b>bom saber</b> (cortes no fim das abas, tabelas que viraram faixa normal, fórmulas que mostram o último valor do Excel). Você decide se abre. O mesmo relatório fica guardado na planilha: <b>Arquivo › O que veio do Excel</b>.</p>',
     'O relatório está claro? Alguma palavra difícil?',
     [('Relatório (amostra inventada)', 'depois-relatorio'), ('Lendo, com a barra de progresso', 'depois-lendo'), ('De novo, depois: Arquivo › O que veio do Excel', 'depois-relatorio-de-novo')], 'um'),
    ('E03', 'A planilha abre como estava no Excel', G1,
     '<p>Vêm os <b>valores</b> e as <b>fórmulas</b> (em português na barra fx), e a <b>formatação</b>: fonte, negrito, cores, preenchimento, bordas, alinhamento, quebra de texto, formato de número (data, R$, %), <b>larguras e alturas</b>, linhas e colunas <b>ocultas</b>, células <b>mescladas</b>, <b>congelar painéis</b>, a <b>cor das abas</b>, as <b>abas ocultas</b> ("+1 oculta") e os <b>nomes definidos</b>. Quando o aparelho tem a fonte do arquivo (Calibri, Arial), a grade usa a mesma. No celular abre igual. Os prints são de uma <b>amostra inventada</b> (nenhum dado seu aparece nesta página).</p>',
     'Abra os seus arquivos: alguma cor, borda ou largura ficou diferente do Excel?',
     [('Aba Coletas da amostra', 'depois-planilha'), ('Aba Resumo: MÉDIA da coluna da tabela, R$, %, VERDADEIRO, #DIV/0!', 'depois-resumo'), ('No celular: Início, relatório e planilha', 'depois-celular')], 'um'),
    ('E04', 'As contas dão o mesmo resultado do Excel (testado nos seus 4 arquivos)', G1,
     '<p>Abri os seus 4 arquivos e comparei, fórmula por fórmula, o valor que o EFCdocs calcula com o último valor que o Excel tinha guardado. Para isso o motor ganhou várias coisas que os seus arquivos usam (item E09).</p>' + TABELA_4 +
     '<p>As poucas diferenças: <b>HOJE()</b> (o Excel guardou o dia em que o arquivo foi salvo; aqui é hoje), <b>1 fórmula com #REF!</b> na aba ACIDIFICAÇÃO da Acerola (a referência já estava quebrada no Excel, que mostrava um valor antigo) e <b>3 fórmulas</b> do RELATÓRIO de Coletas com FILTRO dentro de SE (o Excel mostra #VALOR!, aqui #DESPEJAR!; os dois são erro). <b>Ida e volta</b> (abrir, salvar como Excel e abrir de novo): <b>0 células diferentes</b> nos 4 arquivos. Tempos medidos num computador comum; no celular deve levar umas 3 vezes mais.</p>',
     'Confere 2 ou 3 contas importantes de cada arquivo (por exemplo, um total e um status) e me diga se bateu.', [], ''),
    ('E05', 'Fim das abas que não mostra nada é cortado (com 1.000 linhas de folga)', G1,
     '<p>Alguns arquivos têm a fórmula copiada até a última linha do Excel. Exemplo: na aba <b>RATEIO</b> da Potabilidade, a coluna A ia até a linha <b>1.048.543</b>, mas só as primeiras ~545 mostravam algo; e a <b>ET. FOLHAS</b> de Coletas tinha <b>121.995 linhas ocultas</b> com sobras até o fim. Trazer tudo travaria o celular. A regra: o que <b>não mostra nada</b> no fim da aba (vazio, só formatação, fórmula que dá vazio) é cortado, deixando <b>1.000 linhas de folga</b> com a fórmula depois do último dado; <b>linhas ocultas com valor</b> só saem quando passam de 20 mil no fim da aba. O relatório diz cada corte (aba e linhas).</p>',
     'A folga de 1.000 linhas serve? Ou prefere que, ao salvar como Excel, eu copie a fórmula de novo até a linha onde ela ia no original?', [], ''),
    ('E06', 'Salvar como Excel (.xlsx)', G2,
     '<p>Na aba Arquivo (ou Dados): <b>Salvar como Excel</b> baixa o arquivo com o nome da planilha. Vão valores, fórmulas (com o valor já calculado), formatação, larguras, alturas, ocultas, mescladas, congelar painéis, cor e abas ocultas, nomes definidos e as fórmulas que <b>derramam</b> (FILTRO, ÚNICO…), no formato do Excel 365. O Excel <b>recalcula tudo ao abrir</b>. Se a planilha usa funções que só existem no <b>Excel 2021/365</b>, o aviso diz quais (por exemplo, "Usa FILTRO, ÚNICO"). As <b>assinaturas</b> sobre a planilha ainda não vão (chegam com o Documento, v0.7.0).</p>',
     'Abra no seu Excel um arquivo salvo pelo EFCdocs: abriu sem reclamar? As contas e as cores estão certas?',
     [('Antes: faixa Arquivo (v0.5.0)', 'antes-faixa-arquivo'), ('Depois: Abrir Excel, Salvar como Excel e O que veio do Excel', 'depois-faixa-arquivo'), ('Depois de salvar: "Excel pronto"', 'depois-salvou')], 'um'),
    ('E07', 'O que ainda não vem (somando os seus 4 arquivos)', G3,
     '<p><b>Validação de dados (listas suspensas): 58</b> · <b>Formatação condicional: 38</b> · Comentários e anotações: 23 · Proteção de aba: 22 · Áreas de impressão: 37 · <b>Gráficos: 14</b> (v0.6.0) · <b>Tabelas dinâmicas: 11</b> (vêm só os valores, que não atualizam) · Macros (VBA): 2 arquivos · Botões e caixas de controle: 29 · Imagens: 38 · Segmentações e linhas do tempo: 13 · Links nas células: 4. Os arquivos de você <b>continuam no Excel do jeito que estão</b>; aqui é uma cópia. Pelos números, a validação (listas) e a formatação condicional são as que mais fazem falta nas suas planilhas de controle.</p>',
     'Quer uma v0.5.1 só com listas suspensas, formatação condicional e comentários antes dos gráficos (v0.6.0)? Ou segue direto para os gráficos?', [], ''),
    ('E08', 'Tabelas do Excel viram faixa normal', G3,
     '<p>Os seus arquivos têm <b>51 tabelas do Excel</b> (Inserir › Tabela). Nas fórmulas, <code>Tabela[Coluna]</code> virou o endereço da coluna (por exemplo, <code>Tab_ENTRADAS[Mês/Ano]</code> virou <code>ENTRADAS!$C$4:$C$213</code>), e <code>[@Coluna]</code> virou a célula da mesma linha. A conta é a mesma; o que muda é que a tabela não cresce sozinha quando entra uma linha nova no fim (o botão <b>Tabela</b> do EFCdocs, que já aparece como "em breve", é que vai fazer isso).</p>',
     'Serve assim por enquanto?', [], ''),
    ('E09', 'O que o motor de contas aprendeu com os seus arquivos', G3,
     '<p><b>Fórmula antiga do Excel</b> (sem matriz dinâmica): uma faixa dentro da conta vira a célula da mesma linha, como no Excel (antes derramava e dava #DESPEJAR!); SOMARPRODUTO e afins continuam com a matriz. <b>SUBTOTAL</b> pula as linhas escondidas por filtro. <b>CONT.SES</b> com a condição numa célula vazia não conta as vazias (como o Excel). <b>MÊS(0)</b> = 1. <b>TEXTO(data;"MMMM")</b> com letra maiúscula. O <b>@</b> do Excel (SINGLE) e o <b>A1:.A100</b> (TRIMRANGE). Função que o EFCdocs ainda não tem mostra o <b>último valor do Excel</b> (em vez de #NOME?). <b>Abre rápido</b>: até a primeira mudança, as fórmulas começam com o valor que o Excel guardou e só calculam as que derramam e as de data de hoje; PROCV e CORRESP em listas longas ficaram bem mais rápidos.</p>',
     'Algo nessa lista que você estranhou ao usar?', [], ''),
    ('D01', 'PDF e Imprimir da planilha passam para a v0.6.0', G4,
     '<p>No plano antigo, o PDF e o Imprimir da planilha estavam marcados para a v0.5.0. Fazer bem (quebra de página, área de impressão, cabeçalho repetido) é outro trabalho grande; proponho junto com os <b>gráficos</b>, na <b>v0.6.0</b>, porque o PDF vai precisar desenhar os gráficos. O botão já avisa "chega na v0.6.0".</p>',
     'Pode ser na v0.6.0?', [], ''),
    ('V01', 'Publicação da v0.5.0', G4,
     '<p>Depois da sua aprovação, publico a v0.5.0 no GitHub (commit só com esta versão). Os seus 4 arquivos <b>não</b> vão para o GitHub nem para os pacotes: o teste usa uma amostra inventada (<code>testes/amostras/amostra-qualidade.xlsx</code>). Nada a configurar no Firebase.</p>',
     'Pode publicar? (diga se quer algum ajuste antes, principalmente E05 e E07)', [], ''),
    ('V02', 'Próxima versão', G4,
     '<p>Opção 1 (se responder sim no E07): <b>v0.5.1 · Sonnet 5.5 · alto</b>: listas suspensas (validação), formatação condicional e comentários, lidos do Excel e salvos de volta. Opção 2: <b>v0.6.0 · Opus 5.5 · alto</b>: gráficos (os 14 dos seus arquivos como referência) e PDF/Imprimir da planilha. O relatório do Grok da v0.5.0 entra na próxima que for feita.</p>',
     'Qual vem primeiro: v0.5.1 ou v0.6.0?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A v0.5.0 <b>abre e salva arquivos do Excel</b> (.xlsx e .xlsm), com um relatório do que veio e do que ficou de fora antes de abrir.</li>'
    '<li>Testada nos seus 4 arquivos: as contas dão o mesmo resultado do Excel em 99,98% a 100% das fórmulas, e abrir, salvar e abrir de novo não mudou nenhuma célula.</li>'
    '<li>Os prints usam só uma amostra inventada; os seus arquivos não foram para o GitHub nem para os pacotes. Nada a configurar no Firebase.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Abrir e salvar Excel')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
