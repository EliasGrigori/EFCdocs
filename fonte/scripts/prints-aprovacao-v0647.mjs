/* Vértice Docs — prints da página de aprovação da v0.6.47 (D-80 coluna inteira com Ctrl+Shift+seta; D-73 contorno da
   mesclada; D-69 cursor do cabeçalho). Uso: node scripts/prints-aprovacao-v0647.mjs <ANTES> <DEPOIS> <pasta>.
   Amostra inventada (amostra-varredura.xlsx). O print do navegador não mostra o ponteiro do mouse: no D-69 o desenho do
   ponteiro é posto por cima, no ponto onde o mouse estava (no depois é a imagem que o app usa; no antes, o desenho da
   seta dupla vertical que o Windows mostra para "s-resize"). */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const [ANTES, DEPOIS, PASTA] = process.argv.slice(2);
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-varredura.xlsx', import.meta.url));
mkdirSync(PASTA, { recursive: true });
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const SETA_DUPLA = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='16' height='22'><path d='M8 1 13 7H10v8h3l-5 6-5-6h3V7H3z' fill='#fff' stroke='#000' stroke-width='1'/></svg>")}")`;
for (const [lado, base] of [['antes', ANTES], ['depois', DEPOIS]]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: 1.5 });
  await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
  const p = await ctx.newPage();
  const abrir = async () => {
    await p.goto(base + '#/'); await p.reload(); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', AMOSTRA);
    await p.waitForSelector('[data-excel-abrir]', { timeout: 60000 }); await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv', { timeout: 60000 }); await p.waitForTimeout(1200);
    return p.locator('.pl-cv').boundingBox();
  };
  /* D-80 */
  let cv = await abrir();
  const clip = { x: cv.x - 10, y: cv.y - 40, width: 900, height: 460 };
  await p.mouse.click(cv.x + 190, cv.y + 10); await p.waitForTimeout(300);
  await p.keyboard.press('Control+Shift+ArrowRight'); await p.waitForTimeout(700);
  await p.screenshot({ path: `${PASTA}/1-coluna-ctrl-shift-direita-${lado}.png`, clip });
  /* D-73 */
  cv = await abrir();
  await p.mouse.click(cv.x + 240, cv.y + 214); await p.waitForTimeout(400);
  await p.screenshot({ path: `${PASTA}/2-mesclada-${lado}.png`, clip: { x: cv.x, y: cv.y + 170, width: 460, height: 80 } });
  /* D-69: ponteiro em cima da letra C e em cima do número 5 */
  for (const [nome, x, y] of [['coluna', cv.x + 190, cv.y + 10], ['linha', cv.x + 15, cv.y + 24 + 80 + 10]]) {
    await p.mouse.move(x, y); await p.waitForTimeout(150);
    const cur = await p.evaluate(() => getComputedStyle(document.querySelector('.pl-cv')).cursor);
    await p.evaluate(({ x, y, cur, dupla, nome }) => {
      const m = /url\("([^"]+)"\)\s*(\d+)\s+(\d+)/.exec(cur);
      const d = document.createElement('div'); d.id = 'ponteiro-print';
      const src = m ? m[1] : /url\("([^"]+)"/.exec(dupla)[1];
      const hx = m ? +m[2] : 8, hy = m ? +m[3] : 11;
      d.innerHTML = `<img src="${src}" style="position:fixed;left:${x - hx}px;top:${y - hy}px;z-index:99999;pointer-events:none;${!m && nome === 'linha' ? 'transform:rotate(90deg)' : ''}">`;
      document.body.appendChild(d);
    }, { x, y, cur, dupla: SETA_DUPLA, nome });
    await p.waitForTimeout(150);
    await p.screenshot({ path: `${PASTA}/3-cursor-${nome}-${lado}.png`, clip: { x: cv.x, y: cv.y - 14, width: 300, height: 164 } });
    await p.evaluate(() => document.getElementById('ponteiro-print')?.remove());
  }
  await ctx.close();
}
await nav.close(); console.log('prints em ' + PASTA);
