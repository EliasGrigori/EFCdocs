/* EFCdocs v0.6.0 — gráficos: regras puras (sem tela).
   Um gráfico é um objeto da aba (objetos.js), tipo 'grafico':
     { id, tipo:'grafico', l, c, dx, dy, w, h, g: { t, titulo, dados:{ aba, fx }, porLinhas?, op:{...} } }
   t: colunas | barras | linha | area | pizza | rosca | combinado | pareto | controle | histograma | dispersao
   op: legenda ('dir'|'baixo'|'nao'), rotulos (bool), meta (número), lsc/lic (números; vazios = calculados), cores ([hex]),
       eixoX / eixoY (títulos), empilhado (bool, colunas/barras/área)
   Motor próprio em SVG (decisão do Elias, 27/10/2026: o npm está fechado aqui; dá para trocar por ECharts depois). */

export const TIPOS_GRAFICO = [
  ['colunas', 'Colunas'], ['barras', 'Barras'], ['linha', 'Linha'], ['area', 'Área'],
  ['pizza', 'Pizza'], ['rosca', 'Rosca'], ['combinado', 'Colunas + linha'],
  ['pareto', 'Pareto'], ['controle', 'Carta de controle'], ['histograma', 'Histograma'], ['dispersao', 'Dispersão'],
  ['velocimetro', 'Velocímetro'],
];
export const NOME_TIPO = { ...Object.fromEntries(TIPOS_GRAFICO), excel: 'Gráfico do Excel' };
/* paleta segura para daltonismo (base Okabe-Ito, ajustada ao tom do EFCdocs) */
export const PALETA_GRAFICO = ['#0f6e8c', '#e09b2d', '#2e8b57', '#c0504d', '#7b5ea7', '#5aa9c9', '#a5762a', '#6b7a86'];
export const COR_FORA = '#c0392b';
export const COR_MEDIA = '#2e8b57';

const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * Lê a faixa e separa títulos, categorias e séries.
 * ler(l, c) → valor da célula · texto(l, c) → como aparece (data formatada, etc.)
 */
export function dadosDaFaixa(f, ler, texto, porLinhas = false, fmtDe = null, ocultos = null) {
  const m = [];
  /* v0.6.1: como no Excel, linhas e colunas ocultas ficam fora do gráfico (a não ser que ele peça para mostrar) */
  const ls = [], cs = [];
  for (let l = f.l1; l <= f.l2; l++) if (!(ocultos && ocultos.l[l]) || l === f.l1) ls.push(l);
  for (let c = f.c1; c <= f.c2; c++) if (!(ocultos && ocultos.c[c]) || c === f.c1) cs.push(c);
  for (const l of ls) { const r = []; for (const c of cs) r.push({ v: ler(l, c), t: texto(l, c), l, c }); m.push(r); }
  /* por colunas: cada coluna é uma série; por linhas: cada linha é uma série */
  const g = porLinhas ? m[0].map((_, j) => m.map((r) => r[j])) : m;
  const nL = g.length, nC = nL ? g[0].length : 0;
  if (!nL || !nC) return { cats: [], series: [] };
  const vazioOuTexto = (x) => x.v == null || x.v === '' || typeof x.v === 'string';
  /* primeira linha é título se tem algum texto e as de baixo têm número */
  const temNumAbaixo = (j) => g.slice(1).some((r) => ehNum(r[j].v));
  let cab = nL > 1 && g[0].some((x) => typeof x.v === 'string' && x.v.trim()) && g[0].every((x, j) => vazioOuTexto(x) || !temNumAbaixo(j));
  const corpo = cab ? g.slice(1) : g;
  /* primeira coluna é categoria se não é número (texto) ou se é data/hora formatada, e há mais colunas */
  const col0 = corpo.map((r) => r[0]);
  const pareceData = col0.length && col0.every((x) => x.v == null || (ehNum(x.v) && /[/:]/.test(x.t || '')));
  const temCat = nC > 1 && (col0.some((x) => typeof x.v === 'string') || pareceData);
  const j0 = temCat ? 1 : 0;
  const cats = corpo.map((r, i) => (temCat ? String(r[0].t ?? r[0].v ?? '') : String(i + 1)));
  const series = [];
  for (let j = j0; j < nC; j++) {
    const vals = corpo.map((r) => (ehNum(r[j].v) ? r[j].v : typeof r[j].v === 'boolean' ? +r[j].v : null));
    if (!vals.some((v) => v != null)) continue;
    const nome = cab ? String(g[0][j].t || g[0][j].v || '').trim() || `Série ${series.length + 1}` : `Série ${series.length + 1}`;
    /* j: posição na faixa (conta as ocultas, para as referências do Excel) */
    const cel = corpo.find((r) => ehNum(r[j].v));
    const jf = porLinhas ? (cel ? cel[j].l - f.l1 : j) : (cel ? cel[j].c - f.c1 : j);
    const s = { nome, vals, j: jf };
    if (fmtDe && cel) { const nf = fmtDe(cel[j].l, cel[j].c); if (nf && nf !== 'General') s.fmt = nf; }
    series.push(s);
  }
  const out = { cats, series, temCat, cab, data: !!pareceData };
  if (pareceData && temCat) {
    out.catsNum = corpo.map((r) => (ehNum(r[0].v) ? r[0].v : null));
    const x0 = corpo.find((r) => ehNum(r[0].v));
    out.catsFmt = (fmtDe && x0 && fmtDe(x0[0].l, x0[0].c)) || (/:/.test((x0 && x0[0].t) || '') ? (/\//.test(x0[0].t) ? 'dd/mm/yyyy hh:mm' : 'hh:mm') : 'dd/mm/yyyy');
  }
  if (ocultos && (ls.length < f.l2 - f.l1 + 1 || cs.length < f.c2 - f.c1 + 1)) out.ocultas = (f.l2 - f.l1 + 1 - ls.length) + (f.c2 - f.c1 + 1 - cs.length);
  return out;
}

/** Os 3 tipos que mais combinam com os dados (o primeiro é o recomendado). */
export function recomendar(d) {
  const n = d.series.length;
  if (!n) return ['colunas', 'linha', 'barras'];
  if (!d.temCat) {
    if (n === 1) return ['histograma', 'controle', 'linha'];
    if (n === 2) return ['dispersao', 'linha', 'colunas'];
    return ['linha', 'colunas', 'area'];
  }
  if (d.data) return n === 1 ? ['linha', 'controle', 'colunas'] : ['linha', 'combinado', 'area'];
  if (n === 1) {
    const pos = d.series[0].vals.every((v) => v == null || v >= 0);
    return d.cats.length <= 8 && pos ? ['colunas', 'pareto', 'rosca'] : ['colunas', 'pareto', 'barras'];
  }
  return n === 2 ? ['colunas', 'combinado', 'linha'] : ['colunas', 'linha', 'barras'];
}

/* ---------- contas da qualidade ---------- */
export function pareto(d) {
  const s = d.series[0];
  if (!s) return { cats: [], vals: [], acum: [] };
  const pares = d.cats.map((c, i) => [c, s.vals[i] || 0]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const tot = pares.reduce((a, [, v]) => a + v, 0) || 1;
  let acc = 0;
  return { cats: pares.map((p) => p[0]), vals: pares.map((p) => p[1]), acum: pares.map(([, v]) => { acc += v; return (acc / tot) * 100; }), total: tot };
}
/** Carta de controle de valores individuais (I-MR): média, σ pela amplitude móvel (MR/1,128), LSC/LIC = média ± 3σ. */
export function cartaControle(vals, op = {}) {
  const x = vals.filter(ehNum);
  const n = x.length;
  const media = n ? x.reduce((a, b) => a + b, 0) / n : 0;
  let mr = 0;
  for (let i = 1; i < n; i++) mr += Math.abs(x[i] - x[i - 1]);
  const mrMedia = n > 1 ? mr / (n - 1) : 0;
  const sigma = mrMedia / 1.128;
  const lsc = ehNum(op.lsc) ? op.lsc : media + 3 * sigma;
  const lic = ehNum(op.lic) ? op.lic : media - 3 * sigma;
  const fora = vals.map((v) => ehNum(v) && (v > lsc || v < lic));
  return { media, sigma, lsc, lic, fora, nFora: fora.filter(Boolean).length };
}
/** Histograma pela regra de Sturges. */
export function histograma(vals, nClasses) {
  const x = vals.filter(ehNum).sort((a, b) => a - b);
  if (!x.length) return { cats: [], vals: [] };
  const k = Math.max(1, nClasses || Math.ceil(Math.log2(x.length) + 1));
  const mn = x[0], mx = x[x.length - 1];
  const larg = (mx - mn) / k || 1;
  const cont = new Array(k).fill(0);
  for (const v of x) cont[Math.min(k - 1, Math.floor((v - mn) / larg))]++;
  const f = (v) => numeroCurto(v);
  return { cats: cont.map((_, i) => `${f(mn + i * larg)}–${f(mn + (i + 1) * larg)}`), vals: cont, larg, mn };
}

/* ---------- números e escala ---------- */
const NF = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
export function numeroCurto(v) {
  if (!ehNum(v)) return '';
  const a = Math.abs(v);
  if (a >= 1e9) return NF.format(v / 1e9) + ' bi';
  if (a >= 1e6) return NF.format(v / 1e6) + ' mi';
  if (a >= 1e4) return NF.format(v / 1e3) + ' mil';
  if (a && a < 0.01) return v.toExponential(1).replace('.', ',');
  return NF.format(v);
}
/** Escala "bonita" (1, 2, 2,5, 5 × 10ⁿ). */
export function escala(min, max, alvo = 5) {
  if (!ehNum(min) || !ehNum(max)) { min = 0; max = 1; }
  if (min === max) { const d = Math.abs(min) || 1; min -= d / 2; max += d / 2; }
  const bruto = (max - min) / alvo;
  const p = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= bruto) || 10 * p;
  const a = Math.floor(min / passo) * passo, b = Math.ceil(max / passo) * passo;
  const ticks = [];
  for (let v = a; v <= b + passo / 2; v += passo) ticks.push(+v.toFixed(10));
  return { min: a, max: b, passo, ticks };
}

/* cópia segura de um objeto que veio de fora (sem funções, com limite de tamanho) */
function copiaJson(x, max = 400000) {
  if (!x || typeof x !== 'object') return undefined;
  try { const s = JSON.stringify(x); if (s.length > max) return undefined; return JSON.parse(s); } catch { return undefined; }
}

/** Limpa o que veio de arquivo ou de colar. */
export function normalizarG(g) {
  const tipos = new Set([...TIPOS_GRAFICO.map((t) => t[0]), 'excel']);
  const o = g && typeof g === 'object' ? g : {};
  const op = o.op && typeof o.op === 'object' ? o.op : {};
  const num = (v) => (ehNum(v) ? v : undefined);
  const out = {
    t: tipos.has(o.t) ? o.t : 'colunas',
    titulo: typeof o.titulo === 'string' ? o.titulo.slice(0, 120) : '',
    dados: { aba: o.dados && typeof o.dados.aba === 'string' ? o.dados.aba : '', fx: o.dados && typeof o.dados.fx === 'string' ? o.dados.fx.slice(0, 40) : '' },
    op: {
      legenda: ['dir', 'baixo', 'nao'].includes(op.legenda) ? op.legenda : 'baixo',
      rotulos: !!op.rotulos, empilhado: op.empilhado === '100' ? '100' : !!op.empilhado,
      meta: num(op.meta), lsc: num(op.lsc), lic: num(op.lic),
      eixoX: typeof op.eixoX === 'string' ? op.eixoX.slice(0, 60) : '', eixoY: typeof op.eixoY === 'string' ? op.eixoY.slice(0, 60) : '',
      cores: Array.isArray(op.cores) ? op.cores.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 8) : [],
    },
  };
  /* v0.6.1: velocímetro (mínimo, máximo, faixas, sentido) e dados ocultos */
  if (num(op.min) !== undefined) out.op.min = op.min;
  if (num(op.max) !== undefined) out.op.max = op.max;
  if (op.sentido === 'menor') out.op.sentido = 'menor';
  if (Array.isArray(op.faixas)) out.op.faixas = op.faixas.filter((f) => f && ehNum(f.ate) && /^#[0-9a-f]{6}$/i.test(f.cor)).slice(0, 12).map((f) => ({ ate: f.ate, cor: f.cor }));
  if (op.ocultos) out.op.ocultos = true;
  if (o.porLinhas) out.porLinhas = true;
  if (o.xl) out.xl = String(o.xl).slice(0, 40); // tipo original do Excel (quando não temos igual)
  /* v0.6.1: formatação do editor (fx), estilo rápido e o plano do gráfico que veio do Excel (com o XML original) */
  const fx = copiaJson(o.fx); if (fx) out.fx = fx;
  if (typeof o.estilo === 'string') out.estilo = o.estilo.slice(0, 20);
  if (out.t === 'excel') {
    const plano = copiaJson(o.plano, 2000000);
    if (!plano || !Array.isArray(plano.grupos)) { out.t = 'colunas'; }
    else {
      out.plano = plano;
      if (typeof o.xo === 'string' && o.xo.length < 3000000) { out.xo = o.xo; if (typeof o.xoSig === 'string') out.xoSig = o.xoSig; }
    }
  }
  return out;
}
