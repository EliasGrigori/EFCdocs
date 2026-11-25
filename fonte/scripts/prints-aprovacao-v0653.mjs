/* Vértice Docs — prints da v0.6.53 (D-82: código da forma Início/Fim encostando no texto).
   Uso: node scripts/prints-aprovacao-v0653.mjs <ANTES> <DEPOIS> <pasta>. Quadro novo com itens inventados. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [ANTES, DEPOIS, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
for (const [lado, base] of [['antes', ANTES], ['depois', DEPOIS]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(base + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  await p.locator('[data-cmd="inserir.inicio"]').first().click();
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill('COMANDA DE PULVERIZAÇÃO - DEFENCIVOS'); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
  await p.mouse.click(5, 790); await p.waitForTimeout(200);
  const b = await p.locator('.qi-inicio').boundingBox();
  await p.screenshot({ path: `${PASTA}/0-inicio-${lado}.png`, clip: { x: b.x - 14, y: b.y - 14, width: b.width + 28, height: b.height + 28 } });
  await ctx.close();
}
await nav.close(); console.log('prints em ' + PASTA);
