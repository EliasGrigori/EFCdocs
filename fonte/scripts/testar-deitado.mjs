/* Vértice Docs — v0.6.34: celular deitado em todos os módulos (S1 e D1 da v0.6.33) e o botão Abas deitado (D-65).
   v0.6.35: deitado pequeno sem o nome do arquivo e com o Painel de volta; celular grande deitado vira modo celular (S1 da v0.6.34).
   Uso: node scripts/testar-deitado.mjs <endereço>. Dados inventados. */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME });
const NOME = { planilha: 'Planilha', docx: 'Documento', postits: 'Quadro' };
const META = { planilha: 80, docx: 70, postits: 70 };
async function abrir(vp, mod) {
  const ctx = await nav.newContext({ viewport: vp, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  if (mod === 'docx') { await p.goto(BASE + '#/docx'); await p.waitForSelector('[data-novo=docx]'); await p.click('[data-novo=docx]'); }
  else { await p.goto(BASE + '#/inicio'); await p.waitForSelector(`[data-novo=${mod}]`); await p.click(`[data-novo=${mod}]`); }
  await p.waitForSelector('.sup'); await p.waitForTimeout(500);
  return { ctx, p };
}
const caixa = (p, s) => p.locator(s).first().boundingBox();
const visivel = (p, s) => p.locator(s).first().isVisible().catch(() => false);

for (const vp of [{ width: 844, height: 390 }, { width: 667, height: 375 }]) {
  const n = `${vp.width}×${vp.height}`;
  for (const mod of ['planilha', 'docx', 'postits']) {
    const { ctx, p } = await abrir(vp, mod);
    await caso(`${NOME[mod]} deitado ${n}: título e ferramentas numa linha (até 64 px) e a área com pelo menos ${META[mod]}% da altura`, async () => {
      const t = await caixa(p, '.topbar'), s = await caixa(p, '.sup');
      certo(t.height <= 64, `barra de cima com ${Math.round(t.height)} px`);
      const pct = Math.round(s.height / vp.height * 100); certo(pct >= META[mod], `área com ${pct}% da altura`);
    });
    if (vp.width === 667) {
      await caso(`${NOME[mod]} deitado pequeno: o nome do arquivo e o Tema saem do título; ficam o "Salvo" e o Painel; cabem pelo menos 4 ferramentas`, async () => {
        certo(!(await visivel(p, '.topbar-row [data-tema-botao]')), 'o botão de tema continua no título');
        certo(!(await visivel(p, '.tb-tit button.nome')), 'o nome do arquivo continua no título');
        certo(await visivel(p, '.tb-tit .salvo'), 'o "Salvo" sumiu');
        certo(await visivel(p, '.topbar-row [data-cmd="exibir.painel"]'), 'o botão do painel não voltou');
        const qt = await p.evaluate(() => { const r = document.querySelector('.tbar.cel-rapida .tbar-rola, .tbar.cel-rapida'); const a = r.getBoundingClientRect(); return [...r.querySelectorAll('button')].filter((b) => { const x = b.getBoundingClientRect(); return x.width > 0 && x.left >= a.left - 1 && x.right <= a.right + 1; }).length; });
        certo(qt >= 4 + 3, `só ${qt} botões inteiros na barra (contando Desfazer, Refazer e Abas)`);
      });
    } else {
      await caso(`${NOME[mod]} deitado ${n}: Tema continua no título (só some no deitado pequeno)`, async () => {
        certo(await visivel(p, '.topbar-row [data-tema-botao]'), 'o botão de tema sumiu');
      });
    }
    if (mod !== 'docx') {
      await caso(`${NOME[mod]} deitado ${n}: o botão Abas abre as abas e a faixa em linhas inteiras, embaixo (D-65)`, async () => {
        await p.locator('.topbar button:has-text("Abas")').first().tap(); await p.waitForTimeout(400);
        const linha = await caixa(p, '.topbar-row'), abas = await caixa(p, '.topbar .tabs'), faixa = await caixa(p, '.topbar .ribbon');
        certo(abas && abas.width >= vp.width - 2 && abas.y >= linha.y + linha.height - 1, 'abas: ' + JSON.stringify(abas));
        certo(faixa && faixa.width >= vp.width - 2 && faixa.y >= abas.y + abas.height - 1, 'faixa: ' + JSON.stringify(faixa));
        const rap = await caixa(p, '.tbar.cel-rapida'); certo(rap && rap.width > 200, 'a barra das ferramentas encolheu: ' + JSON.stringify(rap));
      });
    }
    await ctx.close();
  }
}

/* v0.6.35 (S1): celular grande deitado (915 × 412, toque) entra no modo celular */
for (const mod of ['planilha', 'postits']) {
  const ctx = await nav.newContext({ viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' }); await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage(); p.on('pageerror', (e) => erros.push(String(e)));
  await p.goto(BASE + '#/inicio'); await p.click(`[data-novo=${mod}]`); await p.waitForSelector('.sup'); await p.waitForTimeout(500);
  await caso(`${NOME[mod]} no celular grande deitado (915 × 412): modo celular, linha única e área com pelo menos ${META[mod]}% da altura`, async () => {
    certo(await p.locator('.app.cel').count() === 1, 'não entrou no modo celular');
    const t = await caixa(p, '.topbar'), s = await caixa(p, '.sup');
    certo(t.height <= 64, `barra de cima com ${Math.round(t.height)} px`);
    const pct = Math.round(s.height / 412 * 100); certo(pct >= META[mod], `área com ${pct}% da altura`);
  });
  await ctx.close();
}

/* em pé, computador, tablet, computador de toque e janela baixa no computador com mouse: não viram celular deitado */
for (const [nome, opc] of [['tablet deitado (1024 × 768, toque)', { viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true }], ['computador com tela de toque (1366 × 768)', { viewport: { width: 1366, height: 768 }, hasTouch: true }], ['janela baixa no computador com mouse (915 × 412)', { viewport: { width: 915, height: 412 } }]]) {
  const ctx = await nav.newContext({ ...opc, reducedMotion: 'reduce' }); await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage(); p.on('pageerror', (e) => erros.push(String(e)));
  await p.goto(BASE + '#/inicio'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.sup'); await p.waitForTimeout(400);
  await caso(`${nome}: continua no modo do computador`, async () => {
    certo(await p.locator('.app.cel').count() === 0, 'entrou no modo celular');
  });
  await ctx.close();
}

/* em pé e computador: nada muda */
for (const [nome, opc] of [['celular em pé', { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }], ['computador', { viewport: { width: 1366, height: 768 } }]]) {
  const ctx = await nav.newContext({ ...opc, reducedMotion: 'reduce' }); await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage(); p.on('pageerror', (e) => erros.push(String(e)));
  await p.goto(BASE + '#/inicio'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.sup'); await p.waitForTimeout(400);
  await caso(`${nome}: a barra de cima continua em duas linhas, com Tema no título`, async () => {
    const linha = await caixa(p, '.topbar-row'), t = await caixa(p, '.topbar');
    certo(t.height > linha.height + 20, `barra de cima com ${Math.round(t.height)} px e linha do título com ${Math.round(linha.height)}`);
    certo(await visivel(p, '.topbar-row [data-tema-botao]'), 'o botão de tema sumiu');
  });
  await ctx.close();
}

await caso('console sem erro', async () => { certo(erros.length === 0, erros.join(' | ').slice(0, 300)); });
console.log(`\n${ok} de ${ok + falhas} conferências do celular deitado passaram.`);
await nav.close();
process.exit(falhas ? 1 : 0);
