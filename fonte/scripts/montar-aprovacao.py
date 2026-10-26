"""EFCdocs — monta a página de aprovação da v0.4.8 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.4.8'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
G1, G2, G3, G4 = 'A. Visual novo (o que você pediu no relatório do Grok)', 'B. Defeitos que o Grok achou (corrigidos nesta versão)', 'C. Suas perguntas e ideias', 'D. Decisões'
ITENS = [
    ('W01', 'Papel sobre a mesa: três acabamentos para você escolher', G1,
     '<p>Você achou tudo "muito quadrado" nas barras de cima e de baixo e pediu sombreamento ou relevo, e contorno nas laterais. Pesquisei como fazem o <b>Google Docs / Drive</b> (folha branca sobre um fundo cinza, com sombra bem leve embaixo das barras), o <b>Notion</b> (quase sem sombra, só linhas finas) e o <b>Microsoft 365 novo</b> (cartões com sombra suave). A minha sugestão junta o melhor: <b>a folha parece apoiada sobre a mesa</b>. Montei os três para você ver e escolher: <b>A. Plano</b> (como era), <b>B. Relevo</b> (brilho leve nas barras e botões) e <b>C. Papel sobre a mesa</b> (relevo + sombra embaixo da barra de cima e da de baixo + contorno fino nas laterais da folha). O <b>C</b> é o padrão desta versão; os três se trocam em <b>Exibir › Aparência</b> (botões Relevo e Mesa) ou em Opções. As bordas não ficaram arredondadas, como você gosta.</p>',
     'Qual você quer: A, B ou C? Se o C estiver forte ou fraco demais, diga ("mais sombra", "só o contorno") que eu ajusto.',
     [('Os três acabamentos (cantos da barra de baixo e de cima)', 'depois-acabamentos'), ('Tela inteira com o C', 'depois-tela')], 'um'),
    ('W02', 'Tema "Papel" claro como padrão, com o dourado só como marca', G1,
     '<p>O app agora <b>abre no tema claro "Papel"</b>: fundo branco azulado, texto em <b>tinta petróleo</b> e o <b>dourado só como marcador</b> (o traço embaixo da aba ativa, a barrinha no menu e uma faixa suave no item atual), nunca como cor de letra. Foi a minha resposta à sua dúvida sobre o dourado cansar a vista: letra dourada em fundo claro tem pouco contraste e cansa; como <b>marcador</b>, o dourado dá foco sem cansar. Os 17 temas antigos continuam em Opções › Tema (o Petróleo escuro é o último da lista). <b>Atenção</b>: quem já escolheu outro tema neste aparelho continua com ele; para ver o Papel, escolha em Opções › Tema.</p>',
     'Gostou do Papel como padrão? Prefere o dourado ainda mais discreto, ou um pouco mais presente (por exemplo, também na linha de baixo da faixa)?',
     [('Antes (v0.4.7, escuro com letras douradas)', 'antes-canto'), ('Depois (Papel: dourado só como marca)', 'depois-canto')], 'par'),
    ('W03', 'Menu escondido: alça e ☰ maiores e mais nítidos', G1,
     '<p>A alça da borda esquerda virou uma <b>aba petróleo de 24 x 56 px</b> com a setinha em branco (antes era fininha). O <b>☰</b> do topo subiu para 40 px, com traço mais grosso. <b>Dúvida honesta</b>: a aba fica em cima dos números das linhas 9 a 11 (o Grok também reparou). Como o ☰ do topo já abre o menu, posso <b>tirar a alça</b> e deixar só o ☰, ou <b>subir a alça</b> para a altura da faixa.</p>',
     'Deixo como está, tiro a alça (só ☰) ou subo a alça para a altura da faixa?',
     [('Antes (alça fininha)', 'antes-alca'), ('Depois (aba petróleo; ☰ maior no topo)', 'depois-alca-recorte'), ('Tela com o menu escondido e a barra compacta', 'depois-maximo')], 'um'),
    ('W04', 'Faixa temporária com sombra e dourado; divisória na barra compacta', G1,
     '<p>Com a faixa recolhida, tocar numa aba mostra a faixa <b>por cima da barra fx</b>. Agora ela tem <b>sombra embaixo e um fio dourado</b> na borda, então se vê que é uma peça "flutuando" e não parte fixa da tela. Na barra de cima compacta também entrou uma <b>divisória fina</b> entre o nome do arquivo e as abas (antes ficavam coladas).</p>',
     'A sombra e o fio dourado deixam claro que a faixa é temporária?',
     [('Faixa temporária (aba Inserir com a faixa recolhida)', 'depois-faixa-temporaria')], 'um'),
    ('W05', '"Número fixo na conta" agora é Dica, não Problema', G1,
     '<p>O Grok reparou que avisos como "=B2*1,15" (número digitado dentro da conta) apareciam como Problema. Agora são <b>Dica</b>: aparecem por último, em tom de informação, e <b>não entram na contagem do botão</b> (só Erros e Avisos contam). O botão passa a mostrar "Verificação" com a contagem real, e a lista diz "1 dica".</p>',
     'Está do jeito que você quer?', [('Lista com uma Dica', 'depois-verificacao')], 'um'),
    ('W06', 'Um nome só: Quadros', G1,
     '<p>No menu agora é <b>Quadros</b>; no botão e no título é <b>Quadro</b>; "Post-it" fica só para a peça amarela. O texto do logo diz "Planilha · Documento · Quadro". (Comentários antigos continuam funcionando; só mudou o que aparece.)</p>', '', [], ''),
    ('W07', 'Textos sem jargão (rodapé e Opções)', G1,
     '<p>O rodapé diz "<b>Salvo neste aparelho às 10:39</b>" (ou "Salvando…") no lugar de "Rascunho · Rev. 00", e "<b>Tamanho:</b> 273 B" no lugar de "No aparelho:". Em Opções, cada escolha ganhou uma frase curta dizendo para que serve (veja a imagem), e entrou a escolha da <b>Barra de cima</b> (completa ou compacta).</p>',
     'Os textos ficaram claros? Alguma palavra ainda estranha?', [('Opções › Tema', 'depois-opcoes-tema')], 'um'),
    ('W08', 'Verificação: um nome, um lugar, em todos os arquivos', G1,
     '<p>O que era "Problemas" (planilha) e "Assistente" (quadro) agora é <b>Verificação</b>, sempre no <b>rodapé, no canto direito</b>, sem boiar em cima da grade ou do quadro. O número mostra o que precisa de atenção. No celular continua no mesmo lugar de antes.</p>',
     'O nome "Verificação" serve? (Outras ideias: "Revisão automática", "Conferência".)', [], ''),
    ('W09', 'Um aviso de cada vez, no canto de baixo à esquerda', G1,
     '<p>O aviso novo <b>toma o lugar</b> do anterior (nada empilha), e fica ao lado do menu, embaixo, como no Google. Ao desfazer uma exclusão, o "Desfazer" some e fica só "Desfeito". Resolve o B01.</p>',
     '', [('Antes (aviso no meio)', 'antes-aviso'), ('Depois (embaixo à esquerda)', 'depois-aviso')], 'par'),
    ('B01', 'Avisos empilhados depois do Ctrl+Z', G2, '<p>Corrigido junto com W09 (um aviso de cada vez; o Desfazer não fica clicável depois de desfeito). Tem teste automático.</p>', 'Confirma que está resolvido?', [('Depois do Ctrl+Z: só "Desfeito"', 'depois-aviso-desfeito')], 'um'),
    ('B02', 'Cópia colada depois de recarregar cai em cima de outra', G2, '<p>Corrigido: ao colar, o EFCdocs procura o <b>primeiro lugar livre ao lado</b> (as assinaturas vão para a direita; o resto desce na diagonal), mesmo depois de recarregar. Tem teste: original + 2 cópias coladas depois de recarregar ficam lado a lado.</p>', 'Confirma?', [], ''),
    ('B03', '"Aberto em outra aba" sem outra aba aberta (3ª vez)', G2,
     '<p>Não consegui reproduzir aqui. O que fiz: a trava de uma aba que sumiu <b>expira em 90 s</b> (antes 120 s), e o aviso já tem o botão <b>Editar aqui</b>. Minha suspeita: ao reabrir o navegador, ele <b>restaura a aba antiga junto com a nova</b> (duas abas de verdade, uma delas escondida). Para eu achar a causa, preciso que o Grok anote, quando acontecer: o navegador, se a aba antiga foi restaurada sozinha, e o tempo depois de fechar. O roteiro do Grok desta versão já pede isso.</p>',
     'Quando você viu isso, estava com mais de uma janela do navegador ou o navegador reabriu abas sozinho?', [], ''),
    ('D01', 'Sua ideia para os cartões do Início (L02)', G3,
     '<p>Você sugeriu que o cartão de "Nova planilha / Novo documento / Novo quadro" seja uma <b>prévia em branco</b> do próprio arquivo, no tema claro. <b>Achei melhor que a proposta do Grok</b>: a pessoa vê o que vai abrir (grade para planilha, folha com linhas de texto para documento, fundo pontilhado com um post-it para o quadro) e o cartão parece o arquivo de verdade. Fica na <b>v0.4.9</b>, junto com os cartões grandes (L05).</p>',
     'Pode seguir assim? Quer o cartão com sombra "Papel sobre a mesa" também?', [], ''),
    ('D02', 'Ícone do app e prompt para o Nano Banana', G3,
     '<p>Feito o <b>prompt para o Gemini (Nano Banana)</b>: ícone <b>minimalista</b> que continua legível pequeno (miniatura no celular e na aba), em três versões: ícone quadrado, versão com fundo transparente para a capa e variação em uma cor só. Está no arquivo <b>PROMPT-NANO-BANANA-ICONE.md</b>, com um passo a passo para escolher e testar em 48, 32 e 16 px antes de me enviar.</p>',
     'Quando gerar, mande as imagens que eu troco o ícone do app (192/512 e maskable).', [], ''),
    ('D03', 'Estudo: ligar OneDrive, Google Drive e Terabox', G3,
     '<p>Está no arquivo <b>ESTUDO-NUVENS-ONEDRIVE-GDRIVE-TERABOX.md</b>: dificuldade de cada um, melhor momento (resumo: <b>Google Drive e OneDrive na v0.8.0</b>, Terabox só depois e como "importar/exportar", porque não tem API oficial aberta), como tratar a regra de que <b>documento do servidor não pode ser baixado para fora sem autorização do superior</b>, e o que preciso de você para testar com as suas 3 contas (sem senhas: só criar um app de teste e me dar o identificador).</p>',
     'Concorda com a ordem (Drive e OneDrive primeiro, Terabox depois)?', [], ''),
    ('V01', 'Publicação da v0.4.8', G4,
     '<p>Depois da sua aprovação, publico a v0.4.8 no GitHub (commit só com esta versão). Nada vai antes disso.</p>', 'Pode publicar? (marque Aprovado e diga se quer algum ajuste antes, principalmente W01 e W03)', [], ''),
    ('V02', 'Próxima versão', G4,
     '<p><b>v0.4.9 (Sonnet 5.5 · alto)</b>: L02 (cartões do Início como prévia em branco, sua ideia), L05 (cartões grandes), L04 (menu estilo Google Drive), L06 (ícones da faixa maiores e coloridos), L07 (faixa do celular como no Excel Android) e L09 (temas claros e escuros com miniatura). Depois, a <b>v0.5.0 (Opus 5.5 · alto)</b>: abrir e salvar .xlsx com os seus 4 arquivos (Potabilidade, Coletas, Estoque e Acerola; não entram no pacote nem no GitHub).</p>',
     'Pode ser nessa ordem?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A v0.4.8 é o <b>visual novo</b>: tema Papel claro (dourado só como marca), "papel sobre a mesa" com sombras e contorno (três acabamentos para você escolher), menu e avisos mais limpos, um nome só (Quadros) e a Verificação sempre no mesmo lugar.</li>'
    '<li>Corrigi os 3 defeitos do Grok (B01, B02 e um passo no B03; este ainda precisa de dados).</li>'
    '<li>Juntos vão o <b>prompt do ícone (Nano Banana)</b> e o <b>estudo de ligar OneDrive, Google Drive e Terabox</b>.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Visual novo: Papel sobre a mesa')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
