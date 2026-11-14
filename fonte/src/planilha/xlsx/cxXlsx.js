/* Vértice Docs v0.6.18 (D-44) — gráficos novos do Excel 2016 (chartEx, "cx"): cascata, funil, mapa de árvore, explosão solar,
   caixa estreita, histograma, Pareto e mapa.
   Ler: o XML do gráfico fica guardado como veio (com o estilo e as cores, que são partes à parte) e o app tira dele o que precisa
   para desenhar: tipo, título, categorias, valores, subtotais da cascata e cores. Gravar: volta o XML guardado, com as fórmulas
   apontando para o nome de agora das abas e os números de agora das células (o Excel desenha pelo que estiver guardado).
   No desenho da aba ele vai dentro de um "AlternateContent", com a caixa de aviso para o Excel antigo, como o Excel grava. */
import { escapar, desescapar } from './xml.js';

export const NS_CX = 'http://schemas.microsoft.com/office/drawing/2014/chartex';
export const REL_CX = 'http://schemas.microsoft.com/office/2014/relationships/chartEx';
export const CT_CX = 'application/vnd.ms-office.chartex+xml';
export const REL_ESTILO = 'http://schemas.microsoft.com/office/2011/relationships/chartStyle';
export const REL_CORES = 'http://schemas.microsoft.com/office/2011/relationships/chartColorStyle';
export const CT_ESTILO = 'application/vnd.ms-office.chartstyle+xml';
export const CT_CORES = 'application/vnd.ms-office.chartcolorstyle+xml';
export const NOMES_CX = { waterfall: 'Cascata', funnel: 'Funil', treemap: 'Mapa de árvore', sunburst: 'Explosão solar', boxWhisker: 'Caixa estreita', clusteredColumn: 'Histograma', pareto: 'Pareto', regionMap: 'Mapa' };
export const ehCxXml = (xml) => /<(?:\w+:)?chartSpace\b[^>]*chartex/i.test(String(xml || '').slice(0, 1200));

const atr = (s, n) => { const m = new RegExp(`(?:^|\\s)${n}="([^"]*)"`).exec(s || ''); return m ? desescapar(m[1]) : null; };
const hex = (s) => { const m = /<a:srgbClr\b[^>]*\bval="([0-9A-Fa-f]{6})"/.exec(s || ''); return m ? '#' + m[1].toLowerCase() : null; };

/** 'Aba'!$A$2:$A$10 → { abaNome, fx: 'A2:A10' } (ou null: várias áreas, outro arquivo...) */
export function refDaFormula(f) {
  const m = /^\s*(?:'((?:[^']|'')+)'|([^'!\s[\]]+))!\$?([A-Z]{1,3})\$?(\d{1,7})(?::\$?([A-Z]{1,3})\$?(\d{1,7}))?\s*$/i.exec(String(f || ''));
  if (!m) return null;
  const a = (m[3] + m[4]).toUpperCase(), b = m[5] ? (m[5] + m[6]).toUpperCase() : null;
  return { abaNome: m[1] ? m[1].replace(/''/g, "'") : m[2], fx: b && b !== a ? a + ':' + b : a };
}
const nomeNaFormula = (nome) => (/^[A-Za-z_][\w.]*$/.test(nome) && !/^[A-Za-z]{1,3}\d+$/.test(nome) ? nome : `'${String(nome).replace(/'/g, "''")}'`);
const comCifrao = (fx) => fx.split(':').map((r) => r.replace(/^([A-Z]+)(\d+)$/, '$$$1$$$2')).join(':');

/**
 * XML do chartEx → { g } (objeto do gráfico) ou { fora }.
 * extras = { estilo, cores } (o XML das partes de estilo e cores, se o arquivo tinha).
 */
export function lerCx(xml, extras = {}) {
  if (!ehCxXml(xml)) return { fora: 'gráfico que o Vértice Docs não abre' };
  let x = String(xml).replace(/<cx:externalData\b[^>]*\/>|<cx:externalData\b[\s\S]*?<\/cx:externalData>/g, '');
  const series = [...x.matchAll(/<cx:series\b([^>]*)>([\s\S]*?)<\/cx:series>/g)];
  if (!series.length) return { fora: 'gráfico sem dados' };
  const layouts = series.map((m) => atr(m[1], 'layoutId'));
  const tipo = layouts.includes('paretoLine') ? 'pareto' : layouts[0] || 'desconhecido';
  /* dados: cada <cx:data id> com as dimensões (categorias, valores...) */
  const dados = {};
  for (const d of x.matchAll(/<cx:data\b([^>]*)>([\s\S]*?)<\/cx:data>/g)) {
    const id = atr(d[1], 'id') || '0';
    const dims = [];
    for (const m of d[2].matchAll(/<cx:(strDim|numDim)\b([^>]*)>([\s\S]*?)<\/cx:\1>/g)) {
      const f = (/<cx:f\b[^>]*>([\s\S]*?)<\/cx:f>/.exec(m[3]) || [])[1];
      const lvls = [...m[3].matchAll(/<cx:lvl\b([^>]*)>([\s\S]*?)<\/cx:lvl>/g)];
      const pts = (lv) => { const n = +atr(lv[1], 'ptCount') || 0; const out = new Array(Math.min(n, 5000)).fill(null); for (const p of lv[2].matchAll(/<cx:pt\b([^>]*)>([\s\S]*?)<\/cx:pt>/g)) { const i = +atr(p[1], 'idx'); if (i >= 0 && i < out.length) out[i] = desescapar(p[2]); } return out; };
      const dim = { k: atr(m[2], 'type') || (m[1] === 'numDim' ? 'val' : 'cat'), num: m[1] === 'numDim', niveis: lvls.length };
      if (f) { dim.f = desescapar(f).trim(); const r = refDaFormula(dim.f); if (r) dim.r = r; }
      if (lvls.length) dim.cache = pts(lvls[0]).map((v) => (dim.num ? (v == null || v === '' ? null : +v) : v == null ? '' : v));
      if (lvls.length && m[1] === 'numDim') dim.fmt = atr(lvls[0][1], 'formatCode') || 'General';
      dims.push(dim);
    }
    dados[id] = dims;
  }
  const s0 = series[0][2];
  const dataId = atr((/<cx:dataId\b([^>]*)\/?>/.exec(s0) || [])[1], 'val') || '0';
  const titulo = (() => {
    const t = /<cx:title\b[\s\S]*?<\/cx:title>/.exec(x);
    if (!t) return '';
    const v = /<cx:v>([\s\S]*?)<\/cx:v>/.exec(t[0]); if (v) return desescapar(v[1]);
    return [...t[0].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((q) => desescapar(q[1])).join('');
  })();
  const nomeSerie = (() => { const v = /<cx:tx>[\s\S]*?<cx:v>([\s\S]*?)<\/cx:v>/.exec(s0); return v ? desescapar(v[1]) : ''; })();
  const semDataPt = s0.replace(/<cx:dataPt\b[\s\S]*?<\/cx:dataPt>/g, '').replace(/<cx:dataLabels\b[\s\S]*?<\/cx:dataLabels>/g, '');
  const corSerie = hex((/<cx:spPr>([\s\S]*?)<\/cx:spPr>/.exec(semDataPt) || [])[1]);
  const pontos = {};
  for (const p of s0.matchAll(/<cx:dataPt\b([^>]*)>([\s\S]*?)<\/cx:dataPt>/g)) { const c = hex(p[2]); if (c) pontos[+atr(p[1], 'idx')] = c; }
  const subtotais = [...((/<cx:subtotals>([\s\S]*?)<\/cx:subtotals>/.exec(s0) || [])[1] || '').matchAll(/<cx:idx\b[^>]*\bval="(\d+)"/g)].map((m) => +m[1]);
  const rot = /<cx:dataLabels\b([^>]*)>([\s\S]*?)<\/cx:dataLabels>|<cx:dataLabels\b([^>]*)\/>/.exec(s0);
  const rotulos = !!rot && !/<cx:visibility\b[^>]*\bvalue="0"/.test(rot[0]);
  const cx = { tipo, xml: x, dataId, dados: dados[dataId] || [], subtotais, rotulos, ...(corSerie ? { cor: corSerie } : {}), ...(Object.keys(pontos).length ? { pontos } : {}), ...(nomeSerie ? { serie: nomeSerie } : {}) };
  if (typeof extras.estilo === 'string' && extras.estilo.length < 400000) cx.estilo = extras.estilo;
  if (typeof extras.cores === 'string' && extras.cores.length < 100000) cx.cores = extras.cores;
  return { g: { t: 'cx', titulo, cx } };
}

/** Depois de ler o livro: o nome da aba nas fórmulas vira o id (o gráfico acompanha a aba renomeada). Devolve quantas ficaram sem aba. */
export function ligarCx(g, idDoNome, abaDoGrafico) {
  let sem = 0;
  const abas = {};
  for (const d of (g.cx && g.cx.dados) || []) {
    if (!d.r) { if (d.f) sem++; continue; }
    const id = idDoNome(d.r.abaNome);
    if (!id) { sem++; delete d.r; continue; }
    abas[id] = d.r.abaNome;
    d.r = { aba: id === abaDoGrafico ? '' : id, fx: d.r.fx };
  }
  /* os outros <cx:f> (nome da série) também trocam de nome junto com a aba */
  for (const m of String(g.cx.xml).matchAll(/<cx:f\b[^>]*>([\s\S]*?)<\/cx:f>/g)) { const r = refDaFormula(desescapar(m[1])); if (r) { const id = idDoNome(r.abaNome); if (id) abas[id] = r.abaNome; } }
  g.cx.abas = abas;
  return sem;
}

/** Os números de agora para o desenho: [{ k, num, vals }] (lerFaixa = lerFaixaDoLivro). */
export function dadosDoCx(g, lerFaixa) {
  return ((g.cx && g.cx.dados) || []).map((d) => {
    let vals = d.cache || [];
    if (d.r && lerFaixa) { const v = lerFaixa(d.r); if (v) vals = d.num ? v.num : v.txt; }
    return { k: d.k, num: d.num, vals, fmt: d.fmt };
  });
}

/** O XML do chartEx para gravar: fórmulas com o nome de agora das abas e os números de agora (dimensões de um nível só). */
export function xmlDoCx(c, abaId, g, lerFaixa) {
  const cx = g.cx || {};
  let x = String(cx.xml || '');
  if (!x) return null;
  const abasOrig = cx.abas || {};
  const porNomeOrig = new Map(Object.entries(abasOrig).map(([id, nome]) => [String(nome).toLowerCase(), id]));
  const trocaNome = (f) => {
    const r = refDaFormula(f); if (!r) return f;
    const id = porNomeOrig.get(String(r.abaNome).toLowerCase());
    const A = id && c.abas[id]; if (!A) return f;
    return `${nomeNaFormula(A.nome)}!${comCifrao(r.fx)}`;
  };
  /* cada dimensão, na ordem em que aparece */
  let k = 0;
  const dims = cx.dados || [];
  x = x.replace(/<cx:data\b([^>]*)>[\s\S]*?<\/cx:data>/g, (bloco, at) => ((atr(at, 'id') || '0') !== String(cx.dataId || '0') ? bloco : bloco.replace(/<cx:(strDim|numDim)\b([^>]*)>([\s\S]*?)<\/cx:\1>/g, (m, tg, at, dentro) => {
    const d = dims[k++];
    let novo = dentro.replace(/(<cx:f\b[^>]*>)([\s\S]*?)(<\/cx:f>)/, (q, a, f, b) => a + escapar(trocaNome(desescapar(f))) + b);
    if (d && d.r && d.niveis === 1 && lerFaixa) {
      const v = lerFaixa(d.r);
      if (v) {
        const vals = d.num ? v.num : v.txt;
        const pts = vals.map((val, i) => (val == null || val === '' ? '' : `<cx:pt idx="${i}">${escapar(String(val))}</cx:pt>`)).join('');
        novo = novo.replace(/<cx:lvl\b([^>]*)>[\s\S]*?<\/cx:lvl>/, (q, la) => `<cx:lvl${/\sptCount="\d+"/.test(la) ? la.replace(/\sptCount="\d+"/, ` ptCount="${vals.length}"`) : `${la} ptCount="${vals.length}"`}>${pts}</cx:lvl>`);
      }
    }
    return `<cx:${tg}${at}>${novo}</cx:${tg}>`;
  })));
  /* os outros <cx:f> (nome da série, título ligado) */
  x = x.replace(/(<cx:tx>[\s\S]*?<cx:f\b[^>]*>)([\s\S]*?)(<\/cx:f>)/g, (q, a, f, b) => a + escapar(trocaNome(desescapar(f))) + b);
  return x;
}

/** O quadro do gráfico no desenho da aba (com a caixa de aviso para o Excel antigo). w e h em px. */
export function frameDoCx(o, id, rid) {
  const nome = escapar((o.g && o.g.titulo) || NOMES_CX[o.g && o.g.cx && o.g.cx.tipo] || 'Gráfico', true);
  const cxW = Math.round((o.w || 480) * 9525), cxH = Math.round((o.h || 300) * 9525);
  return '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">' +
    '<mc:Choice xmlns:cx1="http://schemas.microsoft.com/office/drawing/2015/9/8/chartex" Requires="cx1">' +
    `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id}" name="${nome}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
    `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${NS_CX}"><cx:chart xmlns:cx="${NS_CX}" r:id="${rid}"/></a:graphicData></a:graphic></xdr:graphicFrame></mc:Choice>` +
    '<mc:Fallback><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="0" name=""/><xdr:cNvSpPr><a:spLocks noTextEdit="1"/></xdr:cNvSpPr></xdr:nvSpPr>' +
    `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cxW}" cy="${cxH}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:prstClr val="white"/></a:solidFill><a:ln w="1"><a:solidFill><a:prstClr val="green"/></a:solidFill></a:ln></xdr:spPr>` +
    '<xdr:txBody><a:bodyPr vertOverflow="clip" horzOverflow="clip"/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" sz="1100"/><a:t>Este gráfico não está disponível na sua versão do Excel.</a:t></a:r></a:p></xdr:txBody></xdr:sp></mc:Fallback></mc:AlternateContent>';
}
