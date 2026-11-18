/* Vértice Docs — prints da v0.6.24.3 (v0.6.24 parte 2: filtro da coluna da planilha e da tabela). Dados inventados.
   Uso: node scripts/prints-aprovacao-v06243.mjs <endereço HOJE> <endereço PROPOSTA> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { abrirSemeado, espera } from './layout/semente.mjs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME });
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 860 }, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  const cel = async (r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(60); };
  const dig = async (r, l) => { await cel(r); for (const t of l) { await p.keyboard.type(t); await p.keyboard.press('Enter'); } };
  await p.goto(base + '#/planilha'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
  const hoje = new Date(), d = (k) => { const x = new Date(hoje); x.setDate(hoje.getDate() - k); return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`; };
  await dig('A1', ['Ponto de coleta', 'Rede 1', 'Rede 2', 'Poço', 'Caixa d\'água']); await dig('B1', ['Cloro (mg/L)', '0,4', '1,2', '0,8', '2,5']); await dig('C1', ['Data da coleta', d(0), d(1), d(40), d(3)]);
  await cel('A1:C5'); await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.tabela"]').first().click(); await p.waitForTimeout(400);
  const okb = p.locator('.janela .btn.primary'); if (await okb.count()) { await okb.first().click(); await p.waitForTimeout(400); }
  await cel('F9'); await p.waitForTimeout(250);
  const cv = await p.locator('.pl-cv').boundingBox();
  await p.screenshot({ path: `${PASTA}/titulo-${lado}.png`, clip: { x: cv.x, y: cv.y, width: 420, height: 130 } });
  if (lado === 'prop') { await p.locator('[data-seta-filtro="0"]').hover(); await p.waitForTimeout(150); await p.screenshot({ path: `${PASTA}/titulo-mouse.png`, clip: { x: cv.x, y: cv.y, width: 420, height: 130 } }); }
  await p.locator('[data-seta-filtro="1"]').dispatchEvent('pointerdown'); await p.waitForSelector('[data-filtro-menu]'); await p.waitForTimeout(200);
  const m = await p.locator('[data-filtro-menu]').boundingBox();
  await p.screenshot({ path: `${PASTA}/menu-${lado}.png`, clip: { x: cv.x, y: cv.y, width: Math.max(420, m.x + m.width - cv.x + 10), height: m.y + m.height - cv.y + 10 } });
  if (lado === 'prop') {
    await p.click('[data-filtro-condicoes]'); await p.selectOption('[data-filtro-op]', '>'); await p.fill('[data-filtro-cond="a"]', '1'); await p.waitForTimeout(150);
    const m2 = await p.locator('[data-filtro-menu]').boundingBox();
    await p.screenshot({ path: `${PASTA}/numero.png`, clip: { x: m2.x - 6, y: m2.y - 6, width: m2.width + 12, height: Math.min(m2.height, 520) + 12 } });
    await p.click('[data-filtro-cond-ok]'); await p.waitForTimeout(300); await cel('F9'); await p.waitForTimeout(200);
    await p.screenshot({ path: `${PASTA}/filtrado.png`, clip: { x: cv.x, y: cv.y, width: 420, height: 130 } });
    await p.locator('[data-seta-filtro="2"]').dispatchEvent('pointerdown'); await p.waitForSelector('[data-filtro-menu]'); await p.click('[data-filtro-condicoes]'); await p.waitForTimeout(150);
    const m3 = await p.locator('[data-filtro-menu]').boundingBox();
    await p.screenshot({ path: `${PASTA}/data.png`, clip: { x: m3.x - 6, y: m3.y - 6, width: m3.width + 12, height: Math.min(m3.height, 420) + 12 } });
    await p.keyboard.press('Escape');
    await p.locator('[data-seta-filtro="0"]').dispatchEvent('pointerdown'); await p.waitForSelector('[data-filtro-menu]'); await p.click('[data-filtro-condicoes]'); await p.waitForTimeout(150);
    const m4 = await p.locator('[data-filtro-menu]').boundingBox();
    await p.screenshot({ path: `${PASTA}/texto.png`, clip: { x: m4.x - 6, y: m4.y - 6, width: m4.width + 12, height: Math.min(m4.height, 420) + 12 } });
    /* ordem num botão só (pedido das 15:46): estado padrão e depois de um toque */
    await p.keyboard.press('Escape'); await p.waitForTimeout(100);
    for (const nome of ['ordem-padrao', 'ordem-asc']) {
      await p.locator('[data-seta-filtro="0"]').dispatchEvent('pointerdown'); await p.waitForSelector('[data-filtro-menu]'); await p.waitForTimeout(150);
      const m5 = await p.locator('[data-filtro-menu]').boundingBox(), o = await p.locator('[data-filtro-ordem]').boundingBox();
      await p.screenshot({ path: `${PASTA}/${nome}.png`, clip: { x: m5.x - 6, y: m5.y - 6, width: m5.width + 12, height: o.y + o.height - m5.y + 14 } });
      if (nome === 'ordem-padrao') { await p.click('[data-filtro-ordem]'); await p.waitForTimeout(300); }
    }
    await p.keyboard.press('Escape'); await cel('F9'); await p.waitForTimeout(200);
    await p.screenshot({ path: `${PASTA}/ordenado.png`, clip: { x: cv.x, y: cv.y, width: 420, height: 130 } });
  }
  await ctx.close();
  /* V24-03 refeito: celular, Documentos internos */
  const a = await abrirSemeado(nav, base, { w: 390, h: 844, toque: true, reduzido: true, escala: 2 });
  await a.page.goto(base + '#/internos'); await espera(900);
  if (lado === 'prop') await a.page.locator('.tb-arq thead tr').evaluate((e) => { e.scrollLeft = 120; });
  await espera(200); await a.page.screenshot({ path: `${PASTA}/cel-${lado}.png`, clip: { x: 0, y: 40, width: 390, height: 420 } });
  await a.ctx.close();
  console.log(lado, 'ok');
}
await nav.close();
