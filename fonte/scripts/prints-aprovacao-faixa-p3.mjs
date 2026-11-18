/* Vértice Docs — prints da faixa igual ao Excel (v0.6.21, parte 3: Layout da Página, Dados, Revisão e Exibir). Dados inventados.
   Uso: node scripts/prints-aprovacao-faixa-p3.mjs <endereço HOJE> <endereço PROPOSTA> <pasta de saída> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirSemeado, espera } from './layout/semente.mjs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME });
const DADOS = [['A1', 'Canteiro'], ['B1', 'Cultura'], ['C1', 'Colhido (kg)'], ['D1', 'Preço do kg'], ['E1', 'Total'],
  ['A2', 'Canteiro 1'], ['B2', 'Tomate'], ['C2', '42'], ['D2', '6,5'], ['E2', '=C2*D2'],
  ['A3', 'Canteiro 2'], ['B3', 'Alface'], ['C3', '58'], ['D3', '4,2'], ['E3', '=C3*D3'],
  ['A4', 'Canteiro 3'], ['B4', 'Couve'], ['C4', '73'], ['D4', '7,8'], ['E4', '=C4*D4'],
  ['A5', 'Canteiro 4'], ['B5', 'Cenoura'], ['C5', '31'], ['D5', '5'], ['E5', '=C5*D5']];
const celula = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(90); };
const abrir = async (base, op) => { const a = await abrirSemeado(nav, base, { reduzido: true, ...op }); const p = a.page; await p.goto(base + '#/planilha'); await p.locator('.tb-arq tr.arq .abre').first().click(); await p.waitForSelector('.pl-cv'); await espera(600); return a; };
const encher = async (p) => { for (const [ref, v] of DADOS) { await celula(p, ref); await p.keyboard.type(v); await p.keyboard.press('Enter'); } await celula(p, 'A1'); await espera(200); };
const aba = async (p, nome) => { await p.click(`.tabs .tab:has-text("${nome}")`); await espera(450); };
const FAIXA = { x: 212, y: 40, width: 1068, height: 160 };
const ABAS = [['layout', 'Layout da Página'], ['dados', 'Dados'], ['revisao', 'Revisão'], ['exibir', 'Exibir']];

for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  const a = await abrir(base, { escala: 2 }); const p = a.page; await encher(p);
  for (const [arq, nome] of ABAS) { await aba(p, nome); await p.screenshot({ path: `${PASTA}/${arq}-${lado}.png`, clip: FAIXA }); }
  console.log(lado, a.erros.slice(0, 2)); await a.ctx.close();
  const e = await abrir(base, { escala: 2, tema: 'escuro' }); await encher(e.page); await aba(e.page, 'Layout da Página');
  await e.page.screenshot({ path: `${PASTA}/layout-escuro-${lado}.png`, clip: FAIXA }); await e.ctx.close();
  const c = await abrir(base, { w: 390, h: 844, toque: true }); const q = c.page; await espera(300);
  const abas = q.locator('button:has-text("Abas")').first(); if (await abas.count()) { await abas.click(); await espera(500); }
  const tab = q.locator('.tabs .tab:has-text("Dados")'); if (await tab.count()) { await tab.click(); await espera(500); }
  await q.screenshot({ path: `${PASTA}/cel-dados-${lado}.png` }); await c.ctx.close();
}

/* só na PROPOSTA: as listas, o resultado de A a Z, a janela com a grade marcada, a tela larga e as sementes da demonstração */
{
  const a = await abrir(PROP, { escala: 2 }); const p = a.page; await encher(p);
  const recs0 = async () => p.evaluate(async () => { const db = await new Promise((ok) => { const r = indexedDB.open('efcdocs', 1); r.onsuccess = () => ok(r.result); }); return new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAll(); r.onsuccess = () => ok(r.result); }); });
  await espera(3000);
  writeFileSync(`${PASTA}/abas.json`, JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.tabs .tab')].map((t) => t.textContent.trim()))));
  writeFileSync(`${PASTA}/sementes.json`, JSON.stringify(await recs0())); writeFileSync(`${PASTA}/armazem.json`, '{}'); writeFileSync(`${PASTA}/mapa.json`, '[]');
  const foto = (n, clip) => p.screenshot({ path: `${PASTA}/${n}-prop.png`, clip });
  const lista = async (k, n, x = 212, w = 560, h = 420) => { await p.click(`[data-menu-faixa=${k}]`); await espera(450); await foto(n, { x, y: 40, width: w, height: h }); await p.keyboard.press('Escape'); await espera(200); };
  await aba(p, 'Layout da Página');
  await lista('margens', 'l-margens'); await lista('orientacao', 'l-orientacao'); await lista('papel', 'l-papel', 260);
  await lista('areaImp', 'l-area', 300); await lista('quebras', 'l-quebras', 360); await lista('ajustarPag', 'l-ajustar', 520);
  await p.click('.ribbon [data-cmd="impressao.grade"]'); await espera(300);
  await foto('opcoes', { x: 760, y: 40, width: 520, height: 160 });
  await p.click('.ribbon [data-cmd="impressao.configurar"]'); await p.waitForSelector('[data-imp-grade]'); await espera(500);
  await p.locator('[data-imp-grade]').scrollIntoViewIfNeeded(); await espera(300); await p.screenshot({ path: `${PASTA}/janela-grade-prop.png` });
  await p.keyboard.press('Escape'); await espera(300); if (await p.locator('.janela').count()) { await p.keyboard.press('Escape'); await espera(300); }
  await celula(p, 'B3'); await aba(p, 'Dados'); await p.click('.ribbon [data-cmd="dados.az"]'); await espera(500); await celula(p, 'B2');
  await foto('ordenado', { x: 212, y: 40, width: 1068, height: 400 });
  await p.keyboard.press('Control+z'); await espera(300);
  await aba(p, 'Exibir'); await lista('congelar', 'l-congelar', 300, 560, 300);
  console.log('proposta', a.erros.slice(0, 2)); await a.ctx.close();
  for (const w of [1440, 1920]) {
    const t = await abrir(PROP, { w, h: 800 }); await encher(t.page); await aba(t.page, 'Exibir');
    await t.page.screenshot({ path: `${PASTA}/exibir-${w}-prop.png`, clip: { x: 0, y: 0, width: w, height: 200 } }); await t.ctx.close();
  }
}
await nav.close();
