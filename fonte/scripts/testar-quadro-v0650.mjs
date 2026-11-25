/* Vértice Docs v0.6.50 — testes no navegador: cores novas dos post-its e Exibir › Fundo do quadro (desenho e cor).
   Quadro novo com itens inventados. Falha na v0.6.49 e passa na v0.6.50. Uso: node scripts/testar-quadro-v0650.mjs <endereço> */
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
await p.locator('[data-cmd="inserir.postit"]').first().click();
const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill('Conferir balança'); await ta.press('Control+Enter'); await p.keyboard.press('Escape');
const fundo = () => p.locator('.qd-area').evaluate((e) => { const s = getComputedStyle(e); return { tipo: e.dataset.fundo || '', img: s.backgroundImage, cor: s.backgroundColor, tam: s.backgroundSize }; });

const corPostit = await p.locator('.qi-postit').first().evaluate((e) => getComputedStyle(e).backgroundColor);
caso('cores: post-it novo no amarelo claro da paleta nova', corPostit === 'rgb(255, 244, 184)', corPostit);

const f0 = await fundo();
caso('fundo: sem escolher, continua bolinhas', /radial-gradient/.test(f0.img), f0.img.slice(0, 40));

await p.click('.tab:has-text("Exibir")');
const botao = p.locator('[data-cmd="exibir.fundo"]').first();
caso('fundo: botão Fundo na aba Exibir', (await botao.count()) === 1);
if (await botao.count()) {
  await botao.click();
  await p.waitForSelector('.qd-jfundo', { timeout: 3000 }).catch(() => {});
  const jan = await p.locator('.qd-jfundo').count();
  caso('fundo: abre a janela Fundo do quadro', jan === 1);
  if (jan) {
    const canto = await p.locator('.qd-jfundo').evaluate((e) => [getComputedStyle(e).borderTopLeftRadius, getComputedStyle(e).getPropertyValue('--r-jan').trim()]);
    caso('fundo: janela com o canto das outras janelas do app (--r-jan)', canto[0] === canto[1], canto.join(' · '));
    await p.locator('[data-fundo-tipo=quadriculado]').click(); await p.locator('[data-fundo-cor=salvia]').click();
    await p.locator('[data-fundo-aplicar]').click(); await p.waitForTimeout(250);
    const f1 = await fundo();
    caso('fundo: quadriculado aplicado', f1.tipo === 'quadriculado' && (f1.img.match(/linear-gradient/g) || []).length === 2, f1.img.slice(0, 60));
    caso('fundo: cor sálvia aplicada', f1.cor === 'rgb(242, 246, 241)', f1.cor);
    await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
    const f2 = await fundo();
    caso('fundo: Ctrl+Z volta para as bolinhas na cor do tema', /radial-gradient/.test(f2.img) && f2.cor === 'rgba(0, 0, 0, 0)', `${f2.img.slice(0, 30)} · ${f2.cor}`);
    await p.keyboard.press('Control+y'); await p.waitForTimeout(250);
    caso('fundo: Ctrl+Y refaz', (await fundo()).tipo === 'quadriculado');
    /* zoom: o desenho cresce junto */
    const tam1 = (await fundo()).tam;
    await p.locator('.qd-area').hover(); await p.keyboard.down('Control'); await p.mouse.wheel(0, -300); await p.keyboard.up('Control'); await p.waitForTimeout(300);
    const tam2 = (await fundo()).tam;
    caso('fundo: com zoom, o quadriculado cresce junto', tam1 !== tam2, `${tam1} → ${tam2}`);
    /* tema escuro: a cor vira só um toque */
    await p.evaluate(() => { document.body.dataset.theme = 'dark'; }); await p.waitForTimeout(150);
    const escuro = (await fundo()).cor;
    const nums = escuro.match(/[\d.]+/g).map(Number), k = /^color\(/.test(escuro) ? 255 : 1;
    const soma = nums.slice(0, 3).reduce((a, b) => a + b * k, 0);
    caso('fundo: no tema escuro a cor clara não acende o quadro', soma < 200, escuro);
    await p.evaluate(() => { delete document.body.dataset.theme; });
    /* reabrir: fica guardado no arquivo */
    await p.waitForTimeout(1200); await p.reload(); await p.waitForSelector('.qd-area', { timeout: 20000 }).catch(() => {});
    const f3 = await p.locator('.qd-area').count() ? await fundo() : { tipo: 'não reabriu' };
    caso('fundo: depois de recarregar, o quadro continua quadriculado e sálvia', f3.tipo === 'quadriculado' && f3.cor === 'rgb(242, 246, 241)', `${f3.tipo} · ${f3.cor}`);
  }
}
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
