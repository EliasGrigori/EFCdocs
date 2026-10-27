"""EFCdocs — monta a página de aprovação da v0.5.1 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" <testes-de-regras> <testes-no-navegador>"""
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.5.1'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
GA, GB, GC, GD, GE, GF = ('A. Listas suspensas e validação de dados', 'B. Cores por regra (formatação condicional)', 'C. Comentários nas células',
                          'D. Abrir e salvar como Excel', 'E. O que o Grok achou na v0.5.0', 'F. Decisões')
ITENS = [
    ('F01', 'Lista suspensa na célula (a que vem do Excel e a que você cria)', GA,
     '<p>A amostra traz uma lista em <b>Coletas!B2:B41</b> (Entrada, Reservatório, Rede 1, Rede 2, Bebedouro). Ao escolher a célula aparece uma <b>seta quadrada</b> no canto direito; clicar nela (ou <b>Alt+↓</b>) abre a lista com o valor atual em destaque. Dá para andar com ↑/↓, <b>digitar letras</b> para saltar ao item, <b>Enter/Tab</b> para escolher e <b>Esc</b> para fechar. Escolher grava na célula e entra no <b>Desfazer</b>. No celular a seta aparece ao tocar na célula. Como no Excel, se a regra <b>não</b> pede alerta de erro, digitar "Livre" é aceito.</p>',
     'A seta e a lista estão do jeito que você esperava? Algum atalho que você usa no Excel e faltou?',
     [('Antes (v0.5.0): a lista do Excel não vinha', 'antes-planilha'), ('Depois: seta e lista aberta', 'depois-lista')], 'par'),
    ('F02', 'Validação de dados: Dados › Validação de dados', GA,
     '<p>Janela com três abas, como no Excel: <b>Regra</b> (Permitir: Lista, Número inteiro, Decimal, Data, Hora, Tamanho do texto, Personalizado; entre, maior que…; aceitar vazio; mostrar a seta), <b>Aviso ao selecionar</b> (balão com título e mensagem ao lado da célula) e <b>Alerta de erro</b> (<b>Parar</b>, <b>Avisar</b> ou <b>Informar</b>, com a sua mensagem). A lista pode ter itens escritos ali ou uma <b>faixa/nome</b> (por exemplo, <code>Apoio!A2:A20</code>). Como no Excel, o que é <b>digitado</b> é conferido; conta (<code>=...</code>), colagem e preenchimento <b>não</b> são barrados. As regras acompanham inserir e excluir linhas e colunas.</p>',
     'Os textos das mensagens e os três estilos de alerta estão claros?',
     [('Janela da regra (número inteiro de 1 a 10)', 'depois-validacao'), ('Balão "Aviso ao selecionar" na célula', 'depois-aviso-celula'), ('Alerta Parar ao digitar 50', 'depois-valerro')], 'um'),
    ('F03', 'Cores por regra: Formatação condicional', GB,
     '<p>A regra da amostra (<b>Coletas!C2:C41 maior que 2 = fundo rosa</b>) agora aparece na grade: mude C3 para 3 e a célula fica rosa; volte para 0,7 e a cor some. A janela <b>Formatação condicional</b> lista as regras que vieram, deixa criar outras (valor da célula, fórmula, texto que contém/começa/termina, repetidos/únicos, vazias, erros, maiores/menores N ou %, acima/abaixo da média), com modelos de cor (Amarelo, Vermelho, Verde…) ou cor sua; a regra nova fica <b>em cima</b>, há ↑/↓, lápis, lixeira e "Se valer, não olhar as de baixo". <b>Barras de dados, escalas de cor e ícones ainda não vêm</b> (o relatório do Excel diz isso).</p>',
     'Dos tipos de regra, falta algum que você usa muito nas suas planilhas?',
     [('Lista de regras: a que veio do Excel', 'depois-condicional-lista'), ('Nova regra "texto contém Rede" em amarelo', 'depois-condicional-nova'), ('Grade com as duas regras funcionando', 'depois-condicional-grade')], 'um'),
    ('F04', 'Comentários nas células', GC,
     '<p>Célula com comentário tem um <b>triângulo vermelho</b> no canto; passar o mouse mostra o balão (no celular, ao escolher a célula). <b>Revisão › Comentário</b>, botão direito › <b>Novo comentário</b> ou <b>Shift+F2</b> abre a janela para escrever, editar ou excluir; o nome de quem escreve fica lembrado no aparelho. <b>Revisão › Comentários da aba</b> lista todos e leva até a célula. Comentário de "conversa" do Excel 365 vem com as respostas, e o aviso diz que, ao salvar, vira anotação comum.</p>',
     'O balão e a janela estão bons? Quer ver as respostas das conversas na janela de edição?',
     [('Balão ao passar o mouse na B2', 'depois-balao'), ('Janela do comentário novo', 'depois-comentario')], 'par'),
    ('F05', 'Salvar como Excel leva tudo isso (e abre igual de volta)', GD,
     '<p>Arquivo › <b>Salvar como Excel</b> grava a lista suspensa, a validação, as regras de cor e os comentários (como anotações). Conferi abrindo o arquivo gravado de novo no EFCdocs e no teste automático: tudo volta igual. <b>Falta conferir no seu Excel de verdade</b> (eu não tenho Excel aqui): abra um arquivo salvo e veja Formatação Condicional › Gerenciar Regras, Dados › Validação de Dados e as anotações.</p>',
     'Abriu no seu Excel sem reclamar? A lista, as cores e as anotações estão lá?', [], ''),
    ('F06', 'Relatório antes de abrir, refeito (E02 que você reprovou)', GD,
     '<p>Pedido seu: "texto mais bonito, box ao redor, destaques amarelo, vermelho e verde, outras cores coerentes". Agora são <b>quadros de cantos retos</b> com título e contagem: números no topo (Abas, Células, Fórmulas em azul, Arquivo), caixa <b>Veio</b> (verde), caixa <b>Ficou de fora</b> (vermelha, só aparece se houver), caixa <b>Bom saber</b> (amarela, com o corte e o nome da aba em destaque) e nota azul no rodapé. Validação, formatação condicional e comentários saíram de "Ficou de fora" e entraram em "Veio". Sem rolagem lateral no celular; funciona nos temas claro e escuro.</p>',
     'Agora ficou do jeito que você queria? O que mudaria?',
     [('Antes (v0.5.0)', 'antes-relatorio'), ('Depois: caixas Veio, Bom saber e nota', 'depois-relatorio'), ('Depois: o fim do relatório', 'depois-relatorio-fim')], 'um'),
    ('G01', 'Cor da aba que vem do Excel aparece na aba', GE,
     '<p>Achado do Grok: a aba Coletas (verde no Excel) não ficava verde na tela. Já existia uma faixa de 3 px, quase invisível. Agora é uma <b>faixa de 5 px embaixo</b> mais um <b>fundo suave</b> da cor da aba.</p>',
     'Dá para ver bem a cor? Está exagerada?',
     [('Antes: faixa fina', 'antes-aba'), ('Depois: faixa de 5 px e fundo suave', 'depois-aba')], 'par'),
    ('G02', 'FILTRO, ÚNICO e CLASSIFICAR de arquivos do LibreOffice agora espalham', GE,
     '<p>Achado do Grok: num arquivo salvo pelo LibreOffice, o <code>FILTRO</code> dava #VALOR! e o <code>ÚNICO</code> não espalhava, porque o arquivo não trazia a marca de "matriz dinâmica". Funções que só existem no Excel novo (FILTRO, ÚNICO, CLASSIFICAR, SEQUÊNCIA, XLOOKUP, LET…) agora são <b>sempre</b> matriz dinâmica. Teste automático novo cobre isso. Conta comum continua como "do Excel antigo".</p>', '', [], ''),
    ('G03', 'Verificação: o erro que já veio do Excel é aviso, não "1 erro"', GE,
     '<p>Achado do Grok: ao abrir a amostra, a Verificação mostrava "1 erro" (o <code>#DIV/0!</code> que já estava no Excel, em Resumo!B13). Agora o botão mostra <b>1 aviso</b> e o texto começa com <b>"Já veio do Excel com este erro."</b> Erros que o EFCdocs causar continuam como erro.</p>',
     'Ficou claro a diferença entre aviso e erro?',
     [('Antes: "1 erro"', 'antes-verificacao'), ('Depois: "1 aviso" com "Já veio do Excel"', 'depois-verificacao')], 'par'),
    ('G04', 'Menu Novo fecha com Esc e com clique fora', GE,
     '<p>Achado do Grok (já da v0.4.9): o menu <b>Novo</b> ficava aberto. Agora fecha com <b>Esc</b> (de qualquer lugar) e com clique fora.</p>', '', [], ''),
    ('G05', 'Celular: desfazer, refazer e Abas ficam fixos na barra rápida', GE,
     '<p>Achado do Grok: em telas estreitas, desfazer/refazer/Abas saíam da tela. Agora ficam <b>fixos na ponta direita</b> da barra; só o resto rola. Verificado em 360, 390 e 412 px de largura.</p>', '',
     [('Antes', 'antes-cel-barra'), ('Depois', 'depois-cel-barra')], 'par'),
    ('G06', 'Abrir Excel e Salvar como Excel não repetem em Dados', GE,
     '<p>Achado do Grok: os botões apareciam em Arquivo e em Dados. Agora ficam só em <b>Arquivo</b>; Dados mantém o que é de dados.</p>', '', [], ''),
    ('G07', 'Ctrl+A dentro da célula em edição seleciona todo o texto', GE,
     '<p>Achado meu, ao testar: dentro da célula, Ctrl+A mandava o cursor para o começo em vez de selecionar tudo (isso já era assim antes). Corrigido; digitar depois troca o texto todo, como no Excel.</p>', '', [], ''),
    ('D01', 'Salvar fora do sistema: tudo sai como Excel (.xlsx)', GF,
     '<p>Você pediu que todo salvar fora saia como Excel. Conferi: a planilha só leva arquivo para fora como <b>.xlsx</b> (Salvar como Excel). PDF e Imprimir da planilha dizem "chega na v0.6.0" e não baixam nada. Não existe botão que baixe CSV ou JSON da planilha. Quando houver PDF (v0.6.0), ele será a única exceção, e só se você pedir.</p>',
     'Está de acordo? PDF fica como exceção só para impressão?', [], ''),
    ('D02', 'Temas Sálvia e Gelo: continuam escuros?', GF,
     '<p>Os dois vêm do EFClaudian e têm fundo escuro, por isso ficam em <b>Escuros</b>, o que o Grok estranhou pelo nome. Opções: (1) deixar como está; (2) <b>trocar o nome</b> para algo que combine com escuro; (3) criar versões <b>claras de verdade</b> de Sálvia e Gelo (e manter as escuras).</p>',
     'Qual opção? (1, 2 ou 3)', [], ''),
    ('D03', 'Parecer sobre os dois estudos de gráficos (para a v0.6.0)', GF,
     '<p>Li os dois PDFs; o parecer completo vai junto (<code>PARECER-GRAFICOS-EFCdocs.md</code>). Em resumo: <b>adotar</b> ECharts sob medida, gráfico recomendado + prévia, "Baixar original" (guardar o arquivo importado intacto), carta de controle e Pareto primeiro. <b>Não trazer</b> SheetJS, ExcelJS, xlsx-populate, Dexie, zod nem Gridstack: o EFCdocs já lê e grava .xlsx com motor próprio. <b>Evitar</b> cantos arredondados, vidro e neon (você pediu cantos retos). <b>Risco principal</b>: gráfico nativo dentro do .xlsx exige gravar as partes de desenho do Excel (colunas, barras, linha, área, pizza, dispersão, combinado); tipos que o Excel não tem (mapa de calor, funil, gauge…) iriam como imagem com aviso. <b>Divisão proposta</b>: v0.6.0 = gráficos essenciais + PDF/Imprimir completo + Baixar original; v0.6.1 = tipos da fase 2; v0.7.0 Docx + assinatura; v0.8.0 pastas, externos, nuvens; painéis estilo Power BI depois da v1.0.</p>',
     'Concorda com ECharts sob medida, sem biblioteca nova de Excel, gráfico nativo nos tipos simples, botão "Baixar original", e painéis só depois da v1.0? Falta algum tipo de gráfico que você usa no dia a dia?', [], ''),
    ('V01', 'Publicação da v0.5.1', GF,
     '<p>Depois da sua aprovação, publico a v0.5.1 no GitHub (commit só com esta versão). Os seus 4 arquivos <b>não</b> vão para o GitHub nem para os pacotes: o teste usa uma amostra inventada. <b>Nada a configurar no Firebase.</b> Limitações que seguem (vão para a lista de erros): copiar e colar uma célula <b>não leva</b> a lista, a regra de cor nem o comentário junto (entra na v0.6.0); conta digitada, colagem e preenchimento não são conferidas pela validação (igual ao Excel).</p>',
     'Pode publicar? (diga se quer algum ajuste antes)', [], ''),
    ('V02', 'Próxima versão', GF,
     '<p><b>v0.6.0 · Opus 5.5 · esforço alto</b>: gráficos essenciais e PDF/Imprimir completo da planilha (paginação, títulos repetidos, escala, área de impressão, quebras, prévia; como você pediu no D01 da v0.5.0, usando o Excel como exemplo), mais "Baixar original", conforme o parecer (D03).</p>',
     'Posso seguir para a v0.6.0 depois da publicação?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A v0.5.1 traz <b>listas suspensas</b>, <b>validação de dados</b>, <b>cores por regra</b> e <b>comentários</b>, lidos do Excel e salvos de volta, e refaz o <b>relatório antes de abrir</b>.</li>'
    '<li>Corrige o que o Grok achou na v0.5.0: cor da aba, FILTRO/ÚNICO do LibreOffice, "1 erro" que já era do Excel, menu Novo, barra do celular e botões repetidos.</li>'
    '<li>Anexos: parecer sobre os dois PDFs de gráficos (item D03). Os prints usam só uma amostra inventada; os seus arquivos não foram para o GitHub nem para os pacotes. Nada a configurar no Firebase.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Listas, cores por regra e comentários')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
