/* Prints da página de aprovação da v0.6.40 (T2). Uso: node scripts/prints-aprovacao-v0640.mjs <endereço> <pasta> <antes|depois>. Amostra inventada. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const [BASE, PASTA, LADO] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0640.xlsx', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
async function abrir(vp, celular) {
  const ctx = await nav.newContext({ viewport: vp, reducedMotion: 'reduce', ...(celular ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}) });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
  await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(1200);
  return p;
}
const p = await abrir({ width: 1100, height: 760 });
const caixa = await p.locator('.pl-cv').boundingBox();
const recorte = { x: caixa.x, y: caixa.y, width: Math.min(560, caixa.width), height: Math.min(560, caixa.height) };
await p.screenshot({ path: `${PASTA}/${LADO}-abrir.png`, clip: recorte });
if (LADO === 'depois') {
  await p.locator('[data-seta-tabela="estoque"][data-seta-filtro="0"]').dispatchEvent('pointerdown'); await p.waitForSelector('[data-filtro-menu]'); await p.waitForTimeout(200);
  await p.locator('[data-filtro-tudo]').uncheck(); await p.locator('[data-filtro-v="Caixa"]').check(); await p.waitForTimeout(150);
  await p.screenshot({ path: `${PASTA}/depois-menu.png`, clip: { ...recorte, width: Math.min(760, caixa.width) } });
  await p.click('[data-filtro-ok]'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${PASTA}/depois-filtrada.png`, clip: recorte });
  const c = await abrir({ width: 390, height: 844 }, true);
  await c.screenshot({ path: `${PASTA}/depois-celular.png` });
}
await nav.close();
