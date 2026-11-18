/* v0.6.25 · ideias do Grok aprovadas em 18/11: I02 circular dados inválidos, I01 estatística descritiva, I04 amostragem. Dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Motor } from '../../src/planilha/motor.js';
import { planilhaVazia } from '../../src/planilha/modelo.js';
import { lerChave } from '../../src/planilha/ref.js';
import * as A from '../../src/planilha/analise.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';

/** Aplica as mudanças { 'conteudo.x.y': v } num conteúdo (como o app faz ao gravar). */
function aplicar(c, mud) {
  const n = structuredClone(c);
  for (const [cam, v] of Object.entries(mud)) {
    const p = cam.replace(/^conteudo\./, '').split('.');
    let o = n; for (let i = 0; i < p.length - 1; i++) { o[p[i]] = o[p[i]] ?? {}; o = o[p[i]]; }
    if (v === undefined) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = v;
  }
  return n;
}
const val = (m, aba, k) => { const p = lerChave(k); return m.valor(aba, p.l, p.c); };

/* Cloro (mg/L) em 6 pontos de coleta; validação: decimal entre 0,2 e 2 */
function planilhaCloro() {
  const c = planilhaVazia();
  const cel = c.abas.a1.cel;
  cel.A1 = { v: 'Ponto' }; cel.B1 = { v: 'Cloro' }; cel.C1 = { v: 'pH' };
  [['Rede 1', 0.4, 7.1], ['Rede 2', 1.2, 7.4], ['Poço', 0.8, 6.9], ['Caixa', 2.5, 7], ['Bebedouro', 3, 7.2], ['Torneira', 0.8, 7.3]].forEach(([a, b, ph], i) => {
    cel['A' + (i + 2)] = { v: a }; cel['B' + (i + 2)] = { v: b }; cel['C' + (i + 2)] = { v: ph };
  });
  c.abas.a1.val = [{ fx: 'B2:B7', t: 'decimal', op: 'between', f1: '0.2', f2: '2', me: 1 }];
  return c;
}

test('I02: circula só as células com valor fora da validação (vazia e regra "qualquer valor" não contam)', () => {
  const c = planilhaCloro();
  c.abas.a1.cel.B8 = { v: '' };
  c.abas.a1.val.push({ fx: 'A2:A7', t: 'any' });
  const m = new Motor(c);
  const r = A.celulasInvalidas(m, c, 'a1');
  assert.deepEqual(r.cels, [{ l: 4, c: 1 }, { l: 5, c: 1 }], '2,5 e 3 estão acima de 2');
  assert.equal(r.total, 2);
  assert.equal(A.celulasInvalidas(m, planilhaVazia(), 'a1').semRegra, true);
});

test('I02: corrigiu o valor, o círculo some; texto numa célula de número é inválido', () => {
  const c = planilhaCloro();
  const m = new Motor(c);
  const { cels } = A.celulasInvalidas(m, c, 'a1');
  const c2 = aplicar(c, { 'conteudo.abas.a1.cel.B5': { v: 1.5 } });
  assert.deepEqual(A.circulosQueFicam(new Motor(c2), c2, 'a1', cels), [{ l: 5, c: 1 }]);
  const c3 = aplicar(c, { 'conteudo.abas.a1.cel.B2': { v: 'sem leitura' } });
  assert.equal(A.celulaInvalida(new Motor(c3), c3, 'a1', 1, 1), true);
});

test('I01: resumo conta igual ao Excel (média, mediana, moda, desvio da amostra, CV, amplitude)', () => {
  const r = A.resumo([0.4, 1.2, 0.8, 2.5, 3, 0.8]);
  const [media, erroP, med, moda, dp, vari, cv, min, max, amp, soma, n] = r;
  assert.ok(Math.abs(media - 1.45) < 1e-9);
  assert.ok(Math.abs(med - 1) < 1e-9);
  assert.equal(moda, 0.8);
  assert.ok(Math.abs(vari - 1.103) < 1e-9, 'variância da amostra ' + vari);
  assert.ok(Math.abs(dp - Math.sqrt(1.103)) < 1e-9 && Math.abs(erroP - dp / Math.sqrt(6)) < 1e-9 && Math.abs(cv - dp / 1.45) < 1e-9);
  assert.deepEqual([min, max, n], [0.4, 3, 6]); assert.ok(Math.abs(soma - 8.7) < 1e-9);
  assert.ok(Math.abs(amp - 2.6) < 1e-9);
  assert.deepEqual(A.resumo([]), A.MEDIDAS.map(() => null));
});

test('I01: aba nova "Estatística" com fórmulas ligadas aos dados; o motor calcula igual ao resumo e acompanha a mudança', () => {
  const c = planilhaCloro();
  const f = { l1: 0, c1: 0, l2: 6, c2: 2 };
  const r = A.montarEstatistica(c, 'a1', f, { cols: [1, 2], cabecalho: true, titulos: (cc) => ['Ponto', 'Cloro', 'pH'][cc] });
  assert.equal(r.nome, 'Estatística');
  const c2 = aplicar(c, r.mud);
  assert.deepEqual(c2.ordem, ['a1', r.id], 'logo depois da aba atual');
  const cel = c2.abas[r.id].cel;
  assert.equal(cel.A2.v, 'Média'); assert.equal(cel.B1.v, 'Cloro'); assert.equal(cel.C1.v, 'pH');
  assert.equal(cel.B2.f, 'AVERAGE(Planilha1!$B$2:$B$7)');
  const m = new Motor(c2);
  const esperado = A.resumo([0.4, 1.2, 0.8, 2.5, 3, 0.8]);
  A.MEDIDAS.forEach(([rot], k) => assert.ok(Math.abs(val(m, r.id, 'B' + (k + 2)) - esperado[k]) < 1e-9, rot + ': ' + val(m, r.id, 'B' + (k + 2))));
  assert.equal(c2.estilos[cel.B8.s].nf, '0.0%', 'coeficiente de variação em porcentagem');
  assert.equal(c2.estilos[cel.B2.s].nf, '#,##0.000', 'três casas'); assert.ok(!cel.B13.s, 'contagem sem formato');
  const c3 = aplicar(c2, { 'conteudo.abas.a1.cel.B2': { v: 10 } });
  assert.equal(val(new Motor(c3), r.id, 'B10'), 10, 'máximo acompanha o dado novo');
  /* segunda vez: nome sem repetir */
  assert.equal(A.montarEstatistica(c2, 'a1', f, { cols: [1], cabecalho: true, titulos: () => 'Cloro' }).nome, 'Estatística 2');
  assert.ok(A.montarEstatistica(c, 'a1', f, { cols: [], cabecalho: true }).erro);
});

test('I04: sorteio aleatório sem repetir e periódico (uma a cada k, começo sorteado)', () => {
  const cand = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const fixo = (seq) => { let i = 0; return (n) => seq[i++ % seq.length] % n; };
  const a = A.escolherLinhas(cand, { modo: 'aleatorio', n: 4, sorteio: fixo([9, 0, 3, 1]) });
  assert.equal(a.length, 4); assert.equal(new Set(a).size, 4, 'sem repetir');
  assert.deepEqual(a, [...a].sort((x, y) => x - y), 'em ordem');
  assert.ok(a.every((x) => cand.includes(x)));
  assert.deepEqual(A.escolherLinhas(cand, { modo: 'periodico', k: 3, sorteio: () => 1 }), [11, 14, 17]);
  assert.equal(A.escolherLinhas(cand, { n: 50 }).length, 10, 'pedir mais do que tem dá todas');
  for (let i = 0; i < 200; i++) { const x = A.sortear(7); assert.ok(x >= 0 && x < 7 && Number.isInteger(x)); }
});

test('I04: aba "Amostra" com cabeçalho, linha de origem, linhas ocultas fora do sorteio e a nota do sorteio', () => {
  const c = planilhaCloro();
  const m = new Motor(c);
  const f = { l1: 0, c1: 0, l2: 6, c2: 2 };
  const r = A.montarAmostra(c, 'a1', f, { cabecalho: true, modo: 'aleatorio', n: 3, origem: true, escondida: (l) => l === 2, valorDe: (l, cc) => m.valor('a1', l, cc), sorteio: () => 0, quando: new Date(2026, 10, 18, 16, 40) });
  assert.equal(r.nome, 'Amostra'); assert.equal(r.sorteadas, 3); assert.equal(r.total, 5, 'a linha 3 (oculta) não entra');
  assert.ok(!r.linhas.includes(2));
  const cel = aplicar(c, r.mud).abas[r.id].cel;
  assert.deepEqual([cel.A1.v, cel.B1.v, cel.C1.v, cel.D1.v], ['Linha', 'Ponto', 'Cloro', 'pH']);
  assert.equal(cel.A2.v, r.linhas[0] + 1, 'número da linha de origem');
  assert.equal(cel.B2.v, c.abas.a1.cel['A' + (r.linhas[0] + 1)].v);
  assert.match(cel.A6.v, /^Sorteio de 18\/11\/2026 16:40: 3 de 5 linhas de Planilha1, A2:C7 \(aleatória, sem repetir\)\.$/);
  assert.ok(A.montarAmostra(c, 'a1', { l1: 0, c1: 0, l2: 0, c2: 2 }, { cabecalho: true, n: 3, valorDe: () => null }).erro, 'sem dados');
});

test('I01: a aba "Estatística" vai e volta no .xlsx (_xlfn. nas funções novas, mesmas fórmulas e resultados ao abrir)', async () => {
  const c = planilhaCloro();
  const r = A.montarEstatistica(c, 'a1', { l1: 0, c1: 0, l2: 6, c2: 2 }, { cols: [1], cabecalho: true, titulos: () => 'Cloro' });
  const c2 = aplicar(c, r.mud);
  const { bytes } = await gravarXlsx(c2, new Motor(c2));
  const sh = await lerZip(bytes).texto('xl/worksheets/sheet2.xml');
  assert.match(sh, /<f>_xlfn\.STDEV\.S\(Planilha1!\$B\$2:\$B\$7\)<\/f>/);
  assert.match(sh, /<f>_xlfn\.MODE\.SNGL\(/);
  const volta = await lerXlsx(bytes);
  const cv = volta.conteudo || volta;
  const id = cv.ordem[1];
  assert.equal(cv.abas[id].nome, 'Estatística');
  assert.equal(cv.abas[id].cel.B6.f, 'STDEV.S(Planilha1!$B$2:$B$7)');
  assert.ok(Math.abs(val(new Motor(cv), id, 'B6') - Math.sqrt(1.103)) < 1e-9);
});
