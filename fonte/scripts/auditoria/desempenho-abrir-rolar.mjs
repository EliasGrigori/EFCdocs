/* Mede abertura e rolagem. Recebe o arquivo por argumento; só imprime números (nenhum dado da planilha). */
import { chromium } from 'playwright';
const RAIZ = process.argv[2], ARQ = process.argv[3], PRINT = process.argv[4];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await (await b.newContext({ viewport: { width: 1366, height: 700 } })).newPage();
const FREIO = +(process.env.FREIO || 1); if (FREIO > 1) { const cdp = await p.context().newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: FREIO }); }
const erros = []; p.on('pageerror', (e) => erros.push(e.message.slice(0, 100)));
let t0 = Date.now(); await p.goto(RAIZ + '#/'); await p.waitForSelector('[data-abrir-excel]'); const tCarga = Date.now() - t0;
await p.click('[data-abrir-excel]'); t0 = Date.now(); await p.setInputFiles('[data-excel-arquivo]', ARQ); await p.waitForSelector('[data-excel-abrir]', { timeout: 120000 }); const tLer = Date.now() - t0;
t0 = Date.now(); await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv', { timeout: 180000 }); await p.waitForTimeout(300); const tAbrir = Date.now() - t0;
await p.waitForTimeout(2500);
const abas = await p.locator('.pl-aba').count();
const medirRolagem = async () => p.evaluate(async () => {
  const r = document.querySelector('.pl-rol'); const dts = []; let ant = performance.now();
  const longas = []; const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) longas.push(Math.round(e.duration)); }); try { po.observe({ entryTypes: ['longtask'] }); } catch { /* */ }
  for (let i = 0; i < 150; i++) { r.scrollTop += 60; if (i % 3 === 0) r.scrollLeft += 40; await new Promise((ok) => requestAnimationFrame(ok)); const a = performance.now(); dts.push(a - ant); ant = a; }
  po.disconnect(); dts.sort((x, y) => x - y);
  return { quadros: dts.length, mediana: +dts[75].toFixed(1), p95: +dts[142].toFixed(1), pior: +dts[149].toFixed(1), acima33: dts.filter((d) => d > 33.4).length, tarefasLongas: longas.length, maiorTarefa: Math.max(0, ...longas) };
});
const out = { tCarga, tLer, tAbrir, abas, porAba: [] };
for (let i = 0; i < abas; i++) {
  t0 = Date.now(); await p.locator('.pl-aba').nth(i).click(); await p.waitForTimeout(400); const tTroca = Date.now() - t0 - 400;
  const m = await medirRolagem(); out.porAba.push({ aba: i + 1, tTroca, ...m });
  if (PRINT && i < 2) { await p.evaluate(() => { const r = document.querySelector('.pl-rol'); r.scrollTop = 0; r.scrollLeft = 0; }); await p.waitForTimeout(500); await p.screenshot({ path: `${PRINT}-aba${i + 1}.png` }); }
}
/* digitar numa célula: tempo até a tela responder */
await p.locator('.pl-aba').first().click(); await p.waitForTimeout(400);
const tDig = await p.evaluate(async () => { const t = performance.now(); await new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))); return performance.now() - t; });
out.heap = await p.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));
out.erros = erros;
console.log(JSON.stringify(out, null, 1));
await b.close();
