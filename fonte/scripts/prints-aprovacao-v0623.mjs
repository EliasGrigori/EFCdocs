/* Vértice Docs — prints da v0.6.23 (atalhos do Excel em português, preenchimento, pinça no ponto). Dados inventados.
   Uso: node scripts/prints-aprovacao-v0623.mjs <endereço HOJE> <endereço PROPOSTA> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirSemeado, espera } from './layout/semente.mjs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME });
const vai = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(100); };
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  const a = await abrirSemeado(nav, base, { w: 1366, h: 768, reduzido: true, escala: 2 }); const p = a.page;
  await p.goto(base + '#/planilha'); await p.locator('.tb-arq tr.arq .abre').first().click(); await p.waitForSelector('.pl-cv'); await espera(600);
  const linhas = [['A1', 'Lote'], ['B1', 'Amostra'], ['C1', 'Nível'], ['D1', 'Diluição'], ['A2', 'A'], ['B2', 'Amostra A'], ['C2', 'I'], ['D2', '2'], ['A3', 'B'], ['B3', 'Amostra B'], ['C3', 'II'], ['D3', '4'], ['D4', '8']];
  for (const [r, v] of linhas) { await vai(p, r); await p.keyboard.type(v); await p.keyboard.press('Enter'); }
  const cv = await p.locator('.pl-cv').boundingBox();
  const arrasta = async (col, l1, l2, ate) => { await vai(p, `${col}${l1}:${col}${l2}`); const c = col.charCodeAt(0) - 65; const x = cv.x + 30 + c * 80 + 79, y0 = cv.y + 24 + l2 * 22 - 1, y1 = cv.y + 24 + ate * 22 - 4; await p.mouse.move(x, y0); await p.mouse.down(); await p.mouse.move(x, y1, { steps: 12 }); await p.mouse.up(); await espera(250); };
  await arrasta('A', 2, 3, 7); await arrasta('B', 2, 3, 7); await arrasta('C', 2, 3, 7); await arrasta('D', 2, 4, 7);
  await vai(p, 'F1'); await espera(200);
  await p.screenshot({ path: `${PASTA}/serie-${lado}.png`, clip: { x: cv.x, y: cv.y, width: 360, height: 200 } });
  await p.screenshot({ path: `${PASTA}/busca-${lado}.png`, clip: { x: 0, y: 0, width: 1366, height: 44 } });
  await vai(p, 'B2'); await p.keyboard.press('Control+b'); await espera(500);
  await p.screenshot({ path: `${PASTA}/ctrlb-${lado}.png` });
  if (lado === 'prop') {
    const recs = await p.evaluate(async () => { const db = await new Promise((ok) => { const r = indexedDB.open('efcdocs', 1); r.onsuccess = () => ok(r.result); }); return new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAll(); r.onsuccess = () => ok(r.result); }); });
    writeFileSync(`${PASTA}/sementes.json`, JSON.stringify(recs)); writeFileSync(`${PASTA}/armazem.json`, '{}'); writeFileSync(`${PASTA}/mapa.json`, '[]'); writeFileSync(`${PASTA}/abas.json`, '[]');
  }
  console.log(lado, a.erros.slice(0, 2)); await a.ctx.close();
}
await nav.close();
