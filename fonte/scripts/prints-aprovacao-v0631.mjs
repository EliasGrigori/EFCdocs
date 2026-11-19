/* Vértice Docs — prints da página de aprovação da v0.6.31 (ícones no estilo E). Uso: node scripts/prints-aprovacao-v0631.mjs <antes> <depois> <pasta> */
import { chromium } from 'playwright';
const [ANTES, DEPOIS, PASTA] = process.argv.slice(2);
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
async function fotos(base, rot) {
  for (const [vp, nome] of [[{ width: 1366, height: 800 }, 'pc'], [{ width: 390, height: 844 }, 'cel']]) {
    const ctx = await nav.newContext({ viewport: vp, deviceScaleFactor: 2, reducedMotion: 'reduce', hasTouch: nome === 'cel', isMobile: nome === 'cel' });
    await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
    const p = await ctx.newPage();
    await p.goto(base + '#/planilha'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(500);
    const topo = async (arq) => { const b = nome === 'cel' ? { y: 0, height: 214 } : await p.locator('.ribbon').boundingBox(); await p.screenshot({ path: `${PASTA}/${arq}-${rot}.png`, clip: { x: 0, y: 0, width: vp.width, height: Math.ceil(b.y + b.height + 6) } }); };
    const abas = nome === 'pc' ? ['Página Inicial', 'Inserir', 'Dados', 'Exibir'] : ['Página Inicial'];
    for (const tema of ['papel', 'dark']) {
      await p.evaluate((t) => { document.body.dataset.theme = t; }, tema); await p.waitForTimeout(150);
      for (const a of abas) {
        if (tema === 'dark' && a !== 'Página Inicial' && a !== 'Inserir') continue;
        if (nome === 'pc') { await p.click(`.tabs .tab:has-text("${a}")`); await p.waitForTimeout(250); }
        await topo(`${nome}-${tema === 'papel' ? 'claro' : 'escuro'}-${a.split(' ')[0].toLowerCase()}`);
      }
    }
    if (nome === 'pc') { /* lista dos gráficos aberta */
      await p.evaluate(() => { document.body.dataset.theme = 'papel'; });
      await p.click('.tabs .tab:has-text("Inserir")'); await p.waitForTimeout(200);
      const seta = p.locator('.ribbon [data-cmd="inserir.grafico|colunas"]').first();
      if (await seta.count()) { const b = await seta.boundingBox(); await p.screenshot({ path: `${PASTA}/pc-graficos-${rot}.png`, clip: { x: Math.max(0, b.x - 300), y: 0, width: 700, height: Math.ceil(b.y + b.height + 20) } }); }
    }
    await ctx.close();
  }
}
await fotos(ANTES, 'antes'); await fotos(DEPOIS, 'depois');
await nav.close(); console.log('prints ok');
