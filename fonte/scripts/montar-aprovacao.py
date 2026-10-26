"""EFCdocs — monta a página de aprovação da v0.4.7 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.4.7'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
G1, G2, G3, G4, G5 = 'A. Tela como no Excel (o que você pediu)', 'B. Defeitos que o Grok achou na v0.4.6.1', 'C. Propostas de layout do Grok (L01 a L11)', 'D. Arquivos guardados', 'E. Decisões'
ITENS = [
    ('U01', 'Barra de cima com dois níveis', G1,
     '<p>A barra de cima (título, nome do arquivo, desfazer, busca) agora tem <b>dois níveis</b>. <b>Completa</b>: como sempre. <b>Compacta</b>: some a linha do título e <b>tudo vai para a linha das abas</b> (nome do arquivo, desfazer/refazer, busca, painel e opções ficam ali). Troca pelo botão <b>v / ^</b> no canto direito das abas, por <b>Exibir › Barra de cima</b> ou pelo Ctrl K. Fica guardado neste aparelho.</p>',
     'O botão fica bem onde você marcou com a seta amarela? A barra compacta tem tudo o que você usa lá em cima?',
     [('Antes (v0.4.6.1)', 'antes-tela'), ('Depois: barra compacta (com a faixa só nas abas)', 'depois-topo-compacto')], 'par'),
    ('U02', 'Faixa recolhível com o "^" (como no Excel)', G1,
     '<p>No canto de baixo da faixa há agora o <b>^</b>: um toque recolhe a faixa e deixa só as abas (ganha 4 linhas na planilha). Com a faixa recolhida, tocar numa aba mostra a faixa <b>por um momento</b> (como no Excel) e o botão vira um <b>alfinete</b> para fixar de volta. Também: <b>Ctrl+F1</b> e o menu "Como mostrar a faixa" que já existia (Mostrar tudo / Só as abas / Esconder).</p>',
     'Foi isso que você quis dizer com "dois níveis retráteis como no Excel"?',
     [('Faixa recolhida: só as abas', 'depois-faixa-abas'), ('Tocar numa aba mostra a faixa por um momento', 'depois-faixa-momento')], 'par'),
    ('U03', 'Menu lateral retrátil em três níveis', G1,
     '<p>O menu da esquerda agora tem três níveis: <b>completo</b> → <b>só ícones</b> → <b>escondido</b>. No rodapé do menu há o botão novo <b>Esconder menu</b>. Com o menu escondido aparecem o <b>☰</b> no topo e uma <b>alça fininha na borda esquerda</b> (uma setinha) para trazer o menu de volta com um toque. Tudo também em <b>Exibir › Menu lateral</b>.</p>',
     'A alça na borda esquerda é fácil de achar, ou prefere só o ☰ no topo?',
     [('Tudo recolhido: menu escondido, barra compacta, faixa só nas abas', 'depois-maximo')], 'um'),
    ('U04', 'Barra de fórmula (fx) que estica', G1,
     '<p>Como no Excel: a barra fx pode <b>crescer para baixo</b>. Três jeitos: (1) <b>arrastar a alça</b> da borda de baixo (sobe e desce à vontade); (2) o botão <b>v</b> na ponta direita abre para um tamanho médio; (3) <b>Ctrl+Shift+U</b>; e o <b>duplo clique na alça</b> também abre e fecha. Quando está esticada, o botão vira <b>^</b> e um toque volta <b>direto ao tamanho mínimo</b> (o de hoje). Limites: <b>mínimo = o tamanho atual</b>, <b>máximo = 220 px</b> (e nunca mais que 45% da tela). Esticada, a fórmula <b>quebra em linhas</b> e continua colorida; a altura fica guardada neste aparelho. No celular a barra continua como estava.</p>',
     'Os limites servem (mínimo de hoje, máximo 220 px)? Quer um máximo maior?',
     [('Esticada pelo botão v (tamanho médio)', 'depois-fx-expandida'), ('Arrastada à mão (162 px)', 'depois-fx-arrastada')], 'par'),
    ('U05', 'Quanto de planilha cabe na tela (campo de visão)', G1,
     '<p>Medido em 1366×800: <b>22 linhas</b> antes; <b>26</b> com a faixa só nas abas; <b>28</b> com a barra de cima compacta. Com o menu escondido, a grade ganha ainda <b>212 px de largura</b> (cerca de 2,6 colunas a mais). A faixa "Exibir" ganhou o grupo <b>Barra de cima</b> e o botão <b>Barra fx</b>; as linhas de grade, a folha clara e a barra fx agora ficam empilhadas num grupo só, para a faixa continuar cabendo em 1366 px sem o botão "Mais".</p>',
     'Ainda falta alguma coisa para "dar o máximo igual à tela do Excel"? (por exemplo, esconder também a barra de baixo com as abas da planilha.)',
     [('Exibir: os grupos novos', 'depois-exibir')], 'um'),
    ('U06', 'Ajuste pequeno: o teclado volta para a grade', G1,
     '<p>Depois de clicar nos botões da barra fx, clicar numa célula não devolvia o teclado para a grade (o Ctrl+Shift+U, por exemplo, falhava na primeira vez). Corrigido.</p>', '', [], ''),
    ('B01', 'Avisos empilhados depois do Ctrl+Z', G2,
     '<p>O Grok viu <b>3 avisos empilhados</b> ("Assinatura inserida…", "Assinatura excluída · Desfazer" e "Desfeito: Excluir assinatura"), e o <b>Desfazer</b> continuava clicável mesmo já desfeito. Proposta: ao desfazer, o aviso de "excluída · Desfazer" é <b>trocado</b> por "Desfeito", e um novo aviso <b>substitui</b> o anterior (um de cada vez, no canto de baixo). Não foi mexido nesta versão.</p>',
     'Aprova corrigir (na v0.4.8)?', [('Print do Grok', 'grok-avisos')], 'um'),
    ('B02', 'Cópia colada depois de recarregar cai em cima de outra cópia', G2,
     '<p>Depois de recarregar, a cópia caiu em cima da 2ª cópia, e colar de novo caiu no mesmo lugar. Proposta: procurar o <b>lugar livre ao lado</b> também quando a cópia vem de outra sessão (a posição de colar passa a andar a cada Ctrl+V).</p>',
     'Aprova corrigir (na v0.4.8)?', [('Print do Grok: cópias lado a lado e uma por cima', 'grok-quadro-copias')], 'um'),
    ('B03', '"Aberto em outra aba" sem outra aba aberta', G2,
     '<p>Ao reabrir o navegador, o quadro disse "Aberto em outra aba. Aqui fica só para ver" sem haver outra aba. Já é a 2ª vez que o Grok vê (pode ser o jeito de fechar o navegador: a trava não é solta). Proposta: a trava passa a <b>expirar sozinha</b> poucos segundos depois que a outra aba some, e o aviso ganha um "Editar aqui" que sempre funciona.</p>',
     'Aprova investigar e corrigir (na v0.4.8)? Se você também já viu isso, conte quando.', [], ''),
    ('L01', 'Abrir no tema claro, com a grade branca (prioridade alta do Grok)', G3,
     '<p>O app inteiro é escuro; Excel, Google Planilhas e EFClaudian são claros. Proposta: <b>abrir no tema claro</b>, o dourado só como destaque; os temas escuros continuam em Opções › Tema. Minha nota: é a mudança que mais muda a cara; dá para você escolher o tema antes e ficar com o que preferir.</p>',
     'Aprova abrir no tema claro? (ou prefere continuar escuro e só testar o claro?)', [('Hoje (escuro)', 'grok-escuro'), ('Proposta (claro)', 'grok-claro')], 'par'),
    ('L02', 'Esconder o que ainda não funciona (prioridade alta)', G3,
     '<p>Somem as bolinhas laranja, os botões "chega na v0.6.0" e os "em breve"; tudo vai para uma tela <b>"O que vem por aí"</b> em Sobre. Dá uma tela mais limpa (ver o Início antes e depois).</p>',
     'Aprova?', [('Hoje', 'grok-inicio-antes'), ('Proposta', 'grok-inicio-depois')], 'par'),
    ('L03', 'Um nome só para o quadro (prioridade alta)', G3,
     '<p>Hoje aparecem três nomes: "Post-its" no menu, "Novo quadro" no botão, "Quadro sem título" no título. Proposta: menu "Quadros", botão e título "Quadro", e "Post-it" só para a peça amarela.</p>', 'Aprova?', [], ''),
    ('L04', 'Menu lateral como o do Google Drive (média)', G3,
     '<p>Início e Recentes em cima, depois "Meus arquivos" (Planilhas, Documentos, Quadros), Lixeira embaixo, perfil com Opções no rodapé, e o ☰ para recolher no topo.</p>', 'Aprova?', [], ''),
    ('L05', 'Início com cartões grandes de criar (média)', G3,
     '<p>Cartões grandes de "Nova planilha / documento / quadro", Recentes em lista embaixo e, quando estiver vazio, uma frase que ensina: "Comece criando uma planilha. Tudo fica salvo neste aparelho."</p>', 'Aprova?', [], ''),
    ('L06', 'Ícones da faixa maiores e coloridos (média)', G3,
     '<p>Cada família de comandos ganha uma cor; Colar, AutoSoma e Assinatura em tamanho grande, como no Excel.</p>', 'Aprova?', [], ''),
    ('L07', 'Faixa do celular como a do Excel no Android (média)', G3,
     '<p>Uma barra só, com B/I/U, cor e Σ, mais um botão "Mais" que abre as abas.</p>', 'Aprova?', [], ''),
    ('L08', 'Textos sem jargão (média)', G3,
     '<p>O rodapé diz "Salvo neste aparelho às 07:56" no lugar de "Rev. 00 · 108 B", e cada item de Opções ganha uma frase curta dizendo para que serve.</p>', 'Aprova?', [], ''),
    ('L09', 'Temas separados em Claros e Escuros, com miniatura (baixa)', G3,
     '<p>6 em destaque e um "Ver todos".</p>', 'Aprova?', [], ''),
    ('L10', 'Um aviso de cada vez, no canto de baixo à esquerda (baixa)', G3,
     '<p>Como no Google. Resolve também o B01.</p>', 'Aprova?', [], ''),
    ('L11', '"Problemas" e "Assistente" no painel da direita (baixa)', G3,
     '<p>Mesmo nome e mesmo lugar em todos os arquivos, sem boiar em cima da grade. Combina com o painel lateral que você quer retrátil.</p>', 'Aprova?', [], ''),
    ('M01', 'Onde ficam guardados os arquivos (a sua frase ficou cortada)', G4,
     '<p>No fim do relatório do Grok você escreveu: <i>"Peço que vc também dê uma melhorada ainda mais, partes onde fica arquivado"</i>, e a frase terminou aí. Entendi que é sobre <b>onde os arquivos ficam guardados e como achá-los</b> (Recentes, Pastas, Lixeira, Documentos externos). Hoje: tudo fica neste aparelho; Pastas e Documentos externos estão marcados "em breve" (v0.8.0). Ideias que posso fazer antes: <b>Recentes</b> com busca e ordem (mais novo / nome), <b>estrela</b> para favoritos, Lixeira com "esvaziar", e uma linha clara "Salvo neste aparelho" em cada arquivo.</p>',
     'Era isso? Conte com suas palavras o que quer melhorar (e o que mais usa para achar um arquivo).', [], ''),
    ('V01', 'O que mais incomoda?', G5,
     '<p>Fora o que está acima.</p>', 'Ainda tem alguma tela que incomoda (cite qual e o quê)?', [], ''),
    ('V02', 'Publicação da v0.4.7', G5,
     '<p>Depois da sua aprovação, publico a v0.4.7 no GitHub (commit só com esta versão). Nada vai antes disso.</p>', 'Pode publicar? (marque Aprovado e diga se quer algum ajuste antes)', [], ''),
    ('V03', 'Próxima versão', G5,
     '<p>Sugestão: <b>v0.4.8</b> (Sonnet 5.5 · alto) com B01 a B03 e os L que você aprovar (L01 a L03 primeiro, como o Grok sugere), e depois a <b>v0.5.0 (Opus 5.5 · alto)</b>, abrir e salvar Excel (.xlsx), para a qual preciso dos seus <b>3 a 5 arquivos .xlsx</b> com dados trocados.</p>',
     'Pode ser nessa ordem? Os .xlsx já estão separados?', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>{sys.argv[4]} testes de regras</span><span>{sys.argv[5]} testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A v0.4.7 é a <b>tela como no Excel</b>: barra de cima com dois níveis, faixa recolhível com o ^, menu lateral que esconde de vez e barra de fórmula que estica.</li>'
    '<li>Esta página também traz o <b>relatório do Grok sobre a v0.4.6.1</b>: T01 a T05 passaram; 3 defeitos (B01 a B03) e as 11 propostas de layout (L01 a L11) para você aprovar uma a uma. Nada disso foi mexido ainda.</li>'
    '<li>Você disse que não precisava de testes novos para a barra fx: fiz só uma checagem rápida e rodei os testes que já existiam. Nada foi publicado.</li>'
    '<li>Nada a configurar no Firebase.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Tela como no Excel')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
