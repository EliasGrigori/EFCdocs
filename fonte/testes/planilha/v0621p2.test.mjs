/* v0.6.21 parte 2 · faixa igual ao Excel: abas Inserir e Fórmulas (R25) e Formatar › altura e largura (D2).
   O que dá para provar sem tela: a Biblioteca de funções, o que cada "comando|valor" pede e as medidas de linha e coluna.
   Os lugares dos botões são conferidos no app de verdade por scripts/testar-faixa.mjs. Dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FUNCOES, POR_EN } from '../../src/planilha/nomesFuncoes.js';
import { GAVETAS, itensDaGaveta, CONTAS_AUTOSOMA, FUNCOES_AUTOSOMA, GRAFICOS_NA_FAIXA, OUTROS_GRAFICOS } from '../../src/planilha/biblioteca.js';
import { TIPOS_GRAFICO } from '../../src/planilha/graficos.js';
import { lerPedido, tratarFaixaExtra, pedirTamanho, ajustarTamanho, quaisDe } from '../../src/planilha/faixaExtra.js';
import { PorId } from '../../src/nucleo/comandos.js';
import { DESCRICAO as DICAS } from '../../src/nucleo/dicas.js';
import { NOVOS, MAPA } from '../../src/ui/iconesFaixa.js';

test('Biblioteca de funções: toda função do catálogo está em uma gaveta só; nenhuma fica de fora', () => {
  const onde = {};
  for (const g of GAVETAS) for (const it of itensDaGaveta(g.chave)) if (it.id && !it.fim) { const en = it.id.split('|')[1]; (onde[en] || (onde[en] = [])).push(g.chave); }
  assert.deepEqual(FUNCOES.filter((f) => !onde[f.en]).map((f) => f.pt), [], 'função sem gaveta');
  assert.deepEqual(Object.entries(onde).filter(([, v]) => v.length !== 1).map(([k]) => k), [], 'função em duas gavetas');
  assert.equal(Object.keys(onde).length, FUNCOES.length);
});

test('Biblioteca de funções: as gavetas vêm na ordem do Excel e cada lista está em ordem alfabética', () => {
  assert.deepEqual(GAVETAS.map((g) => g.nome), ['Lógica', 'Texto', 'Data e hora', 'Pesquisa e referência', 'Matemática', 'Estatística', 'Mais funções']);
  const logica = itensDaGaveta('fnLogica').filter((x) => x.id && !x.fim).map((x) => x.nome);
  assert.deepEqual(logica, [...logica].sort((a, b) => a.localeCompare(b, 'pt-BR')));
  assert.ok(logica.includes('SE') && logica.includes('SEERRO'));
  /* gaveta com duas categorias mostra o título de cada uma; a última linha abre a janela já na gaveta */
  const mat = itensDaGaveta('fnMat');
  assert.deepEqual(mat.filter((x) => x.cab).map((x) => x.cab), ['Somar e contar', 'Números']);
  assert.equal(mat[mat.length - 1].id, 'formula.inserir|cat:soma');
  assert.equal(itensDaGaveta('fnLogica').some((x) => x.cab), false);
  assert.deepEqual(itensDaGaveta('nao-existe'), []);
  /* a dica de cada função é o nome e o que ela faz */
  const se = itensDaGaveta('fnLogica').find((x) => x.nome === 'SE');
  assert.equal(se.id, 'formula.inserir|IF'); assert.match(se.dica, /^SE\|.{10,}/);
});

test('AutoSoma: as cinco contas do Excel, na ordem, e cada uma é uma função que o app calcula', () => {
  assert.deepEqual(CONTAS_AUTOSOMA.map((c) => c.nome), ['Soma', 'Média', 'Contar números', 'Máximo', 'Mínimo']);
  assert.equal(CONTAS_AUTOSOMA[0].id, 'formula.autosoma');
  for (const fn of FUNCOES_AUTOSOMA) assert.ok(FUNCOES.some((f) => f.pt === fn), 'não está no catálogo: ' + fn);
  for (const c of CONTAS_AUTOSOMA.slice(1)) assert.ok(FUNCOES_AUTOSOMA.includes(c.id.split('|')[1]), c.id);
});

test('Gráficos: os botões da faixa e a lista "Outros gráficos" cobrem todos os tipos, sem repetir', () => {
  const todos = [...Object.keys(GRAFICOS_NA_FAIXA), ...OUTROS_GRAFICOS];
  assert.deepEqual([...todos].sort(), TIPOS_GRAFICO.map(([t]) => t).sort());
  assert.equal(new Set(todos).size, todos.length);
  for (const g of Object.values(GRAFICOS_NA_FAIXA)) assert.ok(NOVOS[g.ic.replace('n:', '')], 'sem desenho: ' + g.ic);
  for (const g of GAVETAS) assert.ok(NOVOS[g.ic.replace('n:', '')], 'sem desenho: ' + g.ic);
});

test('lerPedido: entende cada "comando|valor" e recusa valor que não existe', () => {
  assert.deepEqual(lerPedido('inserir.grafico|pizza'), { fazer: 'grafico', tipo: 'pizza' });
  assert.deepEqual(lerPedido('inserir.grafico|inventado'), { fazer: 'nada' });
  assert.equal(lerPedido('inserir.grafico'), null, 'o comando puro segue o caminho de sempre');
  assert.deepEqual(lerPedido('formula.autosoma|MÉDIA'), { fazer: 'autosoma', fn: 'MÉDIA' });
  assert.deepEqual(lerPedido('formula.autosoma|EXEC'), { fazer: 'nada' });
  assert.equal(lerPedido('formula.autosoma'), null);
  assert.equal(lerPedido('formula.inserir|IF').f, POR_EN.IF);
  assert.deepEqual(lerPedido('formula.inserir|NAOEXISTE'), { fazer: 'nada' });
  assert.deepEqual(lerPedido('formula.inserir|cat:data'), { fazer: 'procurar', cat: 'data' });
  assert.deepEqual(lerPedido('planilha.larguraColuna'), { fazer: 'tamanho', ehCol: true });
  assert.deepEqual(lerPedido('planilha.alturaLinha'), { fazer: 'tamanho', ehCol: false });
  assert.deepEqual(lerPedido('planilha.ajustarColuna'), { fazer: 'ajustar', ehCol: true });
  assert.deepEqual(lerPedido('planilha.ajustarLinha'), { fazer: 'ajustar', ehCol: false });
  assert.equal(lerPedido('formatar.fonte|f:Arial'), null, 'as caixas da parte 1 não são daqui');
  assert.equal(lerPedido('formatar.negrito'), null);
});

test('tratarFaixaExtra: chama a ação certa, passa pela trava de só leitura e devolve undefined para o que não é dele', () => {
  const feito = [];
  const p = {
    ed: (fn) => { fn(); return true; }, novoGrafico: (t) => feito.push('grafico:' + t), autoSoma: (fn) => feito.push('soma:' + fn), usarFuncao: (f) => feito.push('fn:' + f.pt),
    procurarFuncao: (c) => feito.push('procurar:' + c), medida: (ehCol) => ({ i: ehCol ? 2 : 5, n: 3, atual: ehCol ? 80 : 22 }),
    tamanho: (a) => feito.push(`tamanho:${a.ehCol}:${a.i}:${a.n}:${a.atual}`), ajustar: (a) => feito.push(`ajustar:${a.ehCol}:${a.i}:${a.n}`),
  };
  for (const id of ['inserir.grafico|barras', 'formula.autosoma|MÁXIMO', 'formula.inserir|VLOOKUP', 'formula.inserir|cat:texto', 'planilha.larguraColuna', 'planilha.alturaLinha', 'planilha.ajustarColuna', 'planilha.ajustarLinha']) assert.equal(tratarFaixaExtra(id, p), true, id);
  assert.deepEqual(feito, ['grafico:barras', 'soma:MÁXIMO', 'fn:PROCV', 'procurar:texto', 'tamanho:true:2:3:80', 'tamanho:false:5:3:22', 'ajustar:true:2:3', 'ajustar:false:5:3']);
  assert.equal(tratarFaixaExtra('formatar.negrito', p), undefined);
  assert.equal(tratarFaixaExtra('inserir.grafico|inventado', p), false);
  /* só leitura: a trava (ed) decide; nada é feito */
  const n = feito.length;
  assert.equal(tratarFaixaExtra('planilha.larguraColuna', { ...p, ed: () => true }), true);
  assert.equal(feito.length, n);
});

test('Largura e altura: a pergunta valida o número e a resposta vale para todas as colunas (ou linhas) escolhidas, num passo só', () => {
  let pergunta = null; const mudancas = [];
  const cx = { perguntar: (q) => { pergunta = q; } };
  const mudar = (m, nome) => { mudancas.push([m, nome]); return true; };
  pedirTamanho({ cx, mudar, abaId: 'a1', ehCol: true, i: 1, n: 3, atual: 80 });
  assert.equal(pergunta.titulo, 'Largura da 3 colunas'); assert.equal(pergunta.valor, '80');
  assert.equal(pergunta.validar('120'), ''); assert.ok(pergunta.validar('3')); assert.ok(pergunta.validar('601')); assert.ok(pergunta.validar('abc')); assert.ok(pergunta.validar('12,5'));
  pergunta.aoConfirmar('120');
  assert.deepEqual(mudancas[0][0], { 'conteudo.abas.a1.larg.1': 120, 'conteudo.abas.a1.larg.2': 120, 'conteudo.abas.a1.larg.3': 120 });
  assert.equal(mudancas.length, 1, 'um passo de desfazer');
  pedirTamanho({ cx, mudar, abaId: 'a1', ehCol: false, i: 6, n: 1, atual: 22 });
  assert.equal(pergunta.titulo, 'Altura da linha 7'); assert.equal(pergunta.validar('5'), 'Use um número de 6 a 400.'); assert.equal(pergunta.validar('400'), '');
  pergunta.aoConfirmar('40');
  assert.deepEqual(mudancas[1], [{ 'conteudo.abas.a1.alt.6': 40 }, 'Altura da linha 7']);
});

test('Ajustar: coluna usa a largura do maior texto (até 60 colunas); linha volta à altura que se ajusta sozinha', () => {
  const cols = []; const mudancas = [];
  ajustarTamanho({ mudar: (m, n) => mudancas.push([m, n]), abaId: 'a1', ehCol: true, i: 0, n: 100, autoAjustar: (k) => cols.push(k) });
  assert.equal(cols.length, 60); assert.equal(cols[0], 0); assert.equal(mudancas.length, 0);
  ajustarTamanho({ mudar: (m, n) => mudancas.push([m, n]), abaId: 'a1', ehCol: false, i: 2, n: 2, autoAjustar: () => assert.fail('linha não mede texto') });
  assert.deepEqual(mudancas[0], [{ 'conteudo.abas.a1.alt.2': undefined, 'conteudo.abas.a1.alt.3': undefined }, 'Altura padrão da 2 linhas']);
  assert.equal(quaisDe(true, 27, 1), 'coluna AB'); assert.equal(quaisDe(false, 0, 1), 'linha 1'); assert.equal(quaisDe(true, 0, 2), '2 colunas');
});

test('Comandos novos do Formatar: estão no catálogo, só na planilha, com dica e com desenho próprio', () => {
  const ids = ['planilha.alturaLinha', 'planilha.ajustarLinha', 'planilha.larguraColuna', 'planilha.ajustarColuna'];
  for (const id of ids) {
    assert.ok(PorId[id], id); assert.deepEqual(PorId[id].mods, ['planilha']); assert.equal(PorId[id].acao, 'planilha.editar');
    assert.ok((DICAS[id] || '').length > 20, 'sem dica: ' + id); assert.ok(NOVOS[MAPA[id]], 'sem desenho: ' + id);
  }
  assert.equal(new Set(ids.map((id) => MAPA[id])).size, 4, 'um desenho para cada');
});
