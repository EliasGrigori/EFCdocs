/* v0.6.18 "Guardar e devolver 2" (D-43, D-44, D-45): aba de gráfico, gráficos novos do Excel 2016 (cascata, funil) e
   barras de dados (e um mapa de árvore, tipo ainda sem desenho). Amostra inventada: testes/amostras/amostra-v0618.xlsx (gerar-amostra-v0618.py). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { normalizarPlanilha } from '../../src/planilha/modelo.js';
import { renomearAba } from '../../src/planilha/operacoes.js';
import { Motor } from '../../src/planilha/motor.js';
import { barraDeDados, opsDaBarra } from '../../src/planilha/regras.js';
import { svgDoGrafico } from '../../src/planilha/desenhoGrafico.js';
import { lerFaixaDoLivro } from '../../src/planilha/xlsx/graficosXlsx.js';

const ORIG = new Uint8Array(readFileSync(new URL('../amostras/amostra-v0618.xlsx', import.meta.url)));
const ESTRUTURA = new URL('../../scripts/fidelidade/conferir-estrutura.py', import.meta.url);
const REGRAS = new URL('../../scripts/fidelidade/conferir-regras.py', import.meta.url);
const temPython = spawnSync('python3', ['-c', '1'], { stdio: 'ignore' }).status === 0;
const temLxml = spawnSync('python3', ['-c', 'import lxml'], { stdio: 'ignore' }).status === 0;
const temOpenpyxl = spawnSync('python3', ['-c', 'import openpyxl'], { stdio: 'ignore' }).status === 0;
const dec = (d) => new TextDecoder().decode(d);
const ler = async (bytes) => { const r = await lerXlsx(bytes); return { c: normalizarPlanilha(r.conteudo), rel: r.relatorio || r.rel || {} }; };
async function partes(bytes) { const z = lerZip(bytes); const o = {}; for (const n of z.nomes) o[n] = /\.(xml|rels|vml)$/.test(n) ? dec(await z.bytes(n)) : await z.bytes(n); return o; }
const aplicar = (c, mud) => { const o = JSON.parse(JSON.stringify(c)); for (const [k, v] of Object.entries(mud)) { const ps = k.replace(/^conteudo\./, '').split('.'); let x = o; for (const q of ps.slice(0, -1)) x = x[q] = x[q] || {}; if (v === undefined) delete x[ps.at(-1)]; else x[ps.at(-1)] = v; } return o; };
const idDe = (c, nome) => c.ordem.find((id) => c.abas[id].nome === nome);
function conferirDeFora(bytes, extra = null) {
  if (!temPython) return;
  const d = mkdtempSync(join(tmpdir(), 'efc-v0618-')); const f = join(d, 'x.xlsx'); writeFileSync(f, bytes);
  const r = spawnSync('python3', [ESTRUTURA.pathname, f], { encoding: 'utf8' });
  const r2 = temLxml ? spawnSync('python3', [REGRAS.pathname, f], { encoding: 'utf8' }) : { status: 0 };
  const r3 = extra && temOpenpyxl ? spawnSync('python3', ['-W', 'ignore', '-c', extra, f], { encoding: 'utf8' }) : null;
  rmSync(d, { recursive: true, force: true });
  assert.equal(r.status, 0, r.stdout);
  assert.equal(r2.status, 0, r2.stdout);
  return r3;
}

test('v0.6.18 (D-45): as quatro barras de dados vêm, com o que o bloco do Excel 2010 guarda', async () => {
  const { c, rel } = await ler(ORIG);
  const ind = c.abas[idDe(c, 'Indicadores')];
  const barras = (ind.cf || []).filter((r) => r.t === 'dataBar');
  assert.equal(barras.length, 4, 'uma regra por faixa (a antiga e a do Excel 2010 contam uma vez só)');
  const por = Object.fromEntries(barras.map((r) => [r.fx, r.b]));
  assert.equal(por['B2:B9'].x14, undefined, 'B: só a antiga');
  assert.deepEqual([por['B2:B9'].min.t, por['B2:B9'].max.t, por['B2:B9'].minL, por['B2:B9'].maxL], ['min', 'max', 10, 90]);
  assert.equal(por['C2:C9'].lisa, 1); assert.equal(por['C2:C9'].borda, '#3e9a5a'); assert.equal(por['C2:C9'].min.t, 'autoMin');
  assert.equal(por['D2:D9'].neg, '#ff0000'); assert.equal(por['D2:D9'].eixo, 'auto'); assert.ok(!por['D2:D9'].lisa, 'D: com degradê');
  assert.equal(por['E2:E9'].semValor, 1); assert.deepEqual([por['E2:E9'].min, por['E2:E9'].max], [{ t: 'num', v: 0 }, { t: 'num', v: 100 }]);
  assert.ok(!(rel.fora || []).some((f) => /Barras de dados/.test(f.item)), 'não fica mais de fora');
  assert.equal(rel.extras.barras, 4);
});

test('v0.6.18 (D-45): tamanho da barra como no Excel (antiga com 10% a 90%; nova com eixo para os negativos)', async () => {
  const { c } = await ler(ORIG);
  const id = idDe(c, 'Indicadores'); const m = new Motor(c);
  const b = (ref) => { const l = +ref.slice(1) - 1, col = ref.charCodeAt(0) - 65; return barraDeDados(m, c, id, l, col); };
  const r2 = (x) => Math.round(x * 1000) / 1000;
  assert.deepEqual([r2(b('B2').a), r2(b('B2').b)], [0, 0.1], 'menor valor: 10%');
  assert.equal(r2(b('B9').b), 0.9, 'maior valor: 90%');
  assert.equal(r2(b('C9').b), 1, 'nova: o maior vai até o fim (autoMax, 0% a 100%)');
  assert.equal(r2(b('C2').b), r2(38 / 60), 'nova: começa do zero (autoMin)');
  const neg = b('D2'), pos = b('D7');
  assert.equal(r2(neg.eixo), r2(4 / 12), 'eixo onde o zero cai: -4 a 8');
  assert.deepEqual([r2(neg.a), r2(neg.b), neg.cor], [r2(4 / 12 - (2 / 4) * (4 / 12)), r2(4 / 12), '#ff0000'], 'negativo vai para a esquerda, em vermelho');
  assert.deepEqual([r2(pos.a), r2(pos.b)], [r2(4 / 12), 1]);
  assert.equal(b('E2').semValor, true); assert.equal(r2(b('E2').b), 0.72, 'mínimo e máximo fixos (0 e 100)');
  assert.equal(b('A2'), null, 'fora da faixa: sem barra');
  /* a impressão vira retângulos (o degradê em faixas) e o eixo, uma linha */
  const ops = opsDaBarra(neg, 0, 0, 100, 20);
  assert.ok(ops.filter((o) => o.k === 'rect').length >= 2 && ops.some((o) => o.k === 'line'));
});

test('v0.6.18 (D-43): a aba de gráfico vem como aba com o gráfico, sem grade', async () => {
  const { c, rel } = await ler(ORIG);
  assert.deepEqual(c.ordem.map((id) => c.abas[id].nome), ['Indicadores', 'Gráfico', 'Painel'], 'na ordem do Excel');
  const g = c.abas[idDe(c, 'Gráfico')];
  assert.equal(g.grafico, 1); assert.equal(g.semGrade, 1);
  assert.equal(g.objs.length, 1); assert.equal(g.objs[0].tipo, 'grafico'); assert.equal(g.objs[0].g.t, 'excel');
  assert.ok(!(rel.fora || []).some((f) => /Abas de gráfico/.test(f.item)));
});

test('v0.6.18 (D-44): cascata solta e funil dentro do grupo do painel; o grupo não vira caixa de aviso', async () => {
  const { c, rel } = await ler(ORIG);
  const ind = c.abas[idDe(c, 'Indicadores')], pai = c.abas[idDe(c, 'Painel')];
  const cas = ind.objs.find((o) => o.tipo === 'grafico');
  assert.equal(cas.g.t, 'cx'); assert.equal(cas.g.cx.tipo, 'waterfall'); assert.deepEqual(cas.g.cx.subtotais, [8]);
  assert.equal(cas.g.titulo, 'Variação mês a mês');
  assert.deepEqual(cas.g.cx.dados.map((d) => d.r), [{ aba: '', fx: 'A2:A10' }, { aba: '', fx: 'D2:D10' }], 'as fórmulas apontam para a aba (id)');
  const grupo = pai.objs.find((o) => o.tipo === 'forma');
  assert.ok(grupo.grTok, 'o grupo guarda o XML e sabe dos gráficos de dentro');
  const texto = JSON.stringify(grupo.partes);
  assert.ok(!/não está disponível/.test(texto), 'sem a caixa de aviso do Excel antigo');
  const dentro = pai.objs.filter((o) => o.tipo === 'grafico' && o.noGrupo);
  assert.deepEqual(dentro.map((o) => o.g.t).sort(), ['cx', 'excel']);
  assert.ok(dentro.every((o) => o.noGrupo && o.noGrupo.tok === grupo.grTok));
  assert.equal(dentro.find((o) => o.g.t === 'cx').g.cx.tipo, 'funnel');
  assert.ok(!(rel.fora || []).some((f) => /tipo novo/.test(f.motivo || f.detalhe || '')));
  assert.equal(rel.extras.graficosCx, 3);
  /* o mapa de árvore (tipo que o app ainda não desenha): solto, aparece como quadro com o nome */
  const arv = pai.objs.find((o) => o.tipo === 'grafico' && o.g.t === 'cx' && !o.noGrupo);
  assert.equal(arv.g.cx.tipo, 'treemap');
  assert.match(svgDoGrafico(arv.g, null, { w: 400, h: 260 }), /Mapa de árvore[\s\S]*volta igual ao salvar como Excel/);
  /* o desenho: cascata com 9 barras (o total em cinza) e funil com 5, com os números das células */
  const m = new Motor(c);
  const svg = svgDoGrafico(cas.g, null, { w: 480, h: 300, lerFaixa: lerFaixaDoLivro(c, m, idDe(c, 'Indicadores'), true) });
  assert.equal((svg.match(/data-parte="barra:/g) || []).length, 9);
  assert.ok(/fill="#a5a5a5" data-parte="barra:8"/.test(svg), 'o subtotal é cinza');
  const fu = dentro.find((o) => o.g.t === 'cx');
  assert.equal((svgDoGrafico(fu.g, null, { w: 300, h: 300, lerFaixa: lerFaixaDoLivro(c, m, idDe(c, 'Painel'), true) }).match(/data-parte="barra:/g) || []).length, 5);
});

test('v0.6.18: salvar e abrir de novo (sem o original): aba de gráfico, gráficos novos, grupo e barras voltam', async () => {
  const { c } = await ler(ORIG);
  const { bytes, avisos } = await gravarXlsx(c, null, {});
  const p = await partes(bytes);
  assert.ok(p['xl/chartsheets/sheet2.xml'], 'aba de gráfico');
  assert.ok(!p['xl/worksheets/sheet2.xml']);
  assert.match(p['xl/chartsheets/sheet2.xml'], /<drawing r:id="rId3"\/>/);
  assert.match(p['xl/_rels/workbook.xml.rels'], /relationships\/chartsheet" Target="chartsheets\/sheet2\.xml"/);
  assert.match(p['[Content_Types].xml'], /PartName="\/xl\/chartsheets\/sheet2\.xml" ContentType="application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.chartsheet\+xml"/);
  assert.match(p['xl/drawings/drawing2.xml'], /<xdr:absoluteAnchor><xdr:pos x="0" y="0"\/>/);
  const cxs = Object.keys(p).filter((n) => /^xl\/charts\/chartEx\d+\.xml$/.test(n));
  assert.equal(cxs.length, 3, 'as três partes chartEx');
  assert.match(p['[Content_Types].xml'], /application\/vnd\.ms-office\.chartex\+xml/);
  assert.match(p['xl/drawings/drawing3.xml'], /<xdr:grpSp>[\s\S]*Requires="cx1"[\s\S]*<\/xdr:grpSp>/, 'o funil volta para dentro do grupo');
  assert.match(p['xl/worksheets/sheet1.xml'], /<x14:conditionalFormattings>[\s\S]*<x14:dataBar[^>]*gradient="0"/);
  assert.equal((p['xl/worksheets/sheet1.xml'].match(/<cfRule type="dataBar"/g) || []).length, 4);
  assert.deepEqual(avisos.filter((a) => /aba de gráfico/i.test(a)), []);
  const r3 = conferirDeFora(bytes, 'import openpyxl,sys\nwb=openpyxl.load_workbook(sys.argv[1])\nws=wb["Indicadores"]\nprint(len(wb.chartsheets), sum(1 for cf in ws.conditional_formatting for r in cf.rules if r.type=="dataBar"))');
  if (r3) assert.equal(r3.stdout.trim(), '1 4', 'openpyxl vê a aba de gráfico e as 4 barras: ' + r3.stderr);
  /* abrir de novo dá o mesmo */
  const { c: c2 } = await ler(bytes);
  const b1 = c.abas[idDe(c, 'Indicadores')].cf.map((r) => [r.fx, { ...r.b }]);
  const b2 = c2.abas[idDe(c2, 'Indicadores')].cf.map((r) => [r.fx, { ...r.b }]);
  assert.deepEqual(b2, b1, 'as barras voltam iguais');
  assert.equal(c2.abas[idDe(c2, 'Gráfico')].grafico, 1);
  const pai2 = c2.abas[idDe(c2, 'Painel')];
  assert.ok(pai2.objs.find((o) => o.tipo === 'forma').grTok);
  assert.deepEqual(pai2.objs.filter((o) => o.tipo === 'grafico').map((o) => o.g.t).sort(), ['cx', 'cx', 'excel']);
  assert.ok(pai2.objs.some((o) => o.tipo === 'grafico' && o.g.t === 'cx' && o.g.cx.tipo === 'treemap'), 'o mapa de árvore volta');
  assert.equal(c2.abas[idDe(c2, 'Indicadores')].objs.find((o) => o.tipo === 'grafico').g.cx.tipo, 'waterfall');
});

test('v0.6.18: aba renomeada e número mudado: o gráfico novo leva o nome e o número de agora', async () => {
  const { c } = await ler(ORIG);
  const id = idDe(c, 'Indicadores');
  const mud = renomearAba(c, id, 'Resultados 2026');
  const c1 = aplicar(c, mud);
  c1.abas[id].cel.D2 = { v: 10 };
  const { bytes } = await gravarXlsx(c1, null, {});
  const p = await partes(bytes);
  const x = Object.entries(p).find(([n, v]) => /chartEx\d+\.xml$/.test(n) && /waterfall/.test(v))[1];
  assert.match(x, /<cx:f>'Resultados 2026'!\$D\$2:\$D\$10<\/cx:f>/);
  assert.match(x, /<cx:f>'Resultados 2026'!\$D\$1<\/cx:f>/, 'o nome da série também');
  assert.match(x, /<cx:pt idx="0">10<\/cx:pt>/, 'D2 mudou para 10');
});

test('v0.6.18 (D-43): aba de gráfico que ganhou células vai como aba comum, com aviso', async () => {
  const { c } = await ler(ORIG);
  const id = idDe(c, 'Gráfico');
  c.abas[id].cel.A1 = { v: 'nota' };
  const { bytes, avisos } = await gravarXlsx(c, null, {});
  const p = await partes(bytes);
  assert.ok(p['xl/worksheets/sheet2.xml'] && !p['xl/chartsheets/sheet2.xml']);
  assert.ok(avisos.some((a) => /A aba de gráfico "Gráfico" ganhou células/.test(a)));
  conferirDeFora(bytes);
});

test('v0.6.18: com o original guardado (devolver), as partes novas não se repetem nem somem', async () => {
  const { c } = await ler(ORIG);
  const { bytes } = await gravarXlsx(c, null, { original: ORIG });
  const p = await partes(bytes);
  assert.ok(p['xl/chartsheets/sheet2.xml']);
  assert.equal(Object.keys(p).filter((n) => /chartEx\d+\.xml$/.test(n)).length, 3);
  assert.equal((p['xl/worksheets/sheet1.xml'].match(/<ext uri="\{78C0D931/g) || []).length, 1, 'o bloco das barras uma vez só');
  assert.equal((p['xl/worksheets/sheet1.xml'].match(/<\/extLst><\/worksheet>/g) || []).length, 1, 'um extLst só no fim da aba');
  conferirDeFora(bytes);
});
