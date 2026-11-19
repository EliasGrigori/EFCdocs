/* v0.6.40 · T2: as contas do filtro de cada tabela (filtrosTabela.js). Amostra inventada amostra-v0640.xlsx (ver testes/excel/v0640.test.mjs). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { Motor } from '../../src/planilha/motor.js';
import { aplicarMud } from '../../src/planilha/tabelaViva.js';
import { Lote } from '../../src/planilha/operacoes.js';
import * as FT from '../../src/planilha/filtrosTabela.js';
import { cicloDeOrdem, comCriterio, estadoDaOrdem } from '../../src/planilha/dados.js';
import { chave } from '../../src/planilha/ref.js';

const abrir = async () => { const b = new Uint8Array(readFileSync(new URL('../amostras/amostra-v0640.xlsx', import.meta.url))); const c = (await lerXlsx(b)).conteudo; return { b, c, id: c.ordem[0] }; };
const textoDe = (c, id) => (l, cc) => { const x = c.abas[id].cel[chave(l, cc)]; return x && x.v != null ? String(x.v) : ''; };
const ocultas = (c, id) => Object.keys(c.abas[id].ocL || {}).map(Number).sort((a, b) => a - b);

test('a aba tem três filtros: o dela e os das duas tabelas com setas; a célula diz qual vale', async () => {
  const { c, id } = await abrir();
  assert.deepEqual(FT.filtrosDaAba(c, id).map((x) => [x.k, x.fil.fx]), [[null, 'A20:B25'], ['pomar', 'A1:C6'], ['estoque', 'A9:B12']]);
  assert.equal(FT.alvoDoFiltro(c, id, 3, 1).k, 'pomar');
  assert.equal(FT.alvoDoFiltro(c, id, 15, 0).k, 'lotes'); assert.equal(FT.alvoDoFiltro(c, id, 15, 0).fil, null, 'Lotes sem setas');
  assert.equal(FT.alvoDoFiltro(c, id, 22, 0).k, null);
  assert.equal(FT.alvoDoFiltro(c, id, 40, 5).fil.fx, 'A20:B25', 'fora das tabelas vale o da aba');
});

test('filtrar uma tabela soma com os outros filtros: nenhuma linha escondida por outro filtro volta', async () => {
  const { c, id } = await abrir();
  const fil = comCriterio(FT.filDaTabela(c.tabelas.estoque), 0, ['Caixa'], ['Caixa', 'Sacola', 'Etiqueta']);
  const n = aplicarMud(c, FT.mudancasDosFiltros(c, id, 'estoque', fil, textoDe(c, id)));
  assert.deepEqual(n.tabelas.estoque.fil, { cr: { 0: { v: ['Caixa'] } } });
  assert.deepEqual(ocultas(n, id), [2, 4, 10, 11, 21, 23, 24]);
  assert.deepEqual(n.tabelas.pomar.fil, c.tabelas.pomar.fil); assert.equal(n.abas[id].fil.fx, 'A20:B25');
  /* mexer no filtro da aba depois não desfaz o da tabela */
  const n2 = aplicarMud(n, FT.mudancasDosFiltros(n, id, null, { ...n.abas[id].fil, cr: {} }, textoDe(n, id)));
  assert.deepEqual(ocultas(n2, id), [2, 4, 10, 11]);
  /* ao salvar, cada um no seu lugar */
  const z = lerZip((await gravarXlsx(n2, new Motor(n2))).bytes);
  const t = new TextDecoder().decode(await z.bytes(z.nomes.find((x) => /tables\/table2\.xml$/.test(x))));
  assert.match(t, /<autoFilter ref="A9:B12"><filterColumn colId="0"><filters><filter val="Caixa"\/><\/filters><\/filterColumn><\/autoFilter>/);
});

test('tirar o filtro da aba não mostra as linhas que a tabela esconde', async () => {
  const { c, id } = await abrir();
  const n = aplicarMud(c, FT.tirarFiltro(c, id, null));
  assert.equal(n.abas[id].fil, undefined);
  assert.deepEqual(ocultas(n, id), [2, 4]);
});

test('classificar pela seta da tabela: a ordem fica no filtro da tabela, o filtro da aba não muda', async () => {
  const { c, id } = await abrir();
  const valorDe = (l, cc) => { const x = c.abas[id].cel[chave(l, cc)]; return x ? x.v : undefined; };
  const fil = FT.filDaTabela(c.tabelas.estoque);
  const r = cicloDeOrdem(c, id, 1, { valorDe, fil, guardar: FT.guardarNaTabela(c, 'estoque') });
  assert.ok(r.lote instanceof Lote, r.erro);
  const n = aplicarMud(c, r.lote.mudancas());
  assert.deepEqual([9, 10, 11].map((l) => n.abas[id].cel[chave(l, 1)].v), [12, 30, 500]);
  assert.equal(estadoDaOrdem(FT.filDaTabela(n.tabelas.estoque), 1), 'asc');
  assert.equal(n.abas[id].fil.ord, undefined);
});

test('a tabela feita antes da v0.6.40 (filtro da aba sobre ela) continua usando aquele filtro', async () => {
  const { c, id } = await abrir();
  const { fil: _f, ...t } = c.tabelas.estoque; c.tabelas.estoque = t; // como era
  c.abas[id].fil = { fx: 'A9:B12', cr: {} };
  assert.deepEqual(FT.filtrosDaAba(c, id).map((x) => x.k), [null, 'pomar']);
  assert.equal(FT.alvoDoFiltro(c, id, 10, 0).k, null);
});

test('D-67: Design › Botão de filtro desligado mostra as linhas que o filtro escondia (na v0.6.39 elas ficavam escondidas sem filtro)', async () => {
  const { formatarComoTabela } = await import('../../src/planilha/inserir.js');
  const { alternarFiltro } = await import('../../src/planilha/tabelaViva.js');
  const c = { abas: { a1: { nome: 'A', cel: { A1: { v: 'Fruta' }, A2: { v: 'Mamão' }, A3: { v: 'Acerola' }, A4: { v: 'Mamão' } } } }, ordem: ['a1'], estilos: {} };
  const valorDe = (l, cc) => { const x = c.abas.a1.cel[chave(l, cc)]; return x ? x.v : undefined; };
  let n = aplicarMud(c, formatarComoTabela(c, 'a1', { l1: 0, c1: 0, l2: 3, c2: 0 }, { nome: 'Frutas', estilo: 'TableStyleMedium2', cabecalho: true, listras: true, filtro: true }, valorDe).mud);
  n = aplicarMud(n, FT.mudancasDosFiltros(n, 'a1', 'frutas', { cr: { 0: { v: ['Mamão'] } } }, (l, cc) => String(valorDe(l, cc) ?? '')));
  assert.deepEqual(ocultas(n, 'a1'), [2]);
  n = aplicarMud(n, alternarFiltro(n, 'a1', 'frutas').mud);
  assert.deepEqual(ocultas(n, 'a1'), []); assert.equal(n.abas.a1.ocF, undefined);
});

test('duas tabelas lado a lado (mesmas linhas): tirar o filtro de uma não mostra a linha que a outra esconde', async () => {
  const { alternarFiltro, converterEmIntervalo } = await import('../../src/planilha/tabelaViva.js');
  const cel = { A1: { v: 'Fruta' }, B1: { v: 'Kg' }, A2: { v: 'x' }, A3: { v: 'y' }, A4: { v: 'x' }, D1: { v: 'Ponto' }, E1: { v: 'pH' }, D2: { v: 'p' }, D3: { v: 'p' }, D4: { v: 'q' } };
  const c = { abas: { a1: { nome: 'A', cel } }, ordem: ['a1'], estilos: [], tabelas: {
    um: { nome: 'Um', aba: 'a1', l1: 0, c1: 0, l2: 3, c2: 1, cols: ['Fruta', 'Kg'], cab: 1, tot: 0, est: { nome: 'TableStyleMedium2' }, fil: { cr: {} } },
    dois: { nome: 'Dois', aba: 'a1', l1: 0, c1: 3, l2: 3, c2: 4, cols: ['Ponto', 'pH'], cab: 1, tot: 0, est: { nome: 'TableStyleMedium2' }, fil: { cr: {} } } } };
  const ler = { textoDe: (l, cc) => { const x = c.abas.a1.cel[chave(l, cc)]; return x ? String(x.v) : ''; } };
  let n = aplicarMud(c, FT.mudancasDosFiltros(c, 'a1', 'um', { cr: { 0: { v: ['x'] } } }, ler.textoDe));
  n = aplicarMud(n, FT.mudancasDosFiltros(n, 'a1', 'dois', { cr: { 3: { v: ['p'] } } }, ler.textoDe));
  assert.deepEqual(ocultas(n, 'a1'), [2, 3]);
  assert.deepEqual(ocultas(aplicarMud(n, alternarFiltro(n, 'a1', 'um', ler).mud), 'a1'), [3], 'a linha 4 do Excel (q) continua escondida pela Dois');
  assert.deepEqual(ocultas(aplicarMud(n, converterEmIntervalo(n, 'a1', 'dois', ler).mud), 'a1'), [2]);
});
