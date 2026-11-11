/* v0.6.10 (rede de segurança): o comparador da ida e volta tem de PEGAR diferença de verdade e não acusar o que é igual.
   Rápido e sem conferente de fora: roda no npm test. A ida e volta completa, com openpyxl e LibreOffice, é o npm run test:fidelidade. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { compararConteudos, resumir } from './comparar.mjs';
import { conhecida, CONHECIDAS, CONHECIDAS_FORA } from './conhecidas.mjs';

const ler = async (n) => (await lerXlsx(new Uint8Array(readFileSync(new URL(`../amostras/${n}`, import.meta.url))))).conteudo;
const copia = (x) => structuredClone(x);
const primeira = (c) => c.abas[c.ordem[0]];

test('fidelidade: o mesmo conteúdo dá zero diferenças', async () => {
  const c = await ler('amostra-v069.xlsx');
  assert.equal(compararConteudos(c, copia(c)).length, 0);
});

test('fidelidade: pega valor, fórmula, estilo, célula sumida e mescla trocada', async () => {
  const c = await ler('amostra-v069.xlsx'); const d = copia(c); const a = primeira(d);
  const refs = Object.keys(a.cel).filter((k) => a.cel[k].v != null && a.cel[k].f == null);
  a.cel[refs[0]].v = 'mudou';
  delete a.cel[refs[1]];
  const comF = Object.keys(a.cel).find((k) => a.cel[k].f != null); if (comF) a.cel[comF].f = 'SUM(1,2)';
  const outroEstilo = d.estilos.findIndex((e, i) => i !== (a.cel[refs[2]].s ?? -1) && e && Object.keys(e).length);
  a.cel[refs[2]].s = outroEstilo;
  a.mes = [...(a.mes || []), 'Z90:Z91'];
  const campos = new Set(compararConteudos(c, d, { limite: 1e6 }).map((x) => x.campo));
  for (const k of ['v', 'célula sumiu', 'estilo', 'mes']) assert.ok(campos.has(k), `pegou ${k}: ${[...campos]}`);
  if (comF) assert.ok(campos.has('f'), 'pegou a fórmula');
});

test('fidelidade: ida e volta de uma amostra simples sem diferença, e o resumo agrupa por aba e campo', async () => {
  const c = await ler('amostra-congelada.xlsx');
  const b = (await lerXlsx((await gravarXlsx(c)).bytes)).conteudo;
  assert.equal(compararConteudos(c, b).length, 0);
  const d = copia(b); for (const k of Object.keys(primeira(d).cel).slice(0, 3)) primeira(d).cel[k].v = 'x';
  const r = resumir(compararConteudos(b, d));
  assert.equal(r.length, 1); assert.equal(r[0].quantas, 3); assert.match(r[0].grupo, / · v$/);
});

test('fidelidade: toda diferença conhecida tem número de defeito ou limite e motivo', () => {
  for (const k of [...Object.values(CONHECIDAS).flat(), ...CONHECIDAS_FORA]) {
    assert.match(k.id, /^[DLA]-\d{2}$/, k.id); assert.ok(k.motivo.length > 10); assert.ok(['idaVolta', 'openpyxl', 'libreoffice'].includes(k.fonte));
  }
  assert.equal(conhecida('amostra-v068.xlsx', 'idaVolta', 'AUX VEL · v', false)?.id, 'A-01');
  assert.equal(conhecida('amostra-v068.xlsx', 'idaVolta', 'AUX VEL · f', false), null, 'só o grupo anotado');
  assert.equal(conhecida('x.xlsx', 'openpyxl', 'coluna oculta voltou a aparecer', false), null, 'as de fora só valem com --fora');
});
