/* v0.6.36 · Dados › Texto para colunas (D9, primeira parte). Contas puras, dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Motor } from '../../src/planilha/motor.js';
import { normalizarPlanilha, planilhaVazia, estiloDe } from '../../src/planilha/modelo.js';
import { textoCelula } from '../../src/planilha/grade.js';
import { cortarDelimitado, cortarFixo, sugerirCortes, textoParaColunas, previa } from '../../src/planilha/textoColunas.js';

function montar(linhas) {
  const c = planilhaVazia();
  const a = c.abas.a1;
  linhas.forEach((lin, l) => lin.forEach((v, cc) => {
    if (v == null) return;
    const k = String.fromCharCode(65 + cc) + (l + 1);
    a.cel[k] = typeof v === 'string' && v.startsWith('=') ? { f: v.slice(1) } : { v };
  }));
  const n = normalizarPlanilha(c);
  const m = new Motor(n);
  return { c: n, textoDe: (l, cc) => textoCelula(m, n, 'a1', l, cc).t };
}
const aplicar = (c, lote) => {
  const cel = { ...c.abas.a1.cel };
  for (const [k, v] of Object.entries(lote.mudancas())) {
    if (k === 'conteudo.estilos') { c = { ...c, estilos: v }; continue; }
    if (k.endsWith('.cel')) { for (const x of Object.keys(cel)) delete cel[x]; Object.assign(cel, v); continue; }
    const kk = k.split('.cel.')[1]; if (v === undefined) delete cel[kk]; else cel[kk] = v;
  }
  return { ...c, abas: { ...c.abas, a1: { ...c.abas.a1, cel } } };
};
const SEP = (o = {}) => ({ modo: 'separador', seps: { pv: true }, ...o });
const F = (l1, l2, c1 = 0, c2 = c1) => ({ l1, l2, c1, c2 });

test('separador: ponto e vírgula, vírgula, espaço, tabulação e outro', () => {
  assert.deepEqual(cortarDelimitado('Silva;Maria;32', SEP()), ['Silva', 'Maria', '32']);
  assert.deepEqual(cortarDelimitado('a,b c', { seps: { virgula: true, espaco: true } }), ['a', 'b', 'c']);
  assert.deepEqual(cortarDelimitado('a\tb', { seps: { tab: true } }), ['a', 'b']);
  assert.deepEqual(cortarDelimitado('a|b|c', { seps: {}, outro: '|' }), ['a', 'b', 'c']);
  assert.deepEqual(cortarDelimitado('sem nada', { seps: {} }), ['sem nada']);
});

test('separadores seguidos como um só; vazio no meio quando não junta', () => {
  assert.deepEqual(cortarDelimitado('a;;b', SEP()), ['a', '', 'b']);
  assert.deepEqual(cortarDelimitado('a;;b', SEP({ juntar: true })), ['a', 'b']);
  assert.deepEqual(cortarDelimitado('  José   Lima', { seps: { espaco: true }, juntar: true }), ['José', 'Lima']);
});

test('texto entre aspas não é cortado; "" vira uma aspa', () => {
  assert.deepEqual(cortarDelimitado('"Lima; Ana";40', SEP()), ['Lima; Ana', '40']);
  assert.deepEqual(cortarDelimitado('"diz ""oi""";2', SEP()), ['diz "oi"', '2']);
  assert.deepEqual(cortarDelimitado('"a;b";c', SEP({ aspas: '' })), ['"a', 'b"', 'c']);
});

test('largura fixa: cortes nas posições e sugestão pelas colunas de espaço', () => {
  assert.deepEqual(cortarFixo('0012025Mamão   ', [3, 7]), ['001', '2025', 'Mamão']);
  assert.deepEqual(cortarFixo('abc', [5]), ['abc', '']);
  assert.deepEqual(sugerirCortes(['AB  12  X', 'CD  34  Y']), [4, 8]);
});

test('na planilha: corta a coluna A em A, B e C; números e datas viram valores (Geral)', () => {
  const { c, textoDe } = montar([['Silva;Maria;32'], ['Lima;Ana;1,5'], ['Rocha;Pedro;10/11/2026']]);
  const r = textoParaColunas(c, 'a1', F(0, 2), SEP(), { textoDe });
  assert.equal(r.linhas, 3); assert.equal(r.colunas, 3); assert.equal(r.substitui, 0);
  const n = aplicar(c, r.lote).abas.a1.cel;
  assert.equal(n.A1.v, 'Silva'); assert.equal(n.B1.v, 'Maria'); assert.equal(n.C1.v, 32);
  assert.equal(n.C2.v, 1.5);
  assert.equal(typeof n.C3.v, 'number', 'a data vira número de série');
});

test('formato Texto mantém o zero na frente; Pular não escreve a coluna', () => {
  const { c, textoDe } = montar([['001;Mamão;5'], ['002;Acerola;7']]);
  const r = textoParaColunas(c, 'a1', F(0, 1), SEP({ formatos: ['texto', 'pular', 'geral'] }), { textoDe });
  const nc = aplicar(c, r.lote);
  const n = nc.abas.a1.cel;
  assert.equal(n.A1.v, '001'); assert.equal(estiloDe(nc, n.A1).nf, '@');
  assert.equal(n.B1.v, 5, 'a coluna pulada não ocupa lugar');
  assert.equal(n.C1, undefined);
  const g = textoParaColunas(c, 'a1', F(0, 1), SEP(), { textoDe });
  assert.equal(aplicar(c, g.lote).abas.a1.cel.A1.v, 1, 'no Geral, 001 vira 1 (como no Excel)');
});

test('avisa quantas células com dado serão substituídas; destino em outra coluna', () => {
  const { c, textoDe } = montar([['a;b', 'velho'], ['c;d', null]]);
  assert.equal(textoParaColunas(c, 'a1', F(0, 1), SEP(), { textoDe, conferir: true }).substitui, 1);
  const r = textoParaColunas(c, 'a1', F(0, 1), SEP(), { textoDe, destino: { l: 0, c: 3 } });
  const n = aplicar(c, r.lote).abas.a1.cel;
  assert.equal(n.A1.v, 'a;b', 'com destino em outro lugar, a origem fica');
  assert.equal(n.D1.v, 'a'); assert.equal(n.E2.v, 'd');
});

test('erros: mais de uma coluna, sem texto, só fórmulas', () => {
  const { c, textoDe } = montar([['a;b', 'x'], ['=1+1']]);
  assert.match(textoParaColunas(c, 'a1', F(0, 0, 0, 1), SEP(), { textoDe }).erro, /uma coluna só/);
  assert.match(textoParaColunas(c, 'a1', F(5, 6), SEP(), { textoDe }).erro, /Não há texto/);
  assert.match(textoParaColunas(c, 'a1', F(1, 1), SEP(), { textoDe }).erro, /fórmulas/);
  const r = textoParaColunas(c, 'a1', F(0, 1), SEP(), { textoDe });
  assert.equal(r.comFormula, 1, 'a fórmula fica de fora e é contada');
});

test('prévia: até 8 linhas e o número de colunas', () => {
  const p = previa(['a;b;c', 'd;e'], SEP());
  assert.equal(p.colunas, 3); assert.deepEqual(p.linhas[1], ['d', 'e']);
});

/* conferente de fora: o resultado vai para o .xlsx e o openpyxl lê o que o Excel leria */
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const temOpenpyxl = spawnSync('python3', ['-c', 'import openpyxl'], { stdio: 'ignore' }).status === 0;

test('ida ao Excel: texto com zero fica texto com formato @; número fica número; volta igual ao abrir', { skip: !temOpenpyxl && 'sem openpyxl' }, async () => {
  const { c, textoDe } = montar([['001;Mamão;5'], ['002;Acerola;1,5']]);
  const r = textoParaColunas(c, 'a1', F(0, 1), SEP({ formatos: ['texto', 'geral', 'geral'] }), { textoDe });
  const nc = aplicar(c, r.lote);
  const bytes = (await gravarXlsx(nc, new Motor(nc))).bytes;
  const arq = join(mkdtempSync(join(tmpdir(), 'tc-')), 'tc.xlsx'); writeFileSync(arq, bytes);
  const py = `import openpyxl,json\nws=openpyxl.load_workbook(${JSON.stringify(arq)}).active\nprint(json.dumps([[ws[k].value, ws[k].number_format] for k in ['A1','B1','C1','A2','C2']]))`;
  const out = JSON.parse(spawnSync('python3', ['-c', py], { encoding: 'utf8' }).stdout);
  assert.deepEqual(out[0], ['001', '@']); assert.equal(out[1][0], 'Mamão'); assert.equal(out[2][0], 5);
  assert.deepEqual(out[3], ['002', '@']); assert.equal(out[4][0], 1.5);
  const volta = (await lerXlsx(bytes)).conteudo || (await lerXlsx(bytes));
  const aba = Object.values(volta.abas)[0];
  assert.equal(aba.cel.A1.v, '001'); assert.equal(aba.cel.C2.v, 1.5);
});
