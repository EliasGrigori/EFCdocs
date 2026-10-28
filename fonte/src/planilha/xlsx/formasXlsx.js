/* EFCdocs v0.6.5 — formas do Excel (xdr:sp, xdr:cxnSp, xdr:grpSp e figuras dentro de grupo) ⇄ objetos 'forma' (formas.js).
   Ler: cada âncora vira um objeto; o grupo vira um objeto com várias partes; gráficos de dentro do grupo saem como gráficos soltos;
     segmentações de dados (slicers) ficam fora e a importação avisa. O XML original fica guardado (xo) para voltar igual.
   Gravar: forma sem mexer volta com o XML original (só a posição é refeita); mexida ou nova é escrita de novo. */
import { arvore, filho, filhos } from './xmlArvore.js';
import { escapar } from './xml.js';
import { lerCor, lerSpPr } from './graficosXlsx.js';
import { figuraParaTexto } from './imagensXlsx.js';
import { LARG_PADRAO, largPadrao, ALT_PADRAO, altPadrao } from '../modelo.js';
import { CONHECIDOS, assinaturaForma, limparForma, PT_PX } from '../formas.js';

export const EMU = 9525;
const EMU_PT = 12700;
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const largCol = (aba, c) => (aba.ocC && aba.ocC[c] ? 0 : aba.larg && aba.larg[c] != null ? aba.larg[c] : largPadrao(aba));
const altLin = (aba, l) => (aba.ocL && aba.ocL[l] ? 0 : aba.alt && aba.alt[l] != null ? aba.alt[l] : altPadrao(aba));
const TIPOS_IMG = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };
const int = (v, p = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : p; };

/** Ponto (px a partir do canto da célula l,c + dx,dy) → âncora { l, c, dx, dy } (anda pelas larguras e alturas). */
export function ancoraMais(aba, l, c, dx, dy, ox, oy) {
  let x = dx + ox, y = dy + oy;
  while (x < 0 && c > 0) { c--; x += largCol(aba, c); }
  while (y < 0 && l > 0) { l--; y += altLin(aba, l); }
  while (c < 16383 && largCol(aba, c) > 0 && x >= largCol(aba, c)) { x -= largCol(aba, c); c++; }
  while (c < 16383 && largCol(aba, c) === 0) c++;
  while (l < 1048575 && altLin(aba, l) > 0 && y >= altLin(aba, l)) { y -= altLin(aba, l); l++; }
  while (l < 1048575 && altLin(aba, l) === 0) l++;
  return { l, c, dx: Math.max(0, x), dy: Math.max(0, y) };
}

/* ============================================================ ler ============================================================ */
/** Separa o elemento de dentro da âncora (sem from/to/pos/ext do começo e sem clientData). */
export function elementoDaAncora(dentro) {
  return String(dentro)
    .replace(/^\s*<(\w+:)?from>[\s\S]*?<\/(\w+:)?from>/, '').replace(/^\s*<(\w+:)?to>[\s\S]*?<\/(\w+:)?to>/, '')
    .replace(/^\s*<(\w+:)?pos\b[^>]*\/>/, '').replace(/^\s*<(\w+:)?ext\b[^>]*\/>/, '')
    .replace(/<(\w+:)?clientData\b[^>]*\/>\s*$|<(\w+:)?clientData\b[^>]*>[\s\S]*?<\/(\w+:)?clientData>\s*$/, '').trim();
}
/** Tipo do primeiro elemento: 'sp', 'cxnSp', 'grpSp', 'pic', 'graphicFrame', 'AlternateContent', 'contentPart'... */
export const tipoDoElemento = (el) => { const m = /^<(?:\w+:)?(\w+)\b/.exec(el); return m ? m[1] : ''; };
const ehSegmentacao = (s) => /slicer|timeslicer/i.test(s);

/** Tira de dentro do grupo os blocos de segmentação de dados e os gráficos (que viram objetos soltos). */
function limparGrupoBruto(el) {
  let segmentacoes = 0;
  let s = el.replace(/<(\w+:)?AlternateContent\b[\s\S]*?<\/(\w+:)?AlternateContent>/g, (b) => {
    if (ehSegmentacao(b)) { segmentacoes++; return ''; }
    return b;
  });
  const graficos = [];
  s = s.replace(/<(\w+:)?graphicFrame\b[\s\S]*?<\/(\w+:)?graphicFrame>/g, (b) => { graficos.push(b); return ''; });
  return { s, segmentacoes, graficos };
}

const LN_PADRAO = [0, 0.5, 1, 1.5];
const PONTAS = { triangle: 'triangle', stealth: 'stealth', arrow: 'arrow', oval: 'oval', diamond: 'diamond' };

function corDoEstilo(st, nome, tema) {
  const r = st && filho(st, nome);
  return r ? { idx: r.a.idx, c: lerCor(r, tema) } : null;
}

/** Texto de um txBody → texto da parte. */
function lerTexto(tb, padrao, fontes, tema) {
  if (!tb) return null;
  const bp = filho(tb, 'bodyPr') || { a: {}, k: [] };
  const insE = (k, p) => (bp.a[k] != null ? int(bp.a[k]) / EMU : p);
  const t = {
    pars: [], anc: bp.a.anchor === 'ctr' ? 'ctr' : bp.a.anchor === 'b' ? 'b' : 't',
    ins: [insE('lIns', 9.6), insE('tIns', 4.8), insE('rIns', 9.6), insE('bIns', 4.8)], wrap: bp.a.wrap !== 'none',
  };
  if (bp.a.vert && bp.a.vert !== 'horz') t.vert = bp.a.vert === 'vert270' ? 'vert270' : 'vert';
  if (bp.a.rot && int(bp.a.rot)) t.rotT = int(bp.a.rot) / 60000;
  if (bp.a.vertOverflow === 'clip') t.clip = true;
  if (padrao.cor) t.cor = padrao.cor;
  /* tamanho de base do lstStyle */
  const lst = filho(tb, 'lstStyle'), l1 = lst && filho(lst, 'lvl1pPr'), d1 = l1 && filho(l1, 'defRPr');
  const tamBase = d1 && d1.a.sz ? int(d1.a.sz) / 100 : 11;
  const fonte = (tf) => (!tf ? undefined : tf === '+mn-lt' ? fontes.menor : tf === '+mj-lt' ? fontes.maior : /^\+/.test(tf) ? undefined : tf);
  const estiloDe = (rp, base = {}) => {
    const o = { ...base };
    if (!rp) return o;
    if (rp.a.sz) o.tam = int(rp.a.sz) / 100;
    if (rp.a.b != null) o.neg = rp.a.b === '1' || rp.a.b === 'true';
    if (rp.a.i != null) o.it = rp.a.i === '1' || rp.a.i === 'true';
    if (rp.a.u && rp.a.u !== 'none') o.sub = true;
    if (rp.a.strike && rp.a.strike !== 'noStrike') o.tach = true;
    const sf = filho(rp, 'solidFill');
    const c = sf && lerCor(sf, tema);
    if (c) o.cor = c.cor;
    const lt = filho(rp, 'latin');
    const f = lt && fonte(lt.a.typeface);
    if (f) o.fonte = f;
    return o;
  };
  for (const p of filhos(tb, 'p')) {
    const pp = filho(p, 'pPr');
    const al = pp && pp.a.algn === 'ctr' ? 'ctr' : pp && pp.a.algn === 'r' ? 'r' : pp && (pp.a.algn === 'just' || pp.a.algn === 'dist') ? 'just' : 'l';
    const baseP = estiloDe(pp && filho(pp, 'defRPr'), { tam: tamBase, ...(fontes.menor && padrao.fonte !== false ? { fonte: fontes.menor } : {}) });
    const runs = [];
    for (const x of p.k) {
      if (x.n === 'r' || x.n === 'fld') { const tt = filho(x, 't'); runs.push({ ...estiloDe(filho(x, 'rPr'), baseP), t: tt ? tt.t : '' }); }
      else if (x.n === 'br') runs.push({ ...estiloDe(filho(x, 'rPr'), baseP), t: '\n' });
    }
    const fim = filho(p, 'endParaRPr');
    const q = { al, runs: runs.map((r) => { const o = { ...r }; if (o.neg === false) delete o.neg; if (o.it === false) delete o.it; return o; }) };
    if (!runs.length) q.tam = (fim && fim.a.sz ? int(fim.a.sz) / 100 : baseP.tam) || 11;
    t.pars.push(q);
  }
  /* parágrafo vazio no fim, sozinho, não conta */
  while (t.pars.length > 1 && !t.pars[t.pars.length - 1].runs.length) t.pars.pop();
  if (t.pars.length === 1 && !t.pars[0].runs.length) t.pars = [];
  return t;
}

/** Caminhos do desenho livre (custGeom) → [{ w, h, cmds }] ou null (se usa fórmulas). */
function lerCust(cg) {
  const pl = filho(cg, 'pathLst');
  if (!pl) return null;
  const out = [];
  let semPreench = false;
  const n = (v) => { const x = Number(v); if (!Number.isFinite(x)) throw new Error('fórmula'); return x; };
  try {
    for (const p of filhos(pl, 'path')) {
      const cmds = [];
      if (p.a.fill === 'none') semPreench = true;
      for (const k of p.k) {
        const pts = filhos(k, 'pt').map((q) => [n(q.a.x), n(q.a.y)]).flat();
        if (k.n === 'moveTo') cmds.push({ t: 'M', p: pts.slice(0, 2) });
        else if (k.n === 'lnTo') cmds.push({ t: 'L', p: pts.slice(0, 2) });
        else if (k.n === 'cubicBezTo') cmds.push({ t: 'C', p: pts.slice(0, 6) });
        else if (k.n === 'quadBezTo') cmds.push({ t: 'Q', p: pts.slice(0, 4) });
        else if (k.n === 'arcTo') cmds.push({ t: 'A', p: [n(k.a.wR), n(k.a.hR), n(k.a.stAng) / 60000, n(k.a.swAng) / 60000] });
        else if (k.n === 'close') cmds.push({ t: 'Z' });
      }
      out.push({ w: int(p.a.w), h: int(p.a.h), cmds });
    }
  } catch { return null; }
  return out.length ? { cust: out, aberto: semPreench } : null;
}

/** Leitor de links do desenho: '#Aba!A1' → { abaNome, ref }; http/mailto → { url }. */
export function linkDoAlvo(alvo) {
  const s = String(alvo || '');
  const m = /^#(?:'((?:[^']|'')+)'|([^!]+))!\$?([A-Za-z]{1,3})\$?(\d{1,7})/.exec(s);
  if (m) return { abaNome: (m[1] ? m[1].replace(/''/g, "'") : m[2]), ref: (m[3] + m[4]).toUpperCase() };
  if (/^(https?:|mailto:)/i.test(s)) return { url: s };
  return null;
}
/** textlink="Aba!$B$2" → { abaNome?, ref } */
export function lerTextLink(s) {
  const m = /^(?:(?:'((?:[^']|'')+)'|([^!]+))!)?\$?([A-Za-z]{1,3})\$?(\d{1,7})$/.exec(String(s || '').trim().replace(/^=/, ''));
  if (!m) return null;
  const o = { ref: (m[3] + m[4]).toUpperCase() };
  const nome = m[1] ? m[1].replace(/''/g, "'") : m[2];
  if (nome) o.abaNome = nome;
  return o;
}

/**
 * Lê uma âncora de forma/grupo. ctx = { zip, relsD, tema, fontes, aba, geo:{ l,c,dx,dy,w,h } }.
 * Devolve { obj?, graficos:[{ bruto, x, y, w, h }] (px dentro da âncora), fora:[{ item, motivo }], aprox }.
 */
export async function lerFormaDaAncora(el, ctx) {
  const fora = [];
  let aprox = 0;
  const tipo = tipoDoElemento(el);
  let bruto = el, gruposGraficos = [];
  if (tipo === 'grpSp') {
    const lg = limparGrupoBruto(el);
    bruto = lg.s;
    if (lg.segmentacoes) fora.push({ item: 'Segmentações de dados (slicers)', qtd: lg.segmentacoes, motivo: 'chegam numa versão futura; o resto do grupo veio' });
    gruposGraficos = lg.graficos;
  }
  const raiz = arvore(bruto);
  const { W, H } = { W: ctx.geo.w, H: ctx.geo.h };
  const partes = [];
  const xoRels = {};
  let xoOk = true;
  const graficos = [];

  /* transformação de coordenadas do Excel (EMU) → px dentro da âncora */
  const xf0 = (no) => { const sp = filho(no, 'spPr') || filho(no, 'grpSpPr'); const x = sp && filho(sp, 'xfrm'); return x; };
  const offExt = (x) => {
    const off = x && filho(x, 'off'), ext = x && filho(x, 'ext');
    return { ox: off ? int(off.a.x) : 0, oy: off ? int(off.a.y) : 0, cx: ext ? int(ext.a.cx) : 0, cy: ext ? int(ext.a.cy) : 0 };
  };
  const topo = offExt(xf0(raiz));
  const T0 = { ax: topo.cx ? W / topo.cx : 1 / EMU, bx: 0, ay: topo.cy ? H / topo.cy : 1 / EMU, by: 0 };
  T0.bx = -topo.ox * T0.ax; T0.by = -topo.oy * T0.ay;

  async function lerParte(no, T, preGrupo) {
    const nv = filho(no, 'nvSpPr') || filho(no, 'nvCxnSpPr') || filho(no, 'nvPicPr');
    const cnv = nv && filho(nv, 'cNvPr');
    if (cnv && (cnv.a.hidden === '1' || cnv.a.hidden === 'true')) return;
    const sp = filho(no, 'spPr');
    const x = sp && filho(sp, 'xfrm');
    const oe = offExt(x);
    const p = {
      x: oe.ox * T.ax + T.bx, y: oe.oy * T.ay + T.by, w: oe.cx * T.ax, h: oe.cy * T.ay,
    };
    if (no === raiz) { p.x = 0; p.y = 0; p.w = W; p.h = H; }
    if (x && x.a.rot && int(x.a.rot)) p.rot = int(x.a.rot) / 60000;
    if (x && x.a.flipH === '1') p.fh = true;
    if (x && x.a.flipV === '1') p.fv = true;
    if (cnv && cnv.a.name) p.nome = cnv.a.name;
    const st = filho(no, 'style');
    const k = partes.length;
    /* link do clique */
    const hl = cnv && filho(cnv, 'hlinkClick');
    if (hl && hl.a.id) {
      const r = ctx.relsD.get(hl.a.id);
      const lk = r && linkDoAlvo(r.url);
      if (lk) { p.link = lk; xoRels[hl.a.id] = { k, t: 'link' }; }
      else if (r) xoRels[hl.a.id] = { alvo: r.url, externo: r.externo };
    }
    if (no.n === 'pic') {
      const blip = filho(filho(no, 'blipFill'), 'blip');
      const rc = blip && ctx.relsD.get(blip.a.embed);
      const ext = rc && rc.alvo ? String(rc.alvo).split('.').pop().toLowerCase() : '';
      const bytes = rc && rc.alvo && TIPOS_IMG[ext] ? await ctx.zip.bytes(rc.alvo) : null;
      const src = bytes && bytes.length ? await figuraParaTexto(bytes, TIPOS_IMG[ext]) : '';
      if (!src) { fora.push({ item: 'Imagens', motivo: 'figura dentro de grupo que o EFCdocs não abre' }); xoOk = false; return; }
      p.g = 'img'; p.src = src;
      { const pg0 = sp && filho(sp, 'prstGeom'); if (pg0 && pg0.a.prst && pg0.a.prst !== 'rect' && CONHECIDOS.has(pg0.a.prst)) p.corte = pg0.a.prst; }
      xoRels[blip.a.embed] = { k, t: 'img' };
      const o = lerSpPr(sp, ctx.tema);
      if (o.contorno && o.contorno.t !== 'nenhum') p.linha = { ...o.contorno, larg: o.contorno.larg ?? 0.75 };
      partes.push(p);
      return;
    }
    /* desenho */
    const pg = sp && filho(sp, 'prstGeom'), cg = sp && filho(sp, 'custGeom');
    if (pg) {
      p.g = pg.a.prst || 'rect';
      const av = filho(pg, 'avLst');
      for (const gd of filhos(av, 'gd')) { const m = /^val\s+(-?\d+)/.exec(gd.a.fmla || ''); if (m) (p.adj || (p.adj = {}))[gd.a.name] = +m[1]; }
      if (!CONHECIDOS.has(p.g)) { aprox++; p.g = 'rect'; }
    } else if (cg) {
      const c = lerCust(cg);
      if (c) { p.g = 'cust'; p.cust = c.cust; if (c.aberto) p.aberto = true; } else { p.g = 'rect'; aprox++; }
    } else p.g = 'rect';
    const ehTxBox = !!(nv && filho(nv, 'cNvSpPr') && filho(nv, 'cNvSpPr').a.txBox === '1');
    if (ehTxBox) p.txBox = true;
    if (no.n === 'cxnSp' && p.g === 'rect') p.g = 'straightConnector1';
    /* preenchimento, contorno e efeitos: o do spPr manda; senão vale o estilo (xdr:style) */
    const o = lerSpPr(sp, ctx.tema);
    const temGrpFill = sp && filho(sp, 'grpFill');
    if (o.preench) p.preench = o.preench.t === 'solido' && sp && filho(sp, 'blipFill') ? { t: 'solido', cor: '#d9d9d9' } : o.preench;
    else if (temGrpFill && preGrupo && preGrupo.preench) p.preench = preGrupo.preench;
    else {
      const fr = corDoEstilo(st, 'fillRef', ctx.tema);
      p.preench = fr && int(fr.idx) > 0 && fr.c ? { t: 'solido', ...fr.c } : { t: 'nenhum' };
    }
    const lr = corDoEstilo(st, 'lnRef', ctx.tema);
    const lnNo = sp && filho(sp, 'ln');
    if (lnNo && filho(lnNo, 'noFill')) p.linha = { t: 'nenhum' };
    else if (lnNo && (filho(lnNo, 'solidFill') || filho(lnNo, 'gradFill'))) p.linha = { ...o.contorno, larg: o.contorno.larg ?? (lr ? LN_PADRAO[int(lr.idx)] || 0.75 : 0.75) };
    else if (lr && int(lr.idx) > 0 && lr.c) p.linha = { t: 'solido', ...lr.c, larg: (o.contorno && o.contorno.larg) ?? LN_PADRAO[int(lr.idx)] ?? 0.75, ...(o.contorno && o.contorno.tr ? { tr: o.contorno.tr } : {}) };
    else if (lnNo && lnNo.a.w && !st) p.linha = { t: 'solido', cor: '#000000', larg: int(lnNo.a.w) / EMU_PT };
    else p.linha = { t: 'nenhum' };
    if (lnNo && p.linha.t !== 'nenhum') {
      const he = filho(lnNo, 'headEnd'), te = filho(lnNo, 'tailEnd');
      if (he && PONTAS[he.a.type]) p.linha.ini = PONTAS[he.a.type];
      if (te && PONTAS[te.a.type]) p.linha.fim = PONTAS[te.a.type];
    }
    if (o.efeito) {
      const ef = { ...o.efeito };
      const sh = filho(filho(sp, 'effectLst'), 'outerShdw');
      if (ef.sombra && sh && sh.a.sy && int(sh.a.sy) < 100000) ef.sombra = { ...ef.sombra, alfa: ef.sombra.alfa * Math.max(0.35, int(sh.a.sy) / 100000), dist: Math.max(ef.sombra.dist, 1) };
      p.efeito = ef;
    } else {
      const er = st && filho(st, 'effectRef');
      if (er && int(er.a.idx) >= 3) p.efeito = { sombra: { cor: '#000000', alfa: 0.4, blur: 4.5, dist: 1.5, dir: 90 } };
    }
    /* texto (a cor padrão vem do estilo: fontRef) */
    const fr = st && filho(st, 'fontRef');
    const corFonte = fr ? lerCor(fr, ctx.tema) : null;
    const tb = filho(no, 'txBody');
    const tl = no.a.textlink ? lerTextLink(no.a.textlink) : null;
    if (tb || tl) {
      const tx = lerTexto(tb || { k: [] }, { cor: corFonte ? corFonte.cor : '#000000' }, ctx.fontes, ctx.tema) || { pars: [], anc: 't', ins: [9.6, 4.8, 9.6, 4.8], wrap: true };
      if (tl) tx.ligado = tl;
      if (tx.pars.length || tx.ligado) p.texto = tx;
      /* links dentro do texto: guardam o alvo de antes */
      for (const m of String(JSON.stringify(tb || {})).matchAll(/"hlinkClick","a":\{"id":"([^"]+)"/g)) { const r = ctx.relsD.get(m[1]); if (r && !xoRels[m[1]]) xoRels[m[1]] = { alvo: r.url, externo: r.externo }; }
    }
    if (no.n === 'sp' && no.a.macro) p.macro = true;
    partes.push(p);
  }

  async function andar(no, T, preGrupo) {
    if (no.n === 'grpSp') {
      const x = xf0(no);
      const oe = offExt(x);
      const ch = x && filho(x, 'chOff'), ce = x && filho(x, 'chExt');
      const cho = { x: ch ? int(ch.a.x) : oe.ox, y: ch ? int(ch.a.y) : oe.oy }, che = { cx: ce ? int(ce.a.cx) : oe.cx, cy: ce ? int(ce.a.cy) : oe.cy };
      const kx = che.cx ? oe.cx / che.cx : 1, ky = che.cy ? oe.cy / che.cy : 1;
      /* filho em (x) → grupo: ox + (x - chx) * kx → px: T */
      const Tn = { ax: T.ax * kx, bx: T.ax * (oe.ox - cho.x * kx) + T.bx, ay: T.ay * ky, by: T.ay * (oe.oy - cho.y * ky) + T.by };
      const gsp = filho(no, 'grpSpPr');
      const gf = gsp ? lerSpPr(gsp, ctx.tema) : {};
      for (const f of no.k) await andar(f, Tn, gf.preench ? gf : preGrupo);
      return;
    }
    if (no.n === 'sp' || no.n === 'cxnSp' || no.n === 'pic') { await lerParte(no, T, preGrupo); return; }
    if (no.n === 'contentPart') { fora.push({ item: 'Desenhos à tinta', motivo: 'chegam numa versão futura' }); xoOk = false; }
  }
  await andar(raiz, T0, null);

  /* gráficos de dentro do grupo: posição deles dentro da âncora */
  if (gruposGraficos.length) {
    const r2 = arvore(el);
    const procurar = (no, T) => {
      if (no.n === 'grpSp') {
        const x = xf0(no); const oe = offExt(x);
        const ch = x && filho(x, 'chOff'), ce = x && filho(x, 'chExt');
        const cho = { x: ch ? int(ch.a.x) : oe.ox, y: ch ? int(ch.a.y) : oe.oy }, che = { cx: ce ? int(ce.a.cx) : oe.cx, cy: ce ? int(ce.a.cy) : oe.cy };
        const kx = che.cx ? oe.cx / che.cx : 1, ky = che.cy ? oe.cy / che.cy : 1;
        const Tn = { ax: T.ax * kx, bx: T.ax * (oe.ox - cho.x * kx) + T.bx, ay: T.ay * ky, by: T.ay * (oe.oy - cho.y * ky) + T.by };
        for (const f of no.k) procurar(f, Tn);
        return;
      }
      if (no.n === 'graphicFrame') {
        const xf = filho(no, 'xfrm'); const oe = offExt(xf);
        const ch = JSON.stringify(no).match(/"n":"chart","a":\{[^}]*"id":"([^"]+)"/);
        if (ch) graficos.push({ rid: ch[1], x: oe.ox * T.ax + T.bx, y: oe.oy * T.ay + T.by, w: oe.cx * T.ax, h: oe.cy * T.ay });
        else if (!/slicer/i.test(JSON.stringify(no))) fora.push({ item: 'Objetos dentro de grupo', motivo: 'tipo que o EFCdocs não abre' });
      }
    };
    procurar(r2, T0);
  }

  if (!partes.length) return { graficos, fora, aprox };
  /* v0.6.6 (Grok): grupo que tinha um gráfico e só mais uma forma: o gráfico sai solto e o grupo é desfeito
     (a forma fica sozinha, no lugar e no tamanho dela; ao salvar vai como forma simples, não como grupo de um só) */
  if (tipo === 'grpSp' && gruposGraficos.length && partes.length === 1) {
    const p0 = partes[0];
    const an = ancoraMais(ctx.aba, ctx.geo.l, ctx.geo.c, ctx.geo.dx, ctx.geo.dy, p0.x, p0.y);
    const solta = limparForma({ partes: [{ ...p0, x: 0, y: 0 }], w: p0.w, h: p0.h, w0: p0.w, h0: p0.h, nome: p0.nome || 'Forma' }, { id: 'x', ...an });
    if (solta) { if (ctx.ed) solta.ed = ctx.ed; return { obj: solta, graficos, fora, aprox }; }
  }
  /* o XML guardado: os r:id viram marcas (__EFC_R_id__) que a gravação troca pelos novos */
  let xo = bruto;
  const idsUsados = [...xo.matchAll(/\br:(?:id|embed|link|pict)="([^"]+)"/g)].map((m) => m[1]);
  if (idsUsados.some((id) => !xoRels[id])) xoOk = false;
  xo = xo.replace(/\b(r:(?:id|embed|link|pict))="([^"]+)"/g, (_, a, id) => `${a}="__EFC_R_${id}__"`);
  const obj = limparForma({ partes, w: W, h: H, w0: W, h0: H, nome: (partes.length === 1 && partes[0].nome) || (tipo === 'grpSp' ? 'Grupo' : 'Forma') }, { id: 'x', l: ctx.geo.l, c: ctx.geo.c, dx: ctx.geo.dx, dy: ctx.geo.dy });
  if (!obj) return { graficos, fora, aprox };
  if (ctx.ed) obj.ed = ctx.ed;
  if (xoOk && xo.length < 400000) { obj.xo = xo; obj.xoRels = xoRels; obj.xoNs = ctx.ns || {}; }
  return { obj, graficos, fora, aprox };
}

/** Depois de ler o livro: nome da aba → id nos links e nos textos ligados; e a assinatura (para saber se mudou). */
export function ligarFormaAoLivro(o, idDoNome) {
  for (const p of o.partes) {
    if (p.link && p.link.abaNome) { const id = idDoNome(p.link.abaNome); if (id) p.link = { aba: id, ...(p.link.ref ? { ref: p.link.ref } : {}) }; }
    if (p.texto && p.texto.ligado && p.texto.ligado.abaNome) { const id = idDoNome(p.texto.ligado.abaNome); if (id) p.texto.ligado = { aba: id, ref: p.texto.ligado.ref }; }
  }
  if (o.xo) o.xoSig = assinaturaForma(o);
  return o;
}

/* ============================================================ gravar ============================================================ */
const hexDe = (c) => String(c || '#000000').replace('#', '').slice(0, 6).toUpperCase();
const nomeAbaXml = (n) => (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(n) ? n : "'" + String(n).replace(/'/g, "''") + "'");
function corXml(c, alfa) { return `<a:srgbClr val="${hexDe(c)}">${alfa != null && alfa < 1 ? `<a:alpha val="${Math.round(alfa * 100000)}"/>` : ''}</a:srgbClr>`; }
function preenchXml(pr) {
  if (!pr || pr.t === 'nenhum') return '<a:noFill/>';
  if (pr.t === 'degrade') return `<a:gradFill rotWithShape="1"><a:gsLst>${pr.paradas.map((s) => `<a:gs pos="${Math.round((s.p || 0) * 100000)}">${corXml(s.cor, s.alfa)}</a:gs>`).join('')}</a:gsLst>${pr.forma === 'circulo' ? '<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>' : `<a:lin ang="${Math.round((pr.ang || 0) * 60000)}" scaled="0"/>`}</a:gradFill>`;
  return `<a:solidFill>${corXml(pr.cor, pr.alfa)}</a:solidFill>`;
}
function linhaXml(ln) {
  if (!ln || ln.t === 'nenhum') return '<a:ln><a:noFill/></a:ln>';
  return `<a:ln w="${Math.round((ln.larg ?? 0.75) * EMU_PT)}"><a:solidFill>${corXml(ln.cor, ln.alfa)}</a:solidFill>${ln.tr ? `<a:prstDash val="${ln.tr}"/>` : ''}${ln.ini ? `<a:headEnd type="${ln.ini}"/>` : ''}${ln.fim ? `<a:tailEnd type="${ln.fim}"/>` : ''}</a:ln>`;
}
function efeitoXml(ef) {
  if (!ef) return '';
  let s = '';
  if (ef.brilho) s += `<a:glow rad="${Math.round((ef.brilho.raio || 5) * EMU_PT)}">${corXml(ef.brilho.cor, ef.brilho.alfa)}</a:glow>`;
  if (ef.sombra) s += `<a:outerShdw blurRad="${Math.round((ef.sombra.blur || 0) * EMU_PT)}" dist="${Math.round((ef.sombra.dist || 0) * EMU_PT)}" dir="${Math.round((((ef.sombra.dir || 0) % 360) + 360) % 360 * 60000)}" algn="tl" rotWithShape="0">${corXml(ef.sombra.cor, ef.sombra.alfa)}</a:outerShdw>`;
  return s ? `<a:effectLst>${s}</a:effectLst>` : '';
}
function geoXml(p, w, h) {
  if (p.g === 'cust' && p.cust) {
    const paths = p.cust.map((c) => `<a:path w="${Math.round(c.w)}" h="${Math.round(c.h)}"${p.aberto ? ' fill="none"' : ''}>${c.cmds.map((k) => {
      const pts = (a) => a.map((v, i) => (i % 2 ? '' : `<a:pt x="${Math.round(a[i])}" y="${Math.round(a[i + 1])}"/>`)).join('');
      if (k.t === 'M') return `<a:moveTo>${pts(k.p)}</a:moveTo>`;
      if (k.t === 'L') return `<a:lnTo>${pts(k.p)}</a:lnTo>`;
      if (k.t === 'C') return `<a:cubicBezTo>${pts(k.p)}</a:cubicBezTo>`;
      if (k.t === 'Q') return `<a:quadBezTo>${pts(k.p)}</a:quadBezTo>`;
      if (k.t === 'A') return `<a:arcTo wR="${Math.round(k.p[0])}" hR="${Math.round(k.p[1])}" stAng="${Math.round(k.p[2] * 60000)}" swAng="${Math.round(k.p[3] * 60000)}"/>`;
      return '<a:close/>';
    }).join('')}</a:path>`).join('');
    return `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst>${paths}</a:pathLst></a:custGeom>`;
  }
  void w; void h;
  const prst = p.g === 'textBox' ? 'rect' : p.g === 'arrowLine' ? 'line' : p.g;
  const av = p.adj ? Object.entries(p.adj).map(([k, v]) => `<a:gd name="${k}" fmla="val ${Math.round(v)}"/>`).join('') : '';
  return `<a:prstGeom prst="${prst}"><a:avLst>${av}</a:avLst></a:prstGeom>`;
}
function textoXml(t, ctx) {
  if (!t) return '';
  const ins = t.ins || [9.6, 4.8, 9.6, 4.8];
  const bp = `<a:bodyPr wrap="${t.wrap === false ? 'none' : 'square'}" lIns="${Math.round(ins[0] * EMU)}" tIns="${Math.round(ins[1] * EMU)}" rIns="${Math.round(ins[2] * EMU)}" bIns="${Math.round(ins[3] * EMU)}"` +
    `${t.vert ? ` vert="${t.vert}"` : ''}${t.rotT ? ` rot="${Math.round(t.rotT * 60000)}"` : ''}${t.clip ? ' vertOverflow="clip" horzOverflow="clip"' : ''} rtlCol="0" anchor="${t.anc || 't'}"/>`;
  let valor = null;
  if (t.ligado && ctx.lerLigado) { try { valor = ctx.lerLigado(t.ligado); } catch { valor = null; } }
  const pars = valor != null ? [{ al: (t.pars[0] && t.pars[0].al) || 'l', runs: [{ ...((t.pars[0] && t.pars[0].runs[0]) || {}), t: String(valor) }] }] : t.pars;
  const runXml = (r) => {
    const rp = `<a:rPr lang="pt-BR" sz="${Math.round((r.tam || t.tam || 11) * 100)}"${r.neg ? ' b="1"' : ' b="0"'}${r.it ? ' i="1"' : ''}${r.sub ? ' u="sng"' : ''}${r.tach ? ' strike="sngStrike"' : ''}>` +
      `<a:solidFill>${corXml(r.cor || t.cor || '#000000')}</a:solidFill>${r.fonte ? `<a:latin typeface="${escapar(r.fonte, true)}"/>` : ''}</a:rPr>`;
    return String(r.t || '').split('\n').map((pedaco, i) => (i ? '<a:br>' + rp.replace(/^<a:rPr/, '<a:rPr').replace(/<\/a:rPr>$/, '</a:rPr>') + '</a:br>' : '') + (pedaco ? `<a:r>${rp}<a:t>${escapar(pedaco)}</a:t></a:r>` : '')).join('');
  };
  const ps = (pars.length ? pars : [{ al: 'l', runs: [] }]).map((q) => `<a:p><a:pPr algn="${q.al === 'ctr' ? 'ctr' : q.al === 'r' ? 'r' : q.al === 'just' ? 'just' : 'l'}"/>${(q.runs || []).map(runXml).join('')}<a:endParaRPr lang="pt-BR" sz="${Math.round((q.tam || (q.runs && q.runs[0] && q.runs[0].tam) || t.tam || 11) * 100)}"/></a:p>`).join('');
  return `<xdr:txBody>${bp}<a:lstStyle/>${ps}</xdr:txBody>`;
}

/** Uma parte → XML (xdr:sp ou xdr:pic). x,y,w,h já em EMU. reg(tipo, valor) devolve o r:id novo. */
function parteXml(p, k, box, ctx, reg) {
  const id = ctx.novoId();
  const nome = escapar(p.nome || (p.g === 'img' ? 'Imagem' : 'Forma') + ' ' + id, true);
  const xfrm = `<a:xfrm${p.rot ? ` rot="${Math.round(p.rot * 60000)}"` : ''}${p.fh ? ' flipH="1"' : ''}${p.fv ? ' flipV="1"' : ''}><a:off x="${Math.round(box.x)}" y="${Math.round(box.y)}"/><a:ext cx="${Math.max(0, Math.round(box.w))}" cy="${Math.max(0, Math.round(box.h))}"/></a:xfrm>`;
  const link = p.link ? reg('link', p.link) : null;
  const hl = link ? `<a:hlinkClick xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${link}"/>` : '';
  if (p.g === 'img') {
    const rid = reg('img', p.src);
    if (!rid) return '';
    return `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="${nome}">${hl}</xdr:cNvPr><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
      `<xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
      `<xdr:spPr>${xfrm}<a:prstGeom prst="${p.corte || 'rect'}"><a:avLst/></a:prstGeom>${p.linha && p.linha.t !== 'nenhum' ? linhaXml(p.linha) : ''}</xdr:spPr></xdr:pic>`;
  }
  let tl = '';
  if (p.texto && p.texto.ligado && ctx.nomeDaAba) {
    const nomeA = p.texto.ligado.aba ? ctx.nomeDaAba(p.texto.ligado.aba) : p.texto.ligado.abaNome || null;
    const m = /^([A-Z]+)(\d+)$/.exec(p.texto.ligado.ref);
    if (m) tl = (nomeA ? nomeAbaXml(nomeA) + '!' : '') + `$${m[1]}$${m[2]}`;
  }
  const aberto = ['line', 'arrowLine', 'straightConnector1'].includes(p.g) || /Connector/.test(p.g);
  return `<xdr:sp macro="" textlink="${escapar(tl, true)}"><xdr:nvSpPr><xdr:cNvPr id="${id}" name="${nome}">${hl}</xdr:cNvPr><xdr:cNvSpPr${p.txBox || p.g === 'textBox' ? ' txBox="1"' : ''}/></xdr:nvSpPr>` +
    `<xdr:spPr>${xfrm}${geoXml(p, box.w, box.h)}${aberto ? '<a:noFill/>' : preenchXml(p.preench)}${linhaXml(p.linha)}${efeitoXml(p.efeito)}</xdr:spPr>` +
    `${p.texto ? textoXml(p.texto, ctx) : ''}</xdr:sp>`;
}

/** Posição absoluta (EMU) do canto da âncora (soma das larguras e alturas). */
function absoluto(aba, o) {
  let x = o.dx, y = o.dy;
  for (let c = 0; c < o.c; c++) x += largCol(aba, c);
  for (let l = 0; l < Math.min(o.l, 200000); l++) y += altLin(aba, l);
  return { x: Math.round(x * EMU), y: Math.round(y * EMU) };
}

/** Âncora de duas células para um objeto (o canto de baixo calculado pelas larguras/alturas). */
export function ancoraXml(aba, o, inner, editAs = 'oneCell') {
  let col = o.c, x = o.dx + o.w;
  while (col < 16383 && x >= largCol(aba, col) && largCol(aba, col) > 0) { x -= largCol(aba, col); col++; }
  let lin = o.l, y = o.dy + o.h;
  while (lin < 1048575 && y >= altLin(aba, lin) && altLin(aba, lin) > 0) { y -= altLin(aba, lin); lin++; }
  return `<xdr:twoCellAnchor${editAs && editAs !== 'twoCell' ? ` editAs="${editAs}"` : ''}><xdr:from><xdr:col>${o.c}</xdr:col><xdr:colOff>${Math.round(o.dx * EMU)}</xdr:colOff><xdr:row>${o.l}</xdr:row><xdr:rowOff>${Math.round(o.dy * EMU)}</xdr:rowOff></xdr:from>` +
    `<xdr:to><xdr:col>${col}</xdr:col><xdr:colOff>${Math.round(x * EMU)}</xdr:colOff><xdr:row>${lin}</xdr:row><xdr:rowOff>${Math.round(y * EMU)}</xdr:rowOff></xdr:to>${inner}<xdr:clientData/></xdr:twoCellAnchor>`;
}

/** Botão do EFCdocs (v0.6.3) → forma com link (vai para o Excel como forma clicável). */
export function formaDoBotao(o) {
  return {
    ...o, tipo: 'forma', w0: o.w, h0: o.h, nome: o.nome || 'Botão',
    partes: [{
      g: 'roundRect', x: 0, y: 0, w: o.w, h: o.h, adj: { adj: 25000 },
      preench: { t: 'solido', cor: o.cor || '#2f6f4f' }, linha: { t: 'nenhum' },
      texto: { pars: [{ al: 'ctr', runs: [{ t: o.nome || 'Botão', tam: 11, neg: true, cor: '#ffffff' }] }], anc: 'ctr', ins: [6, 3, 6, 3], wrap: true, cor: '#ffffff' },
      link: { aba: o.alvo, ...(o.ref ? { ref: o.ref } : {}) },
    }],
  };
}

/**
 * Forma → { ancora, rels:[{ id, tipo:'hyperlink'|'image', alvo, externo }], midias:[{ nome, bytes, ext }] }.
 * ctx = { aba, nomeDaAba(id), novoId(), novoRel(), novaMidia(ext) → { n, nome, alvo }, lerLigado }
 */
export function gravarForma(o, ctx) {
  const rels = [], midias = [];
  const alvoDoLink = (lk) => {
    if (lk.url) return { alvo: lk.url, externo: true };
    const nomeA = lk.aba ? ctx.nomeDaAba(lk.aba) : lk.abaNome;
    if (!nomeA) return null;
    return { alvo: '#' + nomeAbaXml(nomeA) + '!' + (lk.ref || 'A1'), externo: false };
  };
  const deBase64 = (b64) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  const reg = (tipo, v) => {
    if (tipo === 'link') { const a = alvoDoLink(v); if (!a) return null; const id = ctx.novoRel(); rels.push({ id, tipo: 'hyperlink', ...a }); return id; }
    const m = /^data:image\/(png|jpeg|webp|gif);base64,(.+)$/.exec(v || '');
    if (!m) return null;
    const ext = m[1] === 'jpeg' ? 'jpeg' : m[1];
    const md = ctx.novaMidia(ext);
    midias.push({ nome: md.nome, bytes: deBase64(m[2]), ext });
    const id = ctx.novoRel(); rels.push({ id, tipo: 'image', alvo: md.alvo }); return id;
  };
  const abs = absoluto(ctx.aba, o);
  let inner = '';
  if (o.xo && o.xoSig && o.xoSig === assinaturaForma(o) && o.xoRels) {
    /* sem mexer: o XML de antes, com r:id novos e a posição de agora */
    let ok = true;
    const mapa = {};
    for (const [antigo, r] of Object.entries(o.xoRels)) {
      if (r.k != null) {
        const p = o.partes[r.k];
        const id = p ? (r.t === 'img' ? reg('img', p.src) : p.link ? reg('link', p.link) : null) : null;
        if (!id) { ok = false; break; }
        mapa[antigo] = id;
      } else { const id = ctx.novoRel(); rels.push({ id, tipo: 'hyperlink', alvo: r.alvo, externo: !!r.externo }); mapa[antigo] = id; }
    }
    if (ok) {
      inner = o.xo.replace(/__EFC_R_([^"]+?)__/g, (_, id) => mapa[id] || id);
      /* ids únicos no desenho */
      inner = inner.replace(/(<(?:\w+:)?cNvPr\b[^>]*?\bid=")(\d+)"/g, (_, a) => `${a}${ctx.novoId()}"`);
      /* o primeiro xfrm (da forma ou do grupo) vai para a posição e o tamanho de agora */
      inner = inner.replace(/(<a:xfrm\b[^>]*>\s*)<a:off x="-?\d+" y="-?\d+"\/>\s*<a:ext cx="\d+" cy="\d+"\/>/, (_, a) => `${a}<a:off x="${abs.x}" y="${abs.y}"/><a:ext cx="${Math.round(o.w * EMU)}" cy="${Math.round(o.h * EMU)}"/>`);
    } else { rels.length = 0; midias.length = 0; }
  }
  if (!inner) {
    const w0 = o.w0 || o.w || 1, h0 = o.h0 || o.h || 1;
    const sx = w0 > 0.5 ? o.w / w0 : 1, sy = h0 > 0.5 ? o.h / h0 : 1;
    if (o.partes.length === 1) {
      const p = o.partes[0];
      inner = parteXml(p, 0, { x: abs.x + p.x * sx * EMU, y: abs.y + p.y * sy * EMU, w: p.w * sx * EMU, h: p.h * sy * EMU }, ctx, reg);
    } else {
      const gid = ctx.novoId();
      const filhosXml = o.partes.map((p, k) => parteXml(p, k, { x: p.x * EMU, y: p.y * EMU, w: p.w * EMU, h: p.h * EMU }, ctx, reg)).join('');
      inner = `<xdr:grpSp><xdr:nvGrpSpPr><xdr:cNvPr id="${gid}" name="${escapar(o.nome || 'Grupo ' + gid, true)}"/><xdr:cNvGrpSpPr/></xdr:nvGrpSpPr>` +
        `<xdr:grpSpPr><a:xfrm><a:off x="${abs.x}" y="${abs.y}"/><a:ext cx="${Math.round(o.w * EMU)}" cy="${Math.round(o.h * EMU)}"/><a:chOff x="0" y="0"/><a:chExt cx="${Math.round(w0 * EMU)}" cy="${Math.round(h0 * EMU)}"/></a:xfrm></xdr:grpSpPr>${filhosXml}</xdr:grpSp>`;
    }
  }
  if (!inner) return null;
  /* forma com altura ou largura zero (linha reta) não pode ter âncora invertida */
  return { ancora: ancoraXml(ctx.aba, o, inner, o.ed || (o.xo ? 'twoCell' : 'oneCell')), rels, midias };
}

export { NS_A, PT_PX };
