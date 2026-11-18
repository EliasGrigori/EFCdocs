/* Vértice Docs — prints da v0.6.25 (ideias do Grok: circular dados inválidos, estatística descritiva, amostragem). Dados inventados.
   Uso: node scripts/prints-aprovacao-v0625.mjs <endereço HOJE> <endereço PROPOSTA> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME });
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 860 }, reducedMotion: 'reduce', deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  const cel = async (r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(80); };
  const dig = async (r, l) => { await cel(r); for (const t of l) { await p.keyboard.type(t); await p.keyboard.press('Enter'); } };
  const dados = async () => { await p.click('.tabs .tab:has-text("Dados")'); await p.waitForTimeout(150); };
  await p.goto(base + '#/planilha'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
  await dig('A1', ['Ponto de coleta', 'Rede 1', 'Rede 2', 'Poço', 'Caixa d\'água', 'Bebedouro', 'Torneira', 'Filtro', 'Reservatório']);
  await dig('B1', ['Cloro (mg/L)', '0,4', '1,2', '0,8', '2,5', '3', '0,8', '1,1', '0,6']);
  await dig('C1', ['pH', '7,1', '7,4', '6,9', '7', '7,2', '7,3', '7,1', '6,8']);
  await cel('B2:B9'); await dados(); await p.locator('[data-cmd="dados.validacao"]').first().click(); await p.waitForSelector('[data-validacao]');
  await p.selectOption('[data-val-tipo]', 'decimal'); await p.fill('[data-val-f1]', '0,2'); await p.fill('[data-val-f2]', '2'); await p.click('[data-val-aplicar]'); await p.waitForTimeout(200);
  await cel('H14'); await dados();
  const caixa = await p.evaluate(() => { const gs = [...document.querySelectorAll('.rb-g')].filter((g) => g.offsetParent).map((g) => g.getBoundingClientRect()); const t = document.querySelector('.tabs').getBoundingClientRect(); return { y: t.top, fim: Math.max(...gs.map((g) => g.bottom)), dir: Math.max(...gs.map((g) => g.right)) }; });
  await p.screenshot({ path: `${PASTA}/faixa-${lado}.png`, clip: { x: 0, y: caixa.y, width: Math.min(1366, caixa.dir + 16), height: caixa.fim - caixa.y + 4 } });
  if (lado === 'prop') {
    const cv = await p.locator('.pl-cv').boundingBox();
    await p.locator('[data-cmd="dados.circular"]').first().click(); await p.waitForTimeout(300);
    await p.screenshot({ path: `${PASTA}/circulos.png`, clip: { x: cv.x, y: cv.y, width: 440, height: 250 } });
    await p.locator('[data-cmd="dados.limparCirculos"]').first().click();
    await cel('A1:C9'); await p.locator('[data-cmd="dados.estatistica"]').first().click(); await p.waitForSelector('[data-estat-janela]'); await p.waitForTimeout(250);
    await p.locator('.janela').first().screenshot({ path: `${PASTA}/estat-janela.png` });
    await p.click('[data-estat-ok]'); await p.waitForTimeout(500); await cel('F20'); await p.waitForTimeout(200);
    await p.screenshot({ path: `${PASTA}/estat-aba.png`, clip: { x: cv.x, y: cv.y, width: 560, height: 360 } });
    await p.locator('.pl-aba:has-text("Planilha1")').click(); await p.waitForTimeout(200);
    await cel('A1:C9'); await dados(); await p.locator('[data-cmd="dados.amostra"]').first().click(); await p.waitForSelector('[data-amostra-janela]');
    await p.fill('[data-amostra-n]', '3'); await p.waitForTimeout(200);
    await p.locator('.janela').first().screenshot({ path: `${PASTA}/amostra-janela.png` });
    await p.click('[data-amostra-ok]'); await p.waitForTimeout(500); await cel('F20'); await p.waitForTimeout(200);
    await p.screenshot({ path: `${PASTA}/amostra-aba.png`, clip: { x: cv.x, y: cv.y, width: 760, height: 220 } });
  }
  await ctx.close();
  console.log(lado, 'ok');
}
await nav.close();
