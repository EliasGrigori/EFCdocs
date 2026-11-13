/* v0.6.14 "Estável nas planilhas reais": achados da rede de testes nas cópias anonimizadas das planilhas do Elias,
   reproduzidos aqui com dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Motor } from '../../src/planilha/motor.js';

const planilha = (cel) => ({ v: 1, ordem: ['a1'], abas: { a1: { id: 'a1', nome: 'P', cel } }, estilos: [{}], nomes: {}, seq: 2 });
const col = (m, c, l1, l2) => { const out = []; for (let l = l1; l <= l2; l++) out.push(m.valor('a1', l, c)); return out; };

test('v0.6.14 (D-36): CLASSIFICAR(ÚNICO(faixa com célula vazia)) põe a vazia no fim, mostrada como 0, como o Excel', () => {
  /* A1:A6 = b, a, (vazia), c, a, (vazia) */
  const cel = { A1: { v: 'b' }, A2: { v: 'a' }, A4: { v: 'c' }, A5: { v: 'a' }, A7: { v: 'fim' },
    C1: { f: 'SORT(UNIQUE(A1:A6))' }, E1: { f: 'SORT(UNIQUE(A1:A6),1,-1)' }, G1: { f: 'COUNTA(UNIQUE(A1:A6))' }, H1: { f: 'UNIQUE(A1:A6)' },
    J1: { f: 'SORTBY(A1:A6,A1:A6)' } };
  const m = new Motor(planilha(cel));
  assert.deepEqual(col(m, 2, 0, 3), ['a', 'b', 'c', 0], 'crescente: vazia por último');
  assert.deepEqual(col(m, 4, 0, 3), ['c', 'b', 'a', 0], 'decrescente: vazia também por último');
  assert.equal(m.valor('a1', 0, 6), 4, 'CONT.VALORES conta a vazia que o ÚNICO devolve (como o Excel)');
  assert.deepEqual(col(m, 7, 0, 3), ['b', 'a', 0, 'c'], 'o ÚNICO sozinho mantém a ordem e mostra a vazia como 0');
  assert.deepEqual(col(m, 9, 0, 5), ['a', 'a', 'b', 'c', 0, 0], 'CLASSIFICARPOR também põe as vazias no fim');
  /* números com vazia: a vazia não é o menor número */
  const m2 = new Motor(planilha({ A1: { v: 5 }, A3: { v: -2 }, A4: { v: 3 }, C1: { f: 'SORT(UNIQUE(A1:A4))' } }));
  assert.deepEqual(col(m2, 2, 0, 3), [-2, 3, 5, 0]);
  /* faixa: célula vazia continua sem contar */
  const m3 = new Motor(planilha({ A1: { v: 1 }, A3: { v: 2 }, C1: { f: 'COUNTA(A1:A3)' } }));
  assert.equal(m3.valor('a1', 0, 2), 2);
});
