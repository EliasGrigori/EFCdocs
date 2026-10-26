"""EFCdocs — monta a página de aprovação da v0.4.4.2 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.4.4.2'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
G1, G2, G3 = 'A. Os dois erros que o Grok achou na v0.4.4.1', 'B. Retoques', 'C. Decisões'
ITENS = [
    ('Q01', 'Conta que dá número numa célula de data', G1,
     '<p>Se uma conta dá um número pequeno (0,9 ou 18) numa célula formatada como <b>data</b>, a tela mostrava "31/12/1899" e parecia que a conta tinha quebrado. Agora, ao confirmar a conta, uma janela pergunta <b>uma vez</b>: "Esta conta deu 0,9, mas a célula está formatada como data e mostraria 31/12/1899." com três botões: <b>Mostrar como número</b> (a célula passa a mostrar 0,9), <b>Deixar como data</b> e <b>Cancelar</b> (volta a editar). Datas de verdade (ex.: =G2+1 com G2 data) <b>não</b> perguntam. Se a célula já ficou assim, o Explicar agora diz: "Agora mostra 31/12/1899 (a célula está formatada como data; a conta deu 0,9)".</p>',
     'É assim que você quer? (A outra ideia era trocar sozinho o formato, sem perguntar.)',
     [('Antes', 'antes-pc-numero-em-data'), ('Depois', 'depois-pc-numero-em-data'), ('Antes: Explicar', 'antes-pc-explicar'), ('Depois: Explicar (célula já mostrando 0,9)', 'depois-pc-explicar')], 'par'),
    ('Q02', 'Aba "só para ver": a faixa de cima pisca quando você tenta digitar', G1,
     '<p>Na aba "só para ver" o aviso de baixo some em poucos segundos, e quem digita ficava sem saber por que nada acontece. Agora, a cada tentativa de digitar (ou de editar um texto no quadro), a <b>faixa de cima</b> ("Aberto em outra aba. Aqui fica só para ver.") <b>pisca</b> por um instante, além do aviso de baixo. Quem prefere menos movimento no aparelho vê um contorno no lugar da animação. Nada é gravado, como antes.</p>',
     '', [('Antes', 'antes-pc-so-ver'), ('Depois (faixa piscando)', 'depois-pc-so-ver')], 'par'),
    ('Q03', 'Aviso com Desfazer: some mais certo e fica atrás do fundo das janelas', G2,
     '<ul><li>O aviso "foi para a lixeira · Desfazer" ficava nítido por cima do fundo embaçado. Agora fica <b>atrás</b> do fundo (embaçado junto com o resto) quando uma janela abre.</li>'
     '<li>Some ao <b>trocar de página</b> (se já estava na tela há mais de 1,5 s) e dura 8 segundos no máximo.</li>'
     '<li>No meu teste ele some sozinho em cerca de 8 segundos; o Grok viu mais de 30, o que sugere que o navegador dele atrasava os temporizadores. Se ainda acontecer no seu aparelho, me diga.</li></ul>',
     '', [('Antes', 'antes-pc-aviso-atras-do-fundo'), ('Depois', 'depois-pc-aviso-atras-do-fundo')], 'par'),
    ('Q04', 'Listas: contagem igual e data no pé do cartão', G2,
     '<ul><li>A contagem agora é igual em todas as listas e fica <b>ao lado do filtro</b>: "4 arquivos" no Início, "4 planilhas" em Planilhas, "2 quadros" em Quadros.</li>'
     '<li>A <b>data</b> fica presa no pé do cartão, então cartões vizinhos com nome de uma ou de duas linhas ficam com as datas na mesma altura.</li></ul>',
     '', [('Antes: Planilhas', 'antes-pc-planilhas'), ('Depois: Planilhas', 'depois-pc-planilhas'), ('Antes: Início', 'antes-pc-inicio'), ('Depois: Início', 'depois-pc-inicio')], 'par'),
    ('Q05', 'Lixeira: "Apagar para sempre" com borda e frase mais clara', G2,
     '<p>O botão ganhou <b>borda e fundo vermelho claro</b> e a altura do Restaurar, para parecer botão e não link. A frase de cima agora é: "Aqui ficam os arquivos apagados. Restaure ou apague para sempre." (saiu o "fica anotado no histórico").</p>',
     '', [('Antes', 'antes-pc-lixeira'), ('Depois', 'depois-pc-lixeira')], 'par'),
    ('Q06', 'Quadro: nome do botão e texto da forma no meio', G2,
     '<ul><li>Em Exibir, o botão agora se chama <b>Barra de ferramentas</b>, igual ao comando do Ctrl+K.</li>'
     '<li>Na forma Início/Fim (e Atividade, Entrada/Saída e Decisão), o texto que você escreve fica <b>no meio</b> da caixa, como na forma desenhada, e não grudado no alto.</li></ul>',
     '', [('Antes (computador)', 'antes-pc-quadro-forma'), ('Depois (computador)', 'depois-pc-quadro-forma'), ('Antes (celular)', 'antes-cel-quadro-forma'), ('Depois (celular)', 'depois-cel-quadro-forma')], 'par'),
    ('Q07', 'O que mais incomoda?', G3,
     '<p>Esta versão é só ajuste. Ficou como estava: cores dos temas, faixa de botões, celular deitado (fica para depois, como combinado) e a janela sobre outra janela (o Grok não conseguiu abrir uma sobre a outra para testar).</p>',
     'Ainda tem alguma tela que incomoda (cite qual e o quê)? Se não, sigo para a Assinatura.', [], ''),
    ('Q08', 'Publicação e próxima versão', G3,
     '<p>Se aprovar, publico a <b>v0.4.4.2</b> no GitHub. Próxima: <b>v0.4.5 Assinatura</b> (Sonnet 5.5 · alto): linha em branco com o nome completo embaixo, rubrica desenhada com o mouse ou o dedo, ou foto; primeiro no quadro, depois Docx e Planilha. A imagem fica só no arquivo, no aparelho.</p>',
     'Pode publicar a v0.4.4.2 e seguir para a Assinatura?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A v0.4.4.1 já está no GitHub, aprovada por você. Esta é uma versão pequena em cima dela.</li>'
    '<li>Traz os 2 erros e os 7 retoques que o Grok achou na v0.4.4.1. A decisão do número em célula de data foi a sugestão do Grok (perguntar uma vez).</li>'
    '<li>Nada vai ao GitHub antes da sua resposta. Nada a configurar no Firebase.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'número em célula de data, aviso na aba só para ver e retoques')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
