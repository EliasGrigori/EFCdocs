/* v0.6.44 · S3 da segmentação: a segmentação feita no app vai para o arquivo do Excel (e volta ao abrir de novo).
   Amostra inventada: testes/amostras/amostra-v0641.xlsx (aba Coletas com a tabela TabColetas; aba Painel). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { Motor } from '../../src/planilha/motor.js';
import { aplicarMud } from '../../src/planilha/tabelaViva.js';
import * as FT from '../../src/planilha/filtrosTabela.js';
import * as S from '../../src/planilha/segmentacao.js';

const abrir = async (b = new Uint8Array(readFileSync(new URL('../amostras/amostra-v0641.xlsx', import.meta.url)))) => { const c = (await lerXlsx(b)).conteudo; const id = (n) => c.ordem.find((x) => c.abas[x].nome === n); return { b, c, co: id('Coletas'), pa: id('Painel') }; };
const salvar = async (c, original) => { const g = await gravarXlsx(c, new Motor(c), { original }); const z = lerZip(g.bytes); const txt = async (n) => (z.nomes.includes(n) ? new TextDecoder().decode(await z.bytes(n)) : null); return { g, z, txt }; };
const seg = (c, id, nome) => (c.abas[id].seg || []).find((s) => s.nome === nome);
const tocar = (c, s, texto) => { const e = S.estadoDaSeg(c, new Motor(c), s); return aplicarMud(c, FT.mudancasDosFiltros(c, e.t.aba, e.alvo.k, S.filtroAoTocar(e, texto), e.ler.textoDe, e.ler.x)); };

test('feita no app num arquivo do Excel: vai para o arquivo, junto das que vieram, e volta ao abrir de novo', async () => {
  const { b, c, co, pa } = await abrir();
  let n = aplicarMud(c, S.novasSegs(c, co, 'tabcoletas', ['Kg']));
  n = aplicarMud(n, S.comSeg(n, co, 'Kg', { titulo: 'Quilos', cols: 2, l: 13, c: 4, dx: 6, dy: 2, w: 210, h: 150 }));
  const { g, z, txt } = await salvar(n, b);
  assert.ok(!g.avisos.some((a) => /feita no app/.test(a)), 'sem aviso de que a segmentação não vai: ' + g.avisos.join(' | '));
  const s1 = await txt('xl/slicers/slicer1.xml');
  assert.match(s1, /<slicer name="Kg" cache="SegmentaçãodeDados_Kg" caption="Quilos" columnCount="2" rowHeight="\d+"\/>/, 'entra na parte de segmentações da aba Coletas');
  const cache = (await Promise.all(z.nomes.filter((x) => /^xl\/slicerCaches\//.test(x) && !/_rels/.test(x)).map(txt))).find((x) => /name="SegmentaçãodeDados_Kg"/.test(x));
  assert.match(cache, /sourceName="Kg"/); assert.match(cache, /<x15:tableSlicerCache tableId="\d+" column="3"\/>/);
  const wb = await txt('xl/workbook.xml');
  assert.match(wb, /<definedName name="SegmentaçãodeDados_Kg">#N\/A<\/definedName>/);
  assert.equal((wb.match(/<x14:slicerCache r:id=/g) || []).length, 3, 'as duas memórias que vieram e a nova');
  assert.match(await txt('[Content_Types].xml'), /slicerCacheApp1\.xml" ContentType="application\/vnd\.ms-excel\.slicerCache\+xml"/);
  /* abrir de novo */
  const r = await abrir(g.bytes);
  const k = seg(r.c, r.co, 'Kg');
  assert.ok(k, 'a segmentação feita no app voltou');
  assert.deepEqual([k.titulo, k.cn, k.cols, k.l, k.c, k.dx, k.dy, k.w, k.h, k.novo], ['Quilos', 'Kg', 2, 13, 4, 6, 2, 210, 150, undefined]);
  assert.deepEqual(r.c.abas[r.co].seg.map((s) => s.nome).sort(), ['Fruta', 'Kg', 'Talhão']);
  assert.ok(seg(r.c, r.pa, 'Fruta 1'), 'a da aba Painel continua');
});

test('sem o arquivo original: cria a parte, o desenho, a lista da aba e a do livro; as que vieram do Excel vão junto, sem nome órfão', async () => {
  const { c, co } = await abrir();
  const n = aplicarMud(c, S.novasSegs(c, co, 'tabcoletas', ['Fruta']));
  const { g, z, txt } = await salvar(n, null);
  const sx = await txt('xl/worksheets/sheet1.xml');
  assert.match(sx, /<drawing r:id="rIdSg\d+"\/>/); assert.match(sx, /<x14:slicerList xmlns:x14="[^"]+"><x14:slicer r:id="rIdSg\d+"\/><\/x14:slicerList>/);
  assert.ok(sx.indexOf('<drawing') < sx.indexOf('<tableParts'), 'o desenho vem antes das tabelas, como o Excel exige');
  assert.ok(z.nomes.includes('xl/slicers/slicerApp1.xml') && z.nomes.includes('xl/drawings/drawing1.xml'));
  const dr = await txt('xl/drawings/drawing1.xml');
  assert.match(dr, /<xdr:twoCellAnchor [^>]*editAs="oneCell"><xdr:from><xdr:col>4<\/xdr:col><xdr:colOff>0<\/xdr:colOff><xdr:row>0<\/xdr:row>/); assert.match(dr, /<sle:slicer xmlns:sle="[^"]+" name="Fruta 2"\/>/);
  const r = await abrir(g.bytes);
  assert.deepEqual(r.c.abas[r.co].seg.map((s) => [s.nome, s.titulo, s.cn]), [['Fruta', 'Fruta', 'Fruta'], ['Talhão', 'Talhão', 'Talhão'], ['Fruta 2', 'Fruta', 'Fruta']]);
  assert.equal(seg(r.c, r.pa, 'Fruta 1').titulo, 'Fruta da colheita');
  const wb = await txt('xl/workbook.xml'), caches = await Promise.all(z.nomes.filter((x) => /^xl\/slicerCaches\/[^/]+\.xml$/.test(x)).map(txt));
  const nomesC = caches.map((x) => /name="([^"]+)"/.exec(x)[1]).sort();
  assert.deepEqual(nomesC, ['SegmentaçãodeDados_Fruta', 'SegmentaçãodeDados_Talhão'], 'Fruta, Fruta 1 e Fruta 2 dividem a memória da coluna');
  assert.deepEqual([...wb.matchAll(/<definedName name="([^"]+)">#N\/A/g)].map((m) => m[1]).sort(), nomesC, 'cada nome #N/A tem a sua memória');
});

test('duas segmentações da mesma coluna dividem a memória; uma em outra aba aponta para a tabela da Coletas', async () => {
  const { c, co, pa } = await abrir();
  let n = aplicarMud(c, S.novasSegs(c, co, 'tabcoletas', ['Kg']));
  n = aplicarMud(n, S.novasSegs(n, pa, 'tabcoletas', ['Kg']));
  const nomes = [...n.abas[co].seg, ...n.abas[pa].seg].filter((s) => s.novo).map((s) => s.nome);
  const { g, z, txt } = await salvar(n, null);
  const caches = await Promise.all(z.nomes.filter((x) => /^xl\/slicerCaches\/[^/]+\.xml$/.test(x)).map(txt));
  assert.equal(caches.filter((x) => /sourceName="Kg"/.test(x)).length, 1, 'uma memória para a coluna Kg');
  const s2 = (await Promise.all(z.nomes.filter((x) => /^xl\/slicers\/[^/]+\.xml$/.test(x)).map(txt))).find((x) => x.includes(`name="${nomes[1]}"`));
  assert.match(s2, new RegExp(`<slicer name="${nomes[1]}" cache="SegmentaçãodeDados_Kg"`));
  const r = await abrir(g.bytes);
  assert.equal(seg(r.c, r.pa, nomes[1]).tab, 'tabcoletas');
});

test('o filtro feito pela segmentação nova volta junto e ela abre marcada', async () => {
  const { b, c, co } = await abrir();
  let n = aplicarMud(c, S.novasSegs(c, co, 'tabcoletas', ['Talhão']));
  n = tocar(n, seg(n, co, 'Talhão 1'), 'T1');
  const { g } = await salvar(n, b);
  const r = await abrir(g.bytes);
  const e = S.estadoDaSeg(r.c, new Motor(r.c), seg(r.c, r.co, 'Talhão 1'));
  assert.deepEqual(e.itens.filter((i) => i.marcado).map((i) => i.t), ['T1']); assert.equal(e.filtrada, true);
});

test('título com sinais (& < " e quebra de linha) vai escapado e volta igual', async () => {
  const { c, co } = await abrir();
  let n = aplicarMud(c, S.novasSegs(c, co, 'tabcoletas', ['Kg']));
  n = aplicarMud(n, S.comSeg(n, co, 'Kg', { titulo: 'Kg & "peso" <bruto>' }));
  const { g, txt } = await salvar(n, null);
  assert.match(await txt('xl/slicers/slicerApp1.xml'), /caption="Kg &amp; &quot;peso&quot; &lt;bruto&gt;"/);
  const r = await abrir(g.bytes);
  assert.equal(seg(r.c, r.co, 'Kg').titulo, 'Kg & "peso" <bruto>');
});

test('tabela que vai como faixa normal: a segmentação não vai e o aviso diz por quê', async () => {
  const { c, co } = await abrir();
  let n = aplicarMud(c, S.novasSegs(c, co, 'tabcoletas', ['Kg']));
  n = JSON.parse(JSON.stringify(n)); n.tabelas.tabcoletas.nome = 'A1'; /* nome que o Excel não aceita: a tabela vai como faixa */
  const { g, z } = await salvar(n, null);
  assert.ok(!z.nomes.some((x) => /^xl\/slicer/.test(x)), 'nenhuma parte de segmentação');
  assert.ok(g.avisos.some((a) => /4 segmentações não foram para o arquivo do Excel porque a tabela delas vai como faixa normal/.test(a)), g.avisos.join(' | '));
});

test('nome da memória: válido no Excel e sem repetir', async () => {
  const { nomeDaMemoria } = await import('../../src/planilha/xlsx/segNovasXlsx.js');
  const u = new Set(['segmentaçãodedados_kg']);
  assert.equal(nomeDaMemoria('Kg', u), 'SegmentaçãodeDados_Kg1');
  assert.equal(nomeDaMemoria('Peso (kg) total', u), 'SegmentaçãodeDados_Peso_kg_total');
  assert.equal(nomeDaMemoria('%', u), 'SegmentaçãodeDados_Coluna');
});

/* ---------- achados do revisor novo (v0.6.44): partes montadas à mão, direto no gravador ---------- */
const { gravarSegsNovas } = await import('../../src/planilha/xlsx/segNovasXlsx.js');
const CAB = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const pacote = ({ aba, wb = '<definedNames/><calcPr calcId="191029"/>', tabela = '<autoFilter ref="A1:B3"/>', relsAba = '', desenho = null } = {}) => [
  { nome: '[Content_Types].xml', dados: `${CAB}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>` },
  { nome: 'xl/workbook.xml', dados: `${CAB}<workbook xmlns="x" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView><extLst><ext uri="{v}"/></extLst></workbookView></bookViews><sheets><sheet name="A" sheetId="1" r:id="rId1"/></sheets>${wb}</workbook>` },
  { nome: 'xl/worksheets/sheet1.xml', dados: aba || `${CAB}<worksheet xmlns="x" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData/><conditionalFormatting sqref="B2:B3"><cfRule type="dataBar" priority="1"><dataBar><cfvo type="min"/><cfvo type="max"/><color rgb="FF638EC6"/></dataBar><extLst><ext uri="{B025F937-C7B1-47D3-B67F-A62EFF666E3E}" xmlns:x14="y"><x14:id>{1}</x14:id></ext></extLst></cfRule></conditionalFormatting><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/><tableParts count="1"><tablePart r:id="rIdT1"/></tableParts><extLst><ext uri="{78C0D931-6437-407d-A8EE-F0AAD7539E65}" xmlns:x14="y"><x14:conditionalFormattings/></ext></extLst></worksheet>` },
  { nome: 'xl/worksheets/_rels/sheet1.xml.rels', dados: `${CAB}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdT1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/>${relsAba}</Relationships>` },
  { nome: 'xl/tables/table1.xml', dados: `${CAB}<table xmlns="x" id="1" name="Tab" displayName="Tab" ref="A1:B3">${tabela}<tableColumns count="2"><tableColumn id="1" name="Nome"/><tableColumn id="2" name="Valor"/></tableColumns></table>` },
  ...(desenho ? [{ nome: 'xl/drawings/drawing1.xml', dados: desenho }] : []),
];
const segA = { nome: 'Nome', titulo: 'Nome', tab: 'tab', cn: 'Nome', cols: 1, alt: 25, l: 5, c: 3, dx: 0, dy: 0, w: 180, h: 200, novo: 1 };
const umaAba = { nome: 'A', larg: {}, alt: {}, seg: [segA] };
const TABS = { tab: { nome: 'Tab', cab: 1 } };
const dados = (arqs, n) => String(arqs.find((a) => a.nome === n).dados);

test('revisor B1 e B2: com barra de dados na aba, a lista e o desenho vão no extLst e no lugar da raiz, nunca dentro da regra', () => {
  const arqs = pacote(); gravarSegsNovas(arqs, [umaAba], TABS);
  const sx = dados(arqs, 'xl/worksheets/sheet1.xml'), regra = /<cfRule[\s\S]*?<\/cfRule>/.exec(sx)[0];
  assert.doesNotMatch(regra, /slicerList|<drawing/, 'nada entrou na regra da barra de dados');
  assert.match(sx, /<pageMargins[^>]*\/><drawing r:id="rIdSg\d+"\/><tableParts/);
  assert.match(sx, /<x14:conditionalFormattings\/><\/ext><ext uri="\{3A4CF648-6AED-40f4-86FF-DC5316D8AED3\}"[^>]*><x14:slicerList[^>]*><x14:slicer r:id="rIdSg\d+"\/><\/x14:slicerList><\/ext><\/extLst><\/worksheet>$/);
  const wb = dados(arqs, 'xl/workbook.xml');
  assert.match(wb, /<workbookView><extLst><ext uri="\{v\}"\/><\/extLst><\/workbookView>/, 'o extLst da janela do livro ficou como estava');
  assert.match(wb, /<\/calcPr>|<calcPr calcId="191029"\/><extLst><ext uri="\{46BE6895/);
});

test('revisor B3: <definedNames/> vazio não vira dois', () => {
  const arqs = pacote(); gravarSegsNovas(arqs, [umaAba], TABS);
  const wb = dados(arqs, 'xl/workbook.xml');
  assert.equal((wb.match(/<definedNames\b/g) || []).length, 1);
  assert.match(wb, /<\/sheets><definedNames><definedName name="SegmentaçãodeDados_Nome">#N\/A<\/definedName><\/definedNames><calcPr/);
});

test('revisor I3: tabela sem os botões de filtro (sem autoFilter) não leva a segmentação e avisa', () => {
  const arqs = pacote({ tabela: '' }); const r = gravarSegsNovas(arqs, [umaAba], TABS);
  assert.deepEqual([r.gravadas, r.semSetas], [0, ['Nome']]);
  assert.ok(!arqs.some((a) => /^xl\/slicer/.test(a.nome)));
});

test('revisor I1: a parte de segmentações de tabela dinâmica (fora da lista das de tabela) não recebe a de tabela', () => {
  const relsAba = '<Relationship Id="rIdP" Type="http://schemas.microsoft.com/office/2007/relationships/slicer" Target="../slicers/slicer9.xml"/>';
  const arqs = pacote({ relsAba }); arqs.push({ nome: 'xl/slicers/slicer9.xml', dados: `${CAB}<slicers xmlns="x14"><slicer name="Dinamica" cache="C"/></slicers>` });
  gravarSegsNovas(arqs, [umaAba], TABS);
  assert.doesNotMatch(dados(arqs, 'xl/slicers/slicer9.xml'), /name="Nome"/);
  assert.match(dados(arqs, 'xl/slicers/slicerApp1.xml'), /<slicer name="Nome"/);
});

test('revisor I2: desenho que já existe sem o prefixo xdr (ou fechado em si) continua XML válido', () => {
  for (const desenho of [`${CAB}<wsDr xmlns="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"><oneCellAnchor><from/><ext/><pic><nvPicPr><cNvPr id="7" name="F"/></nvPicPr></pic><clientData/></oneCellAnchor></wsDr>`, `${CAB}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"/>`]) {
    const arqs = pacote({ desenho, relsAba: '<Relationship Id="rIdD" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>' });
    arqs[2].dados = arqs[2].dados.replace('<tableParts', '<drawing r:id="rIdD"/><tableParts');
    gravarSegsNovas(arqs, [umaAba], TABS);
    const d = dados(arqs, 'xl/drawings/drawing1.xml');
    assert.match(d, /<xdr:twoCellAnchor xmlns:xdr="[^"]+" xmlns:a="[^"]+" editAs="oneCell">/);
    assert.match(d, /<\/(?:xdr:)?wsDr>$/); assert.ok(d.includes('cNvPr id="8"') || d.includes('cNvPr id="2"'), 'número de objeto novo');
    assert.equal((dados(arqs, 'xl/worksheets/sheet1.xml').match(/<drawing\b/g) || []).length, 1, 'um desenho só na aba');
  }
});

test('revisor (2a leitura): aba copiada não leva as segmentações; aba que não voltou do original leva as dela; nome repetido não vai', async () => {
  const { estrutura, duplicarAba } = await import('../../src/planilha/operacoes.js'); void estrutura;
  const { b, c, co } = await abrir();
  const d = duplicarAba(c, co); const n = aplicarMud(c, d.mud);
  assert.equal(n.abas[d.id].seg, undefined, 'a cópia não leva as segmentações');
  /* aba sem o original (como uma aba nova) com uma segmentação vinda do Excel: vai pelo gravador novo */
  const m = JSON.parse(JSON.stringify(n)); m.abas[d.id].seg = [{ ...m.abas[co].seg[0], nome: 'Fruta (cópia)' }];
  const { g, z, txt } = await salvar(m, b);
  const partesSeg = await Promise.all(z.nomes.filter((x) => /^xl\/slicers\/[^/]+\.xml$/.test(x)).map(txt));
  assert.ok(partesSeg.some((x) => x.includes('name="Fruta (cópia)"')), 'a da aba que não voltou do original foi');
  const r = await abrir(g.bytes); assert.ok(r.c.abas[r.c.ordem[1]].seg.some((s) => s.nome === 'Fruta (cópia)'));
  /* nome repetido: não vai e aparece no aviso */
  m.abas[d.id].seg = [{ ...m.abas[co].seg[0] }];
  const g2 = await gravarXlsx(m, new Motor(m), { original: b });
  assert.ok(g2.avisos.some((a) => /A segmentação "Fruta" não foi para o arquivo do Excel porque já existe outra com o mesmo nome/.test(a)), g2.avisos.join(' | '));
});
