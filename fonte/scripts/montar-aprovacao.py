"""EFCdocs — monta a página de aprovação da v0.4.4.1 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.4.4.1'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
G1, G2, G3 = 'A. O que você pediu na v0.4.4 (comentários M02 e M04)', 'B. O que o Grok achou na v0.4.4', 'C. Decisões'
ITENS = [
    ('P01', 'Arquivos em cartões, 2 ou 3 por linha (opção A do M02)', G1,
     '<p>As listas de Planilhas, Documentos e Quadros agora são <b>cartões</b>: 3 por linha no computador, 2 em janelas mais estreitas (800 px) e 1 no celular. O nome pode ocupar <b>duas linhas</b> (não é mais cortado com "..."), e embaixo fica só a data. Saíram a palavra "Planilha" (já está no título), o selo "Rascunho" e o título repetido; no lugar do título há só a contagem ("5 planilhas") ao lado do filtro. Ao parar o mouse no cartão aparece o nome inteiro. Renomear e mandar para a lixeira ficam no canto de cima à direita.</p>',
     'Ficou do jeito que você imaginou?',
     [('Antes (computador)', 'antes-pc-planilhas'), ('Depois (computador)', 'depois-pc-planilhas'), ('Antes (celular)', 'antes-cel-planilhas'), ('Depois (celular)', 'depois-cel-planilhas')], 'par'),
    ('P02', 'Fundo das janelas igual ao do EFClaudian (M04)', G1,
     '<p>Copiei do EFClaudian: quando abre uma janela, o fundo escurece <b>25%</b> com um <b>desfoque leve</b> (3 px). Antes escurecia 45% sem desfoque. Vale para Opções, Renomear, confirmações e a gaveta do celular. Uma janela aberta sobre outra soma o fundo de novo, então a de trás fica ainda mais apagada.</p>',
     'É isso o que você queria dizer com "embaçado 30%"? Se quiser 30% no lugar de 25%, é só dizer.',
     [('Antes: Opções', 'antes-pc-opcoes-fundo'), ('Depois: Opções', 'depois-pc-opcoes-fundo'), ('Antes: janela sobre a Lixeira', 'antes-pc-lixeira-pergunta'), ('Depois: janela sobre a Lixeira', 'depois-pc-lixeira-pergunta')], 'par'),
    ('P03', 'Lixeira: "Apagar para sempre" com confirmação', G2,
     '<p>Antes, "Excluir de vez" era só um <b>X</b> que parece "fechar". Agora é um botão escrito <b>Apagar para sempre</b>, em vermelho, e a janela pergunta: "Apagar [nome] para sempre? Não dá para desfazer."</p>',
     '', [('Antes', 'antes-pc-lixeira'), ('Depois', 'depois-pc-lixeira')], 'par'),
    ('P04', 'Demonstração e "aberto em outra aba": um aviso só', G2,
     '<ul><li><b>Demonstração</b> aparecia três vezes (faixa de cima, selo e rodapé). Ficou só o selo ao lado de Novo ("Demonstração: 0 de 3 arquivos"); ao tocar nele aparece a explicação (guardado só neste aparelho, exportações com a marca DEMO · EFC).</li>'
     '<li><b>Aberto em outra aba</b> aparecia três vezes (faixa, etiqueta e aviso embaixo). Ficou a faixa de cima ("Aberto em outra aba. Aqui fica só para ver.", com o botão Editar aqui) e a etiqueta curta "Só para ver". O aviso embaixo só aparece quando você tenta digitar.</li>'
     '<li><b>Marca presa:</b> se a outra aba fechar à força (celular que mata o app, navegador que cai), a marca de "aberto" ficava. Agora a aba que edita avisa a cada 15 segundos que está viva; se parar de avisar por 2 minutos, a outra aba é liberada sozinha ("A outra aba não responde mais. Agora dá para editar aqui."). Não consegui reproduzir exatamente o caso do Grok, só o princípio: um teste automático simula a aba que para de avisar. Se ainda acontecer no seu aparelho, o botão Editar aqui continua resolvendo.</li></ul>',
     '', [('Antes: demonstração', 'antes-pc-demo'), ('Depois: demonstração', 'depois-pc-demo')], 'par'),
    ('P05', 'Quadro: barra da esquerda escondida, quadro vazio numa linha, forma Início/Fim, OK e Cancelar no celular', G2,
     '<ul><li>A barra de ferramentas da esquerda repetia a faixa Inserir. Agora <b>começa escondida</b> (liga em Exibir ou pelo comando "Barra de ferramentas do quadro"). Quem já tinha escolhido antes volta ao novo padrão uma vez.</li>'
     '<li>O cartão do quadro vazio tem uma linha ("Comece por:") e os quatro botões numa linha só. A dica dos dois toques ficou ao parar o mouse.</li>'
     '<li>A caixa de escrever da forma <b>Início/Fim</b> agora é arredondada como a forma.</li>'
     '<li>No <b>celular</b>, ao escrever numa forma ou post-it aparece embaixo a barra <b>Cancelar / OK</b>, como na planilha. Antes só dava para sair tocando fora.</li></ul>',
     '', [('Antes: quadro vazio', 'antes-pc-quadro'), ('Depois: quadro vazio', 'depois-pc-quadro'), ('Antes: forma (celular)', 'antes-cel-quadro-forma'), ('Depois: forma com OK/Cancelar', 'depois-cel-quadro-forma')], 'par'),
    ('P06', 'Opções e Explicar', G2,
     '<ul><li>No celular, o resumo da Tela estava comprido ("Faixa tipo Excel · Mostrar tudo · menu completo"). Agora é "Excel · tudo · completo".</li>'
     '<li>Os nomes dos temas "Alto contraste" e "Curvas de nível" quebravam em duas linhas. Agora cabem numa.</li>'
     '<li><b>Explicar</b> do <code>=SE(D3=0;"";E3/D3)</code> mostrava a conta crua ("se não, mostra E3/D3"). Agora: "se não, divide a coluna Conformes (E2 = 9) pela coluna Qtd. amostras (D2 = 10) (= 0,9)". Vale para qualquer conta ou função dentro do SE.</li></ul>',
     '', [('Antes: Tela (celular)', 'antes-cel-opcoes-tela'), ('Depois: Tela (celular)', 'depois-cel-opcoes-tela'), ('Antes: temas (celular)', 'antes-cel-opcoes-tema'), ('Depois: temas (celular)', 'depois-cel-opcoes-tema')], 'par'),
    ('P07', 'O que mais incomoda?', G3,
     '<p>Esta versão é só ajuste. Não mexi nas cores dos temas, na faixa de botões da planilha e do quadro, nem no celular deitado (fica para depois, como combinado).</p>',
     'Ainda tem alguma tela que incomoda (cite qual e o quê)? Se não, sigo para a Assinatura.', [], ''),
    ('P08', 'Publicação e próxima versão', G3,
     '<p>Se aprovar, publico a <b>v0.4.4.1</b> no GitHub. Próxima: <b>v0.4.5 Assinatura</b> (Sonnet 5.5 · alto): linha em branco com o nome completo embaixo, rubrica desenhada com o mouse ou o dedo, ou foto; primeiro no quadro, depois Docx e Planilha. A imagem fica só no arquivo, no aparelho.</p>',
     'Pode publicar a v0.4.4.1 e seguir para a Assinatura?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A v0.4.4 (com a v0.4.3.1) já está no GitHub, aprovada por você. Esta é uma versão pequena em cima dela.</li>'
    '<li>Traz o que você pediu nos comentários M02 (cartões) e M04 (fundo das janelas, copiado do EFClaudian) e os achados do Grok na v0.4.4.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'cartões, fundo das janelas, Lixeira e avisos repetidos')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
