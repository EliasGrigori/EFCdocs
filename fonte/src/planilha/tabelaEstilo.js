/* Vértice Docs v0.6.19 "Tabelas vivas" (F296) — o estilo da tabela do Excel desenhado na grade, na impressão e no PDF.
   O estilo fica guardado no objeto da tabela (t.est = { nome, ll, lc, pc, uc }), não pintado nas células: a tabela que cresce
   já nasce com as listras, e o arquivo salvo leva só o nome do estilo (o Excel desenha o dele).
   Os 60 estilos de fábrica do Excel (Claro 1–21, Médio 1–28, Escuro 1–11) saem das cores do tema do arquivo, parecidos com os do
   Excel (não idênticos pixel a pixel). Estilo próprio do arquivo (nome que não é TableStyle…) não é desenhado: volta igual ao salvar.
   A formatação posta na própria célula vale por cima da tabela, como no Excel. */
import { lerTema, aplicarTint } from './xlsx/estilos.js';

export const FAMILIAS = [['Light', 'Claro', 21], ['Medium', 'Médio', 28], ['Dark', 'Escuro', 11]];
export const ESTILO_PADRAO = 'TableStyleMedium2'; // o que o Excel usa ao criar uma tabela

/** Nome do estilo de fábrica → { fam, n } (ou null para nome próprio do arquivo). */
export function lerNomeEstilo(nome) {
  const m = /^TableStyle(Light|Medium|Dark)(\d{1,2})$/.exec(String(nome || ''));
  if (!m) return null;
  const fam = FAMILIAS.find((f) => f[0] === m[1]);
  const n = +m[2];
  return n >= 1 && n <= fam[2] ? { fam: m[1], n } : null;
}
export const rotuloDoEstilo = (nome) => { const e = lerNomeEstilo(nome); return e ? `${FAMILIAS.find((f) => f[0] === e.fam)[1]} ${e.n}` : nome ? 'Estilo do arquivo' : 'Nenhum'; };
/** A galeria: [{ fam, rotulo, itens: [nome...] }] */
export const GALERIA = FAMILIAS.map(([fam, rot, total]) => ({ fam, rotulo: rot, itens: Array.from({ length: total }, (_, i) => `TableStyle${fam}${i + 1}`) }));

/* ---------- cores do tema (lt1, dk1, lt2, dk2, acentos 1–6) ---------- */
let temaCache = { xml: null, cores: lerTema(null) };
export function coresDoTema(c) {
  const xml = (c && c.temaXml) || null;
  if (temaCache.xml !== xml) temaCache = { xml, cores: lerTema(xml) };
  return temaCache.cores;
}
const hx = (h) => '#' + String(h).toLowerCase();
const tint = (h, t) => hx(aplicarTint(String(h).toUpperCase(), t));
const BRANCO = '#ffffff';

/**
 * Peças do estilo, como o Excel descreve: todo, cab (linha de títulos), tot (totais), l1 (listra de linha), c1 (listra de coluna),
 * pc (primeira coluna), uc (última coluna). Cada peça: { f: fundo, t: letra, b: negrito, top, bottom, left, right, ih, iv } e
 * cada borda é [cor, peso] (1 fina, 2 média — a dupla do Excel —, 3 grossa).
 */
export function pecasDoEstilo(nome, tema) {
  const e = lerNomeEstilo(nome);
  if (!e) return null;
  const dk = tema[1], ac = tema.slice(4, 10);
  const { fam, n } = e;
  const fina = (cor) => [cor, 1];
  if (fam === 'Dark' && n >= 8) {
    const C = [dk, ac[0], ac[2], ac[4]][n - 8];
    const base = n === 8 ? 0.85 : 0.8;
    return { todo: { f: tint(C, base) }, cab: { f: hx(dk), t: BRANCO, b: 1 }, tot: { b: 1, top: [hx(dk), 2] }, l1: { f: tint(C, n === 8 ? 0.65 : 0.6) }, c1: { f: tint(C, n === 8 ? 0.65 : 0.6) }, pc: { b: 1 }, uc: { b: 1 } };
  }
  const k = (n - 1) % 7, g = Math.floor((n - 1) / 7);
  const C = k === 0 ? dk : ac[k - 1];
  const cC = hx(C);
  const claro = (t) => tint(C, k === 0 ? Math.min(0.95, t + 0.05) : t);
  if (fam === 'Light') {
    if (g === 0) return { todo: { top: fina(cC), bottom: fina(cC), ...(k ? { t: tint(C, -0.25) } : {}) }, cab: { b: 1, bottom: fina(cC) }, tot: { b: 1, top: [cC, 2] }, l1: { f: claro(0.8) }, c1: { f: claro(0.8) }, pc: { b: 1 }, uc: { b: 1 } };
    if (g === 1) return { todo: { top: fina(cC), bottom: fina(cC), left: fina(cC), right: fina(cC) }, cab: { f: cC, t: BRANCO, b: 1 }, tot: { b: 1, top: [cC, 2] }, l1: { top: fina(cC), bottom: fina(cC) }, c1: { left: fina(cC), right: fina(cC) }, pc: { b: 1 }, uc: { b: 1 } };
    return { todo: { top: fina(cC), bottom: fina(cC), left: fina(cC), right: fina(cC), ih: fina(cC), iv: fina(cC) }, cab: { b: 1, bottom: fina(cC) }, tot: { b: 1, top: [cC, 2] }, l1: { f: claro(0.8) }, c1: { f: claro(0.8) }, pc: { b: 1 }, uc: { b: 1 } };
  }
  if (fam === 'Medium') {
    if (g === 0) { const lin = fina(claro(0.4)); return { todo: { top: lin, bottom: lin, left: lin, right: lin, ih: lin }, cab: { f: cC, t: BRANCO, b: 1 }, tot: { b: 1, top: [cC, 2] }, l1: { f: claro(0.8) }, c1: { f: claro(0.8) }, pc: { b: 1 }, uc: { b: 1 } }; }
    if (g === 1) return { todo: { f: claro(0.8), ih: fina(BRANCO), iv: fina(BRANCO) }, cab: { f: cC, t: BRANCO, b: 1, bottom: [BRANCO, 3] }, tot: { f: cC, t: BRANCO, b: 1, top: [BRANCO, 3] }, l1: { f: claro(0.6) }, c1: { f: claro(0.6) }, pc: { f: cC, t: BRANCO, b: 1 }, uc: { f: cC, t: BRANCO, b: 1 } };
    if (g === 2) { const p = hx(dk); return { todo: { top: fina(p), bottom: fina(p), ih: fina(p) }, cab: { f: cC, t: BRANCO, b: 1, bottom: fina(p) }, tot: { b: 1, top: [p, 2] }, l1: { f: tint(dk, 0.85) }, c1: { f: tint(dk, 0.85) }, pc: { f: cC, t: BRANCO, b: 1 }, uc: { f: cC, t: BRANCO, b: 1 } }; }
    const lin = fina(claro(0.4));
    return { todo: { f: claro(0.8), top: lin, bottom: lin, left: lin, right: lin, ih: lin, iv: lin }, cab: { b: 1 }, tot: { b: 1, top: [cC, 2] }, l1: { f: claro(0.6) }, c1: { f: claro(0.6) }, pc: { b: 1 }, uc: { b: 1 } };
  }
  /* Escuro 1–7 */
  const corpo = k ? tint(C, -0.25) : tint(dk, 0.45), listra = k ? tint(C, -0.5) : tint(dk, 0.35), forte = k ? tint(C, -0.5) : tint(dk, 0.25);
  return { todo: { f: corpo, t: BRANCO }, cab: { f: hx(dk), t: BRANCO, b: 1, bottom: [BRANCO, 3] }, tot: { f: k ? tint(C, -0.5) : tint(dk, 0.15), t: BRANCO, b: 1, top: [BRANCO, 3] }, l1: { f: listra }, c1: { f: listra }, pc: { f: forte, t: BRANCO, b: 1 }, uc: { f: forte, t: BRANCO, b: 1 } };
}

const pecasCache = new Map();
function pecasEmCache(nome, tema) {
  const k = nome + '|' + tema.join(',');
  let p = pecasCache.get(k);
  if (p === undefined) { p = pecasDoEstilo(nome, tema); if (pecasCache.size > 200) pecasCache.clear(); pecasCache.set(k, p); }
  return p;
}

/** Tabela com estilo desenhável? (as criadas antes da v0.6.19 ficam com a pintura nas células, sem t.est) */
export const temEstiloVivo = (t) => !!(t && t.est && !t.est.sem && (lerNomeEstilo(t.est.nome) || pecasProprias(t)));
/* v0.6.58 (D-17): estilo próprio do arquivo (peças lidas dos dxf em xlsx/estilos.js), conferidas aqui antes de desenhar */
const COR6 = /^#[0-9a-f]{6}$/;
function pecasProprias(t) {
  const P = t && t.est && t.est.proprio;
  if (!P || typeof P !== 'object') return null;
  const out = {};
  for (const k of ['todo', 'cab', 'tot', 'l1', 'c1', 'pc', 'uc']) {
    const p = P[k]; if (!p || typeof p !== 'object') continue;
    const q = {};
    if (COR6.test(p.f)) q.f = p.f; if (COR6.test(p.t)) q.t = p.t; if (p.b) q.b = 1;
    for (const s of ['top', 'bottom', 'left', 'right', 'ih', 'iv']) if (Array.isArray(p[s]) && COR6.test(p[s][0]) && [1, 2, 3].includes(p[s][1])) q[s] = [p[s][0], p[s][1]];
    out[k] = q;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Estilo que a tabela dá à célula (l, col): { fundo, cor, b, bd, bdcs, bdc } ou null.
 * Ordem do Excel (de baixo para cima): todo, listra de coluna, listra de linha, última coluna, primeira coluna, títulos, totais.
 */
export function estiloDaTabela(t, l, col, tema) {
  if (l < t.l1 || l > t.l2 || col < t.c1 || col > t.c2 || !temEstiloVivo(t)) return null;
  const P = lerNomeEstilo(t.est.nome) ? pecasEmCache(t.est.nome, tema) : pecasProprias(t);
  if (!P) return null;
  const est = t.est;
  const d0 = t.l1 + (t.cab ? 1 : 0), dN = t.l2 - (t.tot ? 1 : 0);
  const ehCab = t.cab && l === t.l1, ehTot = t.tot && l === t.l2, ehDado = l >= d0 && l <= dN;
  const out = {};
  const usar = (pc, r) => {
    if (!pc) return;
    if (pc.f) out.fundo = pc.f;
    if (pc.t) out.cor = pc.t;
    if (pc.b) out.b = true;
    const lado = (s, borda) => { if (!borda) return; (out.bd || (out.bd = {}))[s] = borda[1]; (out.bdcs || (out.bdcs = {}))[s] = borda[0]; };
    lado('t', l === r.l1 ? pc.top : pc.ih);
    lado('b', l === r.l2 ? pc.bottom : pc.ih);
    lado('l', col === r.c1 ? pc.left : pc.iv);
    lado('r', col === r.c2 ? pc.right : pc.iv);
  };
  usar(P.todo, t);
  if (ehDado && est.lc && (col - t.c1) % 2 === 0) usar(P.c1, { l1: d0, l2: dN, c1: col, c2: col });
  if (ehDado && est.ll && (l - d0) % 2 === 0) usar(P.l1, { l1: l, l2: l, c1: t.c1, c2: t.c2 });
  if (est.uc && col === t.c2) usar(P.uc, { l1: t.l1, l2: t.l2, c1: col, c2: col });
  if (est.pc && col === t.c1) usar(P.pc, { l1: t.l1, l2: t.l2, c1: col, c2: col });
  if (ehCab) usar(P.cab, { l1: l, l2: l, c1: t.c1, c2: t.c2 });
  if (ehTot) usar(P.tot, { l1: l, l2: l, c1: t.c1, c2: t.c2 });
  if (out.bdcs) out.bdc = Object.values(out.bdcs)[0];
  return out;
}

/* ---------- tabelas por aba (calculado uma vez por versão de c.tabelas) ---------- */
const porAbaCache = new WeakMap();
export function tabelasVivasDaAba(c, abaId) {
  const tabs = c && c.tabelas;
  if (!tabs) return null;
  let m = porAbaCache.get(tabs);
  if (!m) {
    m = new Map();
    for (const t of Object.values(tabs)) if (temEstiloVivo(t)) { if (!m.has(t.aba)) m.set(t.aba, []); m.get(t.aba).push(t); }
    porAbaCache.set(tabs, m);
  }
  return m.get(abaId) || null;
}

/** Estilo da tabela na célula, já pronto para juntar com o da célula (null se não há tabela viva ali). */
export function estiloDeTabelaEm(c, abaId, l, col) {
  const lista = tabelasVivasDaAba(c, abaId);
  if (!lista) return null;
  for (const t of lista) if (l >= t.l1 && l <= t.l2 && col >= t.c1 && col <= t.c2) return estiloDaTabela(t, l, col, coresDoTema(c));
  return null;
}

/** Junta: a tabela por baixo, a formatação da célula por cima (lado a lado nas bordas). */
export function juntarComTabela(tb, prop) {
  if (!tb) return prop;
  const out = { ...tb, ...prop };
  if (tb.bd || prop.bd) {
    const bd = { ...(tb.bd || {}) }, bdcs = { ...(tb.bdcs || {}) };
    for (const s of ['t', 'b', 'l', 'r']) if (prop.bd && prop.bd[s]) { bd[s] = prop.bd[s]; bdcs[s] = (prop.bdcs && prop.bdcs[s]) || prop.bdc || undefined; }
    out.bd = bd; out.bdcs = bdcs;
    out.bdc = prop.bdc || tb.bdc;
  }
  return out;
}

/** Miniatura (5 linhas × 4 colunas) para a galeria: matriz de { f, t, b, bt, bb } */
export function miniatura(nome, tema, op = { ll: 1, lc: 0, pc: 0, uc: 0 }) {
  const t = { l1: 0, c1: 0, l2: 4, c2: 3, cab: 1, tot: 0, est: { nome, ...op } };
  const out = [];
  for (let l = 0; l <= 4; l++) {
    const lin = [];
    for (let col = 0; col <= 3; col++) lin.push(estiloDaTabela(t, l, col, tema) || {});
    out.push(lin);
  }
  return out;
}
