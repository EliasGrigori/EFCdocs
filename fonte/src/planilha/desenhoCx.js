/* Vértice Docs v0.6.18 (D-44) — desenho dos gráficos novos do Excel 2016 (cx) em SVG.
   Cascata e funil saem desenhados com os números de agora das células. Os outros tipos (mapa de árvore, explosão solar,
   caixa estreita, histograma, Pareto, mapa) aparecem como um quadro com o nome e o título: o desenho deles chega numa
   versão próxima, e ao salvar como Excel eles voltam iguais. */
import { escala, numeroCurto } from './graficos.js';
import { formatar } from './formato.js';
import { NOMES_CX, dadosDoCx } from './xlsx/cxXlsx.js';

const r1 = (v) => Math.round(v * 10) / 10;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
/* as cores do Office para cascata (aumento, redução, total) e a da série */
const COR_SOBE = '#4472c4', COR_DESCE = '#ed7d31', COR_TOTAL = '#a5a5a5';
const FONTE = "Inter, 'Segoe UI', Calibri, Arial, sans-serif";

function texto(x, y, s, { tam = 11, cor = '#1f2d36', anc = 'start', negrito = false, maxW = 0 } = {}) {
  let t = String(s ?? '');
  if (maxW > 0) { const cabem = Math.max(2, Math.floor(maxW / (tam * 0.56))); if (t.length > cabem) t = t.slice(0, Math.max(1, cabem - 1)) + '…'; }
  return `<text x="${r1(x)}" y="${r1(y)}" font-size="${r1(tam)}"${negrito ? ' font-weight="700"' : ''} fill="${cor}" text-anchor="${anc}">${esc(t)}</text>`;
}
const fmtNum = (v, fmt) => {
  if (!ehNum(v)) return '';
  if (fmt && fmt !== 'General') { try { return formatar(v, fmt).t; } catch { /* segue */ } }
  return numeroCurto(v);
};
const luz = (hex) => { const n = parseInt(String(hex).slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };

/** SVG do gráfico cx. opc = { w, h, tema, mini, lerFaixa } */
export function svgDoCx(g, { w = 480, h = 300, tema = {}, mini = false, lerFaixa = null } = {}) {
  const T = { texto: '#1f2d36', fraco: '#5b6b76', grade: '#e3e8ed', eixo: '#b9c3cc', fundo: '#ffffff', ...tema };
  const cx = g.cx || {};
  const nomeTipo = NOMES_CX[cx.tipo] || 'Gráfico do Excel 2016';
  const partes = [`<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" fill="${T.fundo}" stroke="${T.eixo}" stroke-width="0.6" data-parte="fundo"/>`];
  const fs = mini ? 7 : Math.max(10, Math.min(12, Math.round(Math.min(w, h) / 28)));
  const pad = mini ? 4 : 10;
  let topo = pad;
  if (g.titulo && !mini) { partes.push(texto(w / 2, topo + fs + 4, g.titulo, { tam: fs + 3, cor: T.texto, anc: 'middle', maxW: w - 2 * pad })); topo += fs + 12; }
  const ds = dadosDoCx(g, lerFaixa);
  const cats = (ds.find((d) => d.k === 'cat') || { vals: [] }).vals.map((v) => (v == null ? '' : String(v)));
  const dv = ds.find((d) => d.k === 'val') || ds.find((d) => d.num) || { vals: [] };
  const vals = dv.vals.map((v) => (ehNum(v) ? v : null));
  const fmt = dv.fmt;
  const fim = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONTE}" role="img" aria-label="${esc(nomeTipo + (g.titulo ? ': ' + g.titulo : ''))}" data-cx="${esc(cx.tipo || '')}">${partes.join('')}</svg>`;

  if ((cx.tipo === 'waterfall' || cx.tipo === 'funnel') && vals.some(ehNum)) {
    if (cx.tipo === 'waterfall') cascata(); else funil();
    return fim();
  }
  /* tipo que o app ainda não desenha: o quadro com o nome (o gráfico volta igual ao salvar) */
  const meioY = (topo + h) / 2;
  partes.push(`<rect x="${pad}" y="${topo}" width="${w - 2 * pad}" height="${Math.max(10, h - topo - pad)}" rx="6" fill="none" stroke="${T.grade}" stroke-dasharray="4 3"/>`);
  partes.push(texto(w / 2, meioY - (mini ? 0 : 4), nomeTipo, { tam: fs + 1, cor: T.texto, anc: 'middle', negrito: true, maxW: w - 4 * pad }));
  if (!mini) ['O desenho deste tipo chega numa versão próxima;', 'ele volta igual ao salvar como Excel.'].forEach((t, i) => partes.push(texto(w / 2, meioY + fs + 4 + i * (fs + 2), t, { tam: fs - 1, cor: T.fraco, anc: 'middle', maxW: w - 4 * pad })));
  return fim();

  function cascata() {
    const sub = new Set(cx.subtotais || []);
    const barras = []; let corre = 0;
    vals.forEach((v, i) => {
      if (!ehNum(v)) { barras.push(null); return; }
      if (sub.has(i)) { barras.push({ a: 0, b: v, total: true, v }); corre = v; } else { barras.push({ a: corre, b: corre + v, v }); corre += v; }
    });
    const todos = barras.filter(Boolean).flatMap((b) => [b.a, b.b]);
    const E = escala(Math.min(0, ...todos), Math.max(0, ...todos), mini ? 3 : 5);
    const legenda = !mini && /<cx:legend\b/.test(cx.xml || '');
    let y0 = topo;
    if (legenda) {
      const itens = [['Aumento', COR_SOBE], ['Redução', COR_DESCE], ['Total', COR_TOTAL]];
      const larg = itens.reduce((s, [n]) => s + n.length * fs * 0.56 + fs + 16, 0);
      let x = (w - larg) / 2;
      for (const [n, c] of itens) { partes.push(`<rect x="${r1(x)}" y="${r1(y0 + 2)}" width="${fs - 2}" height="${fs - 2}" fill="${c}"/>`, texto(x + fs + 2, y0 + fs - 1, n, { tam: fs - 1, cor: T.fraco })); x += n.length * fs * 0.56 + fs + 16; }
      y0 += fs + 8;
    }
    const eixoW = mini ? 0 : Math.max(...E.ticks.map((t) => fmtNum(t, fmt).length)) * fs * 0.56 + 8;
    const A = { x: pad + eixoW, y: y0 + 4, w: Math.max(10, w - 2 * pad - eixoW), h: Math.max(10, h - y0 - pad - (mini ? 2 : fs + 8)) };
    const Y = (v) => A.y + A.h - ((v - E.min) / (E.max - E.min || 1)) * A.h;
    if (!mini) for (const t of E.ticks) { const y = Y(t); partes.push(`<line x1="${r1(A.x)}" y1="${r1(y)}" x2="${r1(A.x + A.w)}" y2="${r1(y)}" stroke="${T.grade}" stroke-width="0.8"/>`, texto(A.x - 4, y + fs * 0.35, fmtNum(t, fmt), { tam: fs - 1, cor: T.fraco, anc: 'end' })); }
    const n = Math.max(1, barras.length), passo = A.w / n, bw = Math.max(2, passo * 0.66);
    barras.forEach((b, i) => {
      if (!b) return;
      const x = A.x + i * passo + (passo - bw) / 2;
      const ya = Y(b.a), yb = Y(b.b);
      const cor = (cx.pontos && cx.pontos[i]) || (b.total ? COR_TOTAL : b.v >= 0 ? COR_SOBE : COR_DESCE);
      partes.push(`<rect x="${r1(x)}" y="${r1(Math.min(ya, yb))}" width="${r1(bw)}" height="${r1(Math.max(1, Math.abs(yb - ya)))}" fill="${cor}" data-parte="barra:${i}"/>`);
      /* ligação até a próxima barra */
      const prox = barras[i + 1];
      if (prox && !mini) partes.push(`<line x1="${r1(x + bw)}" y1="${r1(yb)}" x2="${r1(x + passo)}" y2="${r1(yb)}" stroke="${T.eixo}" stroke-width="0.8"/>`);
      if (cx.rotulos && !mini) partes.push(texto(x + bw / 2, (b.v >= 0 ? Math.min(ya, yb) - 4 : Math.max(ya, yb) + fs), fmtNum(b.v, fmt), { tam: fs - 1, cor: T.texto, anc: 'middle' }));
      if (!mini) partes.push(texto(x + bw / 2, A.y + A.h + fs + 4, cats[i] || '', { tam: fs - 1, cor: T.fraco, anc: 'middle', maxW: passo - 2 }));
    });
    if (E.min < 0 && E.max > 0) partes.push(`<line x1="${r1(A.x)}" y1="${r1(Y(0))}" x2="${r1(A.x + A.w)}" y2="${r1(Y(0))}" stroke="${T.eixo}" stroke-width="1"/>`);
  }

  function funil() {
    const lista = vals.map((v, i) => ({ v: ehNum(v) ? Math.max(0, v) : 0, c: cats[i] || '' }));
    const max = Math.max(1, ...lista.map((x) => x.v));
    const rotW = mini ? 0 : Math.min(w * 0.3, Math.max(...lista.map((x) => x.c.length)) * fs * 0.56 + 8);
    const A = { x: pad + rotW, y: topo + 2, w: Math.max(10, w - 2 * pad - rotW), h: Math.max(10, h - topo - pad - 2) };
    const n = Math.max(1, lista.length), passo = A.h / n, bh = Math.max(2, passo * 0.86);
    const corBase = cx.cor || COR_SOBE;
    lista.forEach((x, i) => {
      const bw = Math.max(1, (x.v / max) * A.w);
      const y = A.y + i * passo + (passo - bh) / 2, bx = A.x + (A.w - bw) / 2;
      const cor = (cx.pontos && cx.pontos[i]) || corBase;
      partes.push(`<rect x="${r1(bx)}" y="${r1(y)}" width="${r1(bw)}" height="${r1(bh)}" fill="${cor}" data-parte="barra:${i}"/>`);
      if (!mini) partes.push(texto(A.x - 6, y + bh / 2 + fs * 0.35, x.c, { tam: fs - 1, cor: T.fraco, anc: 'end', maxW: rotW - 6 }));
      if (cx.rotulos && !mini) partes.push(texto(A.x + A.w / 2, y + bh / 2 + fs * 0.35, fmtNum(vals[i], fmt), { tam: fs - 1, cor: luz(cor) > 0.55 ? '#1f1f1f' : '#ffffff', anc: 'middle' }));
    });
  }
}
