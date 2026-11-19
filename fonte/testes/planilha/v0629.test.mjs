/* v0.6.29 · D17 curtose e assimetria (CURT, DISTORÇÃO, DISTORÇÃO.P) e Ctrl+seta parando na borda da tabela. Dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Motor } from '../../src/planilha/motor.js';
import { planilhaVazia } from '../../src/planilha/modelo.js';
import { paraGuardar, paraMostrar } from '../../src/planilha/formula.js';
import { pararNaTabela } from '../../src/planilha/tabelaViva.js';
import { porPrefixos as traduzirFormulaParaXlsx } from '../../src/planilha/xlsx/formulas.js';

/* exemplo da ajuda do Excel: 3, 4, 5, 2, 3, 4, 5, 6, 4, 7 */
function planilha(formula) {
  const c = planilhaVazia();
  [3, 4, 5, 2, 3, 4, 5, 6, 4, 7].forEach((v, i) => { c.abas.a1.cel['A' + (i + 1)] = { v }; });
  c.abas.a1.cel.A11 = { v: 'texto fica de fora' };
  c.abas.a1.cel.B1 = { f: paraGuardar(formula) };
  return new Motor(c).valor('a1', 0, 1);
}

test('CURT, DISTORÇÃO e DISTORÇÃO.P dão os números da ajuda do Excel', () => {
  assert.ok(Math.abs(planilha('CURT(A1:A11)') - (-0.151799637)) < 1e-8, 'CURT');
  assert.ok(Math.abs(planilha('DISTORÇÃO(A1:A11)') - 0.359543071) < 1e-8, 'DISTORÇÃO');
  assert.ok(Math.abs(planilha('DISTORÇÃO.P(A1:A11)') - 0.303193339) < 1e-8, 'DISTORÇÃO.P');
});

test('poucos números ou sem variação: #DIV/0!, como no Excel', () => {
  const c = planilhaVazia();
  Object.assign(c.abas.a1.cel, { A1: { v: 5 }, A2: { v: 5 }, A3: { v: 5 }, A4: { v: 5 }, B1: { f: 'KURT(A1:A3)' }, B2: { f: 'KURT(A1:A4)' }, B3: { f: 'SKEW(A1:A2)' } });
  const m = new Motor(c);
  for (const l of [0, 1, 2]) assert.equal(String(m.valor('a1', l, 1).codigo || m.valor('a1', l, 1)), '#DIV/0!', 'linha ' + (l + 1));
});

test('a fórmula guardada fica em inglês e volta em português; no Excel, DISTORÇÃO.P leva o _xlfn.', () => {
  assert.equal(paraGuardar('CURT(A1:A9)'), 'KURT(A1:A9)');
  assert.equal(paraMostrar('SKEW(A1:A9)'), 'DISTORÇÃO(A1:A9)');
  assert.equal(traduzirFormulaParaXlsx('SKEW.P(A1:A9)'), '_xlfn.SKEW.P(A1:A9)');
  assert.equal(traduzirFormulaParaXlsx('KURT(A1:A9)'), 'KURT(A1:A9)');
});

test('Ctrl+seta dentro da tabela para na borda; da borda, segue para fora (como no Excel)', () => {
  const c = { ...planilhaVazia(), tabelas: { t1: { nome: 'Tabela1', aba: 'a1', l1: 0, c1: 0, l2: 19, c2: 5, cab: true } } };
  /* coluna D com números até a linha 9 e vazia até o fim da tabela (linha 20): o salto comum iria à última linha da planilha */
  assert.equal(pararNaTabela(c, 'a1', 8, 3, 1, 0, 1048575), 19, 'para no fim da tabela');
  assert.equal(pararNaTabela(c, 'a1', 19, 3, 1, 0, 1048575), 1048575, 'na borda, sai da tabela');
  assert.equal(pararNaTabela(c, 'a1', 8, 3, 1, 0, 12), 12, 'alvo dentro da tabela fica igual');
  assert.equal(pararNaTabela(c, 'a1', 8, 3, -1, 0, 0), 0, 'para cima: o cabeçalho (linha 1) já é a borda');
  assert.equal(pararNaTabela(c, 'a1', 8, 2, 0, 1, 16383), 5, 'para a direita: última coluna da tabela');
  assert.equal(pararNaTabela(c, 'a1', 30, 3, 1, 0, 1048575), 1048575, 'fora da tabela: nada muda');
});
