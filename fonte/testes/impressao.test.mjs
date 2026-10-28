/* Testes de Imprimir e PDF da planilha (v0.6.0): paginar, títulos repetidos, escala, quebras, cabeçalho/rodapé, PDF e Excel. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paginar, normalizarImp, impParaGuardar, lerIntervalo, textoCampos, cabParaExcel, cabDoExcel, areaUtil, CM } from '../src/planilha/impressao.js';
import { desenharPaginas, svgDaPagina } from '../src/planilha/paginaDesenho.js';
import { pdfDasPaginas, larguraHelvetica } from '../src/planilha/impressaoPdf.js';
import { gravarXlsx } from '../src/planilha/xlsx/gravar.js';
import { lerXlsx } from '../src/planilha/xlsx/ler.js';
import { lerZip } from '../src/planilha/xlsx/zip.js';
import { Motor } from '../src/planilha/motor.js';
import { planilhaVazia, normalizarPlanilha } from '../src/planilha/modelo.js';

const area = { l1: 0, c1: 0, l2: 199, c2: 9 };
const col80 = () => 80, lin20 = () => 20;

test('impressão: A4 retrato com margens normais divide 200 linhas × 10 colunas em páginas, na ordem do Excel', () => {
  const r = paginar({}, area, col80, lin20);
  const u = areaUtil(normalizarImp({}));
  assert.ok(Math.abs(u.w - (595.28 - 3.6 * CM)) < 0.01);
  assert.equal(r.esc, 1);
  /* 80 px = 60 pt; 493 pt cabem 8 colunas; 20 px = 15 pt; 734 pt cabem 48 linhas */
  assert.equal(r.nC, 2); assert.equal(r.nL, 5); assert.equal(r.paginas.length, 10);
  assert.deepEqual(r.paginas.slice(0, 6).map((p) => `${p.i},${p.j}`), ['0,0', '1,0', '2,0', '3,0', '4,0', '0,1'], 'para baixo, depois para o lado');
  assert.deepEqual(paginar({ ordem: 'lado' }, area, col80, lin20).paginas.slice(0, 3).map((p) => `${p.i},${p.j}`), ['0,0', '0,1', '1,0']);
});

test('impressão: títulos repetidos, escala e quebras manuais', () => {
  const r = paginar({ titLin: '1:1', titCol: 'A:A' }, area, col80, lin20);
  assert.equal(r.paginas[0].lins[0], 0); assert.equal(r.paginas[0].nRepL, 0, 'a 1ª página já tem o título');
  assert.equal(r.paginas[1].lins[0], 0, 'a 2ª página repete a linha 1'); assert.equal(r.paginas[1].nRepL, 1);
  const p2col = r.paginas.find((p) => p.j === 1);
  assert.equal(p2col.cols[0], 0, 'a coluna A repete nas páginas da direita');
  assert.equal(paginar({ escala: { modo: 'pagina' } }, area, col80, lin20).paginas.length, 1);
  const rc = paginar({ escala: { modo: 'colunas' } }, area, col80, lin20);
  assert.equal(rc.nC, 1); assert.ok(rc.esc < 1 && rc.esc > 0.8);
  assert.equal(paginar({ escala: { modo: 'pct', pct: 50 } }, area, col80, lin20).esc, 0.5);
  const rp = paginar({ escala: { modo: 'paginas', largura: 1, altura: 2 } }, area, col80, lin20);
  assert.ok(rp.nC === 1 && rp.nL <= 2, `${rp.nC}x${rp.nL}`);
  const rq = paginar({ qL: [10], qC: [3] }, area, col80, lin20);
  assert.equal(rq.paginas[0].lins.length, 10, 'quebra antes da linha 11'); assert.equal(rq.paginas[0].cols.length, 3, 'quebra antes da coluna D');
  /* colunas ocultas não ocupam lugar */
  assert.equal(paginar({}, area, (c) => (c >= 5 ? 0 : 80), lin20).nC, 1);
});

test('impressão: normalizar, intervalos, campos do cabeçalho e o formato do Excel (&L &C &R)', () => {
  assert.equal(impParaGuardar({}), undefined, 'padrão não vai para o arquivo');
  const n = normalizarImp({ orient: 'deitado', papel: 'xx', marg: { t: 99 }, escala: { modo: 'pct', pct: 1 }, qL: [3, 3, -1, 2.5, 7] });
  assert.equal(n.orient, 'retrato'); assert.equal(n.papel, 'A4'); assert.equal(n.marg.t, 10); assert.equal(n.escala.pct, 10); assert.deepEqual(n.qL, [3, 7]);
  assert.deepEqual(lerIntervalo('$1:$2', 'l'), { a: 0, b: 1 }); assert.deepEqual(lerIntervalo('b:a', 'c'), { a: 0, b: 1 }); assert.equal(lerIntervalo('x', 'l'), null);
  assert.equal(textoCampos('Página &[Página] de &[Páginas] · &[Aba]', { pagina: 2, paginas: 5, aba: 'Coletas' }), 'Página 2 de 5 · Coletas');
  assert.equal(cabParaExcel({ e: 'A & B', c: 'Página &[Página] de &[Páginas]', d: '&[Data]' }), '&LA && B&CPágina &P de &N&R&D');
  assert.deepEqual(cabDoExcel('&L&"Arial,Negrito"&12Relatório&CPágina &P de &N&R&D'), { e: 'Relatório', c: 'Página &[Página] de &[Páginas]', d: '&[Data]' });
});

const fonteSimples = (n = 60) => ({
  tamCol: () => 80, tamLin: () => 20,
  celula: (l, c) => (l < n && c < 3 ? { t: l === 0 ? ['Ponto', 'Cloro', 'Situação'][c] : c === 1 ? '0,4' : 'Ação ' + l, v: c === 1 ? 0.4 : 'x', al: c === 1 ? 'd' : 'e', e: l === 0 ? { b: 1, fundo: '#0f4c5c', cor: '#ffffff', bd: { b: 1 } } : {} } : { t: '', e: {} }),
  mescla: () => null, objetos: [], aba: 'Coletas', arquivo: 'teste', agora: new Date(2026, 9, 28),
});

test('impressão: as páginas desenhadas têm texto, fundo, borda e rodapé; o SVG e o PDF saem certos', () => {
  const pg = paginar({ titLin: '1:1', grade: true }, { l1: 0, c1: 0, l2: 59, c2: 2 }, () => 80, () => 20);
  const pags = desenharPaginas(pg, fonteSimples());
  assert.equal(pags.length, 2);
  const textos = pags[1].ops.filter((o) => o.k === 'text').map((o) => o.t);
  assert.ok(textos.includes('Ponto'), 'título repetido na 2ª página');
  assert.ok(textos.includes('Página 2 de 2'), 'rodapé padrão');
  assert.ok(pags[0].ops.some((o) => o.k === 'rect' && o.fill === '#0f4c5c'));
  assert.ok(pags[0].ops.some((o) => o.k === 'line'));
  const svg = svgDaPagina(pags[0]);
  assert.match(svg, /^<svg [^>]*viewBox="0 0 595.28 841.89"/); assert.match(svg, /Ação 1</);
  const pdf = pdfDasPaginas(pags, { titulo: 'Coletas' });
  const txt = new TextDecoder('latin1').decode(pdf);
  assert.ok(txt.startsWith('%PDF-1.4')); assert.match(txt, /\/Count 2 /); assert.match(txt, /\(A\xe7\xe3o 1\) Tj/, 'texto em WinAnsi, com acento');
  assert.match(txt, /\/BaseFont \/Helvetica-Bold/); assert.match(txt, /%%EOF\n$/);
  assert.ok(Math.abs(larguraHelvetica('Ação', 10) - larguraHelvetica('Acao', 10)) < 0.001);
});

test('impressão: vai para o Excel (margens, papel, escala, títulos, área, cabeçalho, quebras) e volta igual', async () => {
  const c = planilhaVazia();
  const a = c.abas.a1;
  a.nome = 'Coletas 2026';
  a.cel = { A1: { v: 'Ponto' }, B1: { v: 1 } };
  a.imp = normalizarImp({ area: 'A1:F41', orient: 'paisagem', papel: 'oficio', marg: { t: 1, b: 1, l: 0.6, r: 0.6, cab: 0.5, rod: 0.5 }, escala: { modo: 'colunas' }, titLin: '1:2', titCol: 'A:A', cab: { e: '', c: '&[Aba]', d: '' }, rod: { e: '&[Data]', c: 'Página &[Página] de &[Páginas]', d: '' }, grade: true, centH: true, ordem: 'lado', qL: [20, 40], qC: [4] });
  const cn = normalizarPlanilha(c);
  const { bytes } = await gravarXlsx(cn, new Motor(cn));
  const z = lerZip(bytes);
  const sh = await z.texto('xl/worksheets/sheet1.xml');
  assert.match(sh, /<sheetPr><pageSetUpPr fitToPage="1"\/><\/sheetPr>/);
  assert.match(sh, /<printOptions horizontalCentered="1" gridLines="1"\/><pageMargins left="0.2362"/);
  assert.match(sh, /<pageSetup paperSize="5" fitToWidth="1" fitToHeight="0" pageOrder="overThenDown" orientation="landscape"\/>/);
  assert.match(sh, /<oddFooter>&amp;L&amp;D&amp;CPágina &amp;P de &amp;N<\/oddFooter>/);
  assert.match(sh, /<rowBreaks count="2" manualBreakCount="2"><brk id="20"/);
  const wb = await z.texto('xl/workbook.xml');
  assert.match(wb, /<definedName name="_xlnm.Print_Area" localSheetId="0">'Coletas 2026'!\$A\$1:\$F\$41<\/definedName>/);
  assert.match(wb, /<definedName name="_xlnm.Print_Titles" localSheetId="0">'Coletas 2026'!\$A:\$A,'Coletas 2026'!\$1:\$2<\/definedName>/);
  const { conteudo: c2, relatorio } = await lerXlsx(bytes);
  const imp = c2.abas[c2.ordem[0]].imp;
  assert.deepEqual(imp, a.imp);
  assert.ok(!relatorio.fora.some((x) => /impress/i.test(x.item)));
});

/* ---------- v0.6.2: correções do Grok no PDF ---------- */
test('PDF v0.6.2: data um pouco larga não vira #### (a letra encolhe), número muito largo ainda vira #', () => {
  const mk = (t, larg) => ({
    tamCol: () => larg, tamLin: () => 20,
    celula: (l, c) => (l === 0 && c === 0 ? { t, v: 46000, al: 'd', e: {} } : { t: '', e: {} }),
    mescla: () => null, objetos: [], aba: 'A', arquivo: 'x', agora: new Date(2026, 9, 28),
  });
  const pg = (f) => paginar({}, { l1: 0, c1: 0, l2: 0, c2: 0 }, f.tamCol, f.tamLin);
  const f1 = mk('28/10/2026', 66); /* 66 px (49,5 pt): cabe com a letra a 90% */
  const t1 = desenharPaginas(pg(f1), f1)[0].ops.filter((o) => o.k === 'text' && o.t.includes('2026'));
  assert.equal(t1.length, 1, 'a data aparece inteira');
  const f2 = mk('28/10/2026', 30);
  const t2 = desenharPaginas(pg(f2), f2)[0].ops.filter((o) => o.k === 'text' && /^#+$/.test(o.t));
  assert.equal(t2.length, 1, 'coluna estreita demais: ###');
  const t3 = desenharPaginas(pg(f1), f1)[0].ops.find((o) => o.k === 'text' && o.t === '28/10/2026');
  assert.ok(t3.size <= 11 * 0.9 + 0.01, 'letra na mesma proporção da tela (90%)');
});

test('PDF v0.6.2: linha nova (Alt+Enter) vira linhas separadas, e a mesclada cortada pela página não repete o texto', () => {
  const f = {
    tamCol: () => 80, tamLin: () => 20,
    celula: (l, c) => (l === 0 && c === 0 ? { t: 'um\ndois', v: 'um\ndois', al: 'e', e: {} } : l === 2 && c === 1 ? { t: 'Mesclada', v: 'Mesclada', al: 'c', e: { fundo: '#eeeeee' } } : { t: '', e: {} }),
    mescla: (l, c) => (l >= 2 && l <= 59 && c >= 1 && c <= 2 ? { l1: 2, c1: 1, l2: 59, c2: 2 } : null),
    objetos: [], aba: 'A', arquivo: 'x', agora: new Date(2026, 9, 28),
  };
  const pg = paginar({}, { l1: 0, c1: 0, l2: 59, c2: 2 }, f.tamCol, f.tamLin);
  const pags = desenharPaginas(pg, f);
  assert.equal(pags.length, 2);
  const t0 = pags[0].ops.filter((o) => o.k === 'text').map((o) => o.t);
  assert.ok(t0.includes('um') && t0.includes('dois'), 'duas linhas');
  assert.equal(pags.flatMap((p) => p.ops.filter((o) => o.k === 'text' && o.t === 'Mesclada')).length, 1, 'texto da mesclada uma vez só');
  assert.ok(pags[1].ops.some((o) => o.k === 'rect' && o.fill === '#eeeeee'), 'o fundo continua na página seguinte');
});
