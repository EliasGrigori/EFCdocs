/* Vértice Docs v0.6.24 parte 2 · os filtros do Excel na seta da coluna (só conta, sem tela).
   Critério da coluna (aba.fil.cr[col]):
   - { v: [textos que ficam] }                         lista de valores (já existia)
   - { k: 'txt', op, a }                              op: '=', '<>', 'comeca', 'termina', 'contem', 'naoContem'
   - { k: 'num', op, a, b }                           op: '=', '<>', '>', '>=', '<', '<=', 'entre', 'fora'
   - { k: 'data', op, a, b }                          op: 'hoje', 'ontem', 'amanha', 'estaSemana', 'semanaPassada', 'proximaSemana',
                                                       'esteMes', 'mesPassado', 'proximoMes', 'esteAno', 'anoPassado', 'proximoAno',
                                                       '=', 'antes', 'depois', 'entre' (a e b = número de série do Excel)
   - { k: 'top', n, pct, baixo }                      os N (ou N%) maiores, ou menores
   - { k: 'media', acima }                            acima ou abaixo da média
   - { k: 'cor', fundo } | { k: 'cor', cor }          cor de preenchimento ou da letra
   Ida e volta com o .xlsx: customFilters, top10 e dynamicFilter (a cor fica só no app). */

export const OPS = {
  txt: [['=', 'É igual a'], ['<>', 'É diferente de'], ['comeca', 'Começa com'], ['termina', 'Termina com'], ['contem', 'Contém'], ['naoContem', 'Não contém']],
  num: [['=', 'É igual a'], ['<>', 'É diferente de'], ['>', 'É maior que'], ['>=', 'É maior ou igual a'], ['<', 'É menor que'], ['<=', 'É menor ou igual a'], ['entre', 'Está entre'], ['fora', 'Não está entre']],
  data: [['=', 'É igual a'], ['antes', 'Antes de'], ['depois', 'Depois de'], ['entre', 'Está entre']],
};
export const PERIODOS = [
  ['hoje', 'Hoje'], ['ontem', 'Ontem'], ['amanha', 'Amanhã'],
  ['estaSemana', 'Esta semana'], ['semanaPassada', 'Semana passada'], ['proximaSemana', 'Próxima semana'],
  ['esteMes', 'Este mês'], ['mesPassado', 'Mês passado'], ['proximoMes', 'Próximo mês'],
  ['esteAno', 'Este ano'], ['anoPassado', 'Ano passado'], ['proximoAno', 'Próximo ano'],
];

const semAcento = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const DIA = 86400000, BASE = Date.UTC(1899, 11, 30);
/** Número de série do Excel (dias desde 30/12/1899) de uma data local. */
export const serial = (d) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - BASE) / DIA);
const deSerial = (n) => { const d = new Date(BASE + Math.floor(n) * DIA); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };

/** Faixa [de, até] (números de série) de um período, contado a partir de hoje. Semana de domingo a sábado, como o Excel. */
export function faixaDoPeriodo(op, hoje = new Date()) {
  const h = serial(hoje), d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const sem = h - d.getDay();
  const mes = (k) => { const a = new Date(d.getFullYear(), d.getMonth() + k, 1), b = new Date(d.getFullYear(), d.getMonth() + k + 1, 0); return [serial(a), serial(b)]; };
  const ano = (k) => [serial(new Date(d.getFullYear() + k, 0, 1)), serial(new Date(d.getFullYear() + k, 11, 31))];
  switch (op) {
    case 'hoje': return [h, h];
    case 'ontem': return [h - 1, h - 1];
    case 'amanha': return [h + 1, h + 1];
    case 'estaSemana': return [sem, sem + 6];
    case 'semanaPassada': return [sem - 7, sem - 1];
    case 'proximaSemana': return [sem + 7, sem + 13];
    case 'esteMes': return mes(0);
    case 'mesPassado': return mes(-1);
    case 'proximoMes': return mes(1);
    case 'esteAno': return ano(0);
    case 'anoPassado': return ano(-1);
    case 'proximoAno': return ano(1);
    default: return null;
  }
}

/** Que tipo de dado a coluna tem (decide quais condições o menu oferece): 'data', 'num' ou 'txt'. */
export function tipoDaColuna(amostras) {
  let n = 0, num = 0, data = 0;
  for (const { v, t } of amostras) {
    if (v == null || v === '') continue;
    n++;
    if (typeof v === 'number') { num++; if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(String(t || ''))) data++; }
  }
  if (!n) return 'txt';
  if (data >= n / 2) return 'data';
  if (num >= n / 2) return 'num';
  return 'txt';
}

/** Conta da coluna que o critério precisa (os N maiores, a média). vals = números das linhas de dados. */
export function preparar(cr, vals) {
  if (!cr || !cr.k) return null;
  const nums = vals.filter((x) => typeof x === 'number' && Number.isFinite(x));
  if (cr.k === 'media') return { media: nums.length ? nums.reduce((s, x) => s + x, 0) / nums.length : NaN };
  if (cr.k === 'top') {
    const ord = [...nums].sort((a, b) => (cr.baixo ? a - b : b - a));
    const n = Math.max(1, Math.round(cr.pct ? (ord.length * Number(cr.n || 10)) / 100 : Number(cr.n || 10)));
    return { corte: ord.length ? ord[Math.min(n, ord.length) - 1] : NaN };
  }
  return null;
}

const num = (x) => (x === '' || x == null ? NaN : Number(String(x).replace(',', '.')));

/** A linha passa no critério? v = valor da célula, t = texto mostrado, cor = { fundo, cor }, prep = preparar(). */
export function passaCriterio(cr, v, t, cor, prep) {
  if (!cr) return true;
  if (Array.isArray(cr.v)) return cr.v.includes(t);
  switch (cr.k) {
    case 'txt': {
      const x = semAcento(t), a = semAcento(cr.a);
      switch (cr.op) {
        case '=': return x === a;
        case '<>': return x !== a;
        case 'comeca': return x.startsWith(a);
        case 'termina': return x.endsWith(a);
        case 'contem': return x.includes(a);
        case 'naoContem': return !x.includes(a);
        default: return true;
      }
    }
    case 'num': {
      if (typeof v !== 'number') return cr.op === '<>' || cr.op === 'fora';
      const a = num(cr.a), b = num(cr.b);
      switch (cr.op) {
        case '=': return v === a;
        case '<>': return v !== a;
        case '>': return v > a;
        case '>=': return v >= a;
        case '<': return v < a;
        case '<=': return v <= a;
        case 'entre': return v >= Math.min(a, b) && v <= Math.max(a, b);
        case 'fora': return v < Math.min(a, b) || v > Math.max(a, b);
        default: return true;
      }
    }
    case 'data': {
      if (typeof v !== 'number') return false;
      const d = Math.floor(v), p = faixaDoPeriodo(cr.op);
      if (p) return d >= p[0] && d <= p[1];
      const a = Math.floor(num(cr.a)), b = Math.floor(num(cr.b));
      switch (cr.op) {
        case '=': return d === a;
        case 'antes': return d < a;
        case 'depois': return d > a;
        case 'entre': return d >= Math.min(a, b) && d <= Math.max(a, b);
        default: return true;
      }
    }
    case 'top': return typeof v === 'number' && prep && Number.isFinite(prep.corte) && (cr.baixo ? v <= prep.corte : v >= prep.corte);
    case 'media': return typeof v === 'number' && prep && Number.isFinite(prep.media) && (cr.acima ? v > prep.media : v < prep.media);
    case 'cor': {
      const c = cor || {};
      if (cr.fundo != null) return String(c.fundo || '').toLowerCase() === String(cr.fundo).toLowerCase();
      if (cr.cor != null) return String(c.cor || '').toLowerCase() === String(cr.cor).toLowerCase();
      return true;
    }
    default: return true;
  }
}

/** Frase curta do critério (para o menu e o aviso): "Maior que 10", "Este mês", "Os 10 maiores". */
export function textoDoCriterio(cr) {
  if (!cr) return '';
  if (Array.isArray(cr.v)) return cr.v.length + (cr.v.length === 1 ? ' valor escolhido' : ' valores escolhidos');
  const nome = (lista, op) => (lista.find((x) => x[0] === op) || [op, op])[1];
  const mostra = (x, k) => (k === 'data' && x !== '' && x != null && Number.isFinite(num(x)) ? deSerial(num(x)).toLocaleDateString('pt-BR') : String(x ?? ''));
  switch (cr.k) {
    case 'txt': return `${nome(OPS.txt, cr.op)} "${cr.a}"`;
    case 'num': return cr.op === 'entre' || cr.op === 'fora' ? `${nome(OPS.num, cr.op)} ${cr.a} e ${cr.b}` : `${nome(OPS.num, cr.op)} ${cr.a}`;
    case 'data': return PERIODOS.some((p) => p[0] === cr.op) ? nome(PERIODOS, cr.op) : cr.op === 'entre' ? `Entre ${mostra(cr.a, 'data')} e ${mostra(cr.b, 'data')}` : `${nome(OPS.data, cr.op)} ${mostra(cr.a, 'data')}`;
    case 'top': return `${cr.baixo ? 'Os' : 'Os'} ${cr.n}${cr.pct ? '%' : ''} ${cr.baixo ? 'menores' : 'maiores'}`;
    case 'media': return cr.acima ? 'Acima da média' : 'Abaixo da média';
    case 'cor': return cr.fundo != null ? 'Cor de preenchimento' : 'Cor da letra';
    default: return '';
  }
}

/* ---------- ida e volta com o .xlsx ---------- */
const OP_XLSX = { '=': 'equal', '<>': 'notEqual', '>': 'greaterThan', '>=': 'greaterThanOrEqual', '<': 'lessThan', '<=': 'lessThanOrEqual' };
const XLSX_OP = Object.fromEntries(Object.entries(OP_XLSX).map(([a, b]) => [b, a]));
const DIN = { hoje: 'today', ontem: 'yesterday', amanha: 'tomorrow', estaSemana: 'thisWeek', semanaPassada: 'lastWeek', proximaSemana: 'nextWeek', esteMes: 'thisMonth', mesPassado: 'lastMonth', proximoMes: 'nextMonth', esteAno: 'thisYear', anoPassado: 'lastYear', proximoAno: 'nextYear' };
const NID = Object.fromEntries(Object.entries(DIN).map(([a, b]) => [b, a]));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cf = (op, val) => `<customFilter${op && op !== 'equal' ? ` operator="${op}"` : ''} val="${esc(val)}"/>`;

/** O <filterColumn> do critério (sem o colId), ou null quando o .xlsx não tem como guardar (cor). */
export function criterioParaXlsx(cr) {
  if (!cr || Array.isArray(cr.v)) return null;
  switch (cr.k) {
    case 'txt': {
      const a = String(cr.a ?? '').replace(/([*?~])/g, '~$1');
      const v = { '=': [null, a], '<>': ['notEqual', a], comeca: [null, a + '*'], termina: [null, '*' + a], contem: [null, '*' + a + '*'], naoContem: ['notEqual', '*' + a + '*'] }[cr.op];
      return v ? `<filterColumn><customFilters>${cf(v[0], v[1])}</customFilters></filterColumn>` : null;
    }
    case 'num': case 'data': {
      if (cr.k === 'data' && DIN[cr.op]) return `<filterColumn><dynamicFilter type="${DIN[cr.op]}"/></filterColumn>`;
      const a = num(cr.a), b = num(cr.b);
      if (cr.op === 'entre') return `<filterColumn><customFilters and="1">${cf('greaterThanOrEqual', Math.min(a, b))}${cf('lessThanOrEqual', Math.max(a, b))}</customFilters></filterColumn>`;
      if (cr.op === 'fora') return `<filterColumn><customFilters>${cf('lessThan', Math.min(a, b))}${cf('greaterThan', Math.max(a, b))}</customFilters></filterColumn>`;
      const op = cr.k === 'data' ? { '=': 'equal', antes: 'lessThan', depois: 'greaterThan' }[cr.op] : OP_XLSX[cr.op];
      return op ? `<filterColumn><customFilters>${cf(op, a)}</customFilters></filterColumn>` : null;
    }
    case 'top': return `<filterColumn><top10${cr.baixo ? ' top="0"' : ''}${cr.pct ? ' percent="1"' : ''} val="${Number(cr.n) || 10}"/></filterColumn>`;
    case 'media': return `<filterColumn><dynamicFilter type="${cr.acima ? 'aboveAverage' : 'belowAverage'}"/></filterColumn>`;
    default: return null;
  }
}

/** Lê o miolo de um <filterColumn> do Excel (customFilters, top10, dynamicFilter) e devolve o critério, ou null se não souber. */
export function criterioDoXlsx(dentro) {
  const at = (s) => { const o = {}; s.replace(/(\w+)="([^"]*)"/g, (_, k, v) => { o[k] = v.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); }); return o; };
  let m = /<(?:\w+:)?dynamicFilter\b([^>]*)\/?>/.exec(dentro);
  if (m) {
    const t = at(m[1]).type;
    if (t === 'aboveAverage' || t === 'belowAverage') return { k: 'media', acima: t === 'aboveAverage' };
    if (NID[t]) return { k: 'data', op: NID[t] };
    return null;
  }
  m = /<(?:\w+:)?top10\b([^>]*)\/?>/.exec(dentro);
  if (m) { const a = at(m[1]); return { k: 'top', n: Number(a.val) || 10, pct: a.percent === '1' || a.percent === 'true', baixo: a.top === '0' || a.top === 'false' }; }
  m = /<(?:\w+:)?customFilters\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?customFilters>/.exec(dentro);
  if (!m) return null;
  const e = /and="(1|true)"/.test(m[1]);
  const lista = [...m[2].matchAll(/<(?:\w+:)?customFilter\b([^>]*)\/?>/g)].map((x) => { const a = at(x[1]); return { op: a.operator || 'equal', val: a.val ?? '' }; });
  if (lista.length === 2) {
    const [p, q] = lista, n1 = num(p.val), n2 = num(q.val);
    if (e && p.op === 'greaterThanOrEqual' && q.op === 'lessThanOrEqual' && Number.isFinite(n1) && Number.isFinite(n2)) return { k: 'num', op: 'entre', a: n1, b: n2 };
    if (!e && p.op === 'lessThan' && q.op === 'greaterThan' && Number.isFinite(n1) && Number.isFinite(n2)) return { k: 'num', op: 'fora', a: n1, b: n2 };
    return null;
  }
  if (lista.length !== 1) return null;
  const { op, val } = lista[0];
  const n = num(val);
  if (op !== 'equal' && op !== 'notEqual' && Number.isFinite(n)) return { k: 'num', op: XLSX_OP[op], a: n };
  const curinga = /(^|[^~])[*?]/.test(val);
  if (!curinga) {
    if (Number.isFinite(n) && val.trim() !== '') return { k: 'num', op: XLSX_OP[op], a: n };
    return { k: 'txt', op: op === 'notEqual' ? '<>' : '=', a: val.replace(/~([*?~])/g, '$1') };
  }
  const limpo = (s) => s.replace(/~([*?~])/g, '$1');
  const mm = /^(\*?)((?:[^*?~]|~[*?~])*)(\*?)$/.exec(val);
  if (!mm) return null;
  const a = limpo(mm[2]);
  if (op === 'notEqual') return mm[1] && mm[3] ? { k: 'txt', op: 'naoContem', a } : null;
  if (mm[1] && mm[3]) return { k: 'txt', op: 'contem', a };
  if (mm[3]) return { k: 'txt', op: 'comeca', a };
  if (mm[1]) return { k: 'txt', op: 'termina', a };
  return null;
}
