/* EFCdocs — prints de antes (v0.6.5, servida em outro endereço) e depois (v0.6.6) para a página de aprovação.
   Só amostras inventadas (testes/amostras/): nenhum dado real nos prints.
   Também baixa PDFs e "Salvar como Excel" de antes e de depois (para virar imagem e comparar no LibreOffice).
   Uso: node scripts/prints-aprovacao.mjs <endereço-depois> <endereço-antes> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const DEPOIS = process.argv[2], ANTES = process.argv[3], OUT = process.argv[4];
const am = (n) => fileURLToPath(new URL(`../testes/amostras/${n}`, import.meta.url));
const FORMAS = am('amostra-formas.xlsx'), V066 = am('amostra-v066.xlsx');
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 }, acceptDownloads: true };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const shot = (p, nome, clip) => p.screenshot({ path: `${OUT}/${nome}.png`, ...(clip ? { clip } : {}) });
const GRADE = { x: 212, y: 228, width: 1154, height: 505 };
async function abrir(raiz, arq) {
  const ctx = await b.newContext(PC);
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
async function nova(raiz) {
  const ctx = await b.newContext(PC);
  const p = await ctx.newPage();
  await p.goto(raiz + '#/planilha'); await p.waitForSelector('[data-novo=planilha]'); await p.click('[data-novo=planilha]');
  await p.waitForSelector('.pl-cv'); await espera(p, 300);
  return p;
}
const celula = async (p, r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await espera(p, 100); };
const aba = (p, nome) => p.click(`.tabs .tab:has-text("${nome}")`).then(() => espera(p, 250));
const baixar = async (p, acao, destino) => { const [dl] = await Promise.all([p.waitForEvent('download'), acao()]); copyFileSync(await dl.path(), destino); };
const tentar = async (nome, f) => { try { await f(); } catch (e) { console.log('FALHOU', nome, String(e.message).split('\n')[0]); } };

for (const [qual, raiz] of [['antes', ANTES], ['depois', DEPOIS]]) {
  await tentar('painel ' + qual, async () => {
    const p = await abrir(raiz, FORMAS);
    await shot(p, `${qual}-painel`, GRADE);
    await shot(p, `${qual}-faixa`, { x: 212, y: 44, width: 1154, height: 150 });
    await p.keyboard.press('Control+p'); await p.waitForSelector('[data-imprimir-janela]'); await espera(p, 900);
    await shot(p, `${qual}-imprimir`);
    await baixar(p, () => p.click('[data-imp-pdf]'), `${OUT}/${qual}-painel.pdf`);
    await p.context().close();
  });
  await tentar('inserir linhas ' + qual, async () => {
    const p = await abrir(raiz, FORMAS);
    await celula(p, 'A12:A14');
    await aba(p, 'Página Inicial');
    await p.locator('[data-cmd="planilha.inserirLinha"]').first().click(); await espera(p, 600);
    await shot(p, `${qual}-inserir-linhas`, GRADE);
    await p.context().close();
  });
  await tentar('alt enter ' + qual, async () => {
    const p = await nova(raiz);
    await celula(p, 'B2');
    await p.keyboard.type('QUANTIDADE'); await p.keyboard.press('Alt+Enter'); await p.keyboard.type('AMOSTRAS'); await p.keyboard.press('Enter'); await espera(p, 300);
    await celula(p, 'C2'); await p.keyboard.type('Outro texto'); await p.keyboard.press('Enter'); await espera(p, 200);
    await celula(p, 'B2'); await espera(p, 300);
    await shot(p, `${qual}-alt-enter`, { x: 212, y: 196, width: 640, height: 150 });
    await p.context().close();
  });
  await tentar('v066 ' + qual, async () => {
    const p = await abrir(raiz, V066);
    await shot(p, `${qual}-v066`, GRADE);
    /* Descartar no editor de gráfico (com o mouse em cima) */
    await p.locator('.pl-obj-gr').first().dblclick(); await p.waitForSelector('[data-grafico-janela]'); await espera(p, 500);
    await p.locator('[data-ge-estilo=escuro]').click(); await espera(p, 250);
    await p.locator('[data-ge-cancelar]').click(); await espera(p, 250);
    await p.locator('[data-ge-descartar]').hover(); await espera(p, 250);
    const r = await p.locator('[data-ge-descartar]').boundingBox();
    await shot(p, `${qual}-descartar`, { x: Math.max(0, r.x - 420), y: r.y - 14, width: 700, height: r.height + 28 });
    await p.locator('[data-ge-descartar]').click(); await espera(p, 300);
    /* renomeia a aba Painel e salva como Excel */
    await p.locator('.pl-aba:has-text("Painel")').dblclick();
    await p.locator('.janela input').fill('Resumo');
    await p.locator('.janela .btn.primary').click(); await espera(p, 300);
    await aba(p, 'Arquivo');
    await baixar(p, () => p.locator('[data-cmd="arquivo.exportarExcel"]').first().click(), `${OUT}/${qual}-v066-salvo.xlsx`);
    await p.context().close();
  });
  await tentar('formas salvo ' + qual, async () => {
    const p = await abrir(raiz, FORMAS);
    await p.locator('.pl-aba:has-text("Dados")').dblclick();
    await p.locator('.janela input').fill('Base');
    await p.locator('.janela .btn.primary').click(); await espera(p, 300);
    await aba(p, 'Arquivo');
    await baixar(p, () => p.locator('[data-cmd="arquivo.exportarExcel"]').first().click(), `${OUT}/${qual}-formas-salvo.xlsx`);
    await p.context().close();
  });
}
/* só depois: aba travada, cantos recortados e linha */
await tentar('travada', async () => {
  const p = await abrir(DEPOIS, FORMAS);
  await p.addStyleTag({ content: '.toasts{visibility:visible!important}' });
  await aba(p, 'Revisão');
  await p.locator('[data-cmd="revisao.travar"]').first().click(); await p.waitForSelector('.pl-jdados');
  await p.locator('.pl-jdados .btn.primary:has-text("Travar a aba")').click(); await espera(p, 600);
  await p.locator('.pl-obj-fm.com-link').first().locator('[data-parte="0"] path').first().click({ modifiers: ['Control'] }); await espera(p, 200);
  await p.keyboard.press('Enter'); await espera(p, 500);
  await shot(p, 'depois-travada');
  await p.context().close();
});
await tentar('recortes', async () => {
  const p = await abrir(DEPOIS, V066);
  await p.mouse.move(700, 500); await p.mouse.wheel(0, 360); await espera(p, 600);
  await shot(p, 'depois-recortes', { x: 212, y: 330, width: 1154, height: 140 });
  await p.context().close();
});
await b.close();
console.log('prints prontos');
