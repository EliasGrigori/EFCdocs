/* Vértice Docs — prints da v0.6.24.4 (ajustes da aprovação da v0.6.24.3: seta menor e transparente, maiores/menores/média na lista). Dados inventados.
   Uso: node scripts/prints-aprovacao-v06244.mjs <endereço HOJE> <endereço PROPOSTA> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME });
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 860 }, reducedMotion: 'no-preference', deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  const cel = async (r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(60); };
  const dig = async (r, l) => { await cel(r); for (const t of l) { await p.keyboard.type(t); await p.keyboard.press('Enter'); } };
  await p.goto(base + '#/planilha'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
  await dig('A1', ['Ponto de coleta', 'Rede 1', 'Rede 2', 'Poço', 'Caixa d\'água']); await dig('B1', ['Cloro (mg/L)', '0,4', '1,2', '0,8', '2,5']); await dig('C1', ['Data da coleta', '18/11/2026', '17/11/2026', '09/10/2026', '15/11/2026']);
  await cel('A1:C5'); await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.tabela"]').first().click(); await p.waitForTimeout(400);
  const okb = p.locator('.janela .btn.primary'); if (await okb.count()) { await okb.first().click(); await p.waitForTimeout(400); }
  await cel('F9'); await p.waitForTimeout(250);
  const cv = await p.locator('.pl-cv').boundingBox();
  const recorte = { x: cv.x, y: cv.y, width: 420, height: 130 };
  await p.screenshot({ path: `${PASTA}/titulo-${lado}.png`, clip: recorte });
  await p.locator('[data-seta-filtro="0"]').hover(); await p.waitForTimeout(400);
  await p.screenshot({ path: `${PASTA}/mouse-${lado}.png`, clip: recorte });
  await p.mouse.move(900, 700); await p.waitForTimeout(300);
  /* filtra o Cloro (> 1) */
  await p.locator('[data-seta-filtro="1"]').dispatchEvent('pointerdown'); await p.waitForSelector('[data-filtro-menu]');
  await p.click('[data-filtro-condicoes]'); await p.selectOption('[data-filtro-op]', '>'); await p.fill('[data-filtro-cond="a"]', '1'); await p.click('[data-filtro-cond-ok]'); await p.waitForTimeout(300);
  await cel('F9'); await p.mouse.move(900, 700); await p.waitForTimeout(300);
  await p.screenshot({ path: `${PASTA}/filtrado-${lado}.png`, clip: recorte });
  if (lado === 'prop') { await p.locator('[data-seta-filtro="1"]').hover(); await p.waitForTimeout(400); await p.screenshot({ path: `${PASTA}/filtrado-mouse.png`, clip: recorte }); await p.mouse.move(900, 700); }
  /* Filtros de número */
  await p.locator('[data-seta-filtro="1"]').dispatchEvent('pointerdown'); await p.waitForSelector('[data-filtro-menu]'); await p.waitForTimeout(150);
  if ((await p.locator('[data-filtro-condicoes]').getAttribute('aria-expanded')) !== 'true') await p.click('[data-filtro-condicoes]');
  await p.waitForTimeout(150);
  if (lado === 'prop') await p.locator('[data-filtro-op]').evaluate((s) => { s.size = 15; s.style.height = 'auto'; });
  await p.waitForTimeout(150);
  const m = await p.locator('[data-filtro-menu]').boundingBox(), c = await p.locator('.pl-fcond').boundingBox();
  const fim = await p.locator('.pl-frapido').count() ? await p.locator('.pl-frapido').boundingBox() : c;
  await p.screenshot({ path: `${PASTA}/numero-${lado}.png`, clip: { x: m.x - 6, y: m.y - 6, width: m.width + 12, height: fim.y + fim.height - m.y + 16 } });
  await ctx.close();
  console.log(lado, 'ok');
}
await nav.close();
