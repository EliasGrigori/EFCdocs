/* v0.6.13 "Guardar e devolver" (D-29, D-33): o que o app não edita volta do arquivo original ao salvar como Excel.
   Amostra inventada: testes/amostras/amostra-v0613.xlsx (gerar-amostra-v0613.py). Macro e tema com figura são postos
   na amostra só na memória (bytes inventados). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip, criarZip } from '../../src/planilha/xlsx/zip.js';
import { normalizarPlanilha } from '../../src/planilha/modelo.js';
import { renomearAba, excluirAba, duplicarAba } from '../../src/planilha/operacoes.js';

const ORIG = new Uint8Array(readFileSync(new URL('../amostras/amostra-v0613.xlsx', import.meta.url)));
const ESTRUTURA = new URL('../../scripts/fidelidade/conferir-estrutura.py', import.meta.url);
const temPython = spawnSync('python3', ['-c', '1'], { stdio: 'ignore' }).status === 0;
const dec = (d) => new TextDecoder().decode(d);
const ler = async (bytes) => normalizarPlanilha((await lerXlsx(bytes)).conteudo);
async function partes(bytes) { const z = lerZip(bytes); const o = {}; for (const n of z.nomes) o[n] = /\.(xml|rels|vml)$/.test(n) ? dec(await z.bytes(n)) : await z.bytes(n); return o; }
const aplicar = (c, mud) => { const o = JSON.parse(JSON.stringify(c)); for (const [k, v] of Object.entries(mud)) { const ps = k.replace(/^conteudo\./, '').split('.'); let x = o; for (const p of ps.slice(0, -1)) x = x[p] = x[p] || {}; if (v === undefined) delete x[ps.at(-1)]; else x[ps.at(-1)] = v; } return o; };
const idDe = (c, nome) => c.ordem.find((id) => c.abas[id].nome === nome);
/** conferência estrutural de fora (Python), quando há Python */
function semErroDeEstrutura(bytes) {
  if (!temPython) return;
  const d = mkdtempSync(join(tmpdir(), 'efc-v0613-')); const f = join(d, 'x.xlsx'); writeFileSync(f, bytes);
  const r = spawnSync('python3', [ESTRUTURA.pathname, f], { encoding: 'utf8' }); rmSync(d, { recursive: true, force: true });
  assert.equal(r.status, 0, r.stdout);
}

test('v0.6.13: cada aba lida sabe de que parte do original veio; a cópia de uma aba não leva isso', async () => {
  const c = await ler(ORIG);
  assert.deepEqual(c.ordem.map((id) => c.abas[id].org), ['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']);
  const d = duplicarAba(c, idDe(c, 'RESUMO')); assert.equal(d.mud[`conteudo.abas.${d.id}`].org, undefined);
});

test('v0.6.13: sem o original nada volta (como antes); com o original voltam tabela dinâmica, segmentações e controles, ligados certo', async () => {
  const c = await ler(ORIG);
  const sem = await partes((await gravarXlsx(c)).bytes);
  assert.ok(!Object.keys(sem).some((n) => /pivot|slicer|ctrlProp/.test(n)));
  const g = await gravarXlsx(c, null, { original: ORIG }); const p = await partes(g.bytes);
  assert.ok(g.avisos.some((a) => /Voltaram do arquivo original, como vieram: 1 tabela dinâmica, 2 segmentações de dados e 2 botões e caixas de controle\. A tabela dinâmica se atualiza ao abrir no Excel\./.test(a)), g.avisos.join(' | '));
  assert.ok(!g.avisos.some((a) => /macros/i.test(a)), 'botão de formulário sem macro não vira aviso de macro');
  /* tabela dinâmica: aba → tabela dinâmica → memória → registros, e a memória no livro */
  const resumo = 'xl/worksheets/sheet2.xml', rr = p['xl/worksheets/_rels/sheet2.xml.rels'];
  assert.match(rr, /Type="[^"]*\/pivotTable" Target="\.\.\/pivotTables\/pivotTable1\.xml"/);
  assert.match(p['xl/pivotTables/_rels/pivotTable1.xml.rels'], /pivotCacheDefinition1\.xml/);
  assert.match(p['xl/pivotCache/pivotCacheDefinition1.xml'], /refreshOnLoad="1"/, 'atualiza ao abrir no Excel');
  assert.ok(p['xl/pivotCache/pivotCacheRecords1.xml']);
  assert.match(p['xl/workbook.xml'], /<pivotCaches><pivotCache cacheId="1" r:id="(rIdDv\d+)"\/><\/pivotCaches>/);
  /* segmentações: lista na aba, memórias no livro com o nome definido; a de tabela aponta para a tabela e a coluna do arquivo novo */
  const sl = /<x14:slicer r:id="([^"]+)"\/>/.exec(p[resumo]); assert.ok(sl, 'lista de segmentações na aba');
  assert.match(rr, new RegExp(`Id="${sl[1]}" Type="[^"]*/slicer" Target="\\.\\./slicers/slicer1\\.xml"`));
  assert.equal((p['xl/workbook.xml'].match(/<x14:slicerCache r:id=/g) || []).length, 2);
  for (const n of ['SegmentaçãodeDados_Região', 'SegmentaçãodeDados_Mês']) assert.ok(p['xl/workbook.xml'].includes(`<definedName name="${n}">#N/A</definedName>`), n);
  const tab = Object.keys(p).find((n) => /^xl\/tables\/table\d+\.xml$/.test(n) && /displayName="TabVendas"/.test(p[n]));
  const idTab = /<table\b[^>]*\bid="(\d+)"/.exec(p[tab])[1];
  assert.match(p['xl/slicerCaches/slicerCache2.xml'], new RegExp(`<x15:tableSlicerCache tableId="${idTab}" column="1"/>`));
  /* molduras no desenho: 2 segmentações e as 2 formas-gêmeas dos controles */
  const d = p['xl/drawings/drawing2.xml'] || p[Object.keys(p).find((n) => /^xl\/drawings\/drawing\d+\.xml$/.test(n))];
  assert.equal((d.match(/<sle:slicer\b/g) || []).length, 2); assert.equal((d.match(/<a14:compatExt\b/g) || []).length, 2);
  /* controles: bloco na aba, propriedades, formas no desenho antigo */
  assert.equal((p[resumo].match(/<control shapeId=/g) || []).length, 2);
  for (const m of p[resumo].matchAll(/<control shapeId="\d+" r:id="([^"]+)"/g)) assert.match(rr, new RegExp(`Id="${m[1]}" Type="[^"]*/ctrlProp"`));
  const vml = Object.keys(p).find((n) => /\.vml$/.test(n)); assert.ok(/ObjectType="Checkbox"/.test(p[vml]) && /ObjectType="Button"/.test(p[vml]));
  assert.match(p[resumo], /<drawing r:id="[^"]+"\/><legacyDrawing r:id="[^"]+"\/><mc:AlternateContent/, 'ordem exigida pelo Excel');
  semErroDeEstrutura(g.bytes);
  /* o app lê o salvo e salva de novo (com o mesmo original): continua igual, sem duplicar */
  const g2 = await gravarXlsx(await ler(g.bytes), null, { original: ORIG }); const p2 = await partes(g2.bytes);
  assert.equal((p2[resumo].match(/<control shapeId=/g) || []).length, 2);
  assert.deepEqual(Object.keys(p2).filter((n) => /pivot|slicer|ctrlProp/.test(n)).sort(), Object.keys(p).filter((n) => /pivot|slicer|ctrlProp/.test(n)).sort());
});

test('v0.6.13: aba de dados renomeada no app: a fonte da tabela dinâmica segue o nome novo', async () => {
  let c = await ler(ORIG);
  c = aplicar(c, renomearAba(c, idDe(c, 'DADOS'), 'Base 2026'));
  const p = await partes((await gravarXlsx(c, null, { original: ORIG })).bytes);
  assert.match(p['xl/pivotCache/pivotCacheDefinition1.xml'], /<worksheetSource ref="A1:C9" sheet="Base 2026"\/>/);
});

test('v0.6.13: aba apagada no app leva junto o que dependia dela, e o aviso diz', async () => {
  let c = await ler(ORIG);
  /* sem RESUMO: a tabela dinâmica e as duas segmentações (que só apareciam nela) não voltam */
  const sem = aplicar(c, excluirAba(c, idDe(c, 'RESUMO')).mud || excluirAba(c, idDe(c, 'RESUMO')));
  const g = await gravarXlsx(sem, null, { original: ORIG }); const p = await partes(g.bytes);
  assert.ok(!Object.keys(p).some((n) => /pivot|slicer|ctrlProp/.test(n)), Object.keys(p).join(' '));
  assert.ok(!/SegmentaçãodeDados_/.test(p['xl/workbook.xml']) || !/<x14:slicerCache/.test(p['xl/workbook.xml']));
  semErroDeEstrutura(g.bytes);
  /* sem DADOS: a tabela TabVendas some, a segmentação dela fica de fora; a tabela dinâmica volta com os dados guardados, sem atualizar */
  c = await ler(ORIG);
  const semD = aplicar(c, excluirAba(c, idDe(c, 'DADOS')).mud || excluirAba(c, idDe(c, 'DADOS')));
  const g2 = await gravarXlsx(semD, null, { original: ORIG }); const p2 = await partes(g2.bytes);
  assert.ok(g2.avisos.some((a) => /Uma segmentação ficou de fora porque a aba, a tabela ou a tabela dinâmica de que dependia foi apagada aqui\./.test(a)), g2.avisos.join(' | '));
  assert.ok(g2.avisos.some((a) => /Uma tabela dinâmica perdeu a aba de onde vinham os dados: no Excel ela mostra os dados guardados e não se atualiza\./.test(a)));
  assert.ok(!/refreshOnLoad/.test(p2['xl/pivotCache/pivotCacheDefinition1.xml']), 'sem fonte, não pede para atualizar');
  assert.equal((p2['xl/workbook.xml'].match(/<x14:slicerCache r:id=/g) || []).length, 1);
  semErroDeEstrutura(g2.bytes);
});

test('v0.6.13: macros voltam byte a byte, o arquivo vira .xlsm e cada aba guarda o nome de código', async () => {
  const z = lerZip(ORIG); const arqs = [];
  const vba = new Uint8Array(4096).map((_, i) => (i * 37 + 11) & 255); /* bytes inventados */
  for (const nome of z.nomes) {
    let d = await z.bytes(nome);
    if (nome === '[Content_Types].xml') d = new TextEncoder().encode(dec(d).replace('</Types>', '<Default Extension="bin" ContentType="application/vnd.ms-office.vbaProject"/></Types>').replace(/(PartName="\/xl\/workbook\.xml" ContentType=")[^"]*"/, '$1application/vnd.ms-excel.sheet.macroEnabled.main+xml"'));
    if (nome === 'xl/_rels/workbook.xml.rels') d = new TextEncoder().encode(dec(d).replace('</Relationships>', '<Relationship Id="rIdVBA" Type="http://schemas.microsoft.com/office/2006/relationships/vbaProject" Target="vbaProject.bin"/></Relationships>'));
    arqs.push({ nome, dados: d });
  }
  arqs.push({ nome: 'xl/vbaProject.bin', dados: vba });
  const orig = await criarZip(arqs);
  const c = await ler(orig);
  const semOrig = await gravarXlsx(c); assert.ok(!semOrig.macros && semOrig.avisos.some((a) => /As macros \(VBA\)/.test(a)), 'sem o original, o aviso antigo');
  const g = await gravarXlsx(c, null, { original: orig }); const p = await partes(g.bytes);
  assert.equal(g.macros, true); assert.ok(g.avisos.some((a) => /Voltaram do arquivo original, como vieram: as macros, 1 tabela dinâmica/.test(a)));
  assert.ok(!g.avisos.some((a) => /As macros \(VBA\).*não vão/.test(a)));
  assert.deepEqual([...p['xl/vbaProject.bin']], [...vba]);
  assert.match(p['[Content_Types].xml'], /PartName="\/xl\/workbook\.xml" ContentType="application\/vnd\.ms-excel\.sheet\.macroEnabled\.main\+xml"/);
  assert.match(p['xl/_rels/workbook.xml.rels'], /relationships\/vbaProject" Target="vbaProject\.bin"/);
  assert.match(p['xl/workbook.xml'], /<workbookPr\b[^>]*codeName="EstaPastaDeTrabalho"/);
  assert.match(p['xl/worksheets/sheet2.xml'], /<sheetPr\b[^>]*codeName="Planilha2"/);
  semErroDeEstrutura(g.bytes);
});

test('v0.6.13 (D-33): tema com figura de fundo: sem o original a figura vira cor lisa (sem r:id solto); com o original volta com a figura', async () => {
  const z = lerZip(ORIG); const arqs = []; const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]);
  for (const nome of z.nomes) {
    let d = await z.bytes(nome);
    if (nome === 'xl/theme/theme1.xml') d = new TextEncoder().encode(dec(d).replace(/<a:bgFillStyleLst>([\s\S]*?)<\/a:bgFillStyleLst>/, (m, x) => `<a:bgFillStyleLst>${x}<a:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></a:blipFill></a:bgFillStyleLst>`));
    arqs.push({ nome, dados: d });
  }
  arqs.push({ nome: 'xl/theme/_rels/theme1.xml.rels', dados: new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/fundo.png"/></Relationships>') });
  arqs.push({ nome: 'xl/media/fundo.png', dados: png });
  const orig = await criarZip(arqs); const c = await ler(orig);
  assert.match(dec(await lerZip(orig).bytes('xl/theme/theme1.xml')), /r:embed="rId1"/, 'a amostra tem a figura');
  const sem = await partes((await gravarXlsx(c)).bytes);
  assert.ok(!/r:embed=/.test(sem['xl/theme/theme1.xml']) && !sem['xl/theme/_rels/theme1.xml.rels']);
  semErroDeEstrutura((await gravarXlsx(c)).bytes);
  const g = await gravarXlsx(c, null, { original: orig }); const p = await partes(g.bytes);
  assert.match(p['xl/theme/theme1.xml'], /r:embed="rId1"/); assert.match(p['xl/theme/_rels/theme1.xml.rels'], /Target="\.\.\/media\/tema_fundo\.png"/);
  assert.deepEqual([...p['xl/media/tema_fundo.png']], [...png]);
  semErroDeEstrutura(g.bytes);
});

test('v0.6.13: anotação feita no app e controles do original dividem o desenho antigo sem número repetido', async () => {
  let c = await ler(ORIG); const id = idDe(c, 'RESUMO');
  c = aplicar(c, { [`conteudo.abas.${id}.com`]: { H20: { t: 'Nota inventada', a: 'Teste' } } });
  const g = await gravarXlsx(c, null, { original: ORIG }); const p = await partes(g.bytes);
  const vmls = Object.keys(p).filter((n) => /\.vml$/.test(n));
  const rr = p['xl/worksheets/_rels/sheet2.xml.rels'];
  const ligados = vmls.filter((n) => rr.includes(n.split('/').pop()));
  assert.equal(ligados.length, 1, 'um desenho antigo por aba: ' + vmls.join(' '));
  const v = p[ligados[0]];
  if (/ObjectType="Note"/.test(v)) {
    const ids = [...v.matchAll(/<v:shape\b[^>]*\bid="(_x0000_s\d+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, 'números das formas sem repetir: ' + ids.join(' '));
    assert.ok(ids.includes('_x0000_s1025') && ids.includes('_x0000_s1026'), 'os controles mantêm o número que o bloco <controls> usa');
    const blocos = (/<o:idmap\b[^>]*data="([^"]*)"/.exec(v) || [])[1].split(',').map(Number);
    for (const i of ids) assert.ok(blocos.includes(Math.floor(+i.slice(8) / 1024)), `bloco de ${i} declarado (${blocos})`);
  }
  semErroDeEstrutura(g.bytes);
});
