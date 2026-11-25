/* Vértice Docs v0.6.67 — comentários pelo número no cartão do Kanban, numa gaveta ao lado (N2 do estudo, aprovado).
   Falha na v0.6.66 e passa na v0.6.67. Uso: node scripts/testar-comentarios-v0667.mjs <endereço> [pasta-dos-prints]. Dados inventados. */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const erros = [];
let ok = 0, falhas = 0;
const caso = async (nome, f) => { try { const i = await f(); ok++; console.log(`  ok    ${nome}${i ? ' — ' + i : ''}`); } catch (e) { falhas++; console.log(`  FALHA ${nome} — ${String(e.message || e).split('\n')[0].slice(0, 300)}`); } };
const certo = (c, m) => { if (!c) throw new Error(m); };
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; try { localStorage.setItem('efcdocs.autor', 'Pessoa A'); } catch { /* */ } });
const p = await ctx.newPage(); p.setDefaultTimeout(4000);
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const ta = () => p.locator('textarea.qd-edita');
for (const t of ['Recebimento de amostras', 'Preparo de amostras', 'Despache nos Correios']) { await p.keyboard.press('Escape'); await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(400);
const card = (t) => p.locator('.kb-card[data-item]', { hasText: t }).first();
const gaveta = () => p.locator('[data-kb-gaveta]');
await caso('cartão sem comentário: o balãozinho aparece ao passar o mouse e abre a gaveta para escrever o primeiro', async () => {
  await card('Recebimento').hover(); await p.waitForTimeout(200);
  const b = card('Recebimento').locator('[data-kb-comentar]'); certo(await b.count() === 1, 'sem o balãozinho');
  await b.click(); await p.waitForTimeout(250);
  certo(await gaveta().count() === 1, 'a gaveta não abriu'); certo((await gaveta().innerText()).includes('Nenhum comentário ainda'), 'sem o aviso de vazio');
});
await caso('escrever o primeiro comentário: aparece na gaveta com o nome e o número vai para o rodapé do cartão', async () => {
  await gaveta().locator('textarea').fill('Chegaram 12 caixas.'); await gaveta().locator('button[type=submit]').click(); await p.waitForTimeout(250);
  const g = await gaveta().innerText(); certo(g.includes('Chegaram 12 caixas.') && g.includes('Pessoa A'), g);
  certo((await card('Recebimento').locator('[data-kb-coments]').innerText()).trim() === '1', 'rodapé sem o 1');
});
await caso('responder: a resposta entra no histórico com o nome e a hora, e o número sobe para 2', async () => {
  await gaveta().locator('.kb-gv-autor').fill('Pessoa B'); await gaveta().locator('textarea').fill('Duas com lacre aberto, separei.'); await gaveta().locator('textarea').press('Control+Enter'); await p.waitForTimeout(250);
  const msgs = await gaveta().locator('.kb-gv-msg').allInnerTexts();
  certo(msgs.length === 2 && /Pessoa B/.test(msgs[1]) && /\d\d\/\d\d \d\d:\d\d/.test(msgs[1]), msgs.join(' | '));
  certo((await card('Recebimento').locator('[data-kb-coments]').innerText()).trim() === '2', 'rodapé sem o 2');
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/gaveta.png` });
});
await caso('a gaveta não tira do quadro: o Kanban continua à vista e as setas trocam para o próximo cartão', async () => {
  certo(await p.locator('.kb-col').count() === 3, 'saiu do Kanban');
  await gaveta().locator('.gv-nav button').last().click(); await p.waitForTimeout(200);
  certo((await gaveta().innerText()).includes('Preparo'), 'a seta não trocou de cartão: ' + (await gaveta().innerText()).slice(0, 60));
});
await caso('Esc fecha a gaveta; Ctrl+Z tira a resposta; o comentário vem igual no Quadro livre (marcador com 1 resposta)', async () => {
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); certo(await gaveta().count() === 0, 'Esc não fechou');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
  certo((await card('Recebimento').locator('[data-kb-coments]').innerText()).trim() === '1', 'Ctrl+Z não tirou a resposta');
  await p.keyboard.press('Control+y'); await p.waitForTimeout(250);
  await p.locator('.qd-vistas button:has-text("Quadro")').click(); await p.waitForTimeout(300);
  const m = p.locator('.qi', { hasText: 'Recebimento' }).first().locator('[data-com-marcador]');
  certo(await m.count() === 1 && (await m.innerText()).trim() === '1', 'marcador no Quadro: ' + (await m.count() ? await m.innerText() : 'nenhum'));
});
await caso('o número no cartão abre a gaveta direto', async () => {
  await p.locator('.qd-vistas button:has-text("Kanban")').click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(200);
  await card('Recebimento').locator('[data-kb-coments]').click(); await p.waitForTimeout(250);
  certo(await gaveta().count() === 1 && (await gaveta().locator('.kb-gv-msg').count()) === 2, 'não abriu com o histórico');
  await p.keyboard.press('Escape');
});
await caso('sem erro na página', async () => { certo(erros.length === 0, erros.join(' | ')); });
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências dos comentários no cartão passaram.`);
process.exit(falhas ? 1 : 0);
