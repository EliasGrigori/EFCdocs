/* v0.6.49 (D-79): aba "muito oculta" (veryHidden) do Excel volta muito oculta ao salvar; a oculta comum continua oculta.
   Amostra inventada: testes/amostras/amostra-varredura.xlsx (abas Ficha, Grande, Oculta = hidden, Escondida = veryHidden). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { Motor } from '../../src/planilha/motor.js';

const bytes = new Uint8Array(readFileSync(new URL('../amostras/amostra-varredura.xlsx', import.meta.url)));
const abaPorNome = (c, n) => c.abas[c.ordem.find((x) => c.abas[x].nome === n)];
const pastaDeTrabalho = async (c, opcoes) => {
  const g = await gravarXlsx(c, new Motor(c), opcoes);
  const z = lerZip(g.bytes);
  return new TextDecoder().decode(await z.bytes('xl/workbook.xml'));
};
const estado = (wb, nome) => { const m = new RegExp(`<sheet name="${nome}"[^>]*>`).exec(wb); return m ? (/state="(\w+)"/.exec(m[0]) || [, 'visible'])[1] : null; };

test('D-79: ao abrir, a muito oculta fica marcada como muito oculta; a oculta comum, como oculta', async () => {
  const c = (await lerXlsx(bytes)).conteudo;
  assert.equal(abaPorNome(c, 'Escondida').oculta, 'muito');
  assert.equal(abaPorNome(c, 'Oculta').oculta, true);
  assert.ok(!abaPorNome(c, 'Ficha').oculta);
});

test('D-79: salvando por cima do arquivo do Excel, a muito oculta volta veryHidden e a oculta volta hidden', async () => {
  const c = (await lerXlsx(bytes)).conteudo;
  const wb = await pastaDeTrabalho(c, { original: bytes });
  assert.equal(estado(wb, 'Escondida'), 'veryHidden');
  assert.equal(estado(wb, 'Oculta'), 'hidden');
  assert.equal(estado(wb, 'Ficha'), 'visible');
});

test('D-79: salvando como arquivo novo, também', async () => {
  const c = (await lerXlsx(bytes)).conteudo;
  const wb = await pastaDeTrabalho(c, {});
  assert.equal(estado(wb, 'Escondida'), 'veryHidden');
  assert.equal(estado(wb, 'Oculta'), 'hidden');
});
