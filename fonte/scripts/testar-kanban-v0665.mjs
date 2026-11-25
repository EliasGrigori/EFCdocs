/* Vértice Docs v0.6.65 — visual do Kanban (V1 a V4 do estudo de 25/11, aprovado). Falha na v0.6.64 e passa na v0.6.65.
   V1 colunas em raia e nome do quadro em cima (muda com um clique) · V2 cartão limpo (sem "Sem responsável", "Sem prazo"
   e bolinha de iniciais) · V3 textura e letra do Quadro no cartão · V4 fechar o painel de detalhes sem faixa vazia.
   Uso: node scripts/testar-kanban-v0665.mjs <endereço> [pasta-dos-prints]. Dados inventados. */
import { chromium } from 'playwright';
import { montarKanban } from './layout/kanban-semente.mjs';
import { abrirSemeado } from './layout/semente.mjs';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const erros = [];
let ok = 0, falhas = 0;
const caso = async (nome, f) => { try { const i = await f(); ok++; console.log(`  ok    ${nome}${i ? ' — ' + i : ''}`); } catch (e) { falhas++; console.log(`  FALHA ${nome} — ${String(e.message || e).split('\n')[0].slice(0, 300)}`); } };
const certo = (c, m) => { if (!c) throw new Error(m); };
async function pagina(movimento = false) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: movimento ? 'no-preference' : 'reduce' });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  return { ctx, p };
}

/* ---------- V1 e V2 com os cartões de tarefa inventados ---------- */
{
  const m = await abrirSemeado(nav, BASE, { w: 1366, h: 800, reduzido: true }); const ctx = m.ctx, p = m.page; p.on('pageerror', (e) => erros.push(String(e)));
  await montarKanban(p, BASE);
  await caso('V1: cada coluna é uma raia de fundo claro e cantos redondos', async () => {
    const r = await p.locator('.kb-col').first().evaluate((e) => { const c = getComputedStyle(e); return { fundo: c.backgroundColor, canto: parseFloat(c.borderTopLeftRadius) }; });
    certo(r.fundo !== 'rgba(0, 0, 0, 0)' && r.canto >= 8, JSON.stringify(r));
  });
  await caso('V1: o nome do quadro fica em cima das colunas, ao lado do andamento, e muda com um clique', async () => {
    const t = p.locator('[data-kb-titulo]'); certo(await t.count() === 1, 'sem o nome do quadro');
    const nome0 = (await t.innerText()).trim(), topo = (await p.locator('.topbar .nome').first().innerText()).trim();
    certo(nome0 === topo, `${nome0} × ${topo}`);
    await t.click(); const ed = p.locator('input.kb-titulo'); await ed.fill('Atividades da semana'); await ed.press('Enter'); await p.waitForTimeout(300);
    const depois = (await p.locator('[data-kb-titulo]').innerText()).trim(), topo2 = (await p.locator('.topbar .nome').first().innerText()).trim();
    certo(depois === 'Atividades da semana' && topo2 === 'Atividades da semana', `${depois} · ${topo2}`);
  });
  await caso('V2: cartão limpo: responsável com ícone de pessoa e nome, sem bolinha de iniciais, sem "Sem responsável" e sem "Sem prazo"', async () => {
    const r = await p.evaluate(() => ({ resp: [...document.querySelectorAll('.kb-card .kb-resp')].map((x) => ({ t: x.textContent.trim(), ic: !!x.querySelector('svg'), bola: !!x.querySelector('i') })), sem: /Sem responsável|Sem prazo/.test(document.querySelector('.kb').innerText) }));
    certo(r.resp.length >= 4 && r.resp.every((x) => x.ic && !x.bola), JSON.stringify(r.resp)); certo(!r.sem, 'ainda aparece "Sem responsável" ou "Sem prazo"');
  });
  await caso('V2: cartão sem tarefa nem comentário não tem rodapé', async () => {
    await p.locator('.kb-col').nth(1).locator('.kb-novo').click(); const ta = p.locator('textarea.kb-edita'); await ta.fill('Só um lembrete'); await ta.press('Control+Enter'); await p.waitForTimeout(300);
    const pe = await p.locator('.kb-card', { hasText: 'Só um lembrete' }).first().evaluate((e) => !!e.querySelector('.kb-pe, .kb-tarefa'));
    certo(!pe, 'tem rodapé vazio');
  });
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/v1-v2-kanban.png` });
  await ctx.close();
}

/* ---------- V3: textura e letra do Quadro no cartão ---------- */
{
  const { ctx, p } = await pagina();
  await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  const ta = () => p.locator('textarea.qd-edita');
  for (const t of ['Café no papel', 'Fita no alto', 'Letra escolhida']) { await p.keyboard.press('Escape'); await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
  await p.click('.tab:has-text("Página Inicial")'); await p.waitForTimeout(150);
  for (const [t, tex] of [['Café no papel', 'cafe'], ['Fita no alto', 'fita']]) { await p.locator('.qi', { hasText: t }).first().click(); await p.click('[data-menu-faixa=texturaQ]'); await p.locator(`.rb-lista [data-cmd="formatar.textura|${tex}"]`).first().click(); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
  await p.locator('.qi', { hasText: 'Letra escolhida' }).first().click(); await p.click('[data-cx=fonteQ]'); await p.waitForTimeout(600); const fam = 'Caveat'; await p.locator('.rb-lista [data-valor="formatar.fonteQ|Caveat"]').click(); await p.waitForTimeout(700); await p.keyboard.press('Escape');
  await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(500);
  await caso('V3: a textura do Quadro vale no cartão (café no papel, fita no alto)', async () => {
    const r = await p.evaluate(() => { const k = (t) => [...document.querySelectorAll('.kb-card[data-item]')].find((e) => e.textContent.includes(t)); const c = k('Café no papel'), f = k('Fita no alto'); return { cafe: c && c.className.includes('qi-tex-cafe') && /cafe/.test(getComputedStyle(c).backgroundImage), fita: f && !!f.querySelector('.qi-fita') }; });
    certo(r.cafe && r.fita, JSON.stringify(r));
  });
  await caso('V3: a letra escolhida no Quadro vale no texto do cartão', async () => {
    const f = await p.locator('.kb-card[data-item]', { hasText: 'Letra escolhida' }).first().locator('p').evaluate((e) => getComputedStyle(e).fontFamily);
    certo(f.includes(fam), `${f} (esperava ${fam})`); return fam;
  });
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/v3-texturas.png` });
  await ctx.close();
}

/* ---------- V4 (com o movimento ligado: é na animação de saída que sobrava a faixa) ---------- */
{
  const { ctx, p } = await pagina(true);
  await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  await p.locator('[data-cmd="inserir.postit"]').first().click(); const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill('Um'); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
  await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(600);
  await caso('V4: ao fechar o painel de detalhes, as colunas tomam o espaço na hora (sem faixa vazia)', async () => {
    const larg = () => p.locator('.kb').evaluate((e) => Math.round(e.getBoundingClientRect().width));
    const w0 = await larg();
    await p.locator('.topbar [data-cmd="exibir.painel"]').first().click(); await p.waitForTimeout(600); const w1 = await larg();
    await p.locator('.topbar [data-cmd="exibir.painel"]').first().click(); await p.waitForTimeout(40); const w2 = await larg();
    certo(w1 < w0 - 100 && w2 >= w0 - 2, `largura: antes ${w0}, aberto ${w1}, logo depois de fechar ${w2}`);
    return `antes ${w0}, aberto ${w1}, logo depois de fechar ${w2}`;
  });
  await ctx.close();
}

await caso('sem erro na página', async () => { certo(erros.length === 0, erros.join(' | ')); });
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências do visual do Kanban passaram.`);
process.exit(falhas ? 1 : 0);
