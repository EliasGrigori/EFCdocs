"""EFCdocs — monta a página de aprovação da v0.4.0 (um arquivo só, imagens embutidas).
Uso: python3 scripts/montar-aprovacao.py <pasta-dos-prints> <saida.html> "<tamanho>" """
import html, json, sys

pasta, saida, tamanho = sys.argv[1], sys.argv[2], sys.argv[3]
VERSAO = 'v0.4.0'
img = json.load(open(f'{pasta}/imagens.json'))

# (código, título, grupo, texto em html, pergunta (ou ''), fotos [(legenda, chave)], estilo das fotos)
G1, G2, G3, G4 = 'A. Base: o Excel que todo mundo conhece', 'B. Ideias dos editores de código', 'C. Celular, tema e robustez', 'D. Decisões e o que fica para depois'
ITENS = [
    ('F01', 'Grade e abas do tamanho do Excel (PL01)', G1,
     '<p>1.048.576 linhas e 16.384 colunas (até XFD). A tela desenha só o que aparece, então rola leve. Abas: criar (+), renomear (dois toques), cor, mover, duplicar, ocultar e reexibir, excluir (com aviso). '
     'Largura e altura arrastando a divisa (dois toques ajusta sozinho), ocultar linhas e colunas, zoom de 50% a 200%. '
     '<b>Congelar painéis</b> veio da v0.6.0 para cá: até a célula ativa, a linha de cima ou a primeira coluna.</p>',
     '', [('Antes (v0.3.2): planilha "em breve"', 'antes-planilha'), ('Depois: abas e painéis congelados', 'depois-abas')], ''),
    ('F02', 'Digitação e atalhos iguais ao Excel (PL02)', G1,
     '<p>F2 edita, F4 alterna o $, Ctrl+Enter preenche a seleção, Ctrl+; põe a data de hoje (Ctrl+Shift+; a hora), Ctrl+setas pulam até o fim dos dados, Shift+espaço e Ctrl+espaço selecionam linha e coluna, Ctrl+D e Ctrl+R preenchem, Alt+= faz AutoSoma, Ctrl+N/I/S negrito, itálico e sublinhado, Ctrl+1 formato. '
     'Alça de preenchimento com séries (1, 2, 3; datas; jan, fev; seg, ter; Q-001, Q-002); dois toques na alça preenche até o fim dos dados ao lado. '
     'Ao digitar texto, sugere o que já existe na coluna (Enter aceita). Copiar e colar com o Excel nos dois sentidos, levando as fórmulas. Inserir e excluir linhas e colunas ajusta todas as fórmulas de todas as abas (o que sumir vira #REF!, como no Excel). Desfazer até 200 passos.</p>',
     '', [('Menu do botão direito (no celular: segurar o dedo)', 'depois-menu')], 'um'),
    ('F03', 'Formatos guardados no código do Excel (PL03)', G1,
     '<p>Número, R$, %, data dd/mm/aaaa, hora, texto, fonte e tamanho, negrito, itálico, sublinhado, cores, bordas, alinhamento, quebrar texto e mesclar. '
     'Cada formato é guardado no código que o arquivo do Excel usa (ex.: <code>#,##0.00</code>) e aparece em pt-BR (<code>#.##0,00</code>, <code>dd/mm/aaaa</code>). Assim a v0.5.0 abre e salva .xlsx sem tradução. '
     'Número que não cabe vira notação científica ou ####, como no Excel; data e número largos alargam a coluna ao digitar.</p>',
     '', [('Formatos, R$ e % digitados, data com a letra O corrigida', 'depois-formatos')], 'um'),
    ('F04', 'Motor de cálculo próprio, separado das telas (PL04)', G1,
     '<p>Escrito do zero em pt-BR (ponto e vírgula e vírgula decimal). Recalcula só o que depende da célula alterada (10 mil fórmulas: abre em menos de 1 s, recalcula em menos de 0,1 s neste computador). '
     'Mostra os erros do Excel (#DIV/0!, #N/D, #REF!, #VALOR!, #NOME?, #NÚM!, #NULO!, #DESPEJAR!) e avisa <b>conta circular</b> (a célula fica 0, como no Excel). '
     'Datas com a contagem do Excel, inclusive o 29/02/1900. Fórmulas que <b>derramam</b> (FILTRO, ÚNICO, CLASSIFICAR, SEQUÊNCIA) já funcionam, com #DESPEJAR! quando o caminho está ocupado. '
     'Função que o EFCdocs ainda não conhece não quebra nada: a fórmula fica guardada e a célula mostra o último valor do Excel.</p>'
     '<p>Por dentro, a fórmula é guardada como no arquivo do Excel (em inglês, com vírgula) e mostrada em pt-BR. Para você não muda nada; é o que garante a ida e volta do .xlsx na v0.5.0.</p>',
     '', [], ''),
    ('F05', 'As funções prioritárias: 123 funções em pt-BR (PL05)', G1,
     '<p>Todas as da lista da Proposta 03, mais algumas que faltavam (TEMPO, SEGUNDO, DATA.VALOR, VALOR.TEMPO, MULT, QUOCIENTE, SINAL, ALEATÓRIO, ALEATÓRIOENTRE, TRANSPOR, ÉLÓGICO, NÃO.DISP, DESVPAD, VAR.A, VAR.P, EXATO, CARACT, CÓDIGO, TIRAR). Cada uma com descrição, argumentos e exemplo em português.</p>'
     '<p><b>Nomes conferidos na documentação do Excel em pt-BR.</b> Três nomes da proposta estavam diferentes do Excel e foram corrigidos: <code>XOU</code> é <b>OUEXCL</b>; <code>ÉNÃO.DISP</code> é <b>É.NÃO.DISP</b>; <code>ÚNICO</code> confirmado (a lista da Microsoft às vezes mostra ÚNICA). Os nomes antigos também são aceitos e trocados sozinhos.</p>',
     'Aprova a lista e as correções de nome?', [('Inserir função: busca pelo que você quer fazer', 'depois-funcoes')], 'um'),
    ('F06', 'Barra de status que vira fórmula (PL06)', G1,
     '<p>Ao selecionar células, o rodapé mostra Soma, Média e Contagem; a engrenagem liga também Contagem de números, Mín e Máx (cada aparelho lembra). '
     'Tocar num valor oferece <b>Copiar</b>, <b>Pôr a conta embaixo</b> (escreve =SOMA(...) na primeira vazia abaixo) e <b>Pôr a conta ao lado</b>.</p>',
     '', [('Soma: 6,7 → Pôr a conta embaixo', 'depois-status')], 'um'),
    ('F07', 'Dica de argumentos com exemplo e autocompletar com os nomes da planilha (PL07)', G2,
     '<p>Enquanto você digita, a dica mostra o argumento em que você está, o que ele significa e um exemplo. O autocompletar sugere funções, nomes definidos e os <b>títulos das colunas</b> (digitar "clo" oferece "Cloro livre (C)"). Tab ou Enter completa.</p>',
     '', [('Dica do SE com o argumento atual destacado', 'depois-ajuda')], 'um'),
    ('F08', 'Erro avisado antes do Enter, com "Corrigir" (PL08)', G2,
     '<p>Parêntese sem fechar, vírgula no lugar de ponto e vírgula, texto sem aspas, função com nome errado (sugere a parecida), argumento faltando, intervalo invertido e aba que não existe. '
     'O Enter não grava fórmula com erro: o aviso diz o que é e o botão conserta (um por um ou "Corrigir os dois").</p>',
     '', [('Vírgula no lugar de ; e parêntese aberto', 'depois-erro')], 'um'),
    ('F09', 'O nome da coluna junto da referência (PL09)', G2,
     '<p>Na barra de fórmula, cada referência ganha uma etiqueta com o título da coluna: <code>C4 ‹Cloro livre›</code>. A etiqueta não faz parte da fórmula e não vai para o Excel. '
     'O título vem da linha de cabeçalho, que o app acha sozinho; se errar, botão direito na linha certa › "Linha N é o cabeçalho".</p>',
     '', [('Barra de fórmula com as etiquetas', 'depois-barra')], 'um'),
    ('F10', 'Prévia, parênteses coloridos e nomes em inglês aceitos (PL10)', G2,
     '<p>O resultado aparece embaixo enquanto você digita. Cada par de parênteses tem uma cor e o par do cursor fica destacado; as referências têm a mesma cor na fórmula e na grade. '
     'Quem digita <b>VLOOKUP, SUM, IF</b> recebe a dica "VLOOKUP é PROCV em português. Trocar" e, no Enter, o app troca sozinho.</p>',
     '', [('VLOOKUP aceito, com prévia', 'depois-ingles')], 'um'),
    ('F11', 'Ir para a origem, "Quem usa esta célula" e Ctrl+K (PL14)', G2,
     '<p>Ctrl+clique numa referência da barra de fórmula leva até ela, mesmo em outra aba; Alt+← volta. "De onde vem / quem usa" (Fórmulas ou botão direito) lista o que a conta usa e todas as fórmulas, de qualquer aba, que dependem da célula. '
     'O Ctrl+K também acha células (B12, Resumo!A1), nomes, abas e títulos de coluna.</p>',
     '', [('Quem usa a Meta_Cloro', 'depois-quemusa'), ('Ctrl+K: "cloro" acha o nome e a coluna', 'depois-ctrlk')], ''),
    ('F12', 'Nomes fáceis: chamar uma célula de Meta_Cloro (PL16)', G2,
     '<p>Selecione e digite o nome na caixa de nome (à esquerda do fx), ou use Fórmulas › Dar nome. Aí a fórmula fica <code>=SE(C3&gt;=Meta_Cloro;"OK";"Ajustar")</code>. Renomear troca em todas as fórmulas de uma vez; é o mesmo recurso do Excel.</p>',
     '', [('Nomes da planilha', 'depois-nomes')], 'um'),
    ('F13', 'Linha do tempo do desfazer, em todos os módulos (PL17)', G2,
     '<p>Os 200 passos têm nome ("Digitar em C3", "Inserir linha 5", "Colar 24 células"). O botão de relógio no topo (ou tocar em "Desfazer: ..." no rodapé) abre a lista; tocar num passo volta até ali, e dá para avançar de novo. Vale também no quadro de post-its.</p>',
     '', [('Linha do tempo', 'depois-tempo')], 'um'),
    ('F14', 'Planilha boa de usar no celular (PL19)', G3,
     '<p>Editar abre uma faixa grande embaixo (a grade não pula), com a barra = ; ( ) : $ " &lt; &gt; e as funções mais usadas (SOMA, SE, PROCV, CONT.SE, MÉDIA, HOJE). '
     'Seleção por alças nas pontas, sem mouse. Coluna de números abre o teclado numérico; coluna de data mostra o calendário. Segurar o dedo abre o menu.</p>',
     '', [('Alças da seleção', 'depois-celular-alcas'), ('Faixa de edição com os símbolos', 'depois-celular-banda')], 'cel'),
    ('F15', 'A grade segue o tema; "Folha clara" em Exibir (PL23)', G3,
     '<p>Fundo, letra automática e linhas de grade seguem o tema do app (aqui o Petróleo). Cores postas de propósito ficam iguais, porque vão para o Excel; letra automática sobre fundo pintado fica escura ou clara conforme o fundo, e cor de letra ilegível no escuro clareia só na tela. '
     '"Folha clara" deixa a grade branca, e cada aparelho lembra.</p>',
     '', [('Tema Petróleo', 'depois-formatos'), ('Folha clara', 'depois-folhaclara')], ''),
    ('F16', 'Robustez para quem mais preenche (PL26)', G3,
     '<p>Data digitada ou colada com a <b>letra O</b> no lugar do zero (1O/1O/2026) é corrigida com aviso. Data que não existe (31/02/2026) fica como texto e avisa, em vez de virar número errado. '
     'No celular, "Próxima vazia" grava e pula para a próxima célula vazia da coluna; coluna de números abre o teclado numérico, coluna de data mostra o calendário.</p>'
     '<p>A proteção da <b>lista suspensa</b> contra o colar depende da validação de dados, que chega na v0.6.0 (como no plano). Lá o colar vai respeitar a lista.</p>',
     'Serve deixar a proteção da lista suspensa para a v0.6.0, junto com a validação?', [], ''),
    ('F17', 'Desempenho com 10 mil linhas (PL27)', G3,
     '<p>Colar 10 mil linhas, somar e contar a coluna inteira (B:B) e ir até o fim com Ctrl+↓: tudo em menos de 8 s no teste automático (o colar é a parte mais lenta). Rolar continua leve porque a tela desenha só o que aparece.</p>',
     '', [('Linha 9.990 de 10.000', 'depois-10mil')], 'um'),
    ('F18', 'Perfis: quem pode editar a planilha', G4,
     '<p>Linha nova "planilha.editar", igual à do quadro: Admin, Editor e Operador editam; Leitor só vê (a grade mostra "Só leitura"). Travar o modelo para o Operador só preencher chega na v0.6.0 ("Travar modelo").</p>',
     'Operador edita a planilha até a v0.6.0 (sugestão), ou só Admin e Editor?', [], ''),
    ('F19', 'O que fica para a v0.4.1 e a v0.5.0', G4,
     '<p><b>v0.4.1</b> (PL24): "Explicar esta conta" (PL11), "Por que deu erro?" (PL12), painel Problemas (PL13), a conta desenhada como fluxograma (PL15) e montar a conta respondendo uma pergunta (PL18). O botão "Explicar conta" já aparece com o ponto amarelo.</p>'
     '<p><b>v0.5.0</b>: abrir e salvar Excel, PDF e imprimir a planilha, aviso de função que o Excel antigo não abre (PL21). Para isso continuam faltando os 3 a 5 arquivos .xlsx reais com dados trocados.</p>',
     '', [], ''),
]

n = len(ITENS)
resumo = (
    f'<div class="nums"><span>79/79 testes de regras</span><span>63/63 testes no navegador</span><span>console sem erros</span><span>{html.escape(tamanho)}</span><span>{n} itens para decidir</span></div>'
    '<ul>'
    '<li>A <b>v0.3.2 já está no GitHub</b> (commit 69dd937). Esta é a primeira entrega da Planilha (PL24 A): PL01 a PL10, PL14, PL16, PL17 e PL19, mais PL23, PL26 e PL27.</li>'
    '<li>Testes novos: 23 de regras (motor, funções, formatos, digitação, séries, ajuda, inserir/excluir, renomear, colar, 10 mil linhas) e 21 no navegador (computador e celular). Os 42 testes do quadro continuam passando.</li>'
    '<li>Nada vai ao GitHub antes da sua resposta.</li>'
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
              .replace('{{VERSAO}}', VERSAO).replace('{{SUBTITULO}}', 'Planilha (1ª entrega)')
              .replace('{{N}}', str(n)))
assert saida_html.count('class="item"') == n and '{{' not in saida_html
open(saida, 'w', encoding='utf-8').write(saida_html)
print('página de aprovação:', saida, round(len(saida_html) / 1024), 'KB')
