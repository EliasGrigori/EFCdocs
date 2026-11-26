/* Vértice Docs v0.6.72 — P1 do plano "Vértice como aba do Cwork" (aprovada em 26/11 05:20): modo aba, avisos para o Cwork,
   quem sou na ficha e número de gravação. Falha na v0.6.71 e passa na v0.6.72.
   Uso: node scripts/testar-p1-v0672.mjs <endereço> [pasta-dos-prints]. Dados inventados. */
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
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; try { localStorage.setItem('efcdocs.autor', 'Pessoa A'); } catch { /* */ } });
/* uma página "do Cwork" no mesmo site, em /efcwork/, com o Vértice numa moldura (como a janela de hoje e a aba da P3) */
await ctx.route('**/efcwork/teste-aba.html', (r) => r.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>Cwork (teste)</title>
  <body style="margin:0"><div style="height:26px;background:#222;color:#fff;font:13px sans-serif;padding:4px 10px">Cwork · aba Vértice Docs</div>
  <iframe id="v" src="${BASE}" style="border:0;width:100vw;height:calc(100vh - 34px)"></iframe>
  <script>window.__msgs=[];addEventListener('message',(e)=>{if(e.data&&e.data.de==='vertice')window.__msgs.push(e.data)});</script></body>` }));
const p = await ctx.newPage(); p.setDefaultTimeout(5000);
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
const visivel = (sel, fr = p) => fr.locator(sel).first().isVisible().catch(() => false);

await caso('sozinho (como hoje): o menu mostra a marca e o cartão "Neste aparelho"', async () => {
  await p.goto(BASE + '#/'); await p.waitForSelector('.rail');
  certo(!(await p.evaluate(() => document.documentElement.classList.contains('em-cwork'))), 'ligou o modo aba sozinho');
  certo(await visivel('.rail .brand-txt') && await visivel('.rail-user'), 'sumiu a marca ou o cartão');
});
await caso('com ?em=cwork: modo aba, sem a marca e sem o cartão de perfil; o Novo e os arquivos continuam', async () => {
  await p.goto(BASE + '?em=cwork#/'); await p.waitForSelector('.rail');
  certo(await p.evaluate(() => document.documentElement.classList.contains('em-cwork')), 'sem a classe em-cwork');
  certo(!(await visivel('.rail .brand-txt')) && !(await visivel('.rail-user')), 'a marca ou o cartão continuam');
  certo(await visivel('.novo-drive-b') && await visivel('.rail a[href="#/postits"]'), 'sumiu o Novo ou os arquivos');
});
await caso('dentro de uma página do Cwork (/efcwork/, mesmo site): modo aba sozinho e avisa "pronto" com a versão', async () => {
  await p.goto(new URL('/efcwork/teste-aba.html', BASE).href);
  const fr = p.frameLocator('#v'); await fr.locator('.rail').waitFor();
  const dentro = await p.frame({ url: (u) => !String(u).includes('teste-aba') }).evaluate(() => document.documentElement.classList.contains('em-cwork'));
  certo(dentro, 'não percebeu que está no Cwork');
  await p.waitForFunction(() => window.__msgs.some((m) => m.tipo === 'pronto'));
  const v = await p.evaluate(() => window.__msgs.find((m) => m.tipo === 'pronto').versao);
  certo(/^v0\.6\.\d+/.test(v), 'versão: ' + v);
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/aba-no-cwork.png` });
});
await caso('abrir um arquivo na moldura avisa o Cwork com o nome e o tipo; fechar avisa que não há arquivo', async () => {
  const fr = p.frameLocator('#v');
  await fr.locator('.rail a[href="#/postits"]').click(); await fr.locator('[data-novo=postits]').click(); await fr.locator('.qd-vazio').waitFor();
  await p.waitForFunction(() => window.__msgs.some((m) => m.tipo === 'arquivo' && m.nome));
  const m = await p.evaluate(() => window.__msgs.filter((x) => x.tipo === 'arquivo' && x.nome).pop());
  certo(m.tipoArquivo === 'postits' && /Quadro/.test(m.nome), JSON.stringify(m));
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/aba-arquivo.png` });
  await fr.locator('.rail a[href="#/"]').first().click();
  await p.waitForFunction(() => { const a = window.__msgs.filter((x) => x.tipo === 'arquivo'); return a.length && a[a.length - 1].nome === null; });
});
await caso('a ficha do arquivo guarda quem criou (nome deste aparelho e id) e o número de gravação sobe a cada salvar', async () => {
  await p.goto(BASE + '#/postits'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
  await p.locator('[data-cmd="inserir.postit"]').first().click(); await p.locator('textarea.qd-edita').fill('Teste'); await p.locator('textarea.qd-edita').press('Control+Enter'); await p.waitForTimeout(1500);
  const lerFichas = () => p.evaluate(() => new Promise((ok) => { const r = indexedDB.open('efcdocs'); r.onsuccess = () => { const t = r.result.transaction('arquivos').objectStore('arquivos').getAll(); t.onsuccess = () => ok(t.result.map((x) => x.ficha)); }; }));
  const f1 = (await lerFichas()).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0];
  certo(f1.criadoPor === 'Pessoa A' && f1.criadoPorId === 'neste aparelho' && f1.alteradoPorId === 'neste aparelho', JSON.stringify({ c: f1.criadoPor, ci: f1.criadoPorId }));
  certo(f1.gravacao >= 2, 'gravação: ' + f1.gravacao);
  await p.locator('[data-cmd="inserir.postit"]').first().click(); await p.locator('textarea.qd-edita').fill('Mais um'); await p.locator('textarea.qd-edita').press('Control+Enter'); await p.waitForTimeout(1500);
  const f2 = (await lerFichas()).find((x) => x.id === f1.id);
  certo(f2.gravacao > f1.gravacao, 'não subiu: ' + f1.gravacao + ' → ' + f2.gravacao);
  return 'gravação ' + f1.gravacao + ' → ' + f2.gravacao;
});
await caso('sem erro na página', async () => { certo(erros.length === 0, erros.join(' | ')); });
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências da P1 passaram.`);
process.exit(falhas ? 1 : 0);
