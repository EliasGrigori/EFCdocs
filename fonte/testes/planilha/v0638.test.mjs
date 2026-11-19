/* v0.6.38 · Dados › Subtotal (D9 parte 2b). Contas puras, ida ao .xlsx lida pelo openpyxl; dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planilhaVazia, normalizarPlanilha, estiloDe } from '../../src/planilha/modelo.js';
import { Motor } from '../../src/planilha/motor.js';
import { textoCelula } from '../../src/planilha/grade.js';
import { fazerSubtotal, removerSubtotais, linhasDeSubtotal, mudancasEntre } from '../../src/planilha/subtotal.js';
import { gruposDe } from '../../src/planilha/contorno.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function montar(linhas) {
  const c = normalizarPlanilha(planilhaVazia());
  const a = c.abas.a1;
  linhas.forEach((lin, l) => lin.forEach((v, cc) => { if (v == null) return; a.cel[String.fromCharCode(65 + cc) + (l + 1)] = typeof v === 'string' && v.startsWith('=') ? { f: v.slice(1) } : { v }; }));
  return c;
}
const textoDe = (c, l, cc) => textoCelula(new Motor(c), c, 'a1', l, cc).t;
const valor = (c, ref) => { const m = new Motor(c); const k = /^([A-Z]+)(\d+)$/.exec(ref); return m.valor('a1', +k[2] - 1, k[1].charCodeAt(0) - 65); };
const TAB = [['Fruta', 'Kg', 'Caixas'], ['Mamão', 10, 2], ['Mamão', 12, 3], ['Acerola', 5, 1], ['Acerola', 7, 1], ['Acerola', 8, 2], ['Goiaba', 4, 1]];
const AREA = { l1: 0, l2: 6, c1: 0, c2: 2 };

test('soma por fruta: uma linha de total depois de cada grupo e o Total Geral; contas certas', () => {
  const c = montar(TAB);
  const r = fazerSubtotal(c, 'a1', AREA, { col: 0, fn: 9, colunas: [1, 2] }, textoDe);
  assert.equal(r.grupos, 3);
  const n = r.conteudo, cel = n.abas.a1.cel;
  assert.equal(cel.A4.v, 'Mamão Total'); assert.equal(cel.A8.v, 'Acerola Total'); assert.equal(cel.A10.v, 'Goiaba Total'); assert.equal(cel.A11.v, 'Total Geral');
  assert.match(cel.B4.f, /^SUBTOTAL\(9,\s*B2:B3\)$/i);
  assert.equal(valor(n, 'B4'), 22); assert.equal(valor(n, 'B8'), 20); assert.equal(valor(n, 'B10'), 4);
  assert.equal(valor(n, 'B11'), 46, 'o total geral não conta os subtotais de novo'); assert.equal(valor(n, 'C11'), 10);
  assert.equal(estiloDe(n, cel.A4).b, true, 'o rótulo vai em negrito');
});

test('grupos: dados no nível 2, subtotais no nível 1, título e total geral de fora', () => {
  const r = fazerSubtotal(montar(TAB), 'a1', AREA, { col: 0, fn: 9, colunas: [1] }, textoDe);
  const a = r.conteudo.abas.a1;
  assert.equal(a.grpL[0], undefined); assert.equal(a.grpL[1], 2); assert.equal(a.grpL[3], 1); assert.equal(a.grpL[10], undefined);
  const gs = gruposDe(a, 'l');
  assert.deepEqual(gs.filter((g) => g.k === 2).map((g) => [g.ini, g.fim, g.resumo]), [[1, 2, 3], [4, 6, 7], [8, 8, 9]]);
  assert.deepEqual(gs.filter((g) => g.k === 1).map((g) => [g.ini, g.fim, g.resumo]), [[1, 9, 10]]);
});

test('contagem e média, com os rótulos do Excel', () => {
  const c = montar(TAB);
  const r = fazerSubtotal(c, 'a1', AREA, { col: 0, fn: 3, colunas: [1] }, textoDe);
  assert.equal(r.conteudo.abas.a1.cel.A4.v, 'Mamão Contagem'); assert.equal(valor(r.conteudo, 'B8'), 3); assert.equal(r.conteudo.abas.a1.cel.A11.v, 'Contagem Geral');
  const m = fazerSubtotal(c, 'a1', AREA, { col: 0, fn: 1, colunas: [1] }, textoDe);
  assert.equal(valor(m.conteudo, 'B4'), 11); assert.equal(m.conteudo.abas.a1.cel.A11.v, 'Média Geral');
});

test('substituir: fazer de novo não duplica as linhas; remover todos volta à tabela original', () => {
  const c = montar(TAB);
  const r1 = fazerSubtotal(c, 'a1', AREA, { col: 0, fn: 9, colunas: [1] }, textoDe);
  const r2 = fazerSubtotal(r1.conteudo, 'a1', r1.area, { col: 0, fn: 4, colunas: [1] }, textoDe);
  assert.equal(linhasDeSubtotal(r2.conteudo.abas.a1, r2.area).length, 4, 'só as linhas da segunda vez');
  assert.equal(r2.conteudo.abas.a1.cel.A4.v, 'Mamão Máx'); assert.equal(valor(r2.conteudo, 'B4'), 12);
  const z = removerSubtotais(r2.conteudo, 'a1', r2.area);
  assert.equal(z.removidas, 4);
  const cel = z.conteudo.abas.a1.cel;
  assert.equal(cel.A4.v, 'Acerola'); assert.equal(cel.B7.v, 4); assert.equal(cel.A8, undefined);
  assert.equal(z.conteudo.abas.a1.grpL, undefined);
});

test('o que está embaixo da tabela desce junto e a fórmula que apontava para a tabela se ajusta', () => {
  const linhas = TAB.map((x) => [...x]); linhas.push([]); linhas.push(['Fora', '=SOMA(B2:B7)']);
  const c = montar(linhas);
  const r = fazerSubtotal(c, 'a1', AREA, { col: 0, fn: 9, colunas: [1] }, textoDe);
  const cel = r.conteudo.abas.a1.cel;
  assert.equal(cel.A13.v, 'Fora'); assert.match(cel.B13.f, /B2:B9\)/i, 'as linhas entram como no Excel: dentro do intervalo, ele cresce; a do último grupo fica depois');
});

test('resumo em cima: o total vem antes do grupo e o geral logo abaixo dos títulos', () => {
  const r = fazerSubtotal(montar(TAB), 'a1', AREA, { col: 0, fn: 9, colunas: [1], abaixo: false }, textoDe);
  const cel = r.conteudo.abas.a1.cel;
  assert.equal(cel.A2.v, 'Total Geral'); assert.equal(cel.A3.v, 'Mamão Total'); assert.equal(cel.A4.v, 'Mamão');
  assert.equal(valor(r.conteudo, 'B3'), 22); assert.equal(valor(r.conteudo, 'B2'), 46);
  assert.equal(r.conteudo.abas.a1.grpAcima, 1);
});

test('quebra de página entre grupos e erros', () => {
  const r = fazerSubtotal(montar(TAB), 'a1', AREA, { col: 0, fn: 9, colunas: [1], quebra: true }, textoDe);
  assert.deepEqual(r.conteudo.abas.a1.imp.qL, [4, 8]);
  assert.match(fazerSubtotal(montar(TAB), 'a1', AREA, { col: 0, fn: 9, colunas: [] }, textoDe).erro, /pelo menos uma coluna/);
  assert.match(fazerSubtotal(montar([['Só título']]), 'a1', { l1: 0, l2: 0, c1: 0, c2: 0 }, { col: 0, fn: 9, colunas: [0] }, textoDe).erro, /pelo menos uma linha/);
});

test('mudancasEntre: uma mudança por aba que mudou', () => {
  const c = montar(TAB);
  const r = fazerSubtotal(c, 'a1', AREA, { col: 0, fn: 9, colunas: [1] }, textoDe);
  const mud = mudancasEntre(c, r.conteudo);
  assert.ok(mud['conteudo.abas.a1']); assert.ok(Object.keys(mud).every((k) => k === 'conteudo.abas.a1' || k === 'conteudo.estilos'));
});

const temOpenpyxl = spawnSync('python3', ['-c', 'import openpyxl'], { stdio: 'ignore' }).status === 0;
test('ida ao Excel: fórmulas SUBTOTAL, negrito e grupos que o Excel lê', { skip: !temOpenpyxl && 'sem openpyxl' }, async () => {
  const r = fazerSubtotal(montar(TAB), 'a1', AREA, { col: 0, fn: 9, colunas: [1] }, textoDe);
  const bytes = (await gravarXlsx(r.conteudo, new Motor(r.conteudo))).bytes;
  const arq = join(mkdtempSync(join(tmpdir(), 'sub-')), 'sub.xlsx'); writeFileSync(arq, bytes);
  const py = `import openpyxl,json\nwb=openpyxl.load_workbook(${JSON.stringify(arq)})\nws=wb.active\nwv=openpyxl.load_workbook(${JSON.stringify(arq)},data_only=True).active\nprint(json.dumps({'f':ws['B4'].value,'g':ws['B11'].value,'v':wv['B11'].value,'b':ws['A4'].font.b,'n':[ws.row_dimensions[r].outline_level for r in range(1,12)]}))`;
  const o = JSON.parse(spawnSync('python3', ['-c', py], { encoding: 'utf8' }).stdout);
  assert.equal(o.f, '=SUBTOTAL(9,B2:B3)'); assert.equal(o.g, '=SUBTOTAL(9,B2:B10)'); assert.equal(o.v, 46); assert.equal(o.b, true);
  assert.deepEqual(o.n, [0, 2, 2, 1, 2, 2, 2, 1, 2, 1, 0]);
});
