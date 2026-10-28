/* EFCdocs — prints de antes (v0.5.1 em /v051/) e depois (v0.6.0) para a página de aprovação.
   Só a amostra inventada (testes/amostras/amostra-qualidade.xlsx): nenhum dado real nos prints.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2], OUT = process.argv[3];
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-qualidade.xlsx', import.meta.url));
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 }, acceptDownloads: true };
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, acceptDownloads: true };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const shot = (p, nome, clip) => p.screenshot({ path: `${OUT}/${nome}.png`, ...(clip ? { clip } : {}) });
const ir = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(p, 120); };
async function abrir(raiz, opc = PC, tocar = false) {
  const ctx = await b.newContext(opc);
  const p = await ctx.newPage();
  await p.goto(raiz + '#/'); await espera(p, 700);
  if (tocar) await p.locator('[data-abrir-excel]').tap(); else await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', AMOSTRA);
  await p.waitForSelector('[data-excel-abrir]'); await espera(p, 300);
  return p;
}
const semAvisos = (p) => p.addStyleTag({ content: '.toasts{visibility:hidden!important}' });
const abrirPlanilha = async (p, tocar = false) => { if (tocar) await p.locator('[data-excel-abrir]').tap(); else await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await espera(p, 600); await semAvisos(p); };
const ABAS = { x: 212, y: 722, width: 520, height: 48 };

/* ---------- antes: v0.5.1 ---------- */
let p = await abrir(BASE + 'v051/');
await abrirPlanilha(p);
await shot(p, 'antes-aba', ABAS);
await ir(p, 'B3');
await p.locator('[data-cmd="formatar.condicional"]').first().click(); await p.waitForSelector('[data-condicional]'); await espera(p, 200);
await p.click('[data-cond-nova]'); await espera(p, 200);
await shot(p, 'antes-condicional');
await p.keyboard.press('Escape'); await espera(p, 200);
await ir(p, 'H5');
await p.locator('[data-cmd="formatar.preenchimento"]').first().click(); await espera(p, 300);
await shot(p, 'antes-cor');
await p.keyboard.press('Escape'); await espera(p, 200);
await p.click('.tabs .tab:has-text("Arquivo")');
await p.locator('[data-cmd="arquivo.exportarPDF"]').first().click(); await espera(p, 300);
await shot(p, 'antes-pdf');
await p.context().close();

/* ---------- depois: v0.6.0 ---------- */
p = await abrir(BASE);
await shot(p, 'depois-relatorio');
await abrirPlanilha(p);
await shot(p, 'depois-aba', ABAS);
await ir(p, 'B3');
await p.locator('[data-cmd="formatar.condicional"]').first().click(); await p.waitForSelector('[data-condicional]'); await espera(p, 200);
await p.click('[data-cond-nova]');
await p.selectOption('[data-cond-tipo]', 'containsText'); await p.fill('[data-cond-tx]', 'Rede'); await p.fill('[data-cond-fx]', 'B2:B41');
await p.click('[data-realce="Amarelo"]'); await espera(p, 250);
await shot(p, 'depois-condicional');
await p.keyboard.press('Escape'); await espera(p, 200);
await ir(p, 'H5');
await p.locator('[data-cmd="formatar.preenchimento"]').first().click(); await p.waitForSelector('.pl-jcor'); await espera(p, 200);
await p.click('.pl-jcor .cr-am[data-cor="#fff2cc"]'); await espera(p, 150);
await p.locator('.pl-jcor .cr-am-c').nth(3).hover(); await espera(p, 150);
await shot(p, 'depois-cor');
await p.click('.pl-jcor [data-cr-aba=doc]'); await espera(p, 150);
await shot(p, 'depois-cor-doc', { x: 483, y: 80, width: 400, height: 560 });
await p.click('.pl-jcor [data-cr-pegar]'); await p.waitForSelector('[data-pega-cor]'); await espera(p, 200);
await shot(p, 'depois-contagotas');
await p.keyboard.press('Escape'); await espera(p, 200); await p.keyboard.press('Escape'); await espera(p, 200);
/* gráficos */
await ir(p, 'A1:C20');
await p.click('.tabs .tab:has-text("Inserir")');
await p.locator('[data-cmd="inserir.grafico"]').first().click(); await p.waitForSelector('[data-grafico-janela]'); await espera(p, 300);
await shot(p, 'depois-grafico-janela');
await p.click('[data-gr-tipo=controle]'); await p.fill('[data-gr-titulo]', 'Cloro residual (mg/L)'); await p.fill('[data-gr-meta]', '0,5'); await espera(p, 200);
await shot(p, 'depois-grafico-controle');
await p.click('[data-gr-aplicar]'); await p.waitForSelector('.pl-obj-gr'); await espera(p, 300);
await semAvisos(p); await ir(p, 'A1');
await shot(p, 'depois-grafico-grade');
/* pareto na aba Resumo? usa B (pontos) e C (cloro): ponto x cloro */
await ir(p, 'B1:C6');
await p.locator('[data-cmd="inserir.grafico"]').first().click(); await p.waitForSelector('[data-grafico-janela]');
await p.click('[data-gr-tipo=pareto]'); await p.fill('[data-gr-titulo]', 'Cloro por ponto (Pareto)'); await espera(p, 200);
await shot(p, 'depois-grafico-pareto', { x: 0, y: 0, width: 1366, height: 800 });
await p.keyboard.press('Escape'); await espera(p, 200);
/* imprimir */
await ir(p, 'A1');
await p.keyboard.press('Control+p'); await p.waitForSelector('[data-imprimir-janela]'); await espera(p, 300);
await p.click('[data-imp-orient=paisagem]'); await p.fill('[data-imp-titlin]', '1:1'); await p.selectOption('[data-imp-escala]', 'colunas'); await espera(p, 300);
await shot(p, 'depois-imprimir');
await p.click('[aria-label="Próxima página"]'); await espera(p, 200);
await shot(p, 'depois-imprimir-p2', { x: 676, y: 140, width: 580, height: 420 });
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[data-imp-pdf]')]);
await dl.saveAs(`${OUT}/saida.pdf`);
await p.click('[data-imp-salvar]'); await espera(p, 200);
await p.click('.tabs .tab:has-text("Layout da Página")'); await espera(p, 200);
await shot(p, 'depois-faixa-layout', { x: 212, y: 40, width: 1154, height: 140 });
await p.click('.tabs .tab:has-text("Arquivo")'); await espera(p, 200);
await shot(p, 'depois-faixa-arquivo', { x: 212, y: 40, width: 1154, height: 140 });
await p.context().close();
/* celular */
p = await abrir(BASE, CEL, true);
await abrirPlanilha(p, true);
await p.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, bubbles: true })));
await p.waitForSelector('[data-imprimir-janela]'); await espera(p, 300);
await shot(p, 'depois-cel-imprimir');
await p.keyboard.press('Escape'); await espera(p, 200);
await shot(p, 'depois-cel-planilha');
await b.close();
writeFileSync(`${OUT}/ok.txt`, 'ok');
console.log('prints prontos');
