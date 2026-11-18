/* v0.6.24 parte 2 · filtros do Excel na seta da coluna: texto, número, data, 10 primeiros, média, cor e ida e volta com o .xlsx. Dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../../src/planilha/filtroCriterios.js';
import { linhasEscondidasPeloFiltro, valoresDaColuna } from '../../src/planilha/dados.js';

const p = (cr, v, t = String(v ?? ''), cor = null, vals = []) => F.passaCriterio(cr, v, t, cor, F.preparar(cr, vals));

test('texto: igual, diferente, começa, termina, contém e não contém, sem ligar para acento e maiúscula', () => {
  assert.equal(p({ k: 'txt', op: '=', a: 'Acerola' }, 'acerola'), true);
  assert.equal(p({ k: 'txt', op: '<>', a: 'Acerola' }, 'Mamão'), true);
  assert.equal(p({ k: 'txt', op: 'comeca', a: 'lote' }, 'Lote 7'), true);
  assert.equal(p({ k: 'txt', op: 'termina', a: 'ao' }, 'Mamão'), true);
  assert.equal(p({ k: 'txt', op: 'contem', a: 'CLORO' }, 'Cloro livre'), true);
  assert.equal(p({ k: 'txt', op: 'naoContem', a: 'cloro' }, 'Cloro livre'), false);
});

test('número: comparações, entre e fora; texto na coluna de número', () => {
  assert.equal(p({ k: 'num', op: '>', a: '10' }, 12), true);
  assert.equal(p({ k: 'num', op: '<=', a: '10' }, 10), true);
  assert.equal(p({ k: 'num', op: 'entre', a: '5', b: '1' }, 3), true, 'a ordem dos dois números não importa');
  assert.equal(p({ k: 'num', op: 'fora', a: '1', b: '5' }, 3), false);
  assert.equal(p({ k: 'num', op: '=', a: '0,5' }, 0.5), true, 'vírgula decimal');
  assert.equal(p({ k: 'num', op: '>', a: '1' }, 'texto'), false);
});

test('data: períodos (hoje, esta semana, este mês) e antes, depois, entre', () => {
  const hoje = F.serial(new Date());
  assert.equal(p({ k: 'data', op: 'hoje' }, hoje), true);
  assert.equal(p({ k: 'data', op: 'ontem' }, hoje - 1), true);
  assert.equal(p({ k: 'data', op: 'hoje' }, hoje + 0.75), true, 'data com hora conta o dia');
  const [a, b] = F.faixaDoPeriodo('estaSemana'); assert.equal(b - a, 6);
  assert.equal(p({ k: 'data', op: 'esteMes' }, hoje), true);
  assert.equal(p({ k: 'data', op: 'antes', a: hoje }, hoje - 3), true);
  assert.equal(p({ k: 'data', op: 'entre', a: hoje - 2, b: hoje + 2 }, hoje), true);
  assert.deepEqual(F.faixaDoPeriodo('mesPassado', new Date(2026, 0, 15)), [F.serial(new Date(2025, 11, 1)), F.serial(new Date(2025, 11, 31))]);
});

test('10 primeiros (número e %), menores, e acima/abaixo da média', () => {
  const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  assert.equal(p({ k: 'top', n: 3 }, 10, '10', null, vals), true);
  assert.equal(p({ k: 'top', n: 3 }, 9, '9', null, vals), false);
  assert.equal(p({ k: 'top', n: 3, baixo: true }, 3, '3', null, vals), true);
  assert.equal(p({ k: 'top', n: 25, pct: true }, 10, '10', null, vals), true, '25% de 12 = 3');
  assert.equal(p({ k: 'media', acima: true }, 7, '7', null, vals), true);
  assert.equal(p({ k: 'media', acima: false }, 7, '7', null, vals), false);
});

test('cor de preenchimento e da letra', () => {
  assert.equal(p({ k: 'cor', fundo: '#FFEB9C' }, 1, '1', { fundo: '#ffeb9c' }), true);
  assert.equal(p({ k: 'cor', fundo: '#FFEB9C' }, 1, '1', { fundo: '' }), false);
  assert.equal(p({ k: 'cor', cor: '#C00000' }, 1, '1', { cor: '#c00000' }), true);
});

test('tipo da coluna: data, número ou texto', () => {
  assert.equal(F.tipoDaColuna([{ v: 46000, t: '10/12/2025' }, { v: 46001, t: '11/12/2025' }]), 'data');
  assert.equal(F.tipoDaColuna([{ v: 3, t: '3' }, { v: 'x', t: 'x' }, { v: 5, t: '5' }]), 'num');
  assert.equal(F.tipoDaColuna([{ v: 'a', t: 'a' }]), 'txt');
});

test('filtro na planilha: critério de número e lista de valores juntos (as duas colunas valem)', () => {
  const dados = [['Item', 'Qtd'], ['A', 5], ['B', 15], ['C', 25], ['D', 30]];
  const textoDe = (l, c) => String(dados[l][c]), valorDe = (l, c) => dados[l][c];
  const fil = { fx: 'A1:B5', cr: { 1: { k: 'num', op: '>', a: '10' }, 0: { v: ['B', 'C', 'A'] } } };
  assert.deepEqual([...linhasEscondidasPeloFiltro(fil, textoDe, { valorDe })].sort(), [1, 4]);
  const vals = valoresDaColuna(fil, 0, textoDe, valorDe);
  assert.deepEqual(vals.filter((x) => x.ok).map((x) => x.t), ['B', 'C', 'D'], 'a lista do Item conta só o que passa no número');
});

test('ida e volta com o .xlsx: texto, número, entre, fora, top10, média e períodos', () => {
  const casos = [
    { k: 'txt', op: '=', a: 'Lote 7' }, { k: 'txt', op: '<>', a: 'x' }, { k: 'txt', op: 'comeca', a: 'Lo' }, { k: 'txt', op: 'termina', a: 'ão' },
    { k: 'txt', op: 'contem', a: 'clo' }, { k: 'txt', op: 'naoContem', a: 'a*b' },
    { k: 'num', op: '>', a: 10 }, { k: 'num', op: '<=', a: 2.5 }, { k: 'num', op: 'entre', a: 1, b: 5 }, { k: 'num', op: 'fora', a: 1, b: 5 },
    { k: 'top', n: 10, pct: false, baixo: false }, { k: 'top', n: 20, pct: true, baixo: true },
    { k: 'media', acima: true }, { k: 'media', acima: false }, { k: 'data', op: 'esteMes' }, { k: 'data', op: 'ontem' },
  ];
  for (const cr of casos) {
    const x = F.criterioParaXlsx(cr);
    assert.ok(x, 'não gravou ' + JSON.stringify(cr));
    assert.deepEqual(F.criterioDoXlsx(x), cr, 'volta diferente: ' + x);
  }
  assert.equal(F.criterioParaXlsx({ k: 'cor', fundo: '#fff' }), null, 'cor não vai para o .xlsx (fica só no app)');
});

test('ler do Excel: customFilter com curinga e and/or que o app não entende ficam de fora (null)', () => {
  assert.deepEqual(F.criterioDoXlsx('<customFilters><customFilter val="*cloro*"/></customFilters>'), { k: 'txt', op: 'contem', a: 'cloro' });
  assert.equal(F.criterioDoXlsx('<customFilters><customFilter val="a*b"/></customFilters>'), null);
  assert.equal(F.criterioDoXlsx('<customFilters and="1"><customFilter operator="greaterThan" val="1"/><customFilter operator="lessThan" val="9"/></customFilters>'), null);
  assert.equal(F.textoDoCriterio({ k: 'num', op: 'entre', a: 1, b: 5 }), 'Está entre 1 e 5');
  assert.equal(F.textoDoCriterio({ k: 'top', n: 10 }), 'Os 10 maiores');
});

/* ---------- ida e volta pelo arquivo inteiro ---------- */
import { Motor } from '../../src/planilha/motor.js';
import { normalizarPlanilha, planilhaVazia } from '../../src/planilha/modelo.js';
import { mudancasDoFiltro } from '../../src/planilha/dados.js';
import { textoCelula } from '../../src/planilha/grade.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';

test('.xlsx: número, texto e acima da média gravam como o Excel e voltam valendo; as linhas certas ficam escondidas', async () => {
  const c0 = planilhaVazia(); const a = c0.abas.a1;
  [['Item', 'Qtd', 'Lote'], ['A', 5, 'L-01'], ['B', 15, 'L-02'], ['C', 25, 'X-03'], ['D', 30, 'L-04']].forEach((lin, l) => lin.forEach((v, cc) => { a.cel[String.fromCharCode(65 + cc) + (l + 1)] = { v }; }));
  const c = normalizarPlanilha(c0), m = new Motor(c);
  const textoDe = (l, cc) => textoCelula(m, c, 'a1', l, cc).t, valorDe = (l, cc) => m.valor('a1', l, cc);
  const fil = { fx: 'A1:C5', cr: { 1: { k: 'media', acima: true }, 2: { k: 'txt', op: 'comeca', a: 'L-' } } };
  const mud = mudancasDoFiltro(c.abas.a1, 'a1', fil, textoDe, { valorDe });
  assert.deepEqual(mud['conteudo.abas.a1.ocF'], { 1: 1, 2: 1, 3: 1 }, 'média 18,75: só D (30) passa; C passa na média mas não começa com L-');
  Object.assign(c.abas.a1, { fil, ocL: mud['conteudo.abas.a1.ocL'], ocF: mud['conteudo.abas.a1.ocF'] });
  const { bytes } = await gravarXlsx(c, null, {});
  const folha = await (await lerZip(bytes)).texto('xl/worksheets/sheet1.xml');
  assert.match(folha, /<filterColumn colId="1"><dynamicFilter type="aboveAverage"\/><\/filterColumn>/);
  assert.match(folha, /<filterColumn colId="2"><customFilters><customFilter val="L-\*"\/><\/customFilters><\/filterColumn>/);
  const volta = (await lerXlsx(bytes, {})).conteudo, b = volta.abas[volta.ordem[0]];
  assert.deepEqual(b.fil.cr, fil.cr);
  assert.equal(b.fil.cx, undefined, 'nada fica guardado à parte');
  assert.deepEqual(b.ocF, { 1: 1, 2: 1, 3: 1 });
});

/* ---------- v0.6.24.3: ordem em ciclo (padrão, crescente, decrescente, padrão) ---------- */
import { cicloDeOrdem, estadoDaOrdem } from '../../src/planilha/dados.js';
test('ordem em ciclo no menu do filtro: A a Z, Z a A e volta à ordem de antes (linha inteira junto)', () => {
  const c0 = planilhaVazia(); const a = c0.abas.a1;
  [['Item', 'Qtd'], ['Rede 2', 5], ['Poço', 1], ['Rede 1', 9], ['Caixa', 3]].forEach((lin, l) => lin.forEach((v, cc) => { a.cel[String.fromCharCode(65 + cc) + (l + 1)] = { v }; }));
  a.fil = { fx: 'A1:B5', cr: {} };
  let c = normalizarPlanilha(c0);
  const aplica = (lote) => { const mud = lote.mudancas(); const ab = { ...c.abas.a1, cel: { ...c.abas.a1.cel } }; for (const [k, v] of Object.entries(mud)) { if (k.includes('.cel.')) { const kk = k.split('.cel.')[1]; if (v === undefined) delete ab.cel[kk]; else ab.cel[kk] = v; } else if (k.endsWith('.fil')) ab.fil = v; } c = { ...c, abas: { ...c.abas, a1: ab } }; };
  const col = (cc) => [1, 2, 3, 4].map((l) => c.abas.a1.cel[String.fromCharCode(65 + cc) + (l + 1)].v);
  const val = () => { const m = new Motor(c); return (l, cc) => m.valor('a1', l, cc); };
  assert.equal(estadoDaOrdem(c.abas.a1.fil, 0), null);
  let r = cicloDeOrdem(c, 'a1', 0, { valorDe: val() }); aplica(r.lote);
  assert.deepEqual(col(0), ['Caixa', 'Poço', 'Rede 1', 'Rede 2']); assert.deepEqual(col(1), [3, 1, 9, 5], 'a linha vai inteira');
  assert.equal(estadoDaOrdem(c.abas.a1.fil, 0), 'asc');
  r = cicloDeOrdem(c, 'a1', 0, { valorDe: val() }); aplica(r.lote);
  assert.deepEqual(col(0), ['Rede 2', 'Rede 1', 'Poço', 'Caixa']); assert.equal(estadoDaOrdem(c.abas.a1.fil, 0), 'desc');
  r = cicloDeOrdem(c, 'a1', 0, { valorDe: val() }); aplica(r.lote);
  assert.deepEqual(col(0), ['Rede 2', 'Poço', 'Rede 1', 'Caixa'], 'voltou à ordem de antes'); assert.deepEqual(col(1), [5, 1, 9, 3]);
  assert.equal(estadoDaOrdem(c.abas.a1.fil, 0), null); assert.equal(c.abas.a1.fil.ord, undefined);
  /* ordenar por uma coluna e depois por outra: voltar ao padrão volta à ordem de antes da primeira */
  aplica(cicloDeOrdem(c, 'a1', 0, { valorDe: val() }).lote); aplica(cicloDeOrdem(c, 'a1', 1, { valorDe: val() }).lote);
  assert.deepEqual(col(1), [1, 3, 5, 9]);
  aplica(cicloDeOrdem(c, 'a1', 1, { valorDe: val() }).lote); aplica(cicloDeOrdem(c, 'a1', 1, { valorDe: val() }).lote);
  assert.deepEqual(col(0), ['Rede 2', 'Poço', 'Rede 1', 'Caixa'], 'voltou à ordem de antes da primeira classificação');
});
