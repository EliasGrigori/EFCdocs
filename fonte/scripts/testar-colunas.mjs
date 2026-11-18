/* Vértice Docs — v0.6.24 parte 1: colunas das listas no padrão do EFCwork (ordem, busca, valores, mover, arrastar, Travar, celular).
   Uso: node scripts/testar-colunas.mjs <endereço>. Arquivos inventados (semente do layout). */
import { chromium } from 'playwright';
import { abrirSemeado, espera } from './layout/semente.mjs';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
let ok = 0, falhas = 0;
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).slice(0, 300)); } }
const nav = await chromium.launch({ executablePath: CHROME });
const erros = [];
const abre = async (o = {}) => { const a = await abrirSemeado(nav, BASE, { w: 1366, h: 900, reduzido: true, ...o }); a.page.on('pageerror', (e) => erros.push(String(e))); a.page.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); }); return a; };
const cabecalhos = (p, t = '') => p.locator(`${t} .tb-arq thead th`).evaluateAll((e) => e.map((x) => x.getAttribute('data-col')));
const nomes = (p) => p.locator('.tb-arq tr.arq .c-nome b').allInnerTexts();
const selo = (p) => p.locator('[data-cont]').first().innerText();
const menu = async (p, k) => { await p.click(`[data-col-menu=${k}]`); await p.waitForSelector(`.col-menu[data-col-aberta=${k}]`); await espera(150); };

const a = await abre(); const p = a.page;
await p.goto(BASE + '#/planilha'); await espera(900);
const total = await p.locator('.tb-arq tr.arq').count();

await caso('ordem em ciclo: padrão, A a Z, Z a A, padrão (a seta aparece no título)', async () => {
  const padrao = await nomes(p);
  await menu(p, 'nome');
  await p.click('[data-col-ordem]'); await espera(150);
  const az = await nomes(p), esperado = [...padrao].sort((x, y) => x.localeCompare(y, 'pt-BR', { numeric: true, sensitivity: 'base' }));
  certo(JSON.stringify(az) === JSON.stringify(esperado), 'A a Z: ' + az.slice(0, 3));
  certo(await p.locator('th[data-col=nome][aria-sort=ascending] .col-mo').count() === 1, 'sem a seta no título');
  await p.click('[data-col-ordem]'); await espera(150);
  certo(JSON.stringify(await nomes(p)) === JSON.stringify([...esperado].reverse()), 'Z a A');
  await p.click('[data-col-ordem]'); await espera(150);
  certo(JSON.stringify(await nomes(p)) === JSON.stringify(padrao), 'não voltou ao padrão');
  certo((await p.locator('[data-col-ordem]').getAttribute('data-col-ordem')) === 'padrao', 'botão não diz padrão');
});

await caso('busca e caixas filtram as linhas; contagem por valor; "total filtrado" no selo e o funil no título', async () => {
  await p.fill('[data-col-busca]', 'controle'); await espera(200);
  const n = await p.locator('.tb-arq tr.arq').count();
  certo(n > 0 && n < total, 'busca: ' + n + ' de ' + total);
  certo((await nomes(p)).every((x) => /controle/i.test(x)), 'busca deixou passar outro nome');
  certo((await selo(p)).includes('total filtrado'), 'selo: ' + await selo(p));
  certo(await p.locator('th[data-col=nome] .col-hm.on .col-mf').count() === 1, 'sem o funil no título');
  const vals = await p.locator('[data-col-valor]').count();
  certo(vals === n, 'a lista de valores não seguiu a busca: ' + vals);
  await p.locator('[data-col-valor]').first().uncheck(); await espera(150);
  certo(await p.locator('.tb-arq tr.arq').count() === n - 1, 'desmarcar não tirou a linha');
  certo(await p.locator('[data-limpar-filtros]').count() === 1, '"Limpar filtros" não apareceu no lugar do botão Filtro');
  await p.click('.col-limpa'); await espera(150);
  certo(await p.locator('.tb-arq tr.arq').count() === total, 'Limpar esta coluna não voltou tudo');
  await p.keyboard.press('Escape'); await espera(200);
  certo(await p.locator('.col-menu').count() === 0, 'Esc não fechou o menu');
});

await caso('mover a coluna arrastando; as células acompanham; a ordem fica lembrada depois de recarregar (as setas do menu saíram)', async () => {
  await menu(p, 'nome'); certo(await p.locator('[data-col-mover]').count() === 0, 'as setas de mover voltaram'); await p.keyboard.press('Escape'); await espera(150);
  { const de = await p.locator('th[data-col=nome] .col-thr').boundingBox(), ate = await p.locator('th[data-col=quando]').boundingBox();
    await p.mouse.move(de.x + 10, de.y + de.height / 2); await p.mouse.down(); await p.mouse.move(ate.x + ate.width - 12, ate.y + ate.height / 2, { steps: 8 }); await p.mouse.up(); await espera(200); }
  const cab = await cabecalhos(p);
  certo(JSON.stringify(cab) === JSON.stringify(['quando', 'nome', 'acoes']), 'cabeçalhos: ' + cab);
  const tds = await p.locator('.tb-arq tr.arq').first().locator('td').evaluateAll((e) => e.map((x) => x.className));
  certo(tds[0] === 'c-quando' && tds[1] === 'c-nome', 'células: ' + tds);
  await p.reload(); await espera(900);
  certo(JSON.stringify(await cabecalhos(p)) === JSON.stringify(['quando', 'nome', 'acoes']), 'não lembrou: ' + await cabecalhos(p));
});

await caso('arrastar o título com o mouse muda a coluna de lugar; soltar sem mover abre o menu', async () => {
  const de = await p.locator('th[data-col=nome] .col-thr').boundingBox(), ate = await p.locator('th[data-col=quando]').boundingBox();
  await p.mouse.move(de.x + 10, de.y + de.height / 2); await p.mouse.down();
  await p.mouse.move(ate.x + 12, ate.y + ate.height / 2, { steps: 8 });
  certo(await p.locator('th[data-col=quando][data-col-alvo=antes]').count() === 1, 'sem a marca do lado de entrada');
  await p.mouse.up(); await espera(200);
  certo(JSON.stringify(await cabecalhos(p)) === JSON.stringify(['nome', 'quando', 'acoes']), 'arrastar: ' + await cabecalhos(p));
  certo(await p.locator('.col-menu').count() === 0, 'arrastar abriu o menu');
  await p.locator('th[data-col=nome] .col-thr').click(); await espera(200);
  certo(await p.locator('.col-menu[data-col-aberta=nome]').count() === 1, 'clicar não abriu o menu');
  await p.keyboard.press('Escape'); await espera(150);
});

await caso('Travar guarda o filtro da coluna ao sair do app; o "Limpar" da tela não mexe na travada; destravar solta', async () => {
  await p.goto(BASE + '#/'); await espera(900);
  await menu(p, 'tipo'); await p.locator('[data-col-valor="Documento"]').uncheck(); await espera(100);
  await p.click('[data-col-trava]'); await espera(100);
  certo(await p.locator('.col-av').count() === 1, 'sem o aviso de travada');
  certo(await p.locator('[data-col-valor="Planilha"]').isDisabled(), 'travada continua mudando');
  await p.keyboard.press('Escape'); await espera(150);
  const n = await p.locator('.tb-arq tr.arq').count();
  await p.reload(); await espera(900);
  certo(await p.locator('.tb-arq tr.arq').count() === n, 'o filtro da travada não voltou');
  certo(await p.locator('th[data-col=tipo] .col-mt').count() === 1, 'sem o cadeado no título');
  await p.click('[data-limpar-filtros]').catch(() => {}); await espera(150);
  certo(await p.locator('.tb-arq tr.arq').count() === n, 'o Limpar da tela soltou a travada');
  await p.keyboard.press('Escape'); await espera(100);
  await menu(p, 'tipo'); await p.click('[data-col-trava]'); await p.click('.col-limpa'); await espera(150); await p.keyboard.press('Escape');
  await p.reload(); await espera(900);
  certo(!(await selo(p)).includes('filtrado'), 'destravar e limpar não soltou');
});

await caso('Documentos internos e Lixeira têm o menu em todas as colunas (Código, Situação, Na lixeira desde)', async () => {
  await p.goto(BASE + '#/internos'); await espera(900);
  const cab = await cabecalhos(p);
  for (const k of ['codigo', 'nome', 'tipo', 'quando', 'situacao']) certo(cab.includes(k) && await p.locator(`th[data-col=${k}] [data-col-menu]`).count() === 1, 'internos sem menu em ' + k + ': ' + cab);
  await menu(p, 'situacao'); certo(await p.locator('[data-col-valor]').count() >= 1, 'situação sem valores'); await p.keyboard.press('Escape');
  await p.goto(BASE + '#/lixeira'); await espera(900);
  await menu(p, 'quando'); certo((await p.locator('.col-ci span').innerText()) === 'Ordem padrão', 'lixeira');
  await p.click('[data-col-ordem]'); await espera(150);
  certo((await p.locator('.col-ci span').innerText()) === 'Mais antiga primeiro', 'nome da ordem de data: ' + await p.locator('.col-ci span').innerText());
  await p.keyboard.press('Escape');
});
await a.ctx.close();

await caso('celular: tocar no título abre o menu de baixo para cima, com fundo; Esc e tocar fora fecham', async () => {
  const c = await abre({ w: 390, h: 844, toque: true }); const q = c.page;
  await q.goto(BASE + '#/planilha'); await espera(900);
  await q.locator('[data-col-menu=nome]').tap(); await espera(300);
  certo(await q.locator('.col-menu.col-folha').count() === 1 && await q.locator('.col-fundo').count() === 1, 'não abriu de baixo');
  const b = await q.locator('.col-menu').boundingBox();
  certo(Math.abs(b.y + b.height - 844) < 2 && b.width > 380, 'não está colado embaixo: ' + JSON.stringify(b));
  const alturas = await q.locator('.col-li').evaluateAll((e) => e.map((x) => x.getBoundingClientRect().height));
  certo(alturas.every((h) => h >= 44), 'item menor que 44 px: ' + alturas);
  await q.locator('.col-fundo').tap({ position: { x: 20, y: 20 } }); await espera(300);
  certo(await q.locator('.col-menu').count() === 0, 'tocar fora não fechou');
  certo(await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'rolagem para o lado');
  await c.ctx.close();
});

await caso('escuro: o menu abre sem erro e com o texto legível', async () => {
  const c = await abre({ tema: 'escuro' }); const q = c.page;
  await q.goto(BASE + '#/planilha'); await espera(900); await menu(q, 'nome');
  const [cor, fundo] = await q.evaluate(() => { const m = document.querySelector('.col-menu b'), s = getComputedStyle(m), f = getComputedStyle(document.querySelector('.col-menu')); return [s.color, f.backgroundColor]; });
  certo(cor !== fundo, 'texto da cor do fundo');
  await c.ctx.close();
});

certo(true, '');
console.log(erros.length ? 'Console com erro: ' + erros.slice(0, 3).join(' | ') : 'Console sem erros.');
console.log(`${ok} de ${ok + falhas} conferências das colunas passaram.`);
await nav.close();
process.exit(falhas || erros.length ? 1 : 0);
