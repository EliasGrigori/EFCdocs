/* EFCdocs v0.6.9 — correções da planilha que o Elias viu na tela de toque:
   cabeçalho e painéis congelados desenhados por cima, várias colunas/linhas mudando de tamanho juntas
   e grade com contraste. Dados inventados: nenhuma planilha da empresa entra nos testes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { corDaGrade } from '../../src/planilha/grade.js';
import { inteirasSelecionadas } from '../../src/planilha/operacoes.js';

const MAXL = 1048576, MAXC = 16384;
const col = (c1, c2) => ({ l1: 0, l2: MAXL - 1, c1, c2 });
const lin = (l1, l2) => ({ c1: 0, c2: MAXC - 1, l1, l2 });
const op = { maxLin: MAXL, maxCol: MAXC };

test('colunas inteiras selecionadas mudam de largura juntas', () => {
  const faixas = [col(1, 3)];
  assert.deepEqual(inteirasSelecionadas(faixas, 'col', 2, op), [1, 2, 3]);
  assert.deepEqual(inteirasSelecionadas(faixas, 'col', 7, op), [7], 'fora da seleção, só a arrastada');
});

test('linhas inteiras selecionadas mudam de altura juntas', () => {
  const faixas = [lin(5, 9)];
  assert.deepEqual(inteirasSelecionadas(faixas, 'lin', 6, op), [5, 6, 7, 8, 9]);
  assert.deepEqual(inteirasSelecionadas(faixas, 'lin', 20, op), [20]);
});

test('seleção de um pedaço (não da coluna inteira) não arrasta as vizinhas', () => {
  const faixas = [{ l1: 2, l2: 40, c1: 1, c2: 4 }];
  assert.deepEqual(inteirasSelecionadas(faixas, 'col', 2, op), [2], 'B2:E40 não é coluna inteira');
});

test('várias faixas soltas (Ctrl) entram todas', () => {
  const faixas = [col(1, 2), col(8, 8)];
  assert.deepEqual(inteirasSelecionadas(faixas, 'col', 8, op), [1, 2, 8]);
  assert.deepEqual(inteirasSelecionadas(faixas, 'col', 1, op), [1, 2, 8]);
});

test('selecionar a planilha toda não vira um passo gigante', () => {
  const r = inteirasSelecionadas([col(0, MAXC - 1)], 'col', 3, { ...op, limite: 500 });
  assert.equal(r.length, 500);
  assert.equal(r[0], 0);
});

test('linhas selecionadas não mexem nas colunas e vice-versa', () => {
  assert.deepEqual(inteirasSelecionadas([lin(1, 5)], 'col', 2, op), [2]);
  assert.deepEqual(inteirasSelecionadas([col(1, 5)], 'lin', 2, op), [2]);
});

/* ---------- grade ---------- */
const luzDe = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
};
const contraste = (a, b) => { const x = luzDe(a), y = luzDe(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

test('grade clara demais no fundo branco fica mais forte', () => {
  const nova = corDaGrade('#d2d9e0', '#ffffff');
  assert.notEqual(nova, '#d2d9e0');
  assert.ok(contraste(nova, '#ffffff') >= 1.6, 'passa a aparecer');
  assert.ok(contraste(nova, '#ffffff') < 3, 'sem virar borda preta');
});

test('no tema escuro a grade clareia em vez de escurecer', () => {
  const nova = corDaGrade('#2b3746', '#18202a');
  assert.ok(luzDe(nova) > luzDe('#2b3746'));
  assert.ok(contraste(nova, '#18202a') >= 1.6);
});

test('grade que já aparece bem fica como está', () => {
  assert.equal(corDaGrade('#9aa3ad', '#ffffff'), '#9aa3ad');
});

test('cor estranha não quebra o desenho', () => {
  assert.equal(corDaGrade('nao-e-cor', '#ffffff'), 'nao-e-cor');
});
