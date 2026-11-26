/* Vértice Docs v0.6.73 — P2 do plano "Vértice como aba do Cwork" (aprovada em 26/11 06:02): login do Cwork pela interface
   combinada (window.CworkPonteVertice), perfil do cadastro, nome do comentário, "Entre no Cwork" e "Abra pelo Cwork".
   Falha na v0.6.72 e passa na v0.6.73. Uso: node scripts/testar-p2-v0673.mjs <endereço> [pasta-dos-prints]. Dados inventados. */
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
/* páginas "do Cwork" no mesmo site: uma com a interface combinada (P3) e uma sem (o Cwork de hoje) */
const pagina = (comPonte) => `<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><body style="margin:0">
  <div style="height:26px;background:#1d2b36;color:#fff;font:13px sans-serif;padding:5px 12px;box-sizing:border-box">Cwork (teste) · Vértice Docs</div>
  <script>${comPonte ? `window.__u={uid:'u-c',nome:'Pessoa C',perfil:'principal',estrela:false};
  window.CworkPonteVertice={versao:1,usuario:()=>window.__u,pastas:()=>[]};
  window.trocar=(u)=>{window.__u=u;window.dispatchEvent(new Event('cwork:usuario'));};` : ''}</script>
  <iframe id="v" src="${BASE}" style="border:0;width:100vw;height:calc(100vh - 26px)"></iframe></body>`;
await ctx.route('**/efcwork/com-ponte.html', (r) => r.fulfill({ contentType: 'text/html', body: pagina(true) }));
await ctx.route('**/efcwork/sem-ponte.html', (r) => r.fulfill({ contentType: 'text/html', body: pagina(false) }));
const p = await ctx.newPage(); p.setDefaultTimeout(6000);
p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
const fr = () => p.frameLocator('#v');
const quadro = () => p.frame({ url: (u) => !String(u).includes('/efcwork/') });

await caso('dentro do Cwork, logado como Principal: o perfil das Opções vem do cadastro e não tem os botões de teste', async () => {
  await p.goto(new URL('/efcwork/com-ponte.html', BASE).href); await fr().locator('.rail').waitFor();
  await fr().locator('button[aria-label*="Opções"], .iconbtn[title*="Opções"]').first().click();
  await fr().locator('.op-sec[data-sec=perfil]').waitFor();
  if (!(await fr().locator('.op-sec[data-sec=perfil].aberta').count())) await fr().locator('.op-sec[data-sec=perfil] .op-cab').click();
  await fr().locator('[data-perfil-cwork]').waitFor();
  const t = await fr().locator('[data-perfil-cwork]').innerText();
  certo(/Pessoa C/.test(t) && /Principal/.test(t), t);
  certo(await fr().locator('.op-sec[data-sec=perfil] .chipb').count() === 0, 'ainda tem os botões do perfil de teste');
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/opcoes-perfil.png` });
  await p.keyboard.press('Escape');
});
await caso('o arquivo novo é criado pela conta (nome e código do Cwork)', async () => {
  await fr().locator('.rail a[href="#/postits"]').click(); await fr().locator('[data-novo=postits]').click(); await fr().locator('.qd-vazio').waitFor();
  await p.waitForTimeout(1200);
  const f = await quadro().evaluate(() => new Promise((ok) => { const r = indexedDB.open('efcdocs'); r.onsuccess = () => { const t = r.result.transaction('arquivos').objectStore('arquivos').getAll(); t.onsuccess = () => ok(t.result.map((x) => x.ficha).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0]); }; }));
  certo(f.criadoPor === 'Pessoa C' && f.criadoPorId === 'u-c' && f.alteradoPorId === 'u-c', JSON.stringify({ c: f.criadoPor, id: f.criadoPorId }));
});
await caso('no Kanban, o comentário diz "Comentando como Pessoa C", sem o campo para digitar o nome', async () => {
  await fr().locator('[data-cmd="inserir.postit"]').first().click(); await fr().locator('textarea.qd-edita').fill('Conferir balança'); await fr().locator('textarea.qd-edita').press('Control+Enter');
  await p.keyboard.press('Escape');
  await fr().locator('.tab:has-text("Organizar")').click(); await fr().locator('[data-cmd="organizar.kanban"]').first().click(); await fr().locator('.kb-col').first().waitFor();
  const c = fr().locator('.kb-card[data-item]').first(); await c.click({ position: { x: 30, y: 20 } });
  await c.locator('[data-kb-comentar], [data-kb-coments]').first().click(); await fr().locator('[data-kb-gaveta]').waitFor();
  certo((await fr().locator('[data-kb-como]').innerText()).includes('Pessoa C'), 'sem o "Comentando como"');
  certo(await fr().locator('.kb-gv-autor').count() === 0, 'o campo do nome continua');
  await fr().locator('.kb-gv-linha textarea').fill('Feito na hora'); await fr().locator('.kb-gv-linha textarea').press('Control+Enter'); await p.waitForTimeout(300);
  certo((await fr().locator('.kb-gv-msg').last().innerText()).includes('Pessoa C'), 'o comentário não saiu com o nome do cadastro');
  if (PRINTS) await p.screenshot({ path: `${PRINTS}/comentando-como.png` });
  await p.keyboard.press('Escape');
});
await caso('trocar a conta no Cwork para Visitante: o Vértice passa a só ler (não cria arquivo)', async () => {
  await p.evaluate(() => window.trocar({ uid: 'u-v', nome: 'Pessoa V', perfil: 'visitante' }));
  await p.waitForTimeout(400);
  await fr().locator('.novo-drive-b').click();
  const desligados = await fr().locator('.novo-drive-m button[role=menuitem][disabled]').count();
  certo(desligados >= 3, 'os botões de criar continuam ligados: ' + desligados);
  await fr().locator('[data-novo-excel]').click(); await p.waitForTimeout(400);
  certo(await fr().locator('[data-excel-arquivo], [data-abrir-excel-janela]').count() === 0 || (await fr().locator('.toast, [role=status]').allInnerTexts()).join(' ').includes('perfil'), 'o Visitante conseguiu abrir a importação do Excel');
  await p.keyboard.press('Escape');
});
await caso('sair da conta no Cwork: o Vértice mostra "Entre no Cwork" e nada do aparelho aparece', async () => {
  await p.evaluate(() => window.trocar(null)); await p.waitForTimeout(400);
  await fr().locator('[data-acesso=sair]').waitFor();
  certo(await fr().locator('.rail').count() === 0, 'o menu continua aparecendo');
  if (PRINTS) { await p.waitForTimeout(1500); await p.screenshot({ path: `${PRINTS}/entre-no-cwork.png` }); }
  await p.evaluate(() => window.trocar({ uid: 'u-c', nome: 'Pessoa C', perfil: 'principal' })); await fr().locator('.rail').waitFor();
});
await caso('Cwork de hoje (sem a interface): o Vértice funciona como antes, "neste aparelho"', async () => {
  await p.goto(new URL('/efcwork/sem-ponte.html', BASE).href); await fr().locator('.rail').waitFor();
  certo(await fr().locator('[data-acesso]').count() === 0, 'travou sem precisar');
});
await caso('fora do Cwork: no servidor de testes abre normal; com ?trava=1 mostra "Abra pelo Cwork" com o botão', async () => {
  await p.goto(BASE + '#/'); await p.waitForSelector('.rail');
  await p.goto(BASE + '?trava=1#/'); await p.waitForSelector('[data-acesso=trava]');
  certo((await p.locator('[data-abrir-cwork]').getAttribute('href')) === 'https://eliasgrigori.github.io/efcwork/', 'endereço do botão');
  certo(await p.locator('.rail').count() === 0, 'o menu aparece');
  if (PRINTS) { await p.waitForTimeout(2500); await p.screenshot({ path: `${PRINTS}/abra-pelo-cwork.png` }); }
});
await caso('sem erro na página', async () => { certo(erros.length === 0, erros.join(' | ')); });
await nav.close();
console.log(`\n${ok} de ${ok + falhas} conferências da P2 passaram.`);
process.exit(falhas ? 1 : 0);
