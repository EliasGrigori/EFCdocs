/* EFCdocs — prints de antes (v0.3.0 em /v030/) e depois (v0.3.1) para a página de aprovação. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 } };
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
async function pagina(op) { const ctx = await b.newContext({ ...op, acceptDownloads: true }); return [ctx, await ctx.newPage()]; }
const espera = (p, ms = 900) => p.waitForTimeout(ms);
async function escrever(p, t) { const ta = p.locator('textarea.qd-edita'); await ta.fill(t); await ta.press('Control+Enter'); await espera(p, 150); }
const novoQuadro = async (p, url) => { await p.goto(url); await espera(p, 900); await p.click('[data-novo=postits]'); await espera(p, 600); };

/* ---------- ANTES (v0.3.0) ---------- */
let [ctx, p] = await pagina(PC);
await novoQuadro(p, BASE + 'v030/');
await p.locator('.qd-vazio .chipb:has-text("Fluxograma")').click();
await escrever(p, 'NC identificada');
await p.locator('[data-ponto=b]').click(); await escrever(p, 'Registrar a RNC');
await p.locator('[data-ponto=b]').click(); await escrever(p, 'Análise de causa');
await p.keyboard.press('Escape');
await p.locator('.qd-zoom [aria-label="Ajustar à tela"]').click(); await espera(p, 300);
await p.screenshot({ path: `${OUT}/antes-fluxo.png` });
await p.click('.tab:has-text("Inserir")'); await espera(p, 200);
await p.screenshot({ path: `${OUT}/antes-inserir.png` });
await ctx.close();
[ctx, p] = await pagina(CEL);
await p.goto(BASE + 'v030/#/postits'); await espera(p, 1000);
await p.locator('[data-novo=postits]').tap(); await espera(p, 400);
await p.locator('.qd-vazio .chipb:has-text("Post-it")').tap(); await escrever(p, 'Verificar cloro da caixa 2');
await espera(p, 300);
await p.screenshot({ path: `${OUT}/antes-celular-selecao.png` });
await ctx.close();

/* ---------- DEPOIS (v0.3.1) ---------- */
[ctx, p] = await pagina(PC);
await novoQuadro(p, BASE);
await p.screenshot({ path: `${OUT}/depois-quadro-novo.png` });
await p.locator('.qd-vazio .chipb:has-text("Modelos")').click(); await espera(p, 300);
await p.screenshot({ path: `${OUT}/depois-modelos.png` });
await p.locator('[data-modelo="rnc"]').click(); await p.waitForSelector('.qi-decisao'); await espera(p, 300);
await p.keyboard.press('Escape'); await espera(p, 100);
await p.locator('.qd-zoom [aria-label="Ajustar à tela"]').click(); await espera(p, 300);
await p.screenshot({ path: `${OUT}/depois-rnc.png` });

/* página em volta dos três primeiros passos + legenda ao lado */
await p.click('.tab:has-text("Inserir")');
await p.locator('[data-cmd="inserir.pagina"]').first().click(); await p.keyboard.press('Escape'); await espera(p, 200);
const cab = await p.locator('.qi-pg-h').first().boundingBox();
const q1 = await p.locator('.qi[data-cod="Q-001"]').boundingBox();
const z = await p.evaluate(() => 1);
await p.mouse.move(cab.x + 40, cab.y + 12); await p.mouse.down();
await p.mouse.move(q1.x - 40 + 40, q1.y - 50 + 12, { steps: 12 }); await p.mouse.up(); await espera(p, 200);
await p.locator('[data-cmd="inserir.legenda"]').first().click(); await p.keyboard.press('Escape'); await espera(p, 200);
await p.locator('.qd-zoom [aria-label="Ajustar à tela"]').click(); await espera(p, 300);
await p.keyboard.press('Escape');
await p.screenshot({ path: `${OUT}/depois-paginas-legenda.png` });
await p.click('.tab:has-text("Arquivo")');
const [dl] = await Promise.all([p.waitForEvent('download'), p.locator('[data-cmd="arquivo.exportarPDF"]').first().click()]);
await dl.saveAs(`${OUT}/depois-exemplo.pdf`);
await ctx.close();

/* tarefa, GUT, Kanban e Assistente */
[ctx, p] = await pagina(PC);
await novoQuadro(p, BASE);
await p.locator('.qd-ferr [data-ferr="inserir.postit"]').click(); await escrever(p, 'Trocar o reagente DPD vencido');
await p.locator('.qd-barra [data-acao=detalhes]').click(); await p.waitForSelector('.qd-tarefa-p');
let t = p.locator('.qd-tarefa-p');
await t.locator('input').first().fill('Ana'); await t.locator('input[type=date]').fill('2026-10-20'); await t.locator('input[type=date]').blur();
await t.locator('select').nth(0).selectOption('5'); await t.locator('select').nth(1).selectOption('4'); await t.locator('select').nth(2).selectOption('4'); await espera(p, 200);
await p.keyboard.press('Escape');
await p.locator('.qd-ferr [data-ferr="inserir.postit"]').click(); await escrever(p, 'Treinar a equipe nova na coleta');
t = p.locator('.qd-tarefa-p');
await t.locator('input').first().fill('Bruno'); await t.locator('input[type=date]').fill('2026-11-30'); await t.locator('input[type=date]').blur();
await t.locator('select').nth(0).selectOption('3'); await t.locator('select').nth(1).selectOption('3'); await t.locator('select').nth(2).selectOption('2'); await espera(p, 200);
await p.keyboard.press('Escape');
await p.locator('.qd-ferr [data-ferr="inserir.postit"]').click(); await escrever(p, 'Calibrar o fotômetro');
await p.locator('.qd-zoom [aria-label="Ajustar à tela"]').click(); await espera(p, 300);
await p.locator('.qi[data-cod="Q-001"]').click(); await espera(p, 300);
await p.locator('.qd-lamp').click(); await espera(p, 300);
await p.screenshot({ path: `${OUT}/depois-tarefa-assistente.png` });
await p.keyboard.press('Escape');
await p.locator('.qd-vistas button:has-text("Kanban")').click(); await espera(p, 400);
await p.locator('.qd-gut').click(); await espera(p, 400);
await p.screenshot({ path: `${OUT}/depois-kanban-gut.png` });
await ctx.close();

/* celular */
[ctx, p] = await pagina(CEL);
await p.goto(BASE + '#/postits'); await espera(p, 1000);
await p.locator('[data-novo=postits]').tap(); await espera(p, 400);
await p.locator('.qd-vazio .chipb:has-text("Post-it")').tap(); await escrever(p, 'Verificar cloro da caixa 2');
await espera(p, 300);
await p.screenshot({ path: `${OUT}/depois-celular-selecao.png` });
await p.locator('.qd-lamp').tap(); await espera(p, 300);
await p.screenshot({ path: `${OUT}/depois-celular-assistente.png` });
await ctx.close();
await b.close();
console.log('prints prontos');
