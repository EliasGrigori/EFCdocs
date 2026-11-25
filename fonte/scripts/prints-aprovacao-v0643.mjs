/* Vértice Docs — prints da página de aprovação da v0.6.43 (segmentação com o desenho do Excel).
   Uso: node scripts/prints-aprovacao-v0643.mjs <endereço ANTES> <endereço DEPOIS> <pasta>. Amostra inventada. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const [ANTES, DEPOIS, PASTA] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0641.xlsx', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME });
for (const [lado, base] of [['antes', ANTES], ['depois', DEPOIS]]) {
  for (const [tema, vp] of [['papel', { width: 1366, height: 800 }], ['dark', { width: 1366, height: 800 }], ['papel-cel', { width: 390, height: 844 }]]) {
    const ctx = await nav.newContext({ viewport: vp, reducedMotion: 'reduce', deviceScaleFactor: 2, hasTouch: tema === 'papel-cel', isMobile: tema === 'papel-cel' });
    await ctx.addInitScript((t) => { globalThis.EFC_MENU_FIXO = true; try { const x = JSON.parse(localStorage.getItem('efcdocs:prefs') || '{}'); x.tema = t; localStorage.setItem('efcdocs:prefs', JSON.stringify(x)); } catch { /* sem armazenamento */ } }, tema.replace('-cel', ''));
    const p = await ctx.newPage();
    await p.goto(base + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
    await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
    await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(900);
    if (tema === 'papel-cel') { await p.screenshot({ path: `${PASTA}/cel-${lado}.png` }); await ctx.close(); continue; }
    await p.locator('[data-seg="Fruta"] [data-seg-item="Acerola"]').click(); await p.waitForTimeout(400);
    const a = await p.locator('[data-seg="Fruta"]').boundingBox(), b = await p.locator('[data-seg="Talhão"]').boundingBox();
    const x = Math.min(a.x, b.x) - 16, y = Math.min(a.y, b.y) - 16, w = Math.max(a.x + a.width, b.x + b.width) - x + 16, h = Math.max(a.y + a.height, b.y + b.height) - y + 16;
    await p.screenshot({ path: `${PASTA}/segs-${tema}-${lado}.png`, clip: { x, y, width: w, height: h } });
    await p.screenshot({ path: `${PASTA}/tela-${tema}-${lado}.png` });
    await p.locator('[data-seg="Fruta"] .seg-cab b').click(); await p.waitForTimeout(300);
    const c = await p.locator('[data-seg="Fruta"]').boundingBox();
    await p.screenshot({ path: `${PASTA}/escolhida-${tema}-${lado}.png`, clip: { x: c.x - 20, y: c.y - 56, width: c.width + 40, height: c.height + 76 } });
    await ctx.close();
  }
}
await nav.close();
console.log('prints em ' + PASTA);
