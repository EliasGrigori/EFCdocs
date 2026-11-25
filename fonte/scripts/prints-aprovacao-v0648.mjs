/* Vértice Docs — prints da página de aprovação da v0.6.48 (Quadro: D-76 fundo de bolinhas, D-77 código na forma
   Início/Fim, D-78 moldura de seleção). Uso: node scripts/prints-aprovacao-v0648.mjs <ANTES> <DEPOIS> <pasta>.
   Quadro novo com itens inventados. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [ANTES, DEPOIS, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
for (const [lado, base] of [['antes', ANTES], ['depois', DEPOIS]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  await p.goto(base + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  const escrever = async (t) => { const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); };
  for (const [c, t] of [['inserir.inicio', 'Início'], ['inserir.processo', 'Conferir lote'], ['inserir.postit', 'Ligar para o cliente'], ['inserir.decisao', 'Aprovado?'], ['inserir.texto', 'ANA']]) {
    await p.locator(`[data-cmd="${c}"]`).first().click(); await escrever(t);
  }
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  const ini = await p.locator('.qi-inicio').boundingBox();
  /* D-76: o fundo perto da forma Início (o quadro já está deslocado 60 px, o que separa as duas camadas) */
  await p.screenshot({ path: `${PASTA}/1-fundo-${lado}.png`, clip: { x: ini.x - 200, y: ini.y - 70, width: 180, height: 110 } });
  /* D-77 */
  await p.screenshot({ path: `${PASTA}/2-inicio-${lado}.png`, clip: { x: ini.x - 12, y: ini.y - 12, width: ini.width + 24, height: ini.height + 24 } });
  /* D-78: uma forma escolhida e tudo escolhido */
  await p.locator('.qi-processo').click(); await p.waitForTimeout(250);
  const pr = await p.locator('.qi-processo').boundingBox();
  await p.screenshot({ path: `${PASTA}/3-uma-escolhida-${lado}.png`, clip: { x: pr.x - 40, y: pr.y - 40, width: pr.width + 80, height: pr.height + 80 } });
  await p.keyboard.press('Escape'); await p.keyboard.press('Control+a'); await p.waitForTimeout(300);
  const area = await p.locator('.qd-area').boundingBox();
  await p.screenshot({ path: `${PASTA}/4-todas-escolhidas-${lado}.png`, clip: { x: ini.x - 220, y: ini.y - 140, width: 720, height: 380 } });
  await ctx.close();
}
await nav.close(); console.log('prints em ' + PASTA);
