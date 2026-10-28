/* EFCdocs — prints de antes (v0.6.3, servida em outro endereço) e depois (v0.6.4) para a página de aprovação.
   Só amostras inventadas (testes/amostras/): nenhum dado real nos prints.
   Uso: node scripts/prints-aprovacao.mjs <endereço-depois> <endereço-antes> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const DEPOIS = process.argv[2], ANTES = process.argv[3], OUT = process.argv[4];
const am = (n) => fileURLToPath(new URL(`../testes/amostras/${n}`, import.meta.url));
const QUALIDADE = am('amostra-qualidade.xlsx'), V064 = am('amostra-v064.xlsx');
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
  await p.waitForSelector('.pl-cv'); await espera(p, 700);
  await p.addStyleTag({ content: '.toasts{visibility:hidden!important}' });
  return p;
}
const tentar = async (nome, f) => { try { await f(); } catch (e) { console.log('FALHOU', nome, String(e.message).split('\n')[0]); } };
const aba = (p, nome) => p.click(`.tabs .tab:has-text("${nome}")`).then(() => espera(p, 250));

for (const [qual, raiz] of [['antes', ANTES], ['depois', DEPOIS]]) {
  await tentar('estilo E ' + qual, async () => {
    const p = await abrir(raiz, QUALIDADE);
    await p.click('[data-opcoes-faixa]'); await p.click('[data-faixa-estilo=E]'); await espera(p, 300);
    await shot(p, `${qual}-faixa-E`, { x: 212, y: 50, width: 1154, height: 110 });
    await p.click('[data-opcoes-faixa]'); await p.click('[data-faixa-estilo=B]'); await espera(p, 300);
    await aba(p, 'Inserir'); const a1 = await p.locator('.ribbon').evaluate((e) => Math.round(e.getBoundingClientRect().height));
    await aba(p, 'Exibir'); const a2 = await p.locator('.ribbon').evaluate((e) => Math.round(e.getBoundingClientRect().height));
    writeFileSync(`${OUT}/${qual}-alturas.txt`, `Inserir=${a1}px Exibir=${a2}px`);
    await shot(p, `${qual}-faixa-exibir`, { x: 212, y: 50, width: 1154, height: 160 });
    await p.context().close();
  });
  await tentar('filtro ' + qual, async () => {
    const p = await abrir(raiz, QUALIDADE);
    await aba(p, 'Dados');
    await p.locator('[data-cmd="dados.filtrar"]').first().click(); await espera(p, 400);
    await p.locator('[data-seta-filtro="1"]').dispatchEvent('pointerdown'); await p.waitForSelector('[data-filtro-menu]');
    await p.locator('.pl-fmenu-q').fill('Rede'); await espera(p, 250);
    await shot(p, `${qual}-filtro`, { x: 212, y: 190, width: 700, height: 420 });
    await p.context().close();
  });
  await tentar('alt-enter e congelada ' + qual, async () => {
    const p = await abrir(raiz, V064);
    await shot(p, `${qual}-altenter`, { x: 212, y: 190, width: 900, height: 330 });
    await p.mouse.move(700, 500); await p.mouse.wheel(0, 37); await espera(p, 700);
    await shot(p, `${qual}-congelada`, { x: 212, y: 190, width: 900, height: 420 });
    await p.context().close();
  });
  await tentar('celular ' + qual, async () => {
    const p = await abrir(raiz, QUALIDADE, CEL);
    await p.locator('.tbar-fixo .abas-cel').first().tap(); await espera(p, 400);
    await shot(p, `${qual}-celular`, { x: 0, y: 0, width: 390, height: 330 });
    await p.context().close();
  });
}
/* só depois: editor do gráfico com histórico, "Tirar a formatação" e a pergunta ao cancelar; aba Gráfico desligável */
await tentar('editor', async () => {
  const p = await abrir(DEPOIS, QUALIDADE);
  await p.locator('.pl-nome').fill('A1:C20'); await p.locator('.pl-nome').press('Enter'); await espera(p, 150);
  await aba(p, 'Inserir'); await p.locator('[data-cmd="inserir.grafico"]').first().click();
  await p.waitForSelector('[data-grafico-janela]'); await espera(p, 600);
  await p.locator('[data-ge-estilo=escuro]').click(); await espera(p, 300);
  await shot(p, 'depois-editor');
  await p.locator('[data-ge-cancelar]').click(); await espera(p, 300);
  await shot(p, 'depois-editor-cancelar');
  await p.context().close();
});
await tentar('exibir aba grafico', async () => {
  const p = await abrir(DEPOIS, QUALIDADE);
  await aba(p, 'Exibir');
  await shot(p, 'depois-exibir-abagrafico', { x: 212, y: 50, width: 1154, height: 160 });
  await p.context().close();
});
await b.close();
writeFileSync(`${OUT}/ok.txt`, 'ok');
console.log('prints prontos');
