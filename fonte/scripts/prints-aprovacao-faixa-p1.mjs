/* Vértice Docs — prints da faixa igual ao Excel (v0.6.21, parte 1: Página Inicial). Dados inventados.
   Uso: node scripts/prints-aprovacao-faixa-p1.mjs <endereço HOJE> <endereço PROPOSTA> <pasta de saída> */
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
const grupo = (p, nome) => p.evaluate((nome) => { const g = [...document.querySelectorAll('.ribbon .rb-g')].find((x) => x.getAttribute('aria-label') === nome); if (!g) return null; const r = g.getBoundingClientRect(); return { x: Math.min(1280 - 430, Math.max(212, r.left - 14)), y: 84, width: 430, height: 112 }; }, nome);

for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  for (const tema of ['claro', 'escuro']) {
    const a = await abrir(base, { tema, escala: 2 }); const p = a.page; await encher(p);
    await celula(p, 'C2');
    await p.screenshot({ path: `${PASTA}/faixa${tema === 'escuro' ? '-escuro' : ''}-${lado}.png`, clip: { x: 212, y: 40, width: 1068, height: 330 } });
    if (tema === 'claro') for (const [arq, nome] of [['g-fonte', 'Fonte'], ['g-alinhamento', 'Alinhamento'], ['g-numero', 'Número'], ['g-celulas', 'Células'], ['g-edicao', 'Edição']]) {
      const c = await grupo(p, nome); if (c) await p.screenshot({ path: `${PASTA}/${arq}-${lado}.png`, clip: c });
    }
    console.log(lado, tema, a.erros.slice(0, 2)); await a.ctx.close();
  }
}
/* só na PROPOSTA: listas abertas, efeito na planilha, tela larga, celular e as sementes da demonstração */
{
  const a = await abrir(PROP, { escala: 2 }); const p = a.page; await encher(p);
  const recs0 = async () => p.evaluate(async () => { const db = await new Promise((ok) => { const r = indexedDB.open('efcdocs', 1); r.onsuccess = () => ok(r.result); }); return new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAll(); r.onsuccess = () => ok(r.result); }); });
  await espera(3000);
  writeFileSync(`${PASTA}/sementes.json`, JSON.stringify(await recs0())); writeFileSync(`${PASTA}/armazem.json`, '{}'); writeFileSync(`${PASTA}/mapa.json`, '[]');
  const foto = (n, h = 430, x = 212, w = 1068) => p.screenshot({ path: `${PASTA}/${n}-prop.png`, clip: { x, y: 40, width: w, height: h } });
  await celula(p, 'A1'); await p.click('[data-cx=fonte]'); await espera(350); await foto('l-fonte', 330, 212, 560); await p.click('.rb-lista [data-valor="formatar.fonte|f:Times New Roman"]'); await espera(150);
  await p.click('[data-cx=tamanho]'); await espera(350); await foto('l-tamanho', 500, 212, 560); await p.click('.rb-lista [data-valor="formatar.fonte|t:16"]'); await espera(150);
  await p.click('.ribbon [data-cmd="formatar.negrito"]');
  await celula(p, 'D2'); await p.keyboard.down('Shift'); for (let i = 0; i < 3; i++) await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowRight'); await p.keyboard.up('Shift');
  await p.click('[data-cx=numero]'); await espera(350); await foto('l-numero', 600, 480, 560); await p.click('.rb-lista [data-valor="formatar.formatoNumero|moeda"]'); await espera(200);
  await celula(p, 'B1'); await p.click('.ribbon [data-cmd="formatar.meio"]'); await celula(p, 'C1'); await p.click('.ribbon [data-cmd="formatar.cima"]'); await p.click('.ribbon [data-cmd="formatar.centro"]');
  await celula(p, 'D3'); await espera(200); await foto('efeito', 330);
  await p.click('[data-menu-faixa=inserir]'); await espera(350); await foto('l-inserir', 290, 720, 560); await p.keyboard.press('Escape');
  await p.click('[data-menu-faixa=formatar]'); await espera(350); await foto('l-formatar', 290, 720, 560); await p.keyboard.press('Escape');
  await p.click('[data-menu-faixa=limpar]'); await espera(350); await foto('l-limpar', 290, 720, 560); await p.keyboard.press('Escape');
  await p.click('[data-menu-faixa=preencher]'); await espera(350); await foto('l-preencher', 290, 720, 560); await p.keyboard.press('Escape');
  await a.ctx.close();
  const l = await abrir(PROP, { w: 1920, h: 900 }); await encher(l.page); await l.page.screenshot({ path: `${PASTA}/larga-prop.png`, clip: { x: 212, y: 84, width: 1708, height: 112 } }); await l.ctx.close();
  for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
    const c = await abrir(base, { w: 390, h: 844, toque: true }); const q = c.page; await espera(300);
    await q.screenshot({ path: `${PASTA}/cel-${lado}.png` });
    const abas = q.locator('button:has-text("Abas")').first(); if (await abas.count()) { await abas.click(); await espera(500); await q.screenshot({ path: `${PASTA}/cel-abas-${lado}.png` }); }
    console.log('celular', lado, c.erros.slice(0, 2)); await c.ctx.close();
  }
}
await nav.close();
