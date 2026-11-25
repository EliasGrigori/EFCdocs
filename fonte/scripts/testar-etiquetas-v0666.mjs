/* Vértice Docs v0.6.66 — etiqueta de frente no post-it e filtro único (N1), e o D-87 (clipe e lixeira em cima da alça).
   Falha na v0.6.65 e passa na v0.6.66. Uso: node scripts/testar-etiquetas-v0666.mjs <endereço> [pasta-dos-prints]. Dados inventados. */
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
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage(); p.setDefaultTimeout(4000);
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const ta = () => p.locator('textarea.qd-edita');
for (const t of ['Recebimento de amostras', 'Preparo de amostras', 'Arquivar formulários', 'Entrega de documentos']) { await p.keyboard.press('Escape'); await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
await p.click('.tab:has-text("Página Inicial")'); await p.waitForTimeout(150);
const qi = (t) => p.locator('.qi', { hasText: t }).first();
const menuEtiqueta = () => p.locator('[data-menu-faixa=etiquetaQ]');
async function novaEtiqueta(t, nome) {
  await qi(t).click(); await menuEtiqueta().click(); await p.locator('.rb-lista [data-cmd="formatar.etiquetaNova"]').click();
  await p.locator('.janela input').fill(nome); await p.locator('.janela button.primary').click(); await p.waitForTimeout(200);
}
await caso('Página Inicial › Post-it tem a lista Etiqueta (Sem etiqueta e Nova etiqueta…)', async () => {
  certo(await menuEtiqueta().count() === 1, 'sem o botão Etiqueta');
  await qi('Recebimento').click(); await menuEtiqueta().click();
  const itens = await p.locator('.rb-lista .rb-lista-it').allInnerTexts(); await p.keyboard.press('Escape');
  certo(itens.some((x) => /Sem etiqueta/.test(x)) && itens.some((x) => /Nova etiqueta/.test(x)), itens.join(' | '));
});
await caso('Nova etiqueta cria e já põe no post-it escolhido; aparece no canto do post-it com a cor', async () => {
  await novaEtiqueta('Recebimento', 'Coletas');
  const r = await qi('Recebimento').evaluate((e) => { const x = e.querySelector('.qi-eti'); return x && { t: x.textContent.trim(), cor: getComputedStyle(x.querySelector('i')).backgroundColor }; });
  certo(r && r.t === 'Coletas' && r.cor !== 'rgba(0, 0, 0, 0)', JSON.stringify(r));
});
await caso('Escolher a etiqueta que já existe pela lista; Ctrl+Z tira', async () => {
  await qi('Preparo').click(); await menuEtiqueta().click(); await p.locator('.rb-lista .rb-lista-it', { hasText: 'Coletas' }).click(); await p.waitForTimeout(150);
  certo(await qi('Preparo').locator('.qi-eti').count() === 1, 'não pôs');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(200); certo(await qi('Preparo').locator('.qi-eti').count() === 0, 'Ctrl+Z não tirou');
  await p.keyboard.press('Control+y'); await p.waitForTimeout(200); certo(await qi('Preparo').locator('.qi-eti').count() === 1, 'Ctrl+Y não pôs de novo');
});
await novaEtiqueta('Arquivar', 'Documental').catch(() => {}); /* na v0.6.65 não existe: os casos abaixo falham sem parar o teste */
await p.locator('.qi', { hasText: 'Entrega' }).first().click(); await p.click('[data-menu-faixa=texturaQ]'); await p.locator('.rb-lista [data-cmd="formatar.textura|clipe"]').first().click(); await p.waitForTimeout(100); await p.keyboard.press('Escape');
if (PRINTS) await p.screenshot({ path: `${PRINTS}/quadro-etiquetas.png` });
await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(400);
await caso('Kanban: o cartão mostra a etiqueta à esquerda e o código à direita', async () => {
  const r = await p.locator('.kb-card[data-item]', { hasText: 'Recebimento' }).first().evaluate((k) => { const e = k.querySelector('.kb-eti'), c = k.querySelector('.kb-cod'); return e && c && { t: e.textContent.trim(), eDir: e.getBoundingClientRect().right, cEsq: c.getBoundingClientRect().left }; });
  certo(r && r.t === 'Coletas' && r.eDir < r.cEsq, JSON.stringify(r));
});
await caso('Kanban: filtro único com o resumo; o painel lista as etiquetas com a contagem', async () => {
  const b = p.locator('[data-kb-filtro]'); certo(await b.count() === 1, 'sem o filtro');
  certo((await b.innerText()).includes('Todas as etiquetas'), await b.innerText());
  await b.click(); const ops = await p.locator('.kb-filtro-op').allInnerTexts();
  certo(ops.length === 3 && /Coletas\s*2/.test(ops[0]) && /Documental\s*1/.test(ops[1]) && /Sem etiqueta\s*1/.test(ops[2]), ops.join(' | '));
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/kanban-filtro.png` });
});
await caso('Kanban: tirar "Sem etiqueta" e "Documental" deixa só os de Coletas; o resumo diz qual', async () => {
  await p.locator('[data-kb-filtro-op=sem]').click(); await p.locator('[data-kb-filtro-op=e2]').click(); await p.waitForTimeout(150);
  const vis = await p.locator('.kb-card[data-item] p').allInnerTexts();
  certo(vis.length === 2 && vis.every((t) => /Recebimento|Preparo/.test(t)), vis.join(' | '));
  certo((await p.locator('[data-kb-filtro]').innerText()).trim() === 'Coletas', await p.locator('[data-kb-filtro]').innerText());
  await p.keyboard.press('Escape');
});
await caso('Kanban com filtro: arrastar um cartão para depois de outro grava o lugar certo na coluna inteira', async () => {
  const a = await p.locator('.kb-card[data-item]', { hasText: 'Recebimento' }).first().boundingBox(), b = await p.locator('.kb-card[data-item]', { hasText: 'Preparo' }).first().boundingBox();
  await p.mouse.move(a.x + a.width / 2, a.y + 14); await p.mouse.down(); await p.mouse.move(b.x + b.width / 2, b.y + b.height - 4, { steps: 12 }); await p.waitForTimeout(150); await p.mouse.up(); await p.waitForTimeout(400);
  await p.locator('[data-kb-filtro]').click(); await p.locator('.kb-filtro-limpar').click(); await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  const ordem = (await p.locator('.kb-col').first().locator('.kb-card[data-item] p').allInnerTexts()).map((t) => t.split(' ')[0]);
  certo(ordem.indexOf('Preparo') < ordem.indexOf('Recebimento') && ordem.length === 4, ordem.join(' | '));
  return ordem.join(' · ');
});
await caso('D-87: com a textura Clipe e o cartão escolhido, a lixeira não cobre a alça de arrastar', async () => {
  await p.locator('.kb-card[data-item]', { hasText: 'Entrega' }).first().click(); await p.waitForTimeout(200);
  const r = await p.locator('.kb-card[data-item]', { hasText: 'Entrega' }).first().evaluate((k) => { const b = (s) => k.querySelector(s).getBoundingClientRect(); const a = b('.kb-alca'), l = b('.kb-lixo'), c = b('.qi-clipe'); const bate = (x, y) => x.left < y.right - 1 && x.right > y.left + 1; return { alcaLixo: bate(a, l), clipeAlca: bate(c, a), clipeLixo: bate(c, l) }; });
  certo(!r.alcaLixo && !r.clipeAlca && !r.clipeLixo, JSON.stringify(r));
  if (PRINTS) await p.locator('.kb-card[data-item]', { hasText: 'Entrega' }).first().screenshot({ path: `${PRINTS}/d87-clipe.png` });
});
await caso('Raias por setor com etiquetas: uma raia por etiqueta, com os post-its dela dentro', async () => {
  await p.locator('[data-cmd="organizar.raias"]').first().click(); await p.waitForTimeout(500);
  const r = await p.evaluate(() => { const raias = [...document.querySelectorAll('.qi-raia')].map((e) => ({ t: e.textContent.trim(), r: e.getBoundingClientRect() })); const dentro = (t, nome) => { const k = [...document.querySelectorAll('.qi-postit')].find((e) => e.textContent.includes(t)).getBoundingClientRect(); const ra = raias.find((x) => x.t.includes(nome)); return ra && k.top >= ra.r.top && k.bottom <= ra.r.bottom + 1; }; return { nomes: raias.map((x) => x.t), rec: dentro('Recebimento', 'Coletas'), arq: dentro('Arquivar', 'Documental') }; });
  certo(r.nomes.some((x) => x.includes('Coletas')) && r.nomes.some((x) => x.includes('Documental')) && r.rec && r.arq, JSON.stringify(r));
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/raias-etiquetas.png` });
});
await caso('sem erro na página', async () => { certo(erros.length === 0, erros.join(' | ')); });
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências das etiquetas passaram.`);
process.exit(falhas ? 1 : 0);
