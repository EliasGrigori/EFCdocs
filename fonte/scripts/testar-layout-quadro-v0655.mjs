/* Vértice Docs v0.6.55 — Quadro › Layout da Página (igual à da Planilha), área de impressão e quebras tracejadas.
   Quadro novo com itens inventados. Falha na v0.6.54 e passa na v0.6.55.
   Uso: node scripts/testar-layout-quadro-v0655.mjs <endereço> [pasta para prints] */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', acceptDownloads: true, deviceScaleFactor: PRINTS ? 1.5 : 1 });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
const fim = async () => { caso('sem erro na página', erros.length === 0, erros.join(' | ')); await nav.close(); console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo'); process.exit(falhas ? 1 : 0); };
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
for (const t of ['Receber a fruta', 'Lavar e selecionar', 'Embalar', 'Conferir a balança']) {
  await p.locator('[data-cmd="inserir.postit"]').first().click();
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
}
{ /* espalha na largura */
  const area = await p.locator('.qd-area').boundingBox(), b = await p.locator('.qi-postit').nth(3).boundingBox();
  await p.mouse.move(b.x + 20, b.y + 10); await p.mouse.down(); await p.mouse.move(area.x + area.width - 80, b.y + 10, { steps: 8 }); await p.mouse.up(); await p.keyboard.press('Escape');
}
const aba = p.locator('.tab:has-text("Layout da Página")');
caso('o Quadro tem a aba Layout da Página', (await aba.count()) === 1);
if (!(await aba.count())) await fim();
await aba.click(); await p.waitForTimeout(200);
const botoes = await p.evaluate(() => ['margens', 'orientacao', 'papel', 'areaImpQ', 'ajustarPagQ'].filter((k) => document.querySelector(`[data-menu-faixa=${k}]`)));
caso('com Margens, Orientação, Tamanho, Área de impressão e Ajustar à página', botoes.length === 5, botoes.join(', '));
caso('sem mexer, o quadro não mostra tracejado', (await p.locator('.qd-quebra-folha').count()) === 0);
if (PRINTS) { const r = await p.locator('.ribbon').first().boundingBox(); await p.screenshot({ path: `${PRINTS}/1-aba-layout.png`, clip: { x: r.x, y: r.y, width: Math.min(r.width, 1100), height: r.height } }); }
/* Orientação › Retrato */
await p.click('[data-menu-faixa=orientacao]'); await p.locator('.rb-lista [data-cmd="impressao.orientacao|retrato"]').click(); await p.waitForTimeout(300);
caso('Orientação › Retrato mostra a folha tracejada no quadro', (await p.locator('.qd-quebra-folha').count()) >= 1);
await p.click('[data-menu-faixa=orientacao]');
caso('a lista marca Retrato', (await p.locator('.rb-lista [data-cmd="impressao.orientacao|retrato"][aria-checked=true]').count()) === 1);
await p.keyboard.press('Escape');
/* Ajustar › Tamanho real: várias folhas */
await p.click('[data-menu-faixa=ajustarPagQ]'); await p.locator('.rb-lista [data-cmd="impressao.ajustar|real"]').click(); await p.waitForTimeout(300);
const nFolhas = await p.locator('.qd-quebra-folha').count();
caso('Tamanho real: o tracejado mostra onde cada folha acaba', nFolhas >= 2, `${nFolhas} folhas`);
if (PRINTS) { await p.click('.tab:has-text("Exibir")'); await p.locator('[data-cmd="exibir.ajustar"]').first().click(); await p.waitForTimeout(500); const a = await p.locator('.qd-area').boundingBox(); await p.screenshot({ path: `${PRINTS}/2-quebras-tamanho-real.png`, clip: { x: a.x, y: a.y, width: a.width, height: Math.min(a.height, 470) } }); await aba.click(); }
/* Área de impressão com um item escolhido */
await p.locator('.qi-postit').nth(0).click(); await p.waitForTimeout(150);
await p.click('[data-menu-faixa=areaImpQ]'); await p.locator('.rb-lista [data-cmd="impressao.area"]').click(); await p.waitForTimeout(300);
caso('Definir área de impressão marca a área no quadro', (await p.locator('.qd-quebra-area').count()) === 1);
await p.keyboard.press('Escape'); await p.mouse.click(5, 790);
if (PRINTS) { const a = await p.locator('.qd-area').boundingBox(); await p.screenshot({ path: `${PRINTS}/3-area-de-impressao.png`, clip: { x: a.x, y: a.y, width: a.width, height: Math.min(a.height, 470) } }); }
/* o PDF sai só com a área */
await p.click('.tab:has-text("Arquivo")'); await p.locator('[data-cmd="arquivo.exportarPDF"]').first().click(); await p.waitForSelector('[data-imprimir-quadro]');
caso('a janela avisa que há área de impressão', (await p.locator('[data-impq-area]').count()) === 1);
const pag = await p.locator('[data-impq-pag]').textContent();
const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-impq-pdf]').click()]);
const pdf = readFileSync(await dl.path()).toString('latin1');
caso('com a área, o PDF tem as folhas da área (1 post-it em tamanho real = 1 folha)', pag === '1 de 1' && (pdf.match(/\/Type \/Page[^s]/g) || []).length === 1, pag);
await p.keyboard.press('Escape');
/* Limpar a área e Exibir › Quebras de página */
await aba.click(); await p.click('[data-menu-faixa=areaImpQ]'); await p.locator('.rb-lista [data-cmd="impressao.limparArea"]').click(); await p.waitForTimeout(300);
caso('Limpar área de impressão tira a área', (await p.locator('.qd-quebra-area').count()) === 0 && (await p.locator('.qd-quebra-folha').count()) >= 2);
await p.locator('[data-cmd="exibir.quebras"]').first().click(); await p.waitForTimeout(200);
caso('Quebras de página desliga o tracejado', (await p.locator('.qd-quebras').count()) === 0);
await p.locator('[data-cmd="exibir.quebras"]').first().click(); await p.waitForTimeout(200);
caso('e liga de novo', (await p.locator('.qd-quebras').count()) === 1);
/* desfazer tudo volta ao padrão: sem tracejado */
for (let i = 0; i < 4; i++) { await p.keyboard.press('Control+z'); await p.waitForTimeout(200); }
caso('Ctrl+Z volta ao padrão (sem tracejado)', (await p.locator('.qd-quebra-folha').count()) === 0);
await fim();
