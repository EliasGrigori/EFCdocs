/* Vértice Docs v0.6.59 — arrumar itens no Quadro: alinhar, distribuir e travar (Organizar › Arrumar).
   Quadro novo com itens inventados. Falha na v0.6.58 (não há o grupo Arrumar) e passa na v0.6.59.
   Uso: node scripts/testar-arrumar-v0659.mjs <endereço> [pasta-dos-prints] */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
const foto = async (nome) => { if (PRINTS) await p.locator('.qd-mundo >> xpath=..').first().screenshot({ path: `${PRINTS}/${nome}.png` }); };
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const ta = () => p.locator('textarea.qd-edita');
for (const t of ['Coleta', 'Análise', 'Laudo']) { await p.keyboard.press('Escape'); await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape'); }
/* espalha os três em alturas diferentes, arrastando */
const caixa = async (t) => p.locator('.qi', { hasText: t }).first().boundingBox();
const area = await p.locator('.qd-mundo >> xpath=..').first().boundingBox();
for (const [t, ax, ay] of [['Coleta', 0.18, 0.35], ['Análise', 0.42, 0.6], ['Laudo', 0.78, 0.25]]) { /* lugares fixos na área, bem separados */
  const b = await caixa(t); await p.mouse.move(b.x + b.width / 2, b.y + 10); await p.mouse.down(); await p.mouse.move(area.x + area.width * ax, area.y + area.height * ay, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(150);
}
const pos = () => p.evaluate(() => [...document.querySelectorAll('.qi')].map((e) => ({ t: e.textContent.replace(/Q-\d+/, '').trim(), x: parseFloat(e.style.left), y: parseFloat(e.style.top), w: parseFloat(e.style.width) })));
await p.keyboard.press('Escape'); await p.keyboard.press('Control+a'); await p.waitForTimeout(150);
await p.click('.tab:has-text("Organizar")');
const tem = await p.locator('[data-menu-faixa=alinharQ]').count();
caso('Organizar tem o grupo Arrumar (Alinhar, Distribuir, Travar)', tem === 1 && (await p.locator('[data-menu-faixa=distribuirQ]').count()) === 1 && (await p.locator('[data-cmd="organizar.travar"]').count()) >= 1);
if (tem) {
  await foto('1-antes-de-alinhar');
  await p.click('[data-menu-faixa=alinharQ]'); await p.waitForTimeout(100);
  if (PRINTS) await p.locator('.rb-lista').screenshot({ path: `${PRINTS}/2-lista-alinhar.png` });
  await p.locator('.rb-lista [data-cmd="organizar.alinhar|topo"]').click(); await p.waitForTimeout(200);
  let ps = await pos();
  caso('Alinhar em cima: os três ficam na mesma altura', ps.every((q) => q.y === ps[0].y), ps.map((q) => q.y).join(' '));
  await p.click('[data-menu-faixa=distribuirQ]'); await p.locator('.rb-lista [data-cmd="organizar.distribuir|h"]').click(); await p.waitForTimeout(200);
  ps = (await pos()).sort((a, b) => a.x - b.x);
  const vaos = [ps[1].x - ps[0].x - ps[0].w, ps[2].x - ps[1].x - ps[1].w];
  caso('Distribuir na horizontal: o mesmo espaço entre eles, sem encavalar', Math.abs(vaos[0] - vaos[1]) <= 1 && vaos[0] > 0, vaos.join(' e '));
  await foto('3-alinhados-e-distribuidos');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(150);
  ps = (await pos()).sort((a, b) => a.x - b.x);
  caso('Ctrl+Z desfaz o distribuir', Math.abs((ps[1].x - ps[0].x - ps[0].w) - (ps[2].x - ps[1].x - ps[1].w)) > 1);
  await p.keyboard.press('Control+y'); await p.waitForTimeout(150);
  /* travar */
  await p.keyboard.press('Escape'); await p.locator('.qi', { hasText: 'Análise' }).first().click(); await p.waitForTimeout(120);
  await p.locator('[data-cmd="organizar.travar"]').first().click(); await p.waitForTimeout(250);
  caso('Travar: aparece o cadeado no item', (await p.locator('.qi', { hasText: 'Análise' }).locator('[data-trava]').count()) === 1);
  caso('Travar: o botão fica marcado e as alças de tamanho somem', (await p.locator('[data-cmd="organizar.travar"]').first().getAttribute('aria-pressed')) === 'true' && (await p.locator('.qd-alca, [data-alca]').count()) === 0);
  await foto('4-travado');
  const antes = await caixa('Análise');
  await p.mouse.move(antes.x + antes.width / 2, antes.y + 10); await p.mouse.down(); await p.mouse.move(antes.x + 200, antes.y + 150, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
  const depois = await caixa('Análise');
  caso('Travado: arrastar não tira do lugar', Math.abs(depois.x - antes.x) < 1 && Math.abs(depois.y - antes.y) < 1);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(150);
  caso('Travado: a seta do teclado não move', Math.abs((await caixa('Análise')).x - antes.x) < 1);
  await p.keyboard.press('Delete'); await p.waitForTimeout(250);
  caso('Travado: Delete não exclui e avisa', (await p.locator('.qi', { hasText: 'Análise' }).count()) === 1 && /travado/i.test(await p.locator('body').innerText()));
  await p.locator('[data-cmd="organizar.travar"]').first().click(); await p.waitForTimeout(250);
  caso('Destravar: o cadeado sai', (await p.locator('[data-trava]').count()) === 0);
}
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
