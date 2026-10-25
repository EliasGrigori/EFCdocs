"""EFCdocs — monta a página de aprovação da v0.3.0 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
ITENS = [
    ('C01', 'Quadro livre com post-its, formas e setas presas', 'Post-its e Quadro (v0.3.0)',
     '<p>Post-it, quatro formas de fluxograma (Processo, Decisão, Início/Fim, Dados), texto solto e imagem. '
     'As setas ficam <b>presas</b>: arrastou o item, a seta vai junto. Seta reta ou em cotovelo, texto na seta (ex.: Sim/Não), inverter, uma ou duas pontas.</p>'
     '<p>Dois toques no vazio criam um post-it. Arrastar no vazio (mouse) seleciona vários; no celular, um dedo arrasta o quadro e dois dedos dão zoom.</p>',
     '', [('Antes (v0.2.0)', 'antes-quadro-novo'), ('Depois', 'depois-fluxograma')], ''),
    ('C02', 'Código automático Q-001 em cada item', 'Post-its e Quadro (v0.3.0)',
     '<p>Cada post-it e cada forma recebe um código na ordem de criação: Q-001, Q-002... O número de um item apagado não volta. '
     'O código aparece no canto do item, no Kanban, no PDF e na busca ("Localizar" acha por Q-007). Dá para esconder em Exibir › Códigos Q.</p>',
     'No plano estava só "Q-001". Entendi como esse código automático por item. É isso? Se era outra coisa, descreva no comentário.', [], ''),
    ('C03', 'Próximo passo e ligar com as setinhas', 'Post-its e Quadro (v0.3.0)',
     '<p>Com um item escolhido aparecem quatro setinhas em volta. <b>Tocar</b> numa cria o próximo passo daquele lado, já ligado. '
     '<b>Arrastar</b> até outro item liga os dois; soltar no vazio cria um item novo ali. Depois de Início ou Decisão, o próximo é um Processo.</p>'
     '<p>No computador: Tab cria o próximo passo à direita (Shift+Tab, abaixo), Enter escreve, Delete apaga, setas do teclado movem.</p>',
     '', [('Item escolhido (computador)', 'depois-selecao')], 'um'),
    ('C04', 'Alinhamento automático ao arrastar', 'Post-its e Quadro (v0.3.0)',
     '<p>Ao arrastar, se o centro do item chega perto do centro de outro, ele encaixa e aparece uma linha guia. É isso que deixa as setas retas no fluxograma (veja o C01). Segurar Alt desliga o encaixe.</p>',
     '', [], ''),
    ('C05', 'Barra da seleção com a lixeira no canto direito', 'Post-its e Quadro (v0.3.0)',
     '<p>No computador a barra flutua perto do item. No celular fica <b>presa embaixo</b>, para não cobrir itens nem setas. '
     'Ordem: cor, escrever, próximo passo, ligar, comentário, duplicar, detalhes e, separada no canto direito, a lixeira. '
     'Apagar mostra "Desfazer" no aviso.</p>',
     '', [('Celular', 'depois-celular-quadro')], 'cel'),
    ('C06', 'Kanban com os mesmos post-its', 'Post-its e Quadro (v0.3.0)',
     '<p>O Kanban é outra visão do mesmo quadro: cada post-it fica numa coluna (A fazer, Fazendo, Feito). Arrastar o cartão muda a coluna; o post-it continua no mesmo lugar no quadro livre. '
     'Colunas: criar, renomear, mover para os lados e tirar (só vazia). No celular, o cartão arrasta pela alça (mãozinha), para o dedo ainda rolar a coluna.</p>'
     '<p>Formas de fluxograma não entram no Kanban, só post-its.</p>',
     '', [('Computador', 'depois-kanban'), ('Celular', 'depois-celular-kanban')], ''),
    ('C07', 'Raias por setor, temporizador, minimapa, zoom e localizar', 'Post-its e Quadro (v0.3.0)',
     '<p>Raias: três faixas (Setor 1, 2, 3) atrás de tudo; arrastar a raia leva junto o que está dentro. Temporizador de reunião (5, 10, 15, 30 min) com aviso e vibração no fim. '
     'Minimapa e zoom (botões, Ctrl+roda, dois dedos). Localizar e substituir no quadro.</p>'
     '<p>Painel lateral (Detalhes) mostra o item escolhido: código, cor, coluna do Kanban, comentário e link.</p>',
     '', [('Painel, temporizador e minimapa', 'depois-painel-temporizador')], 'um'),
    ('C08', 'Exportar PDF paisagem, PNG e imprimir', 'Post-its e Quadro (v0.3.0)',
     '<p>PDF A4 paisagem com o nome do quadro e data no topo e a origem no rodapé. Na visão Kanban, exporta as colunas; no quadro, o quadro inteiro. '
     'PNG em alta resolução. Imprimir já sai em paisagem. No modo demonstração sai a marca "DEMO · EFC".</p>',
     '', [('Página do PDF gerado', 'pdf-1')], 'um'),
    ('C09', 'Perfil Operador também edita o quadro', 'Post-its e Quadro (v0.3.0)',
     '<p>Entrou na tabela de perfis a linha "mexer no quadro": Admin, Editor e Operador podem; Leitor só vê (aparece "Só leitura"). '
     'O motivo: quadro é ferramenta de reunião, todo mundo da equipe põe post-it. Texto de POP e formulário continua só para Admin e Editor.</p>',
     'Operador (Secundário) pode mexer no quadro?', [], ''),
    ('C10', 'Etiqueta "em breve" no menu (achado 3 do Grok)', 'Achados do Grok',
     '<p>Antes aparecia "v0.8.0" sem explicação. Agora aparece "em breve"; parar o mouse mostra "chega na v0.8.0", e a página abre com um aviso amarelo explicando.</p>',
     '', [('Antes (v0.2.0)', 'antes-inicio'), ('Depois', 'depois-inicio')], ''),
    ('C11', 'Tema Petróleo como tema padrão (achado 2 do Grok)', 'Achados do Grok',
     '<p>Criei o tema <b>Petróleo</b> com as cores do ícone e da abertura (petróleo e âmbar). Ele já está nas Opções como 17º tema. '
     'O padrão continua Claro (ou Escuro, se o aparelho estiver no escuro), como na v0.2.0.</p>',
     'Aprovado = o Petróleo vira o tema padrão de quem abre pela primeira vez. Reprovado = fica só como opção.', [('Antes: Opções (v0.2.0)', 'antes-opcoes'), ('Depois: tema Petróleo', 'depois-petroleo-inicio')], ''),
    ('C12', 'Barra de módulos no celular (achado 4 do Grok)', 'Achados do Grok',
     '<p>No celular, fora de um arquivo, aparece embaixo uma barra com Início, Planilhas, Documentos, Post-its e Mais (pastas, externos e lixeira). Dentro de um arquivo ela some, para sobrar espaço.</p>',
     '', [('Antes (v0.2.0)', 'antes-celular'), ('Depois', 'depois-celular')], 'cel'),
    ('C13', 'Cor de fundo do app instalado igual à abertura (achado 5 do Grok)', 'Achados do Grok',
     '<p>A cor de fundo do app instalado passou de #0e2d37 para #143c47, o tom do meio da abertura. Assim o app não pisca outro tom ao abrir. Só aparece no app instalado (conferir no celular).</p>',
     '', [], ''),
    ('C14', 'Aviso "chega na" diz de qual módulo é', 'Correções',
     '<p>O aviso do seu print ("Exportar PDF chega na v0.5.0") estava certo para a planilha, mas sem dizer isso. Agora fica: "Exportar PDF" da planilha chega na v0.5.0. No quadro, o PDF já funciona.</p>',
     '', [('Depois', 'depois-aviso-pdf')], 'um'),
    ('C15', 'A página não recarrega mais sozinha na primeira visita', 'Correções',
     '<p>Defeito que vinha da v0.2.0: na primeira vez que alguém abria o app, a página recarregava sozinha cerca de 1 segundo depois. Se a pessoa já estivesse tocando em algo, perdia o toque. Agora só recarrega quando há versão nova de verdade (e com o seu toque em "Versão nova pronta").</p>',
     '', [], ''),
    ('C16', 'Código-fonte guardado no GitHub (pasta fonte/)', 'Organização',
     '<p>Para não perder o código de novo, o repositório passa a ter a pasta <b>fonte/</b> com o código, os testes e o script que monta o app. O app publicado continua na raiz, igual. '
     'Também vai na entrega o zip "fonte-EFCdocs-v0.3.0". O repositório é público; não há senha, chave nem dado real no código.</p>',
     '', [], ''),
]

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
saida_html = modelo.replace('{{ITENS}}', '\n'.join(partes)).replace('{{TAMANHO}}', html.escape(tamanho))
assert saida_html.count('class="item"') == 16
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
