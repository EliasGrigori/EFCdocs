/* v0.6.39 · T0: o que a tabela do Excel tem a mais volta ao salvar (totais por coluna, coluna calculada, ordenação guardada).
   Amostra inventada: testes/amostras/amostra-v0639.xlsx (gerar-amostra-v0639.py). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { Motor } from '../../src/planilha/motor.js';
import { totalDaColuna, aplicarMud } from '../../src/planilha/tabelaViva.js';
import { estrutura } from '../../src/planilha/operacoes.js';

const AMOSTRA = new URL('../amostras/amostra-v0639.xlsx', import.meta.url);
const abrir = async () => { const b = new Uint8Array(readFileSync(AMOSTRA)); const r = await lerXlsx(b); return { b, c: r.conteudo || r }; };
const tabelaXml = async (c, original) => { const g = (await gravarXlsx(c, new Motor(c), { original })).bytes; const z = lerZip(g); return { xml: new TextDecoder().decode(await z.bytes(z.nomes.find((n) => /^xl\/tables\//.test(n)))), bytes: g }; };

test('ao abrir, a tabela guarda a coluna calculada e a ordenação do Excel', async () => {
  const { c } = await abrir();
  const t = c.tabelas.colheita;
  assert.deepEqual(t.fxc, { Caixas: 'Colheita[[#This Row],[Kg]]/20' });
  assert.match(t.ord, /^<sortState ref="A2:D5">/); assert.equal(t.ordRef, 'A1:D6');
});

test('ao salvar voltam: rótulo e função dos totais, coluna calculada e ordenação (antes saíam sem nada disso)', async () => {
  const { b, c } = await abrir();
  const { xml } = await tabelaXml(c, b);
  assert.match(xml, /<tableColumn id="1" name="Talhão" totalsRowLabel="Total"\/>/);
  assert.match(xml, /<tableColumn id="3" name="Kg" totalsRowFunction="sum"\/>/);
  assert.match(xml, /<tableColumn id="4" name="Caixas" totalsRowFunction="average"><calculatedColumnFormula>Colheita\[\[#This Row\],\[Kg\]\]\/20<\/calculatedColumnFormula><\/tableColumn>/);
  assert.match(xml, /<autoFilter ref="A1:D5"><sortState ref="A2:D5"><sortCondition descending="1" ref="C2:C5"\/><\/sortState><\/autoFilter>/);
});

test('trocar o total da coluna no app troca a função no Excel', async () => {
  const { c } = await abrir();
  const r = totalDaColuna(c, 'a1', 'colheita', 2, 'max');
  const { xml } = await tabelaXml(aplicarMud(c, r.mud));
  assert.match(xml, /name="Kg" totalsRowFunction="max"/);
});

test('coluna calculada: com uma exceção continua calculada (o Excel aceita); sem nenhuma fórmula, deixa de ser', async () => {
  const { c } = await abrir();
  const c2 = aplicarMud(c, { 'conteudo.abas.a1.cel.D3': { v: 9 } });
  assert.match((await tabelaXml(c2)).xml, /calculatedColumnFormula/);
  const c3 = aplicarMud(c, { 'conteudo.abas.a1.cel.D2': { v: 1 }, 'conteudo.abas.a1.cel.D3': { v: 2 }, 'conteudo.abas.a1.cel.D4': { v: 3 }, 'conteudo.abas.a1.cel.D5': { v: 4 } });
  assert.doesNotMatch((await tabelaXml(c3)).xml, /calculatedColumnFormula/);
});

test('tabela que mudou de lugar não leva a ordenação antiga', async () => {
  const { c } = await abrir();
  const c2 = aplicarMud(c, estrutura(c, 'a1', 'l', 0, 1));
  const { xml } = await tabelaXml(c2);
  assert.match(xml, /ref="A2:D7"/); assert.doesNotMatch(xml, /sortState/);
});

const temOpenpyxl = spawnSync('python3', ['-c', 'import openpyxl'], { stdio: 'ignore' }).status === 0;
test('o openpyxl lê de volta os totais, a coluna calculada e a ordenação', { skip: !temOpenpyxl && 'sem openpyxl' }, async () => {
  const { b, c } = await abrir();
  const { bytes } = await tabelaXml(c, b);
  const arq = join(mkdtempSync(join(tmpdir(), 't0-')), 't0.xlsx'); writeFileSync(arq, bytes);
  const py = `import openpyxl,json\nws=openpyxl.load_workbook(${JSON.stringify(arq)}).active\nt=ws.tables['Colheita']\nprint(json.dumps({'cols':[[x.name,x.totalsRowFunction,x.totalsRowLabel,(x.calculatedColumnFormula.attr_text if x.calculatedColumnFormula else None)] for x in t.tableColumns],'ord':t.autoFilter.sortState.ref,'desc':t.autoFilter.sortState.sortCondition[0].descending}))`;
  const o = JSON.parse(spawnSync('python3', ['-c', py], { encoding: 'utf8' }).stdout);
  assert.deepEqual(o.cols, [['Talhão', null, 'Total', null], ['Fruta', null, null, null], ['Kg', 'sum', null, null], ['Caixas', 'average', null, 'Colheita[[#This Row],[Kg]]/20']]);
  assert.equal(o.ord, 'A2:D5'); assert.equal(o.desc, true);
});
