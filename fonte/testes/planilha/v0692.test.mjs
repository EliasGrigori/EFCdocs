/* Testes da v0.6.9.2 (relatório do Grok sobre a v0.6.9.1): bordas e cores de células vazias longe dos dados,
   largura da coluna oculta e contagem de toda fórmula com #REF!. Amostra inventada. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';

const amostra = (n) => new Uint8Array(readFileSync(new URL(`../amostras/${n}`, import.meta.url)));
const idDe = (c, nome) => c.ordem.find((id) => c.abas[id].nome === nome);
const texto = async (bytes) => { const z = lerZip(bytes); const o = {}; for (const n of z.nomes) o[n] = await z.texto(n); return o; };

test('v0.6.9.2 D-08: célula vazia só com borda ou cor de fundo, longe do último dado, é mantida ao abrir', async () => {
  const c = (await lerXlsx(amostra('amostra-v0692.xlsx'))).conteudo;
  const a = c.abas[idDe(c, 'BORDAS')];
  assert.ok(a.cel.CV1 && a.cel.CV1.s, 'CV1 (bem à direita, com borda) ficou');
  assert.ok(a.cel.DF5 && a.cel.DF5.s, 'DF5 ficou');
  assert.ok(a.cel.DA7 && c.estilos[a.cel.DA7.s].fundo, 'DA7 (só cor de fundo) ficou');
  assert.ok(a.cel.C2 && a.cel.E4, 'as vazias com borda perto dos dados continuam');
});

test('v0.6.9.2 D-08: volta no Excel com as bordas e as cores das células vazias', async () => {
  const c = (await lerXlsx(amostra('amostra-v0692.xlsx'))).conteudo;
  const c2 = (await lerXlsx((await gravarXlsx(c)).bytes)).conteudo;
  const a = c2.abas[idDe(c2, 'BORDAS')];
  for (const k of ['CV1', 'DF5', 'C2', 'E4']) assert.ok(a.cel[k] && c2.estilos[a.cel[k].s].bd, `${k} com borda`);
  assert.ok(c2.estilos[a.cel.DB8.s].fundo, 'DB8 com cor de fundo');
});

test('v0.6.9.2 D-08: formatação sem borda nem cor continua sendo descartada longe dos dados', async () => {
  const c = (await lerXlsx(amostra('amostra-v0692.xlsx'))).conteudo;
  const a = c.abas[idDe(c, 'BORDAS')];
  assert.equal(a.cel.CU1, undefined);
  assert.equal(a.cel.DG1, undefined);
});

test('v0.6.9.2 D-09: coluna oculta guarda a largura e ela vai igual para o Excel', async () => {
  const c = (await lerXlsx(amostra('amostra-v0692.xlsx'))).conteudo;
  const a = c.abas[idDe(c, 'BORDAS')];
  assert.equal(a.ocC[6], 1);
  assert.ok(a.larg[6] > 100, 'largura guardada (16 caracteres = 117 px), veio ' + a.larg[6]);
  const arq = await texto((await gravarXlsx(c)).bytes);
  const folha = arq['xl/worksheets/sheet1.xml'];
  const m = /<col min="7" max="7" width="([\d.]+)" customWidth="1" hidden="1"\/>/.exec(folha);
  assert.ok(m, 'coluna G oculta gravada: ' + (folha.match(/<col [^>]*>/g) || []).join(' '));
  assert.ok(Math.abs(+m[1] - 16) < 0.8, 'largura 16 mantida, veio ' + m[1]);
});

test('v0.6.9.2 D-09: o tamanho de uma coluna oculta não muda a largura que aparece (continua 0)', async () => {
  const { largCol } = await import('../../src/planilha/modelo.js');
  const c = (await lerXlsx(amostra('amostra-v0692.xlsx'))).conteudo;
  assert.equal(largCol(c.abas[idDe(c, 'BORDAS')], 6), 0);
});

test('v0.6.9.2 L-03: toda fórmula com #REF! é contada (SOMA(#REF!), #REF!+1...), e não vira falta de cálculo', async () => {
  const { relatorio } = await lerXlsx(amostra('amostra-v0692.xlsx'));
  assert.equal(relatorio.comRef, 3);
  assert.equal(relatorio.semCalculo, 0);
  assert.match(relatorio.exemploRef, /#REF!/);
});
