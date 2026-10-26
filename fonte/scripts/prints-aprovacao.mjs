/* EFCdocs — prints de antes (v0.4.8 em /v048/) e depois (v0.4.9) para a página de aprovação.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 } };
const CEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const DADOS = [['Ponto', 'Cloro (mg/L)', 'pH', 'Turbidez'], ['Entrada', '1,2', '7,1', '0,8'], ['Reservatório', '1,0', '7,3', '0,5'], ['Rede 1', '0,8', '7,2', '0,6']];
const irPara = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(p, 120); };
async function nova(raiz, opc = PC, abas = false) {
  const ctx = await b.newContext(opc);
  if (abas) await ctx.addInitScript(() => { globalThis.EFC_CEL_ABAS = true; });
  const p = await ctx.newPage();
  await p.goto(raiz + '#/'); await espera(p, 700);
  return p;
}
async function planilha(p, cel = false) {
  await p.goto(p.url().split('#')[0] + '#/planilha'); await espera(p, 400);
  if (cel) await p.locator('[data-novo=planilha]').first().tap(); else await p.click('[data-novo=planilha]');
  await p.waitForSelector('.pl-cv'); await espera(p, 400);
  for (let i = 0; i < DADOS.length; i++) {
    await irPara(p, 'A' + (i + 1));
    for (const c of DADOS[i]) { await p.keyboard.type(c); await p.keyboard.press('Tab'); }
    await espera(p, 60);
  }
  await irPara(p, 'A1'); await espera(p, 200);
}
const clip = (p, nome, c) => p.screenshot({ path: `${OUT}/${nome}.png`, clip: c });
const cmd = (p, id) => p.locator(`[data-cmd="${id}"]`).first().click();

for (const [pref, raiz] of [['antes', BASE + 'v048/'], ['depois', BASE]]) {
  /* Início */
  let p = await nova(raiz);
  await p.screenshot({ path: `${OUT}/${pref}-inicio.png` });
  /* planilha: faixa, menu, alça, aviso */
  await planilha(p);
  await clip(p, `${pref}-faixa`, { x: 0, y: 0, width: 1366, height: 230 });
  await clip(p, `${pref}-menu`, { x: 0, y: 0, width: 260, height: 800 });
  await p.screenshot({ path: `${OUT}/${pref}-planilha.png` });
  await p.click('[data-menu-ocultar]'); await espera(p, 400);
  await clip(p, `${pref}-alca-repouso`, { x: 0, y: 330, width: 300, height: 140 });
  await p.hover('[data-menu-alca]'); await espera(p, 600);
  await clip(p, `${pref}-alca-hover`, { x: 0, y: 330, width: 300, height: 140 });
  await p.click('[data-menu-alca]'); await espera(p, 300);
  await p.click('.tabs .tab:has-text("Exibir")'); await espera(p, 200);
  await cmd(p, 'exibir.mesa'); await espera(p, 250);
  await p.screenshot({ path: `${OUT}/${pref}-aviso.png` });
  await clip(p, `${pref}-aviso-recorte`, { x: 700, y: 640, width: 666, height: 160 });
  /* Opções › Tema */
  await p.locator('.topbar [aria-label="Opções"]').click(); await espera(p, 300);
  const sec = async (id) => { if (!(await p.locator(`.op-sec[data-sec=${id}].aberta`).count())) await p.locator(`.op-sec[data-sec=${id}] .op-cab`).click(); await espera(p, 250); };
  await sec('tema');
  await p.screenshot({ path: `${OUT}/${pref}-temas.png` });
  await p.close();
  /* celular */
  p = await nova(raiz, CEL, pref === 'antes');
  await p.screenshot({ path: `${OUT}/${pref}-cel-inicio.png` });
  await planilha(p, true);
  await p.screenshot({ path: `${OUT}/${pref}-cel-planilha.png` });
  if (pref === 'depois') {
    await p.locator('.abas-cel').tap(); await espera(p, 400);
    await p.screenshot({ path: `${OUT}/depois-cel-abas.png` });
  }
  await p.close();
}
/* depois: extras */
{
  const p = await nova(BASE);
  await p.click('.rail .novo-drive-b'); await espera(p, 250);
  await clip(p, 'depois-menu-novo', { x: 0, y: 0, width: 360, height: 360 });
  await p.click('.rail .novo-drive-b');
  await p.click('.rail .brand-recolhe'); await espera(p, 350);
  await clip(p, 'depois-menu-icones', { x: 0, y: 0, width: 120, height: 800 });
  await p.click('.rail .brand-recolhe'); await espera(p, 300);
  await planilha(p);
  /* Centralizar: seleção A1:D4 */
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('A1:D4'); await p.locator('.pl-nome').press('Enter');
  await cmd(p, 'formatar.centro'); await espera(p, 300);
  await p.screenshot({ path: `${OUT}/depois-centralizar.png` });
  await p.close();
}
await b.close();
console.log('prints prontos');
