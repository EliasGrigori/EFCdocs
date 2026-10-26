/* EFCdocs — prints de antes (v0.4.6.1 em /v0461/) e depois (v0.4.7) para a página de aprovação.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 } };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const FORMULA = '=SOMA(B1:B100)*0,15+CONT.NÚM(C1:C100)-MÁXIMO(D1:D100)+SOMA(E1:E100)*0,25+CONT.NÚM(F1:F100)-MÍNIMO(G1:G100)+SOMA(H1:H100)*0,35+CONT.NÚM(I1:I100)-MÁXIMO(J1:J100)+SOMA(K1:K100)*0,45+CONT.NÚM(L1:L100)-MÍNIMO(M1:M100)+SOMA(N1:N100)*0,55';
const medidas = {};
async function abrir(raiz) {
  const ctx = await b.newContext(PC); const p = await ctx.newPage();
  await p.goto(raiz + '#/planilha'); await espera(p, 600);
  await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await espera(p, 400);
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('A1'); await p.locator('.pl-nome').press('Enter'); await espera(p, 80);
  await p.keyboard.type('Cloro'); await p.keyboard.press('Enter');
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('P2'); await p.locator('.pl-nome').press('Enter'); await espera(p, 200);
  await p.keyboard.type('='); await espera(p, 250); await p.keyboard.type(FORMULA.slice(1)); await p.keyboard.press('Enter'); await espera(p, 150);
  await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill('P2'); await p.locator('.pl-nome').press('Enter'); await espera(p, 200);
  return p;
}
const linhas = (p) => p.evaluate(() => { const r = document.querySelector('.pl-rol'); return r ? Math.floor((r.clientHeight - 24) / 22) : 0; });

/* antes */
{
  const p = await abrir(BASE + 'v0461/');
  await p.screenshot({ path: `${OUT}/antes-tela.png` });
  medidas.antes = await linhas(p);
}
/* depois */
{
  const p = await abrir(BASE);
  const foto = (n) => p.screenshot({ path: `${OUT}/depois-${n}.png` });
  await foto('tela');
  medidas.depoisPadrao = await linhas(p);
  await p.click('.tabs .tab:has-text("Exibir")'); await espera(p, 250);
  await foto('exibir');
  await p.click('.tabs .tab:has-text("Página Inicial")'); await espera(p, 150);
  /* fx expandida */
  await p.click('[data-fx-exp=expandir]'); await espera(p, 250);
  await foto('fx-expandida');
  /* arrastada */
  const a = await p.locator('[data-fx-alca]').boundingBox();
  await p.mouse.move(a.x + 300, a.y + a.height / 2); await p.mouse.down(); await p.mouse.move(a.x + 300, a.y + 70, { steps: 6 }); await p.mouse.up(); await espera(p, 200);
  medidas.fxArrastada = await p.locator('.pl-fx').getAttribute('data-fx-alt');
  await foto('fx-arrastada');
  /* volta ao mínimo pelo ^ */
  await p.click('[data-fx-exp=recolher]'); await espera(p, 200);
  medidas.fxMinimo = await p.locator('.pl-fx').getAttribute('data-fx-alt');
  /* faixa recolhida */
  await p.click('[data-faixa-recolher=recolher]'); await espera(p, 250);
  await foto('faixa-abas');
  medidas.depoisFaixaAbas = await linhas(p);
  /* barra de cima compacta */
  await p.click('.topo-alterna'); await espera(p, 300);
  await foto('topo-compacto');
  medidas.depoisCompacto = await linhas(p);
  /* menu escondido */
  await p.click('[data-menu-ocultar]'); await espera(p, 300);
  await foto('maximo');
  medidas.depoisMaximo = await linhas(p);
  /* abas abrem a faixa por um momento */
  await p.click('.tabs .tab:has-text("Inserir")'); await espera(p, 300);
  await foto('faixa-momento');
}
writeFileSync(`${OUT}/medidas.json`, JSON.stringify(medidas, null, 2));
console.log(medidas);
await b.close();
