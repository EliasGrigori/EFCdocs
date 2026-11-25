/* Vértice Docs — v0.6.43: a segmentação com o desenho do Excel 365 (estilo claro padrão).
   Caixa de canto reto, borda fina e sem sombra; título em letra normal; botões retos; marcado em azul, desmarcado na cor
   da caixa; sem linha tracejada no valor sem linhas. Confere no tema claro e no escuro.
   Uso: node scripts/testar-segmentacao-visual.mjs <endereço>. Amostra inventada (testes/amostras/amostra-v0641.xlsx). */
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
const BASE = process.argv[2] || 'http://localhost:8731/';
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const AMOSTRA = fileURLToPath(new URL('../testes/amostras/amostra-v0641.xlsx', import.meta.url));
let ok = 0, falhas = 0;
const erros = [];
const certo = (c, m) => { if (!c) throw new Error(m); };
async function caso(nome, f) { try { await f(); ok++; console.log('  ok   ' + nome); } catch (e) { falhas++; console.log('  FALHA ' + nome + ' — ' + String(e.message || e).split('\n')[0].slice(0, 300)); } }
const rgb = (s) => { const n = (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number); return /^color\(/.test(s) ? n.map((x) => x * 255) : n; }; /* color-mix sai como color(srgb 0..1) */
const luz = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const nav = await chromium.launch({ executablePath: CHROME });
async function abrir(tema) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
  await ctx.addInitScript((t) => { globalThis.EFC_MENU_FIXO = true; if (t) try { const k = 'efcdocs:prefs'; const x = JSON.parse(localStorage.getItem(k) || '{}'); x.tema = t; localStorage.setItem(k, JSON.stringify(x)); } catch { /* sem armazenamento */ } }, tema);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => erros.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text()); });
  await p.goto(BASE + '#/'); await p.waitForSelector('[data-abrir-excel]'); await p.click('[data-abrir-excel]');
  await p.setInputFiles('[data-excel-arquivo]', AMOSTRA); await p.waitForSelector('[data-excel-abrir]', { timeout: 30000 });
  await p.click('[data-excel-abrir]'); await p.waitForSelector('[data-seg="Fruta"]'); await p.waitForTimeout(700);
  return { p, ctx };
}
const estilo = (p, sel, props) => p.locator(sel).first().evaluate((e, ps) => { const s = getComputedStyle(e); return Object.fromEntries(ps.map((k) => [k, s.getPropertyValue(k)])); }, props);

let { p, ctx } = await abrir(null);
await caso('caixa como a do Excel: canto reto, borda fina, sem sombra (antes: cartão de 10 px com sombra)', async () => {
  const s = await estilo(p, '[data-seg="Fruta"]', ['border-top-left-radius', 'box-shadow', 'border-top-width']);
  certo(parseFloat(s['border-top-left-radius']) === 0, 'canto: ' + s['border-top-left-radius']);
  certo(s['box-shadow'] === 'none', 'sombra: ' + s['box-shadow']);
  certo(parseFloat(s['border-top-width']) === 1, 'borda: ' + s['border-top-width']);
});
await caso('título em letra normal, como no Excel (antes: negrito)', async () => {
  const s = await estilo(p, '[data-seg="Fruta"] .seg-cab b', ['font-weight']);
  certo(+s['font-weight'] <= 400, 'peso: ' + s['font-weight']);
});
await caso('botões retos; marcado em azul, desmarcado na cor da caixa e sem negrito', async () => {
  const on = await estilo(p, '[data-seg="Fruta"] [data-seg-item="Mamão"]', ['border-top-left-radius', 'background-color', 'font-weight']);
  const off = await estilo(p, '[data-seg="Fruta"] [data-seg-item="Acerola"]', ['background-color', 'font-weight']);
  const cx = await estilo(p, '[data-seg="Fruta"]', ['background-color']);
  certo(parseFloat(on['border-top-left-radius']) === 0, 'canto do botão: ' + on['border-top-left-radius']);
  const [r, g, b] = rgb(on['background-color']);
  certo(b - r >= 25 && b >= g, 'marcado não é azul: ' + on['background-color']);
  certo(off['background-color'] === cx['background-color'], `desmarcado ${off['background-color']} × caixa ${cx['background-color']}`);
  certo(+on['font-weight'] <= 400 && +off['font-weight'] <= 400, 'negrito no botão');
});
await caso('valor sem linhas: borda contínua e texto cinza legível (antes: borda tracejada)', async () => {
  await p.locator('[data-seg="Fruta"] [data-seg-item="Acerola"]').click(); await p.waitForTimeout(300);
  const s = await estilo(p, '[data-seg="Talhão"] [data-seg-item].sem', ['border-top-style', 'color', 'background-color']);
  certo(s['border-top-style'] === 'solid', 'borda: ' + s['border-top-style']);
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const Lr = (c) => { const [r, g, b] = rgb(c).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const t = Lr(s.color), f = Lr(s['background-color']);
  const cont = (Math.max(t, f) + 0.05) / (Math.min(t, f) + 0.05);
  certo(cont >= 4.5, 'contraste ' + cont.toFixed(2));
});
await ctx.close();

({ p, ctx } = await abrir('dark'));
await caso('tema escuro: caixa na cor do tema, marcado em azul e distinto do desmarcado', async () => {
  const cx = await estilo(p, '[data-seg="Fruta"]', ['background-color', 'box-shadow']);
  const on = await estilo(p, '[data-seg="Fruta"] [data-seg-item="Mamão"]', ['background-color']);
  const off = await estilo(p, '[data-seg="Fruta"] [data-seg-item="Acerola"]', ['background-color']);
  certo(luz(rgb(cx['background-color'])) < 0.4, 'caixa clara no escuro: ' + cx['background-color']);
  certo(cx['box-shadow'] === 'none', 'sombra no escuro');
  const [r, , b] = rgb(on['background-color']);
  certo(b - r >= 20, 'marcado não é azul: ' + on['background-color']);
  certo(on['background-color'] !== off['background-color'], 'marcado igual ao desmarcado');
});
await ctx.close();

await caso('console sem erro', async () => { certo(!erros.length, erros.slice(0, 2).join(' | ')); });
await nav.close();
console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
