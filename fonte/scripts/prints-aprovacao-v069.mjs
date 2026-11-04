/* EFCdocs — prints de antes (v0.6.8) e depois (v0.6.9) para a página de aprovação.
   Só amostras inventadas (testes/amostras/): nenhum dado real nos prints.
   Uso: node scripts/prints-aprovacao-v069.mjs <endereço-depois> <endereço-antes> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DEPOIS = process.argv[2], ANTES = process.argv[3], OUT = process.argv[4];
const AM = fileURLToPath(new URL('../testes/amostras/amostra-v069.xlsx', import.meta.url));
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const PC = { viewport: { width: 1366, height: 800 } };
const espera = (p, ms = 200) => p.waitForTimeout(ms);
const tentar = async (nome, f) => { try { await f(); } catch (e) { console.log('FALHOU', nome, String(e.message).split('\n')[0]); } };

async function abrir(raiz, aba, opts = PC) {
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  await p.goto(raiz + '#/'); await espera(p, 700);
  await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', AM);
  await p.waitForSelector('[data-excel-abrir]', { timeout: 60000 }); await espera(p, 400);
  await p.click('[data-excel-abrir]');
  await p.waitForSelector('.pl-cv', { timeout: 120000 }); await espera(p, 1200);
  await p.addStyleTag({ content: '.toasts{visibility:hidden!important}' });
  if (aba) { await p.locator(`.pl-aba:has-text("${aba}")`).first().click(); await espera(p, 600); }
  return p;
}
const cv = (p) => p.locator('.pl-cv').boundingBox();

for (const [qual, raiz] of [['antes', ANTES], ['depois', DEPOIS]]) {
  /* 1. congelamento nos dois sentidos: rolar longe e voltar */
  await tentar('congelado ' + qual, async () => {
    const p = await abrir(raiz, 'RESUMO');
    const r = await cv(p);
    await p.mouse.move(r.x + 700, r.y + 400);
    for (let i = 0; i < 20; i++) { await p.mouse.wheel(0, 600); await espera(p, 20); }
    for (let i = 0; i < 10; i++) { await p.mouse.wheel(600, 0); await espera(p, 20); }
    await espera(p, 500);
    for (let i = 0; i < 4; i++) { await p.mouse.wheel(-400, 0); await espera(p, 60); }
    for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, -400); await espera(p, 60); }
    await espera(p, 600);
    await p.screenshot({ path: `${OUT}/${qual}-congelado.png`, clip: { x: r.x, y: r.y, width: 700, height: 400 } });
    await p.context().close();
  });
  /* 2. largura de várias colunas: durante o arrasto e depois de soltar */
  await tentar('largura ' + qual, async () => {
    const p = await abrir(raiz, 'LARGURAS');
    const r = await cv(p);
    await p.mouse.click(r.x + 150, r.y + 10); await espera(p, 150);
    await p.keyboard.down('Shift'); await p.mouse.click(r.x + 350, r.y + 10); await p.keyboard.up('Shift'); await espera(p, 300);
    let dx = 0;
    for (let x = 180; x < 430 && !dx; x += 3) {
      await p.mouse.move(r.x + x, r.y + 10);
      if (await p.evaluate(() => document.querySelector('.pl-cv').style.cursor) === 'col-resize') dx = x;
    }
    await p.mouse.move(r.x + dx, r.y + 10); await espera(p, 150);
    await p.mouse.down();
    await p.mouse.move(r.x + dx + 70, r.y + 10, { steps: 10 }); await espera(p, 350);
    await p.screenshot({ path: `${OUT}/${qual}-arrastando.png`, clip: { x: r.x, y: r.y, width: 700, height: 260 } });
    await p.mouse.up(); await espera(p, 500);
    await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('A1'); await p.locator('.pl-nome').press('Enter');
    await espera(p, 400);
    await p.screenshot({ path: `${OUT}/${qual}-larguras.png`, clip: { x: r.x, y: r.y, width: 700, height: 260 } });
    await p.context().close();
  });
  /* 3. grade: pedaço ampliado, com a tela em 125% */
  await tentar('grade ' + qual, async () => {
    const p = await abrir(raiz, 'LARGURAS', { ...PC, deviceScaleFactor: 1.25 });
    const r = await cv(p);
    await p.screenshot({ path: `${OUT}/${qual}-grade.png`, clip: { x: r.x + 40, y: r.y + 120, width: 300, height: 120 } });
    await p.context().close();
  });
}
await b.close();
console.log('prints prontos em', OUT);
