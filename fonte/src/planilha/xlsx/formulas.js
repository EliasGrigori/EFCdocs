/* EFCdocs — fórmulas do Excel no arquivo .xlsx ⇄ fórmulas guardadas no EFCdocs.
   Ao abrir: tira os prefixos _xlfn./_xlws., troca as referências de tabela (Tabela[Coluna]) por endereços normais
   e A1# no lugar de ANCHORARRAY. Ao salvar: devolve os prefixos que o Excel espera nas funções novas. */
import { letraCol, numCol } from '../ref.js';

/* ---------- partes do texto da fórmula ---------- */
/** Passa pelo texto e chama fn só nos trechos fora de "texto" e de 'nome de aba'. */
function foraDeTexto(s, fn, soAspas = false) {
  let out = '', i = 0, ini = 0, colchete = 0;
  while (i < s.length) {
    const ch = s[i];
    /* dentro de Tabela[...] o apóstrofo só protege o caractere seguinte (TAG''s) */
    if (colchete > 0) {
      if (ch === "'") { i += 2; continue; }
      if (ch === '[') colchete++;
      else if (ch === ']') colchete--;
      i++; continue;
    }
    if (ch === '[') { colchete = 1; i++; continue; }
    if (ch === '"' || (ch === "'" && !soAspas)) {
      out += fn(s.slice(ini, i));
      let j = i + 1;
      while (j < s.length) { if (s[j] === ch) { if (s[j + 1] === ch) { j += 2; continue; } j++; break; } j++; }
      out += s.slice(i, j);
      i = j; ini = j;
      continue;
    }
    i++;
  }
  return out + fn(s.slice(ini));
}

/* ---------- prefixos ---------- */
/** Funções que o Excel grava com _xlfn. (ou _xlfn._xlws.) por serem novas. */
const NOVAS = ('ACOT ACOTH AGGREGATE ARABIC ARRAYTOTEXT BASE BETA.DIST BETA.INV BINOM.DIST BINOM.DIST.RANGE BINOM.INV BITAND BITLSHIFT BITOR BITRSHIFT BITXOR BYCOL BYROW ' +
  'CEILING.MATH CEILING.PRECISE CHISQ.DIST CHISQ.DIST.RT CHISQ.INV CHISQ.INV.RT CHISQ.TEST CHOOSECOLS CHOOSEROWS COMBINA CONCAT CONFIDENCE.NORM CONFIDENCE.T COT COTH COVARIANCE.P COVARIANCE.S CSC CSCH ' +
  'DAYS DECIMAL DROP ECMA.CEILING ERF.PRECISE ERFC.PRECISE EXPAND EXPON.DIST F.DIST F.DIST.RT F.INV F.INV.RT F.TEST FIELDVALUE FILTERXML FLOOR.MATH FLOOR.PRECISE FORECAST.ETS FORECAST.ETS.CONFINT ' +
  'FORECAST.ETS.SEASONALITY FORECAST.ETS.STAT FORECAST.LINEAR FORMULATEXT GAMMA GAMMA.DIST GAMMA.INV GAMMALN.PRECISE GAUSS GROUPBY HSTACK HYPGEOM.DIST IFNA IFS IMAGE IMCOSH IMCOT IMCSC IMCSCH IMSEC IMSECH ' +
  'IMSINH IMTAN ISFORMULA ISOMITTED ISOWEEKNUM LAMBDA LET LOGNORM.DIST LOGNORM.INV MAKEARRAY MAP MAXIFS MINIFS MODE.MULT MODE.SNGL MUNIT NEGBINOM.DIST NETWORKDAYS.INTL NORM.DIST NORM.INV NORM.S.DIST NORM.S.INV NUMBERVALUE ' +
  'PDURATION PERCENTILE.EXC PERCENTILE.INC PERCENTRANK.EXC PERCENTRANK.INC PERMUTATIONA PHI PIVOTBY POISSON.DIST QUARTILE.EXC QUARTILE.INC QUERYSTRING RANDARRAY RANK.AVG RANK.EQ REDUCE REGEXEXTRACT REGEXREPLACE REGEXTEST ' +
  'RRI SCAN SEC SECH SEQUENCE SHEET SHEETS SKEW.P SINGLE STDEV.P STDEV.S SWITCH T.DIST T.DIST.2T T.DIST.RT T.INV T.INV.2T T.TEST TAKE TEXTAFTER TEXTBEFORE TEXTJOIN TEXTSPLIT TOCOL TOROW TRIMRANGE UNICHAR UNICODE UNIQUE ' +
  'VALUETOTEXT VAR.P VAR.S VSTACK WEBSERVICE WEIBULL.DIST WORKDAY.INTL WRAPCOLS WRAPROWS XLOOKUP XMATCH XOR Z.TEST ANCHORARRAY').split(' ');
const COM_XLWS = new Set(['FILTER', 'SORT', 'SORTBY']);
const SET_NOVAS = new Set(NOVAS);
const RX_FN = /(^|[^\w.À-ÿ])((?:_xlfn\.|_xlws\.|_xlpm\.)*)([A-Za-z][\w.]*)\(/g;

/** Do arquivo para o EFCdocs: sem prefixos; ANCHORARRAY(A1) → A1#; _xlpm.x → x (nomes do LET/LAMBDA). */
export function tirarPrefixos(f) {
  if (f.indexOf('_xl') < 0) return f;
  if (f.indexOf('_TRO_') >= 0) f = trocarTro(f);
  return foraDeTexto(f, (t) => t.replace(/_xlfn\._xlws\.|_xlfn\.|_xlws\.|_xlpm\./g, ''))
    .replace(/\bANCHORARRAY\((\$?[A-Z]{1,3}\$?\d+|'[^']+'!\$?[A-Z]{1,3}\$?\d+|[\wÀ-ÿ.]+!\$?[A-Z]{1,3}\$?\d+)\)/g, '$1#');
}

/** _xlfn._TRO_TRAILING(A1:A9) (o A1:.A9 do Excel novo) → TRIMRANGE(A1:A9,2,2) */
function trocarTro(f) {
  const MODO = { TRAILING: '2,2', LEADING: '1,1', ALL: '3,3' };
  for (let volta = 0; volta < 50; volta++) {
    const m = /(?:_xlfn\.)?_TRO_(TRAILING|LEADING|ALL)\(/.exec(f);
    if (!m) break;
    let i = m.index + m[0].length, prof = 1;
    while (i < f.length && prof > 0) {
      const ch = f[i];
      if (ch === '"' || ch === "'") { const q = ch; i++; while (i < f.length && !(f[i] === q && f[i + 1] !== q)) i += f[i] === q ? 2 : 1; } else if (ch === '(') prof++; else if (ch === ')') prof--;
      i++;
    }
    if (prof !== 0) break;
    f = f.slice(0, m.index) + 'TRIMRANGE(' + f.slice(m.index + m[0].length, i - 1) + ',' + MODO[m[1]] + ')' + f.slice(i);
  }
  return f;
}

/** Do EFCdocs para o arquivo: põe os prefixos; A1# → _xlfn.ANCHORARRAY(A1). */
export function porPrefixos(f) {
  let s = foraDeTexto(f, (t) => t.replace(/((?:'(?:[^']|'')*'|[\wÀ-ÿ.]+)!)?(\$?[A-Z]{1,3}\$?\d+)#/g, (_, aba, ref) => `_xlfn.ANCHORARRAY(${aba || ''}${ref})`), true);
  s = foraDeTexto(s, (t) => t.replace(RX_FN, (m, antes, pre, nome) => {
    const up = nome.toUpperCase();
    if (pre) return m;
    if (COM_XLWS.has(up)) return `${antes}_xlfn._xlws.${nome}(`;
    if (SET_NOVAS.has(up)) return `${antes}_xlfn.${nome}(`;
    return m;
  }));
  return s;
}

/* ---------- referências de tabela ---------- */
const qAba = (nome) => (/^[A-Za-z_À-ÿ][\wÀ-ÿ.]*$/.test(nome) && !/^[A-Za-z]{1,3}\d+$/.test(nome) ? nome : `'${String(nome).replace(/'/g, "''")}'`);
const tiraEscape = (s) => s.replace(/'(.)/g, '$1');
/* nome de coluna: a quebra de linha pode vir como \r\n na fórmula e \n na tabela */
const normCol = (s) => String(s).replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim().toLowerCase();

/** Lê o que está entre os colchetes de Tabela[...] → { esp: Set('#Data'...), cols: [nomeIni, nomeFim] }. */
function lerDentro(dentro) {
  const partes = [];
  let i = 0;
  const t = dentro.trim();
  if (!t.startsWith('[')) {
    const x = tiraEscape(t);
    if (x.startsWith('#')) return { esp: new Set([x.toLowerCase()]), cols: [] };
    if (x.startsWith('@')) return { esp: new Set(['#this row']), cols: x.length > 1 ? [x.slice(1).trim()] : [] };
    return { esp: new Set(), cols: x ? [x] : [] };
  }
  while (i < t.length) {
    if (t[i] === '[') {
      let j = i + 1, s = '';
      while (j < t.length && t[j] !== ']') { if (t[j] === "'") { s += t[j + 1] || ''; j += 2; continue; } s += t[j++]; }
      partes.push(s); i = j + 1;
      continue;
    }
    if (t[i] === ':') partes.push(':');
    i++;
  }
  const esp = new Set(), cols = [];
  for (let k = 0; k < partes.length; k++) {
    const p = partes[k];
    if (p === ':') continue;
    if (p.startsWith('#')) esp.add(p.toLowerCase());
    else if (p.startsWith('@')) { esp.add('#this row'); if (p.length > 1) cols.push(p.slice(1).trim()); } else cols.push(p);
  }
  return { esp, cols };
}

/** Troca Tabela[...] e o nome solto da tabela por endereços. tabelas: Map(nome minúsculo → { nome, aba, l1, c1, l2, c2, cab, tot, cols }) */
export function trocarTabelas(f, tabelas, { aba, l }) {
  if (!tabelas || !tabelas.size) return f;
  return foraDeTexto(f, (t) => {
    let out = '', i = 0;
    while (i < t.length) {
      const m = /^[A-Za-z_\\À-ÿ][\wÀ-ÿ.]*/.exec(t.slice(i));
      const antes = i > 0 ? t[i - 1] : '';
      if (!m || /[\w.$!À-ÿ]/.test(antes)) { out += t[i]; i++; continue; }
      const nome = m[0];
      const tb = tabelas.get(nome.toLowerCase());
      let j = i + nome.length;
      if (!tb) { out += nome; i = j; continue; }
      let dentro = null;
      if (t[j] === '[') {
        let prof = 0, k = j;
        for (; k < t.length; k++) {
          if (t[k] === "'") { k++; continue; }
          if (t[k] === '[') prof++;
          else if (t[k] === ']') { prof--; if (prof === 0) break; }
        }
        dentro = t.slice(j + 1, k);
        j = k + 1;
      } else if (t[j] === '(' || t[j] === '!') { out += nome; i = j; continue; }
      out += enderecoDaTabela(tb, dentro == null ? { esp: new Set(), cols: [] } : lerDentro(dentro), aba, l);
      i = j;
    }
    return out;
  });
}

function enderecoDaTabela(tb, { esp, cols }, abaFormula, lFormula) {
  const dIni = tb.l1 + (tb.cab ? 1 : 0), dFim = tb.l2 - (tb.tot ? 1 : 0);
  let l1 = dIni, l2 = dFim, umaLinha = false;
  if (esp.has('#all')) { l1 = tb.l1; l2 = tb.l2; } else if (esp.has('#this row')) { umaLinha = true; l1 = l2 = lFormula; } else {
    const h = esp.has('#headers'), d = esp.has('#data') || (!h && !esp.has('#totals')), tt = esp.has('#totals');
    l1 = h ? tb.l1 : d ? dIni : dFim + 1;
    l2 = tt ? tb.l2 : d ? dFim : tb.l1;
  }
  let c1 = tb.c1, c2 = tb.c2;
  if (cols.length) {
    const ach = (n) => { const k = normCol(n); return tb.cols.findIndex((x) => normCol(x) === k); };
    const a = ach(cols[0]), b = ach(cols[cols.length - 1]);
    if (a < 0 || b < 0) return '#REF!';
    c1 = tb.c1 + Math.min(a, b); c2 = tb.c1 + Math.max(a, b);
  }
  if (l2 < l1) l2 = l1;
  const pre = tb.aba.toLowerCase() !== String(abaFormula).toLowerCase() ? qAba(tb.aba) + '!' : '';
  if (umaLinha) {
    const r = l1 + 1;
    return c1 === c2 ? `${pre}$${letraCol(c1)}${r}` : `${pre}$${letraCol(c1)}${r}:$${letraCol(c2)}${r}`;
  }
  const a = `$${letraCol(c1)}$${l1 + 1}`, b = `$${letraCol(c2)}$${l2 + 1}`;
  return pre + (a === b ? a : `${a}:${b}`);
}

/* ---------- assinatura relativa (para achar a mesma fórmula copiada para baixo) ---------- */
const RX_REF = /(^|[^\w.$À-ÿ])(\$?)([A-Z]{1,3})(\$?)(\d{1,7})(?![\w(À-ÿ])/g;
export function assinatura(f, l, c) {
  return foraDeTexto(f, (t) => t.replace(RX_REF, (m, antes, ac, col, al, lin) => {
    const cc = numCol(col), ll = +lin - 1;
    return `${antes}${ac ? 'C' + cc : 'c' + (cc - c)}${al ? 'R' + ll : 'r' + (ll - l)}`;
  }));
}

export { foraDeTexto, qAba };
