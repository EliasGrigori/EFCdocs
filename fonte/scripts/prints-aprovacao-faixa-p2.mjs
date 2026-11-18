/* Vértice Docs — prints da faixa igual ao Excel (v0.6.21, parte 2: abas Inserir e Fórmulas; Formatar com altura e largura). Dados inventados.
   Uso: node scripts/prints-aprovacao-faixa-p2.mjs <endereço HOJE> <endereço PROPOSTA> <pasta de saída> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirSemeado, espera } from './layout/semente.mjs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME });
const DADOS = [['A1', 'Canteiro'], ['B1', 'Cultura'], ['C1', 'Colhido (kg)'], ['D1', 'Preço do kg'], ['E1', 'Total'],
  ['A2', 'Canteiro 1'], ['B2', 'Alface'], ['C2', '42'], ['D2', '6,5'], ['E2', '=C2*D2'],
  ['A3', 'Canteiro 2'], ['B3', 'Cenoura'], ['C3', '58'], ['D3', '4,2'], ['E3', '=C3*D3'],
  ['A4', 'Canteiro 3'], ['B4', 'Tomate'], ['C4', '73'], ['D4', '7,8'], ['E4', '=C4*D4'],
  ['A5', 'Canteiro 4'], ['B5', 'Couve'], ['C5', '31'], ['D5', '5'], ['E5', '=C5*D5']];
const celula = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(90); };
const abrir = async (base, op) => { const a = await abrirSemeado(nav, base, { reduzido: true, ...op }); const p = a.page; await p.goto(base + '#/planilha'); await p.locator('.tb-arq tr.arq .abre').first().click(); await p.waitForSelector('.pl-cv'); await espera(600); return a; };
const encher = async (p) => { for (const [ref, v] of DADOS) { await celula(p, ref); await p.keyboard.type(v); await p.keyboard.press('Enter'); } await celula(p, 'A1'); await espera(200); };
const aba = async (p, nome) => { await p.click(`.tabs .tab:has-text("${nome}")`); await espera(450); };
const grupo = (p, nome, larg = 520) => p.evaluate(([nome, larg]) => { const g = [...document.querySelectorAll('.ribbon .rb-g')].find((x) => x.getAttribute('aria-label') === nome); if (!g) return null; const r = g.getBoundingClientRect(); return { x: Math.min(innerWidth - larg, Math.max(212, r.left - 14)), y: 84, width: larg, height: 112 }; }, [nome, larg]);
const FAIXA = { x: 212, y: 40, width: 1068, height: 160 };
const lista = 'rb-lista:not([data-fz-fant])';

for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  const a = await abrir(base, { escala: 2 }); const p = a.page; await encher(p);
  await aba(p, 'Inserir'); await p.screenshot({ path: `${PASTA}/inserir-${lado}.png`, clip: FAIXA });
  await aba(p, 'Fórmulas'); await p.screenshot({ path: `${PASTA}/formulas-${lado}.png`, clip: FAIXA });
  await aba(p, 'Página Inicial');
  const est = await grupo(p, 'Estilos', 430); if (est) await p.screenshot({ path: `${PASTA}/g-estilos-${lado}.png`, clip: est });
  await celula(p, 'C2');
  const fm = p.locator('[data-menu-faixa=formatar]');
  if (await fm.count()) { await fm.click(); await espera(400); await p.screenshot({ path: `${PASTA}/l-formatar-${lado}.png`, clip: { x: 720, y: 40, width: 560, height: 560 } }); await p.keyboard.press('Escape'); await espera(200); }
  console.log(lado, a.erros.slice(0, 2)); await a.ctx.close();
  const e = await abrir(base, { escala: 2, tema: 'escuro' }); await encher(e.page); await aba(e.page, 'Fórmulas');
  await e.page.screenshot({ path: `${PASTA}/formulas-escuro-${lado}.png`, clip: FAIXA }); await e.ctx.close();
}

/* só na PROPOSTA: grupos de perto, listas, a janela do gráfico, a pergunta da largura, outras telas e as sementes da demonstração */
{
  const a = await abrir(PROP, { escala: 2 }); const p = a.page; await encher(p);
  const recs0 = async () => p.evaluate(async () => { const db = await new Promise((ok) => { const r = indexedDB.open('efcdocs', 1); r.onsuccess = () => ok(r.result); }); return new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAll(); r.onsuccess = () => ok(r.result); }); });
  await espera(3000);
  writeFileSync(`${PASTA}/abas.json`, JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.tabs .tab')].map((t) => t.textContent.trim()))));
  writeFileSync(`${PASTA}/sementes.json`, JSON.stringify(await recs0())); writeFileSync(`${PASTA}/armazem.json`, '{}'); writeFileSync(`${PASTA}/mapa.json`, '[]');
  const foto = (n, clip) => p.screenshot({ path: `${PASTA}/${n}-prop.png`, clip });
  await aba(p, 'Inserir');
  const gg = await grupo(p, 'Gráficos', 430); if (gg) await foto('g-graficos', gg);
  await p.click('[data-menu-faixa=outrosGraficos]'); await espera(400); await foto('l-outros', { x: 400, y: 40, width: 560, height: 420 }); await p.keyboard.press('Escape'); await espera(200);
  await celula(p, 'A1'); await p.click('.ribbon [data-cmd="inserir.grafico|pizza"]'); await p.waitForSelector('.janela.gr-jan'); await espera(700);
  await p.screenshot({ path: `${PASTA}/janela-pizza-prop.png` }); await p.keyboard.press('Escape'); await espera(300); if (await p.locator('.janela.gr-jan').count()) { await p.keyboard.press('Escape'); await espera(300); }
  await aba(p, 'Fórmulas');
  const bib = await grupo(p, 'Biblioteca de funções', 560); if (bib) await foto('g-biblioteca', bib);
  await celula(p, 'C6'); await aba(p, 'Fórmulas'); await p.click('[data-menu-faixa=autosoma]'); await espera(400); await foto('l-autosoma', { x: 212, y: 40, width: 560, height: 420 });
  await p.click('.rb-lista [data-cmd="formula.autosoma|MÉDIA"]'); await espera(300); await foto('autosoma-media', { x: 212, y: 40, width: 1068, height: 400 }); await p.keyboard.press('Escape'); await espera(200);
  await p.click('[data-menu-faixa=fnLogica]'); await espera(400); await p.hover('.rb-lista [data-cmd="formula.inserir|IF"]'); await espera(1200);
  await foto('l-logica', { x: 212, y: 40, width: 900, height: 560 }); await p.keyboard.press('Escape'); await espera(200);
  await p.click('[data-menu-faixa=fnMat]'); await espera(400); await foto('l-matematica', { x: 300, y: 40, width: 600, height: 760 });
  await p.click('.rb-lista .fim'); await p.waitForSelector('.janela.pl-jfun'); await espera(500); await p.screenshot({ path: `${PASTA}/janela-funcoes-prop.png` }); await p.keyboard.press('Escape'); await espera(300);
  const nd = await grupo(p, 'Nomes definidos', 560); if (nd) await foto('g-nomes', nd);
  await aba(p, 'Página Inicial'); await celula(p, 'B2'); await p.click('[data-menu-faixa=formatar]'); await espera(350); await p.click('.rb-lista [data-cmd="planilha.larguraColuna"]'); await espera(500);
  await p.screenshot({ path: `${PASTA}/largura-prop.png` }); await p.keyboard.press('Escape');
  console.log('proposta', a.erros.slice(0, 2)); await a.ctx.close();
  for (const [w, nome, abaN] of [[1100, 'tela-1100', 'Inserir'], [1920, 'tela-1920', 'Fórmulas']]) {
    const t = await abrir(PROP, { w, h: 800 }); await encher(t.page); await aba(t.page, abaN);
    await t.page.screenshot({ path: `${PASTA}/${nome}-prop.png`, clip: { x: 0, y: 0, width: w, height: 200 } }); await t.ctx.close();
  }
  for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
    const c = await abrir(base, { w: 390, h: 844, toque: true }); const q = c.page; await espera(300);
    const abas = q.locator('button:has-text("Abas")').first(); if (await abas.count()) { await abas.click(); await espera(500); }
    const tab = q.locator('.tabs .tab:has-text("Fórmulas")'); if (await tab.count()) { await tab.click(); await espera(500); }
    await q.screenshot({ path: `${PASTA}/cel-formulas-${lado}.png` });
    console.log('celular', lado, c.erros.slice(0, 2)); await c.ctx.close();
  }
}
void lista;
await nav.close();
