/* Vértice Docs — prints da página de aprovação da v0.6.50 (cores dos post-its; Exibir › Fundo).
   Uso: node scripts/prints-aprovacao-v0650.mjs <ANTES> <DEPOIS> <pasta>. Quadro novo com itens inventados. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [ANTES, DEPOIS, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const CORES = ['amarelo', 'verde', 'azul', 'rosa', 'laranja', 'lilas', 'cinza', 'branco'];
const NOMES = ['Conferir balança', 'Separar registros', 'Enviar relatório', 'Ligar para o cliente', 'Comprar caixas', 'Revisar plano', 'Arquivar notas', 'Ideias soltas'];
async function quadro(base) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 1.5 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(base + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  for (let i = 0; i < 8; i++) {
    await p.locator('[data-cmd="inserir.postit"]').first().click();
    const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(NOMES[i]); await ta.press('Control+Enter'); await p.waitForTimeout(120);
    await p.keyboard.press('Escape');
  }
  /* pinta cada post-it com uma cor, direto no arquivo pelo menu de cores (o primeiro fica amarelo) */
  for (let i = 1; i < 8; i++) {
    await p.locator('.qi-postit').nth(i).click(); await p.waitForTimeout(120);
    await p.locator('button[title="Cor"]').first().click();
    await p.locator(`.qd-cor[data-cor="${CORES[i]}"]`).click(); await p.waitForTimeout(120); await p.keyboard.press('Escape');
  }
  await p.click('.tab:has-text("Exibir")'); await p.locator('[data-cmd="exibir.ajustar"]').first().click(); await p.waitForTimeout(500);
  return { p, ctx };
}
const area = (p) => p.locator('.qd-area').boundingBox();
{
  const { p, ctx } = await quadro(ANTES);
  const a = await area(p); await p.screenshot({ path: `${PASTA}/1-cores-antes.png`, clip: { x: a.x, y: a.y, width: a.width, height: Math.min(a.height, 430) } });
  await ctx.close();
}
{
  const { p, ctx } = await quadro(DEPOIS);
  const a = await area(p); await p.screenshot({ path: `${PASTA}/1-cores-depois.png`, clip: { x: a.x, y: a.y, width: a.width, height: Math.min(a.height, 430) } });
  await p.locator('[data-cmd="exibir.fundo"]').first().click(); await p.waitForSelector('.qd-jfundo');
  await p.locator('[data-fundo-tipo=quadriculado]').click(); await p.locator('[data-fundo-cor=salvia]').click();
  await p.locator('.qd-jfundo').screenshot({ path: `${PASTA}/2-janela-fundo.png` });
  await p.keyboard.press('Escape');
  for (const [tipo, cor] of [['bolinhas', 'creme'], ['quadriculado', 'salvia'], ['linhas', 'nevoa'], ['liso', 'rosa']]) {
    await p.locator('[data-cmd="exibir.fundo"]').first().click(); await p.waitForSelector('.qd-jfundo');
    await p.locator(`[data-fundo-tipo=${tipo}]`).click(); await p.locator(`[data-fundo-cor=${cor}]`).click(); await p.locator('[data-fundo-aplicar]').click(); await p.waitForTimeout(300);
    const b = await area(p); await p.screenshot({ path: `${PASTA}/3-fundo-${tipo}-${cor}.png`, clip: { x: b.x, y: b.y, width: 640, height: 300 } });
  }
  await p.evaluate(() => { document.body.dataset.theme = 'dark'; }); await p.waitForTimeout(300);
  const b = await area(p); await p.screenshot({ path: `${PASTA}/4-escuro-rosa.png`, clip: { x: b.x, y: b.y, width: 640, height: 300 } });
  await ctx.close();
}
await nav.close(); console.log('prints em ' + PASTA);
