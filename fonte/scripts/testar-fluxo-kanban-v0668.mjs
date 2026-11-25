/* Vértice Docs v0.6.68 — R44 parte 1: o fluxo ligado ao Kanban, com quem iniciou e quem concluiu (aprovado em 25/11).
   Falha na v0.6.67 e passa na v0.6.68. Uso: node scripts/testar-fluxo-kanban-v0668.mjs <endereço> [pasta-dos-prints]. Dados inventados. */
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
const card = (t) => p.locator('.kb-card[data-item]', { hasText: t }).first();
const colunas = async () => Promise.all((await p.locator('.kb-col').all()).map((k) => k.boundingBox()));
const daColuna = async (i) => p.locator('.kb-col').nth(i).locator('.kb-card[data-item]').allInnerTexts();
async function arrastar(t, i) {
  const a = await card(t).boundingBox(), cols = await colunas();
  await p.mouse.move(a.x + a.width / 2, a.y + 14); await p.mouse.down();
  await p.mouse.move(cols[i].x + cols[i].width / 2, cols[i].y + 70, { steps: 14 }); await p.waitForTimeout(150);
  await p.mouse.up(); await p.waitForTimeout(450);
}
const kanban = async () => { await p.locator('.qd-vistas button:has-text("Kanban")').click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(300); };
const quadroLivre = async () => { await p.locator('.qd-vistas button:has-text("Quadro")').click(); await p.waitForSelector('.qd-palco, .qd'); await p.waitForTimeout(300); };

/* um quadro com um post-it e três atividades de fluxo */
await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
await p.waitForSelector('.qd-ferr');
for (const t of ['Coletar amostra', 'Analisar no laboratório', 'Registrar resultado']) {
  await p.keyboard.press('Escape'); await p.locator('.qd-ferr [data-ferr="inserir.processo"]').click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(100); await p.keyboard.press('Escape');
}
await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill('Lembrete da equipe'); await ta().press('Control+Enter'); await p.keyboard.press('Escape');
await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(400);

await caso('antes de ligar: o Kanban mostra só o post-it e oferece "Ligar o fluxo" (o quadro tem atividades)', async () => {
  certo(await p.locator('.kb-card[data-item]').count() === 1, 'cartões: ' + await p.locator('.kb-card[data-item]').count());
  const b = p.locator('[data-kb-fluxo]'); certo(await b.count() === 1, 'sem o botão');
  certo((await b.getAttribute('aria-pressed')) === 'false' && (await b.innerText()).includes('Ligar o fluxo'), await b.innerText());
});
await caso('ligar: as três atividades entram em "A fazer", na ordem do fluxo, com o desenho de atividade', async () => {
  await p.locator('[data-kb-fluxo]').click(); await p.waitForTimeout(400);
  const a = await daColuna(0);
  certo(a.length === 4, 'A fazer: ' + a.join(' | '));
  const ordem = ['Coletar', 'Analisar', 'Registrar'].map((t) => a.findIndex((x) => x.includes(t)));
  certo(ordem[0] < ordem[1] && ordem[1] < ordem[2], 'ordem: ' + ordem);
  certo(await p.locator('.kb-card.kb-ativ').count() === 3, 'atividades sem o desenho');
  certo((await p.locator('[data-kb-fluxo]').getAttribute('aria-pressed')) === 'true', 'botão não ficou ligado');
  certo((await p.locator('.kb-and b').innerText()).includes('4 cartões'), await p.locator('.kb-and b').innerText());
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/ligado.png` });
});
await caso('fora de Documentos internos: mover não grava quem iniciou (só nos internos)', async () => {
  await arrastar('Coletar amostra', 1);
  certo((await daColuna(1)).some((x) => x.includes('Coletar')), 'não moveu');
  certo(await card('Coletar amostra').locator('[data-kb-quem]').count() === 0, 'gravou fora dos internos');
  await arrastar('Coletar amostra', 0);
});
await caso('o quadro vai para Documentos internos (Compartilhar com o Cwork)', async () => {
  await p.click('.tabs .tab:has-text("Arquivo")'); await p.locator('[data-cmd="arquivo.compartilharCwork"]').first().click();
  await p.waitForSelector('[data-int-salvar]');
  await p.selectOption('[data-int-subaba]', { index: 0 }); await p.fill('[data-int-codigo]', 'FLX-01'); await p.click('[data-int-salvar]'); await p.waitForTimeout(800);
  if (await p.locator('.kb-col').count() === 0) await kanban();
  certo(await p.locator('.kb-col').count() === 3, 'saiu do Kanban');
});
await caso('mover para "Fazendo" grava quem iniciou (nome do perfil deste aparelho) e o selo do fluxo mostra a coluna', async () => {
  await arrastar('Coletar amostra', 1);
  const q = card('Coletar amostra').locator('[data-kb-quem]');
  certo(await q.count() === 1, 'sem a linha de quem iniciou');
  const t = await q.innerText(); certo(/Iniciado por Admin · \d\d\/\d\d \d\d:\d\d/.test(t) && !t.includes('Concluído'), t);
  await quadroLivre();
  const selo = p.locator('.qi-processo', { hasText: 'Coletar' }).locator('[data-fase]');
  certo(await selo.count() === 1 && (await selo.getAttribute('data-fase')) === 'andamento' && (await selo.innerText()).includes('Fazendo'), 'selo: ' + (await selo.count() ? await selo.innerText() : 'nenhum'));
  certo((await p.locator('.qi-processo', { hasText: 'Analisar' }).locator('[data-fase]').getAttribute('data-fase')) === 'afazer', 'a outra devia estar em A fazer');
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/fluxo-selos.png` });
  await kanban();
});
await caso('mover para "Feito" grava quem concluiu; o nome digitado nos comentários vale como "quem"', async () => {
  await p.evaluate(() => localStorage.setItem('efcdocs.autor', 'Pessoa B'));
  await arrastar('Coletar amostra', 2);
  const t = await card('Coletar amostra').locator('[data-kb-quem]').innerText();
  certo(/Iniciado por Admin/.test(t) && /Concluído por Pessoa B · \d\d\/\d\d/.test(t), t);
  if (PRINTS) await card('Coletar amostra').screenshot({ path: `${PRINTS}/cartao-quem.png` });
});
await caso('Ctrl+Z volta a coluna e tira o "concluiu"; Ctrl+Y põe de novo', async () => {
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300);
  let t = await card('Coletar amostra').locator('[data-kb-quem]').innerText();
  certo(!t.includes('Concluído') && t.includes('Iniciado'), t);
  await p.keyboard.press('Control+y'); await p.waitForTimeout(300);
  t = await card('Coletar amostra').locator('[data-kb-quem]').innerText(); certo(t.includes('Concluído por Pessoa B'), t);
});
await caso('voltar para "A fazer" apaga quem iniciou e quem concluiu', async () => {
  await arrastar('Coletar amostra', 0);
  certo(await card('Coletar amostra').locator('[data-kb-quem]').count() === 0, 'ficou a linha');
});
await caso('desligar o fluxo: as atividades saem do Kanban e o selo some; o post-it fica', async () => {
  await p.locator('[data-kb-fluxo]').click(); await p.waitForTimeout(400);
  certo(await p.locator('.kb-card[data-item]').count() === 1, 'cartões: ' + await p.locator('.kb-card[data-item]').count());
  await quadroLivre(); certo(await p.locator('.qi-processo [data-fase]').count() === 0, 'o selo ficou');
});
await caso('sem erro na página', async () => { certo(erros.length === 0, erros.join(' | ')); });
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências do fluxo ligado ao Kanban passaram.`);
process.exit(falhas ? 1 : 0);
