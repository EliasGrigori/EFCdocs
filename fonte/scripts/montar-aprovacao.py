"""EFCdocs — monta a página de aprovação da v0.4.9 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.4.9'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
G1, G2, G3, G4 = 'A. Defeitos que o Grok achou (corrigidos)', 'B. Pedidos da v0.4.9 (menu, aviso, Início, ícones, celular, temas)', 'C. Perguntas abertas', 'D. Decisões'
ITENS = [
    ('X01', 'Centralizar: agora centraliza tudo e só desfaz quando todas já estão', G1,
     '<p>O Grok viu que <b>Centralizar</b> invertia: com várias células escolhidas e só algumas já centralizadas, o botão tirava o centro das que estavam certas. Agora funciona como o Excel: <b>põe todas no centro</b>; só quando <b>todas</b> já estão no centro é que o clique tira. Vale também para Esquerda e Direita. Tem teste.</p>',
     'Confirma que ficou certo?', [('Quatro linhas escolhidas, todas centralizadas (desfazer: "Centralizar")', 'depois-centralizar')], 'um'),
    ('X02', 'Cópia do quadro leva a rubrica e cola sempre dentro da tela', G1,
     '<p>Duas coisas do Grok no B02: (1) ao copiar uma assinatura e colar, <b>a rubrica sumia</b>, ainda mais depois de recarregar; agora a rubrica <b>vai junto com a cópia</b>, mesmo depois de recarregar a página (ela fica guardada só neste aparelho). (2) A terceira cópia caía <b>fora da tela</b>; agora o EFCdocs procura o primeiro lugar livre <b>dentro da parte que você está vendo</b>. Tem teste: cinco colagens seguidas, todas visíveis e sem uma em cima da outra.</p>',
     'Confirma? (Para testar: copie uma assinatura com rubrica, recarregue e cole três vezes.)', [], ''),
    ('X03', 'Painel "Verificação", dica sem bolinha verde e o exemplo "só um modelo"', G1,
     '<p>O painel agora se chama <b>Verificação · 1 dica</b> (e não mais "Problemas"), e uma <b>dica sozinha não acende a bolinha</b> do botão (a bolinha só aparece com erro ou aviso). No ajuda da função, o exemplo ganhou a frase <b>"só um modelo: troque as colunas e os valores pelos da sua planilha"</b>, porque o Grok achou que o D2:D30 do SOMASE parecia fixo. A <b>cor do cursor</b> também ficou certa: o cursor não pisca mais atrás das letras.</p>',
     'Está claro agora?', [('Painel Verificação com uma dica', 'depois-verificacao'), ('Ajuda do SOMASE com a nota', 'depois-formula')], 'um'),
    ('W03', 'Alça do menu mais fina, que sai um pouco ao chegar o mouse ou o dedo; ☰ igual', G2,
     '<p>Como você pediu: a alça ficou <b>bem mais fina (7 px)</b> e, ao <b>passar o mouse ou tocar</b>, ela <b>sai um pouco</b> (e fica mais escura, com a setinha) para ajudar a puxar, com animação suave. Dá para <b>puxar para o lado</b> ou clicar. O <b>☰</b> do topo agora faz exatamente o mesmo que a alça (menu fixo, não gaveta). No celular continua entrar e sair.</p>',
     'Ficou do tamanho e do jeito que você imaginou? Mais fina ainda, ou sai mais ao chegar perto?',
     [('Antes (v0.4.9): repouso e mouse em cima', 'alca-antes'), ('Depois (v0.4.9): repouso e mouse em cima', 'alca-depois')], 'um'),
    ('W09', 'Aviso no canto direito, mais baixo, mais largo e levemente arredondado', G2,
     '<p>O aviso foi para o <b>canto de baixo à direita</b>, ficou <b>mais baixo e mais largo</b> e com <b>cantos levemente arredondados</b> (5 px). Quando o painel Verificação está aberto no quadro, o aviso se desloca para não ficar por cima.</p>',
     'Ficou como você queria?', [('Antes', 'antes-aviso'), ('Depois', 'depois-aviso')], 'par'),
    ('L02', 'Início com cartões grandes que são uma prévia em branco (sua ideia)', G2,
     '<p>No Início, "Nova planilha / documento / quadro" agora são <b>cartões grandes com a prévia do arquivo em branco</b>: grade para a planilha, folha com linhas de texto para o documento, fundo pontilhado com post-its para o quadro. O Documento mostra o selo dourado <b>v0.7.0</b> (ainda não abre). Se não houver arquivo, a frase é <b>"Comece criando uma planilha. Tudo fica salvo neste aparelho."</b></p>',
     'Gostou dos cartões? Quer a prévia maior, ou com o nome do arquivo escrito por cima?', [('Antes', 'antes-inicio'), ('Depois', 'depois-inicio')], 'par'),
    ('L04', 'Menu como o do Google Drive', G2,
     '<p>O menu agora segue o <b>Google Drive</b>: o <b>☰</b> no topo alterna entre menu com nomes e só ícones; o botão grande <b>+ Novo</b> abre as três opções (Planilha, Documento, Quadro); depois vêm <b>Início</b>, <b>Meus arquivos</b> (Planilhas, Documentos, Quadros) e <b>Organizar</b> (Pastas, Documentos externos, ainda "em breve"); a <b>Lixeira</b> e o <b>Esconder menu</b> ficam embaixo, e o texto pequeno do logo saiu para caber o ☰.</p>',
     'O menu está do jeito que você imaginou? Falta algo (Compartilhados comigo, Recentes)?',
     [('Antes', 'antes-menu'), ('Depois, menu completo', 'depois-menu'), ('Botão Novo aberto', 'depois-menu-novo'), ('Depois, só ícones', 'depois-menu-icones')], 'par'),
    ('L06', 'Ícones da faixa maiores e coloridos por família', G2,
     '<p>Os ícones da faixa ficaram <b>maiores</b> (os grandes 26 px) e <b>coloridos por família</b>: área de transferência em azul, fonte em roxo, alinhamento em cinza-petróleo, número em azul, células em verde, edição em vermelho/rosa. A altura da faixa <b>não mudou</b>.</p>',
     'Gostou das cores? Quer mais fortes, mais suaves, ou uma cor só (petróleo)?', [('Antes', 'antes-faixa'), ('Depois', 'depois-faixa')], 'um'),
    ('L07', 'Celular: uma barra rápida só e botão "Abas"', G2,
     '<p>No celular, em vez de abas + faixa + barra de baixo ocupando a tela, fica <b>uma única barra rápida</b> (negrito, itálico, sublinhado, cor, preenchimento, alinhar, moeda, soma, desfazer, refazer) e um botão <b>Abas</b> no fim. Tocando em Abas, abrem as abas e a faixa completa; tocando de novo, fecham. A planilha ganha bastante espaço.</p>',
     'No celular de verdade, ficou fácil? Quais botões você mais usa e quer na barra rápida?',
     [('Antes', 'antes-cel-planilha'), ('Depois (barra rápida)', 'depois-cel-planilha'), ('Depois, Abas aberto', 'depois-cel-abas'), ('Início no celular', 'depois-cel-inicio')], 'par'),
    ('L09', 'Temas agrupados em Claros e Escuros, com miniatura e "Ver todos"', G2,
     '<p>Em Opções › Tema, os temas aparecem em dois grupos, <b>Claros</b> (Papel, Claro, Névoa) e <b>Escuros</b> (Escuro, Ardósia, Petróleo), cada um com uma <b>miniatura</b>. O botão <b>Ver todos os 18 temas</b> mostra o resto, também separado em claros e escuros.</p>',
     'Ficou fácil de escolher? Quer outros temas em destaque?', [('Antes', 'antes-temas'), ('Depois', 'depois-temas')], 'par'),
    ('B03', 'Mensagem "Aberto em outra aba" sem outra aba aberta', G3,
     '<p>Continua sem aparecer nos meus testes (o Chrome 156 reabre as abas antigas junto com a nova). Já reduzi a trava para 90 s e o aviso tem <b>Editar aqui</b>. Se você ou o Grok virem de novo, anotem: <b>navegador, se reabriu abas sozinho, e há quanto tempo fechou a anterior</b>. O roteiro do Grok pede isso.</p>',
     'Voltou a aparecer nesta versão?', [], ''),
    ('W06', 'Sem resposta na v0.4.9: nome "Quadros" e textos sem jargão', G3,
     '<p>O Grok achou tudo certo; mas você ainda não respondeu. O menu diz <b>Quadros</b>, o rodapé diz <b>"Salvo neste aparelho"</b> e <b>Tamanho</b>.</p>', 'Está bom assim?', [], ''),
    ('V01', 'Publicação da v0.4.9', G4,
     '<p>Depois da sua aprovação, publico a v0.4.9 no GitHub (commit só com esta versão). Nada vai antes disso.</p>', 'Pode publicar? (marque Aprovado e diga se quer algum ajuste antes, principalmente W03, L04 e L07)', [], ''),
    ('V02', 'Próxima versão: v0.5.0 com Opus 5.5 · esforço alto', G4,
     '<p><b>v0.5.0 (Opus 5.5 · alto)</b>: abrir e salvar <b>.xlsx</b> com os seus 4 arquivos (Potabilidade, Coletas, Estoque e Acerola). Macros, tabelas dinâmicas, gráficos e controles não serão preservados nesta etapa; um <b>relatório</b> dirá o que ficou de fora. Os arquivos <b>não entram</b> no pacote nem no GitHub. Depois, v0.6.0 gráficos, v0.7.0 Docx e assinatura, v0.8.0 pastas e nuvens.</p>',
     'Posso seguir para a v0.5.0 com o Opus 5.5 em esforço alto, depois da aprovação desta?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A v0.4.9 <b>corrige o que o Grok achou</b> (Centralizar, rubrica na cópia, colar dentro da tela, painel Verificação, cursor) e faz os seus pedidos: <b>alça menor que sai ao chegar perto, aviso à direita, cartões de prévia no Início, menu estilo Drive, ícones coloridos, barra rápida no celular e temas agrupados</b>.</li>'
    '<li>Aprove ou reprove cada item abaixo; no fim, o botão gera as suas respostas para você colar na conversa.</li>'
    '<li>Nada foi publicado. Nada a configurar no Firebase.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Menu, avisos, Início, ícones, celular e temas')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
