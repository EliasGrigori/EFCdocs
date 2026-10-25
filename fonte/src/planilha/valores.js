/* EFCdocs — Planilha: valores, erros, conversões e datas do jeito do Excel.
   Vazio = null. Erro = objeto Erro (guarda o código em inglês, como no arquivo do Excel). */

export class Erro {
  constructor(cod) { this.cod = cod; }
  toString() { return ERRO_PT[this.cod] || this.cod; }
}
const mk = (c) => Object.freeze(new Erro(c));
export const E = {
  DIV0: mk('#DIV/0!'), NA: mk('#N/A'), REF: mk('#REF!'), VALOR: mk('#VALUE!'), NOME: mk('#NAME?'),
  NUM: mk('#NUM!'), NULO: mk('#NULL!'), DESPEJAR: mk('#SPILL!'), CALC: mk('#CALC!'),
};
/* como aparece no Excel em português do Brasil */
export const ERRO_PT = {
  '#DIV/0!': '#DIV/0!', '#N/A': '#N/D', '#REF!': '#REF!', '#VALUE!': '#VALOR!', '#NAME?': '#NOME?',
  '#NUM!': '#NÚM!', '#NULL!': '#NULO!', '#SPILL!': '#DESPEJAR!', '#CALC!': '#CALC!',
};
export const ERRO_DE_PT = Object.fromEntries(Object.entries(ERRO_PT).map(([en, pt]) => [pt, en]));
export const erroPorCodigo = (cod) => Object.values(E).find((e) => e.cod === cod) || null;
export const ehErro = (v) => v instanceof Erro;

/* o que cada erro quer dizer, em português simples (painel da célula e dica) */
export const ERRO_EXPLICA = {
  '#DIV/0!': 'a conta divide por zero, ou por uma célula vazia. Confira o divisor, ou use SEERRO para mostrar outra coisa',
  '#N/A': 'o valor procurado não está na lista. Confira se está escrito igual (espaços contam) ou use SENÃODISP',
  '#REF!': 'a conta apontava para uma célula que não existe mais, porque a linha, a coluna ou a aba foi excluída. Refaça a referência',
  '#VALUE!': 'a conta recebeu um texto onde esperava um número. Veja se alguma célula da conta tem letras ou espaços',
  '#NAME?': 'a fórmula usa uma função ou um nome que não existe. Confira a grafia',
  '#NUM!': 'o número não serve para esta conta, como a raiz de um número negativo',
  '#NULL!': 'as duas faixas da conta não se cruzam. Entre faixas use ponto e vírgula (;)',
  '#SPILL!': 'o resultado ocupa várias células e alguma delas já tem conteúdo. Esvazie as células de baixo ou do lado',
  '#CALC!': 'a conta não chegou a um resultado, como um FILTRO que não achou nenhum item',
};

/* ---------- números no jeito do Brasil ---------- */

/** Lê número digitado em pt-BR ("1.234,5", "-0,25", "1,5E+3"). null se não for número. */
export function lerNumeroPt(t) {
  let s = String(t).trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).trim(); }
  if (!/^[+-]?(\d{1,3}(\.\d{3})+|\d+)?(,\d+)?([eE][+-]?\d+)?$/.test(s) || !/\d/.test(s)) return null;
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

/** Número para texto no formato "Geral" do Excel em pt-BR (até 11 dígitos significativos de largura). */
export function numeroGeral(n) {
  if (!Number.isFinite(n)) return '#NÚM!';
  if (n === 0) return '0';
  const abs = Math.abs(n);
  let s;
  if (abs >= 1e11 || abs < 1e-9) {
    s = n.toExponential(5).replace(/\.?0+e/, 'e');
    const [m, e] = s.split('e');
    const ex = Number(e);
    s = m + 'E' + (ex < 0 ? '-' : '+') + String(Math.abs(ex)).padStart(2, '0');
  } else {
    const inteiros = Math.floor(abs).toString().length;
    const casas = Math.max(0, 10 - inteiros);
    s = String(Number(n.toFixed(casas)));
    if (/e/.test(s)) s = n.toFixed(casas).replace(/\.?0+$/, '');
  }
  return s.replace('.', ',');
}

/** Número completo para editar (como a barra de fórmulas do Excel): até 15 dígitos, sem notação científica quando dá. */
export function numeroCheio(n) {
  if (!Number.isFinite(n)) return '#NÚM!';
  if (n === 0) return '0';
  const r = Number(n.toPrecision(15));
  const s = String(r);
  if (/e/i.test(s)) return numeroGeral(n);
  return s.replace('.', ',');
}

/* ---------- conversões (as regras do Excel) ---------- */

export function aNumero(v) {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v instanceof Erro) return v;
  if (typeof v === 'string') {
    if (v.trim() === '') return E.VALOR;
    const n = lerNumeroPt(v.replace(/%$/, ''));
    if (n != null) return /%$/.test(v.trim()) ? n / 100 : n;
    const d = lerDataTexto(v);
    if (d != null) return d;
    return E.VALOR;
  }
  return E.VALOR;
}

export function aTexto(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return numeroGeral(v);
  if (typeof v === 'boolean') return v ? 'VERDADEIRO' : 'FALSO';
  if (v instanceof Erro) return v;
  return String(v);
}

export function aLogico(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v == null) return false;
  if (v instanceof Erro) return v;
  const t = String(v).trim().toUpperCase();
  if (t === 'VERDADEIRO' || t === 'TRUE') return true;
  if (t === 'FALSO' || t === 'FALSE') return false;
  return E.VALOR;
}

/** Ordem do Excel: números < texto < lógicos; texto sem diferença de maiúsculas. */
const ordemTipo = (v) => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : typeof v === 'boolean' ? 2 : 3);
export function comparar(a, b) {
  if (a == null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b == null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  const ta = ordemTipo(a), tb = ordemTipo(b);
  if (ta !== tb) return ta - tb;
  if (ta === 1) {
    const x = a.toLocaleLowerCase('pt-BR'), y = b.toLocaleLowerCase('pt-BR');
    return x < y ? -1 : x > y ? 1 : 0;
  }
  if (ta === 2) return (a ? 1 : 0) - (b ? 1 : 0);
  return a < b ? -1 : a > b ? 1 : 0;
}

/* ---------- datas: a mesma contagem do Excel (sistema 1900, com o 29/02/1900 que não existiu) ---------- */

const DIA = 864e5;
const BASE = Date.UTC(1899, 11, 30);

/** Data → número de série do Excel. Mês e dia podem passar do limite (como no DATA do Excel). */
export function serialDe(ano, mes, dia) {
  let a = ano;
  if (a >= 0 && a < 1900) a += 1900;
  const ms = Date.UTC(a, mes - 1, 1) + (dia - 1) * DIA;
  let s = Math.round((ms - BASE) / DIA);
  if (s < 61) s -= 1; // antes de 01/03/1900 o Excel conta um dia a menos (por causa do 29/02/1900)
  return s;
}

/** Série → { ano, mes, dia }. 60 é o 29/02/1900 que só o Excel tem. */
export function dataDe(serial) {
  const n = Math.floor(serial);
  if (n === 60) return { ano: 1900, mes: 2, dia: 29 };
  const d = new Date(BASE + (n < 60 ? n + 1 : n) * DIA);
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

/** Parte da hora (0 a 1) → { h, m, s, ms } */
export function horaDe(serial) {
  let f = serial - Math.floor(serial);
  let tot = Math.round(f * 86400000);
  if (tot >= 86400000) tot = 0;
  const h = Math.floor(tot / 3600000); tot -= h * 3600000;
  const m = Math.floor(tot / 60000); tot -= m * 60000;
  const s = Math.floor(tot / 1000);
  return { h, m, s, ms: tot - s * 1000 };
}

/** 1 = domingo ... 7 = sábado (padrão do DIA.DA.SEMANA) */
export const diaSemana = (serial) => ((((Math.floor(serial) - 1) % 7) + 7) % 7) + 1;

export function serialAgora(d = new Date()) {
  const base = serialDe(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return base + (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400;
}
export const serialHoje = (d = new Date()) => serialDe(d.getFullYear(), d.getMonth() + 1, d.getDate());

export const diasNoMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

/** Data válida de verdade? (31/02 não é) */
export const dataValida = (a, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= diasNoMes(a, m) && a >= 1900 && a <= 9999;

/** "25/10/2026", "25/10/26", "25/10" (ano atual), "2026-10-25" → série; null se não for data. */
export function lerDataTexto(t, hoje = new Date()) {
  const s = String(t).trim();
  let m = /^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?$/.exec(s);
  let a, me, d;
  if (m) {
    d = +m[1]; me = +m[2];
    a = m[3] == null ? hoje.getFullYear() : m[3].length === 2 ? (+m[3] < 30 ? 2000 + +m[3] : 1900 + +m[3]) : +m[3];
  } else if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) {
    a = +m[1]; me = +m[2]; d = +m[3];
  } else return null;
  if (!dataValida(a, me, d)) return null;
  return serialDe(a, me, d);
}

/** "14:30", "14:30:15", "9:05" → fração do dia; null se não for hora. */
export function lerHoraTexto(t) {
  const m = /^(\d{1,4}):(\d{2})(?::(\d{2}))?$/.exec(String(t).trim());
  if (!m) return null;
  const h = +m[1], mi = +m[2], se = +(m[3] || 0);
  if (mi > 59 || se > 59 || h > 9999) return null;
  return (h * 3600 + mi * 60 + se) / 86400;
}
