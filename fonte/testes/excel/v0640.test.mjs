/* v0.6.40 · T2: um filtro por tabela. Na mesma aba, cada tabela tem as setas dela e a aba pode ter um filtro comum fora das tabelas.
   Amostra inventada: testes/amostras/amostra-v0640.xlsx (gerar-amostra-v0640.py): Pomar (filtrada em Fruta = Mamão), Estoque (setas sem
   critério), Lotes (sem setas) e um filtro da aba em A20:B25 (Ponto = Poço). As linhas são contadas a partir de 0 (linha 3 do Excel = 2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { Motor } from '../../src/planilha/motor.js';
import * as TV from '../../src/planilha/tabelaViva.js';
import { estrutura } from '../../src/planilha/operacoes.js';
import { formatarComoTabela } from '../../src/planilha/inserir.js';
import { chave } from '../../src/planilha/ref.js';

const AMOSTRA = new URL('../amostras/amostra-v0640.xlsx', import.meta.url);
const abrir = async () => { const b = new Uint8Array(readFileSync(AMOSTRA)); const r = await lerXlsx(b); const c = r.conteudo || r; return { b, c, id: c.ordem[0] }; };
const ocultas = (c, id) => Object.keys(c.abas[id].ocL || {}).map(Number).sort((a, b) => a - b);
const partes = async (c, original) => {
  const z = lerZip((await gravarXlsx(c, new Motor(c), { original })).bytes), txt = async (n) => new TextDecoder().decode(await z.bytes(n));
  const tab = {};
  for (const n of z.nomes) if (/^xl\/tables\/.*\.xml$/.test(n)) { const x = await txt(n); tab[/displayName="([^"]+)"/.exec(x)[1]] = x; }
  return { tab, aba: await txt(z.nomes.find((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))) };
};

test('ao abrir: cada tabela traz o filtro dela; a tabela sem setas fica sem; o filtro da aba continua o da aba', async () => {
  const { c, id } = await abrir();
  assert.deepEqual(c.tabelas.pomar.fil, { cr: { 1: { v: ['Mamão'] } } });
  assert.deepEqual(c.tabelas.estoque.fil, { cr: {} });
  assert.equal(c.tabelas.lotes.fil, undefined); assert.equal(c.tabelas.lotes.sf, 1);
  assert.equal(c.abas[id].fil.fx, 'A20:B25');
  assert.deepEqual(ocultas(c, id), [2, 4, 21, 23, 24], 'as linhas escondidas pelos dois filtros continuam escondidas');
  assert.ok(TV.filtroLigado(c, id, c.tabelas.pomar) && TV.filtroLigado(c, id, c.tabelas.estoque) && !TV.filtroLigado(c, id, c.tabelas.lotes));
});

test('salvar sem mexer: o filtro de cada tabela e o da aba voltam; a tabela sem setas não ganha setas', async () => {
  const { b, c } = await abrir();
  const { tab, aba } = await partes(c, b);
  assert.match(tab.Pomar, /<autoFilter ref="A1:C6"><filterColumn colId="1"[^>]*><filters><filter val="Mamão"\/><\/filters><\/filterColumn><\/autoFilter>/);
  assert.match(tab.Estoque, /<autoFilter ref="A9:B12"\/>/);
  assert.doesNotMatch(tab.Lotes, /<autoFilter/, 'antes a Lotes saía com <autoFilter> e ganhava setas no Excel');
  assert.match(aba, /<autoFilter ref="A20:B25"><filterColumn colId="0"><filters><filter val="Poço"\/><\/filters><\/filterColumn><\/autoFilter>/);
});

test('Formatar como tabela com filtro não tira o filtro que a aba já tinha', async () => {
  const { c, id } = await abrir();
  const valorDe = (l, cc) => { const x = c.abas[id].cel[chave(l, cc)]; return x ? x.v : undefined; };
  c.abas[id].cel.D30 = { v: 'Nome' }; c.abas[id].cel.E30 = { v: 'Nota' }; c.abas[id].cel.D31 = { v: 'a' }; c.abas[id].cel.E31 = { v: 1 };
  const r = formatarComoTabela(c, id, { l1: 29, c1: 3, l2: 30, c2: 4 }, { nome: 'Notas', estilo: 'TableStyleMedium2', cabecalho: true, listras: true, filtro: true }, valorDe);
  const n = TV.aplicarMud(c, r.mud);
  assert.equal(n.abas[id].fil.fx, 'A20:B25', 'o filtro da aba ficou');
  assert.deepEqual(n.tabelas.notas.fil, { cr: {} }, 'a tabela nova tem as setas dela');
  assert.deepEqual(ocultas(n, id), [2, 4, 21, 23, 24]);
});

test('Design › Botão de filtro numa tabela não mexe no filtro da aba nem no das outras tabelas', async () => {
  const { c, id } = await abrir();
  const r = TV.alternarFiltro(c, id, 'lotes');
  assert.ok(!r.trocou, 'antes: "o filtro que estava na aba passou para esta tabela"');
  const n = TV.aplicarMud(c, r.mud);
  assert.deepEqual(n.tabelas.lotes.fil, { cr: {} }); assert.equal(n.tabelas.lotes.sf, undefined);
  assert.equal(n.abas[id].fil.fx, 'A20:B25');
  assert.deepEqual(n.tabelas.pomar.fil, c.tabelas.pomar.fil);
  assert.deepEqual(ocultas(n, id), [2, 4, 21, 23, 24]);
});

test('tirar as setas da tabela filtrada mostra as linhas que só ela escondia (antes elas continuavam escondidas)', async () => {
  const { b, c, id } = await abrir();
  const n = TV.aplicarMud(c, TV.alternarFiltro(c, id, 'pomar').mud);
  assert.equal(n.tabelas.pomar.fil, undefined); assert.equal(n.tabelas.pomar.sf, 1);
  assert.deepEqual(ocultas(n, id), [21, 23, 24], 'as do filtro da aba continuam escondidas');
  assert.deepEqual(Object.keys(n.abas[id].ocF).map(Number).sort((a, x) => a - x), [21, 23, 24]);
  const { tab } = await partes(n, b);
  assert.doesNotMatch(tab.Pomar, /<autoFilter/, 'salva sem setas');
});

test('converter em intervalo a tabela filtrada mostra as linhas que o filtro dela escondia', async () => {
  const { c, id } = await abrir();
  const n = TV.aplicarMud(c, TV.converterEmIntervalo(c, id, 'pomar').mud);
  assert.equal(n.tabelas.pomar, undefined);
  assert.deepEqual(ocultas(n, id), [21, 23, 24]);
});

test('inserir coluna dentro da tabela leva o critério do filtro junto', async () => {
  const { b, c, id } = await abrir();
  const n = TV.aplicarMud(c, estrutura(c, id, 'c', 1, 1));
  assert.equal(n.tabelas.pomar.c2, 3);
  assert.deepEqual(n.tabelas.pomar.fil.cr, { 2: { v: ['Mamão'] } }, 'a Fruta foi para a coluna C');
  await partes(n, b); // D-66: na v0.6.39 o Salvar como Excel dava erro aqui (t.cols vazio depois de inserir coluna)
  n.abas[id].cel.B1 = { v: 'Lote' }; // título da coluna nova (sem título a tabela não sai no arquivo; o Excel daria "Coluna1")
  const { tab } = await partes(n, b);
  assert.match(tab.Pomar, /<autoFilter ref="A1:D6"><filterColumn colId="2"/);
});

test('D-66: inserir coluna numa tabela e salvar como Excel não dá erro (na v0.6.39 dava "Cannot read properties of undefined")', async () => {
  const b = new Uint8Array(readFileSync(new URL('../amostras/amostra-v0639.xlsx', import.meta.url)));
  const c = (await lerXlsx(b)).conteudo, id = c.ordem[0];
  const n = TV.aplicarMud(c, estrutura(c, id, 'c', 2, 1));
  n.abas[id].cel.C1 = { v: 'Peso' };
  const { tab } = await partes(n, b);
  assert.match(tab.Colheita, /<tableColumn id="3" name="Peso"\/>/);
});
