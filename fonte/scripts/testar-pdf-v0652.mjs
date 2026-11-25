/* Vértice Docs v0.6.52 — D-81: o PDF e a imagem do Quadro quebram o texto como a tela.
   Monta um quadro no app (itens inventados parecidos com os do print do Elias), lê o arquivo guardado no navegador e
   desenha com o desenho.js da pasta indicada (mesmo código do PDF) num canvas que anota cada linha escrita.
   Compara, item por item: letra usada, número de linhas e se aparece "…" onde a tela não corta.
   Uso: node scripts/testar-pdf-v0652.mjs <endereço do app> [pasta fonte do desenho, padrão: esta] */
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const BASE = process.argv[2] || 'http://localhost:8731/';
const FONTE_DIR = path.resolve(process.argv[3] || fileURLToPath(new URL('..', import.meta.url)));
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const pacote = await build({ stdin: { contents: `import { desenharQuadro } from './src/quadro/desenho.js'; import * as D from './src/quadro/desenho.js'; window.QD = { desenharQuadro, fontesProntas: D.fontesProntas || null, FONTE: D.FONTE };`, resolveDir: FONTE_DIR, loader: 'js' }, bundle: true, write: false, format: 'iife', jsx: 'automatic', loader: { '.jsx': 'jsx' }, logLevel: 'silent' });
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = [];
p.on('pageerror', (e) => erros.push(String(e)));
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const ITENS = [['inserir.processo', 'TREINAMENTO DE DEFEN.'], ['inserir.inicio', 'COMANDA DE PULVERIZAÇÃO - DEFENCIVOS'], ['inserir.processo', 'LAVAGEM DE EPI DA PULVERIZAÇÃO'], ['inserir.texto', 'EMERSON'], ['inserir.postit', 'DATAS INICIAL E FINAL DA LIMPEZA DEVE BATER COM AS ASSINATURAS DO LANÇAMENTO COM FICHA DE EPI']];
for (const [cmd, t] of ITENS) {
  await p.locator(`[data-cmd="${cmd}"]`).first().click();
  const ta = p.locator('textarea.qd-edita'); await ta.waitFor(); await ta.fill(t); await ta.press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape');
}
await p.waitForTimeout(1500);
/* tela: linhas de cada item (altura do texto ÷ altura da linha) e se cortou */
const tela = await p.evaluate(() => [...document.querySelectorAll('.qi')].map((e) => {
  const s = e.querySelector('.qi-clamp'); if (!s) return null;
  const cs = getComputedStyle(s), lh = parseFloat(getComputedStyle(e.querySelector('.qi-t')).lineHeight) || parseFloat(cs.fontSize) * 1.3;
  return { texto: s.textContent, linhas: Math.round(s.getBoundingClientRect().height / lh / (window.__z || 1)), cortou: s.scrollHeight > s.clientHeight + 1, letra: cs.fontFamily };
}).filter(Boolean));
/* o arquivo guardado no navegador */
const conteudo = await p.evaluate(() => new Promise((ok, erro) => {
  const r = indexedDB.open('efcdocs'); r.onerror = () => erro(r.error);
  r.onsuccess = () => { const t = r.result.transaction('arquivos').objectStore('arquivos').getAll(); t.onsuccess = async () => {
    /* o registro guarda o conteúdo compactado (pacote gzip em base64) */
    const abrir = async (reg) => { if (reg.conteudo) return reg.conteudo; const pk = reg.pacote; if (!pk || !pk.dados) return null; const bin = Uint8Array.from(atob(pk.dados), (ch) => ch.charCodeAt(0)); const txt = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); const j = JSON.parse(txt); return j.conteudo || j; };
    const lista = (await Promise.all(t.result.filter((a) => a.ficha && a.ficha.tipo === 'postits').map(abrir))).filter((c) => c && c.itens);
    ok(lista.sort((a, b) => Object.keys(b.itens).length - Object.keys(a.itens).length)[0]);
  }; };
}));
caso('arquivo do quadro lido do navegador', !!conteudo && Object.keys(conteudo.itens).length >= 5);
await p.addScriptTag({ content: pacote.outputFiles[0].text });
const pdf = await p.evaluate(async (c) => {
  if (window.QD.fontesProntas) await window.QD.fontesProntas();
  const cv = document.createElement('canvas'); cv.width = 3000; cv.height = 2000;
  const real = cv.getContext('2d'), linhas = [];
  const ctx = new Proxy(real, { get(o, k) { if (k === 'fillText') return (t, x, y) => { linhas.push({ t: String(t), font: o.font }); o.fillText(t, x, y); }; const v = o[k]; return typeof v === 'function' ? v.bind(o) : v; }, set(o, k, v) { o[k] = v; return true; } });
  window.QD.desenharQuadro(ctx, c, { codigos: true });
  return { linhas, FONTE: window.QD.FONTE };
}, conteudo);
caso('o PDF usa a mesma letra da tela', /Source Sans 3/.test(pdf.FONTE) && /Source Sans 3/.test(tela[0].letra), `PDF: ${pdf.FONTE} · tela: ${tela[0].letra}`);
for (const t of tela) {
  const minhas = [];
  let resto = t.texto.replace(/\s+/g, ' ');
  for (const l of pdf.linhas) { const s = l.t.replace(/…$/, '').trim(); if (s && resto.startsWith(s)) { minhas.push(l.t); resto = resto.slice(s.length).trim(); } else if (minhas.length && l.t.endsWith('…') && t.texto.includes(l.t.replace(/.{0,2}…$/, '').trim())) minhas.push(l.t); }
  const cortouPdf = minhas.some((l) => l.endsWith('…'));
  caso(`"${t.texto.slice(0, 32)}": mesmas linhas da tela`, minhas.length === t.linhas && cortouPdf === t.cortou, `tela ${t.linhas} linha(s)${t.cortou ? ' cortada' : ''} · PDF ${minhas.length}${cortouPdf ? ' cortada' : ''}: ${JSON.stringify(minhas)}`);
}
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
