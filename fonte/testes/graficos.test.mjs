/* Testes dos gráficos (v0.6.0): leitura da faixa, recomendação, contas da qualidade, desenho, ida e volta pelo .xlsx. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dadosDaFaixa, recomendar, pareto, cartaControle, histograma, escala, normalizarG, numeroCurto } from '../src/planilha/graficos.js';
import { svgDoGrafico } from '../src/planilha/desenhoGrafico.js';
import { gDoXml, xmlDoGrafico } from '../src/planilha/xlsx/graficosXlsx.js';
import { gravarXlsx } from '../src/planilha/xlsx/gravar.js';
import { lerXlsx } from '../src/planilha/xlsx/ler.js';
import { lerZip } from '../src/planilha/xlsx/zip.js';
import { Motor } from '../src/planilha/motor.js';
import { planilhaVazia, normalizarPlanilha } from '../src/planilha/modelo.js';
import { novoGrafico, normalizarObjetos } from '../src/planilha/objetos.js';
import * as O from '../src/planilha/operacoes.js';

const M = [['Ponto', 'Cloro', 'pH'], ['Entrada', 0.4, 6.6], ['Reservatório', 0.7, 7.0], ['Rede 1', 1.0, 7.4], ['Rede 2', 1.3, 6.9]];
const faixaM = { l1: 0, c1: 0, l2: M.length - 1, c2: 2 };
const dM = () => dadosDaFaixa(faixaM, (l, c) => M[l][c], (l, c) => String(M[l][c]));

test('gráfico: lê títulos, categorias e séries da faixa (por colunas e por linhas)', () => {
  const d = dM();
  assert.equal(d.cab, true); assert.equal(d.temCat, true);
  assert.deepEqual(d.cats, ['Entrada', 'Reservatório', 'Rede 1', 'Rede 2']);
  assert.deepEqual(d.series.map((s) => s.nome), ['Cloro', 'pH']);
  assert.deepEqual(d.series[0].vals, [0.4, 0.7, 1.0, 1.3]);
  assert.deepEqual(d.series.map((s) => s.j), [1, 2]);
  /* por linhas: cada linha é uma série */
  const T = [['', 'Jan', 'Fev', 'Mar'], ['Entrada', 1, 2, 3], ['Rede', 4, 5, 6]];
  const dl = dadosDaFaixa({ l1: 0, c1: 0, l2: 2, c2: 3 }, (l, c) => T[l][c], (l, c) => String(T[l][c]), true);
  assert.deepEqual(dl.cats, ['Jan', 'Fev', 'Mar']);
  assert.deepEqual(dl.series.map((s) => [s.nome, s.vals]), [['Entrada', [1, 2, 3]], ['Rede', [4, 5, 6]]]);
  /* só números: sem título e sem categoria */
  const N = [[3], [5], [4]];
  const dn = dadosDaFaixa({ l1: 0, c1: 0, l2: 2, c2: 0 }, (l, c) => N[l][c], (l, c) => String(N[l][c]));
  assert.equal(dn.cab, false); assert.equal(dn.temCat, false); assert.deepEqual(dn.cats, ['1', '2', '3']);
});

test('gráfico: recomenda o tipo pelos dados', () => {
  assert.deepEqual(recomendar(dM()), ['colunas', 'combinado', 'linha']);
  const um = { cats: ['A', 'B', 'C'], series: [{ nome: 'x', vals: [3, 2, 1] }], temCat: true };
  assert.deepEqual(recomendar(um), ['colunas', 'pareto', 'rosca']);
  assert.equal(recomendar({ cats: ['1', '2'], series: [{ vals: [1, 2] }], temCat: false })[0], 'histograma');
  assert.equal(recomendar({ cats: ['05/01/2026'], series: [{ vals: [1] }], temCat: true, data: true })[0], 'linha');
  assert.equal(recomendar({ cats: ['1'], series: [{ vals: [1] }, { vals: [2] }], temCat: false })[0], 'dispersao');
});

test('gráfico: Pareto ordena e acumula; carta de controle I-MR; histograma por Sturges; escala bonita', () => {
  const p = pareto({ cats: ['a', 'b', 'c', 'd'], series: [{ vals: [10, 50, 0, 40] }] });
  assert.deepEqual(p.cats, ['b', 'd', 'a'], 'zero sai');
  assert.deepEqual(p.acum.map((v) => Math.round(v)), [50, 90, 100]);
  const k = cartaControle([10, 12, 11, 13, 12, 30]);
  assert.ok(Math.abs(k.media - 14.6667) < 1e-3);
  /* amplitudes móveis: 2,1,2,1,18 → média 4,8 → σ = 4,8/1,128 */
  assert.ok(Math.abs(k.sigma - 4.8 / 1.128) < 1e-9);
  assert.deepEqual(k.fora, [false, false, false, false, false, true], 'LSC = 14,67 + 3 × 4,26 = 27,4: o 30 passa');
  const k2 = cartaControle([10, 10.2, 9.9, 10.1, 10, 14], {});
  assert.equal(k2.fora[5], true, 'o 14 passa do LSC');
  assert.equal(cartaControle([1, 2], { lsc: 1.5 }).fora[1], true, 'LSC escrito pelo usuário vale');
  const h = histograma([1, 2, 2, 3, 3, 3, 4, 4, 5, 9]);
  assert.equal(h.vals.reduce((a, b) => a + b, 0), 10);
  assert.equal(h.vals.length, Math.ceil(Math.log2(10) + 1));
  assert.deepEqual(escala(0, 7.4).ticks, [0, 2, 4, 6, 8]);
  assert.equal(numeroCurto(12500), '12,5 mil');
});

test('gráfico: normalizar limpa o que veio de fora; o desenho sai em SVG para todos os tipos', () => {
  const g = normalizarG({ t: 'xyz', titulo: 'x'.repeat(300), op: { legenda: 'zzz', cores: ['#123456', 'vermelho'], meta: 'a' } });
  assert.equal(g.t, 'colunas'); assert.equal(g.titulo.length, 120); assert.equal(g.op.legenda, 'baixo');
  assert.deepEqual(g.op.cores, ['#123456']); assert.equal(g.op.meta, undefined);
  for (const t of ['colunas', 'barras', 'linha', 'area', 'pizza', 'rosca', 'combinado', 'pareto', 'controle', 'histograma', 'dispersao']) {
    const svg = svgDoGrafico(normalizarG({ t, titulo: 'Teste <&>' }), dM(), { w: 400, h: 260 });
    assert.match(svg, /^<svg [^>]*viewBox="0 0 400 260"/, t);
    assert.ok(svg.includes('Teste &lt;&amp;&gt;'), 'título escapado: ' + t);
    assert.ok(!/NaN|undefined/.test(svg), 'sem NaN: ' + t);
  }
  assert.match(svgDoGrafico(normalizarG({ t: 'colunas' }), { cats: [], series: [] }), /Escolha células com números/);
});

test('gráfico: objeto da aba, e a faixa dos dados acompanha inserir e excluir linhas e colunas', () => {
  const c = planilhaVazia();
  const a = c.abas.a1;
  a.cel = { A1: { v: 'Ponto' }, B1: { v: 'Cloro' }, A2: { v: 'Entrada' }, B2: { v: 0.4 }, A3: { v: 'Rede' }, B3: { v: 0.7 } };
  a.objs = [novoGrafico({ t: 'colunas', titulo: 'Cloro', dados: { aba: '', fx: 'A1:B3' } }, { l: 0, c: 4 }, 'g1')];
  let mud = O.estrutura(c, 'a1', 'l', 0, 2);
  const o1 = mud['conteudo.abas.a1.objs'][0];
  assert.equal(o1.g.dados.fx, 'A3:B5'); assert.equal(o1.l, 2);
  mud = O.estrutura(c, 'a1', 'c', 1, 1);
  assert.equal(mud['conteudo.abas.a1.objs'][0].g.dados.fx, 'A1:C3', 'coluna no meio alarga a faixa');
  const lista = normalizarObjetos([{ ...a.objs[0], w: 5, h: 99999 }]);
  assert.equal(lista[0].w, 180); assert.equal(lista[0].h, 1600);
});

test('gráfico: salvar como Excel grava gráfico nativo (colunas com referências) e abrir de novo traz igual', async () => {
  const c = planilhaVazia();
  const a = c.abas.a1;
  a.nome = 'Coletas';
  a.cel = { A1: { v: 'Ponto' }, B1: { v: 'Cloro' }, C1: { v: 'pH' }, A2: { v: 'Entrada' }, B2: { v: 0.4 }, C2: { v: 6.6 }, A3: { v: 'Rede 1' }, B3: { v: 0.7 }, C3: { v: 7 }, A4: { v: 'Rede 2' }, B4: { v: 1.3 }, C4: { v: 6.9 } };
  a.objs = [
    novoGrafico({ t: 'colunas', titulo: 'Cloro e pH', dados: { aba: '', fx: 'A1:C4' }, op: { rotulos: true, legenda: 'dir' } }, { l: 1, c: 5 }, 'g1'),
    novoGrafico({ t: 'controle', titulo: 'Carta do cloro', dados: { aba: '', fx: 'A1:B4' }, op: { lsc: 1.2 } }, { l: 20, c: 5 }, 'g2'),
    novoGrafico({ t: 'pareto', dados: { aba: '', fx: 'A1:B4' } }, { l: 40, c: 5 }, 'g3'),
  ];
  const cn = normalizarPlanilha(c);
  const { bytes } = await gravarXlsx(cn, new Motor(cn), { agora: new Date('2026-10-28T12:00:00Z') });
  const z = lerZip(bytes);
  for (const p of ['xl/drawings/drawing1.xml', 'xl/drawings/_rels/drawing1.xml.rels', 'xl/charts/chart1.xml', 'xl/charts/chart2.xml', 'xl/charts/chart3.xml', 'xl/worksheets/_rels/sheet1.xml.rels']) assert.ok(z.tem(p), p);
  const ct = await z.texto('[Content_Types].xml');
  assert.match(ct, /drawingml\.chart\+xml/); assert.match(ct, /drawing\+xml/);
  assert.match(await z.texto('xl/worksheets/sheet1.xml'), /<drawing r:id="rId3"\/><\/worksheet>/);
  const ch1 = await z.texto('xl/charts/chart1.xml');
  assert.match(ch1, /<c:barChart><c:barDir val="col"\/>/);
  assert.match(ch1, /<c:f>Coletas!\$B\$2:\$B\$4<\/c:f>/); assert.match(ch1, /<c:f>Coletas!\$A\$2:\$A\$4<\/c:f>/); assert.match(ch1, /<c:f>Coletas!\$C\$1<\/c:f>/);
  assert.match(ch1, /<c:legendPos val="r"\/>/); assert.match(ch1, /<c:showVal val="1"\/>/);
  const ch2 = await z.texto('xl/charts/chart2.xml');
  assert.match(ch2, /<c:lineChart>/); assert.match(ch2, /<c:v>LSC<\/c:v>/); assert.match(ch2, /<c:v>1\.2<\/c:v>/, 'LSC escrito vai como linha');
  const ch3 = await z.texto('xl/charts/chart3.xml');
  assert.match(ch3, /<c:barChart>[\s\S]*<c:lineChart>/); assert.match(ch3, /<c:max val="100"\/>/);
  /* ida e volta */
  const { conteudo: c2, relatorio } = await lerXlsx(bytes);
  assert.equal(relatorio.extras.graficos, 3);
  assert.ok(!relatorio.fora.some((x) => x.item === 'Gráficos'));
  const objs = c2.abas[c2.ordem[0]].objs;
  assert.equal(objs.length, 3);
  assert.deepEqual(objs.map((o) => o.g.t), ['colunas', 'controle', 'pareto']);
  assert.equal(objs[0].g.titulo, 'Cloro e pH'); assert.equal(objs[0].g.dados.fx, 'A1:C4'); assert.equal(objs[0].g.dados.aba, '');
  assert.equal(objs[1].g.op.lsc, 1.2);
  assert.deepEqual([objs[0].l, objs[0].c], [1, 5]);
  assert.ok(Math.abs(objs[0].w - 480) <= 1 && Math.abs(objs[0].h - 300) <= 1, `tamanho ${objs[0].w}x${objs[0].h}`);
});

test('gráfico: um gráfico feito no Excel (sem a marca do EFCdocs) vem com o plano completo', () => {
  const xml = '<c:chartSpace xmlns:c="x" xmlns:a="y"><c:chart><c:title><c:tx><c:rich><a:p><a:r><a:t>Cloro </a:t></a:r><a:r><a:t>diário</a:t></a:r></a:p></c:rich></c:tx></c:title><c:plotArea>' +
    '<c:lineChart><c:grouping val="standard"/><c:ser><c:idx val="0"/><c:tx><c:strRef><c:f>\'Dados 2026\'!$B$1</c:f></c:strRef></c:tx><c:spPr><a:ln><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:ln></c:spPr><c:cat><c:strRef><c:f>\'Dados 2026\'!$A$2:$A$31</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>\'Dados 2026\'!$B$2:$B$31</c:f></c:numRef></c:val></c:ser></c:lineChart>' +
    '</c:plotArea><c:legend><c:legendPos val="r"/></c:legend></c:chart></c:chartSpace>';
  const r = gDoXml(xml);
  /* v0.6.1: o gráfico do Excel fica como veio (t:'excel'), com o plano completo e o XML original */
  assert.equal(r.g.t, 'excel'); assert.equal(r.g.titulo, 'Cloro diário');
  const S = r.g.plano.grupos[0].series[0];
  assert.deepEqual(S.vals.ref, { aba: 'Dados 2026', fx: 'B2:B31' }); assert.deepEqual(S.cats.ref, { aba: 'Dados 2026', fx: 'A2:A31' });
  assert.equal(r.g.plano.legenda.pos, 'r'); assert.equal(S.linha.cor, '#ff0000');
  assert.ok(r.g.xo.includes('Cloro'));
  assert.equal(gDoXml(xml.replace(/lineChart/g, 'radarChart')).g.t, 'excel', 'radar: desenhado de forma simples');
  assert.match(gDoXml(xml.replace(/lineChart/g, 'surfaceChart')).fora, /superfície/);
  void xmlDoGrafico;
});

test('v0.6.0: copiar e colar leva a lista suspensa, a cor por regra e o comentário (e recortar tira da origem)', () => {
  const c = planilhaVazia();
  const a = c.abas.a1;
  a.cel = { A1: { v: 'Ponto' }, A2: { v: 'Entrada' }, B2: { v: 3 } };
  a.val = [{ id: 'v1', fx: 'A2:A10', t: 'list', f1: '"Entrada,Rede"' }];
  a.cf = [{ id: 'c1', fx: 'B2:B10', t: 'expression', f1: 'B2>2', e: { fundo: '#f4cccc' } }];
  a.com = { A2: { t: 'Ponto de entrada', a: 'Ana' } };
  const m = new Motor(c);
  const clip = O.copiar(c, 'a1', { l1: 1, c1: 0, l2: 2, c2: 1 }, m); // A2:B3
  const { lote } = O.colar(c, 'a1', 19, 3, clip, { motor: m }); // em D20
  const mud = lote.mudancas ? lote.mudancas() : lote.paraMudancas ? lote.paraMudancas() : null;
  const out = mud || lote.outras;
  const val = out['conteudo.abas.a1.val'], cf = out['conteudo.abas.a1.cf'], com = out['conteudo.abas.a1.com'];
  assert.ok(val.length === 1 && val[0].fx === 'A2:A10 D20:D21' && val[0].f1 === '"Entrada,Rede"', 'a mesma lista cresce: ' + JSON.stringify(val));
  const cfNova = cf.find((r) => r.fx === 'A2:B10' ? false : r.fx.includes('E20'));
  assert.ok(cf.length === 2 && cf[1].fx === 'E20:E21' && cf[1].f1 === 'E20>2', 'regra com conta relativa: nova regra com a conta andada: ' + JSON.stringify(cf));
  void cfNova;
  assert.equal(com.D20.t, 'Ponto de entrada');
  /* recortar */
  const clip2 = O.copiar(c, 'a1', { l1: 1, c1: 0, l2: 1, c2: 0 }, m);
  const r2 = O.colar(c, 'a1', 5, 5, clip2, { motor: m, recortar: true });
  const o2 = r2.lote.outras;
  assert.equal(o2['conteudo.abas.a1.com'].A2, undefined, 'o comentário sai da origem');
  assert.equal(o2['conteudo.abas.a1.com'].F6.t, 'Ponto de entrada');
  assert.equal(o2['conteudo.abas.a1.val'][0].fx, 'A3:A10 F6', 'a lista sai da origem e vai para o destino');
});
