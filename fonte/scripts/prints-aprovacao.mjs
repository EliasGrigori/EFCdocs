/* EFCdocs — prints de antes (v0.6.0 em /v060/) e depois (v0.6.1) para a página de aprovação.
   Só amostras inventadas (testes/amostras/): nenhum dado real nos prints.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2], OUT = process.argv[3];
const am = (n) => fileURLToPath(new URL(`../testes/amostras/${n}`, import.meta.url));
const QUALIDADE = am('amostra-qualidade.xlsx'), PAINEL = am('amostra-painel-excel.xlsx'), CONG = am('amostra-congelada.xlsx');
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 }, acceptDownloads: true };
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const shot = (p, nome, clip) => p.screenshot({ path: `${OUT}/${nome}.png`, ...(clip ? { clip } : {}) });
const ir = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(p, 120); };
async function abrir(raiz, arq, opc = PC) {
  const ctx = await b.newContext(opc);
  const p = await ctx.newPage();
  await p.goto(raiz + '#/'); await espera(p, 700);
  if (opc.hasTouch) await p.locator('[data-abrir-excel]').tap(); else await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', arq);
  await p.waitForSelector('[data-excel-abrir]'); await espera(p, 300);
  if (opc.hasTouch) await p.locator('[data-excel-abrir]').tap(); else await p.click('[data-excel-abrir]');
  await p.waitForSelector('.pl-cv'); await espera(p, 700);
  await p.addStyleTag({ content: '.toasts{visibility:hidden!important}' });
  return p;
}
const irAba = async (p, nome) => { await p.locator(`.pl-abas button:has-text("${nome}")`).first().click(); await espera(p, 400); };
const GRADE = { x: 212, y: 180, width: 1154, height: 550 };
const abrirGrafico = async (p, n) => { const g = p.locator('.pl-obj-gr').nth(n); await g.click({ position: { x: 40, y: 24 }, force: true }); await espera(p, 60); await g.click({ position: { x: 40, y: 24 }, force: true }); await espera(p, 300); if (!(await p.locator('[data-grafico-janela]').count())) await g.dblclick({ position: { x: 40, y: 24 }, force: true }); await p.waitForSelector('[data-grafico-janela]', { timeout: 8000 }); await espera(p, 300); };

for (const [qual, raiz] of [['antes', BASE + 'v060/'], ['depois', BASE]]) {
  let p = await abrir(raiz, PAINEL);
  await p.mouse.move(700, 500); await p.mouse.wheel(0, 380); await espera(p, 400);
  await shot(p, `${qual}-velo`, GRADE);
  await irAba(p, 'Painel');
  await shot(p, `${qual}-painel`, GRADE);
  await irAba(p, 'Resumo');
  await shot(p, `${qual}-resumo`, GRADE);
  /* editor */
  await irAba(p, 'Painel');
  if (await p.locator('.pl-obj-gr').count() > 1) { await abrirGrafico(p, 1); await shot(p, `${qual}-editor`); }
  if (qual === 'depois') {
    await p.locator('[data-gr-previa] [data-parte="ponto:0:1"]').first().click({ force: true }); await espera(p, 250);
    await shot(p, 'depois-editor-series');
    await p.click('[data-ge-aba=estilo]'); await espera(p, 200);
    await shot(p, 'depois-editor-estilo');
    await p.click('[data-ge-aba=eixos]'); await espera(p, 200);
    await p.locator('[data-ge-op="eixo:y2"]').click().catch(() => {}); await espera(p, 200);
    await shot(p, 'depois-editor-eixos');
    await p.click('[data-ge-aba=fundo]'); await espera(p, 200);
    await shot(p, 'depois-editor-fundo');
    await p.click('[data-ge-aba=textos]'); await espera(p, 200);
    await shot(p, 'depois-editor-textos');
  }
  await p.keyboard.press('Escape'); await espera(p, 200);
  /* opções da faixa */
  const bt = qual === 'antes' ? p.locator('.tabs .iconbtn.modo').first() : p.locator('[data-opcoes-faixa]');
  await bt.click(); await espera(p, 300);
  await shot(p, `${qual}-faixa-menu`, { x: 760, y: 0, width: 606, height: 340 });
  await p.keyboard.press('Escape'); await p.mouse.click(700, 600); await espera(p, 200);
  await p.context().close();
  /* congelada */
  p = await abrir(raiz, CONG);
  await p.mouse.move(700, 500); await p.mouse.wheel(0, 90); await espera(p, 400);
  await shot(p, `${qual}-congelada`, { x: 212, y: 180, width: 1000, height: 330 });
  await p.context().close();
}
/* depois: velocímetro do EFCdocs e estilo semáforo numa planilha da amostra de qualidade */
{
  const p = await abrir(BASE, QUALIDADE);
  await ir(p, 'C2');
  await p.click('.tabs .tab:has-text("Inserir")');
  await p.locator('[data-cmd="inserir.grafico"]').first().click(); await p.waitForSelector('[data-grafico-janela]');
  await p.fill('[data-gr-fx]', 'C2');
  await p.click('[data-gr-tipo=velocimetro]'); await p.fill('[data-gr-titulo]', 'Cloro na entrada (mg/L)');
  await p.fill('[data-ge=meta]', '0,5'); await p.fill('[data-ge=max]', '2'); await espera(p, 200);
  await shot(p, 'depois-velocimetro-janela');
  await p.click('[data-gr-aplicar]'); await p.waitForSelector('.pl-obj-gr'); await espera(p, 300);
  await ir(p, 'A1');
  await shot(p, 'depois-velocimetro-grade', GRADE);
  await p.context().close();
}
/* celular */
{
  const p = await abrir(BASE, PAINEL, CEL);
  await p.locator('.pl-abas button:has-text("Painel")').first().tap({ force: true }).catch(() => {}); await espera(p, 400);
  await ir(p, 'H8'); await espera(p, 500);
  await shot(p, 'depois-cel-planilha');
  await p.evaluate(() => { const g = document.querySelector('.pl-obj-gr'); if (g) { g.dispatchEvent(new MouseEvent('click', { bubbles: true })); g.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); } });
  await p.waitForSelector('[data-grafico-janela]', { timeout: 8000 }).catch(() => {}); await espera(p, 400);
  await shot(p, 'depois-cel-editor');
  await p.context().close();
}
await b.close();
writeFileSync(`${OUT}/ok.txt`, 'ok');
console.log('prints prontos');
