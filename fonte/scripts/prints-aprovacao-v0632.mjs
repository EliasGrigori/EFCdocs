/* Vértice Docs — prints da aprovação da v0.6.32 (defeitos menores do Quadro). Uso: node scripts/prints-aprovacao-v0632.mjs <antes> <depois> <pasta> */
import { chromium } from 'playwright';
const [ANTES, DEPOIS, PASTA] = process.argv.slice(2);
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
async function abrir(base, opc) {
  const ctx = await nav.newContext({ reducedMotion: 'reduce', deviceScaleFactor: 2, ...opc });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(base + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio'); await p.waitForTimeout(400);
  return { ctx, p };
}
const novo = async (p, t, toque) => { const b = p.locator('[data-cmd="inserir.postit"]').first(); if (toque) await b.tap(); else await b.click(); const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(200); };
async function fotos(base, rot) {
  { /* computador: Kanban com coluna nova; post-it encolhido */
    const { ctx, p } = await abrir(base, { viewport: { width: 1366, height: 768 } });
    await novo(p, 'Calibrar balança'); await p.keyboard.press('Escape');
    await p.locator('.qd-vistas button:has-text("Kanban")').click(); await p.waitForSelector('.kb-col');
    await p.locator('.kb-coluna-nova').click(); await p.locator('.janela input').fill('Revisão'); await p.locator('.janela button.primary').click(); await p.waitForTimeout(300);
    await p.screenshot({ path: `${PASTA}/kanban-${rot}.png`, clip: { x: 0, y: 150, width: 1366, height: 330 } });
    await p.locator('.qd-vistas button:has-text("Quadro")').click(); await p.waitForTimeout(300);
    await novo(p, 'Encolher'); const it = p.locator('.qi-postit:has-text("Encolher")'); await it.click(); await p.waitForTimeout(150);
    const al = await p.locator('.qd-alca').boundingBox();
    await p.mouse.move(al.x + 3, al.y + 3); await p.mouse.down(); await p.mouse.move(al.x - 400, al.y - 400, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(250);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    const b = await it.boundingBox(); await p.screenshot({ path: `${PASTA}/encolher-${rot}.png`, clip: { x: b.x - 40, y: b.y - 40, width: 260, height: 190 } });
    await ctx.close();
  }
  { /* celular */
    const { ctx, p } = await abrir(base, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await p.screenshot({ path: `${PASTA}/cel-vazio-${rot}.png` });
    await novo(p, 'Conferir pH', true); await p.locator('.qi-postit').first().tap(); await p.waitForTimeout(500);
    await p.screenshot({ path: `${PASTA}/cel-sel-${rot}.png` });
    await p.keyboard.press('Escape'); await p.locator('.qd-zoom [aria-label="Ajustar à tela"]').tap().catch(() => {}); await p.waitForTimeout(300);
    await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(600);
    await p.screenshot({ path: `${PASTA}/cel-deitado-${rot}.png` });
    await ctx.close();
  }
}
await fotos(ANTES, 'antes'); await fotos(DEPOIS, 'depois');
await nav.close(); console.log('prints ok');
