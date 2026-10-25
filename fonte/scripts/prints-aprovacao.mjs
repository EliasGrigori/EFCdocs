/* EFCdocs — prints de antes (v0.4.3.1 em /v0431/) e depois (v0.4.4) para a página de aprovação da revisão de layout.
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

for (const [aparelho, opt] of [['pc', PC], ['cel', CEL]]) {
  for (const [lado, raiz] of [['antes', BASE + 'v0431/'], ['depois', BASE]]) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage();
    const toque = (sel) => (aparelho === 'cel' ? p.locator(sel).first().tap() : p.locator(sel).first().click());
    const n = (x) => `${lado}-${aparelho}-${x}`;
    /* dois arquivos para as listas */
    await p.goto(raiz + '#/'); await espera(p, 900);
    await toque('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await espera(p, 400);
    await p.mouse.move(5, 790);
    await foto(p, n('planilha'));
    await p.goto(raiz + '#/'); await espera(p, 500);
    await toque('[data-novo=postits]'); await p.waitForSelector('.qd-vazio'); await espera(p, 500);
    await p.mouse.move(5, 790);
    await foto(p, n('quadro'));
    await p.goto(raiz + '#/'); await espera(p, 600);
    await p.mouse.move(5, 790); await espera(p, 200);
    await foto(p, n('inicio'));
    await p.goto(raiz + '#/planilha'); await espera(p, 600);
    await foto(p, n('planilhas'));
    await p.goto(raiz + '#/docx'); await espera(p, 600);
    await foto(p, n('documentos'));
    await p.goto(raiz + '#/lixeira'); await espera(p, 600);
    await foto(p, n('lixeira'));
    await p.goto(raiz + '#/'); await espera(p, 600);
    await toque('.topbar [aria-label="Opções"]'); await p.waitForSelector('.opcoes'); await espera(p, 300);
    await foto(p, n('opcoes'));
    if (lado === 'depois') {
      await toque('.op-sec[data-sec=tema] .op-cab'); await espera(p, 250);
      await foto(p, n('opcoes-tema'));
      await toque('.op-sec[data-sec=tema] .op-cab'); await toque('.op-sec[data-sec=tela] .op-cab'); await espera(p, 250);
      await foto(p, n('opcoes-tela'));
      await toque('.op-sec[data-sec=tela] .op-cab');
      await p.keyboard.press('Escape'); await espera(p, 200);
      await toque('.filtro-b'); await espera(p, 200);
      await p.locator('.filtro-p select').first().selectOption('planilha'); await espera(p, 200);
      await foto(p, n('filtro'));
      await p.keyboard.press('Escape'); await espera(p, 200);
      await toque('.filtro-p button:has-text("Limpar")').catch(() => {});
    }
    await ctx.close();
  }
}
await b.close();
console.log('prints prontos em ' + OUT);
