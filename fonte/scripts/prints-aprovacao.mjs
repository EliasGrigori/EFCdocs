/* EFCdocs — prints de antes (v0.4.7 em /v047/) e depois (v0.4.8) para a página de aprovação.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 } };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const medidas = {};
const DADOS = [['Ponto', 'Cloro (mg/L)', 'pH', 'Turbidez'], ['Entrada', '1,2', '7,1', '0,8'], ['Reservatório', '1,0', '7,3', '0,5'], ['Rede 1', '0,8', '7,2', '0,6'], ['Rede 2', '0,7', '7,4', '0,9']];
const irPara = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(p, 120); };
async function planilha(raiz, extra = '') {
  const ctx = await b.newContext(PC); const p = await ctx.newPage();
  await p.goto(raiz + '#/planilha'); await espera(p, 600);
  await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await espera(p, 400);
  for (let i = 0; i < DADOS.length; i++) {
    await irPara(p, 'A' + (i + 1));
    for (const c of DADOS[i]) { await p.keyboard.type(c); await p.keyboard.press('Tab'); }
    await espera(p, 60);
  }
  await irPara(p, 'F2'); await p.keyboard.type('='); await espera(p, 250); await p.keyboard.type('B2*1,15'); await p.keyboard.press('Enter'); await espera(p, 200);
  await irPara(p, 'B2'); await espera(p, 200);
  return p;
}
const quadro = async (raiz) => {
  const ctx = await b.newContext(PC); const p = await ctx.newPage();
  await p.goto(raiz + '#/postits'); await espera(p, 600);
  await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio'); await espera(p, 300);
  return p;
};
const postit = async (p, texto) => {
  await p.locator('[data-cmd="inserir.postit"]').first().click(); await p.waitForSelector('textarea.qd-edita');
  await p.locator('textarea.qd-edita').fill(texto); await p.locator('textarea.qd-edita').press('Control+Enter'); await espera(p, 200);
};
const clip = (p, nome, c) => p.screenshot({ path: `${OUT}/${nome}.png`, clip: c });
const cmd = (p, id) => p.locator(`[data-cmd="${id}"]`).first().click();

/* antes: v0.4.7 */
{
  const p = await planilha(BASE + 'v047/');
  await p.screenshot({ path: `${OUT}/antes-tela.png` });
  await clip(p, 'antes-canto', { x: 0, y: 0, width: 520, height: 230 });
  await p.click('[data-menu-ocultar]'); await espera(p, 300);
  await clip(p, 'antes-alca', { x: 0, y: 300, width: 520, height: 200 });
  const q = await quadro(BASE + 'v047/'); await postit(q, 'Comprar reagente'); await q.keyboard.press('Escape');
  await q.locator('.qi-postit').click(); await q.keyboard.press('Delete'); await espera(q, 400);
  await q.screenshot({ path: `${OUT}/antes-aviso.png` });
}
/* depois: v0.4.8 */
{
  const p = await planilha(BASE);
  const foto = (n) => p.screenshot({ path: `${OUT}/depois-${n}.png` });
  await foto('tela'); // padrão: Papel + mesa
  await clip(p, 'depois-canto', { x: 0, y: 0, width: 520, height: 230 });
  await clip(p, 'depois-canto-grande', { x: 0, y: 0, width: 360, height: 160 });
  // acabamentos
  await p.click('.tabs .tab:has-text("Exibir")'); await espera(p, 250);
  await foto('exibir');
  await cmd(p, 'exibir.mesa'); await cmd(p, 'exibir.relevo'); await espera(p, 300); // plano
  await foto('acab-plano');
  await cmd(p, 'exibir.relevo'); await espera(p, 300); // só relevo
  await foto('acab-relevo');
  await cmd(p, 'exibir.mesa'); await espera(p, 300); // relevo + mesa (padrão)
  await foto('acab-mesa');
  await p.click('.tabs .tab:has-text("Página Inicial")'); await espera(p, 200);
  // Verificação no rodapé (Dica)
  await p.locator('.pl-lamp, .foot .qd-lamp').first().click(); await espera(p, 400);
  await foto('verificacao');
  await p.locator('.pl-lamp, .foot .qd-lamp').first().click(); await espera(p, 200);
  // Opções
  await p.locator('.topbar [aria-label="Opções"]').click(); await espera(p, 400);
  const sec = async (id) => { if (!(await p.locator(`.op-sec[data-sec=${id}].aberta`).count())) await p.locator(`.op-sec[data-sec=${id}] .op-cab`).click(); await espera(p, 200); };
  await sec('tema'); await foto('opcoes-tema');
  await p.keyboard.press('Escape'); await espera(p, 200);
  // menu escondido + alça + ☰
  await p.click('[data-menu-ocultar]'); await espera(p, 300);
  await clip(p, 'depois-alca', { x: 0, y: 300, width: 520, height: 200 });
  await p.click('.topo-alterna'); await espera(p, 300);
  await foto('maximo');
  await p.click('.tabs .tab:has-text("Inserir")'); await espera(p, 300);
  await foto('faixa-temporaria');
  await p.keyboard.press('Escape');
  // tema escuro petróleo com mesa (para comparar)
  const q = await quadro(BASE); await postit(q, 'Comprar reagente'); await q.keyboard.press('Escape');
  await q.screenshot({ path: `${OUT}/depois-quadro.png` });
  await q.locator('.qi-postit').click(); await q.keyboard.press('Delete'); await espera(q, 400);
  await q.screenshot({ path: `${OUT}/depois-aviso.png` });
  await q.keyboard.press('Control+z'); await espera(q, 400);
  await clip(q, 'depois-aviso-desfeito', { x: 0, y: 600, width: 700, height: 200 });
  medidas.avisos = await q.locator('.toast').count();
}
writeFileSync(`${OUT}/medidas.json`, JSON.stringify(medidas, null, 2));
console.log(medidas);
await b.close();
