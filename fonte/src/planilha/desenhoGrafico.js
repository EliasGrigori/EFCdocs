/* EFCdocs v0.6.0 — desenho dos gráficos em SVG (texto), sem biblioteca.
   O mesmo SVG serve para a tela, a impressão/PDF e a imagem que vai no Excel quando o tipo não existe lá. */
import { PALETA_GRAFICO, COR_FORA, COR_MEDIA, pareto, cartaControle, histograma, escala, numeroCurto, NOME_TIPO } from './graficos.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const r1 = (v) => Math.round(v * 10) / 10;
const larguraTexto = (t, px = 11) => String(t).length * px * 0.56;
const corte = (t, max) => { t = String(t); return t.length > max ? t.slice(0, Math.max(1, max - 1)) + '…' : t; };

export const TEMA_CLARO = { texto: '#1f2d36', fraco: '#5b6b76', grade: '#e3e8ed', eixo: '#b9c3cc', fundo: '#ffffff' };
export const TEMA_ESCURO = { texto: '#e6edf3', fraco: '#a9b6c3', grade: '#2b3746', eixo: '#4a5a6c', fundo: '#18202a' };

/** Monta as séries que vão para a tela, já com as contas de Pareto, carta de controle e histograma. */
export function prepararSeries(g, d) {
  const cores = g.op.cores && g.op.cores.length ? [...g.op.cores, ...PALETA_GRAFICO] : PALETA_GRAFICO;
  const t = g.t;
  if (t === 'pareto') {
    const p = pareto(d);
    return { cats: p.cats, barras: [{ nome: (d.series[0] && d.series[0].nome) || 'Quantidade', vals: p.vals, cor: cores[0] }], linhas: [{ nome: '% acumulado', vals: p.acum, cor: cores[1], dir: true, pct: true }], ref: [{ v: 80, dir: true, cor: cores[1], rot: '80%' }] };
  }
  if (t === 'controle') {
    const s = d.series[0] || { nome: 'Valor', vals: [] };
    const k = cartaControle(s.vals, g.op);
    const ref = [
      { v: k.lsc, cor: COR_FORA, rot: 'LSC ' + numeroCurto(k.lsc), tr: true },
      { v: k.media, cor: COR_MEDIA, rot: 'Média ' + numeroCurto(k.media) },
      { v: k.lic, cor: COR_FORA, rot: 'LIC ' + numeroCurto(k.lic), tr: true },
    ];
    if (typeof g.op.meta === 'number') ref.push({ v: g.op.meta, cor: '#d79a22', rot: 'Meta ' + numeroCurto(g.op.meta), tr: true });
    return { cats: d.cats, barras: [], linhas: [{ nome: s.nome, vals: s.vals, cor: cores[0], marcas: true, fora: k.fora }], ref, carta: k };
  }
  if (t === 'histograma') {
    const h = histograma(d.series.flatMap((s) => s.vals));
    return { cats: h.cats, barras: [{ nome: 'Frequência', vals: h.vals, cor: cores[0] }], linhas: [], ref: [], colado: true };
  }
  const ser = d.series.map((s, i) => ({ ...s, cor: cores[i % cores.length] }));
  const ref = typeof g.op.meta === 'number' ? [{ v: g.op.meta, cor: '#d79a22', rot: 'Meta ' + numeroCurto(g.op.meta), tr: true }] : [];
  if (t === 'combinado') {
    const [b0, ...ls] = ser;
    const maxB = Math.max(0, ...((b0 && b0.vals) || []).filter((v) => v != null));
    const maxL = Math.max(0, ...ls.flatMap((s) => s.vals).filter((v) => v != null));
    const dir = maxB && maxL && (maxB / maxL > 5 || maxL / maxB > 5);
    return { cats: d.cats, barras: b0 ? [b0] : [], linhas: ls.map((s) => ({ ...s, dir, marcas: true })), ref };
  }
  if (t === 'linha' || t === 'area') return { cats: d.cats, barras: [], linhas: ser.map((s) => ({ ...s, marcas: d.cats.length <= 40, area: t === 'area' })), ref };
  return { cats: d.cats, barras: ser, linhas: [], ref };
}

/** SVG do gráfico (texto). d = dadosDaFaixa(...) */
export function svgDoGrafico(g, d, { w = 480, h = 300, tema = TEMA_CLARO, mini = false } = {}) {
  const T = tema;
  const fs = mini ? 8 : Math.max(10, Math.min(13, Math.round(Math.min(w, h) / 26)));
  const pad = mini ? 4 : 12;
  const partes = [];
  const add = (s) => partes.push(s);
  let topo = pad;
  if (g.titulo && !mini) { add(`<text x="${w / 2}" y="${topo + fs + 3}" text-anchor="middle" font-size="${fs + 3}" font-weight="700" fill="${T.texto}">${esc(corte(g.titulo, Math.floor(w / (fs * 0.62))))}</text>`); topo += fs + 12; }
  const vazio = !d.series.length;
  if (vazio) {
    add(`<text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-size="${fs}" fill="${T.fraco}">Escolha células com números para o gráfico</text>`);
    return envolver(partes, w, h, T, g);
  }
  if (g.t === 'pizza' || g.t === 'rosca') { pizza(g, d, { w, h, topo, pad, fs, T, mini, add }); return envolver(partes, w, h, T, g); }

  const S = prepararSeries(g, d);
  const disp0 = g.t === 'dispersao';
  const coresG = g.op.cores && g.op.cores.length ? [...g.op.cores, ...PALETA_GRAFICO] : PALETA_GRAFICO;
  let legItens = [];
  if (!mini && g.op.legenda !== 'nao') {
    legItens = disp0
      ? d.series.slice(1).map((s, k) => ({ nome: s.nome, cor: coresG[k % coresG.length] }))
      : [...S.barras, ...S.linhas].map((s) => ({ nome: s.nome, cor: s.cor, linha: S.linhas.includes(s) }));
    if (g.t === 'controle') legItens = legItens.concat((S.ref || []).filter((r) => r.rot).map((r) => ({ nome: r.rot.split(' ')[0], cor: r.cor, traco: r.tr, linha: true })));
  }
  const legDir = g.op.legenda === 'dir' && w > 360;
  const legLarg = legDir ? Math.min(140, Math.max(...legItens.map((i) => larguraTexto(i.nome, fs))) + 26) : 0;
  const legAlt = !legDir && legItens.length ? fs + 10 : 0;

  /* escalas */
  const horiz = g.t === 'barras';
  const disp = g.t === 'dispersao';
  const empilha = g.op.empilhado && (g.t === 'colunas' || g.t === 'barras' || g.t === 'area');
  const valsEsq = [];
  if (empilha) {
    const n = S.cats.length;
    for (let i = 0; i < n; i++) { let pos = 0, neg = 0; for (const s of [...S.barras, ...S.linhas]) { const v = s.vals[i]; if (v > 0) pos += v; else if (v < 0) neg += v; } valsEsq.push(pos, neg); }
  } else {
    for (const s of S.barras) valsEsq.push(...s.vals);
    for (const s of S.linhas) if (!s.dir) valsEsq.push(...s.vals);
  }
  for (const r of S.ref || []) if (!r.dir) valsEsq.push(r.v);
  if (disp) valsEsq.length = 0, d.series.slice(1).forEach((s) => valsEsq.push(...s.vals));
  const nums = valsEsq.filter((v) => typeof v === 'number' && Number.isFinite(v));
  let mn = Math.min(...nums), mx = Math.max(...nums);
  if (S.barras.length || g.t === 'area') { mn = Math.min(0, mn); mx = Math.max(0, mx); }
  if (g.t === 'controle') { const fol = (mx - mn) * 0.08 || 1; mn -= fol; mx += fol; }
  const E = escala(mn, mx, mini ? 3 : Math.max(3, Math.round(h / 60)));
  const temDir = S.linhas.some((s) => s.dir);
  const linhasDir = S.linhas.filter((s) => s.dir);
  const pctDir = linhasDir.some((s) => s.pct);
  const ED = temDir ? (pctDir ? { min: 0, max: 100, ticks: [0, 20, 40, 60, 80, 100] } : escala(Math.min(0, ...linhasDir.flatMap((s) => s.vals).filter((v) => v != null)), Math.max(...linhasDir.flatMap((s) => s.vals).filter((v) => v != null)), 5)) : null;
  const fmtE = (v) => numeroCurto(v);
  const fmtD = (v) => (pctDir ? v + '%' : numeroCurto(v));

  /* margens */
  const rotY = mini ? 0 : Math.max(...E.ticks.map((v) => larguraTexto(fmtE(v), fs - 1))) + 8 + (g.op.eixoY ? fs + 4 : 0);
  const rotYd = temDir && !mini ? Math.max(...ED.ticks.map((v) => larguraTexto(fmtD(v), fs - 1))) + 8 : 0;
  const nCat = disp ? 0 : S.cats.length;
  let x0 = pad + (horiz ? Math.min(w * 0.32, Math.max(...S.cats.map((c) => larguraTexto(c, fs - 1))) + 8) : rotY);
  const x1 = w - pad - legLarg - rotYd;
  let espCat = ((horiz ? (h - topo - pad - legAlt - 20) : (x1 - x0)) / Math.max(1, nCat));
  const girar = !horiz && !disp && !mini && S.cats.some((c) => larguraTexto(c, fs - 1) > espCat - 4);
  const altRotX = mini ? 0 : girar ? Math.min(60, Math.max(...S.cats.map((c) => larguraTexto(corte(c, 14), fs - 1))) * 0.6 + 12) : fs + 8;
  const y0 = topo + 4, y1 = h - pad - legAlt - altRotX - (g.op.eixoX && !mini ? fs + 4 : 0);
  if (horiz) x0 = Math.max(x0, pad + 30);
  if (girar) x0 = Math.max(x0, pad + Math.min(48, Math.max(...S.cats.map((c) => larguraTexto(corte(c, 14), fs - 1))) * 0.8));
  if (!horiz) espCat = (x1 - x0) / Math.max(1, nCat);

  const yDe = (v) => y1 - ((v - E.min) / (E.max - E.min || 1)) * (y1 - y0);
  const yDeD = (v) => y1 - ((v - ED.min) / (ED.max - ED.min || 1)) * (y1 - y0);
  const xDeV = (v) => x0 + ((v - E.min) / (E.max - E.min || 1)) * (x1 - x0); // barras deitadas

  /* grade e eixos */
  add(`<g font-size="${fs - 1}" fill="${T.fraco}">`);
  if (horiz) {
    for (const v of E.ticks) { const x = r1(xDeV(v)); add(`<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}" stroke="${T.grade}"/>`); if (!mini) add(`<text x="${x}" y="${y1 + fs + 2}" text-anchor="middle">${esc(fmtE(v))}</text>`); }
  } else {
    for (const v of E.ticks) { const y = r1(yDe(v)); add(`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${v === 0 ? T.eixo : T.grade}"/>`); if (!mini) add(`<text x="${x0 - 6}" y="${y + 4}" text-anchor="end">${esc(fmtE(v))}</text>`); }
    if (temDir && !mini) for (const v of ED.ticks) add(`<text x="${x1 + 6}" y="${r1(yDeD(v)) + 4}">${esc(fmtD(v))}</text>`);
  }
  add('</g>');

  if (disp) {
    dispersao(d, { x0, x1, y0, y1, yDe, fs, T, mini, add, g });
  } else {
    /* categorias */
    const cx = (i) => x0 + espCat * (i + 0.5);
    const cy = (i) => y0 + espCat * (i + 0.5);
    if (!mini) {
      add(`<g font-size="${fs - 1}" fill="${T.fraco}">`);
      const pulo = Math.max(1, Math.ceil(nCat / Math.max(1, Math.floor((horiz ? (y1 - y0) : (x1 - x0)) / (horiz ? fs + 4 : girar ? fs * 1.9 : 34)))));
      S.cats.forEach((c, i) => {
        if (i % pulo) return;
        if (horiz) add(`<text x="${x0 - 6}" y="${r1(cy(i)) + 4}" text-anchor="end">${esc(corte(c, 22))}</text>`);
        else if (girar) add(`<text transform="translate(${r1(cx(i))},${y1 + 8}) rotate(-35)" text-anchor="end">${esc(corte(c, 14))}</text>`);
        else add(`<text x="${r1(cx(i))}" y="${y1 + fs + 3}" text-anchor="middle">${esc(c)}</text>`);
      });
      add('</g>');
    }
    /* barras */
    const nb = S.barras.length;
    if (nb) {
      const grupo = espCat * (S.colado ? 0.98 : 0.72);
      const bw = empilha ? grupo : grupo / nb;
      const base = empilha ? new Array(nCat).fill(0) : null;
      const baseN = empilha ? new Array(nCat).fill(0) : null;
      S.barras.forEach((s, k) => {
        add(`<g fill="${s.cor}">`);
        s.vals.forEach((v, i) => {
          if (v == null) return;
          let a = 0, b = v;
          if (empilha) { if (v >= 0) { a = base[i]; b = base[i] + v; base[i] = b; } else { a = baseN[i]; b = baseN[i] + v; baseN[i] = b; } }
          if (horiz) {
            const y = cy(i) - grupo / 2 + (empilha ? 0 : k * bw);
            const xa = xDeV(Math.min(a, b)), xb = xDeV(Math.max(a, b));
            add(`<rect x="${r1(xa)}" y="${r1(y)}" width="${r1(Math.max(1, xb - xa))}" height="${r1(Math.max(1, bw - 1))}" rx="2"/>`);
            if (g.op.rotulos && !mini) add(`<text x="${r1(xb + 4)}" y="${r1(y + bw / 2 + 4)}" font-size="${fs - 1}" fill="${T.texto}">${esc(numeroCurto(v))}</text>`);
          } else {
            const x = cx(i) - grupo / 2 + (empilha ? 0 : k * bw);
            const ya = yDe(Math.max(a, b)), yb = yDe(Math.min(a, b));
            add(`<rect x="${r1(x)}" y="${r1(ya)}" width="${r1(Math.max(1, bw - (S.colado ? 0.5 : 1)))}" height="${r1(Math.max(1, yb - ya))}" rx="${S.colado ? 0 : 2}"/>`);
            if (g.op.rotulos && !mini) add(`<text x="${r1(x + bw / 2)}" y="${r1(ya - 4)}" text-anchor="middle" font-size="${fs - 1}" fill="${T.texto}">${esc(numeroCurto(v))}</text>`);
          }
        });
        add('</g>');
      });
    }
    /* linhas */
    S.linhas.forEach((s) => {
      const yf = s.dir ? yDeD : yDe;
      const pts = s.vals.map((v, i) => (v == null ? null : [r1(cx(i)), r1(yf(v))]));
      const segs = [];
      let atual = [];
      for (const p of pts) { if (p) atual.push(p); else if (atual.length) { segs.push(atual); atual = []; } }
      if (atual.length) segs.push(atual);
      for (const sg of segs) {
        if (s.area) add(`<path d="M${sg[0][0]},${r1(yDe(Math.max(E.min, 0)))}L${sg.map((p) => p.join(',')).join('L')}L${sg[sg.length - 1][0]},${r1(yDe(Math.max(E.min, 0)))}Z" fill="${s.cor}" fill-opacity=".18"/>`);
        add(`<polyline points="${sg.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${s.cor}" stroke-width="${mini ? 1.5 : 2.2}" stroke-linejoin="round" stroke-linecap="round"/>`);
      }
      if (s.marcas && !mini) pts.forEach((p, i) => { if (!p) return; const f = s.fora && s.fora[i]; add(`<circle cx="${p[0]}" cy="${p[1]}" r="${f ? 4.5 : 3}" fill="${f ? COR_FORA : T.fundo}" stroke="${f ? COR_FORA : s.cor}" stroke-width="2"/>`); });
      if (g.op.rotulos && !mini) s.vals.forEach((v, i) => { if (v == null) return; add(`<text x="${r1(cx(i))}" y="${r1(yf(v) - 8)}" text-anchor="middle" font-size="${fs - 1}" fill="${T.texto}">${esc(s.pct ? Math.round(v) + '%' : numeroCurto(v))}</text>`); });
    });
  }
  /* linhas de referência (meta, LSC, média, LIC, 80% do Pareto) */
  for (const r of S.ref || []) {
    const y = r1(r.dir ? yDeD(r.v) : yDe(r.v));
    if (!(y >= y0 - 1 && y <= y1 + 1)) continue;
    add(`<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="${r.cor}" stroke-width="1.5"${r.tr || r.dir ? ' stroke-dasharray="6 4"' : ''}/>`);
    if (r.rot && !mini) add(`<text x="${x1 - 4}" y="${y - 4}" text-anchor="end" font-size="${fs - 1}" font-weight="600" fill="${r.cor}">${esc(r.rot)}</text>`);
  }
  /* títulos dos eixos */
  if (!mini && g.op.eixoY) add(`<text transform="translate(${pad + fs / 2 + 2},${(y0 + y1) / 2}) rotate(-90)" text-anchor="middle" font-size="${fs - 1}" font-weight="600" fill="${T.fraco}">${esc(g.op.eixoY)}</text>`);
  if (!mini && g.op.eixoX) add(`<text x="${(x0 + x1) / 2}" y="${h - pad - legAlt - 2}" text-anchor="middle" font-size="${fs - 1}" font-weight="600" fill="${T.fraco}">${esc(g.op.eixoX)}</text>`);
  /* legenda */
  if (legItens.length) legenda(legItens, { legDir, x: legDir ? w - pad - legLarg + 8 : 0, y: legDir ? y0 : h - pad - fs + 2, w, fs, T, add });
  return envolver(partes, w, h, T, g);
}

function legenda(itens, { legDir, x, y, w, fs, T, add }) {
  const larg = itens.map((i) => larguraTexto(i.nome, fs) + 24);
  const total = larg.reduce((a, b) => a + b, 0);
  let cx = legDir ? x : Math.max(8, (w - total) / 2), cy = y;
  add(`<g font-size="${fs}" fill="${T.texto}">`);
  itens.forEach((it, i) => {
    if (it.linha || it.traco) add(`<line x1="${r1(cx)}" y1="${r1(cy - fs / 3)}" x2="${r1(cx + 14)}" y2="${r1(cy - fs / 3)}" stroke="${it.cor}" stroke-width="2.5"${it.traco ? ' stroke-dasharray="4 3"' : ''}/>`);
    else add(`<rect x="${r1(cx)}" y="${r1(cy - fs + 2)}" width="12" height="${fs - 2}" rx="2" fill="${it.cor}"/>`);
    add(`<text x="${r1(cx + 18)}" y="${r1(cy)}">${esc(it.nome)}</text>`);
    if (legDir) cy += fs + 8; else cx += larg[i];
  });
  add('</g>');
}

function pizza(g, d, { w, h, topo, pad, fs, T, mini, add }) {
  const s = d.series[0];
  const cores = g.op.cores && g.op.cores.length ? [...g.op.cores, ...PALETA_GRAFICO] : PALETA_GRAFICO;
  const itens = d.cats.map((c, i) => ({ nome: c, v: Math.max(0, s.vals[i] || 0), cor: cores[i % cores.length] })).filter((x) => x.v > 0);
  const tot = itens.reduce((a, x) => a + x.v, 0) || 1;
  const legDir = !mini && g.op.legenda !== 'nao' && w > h * 1.15;
  const legBaixo = !mini && g.op.legenda !== 'nao' && !legDir;
  const legLarg = legDir ? Math.min(w * 0.42, Math.max(...itens.map((x) => larguraTexto(x.nome, fs))) + 70) : 0;
  const altLeg = legBaixo ? Math.ceil(itens.length / Math.max(1, Math.floor((w - 2 * pad) / 130))) * (fs + 6) : 0;
  const cx = pad + (w - 2 * pad - legLarg) / 2, cy = topo + (h - topo - pad - altLeg) / 2;
  const R = Math.max(10, Math.min((w - 2 * pad - legLarg) / 2, (h - topo - pad - altLeg) / 2) - 4);
  const ri = g.t === 'rosca' ? R * 0.58 : 0;
  let a = -Math.PI / 2;
  for (const x of itens) {
    const da = (x.v / tot) * Math.PI * 2;
    const b = a + da;
    const p = (ang, r) => [r1(cx + Math.cos(ang) * r), r1(cy + Math.sin(ang) * r)];
    const grande = da > Math.PI ? 1 : 0;
    if (itens.length === 1) add(`<circle cx="${cx}" cy="${cy}" r="${R}" fill="${x.cor}"/>`);
    else if (ri) { const [ax, ay] = p(a, R), [bx, by] = p(b, R), [cx2, cy2] = p(b, ri), [dx, dy] = p(a, ri); add(`<path d="M${ax},${ay}A${R},${R} 0 ${grande} 1 ${bx},${by}L${cx2},${cy2}A${ri},${ri} 0 ${grande} 0 ${dx},${dy}Z" fill="${x.cor}" stroke="${T.fundo}" stroke-width="1.5"/>`); }
    else { const [ax, ay] = p(a, R), [bx, by] = p(b, R); add(`<path d="M${cx},${cy}L${ax},${ay}A${R},${R} 0 ${grande} 1 ${bx},${by}Z" fill="${x.cor}" stroke="${T.fundo}" stroke-width="1.5"/>`); }
    if (!mini && x.v / tot >= 0.05) { const [tx, ty] = p(a + da / 2, ri ? (R + ri) / 2 : R * 0.64); add(`<text x="${tx}" y="${ty + 4}" text-anchor="middle" font-size="${fs - 1}" font-weight="700" fill="#fff">${Math.round((x.v / tot) * 100)}%</text>`); }
    a = b;
  }
  if (ri && !mini) add(`<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="${fs + 2}" font-weight="700" fill="${T.texto}">${esc(numeroCurto(tot))}</text>`);
  if (legDir || legBaixo) {
    add(`<g font-size="${fs}" fill="${T.texto}">`);
    if (legDir) itens.forEach((x, i) => { const y = cy - (itens.length * (fs + 7)) / 2 + i * (fs + 7) + fs; const lx = w - pad - legLarg + 10; add(`<rect x="${lx}" y="${y - fs + 2}" width="12" height="${fs - 2}" rx="2" fill="${x.cor}"/><text x="${lx + 18}" y="${y}">${esc(corte(x.nome, 18))} <tspan fill="${T.fraco}">${esc(numeroCurto(x.v))}</tspan></text>`); });
    else { const porLinha = Math.max(1, Math.floor((w - 2 * pad) / 130)); itens.forEach((x, i) => { const lx = pad + (i % porLinha) * 130, y = h - pad - altLeg + Math.floor(i / porLinha) * (fs + 6) + fs; add(`<rect x="${lx}" y="${y - fs + 2}" width="12" height="${fs - 2}" rx="2" fill="${x.cor}"/><text x="${lx + 18}" y="${y}">${esc(corte(x.nome, 16))}</text>`); }); }
    add('</g>');
  }
}

function dispersao(d, { x0, x1, y0, y1, yDe, fs, T, mini, add, g }) {
  const xs = d.series[0].vals;
  const ex = escala(Math.min(...xs.filter((v) => v != null)), Math.max(...xs.filter((v) => v != null)), mini ? 3 : 5);
  const xDe = (v) => x0 + ((v - ex.min) / (ex.max - ex.min || 1)) * (x1 - x0);
  if (!mini) { add(`<g font-size="${fs - 1}" fill="${T.fraco}">`); for (const v of ex.ticks) add(`<text x="${r1(xDe(v))}" y="${y1 + fs + 3}" text-anchor="middle">${esc(numeroCurto(v))}</text>`); add('</g>'); }
  const cores = g.op.cores && g.op.cores.length ? [...g.op.cores, ...PALETA_GRAFICO] : PALETA_GRAFICO;
  d.series.slice(1).forEach((s, k) => {
    add(`<g fill="${cores[k % cores.length]}" fill-opacity=".85">`);
    s.vals.forEach((v, i) => { if (v == null || xs[i] == null) return; add(`<circle cx="${r1(xDe(xs[i]))}" cy="${r1(yDe(v))}" r="${mini ? 2 : 3.5}"/>`); });
    add('</g>');
  });
}

function envolver(partes, w, h, T, g) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Inter, 'Segoe UI', Arial, sans-serif" role="img" aria-label="${esc((NOME_TIPO[g.t] || 'Gráfico') + (g.titulo ? ': ' + g.titulo : ''))}"><rect width="${w}" height="${h}" fill="${T.fundo}"/>${partes.join('')}</svg>`;
}
