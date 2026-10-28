/* EFCdocs v0.6.1 — gráficos ⇄ .xlsx (DrawingML), sem biblioteca.
   Ler: o XML do gráfico vira um "plano" (graficoPlano.js) com TODA a formatação: cores (também as do tema, com mais claro/escuro),
     sem preenchimento, degradê, contorno, brilho, sombra, cor de cada ponto e fatia invisível, giro e furo da rosca, rosca + pizza
     (velocímetro), colunas + linhas, eixo da direita, linha curva, marcadores, rótulos com formato (R$, %), mínimo/máximo/passo
     dos eixos, títulos, fontes, legenda e fundo. O XML original fica guardado junto (g.xo).
   Gravar: se o gráfico que veio do Excel não foi mexido aqui, ele volta EXATAMENTE como veio (o XML original).
     Senão, o plano vira XML de novo (com toda a formatação). Os gráficos do EFCdocs levam também uma extensão com as escolhas
     do EFCdocs (o Excel ignora; ao abrir de volta, o gráfico volta igual). */
import { tags, tag, escapar, XML_CAB } from './xml.js';
import { arvore, filho, filhos, em, val, valNum, valBool, textoDe, busca } from './xmlArvore.js';
import { letraCol, lerChave } from '../ref.js';
import { lerFiguraDaAncora } from './imagensXlsx.js';
import { LARG_PADRAO, ALT_PADRAO, estiloDe } from '../modelo.js';
import { dadosDaFaixa, normalizarG, PALETA_GRAFICO, NOME_TIPO } from '../graficos.js';
import { construir, seriesDe, clonar, refsDoPlano, materializarCores } from '../graficoPlano.js';
import { faixasDe } from '../regras.js';
import { formatar } from '../formato.js';

const NS_C = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const URI_EFC = '{6A1F3E2B-7C4D-4E5F-8A9B-0C1D2E3F4A5B}';
const EMU = 9525; // por px
const EMU_PT = 12700;
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);

const corX = (h) => String(h || '#000000').replace('#', '').slice(0, 6).toUpperCase();
const nomeAba = (n) => (/^[A-Za-z_][A-Za-z0-9_.]*$/.test(n) ? n : "'" + String(n).replace(/'/g, "''") + "'");
const abs = (l, c) => `$${letraCol(c)}$${l + 1}`;
const refF = (aba, l1, c1, l2, c2) => `${nomeAba(aba)}!${abs(l1, c1)}${l2 === l1 && c2 === c1 ? '' : ':' + abs(l2, c2)}`;
const largCol = (aba, c) => (aba.ocC && aba.ocC[c] ? 0 : aba.larg && aba.larg[c] != null ? aba.larg[c] : LARG_PADRAO);
const altLin = (aba, l) => (aba.ocL && aba.ocL[l] ? 0 : aba.alt && aba.alt[l] != null ? aba.alt[l] : ALT_PADRAO);

/* ============================================================ cores do DrawingML ============================================================ */
const TEMA_OFFICE = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47', '0563C1', '954F72'];
const NOME_TEMA = { lt1: 0, bg1: 0, dk1: 1, tx1: 1, lt2: 2, bg2: 2, dk2: 3, tx2: 3, accent1: 4, accent2: 5, accent3: 6, accent4: 7, accent5: 8, accent6: 9, hlink: 10, folHlink: 11 };
const PRESET = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080', grey: '808080', orange: 'FFA500', darkBlue: '00008B', darkRed: '8B0000', darkGreen: '006400', lightGray: 'D3D3D3', silver: 'C0C0C0', navy: '000080', purple: '800080' };
const rgb = (hex) => { const n = parseInt(hex, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hex = (r, g, b) => [r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('').toUpperCase();
function paraHsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); const l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn; const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h / 6, s, l]; }
function deHsl(h, s, l) { if (!s) return [l * 255, l * 255, l * 255]; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; }

/** Nó de cor (srgbClr, schemeClr, sysClr, prstClr, scrgbClr) → { cor:'#rrggbb', alfa } */
function lerCor(no, tema) {
  if (!no) return null;
  const c = no.k.find((x) => /^(srgbClr|schemeClr|sysClr|prstClr|scrgbClr|hslClr)$/.test(x.n));
  if (!c) return null;
  let h = null;
  if (c.n === 'srgbClr') h = c.a.val;
  else if (c.n === 'schemeClr') h = (tema || TEMA_OFFICE)[NOME_TEMA[c.a.val] ?? 1] || '000000';
  else if (c.n === 'sysClr') h = c.a.lastClr || (c.a.val === 'window' ? 'FFFFFF' : '000000');
  else if (c.n === 'prstClr') h = PRESET[c.a.val] || '000000';
  else if (c.n === 'scrgbClr') h = hex(...['r', 'g', 'b'].map((k) => (parseInt(c.a[k] || '0', 10) / 100000) * 255));
  if (!h || !/^[0-9A-Fa-f]{6}$/.test(h)) h = '000000';
  let [r, g, b] = rgb(h);
  let alfa = 1;
  for (const t of c.k) {
    const v = parseInt(t.a.val || '0', 10) / 100000;
    if (t.n === 'alpha') alfa = v;
    else if (t.n === 'lumMod' || t.n === 'lumOff') { const [hh, s, l] = paraHsl(r, g, b); const l2 = t.n === 'lumMod' ? l * v : l + v; [r, g, b] = deHsl(hh, s, Math.max(0, Math.min(1, l2))); }
    else if (t.n === 'tint') { r = 255 - (255 - r) * v; g = 255 - (255 - g) * v; b = 255 - (255 - b) * v; }
    else if (t.n === 'shade') { r *= v; g *= v; b *= v; }
    else if (t.n === 'satMod') { const [hh, s, l] = paraHsl(r, g, b); [r, g, b] = deHsl(hh, Math.min(1, s * v), l); }
  }
  const o = { cor: '#' + hex(r, g, b).toLowerCase() };
  if (alfa < 1) o.alfa = Math.round(alfa * 100) / 100;
  return o;
}

/** spPr → { preench, contorno, efeito } (undefined = automático) */
function lerSpPr(sp, tema) {
  const out = {};
  if (!sp) return out;
  for (const x of sp.k) {
    if (x.n === 'noFill') out.preench = { t: 'nenhum' };
    else if (x.n === 'solidFill' || x.n === 'pattFill') { const c = x.n === 'pattFill' ? lerCor(filho(x, 'fgClr'), tema) : lerCor(x, tema); if (c) out.preench = { t: 'solido', ...c }; }
    else if (x.n === 'gradFill') {
      const paradas = filhos(filho(x, 'gsLst'), 'gs').map((gs) => ({ p: parseInt(gs.a.pos || '0', 10) / 100000, ...(lerCor(gs, tema) || { cor: '#888888' }) })).sort((a, b) => a.p - b.p);
      const lin = filho(x, 'lin');
      if (paradas.length) out.preench = { t: 'degrade', paradas, ang: lin ? parseInt(lin.a.ang || '0', 10) / 60000 : 90, ...(filho(x, 'path') ? { forma: 'circulo' } : {}) };
    } else if (x.n === 'blipFill') out.preench = { t: 'solido', cor: '#a6a6a6' };
    else if (x.n === 'ln') out.contorno = lerLn(x, tema);
    else if (x.n === 'effectLst') {
      const ef = {};
      const gl = filho(x, 'glow');
      if (gl) { const c = lerCor(gl, tema) || { cor: '#ffffff' }; ef.brilho = { cor: c.cor, alfa: c.alfa ?? 1, raio: parseInt(gl.a.rad || '63500', 10) / EMU_PT }; }
      const sh = filho(x, 'outerShdw');
      if (sh) { const c = lerCor(sh, tema) || { cor: '#000000' }; ef.sombra = { cor: c.cor, alfa: c.alfa ?? 0.4, blur: parseInt(sh.a.blurRad || '0', 10) / EMU_PT, dist: parseInt(sh.a.dist || '0', 10) / EMU_PT, dir: parseInt(sh.a.dir || '0', 10) / 60000 }; }
      if (ef.brilho || ef.sombra) out.efeito = ef;
    }
  }
  return out;
}
function lerLn(ln, tema) {
  if (!ln) return undefined;
  const o = {};
  if (filho(ln, 'noFill')) o.t = 'nenhum';
  else {
    const sf = filho(ln, 'solidFill') || filho(ln, 'gradFill');
    const c = sf ? (sf.n === 'gradFill' ? lerCor(filhos(filho(sf, 'gsLst'), 'gs')[0], tema) : lerCor(sf, tema)) : null;
    o.t = 'solido';
    if (c) { o.cor = c.cor; if (c.alfa != null) o.alfa = c.alfa; }
  }
  if (ln.a.w) o.larg = Math.round((parseInt(ln.a.w, 10) / EMU_PT) * 100) / 100;
  const d = val(ln, 'prstDash');
  if (d && d !== 'solid') o.tr = d;
  return o;
}
/** txPr / rich → { tam (pt), cor, negrito, italico, girar } */
function lerFonte(no, tema) {
  if (!no) return {};
  const o = {};
  const bp = filho(no, 'bodyPr');
  if (bp && bp.a.rot) o.girar = parseInt(bp.a.rot, 10) / 60000;
  const rp = busca(no, 'defRPr')[0] || busca(no, 'rPr')[0];
  if (rp) {
    if (rp.a.sz) o.tam = parseInt(rp.a.sz, 10) / 100;
    if (rp.a.b != null) o.negrito = rp.a.b === '1' || rp.a.b === 'true';
    if (rp.a.i === '1' || rp.a.i === 'true') o.italico = true;
    const sf = filho(rp, 'solidFill');
    const c = sf && lerCor(sf, tema);
    if (c) o.cor = c.cor;
  }
  /* o primeiro pedaço de texto pode ter fonte própria */
  const r = busca(no, 'r')[0];
  const rr = r && filho(r, 'rPr');
  if (rr) {
    if (rr.a.sz) o.tam = parseInt(rr.a.sz, 10) / 100;
    if (rr.a.b != null) o.negrito = rr.a.b === '1' || rr.a.b === 'true';
    const c = filho(rr, 'solidFill') && lerCor(filho(rr, 'solidFill'), tema);
    if (c) o.cor = c.cor;
  }
  return o;
}

/* ============================================================ ler: XML → plano ============================================================ */
/** Referência do Excel ('Aba 1'!$B$2:$B$6) → { aba: nome, fx: 'B2:B6' } (null: várias áreas ou outro arquivo) */
export function lerRef(f) {
  const t = String(f || '').trim().replace(/^\(|\)$/g, '');
  if (!t || t.includes(',') || /^\[/.test(t) || /^'\[/.test(t)) return null;
  const m = /^(?:'((?:[^']|'')+)'|([^!]+))!(\$?[A-Z]+\$?\d+)(?::(\$?[A-Z]+\$?\d+))?$/i.exec(t);
  if (!m) return null;
  const a = lerChave(m[3].replace(/\$/g, '').toUpperCase()), b = lerChave((m[4] || m[3]).replace(/\$/g, '').toUpperCase());
  if (!a || !b) return null;
  const l1 = Math.min(a.l, b.l), c1 = Math.min(a.c, b.c), l2 = Math.max(a.l, b.l), c2 = Math.max(a.c, b.c);
  return { aba: m[1] != null ? m[1].replace(/''/g, "'") : m[2], fx: `${letraCol(c1)}${l1 + 1}${l1 === l2 && c1 === c2 ? '' : `:${letraCol(c2)}${l2 + 1}`}` };
}
/** Cache de números/textos */
function lerCache(no) {
  const out = { num: null, txt: null, fmt: null };
  if (!no) return out;
  const fonte = no.k.find((x) => /^(numRef|strRef|multiLvlStrRef|numLit|strLit)$/.test(x.n)) || no;
  const f = filho(fonte, 'f');
  out.ref = f ? lerRef(f.t) : null;
  out.f = f ? f.t : null;
  const cache = filho(fonte, 'numCache') || filho(fonte, 'strCache') || (fonte.n === 'numLit' || fonte.n === 'strLit' ? fonte : null) || (filho(fonte, 'multiLvlStrCache') && filhos(filho(fonte, 'multiLvlStrCache'), 'lvl')[0]);
  if (cache) {
    const n = valNum(cache, 'ptCount', 0) || filhos(cache, 'pt').reduce((m, p) => Math.max(m, +p.a.idx + 1), 0);
    const num = /num/i.test(cache.n) || /numLit/.test(fonte.n);
    const arr = new Array(n).fill(null);
    for (const p of filhos(cache, 'pt')) { const i = +p.a.idx; const v = em(p, 'v'); if (i >= 0 && i < n && v) arr[i] = num ? (Number.isFinite(parseFloat(v.t)) ? parseFloat(v.t) : null) : v.t; }
    if (num) out.num = arr; else out.txt = arr.map((x) => (x == null ? '' : x));
    const fc = filho(cache, 'formatCode');
    if (fc && fc.t && fc.t !== 'General') out.fmt = fc.t;
  }
  return out;
}
function lerRotulos(dl, tema) {
  if (!dl) return undefined;
  if (valBool(dl, 'delete')) return null;
  const R = {};
  if (valBool(dl, 'showVal', false)) R.val = true;
  if (valBool(dl, 'showPercent', false)) R.pct = true;
  if (valBool(dl, 'showCatName', false)) R.cat = true;
  if (valBool(dl, 'showSerName', false)) R.nome = true;
  if (!R.val && !R.pct && !R.cat && !R.nome) return null;
  const nf = filho(dl, 'numFmt');
  if (nf && nf.a.formatCode && nf.a.sourceLinked !== '1') R.fmt = nf.a.formatCode;
  const pos = val(dl, 'dLblPos');
  if (pos) R.pos = pos;
  const sep = em(dl, 'separator');
  if (sep && sep.t) R.sep = sep.t;
  Object.assign(R, lerFonte(filho(dl, 'txPr'), tema));
  return R;
}
function lerMarcador(m, tema) {
  if (!m) return undefined;
  const forma = val(m, 'symbol');
  const o = { forma: forma || 'auto' };
  const tam = valNum(m, 'size');
  if (tam) o.tam = tam;
  const sp = lerSpPr(filho(m, 'spPr'), tema);
  if (sp.preench) o.preench = sp.preench;
  if (sp.contorno) o.contorno = sp.contorno;
  return o;
}
function lerSerie(s, tema) {
  const S = { pontos: {} };
  const tx = filho(s, 'tx');
  if (tx) {
    const c = lerCache(tx);
    const v = filho(tx, 'v');
    S.nome = { txt: (c.txt && c.txt.join(' ')) || (v && v.t) || '', ref: c.ref };
  } else S.nome = { txt: '', ref: null };
  const sp = lerSpPr(filho(s, 'spPr'), tema);
  if (sp.preench !== undefined) S.preench = sp.preench;
  if (sp.contorno !== undefined) S.contorno = sp.contorno;
  if (sp.efeito) S.efeito = sp.efeito;
  const m = lerMarcador(filho(s, 'marker'), tema);
  if (m) S.marcador = m;
  if (valBool(s, 'smooth', false)) S.suave = true;
  const ex = valNum(s, 'explosion');
  if (ex) S.explodir = ex;
  for (const p of filhos(s, 'dPt')) {
    const i = valNum(p, 'idx');
    if (!ehNum(i)) continue;
    const ps = lerSpPr(filho(p, 'spPr'), tema);
    const o = {};
    if (ps.preench) o.preench = ps.preench;
    if (ps.contorno) o.contorno = ps.contorno;
    if (ps.efeito) o.efeito = ps.efeito;
    const pm = lerMarcador(filho(p, 'marker'), tema);
    if (pm) o.marcador = pm;
    const pe = valNum(p, 'explosion');
    if (pe) o.explodir = pe;
    S.pontos[i] = o;
  }
  const dl = filho(s, 'dLbls');
  if (dl) {
    const R = lerRotulos(dl, tema);
    if (R !== undefined) S.rotulos = R;
    for (const u of filhos(dl, 'dLbl')) {
      const i = valNum(u, 'idx');
      if (!ehNum(i)) continue;
      const Ru = lerRotulos(u, tema);
      (S.pontos[i] || (S.pontos[i] = {})).rotulo = Ru === null ? false : Ru || undefined;
    }
  }
  const tl = filho(s, 'trendline');
  if (tl) {
    const tp = val(tl, 'trendlineType');
    S.tendencia = { tipo: tp === 'movingAvg' ? 'media' : tp === 'linear' ? 'linear' : 'linear', periodo: valNum(tl, 'period', 2), linha: lerSpPr(filho(tl, 'spPr'), tema).contorno || null };
  }
  const cat = lerCache(filho(s, 'cat') || filho(s, 'xVal'));
  S.cats = { txt: cat.txt, num: cat.num, ref: cat.ref, fmt: cat.fmt };
  if (cat.f && !cat.ref) S.cats.semRef = true;
  const v = lerCache(filho(s, 'val') || filho(s, 'yVal'));
  S.vals = { num: v.num || [], ref: v.ref, fmt: v.fmt };
  if (v.f && !v.ref) S.vals.semRef = true;
  if (valBool(s, 'invertIfNegative', false)) S.invNeg = true;
  return S;
}
function lerEixo(ax, tema) {
  const E = { tipo: ax.n === 'valAx' ? 'val' : 'cat', id: val(ax, 'axId') };
  const sc = filho(ax, 'scaling');
  if (val(sc, 'orientation') === 'maxMin') E.inverter = true;
  const mx = valNum(sc, 'max'), mn = valNum(sc, 'min');
  if (ehNum(mx)) E.max = mx;
  if (ehNum(mn)) E.min = mn;
  if (valBool(ax, 'delete', false)) E.apagado = true;
  E.pos = val(ax, 'axPos') || 'b';
  const gr = filho(ax, 'majorGridlines');
  E.grade = gr ? lerSpPr(filho(gr, 'spPr'), tema).contorno || { t: 'solido', cor: '#d9d9d9', larg: 0.75 } : null;
  const ti = filho(ax, 'title');
  if (ti) E.titulo = { texto: textoDe(filho(ti, 'tx')) || (E.tipo === 'val' ? 'Título do eixo' : 'Título do eixo'), ...lerFonte(em(ti, 'tx/rich') || filho(ti, 'txPr'), tema) };
  const nf = filho(ax, 'numFmt');
  if (nf && nf.a.formatCode && nf.a.formatCode !== 'General') { E.fmt = nf.a.formatCode; if (nf.a.sourceLinked === '1') E.fmtLigado = true; }
  const tl = val(ax, 'tickLblPos');
  if (tl === 'none') E.rotPos = 'none';
  const sp = lerSpPr(filho(ax, 'spPr'), tema);
  E.linha = sp.contorno !== undefined ? sp.contorno : E.tipo === 'cat' ? { t: 'solido', cor: '#d9d9d9', larg: 0.75 } : null;
  const f = lerFonte(filho(ax, 'txPr'), tema);
  E.rotulo = { tam: f.tam || 9, cor: f.cor || '#595959', ...(f.negrito ? { negrito: true } : {}), ...(f.girar ? { girar: f.girar } : {}) };
  const cr = val(ax, 'crosses');
  if (cr === 'max' || cr === 'min') E.cruza = cr;
  const ca = valNum(ax, 'crossesAt');
  if (ehNum(ca)) E.cruza = ca;
  const cb = val(ax, 'crossBetween');
  if (cb) E.entre = cb !== 'midCat';
  const mu = valNum(ax, 'majorUnit');
  if (ehNum(mu) && mu > 0) E.passo = mu;
  E.cruzaId = val(ax, 'crossAx');
  return E;
}

const GRUPOS_XL = { barChart: 'bar', bar3DChart: 'bar', lineChart: 'line', line3DChart: 'line', areaChart: 'area', area3DChart: 'area', pieChart: 'pie', pie3DChart: 'pie', ofPieChart: 'pie', doughnutChart: 'doughnut', scatterChart: 'scatter', bubbleChart: 'scatter', radarChart: 'line', stockChart: 'line' };

/** chart.xml do Excel → { plano } ou { fora: motivo }. tema: as 12 cores do tema do arquivo. */
export function planoDoXml(xml, tema = TEMA_OFFICE) {
  if (/<cx:chartSpace|chartex/i.test(xml.slice(0, 600))) return { fora: 'tipo novo do Excel (cascata, funil, mapa, caixa, histograma do 2016...)' };
  const raiz = arvore(xml);
  const ch = filho(raiz, 'chart');
  const pa = ch && filho(ch, 'plotArea');
  if (!pa) return { fora: 'gráfico sem dados' };
  if (filho(pa, 'surfaceChart') || filho(pa, 'surface3DChart')) return { fora: 'gráfico de superfície (o EFCdocs ainda não desenha)' };
  const temaH = (tema || TEMA_OFFICE).map((h) => String(h).replace('#', ''));
  const pal = [4, 5, 6, 7, 8, 9].map((i) => '#' + temaH[i].toLowerCase());
  /* depois das 6 cores do tema, o Excel repete mais escuras e mais claras */
  const paleta = [...pal, ...pal.map((c) => { const [h, s, l] = paraHsl(...rgb(c.slice(1))); return '#' + hex(...deHsl(h, s, l * 0.6)).toLowerCase(); }), ...pal.map((c) => { const [h, s, l] = paraHsl(...rgb(c.slice(1))); return '#' + hex(...deHsl(h, s, l + (1 - l) * 0.4)).toLowerCase(); })];
  const fonte = { tam: 10, cor: '#595959', ...lerFonte(filho(raiz, 'txPr'), temaH) };
  const P = { excel: true, fonte, paleta, ref: [], vazio: 'gap' };
  const spCs = lerSpPr(filho(raiz, 'spPr'), temaH);
  const rc = filho(raiz, 'roundedCorners');
  P.fundo = { preench: spCs.preench || { t: 'solido', cor: '#ffffff' }, borda: spCs.contorno !== undefined ? spCs.contorno : { t: 'solido', cor: '#d9d9d9', larg: 0.75 }, cantos: rc ? valBool(raiz, 'roundedCorners', true) : true };
  if (spCs.efeito) P.fundo.efeito = spCs.efeito;
  const spPa = lerSpPr(filho(pa, 'spPr'), temaH);
  P.area = { preench: spPa.preench || null, borda: spPa.contorno || null };
  /* título */
  const ti = filho(ch, 'title');
  const semTitulo = valBool(ch, 'autoTitleDeleted', false);
  if (ti) {
    const tx = filho(ti, 'tx');
    const linhas = tx ? (busca(tx, 'p').length ? busca(tx, 'p').map((p) => textoDe(p)).filter((x, i, a) => x || i < a.length - 1) : [lerCache(tx).txt ? lerCache(tx).txt.join(' ') : '']) : [];
    const texto = linhas.join('\n').trim();
    const f = lerFonte(em(ti, 'tx/rich') || filho(ti, 'txPr'), temaH);
    P.titulo = { texto: texto || null, tam: f.tam || 14, negrito: f.negrito ?? false, cor: f.cor || fonte.cor, ...(f.italico ? { italico: true } : {}) };
  } else P.titulo = null;
  void semTitulo;
  /* legenda */
  const lg = filho(ch, 'legend');
  if (lg) {
    const f = lerFonte(filho(lg, 'txPr'), temaH);
    P.legenda = { pos: val(lg, 'legendPos') || 'r', tam: f.tam || 9, cor: f.cor || fonte.cor, ...(f.negrito ? { negrito: true } : {}) };
    const oc = filhos(lg, 'legendEntry').filter((e) => valBool(e, 'delete', false)).map((e) => valNum(e, 'idx')).filter(ehNum);
    if (oc.length) P.legenda.ocultas = oc;
  } else P.legenda = null;
  const db = val(ch, 'dispBlanksAs');
  if (db === 'zero') P.vazio = 'zero'; else if (db === 'span') P.vazio = 'span';
  P.soVisiveis = valBool(ch, 'plotVisOnly', true);
  /* eixos */
  const eixos = new Map();
  for (const ax of pa.k.filter((x) => /^(catAx|valAx|dateAx|serAx)$/.test(x.n))) { const E = lerEixo(ax, temaH); if (E.id) eixos.set(E.id, E); }
  /* grupos */
  P.grupos = [];
  let parPrimario = null;
  const avisos = [];
  for (const gx of pa.k) {
    const tp = GRUPOS_XL[gx.n];
    if (!tp) continue;
    if (/3D/.test(gx.n)) avisos.push('3D desenhado sem profundidade');
    if (gx.n === 'radarChart' || gx.n === 'stockChart' || gx.n === 'bubbleChart') avisos.push('radar, ações e bolhas são desenhados de forma simples');
    const G = { tipo: tp, series: filhos(gx, 'ser').map((s) => lerSerie(s, temaH)) };
    if (tp === 'bar') { G.dir = val(gx, 'barDir') || 'col'; G.agrup = val(gx, 'grouping') || 'clustered'; G.espaco = valNum(gx, 'gapWidth', 150); G.sobrepor = valNum(gx, 'overlap', G.agrup === 'clustered' ? 0 : 100); }
    else if (tp === 'line' || tp === 'area') { G.agrup = val(gx, 'grouping') || 'standard'; if (tp === 'line') G.marcas = valBool(gx, 'marker', true); }
    else if (tp === 'pie' || tp === 'doughnut') { G.giro = valNum(gx, 'firstSliceAng', 0); if (tp === 'doughnut') G.furo = valNum(gx, 'holeSize', 50); }
    else if (tp === 'scatter') G.estilo = val(gx, 'scatterStyle') || 'lineMarker';
    G.variar = valBool(gx, 'varyColors', tp === 'pie' || tp === 'doughnut');
    /* rótulos do grupo valem para as séries que não têm os seus */
    const dlg = filho(gx, 'dLbls');
    if (dlg) { const R = lerRotulos(dlg, temaH); if (R) for (const S of G.series) if (S.rotulos === undefined) S.rotulos = R; }
    const ids = filhos(gx, 'axId').map((x) => x.a.val);
    if (ids.length && tp !== 'pie' && tp !== 'doughnut') {
      const k = ids.join(',');
      if (!parPrimario) parPrimario = ids;
      else if (k !== parPrimario.join(',')) G.eixo2 = true;
      G.eixosIds = ids;
    }
    for (const S of G.series) {
      if (S.rotulos === undefined) delete S.rotulos;
      /* nas linhas e na dispersão, a "linha" da série é o traço */
      if ((tp === 'line' || tp === 'scatter' || tp === 'radar') && S.contorno !== undefined) { S.linha = S.contorno; delete S.contorno; }
      if ((tp === 'pie' || tp === 'doughnut') && S.rotulos && !S.rotulos.pos) S.rotulos.pos = tp === 'pie' ? 'bestFit' : 'ctr';
    }
    P.grupos.push(G);
  }
  if (!P.grupos.length) return { fora: 'tipo que o EFCdocs ainda não tem' };
  if (!seriesDe(P).length) return { fora: 'gráfico sem séries' };
  /* eixos do plano: x/y primários, x2/y2 secundários */
  const doPar = (ids) => (ids || []).map((id) => eixos.get(id)).filter(Boolean);
  const pri = doPar(parPrimario);
  const disp = P.grupos.some((G) => G.tipo === 'scatter' && !G.eixo2);
  const xP = disp ? pri.find((e) => e.pos === 'b' || e.pos === 't') || pri[0] : pri.find((e) => e.tipo === 'cat') || pri[0];
  const yP = pri.find((e) => e !== xP) || null;
  const sec = P.grupos.find((G) => G.eixo2);
  const par2 = sec ? doPar(sec.eixosIds) : [];
  const x2 = par2.find((e) => e.tipo === 'cat') || par2[0] || null, y2 = par2.find((e) => e !== x2) || null;
  const limpaE = (e) => { if (!e) return null; const o = { ...e }; delete o.id; delete o.cruzaId; return o; };
  P.eixos = { x: limpaE(xP) || { tipo: 'cat', pos: 'b' }, y: limpaE(yP) || { tipo: 'val', pos: 'l' }, x2: limpaE(x2), y2: limpaE(y2) };
  if (P.eixos.x2 && !x2) P.eixos.x2 = null;
  for (const G of P.grupos) delete G.eixosIds;
  if (avisos.length) P.avisos = [...new Set(avisos)];
  return { plano: P };
}

/** Assinatura do plano (formatação + referências, sem os números): serve para saber se o gráfico foi mexido. */
export function assinaturaPlano(P) {
  const x = clonar(P);
  for (const { S } of seriesDe(x)) { if (S.vals) delete S.vals.num; if (S.cats) { delete S.cats.num; delete S.cats.txt; } if (S.nome) delete S.nome.txt; }
  return JSON.stringify(x);
}

/** Um chart.xml → g do EFCdocs (ou { fora: motivo }). Os do EFCdocs voltam com as escolhas; os do Excel viram t:'excel'. */
export function gDoXml(xml, tema) {
  const ext = /<efc:g>([\s\S]*?)<\/efc:g>/.exec(xml);
  if (ext) {
    try {
      const txt = ext[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      const g = normalizarG(JSON.parse(txt));
      if (g.t !== 'excel') return { g, efc: true };
    } catch { /* segue lendo como Excel */ }
  }
  const r = planoDoXml(xml, tema);
  if (r.fora) return r;
  const P = r.plano;
  /* as referências: o nome da aba vira o id da aba depois (ler.js); um gráfico só com valores escritos também vale */
  const g = normalizarG({ t: 'excel', titulo: P.titulo && P.titulo.texto ? P.titulo.texto : '', plano: P, xo: limparXo(xml), xoSig: assinaturaPlano(P) });
  return { g, avisos: P.avisos };
}
/** O XML original sem o que não vai junto (dados embutidos e desenhos por cima, que dependem de outras partes do arquivo). */
function limparXo(xml) {
  return String(xml).replace(/<c:externalData\b[^>]*\/>|<c:externalData\b[\s\S]*?<\/c:externalData>/g, '').replace(/<c:userShapes\b[^>]*\/>/g, '')
    .replace(/<(\w+:)?externalData\b[^>]*\/>|<(\w+:)?externalData\b[\s\S]*?<\/(\w+:)?externalData>/g, '').replace(/<(\w+:)?userShapes\b[^>]*\/>/g, '');
}

/** Lê os gráficos de uma aba (desenho ligado pela rels da aba). Devolve { objs:[...], fora:[{ motivo }] }. */
export async function lerGraficosAba(zip, relsAba, aba, lerRelsDe, tema) {
  const objs = [], fora = [];
  for (const r of relsAba.values()) {
    if (!/drawing$/.test(r.tipo) || !r.alvo) continue;
    const dx = await zip.texto(r.alvo);
    if (!dx) continue;
    const relsD = await lerRelsDe(r.alvo);
    for (const an of [...tags(dx, 'twoCellAnchor'), ...tags(dx, 'oneCellAnchor'), ...tags(dx, 'absoluteAnchor')]) {
      /* v0.6.3: figuras (imagens) presas a células */
      if (/<(?:\w+:)?pic\b/.test(an.dentro) && !/<(?:\w+:)?chart\b/.test(an.dentro)) {
        const f = await lerFiguraDaAncora(zip, relsD, an, aba);
        if (f.obj) objs.push(f.obj); else fora.push({ motivo: f.fora, imagem: true });
        continue;
      }
      const gf = /<(?:\w+:)?chart\b[^>]*\b(?:r:)?id="([^"]+)"/.exec(an.dentro);
      if (!gf) { if (/<cx:chart\b|chartex/i.test(an.dentro)) fora.push({ motivo: 'tipo novo do Excel (cascata, funil, mapa...)' }); continue; }
      const rc = relsD.get(gf[1]);
      if (!rc || !rc.alvo) continue;
      const xml = await zip.texto(rc.alvo);
      if (!xml) continue;
      const r2 = gDoXml(xml, tema);
      if (r2.fora) { fora.push({ motivo: r2.fora }); continue; }
      const fr = tag(an.dentro, 'from');
      const num = (x, n) => { const m = new RegExp(`<(?:\\w+:)?${n}>(-?\\d+)</(?:\\w+:)?${n}>`).exec(x || ''); return m ? +m[1] : 0; };
      const l = num(fr && fr.dentro, 'row'), c = num(fr && fr.dentro, 'col');
      const ddx = num(fr && fr.dentro, 'colOff') / EMU, ddy = num(fr && fr.dentro, 'rowOff') / EMU;
      let w = 480, h = 300;
      const ext = /<(?:\w+:)?ext\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/.exec(an.dentro);
      const to = tag(an.dentro, 'to');
      if (to) {
        const tl = num(to.dentro, 'row'), tc = num(to.dentro, 'col');
        w = -ddx + num(to.dentro, 'colOff') / EMU; for (let k = c; k < tc; k++) w += largCol(aba, k);
        h = -ddy + num(to.dentro, 'rowOff') / EMU; for (let k = l; k < tl; k++) h += altLin(aba, k);
      } else if (ext) { w = +ext[1] / EMU; h = +ext[2] / EMU; }
      objs.push({ tipo: 'grafico', l, c, dx: Math.max(0, ddx), dy: Math.max(0, ddy), w: Math.max(60, Math.round(w)), h: Math.max(40, Math.round(h)), g: r2.g, nomeAbaDados: r2.efc ? null : r2.g.dados.aba, avisos: r2.avisos });
    }
  }
  return { objs, fora };
}

/** Depois de ler todas as abas: nomes de aba das referências → ids. Devolve quantas referências ficaram só com o que veio guardado. */
export function ligarRefsAoLivro(g, idDoNome, abaDoGrafico) {
  if (g.t !== 'excel' || !g.plano) return 0;
  let semAba = 0;
  const nomes = {};
  const liga = (ref) => {
    if (!ref || ref.abaId !== undefined) return ref;
    const id = idDoNome(ref.aba);
    if (!id) { semAba++; return null; }
    nomes[id] = ref.aba;
    return { aba: id === abaDoGrafico ? '' : id, fx: ref.fx };
  };
  for (const { S } of seriesDe(g.plano)) for (const k of ['nome', 'cats', 'vals']) if (S[k] && S[k].ref) S[k].ref = liga(S[k].ref);
  g.xoAbas = nomes;
  g.xoSig = assinaturaPlano(g.plano);
  return semAba;
}

/* ============================================================ gravar: plano → XML ============================================================ */
const corXml = (cor, alfa) => `<a:srgbClr val="${corX(cor)}">${ehNum(alfa) && alfa < 1 ? `<a:alpha val="${Math.round(alfa * 100000)}"/>` : ''}</a:srgbClr>`;
function xmlPreench(pr) {
  if (!pr) return '';
  if (pr.t === 'nenhum') return '<a:noFill/>';
  if (pr.t === 'degrade' && pr.paradas && pr.paradas.length) return `<a:gradFill rotWithShape="1"><a:gsLst>${pr.paradas.map((p) => `<a:gs pos="${Math.round((p.p || 0) * 100000)}">${corXml(p.cor, p.alfa)}</a:gs>`).join('')}</a:gsLst>${pr.forma === 'circulo' ? '<a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path>' : `<a:lin ang="${Math.round((pr.ang ?? 90) * 60000)}" scaled="0"/>`}</a:gradFill>`;
  return pr.cor ? `<a:solidFill>${corXml(pr.cor, pr.alfa)}</a:solidFill>` : '';
}
function xmlLn(ln) {
  if (!ln) return '';
  if (ln.t === 'nenhum') return '<a:ln><a:noFill/></a:ln>';
  return `<a:ln${ehNum(ln.larg) ? ` w="${Math.round(ln.larg * EMU_PT)}"` : ''} cap="rnd">${ln.cor ? `<a:solidFill>${corXml(ln.cor, ln.alfa)}</a:solidFill>` : ''}${ln.tr ? `<a:prstDash val="${escapar(ln.tr, true)}"/>` : ''}<a:round/></a:ln>`;
}
function xmlEfeito(ef) {
  if (!ef) return '';
  let s = '';
  if (ef.brilho) s += `<a:glow rad="${Math.round((ef.brilho.raio || 5) * EMU_PT)}">${corXml(ef.brilho.cor || '#ffffff', ef.brilho.alfa ?? 0.6)}</a:glow>`;
  if (ef.sombra) s += `<a:outerShdw blurRad="${Math.round((ef.sombra.blur ?? 4) * EMU_PT)}" dist="${Math.round((ef.sombra.dist ?? 3) * EMU_PT)}" dir="${Math.round((ef.sombra.dir ?? 45) * 60000)}" algn="ctr" rotWithShape="0">${corXml(ef.sombra.cor || '#000000', ef.sombra.alfa ?? 0.35)}</a:outerShdw>`;
  return s ? `<a:effectLst>${s}</a:effectLst>` : '';
}
const spPr = (pr, ln, ef) => { const s = xmlPreench(pr) + xmlLn(ln) + xmlEfeito(ef); return s ? `<c:spPr>${s}</c:spPr>` : ''; };
function rPr(f, tag2 = 'defRPr') {
  if (!f) return `<a:${tag2}/>`;
  const at = `${ehNum(f.tam) ? ` sz="${Math.round(f.tam * 100)}"` : ''}${f.negrito != null ? ` b="${f.negrito ? 1 : 0}"` : ''}${f.italico ? ' i="1"' : ''}`;
  return f.cor ? `<a:${tag2}${at}><a:solidFill>${corXml(f.cor)}</a:solidFill></a:${tag2}>` : `<a:${tag2}${at}/>`;
}
const txPr = (f) => (f && (f.tam || f.cor || f.negrito != null || f.girar) ? `<c:txPr><a:bodyPr${ehNum(f.girar) ? ` rot="${Math.round(f.girar * 60000)}" vert="horz"` : ''}/><a:lstStyle/><a:p><a:pPr>${rPr(f)}</a:pPr><a:endParaRPr lang="pt-BR"/></a:p></c:txPr>` : '');
function tituloXml(t, padrao = {}) {
  if (!t) return '';
  const f = { tam: t.tam ?? padrao.tam, negrito: t.negrito ?? padrao.negrito, cor: t.cor ?? padrao.cor, italico: t.italico };
  const linhas = String(t.texto ?? '').split('\n');
  const tx = t.texto ? `<c:tx><c:rich><a:bodyPr/><a:lstStyle/>${linhas.map((ln) => `<a:p><a:pPr>${rPr(f)}</a:pPr><a:r>${rPr({ ...f }, 'rPr').replace('<a:rPr', '<a:rPr lang="pt-BR"')}<a:t>${escapar(ln)}</a:t></a:r></a:p>`).join('')}</c:rich></c:tx>` : '';
  return `<c:title>${tx}<c:overlay val="0"/>${tx ? '' : txPr(f)}</c:title>`;
}
const strCache = (lista) => `<c:strCache><c:ptCount val="${lista.length}"/>${lista.map((t, i) => `<c:pt idx="${i}"><c:v>${escapar(t ?? '')}</c:v></c:pt>`).join('')}</c:strCache>`;
const numPts = (lista) => lista.map((v, i) => (ehNum(v) ? `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>` : '')).join('');
const numCache = (lista, fmt, tg = 'numCache') => `<c:${tg}><c:formatCode>${escapar(fmt || 'General')}</c:formatCode><c:ptCount val="${lista.length}"/>${numPts(lista)}</c:${tg}>`;
const strLit = (lista) => `<c:strLit><c:ptCount val="${lista.length}"/>${lista.map((t, i) => `<c:pt idx="${i}"><c:v>${escapar(t ?? '')}</c:v></c:pt>`).join('')}</c:strLit>`;
function rotulosXml(R, tipoG) {
  if (!R) return '';
  const pos = R.pos && /^(bestFit|b|ctr|inBase|inEnd|l|outEnd|r|t)$/.test(R.pos) ? R.pos : null;
  const posOk = pos && !(tipoG === 'line' && /^(inBase|inEnd|outEnd|bestFit)$/.test(pos)) && !(tipoG === 'bar' && /^(l|r|t|b|bestFit)$/.test(pos)) && !(/pie|doughnut/.test(tipoG) && /^(l|r|t|b|inBase)$/.test(pos)) && !(tipoG === 'doughnut');
  return `${R.fmt ? `<c:numFmt formatCode="${escapar(R.fmt, true)}" sourceLinked="0"/>` : ''}<c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr>${txPr({ tam: R.tam, cor: R.cor, negrito: R.negrito })}${posOk ? `<c:dLblPos val="${pos}"/>` : ''}<c:showLegendKey val="0"/><c:showVal val="${R.val ? 1 : 0}"/><c:showCatName val="${R.cat ? 1 : 0}"/><c:showSerName val="${R.nome ? 1 : 0}"/><c:showPercent val="${R.pct ? 1 : 0}"/><c:showBubbleSize val="0"/>${R.sep ? `<c:separator>${escapar(R.sep)}</c:separator>` : ''}`;
}
const FORMAS = new Set(['circle', 'dash', 'diamond', 'dot', 'none', 'plus', 'square', 'star', 'triangle', 'x', 'auto']);
function marcadorXml(m, corPadrao) {
  if (!m) return '';
  const forma = FORMAS.has(m.forma) ? m.forma : 'circle';
  if (forma === 'none') return '<c:marker><c:symbol val="none"/></c:marker>';
  if (forma === 'auto') return '';
  return `<c:marker><c:symbol val="${forma}"/><c:size val="${Math.max(2, Math.min(72, Math.round(m.tam || 5)))}"/>${spPr(m.preench || (corPadrao ? { t: 'solido', cor: corPadrao } : null), m.contorno || (corPadrao ? { t: 'solido', cor: corPadrao, larg: 0.75 } : null))}</c:marker>`;
}

/**
 * Plano → XML (c:chartSpace). ctx: { textoRef(ref) → 'Aba'!$A$1:$A$5 | null, efc (g do EFCdocs para a extensão) }
 */
export function xmlDoPlano(P0, ctx = {}) {
  const P = materializarCores(P0);
  const tr = ctx.textoRef || ((r) => (typeof r === 'string' ? r : null));
  const pal = P.paleta && P.paleta.length ? P.paleta : PALETA_GRAFICO;
  const A1 = 111111, A2 = 222222, A3 = 333333, A4 = 444444;
  let idx = 0;
  const lista = seriesDe(P);
  let plot = '';
  const horiz = P.grupos.some((G) => G.tipo === 'bar' && G.dir === 'bar' && !G.eixo2);
  const serieXml = (G, S, iGlob) => {
    const i = idx++;
    const corS = S.preench && S.preench.t === 'solido' ? S.preench.cor : pal[iGlob % pal.length];
    const nomeRef = tr(S.nome && S.nome.ref);
    const tx = nomeRef ? `<c:tx><c:strRef><c:f>${escapar(nomeRef)}</c:f>${strCache([S.nome.txt || ''])}</c:strRef></c:tx>` : `<c:tx><c:v>${escapar((S.nome && S.nome.txt) || `Série ${i + 1}`)}</c:v></c:tx>`;
    const linha = G.tipo === 'line' || G.tipo === 'scatter';
    let sp;
    if (linha) sp = spPr(null, S.linha || (G.tipo === 'scatter' && G.estilo === 'marker' ? { t: 'nenhum' } : { t: 'solido', cor: corS, larg: 2.25 }), S.efeito);
    else if (G.tipo === 'pie' || G.tipo === 'doughnut') sp = spPr(S.preench, S.contorno || { t: 'solido', cor: '#ffffff', larg: 1 }, S.efeito);
    else sp = spPr(S.preench || { t: 'solido', cor: corS }, S.contorno, S.efeito);
    const nPts = Math.max((S.vals.num || []).length, (S.cats.txt || S.cats.num || []).length);
    let pts = '', dl = '';
    for (let k = 0; k < nPts; k++) {
      const p = S.pontos && S.pontos[k];
      if (!p) continue;
      if (p.preench || p.contorno || p.efeito || p.marcador || p.explodir) {
        pts += `<c:dPt><c:idx val="${k}"/>${G.tipo === 'bar' ? '<c:invertIfNegative val="0"/>' : ''}${linha && p.marcador ? marcadorXml(p.marcador, corS) : ''}<c:bubble3D val="0"/>${p.explodir ? `<c:explosion val="${Math.round(p.explodir)}"/>` : ''}${spPr(linha ? null : p.preench, linha ? null : p.contorno, p.efeito)}</c:dPt>`;
      }
      if (p.rotulo === false) dl += `<c:dLbl><c:idx val="${k}"/><c:delete val="1"/></c:dLbl>`;
      else if (p.rotulo) dl += `<c:dLbl><c:idx val="${k}"/>${rotulosXml({ ...(S.rotulos || {}), ...p.rotulo }, G.tipo)}</c:dLbl>`;
    }
    const dLbls = S.rotulos || dl ? `<c:dLbls>${dl}${S.rotulos ? rotulosXml(S.rotulos, G.tipo) : '<c:showLegendKey val="0"/><c:showVal val="0"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/>'}${G.tipo === 'pie' ? '<c:showLeaderLines val="1"/>' : ''}</c:dLbls>` : '';
    const tend = S.tendencia ? `<c:trendline>${spPr(null, S.tendencia.linha || { t: 'solido', cor: corS, larg: 1.5, tr: 'sysDash' })}<c:trendlineType val="${S.tendencia.tipo === 'media' ? 'movingAvg' : 'linear'}"/>${S.tendencia.tipo === 'media' ? `<c:period val="${Math.max(2, S.tendencia.periodo || 2)}"/>` : ''}<c:dispRSqr val="0"/><c:dispEq val="0"/></c:trendline>` : '';
    /* categorias (ou X da dispersão) e valores */
    const catRef = tr(S.cats && S.cats.ref);
    const nomeCat = G.tipo === 'scatter' ? 'xVal' : 'cat';
    let cat = '';
    if (S.cats && (S.cats.num || S.cats.txt)) {
      const numerico = G.tipo === 'scatter' || (S.cats.num && S.cats.num.some(ehNum) && S.cats.fmt);
      if (numerico) cat = catRef ? `<c:${nomeCat}><c:numRef><c:f>${escapar(catRef)}</c:f>${numCache(S.cats.num || [], S.cats.fmt)}</c:numRef></c:${nomeCat}>` : `<c:${nomeCat}>${numCache(S.cats.num || [], S.cats.fmt, 'numLit')}</c:${nomeCat}>`;
      else cat = catRef ? `<c:${nomeCat}><c:strRef><c:f>${escapar(catRef)}</c:f>${strCache(S.cats.txt || [])}</c:strRef></c:${nomeCat}>` : `<c:${nomeCat}>${strLit(S.cats.txt || [])}</c:${nomeCat}>`;
    }
    const valRef = tr(S.vals.ref);
    const nomeVal = G.tipo === 'scatter' ? 'yVal' : 'val';
    const vals = valRef ? `<c:${nomeVal}><c:numRef><c:f>${escapar(valRef)}</c:f>${numCache(S.vals.num || [], S.vals.fmt)}</c:numRef></c:${nomeVal}>` : `<c:${nomeVal}>${numCache(S.vals.num || [], S.vals.fmt, 'numLit')}</c:${nomeVal}>`;
    const ini = `<c:ser><c:idx val="${i}"/><c:order val="${i}"/>${tx}${sp}`;
    if (G.tipo === 'bar') return `${ini}<c:invertIfNegative val="0"/>${pts}${dLbls}${tend}${cat}${vals}</c:ser>`;
    if (G.tipo === 'area') return `${ini}${pts}${dLbls}${tend}${cat}${vals}</c:ser>`;
    if (G.tipo === 'pie' || G.tipo === 'doughnut') return `${ini}${S.explodir ? `<c:explosion val="${Math.round(S.explodir)}"/>` : ''}${pts}${dLbls}${cat}${vals}</c:ser>`;
    const mk = S.marcador ? marcadorXml(S.marcador, S.linha && S.linha.cor || corS) : G.tipo === 'line' && P.nativo ? '<c:marker><c:symbol val="none"/></c:marker>' : '';
    return `${ini}${mk}${pts}${dLbls}${tend}${cat}${vals}<c:smooth val="${S.suave ? 1 : 0}"/></c:ser>`;
  };
  const eixoIds = (G) => (G.eixo2 ? [A3, A4] : [A1, A2]);
  for (const G of P.grupos) {
    const ser = G.series.map((S) => serieXml(G, S, lista.findIndex((x) => x.S === S))).join('');
    const ax = eixoIds(G).map((a) => `<c:axId val="${a}"/>`).join('');
    if (G.tipo === 'bar') plot += `<c:barChart><c:barDir val="${G.dir === 'bar' ? 'bar' : 'col'}"/><c:grouping val="${/^(clustered|stacked|percentStacked|standard)$/.test(G.agrup) ? G.agrup : 'clustered'}"/><c:varyColors val="0"/>${ser}<c:gapWidth val="${Math.round(G.espaco ?? 150)}"/>${G.agrup === 'stacked' || G.agrup === 'percentStacked' ? '<c:overlap val="100"/>' : ehNum(G.sobrepor) && G.sobrepor ? `<c:overlap val="${Math.round(G.sobrepor)}"/>` : ''}${ax}</c:barChart>`;
    else if (G.tipo === 'line') plot += `<c:lineChart><c:grouping val="${/^(stacked|percentStacked)$/.test(G.agrup) ? G.agrup : 'standard'}"/><c:varyColors val="0"/>${ser}<c:marker val="1"/>${ax}</c:lineChart>`;
    else if (G.tipo === 'area') plot += `<c:areaChart><c:grouping val="${/^(stacked|percentStacked)$/.test(G.agrup) ? G.agrup : 'standard'}"/><c:varyColors val="0"/>${ser}${ax}</c:areaChart>`;
    else if (G.tipo === 'pie') plot += `<c:pieChart><c:varyColors val="${G.variar === false ? 0 : 1}"/>${ser}<c:firstSliceAng val="${Math.round(G.giro || 0)}"/></c:pieChart>`;
    else if (G.tipo === 'doughnut') plot += `<c:doughnutChart><c:varyColors val="${G.variar === false ? 0 : 1}"/>${ser}<c:firstSliceAng val="${Math.round(G.giro || 0)}"/><c:holeSize val="${Math.max(10, Math.min(90, Math.round(G.furo ?? 50)))}"/></c:doughnutChart>`;
    else if (G.tipo === 'scatter') plot += `<c:scatterChart><c:scatterStyle val="${G.estilo === 'smoothMarker' ? 'smoothMarker' : 'lineMarker'}"/><c:varyColors val="0"/>${ser}${ax}</c:scatterChart>`;
    else if (G.tipo === 'gauge') plot += xmlVelocimetro(G, () => idx++);
  }
  /* linhas de referência (meta, LSC, média, LIC, 80%) como séries de linha escritas */
  const refs = (P.ref || []).filter(() => !horiz && lista.length);
  if (refs.length) {
    const n = Math.max(...lista.map(({ S }) => (S.vals.num || []).length));
    const cats = (lista[0].S.cats && lista[0].S.cats.txt) || null;
    for (const e2 of [false, true]) {
      const rs = refs.filter((r) => !!r.eixo2 === e2);
      if (!rs.length) continue;
      if (e2 && !P.grupos.some((G) => G.eixo2)) continue;
      const ser = rs.map((r) => { const i = idx++; return `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${escapar(r.leg || (r.rot || 'Meta').split(' ')[0])}</c:v></c:tx>${spPr(null, { t: 'solido', cor: r.cor, larg: 1.5, tr: r.tr ? 'dash' : undefined })}<c:marker><c:symbol val="none"/></c:marker>${cats ? `<c:cat>${strLit(cats)}</c:cat>` : ''}<c:val>${numCache(new Array(n).fill(Math.round(r.v * 10000) / 10000), null, 'numLit')}</c:val><c:smooth val="0"/></c:ser>`; }).join('');
      plot += `<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>${ser}<c:marker val="1"/><c:axId val="${e2 ? A3 : A1}"/><c:axId val="${e2 ? A4 : A2}"/></c:lineChart>`;
    }
  }
  /* eixos */
  const temEixos = P.grupos.some((G) => !/^(pie|doughnut|gauge)$/.test(G.tipo));
  if (temEixos) {
    const disp = P.grupos.some((G) => G.tipo === 'scatter' && !G.eixo2);
    const E = P.eixos || {};
    plot += eixoXml(E.x || { tipo: 'cat' }, A1, A2, horiz ? 'l' : 'b', disp ? 'val' : 'cat');
    plot += eixoXml(E.y || { tipo: 'val' }, A2, A1, horiz ? 'b' : 'l', 'val');
    if (P.grupos.some((G) => G.eixo2)) {
      plot += eixoXml({ ...(E.x2 || { tipo: 'cat' }), apagado: E.x2 ? E.x2.apagado ?? true : true }, A3, A4, horiz ? 'l' : 'b', 'cat');
      plot += eixoXml({ ...(E.y2 || { tipo: 'val', grade: null }), cruza: 'max' }, A4, A3, horiz ? 't' : 'r', 'val');
    }
  }
  const leg = P.legenda ? `<c:legend><c:legendPos val="${/^(b|t|l|r|tr)$/.test(P.legenda.pos) ? P.legenda.pos : 'b'}"/>${(P.legenda.ocultas || []).map((k) => `<c:legendEntry><c:idx val="${k}"/><c:delete val="1"/></c:legendEntry>`).join('')}<c:overlay val="0"/>${txPr({ tam: P.legenda.tam, cor: P.legenda.cor, negrito: P.legenda.negrito })}</c:legend>` : '';
  const f = P.fonte || {};
  const fundo = P.fundo || {};
  const area = P.area || {};
  const efc = ctx.efc ? `<c:extLst><c:ext uri="${URI_EFC}" xmlns:efc="urn:efcdocs:grafico"><efc:g>${escapar(JSON.stringify(ctx.efc))}</efc:g></c:ext></c:extLst>` : '';
  const titulo = P.titulo && (P.titulo.texto || P.titulo.texto === null) ? tituloXml(P.titulo, { tam: P.nativo ? 14 : 14, negrito: true, cor: f.cor }) : '';
  return `${XML_CAB}<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}" xmlns:r="${NS_R}"><c:roundedCorners val="${fundo.cantos ? 1 : 0}"/>` +
    `<c:chart>${titulo}<c:autoTitleDeleted val="${titulo ? 0 : 1}"/><c:plotArea><c:layout/>${plot}${spPr(area.preench, area.borda)}</c:plotArea>${leg}<c:plotVisOnly val="${P.soVisiveis === false ? 0 : 1}"/><c:dispBlanksAs val="${P.vazio === 'zero' ? 'zero' : P.vazio === 'span' ? 'span' : 'gap'}"/></c:chart>` +
    spPr(fundo.preench || (P.nativo ? { t: 'solido', cor: '#ffffff' } : null), fundo.borda || (P.nativo ? { t: 'solido', cor: '#d2d9e0', larg: 0.75 } : null), fundo.efeito) +
    txPr({ tam: f.tam || (P.nativo ? 9 : undefined), cor: f.cor || (P.nativo ? '#3a4a55' : undefined) }) +
    `${efc}</c:chartSpace>`;
}
function eixoXml(E, id, cruza, posPadrao, tipo) {
  const tg = tipo === 'val' ? 'valAx' : 'catAx';
  const pos = E.pos && /^(b|l|r|t)$/.test(E.pos) ? E.pos : posPadrao;
  const sc = `<c:scaling><c:orientation val="${E.inverter ? 'maxMin' : 'minMax'}"/>${tipo === 'val' && ehNum(E.max) ? `<c:max val="${E.max}"/>` : ''}${tipo === 'val' && ehNum(E.min) ? `<c:min val="${E.min}"/>` : ''}</c:scaling>`;
  const grade = E.grade && E.grade.t !== 'nenhum' ? `<c:majorGridlines>${spPr(null, { t: 'solido', cor: E.grade.cor || '#e3e8ed', larg: E.grade.larg ?? 0.75, tr: E.grade.tr })}</c:majorGridlines>` : '';
  const ti = E.titulo && E.titulo.texto ? tituloXml(E.titulo, { tam: 9, negrito: true }) : '';
  const nf = `<c:numFmt formatCode="${escapar(E.fmt || 'General', true)}" sourceLinked="${E.fmt && !E.fmtLigado ? 0 : 1}"/>`;
  const linha = spPr(null, E.linha === null || E.linha === undefined ? (tipo === 'val' ? { t: 'nenhum' } : { t: 'solido', cor: '#bfbfbf', larg: 0.75 }) : E.linha);
  const rot = txPr(E.rotulo ? { tam: E.rotulo.tam, cor: E.rotulo.cor, negrito: E.rotulo.negrito, girar: E.rotulo.girar } : null);
  const crz = E.cruza === 'max' ? '<c:crosses val="max"/>' : E.cruza === 'min' ? '<c:crosses val="min"/>' : ehNum(E.cruza) ? `<c:crossesAt val="${E.cruza}"/>` : '<c:crosses val="autoZero"/>';
  const fim = tipo === 'val'
    ? `<c:crossBetween val="${E.entre === false ? 'midCat' : 'between'}"/>${ehNum(E.passo) && E.passo > 0 ? `<c:majorUnit val="${E.passo}"/>` : ''}`
    : '<c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/>';
  return `<c:${tg}><c:axId val="${id}"/>${sc}<c:delete val="${E.apagado ? 1 : 0}"/><c:axPos val="${pos}"/>${grade}${ti}${nf}<c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="${E.rotPos === 'none' ? 'none' : tipo === 'cat' ? 'low' : 'nextTo'}"/>${linha}${rot}<c:crossAx val="${cruza}"/>${crz}${fim}</c:${tg}>`;
}
/** Velocímetro do EFCdocs → rosca com metade invisível + pizza ponteiro (o jeito de fazer no Excel). */
function xmlVelocimetro(G, novoIdx) {
  const mn = G.min ?? 0, mx = G.max ?? 1, r = mx - mn || 1;
  const fx = (G.faixas || []).map((f, i, a) => ({ cor: f.cor, v: Math.max(0, Math.min(mx, f.ate) - Math.max(mn, i ? a[i - 1].ate : mn)) })).filter((x) => x.v > 0);
  const valsR = [...fx.map((x) => x.v), r];
  const ptsR = [...fx.map((x, k) => `<c:dPt><c:idx val="${k}"/><c:bubble3D val="0"/>${spPr({ t: 'solido', cor: x.cor }, { t: 'solido', cor: '#ffffff', larg: 1 })}</c:dPt>`), `<c:dPt><c:idx val="${fx.length}"/><c:bubble3D val="0"/>${spPr({ t: 'nenhum' }, { t: 'nenhum' })}</c:dPt>`].join('');
  const i1 = novoIdx();
  const rosca = `<c:doughnutChart><c:varyColors val="1"/><c:ser><c:idx val="${i1}"/><c:order val="${i1}"/><c:tx><c:v>Faixas</c:v></c:tx>${ptsR}<c:val>${numCache(valsR, null, 'numLit')}</c:val></c:ser><c:firstSliceAng val="270"/><c:holeSize val="60"/></c:doughnutChart>`;
  const v = Math.max(mn, Math.min(mx, ehNum(G.valor) ? G.valor : mn)) - mn;
  const agulha = r * 0.012;
  const valsP = [Math.max(0, v - agulha / 2), agulha, Math.max(0, 2 * r - v - agulha / 2)];
  const i2 = novoIdx();
  const ptsP = [0, 1, 2].map((k) => `<c:dPt><c:idx val="${k}"/><c:bubble3D val="0"/>${k === 1 ? spPr({ t: 'solido', cor: '#1f2d36' }, { t: 'solido', cor: '#1f2d36', larg: 1.5 }) : spPr({ t: 'nenhum' }, { t: 'nenhum' })}</c:dPt>`).join('');
  const pizza = `<c:pieChart><c:varyColors val="1"/><c:ser><c:idx val="${i2}"/><c:order val="${i2}"/><c:tx><c:v>Ponteiro</c:v></c:tx>${ptsP}<c:val>${numCache(valsP, null, 'numLit')}</c:val></c:ser><c:firstSliceAng val="270"/></c:pieChart>`;
  return rosca + pizza;
}

/** Compatível com a v0.6.0: g + { d, refs } → XML (montando o plano). */
export function xmlDoGrafico(g, ctx) {
  const P = construir(g, ctx.d, ctx.refs);
  return xmlDoPlano(P, { efc: { ...g, dados: { ...g.dados, aba: ctx.nomeAba || '' } } });
}

/** Refs (endereços com aba) das séries, a partir da faixa e do que dadosDaFaixa achou. */
function refsDaFaixa(nomeAbaD, f, d, porLinhas) {
  const out = { nome: [], val: [], cat: null };
  if (!porLinhas) {
    const l0 = f.l1 + (d.cab ? 1 : 0);
    if (d.temCat) out.cat = refF(nomeAbaD, l0, f.c1, f.l2, f.c1);
    for (const s of d.series) {
      const c = f.c1 + s.j;
      out.nome.push(d.cab ? refF(nomeAbaD, f.l1, c, f.l1, c) : null);
      out.val.push(refF(nomeAbaD, l0, c, f.l2, c));
    }
  } else {
    const c0 = f.c1 + (d.cab ? 1 : 0);
    if (d.temCat) out.cat = refF(nomeAbaD, f.l1, c0, f.l1, f.c2);
    for (const s of d.series) {
      const l = f.l1 + s.j;
      out.nome.push(d.cab ? refF(nomeAbaD, l, f.c1, l, f.c1) : null);
      out.val.push(refF(nomeAbaD, l, c0, l, f.c2));
    }
  }
  return out;
}

/** Texto da referência { aba: id|'' , fx } com o nome da aba de agora. */
function textoDaRef(c, abaDoGrafico) {
  return (r) => {
    if (!r) return null;
    if (typeof r === 'string') return r;
    const id = r.aba || abaDoGrafico;
    const A = c.abas[id];
    const fs = faixasDe(r.fx);
    if (!A || !fs.length) return null;
    const f = fs[0];
    return refF(A.nome, f.l1, f.c1, f.l2, f.c2);
  };
}

/**
 * Gráficos de uma aba → { drawing, rels, charts:[{ n, xml }] } ou null.
 * n0: número do primeiro chart (chart1, chart2... em todo o livro).
 * lerFaixa(abaId, ref) → { num, txt } (para os gráficos que vieram do Excel, com os números de agora)
 */
export function gravarGraficosAba(c, motor, aba, abaId, n0, extra = null) {
  const lista = (aba.objs || []).filter((o) => o.tipo === 'grafico');
  const imagens = extra && extra.ancoras.length ? extra : null; // v0.6.3: imagens vão no mesmo desenho
  if (!lista.length && !imagens) return null;
  const charts = [];
  const ancoras = [];
  lista.forEach((o, k) => {
    const g = normalizarG(o.g);
    let xml = null;
    if (g.t === 'excel') {
      /* veio do Excel: se nada mudou (formatação, referências e nomes das abas), volta o XML original */
      const nomesIguais = Object.entries(o.g.xoAbas || {}).every(([id, nome]) => c.abas[id] && c.abas[id].nome === nome);
      if (g.xo && g.xoSig && assinaturaPlano(g.plano) === g.xoSig && nomesIguais) xml = g.xo;
      else xml = xmlDoPlano(lerNumeros(c, motor, g.plano, abaId), { textoRef: textoDaRef(c, abaId) });
    } else {
      const abaD = g.dados.aba && c.abas[g.dados.aba] ? g.dados.aba : abaId;
      const A = c.abas[abaD];
      const fs = faixasDe(g.dados.fx);
      if (!fs.length) return;
      const f = fs[0];
      const ler = (l, cc) => { let v; try { v = motor.valor(abaD, l, cc); } catch { v = null; } return v && typeof v === 'object' ? null : v; };
      const texto = (l, cc) => { const v = ler(l, cc); if (v == null) return ''; const cel = A.cel && A.cel[letraCol(cc) + (l + 1)]; const e = estiloDe(c, cel || {}); try { return formatar(v, e.nf).t; } catch { return String(v); } };
      const fmtDe = (l, cc) => { const cel = A.cel && A.cel[letraCol(cc) + (l + 1)]; return estiloDe(c, cel || {}).nf || null; };
      const d = dadosDaFaixa(f, ler, texto, !!g.porLinhas, fmtDe, ocultosDe(A, g));
      if (!d.series.length) return;
      const refs = refsDaFaixa(A.nome, f, d, !!g.porLinhas);
      xml = xmlDoGrafico(g, { d, refs, nomeAba: A.nome });
    }
    const n = n0 + charts.length;
    charts.push({ n, xml });
    /* âncora de duas células (o canto de baixo calculado pelas larguras/alturas) */
    let col = o.c, x = o.dx + o.w;
    while (col < 16383 && x >= largCol(aba, col) && largCol(aba, col) > 0) { x -= largCol(aba, col); col++; }
    let lin = o.l, y = o.dy + o.h;
    while (lin < 1048575 && y >= altLin(aba, lin) && altLin(aba, lin) > 0) { y -= altLin(aba, lin); lin++; }
    ancoras.push(`<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${o.c}</xdr:col><xdr:colOff>${Math.round(o.dx * EMU)}</xdr:colOff><xdr:row>${o.l}</xdr:row><xdr:rowOff>${Math.round(o.dy * EMU)}</xdr:rowOff></xdr:from>` +
      `<xdr:to><xdr:col>${col}</xdr:col><xdr:colOff>${Math.round(x * EMU)}</xdr:colOff><xdr:row>${lin}</xdr:row><xdr:rowOff>${Math.round(y * EMU)}</xdr:rowOff></xdr:to>` +
      `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${k + 2}" name="Gráfico ${k + 1}" descr="${escapar(g.titulo || NOME_TIPO[g.t] || 'Gráfico do EFCdocs', true)}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
      `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${NS_C}"><c:chart xmlns:c="${NS_C}" r:id="rIdG${charts.length}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`);
  });
  if (!charts.length && !imagens) return null;
  const drawing = `${XML_CAB}<xdr:wsDr xmlns:xdr="${NS_XDR}" xmlns:a="${NS_A}" xmlns:r="${NS_R}">${ancoras.join('')}${imagens ? imagens.ancoras.join('') : ''}</xdr:wsDr>`;
  const rels = `${XML_CAB}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    charts.map((ch, i) => `<Relationship Id="rIdG${i + 1}" Type="${NS_R}/chart" Target="../charts/chart${ch.n}.xml"/>`).join('') +
    (imagens ? imagens.rels.map((r) => `<Relationship Id="${r.id}" Type="${NS_R}/image" Target="${r.alvo}"/>`).join('') : '') + '</Relationships>';
  return { drawing, rels, charts, midias: imagens ? imagens.midias : [] };
}

/** Linhas e colunas ocultas que ficam fora do gráfico (como no Excel, a não ser que o gráfico peça para mostrar). */
export function ocultosDe(A, g) {
  if (g && g.op && g.op.ocultos) return null;
  if (!A || (!A.ocL && !A.ocC)) return null;
  return { l: A.ocL || {}, c: A.ocC || {} };
}

/** Os números de agora para as séries do plano (para gravar o cache junto). */
export function lerNumeros(c, motor, plano, abaDoGrafico, ocultosTambem = false) {
  return lerPlanoDaPlanilha(c, motor, plano, abaDoGrafico, ocultosTambem);
}
function lerPlanoDaPlanilha(c, motor, plano, abaDoGrafico, ocultosTambem) {
  const P = clonar(plano);
  const ler = lerFaixaDoLivro(c, motor, abaDoGrafico, ocultosTambem || plano.soVisiveis === false);
  for (const { S } of seriesDe(P)) {
    if (S.vals && S.vals.ref) { const r = ler(S.vals.ref); if (r) S.vals.num = r.num; }
    if (S.cats && S.cats.ref) { const r = ler(S.cats.ref); if (r) { S.cats.txt = r.txt; S.cats.num = r.num; } }
    if (S.nome && S.nome.ref) { const r = ler(S.nome.ref); if (r && r.txt.length) S.nome.txt = r.txt.join(' '); }
  }
  return P;
}
/** ref → { num:[...], txt:[...] } lido do livro (pulando linhas/colunas ocultas, como o Excel). */
export function lerFaixaDoLivro(c, motor, abaDoGrafico, ocultosTambem = false) {
  return (ref) => {
    if (!ref || typeof ref !== 'object') return null;
    const id = ref.aba || abaDoGrafico;
    const A = c.abas[id];
    const fs = faixasDe(ref.fx || '');
    if (!A || !fs.length) return null;
    const f = fs[0];
    if ((f.l2 - f.l1 + 1) * (f.c2 - f.c1 + 1) > 20000) return null;
    const num = [], txt = [];
    for (let l = f.l1; l <= f.l2; l++) {
      if (!ocultosTambem && A.ocL && A.ocL[l] && f.l2 > f.l1) continue;
      for (let cc = f.c1; cc <= f.c2; cc++) {
        if (!ocultosTambem && A.ocC && A.ocC[cc] && f.c2 > f.c1) continue;
        let v; try { v = motor.valor(id, l, cc); } catch { v = null; }
        if (v && typeof v === 'object') v = null;
        num.push(typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'boolean' ? +v : null);
        const cel = A.cel && A.cel[letraCol(cc) + (l + 1)];
        let t = '';
        if (v != null && v !== '') { try { t = formatar(v, estiloDe(c, cel || {}).nf).t; } catch { t = String(v); } }
        txt.push(t);
      }
    }
    return { num, txt };
  };
}
void refsDoPlano;
