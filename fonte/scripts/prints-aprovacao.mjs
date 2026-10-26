/* EFCdocs — prints de antes (v0.4.4 em /v044/) e depois (v0.4.4.1) para a página de aprovação.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 } };
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const NOMES = ['Controle de cloro livre e pH do packing house', 'Estoque de insumos orgânicos Fazenda Matriz', 'Calibração de balanças e termômetros 2026', 'Água da irrigação', 'Análise de acerola'];

for (const [aparelho, opt] of [['pc', PC], ['cel', CEL]]) {
  for (const [lado, raiz] of [['antes', BASE + 'v044/'], ['depois', BASE]]) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage();
    const toque = (sel) => (aparelho === 'cel' ? p.locator(sel).first().tap() : p.locator(sel).first().click());
    const foto = (nome) => p.screenshot({ path: `${OUT}/${lado}-${aparelho}-${nome}.png` });
    /* cinco planilhas com nomes compridos */
    for (const nome of NOMES) {
      await p.goto(raiz + '#/planilha'); await espera(p, 500);
      await toque('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await espera(p, 250);
      await p.goto(raiz + '#/planilha'); await p.waitForSelector('.arq'); await espera(p, 250);
      await toque('.arq .iconbtn[aria-label^="Renomear"]'); await p.waitForSelector('.janela input');
      await p.locator('.janela input').fill(nome); await p.keyboard.press('Enter'); await espera(p, 250);
    }
    await p.goto(raiz + '#/planilha'); await espera(p, 600);
    await p.mouse.move(5, 790);
    await foto('planilhas');
    /* manda uma para a lixeira */
    await toque('.arq .iconbtn[aria-label^="Mandar para a lixeira"]'); await espera(p, 300);
    await p.goto(raiz + '#/lixeira'); await espera(p, 600);
    await foto('lixeira');
    await toque('.arq .iconbtn[aria-label^="Excluir de vez"], .arq .btn.apagar'); await espera(p, 400);
    await foto('lixeira-pergunta');
    await p.keyboard.press('Escape'); await espera(p, 200);
    /* fundo atrás da janela e da subjanela */
    await p.goto(raiz + '#/planilha'); await espera(p, 500);
    await toque('.topbar [aria-label="Opções"]'); await p.waitForSelector('.opcoes'); await espera(p, 300);
    await foto('opcoes-fundo');
    await toque('.op-sec[data-sec=tema] .op-cab'); await espera(p, 300);
    await foto('opcoes-tema');
    await toque('.op-sec[data-sec=tema] .op-cab'); await toque('.op-sec[data-sec=tela] .op-cab'); await espera(p, 250);
    await foto('opcoes-tela');
    await p.keyboard.press('Escape'); await espera(p, 200);
    await espera(p, 6500);
    /* quadro vazio e forma Início/Fim em edição */
    await p.goto(raiz + '#/postits'); await espera(p, 500);
    await toque('[data-novo=postits]'); await p.waitForSelector('.qd-vazio'); await espera(p, 400);
    await p.mouse.move(5, 790);
    await foto('quadro');
    await toque('.qd-vazio .chipb:has-text("Fluxograma")'); await p.waitForSelector('textarea.qd-edita'); await espera(p, 300);
    await p.locator('textarea.qd-edita').fill('Início');
    await espera(p, 200);
    await foto('quadro-forma');
    await p.keyboard.press('Escape'); await espera(p, 200);
    /* Demonstração */
    const c2 = await b.newContext(opt); const q = await c2.newPage();
    await q.goto(raiz + '?demo=1#/'); await espera(q, 900);
    await q.mouse.move(5, 790);
    await q.screenshot({ path: `${OUT}/${lado}-${aparelho}-demo.png` });
    await c2.close();
    await ctx.close();
  }
}
await b.close();
console.log('prints prontos em ' + OUT);
