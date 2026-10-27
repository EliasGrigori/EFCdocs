/* EFCdocs — estilos do Excel (styles.xml) ⇄ estilos da planilha do EFCdocs.
   EFCdocs: { b, i, u, st, tam, fonte, cor, fundo, al:'e'|'c'|'d', av:'t'|'m', qb, nf, bd:{t,b,l,r: 1|2|3}, bdc } */
import { atributos, tags, tag, escapar } from './xml.js';

/* ---------- cores ---------- */
const INDEXADAS = ('000000 FFFFFF FF0000 00FF00 0000FF FFFF00 FF00FF 00FFFF 000000 FFFFFF FF0000 00FF00 0000FF FFFF00 FF00FF 00FFFF ' +
  '800000 008000 000080 808000 800080 008080 C0C0C0 808080 9999FF 993366 FFFFCC CCFFFF 660066 FF8080 0066CC CCCCFF ' +
  '000080 FF00FF FFFF00 00FFFF 800080 800000 008080 0000FF 00CCFF CCFFFF CCFFCC FFFF99 99CCFF FF99CC CC99FF FFCC99 ' +
  '3366FF 33CCCC 99CC00 FFCC00 FF9900 FF6600 666699 969696 003366 339966 003300 333300 993300 993366 333399 333333').split(' ');
/* tema padrão do Office (quando o arquivo não traz o dele); ordem do Excel: lt1, dk1, lt2, dk2, acentos 1–6, hlink, folHlink */
const TEMA_PADRAO = ['FFFFFF', '000000', 'E7E6E6', '44546A', '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47', '0563C1', '954F72'];

export function lerTema(xml) {
  if (!xml) return TEMA_PADRAO.slice();
  const cor = (nome) => {
    const m = new RegExp(`<a:${nome}>([\\s\\S]*?)</a:${nome}>`).exec(xml);
    if (!m) return null;
    const s = /srgbClr val="([0-9A-Fa-f]{6})"/.exec(m[1]) || /lastClr="([0-9A-Fa-f]{6})"/.exec(m[1]);
    return s ? s[1].toUpperCase() : null;
  };
  const nomes = ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
  return nomes.map((n, i) => cor(n) || TEMA_PADRAO[i]);
}

function rgbParaHls(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, l, 0];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, l, s];
}
function hlsParaRgb(h, l, s) {
  if (s === 0) return [l, l, l].map((x) => Math.round(x * 255));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((x) => Math.round(x * 255));
}
/** Clarear/escurecer como o Excel ("tint" de -1 a 1). */
export function aplicarTint(hex, tint) {
  if (!tint) return hex;
  const n = parseInt(hex, 16);
  const [h, l, s] = rgbParaHls((n >> 16) & 255, (n >> 8) & 255, n & 255);
  const l2 = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
  return hlsParaRgb(h, Math.max(0, Math.min(1, l2)), s).map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** <color rgb|theme|indexed|tint|auto> → '#rrggbb' ou null (automática). */
export function corDe(a, tema, indexadas = INDEXADAS) {
  if (!a || a.auto === '1' || a.auto === 'true') return null;
  let hex = null;
  if (a.rgb) hex = a.rgb.length === 8 ? a.rgb.slice(2) : a.rgb.slice(-6);
  else if (a.theme != null) hex = tema[+a.theme] || null;
  else if (a.indexed != null) { const i = +a.indexed; if (i >= 64) return null; hex = indexadas[i] || null; }
  if (!hex || !/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
  if (a.tint) hex = aplicarTint(hex, parseFloat(a.tint));
  return '#' + hex.toLowerCase();
}

/* ---------- formatos de número embutidos ---------- */
export const FORMATOS_EMBUTIDOS = {
  0: 'General', 1: '0', 2: '0.00', 3: '#,##0', 4: '#,##0.00', 9: '0%', 10: '0.00%', 11: '0.00E+00', 12: '# ?/?', 13: '# ??/??',
  14: 'dd/mm/yyyy', 15: 'd-mmm-yy', 16: 'd-mmm', 17: 'mmm-yy', 18: 'h:mm AM/PM', 19: 'h:mm:ss AM/PM', 20: 'hh:mm', 21: 'hh:mm:ss', 22: 'dd/mm/yyyy hh:mm',
  37: '#,##0 ;(#,##0)', 38: '#,##0 ;[Red](#,##0)', 39: '#,##0.00;(#,##0.00)', 40: '#,##0.00;[Red](#,##0.00)',
  45: 'mm:ss', 46: '[h]:mm:ss', 47: 'mm:ss.0', 48: '##0.0E+0', 49: '@',
};
/* os que o Excel de qualquer idioma mostra igual (os de data dependem do idioma: vão como formato próprio) */
const EMBUTIDOS_FIXOS = { General: 0, '0': 1, '0.00': 2, '#,##0': 3, '#,##0.00': 4, '0%': 9, '0.00%': 10, '0.00E+00': 11, '# ?/?': 12, '# ??/??': 13, '@': 49 };

const ESPESSURA = { hair: 1, thin: 1, dotted: 1, dashed: 1, dashDot: 1, dashDotDot: 1, medium: 2, mediumDashed: 2, mediumDashDot: 2, mediumDashDotDot: 2, slantDashDot: 2, thick: 3, double: 3 };

/** Um <dxf> (o que a formatação condicional muda) → { fundo, cor, b, i, u, st }. Aceita o <x14:dxf> também. */
export function lerDxf(dentro, corFn) {
  const e = {};
  const f = tag(dentro, 'font');
  if (f) {
    const val = (n) => { const t = tag(f.dentro, n); if (!t) return undefined; return t.a.val == null ? true : !(t.a.val === '0' || t.a.val === 'false'); };
    const b = val('b'), i = val('i'), st = val('strike');
    if (b !== undefined) e.b = b;
    if (i !== undefined) e.i = i;
    if (st !== undefined) e.st = st;
    const u = tag(f.dentro, 'u');
    if (u) e.u = u.a.val == null ? true : u.a.val !== 'none';
    const cr = corFn(f.dentro, 'color');
    if (cr) e.cor = cr;
  }
  const fi = tag(dentro, 'fill');
  if (fi) {
    const p = tag(fi.dentro, 'patternFill');
    if (p) {
      /* no dxf o Excel guarda a cor do fundo em bgColor (e em fgColor quando o tipo é "solid" sem bgColor) */
      const fundo = corFn(p.dentro, 'bgColor') || corFn(p.dentro, 'fgColor');
      if (fundo && p.a.patternType !== 'none') e.fundo = fundo;
    }
  }
  return e;
}

/** styles.xml → lista de estilos do EFCdocs, um por "xf" (o s="N" da célula). */
export function lerEstilos(xml, tema) {
  const fmts = { ...FORMATOS_EMBUTIDOS };
  if (!xml) return { xfs: [{}], fonteBase: { nome: 'Calibri', tam: 11 }, fmts, dxfs: [], corFn: () => null };
  for (const n of tags(tag(xml, 'numFmts')?.dentro || '', 'numFmt')) fmts[+n.a.numFmtId] = n.a.formatCode;
  let indexadas = INDEXADAS;
  const ic = tag(xml, 'indexedColors');
  if (ic) { const l = tags(ic.dentro, 'rgbColor').map((c) => (c.a.rgb || '').slice(-6)); if (l.length) indexadas = l; }
  const cor = (dentro, nome) => { const t = tag(dentro, nome); return t ? corDe(t.a, tema, indexadas) : null; };

  const fontes = tags(tag(xml, 'fonts')?.dentro || '', 'font').map((f) => {
    const d = f.dentro;
    const val = (n) => { const t = tag(d, n); if (!t) return null; return t.a.val == null ? true : t.a.val; };
    const sim = (n) => { const v = val(n); return v === true || v === '1' || v === 'true'; };
    const u = val('u');
    return {
      b: sim('b'), i: sim('i'), st: sim('strike'), u: u === true || (u && u !== 'none'),
      tam: parseFloat(val('sz')) || null, nome: val('name'), cor: cor(d, 'color'),
    };
  });
  const base = fontes[0] || { nome: 'Calibri', tam: 11 };
  const fundos = tags(tag(xml, 'fills')?.dentro || '', 'fill').map((f) => {
    const p = tag(f.dentro, 'patternFill');
    if (p) {
      const tipo = p.a.patternType || (tag(p.dentro, 'fgColor') ? 'solid' : 'none');
      if (tipo === 'none') return null;
      const fg = cor(p.dentro, 'fgColor'), bg = cor(p.dentro, 'bgColor');
      if (tipo === 'solid') return fg || bg || null;
      return fg || null;
    }
    const g = tag(f.dentro, 'gradientFill');
    if (g) { const st = tags(g.dentro, 'stop')[0]; return st ? cor(st.dentro, 'color') : null; }
    return null;
  });
  const bordas = tags(tag(xml, 'borders')?.dentro || '', 'border').map((b) => {
    const bd = {};
    let bdc = null;
    for (const [lado, k] of [['top', 't'], ['bottom', 'b'], ['left', 'l'], ['right', 'r'], ['start', 'l'], ['end', 'r']]) {
      const t = tag(b.dentro, lado);
      if (!t || !t.a.style || t.a.style === 'none') continue;
      bd[k] = ESPESSURA[t.a.style] || 1;
      if (!bdc) bdc = cor(t.dentro, 'color');
    }
    return Object.keys(bd).length ? { bd, bdc } : null;
  });
  const AL = { left: 'e', center: 'c', centerContinuous: 'c', right: 'd', justify: 'e', distributed: 'c', fill: 'e' };
  const AV = { top: 't', center: 'm', justify: 'm', distributed: 'm' };
  const xfs = tags(tag(xml, 'cellXfs')?.dentro || '', 'xf').map((x) => {
    const e = {};
    const f = fontes[+(x.a.fontId || 0)];
    if (f) {
      if (f.b) e.b = true; if (f.i) e.i = true; if (f.u) e.u = true; if (f.st) e.st = true;
      if (f.tam && f.tam !== 11) e.tam = f.tam;
      if (f.nome && f.nome !== base.nome) e.fonte = f.nome;
      if (f.cor && f.cor !== '#000000') e.cor = f.cor;
    }
    const fu = fundos[+(x.a.fillId || 0)];
    if (fu) e.fundo = fu;
    const bo = bordas[+(x.a.borderId || 0)];
    if (bo) { e.bd = bo.bd; if (bo.bdc && bo.bdc !== '#000000') e.bdc = bo.bdc; }
    const nf = fmts[+(x.a.numFmtId || 0)];
    if (nf && nf !== 'General') e.nf = nf;
    const al = tag(x.dentro, 'alignment');
    if (al) {
      if (AL[al.a.horizontal]) e.al = AL[al.a.horizontal];
      if (AV[al.a.vertical]) e.av = AV[al.a.vertical];
      if (al.a.wrapText === '1' || al.a.wrapText === 'true') e.qb = true;
    }
    return e;
  });
  if (!xfs.length) xfs.push({});
  const dxfs = tags(tag(xml, 'dxfs')?.dentro || '', 'dxf').map((d) => lerDxf(d.dentro, cor));
  return { xfs, fonteBase: { nome: base.nome || 'Calibri', tam: base.tam || 11 }, fmts, dxfs, corFn: cor };
}

/* ---------- gravar ---------- */
/** { fundo, cor, b, i, u, st } → <dxf> (o que a formatação condicional muda). */
function dxfXml(e) {
  let f = '';
  const sn = (k, nome) => (e[k] === true ? `<${nome}/>` : e[k] === false ? `<${nome} val="0"/>` : '');
  f += sn('b', 'b') + sn('i', 'i') + sn('st', 'strike') + sn('u', 'u');
  if (e.cor) f += `<color rgb="${hexArgb(e.cor)}"/>`;
  return '<dxf>' + (f ? `<font>${f}</font>` : '') + (e.fundo ? `<fill><patternFill><bgColor rgb="${hexArgb(e.fundo)}"/></patternFill></fill>` : '') + '</dxf>';
}

const hexArgb = (h) => 'FF' + String(h).replace('#', '').toUpperCase().padStart(6, '0').slice(-6);
const LARG_BORDA = { 1: 'thin', 2: 'medium', 3: 'thick' };

/** Estilos do EFCdocs → styles.xml. O estilo N do EFCdocs vira o xf N do Excel. */
export function gravarEstilos(estilos, fonteBase = 'Calibri', dxfs = []) {
  const fontes = [], fundos = [], bordas = [], fmts = [], xfs = [];
  const idx = (lista, x) => { const k = JSON.stringify(x); let i = lista.findIndex((y) => y.k === k); if (i < 0) { lista.push({ k, x }); i = lista.length - 1; } return i; };
  idx(fontes, { tam: 11 });
  idx(fundos, { tipo: 'none' }); idx(fundos, { tipo: 'gray125' });
  idx(bordas, {});
  const mapaFmt = new Map();
  let proximoFmt = 164;
  const idFmt = (nf) => {
    if (!nf || /^general$/i.test(nf)) return 0;
    if (EMBUTIDOS_FIXOS[nf] != null) return EMBUTIDOS_FIXOS[nf];
    if (!mapaFmt.has(nf)) { mapaFmt.set(nf, proximoFmt); fmts.push({ id: proximoFmt, nf }); proximoFmt++; }
    return mapaFmt.get(nf);
  };
  for (const e0 of estilos.length ? estilos : [{}]) {
    const e = e0 || {};
    const fonte = { b: !!e.b, i: !!e.i, u: !!e.u, st: !!e.st, tam: e.tam || 11, nome: e.fonte || null, cor: e.cor || null };
    const fo = idx(fontes, fonte.b || fonte.i || fonte.u || fonte.st || fonte.tam !== 11 || fonte.nome || fonte.cor ? fonte : { tam: 11 });
    const fi = e.fundo ? idx(fundos, { tipo: 'solid', cor: e.fundo }) : 0;
    const bo = e.bd && Object.keys(e.bd).length ? idx(bordas, { bd: e.bd, cor: e.bdc || null }) : 0;
    const nf = idFmt(e.nf);
    xfs.push({ fo, fi, bo, nf, al: e.al, av: e.av, qb: !!e.qb });
  }
  const fonteXml = ({ x }) => {
    let s = '<font>';
    if (x.b) s += '<b/>'; if (x.i) s += '<i/>'; if (x.st) s += '<strike/>'; if (x.u) s += '<u/>';
    s += `<sz val="${x.tam || 11}"/>`;
    s += x.cor ? `<color rgb="${hexArgb(x.cor)}"/>` : '<color theme="1"/>';
    const nome = x.nome || fonteBase || 'Calibri';
    s += `<name val="${escapar(nome, true)}"/>`;
    if (nome === 'Calibri') s += '<family val="2"/><scheme val="minor"/>';
    return s + '</font>';
  };
  const fundoXml = ({ x }) => (x.tipo === 'solid'
    ? `<fill><patternFill patternType="solid"><fgColor rgb="${hexArgb(x.cor)}"/><bgColor indexed="64"/></patternFill></fill>`
    : `<fill><patternFill patternType="${x.tipo}"/></fill>`);
  const bordaXml = ({ x }) => {
    if (!x.bd) return '<border><left/><right/><top/><bottom/><diagonal/></border>';
    const cor = x.cor ? `<color rgb="${hexArgb(x.cor)}"/>` : '<color indexed="64"/>';
    const lado = (n, k) => (x.bd[k] ? `<${n} style="${LARG_BORDA[x.bd[k]] || 'thin'}">${cor}</${n}>` : `<${n}/>`);
    return `<border>${lado('left', 'l')}${lado('right', 'r')}${lado('top', 't')}${lado('bottom', 'b')}<diagonal/></border>`;
  };
  const AL = { e: 'left', c: 'center', d: 'right' };
  const AV = { t: 'top', m: 'center' };
  const xfXml = (x) => {
    const al = x.al || x.av || x.qb;
    let s = `<xf numFmtId="${x.nf}" fontId="${x.fo}" fillId="${x.fi}" borderId="${x.bo}" xfId="0"`;
    if (x.nf) s += ' applyNumberFormat="1"';
    if (x.fo) s += ' applyFont="1"';
    if (x.fi) s += ' applyFill="1"';
    if (x.bo) s += ' applyBorder="1"';
    if (!al) return s + '/>';
    s += ' applyAlignment="1"><alignment';
    if (AL[x.al]) s += ` horizontal="${AL[x.al]}"`;
    if (AV[x.av]) s += ` vertical="${AV[x.av]}"`;
    if (x.qb) s += ' wrapText="1"';
    return s + '/></xf>';
  };
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    (fmts.length ? `<numFmts count="${fmts.length}">${fmts.map((f) => `<numFmt numFmtId="${f.id}" formatCode="${escapar(f.nf, true)}"/>`).join('')}</numFmts>` : '') +
    `<fonts count="${fontes.length}">${fontes.map(fonteXml).join('')}</fonts>` +
    `<fills count="${fundos.length}">${fundos.map(fundoXml).join('')}</fills>` +
    `<borders count="${bordas.length}">${bordas.map(bordaXml).join('')}</borders>` +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    `<cellXfs count="${xfs.length}">${xfs.map(xfXml).join('')}</cellXfs>` +
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
    `<dxfs count="${dxfs.length}">${dxfs.map(dxfXml).join('')}</dxfs><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>` +
    '</styleSheet>';
  return xml;
}

export { atributos };
