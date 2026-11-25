/* Vértice Docs — v0.6.44 (S3): a segmentação feita no app vai para o arquivo do Excel e volta ao abrir de novo.
   Uso: node scripts/testar-segmentacao-s3.mjs <endereço>. Amostra inventada (testes/amostras/amostra-v0641.xlsx). */
import { chromium } from 'playwright';
import { readFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerZip } from '../src/planilha/xlsx/zip.js';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0641.xlsx', import.meta.url));
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', acceptDownloads: true });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
const ir = async (ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(150); };
const abrir = async (arq) => {
  await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', arq); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
  await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(900);
};
const SAIDA = '/tmp/efc-s3-salvo.xlsx';
let textoTela = '', partes = [];

await abrir(AMOSTRA);
await caso('criar a segmentação Kg no app, filtrar em 98 e salvar como Excel: o arquivo leva a segmentação, sem aviso de que ficou de fora', async () => {
  await ir('C3'); await p.click('.tab:has-text("Inserir")'); await p.waitForTimeout(150);
  await p.locator('[data-cmd="inserir.segmentacao"]').first().click(); await p.waitForSelector('[data-segi-col="Kg"]');
  await p.check('[data-segi-col="Kg"]'); await p.click('[data-segi-ok]'); await p.waitForTimeout(400);
  await p.locator('[data-seg="Kg"] [data-seg-item="98"]').click(); await p.waitForTimeout(300);
  await p.click('.tab:has-text("Arquivo")'); await p.waitForTimeout(150);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-cmd="arquivo.exportarExcel"]').first().click()]);
  copyFileSync(await dl.path(), SAIDA); await p.waitForTimeout(500);
  textoTela = await p.locator('body').innerText();
  const z = lerZip(new Uint8Array(readFileSync(SAIDA))); partes = z.nomes;
  const s1 = new TextDecoder().decode(await z.bytes('xl/slicers/slicer1.xml'));
  certo(/<slicer name="Kg" cache="[^"]+" caption="Kg"/.test(s1), 'Kg não está na parte de segmentações');
  certo(!/feita no app|feitas no app/.test(textoTela), 'aviso de que ficou de fora: ' + (textoTela.match(/[^\n]*feita[s]? no app[^\n]*/) || [''])[0]);
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
});
await caso('abrir de novo o arquivo salvo: a segmentação Kg aparece com o 98 marcado e as outras continuam', async () => {
  await abrir(SAIDA);
  certo(await p.locator('[data-seg="Kg"]').count() === 1, 'Kg não voltou; partes: ' + partes.filter((n) => /slicer/.test(n)).join(','));
  certo((await p.locator('[data-seg="Kg"] [aria-pressed="true"]').allInnerTexts()).join() === '98', 'o 98 não voltou marcado');
  certo(await p.locator('[data-seg="Fruta"]').count() === 1 && await p.locator('[data-seg="Talhão"]').count() === 1, 'as do arquivo sumiram');
});
await caso('console sem erro', async () => { certo(!erros.length, erros.slice(0, 2).join(' | ')); });
await nav.close();
console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
