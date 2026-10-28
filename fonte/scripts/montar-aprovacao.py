"""EFCdocs — monta a página de aprovação da v0.6.3 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" <testes-de-regras> <testes-no-navegador>"""
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.6.3'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
GB, GF, GX, GD = 'A. Os 10 botões da planilha que faltavam', 'B. Faixa e aparência', 'C. Excel', 'D. Decisões e lembretes'
ITENS = [
    ('B01', 'Classificar (A a Z, menor a maior, por mais de uma coluna)', GB,
     '<p>Dados › <b>Classificar</b> abre uma janela: você escolhe a coluna, a ordem e pode somar <b>mais níveis</b> (ex.: Ponto e depois Data). Reconhece número, data e texto e deixa o <b>cabeçalho</b> no lugar. Linhas escondidas por um filtro ficam onde estão. Desfaz com Ctrl+Z.</p>',
     'A janela está clara? Faltou alguma opção que você usa no Excel?',
     [('Antes: botão "chega na v0.6.3"', 'antes-dados-tela'), ('Depois: janela Classificar', 'v063-classificar')], 'par'),
    ('B02', 'Filtrar, com seta no título e "Reaplicar"', GB,
     '<p>Dados › <b>Filtrar</b> põe uma seta em cada título. A seta abre uma lista com as opções da coluna (marcar e desmarcar) e quantas linhas aparecem. O filtro acompanha o que o Excel grava: abre e salva o filtro do arquivo. Pedi a mais um botão, <b>Reaplicar</b>, que refaz o filtro depois que você mudou os dados.</p>',
     'O menu da seta ficou fácil? Aprova o botão Reaplicar?',
     [('Menu da seta', 'v063-filtro-menu'), ('Filtro ligado', 'v063-filtro-ativo')], 'par'),
    ('B03', 'Remover duplicados', GB,
     '<p>Dados › <b>Duplicados</b> mostra <b>quantas linhas repetidas</b> existem olhando as colunas que você marcar, e só depois remove (mantém a primeira de cada). Dá para desfazer.</p>',
     'Mostrar a quantidade antes de remover é o suficiente?', [('Depois', 'v063-duplicados')], 'um'),
    ('B04', 'Travar modelo (proteger a aba)', GB,
     '<p>Revisão › <b>Travar</b>: a aba fica protegida e só as células que você <b>liberar</b> aceitam digitação. É uma trava <b>sem senha</b>, para evitar acidente (a janela diz isso; qualquer pessoa destrava). Se o arquivo veio do Excel com senha, o EFCdocs <b>mantém</b> a senha ao salvar de volta.</p>',
     'Uma trava sem senha, com o aviso claro, serve para o uso do dia a dia?', [('Janela', 'v063-travar-janela'), ('Aba travada: o aviso aparece ao tentar mudar', 'v063-travar')], 'par'),
    ('B05', 'Formatar como tabela', GB,
     '<p>Inserir › <b>Tabela</b>: escolhe o estilo (cores do cabeçalho e listras), o nome, se tem cabeçalho, e já liga o <b>filtro</b>. O nome pode ser usado nas contas.</p>',
     'Os estilos de tabela estão bons?', [('Janela', 'v063-tabela'), ('Tabela pronta', 'v063-tabela-pronta')], 'par'),
    ('B06', 'Coluna de status', GB,
     '<p>Inserir › <b>Coluna de status</b> cria numa coluna a <b>lista suspensa</b> (ex.: Pendente, Em andamento, Concluído) com uma <b>cor para cada opção</b>.</p>',
     'Os nomes e as cores de fábrica servem?', [('Janela', 'v063-status'), ('Pronta', 'v063-status-pronto')], 'par'),
    ('B07', 'Link na célula', GB,
     '<p>Inserir › <b>Link</b>: para internet, e-mail ou para <b>outra aba</b> da planilha. Só aceita endereços seguros (https, e-mail). Aparece um botão <b>Abrir</b> ao lado da célula. O link fica dentro da célula, então <b>acompanha</b> a célula ao classificar, copiar e inserir linhas.</p>',
     'O botão "Abrir" ao lado da célula está bom?', [('Depois', 'v063-link')], 'um'),
    ('B08', 'Botão que leva a outra aba', GB,
     '<p>Inserir › <b>Botão de aba</b>: um botão sobre a planilha com o nome e a cor que você quiser. Clicar leva à aba (e à célula) escolhida; Ctrl+clique seleciona o botão para mudar; Delete exclui.</p>',
     'Clicar leva e Ctrl+clique seleciona: dá para entender?', [('Depois', 'v063-botao')], 'um'),
    ('B09', 'Imagem na planilha', GB,
     '<p>Inserir › <b>Imagem</b>: escolhe o arquivo (PNG, JPG, WebP ou GIF), a figura entra <b>sem deformar</b>, você arrasta, puxa o canto (mantém a proporção) e dá dois cliques para mudar o tamanho exato e o texto alternativo.</p>',
     'Está bom para logotipo e foto do local?', [('Depois', 'v063-imagem')], 'um'),
    ('B10', 'Ortografia', GB,
     '<p>Revisão › <b>Ortografia</b> liga e desliga o <b>corretor do seu aparelho</b> nos campos de texto da célula (sublinha o erro em vermelho). Não é um corretor do EFCdocs: é o do navegador, por isso a lista de palavras e o idioma dependem do aparelho.</p>',
     'Usar o corretor do aparelho resolve, ou você quer um corretor próprio mais para frente?', [], ''),
    ('F01', 'Aba "Gráfico" que aparece sozinha', GF,
     '<p>Ao selecionar um gráfico surge a aba <b>Gráfico</b> (com um traço de cor em cima) com <b>Editar</b>, <b>Estilo rápido</b>, <b>Cores</b>, <b>Semáforo</b> e <b>Excluir</b>. Estilo rápido, Cores e Semáforo abrem o editor já na parte certa. Ao tirar a seleção a aba some e volta a que você estava.</p>',
     'A aba aparecendo sozinha atrapalha ou ajuda?', [('Depois', 'v063-aba-grafico'), ('Cores', 'v063-grafico-cores')], 'par'),
    ('F02', 'Ícones diferentes para inserir e excluir linha e coluna (R02)', GF,
     '<p>Você achou os ícones de adicionar linha e coluna ambíguos (dois "+" parecidos com Nova aba). Agora cada um tem <b>desenho próprio</b> (a linha ou a coluna inteira em destaque, com + ou x) e, na aba <b>Inserir</b>, viraram <b>botões grandes com o nome</b> (Inserir linha, Inserir coluna), como a Nova aba.</p>',
     'Dá para distinguir de longe?', [('Antes: Inserir', 'antes-faixa-inserir'), ('Depois: Inserir', 'depois-faixa-inserir'), ('Antes: Página Inicial', 'antes-faixa-inicio'), ('Depois: Página Inicial', 'depois-faixa-inicio')], 'par'),
    ('F03', 'Até 2 temas favoritos (R04)', GF,
     '<p>Nas opções, cada tema tem uma <b>estrelinha</b>; você marca até <b>2</b>. Eles aparecem como bolinhas no menu da faixa, para trocar de tema com um toque (de fábrica: Papel e Escuro).</p>',
     'Dois favoritos bastam?', [('Menu da faixa', 'v063-temas-favoritos'), ('Estrelas nas opções', 'v063-temas-estrelas')], 'par'),
    ('X01', 'Links e imagens vão e voltam do Excel', GX,
     '<p>Links (internet, e-mail e para outra aba) e imagens <b>gravam no Excel</b> e <b>voltam</b> ao abrir de novo; conferi o arquivo no LibreOffice (a imagem e o texto aparecem). O <b>botão de aba não existe no Excel</b> (lá só com macro): ele fica só no EFCdocs e o aviso ao salvar diz isso.</p>',
     'Está bom o botão ficar só no EFCdocs, com aviso?', [], ''),
    ('D01', 'Gráfico no Quadro fica para a v0.7.0', GD,
     '<p>O comando "Inserir gráfico" do Quadro de post-its era um botão que prometia a v0.6.1 e <b>não funcionava</b>. Passei a promessa para a <b>v0.7.0</b>, para o botão não enganar.</p>',
     'Pode ficar para a v0.7.0?', [], ''),
    ('D02', 'Editor de gráficos: o que dá para acrescentar (E02)', GD,
     '<p>Reli o editor. Hoje ele tem tipo, dados, 6 estilos rápidos, cores, semáforo, séries (inclusive eixo da direita e linha de tendência), eixos, textos e fundo. <b>Não tem</b> ainda, e eu sugiro, em ordem de uso: (1) <b>exportar o gráfico como imagem</b> para colocar num documento ou e-mail; (2) <b>duplicar e copiar/colar</b> o gráfico (inclusive para outra aba); (3) <b>linha de meta</b> arrastável no próprio gráfico; (4) <b>salvar o estilo</b> como modelo seu; (5) barras de erro.</p>',
     'Quais dessas você quer? (diga os números)', [], ''),
    ('P01', 'Publicação da v0.6.3', GD,
     '<p>Depois da sua aprovação, publico a v0.6.3 no GitHub (commit só com esta versão). Os seus arquivos não vão para o GitHub nem para os pacotes (só amostras inventadas). <b>Nada a configurar no Firebase.</b></p>',
     'Pode publicar? (diga se quer algum ajuste antes)', [], ''),
    ('P02', 'Próximas versões', GD,
     '<p><b>v0.6.4 · Opus 5.5 · alto</b>: o <b>Painel</b> (esboço mostrado na v0.6.1). Depois, a v0.7.0 com o Documento e o gráfico no Quadro. O relatório do Grok da v0.6.2 você me manda quando chegar.</p>',
     'Pode ser essa a ordem?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A v0.6.3 liga os <b>10 botões</b> que estavam marcados "chega na v0.6.3": Classificar, Filtrar, Duplicados, Travar, Tabela, Coluna de status, Link, Botão de aba, Imagem e Ortografia.</li>'
    '<li>Traz a aba <b>Gráfico</b> que aparece sozinha, ícones próprios de linha e coluna e até 2 <b>temas favoritos</b>.</li>'
    '<li>Links e imagens <b>vão e voltam do Excel</b>.</li>'
    '<li>Os prints usam só amostras inventadas; os seus arquivos não foram para o GitHub nem para os pacotes. Nada a configurar no Firebase.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Os 10 botões da planilha, aba Gráfico e temas favoritos')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
