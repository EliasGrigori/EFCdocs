/* Vértice Docs — prints da v0.6.29 (Ctrl+Shift+↓ na tabela; curtose e assimetria). Dados inventados.
   Uso: node scripts/prints-aprovacao-v0629.mjs <HOJE> <PROPOSTA> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME });
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  const cel = async (r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(80); };
  const dig = async (r, l) => { await cel(r); for (const t of l) { if (t !== '') await p.keyboard.type(t); await p.keyboard.press('Enter'); } };
  await p.goto(base + '#/planilha'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
  await dig('A1', ['Equipamento', 'Balança 1', 'Balança 2', 'Estufa', 'pHmetro', 'Termômetro', 'Bureta', 'Pipeta', 'Proveta', 'Béquer']);
  await dig('B1', ['Calibração', '19/10/2026', '20/10/2026', '16/09/2026', '16/09/2026', '15/09/2026']);
  await dig('C1', ['Dias', '152', '153', '119', '29', '28']);
  await dig('D1', ['Situação', 'Em dia', 'Em dia', 'Em dia', 'Em dia', 'Em dia', 'Desativada', 'Desativada', 'Desativada', 'Desativada']);
  await cel('A1:D10'); await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.tabela"]').first().click();
  await p.waitForSelector('.pl-jtab'); await p.locator('[data-tab-ok]').click(); await p.waitForTimeout(400);
  await cel('C2'); await p.keyboard.press('Control+Shift+ArrowDown'); await p.waitForTimeout(200); await p.keyboard.press('Control+Shift+ArrowDown'); await p.waitForTimeout(400);
  const cv = await p.locator('.pl-cv').boundingBox();
  await p.screenshot({ path: `${PASTA}/salto-${lado}.png`, clip: { x: cv.x, y: cv.y, width: 560, height: 300 } });
  if (lado === 'prop') {
    await dig('F1', ['pH', '7,1', '7,4', '6,9', '7', '7,2', '7,3', '7,1', '6,8', '7,5', '6,6']);
    await cel('F1:F11'); await p.click('.tabs .tab:has-text("Dados")'); await p.locator('[data-cmd="dados.estatistica"]').first().click();
    await p.waitForSelector('[data-estat-janela]'); await p.waitForTimeout(250);
    await p.locator('.janela').first().screenshot({ path: `${PASTA}/estat-prop.png` });
  }
  await ctx.close(); console.log(lado, 'ok');
}
await nav.close();
