/* Vértice Docs v0.6.72 — prints de antes (v0.6.71) e depois: o Vértice numa moldura de uma página do Cwork (teste). Dados inventados.
   Uso: node scripts/prints-aprovacao-v0672.mjs <endereço> <pasta> <prefixo> */
import { chromium } from 'playwright';
const [BASE, PASTA, PRE] = [process.argv[2], process.argv[3], process.argv[4] || 'x'];
const nav = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
await ctx.route('**/efcwork/teste-aba.html', (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><body style="margin:0;background:#f4efe4">
  <div style="height:26px;background:#1d2b36;color:#f4efe4;font:600 13px sans-serif;padding:5px 12px;box-sizing:border-box">Cwork (página de teste) · aba Vértice Docs</div>
  <iframe id="v" src="${BASE}" style="border:0;width:100vw;height:calc(100vh - 26px)"></iframe></body>` }));
const p = await ctx.newPage(); p.setDefaultTimeout(8000);
await p.goto(new URL('/efcwork/teste-aba.html', BASE).href);
const fr = p.frameLocator('#v'); await fr.locator('.rail').waitFor(); await p.waitForTimeout(2500);
await p.screenshot({ path: `${PASTA}/${PRE}-aba.png` });
await nav.close();
