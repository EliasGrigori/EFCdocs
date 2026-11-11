"""EFCdocs — monta a página de aprovação da v0.6.9.2 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" <testes-de-regras> <testes-no-navegador>"""
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.6.9.2'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
GA = 'A. Bordas e cores ao abrir o Excel'
GB = 'B. Coluna oculta'
GC = 'C. Imagem no celular'
GD = 'D. Aviso ao abrir'
GP = 'P. Publicação'
ITENS = [
    ('A01', 'Bordas e cores de células vazias longe dos dados não somem mais', GA,
     '<p>O Grok achou: células <b>vazias</b> só com borda ou cor de fundo, bem à direita do último dado (por exemplo de CV a DH), eram descartadas ao abrir o Excel e por isso não voltavam no arquivo salvo. Agora ficam as que têm <b>borda ou cor de fundo visível</b> (até 20.000 por aba, para uma formatação de coluna inteira não pesar). Formatação sem nada visível continua sendo descartada.</p>'
     '<p class="obs">Nos prints: a amostra inventada <code>amostra-v0692.xlsx</code>, aba BORDAS, célula CV1 (as células CV1 a DF5 são vazias com borda).</p>',
     'Agora a borda aparece?',
     [('Antes (v0.6.9.2): nada em CV a DF', 'antes-bordas'), ('Depois (v0.6.9.2)', 'depois-bordas')], 'par'),
    ('B01', 'A coluna oculta guarda a largura', GB,
     '<p>Uma coluna oculta com largura 16 no Excel voltava como 9,1 ao salvar (e ao reexibir). Agora a largura é guardada também nas colunas ocultas: ao <b>Reexibir</b>, ela volta do tamanho original, como no Excel, e o arquivo salvo mantém a largura e continua oculta.</p>',
     'Reexibir devolve a largura certa?',
     [('Antes: coluna G reexibida com a largura padrão', 'antes-oculta'), ('Depois: coluna G com a largura original', 'depois-oculta')], 'par'),
    ('C01', 'Celular: a imagem inserida aparece quando o congelado ocupa a tela', GC,
     '<p>Numa aba em que a parte congelada enche a tela do celular, a imagem era presa a uma célula fora da tela e só aparecia a barrinha dela. Agora a imagem (e a assinatura) entram na <b>célula escolhida, se ela está à vista</b>, inclusive dentro da parte congelada, e senão na primeira célula que aparece. O congelamento em si <b>não muda</b>.</p>'
     '<p class="obs">Se você preferir que o congelado maior que a tela seja desligado só no celular (como o Excel do celular), é só dizer.</p>',
     'Aparece onde se espera?',
     [('Antes (v0.6.9.2): nada aparece', 'antes-celular'), ('Depois (v0.6.9.2)', 'depois-celular')], 'par'),
    ('D01', 'Aviso ao abrir: toda fórmula com #REF! é contada', GD,
     '<p>A contagem só incluía as fórmulas que o EFCdocs não sabe ler. Agora entram <b>todas</b> as que têm #REF! (como <code>=SOMA(#REF!)</code> e <code>=#REF!+1</code>), sem contar de novo em "ainda não calcula". Na amostra: 3 fórmulas.</p>',
     'O número está certo?',
     [('Antes', 'antes-aviso'), ('Depois', 'depois-aviso')], 'par'),
    ('P01', 'Publicação', GP,
     '<p>Se aprovar, publico com a ordem "Poste do Github" (o app da raiz é atualizado no mesmo commit). <b>Continuam abertos</b> por falta de dado: D-05 (célula sem linha lateral), D-06 (linha grossa em colunas vazias) e D-07 (print do Dashboard). <b>Nada a configurar no Firebase.</b></p>',
     'Pode publicar a v0.6.9.2?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>Bordas e cores de células vazias longe dos dados voltam no Excel salvo.</li>'
    '<li>Coluna oculta guarda a largura original.</li>'
    '<li>Celular: a imagem aparece mesmo com o congelado ocupando a tela.</li>'
    '<li>O aviso ao abrir conta toda fórmula com #REF!. Nada a configurar no Firebase.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Bordas de células vazias, coluna oculta, imagem no celular e contagem de #REF!')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
