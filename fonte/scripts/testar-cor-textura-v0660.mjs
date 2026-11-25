/* Vértice Docs v0.6.60 — D-85: ao mudar a cor do post-it, a textura (amassado, mancha de café, ponta dobrada) não pode sumir.
   Quadro novo com itens inventados. Falha na v0.6.59 e passa na v0.6.60. Uso: node scripts/testar-cor-textura-v0660.mjs <endereço> [pasta-dos-prints] */
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
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const ta = () => p.locator('textarea.qd-edita');
const TEX = [['Amassado', 'amassado'], ['Café', 'cafe'], ['Dobrado', 'dobrado']];
for (const [t] of TEX) { await p.keyboard.press('Escape'); await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape'); }
await p.click('.tab:has-text("Página Inicial")');
const estado = (t) => p.locator('.qi', { hasText: t }).first().evaluate((e) => { const papel = e.querySelector('.qi-tex-papel'); const cs = getComputedStyle(e); /* v0.6.62: amassado e rasgado pintam numa camada recortada */ return { img: [cs.backgroundImage, papel ? getComputedStyle(papel).backgroundImage : ''].join(' '), cor: papel ? getComputedStyle(papel).backgroundColor : cs.backgroundColor, cls: e.className }; });
for (const [t, id] of TEX) {
  await p.keyboard.press('Escape'); await p.locator('.qi', { hasText: t }).first().click(); await p.waitForTimeout(100);
  await p.click('[data-menu-faixa=texturaQ]'); await p.locator(`.rb-lista [data-cmd="formatar.textura|${id}"]`).click(); await p.waitForTimeout(200);
  const antes = await estado(t);
  /* muda a cor pela barra do item (o primeiro botão é a cor) */
  await p.locator('.qd-barra button, .qd-sel-barra button').first().click(); await p.waitForTimeout(200);
  const rosa = p.locator('[data-cor="rosa"], [data-cor-item="rosa"], button[title*="Rosa" i], button[aria-label*="Rosa" i]').first();
  if (await rosa.count()) await rosa.click(); else await p.keyboard.press('Escape');
  await p.waitForTimeout(250); await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  const depois = await estado(t);
  const temTex = (s) => (id === 'dobrado' ? /gradient/.test(s.img) : s.img.includes('texturas/' + id));
  const corDe = (s) => (id === 'dobrado' ? (s.img.match(/rgb\([^)]*\) 0/) || [''])[0] : s.cor); /* na ponta dobrada a cor vai no degradê */
  caso(`${t}: a cor mudou`, corDe(depois) !== corDe(antes), `${corDe(antes)} → ${corDe(depois)}`);
  caso(`${t}: a textura continua depois de mudar a cor`, temTex(antes) && temTex(depois) && depois.cls.includes('qi-tex-' + id), depois.img.slice(0, 70));
}
if (PRINTS) await p.locator('.qd-mundo >> xpath=..').first().screenshot({ path: `${PRINTS}/1-cor-com-textura.png` });
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
