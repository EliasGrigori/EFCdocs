/* Vértice Docs — prints da v0.6.54 (janela Imprimir e PDF do Quadro). Uso: node scripts/prints-aprovacao-v0654.mjs <DEPOIS> <pasta>.
   Quadro novo com itens inventados. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [BASE, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 860 }, reducedMotion: 'reduce', deviceScaleFactor: 1.5 });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
for (const [c, t] of [['inserir.inicio', 'Receber a fruta'], ['inserir.processo', 'Lavar e selecionar'], ['inserir.decisao', 'Aprovado?'], ['inserir.processo', 'Embalar'], ['inserir.postit', 'Conferir a balança do packing']]) {
  await p.locator(`[data-cmd="${c}"]`).first().click();
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
}
const abrir = async () => { await p.click('.tab:has-text("Arquivo")'); await p.locator('[data-cmd="arquivo.exportarPDF"]').first().click(); await p.waitForSelector('[data-imprimir-quadro]'); await p.waitForTimeout(900); };
await abrir();
await p.locator('.qd-imp').screenshot({ path: `${PASTA}/1-janela-padrao.png` });
await p.locator('[data-impq-orient=retrato]').click(); await p.waitForTimeout(800);
await p.locator('.qd-imp').screenshot({ path: `${PASTA}/2-janela-retrato.png` });
await p.locator('[data-impq-escala]').selectOption('real'); await p.locator('[data-impq-orient=paisagem]').click(); await p.waitForTimeout(800);
await p.locator('.qd-imp').screenshot({ path: `${PASTA}/3-janela-tamanho-real.png` });
await nav.close(); console.log('prints em ' + PASTA);
