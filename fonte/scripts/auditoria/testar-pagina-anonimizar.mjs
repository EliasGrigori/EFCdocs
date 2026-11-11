import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const pag = 'file://' + process.cwd() + '/ferramentas/anonimizar/anonimizar-planilha.html';
for (const [nome, opc] of [['pc', { viewport: { width: 1366, height: 700 } }], ['celular', { viewport: { width: 384, height: 790 }, hasTouch: true, isMobile: true }]]) {
  const ctx = await b.newContext({ ...opc, acceptDownloads: true }); const p = await ctx.newPage(); const erros = []; p.on('pageerror', (e) => erros.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  const pedidos = []; p.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('blob:') && !r.url().startsWith('data:')) pedidos.push(r.url()); });
  await p.goto(pag); await p.screenshot({ path: `/tmp/f0/anon-${nome}-1.png` });
  await p.setInputFiles('#arquivo', process.argv[2]); await p.waitForSelector('#resultado:not([hidden])', { timeout: 60000 });
  await p.screenshot({ path: `/tmp/f0/anon-${nome}-2.png`, fullPage: true });
  const [d] = await Promise.all([p.waitForEvent('download'), p.click('#baixar')]); const cam = await d.path(); writeFileSync(`/tmp/f0/anon-baixado-${nome}.xlsx`, readFileSync(cam));
  console.log(nome, '| nome do arquivo:', d.suggestedFilename(), '| conferência:', (await p.locator('#conferencia').innerText()).slice(0, 70), '| erros:', erros.length, '| pedidos à internet:', pedidos.length, '| rola de lado:', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1));
  if (nome === 'pc') { await p.click('#tema'); await p.screenshot({ path: '/tmp/f0/anon-pc-escuro.png', fullPage: true }); }
  await ctx.close();
}
await b.close();
