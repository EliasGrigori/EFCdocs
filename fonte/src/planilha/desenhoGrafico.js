/* EFCdocs v0.6.1 — desenho dos gráficos em SVG (texto), sem biblioteca.
   Desenha o "plano" (graficoPlano.js): serve para os gráficos do EFCdocs e para os que vieram do Excel com toda a formatação
   (preenchimento sólido, nenhum ou degradê, contorno, brilho e sombra, cor de cada ponto, fatia invisível, giro e furo,
   rosca + pizza, colunas + linhas, eixo da direita, linha curva, marcadores, rótulos com formato, mínimo e máximo dos eixos...).
   O mesmo SVG serve para a tela, a impressão/PDF e as miniaturas.
   Cada parte leva data-parte="..." para o editor saber onde a pessoa clicou (titulo, legenda, fundo, area, eixo:y, serie:2, ponto:0:3). */
import { NOME_TIPO, escala, numeroCurto } from './graficos.js';
import { construir, resolverPlano, seriesDe, corSemaforo, metaPadraoDe, PT } from './graficoPlano.js';
import { formatar } from './formato.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const r1 = (v) => Math.round(v * 10) / 10;
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
const larguraTexto = (t, px = 11, negrito = false) => String(t).length * px * (negrito ? 0.6 : 0.56);
const corte = (t, max) => { t = String(t); return t.length > max ? t.slice(0, Math.max(1, max - 1)) + '…' : t; };

export const TEMA_CLARO = { texto: '#1f2d36', fraco: '#5b6b76', grade: '#e3e8ed', eixo: '#b9c3cc', fundo: '#ffffff' };
export const TEMA_ESCURO = { texto: '#e6edf3', fraco: '#a9b6c3', grade: '#2b3746', eixo: '#4a5a6c', fundo: '#18202a' };

let seq = 0;

/** g + d (dadosDaFaixa) → plano pronto para desenhar. lerFaixa: para os gráficos que vieram do Excel. */
export function planoDoGrafico(g, d, lerFaixa = null) {
  if (g.t === 'excel' && g.plano) return resolverPlano(g.plano, lerFaixa);
  return construir(g, d || { cats: [], series: [] });
}

/** SVG do gráfico (texto). d = dadosDaFaixa(...) */
export function svgDoGrafico(g, d, opc = {}) {
  const P = planoDoGrafico(g, d, opc.lerFaixa);
  return svgDoPlano(P, { ...opc, rotulo: (NOME_TIPO[g.t] || 'Gráfico') + (g.titulo ? ': ' + g.titulo : '') });
}

/* ---------- cores, linhas e preenchimentos ---------- */
const COR_OK = /^#[0-9a-f]{3,8}$/i;
/** Só cores #hex passam para o SVG (o plano pode ter vindo de um arquivo qualquer). */
function limparCores(x) {
  if (Array.isArray(x)) return x.map(limparCores);
  if (!x || typeof x !== 'object') return x;
  const o = {};
  for (const k of Object.keys(x)) {
    const v = x[k];
    if (k === 'cor') o[k] = typeof v === 'string' && COR_OK.test(v) ? v : null;
    else if (k === 'paleta') o[k] = Array.isArray(v) ? v.filter((c) => typeof c === 'string' && COR_OK.test(c)) : null;
    else o[k] = typeof v === 'object' ? limparCores(v) : v;
  }
  return o;
}
const TRACOS = { dash: [4, 3], sysDash: [3, 1], dot: [1, 2], sysDot: [1, 1], lgDash: [8, 3], dashDot: [4, 3, 1, 3], lgDashDot: [8, 3, 1, 3], lgDashDotDot: [8, 3, 1, 3, 1, 3], sysDashDot: [3, 1, 1, 1], sysDashDotDot: [3, 1, 1, 1, 1, 1] };
function atrLinha(ln, corPadrao, largPadrao) {
  if (ln && ln.t === 'nenhum') return null;
  const cor = (ln && ln.cor) || corPadrao;
  if (!cor) return null;
  const w = ln && ehNum(ln.larg) ? Math.max(0.5, ln.larg * PT) : largPadrao;
  let s = ` stroke="${cor}" stroke-width="${r1(w)}"`;
  if (ln && ehNum(ln.alfa) && ln.alfa < 1) s += ` stroke-opacity="${ln.alfa}"`;
  const tr = ln && TRACOS[ln.tr];
  if (tr) s += ` stroke-dasharray="${tr.map((x) => r1(x * w)).join(' ')}"`;
  return s;
}

function novoCtx(T, mini) {
  const id = 'efcg' + (++seq).toString(36);
  const defs = [];
  const cache = new Map();
  return {
    T, mini, id, defs,
    /** atributos fill (e defs de degradê) */
    preench(pr, corPadrao) {
      if (pr && pr.t === 'nenhum') return ' fill="none"';
      if (pr && pr.t === 'degrade' && pr.paradas && pr.paradas.length) {
        const k = JSON.stringify(pr);
        if (!cache.has(k)) {
          const gid = `${id}d${cache.size}`;
          const a = (((pr.ang ?? 90) % 360) + 360) % 360, rad = (a * Math.PI) / 180;
          const x = Math.cos(rad) / 2, y = Math.sin(rad) / 2;
          const stops = pr.paradas.map((p) => `<stop offset="${r1((p.p ?? 0) * 100)}%" stop-color="${p.cor}"${ehNum(p.alfa) && p.alfa < 1 ? ` stop-opacity="${p.alfa}"` : ''}/>`).join('');
          defs.push(pr.forma === 'circulo'
            ? `<radialGradient id="${gid}">${stops}</radialGradient>`
            : `<linearGradient id="${gid}" x1="${r1(0.5 - x)}" y1="${r1(0.5 - y)}" x2="${r1(0.5 + x)}" y2="${r1(0.5 + y)}">${stops}</linearGradient>`);
          cache.set(k, gid);
        }
        return ` fill="url(#${cache.get(k)})"`;
      }
      const cor = (pr && pr.cor) || corPadrao || '#888888';
      return ` fill="${cor}"${pr && ehNum(pr.alfa) && pr.alfa < 1 ? ` fill-opacity="${pr.alfa}"` : ''}`;
    },
    /** filtro de brilho/sombra (efeito) → atributo filter */
    efeito(ef) {
      if (!ef || mini) return '';
      const k = 'ef' + JSON.stringify(ef);
      if (!cache.has(k)) {
        const fid = `${id}f${cache.size}`;
        let f = '';
        if (ef.brilho) {
          const r = Math.max(1, (ef.brilho.raio || 5) * PT * 0.5);
          f += `<feMorphology in="SourceAlpha" operator="dilate" radius="${r1(r / 2)}" result="d"/><feGaussianBlur in="d" stdDeviation="${r1(r / 2)}" result="b"/><feFlood flood-color="${ef.brilho.cor || '#ffffff'}" flood-opacity="${ef.brilho.alfa ?? 0.6}"/><feComposite in2="b" operator="in" result="br"/>`;
        }
        if (ef.sombra) {
          const s = ef.sombra, dist = (s.dist ?? 3) * PT, dir = ((s.dir ?? 45) * Math.PI) / 180;
          f += `<feGaussianBlur in="SourceAlpha" stdDeviation="${r1(((s.blur ?? 4) * PT) / 2)}" result="sb"/><feOffset in="sb" dx="${r1(Math.cos(dir) * dist)}" dy="${r1(Math.sin(dir) * dist)}" result="so"/><feFlood flood-color="${s.cor || '#000000'}" flood-opacity="${s.alfa ?? 0.35}"/><feComposite in2="so" operator="in" result="sh"/>`;
        }
        f += `<feMerge>${ef.sombra ? '<feMergeNode in="sh"/>' : ''}${ef.brilho ? '<feMergeNode in="br"/>' : ''}<feMergeNode in="SourceGraphic"/></feMerge>`;
        defs.push(`<filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%">${f}</filter>`);
        cache.set(k, fid);
      }
      return ` filter="url(#${cache.get(k)})"`;
    },
  };
}

/* ---------- textos ---------- */
const fmtValor = (P, v, fmt) => {
  if (!ehNum(v)) return '';
  if (fmt && fmt !== 'General') { try { return formatar(v, fmt).t; } catch { /* segue */ } }
  return P.nativo ? numeroCurto(v) : formatar(v, 'General').t;
};
function txt(x, y, s, { tam, cor, negrito, anc = 'start', parte = '', rot = 0, italico = false, maxW = 0 } = {}) {
  let t = String(s ?? '');
  if (maxW > 0) { const cabem = Math.max(2, Math.floor(maxW / (tam * (negrito ? 0.6 : 0.56)))); t = corte(t, cabem); }
  const tr = rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : '';
  return `<text x="${r1(x)}" y="${r1(y)}" font-size="${r1(tam)}"${negrito ? ' font-weight="700"' : ''}${italico ? ' font-style="italic"' : ''} fill="${cor}" text-anchor="${anc}"${tr}${parte ? ` data-parte="${parte}"` : ''}>${esc(t)}</text>`;
}

/** Desenho do plano. opc: { w, h, tema, mini, rotulo } */
export function svgDoPlano(P0, { w = 480, h = 300, tema = TEMA_CLARO, mini = false, rotulo = 'Gráfico' } = {}) {
  const T = tema;
  const P = limparCores(P0);
  const C = novoCtx(T, mini);
  const partes = [];
  const add = (s) => partes.push(s);
  const fsAuto = mini ? 8 : Math.max(10, Math.min(13, Math.round(Math.min(w, h) / 26)));
  const fs = P.fonte && ehNum(P.fonte.tam) ? (mini ? Math.max(6, P.fonte.tam * PT * 0.6) : P.fonte.tam * PT) : fsAuto;
  const corTexto = (P.fonte && P.fonte.cor) || T.texto;
  const corFraco = (P.fonte && P.fonte.cor) || T.fraco;
  const pad = mini ? 4 : Math.max(8, Math.min(14, Math.round(Math.min(w, h) / 28)));

  /* fundo */
  const fundo = P.fundo || {};
  const cantos = fundo.cantos ? 8 : 0;
  add(`<rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${cantos}"${C.preench(fundo.preench, T.fundo)}${atrLinha(fundo.borda, null, 1) || ''} data-parte="fundo"/>`);

  let topo = pad, baixo = h - pad, esq = pad, dir = w - pad;
  /* título */
  if (P.titulo && !mini) {
    const ti = P.titulo;
    const tam = ehNum(ti.tam) ? ti.tam * PT : fs + 3;
    const texto = ti.texto ?? (seriesDe(P)[0] && seriesDe(P)[0].S.nome.txt) ?? '';
    if (texto) {
      const al = ti.alinhar === 'e' ? 'start' : 'middle';
      const linhas = String(texto).split('\n');
      linhas.forEach((ln, i) => add(txt(al === 'start' ? pad + 2 : w / 2, topo + tam + i * tam * 1.2, ln, { tam, cor: ti.cor || corTexto, negrito: ti.negrito !== false, italico: !!ti.italico, anc: al, parte: 'titulo', maxW: w - 2 * pad })));
      topo += tam * 1.2 * linhas.length + 6;
    }
  }
  const vazio = !P.grupos.length || (P.grupos.every((G) => G.tipo !== 'gauge') && !seriesDe(P).some(({ S }) => (S.vals.num || []).some(ehNum)));
  if (vazio) {
    add(txt(w / 2, h / 2, 'Escolha células com números para o gráfico', { tam: fs, cor: corFraco, anc: 'middle' }));
    return envolver(partes, C, w, h, rotulo);
  }

  /* legenda */
  const itensLeg = mini || !P.legenda ? [] : itensDaLegenda(P);
  const leg = P.legenda || {};
  const fsLeg = ehNum(leg.tam) ? leg.tam * PT : fs;
  const corLeg = leg.cor || corTexto;
  let caixaLeg = null;
  if (itensLeg.length) {
    const pos = leg.auto && leg.pos === 'b' && w > h * 1.15 ? 'r' : leg.pos || 'b';
    const largItem = (it) => larguraTexto(it.nome, fsLeg, leg.negrito) + fsLeg + 14;
    if (pos === 'r' || pos === 'l' || pos === 'tr') {
      const lw = Math.min(w * 0.4, Math.max(...itensLeg.map(largItem)) + 6);
      const lh = itensLeg.length * (fsLeg + 6);
      const x = pos === 'l' ? esq : dir - lw;
      const y = pos === 'tr' ? topo : Math.max(topo, (topo + baixo) / 2 - lh / 2);
      caixaLeg = { x, y, w: lw, h: lh, vertical: true };
      if (pos === 'l') esq += lw + 6; else dir -= lw + 6;
    } else {
      /* em linhas, centralizado */
      const linhas = [[]];
      let larg = 0;
      for (const it of itensLeg) { const lw = largItem(it); if (larg + lw > w - 2 * pad && linhas[linhas.length - 1].length) { linhas.push([]); larg = 0; } linhas[linhas.length - 1].push(it); larg += lw; }
      const lh = linhas.length * (fsLeg + 6);
      const y = pos === 't' ? topo : baixo - lh;
      caixaLeg = { x: pad, y, w: w - 2 * pad, h: lh, linhas };
      if (pos === 't') topo += lh + 4; else baixo -= lh + 4;
    }
  }
  const area = { x: esq, y: topo, w: Math.max(10, dir - esq), h: Math.max(10, baixo - topo) };

  const soRedondo = P.grupos.every((G) => G.tipo === 'pie' || G.tipo === 'doughnut' || G.tipo === 'gauge');
  if (soRedondo) desenharRedondos(P, area, { C, add, fs, corTexto, corFraco, mini });
  else desenharComEixos(P, area, { C, add, fs, corTexto, corFraco, mini, T, w, h, pad });

  if (caixaLeg) desenharLegenda(itensLeg, caixaLeg, { add, C, fsLeg, corLeg, negrito: !!leg.negrito });
  return envolver(partes, C, w, h, rotulo);
}

function envolver(partes, C, w, h, rotulo) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Inter, 'Segoe UI', Calibri, Arial, sans-serif" role="img" aria-label="${esc(rotulo)}">${C.defs.length ? `<defs>${C.defs.join('')}</defs>` : ''}${partes.join('')}</svg>`;
}

/* ---------- cor de cada série / ponto ---------- */
const paletaDe = (P) => (P.paleta && P.paleta.length ? P.paleta : ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47']);
function corDaSerie(P, i, S) {
  const pr = S.preench;
  if (pr && pr.t === 'solido' && pr.cor) return pr.cor;
  if (pr && pr.t === 'degrade' && pr.paradas && pr.paradas[0]) return pr.paradas[0].cor;
  if (S.linha && S.linha.t === 'solido' && S.linha.cor) return S.linha.cor;
  if (S.contorno && S.contorno.t === 'solido' && S.contorno.cor) return S.contorno.cor;
  const pal = paletaDe(P);
  return pal[i % pal.length];
}
function itensDaLegenda(P) {
  const oc = new Set((P.legenda && P.legenda.ocultas) || []);
  const out = [];
  const lista = seriesDe(P);
  const redondo = lista.length && lista.every(({ G }) => G.tipo === 'pie' || G.tipo === 'doughnut');
  if (redondo) {
    const { G, S } = lista[0];
    const n = Math.max((S.cats.txt || []).length, (S.vals.num || []).length);
    for (let k = 0; k < n; k++) {
      if (oc.has(k)) continue;
      const pt = (S.pontos || {})[k] || {};
      const pr = pt.preench || (G.variar !== false ? { t: 'solido', cor: paletaDe(P)[k % paletaDe(P).length] } : S.preench);
      const nm = (S.cats.txt && S.cats.txt[k]) ?? String(k + 1);
      out.push({ nome: P.legenda.valores && ehNum((S.vals.num || [])[k]) ? `${nm}  ${numeroCurto(S.vals.num[k])}` : nm, pr, ln: pt.contorno || S.contorno, caixa: true });
    }
    return out;
  }
  lista.forEach(({ G, S }, i) => {
    if (oc.has(i) || S.oculta) return;
    const cor = corDaSerie(P, i, S);
    const linha = G.tipo === 'line' || (G.tipo === 'scatter' && !(S.linha && S.linha.t === 'nenhum'));
    out.push({ nome: S.nome.txt || `Série ${i + 1}`, pr: S.preench || { t: 'solido', cor }, ln: linha ? (S.linha || { t: 'solido', cor }) : S.contorno, linha, marcador: (G.tipo === 'line' || G.tipo === 'scatter') && S.marcador && S.marcador.forma !== 'none' ? S.marcador : null, cor, i });
  });
  for (const r of P.ref || []) if (r.leg) out.push({ nome: r.leg, ln: { t: 'solido', cor: r.cor, tr: r.tr ? 'dash' : 'solid', larg: 1.5 }, linha: true, cor: r.cor });
  return out;
}
function desenharLegenda(itens, cx, { add, C, fsLeg, corLeg, negrito }) {
  add(`<g data-parte="legenda">`);
  const um = (it, x, y) => {
    if (it.linha) {
      add(`<line x1="${r1(x)}" y1="${r1(y - fsLeg / 3)}" x2="${r1(x + fsLeg + 4)}" y2="${r1(y - fsLeg / 3)}"${atrLinha(it.ln, it.cor, 2.5) || ` stroke="${it.cor}" stroke-width="2.5"`}/>`);
      if (it.marcador) add(marcador(it.marcador, x + (fsLeg + 4) / 2, y - fsLeg / 3, it.cor, C, 0.8));
    } else {
      const ln = atrLinha(it.ln, null, 1);
      add(`<rect x="${r1(x)}" y="${r1(y - fsLeg + 2)}" width="${r1(fsLeg)}" height="${r1(fsLeg - 2)}" rx="2"${C.preench(it.pr, it.cor)}${ln || ''}/>`);
    }
    add(`<text x="${r1(x + fsLeg + 8)}" y="${r1(y)}" font-size="${r1(fsLeg)}" fill="${corLeg}"${negrito ? ' font-weight="700"' : ''}>${esc(it.nome)}</text>`);
  };
  if (cx.vertical) itens.forEach((it, i) => um(it, cx.x, cx.y + (i + 1) * (fsLeg + 6) - 3));
  else {
    cx.linhas.forEach((lin, j) => {
      const larg = lin.map((it) => larguraTexto(it.nome, fsLeg, negrito) + fsLeg + 14);
      let x = cx.x + (cx.w - larg.reduce((a, b) => a + b, 0)) / 2;
      const y = cx.y + (j + 1) * (fsLeg + 6) - 3;
      lin.forEach((it, i) => { um(it, x, y); x += larg[i]; });
    });
  }
  add('</g>');
}

/* ---------- marcadores ---------- */
function marcador(m, x, y, cor, C, escala2 = 1) {
  const forma = m.forma || 'circle';
  if (forma === 'none') return '';
  const s = Math.max(2, ((ehNum(m.tam) ? m.tam : 5) * PT * 0.75 * escala2) / 2);
  const fill = C.preench(m.preench, cor);
  const st = atrLinha(m.contorno, cor, 1.2) || '';
  const X = r1(x), Y = r1(y);
  switch (forma) {
    case 'square': return `<rect x="${r1(x - s)}" y="${r1(y - s)}" width="${r1(2 * s)}" height="${r1(2 * s)}"${fill}${st}/>`;
    case 'diamond': return `<path d="M${X} ${r1(y - s * 1.2)}L${r1(x + s * 1.2)} ${Y}L${X} ${r1(y + s * 1.2)}L${r1(x - s * 1.2)} ${Y}Z"${fill}${st}/>`;
    case 'triangle': return `<path d="M${X} ${r1(y - s * 1.2)}L${r1(x + s * 1.1)} ${r1(y + s * 0.8)}L${r1(x - s * 1.1)} ${r1(y + s * 0.8)}Z"${fill}${st}/>`;
    case 'x': return `<path d="M${r1(x - s)} ${r1(y - s)}L${r1(x + s)} ${r1(y + s)}M${r1(x + s)} ${r1(y - s)}L${r1(x - s)} ${r1(y + s)}" fill="none"${atrLinha(m.contorno, cor, 1.5) || ` stroke="${cor}"`}/>`;
    case 'plus': return `<path d="M${r1(x - s)} ${Y}H${r1(x + s)}M${X} ${r1(y - s)}V${r1(y + s)}" fill="none"${atrLinha(m.contorno, cor, 1.5) || ` stroke="${cor}"`}/>`;
    case 'dash': return `<rect x="${r1(x - s)}" y="${r1(y - s / 4)}" width="${r1(2 * s)}" height="${r1(s / 2)}"${fill}/>`;
    case 'dot': return `<circle cx="${X}" cy="${Y}" r="${r1(s / 2)}"${fill}/>`;
    case 'star': { const p = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? s * 0.5 : s * 1.2; p.push(`${r1(x + Math.cos(a) * r)} ${r1(y + Math.sin(a) * r)}`); } return `<path d="M${p.join('L')}Z"${fill}${st}/>`; }
    default: return `<circle cx="${X}" cy="${Y}" r="${r1(s)}"${fill}${st}/>`;
  }
}

/* ---------- caminho suave (curva que passa pelos pontos) ---------- */
function caminho(pts, suave) {
  if (!pts.length) return '';
  if (!suave || pts.length < 3) return 'M' + pts.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L');
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

/* ---------- textos dos rótulos de dados ---------- */
function textoRotulo(P, R, S, k, v, tot) {
  const p = [];
  if (R.nome) p.push(S.nome.txt || '');
  if (R.cat) p.push((S.cats.txt && S.cats.txt[k]) ?? String(k + 1));
  if (R.val || (!R.pct && !R.cat && !R.nome)) p.push(fmtValor(P, v, R.fmt || S.vals.fmt));
  if (R.pct && tot) { const x = v / tot; p.push(R.fmt && /%/.test(R.fmt) ? fmtValor(P, x, R.fmt) : `${Math.round(x * 100)}%`); }
  return p.filter((x) => x !== '').join(R.sep || '; ');
}
const rotuloDoPonto = (S, k) => { const pt = S.pontos && S.pontos[k]; if (pt && pt.rotulo === false) return null; if (pt && pt.rotulo) return { ...(S.rotulos || {}), ...pt.rotulo }; return S.rotulos; };

/* ============================================================ pizza, rosca e velocímetro ============================================================ */
function desenharRedondos(P, A, { C, add, fs, corTexto, mini }) {
  const cx = A.x + A.w / 2, cy = A.y + A.h / 2;
  const temFora = !mini && seriesDe(P).some(({ S }) => S.rotulos && (S.rotulos.pos === 'outEnd' || S.rotulos.pos === 'bestFit'));
  let R = Math.max(8, Math.min(A.w, A.h) / 2 - (mini ? 1 : 4));
  if (temFora) R *= 0.78;
  const pal = paletaDe(P);
  let primeiro = true;
  for (const G of P.grupos) {
    if (G.tipo === 'gauge') { velocimetro(P, G, A, { C, add, fs, corTexto, mini }); continue; }
    const giro = ((G.giro || 0) * Math.PI) / 180;
    const series = G.tipo === 'pie' ? G.series.slice(0, 1) : G.series;
    const ri0 = G.tipo === 'doughnut' ? R * Math.min(0.9, Math.max(0.1, (G.furo ?? 50) / 100)) : 0;
    const passo = series.length ? (R - ri0) / series.length : R;
    series.forEach((S, j) => {
      const r0 = G.tipo === 'doughnut' ? ri0 + j * passo : 0, r1x = G.tipo === 'doughnut' ? ri0 + (j + 1) * passo : R;
      const vals = (S.vals.num || []).map((v) => (ehNum(v) ? Math.abs(v) : 0));
      const tot = vals.reduce((a, b) => a + b, 0);
      if (!tot) return;
      let a = -Math.PI / 2 + giro;
      vals.forEach((v, k) => {
        const da = (v / tot) * Math.PI * 2;
        if (!da) return;
        const pt = (S.pontos && S.pontos[k]) || {};
        const pr = pt.preench || S.preench || (G.variar !== false ? { t: 'solido', cor: pal[k % pal.length] } : { t: 'solido', cor: pal[j % pal.length] });
        const ln = pt.contorno || S.contorno || (P.nativo ? null : { t: 'solido', cor: '#ffffff', larg: 0.75 });
        const expl = ((pt.explodir ?? S.explodir ?? 0) / 100) * R * 0.3;
        const meio = a + da / 2;
        const ox = Math.cos(meio) * expl, oy = Math.sin(meio) * expl;
        const invisivel = pr.t === 'nenhum' && (!ln || ln.t === 'nenhum');
        if (!invisivel) {
          const d = setor(cx + ox, cy + oy, r0, r1x, a, a + da, vals.length === 1 && da >= Math.PI * 2 - 1e-9);
          add(`<path d="${d}"${C.preench(pr, '#888')}${atrLinha(ln, null, 1) || ''}${C.efeito(pt.efeito || S.efeito)} data-parte="ponto:${serieIndice(P, S)}:${k}"/>`);
        }
        const R2 = rotuloDoPonto(S, k);
        if (!mini && R2 && (R2.val || R2.pct || R2.cat || R2.nome) && !(invisivel && !(pt.rotulo)) && !(R2.min && v / tot < R2.min)) {
          const t = textoRotulo(P, R2, S, k, v, tot);
          const fora = R2.pos === 'outEnd' || (R2.pos === 'bestFit' && v / tot < 0.08);
          const rr = fora ? r1x + 12 : r0 ? (r0 + r1x) / 2 : r1x * 0.62;
          const tx = cx + ox + Math.cos(meio) * rr, ty = cy + oy + Math.sin(meio) * rr;
          const tam = ehNum(R2.tam) ? R2.tam * PT : fs - 1;
          if (fora) add(`<line x1="${r1(cx + Math.cos(meio) * r1x)}" y1="${r1(cy + Math.sin(meio) * r1x)}" x2="${r1(cx + Math.cos(meio) * (r1x + 8))}" y2="${r1(cy + Math.sin(meio) * (r1x + 8))}" stroke="${corTexto}" stroke-opacity=".5"/>`);
          const corR = R2.cor || (fora ? corTexto : contraste(pr));
          add(txt(tx, ty + tam / 3, t, { tam, cor: corR, negrito: R2.negrito ?? !fora, anc: fora ? (Math.cos(meio) >= 0 ? 'start' : 'end') : 'middle' }));
        }
        a += da;
      });
      if (G.centroTotal && primeiro && !mini) add(txt(cx, cy + fs / 2, numeroCurto(tot), { tam: fs + 3, cor: corTexto, negrito: true, anc: 'middle' }));
    });
    primeiro = false;
  }
}
const serieIndice = (P, S) => seriesDe(P).findIndex((x) => x.S === S);
function setor(cx, cy, r0, r, a, b, cheio) {
  const p = (ang, rr) => `${r1(cx + Math.cos(ang) * rr)} ${r1(cy + Math.sin(ang) * rr)}`;
  if (cheio) return r0 ? `M${p(0, r)}A${r1(r)} ${r1(r)} 0 1 1 ${p(Math.PI, r)}A${r1(r)} ${r1(r)} 0 1 1 ${p(0, r)}M${p(0, r0)}A${r1(r0)} ${r1(r0)} 0 1 0 ${p(Math.PI, r0)}A${r1(r0)} ${r1(r0)} 0 1 0 ${p(0, r0)}Z` : `M${p(0, r)}A${r1(r)} ${r1(r)} 0 1 1 ${p(Math.PI, r)}A${r1(r)} ${r1(r)} 0 1 1 ${p(0, r)}Z`;
  const g = b - a > Math.PI ? 1 : 0;
  if (!r0) return `M${r1(cx)} ${r1(cy)}L${p(a, r)}A${r1(r)} ${r1(r)} 0 ${g} 1 ${p(b, r)}Z`;
  return `M${p(a, r)}A${r1(r)} ${r1(r)} 0 ${g} 1 ${p(b, r)}L${p(b, r0)}A${r1(r0)} ${r1(r0)} 0 ${g} 0 ${p(a, r0)}Z`;
}
function contraste(pr) {
  const cor = pr && pr.t === 'solido' ? pr.cor : pr && pr.t === 'degrade' && pr.paradas[0] ? pr.paradas[0].cor : null;
  const m = /^#([0-9a-f]{6})$/i.exec(cor || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150 ? '#1f2d36' : '#ffffff';
}

/** Velocímetro: meia-lua com as faixas de cor, ponteiro e o valor. */
function velocimetro(P, G, A, { C, add, fs, corTexto, mini }) {
  const tamV = mini ? 0 : Math.max(fs + 4, Math.min(A.h * 0.17, 30));
  const R = Math.max(10, Math.min(A.w / 2 - 4, A.h - (mini ? 2 : tamV + fs * 0.6 + 8)));
  const cx = A.x + A.w / 2, cy = A.y + (mini ? A.h * 0.92 : 2 + R + Math.max(0, (A.h - R - tamV - fs * 0.6 - 10) / 2));
  const r0 = R * 0.62;
  const mn = G.min ?? 0, mx = G.max ?? 1;
  const ang = (v) => Math.PI + Math.min(1, Math.max(0, (v - mn) / ((mx - mn) || 1))) * Math.PI;
  let ini = mn;
  for (const f of G.faixas || []) {
    const fim = Math.min(mx, Math.max(ini, f.ate));
    if (fim > ini) add(`<path d="${setor(cx, cy, r0, R, ang(ini), ang(fim), false)}" fill="${f.cor}" stroke="#ffffff" stroke-width="1" data-parte="faixas"/>`);
    ini = fim;
  }
  if (ehNum(G.valor)) {
    const a = ang(G.valor), L = R * 0.94, b = Math.max(3, R * 0.06);
    add(`<path d="M${r1(cx + Math.cos(a + Math.PI / 2) * b)} ${r1(cy + Math.sin(a + Math.PI / 2) * b)}L${r1(cx + Math.cos(a) * L)} ${r1(cy + Math.sin(a) * L)}L${r1(cx + Math.cos(a - Math.PI / 2) * b)} ${r1(cy + Math.sin(a - Math.PI / 2) * b)}Z" fill="${corTexto}" data-parte="ponteiro"/><circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(b * 1.3)}" fill="${corTexto}"/>`);
  }
  if (!mini) {
    add(txt(cx, cy + tamV + 2, ehNum(G.valor) ? fmtValor(P, G.valor, G.fmt) : '—', { tam: tamV, cor: corTexto, negrito: true, anc: 'middle', parte: 'valor' }));
    add(txt(cx - (R + r0) / 2, cy + fs + 2, fmtValor(P, mn, G.fmt), { tam: fs - 1, cor: corTexto, anc: 'middle' }));
    add(txt(cx + (R + r0) / 2, cy + fs + 2, fmtValor(P, mx, G.fmt), { tam: fs - 1, cor: corTexto, anc: 'middle' }));
  }
}

/* ============================================================ gráficos com eixos ============================================================ */
function desenharComEixos(P, A, { C, add, fs, corTexto, corFraco, mini, T }) {
  const E = P.eixos || {};
  const ex = E.x || { tipo: 'cat', pos: 'b' }, ey = E.y || { tipo: 'val', pos: 'l' };
  const grupos = P.grupos.filter((G) => G.tipo !== 'pie' && G.tipo !== 'doughnut' && G.tipo !== 'gauge');
  const horiz = grupos.some((G) => G.tipo === 'bar' && G.dir === 'bar' && !G.eixo2);
  const disp = grupos.some((G) => G.tipo === 'scatter');
  const lista = seriesDe(P).map((x, i) => ({ ...x, i })).filter(({ G }) => grupos.includes(G));
  const nCat = Math.max(0, ...lista.map(({ S }) => Math.max((S.vals.num || []).length, (S.cats.txt || []).length)));
  const s0 = lista.find(({ S }) => S.cats && (S.cats.txt || S.cats.num));
  const catsTxt = Array.from({ length: nCat }, (_, k) => {
    if (!s0) return String(k + 1);
    const c = s0.S.cats;
    if (c.num && ehNum(c.num[k]) && c.fmt && c.fmt !== 'General') return fmtValor(P, c.num[k], c.fmt);
    return (c.txt && c.txt[k] != null ? c.txt[k] : c.num && ehNum(c.num[k]) ? fmtValor(P, c.num[k], c.fmt) : String(k + 1));
  });

  /* ----- escalas dos eixos de valor ----- */
  const faixaValores = (e2) => {
    const vs = [];
    let temBarra = false, pct = false;
    for (const G of grupos) {
      if (!!G.eixo2 !== e2) continue;
      if (G.tipo === 'bar' || G.tipo === 'area') temBarra = true;
      const emp = G.agrup === 'stacked' || G.agrup === 'percentStacked';
      if (G.agrup === 'percentStacked') pct = true;
      if (G.tipo === 'scatter') { for (const S of G.series) vs.push(...(S.vals.num || [])); continue; }
      if (emp) {
        for (let k = 0; k < nCat; k++) {
          let pos = 0, neg = 0, tot = 0;
          for (const S of G.series) { const v = (S.vals.num || [])[k]; if (ehNum(v)) { if (v >= 0) pos += v; else neg += v; tot += Math.abs(v); } }
          if (G.agrup === 'percentStacked') vs.push(tot ? pos / tot : 0, tot ? neg / tot : 0); else vs.push(pos, neg);
        }
      } else for (const S of G.series) vs.push(...(S.vals.num || []));
    }
    for (const r of P.ref || []) if (!!r.eixo2 === e2) vs.push(r.v);
    return { vs: vs.filter(ehNum), temBarra, pct };
  };
  const montarEscala = (e, info) => {
    let mn = Math.min(...info.vs), mx = Math.max(...info.vs);
    if (!info.vs.length) { mn = 0; mx = 1; }
    if (info.temBarra) { mn = Math.min(0, mn); mx = Math.max(0, mx); }
    if (P.folga && !info.temBarra) { const f = (mx - mn) * P.folga || 1; mn -= f; mx += f; }
    if (e && ehNum(e.min)) mn = e.min;
    if (e && ehNum(e.max)) mx = e.max;
    if (mx <= mn) mx = mn + 1;
    let s = escala(mn, mx, mini ? 3 : Math.max(3, Math.round(A.h / (P.nativo ? 55 : 40))));
    if (e && ehNum(e.min)) s = { ...s, min: e.min };
    if (e && ehNum(e.max)) s = { ...s, max: e.max };
    let passo = e && ehNum(e.passo) && e.passo > 0 ? e.passo : s.passo;
    /* mínimo escrito (ex.: -0,2): o passo tem que "caber" nele, como o Excel faz (0,2 e não 0,25) */
    if (!(e && ehNum(e.passo)) && e && (ehNum(e.min) || ehNum(e.max))) {
      const base = ehNum(e.min) ? e.min : e.max;
      const p10 = 10 ** Math.floor(Math.log10(passo));
      const cands = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10].map((m) => m * p10).filter((c) => { const n = (s.max - s.min) / c; return n >= 3 && n <= 12; });
      const cabe = (c) => Math.abs(base / c - Math.round(base / c)) < 1e-6;
      const ok = cands.filter(cabe).sort((a, b2) => Math.abs(a - passo) - Math.abs(b2 - passo));
      if (ok.length) passo = ok[0];
    }
    if ((s.max - s.min) / passo > 60) passo = (s.max - s.min) / 10;
    const ticks = [];
    const ini = e && ehNum(e.min) ? e.min : Math.ceil(s.min / passo - 1e-9) * passo;
    for (let v = ini; v <= s.max + passo * 1e-6; v += passo) ticks.push(+v.toFixed(10));
    const fmt = e && e.fmt ? e.fmt : info.pct ? '0%' : null;
    return { min: s.min, max: s.max, ticks, fmt };
  };
  const vPri = faixaValores(false), vSec = faixaValores(true);
  const EY = montarEscala(ey, vPri);
  const temSec = grupos.some((G) => G.eixo2) || (P.ref || []).some((r) => r.eixo2);
  const EY2 = temSec ? montarEscala(E.y2, vSec.vs.length ? vSec : vPri) : null;
  let EX = null;
  if (disp) {
    const xs = lista.flatMap(({ S }) => (S.cats.num || [])).filter(ehNum);
    EX = montarEscala(ex, { vs: xs.length ? xs : [0, 1], temBarra: false });
  }
  const fmtEixo = (e, Esc, v) => fmtValor(P, v, (e && e.fmt) || Esc.fmt || (lista[0] && lista[0].S.vals.fmt) || null);

  /* ----- margens ----- */
  const rotE = (e) => (e && e.rotulo) || {};
  const fsE = (e) => (ehNum(rotE(e).tam) ? rotE(e).tam * PT : fs - 1);
  const corE = (e) => rotE(e).cor || corFraco;
  const eV = horiz ? ex : ey; // eixo vertical (o das categorias quando deitado)
  const eH = horiz ? ey : ex; // eixo de baixo
  const vis = (e) => e && !e.apagado && e.rotPos !== 'none';
  let x0 = A.x, x1 = A.x + A.w, y0 = A.y + (mini ? 0 : 4), y1 = A.y + A.h;
  const titE = (e) => (e && e.titulo && e.titulo.texto && !mini ? e.titulo : null);
  if (!mini) {
    if (titE(eV)) x0 += (ehNum(titE(eV).tam) ? titE(eV).tam * PT : fs) + 6;
    if (vis(eV)) {
      const labs = horiz ? catsTxt.map((c) => corte(c, 24)) : EY.ticks.map((v) => fmtEixo(ey, EY, v));
      x0 += Math.min(A.w * (horiz ? 0.36 : 0.3), Math.max(0, ...labs.map((t) => larguraTexto(t, fsE(eV), rotE(eV).negrito)))) + 8;
    }
    if (EY2 && vis(E.y2)) x1 -= Math.max(0, ...EY2.ticks.map((v) => larguraTexto(fmtEixo(E.y2, EY2, v), fsE(E.y2)))) + 10;
    /* números embaixo (barras deitadas, dispersão): o último não pode sair pela direita */
    if (horiz && vis(ey) && EY.ticks.length) x1 -= Math.min(A.w * 0.12, larguraTexto(fmtEixo(ey, EY, EY.ticks[EY.ticks.length - 1]), fsE(ey)) / 2);
    if (disp && vis(ex) && EX.ticks.length) x1 -= Math.min(A.w * 0.12, larguraTexto(fmtEixo(ex, EX, EX.ticks[EX.ticks.length - 1]), fsE(ex)) / 2);
    if (titE(E.y2)) x1 -= fs + 6;
    if (titE(eH)) y1 -= (ehNum(titE(eH).tam) ? titE(eH).tam * PT : fs) + 6;
  }
  const espCat0 = (x1 - x0) / Math.max(1, nCat);
  /* nome comprido: primeiro tenta em duas linhas; só gira se nem assim couber */
  let fsCat = fsE(eH);
  const kL = rotE(eH).negrito ? 0.6 : 0.52;
  const cabe1 = (c) => String(c).length * fsCat * kL <= espCat0 - 4;
  const cabe2 = (c) => { const p = String(c).split(' '); if (p.length < 2) return false; const m = Math.ceil(p.length / 2); return p.slice(0, m).join(' ').length * fsCat * kL <= espCat0 - 4 && p.slice(m).join(' ').length * fsCat * kL <= espCat0 - 4; };
  /* letra um pouco menor antes de girar (até 85%) */
  if (!horiz && !disp && catsTxt.some((c) => !cabe1(c) && !cabe2(c))) fsCat = Math.max(fsE(eH) * 0.85, 8);
  const girar = !mini && !horiz && !disp && vis(eH) && catsTxt.some((c) => !cabe1(c) && !cabe2(c));
  if (girar) fsCat = fsE(eH);
  const duasLinhas = !girar && !horiz && !disp && catsTxt.some((c) => !cabe1(c));
  if (!mini && vis(eH)) {
    if (girar) y1 -= Math.min(A.h * 0.35, Math.max(...catsTxt.map((c) => larguraTexto(corte(c, 18), fsE(eH)))) * 0.62 + 10);
    else y1 -= (duasLinhas ? 2 * fsCat + 2 : fsCat) + 8;
  }
  if (y1 - y0 < 10) y1 = y0 + 10;

  /* área do gráfico */
  if (P.area && (P.area.preench || P.area.borda)) add(`<rect x="${r1(x0)}" y="${r1(y0)}" width="${r1(x1 - x0)}" height="${r1(y1 - y0)}"${C.preench(P.area.preench, 'none')}${atrLinha(P.area.borda, null, 1) || ''} data-parte="area"/>`);

  /* ----- posições ----- */
  const invCat = horiz ? !ex.inverter : !!ex.inverter; // deitado: no Excel a 1ª categoria fica embaixo
  const entre = ex.entre !== false || grupos.some((G) => G.tipo === 'bar');
  const espCat = ((horiz ? y1 - y0 : x1 - x0)) / Math.max(1, entre ? nCat : nCat - 1);
  const posCat = (k) => { const kk = invCat ? nCat - 1 - k : k; return (horiz ? y0 : x0) + espCat * (entre ? kk + 0.5 : kk); };
  const escY = (Esc, inv) => (v) => {
    const t = (v - Esc.min) / ((Esc.max - Esc.min) || 1);
    return horiz ? (inv ? x1 - t * (x1 - x0) : x0 + t * (x1 - x0)) : (inv ? y0 + t * (y1 - y0) : y1 - t * (y1 - y0));
  };
  const pY = escY(EY, !!ey.inverter), pY2 = EY2 ? escY(EY2, !!(E.y2 && E.y2.inverter)) : pY;
  const pX = EX ? (v) => x0 + ((v - EX.min) / ((EX.max - EX.min) || 1)) * (x1 - x0) : null;
  const zeroY = pY(Math.min(Math.max(0, EY.min), EY.max));

  /* ----- grade ----- */
  const gradeV = ey.grade, gradeC = ex.grade;
  add('<g data-parte="eixo:y">');
  if (gradeV && !(gradeV.t === 'nenhum')) for (const v of EY.ticks) {
    const p = r1(pY(v));
    add(horiz ? `<line x1="${p}" y1="${r1(y0)}" x2="${p}" y2="${r1(y1)}"${atrLinha(gradeV, T.grade, 1)}/>` : `<line x1="${r1(x0)}" y1="${p}" x2="${r1(x1)}" y2="${p}"${atrLinha(gradeV, T.grade, 1)}/>`);
  }
  add('</g>');
  if (gradeC && gradeC.t !== 'nenhum') {
    add('<g data-parte="eixo:x">');
    if (disp) for (const v of EX.ticks) add(`<line x1="${r1(pX(v))}" y1="${r1(y0)}" x2="${r1(pX(v))}" y2="${r1(y1)}"${atrLinha(gradeC, T.grade, 1)}/>`);
    else for (let k = 0; k <= nCat; k++) { const p = (horiz ? y0 : x0) + espCat * k; add(horiz ? `<line x1="${r1(x0)}" y1="${r1(p)}" x2="${r1(x1)}" y2="${r1(p)}"${atrLinha(gradeC, T.grade, 1)}/>` : `<line x1="${r1(p)}" y1="${r1(y0)}" x2="${r1(p)}" y2="${r1(y1)}"${atrLinha(gradeC, T.grade, 1)}/>`); }
    add('</g>');
  }

  /* ----- séries ----- */
  const metaPadrao = metaPadraoDe(P);
  const corDoPonto = (S, i, k, v) => {
    const pt = S.pontos && S.pontos[k];
    if (pt && pt.preench) return pt.preench;
    if (P.semaforo) return { t: 'solido', cor: corSemaforo(v, P.semaforo, metaPadrao) };
    if (P.destaque && P.destaque.como === 'max' && i === lista[0].i) { const vals = S.vals.num || []; const mx = Math.max(...vals.filter(ehNum)); if (v === mx) return { t: 'solido', cor: P.destaque.cor }; }
    return null;
  };
  const rotulos = [];
  /* barras */
  for (const G of grupos.filter((x) => x.tipo === 'bar')) {
    const pYg = G.eixo2 ? pY2 : pY;
    const Esc = G.eixo2 && EY2 ? EY2 : EY;
    const emp = G.agrup === 'stacked' || G.agrup === 'percentStacked';
    const N = G.series.length;
    const gap = (ehNum(G.espaco) ? G.espaco : 150) / 100;
    const ov = emp ? 1 : (ehNum(G.sobrepor) ? G.sobrepor : 0) / 100;
    const larg = (P.colado ? espCat * 0.98 : espCat / (N - (N - 1) * ov + gap));
    const grupoL = emp ? larg : larg * (N - (N - 1) * ov);
    const basePos = new Array(nCat).fill(0), baseNeg = new Array(nCat).fill(0);
    const tot = emp && G.agrup === 'percentStacked' ? Array.from({ length: nCat }, (_, k) => G.series.reduce((a, S) => a + Math.abs((S.vals.num || [])[k] || 0), 0)) : null;
    G.series.forEach((S, j) => {
      const i = serieIndice(P, S);
      const cor = corDaSerie(P, i, S);
      add(`<g data-parte="serie:${i}"${C.efeito(S.efeito)}>`);
      (S.vals.num || []).forEach((v0, k) => {
        if (!ehNum(v0)) return;
        let v = v0;
        if (tot) v = tot[k] ? v0 / tot[k] : 0;
        let a = 0, b = v;
        if (emp) { if (v >= 0) { a = basePos[k]; b = a + v; basePos[k] = b; } else { a = baseNeg[k]; b = a + v; baseNeg[k] = b; } }
        else a = Math.min(Math.max(0, Esc.min), Esc.max);
        const c0 = posCat(k) - grupoL / 2 + (emp ? 0 : j * larg * (1 - ov));
        const pa = pYg(a), pb = pYg(b);
        const pt = (S.pontos && S.pontos[k]) || {};
        const pr = corDoPonto(S, i, k, v0) || S.preench || { t: 'solido', cor };
        const ln = pt.contorno || S.contorno;
        const st = atrLinha(ln, null, 1) || '';
        const raio = P.nativo && !P.colado && !st ? 2 : 0;
        const r = horiz ? { x: Math.min(pa, pb), y: c0, w: Math.max(1, Math.abs(pb - pa)), h: Math.max(1, larg - (P.colado ? 0.5 : 0)) } : { x: c0, y: Math.min(pa, pb), w: Math.max(1, larg - (P.colado ? 0.5 : 0)), h: Math.max(1, Math.abs(pb - pa)) };
        add(`<rect x="${r1(r.x)}" y="${r1(r.y)}" width="${r1(r.w)}" height="${r1(r.h)}" rx="${raio}"${C.preench(pr, cor)}${st}${pt.efeito ? C.efeito(pt.efeito) : ''} data-parte="ponto:${i}:${k}"/>`);
        const R2 = rotuloDoPonto(S, k);
        if (R2 && !mini && (R2.val || R2.pct || R2.cat || R2.nome)) {
          const t = textoRotulo(P, R2, S, k, v0, tot ? tot[k] : 0);
          const tam = ehNum(R2.tam) ? R2.tam * PT : fs - 1;
          const pos = R2.pos || (emp ? 'ctr' : 'outEnd');
          const neg = b < a;
          let x, y, anc = 'middle', corR = R2.cor;
          if (horiz) {
            y = r.y + r.h / 2 + tam / 3;
            if (pos === 'ctr') x = r.x + r.w / 2;
            else if (pos === 'inEnd') { x = neg ? r.x + 4 : r.x + r.w - 4; anc = neg ? 'start' : 'end'; }
            else if (pos === 'inBase') { x = neg ? r.x + r.w - 4 : r.x + 4; anc = neg ? 'end' : 'start'; }
            else { x = neg ? r.x - 4 : r.x + r.w + 4; anc = neg ? 'end' : 'start'; }
          } else {
            x = r.x + r.w / 2;
            if (pos === 'ctr') y = r.y + r.h / 2 + tam / 3;
            else if (pos === 'inEnd') y = neg ? r.y + r.h - 4 : r.y + tam + 2;
            else if (pos === 'inBase') y = neg ? r.y + tam + 2 : r.y + r.h - 4;
            else y = neg ? r.y + r.h + tam + 2 : r.y - 4;
          }
          if (!corR) corR = pos === 'outEnd' || (pr.t === 'nenhum') ? corTexto : contraste(pr);
          rotulos.push(txt(x, y, t, { tam, cor: corR, negrito: !!R2.negrito, anc }));
        }
      });
      add('</g>');
    });
  }
  /* áreas */
  for (const G of grupos.filter((x) => x.tipo === 'area')) {
    const pYg = G.eixo2 ? pY2 : pY;
    const emp = G.agrup === 'stacked' || G.agrup === 'percentStacked';
    const base = new Array(nCat).fill(0);
    const tot = G.agrup === 'percentStacked' ? Array.from({ length: nCat }, (_, k) => G.series.reduce((a, S) => a + Math.abs((S.vals.num || [])[k] || 0), 0)) : null;
    G.series.forEach((S) => {
      const i = serieIndice(P, S);
      const cor = corDaSerie(P, i, S);
      const topoV = [], baseV = [];
      for (let k = 0; k < nCat; k++) {
        let v = (S.vals.num || [])[k]; if (!ehNum(v)) v = 0;
        if (tot) v = tot[k] ? v / tot[k] : 0;
        const a = emp ? base[k] : 0, b = a + v;
        if (emp) base[k] = b;
        topoV.push([posCat(k), pYg(b)]); baseV.push([posCat(k), pYg(a)]);
      }
      const d = `M${topoV.map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L')}L${baseV.reverse().map((p) => `${r1(p[0])} ${r1(p[1])}`).join('L')}Z`;
      const pr = S.preench || { t: 'solido', cor, alfa: P.nativo ? 0.35 : 1 };
      add(`<path d="${d}"${C.preench(pr, cor)}${atrLinha(S.contorno || S.linha, P.nativo ? cor : null, 2) || ''}${C.efeito(S.efeito)} data-parte="serie:${i}"/>`);
      if (!mini) topoV.forEach((p, k) => {
        const R2 = rotuloDoPonto(S, k); const v = (S.vals.num || [])[k];
        if (!R2 || !ehNum(v) || !(R2.val || R2.pct || R2.cat || R2.nome)) return;
        const tam = ehNum(R2.tam) ? R2.tam * PT : fs - 1;
        rotulos.push(txt(p[0], p[1] - 6, textoRotulo(P, R2, S, k, v, 0), { tam, cor: R2.cor || corTexto, negrito: !!R2.negrito, anc: 'middle' }));
      });
    });
  }
  /* linhas e dispersão */
  for (const G of grupos.filter((x) => x.tipo === 'line' || x.tipo === 'scatter')) {
    const pYg = G.eixo2 ? pY2 : pY;
    const emp = G.agrup === 'stacked' || G.agrup === 'percentStacked';
    const base = new Array(nCat).fill(0);
    G.series.forEach((S) => {
      const i = serieIndice(P, S);
      const cor = corDaSerie(P, i, S);
      const pts = (S.vals.num || []).map((v, k) => {
        if (!ehNum(v)) return P.vazio === 'zero' ? [G.tipo === 'scatter' ? pX(0) : posCat(k), pYg(0), k] : null;
        let vv = v;
        if (emp) { vv = base[k] + v; base[k] = vv; }
        if (G.tipo === 'scatter') { const xv = (S.cats.num || [])[k]; if (!ehNum(xv)) return null; return [pX(xv), pYg(vv), k]; }
        return [posCat(k), pYg(vv), k];
      });
      const ln = S.linha || (G.tipo === 'scatter' && G.estilo === 'marker' ? { t: 'nenhum' } : null);
      const st = atrLinha(ln, cor, P.nativo ? (mini ? 1.5 : 2.2) : 2.25 * PT);
      add(`<g data-parte="serie:${i}"${C.efeito(S.efeito)}>`);
      if (st) {
        const segs = [];
        let atual = [];
        for (const p of pts) { if (p) atual.push(p); else if (P.vazio !== 'span' && atual.length) { segs.push(atual); atual = []; } }
        if (atual.length) segs.push(atual);
        for (const sg of segs) add(`<path d="${caminho(sg, !!S.suave)}" fill="none"${st} stroke-linejoin="round" stroke-linecap="round"/>`);
      }
      const mPadrao = S.marcador || (P.nativo ? null : G.marcas !== false && G.tipo === 'line' ? { forma: 'auto' } : G.tipo === 'scatter' ? { forma: 'auto' } : null);
      if (!mini || G.tipo === 'scatter') pts.forEach((p) => {
        if (!p) return;
        const pt = (S.pontos && S.pontos[p[2]]) || {};
        let m = pt.marcador ? { ...(mPadrao || {}), ...pt.marcador } : mPadrao;
        const semCor = corDoPonto(S, i, p[2], (S.vals.num || [])[p[2]]);
        if (semCor && m) m = { ...m, preench: semCor, contorno: { t: 'solido', cor: semCor.cor } };
        if (!m || m.forma === 'none') return;
        if (m.forma === 'auto') m = { ...m, forma: ['diamond', 'square', 'triangle', 'x', 'star', 'circle'][i % 6] === 'x' ? 'circle' : ['diamond', 'square', 'triangle', 'circle', 'circle', 'circle'][i % 6] };
        const mm = P.nativo && !m.preench ? { ...m, preench: { t: 'solido', cor: '#ffffff' }, contorno: m.contorno || { t: 'solido', cor, larg: 1.5 } } : m;
        add(marcador(mm, p[0], p[1], cor, C, mini ? 0.6 : 1));
      });
      add('</g>');
      /* rótulos */
      if (!mini) pts.forEach((p) => {
        if (!p) return;
        const R2 = rotuloDoPonto(S, p[2]);
        if (!R2 || !(R2.val || R2.pct || R2.cat || R2.nome)) return;
        const v = (S.vals.num || [])[p[2]];
        const t = textoRotulo(P, R2, S, p[2], v, 0);
        const tam = ehNum(R2.tam) ? R2.tam * PT : fs - 1;
        const pos = R2.pos || (P.nativo ? 't' : 'r');
        let x = p[0], y = p[1] - 8, anc = 'middle';
        if (pos === 'r') { x = p[0] + 7; y = p[1] + tam / 3; anc = 'start'; } else if (pos === 'l') { x = p[0] - 7; y = p[1] + tam / 3; anc = 'end'; } else if (pos === 'b') y = p[1] + tam + 6; else if (pos === 'ctr') y = p[1] + tam / 3;
        rotulos.push(txt(x, y, t, { tam, cor: R2.cor || corTexto, negrito: !!R2.negrito, anc }));
      });
      /* linha de tendência */
      if (S.tendencia && !mini) {
        const tr = S.tendencia;
        const xy = pts.filter(Boolean).map((p) => [G.tipo === 'scatter' ? (S.cats.num || [])[p[2]] : p[2], (S.vals.num || [])[p[2]], p]);
        let dd = '';
        if ((tr.tipo || 'linear') === 'linear' && xy.length > 1) {
          const n = xy.length, sx = xy.reduce((a, q) => a + q[0], 0), sy = xy.reduce((a, q) => a + q[1], 0), sxy = xy.reduce((a, q) => a + q[0] * q[1], 0), sxx = xy.reduce((a, q) => a + q[0] * q[0], 0);
          const b = (n * sxy - sx * sy) / ((n * sxx - sx * sx) || 1), a = (sy - b * sx) / n;
          const xa = xy[0][0], xb = xy[xy.length - 1][0];
          const px = (xv) => (G.tipo === 'scatter' ? pX(xv) : posCat(xv));
          dd = `M${r1(px(xa))} ${r1(pYg(a + b * xa))}L${r1(px(xb))} ${r1(pYg(a + b * xb))}`;
        } else if (tr.tipo === 'media' && xy.length > 1) {
          const per = Math.max(2, tr.periodo || 2);
          const mm = [];
          for (let k = per - 1; k < xy.length; k++) { let s = 0; for (let j = 0; j < per; j++) s += xy[k - j][1]; mm.push([xy[k][2][0], pYg(s / per)]); }
          dd = caminho(mm, false);
        }
        if (dd) add(`<path d="${dd}" fill="none"${atrLinha(tr.linha, cor, 1.5) || ` stroke="${cor}"`} stroke-dasharray="${tr.linha && tr.linha.tr ? '' : '5 4'}" data-parte="serie:${i}"/>`);
      }
    });
  }
  /* linhas de referência (meta, LSC, média, LIC, 80% do Pareto) */
  for (const r of P.ref || []) {
    const p = r1((r.eixo2 && EY2 ? pY2 : pY)(r.v));
    if (horiz) { if (!(p >= x0 - 1 && p <= x1 + 1)) continue; add(`<line x1="${p}" y1="${r1(y0)}" x2="${p}" y2="${r1(y1)}" stroke="${r.cor}" stroke-width="1.5"${r.tr || r.eixo2 ? ' stroke-dasharray="6 4"' : ''}/>`); continue; }
    if (!(p >= y0 - 1 && p <= y1 + 1)) continue;
    add(`<line x1="${r1(x0)}" y1="${p}" x2="${r1(x1)}" y2="${p}" stroke="${r.cor}" stroke-width="1.5"${r.tr || r.eixo2 ? ' stroke-dasharray="6 4"' : ''} data-parte="meta"/>`);
    if (r.rot && !mini) add(txt(x1 - 4, p - 4, r.rot, { tam: fs - 1, cor: r.cor, negrito: true, anc: 'end' }).replace('<text ', `<text paint-order="stroke" stroke="${(P.fundo && P.fundo.preench && P.fundo.preench.cor) || T.fundo}" stroke-width="3" stroke-linejoin="round" `));
  }

  /* ----- eixos (linhas e números) ----- */
  if (!mini) {
    /* linha do eixo das categorias (no zero do eixo de valores) */
    const lnCat = ex.linha === undefined ? (P.nativo ? null : { t: 'solido', cor: T.eixo }) : ex.linha;
    if (!disp && lnCat && lnCat.t !== 'nenhum' && !ex.apagado) add(horiz ? `<line x1="${r1(zeroY)}" y1="${r1(y0)}" x2="${r1(zeroY)}" y2="${r1(y1)}"${atrLinha(lnCat, T.eixo, 1)} data-parte="eixo:x"/>` : `<line x1="${r1(x0)}" y1="${r1(zeroY)}" x2="${r1(x1)}" y2="${r1(zeroY)}"${atrLinha(lnCat, T.eixo, 1)} data-parte="eixo:x"/>`);
    if (P.nativo && !disp && !lnCat && ey.grade && !horiz && EY.min < 0 && EY.max > 0) add(`<line x1="${r1(x0)}" y1="${r1(zeroY)}" x2="${r1(x1)}" y2="${r1(zeroY)}" stroke="${T.eixo}"/>`);
    if (ey.linha && ey.linha.t !== 'nenhum' && !ey.apagado) add(horiz ? `<line x1="${r1(x0)}" y1="${r1(y1)}" x2="${r1(x1)}" y2="${r1(y1)}"${atrLinha(ey.linha, T.eixo, 1)}/>` : `<line x1="${r1(x0)}" y1="${r1(y0)}" x2="${r1(x0)}" y2="${r1(y1)}"${atrLinha(ey.linha, T.eixo, 1)}/>`);
    /* números do eixo de valores */
    if (vis(ey)) {
      add(`<g data-parte="eixo:y" font-size="${r1(fsE(ey))}" fill="${corE(ey)}"${rotE(ey).negrito ? ' font-weight="700"' : ''}>`);
      for (const v of EY.ticks) { const p = pY(v); add(horiz ? `<text x="${r1(p)}" y="${r1(y1 + fsE(ey) + 3)}" text-anchor="middle">${esc(fmtEixo(ey, EY, v))}</text>` : `<text x="${r1(x0 - 6)}" y="${r1(p + fsE(ey) / 3)}" text-anchor="end">${esc(fmtEixo(ey, EY, v))}</text>`); }
      add('</g>');
    }
    if (EY2 && vis(E.y2)) {
      add(`<g data-parte="eixo:y2" font-size="${r1(fsE(E.y2))}" fill="${corE(E.y2)}">`);
      for (const v of EY2.ticks) add(`<text x="${r1(x1 + 6)}" y="${r1(pY2(v) + fsE(E.y2) / 3)}">${esc(fmtEixo(E.y2, EY2, v))}</text>`);
      add('</g>');
    }
    /* categorias */
    if (vis(ex)) {
      const fe = horiz || disp ? fsE(ex) : fsCat;
      add(`<g data-parte="eixo:x" font-size="${r1(fe)}" fill="${corE(ex)}"${rotE(ex).negrito ? ' font-weight="700"' : ''}>`);
      if (disp) for (const v of EX.ticks) add(`<text x="${r1(pX(v))}" y="${r1(y1 + fe + 3)}" text-anchor="middle">${esc(fmtEixo(ex, EX, v))}</text>`);
      else {
        const caber = Math.max(1, Math.floor((horiz ? y1 - y0 : x1 - x0) / (horiz ? fe + 4 : girar ? fe * 1.9 : 30)));
        const pulo = Math.max(1, Math.ceil(nCat / caber));
        catsTxt.forEach((c, k) => {
          if (k % pulo) return;
          const p = posCat(k);
          if (horiz) add(`<text x="${r1(x0 - 6)}" y="${r1(p + fe / 3)}" text-anchor="end">${esc(corte(c, 26))}</text>`);
          else if (girar) add(`<text transform="translate(${r1(p)},${r1(y1 + 8)}) rotate(-35)" text-anchor="end">${esc(corte(c, 18))}</text>`);
          else {
            /* duas linhas quando o nome é comprido e cabe */
            const palavras = String(c).split(' ');
            if (String(c).length * fe * (rotE(ex).negrito ? 0.6 : 0.52) > espCat - 4 && palavras.length > 1) {
              const meio = Math.ceil(palavras.length / 2);
              add(`<text x="${r1(p)}" y="${r1(y1 + fe + 3)}" text-anchor="middle">${esc(palavras.slice(0, meio).join(' '))}</text><text x="${r1(p)}" y="${r1(y1 + 2 * fe + 5)}" text-anchor="middle">${esc(palavras.slice(meio).join(' '))}</text>`);
            } else add(`<text x="${r1(p)}" y="${r1(y1 + fe + 3)}" text-anchor="middle">${esc(c)}</text>`);
          }
        });
      }
      add('</g>');
    }
    /* títulos dos eixos */
    const tituloEixo = (e, onde) => {
      const t = titE(e);
      if (!t) return;
      const tam = ehNum(t.tam) ? t.tam * PT : fs - 1;
      const o = { tam, cor: t.cor || corFraco, negrito: t.negrito !== false, anc: 'middle', parte: onde === 'b' ? 'eixo:x' : onde === 'r' ? 'eixo:y2' : 'eixo:y' };
      if (onde === 'l') add(txt(A.x + tam, (y0 + y1) / 2, t.texto, { ...o, rot: -90 }));
      else if (onde === 'r') add(txt(A.x + A.w - 2, (y0 + y1) / 2, t.texto, { ...o, rot: 90 }));
      else add(txt((x0 + x1) / 2, A.y + A.h - 2, t.texto, o));
    };
    tituloEixo(eV, 'l'); tituloEixo(eH, 'b'); if (E.y2) tituloEixo(E.y2, 'r');
  }
  rotulos.forEach((r) => add(r));
}

/** Miniatura simples de um tipo (para os botões). */
export function svgMini(g, d, w = 64, h = 40, tema = TEMA_CLARO, lerFaixa = null) {
  return svgDoPlano(planoDoGrafico(g, d, lerFaixa), { w, h, tema, mini: true });
}
