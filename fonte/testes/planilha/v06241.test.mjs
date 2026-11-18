/* v0.6.24.1 · estabilização: DL02 (classificar uma coluna só), DL03 (linha de total ao classificar), DL04 (remover duplicados encolhe a SOMA).
   Relatório do Grok de 18/11. Dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Motor } from '../../src/planilha/motor.js';
import { normalizarPlanilha, planilhaVazia } from '../../src/planilha/modelo.js';
import * as D from '../../src/planilha/dados.js';
import { textoCelula } from '../../src/planilha/grade.js';
const { classificar, removerDuplicados } = D;

function montar(linhas, extra = {}) {
  const c = planilhaVazia();
  const a = c.abas.a1;
  linhas.forEach((lin, l) => lin.forEach((v, cc) => {
    if (v == null) return;
    const k = String.fromCharCode(65 + cc) + (l + 1);
    a.cel[k] = typeof v === 'string' && v.startsWith('=') ? { f: v.slice(1) } : { v };
  }));
  Object.assign(a, extra);
  const n = normalizarPlanilha(c);
  const m = new Motor(n);
  return { c: n, m, valorDe: (l, cc) => m.valor('a1', l, cc), textoDe: (l, cc) => textoCelula(m, n, 'a1', l, cc).t };
}
const aplicar = (c, lote) => {
  const mud = lote.mudancas();
  const cel = { ...c.abas.a1.cel };
  for (const [k, v] of Object.entries(mud)) {
    if (k.endsWith('.cel')) Object.assign(cel, {}), Object.keys(cel).forEach((x) => delete cel[x]), Object.assign(cel, v);
    else { const kk = k.split('.cel.')[1]; if (v === undefined) delete cel[kk]; else cel[kk] = v; }
  }
  return cel;
};
const col = (cel, cc, de, ate) => { const o = []; for (let l = de; l <= ate; l++) { const x = cel[String.fromCharCode(65 + cc) + (l + 1)]; o.push(x ? (x.f != null ? '=' + x.f : x.v) : null); } return o; };


test('DL03: classificar com a linha de total junto: o total fica embaixo e a SOMA continua certa', () => {
  const { c, valorDe } = montar([['Nome', 'Qtd'], ['Zebra', 3], ['Xis', 1], ['Yoga', 2], ['Total', '=SUM(B2:B4)']]);
  const r = classificar(c, 'a1', { l1: 0, c1: 0, l2: 4, c2: 1 }, [{ col: 0, desc: false }], { cabecalho: true, valorDe });
  const cel = aplicar(c, r.lote);
  assert.deepEqual(col(cel, 0, 0, 4), ['Nome', 'Xis', 'Yoga', 'Zebra', 'Total']);
  assert.deepEqual(col(cel, 1, 0, 4), ['Qtd', 1, 2, 3, '=SUM(B2:B4)']);
  assert.deepEqual(r.total, 4, 'avisa qual linha de total ficou no lugar');
  assert.equal(r.linhas, 3);
});

test('DL03: ordem decrescente também deixa o total embaixo; linha de fórmula comum (da própria linha) continua ordenando', () => {
  const { c, valorDe } = montar([['Nome', 'Qtd', 'Dobro'], ['Ana', 3, '=B2*2'], ['Bia', 1, '=B3*2'], ['Total', '=SUM(B2:B3)', '=SUM(C2:C3)']]);
  const r = classificar(c, 'a1', { l1: 0, c1: 0, l2: 3, c2: 2 }, [{ col: 1, desc: true }], { cabecalho: true, valorDe });
  const cel = aplicar(c, r.lote);
  assert.deepEqual(col(cel, 0, 0, 3), ['Nome', 'Ana', 'Bia', 'Total']);
  assert.deepEqual(col(cel, 1, 1, 3), [3, 1, '=SUM(B2:B3)']);
  assert.deepEqual(col(cel, 2, 1, 3), ['=B2*2', '=B3*2', '=SUM(C2:C3)']);
});

test('DL04: remover duplicados: a SOMA de baixo sobe junto e o intervalo encolhe (sem pegar o cabeçalho)', () => {
  const { c, valorDe } = montar([['Item', 'Qtd'], ['Caneta', 2], ['Lápis', 3], ['Caneta', 2], ['Soma', '=SUM(B2:B4)']]);
  const r = removerDuplicados(c, 'a1', { l1: 0, c1: 0, l2: 4, c2: 1 }, [0, 1], { cabecalho: true, valorDe });
  assert.equal(r.removidas, 1);
  const cel = aplicar(c, r.lote);
  assert.deepEqual(col(cel, 0, 0, 4), ['Item', 'Caneta', 'Lápis', 'Soma', null]);
  assert.deepEqual(col(cel, 1, 0, 4), ['Qtd', 2, 3, '=SUM(B2:B3)', null]);
});

test('DL04: fórmula da própria linha que sobe continua apontando para a própria linha', () => {
  const { c, valorDe } = montar([['Item', 'Qtd', 'x2'], ['A', 1, '=B2*2'], ['A', 1, '=B3*2'], ['B', 5, '=B4*2']]);
  const r = removerDuplicados(c, 'a1', { l1: 0, c1: 0, l2: 3, c2: 2 }, [0, 1], { cabecalho: true, valorDe });
  const cel = aplicar(c, r.lote);
  assert.deepEqual(col(cel, 2, 1, 3), ['=B2*2', '=B3*2', null]);
});

test('DL02: uma coluna escolhida com dados ao lado pede para expandir a seleção, como o Excel', () => {
  const regiao = { l1: 0, c1: 0, l2: 4, c2: 1 };
  assert.deepEqual(D.pedeExpandir({ l1: 0, c1: 1, l2: 4, c2: 1 }, regiao), regiao);
  assert.equal(D.pedeExpandir({ l1: 0, c1: 0, l2: 4, c2: 1 }, regiao), null, 'a tabela inteira já está escolhida');
  assert.equal(D.pedeExpandir({ l1: 0, c1: 3, l2: 4, c2: 3 }, { l1: 0, c1: 3, l2: 4, c2: 3 }), null, 'coluna sozinha, sem vizinhos');
  assert.equal(D.pedeExpandir({ l1: 0, c1: 1, l2: 0, c2: 1 }, regiao), null, 'uma célula só usa a região mesmo');
});
