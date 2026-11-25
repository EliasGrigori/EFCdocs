/* Vértice Docs v0.6.55 — comentário do Quadro no estilo do Word: marcador no canto, cartão ao passar o mouse, respostas
   de outras pessoas, editar e excluir. Quadro novo com itens inventados. Falha na v0.6.54 e passa na v0.6.55.
   Uso: node scripts/testar-comentario-v0655.mjs <endereço> [pasta para prints] */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: PRINTS ? 1.5 : 1 });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; try { localStorage.removeItem('efcdocs.autor'); } catch { /* */ } });
const p = await ctx.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
const fim = async () => { caso('sem erro na página', erros.length === 0, erros.join(' | ')); await nav.close(); console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo'); process.exit(falhas ? 1 : 0); };
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
await p.locator('[data-cmd="inserir.processo"]').first().click();
const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill('1 - FISICOQUÍMICA\n2 - QUÍMICA (MACRO + MICRO)'); await ta.press('Control+Enter'); await p.waitForTimeout(150);
/* comentário pela barra do item */
await p.locator('button[title="Comentário"]').first().click();
const campo = p.locator('.janela textarea').first(); await campo.waitFor(); await campo.fill('Conferir com o laudo do laboratório antes de enviar.');
await p.locator('.janela .btn.primary').last().click(); await p.waitForTimeout(300);
await p.keyboard.press('Escape'); await p.mouse.click(5, 790);
const marc = p.locator('[data-com-marcador]');
caso('o item com comentário mostra o marcador no canto (estilo Word)', (await marc.count()) === 1);
if (!(await marc.count())) await fim();
const pos = await p.evaluate(() => { const m = document.querySelector('[data-com-marcador]').getBoundingClientRect(), it = document.querySelector('.qi-processo').getBoundingClientRect(); return { fora: m.right > it.right && m.top < it.top, w: m.width }; });
caso('o marcador fica no canto de cima, por fora do item', pos.fora && pos.w >= 20, JSON.stringify(pos));
/* passar o mouse abre o cartão */
await marc.hover(); await p.waitForTimeout(250);
const cartao = p.locator('[data-com-cartao]');
caso('passar o mouse abre o cartão com o comentário', (await cartao.count()) === 1 && (await cartao.locator('.qd-com-texto').textContent()).includes('laudo'));
/* responder (primeira vez pede o nome) */
await p.locator('[data-com-autor]').fill('Ana');
await p.locator('[data-com-responder]').fill('Laudo conferido, pode enviar.'); await p.locator('[data-com-responder]').press('Enter'); await p.waitForTimeout(300);
const resp = await p.locator('.qd-com-resps li').allTextContents();
caso('a resposta aparece com o nome de quem respondeu', resp.length === 1 && resp[0].includes('Ana') && resp[0].includes('Laudo conferido'), resp.join(' | '));
caso('o marcador mostra quantas respostas', (await p.locator('.qi-com-n').textContent().catch(() => '')) === '1');
await p.locator('[data-com-responder]').fill('Enviado por e-mail.'); await p.locator('[data-com-enviar]').click(); await p.waitForTimeout(300);
caso('segunda resposta, já sem pedir o nome', (await p.locator('.qd-com-resps li').count()) === 2 && (await p.locator('[data-com-autor]').count()) === 0);
if (PRINTS) await p.screenshot({ path: `${PRINTS}/4-comentario-cartao.png`, clip: await (async () => { const a = await p.locator('.qi-processo').boundingBox(), b = await cartao.boundingBox(); const x = Math.min(a.x, b.x) - 30, y = Math.min(a.y, b.y) - 30; return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x + 30, height: Math.max(a.y + a.height, b.y + b.height) - y + 30 }; })() });
/* sair com o mouse fecha (quando não foi clicado) */
await p.mouse.move(5, 790); await p.waitForTimeout(600);
caso('tirar o mouse fecha o cartão', (await cartao.count()) === 0);
/* clicar deixa aberto; Esc fecha */
await marc.click(); await p.mouse.move(5, 790); await p.waitForTimeout(600);
caso('clicar no marcador deixa o cartão aberto', (await cartao.count()) === 1);
await p.keyboard.press('Escape'); await p.waitForTimeout(200);
caso('Esc fecha o cartão', (await cartao.count()) === 0);
/* Ctrl+Z desfaz a última resposta */
await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
caso('Ctrl+Z desfaz a última resposta', (await p.locator('.qi-com-n').textContent().catch(() => '')) === '1');
/* excluir pela lixeira do cartão */
await marc.click(); await p.locator('[data-com-excluir]').click(); await p.waitForTimeout(300);
caso('a lixeira do cartão tira o comentário e as respostas', (await p.locator('[data-com-marcador]').count()) === 0);
if (PRINTS) {
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300); await p.mouse.click(5, 790);
  const a = await p.locator('.qi-processo').boundingBox();
  await p.screenshot({ path: `${PRINTS}/4-comentario-marcador.png`, clip: { x: a.x - 30, y: a.y - 30, width: a.width + 60, height: a.height + 60 } });
}
await fim();
