/* EFCdocs — prints de antes (v0.6.9.1) e depois (v0.6.9.2) para a página de aprovação.
   Só amostra inventada (testes/amostras/amostra-v0692.xlsx): nenhum dado real nos prints.
   Uso: node scripts/prints-aprovacao-v0692.mjs <endereço-depois> <endereço-antes> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const DEPOIS = process.argv[2], ANTES = process.argv[3], OUT = process.argv[4];
const A = fileURLToPath(new URL('../testes/amostras/amostra-v0692.xlsx', import.meta.url));
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome' });
const PC = { viewport: { width: 1366, height: 800 } };
const CEL = { viewport: { width: 390, height: 640 }, hasTouch: true, isMobile: true };
const espera = (p, ms = 200) => p.waitForTimeout(ms);
const tentar = async (nome, f) => { try { await f(); } catch (e) { console.log('FALHOU', nome, String(e.message).split('\n')[0]); } };
const ir = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(p, 500); };

async function abrir(raiz, aba, opc = PC, parar = false) {
  const ctx = await b.newContext(opc);
  if (opc.isMobile) await ctx.addInitScript(() => { globalThis.EFC_CEL_ABAS = true; });
  const p = await ctx.newPage();
  await p.goto(raiz + '#/'); await espera(p, 700);
  await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', A);
  await p.waitForSelector('[data-excel-abrir]', { timeout: 60000 }); await espera(p, 500);
  if (parar) return p;
  await p.click('[data-excel-abrir]');
  await p.waitForSelector('.pl-cv', { timeout: 120000 }); await espera(p, 1200);
  await p.addStyleTag({ content: '.toasts{visibility:hidden!important}' });
  if (aba) { await p.locator(`.pl-aba:has-text("${aba}")`).first().click(); await espera(p, 600); }
  return p;
}

for (const [qual, raiz] of [['antes', ANTES], ['depois', DEPOIS]]) {
  /* 1. bordas e cores de células vazias bem longe dos dados (CV..DF) */
  await tentar('bordas ' + qual, async () => {
    const p = await abrir(raiz, 'BORDAS');
    await ir(p, 'CV1');
    const r = await p.locator('.pl-cv').boundingBox();
    await p.screenshot({ path: `${OUT}/${qual}-bordas.png`, clip: { x: r.x, y: r.y, width: 640, height: 260 } });
    await p.context().close();
  });
  /* 2. coluna oculta: ao reexibir, a largura que ela tinha no Excel */
  await tentar('oculta ' + qual, async () => {
    const p = await abrir(raiz, 'BORDAS');
    await ir(p, 'F1:H1');
    await p.click('.tabs .tab:has-text("Exibir")'); await espera(p, 300);
    await p.locator('[data-cmd="planilha.reexibirColuna"]').first().click(); await espera(p, 600);
    const r = await p.locator('.pl-cv').boundingBox();
    await p.screenshot({ path: `${OUT}/${qual}-oculta.png`, clip: { x: r.x, y: r.y, width: 640, height: 150 } });
    await p.context().close();
  });
  /* 3. celular: imagem inserida com o congelado ocupando a tela */
  await tentar('celular ' + qual, async () => {
    const p = await abrir(raiz, 'CONGELADA', CEL);
    const png = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = 240; c.height = 120; const x = c.getContext('2d'); x.fillStyle = '#1f6f8b'; x.fillRect(0, 0, 240, 120); x.fillStyle = '#f2c94c'; x.beginPath(); x.arc(70, 60, 38, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = 'bold 30px sans-serif'; x.fillText('LOGO', 120, 72); return c.toDataURL('image/png').split(',')[1]; });
    const arq = join(mkdtempSync(join(tmpdir(), 'efc-img-')), 'logo-exemplo.png');
    writeFileSync(arq, Buffer.from(png, 'base64'));
    await ir(p, 'D60');
    await p.click('.tabs .tab:has-text("Inserir")');
    await p.locator('[data-arq-imagem]').setInputFiles(arq);
    await espera(p, 1200);
    await p.screenshot({ path: `${OUT}/${qual}-celular.png` });
    await p.context().close();
  });
  /* 4. aviso de abertura: contagem de #REF! */
  await tentar('aviso ' + qual, async () => {
    const p = await abrir(raiz, null, PC, true);
    await espera(p, 500);
    const caixa = p.locator('[data-rel=bom]');
    if (await caixa.count()) await caixa.first().scrollIntoViewIfNeeded();
    await p.screenshot({ path: `${OUT}/${qual}-aviso.png`, clip: { x: 283, y: 90, width: 800, height: 620 } });
    await p.context().close();
  });
}
await b.close();
console.log('prints prontos em', OUT);
