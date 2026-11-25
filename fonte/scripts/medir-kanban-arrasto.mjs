/* Vértice Docs — medição do arrastar no Kanban (estudo de 25/11/2026, base da proposta do Kanban novo).
   Arrasta um post-it devagar, de cima para baixo, numa coluna com 6 cartões e mede:
   - trocas da vaga: quantas vezes a vaga muda de lugar; "voltas" = mudou para trás com o mouse só descendo (tremida);
   - salto dos vizinhos: maior pulo de um cartão parado entre dois quadros, sem animação (px);
   - custo de cada movimento (ms entre o pointermove e o quadro seguinte);
   - borda: arrastar até a beira da tela rola o quadro sozinho?
   Uso: node scripts/medir-kanban-arrasto.mjs <endereço> [arquivo.json] */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8731/';
const SAIDA = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 } });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const ta = () => p.locator('textarea.qd-edita');
const textos = ['Recebimento de amostras', 'Preparo de amostras\ncom conferência do lacre', 'Despache nos Correios', 'Receber formulários', 'Arquivar formulários\nda semana\nno armário 2', 'Entrega de documentos'];
for (const t of textos) { await p.keyboard.press('Escape'); await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(120); await p.keyboard.press('Escape'); }
await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(500);

/* sonda na página: a cada quadro, onde está a vaga e onde estão os cartões parados */
await p.evaluate(() => {
  const s = globalThis.__kb = { quadros: [], custos: [] };
  let ultimoMove = 0;
  addEventListener('pointermove', () => { ultimoMove = performance.now(); requestAnimationFrame(() => s.custos.push(performance.now() - ultimoMove)); }, true);
  const passo = () => {
    const col = document.querySelector('.kb-col');
    if (col) {
      const filhos = [...col.querySelectorAll('.kb-lista > *')];
      const vaga = filhos.findIndex((f) => f.classList.contains('kb-vaga') || f.querySelector(':scope > .kb-vaga'));
      const ys = {}; for (const k of col.querySelectorAll('.kb-card[data-item]:not(.saindo)')) ys[k.dataset.item] = k.getBoundingClientRect().top;
      const anim = document.getAnimations().filter((a) => a.id === 'kb-desliza' || a.id === 'kb-abre').length;
      s.quadros.push({ t: performance.now(), vaga, ys, anim, arrasto: !!document.querySelector('.kb-fantasma') });
    }
    s.raf = requestAnimationFrame(passo);
  };
  passo();
});
const cards = await p.locator('.kb-col').first().locator('.kb-card').all();
const b0 = await cards[0].boundingBox();
const bN = await cards[cards.length - 1].boundingBox();
const x = b0.x + b0.width / 2;
await p.mouse.move(x, b0.y + 14); await p.mouse.down();
const fim = bN.y + bN.height + 20;
/* desce 3 px por vez, como uma mão calma */
for (let y = b0.y + 14; y <= fim; y += 3) { await p.mouse.move(x + Math.sin(y / 9) * 2, y); await p.waitForTimeout(16); }
const r = await p.evaluate(() => { const s = globalThis.__kb; cancelAnimationFrame(s.raf); return s; });
await p.mouse.up(); await p.waitForTimeout(400);

/* atravessar colunas: quantos quadros sem vaga nenhuma (pisca) e, ao soltar, o salto entre o fantasma e o cartão */
const colsB = await Promise.all((await p.locator('.kb-col').all()).map((k) => k.boundingBox()));
const ca = await p.locator('.kb-col').first().locator('.kb-card').first().boundingBox();
await p.mouse.move(ca.x + ca.width / 2, ca.y + 14); await p.mouse.down();
const alvoX = colsB[2].x + colsB[2].width / 2, yy = ca.y + 40;
let semVaga = 0, comVaga = 0;
for (let xx = ca.x + ca.width / 2; xx <= alvoX; xx += 4) {
  await p.mouse.move(xx, yy); await p.waitForTimeout(16);
  const v = await p.locator('.kb-vaga').count(); if (v) comVaga++; else if (comVaga) semVaga++;
}
const fant = await p.locator('.kb-fantasma').boundingBox();
const idA = await p.locator('.kb-fantasma').evaluate(() => document.querySelector('.kb-card.saindo')?.dataset.item);
/* o que se vê do post-it solto: o fantasma que voa até a vaga (v0.6.64, data-fantasma) ou, sem ele, o cartão (que não está escondido) */
await p.evaluate((id) => { globalThis.__solta = []; const f = () => { const k = document.querySelector(`[data-fantasma="${id}"]`) || [...document.querySelectorAll(`.kb-card[data-item="${id}"]`)].find((e) => e.getBoundingClientRect().width > 0); if (k) globalThis.__solta.push(k.getBoundingClientRect().toJSON()); if (globalThis.__solta.length < 30) requestAnimationFrame(f); }; requestAnimationFrame(f); }, idA);
await p.mouse.up(); await p.waitForTimeout(600);
const solta = await p.evaluate(() => globalThis.__solta);
const primeiro = solta[0] || fant;
const saltoAoSoltar = Math.round(Math.hypot(primeiro.x - fant.x, primeiro.y - fant.y));

/* borda: pegar um cartão e levar até a beira direita da tela */
await p.setViewportSize({ width: 760, height: 800 }); await p.waitForTimeout(300);
const kb = p.locator('.kb');
const rol0 = await kb.evaluate((e) => e.scrollLeft);
const c1 = await p.locator('.kb-col').first().locator('.kb-card').first().boundingBox();
await p.mouse.move(c1.x + c1.width / 2, c1.y + 14); await p.mouse.down();
await p.mouse.move(745, c1.y + 60, { steps: 20 });
await p.waitForTimeout(1200);
const rol1 = await kb.evaluate((e) => e.scrollLeft);
await p.mouse.up();

const qs = r.quadros.filter((q) => q.arrasto);
let trocas = 0, voltas = 0, salto = 0;
for (let i = 1; i < qs.length; i++) {
  if (qs[i].vaga !== qs[i - 1].vaga && qs[i].vaga >= 0 && qs[i - 1].vaga >= 0) { trocas++; if (qs[i].vaga < qs[i - 1].vaga) voltas++; }
  if (!qs[i].anim) for (const id in qs[i].ys) if (id in qs[i - 1].ys) salto = Math.max(salto, Math.abs(qs[i].ys[id] - qs[i - 1].ys[id]));
}
const custos = r.custos.slice().sort((a, b) => a - b), med = custos[Math.floor(custos.length / 2)] || 0, p95 = custos[Math.floor(custos.length * 0.95)] || 0;
const res = { quadros: qs.length, trocasDaVaga: trocas, voltasDaVaga: voltas, maiorSaltoSemAnimacaoPx: Math.round(salto), custoMovimentoMs: { mediana: +med.toFixed(1), p95: +p95.toFixed(1) }, rolouNaBorda: rol1 > rol0, quadrosSemVagaAoAtravessar: semVaga, saltoAoSoltarPx: saltoAoSoltar, rolagem: [rol0, rol1], erros };
console.log(JSON.stringify(res, null, 1));
if (SAIDA) writeFileSync(SAIDA, JSON.stringify(res, null, 1));
await nav.close();
