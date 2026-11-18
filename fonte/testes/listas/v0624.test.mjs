/* v0.6.24 parte 1 · colunas das listas no padrão do EFCwork (lógica). Dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const guardado = new Map();
globalThis.localStorage = { getItem: (k) => (guardado.has(k) ? guardado.get(k) : null), setItem: (k, v) => guardado.set(k, String(v)), removeItem: (k) => guardado.delete(k) };
const T = await import('../../src/ui/tabelaColunas.js');

const COLS = [
  { id: 'nome', rot: 'Nome', v: (x) => x.nome },
  { id: 'tipo', rot: 'Tipo', v: (x) => x.tipo },
  { id: 'tam', rot: 'Tamanho', v: (x) => x.tam, tipo: 'num' },
  { id: 'acoes', rot: 'Ações', fixa: true },
];
const ITENS = [
  { id: 1, nome: 'Análise de água', tipo: 'Planilha', tam: 30 },
  { id: 2, nome: 'Ficha de campo', tipo: 'Documento', tam: 5 },
  { id: 3, nome: 'acerola lote 10', tipo: 'Planilha', tam: 12 },
  { id: 4, nome: 'acerola lote 9', tipo: 'Planilha', tam: '' },
];
const ids = (l) => l.map((x) => x.id);

test('ordem crescente e decrescente, sem acento e com número no meio do texto', () => {
  const st = { cf: {}, ordem: { k: 'nome', dir: 'asc' }, colOrd: [], trava: {} };
  assert.deepEqual(ids(T.filtrarPorColunas(ITENS, COLS, st)), [4, 3, 1, 2]);
  st.ordem.dir = 'desc';
  assert.deepEqual(ids(T.filtrarPorColunas(ITENS, COLS, st)), [2, 1, 3, 4]);
});

test('ciclo do botão de ordem: padrão, crescente, decrescente, padrão', () => {
  let st = { ordem: null };
  st.ordem = T.proximaOrdem(st, 'nome'); assert.deepEqual(st.ordem, { k: 'nome', dir: 'asc' });
  st.ordem = T.proximaOrdem(st, 'nome'); assert.deepEqual(st.ordem, { k: 'nome', dir: 'desc' });
  st.ordem = T.proximaOrdem(st, 'nome'); assert.equal(st.ordem, null);
  st.ordem = { k: 'tipo', dir: 'desc' }; assert.deepEqual(T.proximaOrdem(st, 'nome'), { k: 'nome', dir: 'asc' });
});

test('lista de valores com contagem, sem contar o filtro da própria coluna; vazio por último', () => {
  const st = { cf: { tipo: { sel: ['Planilha'] } }, ordem: null, colOrd: [], trava: {} };
  assert.deepEqual(T.valoresDaColuna(ITENS, COLS, st, 'tipo').map((x) => [x.lab, x.n]), [['Documento', 1], ['Planilha', 3]]);
  assert.deepEqual(T.valoresDaColuna(ITENS, COLS, st, 'tam').map((x) => x.lab), ['12', '30', '']);
});

test('caixas, busca e De/Até filtram as linhas', () => {
  const st = { cf: { tipo: { sel: ['Planilha'] } }, ordem: null, colOrd: [], trava: {} };
  assert.deepEqual(ids(T.filtrarPorColunas(ITENS, COLS, st)), [1, 3, 4]);
  st.cf.nome = { txt: 'ACEROLA' };
  assert.deepEqual(ids(T.filtrarPorColunas(ITENS, COLS, st)), [3, 4]);
  st.cf = { tam: { min: '10', max: '20' } };
  assert.deepEqual(ids(T.filtrarPorColunas(ITENS, COLS, st)), [3]);
  st.cf = { nome: { txt: 'analise' } };
  assert.deepEqual(ids(T.filtrarPorColunas(ITENS, COLS, st)), [1], 'busca sem acento');
});

test('mover colunas: soltar antes ou depois, um passo para o lado; Ações fica no lugar', () => {
  assert.deepEqual(T.moverColuna(COLS, [], 'tam', 'nome', false), ['tam', 'nome', 'tipo']);
  assert.deepEqual(T.moverColuna(COLS, [], 'nome', 'tam', true), ['tipo', 'tam', 'nome']);
  assert.deepEqual(T.moverDeLado(COLS, ['tam', 'nome', 'tipo'], 'nome', 1), ['tam', 'tipo', 'nome']);
  assert.deepEqual(T.moverDeLado(COLS, [], 'nome', -1), ['nome', 'tipo', 'tam'], 'a primeira não vai mais para a esquerda');
  assert.deepEqual(T.colunasEmOrdem(COLS, ['tam', 'nome']).map((c) => c.id), ['tam', 'nome', 'tipo', 'acoes']);
});

test('a ordem das colunas fica lembrada no aparelho; Travar guarda a ordem e o filtro da coluna', () => {
  guardado.clear(); T.esquecerSessao();
  T.mudarTabela('t1', (st) => { st.colOrd = ['tipo', 'nome', 'tam']; st.ordem = { k: 'nome', dir: 'desc' }; st.cf.tipo = { sel: ['Planilha'] }; st.trava.tipo = true; return st; });
  T.esquecerSessao(); /* como se o app fosse fechado e aberto */
  const st = T.estadoTabela('t1');
  assert.deepEqual(st.colOrd, ['tipo', 'nome', 'tam']);
  assert.deepEqual(st.cf, { tipo: { sel: ['Planilha'] } }, 'o filtro da travada volta');
  assert.equal(st.ordem, null, 'a ordem de coluna não travada não volta');
  T.mudarTabela('t1', (s) => { s.trava = {}; s.colOrd = []; return s; });
  assert.equal(guardado.has('vd-tbcol-t1'), false, 'sem nada para lembrar, apaga do aparelho');
});

test('Limpar da tela solta só as colunas não travadas', () => {
  const st = T.limparColunasSoltas({ cf: { nome: { txt: 'x' }, tipo: { sel: ['Planilha'] } }, ordem: { k: 'nome', dir: 'asc' }, colOrd: [], trava: { tipo: true } });
  assert.deepEqual(st.cf, { tipo: { sel: ['Planilha'] } });
  assert.equal(st.ordem, null);
});

test('avisa quem desenha quando muda', () => {
  const vistos = []; const tira = T.ouvirTabelas((n) => vistos.push(n));
  T.mudarTabela('t2', (s) => { s.cf.nome = { txt: 'a' }; return s; }); tira();
  T.mudarTabela('t2', (s) => s);
  assert.deepEqual(vistos, ['t2']);
});

test('"Limpar filtros" aparece com filtro ou ordem soltos; só travados não contam', () => {
  assert.equal(T.temAlgoParaLimpar({ cf: {}, ordem: { k: 'nome', dir: 'asc' }, trava: {} }), true, 'só a ordem');
  assert.equal(T.temAlgoParaLimpar({ cf: { tipo: { sel: ['x'] } }, ordem: null, trava: { tipo: true } }), false, 'só travada');
  assert.equal(T.temAlgoParaLimpar({ cf: {}, ordem: null, trava: {} }), false);
});
