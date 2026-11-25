/* Vértice Docs — prints da página de aprovação da v0.6.51 (título do post-it; caixinha de feito; Kanban).
   Uso: node scripts/prints-aprovacao-v0651.mjs <ANTES> <DEPOIS> <pasta>. Quadro novo com itens inventados. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [ANTES, DEPOIS, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const TEXTOS = ['Balança do packing, até sexta', 'Trocar o filtro do lavador', 'Separar os registros do mês'];
async function quadro(base) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 1.5 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(base + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  for (const t of TEXTOS) {
    await p.locator('[data-cmd="inserir.postit"]').first().click();
    const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
  }
  await p.click('.tab:has-text("Exibir")'); await p.locator('[data-cmd="exibir.ajustar"]').first().click(); await p.waitForTimeout(400);
  return { p, ctx };
}
const recorte = async (p) => { const b = await p.locator('.qi-postit').evaluateAll((els) => { const r = els.map((e) => e.getBoundingClientRect()); return { x: Math.min(...r.map((q) => q.left)), y: Math.min(...r.map((q) => q.top)), x2: Math.max(...r.map((q) => q.right)), y2: Math.max(...r.map((q) => q.bottom)) }; }); return { x: b.x - 30, y: b.y - 30, width: b.x2 - b.x + 60, height: b.y2 - b.y + 60 }; };
{
  const { p, ctx } = await quadro(ANTES);
  await p.screenshot({ path: `${PASTA}/1-postits-antes.png`, clip: await recorte(p) });
  await ctx.close();
}
{
  const { p, ctx } = await quadro(DEPOIS);
  await p.locator('.qi-postit').nth(0).click(); await p.locator('button[title="Título"]').first().click(); await p.waitForSelector('.qd-jtitulo');
  await p.locator('[data-titulo-campo]').fill('Conferir calibração');
  await p.locator('.qd-jtitulo').screenshot({ path: `${PASTA}/2-janela-titulo.png` });
  await p.locator('[data-titulo-campo]').press('Enter'); await p.waitForTimeout(200);
  await p.locator('.qi-postit').nth(2).click(); await p.locator('button[title="Título"]').first().click(); await p.waitForSelector('.qd-jtitulo');
  await p.locator('[data-titulo-campo]').fill('Auditoria interna'); await p.locator('[data-titulo-campo]').press('Enter'); await p.waitForTimeout(200);
  await p.keyboard.press('Escape');
  await p.locator('.qi-postit').nth(1).locator('.qi-caixa').click(); await p.waitForTimeout(250);
  await p.mouse.click(5, 790);
  await p.screenshot({ path: `${PASTA}/1-postits-depois.png`, clip: await recorte(p) });
  await p.locator('[role=tab]:has-text("Kanban")').click(); await p.waitForTimeout(500);
  const k = await p.locator('.kb').boundingBox().catch(() => null) || await p.locator('.qd').boundingBox();
  await p.screenshot({ path: `${PASTA}/3-kanban-depois.png`, clip: { x: k.x, y: k.y, width: Math.min(k.width, 1000), height: Math.min(k.height, 420) } });
  await ctx.close();
}
await nav.close(); console.log('prints em ' + PASTA);
