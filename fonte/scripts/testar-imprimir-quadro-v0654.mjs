/* Vértice Docs v0.6.54 — janela Imprimir e PDF do Quadro: papel, orientação, margens, escala, o que imprimir, cabeçalho
   e rodapé, prévia e guardar no quadro. Quadro novo com itens inventados. Falha na v0.6.53 e passa na v0.6.54.
   Uso: node scripts/testar-imprimir-quadro-v0654.mjs <endereço> */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', acceptDownloads: true });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
const fim = async () => { caso('sem erro na página', erros.length === 0, erros.join(' | ')); await nav.close(); console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo'); process.exit(falhas ? 1 : 0); };
const cmd = async (id) => { const b = p.locator(`[data-cmd="${id}"]`).first(); if (!(await b.isVisible().catch(() => false))) await p.click('.tab:has-text("Arquivo")'); await p.locator(`[data-cmd="${id}"]`).first().click(); };
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
for (const t of ['Receber a fruta', 'Lavar e selecionar', 'Embalar', 'Conferir a balança']) {
  await p.locator('[data-cmd="inserir.postit"]').first().click();
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
}
/* espalha o quadro na largura, para o tamanho real precisar de mais de uma folha */
{
  const area = await p.locator('.qd-area').boundingBox();
  const b = await p.locator('.qi-postit').nth(3).boundingBox();
  await p.mouse.move(b.x + 20, b.y + 10); await p.mouse.down(); await p.mouse.move(area.x + area.width - 60, b.y + 10, { steps: 8 }); await p.mouse.up();
  await p.keyboard.press('Escape');
}
await cmd('arquivo.exportarPDF');
await p.waitForSelector('[data-imprimir-quadro]', { timeout: 4000 }).catch(() => {});
const abriu = await p.locator('[data-imprimir-quadro]').count();
caso('Exportar PDF do quadro abre a janela Imprimir e PDF', abriu === 1);
if (!abriu) await fim();
await p.waitForTimeout(600);
const forma = () => p.locator('[data-impq-previa]').evaluate((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, img: !!e.querySelector('img[src^="data:image"]') }; });
let f = await forma();
caso('prévia com a folha deitada (padrão, como antes) e o quadro desenhado', f.w > f.h && f.img, JSON.stringify(f));
await p.locator('[data-impq-orient=retrato]').click(); await p.waitForTimeout(500);
f = await forma();
caso('Retrato deixa a folha em pé na prévia', f.h > f.w, JSON.stringify(f));
await p.locator('[data-impq-escala]').selectOption('real'); await p.waitForTimeout(500);
const pagReal = await p.locator('[data-impq-pag]').textContent();
caso('Tamanho real divide o quadro largo em mais de uma folha', /de [2-9]/.test(pagReal), pagReal);
/* baixar o PDF com retrato e tamanho real */
let [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-impq-pdf]').click()]);
let pdf = readFileSync(await dl.path()).toString('latin1');
const nPag = (pdf.match(/\/Type \/Page[^s]/g) || []).length;
caso('o PDF sai em A4 em pé', pdf.includes('/MediaBox [0 0 595.28 841.89]'));
caso('o PDF tem as mesmas folhas da prévia', String(nPag) === pagReal.split(' de ')[1], `${nPag} folhas no PDF · prévia ${pagReal}`);
/* Ofício, sem cabeçalho */
await p.locator('[data-impq-escala]').selectOption('pagina');
await p.locator('[data-impq-papel]').selectOption('oficio');
await p.locator('[data-impq-cabrod]').uncheck(); await p.waitForTimeout(300);
[dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-impq-pdf]').click()]);
pdf = readFileSync(await dl.path()).toString('latin1');
caso('papel Ofício', pdf.includes('/MediaBox [0 0 612 1008]'));
caso('sem cabeçalho e rodapé, o PDF não escreve o nome nem a origem', !pdf.includes('Post-its') && (pdf.match(/\/Type \/Page[^s]/g) || []).length === 1);
/* salvar no quadro e conferir que volta igual */
await p.locator('[data-impq-salvar]').click(); await p.waitForTimeout(300);
await cmd('arquivo.exportarPDF'); await p.waitForSelector('[data-imprimir-quadro]');
const guardado = await p.evaluate(() => ({ papel: document.querySelector('[data-impq-papel]').value, retrato: document.querySelector('[data-impq-orient=retrato]').getAttribute('aria-pressed'), cab: document.querySelector('[data-impq-cabrod]').checked }));
caso('Salvar no quadro guarda as escolhas', guardado.papel === 'oficio' && guardado.retrato === 'true' && !guardado.cab, JSON.stringify(guardado));
await p.keyboard.press('Escape');
await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
await cmd('arquivo.exportarPDF'); await p.waitForSelector('[data-imprimir-quadro]');
const desfeito = await p.evaluate(() => document.querySelector('[data-impq-papel]').value);
caso('Ctrl+Z desfaz o Salvar no quadro', desfeito === 'A4', desfeito);
await p.keyboard.press('Escape');
/* só os itens escolhidos */
await p.locator('.qi-postit').nth(0).click(); await p.waitForTimeout(150);
await cmd('arquivo.exportarPDF'); await p.waitForSelector('[data-imprimir-quadro]');
await p.locator('[data-impq-alvo=escolhidos]').click(); await p.waitForTimeout(400);
const so1 = await p.locator('[data-impq-pag]').textContent();
caso('Itens escolhidos: uma folha só com o item escolhido', so1 === '1 de 1' && (await p.locator('[data-impq-alvo=escolhidos]').textContent()).includes('(1)'), so1);
await p.keyboard.press('Escape');
/* Kanban continua baixando direto */
await p.locator('[role=tab]:has-text("Kanban")').click(); await p.waitForTimeout(300);
const kb = await Promise.race([p.waitForEvent('download', { timeout: 8000 }).then(() => 'baixou'), (async () => { await cmd('arquivo.exportarPDF'); await p.waitForTimeout(7000); return 'não baixou'; })()]);
caso('no Kanban, Exportar PDF continua baixando direto', kb === 'baixou', kb);
await fim();
