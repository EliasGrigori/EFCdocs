/* Vértice Docs — prints de antes e depois da página de aprovação da v0.6.63 (dados inventados).
   Uso: node scripts/prints-aprovacao-v0663.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2], SAI = process.argv[3];
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0641.xlsx', import.meta.url));
const nav = await chromium.launch({ executablePath: CHROME });
const tenta = async (nome, f) => { try { await f(); console.log('ok', nome); } catch (e) { console.log('FALHOU', nome, String(e.message || e).split('\n')[0].slice(0, 160)); } };
async function pg(opc = {}, fixo = true) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce', ...opc });
  if (fixo) await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  return { ctx, p: await ctx.newPage() };
}
const novoPostit = async (p, t) => { await p.keyboard.press('Escape'); await p.locator('[data-cmd="inserir.postit"]').first().click(); const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape'); };

/* 1) J1: a janela no primeiro quadro */
await tenta('j1', async () => {
  const { ctx, p } = await pg({ reducedMotion: 'no-preference' });
  await p.goto(BASE + '#/'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(500);
  for (const t of ['Item', 'Caixa', 'Bomba']) { await p.keyboard.type(t); await p.keyboard.press('Enter'); }
  await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp'); await p.keyboard.press('ArrowUp');
  await p.click('.tabs .tab:has-text("Inserir")'); await p.waitForTimeout(500); await p.locator('.ribbon [data-cmd="inserir.tabela"]:visible').first().click();
  await p.waitForSelector('.pl-jtab'); await p.evaluate(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = 0; } });
  await p.screenshot({ path: `${SAI}/01-j1-janela.png`, clip: { x: 300, y: 60, width: 760, height: 520 } });
  await ctx.close();
});
/* 2) V56-04 e 3) post-it mínimo (celular com toque; o contorno vermelho mostra a área do toque da caixinha) */
await tenta('caixinha e minimo', async () => {
  const { ctx, p } = await pg({ viewport: { width: 1366, height: 768 }, hasTouch: true, deviceScaleFactor: 2 });
  await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio'); await p.waitForTimeout(300);
  await novoPostit(p, 'Encolher');
  await p.click('.tab:has-text("Exibir")'); const cx = p.locator('[data-cmd="exibir.caixas"]').first(); if (await cx.count()) await cx.click(); await p.waitForTimeout(200);
  const it = p.locator('.qi-postit:has-text("Encolher")'); await it.click(); await p.waitForTimeout(150);
  const al = await p.locator('.qd-alca').boundingBox();
  await p.mouse.move(al.x + al.width / 2, al.y + al.height / 2); await p.mouse.down(); await p.mouse.move(al.x - 400, al.y - 400, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  await p.evaluate(() => { const b = document.querySelector('.qi-caixa'); if (b) b.style.outline = '1px dashed #d92d20'; });
  const b = await it.boundingBox();
  await p.screenshot({ path: `${SAI}/02-minimo-caixinha.png`, clip: { x: b.x - 14, y: b.y - 14, width: b.width + 28, height: b.height + 28 } });
  await ctx.close();
});
/* 4) busca no plural e 5) ordem do Inserir */
await tenta('busca e inserir', async () => {
  const { ctx, p } = await pg();
  await p.goto(BASE + '#/'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(400);
  await p.click('.tabs .tab:has-text("Inserir")'); await p.waitForTimeout(300);
  await p.locator('.ribbon').screenshot({ path: `${SAI}/05-inserir.png` });
  await p.keyboard.press('Alt+q'); await p.waitForTimeout(300); await p.keyboard.type('Excluir linhas'); await p.waitForTimeout(400);
  const j = p.locator('.janela, .paleta, [role=dialog]').first();
  await j.screenshot({ path: `${SAI}/04-busca.png` });
  await ctx.close();
});
/* 7) Documentos internos com 1040 px */
await tenta('internos', async () => {
  const { ctx, p } = await pg({ viewport: { width: 1040, height: 600 } });
  await p.goto(BASE + '#/internos'); await p.waitForSelector('.internos .tb-arq'); await p.waitForTimeout(400);
  await p.screenshot({ path: `${SAI}/07-internos-1040.png` });
  await ctx.close();
});
/* 8) segmentação no celular */
await tenta('segmentacao', async () => {
  const { ctx, p } = await pg({ viewport: { width: 390, height: 790 }, hasTouch: true, isMobile: true });
  await p.goto(BASE + '#/'); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', AMOSTRA);
  await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 }); await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(900);
  await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
  const b = await p.locator('[data-seg]').first().boundingBox(); await p.touchscreen.tap(b.x + 30, b.y + 14); await p.waitForTimeout(600);
  await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove()));
  await p.screenshot({ path: `${SAI}/08-segmentacao-celular.png` });
  await ctx.close();
});
/* 10) Início (cartões e busca) */
await tenta('inicio', async () => {
  const { ctx, p } = await pg();
  await p.goto(BASE + '#/'); await p.waitForTimeout(900);
  await p.locator('.cartoes-novos').screenshot({ path: `${SAI}/10-cartoes.png` });
  await p.locator('.topbar').screenshot({ path: `${SAI}/11-topo-inicio.png` });
  await ctx.close();
});
/* 12) Documento em 1366 sem o menu fixo, 13) ponto do Recortar */
await tenta('documento', async () => {
  const { ctx, p } = await pg({}, false);
  await p.goto(BASE + '#/'); await p.click('[data-novo=docx]'); await p.waitForTimeout(1200);
  await p.screenshot({ path: `${SAI}/12-documento-1366.png` });
  const r = await p.locator('.ribbon [data-cmd="editar.recortar"]').first().boundingBox();
  const ctx2 = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce', deviceScaleFactor: 3 }); void ctx2; await ctx2.close();
  await p.screenshot({ path: `${SAI}/13-recortar.png`, clip: { x: r.x - 70, y: r.y - 12, width: 260, height: 100 } });
  await ctx.close();
});
/* 14) café por baixo das letras */
await tenta('cafe', async () => {
  const { ctx, p } = await pg({ deviceScaleFactor: 2 });
  await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio'); await p.waitForTimeout(300);
  await novoPostit(p, 'Conferir o lacre e a temperatura das amostras na chegada');
  await p.click('.tab:has-text("Página Inicial")'); await p.waitForTimeout(200);
  await p.locator('.qi', { hasText: 'Conferir o lacre' }).first().click(); await p.waitForTimeout(150);
  await p.click('[data-menu-faixa=texturaQ]'); await p.locator('.rb-lista [data-cmd="formatar.textura|cafe"]').click(); await p.waitForTimeout(200);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await p.locator('.qi', { hasText: 'Conferir o lacre' }).first().screenshot({ path: `${SAI}/14-cafe.png` });
  await ctx.close();
});
await nav.close();
