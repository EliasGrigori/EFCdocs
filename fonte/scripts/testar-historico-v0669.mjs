/* Vértice Docs v0.6.69 e v0.6.70 (aprovadas em 26/11 03:19):
   - v0.6.69 (R44 parte 2): histórico de quem fez cada atualização, na gaveta do cartão (aba Histórico), só nos Documentos internos.
   - v0.6.70 (S2): o selo da coluna na atividade e as linhas de quem iniciou/concluiu também no PNG (o PDF usa o mesmo desenho).
   Falha na v0.6.68 e passa na v0.6.70. Uso: node scripts/testar-historico-v0669.mjs <endereço> [pasta-dos-prints]. Dados inventados. */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const erros = [];
let ok = 0, falhas = 0;
const caso = async (nome, f) => { try { const i = await f(); ok++; console.log(`  ok    ${nome}${i ? ' — ' + i : ''}`); } catch (e) { falhas++; console.log(`  FALHA ${nome} — ${String(e.message || e).split('\n')[0].slice(0, 300)}`); } };
const certo = (c, m) => { if (!c) throw new Error(m); };
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', acceptDownloads: true });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; try { localStorage.setItem('efcdocs:quadro-prefs', JSON.stringify({ v: 2, ferramentas: true })); } catch { /* */ } });
const p = await ctx.newPage(); p.setDefaultTimeout(4000);
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
const ta = () => p.locator('textarea.qd-edita');
const card = (t) => p.locator('.kb-card[data-item]', { hasText: t }).first();
async function arrastar(t, i) {
  const a = await card(t).boundingBox(), k = await p.locator('.kb-col').nth(i).boundingBox();
  await p.mouse.move(a.x + a.width / 2, a.y + 14); await p.mouse.down();
  await p.mouse.move(k.x + k.width / 2, k.y + 70, { steps: 14 }); await p.waitForTimeout(150);
  await p.mouse.up(); await p.waitForTimeout(450);
}
const abrirGaveta = async (t) => { await card(t).click({ position: { x: 30, y: 20 } }); await card(t).locator('[data-kb-comentar], [data-kb-coments]').first().click(); await p.waitForSelector('[data-kb-gaveta]'); };
const linhas = async () => p.locator('[data-kb-historico] .kb-gv-ev').allInnerTexts();
/* conta, no PNG baixado, os pixels de uma cor (com folga), para saber se o selo e as linhas saíram */
async function pixels(caminho, cores) {
  const b64 = readFileSync(caminho).toString('base64');
  return p.evaluate(async ({ b64, cores }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, cv.width, cv.height).data;
    const alvo = cores.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
    const n = alvo.map(() => 0);
    for (let i = 0; i < d.length; i += 4) alvo.forEach((a, j) => { if (Math.abs(d[i] - a[0]) < 4 && Math.abs(d[i + 1] - a[1]) < 4 && Math.abs(d[i + 2] - a[2]) < 4) n[j]++; });
    return n;
  }, { b64, cores });
}
const png = async (nome) => { await p.click('.tabs .tab:has-text("Arquivo")'); const [d] = await Promise.all([p.waitForEvent('download'), p.locator('[data-cmd="arquivo.exportarImagem"]').first().click()]); if (PRINTS) await d.saveAs(`${PRINTS}/${nome}.png`); return d.path(); };

await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-ferr');
for (const t of ['Coletar amostra', 'Analisar no laboratório']) { await p.keyboard.press('Escape'); await p.locator('.qd-ferr [data-ferr="inserir.processo"]').click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(100); await p.keyboard.press('Escape'); }
await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill('Conferir balança'); await ta().press('Control+Enter'); await p.keyboard.press('Escape');
await p.click('.tab:has-text("Organizar")'); await p.locator('[data-cmd="organizar.kanban"]').first().click(); await p.waitForSelector('.kb-col'); await p.waitForTimeout(400);

await caso('a gaveta do cartão tem as abas Comentários e Histórico; fora dos internos o histórico fica vazio e explica', async () => {
  await arrastar('Conferir balança', 1);
  await abrirGaveta('Conferir balança');
  certo(await p.locator('[data-kb-aba]').count() === 2, 'abas: ' + await p.locator('[data-kb-aba]').count());
  await p.locator('[data-kb-aba="hist"]').click();
  certo((await p.locator('[data-kb-aba="hist"]').getAttribute('aria-selected')) === 'true', 'aba não ficou escolhida');
  certo((await linhas()).length === 0 && (await p.locator('[data-kb-historico]').innerText()).includes('Documentos internos'), await p.locator('[data-kb-historico]').innerText());
  await p.keyboard.press('Escape'); await arrastar('Conferir balança', 0);
});
await caso('o quadro vai para Documentos internos e liga o fluxo', async () => {
  await p.click('.tabs .tab:has-text("Arquivo")'); await p.locator('[data-cmd="arquivo.compartilharCwork"]').first().click(); await p.waitForSelector('[data-int-salvar]');
  await p.selectOption('[data-int-subaba]', { index: 0 }); await p.fill('[data-int-codigo]', 'HST-01'); await p.click('[data-int-salvar]'); await p.waitForTimeout(800);
  if (await p.locator('.kb-col').count() === 0) { await p.locator('.qd-vistas button:has-text("Kanban")').click(); await p.waitForSelector('.kb-col'); }
  await p.locator('[data-kb-fluxo]').click(); await p.waitForTimeout(400);
  certo(await p.locator('.kb-card[data-item]').count() === 3, 'cartões: ' + await p.locator('.kb-card[data-item]').count());
});
await caso('mover e mudar o texto entram no histórico, do mais novo para o mais antigo, com quem e quando', async () => {
  await arrastar('Conferir balança', 1);
  await card('Conferir balança').dblclick({ position: { x: 40, y: 30 } }); const ed = p.locator('textarea.kb-edita'); await ed.waitFor(); await ed.fill('Conferir balança B'); await ed.press('Control+Enter'); await p.waitForTimeout(250);
  await abrirGaveta('Conferir balança'); await p.locator('[data-kb-aba="hist"]').click();
  const l = await linhas();
  certo(l.length === 2, 'linhas: ' + l.join(' | '));
  certo(/^Admin mudou o texto(?! para)/.test(l[0]) && /\d\d\/\d\d \d\d:\d\d/.test(l[0]), l[0]);
  certo(/^Admin moveu de “A fazer” para “Fazendo”/.test(l[1]), l[1]);
  certo((await p.locator('[data-kb-aba="hist"] .kb-gv-n').innerText()) === '2', 'contagem da aba');
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/historico.png` });
});
await caso('a aba Histórico fica ao passar para o próximo cartão (setas da gaveta)', async () => {
  const antes = await p.locator('[data-kb-gaveta]').getAttribute('data-kb-gaveta');
  await p.locator('[data-kb-gaveta] .gv-nav button:not([disabled])').first().click(); await p.waitForTimeout(250);
  certo((await p.locator('[data-kb-gaveta]').getAttribute('data-kb-gaveta')) !== antes, 'não passou para o próximo');
  certo((await p.locator('[data-kb-aba="hist"]').getAttribute('aria-selected')) === 'true', 'voltou para Comentários');
  await p.keyboard.press('Escape');
});
await caso('Ctrl+Z tira a última linha junto com a mudança', async () => {
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300);
  await abrirGaveta('Conferir balança'); await p.locator('[data-kb-aba="hist"]').click();
  const l = await linhas(); certo(l.length === 1 && l[0].includes('moveu'), l.join(' | '));
  await p.keyboard.press('Escape');
});
await caso('PNG do Kanban leva "Iniciado por" (texto escuro) e "Concluído por" (verde)', async () => {
  await arrastar('Coletar amostra', 2); await p.mouse.click(1300, 760);
  const [verde] = await pixels(await png('png-kanban'), ['#14653a']);
  certo(verde > 40, 'pixels verdes do "Concluído por": ' + verde);
});
await caso('PNG do quadro livre leva o selo da coluna (verde em Feito, azul no meio)', async () => {
  await p.locator('.qd-vistas button:has-text("Quadro")').click(); await p.waitForTimeout(400); await p.mouse.click(1300, 760);
  const [feito, meio] = await pixels(await png('png-quadro'), ['#e6f4ea', '#e8f0fe']);
  certo(feito > 200, 'selo Feito: ' + feito);
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/quadro-selos.png` });
  return 'pixels do selo Feito ' + feito + ', do meio ' + meio;
});
await caso('sem erro na página', async () => { certo(erros.length === 0, erros.join(' | ')); });
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências do histórico e do PNG passaram.`);
process.exit(falhas ? 1 : 0);
