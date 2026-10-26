/* EFCdocs — Planilha: condições do CONT.SE, SOMASE, MÉDIASES... (">=0,5", "Ajustar", "<>", "L-*"). */
import { lerNumeroPt as lerNumeroPt0, lerDataTexto, ehErro, comparar } from './valores.js';

/* CONT.SES com milhares de linhas lê o mesmo texto muitas vezes: guarda a leitura */
const memoNum = new Map();
function lerNumeroPt(t) {
  if (typeof t !== 'string') return lerNumeroPt0(t);
  if (memoNum.has(t)) return memoNum.get(t);
  const n = lerNumeroPt0(t);
  if (memoNum.size > 50000) memoNum.clear();
  memoNum.set(t, n);
  return n;
}

const escRx = (s) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&');

/** Curingas do Excel: * qualquer coisa, ? uma letra, ~ antes deles = o próprio sinal. */
export function curingaParaRegex(t) {
  let rx = '';
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '~' && (t[i + 1] === '*' || t[i + 1] === '?' || t[i + 1] === '~')) { rx += escRx(t[i + 1]); i++; continue; }
    if (ch === '*') rx += '[\\s\\S]*';
    else if (ch === '?') rx += '[\\s\\S]';
    else rx += escRx(ch);
  }
  return new RegExp('^' + rx + '$', 'i');
}

const temCuringa = (t) => /(^|[^~])[*?]/.test(t);

/** Monta o teste de uma condição. Devolve (valor) => true/false. */
export function criterio(c) {
  if (ehErro(c)) return (v) => ehErro(v) && v.cod === c.cod;
  if (typeof c === 'number') return (v) => (typeof v === 'number' && v === c) || (typeof v === 'string' && lerNumeroPt(v) === c);
  if (typeof c === 'boolean') return (v) => v === c;
  /* condição numa célula vazia: o Excel trata como 0 (CONT.SES e afins não contam as vazias) */
  if (c == null) c = 0;
  if (typeof c === 'number') return (v) => (typeof v === 'number' && v === c) || (typeof v === 'string' && lerNumeroPt(v) === c);
  const s = String(c);
  const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(s);
  const op = m[1] || '=';
  const resto = m[2];
  if (resto === '') {
    if (op === '=') return (v) => v == null || v === '';
    if (op === '<>') return (v) => !(v == null || v === '');
    return () => false;
  }
  let alvo = lerNumeroPt(resto);
  if (alvo == null) alvo = lerDataTexto(resto);
  if (alvo != null) {
    const num = (v) => (typeof v === 'number' ? v : typeof v === 'string' && op === '=' ? lerNumeroPt(v) : null);
    switch (op) {
      case '=': return (v) => num(v) === alvo;
      case '<>': return (v) => num(v) !== alvo;
      case '<': return (v) => typeof v === 'number' && v < alvo;
      case '>': return (v) => typeof v === 'number' && v > alvo;
      case '<=': return (v) => typeof v === 'number' && v <= alvo;
      case '>=': return (v) => typeof v === 'number' && v >= alvo;
      default: return () => false;
    }
  }
  const up = resto.toUpperCase();
  if (up === 'VERDADEIRO' || up === 'FALSO' || up === 'TRUE' || up === 'FALSE') {
    const b = up === 'VERDADEIRO' || up === 'TRUE';
    if (op === '=') return (v) => v === b;
    if (op === '<>') return (v) => v !== b;
  }
  if (op === '=' || op === '<>') {
    const rx = temCuringa(resto) ? curingaParaRegex(resto) : null;
    const baixo = resto.toLowerCase();
    const bate = (v) => typeof v === 'string' && (rx ? rx.test(v) : v === resto || v.toLowerCase() === baixo);
    return op === '=' ? bate : (v) => !bate(v);
  }
  return (v) => {
    if (typeof v !== 'string') return false;
    const r = comparar(v, resto);
    return op === '<' ? r < 0 : op === '>' ? r > 0 : op === '<=' ? r <= 0 : r >= 0;
  };
}
