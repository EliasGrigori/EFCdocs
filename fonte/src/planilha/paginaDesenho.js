/* EFCdocs v0.6.0 — desenho das páginas impressas da planilha.
   paginar() diz quais linhas e colunas vão em cada página; aqui cada página vira uma lista de traços
   (retângulo, linha, texto, imagem) que serve para a prévia (SVG), para Imprimir (SVG) e para o PDF (vetor). */
import { PX_PT, textoCampos, CM } from './impressao.js';
import { letraCol } from './ref.js';
import { larguraHelvetica } from './impressaoPdf.js';

const largTexto = (t, pt, b) => larguraHelvetica(t, pt, b);
/* na tela a letra é pt*(4/3)*0,9 px dentro da coluna; no papel a mesma proporção evita ####/corte que só aparecia no PDF */
const FATOR_FONTE = 0.9;
const corOk = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : null);

/**
 * fonte: { tamCol(c), tamLin(l), celula(l, c) → { t, al, e, vazio } , mescla(l, c) → { l1,c1,l2,c2 } | null,
 *          objetos: [{ l, c, dx, dy, w, h, svg }], aba, arquivo, agora }
 * Devolve [{ W, H, ops }]
 */
export function desenharPaginas(pg, fonte) {
  const { imp, esc, util } = pg;
  const total = pg.paginas.length;
  return pg.paginas.map((p, n) => {
    const ops = [];
    const { W, H } = util;
    const tc = (c) => fonte.tamCol(c) * PX_PT * esc, tl = (l) => fonte.tamLin(l) * PX_PT * esc;
    const larg = p.cols.reduce((a, c) => a + tc(c), 0), alt = p.lins.reduce((a, l) => a + tl(l), 0);
    const tw = imp.titulos ? pg.extraTit.w * esc : 0, th = imp.titulos ? pg.extraTit.h * esc : 0;
    let x0 = util.x0 + tw, y0 = util.y0 + th;
    if (imp.centH) x0 += Math.max(0, (util.w - tw - larg) / 2);
    if (imp.centV) y0 += Math.max(0, (util.h - th - alt) / 2);
    /* posições */
    const xs = new Map(), ys = new Map();
    let x = x0; for (const c of p.cols) { xs.set(c, x); x += tc(c); }
    let y = y0; for (const l of p.lins) { ys.set(l, y); y += tl(l); }
    const xFim = x, yFim = y;
    /* títulos de linha e coluna (A B C / 1 2 3) */
    if (imp.titulos) {
      const fs = 8 * Math.max(0.6, esc);
      ops.push({ k: 'rect', x: x0 - tw, y: y0 - th, w: tw + larg, h: th, fill: '#f2f4f7' }, { k: 'rect', x: x0 - tw, y: y0, w: tw, h: alt, fill: '#f2f4f7' });
      for (const c of p.cols) ops.push({ k: 'text', x: xs.get(c) + tc(c) / 2, y: y0 - th / 2 + fs * 0.35, t: letraCol(c), size: fs, cor: '#5b6b76', anchor: 'middle' });
      for (const l of p.lins) ops.push({ k: 'text', x: x0 - tw / 2, y: ys.get(l) + tl(l) / 2 + fs * 0.35, t: String(l + 1), size: fs, cor: '#5b6b76', anchor: 'middle' });
    }
    /* células: fundo, grade, texto, bordas (mescladas como uma célula só) */
    const feitas = new Set();
    const textos = [], bordas = [];
    for (const l of p.lins) for (const c of p.cols) {
      const m = fonte.mescla(l, c);
      let cx = xs.get(c), cy = ys.get(l), cw = tc(c), ch = tl(l);
      let L = l, C = c;
      if (m) {
        const k = m.l1 + ':' + m.c1;
        if (feitas.has(k)) continue;
        feitas.add(k);
        L = m.l1; C = m.c1;
        /* a mescla pode começar antes desta página: usa só o pedaço que aparece */
        const lsM = p.lins.filter((q) => q >= m.l1 && q <= m.l2), csM = p.cols.filter((q) => q >= m.c1 && q <= m.c2);
        cx = xs.get(csM[0]); cy = ys.get(lsM[0]);
        cw = csM.reduce((a, q) => a + tc(q), 0); ch = lsM.reduce((a, q) => a + tl(q), 0);
      }
      const cel = fonte.celula(L, C);
      const e = cel.e || {};
      if (corOk(e.fundo)) ops.push({ k: 'rect', x: cx, y: cy, w: cw, h: ch, fill: e.fundo });
      if (imp.grade) ops.push({ k: 'rectL', x: cx, y: cy, w: cw, h: ch, cor: '#c9d1d9', w2: 0.4 });
      if (e.bd) bordas.push({ e, x: cx, y: cy, w: cw, h: ch });
      const cantoAqui = !m || (p.lins.includes(m.l1) && p.cols.includes(m.c1));
      if (cantoAqui && cel.t !== '' && cel.t != null) textos.push({ cel, e, x: cx, y: cy, w: cw, h: ch, l, c, m });
    }
    /* texto: transborda para as vizinhas vazias (à esquerda/direita), como no Excel; com quebra, fica na célula */
    const vazia = (l, c) => { const q = fonte.celula(l, c); return !q.t && !fonte.mescla(l, c); };
    for (const tx of textos) {
      const { cel, e } = tx;
      const pt = (e.tam || 11) * esc * FATOR_FONTE;
      const cor = corOk(cel.cor) || corOk(e.cor) || '#000000';
      const pad = 2 * esc;
      const base = { size: pt, bold: !!e.b, italic: !!e.i, cor, under: !!e.u, strike: !!e.st };
      if (e.qb || String(cel.t).includes('\n')) {
        const linhas = quebrar(String(cel.t), tx.w - pad * 2, pt, e.b);
        const alturaL = pt * 1.2;
        const tot = linhas.length * alturaL;
        let yy = e.av === 't' ? tx.y + pad + pt : e.av === 'm' || e.av === 'c' ? tx.y + (tx.h - tot) / 2 + pt * 0.95 : tx.y + tx.h - tot - pad + pt;
        for (const ln of linhas) {
          const xx = cel.al === 'c' ? tx.x + tx.w / 2 : cel.al === 'd' ? tx.x + tx.w - pad : tx.x + pad;
          ops.push({ k: 'text', x: xx, y: yy, t: ln, anchor: cel.al === 'c' ? 'middle' : cel.al === 'd' ? 'end' : 'start', clip: { x: tx.x, y: tx.y, w: tx.w, h: tx.h }, ...base });
          yy += alturaL;
        }
        continue;
      }
      let cx1 = tx.x, cx2 = tx.x + tx.w;
      const precisa = largTexto(cel.t, pt, e.b) + pad * 2;
      if (!tx.m && precisa > tx.w && typeof cel.v === 'string') {
        const idx = p.cols.indexOf(tx.c);
        if (cel.al !== 'd') for (let k = idx + 1; k < p.cols.length && cx2 - tx.x < precisa; k++) { if (!vazia(tx.l, p.cols[k])) break; cx2 += tc(p.cols[k]); }
        if (cel.al === 'd' || cel.al === 'c') for (let k = idx - 1; k >= 0 && cx2 - cx1 < precisa; k--) { if (!vazia(tx.l, p.cols[k])) break; cx1 -= tc(p.cols[k]); }
      }
      const yy = e.av === 't' ? tx.y + pad + pt * 0.85 : e.av === 'm' || e.av === 'c' ? tx.y + tx.h / 2 + pt * 0.35 : tx.y + tx.h - pad - pt * 0.12;
      /* número ou data que não cabe: encolhe a letra até 70%; só então vira ### (como no Excel) */
      let t = String(cel.t);
      if (typeof cel.v === 'number' && precisa > tx.w) {
        const util2 = tx.w - pad * 2;
        const f = Math.max(0.7, util2 / Math.max(1, largTexto(t, pt, e.b)));
        if (largTexto(t, pt * f, e.b) <= util2 + 0.01) base.size = pt * f;
        else t = '#'.repeat(Math.max(1, Math.floor(util2 / (pt * 0.55))));
      }
      const xx = cel.al === 'c' ? (cx1 + cx2) / 2 : cel.al === 'd' ? cx2 - pad : cx1 + pad;
      ops.push({ k: 'text', x: xx, y: yy, t, anchor: cel.al === 'c' ? 'middle' : cel.al === 'd' ? 'end' : 'start', clip: { x: cx1, y: tx.y, w: cx2 - cx1, h: tx.h }, ...base });
    }
    for (const b of bordas) {
      const cor = corOk(b.e.bdc) || '#000000';
      const ww = (k) => (b.e.bd[k] === 3 ? 2.2 : b.e.bd[k] === 2 ? 1.4 : 0.6) * Math.max(0.6, esc);
      if (b.e.bd.t) ops.push({ k: 'line', x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y, cor, w: ww('t') });
      if (b.e.bd.b) ops.push({ k: 'line', x1: b.x, y1: b.y + b.h, x2: b.x + b.w, y2: b.y + b.h, cor, w: ww('b') });
      if (b.e.bd.l) ops.push({ k: 'line', x1: b.x, y1: b.y, x2: b.x, y2: b.y + b.h, cor, w: ww('l') });
      if (b.e.bd.r) ops.push({ k: 'line', x1: b.x + b.w, y1: b.y, x2: b.x + b.w, y2: b.y + b.h, cor, w: ww('r') });
    }
    /* gráficos e assinaturas que caem nesta página (posição pela célula em que estão presos) */
    for (const o of fonte.objetos || []) {
      const pos = posObjeto(o, p, xs, ys, tc, tl, fonte, esc);
      if (!pos) continue;
      ops.push({ k: 'img', ...pos, svg: o.svg, clip: { x: x0, y: y0, w: xFim - x0, h: yFim - y0 } });
    }
    /* cabeçalho e rodapé */
    const campos = { pagina: n + 1, paginas: total, aba: fonte.aba, arquivo: fonte.arquivo, agora: fonte.agora };
    const fsC = 9;
    const linhaCR = (q, yy) => {
      if (q.e) ops.push({ k: 'text', x: util.x0, y: yy, t: textoCampos(q.e, campos), size: fsC, cor: '#333333', anchor: 'start' });
      if (q.c) ops.push({ k: 'text', x: W / 2, y: yy, t: textoCampos(q.c, campos), size: fsC, cor: '#333333', anchor: 'middle' });
      if (q.d) ops.push({ k: 'text', x: util.x0 + util.w, y: yy, t: textoCampos(q.d, campos), size: fsC, cor: '#333333', anchor: 'end' });
    };
    linhaCR(imp.cab, imp.marg.cab * CM + fsC);
    linhaCR(imp.rod, H - imp.marg.rod * CM);
    return { W, H, ops, n: n + 1 };
  });
}

function posObjeto(o, p, xs, ys, tc, tl, fonte, esc) {
  /* x do canto: soma das colunas desde a primeira da página até a coluna do objeto */
  const c0 = p.cols[p.nRepC] ?? p.cols[0], l0 = p.lins[p.nRepL] ?? p.lins[0];
  if (c0 == null || l0 == null) return null;
  const baseX = xs.get(c0), baseY = ys.get(l0);
  let dxPx = 0;
  if (o.c >= c0) for (let k = c0; k < o.c; k++) dxPx += fonte.tamCol(k); else for (let k = o.c; k < c0; k++) dxPx -= fonte.tamCol(k);
  let dyPx = 0;
  if (o.l >= l0) for (let k = l0; k < o.l; k++) dyPx += fonte.tamLin(k); else for (let k = o.l; k < l0; k++) dyPx -= fonte.tamLin(k);
  const x = baseX + (dxPx + o.dx) * PX_PT * esc, y = baseY + (dyPx + o.dy) * PX_PT * esc;
  const w = o.w * PX_PT * esc, h = o.h * PX_PT * esc;
  const ultC = p.cols[p.cols.length - 1], ultL = p.lins[p.lins.length - 1];
  const xFim = xs.get(ultC) + tc(ultC), yFim = ys.get(ultL) + tl(ultL);
  if (x >= xFim || y >= yFim || x + w <= baseX || y + h <= baseY) return null;
  return { x, y, w, h };
}

function quebrar(t, w, pt, b) {
  const out = [];
  for (const par of t.split('\n')) {
    let linha = '';
    for (const pal of par.split(/(\s+)/)) {
      if (largTexto(linha + pal, pt, b) > w && linha.trim()) { out.push(linha.trimEnd()); linha = pal.trimStart(); } else linha += pal;
    }
    out.push(linha);
  }
  return out;
}

/* ---------- SVG (prévia e impressão) ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const r2 = (v) => Math.round(v * 100) / 100;
export function svgDaPagina(pag, { id = 'p' } = {}) {
  const partes = [];
  let nClip = 0;
  const defs = [];
  for (const o of pag.ops) {
    if (o.k === 'rect') partes.push(`<rect x="${r2(o.x)}" y="${r2(o.y)}" width="${r2(o.w)}" height="${r2(o.h)}" fill="${o.fill}"/>`);
    else if (o.k === 'rectL') partes.push(`<rect x="${r2(o.x)}" y="${r2(o.y)}" width="${r2(o.w)}" height="${r2(o.h)}" fill="none" stroke="${o.cor}" stroke-width="${o.w2}"/>`);
    else if (o.k === 'line') partes.push(`<line x1="${r2(o.x1)}" y1="${r2(o.y1)}" x2="${r2(o.x2)}" y2="${r2(o.y2)}" stroke="${o.cor}" stroke-width="${r2(o.w)}"/>`);
    else if (o.k === 'text') {
      let cp = '';
      if (o.clip) { const cid = `${id}c${nClip++}`; defs.push(`<clipPath id="${cid}"><rect x="${r2(o.clip.x)}" y="${r2(o.clip.y)}" width="${r2(o.clip.w)}" height="${r2(o.clip.h)}"/></clipPath>`); cp = ` clip-path="url(#${cid})"`; }
      const deco = [o.under ? 'underline' : '', o.strike ? 'line-through' : ''].filter(Boolean).join(' ');
      partes.push(`<text x="${r2(o.x)}" y="${r2(o.y)}" font-size="${r2(o.size)}"${o.bold ? ' font-weight="700"' : ''}${o.italic ? ' font-style="italic"' : ''} fill="${o.cor}" text-anchor="${o.anchor}"${deco ? ` text-decoration="${deco}"` : ''}${cp} xml:space="preserve">${esc(o.t)}</text>`);
    } else if (o.k === 'img') {
      const cid = `${id}c${nClip++}`;
      defs.push(`<clipPath id="${cid}"><rect x="${r2(o.clip.x)}" y="${r2(o.clip.y)}" width="${r2(o.clip.w)}" height="${r2(o.clip.h)}"/></clipPath>`);
      const inner = o.svg.replace(/ width="[\d.]+" height="[\d.]+"/, '').replace(/^<svg /, `<svg x="${r2(o.x)}" y="${r2(o.y)}" width="${r2(o.w)}" height="${r2(o.h)}" preserveAspectRatio="none" `);
      partes.push(`<g clip-path="url(#${cid})">${inner}</g>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r2(pag.W)} ${r2(pag.H)}" width="${r2(pag.W)}pt" height="${r2(pag.H)}pt" font-family="Helvetica, Arial, sans-serif"><rect width="100%" height="100%" fill="#ffffff"/><defs>${defs.join('')}</defs>${partes.join('')}</svg>`;
}
