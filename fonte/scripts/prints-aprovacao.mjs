/* EFCdocs — prints de antes (v0.4.4.1 em /v0441/) e depois (v0.4.4.2) para a página de aprovação.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 } };
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const NOMES = ['Controle de cloro livre e pH do packing house, turno da manhã', 'Água', 'Estoque de insumos orgânicos Fazenda Matriz', 'Calibração de balanças'];
const celula = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(p, 80); };
const digitar = async (p, ref, t) => { await celula(p, ref); await p.keyboard.type(t); await p.keyboard.press('Enter'); await espera(p, 120); };

for (const [aparelho, opt] of [['pc', PC], ['cel', CEL]]) {
  for (const [lado, raiz] of [['antes', BASE + 'v0441/'], ['depois', BASE]]) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage();
    const toque = (sel) => (aparelho === 'cel' ? p.locator(sel).first().tap() : p.locator(sel).first().click());
    const foto = (nome) => p.screenshot({ path: `${OUT}/${lado}-${aparelho}-${nome}.png` });
    for (const nome of NOMES) {
      await p.goto(raiz + '#/planilha'); await espera(p, 400);
      await toque('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await espera(p, 200);
      await p.goto(raiz + '#/planilha'); await p.waitForSelector('.arq'); await espera(p, 200);
      await toque('.arq .iconbtn[aria-label^="Renomear"]'); await p.waitForSelector('.janela input');
      await p.locator('.janela input').fill(nome); await p.keyboard.press('Enter'); await espera(p, 200);
    }
    await p.goto(raiz + '#/planilha'); await espera(p, 500); await p.mouse.move(5, 790);
    await foto('planilhas');
    await p.goto(raiz + '#/'); await espera(p, 500); await p.mouse.move(5, 790);
    await foto('inicio');
    /* manda uma para a lixeira: o aviso fica atrás do fundo ao abrir Opções */
    await p.goto(raiz + '#/planilha'); await espera(p, 400);
    await toque('.arq .iconbtn[aria-label^="Mandar para a lixeira"]'); await espera(p, 400);
    await toque('.topbar [aria-label="Opções"]'); await p.waitForSelector('.opcoes'); await espera(p, 300);
    await foto('aviso-atras-do-fundo');
    await p.keyboard.press('Escape'); await espera(p, 8500);
    await p.goto(raiz + '#/lixeira'); await espera(p, 500);
    await foto('lixeira');
    /* número em célula de data (só no computador) */
    if (aparelho === 'pc') {
      await p.goto(raiz + '#/planilha'); await espera(p, 400);
      await toque('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await espera(p, 300);
      await digitar(p, 'F2', '26/10/2026');
      await celula(p, 'F2'); await p.keyboard.type('=9/10'); await p.keyboard.press('Enter'); await espera(p, 400);
      await foto('numero-em-data');
      const pergunta = await p.locator('.pl-jzeros').count();
      if (pergunta) { await p.locator('.pl-jzeros button:has-text("Mostrar como número")').click(); await espera(p, 300); }
      else { await celula(p, 'F2'); }
      await celula(p, 'F2');
      await p.click('.tabs .tab:has-text("Fórmulas")'); await p.locator('[data-cmd="formula.explicar"]').first().click(); await p.waitForSelector('.pl-jexp'); await espera(p, 300);
      await foto('explicar');
      await p.keyboard.press('Escape');
    }
    /* quadro: forma Início/Fim */
    await p.goto(raiz + '#/postits'); await espera(p, 400);
    await toque('[data-novo=postits]'); await p.waitForSelector('.qd-vazio'); await espera(p, 400);
    await toque('.qd-vazio .chipb:has-text("Fluxograma")'); await p.waitForSelector('textarea.qd-edita'); await espera(p, 300);
    await p.locator('textarea.qd-edita').fill('Início'); await espera(p, 250);
    await foto('quadro-forma');
    await p.keyboard.press('Escape'); await espera(p, 200);
    await ctx.close();
  }
}
/* aba só para ver (computador) */
for (const [lado, raiz] of [['antes', BASE + 'v0441/'], ['depois', BASE]]) {
  const ctx = await b.newContext(PC); const p = await ctx.newPage();
  await p.goto(raiz + '#/'); await espera(p, 600);
  await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv');
  const p2 = await ctx.newPage(); await p2.goto(p.url()); await p2.waitForSelector('.faixa-aviso.trava', { timeout: 5000 }); await espera(p2, 400);
  await celula(p2, 'A2'); await p2.keyboard.type('9'); await espera(p2, 350);
  await p2.screenshot({ path: `${OUT}/${lado}-pc-so-ver.png`, clip: { x: 0, y: 0, width: 1366, height: 200 } });
  await ctx.close();
}
await b.close();
console.log('prints prontos em ' + OUT);
