/* EFCdocs — prints de antes (v0.4.5 em /v045/) e depois (v0.4.6) para a página de aprovação.
   Uso: node scripts/prints-aprovacao.mjs <endereço> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const BASE = process.argv[2], OUT = process.argv[3];
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 } };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const celula = async (p, ref) => { await p.locator('.pl-nome').click(); await p.locator('.pl-nome').fill(ref); await p.locator('.pl-nome').press('Enter'); await espera(p, 80); };
const digitar = async (p, ref, t) => { await celula(p, ref); await p.keyboard.type(t); await p.keyboard.press('Enter'); await espera(p, 120); };
const coluna = async (p, ref, vals) => { const col = ref[0], l0 = +ref.slice(1); for (let i = 0; i < vals.length; i++) await digitar(p, col + (l0 + i), String(vals[i]).replace('.', ',')); };

for (const [lado, raiz] of [['antes', BASE + 'v045/'], ['depois', BASE]]) {
  const ctx = await b.newContext(PC); const p = await ctx.newPage();
  const foto = (nome, o = {}) => p.screenshot({ path: `${OUT}/${lado}-${nome}.png`, ...o });
  await p.goto(raiz + '#/planilha'); await espera(p, 600);
  await p.click('[data-novo=planilha]'); await p.waitForSelector('.pl-cv'); await espera(p, 400);
  /* dados de teste: lote, cloro (A), peso (B), limites (E) */
  await digitar(p, 'A1', 'Cloro'); await digitar(p, 'B1', 'Peso');
  await coluna(p, 'A2', [0.8, 1.2, 1.2, 1.5, 0.4, 2.1, 1.8, 1.2]);
  await coluna(p, 'B2', [10, 12.5, 12, 15, 5.5, 20, 17, 12.4]);
  await digitar(p, 'D1', 'Conta'); await digitar(p, 'E1', 'Resultado');
  const contas = [['TETO(2,1;0,5)', 'D2'], ['ARREDMULTB(17;5)', 'D3'], ['MODO(A2:A9)', 'D4'], ['PERCENTIL(A2:A9;0,9)', 'D5'], ['QUARTIL(A2:A9;3)', 'D6'], ['ORDEM(A5;A2:A9)', 'D7'], ['CORREL(A2:A9;B2:B9)', 'D8']];
  for (const [f, ref] of contas) {
    const l = ref.slice(1);
    await digitar(p, 'D' + l, f);
    await digitar(p, 'E' + l, '=' + f);
  }
  await celula(p, 'A12');
  await foto('planilha-funcoes');
  /* limites e FREQUÊNCIA */
  await digitar(p, 'G1', 'Limites'); await coluna(p, 'G2', [1, 1.5, 2]);
  await digitar(p, 'H1', 'Quantos'); await digitar(p, 'H2', '=FREQUÊNCIA(A2:A9;G2:G4)');
  await celula(p, 'H2'); await espera(p, 200);
  await foto('planilha-frequencia');
  /* Explicar do CORREL (só no depois; no antes o Explicar diz que ainda não calcula) */
  await celula(p, 'E8');
  await p.click('.tabs .tab:has-text("Fórmulas")');
  await p.locator('[data-cmd="formula.explicar"]').first().click(); await p.waitForSelector('.pl-jexp'); await espera(p, 300);
  await foto('explicar-correl');
  await p.keyboard.press('Escape'); await espera(p, 200);
  /* autocompletar */
  await celula(p, 'J2'); await p.keyboard.type('=QUART'); await espera(p, 300);
  await foto('autocompletar');
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape');
  await ctx.close();
}
await b.close();
console.log('prints prontos em ' + OUT);
