/* Vértice Docs v0.6.57 — letras do quadro (5 letras OFL, baixadas só quando usadas) e texturas de papel do post-it
   (ponta dobrada, amassado e mancha de café). Confere na tela e no desenho do PDF (desenho.js da pasta indicada).
   Quadro novo com itens inventados. Falha na v0.6.56 (não há caixa Letra nem Textura) e passa na v0.6.57.
   Uso: node scripts/testar-estilo-quadro-v0657.mjs <endereço> [pasta-dos-prints] */
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const BASE = process.argv[2] || 'http://localhost:8731/';
const PRINTS = process.argv[3] || '';
const FONTE_DIR = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome';
const nav = await chromium.launch({ executablePath: CHROME });
const ctx = await nav.newContext({ viewport: { width: 1366, height: 800 }, reducedMotion: 'reduce', deviceScaleFactor: PRINTS ? 2 : 1 });
await ctx.addInitScript(() => { globalThis.EFC_MENU_FIXO = true; });
const p = await ctx.newPage();
const erros = [], pedidos = [];
p.on('pageerror', (e) => erros.push(String(e)));
p.on('request', (r) => { if (/\/assets\/(fontes|texturas)\//.test(r.url())) pedidos.push(r.url().replace(/^.*\/assets\//, '')); });
let falhas = 0;
const caso = (nome, ok, info = '') => { console.log(`${ok ? 'ok   ' : 'FALHA'} ${nome}${info ? ' — ' + info : ''}`); if (!ok) falhas++; };
const foto = async (nome, alvo) => { if (PRINTS) await (alvo ? p.locator(alvo).first().screenshot({ path: `${PRINTS}/${nome}.png` }) : p.screenshot({ path: `${PRINTS}/${nome}.png` })); };
await p.goto(BASE + '#/'); await p.click('.rail a[href="#/postits"]'); await p.click('[data-novo=postits]'); await p.waitForSelector('.qd-vazio');
const ta = () => p.locator('textarea.qd-edita');
const novo = async (cmd, t) => { await p.keyboard.press('Escape'); await p.locator(`[data-cmd="${cmd}"]`).first().click(); await ta().waitFor(); await ta().fill(t); await ta().press('Control+Enter'); await p.waitForTimeout(150); await p.keyboard.press('Escape'); };
const escolher = async (t) => { await p.keyboard.press('Escape'); await p.locator('.qi', { hasText: t }).first().click(); await p.waitForTimeout(120); };
await novo('inserir.postit', 'Separar as amostras do lote para o laboratório');
await novo('inserir.processo', 'Conferir o pH');
for (const t of ['Ponta dobrada', 'Amassado', 'Mancha de café']) await novo('inserir.postit', t);
caso('ao abrir o quadro, nenhuma letra extra é baixada', !pedidos.some((u) => u.startsWith('fontes/')), pedidos.join(' '));

/* Letra */
await p.click('.tab:has-text("Página Inicial")').catch(() => {});
await escolher('Separar as amostras');
const temCaixa = await p.locator('[data-cx=fonteQ]').count();
caso('Página Inicial do Quadro tem a caixa Letra', temCaixa === 1);
await foto('1-faixa', '.ribbon');
if (temCaixa) {
  await p.click('[data-cx=fonteQ]'); await p.waitForTimeout(600);
  caso('a lista mostra as 6 letras', (await p.locator('.rb-lista [data-valor^="formatar.fonteQ|"]').count()) === 6);
  await foto('2-lista-letras', '.rb-lista');
  await p.locator('.rb-lista [data-valor="formatar.fonteQ|Caveat"]').click(); await p.waitForTimeout(700);
  const fam = await p.locator('.qi', { hasText: 'Separar as amostras' }).first().evaluate((e) => getComputedStyle(e.querySelector('.qi-t')).fontFamily);
  caso('o post-it passa a usar a Caveat', /Caveat/.test(fam), fam);
  caso('a letra chegou (baixada na hora)', await p.evaluate(() => document.fonts.check('18px "Caveat"')) && pedidos.some((u) => u.startsWith('fontes/caveat')));
  caso('a caixa mostra "Caveat"', (await p.locator('[data-cx=fonteQ]').innerText()).includes('Caveat'));
  await escolher('Conferir o pH');
  await p.click('[data-cx=fonteQ]'); await p.locator('.rb-lista [data-valor="formatar.fonteQ|JetBrains Mono"]').click(); await p.waitForTimeout(500);
  caso('a forma também troca de letra', /JetBrains/.test(await p.locator('.qi', { hasText: 'Conferir o pH' }).first().evaluate((e) => getComputedStyle(e.querySelector('.qi-t')).fontFamily)));
  await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
  caso('Ctrl+Z volta para a letra padrão', !/JetBrains/.test(await p.locator('.qi', { hasText: 'Conferir o pH' }).first().evaluate((e) => getComputedStyle(e.querySelector('.qi-t')).fontFamily)));
}

/* Texturas */
const temMenu = await p.locator('[data-menu-faixa=texturaQ]').count();
caso('Página Inicial do Quadro tem o botão Textura', temMenu === 1);
const TEX = [['Ponta dobrada', 'dobrado'], ['Amassado', 'amassado'], ['Mancha de café', 'cafe']];
if (temMenu) {
  for (const [t, id] of TEX) {
    await escolher(t);
    await p.click('[data-menu-faixa=texturaQ]'); await p.waitForTimeout(150);
    if (id === 'cafe') await foto('3-lista-texturas', '.rb-lista');
    await p.locator(`.rb-lista [data-cmd="formatar.textura|${id}"]`).click(); await p.waitForTimeout(300);
    const m = await p.locator('.qi', { hasText: t }).first().evaluate((e) => ({ cls: e.className, bg: [e, ...e.querySelectorAll('.qi-tex-papel')].map((x) => getComputedStyle(x).backgroundImage).join(' '), aba: !!e.querySelector('.qi-aba') }));
    caso(`${t}: aparece no post-it`, m.cls.includes('qi-tex-' + id) && (id === 'dobrado' ? m.aba && /gradient/.test(m.bg) : m.bg.includes('texturas/' + id + '.png')), m.bg.slice(0, 80));
  }
  const ok = await p.evaluate(async () => (await Promise.all(['cafe', 'amassado'].map((t) => fetch('assets/texturas/' + t + '.png').then((r) => r.ok)))).every(Boolean));
  caso('as imagens das texturas existem no app', ok);
  await escolher('Amassado');
  await p.click('[data-menu-faixa=texturaQ]'); await p.locator('.rb-lista [data-cmd="formatar.textura|"]').click(); await p.waitForTimeout(250);
  caso('Liso tira a textura', (await p.locator('.qi', { hasText: 'Amassado' }).first().evaluate((e) => e.className)).includes('qi-tex-liso')); /* v0.6.62: o liso também tem papel (qi-tex-liso) */
  await p.keyboard.press('Control+z'); await p.waitForTimeout(250);
  caso('Ctrl+Z traz o amassado de volta', (await p.locator('.qi', { hasText: 'Amassado' }).first().evaluate((e) => e.className)).includes('qi-tex-amassado'));
}
await p.keyboard.press('Escape'); await p.waitForTimeout(800);
await foto('4-quadro', '.qd-mundo >> xpath=..');
if (PRINTS && temMenu) { /* as três texturas de perto */
  const caixas = await Promise.all(['Ponta dobrada', 'Amassado', 'Mancha de café'].map((t) => p.locator('.qi', { hasText: t }).first().boundingBox()));
  const x0 = Math.min(...caixas.map((b) => b.x)) - 16, y0 = Math.min(...caixas.map((b) => b.y)) - 16;
  const x1 = Math.max(...caixas.map((b) => b.x + b.width)) + 16, y1 = Math.max(...caixas.map((b) => b.y + b.height)) + 16;
  await p.screenshot({ path: `${PRINTS}/5-texturas-zoom.png`, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
}

/* PDF: o mesmo desenho.js, com o arquivo guardado no navegador */
if (temCaixa && temMenu) {
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
  const r = await p.evaluate(async (c) => {
    await window.QD.fontesProntas(c);
    const imagens = await window.QD.carregarImagens(c);
    const cv = document.createElement('canvas'); cv.width = 3000; cv.height = 2000;
    const real = cv.getContext('2d'), fontes = [], imgs = [];
    const ctx = new Proxy(real, { get(o, k) {
      if (k === 'fillText') return (t, x, y) => { fontes.push([String(t), o.font]); o.fillText(t, x, y); };
      if (k === 'drawImage') return (img, ...a) => { imgs.push(img.src || ''); o.drawImage(img, ...a); };
      const v = o[k]; return typeof v === 'function' ? v.bind(o) : v; }, set(o, k, v) { o[k] = v; return true; } });
    window.QD.desenharQuadro(ctx, c, { codigos: true, imagens });
    const dob = Object.values(c.itens).find((i) => i.tex === 'dobrado');
    const px = real.getImageData(Math.round(dob.x + dob.w - 2), Math.round(dob.y + dob.h - 2), 1, 1).data;
    const meio = real.getImageData(Math.round(dob.x + dob.w / 2), Math.round(dob.y + 6), 1, 1).data;
    const its = Object.values(c.itens), mx = Math.min(...its.map((i) => i.x)) - 20, my = Math.min(...its.map((i) => i.y)) - 20;
    const Mx = Math.max(...its.map((i) => i.x + i.w)) + 20, My = Math.max(...its.map((i) => i.y + i.h)) + 20;
    const out = document.createElement('canvas'); out.width = (Mx - mx) * 2; out.height = (My - my) * 2;
    const o2 = out.getContext('2d'); o2.fillStyle = '#fff'; o2.fillRect(0, 0, out.width, out.height); o2.scale(2, 2); o2.translate(-mx, -my);
    window.QD.desenharQuadro(o2, c, { codigos: true, imagens });
    return { fontes, imgs, canto: [...px], meio: [...meio], caveat: document.fonts.check('18px "Caveat"'), png: out.toDataURL('image/png') };
  }, conteudo);
  if (PRINTS) (await import('node:fs')).writeFileSync(`${PRINTS}/6-pdf.png`, Buffer.from(r.png.split(',')[1], 'base64'));
  const doPostit = r.fontes.filter(([t]) => /Separar|amostras|lote|laborat/.test(t));
  caso('PDF: o post-it sai na Caveat', doPostit.length > 0 && doPostit.every(([, f]) => /Caveat/.test(f)), doPostit.map((x) => x[1]).join(' | ').slice(0, 120));
  caso('PDF: a mancha de café e o amassado entram como imagem', r.imgs.some((s) => s.includes('texturas/cafe.png')) && r.imgs.some((s) => s.includes('texturas/amassado.png')));
  caso('PDF: o canto dobrado fica recortado (o papel não chega no canto)', Math.abs(r.canto[2] - r.meio[2]) > 40 && r.meio[3] > 200 /* o canto mostra o fundo da folha, não o amarelo do papel */, `canto ${r.canto} · meio ${r.meio}`);
}
caso('sem erro na página', erros.length === 0, erros.join(' | '));
await nav.close();
console.log(falhas ? `FIM: ${falhas} falha(s)` : 'FIM: tudo certo');
process.exit(falhas ? 1 : 0);
