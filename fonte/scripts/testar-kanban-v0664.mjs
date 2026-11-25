/* Vértice Docs v0.6.64 — fluidez do arrastar no Kanban (F1 a F7 do estudo de 25/11, maquete aprovada).
   Falha na v0.6.62 e passa na v0.6.64. Mede no app de verdade:
   - ao soltar, o post-it não salta (o que se vê sai de onde estava a mão e chega na vaga);
   - os vizinhos não pulam (só deslizam), e ao atravessar colunas sempre há vaga;
   - sem tremida: passar devagar, de um lado para o outro, sobre a metade de um cartão alto não faz a vaga ir e voltar,
     mesmo com as animações 5 vezes mais lentas (era o defeito da maquete antiga);
   - perto da beira o quadro rola sozinho; Esc devolve o post-it; soltar grava a coluna e o lugar; com "movimento
     reduzido" o arrasto continua funcionando, sem deslize.
   Uso: node scripts/testar-kanban-v0664.mjs <endereço> [pasta-dos-prints] */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const erros = [];
let ok = 0, falhas = 0;
const caso = async (nome, f) => { try { const i = await f(); ok++; console.log(`  ok    ${nome}${i ? ' — ' + i : ''}`); } catch (e) { falhas++; console.log(`  FALHA ${nome} — ${String(e.message || e).split('\n')[0].slice(0, 300)}`); } };
const certo = (c, m) => { if (!c) throw new Error(m); };
const TEXTOS = ['Recebimento de amostras', 'Preparo de amostras\ncom conferência do lacre\ne da temperatura\nna chegada', 'Despache nos Correios', 'Receber formulários', 'Arquivar formulários\nda semana', 'Entrega de documentos'];

async function abrir(opc = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, ...opc });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  const ta = () => p.locator('textarea.qd-edita');
  for (const t of TEXTOS) { await p.keyboard.press('Escape'); await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
  await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(500);
  return { ctx, p };
}
const card = (p, t) => p.locator('.kb-card[data-item]', { hasText: t }).first();
const colDe = (p, t) => card(p, t).evaluate((e) => [...document.querySelectorAll('.kb-col')].findIndex((k) => k.contains(e)));
const ordemDa = (p, i) => p.locator('.kb-col').nth(i).locator('.kb-card[data-item] p').allInnerTexts().then((l) => l.map((x) => x.split('\n')[0]));
/* o que se vê do post-it arrastado: o fantasma (v0.6.64) ou o cartão visível */
const visto = (p, id) => p.evaluate((i) => { const k = document.querySelector(`[data-fantasma="${i}"]`) || [...document.querySelectorAll(`.kb-card[data-item="${i}"]`)].find((e) => e.getBoundingClientRect().width > 0 && !e.classList.contains('saindo')); return k ? k.getBoundingClientRect().toJSON() : null; }, id);

{
  const { ctx, p } = await abrir();
  /* sonda: a cada quadro, a vaga e o topo dos cartões parados */
  await p.evaluate(() => {
    const s = globalThis.__kb = { quadros: [] };
    const passo = () => {
      const col = document.querySelector('.kb-col');
      const filhos = [...col.querySelectorAll('.kb-lista > *')].filter((f) => f.style.display !== 'none');
      const vaga = filhos.findIndex((f) => f.classList.contains('kb-vaga') || f.querySelector(':scope > .kb-vaga'));
      const ys = {}; for (const k of col.querySelectorAll('.kb-card[data-item]:not(.saindo)')) ys[k.dataset.item] = k.getBoundingClientRect().top;
      const anim = document.getAnimations().filter((a) => a.id === 'kb-desliza').length;
      s.quadros.push({ vaga, ys, anim, arrasto: !!document.querySelector('.kb-fantasma') });
      s.raf = requestAnimationFrame(passo);
    };
    passo();
  });
  await caso('F3/F6: descendo devagar pela coluna, a vaga só anda para a frente e os vizinhos só se mexem deslizando (fora do deslize, nenhum pulo de mais de 12 px)', async () => {
    const cs = await p.locator('.kb-col').first().locator('.kb-card').all();
    const b0 = await cs[0].boundingBox(), bN = await cs[cs.length - 1].boundingBox(), x = b0.x + b0.width / 2;
    await p.mouse.move(x, b0.y + 14); await p.mouse.down();
    for (let y = b0.y + 14; y <= bN.y + bN.height + 20; y += 3) { await p.mouse.move(x + Math.sin(y / 9) * 2, y); await p.waitForTimeout(16); }
    const r = await p.evaluate(() => { cancelAnimationFrame(globalThis.__kb.raf); return globalThis.__kb.quadros.filter((q) => q.arrasto); });
    await p.mouse.up(); await p.waitForTimeout(500);
    certo(r.length > 20, 'o arrasto não começou (sem o fantasma)');
    let trocas = 0, voltas = 0, salto = 0;
    for (let i = 1; i < r.length; i++) {
      if (r[i].vaga !== r[i - 1].vaga && r[i].vaga >= 0 && r[i - 1].vaga >= 0) { trocas++; if (r[i].vaga < r[i - 1].vaga) voltas++; }
      if (!r[i].anim && !r[i - 1].anim) for (const id in r[i].ys) if (id in r[i - 1].ys) salto = Math.max(salto, Math.abs(r[i].ys[id] - r[i - 1].ys[id])); /* fora do deslize, ninguém se mexe */
    }
    certo(voltas === 0 && trocas >= 4 && salto <= 12, `trocas ${trocas}, voltas ${voltas}, maior pulo ${Math.round(salto)} px`);
    return `trocas ${trocas}, voltas ${voltas}, maior pulo de um vizinho ${Math.round(salto)} px`;
  });
  await caso('F4: atravessando o vão entre as colunas, a vaga nunca some (a coluna mais perto vale)', async () => {
    const cols = await Promise.all((await p.locator('.kb-col').all()).map((k) => k.boundingBox()));
    const ca = await p.locator('.kb-col').first().locator('.kb-card').first().boundingBox();
    await p.mouse.move(ca.x + ca.width / 2, ca.y + 14); await p.mouse.down();
    let sem = 0, com = 0;
    for (let xx = ca.x + ca.width / 2; xx <= cols[2].x + cols[2].width / 2; xx += 4) { await p.mouse.move(xx, ca.y + 40); await p.waitForTimeout(16); if (await p.locator('.kb-vaga').count()) com++; else sem++; }
    globalThis.__fant = await p.locator('.kb-fantasma').boundingBox();
    globalThis.__id = await p.evaluate(() => document.querySelector('.kb-card.saindo')?.dataset.item);
    certo(com > 0 && sem === 0, `quadros sem vaga: ${sem} (com vaga: ${com})`);
    return `${com} quadros, todos com vaga`;
  });
  await caso('F1: ao soltar, o post-it sai de onde está a mão e voa até a vaga (sem o salto de antes)', async () => {
    const id = globalThis.__id, fant = globalThis.__fant; certo(id && fant, 'sem arrasto em andamento');
    await p.evaluate((i) => { globalThis.__solta = []; const f = () => { const k = document.querySelector(`[data-fantasma="${i}"]`) || [...document.querySelectorAll(`.kb-card[data-item="${i}"]`)].find((e) => e.getBoundingClientRect().width > 0); if (k) globalThis.__solta.push(k.getBoundingClientRect().toJSON()); if (globalThis.__solta.length < 40) requestAnimationFrame(f); }; requestAnimationFrame(f); }, id);
    await p.mouse.up(); await p.waitForTimeout(700);
    const s = await p.evaluate(() => globalThis.__solta);
    const salto0 = Math.hypot(s[0].x - fant.x, s[0].y - fant.y);
    let maior = 0; for (let i = 1; i < s.length; i++) maior = Math.max(maior, Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y));
    const fim = await p.locator(`.kb-card[data-item="${id}"]`).boundingBox();
    const ult = s[s.length - 1];
    certo(salto0 <= 8, `salto no primeiro quadro: ${Math.round(salto0)} px`);
    certo(Math.hypot(ult.x - fim.x, ult.y - fim.y) <= 4, `não terminou no cartão: ${Math.round(ult.x)},${Math.round(ult.y)} × ${Math.round(fim.x)},${Math.round(fim.y)}`); /* 2 px do "passar o mouse" */
    certo(await p.locator(`.kb-card[data-item="${id}"]`).evaluate((e) => [...document.querySelectorAll('.kb-col')].findIndex((k) => k.contains(e))) === 2, 'não foi para a 3ª coluna');
    return `salto ao soltar ${Math.round(salto0)} px; maior passo do voo ${Math.round(maior)} px`;
  });
  await caso('soltar grava o lugar: o post-it entra na coluna e na posição da vaga; Ctrl+Z volta', async () => {
    const alvo = await card(p, 'Receber formulários').boundingBox();
    const a = await card(p, 'Despache').boundingBox();
    await p.mouse.move(a.x + a.width / 2, a.y + 14); await p.mouse.down();
    const cols = await Promise.all((await p.locator('.kb-col').all()).map((k) => k.boundingBox()));
    await p.mouse.move(cols[1].x + cols[1].width / 2, cols[1].y + 60, { steps: 14 }); await p.waitForTimeout(150);
    await p.mouse.up(); await p.waitForTimeout(500);
    const ordem = await ordemDa(p, 1);
    certo(ordem[0] === 'Despache nos Correios', 'coluna 2: ' + ordem.join(' | '));
    await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
    certo(await colDe(p, 'Despache') === 0, 'Ctrl+Z não voltou');
    void alvo;
  });
  await caso('F7: Esc no meio do arrasto devolve o post-it para onde estava (coluna e ordem iguais)', async () => {
    const antes = await ordemDa(p, 0);
    const a = await card(p, 'Despache').boundingBox();
    const cols = await Promise.all((await p.locator('.kb-col').all()).map((k) => k.boundingBox()));
    await p.mouse.move(a.x + a.width / 2, a.y + 14); await p.mouse.down();
    await p.mouse.move(cols[2].x + 60, cols[2].y + 80, { steps: 14 }); await p.waitForTimeout(150);
    await p.keyboard.press('Escape'); await p.waitForTimeout(600); await p.mouse.up(); await p.waitForTimeout(300);
    const depois = await ordemDa(p, 0);
    certo(depois.join('|') === antes.join('|') && !(await p.locator('.kb-fantasma, .kb-vaga').count()), `antes: ${antes.join(' | ')} · depois: ${depois.join(' | ')}`);
  });
  await caso('F5: levando o post-it até a beira, o quadro rola sozinho', async () => {
    await p.setViewportSize({ width: 760, height: 800 }); await p.waitForTimeout(300);
    const kb = p.locator('.kb'); const r0 = await kb.evaluate((e) => e.scrollLeft);
    const c1 = await p.locator('.kb-col').first().locator('.kb-card').first().boundingBox();
    await p.mouse.move(c1.x + c1.width / 2, c1.y + 14); await p.mouse.down();
    await p.mouse.move(745, c1.y + 60, { steps: 20 }); await p.waitForTimeout(900);
    const r1 = await kb.evaluate((e) => e.scrollLeft);
    if (PRINTS) await p.screenshot({ path: `${PRINTS}/kanban-borda.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(500); await p.mouse.up();
    certo(r1 > r0 + 40, `rolagem ${r0} → ${r1}`); return `rolou ${Math.round(r1 - r0)} px`;
  });
  await ctx.close();
}

/* ---------- tremida: animações 5 vezes mais lentas, passando sobre a metade de um cartão alto ---------- */
{
  const { ctx, p } = await abrir({ viewport: { width: 1366, height: 900 } });
  await caso('sem tremida: indo e voltando devagar sobre a metade do cartão alto, a vaga não vai e volta (animações 5 vezes mais lentas)', async () => {
    const cdp = await ctx.newCDPSession(p); await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.2 });
    await p.evaluate(() => { const s = globalThis.__t = { trocas: 0, vaivem: 0, ult: null, hist: [] }; const f = () => { const v = document.querySelector('.kb-vaga'); if (v) { const k = [...v.parentNode.children].filter((e) => e.style.display !== 'none').indexOf(v) + (v.closest('.kb-col')?.dataset.col || ''); if (s.ult !== null && k !== s.ult) { s.trocas++; const h = s.hist, ag = performance.now(); if (h.length && h[h.length - 1].de === k && ag - h[h.length - 1].t < 400) s.vaivem++; h.push({ de: s.ult, t: ag }); } s.ult = k; } requestAnimationFrame(f); }; f(); });
    const res = [];
    for (const [de, sobre] of [['Recebimento', 'Preparo'], ['Despache', 'Preparo']]) {
      await p.evaluate(() => { Object.assign(globalThis.__t, { trocas: 0, vaivem: 0, ult: null, hist: [] }); });
      const a = await card(p, de).boundingBox(), b = await card(p, sobre).boundingBox();
      const x = a.x + 80, y0 = a.y + 14; await p.mouse.move(x, y0); await p.mouse.down(); await p.mouse.move(x, y0 + 8); await p.waitForTimeout(100);
      const lo = b.y - 60, hi = b.y + b.height + 60;
      for (let rep = 0; rep < 2; rep++) {
        for (let y = lo; y <= hi; y += 1.5) { await p.mouse.move(x, y); await p.waitForTimeout(16); }
        for (let y = hi; y >= lo; y -= 1.5) { await p.mouse.move(x, y); await p.waitForTimeout(16); }
      }
      const t = await p.evaluate(() => [globalThis.__t.trocas, globalThis.__t.vaivem]);
      await p.keyboard.press('Escape'); await p.waitForTimeout(1500); await p.mouse.up(); await p.waitForTimeout(300);
      res.push(`${de} sobre ${sobre}: ${t[0]} trocas, ${t[1]} idas e voltas`);
      certo(t[0] >= 2, `${de}: a vaga não andou (${t[0]} trocas)`);
      certo(t[1] === 0, res[res.length - 1]);
    }
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 });
    return res.join('; ');
  });
  await ctx.close();
}

/* ---------- movimento reduzido: arrasta igual, sem deslize ---------- */
{
  const { ctx, p } = await abrir({ reducedMotion: 'reduce' });
  await caso('com "movimento reduzido": arrastar muda a coluna e nada desliza', async () => {
    await p.evaluate(() => { globalThis.__an = 0; const o = Element.prototype.animate; Element.prototype.animate = function (...a) { const r = o.apply(this, a); queueMicrotask(() => { if (r.id === 'kb-desliza' || r.id === 'kb-voo') globalThis.__an++; }); return r; }; });
    const a = await card(p, 'Despache').boundingBox();
    const cols = await Promise.all((await p.locator('.kb-col').all()).map((k) => k.boundingBox()));
    await p.mouse.move(a.x + a.width / 2, a.y + 14); await p.mouse.down();
    await p.mouse.move(cols[1].x + cols[1].width / 2, cols[1].y + 70, { steps: 10 }); await p.mouse.up(); await p.waitForTimeout(300);
    const an = await p.evaluate(() => globalThis.__an);
    certo(await colDe(p, 'Despache') === 1 && an === 0, `coluna ${await colDe(p, 'Despache')}, animações ${an}`);
  });
  await ctx.close();
}

/* ---------- toque: arrasta pela mão de cima (a alça), como antes ---------- */
{
  const { ctx, p } = await abrir({ hasTouch: true });
  await caso('toque: arrastar pela alça leva o post-it para outra coluna (o dedo fora da alça continua rolando)', async () => {
    const cdp = await ctx.newCDPSession(p);
    const c = card(p, 'Despache'); await c.click(); await p.waitForTimeout(150);
    const al = await c.locator('.kb-alca').boundingBox();
    const cols = await Promise.all((await p.locator('.kb-col').all()).map((k) => k.boundingBox()));
    const x0 = al.x + al.width / 2, y0 = al.y + al.height / 2, x1 = cols[1].x + cols[1].width / 2, y1 = cols[1].y + 80;
    const toque = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await toque('touchStart', x0, y0);
    for (let i = 1; i <= 16; i++) { await toque('touchMove', x0 + ((x1 - x0) * i) / 16, y0 + ((y1 - y0) * i) / 16); await p.waitForTimeout(20); }
    await p.waitForTimeout(100); await toque('touchEnd'); await p.waitForTimeout(600);
    certo(await colDe(p, 'Despache') === 1, 'coluna: ' + await colDe(p, 'Despache'));
  });
  await ctx.close();
}

await caso('sem erro na página', async () => { certo(erros.length === 0, erros.join(' | ')); });
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências do arrastar no Kanban passaram.`);
process.exit(falhas ? 1 : 0);
