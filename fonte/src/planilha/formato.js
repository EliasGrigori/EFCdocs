/* EFCdocs — Planilha: formatos de número guardados no código do Excel ("#,##0.00", "dd/mm/yyyy", '"R$" #,##0.00')
   e mostrados no jeito do Brasil (1.234,50 · 25/10/2026 · R$ 10,50). */
import { numeroGeral, dataDe, horaDe, diaSemana, Erro, ERRO_PT } from './valores.js';

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const CORES = {
  black: '#000000', preto: '#000000', blue: '#0000ff', azul: '#0000ff', cyan: '#00ffff', ciano: '#00ffff',
  green: '#008000', verde: '#008000', magenta: '#ff00ff', red: '#ff0000', vermelho: '#ff0000',
  white: '#ffffff', branco: '#ffffff', yellow: '#ffff00', amarelo: '#ffff00',
};

/* Formatos prontos (os do Excel), com o código guardado e o nome em português */
export const FORMATOS = [
  { id: 'geral', nome: 'Geral', cod: 'General' },
  { id: 'numero', nome: 'Número', cod: '#,##0.00' },
  { id: 'inteiro', nome: 'Número sem casas', cod: '#,##0' },
  { id: 'moeda', nome: 'Moeda (R$)', cod: '"R$" #,##0.00' },
  { id: 'contabil', nome: 'Contábil', cod: '_-"R$" * #,##0.00_-;-"R$" * #,##0.00_-;_-"R$" * "-"??_-;_-@_-' },
  { id: 'data', nome: 'Data', cod: 'dd/mm/yyyy' },
  { id: 'dataLonga', nome: 'Data por extenso', cod: 'dddd, d" de "mmmm" de "yyyy' },
  { id: 'hora', nome: 'Hora', cod: 'hh:mm' },
  { id: 'dataHora', nome: 'Data e hora', cod: 'dd/mm/yyyy hh:mm' },
  { id: 'porcentagem', nome: 'Porcentagem', cod: '0%' },
  { id: 'porcentagem2', nome: 'Porcentagem com 2 casas', cod: '0.00%' },
  { id: 'cientifico', nome: 'Científico', cod: '0.00E+00' },
  { id: 'texto', nome: 'Texto', cod: '@' },
];
export const FORMATO_MOEDA = '"R$" #,##0.00';
export const FORMATO_PCT = '0%';
export const FORMATO_DATA = 'dd/mm/yyyy';
export const FORMATO_HORA = 'hh:mm';

const ehGeral = (c) => !c || /^general$/i.test(c) || /^geral$/i.test(c);

/** Quebra o código nas seções separadas por ";" (fora de aspas e colchetes). */
function secoes(cod) {
  const out = [];
  let atual = '', aspas = false, colchete = false;
  for (let i = 0; i < cod.length; i++) {
    const ch = cod[i];
    if (ch === '\\' && !aspas) { atual += ch + (cod[i + 1] || ''); i++; continue; }
    if (ch === '"') aspas = !aspas;
    if (!aspas && ch === '[') colchete = true;
    if (!aspas && ch === ']') colchete = false;
    if (ch === ';' && !aspas && !colchete) { out.push(atual); atual = ''; continue; }
    atual += ch;
  }
  out.push(atual);
  return out;
}

/** Tira colchetes de cor, condição e moeda; devolve { corpo, cor, cond }. */
function limparSecao(s) {
  let cor = null, cond = null;
  const corpo = s.replace(/\[([^\]]*)\]/g, (m, x) => {
    const k = x.toLowerCase();
    if (CORES[k]) { cor = CORES[k]; return ''; }
    if (/^color\s*\d+$/i.test(x) || /^cor\s*\d+$/i.test(x)) return '';
    const mc = /^(<=|>=|<>|<|>|=)\s*(-?[\d.,]+)$/.exec(x);
    if (mc) { cond = { op: mc[1], v: Number(mc[2].replace(',', '.')) }; return ''; }
    const mm = /^\$([^-\]]*)(-[0-9a-fA-F]+)?$/.exec(x);
    if (mm) return '"' + mm[1] + '"';
    if (/^(h+|m+|s+)$/i.test(x)) return m; // horas acumuladas [h]
    return '';
  });
  return { corpo, cor, cond };
}

const RX_DATA = /(y+|a{2,}|d+|h+|s+|m{3,}|AM\/PM|A\/P|\[h+\]|\[m+\]|\[s+\])/i; // m{3,}: "mmmm" sozinho é o mês por extenso
const tiraLiterais = (s) => s.replace(/"[^"]*"/g, '').replace(/\\./g, '').replace(/_./g, '').replace(/\*./g, '');
export const ehFormatoData = (cod) => !ehGeral(cod) && secoes(cod).some((s) => RX_DATA.test(tiraLiterais(limparSecao(s).corpo)) && !/[0#?]/.test(tiraLiterais(limparSecao(s).corpo).replace(/\.0+/, '')));

function testaCond(c, v) {
  switch (c.op) {
    case '<': return v < c.v; case '>': return v > c.v; case '<=': return v <= c.v; case '>=': return v >= c.v;
    case '=': return v === c.v; case '<>': return v !== c.v; default: return false;
  }
}

/* ---------- datas e horas ---------- */
function formatarData(corpo, v) {
  const { ano, mes, dia } = dataDe(v);
  const temAmPm = /AM\/PM|A\/P/i.test(corpo);
  const hr = horaDe(v);
  const tokens = [];
  let i = 0;
  while (i < corpo.length) {
    const r = corpo.slice(i);
    let m;
    if (r[0] === '"') { const j = corpo.indexOf('"', i + 1); tokens.push({ lit: corpo.slice(i + 1, j < 0 ? undefined : j) }); i = j < 0 ? corpo.length : j + 1; continue; }
    if (r[0] === '\\') { tokens.push({ lit: r[1] || '' }); i += 2; continue; }
    if (r[0] === '_') { tokens.push({ lit: ' ' }); i += 2; continue; }
    if (r[0] === '*') { i += 2; continue; }
    if ((m = /^\[(h+|m+|s+)\]/i.exec(r))) { tokens.push({ dec: m[1].toLowerCase()[0] + 'acum', n: m[1].length }); i += m[0].length; continue; }
    if ((m = /^(AM\/PM|A\/P)/i.exec(r))) { tokens.push({ ampm: m[0] }); i += m[0].length; continue; }
    if ((m = /^(y+|a+)/i.exec(r))) { tokens.push({ dec: 'y', n: m[0].length }); i += m[0].length; continue; }
    if ((m = /^m+/i.exec(r))) { tokens.push({ dec: 'm', n: m[0].length }); i += m[0].length; continue; }
    if ((m = /^d+/i.exec(r))) { tokens.push({ dec: 'd', n: m[0].length }); i += m[0].length; continue; }
    if ((m = /^h+/i.exec(r))) { tokens.push({ dec: 'h', n: m[0].length }); i += m[0].length; continue; }
    if ((m = /^s+/i.exec(r))) { tokens.push({ dec: 's', n: m[0].length }); i += m[0].length; continue; }
    if ((m = /^\.(0+)/.exec(r)) && tokens.some((t) => t.dec === 's')) { tokens.push({ dec: 'frac', n: m[1].length }); i += m[0].length; continue; }
    tokens.push({ lit: r[0] === '.' ? '.' : r[0] }); i++;
  }
  /* "m" depois de hora ou antes de segundo é minuto */
  tokens.forEach((t, k) => {
    if (t.dec !== 'm' || t.n > 2) return;
    const antes = tokens.slice(0, k).reverse().find((x) => x.dec);
    const depois = tokens.slice(k + 1).find((x) => x.dec);
    if ((antes && (antes.dec === 'h' || antes.dec === 'hacum')) || (depois && depois.dec === 's')) t.dec = 'min';
  });
  const p2 = (n) => String(n).padStart(2, '0');
  return tokens.map((t) => {
    if (t.lit != null) return t.lit;
    if (t.ampm) return t.ampm.length > 3 ? (hr.h < 12 ? 'AM' : 'PM') : (hr.h < 12 ? 'A' : 'P');
    switch (t.dec) {
      case 'y': return t.n <= 2 ? p2(ano % 100) : String(ano);
      case 'm': return t.n === 1 ? String(mes) : t.n === 2 ? p2(mes) : t.n === 3 ? MESES_CURTOS[mes - 1] : t.n === 5 ? MESES[mes - 1][0] : MESES[mes - 1];
      case 'd': return t.n === 1 ? String(dia) : t.n === 2 ? p2(dia) : t.n === 3 ? DIAS_CURTOS[diaSemana(v) - 1] : DIAS[diaSemana(v) - 1];
      case 'h': { const h = temAmPm ? ((hr.h + 11) % 12) + 1 : hr.h; return t.n >= 2 ? p2(h) : String(h); }
      case 'min': return t.n >= 2 ? p2(hr.m) : String(hr.m);
      case 's': return t.n >= 2 ? p2(hr.s) : String(hr.s);
      case 'frac': return ',' + String(Math.floor(hr.ms / 1000 * 10 ** t.n)).padStart(t.n, '0');
      case 'hacum': return String(Math.floor(v * 24)).padStart(t.n, '0');
      case 'macum': return String(Math.floor(v * 1440)).padStart(t.n, '0');
      case 'sacum': return String(Math.floor(v * 86400)).padStart(t.n, '0');
      default: return '';
    }
  }).join('');
}

/* ---------- números ---------- */
function agrupar(int) {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatarNumero(corpo, v, comSinal) {
  /* separa literais e o "miolo" numérico */
  let pct = 0;
  let saida = [];
  let num = '';
  let i = 0;
  let jaMiolo = false;
  const lit = (t) => saida.push({ lit: t });
  while (i < corpo.length) {
    const ch = corpo[i];
    if (ch === '"') { const j = corpo.indexOf('"', i + 1); lit(corpo.slice(i + 1, j < 0 ? undefined : j)); i = j < 0 ? corpo.length : j + 1; continue; }
    if (ch === '\\') { lit(corpo[i + 1] || ''); i += 2; continue; }
    if (ch === '_') { lit(' '); i += 2; continue; }
    if (ch === '*') { lit(' '); i += 2; continue; }
    if (ch === '%') { pct++; lit('%'); i++; continue; }
    if (/[0#?.,]/.test(ch) || (/[eE]/.test(ch) && /[+-]/.test(corpo[i + 1] || '') && num)) {
      if (!jaMiolo) { saida.push({ miolo: true }); jaMiolo = true; }
      if (/[eE]/.test(ch)) { num += ch + corpo[i + 1]; i += 2; while (/[0#]/.test(corpo[i] || '')) num += corpo[i++]; continue; }
      num += ch; i++; continue;
    }
    if (ch === '@') { i++; continue; }
    lit(ch); i++;
  }
  if (!jaMiolo) return saida.map((s) => s.lit || '').join('').replace(/^/, comSinal && v < 0 ? '-' : '');
  let x = Math.abs(v) * 100 ** pct;
  /* vírgulas no fim dividem por mil */
  let m = /,+$/.exec(num.replace(/[eE].*$/, ''));
  if (m) { x /= 1000 ** m[0].length; num = num.replace(/,+(?=($|[eE]))/, ''); }
  const temMil = num.includes(',');
  const ciencia = /[eE][+-]/.exec(num);
  const [parteInt, parteDec = ''] = num.replace(/[eE].*$/, '').replace(/,/g, '').split('.');
  const casas = (parteDec.match(/[0#?]/g) || []).length;
  const minDec = (parteDec.match(/0/g) || []).length;
  const minInt = (parteInt.match(/0/g) || []).length;
  let txt;
  if (ciencia) {
    let exp = x === 0 ? 0 : Math.floor(Math.log10(x));
    let mant = x / 10 ** exp;
    if (Number(mant.toFixed(casas)) >= 10) { exp++; mant /= 10; }
    const em = num.slice(ciencia.index + 2).length;
    txt = mant.toFixed(casas).replace('.', ',') + 'E' + (exp < 0 ? '-' : ciencia[0][1] === '+' ? '+' : '') + String(Math.abs(exp)).padStart(Math.max(em, 1), '0');
  } else {
    let [i2, d2 = ''] = x.toFixed(casas).split('.');
    if (minDec < casas) d2 = d2.replace(new RegExp('0{1,' + (casas - minDec) + '}$'), '');
    if (i2 === '0' && minInt === 0) i2 = '';
    else i2 = i2.padStart(minInt, '0');
    if (temMil) i2 = agrupar(i2);
    txt = i2 + (d2 || parteDec.includes('0') ? ',' + d2 : (num.includes('.') && casas === 0 ? ',' : ''));
    if (txt === '' ) txt = minInt ? '0' : '';
  }
  const ehZero = Number(x.toFixed(Math.min(casas, 15))) === 0;
  const sinal = comSinal && v < 0 && !ehZero ? '-' : '';
  return sinal + saida.map((s) => (s.miolo ? txt : s.lit)).join('');
}

/**
 * Valor → texto mostrado na célula. Devolve { t: texto, cor: cor do formato (ou null), num: era número }.
 */
export function formatar(v, cod) {
  if (v == null) return { t: '', cor: null };
  if (v instanceof Erro) return { t: ERRO_PT[v.cod] || v.cod, cor: null, erro: true };
  if (typeof v === 'boolean') return { t: v ? 'VERDADEIRO' : 'FALSO', cor: null };
  if (typeof v === 'string') {
    if (ehGeral(cod)) return { t: v, cor: null };
    const ss = secoes(cod);
    if (ss.length < 4 && !ss.some((s) => s.includes('@'))) return { t: v, cor: null };
    const sec = ss.length >= 4 ? ss[3] : ss.find((s) => s.includes('@'));
    const { corpo, cor } = limparSecao(sec);
    let out = '', i = 0;
    while (i < corpo.length) {
      const ch = corpo[i];
      if (ch === '"') { const j = corpo.indexOf('"', i + 1); out += corpo.slice(i + 1, j < 0 ? undefined : j); i = j < 0 ? corpo.length : j + 1; continue; }
      if (ch === '\\') { out += corpo[i + 1] || ''; i += 2; continue; }
      if (ch === '_') { out += ' '; i += 2; continue; }
      if (ch === '*') { i += 2; continue; }
      out += ch === '@' ? v : ch; i++;
    }
    return { t: out, cor };
  }
  if (typeof v !== 'number') return { t: String(v), cor: null };
  if (!Number.isFinite(v)) return { t: '#NÚM!', cor: null, erro: true };
  if (ehGeral(cod)) return { t: numeroGeral(v), cor: null, num: true };
  const ss = secoes(cod).map(limparSecao);
  let sec, comSinal = true;
  const temCond = ss.some((s) => s.cond);
  if (temCond) {
    sec = ss.find((s) => s.cond && testaCond(s.cond, v)) || ss.find((s) => !s.cond && !s.corpo.includes('@')) || ss[0];
    comSinal = !(sec.cond && v < 0 && sec.cond.op.includes('<'));
  } else if (ss.length === 1 || (ss.length >= 2 && v > 0) || (v === 0 && ss.length === 2)) sec = ss[0];
  else if (v < 0) { sec = ss[1]; comSinal = false; }
  else sec = ss[2] || ss[0];
  if (sec.corpo.includes('@') && !/[0#?]/.test(sec.corpo)) return { t: numeroGeral(v), cor: null, num: true };
  const limpo = tiraLiterais(sec.corpo);
  if (RX_DATA.test(limpo) && !/[0#?]/.test(limpo.replace(/\.0+/, ''))) {
    if (v < 0 || v > 2958465) return { t: '#'.repeat(8), cor: null, num: true };
    return { t: formatarData(sec.corpo, v), cor: sec.cor, num: true };
  }
  if (/^general$/i.test(sec.corpo.trim())) return { t: (comSinal ? '' : '') + numeroGeral(comSinal ? v : Math.abs(v)), cor: sec.cor, num: true };
  return { t: formatarNumero(sec.corpo, v, comSinal), cor: sec.cor, num: true };
}

/* ---------- código em pt-BR (como o Excel mostra) ↔ código guardado ---------- */
/** Anda pelo código fora de aspas, colchetes e escapes, deixando trocar cada caractere. */
function andar(s, troca) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') { const j = s.indexOf('"', i + 1); const fimA = j < 0 ? s.length : j + 1; out += s.slice(i, fimA); i = fimA - 1; continue; }
    if (ch === '[') { const j = s.indexOf(']', i); const fimC = j < 0 ? s.length : j + 1; out += s.slice(i, fimC); i = fimC - 1; continue; }
    if (ch === '\\' || ch === '_' || ch === '*') { out += ch + (s[i + 1] || ''); i++; continue; }
    out += troca(ch, i, s);
  }
  return out;
}
const secaoEhData = (s) => { const c = tiraLiterais(limparSecao(s).corpo); return /(y+|a{2,}|d+|h+|s+|m{3,})/i.test(c) && !/[0#?]/.test(c.replace(/[.,]0+/, '')); };

/** "#,##0.00" → "#.##0,00"; "dd/mm/yyyy" → "dd/mm/aaaa"; "General" → "Geral" */
export function codigoPt(cod) {
  if (ehGeral(cod)) return 'Geral';
  return secoes(cod).map((s) => (secaoEhData(s)
    ? andar(s, (ch) => (ch === 'y' || ch === 'Y' ? 'a' : ch === '.' ? ',' : ch))
    : andar(s, (ch) => (ch === '.' ? ',' : ch === ',' ? '.' : ch)))).join(';');
}
/** O inverso: o que a pessoa digita em pt-BR → código guardado. */
export function codigoDePt(cod) {
  if (ehGeral(cod)) return 'General';
  return secoes(cod).map((s) => (secaoEhData(s)
    ? andar(s, (ch, i, t) => ((ch === 'a' || ch === 'A') && !/^(AM\/PM|A\/P)/i.test(t.slice(i)) && !/(AM\/P|A\/)$/i.test(t.slice(0, i + 1)) ? 'y' : ch === ',' ? '.' : ch))
    : andar(s, (ch) => (ch === '.' ? ',' : ch === ',' ? '.' : ch)))).join(';');
}

/** Mais (delta 1) ou menos (delta -1) casas decimais num código guardado. */
export function mudarCasas(cod, delta, exemplo = 0) {
  let base = cod;
  if (ehGeral(cod)) {
    const casas = typeof exemplo === 'number' && !Number.isInteger(exemplo) ? Math.min(9, (String(exemplo).split('.')[1] || '').length) : 0;
    base = casas ? '0.' + '0'.repeat(casas) : '0';
  }
  return secoes(base).map((s) => {
    if (secaoEhData(s)) return s;
    /* acha a posição do ponto decimal e do último 0/# fora de literais */
    let ponto = -1, ultimo = -1, zerosDepois = 0;
    andar(s, (ch, i) => {
      if (ch === '.') ponto = i;
      if (ch === '0' || ch === '#' || ch === '?') { ultimo = i; if (ponto >= 0) zerosDepois++; }
      return ch;
    });
    if (ultimo < 0) return s;
    if (delta > 0) return s.slice(0, ultimo + 1) + (ponto >= 0 ? '0' : '.0') + s.slice(ultimo + 1);
    if (ponto < 0) return s;
    if (zerosDepois <= 1) return s.slice(0, ponto) + s.slice(ultimo + 1);
    return s.slice(0, ultimo) + s.slice(ultimo + 1);
  }).join(';');
}

export const ehCodigoTexto = (cod) => cod === '@';
