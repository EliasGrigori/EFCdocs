/* Vértice Docs v0.6.51 — testes no navegador: título do post-it e caixinha de feito ligada à coluna Feito do Kanban.
   Quadro novo com itens inventados. Falha na v0.6.50 e passa na v0.6.51. Uso: node scripts/testar-quadro-v0651.mjs <endereço> */
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
for (const t of ['Balança do packing, até sexta', 'Trocar o filtro do lavador']) {
  await p.locator('[data-cmd="inserir.postit"]').first().click();
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
}
const pi = (n) => p.locator('.qi-postit').nth(n);

/* caixinha */
const nCaixas = await p.locator('.qi-postit .qi-caixa').count();
caso('feito: cada post-it tem a caixinha (quadro com 3 colunas)', nCaixas === 2, `caixinhas: ${nCaixas}`);
if (!nCaixas) await fim();

/* título pela barra do item */
await pi(0).click(); await p.waitForTimeout(200);
const bTit = p.locator('button[title="Título"]').first();
caso('título: botão Título na barra do post-it escolhido', (await bTit.count()) === 1);
if (await bTit.count()) {
  await bTit.click(); await p.waitForSelector('.qd-jtitulo', { timeout: 3000 }).catch(() => {});
  caso('título: abre a janela Título do post-it', (await p.locator('.qd-jtitulo').count()) === 1);
  await p.locator('[data-titulo-campo]').fill('Conferir calibração'); await p.locator('[data-titulo-campo]').press('Enter'); await p.waitForTimeout(250);
  const tit = await pi(0).locator('.qi-tit').textContent().catch(() => '');
  caso('título: aparece em cima do post-it', tit === 'Conferir calibração', tit);
  const r = await pi(0).evaluate((e) => { const t = e.querySelector('.qi-tit').getBoundingClientRect(), x = e.querySelector('.qi-clamp').getBoundingClientRect(); return { abaixo: x.top >= t.bottom - 1, alinh: getComputedStyle(e.querySelector('.qi-t')).textAlign, peso: getComputedStyle(e.querySelector('.qi-tit')).fontWeight, fio: getComputedStyle(e.querySelector('.qi-tit')).borderBottomStyle }; });
  caso('título: negrito com fio, texto embaixo e à esquerda', r.abaixo && r.alinh === 'left' && +r.peso >= 700 && r.fio === 'solid', JSON.stringify(r));
}
await p.keyboard.press('Escape');
await p.click('.tab:has-text("Página Inicial")'); await p.waitForTimeout(150);
caso('título: botão também na Página Inicial', (await p.locator('[data-cmd="formatar.tituloPostit"]').count()) >= 1);

/* marcar como feito */
const pos0 = await pi(1).boundingBox();
await pi(1).locator('.qi-caixa').click(); await p.waitForTimeout(250);
const feito = await pi(1).evaluate((e) => ({ cls: e.classList.contains('qi-feito'), aria: e.querySelector('.qi-caixa').getAttribute('aria-checked'), deco: getComputedStyle(e.querySelector('.qi-clamp')).textDecorationLine }));
caso('feito: marcar risca o texto', feito.cls && feito.aria === 'true' && /line-through/.test(feito.deco), JSON.stringify(feito));
const pos1 = await pi(1).boundingBox();
caso('feito: clicar na caixinha não arrasta o post-it', Math.abs(pos0.x - pos1.x) < 1 && Math.abs(pos0.y - pos1.y) < 1);

/* Kanban */
await p.locator('[role=tab]:has-text("Kanban")').click(); await p.waitForTimeout(400);
const colFeito = await p.evaluate(() => { const cols = [...document.querySelectorAll('.kb-col')]; const ult = cols[cols.length - 1]; return { nome: ult.getAttribute('aria-label'), textos: [...ult.querySelectorAll('.kb-card p')].map((x) => x.textContent) }; });
caso('feito: no Kanban, o post-it marcado está na coluna Feito', colFeito.textos.includes('Trocar o filtro do lavador'), JSON.stringify(colFeito));
const titKb = await p.locator('.kb-tit').allTextContents();
caso('título: aparece no cartão do Kanban', titKb.includes('Conferir calibração'), titKb.join(' | '));
await p.locator('[role=tab]:has-text("Quadro")').click(); await p.waitForTimeout(400);

/* desfazer e desmarcar */
await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
caso('feito: Ctrl+Z desmarca', !(await pi(1).evaluate((e) => e.classList.contains('qi-feito'))));
await p.keyboard.press('Control+y'); await p.waitForTimeout(250);
await pi(1).locator('.qi-caixa').click(); await p.waitForTimeout(250);
caso('feito: clicar de novo desmarca', !(await pi(1).evaluate((e) => e.classList.contains('qi-feito'))));

/* Exibir › Caixinhas */
await p.click('.tab:has-text("Exibir")');
await p.locator('[data-cmd="exibir.caixas"]').first().click(); await p.waitForTimeout(250);
caso('exibir: desligar as caixinhas esconde todas', (await p.locator('.qi-caixa').count()) === 0);
await p.locator('[data-cmd="exibir.caixas"]').first().click(); await p.waitForTimeout(250);
caso('exibir: ligar de novo mostra', (await p.locator('.qi-caixa').count()) === 2);
await fim();
