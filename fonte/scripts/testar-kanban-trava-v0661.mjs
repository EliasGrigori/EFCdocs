/* Vértice Docs v0.6.61 — post-it travado também no Kanban: mostra o cadeado, não muda de coluna arrastando e a lixeira
   não diz "Post-it excluído." sem excluir (relatório de 25/11). Falha na v0.6.60 e passa na v0.6.61.
   Uso: node scripts/testar-kanban-trava-v0661.mjs <endereço> [pasta-dos-prints] */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const ta = () => p.locator('textarea.qd-edita');
for (const t of ['Travado', 'Solto']) { await p.keyboard.press('Escape'); await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape'); }
await p.locator('.qi', { hasText: 'Travado' }).first().click(); await p.waitForTimeout(100);
await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.travar"]').first().click(); await p.waitForTimeout(250);
await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(300);
const card = () => p.locator('.kb-card', { hasText: 'Travado' }).first();
const colDe = (t) => p.locator('.kb-card', { hasText: t }).first().evaluate((e) => [...document.querySelectorAll('.kb-col')].findIndex((k) => k.contains(e)));
caso('Kanban: o travado mostra o cadeado', (await card().locator('[data-trava]').count()) === 1);
caso('Kanban: o travado não tem a alça de arrastar', (await card().locator('.kb-alca').count()) === 0);
const col0 = await colDe('Travado');
const cols = await p.locator('.kb-col').all();
const destino = await cols[Math.min(1, cols.length - 1)].boundingBox();
const b = await card().boundingBox();
await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.mouse.move(destino.x + destino.width / 2, destino.y + 120, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(300);
caso('Kanban: arrastar o travado não muda a coluna', (await colDe('Travado')) === col0, `${col0} → ${await colDe('Travado')}`);
await card().click(); await p.waitForTimeout(150);
caso('Kanban: o travado escolhido não mostra a lixeira', (await card().locator('.kb-lixo').count()) === 0);
if (PRINTS) await p.locator('.kb-col').first().screenshot({ path: `${PRINTS}/1-kanban-travado.png` });
await p.keyboard.press('Delete'); await p.waitForTimeout(300);
const corpo = await p.locator('body').innerText();
caso('Kanban: Delete no travado não exclui e avisa que está travado', (await p.locator('.kb-card', { hasText: 'Travado' }).count()) === 1 && /travado/i.test(corpo) && !/Post-it excluído/.test(corpo));
/* o solto continua livre */
const s0 = await colDe('Solto'), bs = await p.locator('.kb-card', { hasText: 'Solto' }).first().boundingBox();
await p.mouse.move(bs.x + bs.width - 14, bs.y + 12); await p.mouse.down(); await p.mouse.move(destino.x + destino.width / 2, destino.y + 120, { steps: 12 }); await p.mouse.up(); await p.waitForTimeout(300);
caso('Kanban: o post-it solto ainda muda de coluna arrastando', (await colDe('Solto')) !== s0, `${s0} → ${await colDe('Solto')}`);
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
