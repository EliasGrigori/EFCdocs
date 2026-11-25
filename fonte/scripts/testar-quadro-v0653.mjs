/* Vértice Docs v0.6.53 — D-82: na forma Início/Fim com texto de duas linhas, o código (Q-001) não encosta no texto.
   Quadro novo com itens inventados. Falha na v0.6.52 e passa na v0.6.53. Uso: node scripts/testar-quadro-v0653.mjs <endereço> */
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
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
for (const t of ['COMANDA DE PULVERIZAÇÃO - DEFENCIVOS', 'Início']) {
  await p.locator('[data-cmd="inserir.inicio"]').first().click();
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
}
const medidas = await p.locator('.qi-inicio').evaluateAll((els) => els.map((e) => {
  const cod = e.querySelector('.qi-cod').getBoundingClientRect(), s = e.querySelector('.qi-clamp'), r = s.getBoundingClientRect(), it = e.getBoundingClientRect();
  return { texto: s.textContent, codFim: cod.bottom, textoIni: r.top, textoFim: r.bottom, itemFim: it.bottom, linhas: Math.round(r.height / parseFloat(getComputedStyle(e.querySelector('.qi-t')).lineHeight)) };
}));
for (const m of medidas) {
  caso(`"${m.texto.slice(0, 24)}": o código não encosta no texto`, m.codFim <= m.textoIni + 0.5, `fim do código ${m.codFim.toFixed(1)} · começo do texto ${m.textoIni.toFixed(1)}`);
  caso(`"${m.texto.slice(0, 24)}": o texto continua dentro da forma`, m.textoFim <= m.itemFim + 0.5, `${m.linhas} linha(s)`);
}
/* sem os códigos, o texto volta ao centro, como antes */
await p.click('.tab:has-text("Exibir")'); await p.locator('[data-cmd="exibir.codigos"]').first().click(); await p.waitForTimeout(200);
const semCod = await p.locator('.qi-inicio').first().evaluate((e) => e.classList.contains('qi-com-cod'));
caso('sem os códigos, a folga em cima some', !semCod);
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
