/* EFCdocs v0.6.0 — Imprimir e PDF da planilha: configurar página e paginar (regras puras, como no Excel).
   Cada aba guarda  imp: {
     area: 'A1:F41' (vazio = o que tem dado), orient: 'retrato'|'paisagem', papel: 'A4'|'carta'|'oficio',
     marg: { t, b, l, r, cab, rod } em cm, escala: { modo: 'nenhum'|'pagina'|'colunas'|'linhas'|'pct'|'paginas', pct, largura, altura },
     titLin: '1:2' (linhas repetidas no topo), titCol: 'A:A' (colunas repetidas à esquerda),
     cab: { e, c, d }, rod: { e, c, d } (textos com &[Página] &[Páginas] &[Data] &[Hora] &[Aba] &[Arquivo]),
     grade, titulos (A B C / 1 2 3), centH, centV, ordem: 'baixo'|'lado', qL: [linhas onde começa página], qC: [colunas] }
   Medidas internas em pontos (1/72 pol.). 1 px da grade = 0,75 pt (como o Excel a 96 ppp). */

export const PAPEIS = { A4: { w: 595.28, h: 841.89, nome: 'A4 (21 × 29,7 cm)', xl: 9 }, carta: { w: 612, h: 792, nome: 'Carta (21,6 × 27,9 cm)', xl: 1 }, oficio: { w: 612, h: 1008, nome: 'Ofício (21,6 × 35,6 cm)', xl: 5 } };
export const MARGENS = {
  normal: { t: 1.9, b: 1.9, l: 1.8, r: 1.8, cab: 0.8, rod: 0.8, nome: 'Normal' },
  estreita: { t: 1.9, b: 1.9, l: 0.6, r: 0.6, cab: 0.8, rod: 0.8, nome: 'Estreita' },
  larga: { t: 2.5, b: 2.5, l: 2.5, r: 2.5, cab: 1.3, rod: 1.3, nome: 'Larga' },
};
export const CM = 72 / 2.54;
export const PX_PT = 0.75;

export const IMP_PADRAO = {
  area: '', orient: 'retrato', papel: 'A4', marg: { ...MARGENS.normal }, escala: { modo: 'nenhum', pct: 100, largura: 1, altura: 0 },
  titLin: '', titCol: '', cab: { e: '', c: '', d: '' }, rod: { e: '', c: 'Página &[Página] de &[Páginas]', d: '' },
  grade: false, titulos: false, centH: false, centV: false, ordem: 'baixo', qL: [], qC: [],
};

const num = (v, p, a, b) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : p);
const txt = (v, max = 120) => (typeof v === 'string' ? v.slice(0, max) : '');
/** Completa e limpa a configuração (o que vem de arquivo, de colar, de versões antigas). */
export function normalizarImp(x) {
  const o = x && typeof x === 'object' ? x : {};
  const m = o.marg && typeof o.marg === 'object' ? o.marg : {};
  const e = o.escala && typeof o.escala === 'object' ? o.escala : {};
  const tr = (q) => ({ e: txt(q && q.e), c: txt(q && q.c), d: txt(q && q.d) });
  return {
    area: txt(o.area, 60).toUpperCase().replace(/\$/g, ''),
    orient: o.orient === 'paisagem' ? 'paisagem' : 'retrato',
    papel: PAPEIS[o.papel] ? o.papel : 'A4',
    marg: { t: num(m.t, 1.9, 0, 10), b: num(m.b, 1.9, 0, 10), l: num(m.l, 1.8, 0, 10), r: num(m.r, 1.8, 0, 10), cab: num(m.cab, 0.8, 0, 10), rod: num(m.rod, 0.8, 0, 10) },
    escala: { modo: ['nenhum', 'pagina', 'colunas', 'linhas', 'pct', 'paginas'].includes(e.modo) ? e.modo : 'nenhum', pct: num(e.pct, 100, 10, 400), largura: Math.round(num(e.largura, 1, 0, 50)), altura: Math.round(num(e.altura, 0, 0, 50)) },
    titLin: txt(o.titLin, 20).toUpperCase().replace(/\$/g, ''), titCol: txt(o.titCol, 20).toUpperCase().replace(/\$/g, ''),
    cab: o.cab ? tr(o.cab) : { ...IMP_PADRAO.cab }, rod: o.rod ? tr(o.rod) : { ...IMP_PADRAO.rod },
    grade: !!o.grade, titulos: !!o.titulos, centH: !!o.centH, centV: !!o.centV, ordem: o.ordem === 'lado' ? 'lado' : 'baixo',
    qL: Array.isArray(o.qL) ? [...new Set(o.qL.filter((v) => Number.isInteger(v) && v > 0))].sort((a, b) => a - b).slice(0, 1000) : [],
    qC: Array.isArray(o.qC) ? [...new Set(o.qC.filter((v) => Number.isInteger(v) && v > 0))].sort((a, b) => a - b).slice(0, 500) : [],
  };
}
/** Só guarda no arquivo o que é diferente do padrão (arquivo pequeno). */
export function impParaGuardar(imp) {
  const n = normalizarImp(imp);
  return JSON.stringify(n) === JSON.stringify(normalizarImp({})) ? undefined : n;
}

/** "1:2" → { a: 0, b: 1 } · "A:B" → { a: 0, b: 1 } (0 a n-1); null se vazio ou inválido */
export function lerIntervalo(t, tipo) {
  const s = String(t || '').trim().toUpperCase().replace(/\$/g, '');
  if (!s) return null;
  const [x, y = x] = s.split(':');
  const val = (v) => (tipo === 'l' ? (/^\d+$/.test(v) ? +v - 1 : NaN) : /^[A-Z]{1,3}$/.test(v) ? [...v].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1 : NaN);
  const a = val(x), b = val(y);
  if (!(a >= 0) || !(b >= 0)) return null;
  return { a: Math.min(a, b), b: Math.max(a, b) };
}

/** Tamanho útil da página (pt) e posição da área. */
export function areaUtil(imp) {
  const p = PAPEIS[imp.papel] || PAPEIS.A4;
  const [W, H] = imp.orient === 'paisagem' ? [p.h, p.w] : [p.w, p.h];
  const m = imp.marg;
  return { W, H, x0: m.l * CM, y0: m.t * CM, w: W - (m.l + m.r) * CM, h: H - (m.t + m.b) * CM };
}

/**
 * Divide a área em páginas.
 * area: { l1, c1, l2, c2 } · tamCol(c), tamLin(l): px (0 = oculta) · titL/titC: intervalos repetidos (ou null)
 * Devolve { esc, paginas: [{ lins:[...], cols:[...], i, j }], nL, nC, util }
 */
export function paginar(imp0, area, tamCol, tamLin, opc = {}) {
  const imp = normalizarImp(imp0);
  const util = areaUtil(imp);
  const titL = lerIntervalo(imp.titLin, 'l'), titC = lerIntervalo(imp.titCol, 'c');
  const extraTit = imp.titulos ? { w: (opc.largNumLin || 34) * PX_PT, h: 18 * PX_PT } : { w: 0, h: 0 };
  const cols = [], lins = [];
  for (let c = area.c1; c <= area.c2; c++) if (tamCol(c) > 0) cols.push(c);
  for (let l = area.l1; l <= area.l2; l++) if (tamLin(l) > 0) lins.push(l);
  const soma = (lista, f) => lista.reduce((a, k) => a + f(k) * PX_PT, 0);
  const tlLista = titL ? lins.filter((l) => l >= titL.a && l <= titL.b) : [];
  const tcLista = titC ? cols.filter((c) => c >= titC.a && c <= titC.b) : [];
  /* linhas/colunas de título que ficam ANTES da área entram em toda página; as que estão dentro só repetem a partir da 2ª */
  const tlFora = titL ? range(titL.a, titL.b).filter((l) => l < area.l1 && tamLin(l) > 0) : [];
  const tcFora = titC ? range(titC.a, titC.b).filter((c) => c < area.c1 && tamCol(c) > 0) : [];
  const repL = titL ? [...tlFora, ...tlLista] : [], repC = titC ? [...tcFora, ...tcLista] : [];
  const totW = soma(cols, tamCol) + extraTit.w, totH = soma(lins, tamLin) + extraTit.h;
  let esc = 1;
  const e = imp.escala;
  if (e.modo === 'pct') esc = e.pct / 100;
  else if (e.modo === 'pagina') esc = Math.min(1, util.w / totW, util.h / totH);
  else if (e.modo === 'colunas') esc = Math.min(1, util.w / totW);
  else if (e.modo === 'linhas') esc = Math.min(1, util.h / totH);
  else if (e.modo === 'paginas') {
    const ew = e.largura > 0 ? (util.w * e.largura) / (totW + soma(repC, tamCol) * (e.largura - 1)) : 1;
    const eh = e.altura > 0 ? (util.h * e.altura) / (totH + soma(repL, tamLin) * (e.altura - 1)) : 1;
    esc = Math.min(1, ew, eh);
  }
  esc = Math.max(0.1, Math.min(4, esc));
  /* corta em grupos que cabem; as quebras manuais forçam página nova.
     Títulos repetidos: se estão dentro da área, a 1ª página já os tem; nas outras entram na frente. */
  const pt = (f, k) => f(k) * PX_PT * esc;
  const grupos = (lista, f, cabe, rep, quebras) => {
    const repDentro = rep.length > 0 && rep.every((r) => lista.includes(r));
    const repT = rep.reduce((a, r) => a + pt(f, r), 0);
    const out = [];
    let atual = [], usado = 0;
    for (const k of lista) {
      const t = pt(f, k);
      const reserva = out.length === 0 && repDentro ? 0 : repT;
      if (atual.length && (quebras.includes(k) || usado + t > cabe - reserva + 0.01)) { out.push(atual); atual = []; usado = 0; }
      atual.push(k); usado += t;
    }
    if (atual.length) out.push(atual);
    return { out, repDentro };
  };
  /* v0.6.4 (Grok): um gráfico ou imagem que cabe numa página não é cortado ao meio: a página nova começa nele */
  const comObjetos = (lista, f, cabe, rep, quebras, spans) => {
    let q = quebras, R = grupos(lista, f, cabe, rep, q);
    for (let volta = 0; volta < 60; volta++) {
      let novo = null;
      for (let gi = 0; gi < R.out.length - 1 && novo == null; gi++) {
        const g = R.out[gi], primeiro = R.out[gi + 1][0];
        for (const s of spans) {
          const i = g.indexOf(s.a);
          if (i > 0 && s.b >= primeiro && s.a < primeiro && !q.includes(s.a)) {
            const alt = s.itens.reduce((a, k) => a + pt(f, k), 0);
            if (alt <= cabe + 0.01) { novo = s.a; break; }
          }
        }
      }
      if (novo == null) break;
      q = [...q, novo];
      R = grupos(lista, f, cabe, rep, q);
    }
    return R;
  };
  const objs = opc.objetos || [];
  const spansL = [], spansC = [];
  for (const o of objs) {
    const sl = vaoDe(o.l, o.dy + o.h, lins, tamLin);
    if (sl) spansL.push(sl);
    const sc = vaoDe(o.c, o.dx + o.w, cols, tamCol);
    if (sc) spansC.push(sc);
  }
  const RC = comObjetos(cols, tamCol, util.w - extraTit.w * esc, repC, imp.qC, spansC);
  const RL = comObjetos(lins, tamLin, util.h - extraTit.h * esc, repL, imp.qL, spansL);
  const gC = RC.out.length ? RC.out : [[]], gL = RL.out.length ? RL.out : [[]];
  const comTit = (grupo, rep, primeiro, dentro) => (rep.length && !(primeiro && dentro) ? [...rep.filter((r) => !grupo.includes(r)), ...grupo] : grupo);
  const paginas = [];
  const add = (i, j) => {
    const ls = comTit(gL[i], repL, i === 0, RL.repDentro), cs = comTit(gC[j], repC, j === 0, RC.repDentro);
    paginas.push({ i, j, lins: ls, cols: cs, nRepL: ls.length - gL[i].length, nRepC: cs.length - gC[j].length });
  };
  if (imp.ordem === 'lado') { for (let i = 0; i < gL.length; i++) for (let j = 0; j < gC.length; j++) add(i, j); } else { for (let j = 0; j < gC.length; j++) for (let i = 0; i < gL.length; i++) add(i, j); }
  return { esc, paginas, nL: gL.length, nC: gC.length, util, imp, extraTit };
}
/** Quais linhas (ou colunas) um objeto cobre: começa em ini, mede ate px (a partir do canto da célula) e pula as ocultas. */
function vaoDe(ini, ate, lista, tam) {
  if (!lista.includes(ini)) return null;
  let resto = ate, ultimo = ini;
  const itens = [];
  for (let k = ini; k < ini + 5000; k++) {
    const t = tam(k);
    if (t <= 0) continue;
    itens.push(k); ultimo = k;
    resto -= t;
    if (resto <= 0.5) break;
  }
  return { a: ini, b: ultimo, itens };
}
function range(a, b) { const o = []; for (let k = a; k <= b; k++) o.push(k); return o; }

/** Texto do cabeçalho/rodapé com os campos trocados. */
export function textoCampos(t, { pagina, paginas, aba, arquivo, agora = new Date() }) {
  const d2 = (n) => String(n).padStart(2, '0');
  return String(t || '')
    .replace(/&\[(P[áa]gina)\]/gi, String(pagina)).replace(/&\[P[áa]ginas\]/gi, String(paginas))
    .replace(/&\[Data\]/gi, `${d2(agora.getDate())}/${d2(agora.getMonth() + 1)}/${agora.getFullYear()}`)
    .replace(/&\[Hora\]/gi, `${d2(agora.getHours())}:${d2(agora.getMinutes())}`)
    .replace(/&\[Aba\]/gi, aba || '').replace(/&\[Arquivo\]/gi, arquivo || '');
}

/* ---------- Excel: cabeçalho/rodapé (&L &C &R, &P &N &D &T &A &F) ---------- */
export function cabParaExcel(q) {
  const conv = (t) => String(t || '').replace(/&(?!\[)/g, '&&').replace(/&\[P[áa]gina\]/gi, '&P').replace(/&\[P[áa]ginas\]/gi, '&N').replace(/&\[Data\]/gi, '&D').replace(/&\[Hora\]/gi, '&T').replace(/&\[Aba\]/gi, '&A').replace(/&\[Arquivo\]/gi, '&F');
  const p = [];
  if (q.e) p.push('&L' + conv(q.e));
  if (q.c) p.push('&C' + conv(q.c));
  if (q.d) p.push('&R' + conv(q.d));
  return p.join('');
}
export function cabDoExcel(s) {
  const out = { e: '', c: '', d: '' };
  if (!s) return out;
  let atual = 'c';
  let i = 0;
  const t = String(s);
  while (i < t.length) {
    const ch = t[i];
    if (ch === '&' && i + 1 < t.length) {
      const k = t[i + 1];
      if (k === 'L') { atual = 'e'; i += 2; continue; }
      if (k === 'C') { atual = 'c'; i += 2; continue; }
      if (k === 'R') { atual = 'd'; i += 2; continue; }
      const mapa = { P: '&[Página]', N: '&[Páginas]', D: '&[Data]', T: '&[Hora]', A: '&[Aba]', F: '&[Arquivo]', '&': '&' };
      if (mapa[k]) { out[atual] += mapa[k]; i += 2; continue; }
      if (k === '"') { const f = t.indexOf('"', i + 2); i = f < 0 ? t.length : f + 1; continue; } // fonte: pula
      if (/[0-9]/.test(k)) { i += 2; while (/[0-9]/.test(t[i] || '')) i++; continue; } // tamanho: pula
      if (/[BIUSXYEKGHOZ]/.test(k)) { i += 2; continue; } // negrito, itálico... pula
      i += 2; continue;
    }
    out[atual] += ch; i++;
  }
  return { e: out.e.slice(0, 120), c: out.c.slice(0, 120), d: out.d.slice(0, 120) };
}
