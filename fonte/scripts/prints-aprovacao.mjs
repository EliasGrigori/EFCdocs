/* EFCdocs — prints de antes (v0.6.1, servida em outro endereço) e depois (v0.6.2) para a página de aprovação.
   Só amostras inventadas (testes/amostras/): nenhum dado real nos prints.
   Uso: node scripts/prints-aprovacao.mjs <endereço-depois> <endereço-antes> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const DEPOIS = process.argv[2], ANTES = process.argv[3], OUT = process.argv[4];
const am = (n) => fileURLToPath(new URL(`../testes/amostras/${n}`, import.meta.url));
const QUALIDADE = am('amostra-qualidade.xlsx'), IMPRESSAO = am('amostra-impressao.xlsx');
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
const tentar = async (nome, f) => { try { await f(); } catch (e) { console.log('FALHOU', nome, String(e.message).split('\n')[0]); } };
const aba = (p, nome) => p.click(`.tabs .tab:has-text("${nome}")`).then(() => espera(p, 250));
const FAIXA = { x: 212, y: 50, width: 1154, height: 150 };
const winShot = async (p, nome) => { const j = p.locator('.janela').last(); await j.screenshot({ path: `${OUT}/${nome}.png` }); };
const ctrlK = async (p, termo) => { await p.keyboard.press('Control+k'); await espera(p, 150); await p.keyboard.type(termo); await espera(p, 250); await p.keyboard.press('Enter'); await espera(p, 500); };

/* faixa: antes (v0.6.1) e depois (B, C, D, E) */
await tentar('faixa', async () => {
  let p = await abrir(ANTES, QUALIDADE);
  for (const t of ['Página Inicial', 'Inserir', 'Dados']) { await aba(p, t); await shot(p, `antes-faixa-${(t === "Página Inicial" ? "inicio" : t.toLowerCase())}`, FAIXA); }
  await p.context().close();
  p = await abrir(DEPOIS, QUALIDADE);
  for (const e of ['B', 'C', 'D', 'E']) {
    await p.click('[data-opcoes-faixa]'); await p.click(`[data-faixa-estilo=${e}]`); await espera(p, 300); await p.keyboard.press('Escape');
    for (const t of ['Página Inicial', 'Inserir', 'Dados']) { await aba(p, t); await shot(p, `depois-faixa-${e}-${(t === "Página Inicial" ? "inicio" : t.toLowerCase())}`, FAIXA); }
  }
  await p.click('[data-opcoes-faixa]'); await p.click('[data-faixa-estilo=B]'); await espera(p, 300);
  await p.click('[data-opcoes-faixa]'); await espera(p, 300);
  await shot(p, 'depois-faixa-menu', { x: 700, y: 0, width: 666, height: 420 });
  await p.keyboard.press('Escape');
  await p.context().close();
});

/* Localizar, leitura de cor, janelas */
for (const [qual, raiz] of [['antes', ANTES], ['depois', DEPOIS]]) {
  await tentar('janelas ' + qual, async () => {
    const p = await abrir(raiz, QUALIDADE);
    await ctrlK(p, 'Localizar e substituir'); await winShot(p, `${qual}-localizar`); await p.keyboard.press('Escape'); await espera(p, 150);
    /* leitura: letra escura sobre fundo escuro (A1 tem fundo azul-petróleo) */
    await ir(p, 'A1');
    await ctrlK(p, 'Cor da fonte');
    await p.evaluate(() => {
      const lum = (c) => { const m = c.match(/\d+/g).map(Number); return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
      const bs = [...document.querySelectorAll('[data-cores] .cr-amostras button, [data-cores] .cr-am-c button')];
      const esc = bs.find((x) => lum(getComputedStyle(x).backgroundColor) < 0.12) || bs[0];
      if (esc) esc.click();
    });
    await espera(p, 250); await winShot(p, `${qual}-leitura`);
    await p.keyboard.press('Escape'); await espera(p, 150);
    await p.context().close();
  });
}
/* janelas num notebook pequeno (1366×600) */
for (const [qual, raiz] of [['antes', ANTES], ['depois', DEPOIS]]) {
  await tentar('janela pequena ' + qual, async () => {
    const p = await abrir(raiz, QUALIDADE, { viewport: { width: 1366, height: 600 } });
    await ctrlK(p, 'Validação de dados');
    await shot(p, `${qual}-janela-pequena`);
    await p.context().close();
  });
}

/* Imprimir e PDF: PDF baixado (para ver datas, texto longo, Alt+Enter e mesclada) e margens */
for (const [qual, raiz] of [['antes', ANTES], ['depois', DEPOIS]]) {
  await tentar('imprimir ' + qual, async () => {
    const p = await abrir(raiz, IMPRESSAO);
    await p.keyboard.press('Control+p'); await p.waitForSelector('[data-imprimir-janela]'); await espera(p, 400);
    await shot(p, `${qual}-imprimir`);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-imp-pdf]')]);
    await dl.saveAs(`${OUT}/pdf-${qual}.pdf`);
    /* escala pequena */
    await p.selectOption('[data-imp-escala]', 'pct'); await p.fill('[data-imp-pct]', '25'); await espera(p, 400);
    await p.locator('[data-imp-sec=ajustar]').scrollIntoViewIfNeeded();
    await shot(p, `${qual}-escala`);
    await p.context().close();
  });
}
/* celular */
for (const [qual, raiz] of [['antes', ANTES], ['depois', DEPOIS]]) {
  await tentar('celular ' + qual, async () => {
    const p = await abrir(raiz, QUALIDADE, CEL);
    await p.locator('.tbar-fixo [aria-label^="Abas da faixa"], .tbar-fixo button[title^="Abas da faixa"]').first().tap().catch(() => {});
    await espera(p, 500);
    await shot(p, `${qual}-cel-faixa`);
    await p.context().close();
  });
}
await b.close();
writeFileSync(`${OUT}/ok.txt`, 'ok');
console.log('prints prontos');
