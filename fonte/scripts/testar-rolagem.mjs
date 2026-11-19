/* Vértice Docs — v0.6.27: rolagem suave (pedido do Elias em 18/11). Mede, quadro a quadro, a posição depois de um clique da
   roda do mouse: na planilha (com e sem linha congelada) e no Quadro. Uso: node scripts/testar-rolagem.mjs <endereço>. */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME });

/** Grava a posição a cada quadro por `ms`, logo depois de girar a roda. ler: texto da função que devolve a posição. */
async function quadros(p, ler, girar, ms = 700) {
  await p.evaluate(([ler, ms]) => { const f = new Function('return ' + ler); globalThis.__pos = []; const t0 = performance.now(); const passo = () => { globalThis.__pos.push(f()); if (performance.now() - t0 < ms) requestAnimationFrame(passo); }; requestAnimationFrame(passo); }, [ler, ms]);
  await girar();
  await p.waitForTimeout(ms + 100);
  return p.evaluate(() => globalThis.__pos);
}
const distintos = (v) => new Set(v.map((x) => Math.round(x))).size;

async function planilha(reduzido = false) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: reduzido ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await p.goto(BASE + '#/planilha'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await p.waitForTimeout(300);
  return { ctx, p };
}
const ROL = "document.querySelector('.pl-rol').scrollTop";

await caso('planilha sem congeladas: um clique da roda (100 px) anda em vários quadros e para em 100', async () => {
  const { ctx, p } = await planilha();
  await p.mouse.move(700, 450);
  const v = await quadros(p, ROL, () => p.mouse.wheel(0, 100));
  certo(distintos(v.filter((x) => x > 0 && x < 100)) >= 4, 'pulou: ' + v.map(Math.round).join(','));
  certo(Math.round(v[v.length - 1]) === 100, 'parou em ' + v[v.length - 1]);
  await ctx.close();
});

await caso('planilha com a 1ª linha congelada: anda pixel a pixel e, ao parar, desliza até a linha inteira', async () => {
  const { ctx, p } = await planilha();
  await p.click('.tabs .tab:has-text("Exibir")');
  if (await p.locator('[data-menu-faixa=congelar]').count()) { await p.click('[data-menu-faixa=congelar]'); await p.waitForSelector('.rb-lista [data-cmd="exibir.congelar|linha"]'); }
  await p.locator('[data-cmd="exibir.congelar|linha"]').first().click(); await p.waitForTimeout(300);
  await p.mouse.move(700, 450);
  const v = await quadros(p, ROL, () => p.mouse.wheel(0, 50), 900);
  const meio = v.filter((x) => x > 0 && x < 50);
  certo(distintos(meio) >= 4, 'pulou: ' + v.map(Math.round).join(','));
  certo(meio.some((x) => Math.round(x) % 22 !== 0), 'só parou em linhas inteiras durante a rolagem: ' + v.map(Math.round).join(','));
  const fim = Math.round(v[v.length - 1]);
  certo(fim % 22 === 0 && fim > 0, 'não terminou numa linha inteira (22 px): ' + fim);
  await ctx.close();
});

await caso('planilha com "reduzir movimento": o clique da roda vai direto, sem quadros no meio', async () => {
  const { ctx, p } = await planilha(true);
  await p.mouse.move(700, 450);
  const v = await quadros(p, ROL, () => p.mouse.wheel(0, 100), 400);
  certo(v.filter((x) => x > 0 && x < 100).length === 0, 'animou: ' + v.map(Math.round).join(','));
  await ctx.close();
});

async function quadro(reduzido = false) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: reduzido ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-area'); await p.waitForTimeout(300);
  await p.locator('[data-cmd="inserir.postit"]').first().click(); await p.locator('textarea.qd-edita').fill('Lote 7'); await p.locator('textarea.qd-edita').press('Control+Enter');
  await p.mouse.click(300, 600); await p.waitForTimeout(200);
  return { ctx, p };
}
const MUNDO = "(() => { const m = /translate\\(([-\\d.]+)px, ([-\\d.]+)px\\)/.exec(document.querySelector('.qd-mundo').style.transform); return m ? +m[2] : NaN; })()";

await caso('post-its: um clique da roda desliza o quadro em vários quadros e anda exatos 100 px', async () => {
  const { ctx, p } = await quadro();
  await p.mouse.move(700, 450);
  const v = await quadros(p, MUNDO, () => p.mouse.wheel(0, 100));
  const y0 = v[0], fim = v[v.length - 1];
  certo(distintos(v.filter((x) => x < y0 && x > y0 - 100)) >= 4, 'pulou: ' + v.map(Math.round).join(','));
  certo(Math.abs(fim - (y0 - 100)) < 0.01, `andou ${y0 - fim}`);
  await ctx.close();
});

await caso('post-its: o touchpad (passos pequenos) continua direto, um por um', async () => {
  const { ctx, p } = await quadro();
  await p.mouse.move(700, 450);
  const antes = await p.evaluate((f) => new Function('return ' + f)(), MUNDO);
  await p.mouse.wheel(0, 6); await p.waitForTimeout(50);
  const depois = await p.evaluate((f) => new Function('return ' + f)(), MUNDO);
  certo(Math.abs(antes - depois - 6) < 0.01, `andou ${antes - depois}`);
  await ctx.close();
});

console.log(erros.length ? 'Console com erro: ' + erros.slice(0, 3).join(' | ') : 'Console sem erros.');
console.log(`${ok} de ${ok + falhas} conferências da rolagem passaram.`);
await nav.close();
process.exit(falhas || erros.length ? 1 : 0);
