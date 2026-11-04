"""EFCdocs — monta a página de aprovação da v0.6.9.1 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" <testes-de-regras> <testes-no-navegador>"""
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.6.9.1'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
GA = 'A. Congelado (o que você viu nos prints de hoje)'
GB = 'B. Coluna dos números'
GC = 'C. Imagens'
GD = 'D. Tabelas do Excel'
GE = 'E. Aviso ao abrir'
GF = 'F. Memória do projeto'
GP = 'P. Publicação'
ITENS = [
    ('A01', 'A célula escolhida some por baixo do congelado', GA,
     '<p>Reproduzi o seu defeito com a sua planilha: com a célula <b>K13</b> escolhida e rolando para a direita, a caixa da seleção era desenhada <b>por cima das colunas congeladas</b> (a célula já estava escondida por baixo, mas o contorno aparecia). Agora cada parte da tela desenha só o pedaço da seleção que é dela. A célula que rolou para baixo do congelado <b>some</b>, como no Excel.</p>'
     '<p class="obs">Nos prints: a amostra inventada <code>amostra-v069.xlsx</code>, célula J20 escolhida, rolando bem para a direita.</p>',
     'A caixa deixou de aparecer por cima do congelado?',
     [('Antes (v0.6.9)', 'antes-congelado'), ('Depois (v0.6.9.1)', 'depois-congelado')], 'par'),
    ('A02', 'Risco solto dentro do congelado', GA,
     '<p>O outro defeito dos seus prints: <b>um risco extra</b> dentro das colunas congeladas. A linha da ponta do painel congelado era desenhada na posição da coluna seguinte, que já tinha rolado. Agora sai da borda da última coluna congelada. O mesmo vale para as linhas de cima.</p>',
     'Aprovado?', [], ''),
    ('B01', 'Coluna dos números mais fina', GB,
     '<p>Era de 46 px e roubava espaço. Agora tem <b>30 px</b> (a 100%) e só cresce quando o número da linha tem 4 dígitos ou mais (linha 1000 em diante).</p>',
     'Ficou bom?',
     [('Antes (v0.6.9)', 'antes-numeros'), ('Depois (v0.6.9.1)', 'depois-numeros')], 'par'),
    ('C01', 'Imagens: a alça de tamanho funciona', GC,
     '<p>A alça (o quadradinho do canto) ficava <b>metade para fora</b> da imagem, e a imagem corta o que passa da caixa: só o pedaço de dentro aparecia e recebia o clique, por isso não dava para redimensionar. Agora a alça fica <b>dentro do canto</b> (e maior no toque). Arrastar muda o tamanho e mantém a proporção. Vale também para botão de aba e gráfico.</p>',
     'Redimensiona bem?',
     [('Antes (v0.6.9): alça cortada', 'antes-imagem'), ('Depois (v0.6.9.1)', 'depois-imagem'), ('Depois de arrastar a alça', 'depois-imagem-depois-de-arrastar')], 'tres'),
    ('D01', 'As tabelas do Excel voltam ao exportar', GD,
     '<p>Achei a causa: o EFCdocs gravava o nome de cada coluna da tabela <b>"aparado"</b> (sem o espaço no fim) e com a quebra de linha em outro formato. O Excel exige que o nome seja <b>idêntico</b> ao texto da célula do título; vendo diferença, ele "repara" o arquivo e <b>apaga a tabela</b>. Agora o nome sai igual ao do Excel original.</p>'
     '<p>Conferido na sua planilha de teste: as 3 tabelas (<code>Tabela1</code>, <code>Tabela4</code>, <code>NOMES</code>) saem com todos os nomes iguais aos do Excel, por exemplo <code>Data _x000a_Colheita</code> e <code>Hora da Coleta </code> (com espaço no fim).</p>'
     '<p class="obs">Não tenho o Excel aqui para abrir o arquivo: <b>quem confirma é você</b>, salvando como Excel e abrindo (a tabela continua tabela, sem pedido de reparo?).</p>',
     'No seu Excel a tabela voltou?', [], ''),
    ('E01', 'Aviso ao abrir: fórmulas que já vêm com #REF! do Excel', GE,
     '<p>As 14.200 fórmulas do exemplo <code>=SINGLE(IF(SINGLE(ANÁLISES!#REF!:ANÁLISES!#REF!)=0,"",ANÁLISES!#REF!))</code> <b>já estão com #REF! guardado no próprio arquivo do Excel</b> (a referência à aba ANÁLISES foi apagada e o valor guardado também é #REF!). No Excel elas mostram o mesmo. Agora o aviso tem uma <b>linha só para elas</b>, e não diz mais que "o EFCdocs ainda não calcula".</p>',
     'O aviso ficou claro?',
     [('Antes (v0.6.9)', 'antes-aviso'), ('Depois (v0.6.9.1)', 'depois-aviso')], 'par'),
    ('F01', 'Memória do projeto (MEMORIA-DO-PROJETO.md)', GF,
     '<p>Pela sua ideia de não perder nenhum dado: um arquivo único com as <b>15 regras suas numeradas</b>, o estado atual, o passo a passo de entrega, os <b>defeitos com situação</b> (inclusive os que continuam abertos), as pendências, as limitações do Excel (as duas frases que você mandou estão lá), a tabela de versões e as decisões aprovadas copiadas na íntegra. Ao fim há um <b>registro onde cada regra nova entra com data</b>. Vai em <b>toda entrega</b>: na pasta da versão, no ZIP da fonte e no repositório, e eu o leio no começo de cada conversa. Para gravar uma regra, é só dizer "regra nova: ...".</p>',
     'Aprovado o formato?', [], ''),
    ('P01', 'Publicação', GP,
     '<p>Se aprovar, publico com a ordem "Poste do Github": a v0.6.9.1 entra no repositório e no site (e o app da raiz é atualizado no mesmo commit). <b>Ficam abertos</b>, porque não consegui reproduzir sem a sua planilha completa: a <b>célula sem linha lateral</b> (aba RESUMO, perto da linha 1009) e a <b>linha mais grossa depois do cabeçalho</b> nas colunas vazias. Se puder, me diga o endereço da célula (por exemplo E1010) ou mande uma amostra com dados inventados. <b>Nada a configurar no Firebase.</b></p>',
     'Pode publicar a v0.6.9.1?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>Congelado: a caixa da célula escolhida deixa de aparecer por cima das colunas congeladas e o risco solto some (reproduzido com a sua planilha).</li>'
    '<li>Coluna dos números mais fina (30 px) e imagens que voltam a redimensionar.</li>'
    '<li>Tabelas do Excel: o nome das colunas sai idêntico ao do Excel (era a causa de o Excel apagar a tabela).</li>'
    '<li>Aviso ao abrir separa as fórmulas que já vêm com #REF! do Excel. Memória do projeto em arquivo único. Nada a configurar no Firebase.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Congelado, coluna dos números, imagens, tabelas do Excel e memória do projeto')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
