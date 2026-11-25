/* Vértice Docs — prints de antes e depois da página de aprovação da v0.6.64 (arrastar no Kanban; dados inventados).
   Uso: node scripts/prints-aprovacao-v0664.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
const BASE = process.argv[2], SAI = process.argv[3];
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const TEXTOS = ['Recebimento de amostras', 'Preparo de amostras\ncom conferência do lacre\ne da temperatura', 'Despache nos Correios', 'Receber formulários', 'Arquivar formulários\nda semana', 'Entrega de documentos'];
async function abrir(vw = 1366) {
  const ctx = await nav.newContext({ viewport: { width: vw, height: 800 } });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  const ta = () => p.locator('textarea.qd-edita');
  for (const t of TEXTOS) { await p.keyboard.press('Escape'); await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
  await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(500);
  return { ctx, p };
}
const area = async (p) => { const b = await p.locator('.kb').boundingBox(); return { x: b.x, y: b.y + 40, width: Math.min(b.width, 940), height: 640 }; };
{
  const { ctx, p } = await abrir();
  const c = await p.locator('.kb-card[data-item]', { hasText: 'Despache' }).first().boundingBox();
  const cols = await Promise.all((await p.locator('.kb-col').all()).map((k) => k.boundingBox()));
  await p.mouse.move(c.x + c.width / 2, c.y + 14); await p.mouse.down();
  await p.mouse.move(cols[1].x + cols[1].width / 2, cols[1].y + 70, { steps: 16 }); await p.waitForTimeout(400);
  await p.screenshot({ path: `${SAI}/1-durante.png`, clip: await area(p) });
  /* ao soltar, em câmera lenta (4 vezes): o que se vê nos primeiros quadros */
  const cdp = await ctx.newCDPSession(p); await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.25 });
  await p.mouse.up();
  for (const [i, t] of [[1, 30], [2, 300], [3, 700]]) { await p.waitForTimeout(t - (i > 1 ? [0, 30, 300][i - 1] : 0)); await p.screenshot({ path: `${SAI}/2-soltar-${i}.png`, clip: await area(p) }); }
  await ctx.close();
}
{
  const { ctx, p } = await abrir(); await p.setViewportSize({ width: 760, height: 800 }); await p.waitForTimeout(400);
  const c1 = await p.locator('.kb-col').first().locator('.kb-card').first().boundingBox();
  await p.mouse.move(c1.x + c1.width / 2, c1.y + 14); await p.mouse.down();
  await p.mouse.move(745, c1.y + 60, { steps: 20 }); await p.waitForTimeout(900);
  await p.screenshot({ path: `${SAI}/3-beira.png` });
  await p.keyboard.press('Escape'); await p.mouse.up(); await ctx.close();
}
await nav.close();
console.log('prints em', SAI);
