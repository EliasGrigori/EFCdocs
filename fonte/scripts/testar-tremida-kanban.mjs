import { chromium } from 'playwright';
const ARQ = process.argv[2] || process.cwd() + '/docs/estudos/kanban-2026-11-25/maquete-kanban.html';
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const ctx = await nav.newContext({ viewport: { width: 1180, height: 640 } }); const p = await ctx.newPage();
const LENTO = +(process.argv[3] || 1);
const erros = []; p.on('pageerror', (e) => erros.push(String(e)));
await p.goto('file://' + ARQ); await p.waitForTimeout(300);
await p.evaluate(() => { const s = globalThis.__t = { trocas: 0, ult: null, log: [] }; const f = () => { const v = document.querySelector('.vaga'); if (v) { const k = [...v.parentNode.children].indexOf(v) + v.closest('.col').dataset.col; if (s.ult !== null && k !== s.ult) { s.trocas++; s.log.push(Math.round(performance.now())); } s.ult = k; } requestAnimationFrame(f); }; f(); });
const res = {};
for (const [nome, de, sobre] of [['curto sobre alto', 'Q-002', 'Q-001'], ['alto sobre curto', 'Q-001', 'Q-002'], ['médio sobre alto', 'Q-003', 'Q-001']]) {
  await p.reload(); await p.waitForTimeout(300);
  if (LENTO !== 1) { const cdp = await ctx.newCDPSession(p); await cdp.send('Animation.enable'); await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / LENTO }); }
  await p.evaluate(() => { const s = globalThis.__t = { trocas: 0, vaivem: 0, ult: null, hist: [] }; const f = () => { const v = document.querySelector('.vaga'); if (v) { const k = [...v.parentNode.children].indexOf(v) + v.closest('.col').dataset.col; if (s.ult !== null && k !== s.ult) { s.trocas++; const h = s.hist; const ag = performance.now(); if (h.length && h[h.length - 1].de === k && ag - h[h.length - 1].t < 400) s.vaivem++; h.push({ de: s.ult, t: ag }); } s.ult = k; } requestAnimationFrame(f); }; f(); });
  const a = await p.locator(`.card[data-id="${de}"]`).boundingBox(), b = await p.locator(`.card[data-id="${sobre}"]`).boundingBox();
  const x = a.x + 80, y0 = a.y + 20; await p.mouse.move(x, y0); await p.mouse.down(); await p.mouse.move(x, y0 + 8); await p.waitForTimeout(100);
  const ini = await p.evaluate(() => globalThis.__t.trocas);
  const lo = b.y - 120, hi = b.y + b.height + 120;
  for (let rep = 0; rep < 2; rep++) {
    for (let y = y0 < lo ? lo : hi; y0 < lo ? y <= hi : y >= lo; y += y0 < lo ? 1 : -1) { await p.mouse.move(x, y); await p.waitForTimeout(16); }
    for (let y = y0 < lo ? hi : lo; y0 < lo ? y >= lo : y <= hi; y += y0 < lo ? -1 : 1) { await p.mouse.move(x, y); await p.waitForTimeout(16); }
  }
  const t = await p.evaluate(() => [globalThis.__t.trocas, globalThis.__t.vaivem]);
  await p.mouse.up(); await p.waitForTimeout(400);
  res[nome] = { trocas: t[0], idaEVolta: t[1] };
}
console.log(JSON.stringify({ passadas: res, erros }));
await nav.close();
