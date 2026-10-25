/* EFCdocs — Planilha: catálogo das funções (nome em português do Brasil, nome em inglês do arquivo do Excel,
   o que faz, argumentos e exemplo). Nomes conferidos na documentação do Excel em pt-BR (25/10/2026).
   arg: "nome|o que é". [nome] = opcional; nome... = pode repetir.
   v: '19' = Excel 2019 ou mais novo; '21' = Excel 2021/365 (avisa no PL21, v0.5.0). vol = recalcula sempre. */

const F = (en, pt, cat, desc, args, ex, extra = {}) => ({ en, pt, cat, desc, args: args.map(lerArg), ex, ...extra });
function lerArg(s) {
  const [n, d] = s.split('|');
  const opc = /^\[.*\]$/.test(n.replace(/\.\.\.$/, ''));
  const rep = /\.\.\.$/.test(n);
  return { n: n.replace(/^\[|\]$|\.\.\.$/g, '').replace(/\]$/, ''), d: d || '', opc, rep };
}

export const CATEGORIAS = {
  soma: 'Somar e contar', est: 'Médias e estatística', log: 'Lógica', busca: 'Buscar',
  mat: 'Matrizes que derramam', data: 'Data e hora', texto: 'Texto', num: 'Números', info: 'Testes',
};

export const FUNCOES = [
  /* Somar e contar */
  F('SUM', 'SOMA', 'soma', 'Soma os números.', ['núm1|número, célula ou faixa', '[núm2]...|mais números ou faixas'], '=SOMA(B2:B25)'),
  F('SUMIF', 'SOMASE', 'soma', 'Soma só as células que atendem a uma condição.', ['intervalo|onde olhar a condição', 'critérios|a condição, ex.: ">10" ou "Ajustar"', '[intervalo_soma]|o que somar (se não for o mesmo)'], '=SOMASE(D2:D30;"Ajustar";E2:E30)'),
  F('SUMIFS', 'SOMASES', 'soma', 'Soma com várias condições ao mesmo tempo.', ['intervalo_soma|o que somar', 'intervalo_critérios1|onde olhar a 1ª condição', 'critérios1|a 1ª condição', '[intervalo_critérios2]...|onde olhar a próxima', '[critérios2]...|a próxima condição'], '=SOMASES(E2:E30;A2:A30;"Lote 1";D2:D30;"OK")'),
  F('SUMPRODUCT', 'SOMARPRODUTO', 'soma', 'Multiplica as faixas item a item e soma.', ['matriz1|primeira faixa', '[matriz2]...|outra faixa do mesmo tamanho'], '=SOMARPRODUTO(B2:B10;C2:C10)'),
  F('COUNT', 'CONT.NÚM', 'soma', 'Conta as células com número.', ['valor1|célula ou faixa', '[valor2]...|mais faixas'], '=CONT.NÚM(B2:B30)'),
  F('COUNTA', 'CONT.VALORES', 'soma', 'Conta as células que não estão vazias.', ['valor1|célula ou faixa', '[valor2]...|mais faixas'], '=CONT.VALORES(A2:A30)'),
  F('COUNTBLANK', 'CONTAR.VAZIO', 'soma', 'Conta as células vazias.', ['intervalo|a faixa'], '=CONTAR.VAZIO(C2:C30)'),
  F('COUNTIF', 'CONT.SE', 'soma', 'Conta as células que atendem a uma condição.', ['intervalo|onde contar', 'critérios|a condição, ex.: "Ajustar" ou ">=0,5"'], '=CONT.SE(D2:D200;"Ajustar")'),
  F('COUNTIFS', 'CONT.SES', 'soma', 'Conta com várias condições ao mesmo tempo.', ['intervalo_critérios1|onde olhar a 1ª condição', 'critérios1|a 1ª condição', '[intervalo_critérios2]...|onde olhar a próxima', '[critérios2]...|a próxima condição'], '=CONT.SES(A2:A30;"Lote 1";D2:D30;"OK")'),
  F('SUBTOTAL', 'SUBTOTAL', 'soma', 'Total que ignora outros subtotais (e linhas ocultas, com 101 a 111).', ['núm_função|9 = soma, 1 = média, 2 = contar, 4 = máximo, 5 = mínimo (101 a 111 ignoram ocultas)', 'ref1|faixa', '[ref2]...|mais faixas'], '=SUBTOTAL(9;B2:B30)'),
  F('AGGREGATE', 'AGREGAR', 'soma', 'Como o SUBTOTAL, mas pode ignorar erros.', ['núm_função|1 média, 2 contar, 4 máx, 5 mín, 9 soma, 14 maior, 15 menor', 'opções|6 = ignora erros, 7 = ignora erros e ocultas', 'ref1|faixa', '[k]|posição (para 14 e 15)'], '=AGREGAR(9;6;B2:B30)'),

  /* Médias e estatística */
  F('AVERAGE', 'MÉDIA', 'est', 'Média dos números.', ['núm1|número ou faixa', '[núm2]...|mais números'], '=MÉDIA(B2:B25)'),
  F('AVERAGEIF', 'MÉDIASE', 'est', 'Média só do que atende a uma condição.', ['intervalo|onde olhar a condição', 'critérios|a condição', '[intervalo_média]|o que entra na média'], '=MÉDIASE(A2:A30;"Lote 1";B2:B30)'),
  F('AVERAGEIFS', 'MÉDIASES', 'est', 'Média com várias condições.', ['intervalo_média|o que entra na média', 'intervalo_critérios1|onde olhar a 1ª condição', 'critérios1|a 1ª condição', '[intervalo_critérios2]...|próxima faixa', '[critérios2]...|próxima condição'], '=MÉDIASES(B2:B30;A2:A30;"Lote 1")'),
  F('MEDIAN', 'MED', 'est', 'O valor do meio (mediana).', ['núm1|número ou faixa', '[núm2]...|mais números'], '=MED(B2:B25)'),
  F('MAX', 'MÁXIMO', 'est', 'O maior número.', ['núm1|número ou faixa', '[núm2]...|mais números'], '=MÁXIMO(B2:B25)'),
  F('MIN', 'MÍNIMO', 'est', 'O menor número.', ['núm1|número ou faixa', '[núm2]...|mais números'], '=MÍNIMO(B2:B25)'),
  F('LARGE', 'MAIOR', 'est', 'O k-ésimo maior número.', ['matriz|a faixa', 'k|1 = o maior, 2 = o segundo maior...'], '=MAIOR(B2:B25;2)'),
  F('SMALL', 'MENOR', 'est', 'O k-ésimo menor número.', ['matriz|a faixa', 'k|1 = o menor, 2 = o segundo menor...'], '=MENOR(B2:B25;1)'),
  F('MAXIFS', 'MÁXIMOSES', 'est', 'O maior número que atende às condições.', ['intervalo_máximo|de onde tirar o maior', 'intervalo_critérios1|onde olhar a condição', 'critérios1|a condição', '[intervalo_critérios2]...|próxima faixa', '[critérios2]...|próxima condição'], '=MÁXIMOSES(B2:B30;A2:A30;"Lote 1")', { v: '19' }),
  F('MINIFS', 'MÍNIMOSES', 'est', 'O menor número que atende às condições.', ['intervalo_mínimo|de onde tirar o menor', 'intervalo_critérios1|onde olhar a condição', 'critérios1|a condição', '[intervalo_critérios2]...|próxima faixa', '[critérios2]...|próxima condição'], '=MÍNIMOSES(B2:B30;A2:A30;"Lote 1")', { v: '19' }),
  F('STDEV.S', 'DESVPAD.A', 'est', 'Desvio padrão de uma amostra.', ['núm1|número ou faixa', '[núm2]...|mais números'], '=DESVPAD.A(B2:B25)'),
  F('STDEV.P', 'DESVPAD.P', 'est', 'Desvio padrão da população inteira.', ['núm1|número ou faixa', '[núm2]...|mais números'], '=DESVPAD.P(B2:B25)'),
  F('STDEV', 'DESVPAD', 'est', 'Desvio padrão de uma amostra (nome antigo do DESVPAD.A).', ['núm1|número ou faixa', '[núm2]...|mais números'], '=DESVPAD(B2:B25)'),
  F('VAR.S', 'VAR.A', 'est', 'Variância de uma amostra.', ['núm1|número ou faixa', '[núm2]...|mais números'], '=VAR.A(B2:B25)'),
  F('VAR.P', 'VAR.P', 'est', 'Variância da população inteira.', ['núm1|número ou faixa', '[núm2]...|mais números'], '=VAR.P(B2:B25)'),
  F('MODE.SNGL', 'MODO.ÚNICO', 'est', 'O número que mais se repete.', ['núm1|número ou faixa', '[núm2]...|mais números'], '=MODO.ÚNICO(B2:B25)'),
  F('RANK.EQ', 'ORDEM.EQ', 'est', 'A posição de um número na lista.', ['núm|o número', 'ref|a lista', '[ordem]|0 = do maior para o menor; 1 = do menor para o maior'], '=ORDEM.EQ(B2;$B$2:$B$25)'),
  F('PERCENTILE.INC', 'PERCENTIL.INC', 'est', 'O valor no percentil pedido (0 a 1).', ['matriz|a faixa', 'k|ex.: 0,9 para o percentil 90'], '=PERCENTIL.INC(B2:B25;0,9)'),
  F('QUARTILE.INC', 'QUARTIL.INC', 'est', 'O quartil pedido (0 a 4).', ['matriz|a faixa', 'quarto|1 = 1º quartil, 2 = mediana, 3 = 3º quartil'], '=QUARTIL.INC(B2:B25;3)'),

  /* Lógica */
  F('IF', 'SE', 'log', 'Faz um teste e mostra um valor se der certo e outro se não.', ['teste_lógico|a pergunta, ex.: B2>=0,5', 'valor_se_verdadeiro|o que aparece quando o teste dá certo', '[valor_se_falso]|o que aparece quando não dá'], '=SE(B2>=0,5;"OK";"Ajustar")'),
  F('IFS', 'SES', 'log', 'Vários testes em sequência; usa o primeiro que der certo.', ['teste1|primeira pergunta', 'valor1|resultado se a primeira der certo', '[teste2]...|próxima pergunta', '[valor2]...|resultado da próxima'], '=SES(B2<0,5;"Baixo";B2>2;"Alto";VERDADEIRO;"OK")', { v: '19' }),
  F('AND', 'E', 'log', 'VERDADEIRO só se todos os testes derem certo.', ['lógico1|primeiro teste', '[lógico2]...|mais testes'], '=E(B2>=0,5;B2<=2)'),
  F('OR', 'OU', 'log', 'VERDADEIRO se pelo menos um teste der certo.', ['lógico1|primeiro teste', '[lógico2]...|mais testes'], '=OU(C2="Ajustar";D2="")'),
  F('NOT', 'NÃO', 'log', 'Inverte o resultado do teste.', ['lógico|o teste'], '=NÃO(C2="OK")'),
  F('XOR', 'OUEXCL', 'log', 'VERDADEIRO se um número ímpar de testes der certo.', ['lógico1|primeiro teste', '[lógico2]...|mais testes'], '=OUEXCL(B2>1;C2>1)'),
  F('IFERROR', 'SEERRO', 'log', 'Mostra outro valor quando a conta dá erro.', ['valor|a conta', 'valor_se_erro|o que mostrar no lugar do erro'], '=SEERRO(E2/D2;0)'),
  F('IFNA', 'SENÃODISP', 'log', 'Mostra outro valor quando dá #N/D (não encontrado).', ['valor|a conta', 'valor_se_nd|o que mostrar no lugar do #N/D'], '=SENÃODISP(PROCV(A2;Lotes!A:C;3;0);"Sem cadastro")'),
  F('SWITCH', 'PARÂMETRO', 'log', 'Compara um valor com uma lista e devolve o resultado do que bater.', ['expressão|o valor a comparar', 'valor1|primeira opção', 'resultado1|resultado da primeira', '[padrão_ou_valor2]...|próxima opção (ou o resultado padrão no fim)', '[resultado2]...|resultado da próxima'], '=PARÂMETRO(C2;"A";"Aprovado";"R";"Reprovado";"Pendente")', { v: '19' }),
  F('CHOOSE', 'ESCOLHER', 'log', 'Escolhe um valor da lista pelo número da posição.', ['núm_índice|a posição (1, 2, 3...)', 'valor1|primeira opção', '[valor2]...|mais opções'], '=ESCOLHER(B2;"Baixa";"Média";"Alta")'),
  F('LET', 'LET', 'log', 'Dá nome a partes da conta para usar de novo dentro dela.', ['nome1|nome para usar na conta', 'valor1|o que esse nome vale', 'cálculo_ou_nome2...|a conta final (ou outro nome e valor)'], '=LET(media;MÉDIA(B2:B9);SE(media>1;"Alto";"OK"))', { v: '21' }),
  F('TRUE', 'VERDADEIRO', 'log', 'O valor lógico VERDADEIRO.', [], '=VERDADEIRO()'),
  F('FALSE', 'FALSO', 'log', 'O valor lógico FALSO.', [], '=FALSO()'),

  /* Buscar */
  F('XLOOKUP', 'PROCX', 'busca', 'Procura um valor numa faixa e devolve o da mesma posição em outra.', ['pesquisa_valor|o que procurar', 'pesquisa_matriz|onde procurar', 'matriz_retorno|de onde devolver', '[se_não_encontrada]|o que mostrar se não achar', '[modo_correspondência]|0 = exato; -1 = exato ou menor; 1 = exato ou maior; 2 = curinga', '[modo_pesquisa]|1 = do início; -1 = do fim'], '=PROCX(A2;Lotes!A:A;Lotes!C:C;"Sem cadastro")', { v: '21' }),
  F('VLOOKUP', 'PROCV', 'busca', 'Procura na 1ª coluna e devolve o valor de outra coluna da mesma linha.', ['valor_procurado|o que procurar', 'matriz_tabela|a tabela', 'núm_índice_coluna|qual coluna devolver (1 = a primeira)', '[procurar_intervalo]|0 ou FALSO = exato (o mais usado); 1 = aproximado'], '=PROCV(A2;Lotes!A:C;3;0)'),
  F('HLOOKUP', 'PROCH', 'busca', 'Procura na 1ª linha e devolve o valor de outra linha da mesma coluna.', ['valor_procurado|o que procurar', 'matriz_tabela|a tabela', 'núm_índice_lin|qual linha devolver', '[procurar_intervalo]|0 = exato; 1 = aproximado'], '=PROCH("Cloro";A1:F5;3;0)'),
  F('INDEX', 'ÍNDICE', 'busca', 'Devolve o valor da linha e coluna pedidas dentro da faixa.', ['matriz|a faixa', 'núm_linha|qual linha', '[núm_coluna]|qual coluna'], '=ÍNDICE(C2:C30;5)'),
  F('MATCH', 'CORRESP', 'busca', 'A posição de um valor dentro da faixa.', ['valor_procurado|o que procurar', 'matriz_procurada|onde procurar', '[tipo_correspondência]|0 = exato; 1 = menor ou igual; -1 = maior ou igual'], '=CORRESP("L-013";A2:A30;0)'),
  F('XMATCH', 'CORRESPX', 'busca', 'A posição de um valor (versão nova do CORRESP, exato por padrão).', ['pesquisa_valor|o que procurar', 'pesquisa_matriz|onde procurar', '[modo_correspondência]|0 = exato; -1 = exato ou menor; 1 = exato ou maior; 2 = curinga', '[modo_pesquisa]|1 = do início; -1 = do fim'], '=CORRESPX("L-013";A2:A30)', { v: '21' }),
  F('OFFSET', 'DESLOC', 'busca', 'Uma faixa deslocada a partir de uma célula.', ['ref|ponto de partida', 'lins|quantas linhas descer', 'cols|quantas colunas andar', '[altura]|altura da faixa', '[largura]|largura da faixa'], '=SOMA(DESLOC(B1;1;0;10;1))', { vol: true }),
  F('INDIRECT', 'INDIRETO', 'busca', 'A célula cujo endereço está escrito como texto.', ['texto_ref|ex.: "B2" ou "Lotes!A1"', '[a1]|VERDADEIRO = estilo A1'], '=INDIRETO("B"&LIN())', { vol: true }),
  F('ROW', 'LIN', 'busca', 'O número da linha.', ['[ref]|a célula (sem ela, a própria linha)'], '=LIN()'),
  F('COLUMN', 'COL', 'busca', 'O número da coluna.', ['[ref]|a célula (sem ela, a própria coluna)'], '=COL()'),
  F('ROWS', 'LINS', 'busca', 'Quantas linhas a faixa tem.', ['matriz|a faixa'], '=LINS(A2:A30)'),
  F('COLUMNS', 'COLS', 'busca', 'Quantas colunas a faixa tem.', ['matriz|a faixa'], '=COLS(A1:F1)'),
  F('TRANSPOSE', 'TRANSPOR', 'busca', 'Vira linhas em colunas e colunas em linhas.', ['matriz|a faixa'], '=TRANSPOR(A1:D1)'),

  /* Matrizes que derramam */
  F('FILTER', 'FILTRO', 'mat', 'Mostra só as linhas que atendem à condição (derrama).', ['matriz|o que mostrar', 'incluir|a condição para cada linha, ex.: D2:D30="Ajustar"', '[se_vazia]|o que mostrar se nada atender'], '=FILTRO(A2:C30;D2:D30="Ajustar";"Nada")', { v: '21' }),
  F('UNIQUE', 'ÚNICO', 'mat', 'A lista sem repetidos (derrama).', ['matriz|a faixa', '[por_col]|VERDADEIRO = compara colunas', '[exatamente_uma_vez]|VERDADEIRO = só o que aparece uma vez'], '=ÚNICO(A2:A30)', { v: '21' }),
  F('SORT', 'CLASSIFICAR', 'mat', 'A faixa em ordem (derrama).', ['matriz|a faixa', '[índice_classificação]|por qual coluna', '[ordem_classificação]|1 = crescente; -1 = decrescente', '[por_col]|VERDADEIRO = ordena colunas'], '=CLASSIFICAR(A2:C30;2;-1)', { v: '21' }),
  F('SORTBY', 'CLASSIFICARPOR', 'mat', 'Ordena uma faixa pelos valores de outra (derrama).', ['matriz|o que ordenar', 'por_matriz1|pelo que ordenar', '[ordem_classificação1]|1 crescente; -1 decrescente', '[por_matriz2]...|desempate', '[ordem_classificação2]...|ordem do desempate'], '=CLASSIFICARPOR(A2:A30;B2:B30;-1)', { v: '21' }),
  F('SEQUENCE', 'SEQUÊNCIA', 'mat', 'Uma sequência de números (derrama).', ['linhas|quantas linhas', '[colunas]|quantas colunas', '[início]|primeiro número', '[etapa]|de quanto em quanto'], '=SEQUÊNCIA(10)', { v: '21' }),

  /* Data e hora */
  F('TODAY', 'HOJE', 'data', 'A data de hoje.', [], '=HOJE()', { vol: true }),
  F('NOW', 'AGORA', 'data', 'A data e a hora de agora.', [], '=AGORA()', { vol: true }),
  F('DATE', 'DATA', 'data', 'Monta uma data com ano, mês e dia.', ['ano|ex.: 2026', 'mês|1 a 12', 'dia|1 a 31'], '=DATA(2026;10;25)'),
  F('TIME', 'TEMPO', 'data', 'Monta uma hora com hora, minuto e segundo.', ['hora|0 a 23', 'minuto|0 a 59', 'segundo|0 a 59'], '=TEMPO(14;30;0)'),
  F('DAY', 'DIA', 'data', 'O dia da data (1 a 31).', ['núm_série|a data'], '=DIA(A2)'),
  F('MONTH', 'MÊS', 'data', 'O mês da data (1 a 12).', ['núm_série|a data'], '=MÊS(A2)'),
  F('YEAR', 'ANO', 'data', 'O ano da data.', ['núm_série|a data'], '=ANO(A2)'),
  F('HOUR', 'HORA', 'data', 'A hora (0 a 23).', ['núm_série|a hora'], '=HORA(B2)'),
  F('MINUTE', 'MINUTO', 'data', 'O minuto (0 a 59).', ['núm_série|a hora'], '=MINUTO(B2)'),
  F('SECOND', 'SEGUNDO', 'data', 'O segundo (0 a 59).', ['núm_série|a hora'], '=SEGUNDO(B2)'),
  F('WEEKDAY', 'DIA.DA.SEMANA', 'data', 'O dia da semana como número.', ['núm_série|a data', '[retornar_tipo]|1 = domingo é 1; 2 = segunda é 1'], '=DIA.DA.SEMANA(A2;2)'),
  F('WEEKNUM', 'NÚMSEMANA', 'data', 'O número da semana no ano.', ['núm_série|a data', '[retornar_tipo]|1 = semana começa no domingo; 2 = na segunda'], '=NÚMSEMANA(A2;2)'),
  F('DAYS', 'DIAS', 'data', 'Quantos dias entre duas datas.', ['data_final|a data mais nova', 'data_inicial|a data mais antiga'], '=DIAS(C2;B2)'),
  F('DATEDIF', 'DATADIF', 'data', 'Diferença entre datas em dias, meses ou anos.', ['data_inicial|a data mais antiga', 'data_final|a data mais nova', 'unidade|"D" dias, "M" meses, "Y" anos, "MD", "YM", "YD"'], '=DATADIF(B2;HOJE();"M")'),
  F('EDATE', 'DATAM', 'data', 'A data alguns meses antes ou depois.', ['data_inicial|a data', 'meses|quantos meses (negativo volta)'], '=DATAM(B2;6)'),
  F('EOMONTH', 'FIMMÊS', 'data', 'O último dia do mês, alguns meses antes ou depois.', ['data_inicial|a data', 'meses|0 = o mesmo mês'], '=FIMMÊS(B2;0)'),
  F('WORKDAY', 'DIATRABALHO', 'data', 'A data depois de alguns dias úteis.', ['data_inicial|a data', 'dias|quantos dias úteis', '[feriados]|faixa com os feriados'], '=DIATRABALHO(B2;5;Feriados!A:A)'),
  F('NETWORKDAYS', 'DIATRABALHOTOTAL', 'data', 'Quantos dias úteis entre duas datas.', ['data_inicial|início', 'data_final|fim', '[feriados]|faixa com os feriados'], '=DIATRABALHOTOTAL(B2;C2)'),
  F('DATEVALUE', 'DATA.VALOR', 'data', 'Transforma um texto de data em data.', ['texto_data|ex.: "25/10/2026"'], '=DATA.VALOR("25/10/2026")'),
  F('TIMEVALUE', 'VALOR.TEMPO', 'data', 'Transforma um texto de hora em hora.', ['texto_hora|ex.: "14:30"'], '=VALOR.TEMPO("14:30")'),

  /* Texto */
  F('TEXT', 'TEXTO', 'texto', 'Mostra um número no formato pedido, como texto.', ['valor|o número ou data', 'formato_texto|ex.: "dd/mm/aaaa" ou "0,00"'], '=TEXTO(A2;"dd/mm/aaaa")'),
  F('CONCAT', 'CONCAT', 'texto', 'Junta textos e faixas num só.', ['texto1|texto ou faixa', '[texto2]...|mais textos'], '=CONCAT(A2;" - ";B2)', { v: '19' }),
  F('CONCATENATE', 'CONCATENAR', 'texto', 'Junta textos num só (nome antigo).', ['texto1|texto', '[texto2]...|mais textos'], '=CONCATENAR(A2;" ";B2)'),
  F('TEXTJOIN', 'UNIRTEXTO', 'texto', 'Junta textos com um separador.', ['delimitador|o que vai entre eles, ex.: ", "', 'ignorar_vazio|VERDADEIRO = pula vazios', 'texto1|texto ou faixa', '[texto2]...|mais textos'], '=UNIRTEXTO(", ";VERDADEIRO;A2:A10)', { v: '19' }),
  F('LEFT', 'ESQUERDA', 'texto', 'As primeiras letras do texto.', ['texto|o texto', '[núm_caract]|quantas letras (padrão 1)'], '=ESQUERDA(A2;3)'),
  F('RIGHT', 'DIREITA', 'texto', 'As últimas letras do texto.', ['texto|o texto', '[núm_caract]|quantas letras (padrão 1)'], '=DIREITA(A2;3)'),
  F('MID', 'EXT.TEXTO', 'texto', 'Um pedaço do meio do texto.', ['texto|o texto', 'núm_inicial|a partir de qual letra', 'núm_caract|quantas letras'], '=EXT.TEXTO(A2;3;2)'),
  F('LEN', 'NÚM.CARACT', 'texto', 'Quantas letras o texto tem.', ['texto|o texto'], '=NÚM.CARACT(A2)'),
  F('TRIM', 'ARRUMAR', 'texto', 'Tira os espaços sobrando.', ['texto|o texto'], '=ARRUMAR(A2)'),
  F('UPPER', 'MAIÚSCULA', 'texto', 'Tudo em maiúsculas.', ['texto|o texto'], '=MAIÚSCULA(A2)'),
  F('LOWER', 'MINÚSCULA', 'texto', 'Tudo em minúsculas.', ['texto|o texto'], '=MINÚSCULA(A2)'),
  F('PROPER', 'PRI.MAIÚSCULA', 'texto', 'Primeira letra de cada palavra em maiúscula.', ['texto|o texto'], '=PRI.MAIÚSCULA(A2)'),
  F('FIND', 'PROCURAR', 'texto', 'A posição de um texto dentro de outro (diferencia maiúsculas).', ['texto_procurado|o que achar', 'no_texto|onde procurar', '[núm_inicial]|a partir de qual letra'], '=PROCURAR("-";A2)'),
  F('SEARCH', 'LOCALIZAR', 'texto', 'A posição de um texto dentro de outro (sem diferenciar maiúsculas; aceita * e ?).', ['texto_procurado|o que achar', 'no_texto|onde procurar', '[núm_inicial]|a partir de qual letra'], '=LOCALIZAR("cloro";A2)'),
  F('SUBSTITUTE', 'SUBSTITUIR', 'texto', 'Troca um texto por outro.', ['texto|o texto', 'texto_antigo|o que trocar', 'novo_texto|pelo que trocar', '[núm_da_ocorrência]|só a 1ª, 2ª...'], '=SUBSTITUIR(A2;".";",")'),
  F('REPLACE', 'MUDAR', 'texto', 'Troca letras numa posição do texto.', ['texto_antigo|o texto', 'núm_inicial|a partir de qual letra', 'núm_caract|quantas letras', 'novo_texto|o que entra'], '=MUDAR(A2;1;2;"LT")'),
  F('VALUE', 'VALOR', 'texto', 'Transforma texto em número.', ['texto|ex.: "1,5"'], '=VALOR(A2)'),
  F('REPT', 'REPT', 'texto', 'Repete um texto várias vezes.', ['texto|o texto', 'núm_vezes|quantas vezes'], '=REPT("*";B2)'),
  F('EXACT', 'EXATO', 'texto', 'VERDADEIRO se os dois textos forem idênticos.', ['texto1|primeiro', 'texto2|segundo'], '=EXATO(A2;B2)'),
  F('CHAR', 'CARACT', 'texto', 'A letra pelo código.', ['núm|o código'], '=CARACT(10)'),
  F('CODE', 'CÓDIGO', 'texto', 'O código da primeira letra.', ['texto|o texto'], '=CÓDIGO(A2)'),
  F('CLEAN', 'TIRAR', 'texto', 'Tira caracteres que não se imprimem.', ['texto|o texto'], '=TIRAR(A2)'),

  /* Números */
  F('ROUND', 'ARRED', 'num', 'Arredonda para as casas pedidas.', ['núm|o número', 'núm_dígitos|quantas casas depois da vírgula'], '=ARRED(B2;2)'),
  F('ROUNDUP', 'ARREDONDAR.PARA.CIMA', 'num', 'Arredonda sempre para cima.', ['núm|o número', 'núm_dígitos|quantas casas'], '=ARREDONDAR.PARA.CIMA(B2;0)'),
  F('ROUNDDOWN', 'ARREDONDAR.PARA.BAIXO', 'num', 'Arredonda sempre para baixo.', ['núm|o número', 'núm_dígitos|quantas casas'], '=ARREDONDAR.PARA.BAIXO(B2;0)'),
  F('TRUNC', 'TRUNCAR', 'num', 'Corta as casas decimais sem arredondar.', ['núm|o número', '[núm_dígitos]|quantas casas ficam'], '=TRUNCAR(B2;1)'),
  F('INT', 'INT', 'num', 'Arredonda para baixo até o inteiro.', ['núm|o número'], '=INT(B2)'),
  F('MOD', 'MOD', 'num', 'O resto da divisão.', ['núm|o número', 'divisor|por quanto dividir'], '=MOD(LIN();2)'),
  F('ABS', 'ABS', 'num', 'O número sem sinal.', ['núm|o número'], '=ABS(B2-C2)'),
  F('POWER', 'POTÊNCIA', 'num', 'Eleva o número a uma potência.', ['núm|a base', 'potência|o expoente'], '=POTÊNCIA(B2;2)'),
  F('SQRT', 'RAIZ', 'num', 'Raiz quadrada.', ['núm|o número'], '=RAIZ(B2)'),
  F('PRODUCT', 'MULT', 'num', 'Multiplica todos os números.', ['núm1|número ou faixa', '[núm2]...|mais números'], '=MULT(B2:B5)'),
  F('QUOTIENT', 'QUOCIENTE', 'num', 'A parte inteira da divisão.', ['numerador|o que dividir', 'denominador|por quanto'], '=QUOCIENTE(B2;3)'),
  F('PI', 'PI', 'num', 'O número pi.', [], '=PI()'),
  F('SIGN', 'SINAL', 'num', '1 se positivo, -1 se negativo, 0 se zero.', ['núm|o número'], '=SINAL(B2)'),
  F('RAND', 'ALEATÓRIO', 'num', 'Um número aleatório entre 0 e 1.', [], '=ALEATÓRIO()', { vol: true }),
  F('RANDBETWEEN', 'ALEATÓRIOENTRE', 'num', 'Um inteiro aleatório entre dois números.', ['inferior|o menor', 'superior|o maior'], '=ALEATÓRIOENTRE(1;6)', { vol: true }),

  /* Testes */
  F('ISBLANK', 'ÉCÉL.VAZIA', 'info', 'VERDADEIRO se a célula estiver vazia.', ['valor|a célula'], '=ÉCÉL.VAZIA(C2)'),
  F('ISNUMBER', 'ÉNÚM', 'info', 'VERDADEIRO se for número.', ['valor|o valor ou célula'], '=ÉNÚM(B2)'),
  F('ISTEXT', 'ÉTEXTO', 'info', 'VERDADEIRO se for texto.', ['valor|o valor ou célula'], '=ÉTEXTO(B2)'),
  F('ISLOGICAL', 'ÉLÓGICO', 'info', 'VERDADEIRO se for VERDADEIRO ou FALSO.', ['valor|o valor ou célula'], '=ÉLÓGICO(B2)'),
  F('ISERR', 'ÉERRO', 'info', 'VERDADEIRO se for erro (menos #N/D).', ['valor|o valor ou conta'], '=ÉERRO(E2/D2)'),
  F('ISERROR', 'ÉERROS', 'info', 'VERDADEIRO se for qualquer erro.', ['valor|o valor ou conta'], '=ÉERROS(E2/D2)'),
  F('ISNA', 'É.NÃO.DISP', 'info', 'VERDADEIRO se for #N/D.', ['valor|o valor ou conta'], '=É.NÃO.DISP(PROCV(A2;Lotes!A:C;3;0))'),
  F('NA', 'NÃO.DISP', 'info', 'Devolve o erro #N/D.', [], '=NÃO.DISP()'),
];

/* Nomes que o Excel em pt-BR também aceita ou que a documentação mostra de outro jeito */
const APELIDOS_PT = { 'ÉNÚMERO': 'ISNUMBER', 'ÚNICA': 'UNIQUE', 'ÉNÃO.DISP': 'ISNA', 'XOU': 'XOR', 'CONTAR.SE': 'COUNTIF', 'CONTAR.VAL': 'COUNTA' };

export const POR_EN = Object.fromEntries(FUNCOES.map((f) => [f.en, f]));
export const POR_PT = Object.fromEntries(FUNCOES.map((f) => [f.pt, f]));

const sem = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
/* sem acento também vale (quem digita MEDIA, MAXIMO, MES...) */
const POR_PT_SEM_ACENTO = {};
for (const f of FUNCOES) if (sem(f.pt) !== f.pt) POR_PT_SEM_ACENTO[sem(f.pt)] = f;

/**
 * Acha a função pelo nome digitado (pt-BR, sem acento ou em inglês).
 * Devolve { f, como: 'pt'|'en'|'semAcento'|'apelido' } ou null.
 */
export function acharFuncao(nome) {
  const n = String(nome).toUpperCase().replace(/^_XLFN\./, '').replace(/^_XLWS\./, '');
  if (POR_PT[n]) return { f: POR_PT[n], como: 'pt' };
  if (POR_EN[n]) return { f: POR_EN[n], como: 'en' };
  if (APELIDOS_PT[n]) return { f: POR_EN[APELIDOS_PT[n]], como: 'apelido' };
  if (POR_PT_SEM_ACENTO[n]) return { f: POR_PT_SEM_ACENTO[n], como: 'semAcento' };
  return null;
}

/** Distância de edição (para sugerir "Você quis dizer PROCV?") */
export function distancia(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...new Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[m][n];
}

export function funcaoParecida(nome) {
  const n = sem(String(nome).toUpperCase());
  let melhor = null, dist = 99;
  for (const f of FUNCOES) {
    for (const cand of [f.pt, f.en]) {
      const d = distancia(n, sem(cand));
      if (d < dist) { dist = d; melhor = f; }
    }
  }
  return dist <= Math.max(1, Math.floor(n.length / 3)) ? melhor : null;
}

/** Lista para o autocompletar: começa com o que foi digitado (pt, sem acento ou inglês). */
export function sugerirFuncoes(prefixo, max = 8) {
  const p = sem(String(prefixo).toUpperCase());
  if (!p) return [];
  const comeca = FUNCOES.filter((f) => sem(f.pt).startsWith(p));
  const ingles = FUNCOES.filter((f) => !comeca.includes(f) && f.en.startsWith(p));
  return [...comeca.sort((a, b) => a.pt.length - b.pt.length), ...ingles].slice(0, max);
}
