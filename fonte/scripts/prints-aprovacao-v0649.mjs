/* Vértice Docs — prints da página de aprovação da v0.6.49 (D-79: aba muito oculta do Excel fora do menu Reexibir).
   Uso: node scripts/prints-aprovacao-v0649.mjs <ANTES> <DEPOIS> <pasta>. Amostra inventada (amostra-varredura.xlsx). */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const [ANTES, DEPOIS, PASTA] = process.argv.slice(2);
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-varredura.xlsx', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
for (const [lado, base] of [['antes', ANTES], ['depois', DEPOIS]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 1.5 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(base + '#/'); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', AMOSTRA);
  await p.waitForSelector('[data-excel-abrir]', { timeout: 60000 }); await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv', { timeout: 60000 }); await p.waitForTimeout(1200);
  await p.locator('.pl-aba', { hasText: 'Ficha' }).click({ button: 'right' }); await p.waitForTimeout(400);
  const m = await p.locator('.pl-menu').boundingBox();
  const ab = await p.locator('.pl-abas').boundingBox();
  const x = Math.max(0, Math.min(m.x, ab.x) - 10), y = m.y - 10;
  await p.screenshot({ path: `${PASTA}/1-menu-aba-${lado}.png`, clip: { x, y, width: Math.max(m.x + m.width, ab.x + 360) - x + 10, height: ab.y + ab.height - y + 6 } });
  await ctx.close();
}
await nav.close(); console.log('prints em ' + PASTA);
