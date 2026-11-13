/* Vértice Docs — Planilha: as colunas da aba no .xlsx (<cols>): largura, ocultas e estilo da coluna inteira.
   v0.6.14: saiu de ler.js e gravar.js (D-39, D-47, D-52). */
import { MAX_COL } from '../ref.js';
import { largPadrao } from '../modelo.js';

const larguraExcel = (px) => Math.max(0, Math.trunc((px / 7) * 256) / 256);
const ehOculta = (cd) => cd.a.hidden === '1' || cd.a.hidden === 'true';

/** <col> lidos → aba.larg, aba.ocC, aba.ocCFim (e ocCFimAte), aba.estC, aba.estCFim. ultCol = até onde vão uma a uma. */
export function lerColunas(aba, colsDef, ultCol, sDe) {
  for (const cd of colsDef) {
    /* v0.6.14 (D-52): faixa curta depois do limite de leitura (ex.: só a XFD com largura própria) também fica */
    const c1 = +cd.a.min - 1, c2 = +cd.a.max - +cd.a.min < 64 && !ehOculta(cd) ? +cd.a.max - 1 : Math.min(+cd.a.max - 1, ultCol);
    if (!(c1 >= 0)) continue;
    const w = cd.a.width != null ? parseFloat(cd.a.width) : null;
    const px = w != null ? Math.max(0, Math.trunc(((256 * w + Math.trunc(128 / 7)) / 256) * 7)) : null;
    /* v0.6.11 (D-23): colunas ocultas até o fim da aba (max = 16384): as de depois de ultCol não viram uma a uma; fica a marca */
    if (ehOculta(cd) && +cd.a.max >= MAX_COL && +cd.a.max - 1 > ultCol) aba.ocCFim = Math.min(aba.ocCFim ?? Infinity, c1);
    /* v0.6.14 (D-52): ocultas até quase o fim (14 a 16383, com a XFD visível): a faixa oculta vai até onde o arquivo disse */
    else if (ehOculta(cd) && +cd.a.max - 1 > ultCol + 1000) { aba.ocCFim = Math.min(aba.ocCFim ?? Infinity, c1); aba.ocCFimAte = +cd.a.max - 1; }
    /* v0.6.14 (D-47): estilo da coluna inteira (Excel: "formatar a coluna"): as células vazias mostram e herdam, e volta ao salvar */
    const sc = cd.a.style != null && cd.a.style !== '0' ? sDe(cd.a.style) : 0;
    if (sc) {
      const ate = +cd.a.max >= MAX_COL ? Math.max(ultCol, c1) : Math.min(+cd.a.max - 1, c1 + 1023);
      for (let c = c1; c <= ate; c++) (aba.estC || (aba.estC = {}))[c] = sc;
      if (+cd.a.max >= MAX_COL && ate + 1 < MAX_COL) aba.estCFim = { c: Math.max(c1, ate + 1), s: sc };
    }
    for (let c = c1; c <= c2; c++) {
      const oculta = ehOculta(cd);
      if (oculta) (aba.ocC || (aba.ocC = {}))[c] = 1;
      /* v0.6.9.2 (Grok, D-09): a coluna oculta também guarda a largura (volta igual ao exportar e ao reexibir) */
      if (px != null && px > 0 && px !== aba.largP) (aba.larg || (aba.larg = {}))[c] = px;
    }
  }
  /* v0.6.14 (D-39): ocultas até o fim em pedaços seguidos (13 a 32, 33 a 16382, 16383, 16384): a marca começa no primeiro pedaço */
  if (aba.ocCFim != null) {
    const ocultos = colsDef.filter((cd) => ehOculta(cd)).map((cd) => [+cd.a.min - 1, +cd.a.max - 1]).sort((p, q) => p[0] - q[0]);
    let ini = aba.ocCFim;
    for (let i = ocultos.length - 1; i >= 0; i--) { const [p1, p2] = ocultos[i]; if (p2 >= ini - 1 && p1 < ini) ini = p1; }
    /* as de antes do limite de leitura já estão uma a uma (com a largura de cada); a marca cobre só o resto */
    aba.ocCFim = Math.min(aba.ocCFim, Math.max(ini, ultCol + 1));
    /* v0.6.14 (D-52): até onde vai a faixa oculta seguida a partir da marca; se chega à XFD, é "até o fim" */
    let fim = -1;
    for (const [p1, p2] of ocultos) { if (p2 < aba.ocCFim) continue; if (fim < 0 ? p1 <= aba.ocCFim : p1 <= fim + 1) fim = Math.max(fim, p2); }
    if (fim >= MAX_COL - 1 || fim < 0) delete aba.ocCFimAte; else aba.ocCFimAte = fim;
  }

}

/** v0.6.14 (D-47): as <col> da aba. Cada coluna com largura própria ou oculta vai sozinha (como antes); o estilo da coluna
    inteira (aba.estC por coluna e aba.estCFim até o fim) entra junto e, onde só há estilo, vai como faixa (min..max). */
export function colunasXml(aba, colunas, fimOculto, estilos) {
  const estDe = (cc) => {
    const s = (aba.estC && aba.estC[cc]) || (aba.estCFim && cc >= aba.estCFim.c ? aba.estCFim.s : 0);
    return s && estilos[s] ? s : 0;
  };
  const corte = new Set();
  for (const cc of colunas.keys()) { corte.add(cc); corte.add(cc + 1); }
  for (const k of Object.keys(aba.estC || {})) { corte.add(+k); corte.add(+k + 1); }
  if (aba.estCFim) corte.add(aba.estCFim.c);
  if (fimOculto != null) corte.add(fimOculto);
  const fimAte = fimOculto != null && Number.isInteger(aba.ocCFimAte) && aba.ocCFimAte >= fimOculto && aba.ocCFimAte < MAX_COL - 1 ? aba.ocCFimAte : MAX_COL - 1;
  if (fimAte < MAX_COL - 1) corte.add(fimAte + 1);
  const pontos = [...corte].filter((x) => x >= 0 && x < MAX_COL && (fimOculto == null || x <= fimOculto || x > fimAte)).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < pontos.length; i++) {
    const c1 = pontos[i], c2 = (i + 1 < pontos.length ? pontos[i + 1] : MAX_COL) - 1;
    const oc = fimOculto != null && c1 >= fimOculto && c1 <= fimAte;
    const x = oc ? null : colunas.get(c1);
    const s = estDe(c1);
    const st = s ? ` style="${s}"` : '';
    if (oc) { const w = (aba.larg && aba.larg[fimOculto]) ?? largPadrao(aba); out.push(`<col min="${c1 + 1}" max="${c2 + 1}" width="${larguraExcel(w)}"${st} customWidth="1" hidden="1"/>`); continue; }
    if (x) { const w = x.w != null ? x.w : largPadrao(aba); out.push(`<col min="${c1 + 1}" max="${c1 + 1}" width="${larguraExcel(w)}"${st} customWidth="1"${x.oculta ? ' hidden="1"' : ''}/>`); if (c2 > c1 && s) out.push(`<col min="${c1 + 2}" max="${c2 + 1}" width="${larguraExcel(largPadrao(aba))}"${st}/>`); continue; }
    if (s) out.push(`<col min="${c1 + 1}" max="${c2 + 1}" width="${larguraExcel(largPadrao(aba))}"${st}/>`);
  }
  /* faixas vizinhas iguais (só estilo) viram uma */
  const junto = [];
  for (const t of out) {
    const ant = junto[junto.length - 1];
    const a = ant && /^<col min="(\d+)" max="(\d+)"(.*)$/.exec(ant), b = /^<col min="(\d+)" max="(\d+)"(.*)$/.exec(t);
    if (a && b && a[3] === b[3] && !/customWidth|hidden/.test(a[3]) && +a[2] + 1 === +b[1]) junto[junto.length - 1] = `<col min="${a[1]}" max="${b[2]}"${a[3]}`;
    else junto.push(t);
  }
  return junto;
}
