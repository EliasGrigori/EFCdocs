/* Vértice Docs v0.6.71 — Q1 do relatório do Quadro (aprovada em 26/11 04:55): cartão irmão (Shift+Enter, botão Irmão na
   faixa e na barra do cartão), atalhos à mostra e Igualar tamanho. Falha na v0.6.70 e passa na v0.6.71.
   Uso: node scripts/testar-quadro-v0671.mjs <endereço> [pasta-dos-prints]. Dados inventados. */
import { chromium } from 'playwright';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const erros = [];
let ok = 0, falhas = 0;
const caso = async (nome, f) => { try { const i = await f(); ok++; console.log(`  ok    ${nome}${i ? ' — ' + i : ''}`); } catch (e) { falhas++; console.log(`  FALHA ${nome} — ${String(e.message || e).split('\n')[0].slice(0, 300)}`); } };
const certo = (c, m) => { if (!c) throw new Error(m); };
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; try { localStorage.setItem('efcdocs:quadro-prefs', JSON.stringify({ v: 2, ferramentas: true })); } catch { /* */ } });
const p = await ctx.newPage(); p.setDefaultTimeout(4000);
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
const ta = () => p.locator('textarea.qd-edita');
const contar = async () => { const t = await p.locator('[data-status=contagem]').innerText(); const m = t.match(/(\d+) post-its? · (\d+) formas? · (\d+) setas?/); return m ? { postits: +m[1], formas: +m[2], setas: +m[3] } : { t }; };
const caixa = (txt) => p.locator('.qi', { hasText: txt }).first().boundingBox();
const escrever = async (t) => { await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(150); };
const escolher = async (txt) => { const b = await caixa(txt); await p.mouse.click(b.x + b.width / 2, b.y + 12); await p.waitForTimeout(150); };

await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
await p.locator('[data-cmd="inserir.postit"]').first().click(); await escrever('Centro');
await escolher('Centro'); await p.keyboard.press('Tab'); await escrever('Ramo 1');

await caso('Shift+Enter no cartão que tem pai cria o irmão embaixo, ligado ao mesmo pai, e já abre para escrever', async () => {
  await escolher('Ramo 1');
  const antes = await contar();
  await p.keyboard.press('Shift+Enter'); await escrever('Ramo 2');
  const depois = await contar();
  certo(depois.postits === antes.postits + 1 && depois.setas === antes.setas + 1, JSON.stringify([antes, depois]));
  const a = await caixa('Ramo 1'), b = await caixa('Ramo 2');
  certo(Math.abs(a.x - b.x) < 3 && b.y > a.y + a.height, 'posição: ' + JSON.stringify([a, b]));
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/irmao.png` });
});
await caso('Shift+Enter no cartão sem pai não cria nada e explica o Tab', async () => {
  await escolher('Centro'); const antes = await contar();
  await p.keyboard.press('Shift+Enter'); await p.waitForTimeout(300);
  certo(JSON.stringify(await contar()) === JSON.stringify(antes), 'criou algo');
  const aviso = (await p.locator('.toast, [role=status]').allInnerTexts()).join(' | ');
  certo(/não tem um cartão de cima/.test(aviso) && /Tab/.test(aviso), aviso.slice(0, 200));
  certo(await ta().count() === 0, 'abriu a edição');
});
await caso('Enter continua abrindo a edição do texto', async () => {
  await p.keyboard.press('Escape'); await escolher('Ramo 2'); await p.keyboard.press('Enter');
  await ta().waitFor(); certo(await ta().inputValue() === 'Ramo 2', 'editou outro'); await ta().press('Escape'); await p.waitForTimeout(150);
});
await caso('botão Irmão na faixa (Inserir) e na barra do cartão; a dica do Post-it mostra os atalhos', async () => {
  await p.click('.tabs .tab:has-text("Inserir")');
  certo(await p.locator('.ribbon [data-cmd="inserir.irmao"]').count() === 1, 'sem o botão na faixa');
  await escolher('Ramo 2'); const antes = await contar();
  await p.locator('.ribbon [data-cmd="inserir.irmao"]').click(); await escrever('Ramo 3');
  certo((await contar()).postits === antes.postits + 1, 'faixa não criou');
  await escolher('Ramo 3');
  certo(await p.locator('[data-barra-sel] [data-acao="irmao"], .barra-sel button[aria-label*="irmão"], .qd-barra button[title*="irmão"], button[title="Cartão irmão (Shift+Enter)"]').count() >= 1, 'sem o botão na barra do cartão');
  await escolher('Centro');
  certo(await p.locator('button[title="Cartão irmão (Shift+Enter)"]').count() === 0, 'o cartão sem pai não devia ter o botão');
  await p.locator('.ribbon [data-cmd="inserir.postit"]').hover(); await p.waitForTimeout(900);
  const dica = (await p.locator('.rb-dica, [role=tooltip]').allInnerTexts()).join(' ');
  certo(/Shift\+Enter/.test(dica) && /Tab/.test(dica), 'dica: ' + dica.slice(0, 200));
});
await caso('Igualar largura e altura deixa os escolhidos do tamanho do maior, sem sair do lugar; Ctrl+Z volta', async () => {
  const med = (t) => p.evaluate((t) => { const e = [...document.querySelectorAll('.qi')].find((x) => x.textContent.includes(t)); return e && { x: parseFloat(e.style.left), y: parseFloat(e.style.top), w: parseFloat(e.style.width), h: parseFloat(e.style.height) }; }, t);
  await p.keyboard.press('Escape'); await p.locator('.qd-ferr [data-ferr="inserir.processo"]').click(); await escrever('Etapa curta'); await p.keyboard.press('Escape');
  const e0 = await med('Etapa curta'), r1 = await med('Ramo 1');
  certo(e0.h < r1.h, 'tamanhos iguais antes: ' + JSON.stringify([e0, r1]));
  await p.keyboard.press('Control+a'); await p.waitForTimeout(150);
  await p.click('.tabs .tab:has-text("Organizar")'); await p.click('[data-menu-faixa=igualarQ]'); await p.locator('.rb-lista [data-cmd="organizar.igualar|wh"]').click(); await p.waitForTimeout(250);
  const e1 = await med('Etapa curta');
  certo(e1.w === r1.w && e1.h === r1.h, 'tamanho: ' + JSON.stringify([e1, r1]));
  certo(e1.x === e0.x && e1.y === e0.y, 'saiu do lugar: ' + JSON.stringify([e0, e1]));
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/igualar.png` });
  await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
  const e2 = await med('Etapa curta'); certo(e2.h === e0.h, 'Ctrl+Z não voltou');
});
await caso('Igualar com só um escolhido explica; o Travar item continua na faixa', async () => {
  await p.keyboard.press('Escape'); await p.locator('[data-cmd="exibir.ajustar"]').first().click().catch(() => {}); await p.waitForTimeout(300); await escolher('Centro'); await p.click('[data-menu-faixa=igualarQ]'); await p.locator('.rb-lista [data-cmd="organizar.igualar|w"]').click(); await p.waitForTimeout(250);
  const aviso = (await p.locator('.toast, [role=status]').allInnerTexts()).join(' | ');
  certo(/dois ou mais/.test(aviso), aviso.slice(0, 160));
  certo(await p.locator('.ribbon [data-cmd="organizar.travar"]').count() === 1, 'Travar sumiu');
});
await caso('sem erro na página', async () => { certo(erros.length === 0, erros.join(' | ')); });
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências da Q1 do Quadro passaram.`);
process.exit(falhas ? 1 : 0);
