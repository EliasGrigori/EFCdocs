import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const p = await (await b.newContext({ viewport: { width: 1366, height: 700 } })).newPage();
await p.goto('http://localhost:8733/#/'); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', process.argv[2]); await p.waitForSelector('[data-excel-abrir]', { timeout: 120000 }); await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv', { timeout: 180000 }); await p.waitForTimeout(3000);
const cdp = await p.context().newCDPSession(p); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
const perfil = async (nome, f) => {
  await cdp.send('Profiler.start'); await f(); await p.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 50)))));
  const { profile } = await cdp.send('Profiler.stop'); const dt = profile.timeDeltas; const porId = {}; profile.samples.forEach((id, i) => { porId[id] = (porId[id] || 0) + dt[i]; });
  const porFn = {}; let total = 0;
  for (const n of profile.nodes) { const t = (porId[n.id] || 0) / 1000; if (!t) continue; const nm = n.callFrame.functionName || '(anônima)'; if (nm === '(idle)' || nm === '(program)') continue; total += t; const k = nm + (n.callFrame.url.includes('app.js') ? '' : ' [' + (n.callFrame.url.split('/').pop() || 'nativo') + ']'); porFn[k] = (porFn[k] || 0) + t; }
  console.log(`\n== ${nome}: ${total.toFixed(0)} ms de código ==`); console.log(Object.entries(porFn).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${v.toFixed(0).padStart(6)} ms  ${k}`).join('\n'));
};
const ir = async (r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await p.waitForTimeout(300); };
await ir('B2');
await perfil('digitar 123 e Enter', async () => { await p.keyboard.type('123'); await p.keyboard.press('Enter'); });
await perfil('seta para baixo', async () => { await p.keyboard.press('ArrowDown'); });
await b.close();
