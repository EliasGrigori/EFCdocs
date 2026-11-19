/* Vértice Docs — v0.6.28: trava de toque acidental em imagens e gráficos da planilha (pedido do Elias em 18/11).
   Toque rápido escolhe; arrastar o dedo rola a planilha (com embalo); mover pede segurar meio segundo. O mouse continua igual.
   Gestos de toque de verdade pelo protocolo do Chrome (Input.dispatchTouchEvent). Uso: node scripts/testar-toque-objeto.mjs <endereço> */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME });

async function abrir(viewport, toque) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: toque, reducedMotion: 'no-preference' });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  const cdp = await ctx.newCDPSession(p);
  const cel = async (r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(80); };
  await p.goto(BASE + '#/planilha'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
  await cel('A1'); for (const t of ['Ponto', 'Rede 1', 'Rede 2', 'Poço', 'Caixa']) { await p.keyboard.type(t); await p.keyboard.press('Enter'); }
  await cel('B1'); for (const t of ['Cloro', '0,4', '1,2', '0,8', '2,5']) { await p.keyboard.type(t); await p.keyboard.press('Enter'); }
  await cel('A1:B5'); await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.grafico"]').first().click();
  await p.waitForSelector('[data-grafico-janela]'); await p.click('[data-gr-aplicar]'); await p.waitForSelector('.pl-obj-gr'); await p.waitForTimeout(400);
  await cel('H40'); await p.waitForTimeout(150); await cel('A1'); await p.waitForTimeout(200);
  if (viewport.width !== 1366) { await p.setViewportSize(viewport); await p.waitForTimeout(400); await cel('A1'); await p.waitForTimeout(200); }
  return { ctx, p, cdp };
}
const toque = (cdp, type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
async function arrastar(cdp, p, x, y, dx, dy, { segurar = 0, passos = 12, ms = 12 } = {}) {
  await toque(cdp, 'touchStart', x, y);
  if (segurar) await p.waitForTimeout(segurar);
  for (let i = 1; i <= passos; i++) { await toque(cdp, 'touchMove', x + dx * i / passos, y + dy * i / passos); await p.waitForTimeout(ms); }
  await toque(cdp, 'touchEnd', x + dx, y + dy);
}
const caixa = (p) => p.locator('.pl-obj-gr').boundingBox();
const rolado = (p) => p.locator('.pl-rol').evaluate((e) => ({ x: e.scrollLeft, y: e.scrollTop }));

await caso('toque rápido no gráfico só escolhe (não sai do lugar)', async () => {
  const { ctx, p, cdp } = await abrir({ width: 1366, height: 768 }, true);
  const r0 = await caixa(p);
  await toque(cdp, 'touchStart', r0.x + r0.width / 2, r0.y + r0.height / 2); await p.waitForTimeout(60); await toque(cdp, 'touchEnd');
  await p.waitForTimeout(250);
  const r1 = await caixa(p);
  certo(await p.locator('.pl-obj-gr.sel').count() === 1, 'não escolheu');
  certo(Math.abs(r1.x - r0.x) < 1 && Math.abs(r1.y - r0.y) < 1, 'saiu do lugar');
  certo((await p.locator('.toast').allInnerTexts()).some((t) => /segure o dedo meio segundo/.test(t)), 'sem a dica de como mover');
  await ctx.close();
});

await caso('arrastar o dedo em cima do gráfico rola a planilha e o gráfico continua na mesma célula', async () => {
  const { ctx, p, cdp } = await abrir({ width: 1366, height: 768 }, true);
  const r0 = await caixa(p), s0 = await rolado(p);
  await arrastar(cdp, p, r0.x + r0.width / 2, r0.y + r0.height / 2, 0, -120, { passos: 12, ms: 45 });
  await p.waitForTimeout(900);
  const r1 = await caixa(p), s1 = await rolado(p);
  certo(s1.y - s0.y > 80, 'não rolou: ' + JSON.stringify({ s0, s1 }));
  certo(Math.abs((r1.y + s1.y) - (r0.y + s0.y)) < 2, 'o gráfico mudou de célula: ' + JSON.stringify({ r0: r0.y, r1: r1.y, s0: s0.y, s1: s1.y }));
  await ctx.close();
});

await caso('rolar pelo gráfico tem embalo: soltando rápido, a planilha ainda anda um pouco e freia', async () => {
  const { ctx, p, cdp } = await abrir({ width: 1366, height: 768 }, true);
  const r0 = await caixa(p);
  await arrastar(cdp, p, r0.x + r0.width / 2, r0.y + r0.height / 2, 0, -160, { passos: 6, ms: 8 });
  const sSolta = await rolado(p); await p.waitForTimeout(700); const sFim = await rolado(p);
  certo(sFim.y - sSolta.y > 20, 'sem embalo: ' + JSON.stringify({ sSolta, sFim }));
  await ctx.close();
});

await caso('segurar o dedo meio segundo e arrastar move o gráfico (a planilha não rola)', async () => {
  const { ctx, p, cdp } = await abrir({ width: 1366, height: 768 }, true);
  const r0 = await caixa(p), s0 = await rolado(p);
  await arrastar(cdp, p, r0.x + r0.width / 2, r0.y + r0.height / 2, 130, 0, { segurar: 650 });
  await p.waitForTimeout(400);
  const r1 = await caixa(p), s1 = await rolado(p);
  certo(r1.x - r0.x > 60, 'não moveu: ' + (r1.x - r0.x));
  certo(Math.abs(s1.y - s0.y) < 1 && Math.abs(s1.x - s0.x) < 1, 'rolou junto');
  await ctx.close();
});

await caso('celular (390 px): arrastar o dedo pelo gráfico rola; toque rápido escolhe', async () => {
  const { ctx, p, cdp } = await abrir({ width: 390, height: 844 }, true);
  const r0 = await caixa(p), s0 = await rolado(p);
  await arrastar(cdp, p, Math.min(r0.x + 40, 360), r0.y + 40, 0, -100, { passos: 12, ms: 45 });
  await p.waitForTimeout(900);
  const s1 = await rolado(p);
  certo(s1.y - s0.y > 60, 'não rolou no celular: ' + JSON.stringify({ s0, s1 }));
  const r1 = await caixa(p);
  await toque(cdp, 'touchStart', Math.min(r1.x + 30, 360), r1.y + r1.height - 40); await p.waitForTimeout(60); await toque(cdp, 'touchEnd'); await p.waitForTimeout(250);
  certo(await p.locator('.pl-obj-gr.sel').count() === 1, 'toque não escolheu');
  await ctx.close();
});

await caso('botão que leva a outra aba: arrastar o dedo em cima dele rola (não vai nem sai do lugar); toque rápido vai', async () => {
  const { ctx, p, cdp } = await abrir({ width: 1366, height: 768 }, true);
  await p.click('.pl-aba-nova'); await p.waitForTimeout(250); await p.locator('.pl-aba').first().click(); await p.waitForTimeout(200);
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('E14'); await p.locator('.pl-nome').press('Enter');
  await p.click('.tabs .tab:has-text("Inserir")'); await p.locator('[data-cmd="inserir.botao"]').first().click(); await p.waitForSelector('[data-bt-ok]');
  await p.locator('[data-bt-nome]').fill('Ir para o resumo'); await p.locator('[data-bt-ok]').click(); await p.waitForSelector('[data-obj-tipo=botao]');
  await p.keyboard.press('Escape'); await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('A1'); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(200);
  const b0 = await p.locator('[data-obj-tipo=botao]').boundingBox(), s0 = await rolado(p);
  await arrastar(cdp, p, b0.x + b0.width / 2, b0.y + b0.height / 2, 0, -90, { passos: 10, ms: 45 }); await p.waitForTimeout(800);
  const s1 = await rolado(p), b1 = await p.locator('[data-obj-tipo=botao]').boundingBox();
  certo((await p.locator('.pl-aba.on').innerText()).includes('Planilha1'), 'o arrasto levou para a outra aba');
  certo(s1.y - s0.y > 50 && Math.abs((b1.y + s1.y) - (b0.y + s0.y)) < 2, 'não rolou ou o botão saiu do lugar: ' + JSON.stringify({ s0, s1, b0: b0.y, b1: b1.y }));
  await toque(cdp, 'touchStart', b1.x + b1.width / 2, b1.y + b1.height / 2); await p.waitForTimeout(60); await toque(cdp, 'touchEnd'); await p.waitForTimeout(450);
  certo((await p.locator('.pl-aba.on').innerText()).includes('Planilha2'), 'o toque rápido não levou para a outra aba');
  await ctx.close();
});

await caso('mouse: arrastar move o gráfico direto, como antes', async () => {
  const { ctx, p } = await abrir({ width: 1366, height: 768 }, false);
  const r0 = await caixa(p);
  await p.mouse.move(r0.x + r0.width / 2, r0.y + r0.height / 2); await p.mouse.down(); await p.mouse.move(r0.x + r0.width / 2 + 120, r0.y + r0.height / 2, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(300);
  const r1 = await caixa(p);
  certo(r1.x - r0.x > 60, 'mouse não moveu: ' + (r1.x - r0.x));
  await ctx.close();
});

console.log(erros.length ? 'Console com erro: ' + erros.slice(0, 3).join(' | ') : 'Console sem erros.');
console.log(`${ok} de ${ok + falhas} conferências do toque em objetos passaram.`);
await nav.close();
process.exit(falhas || erros.length ? 1 : 0);
