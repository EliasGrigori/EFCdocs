/* Vértice Docs — prints do app de verdade para a página de aprovação do visual novo (v0.6.20, parte 4).
   Uso: node scripts/prints-aprovacao-layout-p4.mjs <endereço HOJE> <endereço PROPOSTA> <pasta de saída> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { abrirSemeado, espera } from './layout/semente.mjs';
import { montarKanban } from './layout/kanban-semente.mjs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-qualidade.xlsx', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME });
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  let a = await abrirSemeado(nav, base, { reduzido: true }); let p = a.page;
  const foto = (n, clip) => p.screenshot({ path: `${PASTA}/${n}-${lado}.png`, clip });
  await montarKanban(p, base);
  await foto('kanban'); await foto('kb-topo', { x: 212, y: 250, width: 900, height: 140 });
  const c = await p.locator('.kb-card').first().boundingBox(); await foto('kb-cartao', { x: c.x - 16, y: c.y - 14, width: c.width + 32, height: c.height + 28 });
  /* arrastando: o segundo cartão da primeira coluna a caminho da última */
  const de = await p.locator('.kb-col').nth(0).locator('.kb-card').nth(1).boundingBox(), para = await p.locator('.kb-col').nth(2).locator('.kb-lista').boundingBox();
  await p.mouse.move(de.x + 40, de.y + 30); await p.mouse.down(); for (let i = 1; i <= 10; i++) { await p.mouse.move(de.x + 40 + (para.x + 70 - de.x - 40) * i / 10, de.y + 30 + (para.y + 30 - de.y - 30) * i / 10); await espera(25); }
  await espera(200); await foto('kb-arrasto', { x: 212, y: 250, width: 1068, height: 420 }); await p.mouse.up(); await espera(500);
  await a.ctx.close();
  a = await abrirSemeado(nav, base, { reduzido: true, tema: 'escuro' }); p = a.page; await montarKanban(p, base); await foto('kb-escuro'); await a.ctx.close();
  a = await abrirSemeado(nav, base, { reduzido: true, w: 390, h: 844, toque: true }); p = a.page;
  await p.goto(base + '#/postits'); await espera(600); await p.locator('.tb-arq tr.arq .abre').first().click(); await espera(1500);
  const kb = p.locator('.qd-vistas button:has-text("Kanban")'); if (await kb.count()) { await kb.click(); await espera(600); }
  for (const [col, txt] of [[0, 'Conferir extintores do galpão'], [0, 'Trocar luvas da equipe']]) { const b = p.locator('.kb-col').nth(col).locator('.kb-novo'); if (await b.count()) { await b.click(); const ta = p.locator('textarea.kb-edita'); await ta.fill(txt); await ta.press('Control+Enter'); await espera(200); } }
  await espera(400); await foto('kb-cel'); await a.ctx.close();
  a = await abrirSemeado(nav, base, { reduzido: true }); p = a.page;
  await p.goto(base + '#/pastas'); await espera(600); await foto('pastas', { x: 212, y: 50, width: 1068, height: 750 });
  await p.goto(base + '#/'); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 }); await espera(900);
  await p.locator('.janela').screenshot({ path: `${PASTA}/excel-${lado}.png` });
  await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await espera(900);
  const pos = await p.evaluate(() => { const k = document.querySelector('.pl-cv').getBoundingClientRect(); return { x: k.left, y: k.top }; });
  for (let dx = 60; dx < 520; dx += 12) { await p.mouse.move(pos.x + dx, pos.y + 75); await espera(40); if (await p.locator('[data-balao=com]').count()) break; }
  await espera(400); await foto('balao', { x: 240, y: 290, width: 480, height: 150 }); await p.mouse.move(5, 400);
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('E2'); await p.locator('.pl-nome').press('Enter');
  await p.click('.tabs .tab:has-text("Fórmulas")'); await espera(300); await p.locator('[data-cmd="formula.explicar"]').first().click(); await p.waitForSelector('.janela'); await espera(600);
  await p.locator('.janela').screenshot({ path: `${PASTA}/explicar-${lado}.png` });
  await a.ctx.close(); console.log('prints de', lado);
}
{
  const a = await abrirSemeado(nav, PROP, { reduzido: true }); await montarKanban(a.page, PROP); await a.page.goto(PROP + '#/'); await espera(1200);
  const recs = await a.page.evaluate(async () => { const db = await new Promise((ok) => { const r = indexedDB.open('efcdocs', 1); r.onsuccess = () => ok(r.result); }); return new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAll(); r.onsuccess = () => ok(r.result); }); });
  writeFileSync(`${PASTA}/sementes.json`, JSON.stringify(recs)); writeFileSync(`${PASTA}/armazem.json`, '{}'); await a.ctx.close(); console.log('sementes:', recs.length);
}
await nav.close();
