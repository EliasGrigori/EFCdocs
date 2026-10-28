/* EFCdocs — prints de antes (v0.6.4, servida em outro endereço) e depois (v0.6.5) para a página de aprovação.
   Só amostras inventadas (testes/amostras/): nenhum dado real nos prints.
   Também baixa o "Salvar como Excel" de antes e de depois (para abrir no LibreOffice e comparar).
   Uso: node scripts/prints-aprovacao.mjs <endereço-depois> <endereço-antes> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const DEPOIS = process.argv[2], ANTES = process.argv[3], OUT = process.argv[4];
const am = (n) => fileURLToPath(new URL(`../testes/amostras/${n}`, import.meta.url));
const FORMAS = am('amostra-formas.xlsx'), QUALIDADE = am('amostra-qualidade.xlsx');
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 }, acceptDownloads: true };
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const shot = (p, nome, clip) => p.screenshot({ path: `${OUT}/${nome}.png`, ...(clip ? { clip } : {}) });
async function abrir(raiz, arq, opc = PC) {
  const ctx = await b.newContext(opc);
  const p = await ctx.newPage();
  await p.goto(raiz + '#/'); await espera(p, 700);
  await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', arq);
  await p.waitForSelector('[data-excel-abrir]'); await espera(p, 300);
  await p.click('[data-excel-abrir]');
  await p.waitForSelector('.pl-cv'); await espera(p, 900);
  await p.addStyleTag({ content: '.toasts{visibility:hidden!important}' });
  return p;
}
const tentar = async (nome, f) => { try { await f(); } catch (e) { console.log('FALHOU', nome, String(e.message).split('\n')[0]); } };
const aba = (p, nome) => p.click(`.tabs .tab:has-text("${nome}")`).then(() => espera(p, 250));
const GRADE = { x: 212, y: 228, width: 1154, height: 505 };

for (const [qual, raiz] of [['antes', ANTES], ['depois', DEPOIS]]) {
  await tentar('painel ' + qual, async () => {
    const p = await abrir(raiz, FORMAS);
    await shot(p, `${qual}-painel`, GRADE);
    await aba(p, 'Inserir');
    await shot(p, `${qual}-faixa-inserir`, { x: 212, y: 50, width: 1154, height: 140 });
    await aba(p, 'Arquivo');
    const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-cmd="arquivo.exportarExcel"]').first().click()]);
    copyFileSync(await dl.path(), `${OUT}/${qual}-salvo.xlsx`);
    await p.context().close();
  });
  await tentar('celular ' + qual, async () => {
    const p = await abrir(raiz, FORMAS, CEL);
    await shot(p, `${qual}-celular`, { x: 0, y: 0, width: 390, height: 640 });
    await p.context().close();
  });
}
/* só depois: botão leva à aba; janela da forma (grupo e nova); Imprimir com as formas */
await tentar('clique no botão', async () => {
  const p = await abrir(DEPOIS, FORMAS);
  await p.locator('.pl-obj-fm.com-link').first().locator('[data-parte="1"] path').first().hover(); await espera(p, 200);
  await shot(p, 'depois-botao-hover', { x: 212, y: 228, width: 900, height: 260 });
  await p.locator('.pl-obj-fm.com-link').first().locator('[data-parte="1"] path').first().click(); await espera(p, 500);
  await shot(p, 'depois-botao-foi', { x: 212, y: 190, width: 900, height: 300 });
  await p.context().close();
});
await tentar('janela da forma do grupo', async () => {
  const p = await abrir(DEPOIS, FORMAS);
  await p.locator('.pl-obj-fm.com-link').first().locator('[data-parte="0"] path').first().click({ modifiers: ['Control'] }); await espera(p, 250);
  await shot(p, 'depois-escolhida', { x: 212, y: 228, width: 900, height: 260 });
  await p.keyboard.press('Enter'); await p.waitForSelector('[data-forma-janela]'); await espera(p, 600);
  await shot(p, 'depois-janela-grupo');
  await p.context().close();
});
await tentar('inserir forma', async () => {
  const p = await abrir(DEPOIS, QUALIDADE);
  await p.locator('.pl-nome').fill('E3'); await p.locator('.pl-nome').press('Enter'); await espera(p, 150);
  await aba(p, 'Inserir'); await p.locator('[data-cmd="inserir.formas"]').first().click();
  await p.waitForSelector('[data-forma-janela]'); await espera(p, 400);
  await p.click('[data-fm-des="wedgeRoundRectCallout"]');
  await p.locator('[data-fm-texto]').fill('Cloro abaixo de 0,5 mg/L: avisar a equipe');
  await p.click('[data-ge-op="fm-sombra:sim"]'); await espera(p, 500);
  await shot(p, 'depois-inserir-forma');
  await p.click('[data-fm-ok]'); await espera(p, 500);
  await shot(p, 'depois-forma-nova', GRADE);
  await p.context().close();
});
await tentar('imprimir', async () => {
  const p = await abrir(DEPOIS, FORMAS);
  await p.keyboard.press('Control+p'); await p.waitForSelector('[data-imprimir-janela]'); await espera(p, 900);
  await shot(p, 'depois-imprimir');
  await p.context().close();
});
await b.close();
console.log('prints prontos');
