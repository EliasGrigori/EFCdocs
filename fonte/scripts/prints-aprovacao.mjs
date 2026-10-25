/* EFCdocs — prints de antes (v0.4.1 em /v041/) e depois (v0.4.2) para a página de aprovação das correções.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 } };
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const foto = (p, nome, clip) => p.screenshot({ path: `${OUT}/${nome}.png`, ...(clip ? { clip } : {}) });

const ir = async (p, r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await espera(p, 80); };
const digitar = async (p, r, lista) => { await ir(p, r); for (const t of lista) { await p.keyboard.type(t); await p.keyboard.press('Enter'); } await espera(p, 120); };
const cmd = (p, id) => p.locator(`[data-cmd="${id}"]`).first().click();
const nova = async (p, raiz) => { await p.goto(raiz + '#/planilha'); await espera(p, 900); await p.click('[data-novo=planilha]'); await espera(p, 500); };
const tema = async (p, id) => {
  await p.locator('.topbar [aria-label="Opções"]').click(); await espera(p);
  await p.locator(`.tema-b[data-tema="${id}"]`).click(); await espera(p);
  await p.keyboard.press('Escape'); await espera(p, 250);
};
const perfil = async (p, nome) => {
  await p.locator('.topbar [aria-label="Opções"]').click(); await espera(p);
  await p.locator(`.opcoes .chipb:has-text("${nome}")`).click();
  await p.keyboard.press('Escape'); await espera(p, 200);
};
const grade = async (p, w = 560, h = 260) => { const c = await p.locator('.pl-cv').boundingBox(); return { x: c.x, y: c.y - 60, width: w, height: h + 60 }; };


const faixaClip = { x: 0, y: 0, width: 1366, height: 190 };
for (const [lado, raiz] of [['antes', BASE + 'v041/'], ['depois', BASE]]) {
  /* H01..H03: funções, prévia, erro #DIV/0! */
  {
    const ctx = await b.newContext(PC); const p = await ctx.newPage();
    await nova(p, raiz);
    await digitar(p, 'A1', ['1', '2', '3']);
    await ir(p, 'C1');
    await p.keyboard.type('=CORREL(A1:A3;A1:A3)'); await espera(p, 250);
    await foto(p, `${lado}-correl`, await grade(p, 760, 330));
    await p.keyboard.press('Enter'); await espera(p, 200);
    if (lado === 'antes') { await foto(p, 'antes-correl-gravada', await grade(p, 760, 330)); await p.keyboard.press('Escape'); await espera(p, 150); }
    else { await ir(p, 'C1'); await espera(p, 150); await foto(p, 'depois-correl-gravada', await grade(p, 760, 200)); }
    await ir(p, 'D1');
    await p.keyboard.type('=PROCV(A2)'); await espera(p, 250);
    await foto(p, `${lado}-procv`, await grade(p, 760, 440));
    await p.keyboard.press('Escape');
    await ir(p, 'E1'); await p.keyboard.type('=1/0'); await p.keyboard.press('Enter'); await espera(p, 150);
    await ir(p, 'E1');
    if (lado === 'depois') { await p.locator('.topbar [aria-label*="ainel"]').first().click().catch(() => cmd(p, 'exibir.painel')); }
    else { await p.locator('.topbar [aria-label*="ainel"]').first().click().catch(() => cmd(p, 'exibir.painel')); }
    await espera(p, 400);
    await foto(p, `${lado}-erro-painel`);
    await ctx.close();
  }
  /* H04/H05: faixa compacta e dica */
  {
    const ctx = await b.newContext(PC); const p = await ctx.newPage();
    await nova(p, raiz);
    await foto(p, `${lado}-faixa-inicio`, faixaClip);
    await p.click('.tab:has-text("Fórmulas")'); await espera(p, 200);
    await foto(p, `${lado}-faixa-formulas`, faixaClip);
    await p.click('.tab:has-text("Página Inicial")'); await espera(p, 200);
    if (lado === 'depois') {
      await p.hover('[data-cmd="formatar.negrito"]'); await p.waitForSelector('.dica-cmd'); await espera(p, 100);
      await foto(p, 'depois-dica-negrito', { x: 0, y: 0, width: 700, height: 260 });
      await p.mouse.move(700, 500); await espera(p, 150);
      await p.hover('[data-cmd="editar.copiar"]'); await p.waitForSelector('.dica-cmd'); await espera(p, 100);
      await foto(p, 'depois-dica-copiar', { x: 0, y: 0, width: 700, height: 260 });
      await p.mouse.move(700, 500);
    }
    /* tela estreita */
    await p.setViewportSize({ width: 1000, height: 700 }); await espera(p, 400);
    await foto(p, `${lado}-faixa-estreita`, { x: 0, y: 0, width: 1000, height: 190 });
    if (lado === 'depois') {
      await p.click('.rb-mais'); await espera(p, 250);
      await foto(p, 'depois-faixa-mais', { x: 0, y: 0, width: 1000, height: 330 });
    }
    await ctx.close();
  }
  /* H06: reexibir colunas (só existe na v0.4.2) */
  if (lado === 'depois') {
    const ctx = await b.newContext(PC); const p = await ctx.newPage();
    await nova(p, raiz);
    await digitar(p, 'A1', ['Lote', 'L-012']); await digitar(p, 'B1', ['Cloro', '1,2']); await digitar(p, 'C1', ['Situação', 'OK']);
    await ir(p, 'B1');
    await p.click('.tab:has-text("Exibir")'); await cmd(p, 'planilha.ocultarColuna'); await espera(p, 250);
    { const c = await p.locator('.pl-cv').boundingBox(); await foto(p, 'depois-colunas-ocultas', { x: 0, y: 0, width: 760, height: c.y + 90 }); }
    await ir(p, 'A1'); await p.keyboard.press('Shift+ArrowRight'); await p.keyboard.press('Shift+ArrowRight');
    await cmd(p, 'planilha.reexibirColuna'); await espera(p, 300);
    { const c = await p.locator('.pl-cv').boundingBox(); await foto(p, 'depois-colunas-de-volta', { x: 0, y: 0, width: 760, height: c.y + 90 }); }
    await ctx.close();
  }
}
await b.close();
console.log('prints prontos em ' + OUT);
