"""EFCdocs — página de aprovação da Fase 0 (varredura, estudo e base), no visual do Cwork. Um arquivo só, imagens embutidas.
Uso: python3 scripts/montar-aprovacao-fase0.py <imagens.json> <saida.html>"""
import html, json, sys
img = json.load(open(sys.argv[1])); saida = sys.argv[2]
E = html.escape
def tab(cab, linhas, cls=''):
    return f'<div class="rolo"><table class="tb {cls}"><thead><tr>' + ''.join(f'<th>{c}</th>' for c in cab) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in l) + '</tr>' for l in linhas) + '</tbody></table></div>'
def nota(n): return f'<b class="nt n{0 if n < 5 else 1 if n < 7 else 2}">{n}</b>'

GA, GB, GC, GD, GE = 'A · Varredura do sistema', 'B · Estudo de fora', 'C · Visual do Cwork na Planilha', 'D · Base nova e plano', 'E · Planilha anonimizada'
ITENS = [
 ('A01', 'Nota de cada módulo', GA,
  '<p>Medi o app como ele está (v0.6.9.2). Nota de 0 a 10. "Funciona" quer dizer ligado no app e passando nos 317 testes de regras e nos 249 de navegador; não conferi os 311 comandos um a um à mão.</p>' +
  tab(['Módulo', 'Nota', 'Por quê'], [
   ['Planilha · motor de cálculo', nota(7), '136 funções, fórmulas do Excel 365. A cada digitação a planilha inteira é reprocessada'],
   ['Planilha · desenho da grade', nota(5), 'Rolagem fluida. Borda no meio das mescladas, estilo de tabela do Excel não é desenhado, linha cortada no congelado'],
   ['Planilha · Excel (abrir e salvar)', nota(7), 'Guarda e devolve o que não entende. Falta um conferente de fora e a sua confirmação no Excel de verdade'],
   ['Planilha · tabela, imagem, validação', nota(4), 'Existem, mas são janelas simples e objetos que não reagem'],
   ['Planilha · rapidez ao editar', nota(3), '1,2 s para digitar um número numa planilha grande (item A02)'],
   ['Quadro (Post-its)', nota(8), '77 comandos, testes passando, sem relato de defeito. Só o visual sai do padrão'],
   ['Documento', nota(1), 'Só o modelo e as medidas; o editor não existe'],
   ['Visual (padrão do Cwork)', nota(4), '9 a 11 tamanhos de letra por tela, 5 a 6 tipos de canto, botões pequenos (item A03)'],
   ['Código e estrutura', nota(5), 'Motor separado das telas (bom). Um arquivo de tela com 3.707 linhas e um de estilo com 3.111'],
   ['Testes', nota(6), 'Muitos, mas sem planilha parecida com a sua e sem conferente de fora; a suíte de navegador leva 15 min e é encadeada'],
   ['Método de entrega', nota(8), 'Aprovação, roteiro do Grok e memória. Faltam o features.csv e a suíte por módulo do Sabiá'],
  ], 'notas'),
  'O diagnóstico bate com o que você vê no uso?', [], ''),
 ('A02', 'Por que está lento: causa provada', GA,
  '<p>Planilha inventada de 12.000 linhas por 30 colunas (360 mil células, com bordas, cores, 12 mil fórmulas e congelamento).</p>' +
  tab(['Ação', 'PC normal', 'PC 4 vezes mais lento'], [
   ['Abrir o arquivo', '1,1 s', '5,5 s'], ['Rolar', '60 quadros por segundo', '36 quadros por segundo'],
   ['<b>Digitar um número e Enter</b>', '<b>1,2 s</b>', '<b>5,4 s</b>'], ['Mover a seleção com a seta', '0,16 s', '0,6 s'], ['Inserir uma linha no topo', '1,8 s', '8,9 s'], ['Negrito em 20 mil células', '1,2 s', '9,4 s'],
  ]) +
  '<p>Rolar está bom. O problema é editar: a cada tecla o app compacta a planilha inteira para salvar, refaz o índice das células, roda a Verificação em tudo e recalcula mais do que precisa. <b>Cada tecla custa o tamanho da planilha.</b></p>'
  '<p>Correção proposta (versão "Rápida"): guardar as células por linha e coluna, atualizar só o que mudou e salvar em segundo plano quando você para de digitar. <b>Meta: menos de 0,1 s por digitação</b> nessa mesma planilha (0,3 s em PC fraco). O arquivo salvo e o Excel gerado não mudam.</p>',
  'Aprova essa meta?', [], ''),
 ('A03', 'Auditoria visual no padrão do Cwork', GA,
  '<p>As mesmas medidas que usamos no Cwork, tela por tela, no PC (1366×700) e no celular (384×790).</p>' +
  tab(['Tela', 'Tamanhos de letra', 'Tipos de canto', 'Botões abaixo de 28 px', 'Maiúsculas espaçadas'], [
   ['Meta do Cwork', '5 a 7', '3', '0', '0'],
   ['Planilha · Página Inicial', '10', '5', '34 de 76', '2'], ['Planilha · Exibir', '10', '5', '25 de 65', '2'], ['Janela Validação de dados', '11', '6', '12', '2'], ['Janela Formatar como tabela', '11', '6', '11', '3'], ['Abrir Excel (relatório)', '11', '6', '0', '8'], ['Quadro', '10', '5', '10', '2'],
   ['Celular · Planilha', '6', '3', '39 de 40 abaixo de 44 px', '0'],
   ['<b>Modelo novo (item C01)</b>', '<b>5</b>', '<b>3</b>', '<b>0</b>', '<b>0</b>'],
  ]) + '<p>Passou: nenhum emoji, nenhuma rolagem de lado, console sem erros nas 42 telas medidas, nenhum nome de empresa fixo no código.</p>',
  'É isso que incomoda no visual? Falta algo que os números não mostram?', [('Hoje · Planilha no PC', 'atual-pc'), ('Hoje · janela de Validação', 'atual-valid')], 'par'),
 ('B01', 'Clones do Excel de código aberto: usar como referência, não trocar o motor', GB,
  '<p>Estudei os projetos abertos (Univer, FortuneSheet, Luckysheet, x-spreadsheet, Jspreadsheet, IronCalc, HyperFormula, SheetJS, ExcelJS, OnlyOffice) e testei o mais completo, o <b>Univer 1.4.0</b>, na mesma planilha de 360 mil células.</p>' +
  tab(['Medida', 'EFCdocs hoje', 'Univer (parte aberta)'], [
   ['Abrir e salvar Excel, gráficos, formas, imprimir', 'tem', '<b>só na versão paga</b>, que pede servidor e licença'],
   ['Tamanho do código', '1,5 MB, com Excel, gráficos, PDF e Quadro', '12 MB, sem Excel, gráficos e impressão'],
   ['Memória com a planilha aberta', '70 MB', '229 MB'], ['Digitar e Enter', '1,2 s (corrigível, item A02)', '0,65 s'], ['Inserir uma linha no topo', '1,8 s', '9,4 s'], ['Negrito em 20 mil células', '1,2 s', '8,2 s'], ['Mescladas com borda', 'com defeito', 'desenha certo'],
  ]) +
  '<p><b>Recomendação:</b> manter o motor do EFCdocs e reestruturar a base. O clone aberto não tem justamente o que você mandou manter (Excel, gráficos, imprimir), não é mais rápido no geral e pesa 8 vezes mais. Trocar tudo de uma vez também vai contra o Método Sabiá.</p>'
  '<p>O código aberto entra de três jeitos, com crédito no projeto:</p><ul><li><b>Referência</b> para o que fazemos mal: bordas de mescladas, tabela que cresce, Tab que abre linha, alça no canto (Univer e FortuneSheet, licenças Apache e MIT).</li><li><b>Conferentes de fora nos testes</b>: LibreOffice abre, recalcula e desenha o arquivo que o EFCdocs gravou; openpyxl e ExcelJS leem a estrutura. Já testei o LibreOffice aqui e funcionou.</li><li><b>Leitor de formatos antigos</b>: SheetJS para abrir .xls, .ods e .csv.</li></ul>'
  '<p class="obs">Nas imagens: a mesma planilha inventada, com mescladas que têm borda em todas as células. No EFCdocs a linha atravessa "EXEMPLO LAB" e aparece uma caixinha em C1.</p>',
  'Aprovado = sigo a recomendação. Reprovado = você quer trocar o motor pelo Univer mesmo assim (diga no comentário).', [('EFCdocs hoje: borda no meio da mesclada', 'd11-efcdocs'), ('Univer: mesclada desenhada certo', 'd11-univer')], 'um'),
 ('C01', 'Planilha no visual do Cwork · PC', GC,
  '<p>Desenho parado, com dados inventados, para aprovar a direção. Menu lateral, busca, título com traço dourado e abas iguais aos do Cwork; fontes Fraunces e Source Sans 3; dois temas (Claro e Escuro dourado). A grade ganha cabeçalhos em marfim, seleção em ouro e abas com ponto de cor.</p>'
  '<p>Todas as funções continuam: mudam de lugar, não somem.</p>',
  'A direção está certa?', [('Hoje', 'atual-pc'), ('Modelo · Claro', 'modelo-pc-claro'), ('Modelo · Escuro', 'modelo-pc-escuro')], 'um'),
 ('C02', 'Planilha no visual do Cwork · celular', GC,
  '<p>Barra de cima curta com o nome da planilha, abas que rolam de lado, botões de 44 px, abas da planilha e menu de baixo. Hoje 39 dos 40 botões têm menos de 44 px.</p>',
  'A direção está certa no celular?', [('Hoje', 'atual-cel'), ('Modelo · Claro', 'modelo-cel-claro'), ('Modelo · Escuro', 'modelo-cel-escuro')], 'tres'),
 ('C03', 'Faixa de comandos em uma linha', GC,
  '<p>Hoje a faixa tem dois andares e 34 dos 76 botões da Página Inicial têm menos de 28 px (o menor tem 18). No modelo ela tem <b>uma linha</b> com os comandos mais usados de cada aba, em botões de 36 px, e no fim um botão <b>"Todos os comandos"</b> que abre o resto da aba numa gaveta. A busca "O que você quer fazer?" continua achando qualquer comando.</p>'
  '<p class="obs">Se preferir manter os dois andares (mais comandos à vista, botões menores), reprove e diga no comentário.</p>',
  'Uma linha com "Todos os comandos"?', [], ''),
 ('D01', 'Base nova no padrão Sabiá', GD,
  '<ul><li><b>features.csv</b> no projeto: as 311 funções com a situação de cada uma (244 funcionam, 49 ainda não feitas, 10 com defeito, 4 parciais, 4 faltam). Vai junto nesta entrega.</li>'
  '<li><b>Módulos com fronteira</b> e <b>uma suíte de testes por módulo</b>, cada uma rodando sozinha. O arquivo de 3.707 linhas é dividido aos poucos, sem mudar comportamento.</li>'
  '<li><b>Planilha anonimizada como teste fixo</b>, com três conferentes de fora (LibreOffice, openpyxl e comparação célula a célula de ida e volta).</li>'
  '<li><b>Auditoria automática em toda versão</b>: visual por tela e rapidez, com metas escritas. Os programas de medir já estão em <code>scripts/auditoria/</code>.</li>'
  '<li><b>Visual do Cwork num lugar só</b>: cores, medidas e componentes base; fontes embutidas para funcionar sem internet; os 16 temas saem e ficam Claro e Escuro.</li>'
  '<li><b>docs/</b> com as regras: padrão visual, armadilhas do Excel, método e créditos do código aberto.</li></ul>',
  'Aprova essa base?', [], ''),
 ('D02', 'Plano de versões pequenas', GD,
  tab(['Versão', 'Nome', 'O que entra', 'Modelo · esforço'], [
   ['v0.6.10', 'Rede de segurança', 'Planilha anonimizada como teste, conferentes de fora, suíte por módulo, features.csv e docs; as 4 correções da v0.6.9.2', 'Opus 5 · alto'],
   ['v0.6.11', 'Básico que não funciona', 'Mescladas, linha cortada no congelado, título sob o botão de filtro, célula sem linha lateral, linha grossa', 'Opus 5 · alto'],
   ['v0.6.12', 'Rápida', 'Digitar em menos de 0,1 s; salvar em segundo plano; app carregado por partes', 'Fable 5.2 · alto'],
   ['v0.6.13', 'Cara do Cwork', 'Casca, faixa, janelas e celular no visual do Cwork; fontes embutidas; 2 temas', 'Opus 5 · alto'],
   ['v0.6.14', 'Tabelas vivas', 'Crescer ao digitar, Tab abre linha, alça no canto, aba Design, estilos de tabela do Excel', 'Opus 5 · alto'],
   ['v0.6.15', 'Imagens e objetos', 'Cortar, girar, moldura, frente e trás, mover com as células', 'Opus 5 · médio'],
   ['v0.6.16', 'Validação e mescladas', 'Prévia em frase, marcar inválidos, Mesclar através, refinamento', 'Sonnet 5.5 · alto'],
   ['v0.6.17', 'Planilhas comuns', 'Abrir .xls, .ods e .csv', 'Sonnet 5.5 · alto'],
   ['depois', 'v0.7.0 em diante', 'Documento, pastas, nuvem, ligação com o Cwork, v1.0', ''],
  ]) + '<p class="obs">Se quiser ver o visual novo antes da rapidez, diga no comentário que eu troco a v0.6.12 com a v0.6.13.</p>',
  'A ordem está boa?', [], ''),
 ('D03', 'A v0.6.9.2 entra junto na v0.6.10', GD,
  '<p>A v0.6.9.2 (bordas de células vazias, coluna oculta, imagem no celular, contagem de #REF!) está pronta e testada, mas você ainda não aprovou. Proposta: ela não é publicada sozinha; as 4 correções entram na v0.6.10 e passam pelos conferentes novos antes de ir ao ar.</p>',
  'Aprovado = entra junto na v0.6.10. Reprovado = publicar a v0.6.9.2 já.', [], ''),
 ('E01', 'Ferramenta de anonimização: rode na sua planilha', GE,
  '<p>O arquivo <b>anonimizar-planilha.html</b> vai nesta entrega. Abra com dois cliques (funciona sem internet), escolha a planilha e baixe a cópia. <b>Nada sai do seu computador.</b></p>'
  '<ul><li><b>Troca:</b> textos, números, datas, horas, textos entre aspas nas fórmulas, comentários, listas de validação, cabeçalho e rodapé, imagens (viram um quadro cinza), autor e empresa, links.</li>'
  '<li><b>Apaga:</b> dados da impressora, dados de fora, macros e o caminho da pasta do seu computador que o Excel grava dentro do arquivo.</li>'
  '<li><b>Mantém:</b> cores, bordas, larguras, mesclas, congelamento, colunas ocultas, tabelas, validações, a conta das fórmulas, os números 0 e 1 e os <b>nomes das abas e das tabelas</b> (a página lista todos para você conferir).</li>'
  '<li><b>Confere sozinha:</b> procura os textos do original dentro da cópia e avisa se sobrou algum.</li></ul>'
  '<p>Testei com 10 testes automáticos e na cópia da sua planilha que eu tinha no rascunho: a estrutura ficou idêntica (nenhuma diferença em células, estilos, mesclas, larguras e tabelas) e nada do original sobrou. A cópia abre no EFCdocs, no LibreOffice e no openpyxl.</p>'
  '<p class="obs"><b>O que só você pode conferir:</b> abrir a cópia no Excel de verdade. Se ele pedir para reparar o arquivo, não envie e me avise. Se abrir normal e os dados estiverem trocados, anexe a cópia na conversa: ela vira o teste fixo da v0.6.10.</p>',
  'A cópia abriu no Excel sem pedir reparo e os dados estão trocados?', [('A página depois de trocar os dados (amostra inventada)', 'anon-1'), ('No celular', 'anon-cel')], 'par'),
]
n = len(ITENS)
partes = []; grupo = None
for cod, titulo, g, texto, pergunta, fotos, estilo in ITENS:
    if g != grupo: partes.append(f'<h2 class="grupo">{E(g)}</h2>'); grupo = g
    figs = ''.join(f'<figure><figcaption>{E(leg)}</figcaption><img src="{img[k]}" alt="{E(leg)}"></figure>' for leg, k in fotos)
    partes.append(f'''<article class="item" data-cod="{cod}" data-titulo="{E(titulo)}">
  <div class="cab"><b class="cod">{cod}</b><h3>{E(titulo)}</h3></div>
  <div class="txt">{texto}<p class="q">{E(pergunta)}</p></div>
  {f'<div class="fotos {estilo}">{figs}</div>' if fotos else ''}
  <div class="resp">
    <label class="op sim"><input type="radio" name="{cod}" value="APROVADO"><span>Aprovado</span></label>
    <label class="op nao"><input type="radio" name="{cod}" value="REPROVADO"><span>Reprovado</span></label>
    <textarea placeholder="Comentário (opcional)" aria-label="Comentário {cod}"></textarea>
  </div>
</article>''')
modelo = open('scripts/aprovacao-cwork.modelo.html', encoding='utf-8').read()
out = (modelo.replace('{{ITENS}}', '\n'.join(partes)).replace('{{N}}', str(n)).replace('{{CHAVE}}', 'efcdocs-aprovacao-fase-0').replace('{{TITULO}}', 'EFCdocs · Fase 0')
       .replace('{{SUBTITULO}}', 'Varredura do sistema, estudo de fora, base nova e planilha anonimizada').replace('{{DATA}}', '11/11/2026')
       .replace('{{RESUMO}}', '<div class="nums"><div class="cx"><b>311</b><span>funções no features.csv</span></div><div class="cx"><b>317 + 249</b><span>testes passando</span></div><div class="cx"><b>42</b><span>telas medidas</span></div><div class="cx"><b>1,2 s</b><span>por digitação hoje</span></div><div class="cx"><b>0,1 s</b><span>meta</span></div><div class="cx"><b>' + str(n) + '</b><span>itens para decidir</span></div></div>'
                '<p>Nesta fase <b>nada do app mudou</b> e nada foi publicado. Medi o sistema, estudei os clones do Excel de código aberto, desenhei a Planilha no visual do Cwork e fiz a ferramenta de anonimização. Nada a configurar no Firebase.</p>'))
assert out.count('class="item"') == n and '{{' not in out
open(saida, 'w', encoding='utf-8').write(out); print('página:', saida, round(len(out) / 1024), 'KB', n, 'itens')
