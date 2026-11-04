/* EFCdocs — prints de antes (v0.6.7, servida em outro endereço) e depois (v0.6.8) para a página de aprovação.
   Só amostras inventadas (testes/amostras/): nenhum dado real nos prints.
   Também baixa o "Salvar como Excel" da amostra-v068 de antes e de depois (para abrir no LibreOffice e comparar).
   Uso: node scripts/prints-aprovacao.mjs <endereço-depois> <endereço-antes> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const DEPOIS = process.argv[2], ANTES = process.argv[3], OUT = process.argv[4];
const am = (n) => fileURLToPath(new URL(`../testes/amostras/${n}`, import.meta.url));
const V068 = am('amostra-v068.xlsx'), QUAL = am('amostra-qualidade.xlsx'), V066 = am('amostra-v066.xlsx'), FORMAS = am('amostra-formas.xlsx');
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 }, acceptDownloads: true };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const shot = (p, nome, clip) => p.screenshot({ path: `${OUT}/${nome}.png`, ...(clip ? { clip } : {}) });
async function abrir(raiz, arq, opts = PC) {
  const ctx = await b.newContext(opts);
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
const cmd = (p, id) => p.locator(`[data-cmd="${id}"]`).first().click();
const aba = (p, nome) => p.click(`.tabs .tab:has-text("${nome}")`).then(() => espera(p, 250));
const abaPl = (p, nome) => p.locator(`.pl-aba:has-text("${nome}")`).click().then(() => espera(p, 500));
const celula = async (p, r) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(r); await p.locator('.pl-nome').press('Enter'); await espera(p, 100); };
const baixar = async (p, acao, destino) => { const [dl] = await Promise.all([p.waitForEvent('download'), acao()]); copyFileSync(await dl.path(), destino); };
const tentar = async (nome, f) => { try { await f(); } catch (e) { console.log('FALHOU', nome, String(e.message).split('\n')[0]); } };
const zoom80 = async (p) => { for (let i = 0; i < 2; i++) { await p.locator('[aria-label="Diminuir o zoom"]').click(); await espera(p, 150); } };

for (const [qual, raiz] of [['antes', ANTES], ['depois', DEPOIS]]) {
  await tentar('selecao ' + qual, async () => {
    const p = await abrir(raiz, V068);
    await abaPl(p, 'CON. COLETA'); await zoom80(p);
    await p.mouse.move(700, 500);
    for (let i = 0; i < 8; i++) { await p.mouse.wheel(0, 600); await espera(p, 60); }
    await espera(p, 400);
    await celula(p, 'C7'); await espera(p, 300);
    await shot(p, `${qual}-selecao`, { x: 212, y: 196, width: 760, height: 300 });
    /* rolando para cima aos poucos (touchpad): a linha cortada embaixo do cabeçalho */
    await p.keyboard.press('Escape');
    await p.evaluate(() => { const r = document.querySelector('.pl-rol'); r.scrollTop = r.scrollTop - 11; r.dispatchEvent(new Event('scroll')); });
    await espera(p, 300);
    await shot(p, `${qual}-rolagem`, { x: 212, y: 230, width: 760, height: 200 });
    await p.context().close();
  });
  await tentar('nitidez ' + qual, async () => {
    const p = await abrir(raiz, QUAL, { ...PC, deviceScaleFactor: 1.25 });
    await p.locator('[aria-label="Diminuir o zoom"]').click(); await espera(p, 400);
    await shot(p, `${qual}-nitidez`, { x: 212, y: 230, width: 260, height: 110 });
    await p.context().close();
  });
  await tentar('excel ' + qual, async () => {
    {
      const ctx = await b.newContext(PC); const q = await ctx.newPage();
      await q.goto(raiz + '#/'); await espera(q, 700);
      await q.click('[data-abrir-excel]'); await q.setInputFiles('[data-excel-arquivo]', V068);
      await q.waitForSelector('[data-excel-abrir]'); await espera(q, 500);
      const caixa = q.locator('[data-rel="veio"]');
      await caixa.scrollIntoViewIfNeeded(); await espera(q, 200);
      const r = await caixa.boundingBox();
      await shot(q, `${qual}-relatorio-v068`, { x: r.x - 4, y: r.y - 4, width: r.width + 8, height: Math.min(r.height + 8, 800 - r.y) });
      await ctx.close();
    }
    const p = await abrir(raiz, V068);
    await aba(p, 'Arquivo');
    await baixar(p, () => cmd(p, 'arquivo.exportarExcel'), `${OUT}/${qual}-v068-salvo.xlsx`);
    await p.context().close();
  });
  await tentar('imprimir v066 ' + qual, async () => {
    const p = await abrir(raiz, V066);
    await p.keyboard.press('Control+p'); await p.waitForSelector('[data-imprimir-janela]'); await espera(p, 900);
    await shot(p, `${qual}-imprimir-v066`);
    await p.context().close();
  });
  await tentar('painel escuro ' + qual, async () => {
    const ctx = await b.newContext({ ...PC, colorScheme: 'dark' });
    const p = await ctx.newPage();
    await p.goto(raiz + '#/'); await espera(p, 600);
    await p.evaluate(() => { try { const v = JSON.parse(localStorage.getItem('efcdocs:prefs') || '{}'); localStorage.setItem('efcdocs:prefs', JSON.stringify({ ...v, tema: 'dark' })); } catch { /* */ } });
    await p.reload(); await espera(p, 800);
    await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', FORMAS);
    await p.waitForSelector('[data-excel-abrir]'); await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await espera(p, 800);
    await p.addStyleTag({ content: '.toasts{visibility:hidden!important}' });
    await aba(p, 'Inserir'); await cmd(p, 'inserir.painel'); await p.waitForSelector('[data-pn-branco]'); await espera(p, 300);
    await p.click('[data-pn-add="texto"]'); await p.waitForSelector('[data-pn-texto]');
    await p.fill('[data-pn-texto]', 'Título solto, sem fundo (inventado)'); await p.click('[data-pn-ok]'); await espera(p, 300);
    await cmd(p, 'painel.numero'); await p.waitForSelector('[data-pn-janela="numero"]');
    await p.fill('[data-pn-rotulo]', 'Não conformidades'); await p.fill('[data-pn-conta]', '=SOMA(Dados!B2:B7)'); await p.click('[data-pn-ok]'); await espera(p, 400);
    await p.locator('.pn-area').click({ position: { x: 900, y: 400 } }).catch(() => {}); await espera(p, 200);
    await shot(p, `${qual}-painel-escuro`, { x: 212, y: 196, width: 1154, height: 300 });
    await ctx.close();
  });
}
/* só depois */
await tentar('furo no tipo', async () => {
  const p = await abrir(DEPOIS, V066);
  await p.locator('.pl-obj-gr').first().dblclick(); await p.waitForSelector('[data-grafico-janela]'); await espera(p, 500);
  await p.locator('[data-ge-furo]').scrollIntoViewIfNeeded(); await espera(p, 200);
  await shot(p, 'depois-furo');
  await p.context().close();
});
await tentar('celular painel', async () => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto(DEPOIS + '#/planilha'); await p.waitForSelector('[data-novo=planilha]'); await p.click('[data-novo=planilha]');
  await p.waitForSelector('.pl-cv'); await espera(p, 400);
  await p.addStyleTag({ content: '.toasts{visibility:hidden!important}' });
  await p.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })));
  await p.keyboard.type('Painel'); await espera(p, 250); await p.keyboard.press('Enter');
  await p.waitForSelector('[data-pn-branco]');
  await p.click('[data-pn-add="texto"]'); await p.waitForSelector('[data-pn-texto]');
  await p.fill('[data-pn-texto]', 'Semana 44: um texto comprido que quebra em várias linhas no celular (inventado)'); await p.click('[data-pn-ok]'); await espera(p, 300);
  await p.click('[data-pn-add-cel] [data-pn-add="numero"]'); await p.waitForSelector('[data-pn-janela="numero"]');
  await p.fill('[data-pn-rotulo]', 'Ações abertas'); await p.fill('[data-pn-conta]', '=3+2'); await p.fill('[data-pn-meta]', '8');
  await p.click('[data-ge-op="pn-sentido:menor"]'); await p.click('[data-pn-ok]'); await espera(p, 400);
  await shot(p, 'depois-celular-painel');
  await ctx.close();
});
await tentar('meta deitada', async () => {
  const p = await abrir(DEPOIS, QUAL);
  await celula(p, 'B1:C10');
  await aba(p, 'Inserir'); await cmd(p, 'inserir.grafico'); await p.waitForSelector('[data-grafico-janela]'); await espera(p, 300);
  await p.locator('[data-gr-tipo="barras"]').first().click(); await espera(p, 300);
  await p.locator('[data-ge="meta"]').fill('0,6'); await espera(p, 400);
  await p.locator('[data-gr-previa]').scrollIntoViewIfNeeded(); await espera(p, 300);
  const box = await p.locator('[data-gr-previa] [data-meta-arrastar]').boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 6 }); await p.mouse.up(); await espera(p, 400);
  console.log('meta deitada', await p.locator('[data-ge="meta"]').inputValue());
  await shot(p, 'depois-meta-deitada');
  await p.context().close();
});
await b.close();
console.log('prints prontos');
