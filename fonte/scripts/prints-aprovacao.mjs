/* EFCdocs — prints de antes (v0.6.2, servida em outro endereço) e depois (v0.6.3) para a página de aprovação.
   Só amostras inventadas (testes/amostras/): nenhum dado real nos prints.
   Os prints das janelas novas (v063-*.png) saem do próprio testar-navegador.mjs com FILTRO='v0.6.3'; este script faz os pares antes/depois da faixa.
   Uso: node scripts/prints-aprovacao.mjs <endereço-depois> <endereço-antes> <pasta> */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const DEPOIS = process.argv[2], ANTES = process.argv[3], OUT = process.argv[4];
const am = (n) => fileURLToPath(new URL(`../testes/amostras/${n}`, import.meta.url));
const QUALIDADE = am('amostra-qualidade.xlsx');
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } });
const PC = { viewport: { width: 1366, height: 800 }, acceptDownloads: true };
const espera = (p, ms = 150) => p.waitForTimeout(ms);
const shot = (p, nome, clip) => p.screenshot({ path: `${OUT}/${nome}.png`, ...(clip ? { clip } : {}) });
async function abrir(raiz, arq, opc = PC) {
  const ctx = await b.newContext(opc);
  const p = await ctx.newPage();
  await p.goto(raiz + '#/'); await espera(p, 700);
  await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', arq);
  await p.waitForSelector('[data-excel-abrir]'); await espera(p, 300);
  await p.click('[data-excel-abrir]');
  await p.waitForSelector('.pl-cv'); await espera(p, 700);
  await p.addStyleTag({ content: '.toasts{visibility:hidden!important}' });
  return p;
}
const tentar = async (nome, f) => { try { await f(); } catch (e) { console.log('FALHOU', nome, String(e.message).split('\n')[0]); } };
const aba = (p, nome) => p.click(`.tabs .tab:has-text("${nome}")`).then(() => espera(p, 250));
const FAIXA = { x: 212, y: 50, width: 1154, height: 150 };
const nomeArq = { 'Página Inicial': 'inicio', 'Inserir': 'inserir', 'Dados': 'dados', 'Revisão': 'revisao' };

for (const [qual, raiz] of [['antes', ANTES], ['depois', DEPOIS]]) {
  await tentar('faixa ' + qual, async () => {
    const p = await abrir(raiz, QUALIDADE);
    for (const t of Object.keys(nomeArq)) { await aba(p, t); await shot(p, `${qual}-faixa-${nomeArq[t]}`, FAIXA); }
    await p.click('[data-opcoes-faixa]'); await espera(p, 300);
    await shot(p, `${qual}-faixa-menu`, { x: 700, y: 0, width: 666, height: 640 });
    await p.keyboard.press('Escape');
    /* o botão de classificar e o de filtrar, à vista na aba Dados */
    await aba(p, 'Dados'); await espera(p, 200);
    await shot(p, `${qual}-dados-tela`);
    await p.context().close();
  });
}
await b.close();
writeFileSync(`${OUT}/ok.txt`, 'ok');
console.log('prints prontos');
