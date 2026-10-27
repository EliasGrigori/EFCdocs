/* EFCdocs — prints de antes (v0.5.0 em /v050/) e depois (v0.5.1) para a página de aprovação.
   Só a amostra inventada (testes/amostras/amostra-qualidade.xlsx): nenhum dado real nos prints.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2], OUT = process.argv[3];
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-qualidade.xlsx', import.meta.url));
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 }, acceptDownloads: true };
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
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
const abrirPlanilha = async (p, tocar = false) => { if (tocar) await p.locator('[data-excel-abrir]').tap(); else await p.click('[data-excel-abrir]'); await p.waitForSelector('.pl-cv'); await espera(p, 600); };
const ABAS = { x: 212, y: 722, width: 520, height: 48 };

/* ---------- antes: v0.5.0 ---------- */
let p = await abrir(BASE + 'v050/');
await shot(p, 'antes-relatorio');
await abrirPlanilha(p);
await shot(p, 'antes-aba', ABAS);
await ir(p, 'C3'); await p.keyboard.type('3'); await p.keyboard.press('Enter'); await espera(p, 250);
await ir(p, 'B3');
await shot(p, 'antes-planilha');
await p.locator('.pl-aba:has-text("Resumo")').click(); await espera(p, 300);
await p.locator('.qd-lamp').click(); await espera(p, 300);
await shot(p, 'antes-verificacao');
await p.context().close();
p = await abrir(BASE + 'v050/', CEL, true);
await abrirPlanilha(p, true);
await shot(p, 'antes-cel-barra');
await p.context().close();

/* ---------- depois: v0.5.1 ---------- */
p = await abrir(BASE);
await shot(p, 'depois-relatorio');
await p.locator('.janela-excel .janela-c').evaluate((e) => { e.scrollTop = 99999; }); await espera(p, 150);
await shot(p, 'depois-relatorio-fim');
await abrirPlanilha(p);
await shot(p, 'depois-aba', ABAS);
await ir(p, 'B3');
await p.locator('[data-lista-seta]').click(); await espera(p, 250);
await shot(p, 'depois-lista');
await p.keyboard.press('Escape'); await espera(p, 250);
await ir(p, 'C3'); await p.keyboard.type('3'); await p.keyboard.press('Enter'); await espera(p, 250);
await ir(p, 'B3');
await shot(p, 'depois-planilha');
/* balão do comentário */
const r = await p.evaluate(() => { const c = document.querySelector('.pl-cv').getBoundingClientRect(); return [c.left, c.top]; });
await p.mouse.move(r[0] + 190, r[1] + 77, { steps: 4 }); await espera(p, 300);
await shot(p, 'depois-balao', { x: 212, y: 212, width: 560, height: 200 });
await p.mouse.move(r[0] + 700, r[1] + 400); await espera(p, 150);
/* comentário novo */
await ir(p, 'B5'); await p.keyboard.press('Shift+F2'); await p.waitForSelector('[data-comentario]');
await p.fill('[data-com-texto]', 'Conferir este ponto com o laboratório.'); await espera(p, 150);
await shot(p, 'depois-comentario');
await p.click('[data-com-salvar]'); await espera(p, 200);
/* formatação condicional */
await p.click('.tabs .tab:has-text("Página Inicial")').catch(() => {});
await p.locator('[data-cmd="formatar.condicional"]').first().click(); await p.waitForSelector('[data-condicional]'); await espera(p, 200);
await shot(p, 'depois-condicional-lista');
await p.click('[data-cond-nova]');
await p.selectOption('[data-cond-tipo]', 'containsText'); await p.fill('[data-cond-tx]', 'Rede'); await p.fill('[data-cond-fx]', 'B2:B41');
await p.click('[data-realce="Amarelo"]'); await espera(p, 200);
await shot(p, 'depois-condicional-nova');
await p.click('[data-cond-ok]'); await p.click('[data-cond-aplicar]'); await espera(p, 400);
await shot(p, 'depois-condicional-grade');
/* validação */
await ir(p, 'D2:D10');
await p.click('.tabs .tab:has-text("Dados")');
await p.locator('[data-cmd="dados.validacao"]').first().click(); await p.waitForSelector('[data-validacao]');
await p.selectOption('[data-val-tipo]', 'whole'); await p.fill('[data-val-f1]', '1'); await p.fill('[data-val-f2]', '10'); await espera(p, 200);
await shot(p, 'depois-validacao');
await p.click('.rg-aba:has-text("Aviso ao selecionar")');
await p.locator('.rg-form input[type=checkbox]').first().check();
await p.locator('.rg-form input').nth(1).fill('Nota'); await p.locator('.rg-form textarea').fill('Digite um número inteiro de 1 a 10.');
await p.click('[data-val-aplicar]'); await espera(p, 250);
await ir(p, 'D3');
await shot(p, 'depois-aviso-celula', { x: 212, y: 212, width: 700, height: 220 });
await p.keyboard.type('50'); await p.keyboard.press('Enter'); await p.waitForSelector('[data-valerro]'); await espera(p, 200);
await shot(p, 'depois-valerro');
await p.click('[data-valerro-cancelar]'); await espera(p, 200);
/* verificação */
await p.locator('.pl-aba:has-text("Resumo")').click(); await espera(p, 300);
await p.locator('.qd-lamp').click(); await espera(p, 300);
await shot(p, 'depois-verificacao');
await p.context().close();
p = await abrir(BASE, CEL, true);
await abrirPlanilha(p, true);
await shot(p, 'depois-cel-barra');
await b.close();
console.log('prints prontos');
