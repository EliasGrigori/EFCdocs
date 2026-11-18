/* Vértice Docs — prints da v0.6.22 (pinça, soltar arquivo, menu em tela média, desfazer da tabela). Dados inventados.
   Uso: node scripts/prints-aprovacao-v0622.mjs <endereço HOJE> <endereço PROPOSTA> <pasta de saída> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { abrirSemeado, espera } from './layout/semente.mjs';
const [HOJE, PROP, PASTA] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME });
const XLSX = readFileSync(new URL('../testes/amostras/amostra-qualidade.xlsx', import.meta.url)).toString('base64');
const DADOS = [['A1', 'Canteiro'], ['B1', 'Cultura'], ['C1', 'Colhido (kg)'], ['A2', 'Canteiro 1'], ['B2', 'Tomate'], ['C2', '42'], ['A3', 'Canteiro 2'], ['B3', 'Alface'], ['C3', '58'], ['A4', 'Canteiro 3'], ['B4', 'Couve'], ['C4', '73']];
const celula = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(90); };
const abrePl = async (p, base) => { await p.goto(base + '#/planilha'); await p.locator('.tb-arq tr.arq .abre').first().click(); await p.waitForSelector('.pl-cv'); await espera(600); };
const encher = async (p) => { for (const [r, v] of DADOS) { await celula(p, r); await p.keyboard.type(v); await p.keyboard.press('Enter'); } await celula(p, 'A1'); await espera(200); };
const soltar = (p, sel, nome, tipo, b64, soltaTambem = true) => p.evaluate(async ({ sel, nome, tipo, b64, soltaTambem }) => {
  const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const dt = new DataTransfer(); dt.items.add(new File([u], nome, { type: tipo })); const alvo = document.querySelector(sel) || document.body;
  for (const t of ['dragenter', 'dragover']) alvo.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt }));
  if (soltaTambem) alvo.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
}, { sel, nome, tipo, b64, soltaTambem });
const pinca = async (p, de, ate) => {
  const cdp = await p.context().newCDPSession(p); const b = await p.locator('.pl-cv').boundingBox();
  const cx = b.x + b.width / 2, cy = b.y + b.height / 3, pts = (d) => [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(de) });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(de + ((ate - de) / 10) * i) }); await espera(20); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await espera(400);
};
for (const [lado, base] of [['hoje', HOJE], ['prop', PROP]]) {
  /* celular depois da pinça */
  const c = await abrirSemeado(nav, base, { w: 390, h: 844, toque: true, reduzido: true, escala: 2 }); await abrePl(c.page, base); await encher(c.page);
  await pinca(c.page, 40, 110); await c.page.screenshot({ path: `${PASTA}/pinca-${lado}.png` }); await c.ctx.close();
  /* tela de 1366 com a planilha aberta */
  const m = await abrirSemeado(nav, base, { w: 1366, h: 768, reduzido: true }); await abrePl(m.page, base); await encher(m.page);
  await m.page.screenshot({ path: `${PASTA}/media-${lado}.png` }); await m.ctx.close();
  /* soltar um Excel no Início */
  const s = await abrirSemeado(nav, base, { w: 1366, h: 768, reduzido: true }); await s.page.goto(base + '#/'); await s.page.waitForSelector('.wk-main'); await espera(300);
  await soltar(s.page, '.wk-main', 'Amostra de controle.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', XLSX, false); await espera(300);
  await s.page.screenshot({ path: `${PASTA}/solta-${lado}.png` });
  await soltar(s.page, '.wk-main', 'Amostra de controle.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', XLSX); await espera(3500);
  await s.page.screenshot({ path: `${PASTA}/soltou-${lado}.png` }); await s.ctx.close();
}
{
  const s = await abrirSemeado(nav, PROP, { w: 1366, h: 768, reduzido: true }); const p = s.page;
  await p.goto(PROP + '#/'); await p.waitForSelector('.wk-main'); await espera(300);
  await soltar(p, '.wk-main', 'Procedimento de colheita.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', btoa('PK falso')); await espera(600);
  await p.screenshot({ path: `${PASTA}/word-prop.png` });
  const recs = await p.evaluate(async () => { const db = await new Promise((ok) => { const r = indexedDB.open('efcdocs', 1); r.onsuccess = () => ok(r.result); }); return new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAll(); r.onsuccess = () => ok(r.result); }); });
  writeFileSync(`${PASTA}/sementes.json`, JSON.stringify(recs)); writeFileSync(`${PASTA}/armazem.json`, '{}'); writeFileSync(`${PASTA}/mapa.json`, '[]');
  writeFileSync(`${PASTA}/abas.json`, '[]'); await s.ctx.close();
}
await nav.close();
