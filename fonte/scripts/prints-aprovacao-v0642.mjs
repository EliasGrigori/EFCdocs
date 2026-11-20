/* Prints da página de aprovação da v0.6.42 (S2). Uso: node scripts/prints-aprovacao-v0642.mjs <endereço> <pasta> <antes|depois>. Amostra inventada. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const [BASE, PASTA, LADO] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0641.xlsx', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const ctx = await nav.newContext({ viewport: { width: 1100, height: 760 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(1200);
const cv = await p.locator('.pl-cv').boundingBox();
const recorte = { x: cv.x, y: cv.y - 2, width: Math.min(780, cv.width), height: Math.min(420, cv.height) };
const b = await p.locator('[data-seg="Fruta"]').boundingBox();
await p.mouse.click(b.x + 30, b.y + 18); await p.waitForTimeout(300);
await p.screenshot({ path: `${PASTA}/${LADO}-escolher.png`, clip: recorte });
if (LADO === 'depois') {
  await p.mouse.move(b.x + 30, b.y + 18); await p.mouse.down(); await p.mouse.move(b.x - 160, b.y + 140, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400);
  await p.screenshot({ path: `${PASTA}/depois-movida.png`, clip: recorte });
  const b2 = await p.locator('[data-seg="Fruta"]').boundingBox();
  await p.mouse.click(b2.x + 30, b2.y + 18); await p.mouse.click(b2.x + 30, b2.y + 18); await p.waitForSelector('[data-segc-titulo]'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${PASTA}/depois-config.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('B3'); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(150);
  await p.click('.tab:has-text("Inserir")'); await p.waitForTimeout(200);
  await p.screenshot({ path: `${PASTA}/depois-faixa.png`, clip: { x: 212, y: 0, width: 888, height: 200 } });
  await p.locator('[data-cmd="inserir.segmentacao"]').first().click(); await p.waitForSelector('[data-segi-col]'); await p.check('[data-segi-col="Kg"]'); await p.waitForTimeout(200);
  await p.screenshot({ path: `${PASTA}/depois-inserir.png` });
}
await nav.close();
