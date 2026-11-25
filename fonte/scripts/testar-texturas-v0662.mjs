/* Vértice Docs v0.6.62 — as 12 texturas aprovadas em 25/11: aplica cada uma num post-it (itens inventados), confere a tela
   (classe e peças) e o desenho do PDF (imagens e peças), e tira os prints. Falha na v0.6.61 (só havia 4 texturas).
   Uso: node scripts/testar-texturas-v0662.mjs <endereço> [pasta-dos-prints] */
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PASTA = process.argv[3] || '';
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
const erros = [];
const FONTE_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const TEX = [['', 'Liso'], ['dobrado', 'Ponta dobrada'], ['amassado', 'Amassado'], ['cafe', 'Mancha de café'], ['fita', 'Fita adesiva'], ['pautado', 'Separar as amostras do lote para o laboratório'], ['quadriculado', 'Quadriculado'], ['alfinete', 'Alfinete'], ['rasgado', 'Borda rasgada'], ['kraft', 'Papel kraft'], ['clipe', 'Clipe'], ['destaque', 'Marca-texto']];
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
p.on('pageerror', (e) => erros.push(String(e)));
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const ta = () => p.locator('textarea.qd-edita');
for (const [, t] of TEX) { await p.keyboard.press('Escape'); await p.locator('[data-cmd="inserir.postit"]').first().click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(120); await p.keyboard.press('Escape'); }
/* em grade, 4 por linha, pela área do quadro */
const area = await p.locator('.qd-mundo >> xpath=..').first().boundingBox();
for (let i = 0; i < TEX.length; i++) {
  const b = await p.locator('.qi', { hasText: TEX[i][1].slice(0, 12) }).first().boundingBox();
  await p.mouse.move(b.x + b.width / 2, b.y + 8); await p.mouse.down();
  await p.mouse.move(area.x + 120 + (i % 4) * 230 + b.width / 2 - b.width / 2 + 85, area.y + 70 + Math.floor(i / 4) * 190 + 8, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(80);
}
await p.click('.tab:has-text("Página Inicial")');
const naLista = await p.evaluate(() => 0);
await p.locator('.qi').first().click(); await p.click('[data-menu-faixa=texturaQ]'); await p.waitForTimeout(100);
const itensMenu = await p.locator('.rb-lista [data-cmd^="formatar.textura|"]').count(); await p.keyboard.press('Escape');
caso('o menu Textura tem as 12 (Liso e mais 11)', itensMenu === 12, String(itensMenu + naLista));
for (const [id, t] of TEX) {
  if (!id) continue;
  await p.keyboard.press('Escape'); await p.locator('.qi', { hasText: t.slice(0, 12) }).first().click(); await p.waitForTimeout(60);
  await p.click('[data-menu-faixa=texturaQ]'); const op = p.locator(`.rb-lista [data-cmd="formatar.textura|${id}"]`);
  if (await op.count()) await op.first().click(); else await p.keyboard.press("Escape"); /* v0.6.63: a lista pode aparecer duas vezes (a da faixa e a do "Mais"); vale a primeira */
  await p.waitForTimeout(120);
}
const PECAS = { dobrado: '.qi-aba', amassado: '.qi-tex-papel', rasgado: '.qi-tex-papel', fita: '.qi-fita', alfinete: '.qi-alfinete', clipe: '.qi-clipe' };
for (const [id, t] of TEX) {
  const r = await p.locator('.qi', { hasText: t.slice(0, 12) }).first().evaluate((e, sel) => ({ cls: e.className, peca: sel ? !!e.querySelector(sel) : true }), PECAS[id] || '');
  caso(`tela: ${t.slice(0, 22)}`, r.cls.includes('qi-tex-' + (id || 'liso')) && r.peca, r.cls.split(' ').filter((x) => x.startsWith('qi-tex')).join(' '));
}
await p.keyboard.press('Escape'); await p.mouse.click(area.x + 20, area.y + area.height - 20); await p.waitForTimeout(800);
if (PASTA) await p.locator('.qd-mundo >> xpath=..').first().screenshot({ path: `${PASTA}/1-texturas-tela.png` });
/* o mesmo quadro pelo desenho do PDF */
const pacote = await build({ stdin: { contents: `import * as D from './src/quadro/desenho.js'; window.QD = D;`, resolveDir: FONTE_DIR, loader: 'js' }, bundle: true, write: false, format: 'iife', jsx: 'automatic', logLevel: 'silent' });
await p.waitForTimeout(1200);
const conteudo = await p.evaluate(() => new Promise((ok, erro) => {
  const r = indexedDB.open('efcdocs'); r.onerror = () => erro(r.error);
  r.onsuccess = () => { const t = r.result.transaction('arquivos').objectStore('arquivos').getAll(); t.onsuccess = async () => {
    const abrir = async (reg) => { if (reg.conteudo) return reg.conteudo; const pk = reg.pacote; if (!pk || !pk.dados) return null; const bin = Uint8Array.from(atob(pk.dados), (ch) => ch.charCodeAt(0)); const txt = await new Response(new Blob([bin]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); const j = JSON.parse(txt); return j.conteudo || j; };
    const lista = (await Promise.all(t.result.filter((a) => a.ficha && a.ficha.tipo === 'postits').map(abrir))).filter((c) => c && c.itens);
    ok(lista.sort((a, b) => Object.keys(b.itens).length - Object.keys(a.itens).length)[0]);
  }; };
}));
await p.addScriptTag({ content: pacote.outputFiles[0].text });
const png = await p.evaluate(async (c) => {
  await window.QD.fontesProntas(c); const imagens = await window.QD.carregarImagens(c);
  const its = Object.values(c.itens), mx = Math.min(...its.map((i) => i.x)) - 30, my = Math.min(...its.map((i) => i.y)) - 30;
  const Mx = Math.max(...its.map((i) => i.x + i.w)) + 30, My = Math.max(...its.map((i) => i.y + i.h)) + 30;
  const cv = document.createElement('canvas'); cv.width = (Mx - mx) * 2; cv.height = (My - my) * 2;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.scale(2, 2); g.translate(-mx, -my);
  const fontes = [], srcs = [];
  const ctxP = new Proxy(g, { get(o, k) { if (k === 'drawImage') return (img, ...a) => { srcs.push(img.src || ''); o.drawImage(img, ...a); }; if (k === 'fillText') return (t, ...a) => { fontes.push(String(t)); o.fillText(t, ...a); }; if (k === 'createPattern') return (img, rep) => { srcs.push(img.src || ''); return o.createPattern(img, rep); }; const v = o[k]; return typeof v === 'function' ? v.bind(o) : v; }, set(o, k, v) { o[k] = v; return true; } });
  window.QD.desenharQuadro(ctxP, c, { codigos: true, imagens, c });
  const its2 = Object.values(c.itens), de = (tex) => its2.find((i) => (i.tex || '') === tex);
  const px = (x, y) => [...g.getImageData(Math.round((x - mx) * 2), Math.round((y - my) * 2), 1, 1).data];
  const alf = de('alfinete'), ras = de('rasgado');
  return { png: cv.toDataURL('image/png'), srcs, alfinete: px(alf.x + alf.w / 2, alf.y - 2), rasgado: [px(ras.x + ras.w * 0.97, ras.y + ras.h - 1), px(ras.x + ras.w * 0.5, ras.y + ras.h * 0.5)] };
}, conteudo);
if (PASTA) writeFileSync(`${PASTA}/2-texturas-pdf.png`, Buffer.from(png.png.split(',')[1], 'base64'));
for (const n of ['grao', 'amassado', 'cafe', 'kraft']) caso(`PDF: usa a imagem ${n}.png`, png.srcs.some((s) => s.includes('texturas/' + n + '.png')));
caso('PDF: o alfinete vermelho sai por cima da borda', png.alfinete[0] > 150 && png.alfinete[1] < 90, String(png.alfinete));
caso('PDF: a borda rasgada recorta o pé do papel', png.rasgado[0][1] - png.rasgado[1][1] > 5, String(png.rasgado));
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
