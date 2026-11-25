/* Vértice Docs — prints de antes e depois da página de aprovação da v0.6.65 (visual do Kanban; dados inventados).
   Uso: node scripts/prints-aprovacao-v0665.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { montarKanban } from './layout/kanban-semente.mjs';
import { abrirSemeado } from './layout/semente.mjs';
const BASE = process.argv[2], SAI = process.argv[3];
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
{ /* V1 e V2: os cartões de tarefa inventados */
  const m = await abrirSemeado(nav, BASE, { w: 1366, h: 800, reduzido: true }); const p = m.page;
  await montarKanban(p, BASE); await p.waitForTimeout(400);
  const b = await p.locator('.kb').boundingBox(); await p.screenshot({ path: `${SAI}/1-kanban.png`, clip: { x: b.x, y: b.y + 30, width: Math.min(b.width, 1000), height: 560 } });
  await m.ctx.close();
}
{ /* V3: texturas e letra; V4: painel */
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' }); await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  const ta = () => p.locator('textarea.qd-edita');
  for (const t of ['Recebimento de amostras', 'Preparo de amostras', 'Despache nos Correios', 'Receber formulários', 'Arquivar formulários']) { await p.keyboard.press('Escape'); await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
  await p.click('.tab:has-text("Página Inicial")'); await p.waitForTimeout(150);
  for (const [t, tex] of [['Preparo', 'cafe'], ['Despache', 'fita'], ['Receber', 'pautado'], ['Arquivar', 'clipe']]) { await p.locator('.qi', { hasText: t }).first().click(); await p.click('[data-menu-faixa=texturaQ]'); await p.locator(`.rb-lista [data-cmd="formatar.textura|${tex}"]`).first().click(); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
  await p.locator('.qi', { hasText: 'Recebimento' }).first().click(); await p.click('[data-cx=fonteQ]'); await p.waitForTimeout(500); await p.locator('.rb-lista [data-valor="formatar.fonteQ|Caveat"]').click(); await p.waitForTimeout(700); await p.keyboard.press('Escape');
  await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(700);
  const b = await p.locator('.kb-col').first().boundingBox(); await p.screenshot({ path: `${SAI}/3-texturas.png`, clip: { x: b.x - 10, y: b.y - 14, width: b.width + 20, height: Math.min(b.height + 28, 620) } });
  await ctx.close();
}
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 } }); await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  await p.locator('[data-cmd="inserir.postit"]').first().click(); const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill('Um'); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
  await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(600);
  await p.locator('.topbar [data-cmd="exibir.painel"]').first().click(); await p.waitForTimeout(700);
  await p.locator('.topbar [data-cmd="exibir.painel"]').first().click(); await p.waitForTimeout(90);
  await p.screenshot({ path: `${SAI}/4-fechando-painel.png`, clip: { x: 212, y: 196, width: 1154, height: 400 } });
  await ctx.close();
}
await nav.close(); console.log('prints em', SAI);
