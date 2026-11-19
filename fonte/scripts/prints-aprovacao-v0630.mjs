/* Vértice Docs — prints da v0.6.30 (Faixa parte 4: D7, D4 e D8). Uso: node scripts/prints-aprovacao-v0630.mjs <HOJE> <PROPOSTA> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME });
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(base + '#/planilha'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
  const faixa = async (nome) => { const c = await p.evaluate(() => { const gs = [...document.querySelectorAll('.ribbon > .rb-g')].map((g) => g.getBoundingClientRect()); const t = document.querySelector('.tabs').getBoundingClientRect(); return { y: t.top, fim: Math.max(...gs.map((g) => g.bottom)), dir: Math.max(...gs.map((g) => g.right)) }; }); await p.screenshot({ path: `${PASTA}/${nome}-${lado}.png`, clip: { x: 0, y: c.y, width: Math.min(1366, c.dir + 16), height: c.fim - c.y + 4 } }); };
  await p.click('.tabs .tab:has-text("Exibir")'); await p.waitForTimeout(300); await faixa('exibir');
  if (lado === 'prop') {
    await p.click('[data-menu-faixa=vtBarra]'); await p.waitForSelector('.rb-lista'); await p.waitForTimeout(200);
    const r = await p.locator('.rb-lista').boundingBox(), b = await p.locator('[data-menu-faixa=vtBarra]').boundingBox();
    await p.screenshot({ path: `${PASTA}/lista-barra-prop.png`, clip: { x: Math.max(0, b.x - 20), y: b.y - 8, width: Math.max(r.width, 260) + 40, height: r.y + r.height - b.y + 16 } });
    await p.keyboard.press('Escape');
  }
  await p.click('.tabs .tab:has-text("Página Inicial")'); await p.waitForTimeout(300); await faixa('inicio');
  if (lado === 'prop') {
    await p.click('[data-menu-faixa=classificarFiltrar]'); await p.waitForSelector('.rb-lista'); await p.waitForTimeout(200);
    const r = await p.locator('.rb-lista').boundingBox(), b = await p.locator('[data-menu-faixa=classificarFiltrar]').boundingBox();
    await p.screenshot({ path: `${PASTA}/lista-filtro-prop.png`, clip: { x: Math.min(r.x, b.x) - 16, y: b.y - 8, width: Math.max(r.width, b.width) + 60, height: r.y + r.height - b.y + 16 } });
    await p.keyboard.press('Escape');
  }
  await p.click('.tabs .tab:has-text("Revisão")'); await p.waitForTimeout(200); await p.locator('.ribbon [data-cmd="revisao.travar"]').click(); await p.waitForSelector('.pl-jdados'); await p.waitForTimeout(250);
  await p.locator('.pl-jdados').screenshot({ path: `${PASTA}/proteger-${lado}.png` });
  await ctx.close(); console.log(lado, 'ok');
}
await nav.close();
