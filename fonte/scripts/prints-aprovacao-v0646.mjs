/* Vértice Docs — prints da página de aprovação da v0.6.46 (D-72/D-74 lista ao rolar; D-75 imagem na linha congelada).
   Uso: node scripts/prints-aprovacao-v0646.mjs <ANTES> <DEPOIS> <pasta>. Amostra inventada (amostra-v0646.xlsx). */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const [ANTES, DEPOIS, PASTA] = process.argv.slice(2);
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0646.xlsx', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
for (const [lado, base] of [['antes', ANTES], ['depois', DEPOIS]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 1.5 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(base + '#/'); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', AMOSTRA);
  await p.waitForSelector('[data-excel-abrir]', { timeout: 60000 }); await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv', { timeout: 60000 }); await p.waitForTimeout(1200);
  const cv = await p.locator('.pl-cv').boundingBox();
  const ir = async (ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(200); };
  const clip = { x: cv.x - 50, y: cv.y - 90, width: 860, height: 520 };
  await ir('A1'); await p.screenshot({ path: `${PASTA}/1-imagem-${lado}.png`, clip });
  await p.mouse.move(cv.x + 800, cv.y + 450); await p.mouse.wheel(0, 40); await p.waitForTimeout(500);
  await p.screenshot({ path: `${PASTA}/2-imagem-rolada-${lado}.png`, clip });
  await p.mouse.wheel(0, -200); await p.waitForTimeout(400);
  await ir('C12'); await p.keyboard.press('Alt+ArrowDown'); await p.waitForTimeout(500);
  await p.mouse.move(cv.x + 800, cv.y + 450); await p.mouse.wheel(0, 160); await p.waitForTimeout(600);
  await p.screenshot({ path: `${PASTA}/3-lista-rolar-${lado}.png`, clip });
  await ctx.close();
}
await nav.close(); console.log('prints em ' + PASTA);
