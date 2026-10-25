/* EFCdocs — Planilha: desenho da grade num canvas (só o que aparece na tela, por isso rola leve
   mesmo com muitas linhas) e "onde caiu o toque". */
import { letraCol, MAX_LIN, MAX_COL, chave } from './ref.js';
import { formatar } from './formato.js';
import { estiloDe, mescladas, mesclaEm } from './modelo.js';
import { ehErro } from './valores.js';

export const CAB_W = 46, CAB_H = 24; // cabeçalhos (a 100%)
const PAD = 4;

/** Geometria da tela: posições das linhas/colunas considerando zoom, rolagem e painéis congelados. */
export function geometria({ linhas, colunas, z, sx, sy, cong, W, H }) {
  const cl = cong ? cong.l : 0, cc = cong ? cong.c : 0;
  /* a coluna dos números das linhas alarga quando a linha passa de 9999 */
  const ultimaVisivel = Math.min(MAX_LIN, linhas.em(linhas.pos(cl) + sy + H / z) + 2);
  const hw = Math.round(Math.max(CAB_W, 14 + 8 * String(ultimaVisivel).length) * Math.max(0.8, z)), hh = Math.round(CAB_H * Math.max(0.8, z));
  const fy = linhas.pos(cl) * z, fx = colunas.pos(cc) * z;
  const baseY = linhas.pos(cl) + sy, baseX = colunas.pos(cc) + sx;
  const yDe = (l) => (l < cl ? hh + linhas.pos(l) * z : hh + fy + (linhas.pos(l) - baseY) * z);
  const xDe = (c) => (c < cc ? hw + colunas.pos(c) * z : hw + fx + (colunas.pos(c) - baseX) * z);
  const linEm = (y) => {
    if (y < hh) return -1;
    if (y < hh + fy) return linhas.em((y - hh) / z);
    return Math.min(MAX_LIN - 1, linhas.em(baseY + (y - hh - fy) / z));
  };
  const colEm = (x) => {
    if (x < hw) return -1;
    if (x < hw + fx) return colunas.em((x - hw) / z);
    return Math.min(MAX_COL - 1, colunas.em(baseX + (x - hw - fx) / z));
  };
  const l0 = linhas.em(baseY), c0 = colunas.em(baseX);
  let l1 = linEm(H - 1); if (l1 < 0) l1 = l0;
  let c1 = colEm(W - 1); if (c1 < 0) c1 = c0;
  return { hw, hh, fy, fx, cl, cc, yDe, xDe, linEm, colEm, l0, l1: Math.min(MAX_LIN - 1, l1 + 1), c0, c1: Math.min(MAX_COL - 1, c1 + 1), z, W, H, linhas, colunas };
}

/* ---------- cores ---------- */
function rgb(hex) {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((x) => x + x).join('') : h;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}
const luz = ([r, g, b]) => {
  const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contraste = (a, b) => { const x = luz(a), y = luz(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** Cor de letra posta de propósito que ficou ilegível no fundo escuro: clareia só na tela (o arquivo não muda). */
export function corLegivel(cor, fundo) {
  try {
    const a = rgb(cor), b = rgb(fundo);
    if (contraste(a, b) >= 3) return cor;
    const escuro = luz(b) < 0.4;
    for (let t = 0.15; t <= 1; t += 0.15) {
      const m = a.map((x) => Math.round(escuro ? x + (255 - x) * t : x * (1 - t)));
      if (contraste(m, b) >= 3.2) return '#' + m.map((x) => x.toString(16).padStart(2, '0')).join('');
    }
    return escuro ? '#ffffff' : '#000000';
  } catch { return cor; }
}

/* fonte padrão (Excel: Calibri 11; aqui a fonte do app, do mesmo tamanho visual) */
export const FONTE_PADRAO = 11;
const pxDaFonte = (pt) => pt * (4 / 3) * 0.9;
export function fonteCanvas(e, z, familia) {
  const tam = pxDaFonte(e.tam || FONTE_PADRAO) * z;
  return `${e.i ? 'italic ' : ''}${e.b ? '700 ' : '400 '}${tam.toFixed(1)}px ${e.fonte ? `"${e.fonte}", ` : ''}${familia}`;
}

/** Texto e alinhamento que a célula mostra. */
export function textoCelula(motor, c, abaId, l, col) {
  const cel = c.abas[abaId].cel[chave(l, col)];
  const v = motor.valor(abaId, l, col);
  const e = estiloDe(c, cel);
  const r = formatar(v, e.nf);
  let al = e.al;
  if (!al) al = typeof v === 'number' ? 'd' : typeof v === 'boolean' || ehErro(v) ? 'c' : 'e';
  return { ...r, v, e, al, cel };
}

/**
 * Desenha tudo. p = { cv, ctx, c, motor, abaId, G, cores, sel, refsFormula, copia, spill, familia, grade, celular, mesclas }
 */
export function desenhar(p) {
  const { ctx, c, motor, abaId, G, cores, sel, familia } = p;
  const aba = c.abas[abaId];
  const { W, H, hw, hh, z } = G;
  ctx.save();
  ctx.fillStyle = cores.fundo;
  ctx.fillRect(0, 0, W, H);

  const mesc = p.mesclas || mescladas(aba);

  /* quatro quadrantes (painéis congelados): [linhas, colunas, recorte] */
  const quad = [];
  const fimY = H, fimX = W;
  const colsLivres = [Math.max(G.cc, G.c0), G.c1], linsLivres = [Math.max(G.cl, G.l0), G.l1];
  const colsCong = G.cc ? [0, G.cc - 1] : null, linsCong = G.cl ? [0, G.cl - 1] : null;
  quad.push({ L: linsLivres, C: colsLivres, x: hw + G.fx, y: hh + G.fy, w: fimX - hw - G.fx, h: fimY - hh - G.fy });
  if (linsCong) quad.push({ L: linsCong, C: colsLivres, x: hw + G.fx, y: hh, w: fimX - hw - G.fx, h: G.fy });
  if (colsCong) quad.push({ L: linsLivres, C: colsCong, x: hw, y: hh + G.fy, w: G.fx, h: fimY - hh - G.fy });
  if (linsCong && colsCong) quad.push({ L: linsCong, C: colsCong, x: hw, y: hh, w: G.fx, h: G.fy });

  for (const q of quad) {
    if (q.w <= 0 || q.h <= 0) continue;
    ctx.save();
    ctx.beginPath(); ctx.rect(q.x, q.y, q.w, q.h); ctx.clip();
    desenharCelulas(p, q.L, q.C, mesc);
    desenharSelecao(p, q);
    ctx.restore();
  }

  /* linhas dos painéis congelados */
  if (G.cl) { ctx.fillStyle = cores.congelado; ctx.fillRect(0, hh + G.fy - 1, W, 2); }
  if (G.cc) { ctx.fillStyle = cores.congelado; ctx.fillRect(hw + G.fx - 1, 0, 2, H); }

  desenharCabecalhos(p, mesc);
  ctx.restore();
}

function desenharCelulas(p, [la, lb], [ca, cb], mesc) {
  const { ctx, c, motor, abaId, G, cores, familia } = p;
  const aba = c.abas[abaId];
  const { z } = G;
  const vistas = new Set();
  /* fundos */
  for (let l = la; l <= lb; l++) {
    const h = G.linhas.tam(l) * z;
    if (!h) continue;
    const y = G.yDe(l);
    for (let col = ca; col <= cb; col++) {
      const w = G.colunas.tam(col) * z;
      if (!w) continue;
      const cel = aba.cel[chave(l, col)];
      const e = estiloDe(c, cel);
      if (e.fundo) { ctx.fillStyle = e.fundo; ctx.fillRect(G.xDe(col), y, w, h); }
    }
  }
  /* mescladas: fundo e área */
  for (const m of mesc) {
    if (m.l2 < la || m.l1 > lb || m.c2 < ca || m.c1 > cb) continue;
    const cel = aba.cel[chave(m.l1, m.c1)];
    const e = estiloDe(c, cel);
    const x = G.xDe(m.c1), y = G.yDe(m.l1), w = G.xDe(m.c2 + 1) - x, h = G.yDe(m.l2 + 1) - y;
    ctx.fillStyle = e.fundo || cores.fundo;
    ctx.fillRect(x, y, w, h);
  }
  /* linhas de grade */
  if (p.grade) {
    ctx.strokeStyle = cores.grade;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let l = la; l <= lb + 1; l++) {
      if (!G.linhas.tam(l - 1) && l > 0) continue;
      const y = Math.round(G.yDe(l)) - 0.5;
      ctx.moveTo(G.xDe(ca), y); ctx.lineTo(G.xDe(cb + 1), y);
    }
    for (let col = ca; col <= cb + 1; col++) {
      if (!G.colunas.tam(col - 1) && col > 0) continue;
      const x = Math.round(G.xDe(col)) - 0.5;
      ctx.moveTo(x, G.yDe(la)); ctx.lineTo(x, G.yDe(lb + 1));
    }
    ctx.stroke();
    /* apaga a grade dentro das mescladas e das células pintadas (como o Excel) */
    for (const m of mesc) {
      if (m.l2 < la || m.l1 > lb || m.c2 < ca || m.c1 > cb) continue;
      const cel = aba.cel[chave(m.l1, m.c1)];
      const e = estiloDe(c, cel);
      const x = G.xDe(m.c1), y = G.yDe(m.l1), w = G.xDe(m.c2 + 1) - x, h = G.yDe(m.l2 + 1) - y;
      ctx.fillStyle = e.fundo || cores.fundo;
      ctx.fillRect(x + 0.5, y + 0.5, w - 1.5, h - 1.5);
    }
  }
  /* textos */
  ctx.textBaseline = 'alphabetic';
  for (let l = la; l <= lb; l++) {
    const h = G.linhas.tam(l) * z;
    if (!h) continue;
    const y = G.yDe(l);
    for (let col = ca; col <= cb; col++) {
      const w0 = G.colunas.tam(col) * z;
      if (!w0) continue;
      const m = mesc.length ? mesclaEm(mesc, l, col) : null;
      if (m && (m.l1 !== l || m.c1 !== col)) {
        /* parte de mesclada: desenha a partir da primeira célula visível uma vez só */
        if (vistas.has(m.t) || !(l === Math.max(m.l1, la) && col === Math.max(m.c1, ca))) continue;
      }
      if (m) vistas.add(m.t);
      const cl = m ? m.l1 : l, cc = m ? m.c1 : col;
      const cel = aba.cel[chave(cl, cc)];
      let tx;
      if (!cel && !motor.areaDerramada(abaId, cl, cc)) continue;
      tx = textoCelula(motor, c, abaId, cl, cc);
      if (tx.t === '') continue;
      const x = G.xDe(cc), yy = G.yDe(cl);
      const w = m ? G.xDe(m.c2 + 1) - x : w0, hh = m ? G.yDe(m.l2 + 1) - yy : h;
      desenharTexto(p, tx, x, yy, w, hh, l, col, aba, mesc);
    }
  }
  /* bordas */
  for (let l = la; l <= lb; l++) {
    if (!G.linhas.tam(l)) continue;
    for (let col = ca; col <= cb; col++) {
      const cel = aba.cel[chave(l, col)];
      if (!cel || !cel.s) continue;
      const e = estiloDe(c, cel);
      if (!e.bd) continue;
      const x = G.xDe(col), y = G.yDe(l), w = G.colunas.tam(col) * z, h = G.linhas.tam(l) * z;
      ctx.strokeStyle = e.bdc || cores.borda;
      const lado = (k, x1, y1, x2, y2) => {
        if (!e.bd[k]) return;
        ctx.lineWidth = e.bd[k] === 3 ? 3 : e.bd[k] === 2 ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      };
      const r = (n) => Math.round(n) - 0.5;
      lado('t', x, r(y), x + w, r(y));
      lado('b', x, r(y + h), x + w, r(y + h));
      lado('l', r(x), y, r(x), y + h);
      lado('r', r(x + w), y, r(x + w), y + h);
    }
  }
}

function desenharTexto(p, tx, x, y, w, h, l, col, aba, mesc) {
  const { ctx, G, cores, familia, c, motor, abaId } = p;
  const { z } = G;
  const e = tx.e;
  ctx.font = fonteCanvas(e, z, familia);
  const fundo = e.fundo || cores.fundo;
  let cor = tx.cor || e.cor || cores.texto;
  if (e.cor || tx.cor) cor = corLegivel(cor, fundo.startsWith('#') ? fundo : cores.fundoHex);
  /* fundo pintado de propósito e letra automática: a letra fica escura ou clara conforme o fundo (PL23) */
  else if (e.fundo && e.fundo.startsWith('#')) { try { cor = luz(rgb(e.fundo)) > 0.35 ? '#1f1f1f' : '#ffffff'; } catch { /* cor inválida */ } }
  ctx.fillStyle = cor;
  const tam = pxDaFonte(e.tam || FONTE_PADRAO) * z;
  const pad = PAD * z;
  let texto = tx.t;
  if (e.qb) {
    /* quebra de texto dentro da célula */
    const linhas = quebrar(ctx, texto, w - 2 * pad);
    const alt = tam * 1.25;
    const total = linhas.length * alt;
    let y0 = e.av === 't' ? y + pad + tam : e.av === 'm' || e.av === 'c' ? y + (h - total) / 2 + tam : y + h - total - pad + tam;
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    for (const ln of linhas) {
      const lw = ctx.measureText(ln).width;
      const xx = tx.al === 'd' ? x + w - pad - lw : tx.al === 'c' ? x + (w - lw) / 2 : x + pad;
      ctx.fillText(ln, xx, y0);
      if (e.u) ctx.fillRect(xx, y0 + 2 * z, lw, Math.max(1, z));
      y0 += alt;
    }
    ctx.restore();
    return;
  }
  let largura = ctx.measureText(texto).width;
  /* número que não cabe: #### (como o Excel) */
  /* número em "Geral" que não cabe: vira notação científica antes de virar #### (como o Excel) */
  if (tx.num && largura > w - 2 * pad && (!e.nf || /^general$/i.test(e.nf)) && typeof tx.v === 'number') {
    for (let casas = 5; casas >= 0 && largura > w - 2 * pad; casas--) {
      const [m, ex] = tx.v.toExponential(casas).split('e');
      texto = m.replace('.', ',') + 'E' + (+ex < 0 ? '-' : '+') + String(Math.abs(+ex)).padStart(2, '0');
      largura = ctx.measureText(texto).width;
    }
  }
  if (tx.num && largura > w - 2 * pad && !mesclaEm(mesc, l, col)) {
    const um = ctx.measureText('#').width || 6;
    texto = '#'.repeat(Math.max(1, Math.floor((w - 2 * pad) / um)));
    largura = ctx.measureText(texto).width;
  }
  const yb = e.av === 't' ? y + pad + tam * 0.85 : e.av === 'm' || e.av === 'c' ? y + h / 2 + tam * 0.35 : y + h - pad - Math.max(0, (h - tam * 1.3) * 0.08) - 1 * z;
  let xx = tx.al === 'd' ? x + w - pad - largura : tx.al === 'c' ? x + (w - largura) / 2 : x + pad;
  /* texto que passa da célula: avança sobre as vizinhas vazias (só texto à esquerda/direita) */
  let x1 = x, x2 = x + w;
  if (largura > w - 2 * pad && !tx.num) {
    if (tx.al === 'e' || tx.al === 'c') {
      let cc = col + 1;
      while (x2 < xx + largura + pad && cc < G.colunas.max && cc < col + 40) {
        if (aba.cel[chave(l, cc)] && aba.cel[chave(l, cc)].v !== undefined) break;
        if (aba.cel[chave(l, cc)] && aba.cel[chave(l, cc)].f != null) break;
        if (motor.areaDerramada(abaId, l, cc)) break;
        x2 += G.colunas.tam(cc) * z;
        cc++;
      }
    }
    if (tx.al === 'd' || tx.al === 'c') {
      let cc = col - 1;
      while (x1 > xx - pad && cc >= 0 && cc > col - 40) {
        if (aba.cel[chave(l, cc)] && (aba.cel[chave(l, cc)].v !== undefined || aba.cel[chave(l, cc)].f != null)) break;
        x1 -= G.colunas.tam(cc) * z;
        cc--;
      }
    }
  }
  const escreve = (a, b, c2) => {
    ctx.save();
    ctx.beginPath(); ctx.rect(a, y, b - a, h); ctx.clip();
    ctx.fillStyle = c2;
    ctx.fillText(texto, xx, yb);
    if (e.u) ctx.fillRect(xx, yb + 2 * z, largura, Math.max(1, z));
    if (e.st) ctx.fillRect(xx, yb - tam * 0.3, largura, Math.max(1, z));
    ctx.restore();
  };
  /* apaga a grade sob o texto que avança para as vizinhas */
  ctx.fillStyle = cores.fundo;
  if (x2 > x + w) ctx.fillRect(x + w - (e.fundo ? 0 : w) + 1, y + 1, x2 - (x + w - (e.fundo ? 0 : w)) - 2, h - 2);
  if (x1 < x) ctx.fillRect(x1 + 1, y + 1, x - x1 + (e.fundo ? 0 : w) - 2, h - 2);
  if (e.fundo && (x2 > x + w || x1 < x)) {
    /* dentro da célula pintada usa a cor do fundo dela; fora, a do tema */
    escreve(x, x + w, cor);
    const fora = e.cor || tx.cor ? cor : cores.texto;
    if (x2 > x + w) escreve(x + w, x2, fora);
    if (x1 < x) escreve(x1, x, fora);
  } else escreve(x1, x2, cor);
}

export function quebrar(ctx, texto, larg) {
  const out = [];
  for (const par of String(texto).split('\n')) {
    let linha = '';
    for (const p of par.split(/(\s+)/)) {
      const t = linha + p;
      if (ctx.measureText(t).width <= larg || !linha) linha = t;
      else { out.push(linha.trimEnd()); linha = p.trimStart(); }
    }
    out.push(linha);
  }
  return out;
}

function desenharSelecao(p, q) {
  const { ctx, G, cores, sel } = p;
  const z = G.z;
  const ret = (f) => {
    const x = G.xDe(f.c1), y = G.yDe(f.l1);
    return { x, y, w: G.xDe(f.c2 + 1) - x, h: G.yDe(f.l2 + 1) - y };
  };
  /* referências da fórmula sendo digitada (cores iguais às da fórmula) */
  for (const r of p.refsFormula || []) {
    const a = ret(r);
    ctx.fillStyle = r.cor + '22';
    ctx.fillRect(a.x, a.y, a.w, a.h);
    ctx.strokeStyle = r.cor;
    ctx.lineWidth = 2;
    ctx.strokeRect(a.x + 1, a.y + 1, a.w - 2, a.h - 2);
  }
  /* área derramada da célula ativa */
  if (p.spill) {
    const a = ret(p.spill);
    ctx.setLineDash([4, 3]); ctx.strokeStyle = cores.spill; ctx.lineWidth = 1;
    ctx.strokeRect(a.x + 0.5, a.y + 0.5, a.w - 1, a.h - 1);
    ctx.setLineDash([]);
  }
  if (sel && !p.escondeSel) {
    for (const f of sel.faixas) {
      if (f.l1 === f.l2 && f.c1 === f.c2 && sel.faixas.length === 1) continue;
      const a = ret(f);
      ctx.fillStyle = cores.selFundo;
      ctx.fillRect(a.x, a.y, a.w, a.h);
    }
    /* a célula ativa fica sem a cor de fundo */
    const at = sel.ativaArea || { l1: sel.ativa.l, c1: sel.ativa.c, l2: sel.ativa.l, c2: sel.ativa.c };
    const aa = ret(at);
    const u = sel.faixas[sel.faixas.length - 1];
    const ua = ret(u);
    ctx.strokeStyle = cores.sel;
    ctx.lineWidth = 2;
    ctx.strokeRect(ua.x + 0.5, ua.y + 0.5, ua.w - 1, ua.h - 1);
    if (sel.faixas.length > 1 || u.l1 !== u.l2 || u.c1 !== u.c2) {
      ctx.lineWidth = 1;
      ctx.strokeRect(aa.x + 1.5, aa.y + 1.5, aa.w - 3, aa.h - 3);
    }
    /* alça de preenchimento */
    if (!p.celular && !p.somenteLeitura) {
      ctx.fillStyle = cores.sel;
      const s = 7;
      ctx.fillRect(ua.x + ua.w - s / 2 - 1, ua.y + ua.h - s / 2 - 1, s, s);
      ctx.fillStyle = cores.fundo;
      ctx.fillRect(ua.x + ua.w - s / 2 - 1, ua.y + ua.h - s / 2 - 1, 1, s);
      ctx.fillRect(ua.x + ua.w - s / 2 - 1, ua.y + ua.h - s / 2 - 1, s, 1);
    }
    /* alças do celular (para aumentar a seleção sem mouse) */
    if (p.celular && !p.editando) {
      ctx.fillStyle = cores.fundo; ctx.strokeStyle = cores.sel; ctx.lineWidth = 2;
      for (const [cx, cy] of [[ua.x, ua.y], [ua.x + ua.w, ua.y + ua.h]]) {
        ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
  }
  /* marca do copiar (tracejado) */
  if (p.copia) {
    const a = ret(p.copia);
    ctx.setLineDash([5, 4]); ctx.strokeStyle = cores.sel; ctx.lineWidth = 2;
    ctx.strokeRect(a.x + 1, a.y + 1, a.w - 2, a.h - 2);
    ctx.setLineDash([]);
  }
  /* arrastando a alça: contorno do destino */
  if (p.destino) {
    const a = ret(p.destino);
    ctx.setLineDash([3, 3]); ctx.strokeStyle = cores.textoFraco; ctx.lineWidth = 1;
    ctx.strokeRect(a.x + 0.5, a.y + 0.5, a.w - 1, a.h - 1);
    ctx.setLineDash([]);
  }
}

function desenharCabecalhos(p, mesc) {
  const { ctx, G, cores, sel, familia } = p;
  const { W, H, hw, hh, z } = G;
  ctx.fillStyle = cores.cab;
  ctx.fillRect(0, 0, W, hh);
  ctx.fillRect(0, 0, hw, H);
  const selL = new Set(), selC = new Set();
  let linhaToda = false, colunaToda = false;
  if (sel) {
    for (const f of sel.faixas) {
      if (f.c1 === 0 && f.c2 === MAX_COL - 1) linhaToda = true;
      if (f.l1 === 0 && f.l2 === MAX_LIN - 1) colunaToda = true;
    }
  }
  const destaqueL = (l) => sel && sel.faixas.some((f) => l >= f.l1 && l <= f.l2);
  const destaqueC = (c) => sel && sel.faixas.some((f) => c >= f.c1 && c <= f.c2);
  ctx.font = `500 ${(11.5 * Math.max(0.8, z)).toFixed(1)}px ${familia}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  /* colunas */
  const cols = [];
  if (G.cc) for (let c = 0; c < G.cc; c++) cols.push(c);
  for (let c = Math.max(G.cc, G.c0); c <= G.c1; c++) cols.push(c);
  ctx.save(); ctx.beginPath(); ctx.rect(hw, 0, W - hw, hh); ctx.clip();
  for (const c of cols) {
    const w = G.colunas.tam(c) * z;
    if (!w) continue;
    const x = G.xDe(c);
    if (x > W) continue;
    if (destaqueC(c)) { ctx.fillStyle = cores.cabSel; ctx.fillRect(x, 0, w, hh); ctx.fillStyle = cores.sel; ctx.fillRect(x, hh - 2, w, 2); }
    ctx.fillStyle = destaqueC(c) ? cores.cabSelTexto : cores.cabTexto;
    ctx.fillText(letraCol(c), x + w / 2, hh / 2 + 1);
    ctx.fillStyle = cores.cabLinha;
    ctx.fillRect(Math.round(x + w) - 1, 0, 1, hh);
  }
  ctx.restore();
  /* linhas */
  const lins = [];
  if (G.cl) for (let l = 0; l < G.cl; l++) lins.push(l);
  for (let l = Math.max(G.cl, G.l0); l <= G.l1; l++) lins.push(l);
  ctx.save(); ctx.beginPath(); ctx.rect(0, hh, hw, H - hh); ctx.clip();
  for (const l of lins) {
    const h = G.linhas.tam(l) * z;
    if (!h) continue;
    const y = G.yDe(l);
    if (y > H) continue;
    if (destaqueL(l)) { ctx.fillStyle = cores.cabSel; ctx.fillRect(0, y, hw, h); ctx.fillStyle = cores.sel; ctx.fillRect(hw - 2, y, 2, h); }
    ctx.fillStyle = destaqueL(l) ? cores.cabSelTexto : cores.cabTexto;
    ctx.fillText(String(l + 1), hw / 2, y + h / 2 + 1);
    ctx.fillStyle = cores.cabLinha;
    ctx.fillRect(0, Math.round(y + h) - 1, hw, 1);
  }
  ctx.restore();
  /* canto */
  ctx.fillStyle = cores.cab;
  ctx.fillRect(0, 0, hw, hh);
  ctx.fillStyle = cores.cabLinha;
  ctx.beginPath(); ctx.moveTo(hw - 4, hh - 12); ctx.lineTo(hw - 4, hh - 4); ctx.lineTo(hw - 12, hh - 4); ctx.closePath(); ctx.fill();
  ctx.fillRect(0, hh - 1, W, 1);
  ctx.fillRect(hw - 1, 0, 1, H);
  ctx.textAlign = 'left';
}

/** O que está sob o ponto (x, y) da tela. */
export function ondeCaiu(G, x, y) {
  const { hw, hh } = G;
  if (x < hw && y < hh) return { tipo: 'canto' };
  if (y < hh) {
    const c = G.colEm(x);
    const xd = G.xDe(c + 1);
    const xe = G.xDe(c);
    if (Math.abs(x - xd) <= 4) return { tipo: 'bordaCol', c };
    if (Math.abs(x - xe) <= 4 && c > 0) return { tipo: 'bordaCol', c: c - 1 };
    return { tipo: 'col', c };
  }
  if (x < hw) {
    const l = G.linEm(y);
    const yd = G.yDe(l + 1);
    const ye = G.yDe(l);
    if (Math.abs(y - yd) <= 3) return { tipo: 'bordaLin', l };
    if (Math.abs(y - ye) <= 3 && l > 0) return { tipo: 'bordaLin', l: l - 1 };
    return { tipo: 'lin', l };
  }
  return { tipo: 'cel', l: G.linEm(y), c: G.colEm(x) };
}
