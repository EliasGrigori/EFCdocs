/* Vértice Docs — prints da v0.6.28 (trava de toque em imagens e gráficos, celular). Dados inventados.
   Uso: node scripts/prints-aprovacao-v0628.mjs <HOJE> <PROPOSTA> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME });
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  const cel = async (r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(80); };
  await p.goto(base + '#/planilha'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
  await cel('A1'); for (const t of ['Ponto de coleta', 'Rede 1', 'Rede 2', 'Poço', 'Caixa d\'água', 'Bebedouro', 'Torneira']) { await p.keyboard.type(t); await p.keyboard.press('Enter'); }
  await cel('B1'); for (const t of ['Cloro', '0,4', '1,2', '0,8', '2,5', '1,1', '0,6']) { await p.keyboard.type(t); await p.keyboard.press('Enter'); }
  await cel('A1:B7'); await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.grafico"]').first().click();
  await p.waitForSelector('[data-grafico-janela]'); await p.click('[data-gr-aplicar]'); await p.waitForSelector('.pl-obj-gr'); await p.waitForTimeout(400);
  await cel('A1'); await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500); await cel('A1'); await p.waitForTimeout(300);
  await p.screenshot({ path: `${PASTA}/inicio-${lado}.png` });
  const r = await p.locator('.pl-obj-gr').boundingBox();
  const x = Math.min(r.x + 40, 360), y = r.y + 60;
  const t = (type, xx, yy) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: xx, y: yy, id: 1 }] });
  await t('touchStart', x, y); for (let i = 1; i <= 12; i++) { await t('touchMove', x - 4 * i, y - 9 * i); await p.waitForTimeout(40); } await t('touchEnd');
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${PASTA}/arrastou-${lado}.png` });
  if (lado === 'prop') {
    const r2 = await p.locator('.pl-obj-gr').boundingBox();
    await t('touchStart', Math.min(r2.x + 40, 360), r2.y + r2.height - 50); await p.waitForTimeout(60); await t('touchEnd'); await p.waitForTimeout(400);
    await p.screenshot({ path: `${PASTA}/tocou-prop.png` });
  }
  await ctx.close(); console.log(lado, 'ok');
}
await nav.close();
