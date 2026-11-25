/* Vértice Docs v0.6.49 — teste no navegador do D-79: a aba "muito oculta" do Excel não aparece na barra nem no menu
   Reexibir (como no Excel); a oculta comum aparece em Reexibir e volta. Amostra inventada amostra-varredura.xlsx
   (Ficha, Grande, Oculta = hidden, Escondida = veryHidden). Falha na v0.6.46 e passa na v0.6.49.
   Uso: node scripts/testar-abas-v0649.mjs <endereço> */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-varredura.xlsx', import.meta.url));
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
await p.goto(BASE + '#/'); await p.click('[data-abrir-excel]'); await p.setInputFiles('[data-excel-arquivo]', AMOSTRA);
await p.waitForSelector('[data-excel-abrir]', { timeout: 60000 }); await p.click('[data-excel-abrir]');
await p.waitForSelector('.pl-cv', { timeout: 60000 }); await p.waitForTimeout(1200);
const abas = await p.locator('.pl-aba').allInnerTexts();
caso('D-79 a barra mostra só as abas visíveis', abas.map((t) => t.trim()).join(',') === 'Ficha,Grande', abas.join(' | '));
await p.locator('.pl-aba', { hasText: 'Ficha' }).click({ button: 'right' }); await p.waitForTimeout(300);
const itens = (await p.locator('[role=menu] [role=menuitem], .menu-ctx button, .ctx-menu button').allInnerTexts()).map((t) => t.trim()).filter((t) => /^Reexibir/.test(t));
caso('D-79 o menu Reexibir mostra a oculta comum', itens.includes('Reexibir Oculta'), itens.join(' | ') || 'nenhum');
caso('D-79 o menu Reexibir não mostra a muito oculta (como no Excel)', !itens.some((t) => /Escondida/.test(t)), itens.join(' | ') || 'nenhum');
if (itens.includes('Reexibir Oculta')) {
  await p.getByText('Reexibir Oculta', { exact: true }).click(); await p.waitForTimeout(400);
  const depois = (await p.locator('.pl-aba').allInnerTexts()).map((t) => t.trim());
  caso('D-79 reexibir a oculta comum traz a aba de volta', depois.includes('Oculta') && !depois.includes('Escondida'), depois.join(' | '));
}
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
