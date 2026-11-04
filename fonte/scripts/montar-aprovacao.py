"""EFCdocs — monta a página de aprovação da v0.6.8 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" <testes-de-regras> <testes-no-navegador>"""
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.6.8'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
GA = 'A. O que você viu no Excel de verdade'
GB = 'B. Tela da planilha'
GC = 'C. Relatório do Grok da v0.6.6'
GD = 'D. Relatório do Grok da v0.6.7 (Painel e aba Gráfico)'
GP = 'P. Publicação'
ITENS = [
    ('A01', 'O Excel não pede mais para reparar as fórmulas', GA,
     '<p>Achei a causa provável do "Registros Removidos: Fórmula" nas abas 1, 4 e 6 (as auxiliares e a de validação, cheias de FILTRO, ÚNICO e LET):</p><ul><li>a função de <b>dentro</b> perdia a marca do Excel (<code>CLASSIFICAR(ÚNICO(...))</code> saía com o ÚNICO sem a marca);</li><li>os nomes do <b>LET/LAMBDA</b> perdiam a marca deles (<code>_xlpm.</code>) e o Excel não aceita;</li><li>o TRIMRANGE saía sem a marca.</li></ul><p>Agora a fórmula que <b>ninguém mexeu volta exatamente como veio</b> do arquivo, as que o EFCdocs escreve ganham todas as marcas, e antes de salvar ele confere cada fórmula: se alguma não fosse aceita, vai só o valor e o aviso diz a célula. Também: a área do FILTRO que caísse por cima de uma célula com fórmula não vai mais (o Excel apagava a fórmula).</p>',
     'Abra o arquivo salvo no seu Excel: ainda pede para reparar?', [], ''),
    ('A02', 'Velocímetros e logotipo do tamanho certo (colunas ocultas)', GA,
     '<p>Este era o motivo dos <b>2 velocímetros que sumiram</b> (viraram um ponto) e do <b>logotipo pequeno</b>: eles passam por cima de <b>colunas ocultas</b>, e na conta da posição o EFCdocs parava na coluna oculta; o Excel então encolhia o objeto até a borda dela. Agora a coluna (ou linha) oculta é pulada. Na amostra inventada (colunas C e F ocultas) o arquivo salvo abre igual ao original.</p>',
     'Os velocímetros e o logotipo voltaram no seu Excel?', [('Antes (v0.6.7): salvo, no LibreOffice', 'antes-v068-lo'), ('Depois (v0.6.8): salvo, no LibreOffice', 'depois-v068-lo')], 'par'),
    ('A03', 'Velocímetro continua dentro do grupo', GA,
     '<p>O gráfico que estava <b>dentro de um grupo</b> (o painel com o nome do local) volta para dentro do grupo no arquivo salvo. Mover o grupo no EFCdocs leva o gráfico junto. Se você mudar só o gráfico de lugar, ele vai solto (como antes).</p>',
     'Aprovado?', [], ''),
    ('A04', 'Proteção das abas: aparece no relatório e volta com a senha', GA,
     '<p>O relatório da importação agora mostra <b>Abas protegidas</b> (quantas e quais): no EFCdocs elas ficam travadas e o arquivo salvo sai protegido, com a mesma senha. Na amostra inventada funciona; o Grok disse que na sua não veio. Se o relatório da sua planilha não mostrar a linha "Abas protegidas", me conte (aí é outro jeito de proteger que eu ainda não li).</p>',
     'Na sua planilha, o relatório mostra as abas protegidas?', [('Antes: relatório', 'antes-relatorio-v068'), ('Depois: relatório com "Abas protegidas"', 'depois-relatorio-v068')], 'par'),
    ('A05', 'Logotipo uma vez só, aviso das macros, comentários e filtro antigo', GA,
     '<p>A mesma imagem em várias abas vai <b>uma vez só</b> no arquivo (antes 7 vezes). Arquivo com macros: ao salvar, o aviso diz que <b>as macros e o botão "IMPRIMIR SEMANA"</b> não vão (o arquivo sai .xlsx). O relatório conta os comentários juntos ("12 comentários (9 eram conversas do Excel 365...)"). O filtro volta com o nome escondido que o Excel usa (<code>_FilterDatabase</code>).</p>',
     'Aprovado?', [], ''),
    ('B01', 'Toque no cabeçalho congelado com zoom: a seleção fica no lugar', GB,
     '<p>Reproduzi com a amostra inventada: congelado até a linha 7, zoom 80%, rolado lá embaixo, toque em <b>C7</b> (PONTO DE COLETA): o quadro aparecia em <b>C1:C6</b>. Era a conta da borda de baixo da <b>última linha congelada</b>. Corrigido em todos os lugares que usam essa conta (seleção, mescladas, borda, editor).</p>',
     'Aprovado?', [('Antes (v0.6.7)', 'antes-selecao'), ('Depois (v0.6.8)', 'depois-selecao')], 'par'),
    ('B02', 'Rolagem com linhas congeladas anda de linha em linha (como o Excel)', GB,
     '<p>Ao rolar para cima aparecia uma linha <b>cortada pela metade</b> logo abaixo do cabeçalho, como se passasse por cima das congeladas. Agora, com linhas (ou colunas) congeladas, a rolagem anda de <b>linha em linha</b>, como no Excel.</p>',
     'Aprovado?', [('Antes: no meio da rolagem', 'antes-rolagem'), ('Depois', 'depois-rolagem')], 'par'),
    ('B03', 'Grade, bordas e cores nítidas (tela em 125% ou 150%)', GB,
     '<p>No Windows com a tela em 125% (muito comum em notebook), a linha de 1 ponto caía entre dois pixels da tela: o preto virava <b>cinza borrado</b>, a grade ficava grossa e clara, e aparecia uma faixa clara entre células pintadas (as cores pareciam menos vivas). Agora grade, bordas e fundos ficam <b>no pixel da tela</b>. Prints ampliados 3 vezes, tela em 125%.</p>',
     'No seu notebook ficou com a nitidez do Excel?', [('Antes', 'antes-nitidez'), ('Depois', 'depois-nitidez')], 'par'),
    ('B04', 'Celular sem rolar na aba de coleta: não consegui reproduzir', GB,
     '<p>Com a amostra inventada (congelada até a 7, linhas 8 a 12 ocultas, logotipo grande) a rolagem funciona no celular (390 px, toque). No seu print aparecia "Versão nova pronta. Toque para atualizar": pode ter sido a versão antiga. Corrigi uma coisa parecida no Painel (o dedo não rolava a lista).</p>',
     'Atualize e teste de novo: ainda não rola? O dedo começa em cima dos dados, do cabeçalho ou do logotipo?', [], ''),
    ('C01', 'Grok v0.6.6: painel espalhado já vem numa página; Alt+Enter respeita a altura', GC,
     '<p><b>Imprimir</b>: vale o <b>conjunto</b> de formas e gráficos espalhados pela aba (não só a maior forma): o Painel da amostra-v066 já vem em "Aba toda numa página", deitado, com o aviso. <b>Alt+Enter</b>: altura escolhida à mão no Excel (mesmo igual à padrão) fica guardada e a linha não cresce.</p>',
     'Aprovado?', [('Antes: Imprimir', 'antes-imprimir-v066'), ('Depois: Imprimir', 'depois-imprimir-v066')], 'par'),
    ('C02', 'Grok v0.6.6: girar e furo em Tipo e dados; tabela sem estilo; zeroHeight; versão no menu; texto das formas no PDF', GC,
     '<p><b>Girar</b> e <b>Tamanho do furo</b> ficam em <b>Tipo e dados</b> (também no velocímetro do Excel), com nome para o leitor de tela. Tabela que não tinha estilo volta <b>sem estilo</b>. Com zeroHeight, linha oculta e vazia não vai listada (arquivo menor). A versão aparece também no <b>menu lateral</b>. No PDF, o texto das formas fica <b>pesquisável</b> (texto invisível por cima do desenho).</p>',
     'Aprovado?', [('Depois: girar e furo em Tipo e dados', 'depois-furo')], 'um'),
    ('D01', 'Grok v0.6.7: Ctrl+Z de um passo, Ctrl+P no Painel, tema escuro', GD,
     '<p><b>Ctrl+Z</b> no Painel desfazia dois passos (o painel e o app desfaziam juntos): agora um só. <b>Ctrl+P</b> e <b>Arquivo › Imprimir</b> no Painel baixam o PDF do painel (uma página) com o aviso "abra e imprima". No <b>tema escuro</b> o quadro do painel fica escuro e o texto solto aparece; o gráfico do Excel no painel fica com as cores dele.</p>',
     'Aprovado?', [('Antes: tema escuro', 'antes-painel-escuro'), ('Depois: tema escuro', 'depois-painel-escuro')], 'par'),
    ('D02', 'Grok v0.6.7: celular, meta nas barras deitadas e o resto', GD,
     '<p><b>Celular</b>: com peças no painel, os botões <b>Gráfico / Número / Texto / Tabela</b> ficam no fim da lista; texto comprido empurra a peça de baixo; o dedo rola a lista. <b>Barras deitadas</b>: a linha da meta arrasta para o lado. O 9º estilo <b>avisa</b> qual sai; o estilo guardado não leva as barras de erro; "<b>Nova tabela</b> no painel"; colar no painel avisa; <b>Arquivo › Versões</b> abre a linha do tempo; o PNG do gráfico sai com <b>fundo branco</b> (o ponteiro preto sumia em fundo escuro).</p>',
     'Aprovado?', [('Depois: celular', 'depois-celular-painel'), ('Depois: meta nas barras deitadas', 'depois-meta-deitada')], 'par'),
    ('P01', 'Publicação: v0.6.7 e v0.6.8 juntas', GP,
     '<p>A v0.6.7 (Painel e aba Gráfico) ainda não foi publicada. Proponho publicar as duas juntas, como <b>v0.6.8</b>, depois da sua aprovação (um commit só). Os seus arquivos não vão para o GitHub nem para os pacotes. <b>Nada a configurar no Firebase.</b></p>',
     'Pode publicar a v0.6.7 e a v0.6.8 juntas?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>O que você viu no Excel de verdade: fórmulas sem "reparo", velocímetros e logotipo do tamanho certo (colunas ocultas), velocímetro dentro do grupo, proteção das abas, logotipo uma vez só e avisos.</li>'
    '<li>Tela: seleção no cabeçalho congelado com zoom, rolagem de linha em linha com congelamento, grade e bordas nítidas na tela em 125%.</li>'
    '<li>Relatórios do Grok da v0.6.6 e da v0.6.7 (Painel e aba Gráfico).</li>'
    '<li>Testado com uma amostra inventada que imita a estrutura da sua planilha (amostra-v068.xlsx); a sua planilha não entrou nos testes. Nada a configurar no Firebase.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Correções do Excel de verdade e do Grok')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
