/* Vértice Docs — v0.6.26: Quadro (post-its), defeitos do relatório do Grok de 18/11 e a decisão D15 do Elias.
   PL01 do 9º post-it em diante todos caíam no mesmo lugar; PL02 / D15 o Esc guarda o texto e o Ctrl+Z desfaz;
   PL03 recarregar no meio da edição deixava o post-it vazio.
   Uso: node scripts/testar-quadro.mjs <endereço>. Dados inventados. */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
const cmd = async (id) => { await p.locator(`[data-cmd="${id}"]`).first().click(); };
const contagem = async () => { const t = await p.locator('[data-status=contagem]').innerText(); const m = /(\d+) post-its?/.exec(t); return m ? +m[1] : -1; };
const ta = () => p.locator('textarea.qd-edita');
const novoPostit = async (texto, tecla = 'Control+Enter') => { await cmd('inserir.postit'); await ta().waitFor(); await ta().fill(texto); if (tecla) await ta().press(tecla); await p.waitForTimeout(120); };
/* o texto do post-it (a 1ª linha; embaixo vem o código Q-001) */
const textos = async () => (await p.locator('.qi-postit').allInnerTexts()).map((t) => t.split('\n')[0].trim());
/* caixas dos post-its na tela */
const caixas = () => p.locator('.qi-postit').evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, t: e.innerText.split('\n')[0].trim() }; }));
const bate = (a, b) => a.x < b.x + b.w - 1 && a.x + a.w > b.x + 1 && a.y < b.y + b.h - 1 && a.y + a.h > b.y + 1;

await p.goto(BASE + '#/postits'); await p.waitForSelector('[data-novo=postits]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio'); await p.waitForTimeout(300);

await caso('PL01: 12 post-its pelo botão, sem rolar a tela: nenhum cai em cima de outro e cada novo aparece inteiro na área do quadro', async () => {
  const area = await p.locator('.qd-area').boundingBox();
  for (let i = 1; i <= 12; i++) {
    await novoPostit('Tarefa ' + i);
    const cs = await caixas(); const novo = cs.find((c) => c.t === 'Tarefa ' + i);
    certo(novo, 'não achei o post-it ' + i);
    certo(novo.x >= area.x - 1 && novo.y >= area.y - 1 && novo.x + novo.w <= area.x + area.width + 1 && novo.y + novo.h <= area.y + area.height + 1, `o ${i}º ficou fora da tela: ${JSON.stringify(novo)}`);
  }
  const cs = await caixas();
  certo(cs.length === 12, 'post-its: ' + cs.length);
  for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) certo(!bate(cs[i], cs[j]), `"${cs[i].t}" em cima de "${cs[j].t}"`);
});

await caso('PL02 / D15: no post-it novo, o Esc guarda o texto (não apaga)', async () => {
  await novoPostit('Comprar pão', 'Escape');
  certo((await textos()).includes('Comprar pão'), 'texto sumiu: ' + (await textos()).slice(-3).join(' | '));
});

await caso('PL02 / D15: Ctrl+Z desfaz e Ctrl+Y devolve o post-it com o texto', async () => {
  const n = await contagem();
  await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
  certo(await contagem() === n - 1, 'Ctrl+Z não desfez: ' + await contagem());
  await p.keyboard.press('Control+y'); await p.waitForTimeout(200);
  certo(await contagem() === n && (await textos()).includes('Comprar pão'), 'Ctrl+Y não devolveu o texto: ' + (await textos()).slice(-2).join(' | '));
});

await caso('PL02 / D15: numa nota que já existia, o Esc guarda o que foi acrescentado e o Ctrl+Z volta ao texto de antes', async () => {
  await p.locator('.qi-postit', { hasText: 'Comprar pão' }).dblclick(); await ta().waitFor();
  await ta().press('End'); await p.keyboard.type(' e leite'); await ta().press('Escape'); await p.waitForTimeout(150);
  certo((await textos()).includes('Comprar pão e leite'), 'acréscimo perdido: ' + (await textos()).slice(-2).join(' | '));
  await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
  certo((await textos()).includes('Comprar pão'), 'Ctrl+Z não voltou o texto: ' + (await textos()).slice(-2).join(' | '));
});

await caso('PL03: recarregar (F5) no meio da edição não perde o texto do post-it novo', async () => {
  await novoPostit('Lote 7 conferido', null);
  await p.waitForTimeout(600);
  await p.reload(); await p.waitForSelector('.qd-area', { timeout: 15000 }); await p.waitForTimeout(800);
  const t = await textos();
  certo(t.includes('Lote 7 conferido'), 'texto perdido ao recarregar: ' + t.slice(-3).join(' | '));
  certo(!t.some((x) => x === '' || /^Q-\d+$/.test(x)), 'ficou post-it vazio');
  certo((await p.locator('.toast').allInnerTexts()).some((x) => /Recuperei 1 mudança/.test(x)), 'sem o aviso de mudança recuperada');
});

await caso('PL03: esconder o app (trocar de aba do navegador) no meio da edição também guarda o texto, e a edição continua', async () => {
  await novoPostit('Amostra 12 coletada', null);
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(300);
  certo(await ta().count() === 1, 'a edição fechou');
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.reload(); await p.waitForSelector('.qd-area', { timeout: 15000 }); await p.waitForTimeout(800);
  certo((await textos()).includes('Amostra 12 coletada'), 'texto perdido: ' + (await textos()).slice(-3).join(' | '));
});

await caso('Kanban: o Esc guarda o texto do cartão novo, e recarregar no meio da edição também', async () => {
  await p.locator('.qd-vistas button:has-text("Kanban")').click(); await p.waitForSelector('.kb-col');
  const kta = p.locator('textarea.kb-edita');
  await p.locator('.kb-col').first().locator('.kb-novo').click(); await kta.fill('Falta reagente DPD'); await kta.press('Escape'); await p.waitForTimeout(150);
  certo((await p.locator('.kb-card').allInnerTexts()).some((x) => x.includes('Falta reagente DPD')), 'Esc apagou o texto do cartão');
  await p.locator('.kb-col').first().locator('.kb-novo').click(); await kta.fill('Conferir pH da caixa'); await p.waitForTimeout(300);
  await p.reload(); await p.waitForSelector('.kb-col, .qd-area', { timeout: 15000 }); await p.waitForTimeout(800);
  if (!(await p.locator('.kb-col').count())) { await p.locator('.qd-vistas button:has-text("Kanban")').click(); await p.waitForSelector('.kb-col'); }
  certo((await p.locator('.kb-card').allInnerTexts()).some((x) => x.includes('Conferir pH da caixa')), 'recarregar perdeu o texto do cartão');
});

await caso('Kanban: tocar no cartão mostra a lixeira no canto de cima; ela exclui e o "Desfazer" do aviso devolve (também quando excluir é a 1ª ação depois de abrir)', async () => {
  if (!(await p.locator('.kb-col').count())) { await p.locator('.qd-vistas button:has-text("Kanban")').click(); await p.waitForSelector('.kb-col'); }
  const n = await p.locator('.kb-card:not(.kb-fantasma)').count();
  const card = p.locator('.kb-card', { hasText: 'Falta reagente DPD' });
  certo(await p.locator('[data-kb-excluir]').count() === 0, 'lixeira aparece sem escolher');
  await card.click({ position: { x: 20, y: 40 } }); await p.waitForTimeout(150);
  const lixo = card.locator('[data-kb-excluir]');
  certo(await lixo.isVisible(), 'sem lixeira no cartão escolhido');
  const rc = await card.boundingBox(), rl = await lixo.boundingBox();
  certo(rl.y < rc.y + rc.height / 2 && rl.x > rc.x + rc.width / 2, 'lixeira fora do canto de cima: ' + JSON.stringify({ rc, rl }));
  await lixo.click(); await p.waitForTimeout(200);
  certo(await p.locator('.kb-card:not(.kb-fantasma)').count() === n - 1, 'não excluiu');
  await p.locator('.toast button:has-text("Desfazer")').last().click(); await p.waitForTimeout(200);
  certo(await p.locator('.kb-card', { hasText: 'Falta reagente DPD' }).count() === 1, 'Desfazer não devolveu: ' + (await p.locator('.toast').allInnerTexts()).join(' | ') + ' / ' + (await p.locator('.kb-card').allInnerTexts()).join(' | '));
});

await caso('Kanban no celular: um toque no cartão e um na lixeira (44 px) excluem', async () => {
  const c3 = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const q = await c3.newPage();
  await q.goto(BASE + '#/postits'); await q.waitForSelector('[data-novo=postits]'); await q.tap('[data-novo=postits]'); await q.waitForSelector('.qd-area'); await q.waitForTimeout(300);
  await q.locator('.qd-vistas button:has-text("Kanban")').tap(); await q.waitForSelector('.kb-col');
  await q.locator('.kb-col').first().locator('.kb-novo').tap(); await q.locator('textarea.kb-edita').fill('Luz'); await q.locator('textarea.kb-edita').press('Control+Enter'); await q.waitForTimeout(200);
  await q.locator('.kb-card', { hasText: 'Luz' }).tap({ position: { x: 20, y: 30 } }); await q.waitForTimeout(150);
  const l = q.locator('[data-kb-excluir]'); const r = await l.boundingBox();
  certo(r && r.width >= 44 && r.height >= 44, 'lixeira pequena para o dedo: ' + JSON.stringify(r));
  await l.tap(); await q.waitForTimeout(200);
  certo(await q.locator('.kb-card', { hasText: 'Luz' }).count() === 0, 'não excluiu no celular');
  await c3.close();
});

await caso('celular (390 px): o post-it novo nasce inteiro na tela (PL04)', async () => {
  const c2 = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  const q = await c2.newPage();
  await q.goto(BASE + '#/postits'); await q.waitForSelector('[data-novo=postits]'); await q.click('[data-novo=postits]'); await q.waitForSelector('.qd-area'); await q.waitForTimeout(400);
  for (let i = 1; i <= 3; i++) {
    const b = q.locator('[data-cmd="inserir.postit"]').first();
    if (await b.isVisible()) await b.click(); else await q.locator('.qd-vazio .btn, [data-novo-postit]').first().click();
    await q.locator('textarea.qd-edita').waitFor(); await q.locator('textarea.qd-edita').fill('Item ' + i); await q.locator('textarea.qd-edita').press('Control+Enter'); await q.waitForTimeout(150);
    const area = await q.locator('.qd-area').boundingBox();
    const r = await q.locator('.qi-postit', { hasText: 'Item ' + i }).boundingBox();
    certo(r && r.x >= area.x - 1 && r.x + r.width <= area.x + area.width + 1 && r.y >= area.y - 1 && r.y + r.height <= area.y + area.height + 1, `${i}º fora: ${JSON.stringify(r)} área ${JSON.stringify(area)}`);
  }
  await c2.close();
});

console.log(erros.length ? 'Console com erro: ' + erros.slice(0, 3).join(' | ') : 'Console sem erros.');
console.log(`${ok} de ${ok + falhas} conferências do Quadro passaram.`);
await nav.close();
process.exit(falhas || erros.length ? 1 : 0);
