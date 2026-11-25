/* Vértice Docs — prints da página de propostas do "Configurar página" do Quadro (25/11/2026).
   Tira prints da Planilha (aba Layout da Página e janela Imprimir e PDF, que já existem) e de um quadro inventado com o
   desenho proposto por cima (área de impressão tracejada e quebras de página), só como maquete.
   Uso: node scripts/prints-propostas-impressao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [BASE, PASTA] = process.argv.slice(2);
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 1.5 });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
/* Planilha: aba Layout da Página e janela Imprimir e PDF */
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/planilha"]'); await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv', { timeout: 30000 });
await p.click('.tab:has-text("Layout da Página")'); await p.waitForTimeout(300);
const faixa = await p.locator('.ribbon').first().boundingBox();
await p.screenshot({ path: `${PASTA}/1-planilha-layout.png`, clip: { x: faixa.x, y: faixa.y, width: Math.min(faixa.width, 1100), height: faixa.height } });
await p.locator('[data-cmd="impressao.configurar"]').first().click().catch(async () => { await p.getByText('Configurar página…').first().click(); });
await p.waitForSelector('.janela', { timeout: 5000 }); await p.waitForTimeout(400);
await p.locator('.janela').first().screenshot({ path: `${PASTA}/2-planilha-imprimir.png` });
await p.keyboard.press('Escape');
/* Quadro inventado com a maquete da área de impressão e das quebras */
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const ITENS = [['inserir.inicio', 'Receber a fruta'], ['inserir.processo', 'Lavar e selecionar'], ['inserir.decisao', 'Aprovado?'], ['inserir.processo', 'Embalar'], ['inserir.postit', 'Conferir a balança do packing'], ['inserir.postit', 'Separar os registros do mês']];
for (const [cmd, t] of ITENS) {
  await p.locator(`[data-cmd="${cmd}"]`).first().click();
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
}
await p.click('.tab:has-text("Exibir")'); await p.locator('[data-cmd="exibir.ajustar"]').first().click(); await p.waitForTimeout(500);
await p.mouse.click(5, 790);
const a = await p.locator('.qd-area').boundingBox();
await p.evaluate(() => {
  const area = document.querySelector('.qd-area'), r = area.getBoundingClientRect();
  const its = [...document.querySelectorAll('.qi')].map((e) => e.getBoundingClientRect());
  const x1 = Math.min(...its.map((q) => q.left)) - 24, y1 = Math.min(...its.map((q) => q.top)) - 24, x2 = Math.max(...its.map((q) => q.right)) + 24, y2 = Math.max(...its.map((q) => q.bottom)) + 24;
  const d = document.createElement('div');
  d.style.cssText = `position:fixed;left:${x1}px;top:${y1}px;width:${x2 - x1}px;height:${y2 - y1}px;border:2px dashed #475467;pointer-events:none;z-index:50`;
  const meio = document.createElement('div');
  meio.style.cssText = `position:absolute;left:50%;top:0;bottom:0;border-left:1.5px dashed #2563eb`;
  const rot = (t, css) => { const s = document.createElement('span'); s.textContent = t; s.style.cssText = `position:absolute;${css};font:600 12px system-ui;color:#2563eb;background:rgba(255,255,255,.85);padding:1px 6px;border-radius:4px`; return s; };
  d.append(meio, rot('Página 1', 'left:8px;top:6px'), rot('Página 2', 'left:calc(50% + 8px);top:6px'), rot('Área de impressão', 'right:8px;bottom:6px;color:#475467'));
  document.body.appendChild(d);
});
await p.waitForTimeout(200);
await p.screenshot({ path: `${PASTA}/3-quadro-area-quebras.png`, clip: { x: a.x, y: a.y, width: a.width, height: Math.min(a.height, 470) } });
await nav.close(); console.log('prints em ' + PASTA);
