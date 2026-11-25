/* Vértice Docs — v0.6.45 (D-70): esconder colunas e linhas até o fim não pode travar o app.
   Mede setas e digitação antes e depois de esconder (J até XFD e 130 até 1.048.576), salva como Excel e abre de novo.
   Uso: node scripts/testar-ocultas-d70.mjs <endereço>. Amostra inventada (testes/amostras/amostra-varredura.xlsx). */
import { chromium } from 'playwright';
import { readFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerZip } from '../src/planilha/xlsx/zip.js';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-varredura.xlsx', import.meta.url));
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
const quadro = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const abrir = async (arq) => {
  await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', arq); await p.waitForSelector('[data-excel-abrir]', { timeout: 60000 });
  await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv', { timeout: 60000 }); await p.waitForTimeout(1200);
};
const setas = async () => { await ir('B15'); await quadro(); const t0 = Date.now(); for (let i = 0; i < 20; i++) await p.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight'); await quadro(); return Date.now() - t0; };
const digitar = async () => { await ir('C16'); const t0 = Date.now(); for (let i = 0; i < 5; i++) { await p.keyboard.type('7'); await p.keyboard.press('Enter'); } await quadro(); return Date.now() - t0; };

await abrir(AMOSTRA);
const base = { setas: await setas(), digitar: await digitar() };
let depois = null, tOcultar = 0;
await caso('esconder J até XFD e 130 até 1.048.576 leva menos de 1,5 s', async () => {
  await ir('J1:XFD1'); let t0 = Date.now(); await p.keyboard.press('Control+0'); await quadro(); tOcultar = Date.now() - t0;
  await ir('A130:A1048576'); t0 = Date.now(); await p.keyboard.press('Control+9'); await quadro(); tOcultar += Date.now() - t0;
  certo(tOcultar < 1500, `esconder levou ${tOcultar} ms`);
});
await caso('depois de esconder, setas e digitação continuam rápidas (até 3 vezes o tempo de antes, como na regra de rapidez)', async () => {
  depois = { setas: await setas(), digitar: await digitar() };
  console.log(`       antes: 20 setas ${base.setas} ms, 5 digitações ${base.digitar} ms · depois: ${depois.setas} ms, ${depois.digitar} ms · esconder ${tOcultar} ms`);
  certo(depois.setas < Math.max(600, base.setas * 3), `setas: ${depois.setas} ms (antes ${base.setas})`);
  certo(depois.digitar < Math.max(900, base.digitar * 3), `digitar: ${depois.digitar} ms (antes ${base.digitar})`);
});
await caso('na última linha e na última coluna visíveis, a seta para baixo e para a direita não sai do lugar (antes: o cursor ia para uma escondida e sumia)', async () => {
  await ir('B129'); await p.keyboard.press('ArrowDown'); await quadro(); const a1 = await p.locator('.pl-nome').inputValue();
  await ir('I5'); await p.keyboard.press('ArrowRight'); await quadro(); const a2 = await p.locator('.pl-nome').inputValue();
  await ir('B127'); for (let i = 0; i < 4; i++) await p.keyboard.press('Shift+ArrowDown'); await quadro(); const a3 = await p.locator('.pl-nome').inputValue();
  await ir('B20'); for (let i = 0; i < 8; i++) await p.keyboard.press('PageDown'); await quadro(); const a4 = await p.locator('.pl-nome').inputValue();
  certo(a1 === 'B129' && a2 === 'I5', `seta para baixo: ${a1}; seta para a direita na coluna I: ${a2}`);
  certo(/^B127(:B129)?$/.test(a3) || a3 === 'B127:B129', `Shift+seta para baixo da B127 até depois do fim devia ficar em B127:B129: ${a3}`);
  certo(a4 === 'B129', `PageDown até o fim devia parar na B129: ${a4}`);
});
const SAIDA = '/tmp/efc-d70-salvo.xlsx';
await caso('salvar como Excel: zeroHeight, poucas linhas listadas, colunas numa faixa; e abrir de novo mantém tudo escondido', async () => {
  await p.click('.tab:has-text("Arquivo")'); await p.waitForTimeout(150);
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.locator('[data-cmd="arquivo.exportarExcel"]').first().click()]);
  copyFileSync(await dl.path(), SAIDA); await p.keyboard.press('Escape');
  const z = lerZip(new Uint8Array(readFileSync(SAIDA))); const sx = new TextDecoder().decode(await z.bytes('xl/worksheets/sheet1.xml'));
  certo(/zeroHeight="1"/.test(sx) && (sx.match(/<row\b/g) || []).length < 200 && /<col min="10" max="16384"[^>]*hidden="1"/.test(sx), `linhas listadas ${(sx.match(/<row\b/g) || []).length}, tamanho ${sx.length}`);
  await abrir(SAIDA);
  const r = await setas(); certo(r < Math.max(600, base.setas * 3), `setas no arquivo reaberto: ${r} ms`);
  await ir('J1'); const nome = await p.locator('.pl-nome').inputValue(); void nome;
});
await caso('reexibir as linhas de baixo (comando Reexibir linhas) e desfazer: cada um abaixo de 1,5 s', async () => {
  await ir('A100:A1048576'); await p.waitForTimeout(100);
  let t0 = Date.now(); await p.keyboard.press('Alt+q'); await p.keyboard.type('Reexibir linhas'); await p.waitForTimeout(250); await p.keyboard.press('Enter'); await quadro(); const r1 = Date.now() - t0;
  await ir('A100'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); const onde = await p.locator('.pl-nome').inputValue();
  certo(onde === 'A102', 'depois de reexibir, a seta devia ir para a A102 (linhas visíveis de novo): ' + onde);
  t0 = Date.now(); await p.keyboard.press('Control+z'); await quadro(); const r2 = Date.now() - t0;
  console.log(`       reexibir linhas ${r1} ms · desfazer ${r2} ms`);
  certo(r1 < 1500 && r2 < 1500, `reexibir ${r1} ms, desfazer ${r2} ms`);
});
await caso('console sem erro', async () => { certo(!erros.length, erros.slice(0, 2).join(' | ')); });
await nav.close();
console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
