/* Vértice Docs — prints do app de verdade para a página de aprovação do layout (v0.6.20, parte 2: R6 a R9).
   HOJE = a parte 1 aprovada, servida num endereço; PROPOSTA = esta versão, servida em outro. Só arquivos inventados.
   Uso: node scripts/prints-aprovacao-layout-p2.mjs <endereço HOJE> <endereço PROPOSTA> <pasta de saída> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { abrirSemeado, espera } from './layout/semente.mjs';

const [HOJE, PROP, PASTA] = process.argv.slice(2);
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-qualidade.xlsx', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: CHROME });
const LADOS = [['hoje', HOJE], ['prop', PROP]];
const foto = (p, nome, lado, clip) => p.screenshot({ path: `${PASTA}/${nome}-${lado}.png`, clip });
/* recorte em volta de um pedaço da tela (com folga), para o detalhe aparecer grande */
async function fotoEl(p, sel, nome, lado, folga = 12, min = {}) {
  const b = await p.locator(sel).first().boundingBox();
  const x = Math.max(0, b.x - folga), y = Math.max(0, b.y - folga);
  const w = Math.min(1280 - x, Math.max(min.w || 0, b.width + folga * 2)), h = Math.min(800 - y, Math.max(min.h || 0, b.height + folga * 2));
  await foto(p, nome, lado, { x, y, width: w, height: h });
}
const ir = async (p, base, rota, ms = 700) => { await p.goto(base + '#/' + rota); await espera(ms); };
/* o envio ao Cwork inventado: ETQ-001 recebido (versão 2), ETQ-002 na caixa (versão 1). Os ids das sementes são fixos. */
const ARMAZEM = { 'efcdocs:ponte': JSON.stringify({ dsem0025: { rev: 2, pid: 'p-demo', em: '2026-11-14T15:10:00Z', estado: 'recebido' }, dsem0026: { rev: 1, em: '2026-11-14T16:02:00Z', estado: 'caixa' } }) };
const ENVIO = async (p) => { await p.evaluate((a) => { for (const [k, v] of Object.entries(a)) localStorage.setItem(k, v); }, ARMAZEM); await p.reload(); await p.waitForSelector('.wk-main'); await espera(400); };
const PAINEL = async (p, ligado) => { await p.evaluate((l) => { const x = JSON.parse(localStorage.getItem('efcdocs:prefs') || '{}'); x.painel = l; localStorage.setItem('efcdocs:prefs', JSON.stringify(x)); }, ligado); };
const celula = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(80); };

for (const [lado, base] of LADOS) {
  const prop = lado === 'prop';
  /* ---- PC claro ---- */
  let a = await abrirSemeado(nav, base, {}); let p = a.page;
  const ids = await p.evaluate(async () => { const db = await new Promise((ok) => { const r = indexedDB.open('efcdocs', 1); r.onsuccess = () => ok(r.result); }); return new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAll(); r.onsuccess = () => ok(r.result.filter((x) => x.ficha.codigo).map((x) => x.id + ':' + x.ficha.codigo)); }); });
  if (!ids.includes('dsem0025:ETQ-001') || !ids.includes('dsem0026:ETQ-002')) throw new Error('as sementes mudaram de número: ' + ids.join(' '));
  await ENVIO(p);
  /* item 1: situação na tabela dos documentos internos */
  await ir(p, base, 'internos'); await foto(p, 'internos', lado); await fotoEl(p, '.tb-fora', 'int-tabela', lado, 10);
  /* item 3: o aviso das páginas que chegam depois */
  await ir(p, base, 'pastas'); await foto(p, 'pastas', lado, { x: 212, y: 50, width: 1068, height: 260 });
  /* item 6: a gaveta nas listas (hoje não existe: a mesma tela sem ela) */
  await ir(p, base, 'planilha'); await foto(p, 'gaveta', lado);
  if (prop) {
    await p.locator('.tb-arq tr.arq').nth(0).locator('[data-detalhes]').click(); await espera(3200); await foto(p, 'gaveta', lado);
    await fotoEl(p, '[data-gaveta] .gv-cab', 'gv-cab', lado, 8, { w: 400 });
    /* item 7: anterior e próximo */
    await foto(p, 'nav0', lado);
    await p.keyboard.press('Alt+ArrowDown'); await espera(3200); await foto(p, 'nav1', lado);
    await p.keyboard.press('Alt+ArrowDown'); await espera(3200); await foto(p, 'nav2', lado);
    await p.keyboard.press('Escape'); await espera(400); await foto(p, 'nav3', lado);
  } else { for (const n of ['nav0', 'nav1', 'nav2', 'nav3']) await foto(p, n, lado); }
  /* item 9: a gota (ETQ-002: criado, mandado para o Cwork, falta o Cwork receber) */
  await ir(p, base, 'internos');
  if (prop) {
    await p.locator('[data-detalhes]').nth(1).click(); await p.waitForSelector('[data-gaveta] [data-efl-tl]');
    for (const [i, t] of [[0, 120], [1, 900], [2, 1300], [3, 1800]]) { await espera(t); await fotoEl(p, '[data-gaveta]', 'gota' + i, lado, 0); }
    await p.keyboard.press('Escape'); await espera(300);
    await p.locator('[data-detalhes]').nth(0).click(); await espera(4200); await fotoEl(p, '[data-gaveta]', 'gota-fim', lado, 0);
    await p.keyboard.press('Escape'); await espera(300);
  } else { for (const n of ['gota0', 'gota1', 'gota2', 'gota3', 'gota-fim']) await fotoEl(p, '.tb-fora', n, lado, 0); }
  /* itens 2 e 8: o painel do arquivo aberto */
  await ir(p, base, 'internos'); await p.locator('.tb-arq tr.arq .abre').first().click(); await p.waitForSelector('.pl-cv');
  await PAINEL(p, true); await p.reload(); await p.waitForSelector('.side'); await espera(4200);
  await foto(p, 'painel', lado); await foto(p, 'painel-perto', lado, { x: 980, y: 196, width: 300, height: 500 });
  await PAINEL(p, false);
  await a.ctx.close();

  /* ---- itens 4 e 5: relatório do Excel, balão de comentário e explicar a conta ---- */
  a = await abrirSemeado(nav, base, {}); p = a.page;
  await p.goto(base + '#/'); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', AMOSTRA);
  await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 }); await espera(3000);
  await fotoEl(p, '.rel-excel', 'excel', lado, 6);
  await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await espera(900);
  const pos = await p.evaluate(() => { const c = document.querySelector('.pl-cv').getBoundingClientRect(); return { x: c.left, y: c.top }; });
  for (let dx = 60; dx < 520; dx += 12) { await p.mouse.move(pos.x + dx, pos.y + 75); await espera(40); if (await p.locator('[data-balao=com]').count()) break; }
  await espera(300); await fotoEl(p, '[data-balao=com]', 'balao', lado, 30, { w: 360, h: 120 });
  await p.mouse.move(5, 400);
  await celula(p, 'E2'); await p.click('.tabs .tab:has-text("Fórmulas")'); await espera(300);
  await p.locator('[data-cmd="formula.explicar"]').first().click(); await p.waitForSelector('.janela'); await espera(500);
  await fotoEl(p, '.janela', 'frase', lado, 0);
  await a.ctx.close();

  /* ---- item 10: celular ---- */
  a = await abrirSemeado(nav, base, { w: 390, h: 844, toque: true }); p = a.page; await ENVIO(p);
  await ir(p, base, 'internos'); await foto(p, 'cel-internos', lado);
  await ir(p, base, 'planilha');
  if (prop) { await p.locator('[data-detalhes]').first().click(); await espera(3200); }
  await foto(p, 'cel-gaveta', lado);
  await a.ctx.close();
  /* ---- escuro ---- */
  a = await abrirSemeado(nav, base, { tema: 'escuro' }); p = a.page; await ENVIO(p);
  await ir(p, base, 'internos');
  if (prop) { await p.locator('[data-detalhes]').first().click(); await espera(4200); }
  await foto(p, 'escuro', lado);
  await a.ctx.close();
  /* ---- dúvida: o cartão do Kanban (fica igual nas duas versões) ---- */
  a = await abrirSemeado(nav, base, {}); p = a.page;
  await ir(p, base, 'postits'); await p.locator('.tb-arq tr.arq .abre').first().click(); await espera(1200);
  await p.locator('.qd-vistas button:has-text("Kanban")').click(); await p.waitForSelector('.kb-col');
  for (const [col, txt] of [[0, 'Conferir extintores do galpão'], [0, 'Trocar luvas da equipe de colheita'], [1, 'Treinamento de EPI na segunda'], [2, 'Placas da área de defensivos']]) {
    await p.locator('.kb-col').nth(col).locator('.kb-novo').click(); const ta = p.locator('textarea.kb-edita'); await ta.fill(txt); await ta.press('Control+Enter'); await espera(200);
  }
  await p.mouse.click(1200, 760); await espera(300);
  await fotoEl(p, '.kb-col >> nth=0', 'kanban', lado, 12, { w: 900 });
  await a.ctx.close();
  console.log('prints de', lado, 'prontos');
}
/* ---- os arquivos inventados da demonstração que roda dentro da página ---- */
{
  const a = await abrirSemeado(nav, PROP, { muitos: 120 });
  const recs = await a.page.evaluate(async () => { const db = await new Promise((ok) => { const r = indexedDB.open('efcdocs', 1); r.onsuccess = () => ok(r.result); }); return new Promise((ok) => { const r = db.transaction('arquivos').objectStore('arquivos').getAll(); r.onsuccess = () => ok(r.result); }); });
  writeFileSync(`${PASTA}/sementes.json`, JSON.stringify(recs)); writeFileSync(`${PASTA}/armazem.json`, JSON.stringify(ARMAZEM)); await a.ctx.close();
  console.log('sementes da demonstração:', recs.length);
}
await nav.close();
