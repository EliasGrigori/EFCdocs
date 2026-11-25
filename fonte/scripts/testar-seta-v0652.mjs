/* Vértice Docs v0.6.52 — seta curva suave e texto da seta na etiqueta ou acompanhando a linha (tela).
   Quadro novo com itens inventados. Falha na v0.6.51 e passa na v0.6.52. Uso: node scripts/testar-seta-v0652.mjs <endereço> */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
const fim = async () => { caso('sem erro na página', erros.length === 0, erros.join(' | ')); await nav.close(); console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo'); process.exit(falhas ? 1 : 0); };
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
for (const t of ['Conferir lote', 'Embalar']) {
  await p.locator('[data-cmd="inserir.processo"]').first().click();
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
}
/* ligar o primeiro ao segundo */
await p.locator('.qi-processo').nth(0).click(); await p.waitForTimeout(150);
await p.locator('button[title^="Ligar com seta"]').first().click();
await p.locator('.qi-processo').nth(1).click(); await p.waitForTimeout(300);
const nSetas = await p.locator('.qd-seta').count();
caso('seta criada entre os dois itens', nSetas === 1);
if (!nSetas) await fim();
const pedacos = () => p.locator('.qd-seta-linha').first().evaluate((e) => (e.getAttribute('d').match(/L/g) || []).length);
/* escolher a seta e trocar o estilo pelo botão da barra até a curva */
const toque = await p.locator('.qd-seta-toque').first().evaluate((e) => { const l = e.getTotalLength(); const q = e.getPointAtLength(l * 0.3); const m = e.getScreenCTM(); return { x: q.x * m.a + m.e, y: q.y * m.d + m.f }; });
await p.mouse.click(toque.x, toque.y); await p.waitForTimeout(200);
let achou = false;
for (let i = 0; i < 3 && !achou; i++) {
  const b = p.locator('button[title="Seta curva"]');
  if (await b.count()) { await b.first().click(); await p.waitForTimeout(250); achou = true; break; }
  const outro = p.locator('button[title="Seta reta"], button[title="Seta em cotovelo"]').first();
  if (await outro.count()) { await outro.click(); await p.waitForTimeout(250); } else break;
}
caso('botão "Seta curva" na barra da seta', achou);
const n = await pedacos();
caso('a seta curva é desenhada com muitos pedacinhos (lisa)', n >= 30, `${n} pedaços`);
/* texto na seta */
await p.locator('button[title^="Escrever na seta"]').first().click();
const ed = p.locator('.qd-edita, input.qd-edita-seta, textarea').last(); await ed.fill('Sim, segue'); await ed.press('Enter'); await p.waitForTimeout(300);
caso('texto na etiqueta (padrão)', (await p.locator('.qd-rotulo:not(.qd-rotulo-linha) text').count()) === 1);
await p.mouse.click(toque.x, toque.y); await p.waitForTimeout(200);
const bModo = p.locator('button[title="Texto acompanhando a linha"]');
caso('botão "Texto acompanhando a linha"', (await bModo.count()) === 1);
if (await bModo.count()) {
  await bModo.first().click(); await p.waitForTimeout(250);
  const tp = await p.locator('.qd-rotulo-linha textPath').count();
  caso('o texto passa a acompanhar a linha', tp === 1 && (await p.locator('.qd-rotulo-linha textPath').textContent()) === 'Sim, segue');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
  caso('Ctrl+Z volta para a etiqueta', (await p.locator('.qd-rotulo-linha').count()) === 0 && (await p.locator('.qd-rotulo text').count()) === 1);
}
await fim();
