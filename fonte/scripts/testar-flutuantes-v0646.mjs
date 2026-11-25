/* Vértice Docs — v0.6.46: o que flutua sobre a grade ao rolar.
   D-72/D-74: a lista suspensa fecha quando a planilha rola (subia por cima das linhas congeladas até perto do fx).
   D-75: imagem que começa nas linhas congeladas e passa da linha fixa aparece inteira; ao rolar, a parte de cima fica e a
   de baixo rola (antes a de baixo sumia). Uso: node scripts/testar-flutuantes-v0646.mjs <endereço>. Amostra inventada. */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0646.xlsx', import.meta.url));
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME, env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
const ir = async (ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(200); };
await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 60000 });
await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv', { timeout: 60000 }); await p.waitForTimeout(1200);
const cv = await p.locator('.pl-cv').boundingBox();
const rolar = async (dy) => { await p.mouse.move(cv.x + 800, cv.y + 450); await p.mouse.wheel(0, dy); await p.waitForTimeout(500); };

await caso('D-72: a lista aberta (Alt+↓) continua aberta parada e fecha quando a planilha rola', async () => {
  await ir('C12'); await p.keyboard.press('Alt+ArrowDown'); await p.waitForTimeout(700);
  certo(await p.locator('[data-lista]').count() === 1, 'a lista não abriu (ou fechou sozinha)');
  await rolar(160);
  certo(await p.locator('[data-lista]').count() === 0, 'a lista continuou aberta depois de rolar');
  await rolar(-400);
});
/* D-74 (célula com lista + fx + rolar) é o mesmo defeito do D-72: o caso de cima cobre (clicar no fx já fechava a lista antes) */
await caso('D-75: a imagem que começa em D2 (linhas congeladas) aparece inteira, sem rolar', async () => {
  await ir('A1'); await rolar(-600);
  const vis = await p.evaluate(() => [...document.querySelectorAll('.pl-obj-img')].map((e) => { const r = e.getBoundingClientRect(); const cp = getComputedStyle(e).clipPath; const n = (/inset\(([^)]*)\)/.exec(cp) || [0, ''])[1].split(/\s+/).filter(Boolean).map(parseFloat); const [cT = 0, , cB = n.length >= 3 ? n[2] : n.length ? n[0] : 0] = n; return { y: r.y, h: r.height - cT - cB }; }));
  const total = vis.reduce((s, v) => s + v.h, 0);
  certo(Math.abs(total - 140) <= 2, `altura que aparece: ${Math.round(total)} de 140 (pedaços: ${vis.length})`);
});
await caso('D-75: ao rolar, a parte de cima fica parada e a de baixo rola (como no Excel)', async () => {
  const antes = await p.locator('.pl-obj-img').first().boundingBox();
  await rolar(40);
  const pedacos = await p.evaluate(() => [...document.querySelectorAll('.pl-obj-img')].map((e) => Math.round(e.getBoundingClientRect().y)));
  certo(pedacos.includes(Math.round(antes.y)), 'a parte de cima não ficou parada: ' + JSON.stringify([antes.y, pedacos]));
  certo(pedacos.length === 2 && pedacos.some((y) => Math.abs(y - (antes.y - 40)) <= 6), 'a parte de baixo não rolou junto (40 px): ' + JSON.stringify(pedacos));
});
await caso('escolhida, a imagem em dois pedaços tem uma alça de tamanho só', async () => {
  await rolar(-600); await p.locator('.pl-obj-img').first().click({ position: { x: 100, y: 20 } }); await p.waitForTimeout(300);
  certo(await p.locator('.pl-obj-img [data-alca="obj"]').count() === 1, 'alças: ' + await p.locator('.pl-obj-img [data-alca="obj"]').count());
  await p.keyboard.press('Escape');
});
await caso('seta da lista: triângulo sem caixa (aparece ao passar o mouse); a lista abre com animação (e sem animação para quem pediu menos movimento)', async () => {
  await rolar(-600); await ir('C12'); await p.mouse.move(cv.x + 5, cv.y + 5); await p.waitForTimeout(200);
  const repouso = await p.locator('[data-lista-seta]').evaluate((b) => { const s = getComputedStyle(b); return { raio: parseFloat(s.borderTopLeftRadius), fundo: s.backgroundColor, tri: !!b.querySelector('.tri') }; });
  certo(repouso.raio <= 2 && /rgba\(0, 0, 0, 0\)|transparent/.test(repouso.fundo) && repouso.tri, 'parado: ' + JSON.stringify(repouso));
  const s = await p.locator('[data-lista-seta]').boundingBox(); await p.mouse.move(s.x + s.width / 2, s.y + s.height / 2); await p.waitForTimeout(300);
  const sobre = await p.locator('[data-lista-seta]').evaluate((b) => getComputedStyle(b).backgroundColor);
  certo(!/rgba\(0, 0, 0, 0\)|transparent/.test(sobre), 'com o mouse em cima a caixa devia aparecer: ' + sobre);
  await p.mouse.click(s.x + s.width / 2, s.y + s.height / 2); await p.waitForTimeout(100);
  const r = await p.locator('[data-lista]').evaluate((l) => ({ anim: getComputedStyle(l).animationName, menos: matchMedia('(prefers-reduced-motion: reduce)').matches,
    regra: [...document.styleSheets].some((s) => { try { return [...s.cssRules].some((x) => /\.pl-lista\b/.test(x.selectorText || '') && /t-lista-in/.test(x.cssText)); } catch { return false; } }) }));
  certo(r.regra, 'sem a regra de animação da lista'); certo(r.menos ? r.anim === 'none' : r.anim === 't-lista-in', 'animação: ' + JSON.stringify(r)); await p.keyboard.press('Escape');
});
await caso('console sem erro', async () => { certo(!erros.length, erros.slice(0, 2).join(' | ')); });
await nav.close();
console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
