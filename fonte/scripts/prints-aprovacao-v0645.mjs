/* Vértice Docs — prints da página de aprovação da v0.6.45 (D-70): a tela depois de esconder J até XFD e 130 até o fim.
   Uso: node scripts/prints-aprovacao-v0645.mjs <ANTES> <DEPOIS> <pasta>. Amostra inventada (amostra-varredura.xlsx). */
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
  const ir = async (ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(200); };
  await ir('J1:XFD1'); await p.keyboard.press('Control+0'); await p.waitForTimeout(600);
  await ir('A130:A1048576'); await p.keyboard.press('Control+9'); await p.waitForTimeout(900);
  await ir('B120'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${PASTA}/1-escondidas-${lado}.png` });
  await p.mouse.move(700, 500); for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 400); await p.waitForTimeout(150); }
  await p.waitForTimeout(400); await p.screenshot({ path: `${PASTA}/2-rolar-ate-o-fim-${lado}.png` });
  await ctx.close();
}
await nav.close(); console.log('prints em ' + PASTA);
