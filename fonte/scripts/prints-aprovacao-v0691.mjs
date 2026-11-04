/* EFCdocs — prints de antes (v0.6.9) e depois (v0.6.9.1) para a página de aprovação.
   Só amostras inventadas (testes/amostras/): nenhum dado real nos prints.
   Uso: node scripts/prints-aprovacao-v0691.mjs <endereço-depois> <endereço-antes> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const DEPOIS = process.argv[2], ANTES = process.argv[3], OUT = process.argv[4];
const A69 = fileURLToPath(new URL('../testes/amostras/amostra-v069.xlsx', import.meta.url));
const A691 = fileURLToPath(new URL('../testes/amostras/amostra-v0691.xlsx', import.meta.url));
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const PC = { viewport: { width: 1366, height: 800 } };
const espera = (p, ms = 200) => p.waitForTimeout(ms);
const tentar = async (nome, f) => { try { await f(); } catch (e) { console.log('FALHOU', nome, String(e.message).split('\n')[0]); } };

async function abrir(raiz, arq, aba, parar = false) {
  const ctx = await b.newContext(PC);
  const p = await ctx.newPage();
  await p.goto(raiz + '#/'); await espera(p, 700);
  await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', arq);
  await p.waitForSelector('[data-excel-abrir]', { timeout: 60000 }); await espera(p, 500);
  if (parar) return p;
  await p.click('[data-excel-abrir]');
  await p.waitForSelector('.pl-cv', { timeout: 120000 }); await espera(p, 1200);
  await p.addStyleTag({ content: '.toasts{visibility:hidden!important}' });
  if (aba) { await p.locator(`.pl-aba:has-text("${aba}")`).first().click(); await espera(p, 600); }
  return p;
}

for (const [qual, raiz] of [['antes', ANTES], ['depois', DEPOIS]]) {
  /* 1. seleção que rolou para baixo do congelado (e o risco solto na ponta) */
  await tentar('congelado ' + qual, async () => {
    const p = await abrir(raiz, A69, 'RESUMO');
    const r = await p.locator('.pl-cv').boundingBox();
    await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('J20'); await p.locator('.pl-nome').press('Enter'); await espera(p, 500);
    await p.mouse.move(r.x + 700, r.y + 400);
    await p.mouse.wheel(150, 0); await espera(p, 400);
    await p.mouse.wheel(600, 0); await espera(p, 700);
    await p.screenshot({ path: `${OUT}/${qual}-congelado.png`, clip: { x: r.x, y: r.y, width: 760, height: 430 } });
    await p.context().close();
  });
  /* 2. coluna dos números */
  await tentar('numeros ' + qual, async () => {
    const p = await abrir(raiz, A69, 'LARGURAS');
    const r = await p.locator('.pl-cv').boundingBox();
    await p.screenshot({ path: `${OUT}/${qual}-numeros.png`, clip: { x: r.x, y: r.y, width: 420, height: 230 } });
    await p.context().close();
  });
  /* 3. imagem escolhida: a alça de tamanho */
  await tentar('imagem ' + qual, async () => {
    const p = await abrir(raiz, A69, 'LARGURAS');
    const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 240; c.height = 120; const x = c.getContext('2d'); x.fillStyle = '#1f6f8b'; x.fillRect(0, 0, 240, 120); x.fillStyle = '#f2c94c'; x.beginPath(); x.arc(70, 60, 38, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 30px sans-serif'; x.fillText('LOGO', 120, 72); return c.toDataURL('image/png').split(',')[1]; });
    const arq = join(mkdtempSync(join(tmpdir(), 'efc-img-')), 'logo-exemplo.png');
    writeFileSync(arq, Buffer.from(png, 'base64'));
    await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('B6'); await p.locator('.pl-nome').press('Enter'); await espera(p, 300);
    await p.click('.tabs .tab:has-text("Inserir")');
    await p.locator('[data-arq-imagem]').setInputFiles(arq);
    await p.waitForSelector('[data-obj-tipo=imagem]'); await espera(p, 400);
    let bb = await p.locator('[data-obj-tipo=imagem]').boundingBox();
    await p.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await espera(p, 400);
    await p.screenshot({ path: `${OUT}/${qual}-imagem.png`, clip: { x: bb.x - 30, y: bb.y - 30, width: bb.width + 90, height: bb.height + 100 } });
    const al = await p.locator('.pl-obj-alca').first().boundingBox();
    await p.mouse.move(al.x + al.width / 2, al.y + al.height / 2); await p.mouse.down();
    await p.mouse.move(al.x + al.width / 2 + 80, al.y + al.height / 2 + 40, { steps: 8 }); await p.mouse.up(); await espera(p, 500);
    const bb2 = await p.locator('[data-obj-tipo=imagem]').boundingBox();
    await p.screenshot({ path: `${OUT}/${qual}-imagem-depois-de-arrastar.png`, clip: { x: bb.x - 30, y: bb.y - 30, width: Math.max(bb.width, bb2.width) + 90, height: Math.max(bb.height, bb2.height) + 100 } });
    await p.context().close();
  });
  /* 4. aviso de abertura: fórmulas com #REF! do próprio Excel */
  await tentar('aviso ' + qual, async () => {
    const p = await abrir(raiz, A691, null, true);
    await espera(p, 500);
    const caixa = p.locator('[data-rel=bom]');
    if (await caixa.count()) await caixa.first().scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${OUT}/${qual}-aviso.png`, clip: { x: 283, y: 90, width: 800, height: 620 } });
    await p.context().close();
  });
}
await b.close();
console.log('prints prontos em', OUT);
