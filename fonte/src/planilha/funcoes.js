/* EFCdocs — Planilha: as funções (cerca de 120), com as regras do Excel.
   Cada função recebe os nós da conta (args) e o contexto (ctx) do motor. */
import { E, Erro, ehErro, aNumero, aTexto, aLogico, comparar, serialDe, dataDe, horaDe, diaSemana, diasNoMes,
  serialHoje, serialAgora, lerDataTexto, lerHoraTexto, lerNumeroPt } from './valores.js';
import { Ref, Mat, ehRef, ehMat, ehMultiplo } from './tipos.js';
import { criterio, curingaParaRegex } from './criterios.js';
import { formatar, codigoDePt } from './formato.js';
import { lerEndereco, MAX_LIN, MAX_COL } from './ref.js';

const ok = (n) => (typeof n === 'number' && !Number.isFinite(n) ? E.NUM : n);

/* ---------- ajudantes ---------- */

/** Junta tamanhos para "derramar" uma função de valor único sobre matrizes (como o Excel 365). */
function aplicarEmMatriz(vals, fn, ctx) {
  if (!vals.some(ehMultiplo)) return fn(...vals.map((v) => ctx.deref(v)));
  const ms = vals.map((v) => (ehMultiplo(v) ? ctx.mat(v) : null));
  const L = Math.max(...ms.map((m, i) => (m ? m.linhas : 1)));
  const C = Math.max(...ms.map((m, i) => (m ? m.colunas : 1)));
  const esc = vals.map((v, i) => (ms[i] ? null : ctx.deref(v)));
  return Mat.de(L, C, (i, j) => {
    const a = vals.map((v, k) => {
      const m = ms[k];
      if (!m) return esc[k];
      const ii = m.linhas === 1 ? 0 : i, jj = m.colunas === 1 ? 0 : j;
      if (ii >= m.linhas || jj >= m.colunas) return E.NA;
      return m.d[ii][jj];
    });
    return fn(...a);
  });
}

/** Função de valores únicos: lê os argumentos, derrama sobre matrizes e devolve o primeiro erro. */
const esc = (fn, { aceitaErro = false } = {}) => (args, ctx) => {
  const vals = args.map((a) => (a.t === 'vazio' ? null : ctx.av(a)));
  return aplicarEmMatriz(vals, (...xs) => {
    if (!aceitaErro) { const e = xs.find(ehErro); if (e) return e; }
    return ok(fn(...xs));
  }, ctx);
};

/** Converte para número ou devolve o erro (para usar com "if (ehErro(x)) return x"). */
const N = (v) => aNumero(v);
const NI = (v) => { const n = aNumero(v); return ehErro(n) ? n : Math.trunc(n); };

/** Os números dos argumentos, com as regras do SOMA: em faixa só número conta; digitado direto, converte. */
function numeros(args, ctx, { ignorarErros = false, filtroCelula = null } = {}) {
  const out = [];
  for (const a of args) {
    if (a.t === 'vazio') continue;
    const v = ctx.av(a);
    if (ehRef(v) || ehMat(v)) {
      let erro = null;
      ctx.cada(v, (x, l, c) => {
        if (erro) return;
        if (filtroCelula && ehRef(v) && !filtroCelula(v.abaId, l, c)) return;
        if (typeof x === 'number') out.push(x);
        else if (ehErro(x) && !ignorarErros) erro = x;
      });
      if (erro) return erro;
    } else {
      if (ehErro(v)) { if (ignorarErros) continue; return v; }
      if (v == null) continue;
      const n = aNumero(v);
      if (ehErro(n)) return n;
      out.push(n);
    }
  }
  return out;
}

const soma = (xs) => { let s = 0; for (const x of xs) s += x; return s; };
const media = (xs) => (xs.length ? soma(xs) / xs.length : E.DIV0);
function variancia(xs, amostra) {
  const n = xs.length;
  if (n < (amostra ? 2 : 1)) return E.DIV0;
  const m = soma(xs) / n;
  let s = 0;
  for (const x of xs) s += (x - m) ** 2;
  return s / (amostra ? n - 1 : n);
}
const mediana = (xs) => {
  if (!xs.length) return E.NUM;
  const o = [...xs].sort((a, b) => a - b);
  const m = o.length >> 1;
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};
function percentilInc(xs, k) {
  if (!xs.length || k < 0 || k > 1) return E.NUM;
  const o = [...xs].sort((a, b) => a - b);
  const pos = k * (o.length - 1);
  const b = Math.floor(pos);
  return o[b] + (pos - b) * ((o[b + 1] ?? o[b]) - o[b]);
}
function moda(xs) {
  const cont = new Map();
  let melhor = null, max = 1;
  for (const x of xs) {
    const n = (cont.get(x) || 0) + 1;
    cont.set(x, n);
    if (n > max) { max = n; melhor = x; }
  }
  if (melhor == null) return E.NA;
  /* empate: o que apareceu primeiro */
  for (const x of xs) if (cont.get(x) === max) return x;
  return melhor;
}

/** Arredondamento do Excel (metade para longe do zero), sem o erro do ponto flutuante (2,675 → 2,68). */
function arred(n, d, modo = 'meio') {
  const f = 10 ** d;
  const x = Number((Math.abs(n) * f).toPrecision(15));
  const r = modo === 'cima' ? Math.ceil(x) : modo === 'baixo' ? Math.floor(x) : Math.floor(x + 0.5);
  return (Math.sign(n) * r) / f;
}

/** Matrizes do mesmo tamanho para funções com várias faixas (SOMASES, CONT.SES...). */
function mesmasFaixas(vals, ctx) {
  const refs = vals.filter(ehRef);
  const limite = refs.length ? ctx.ultimaLinha(refs) : null;
  return vals.map((v) => ctx.mat(v, limite));
}

/** Faixa do mesmo tamanho a partir do canto (regra do SOMASE quando o intervalo_soma é menor). */
function redimensionar(v, lin, col, ctx) {
  if (ehRef(v)) return ctx.mat(new Ref(v.abaId, v.l1, v.c1, Math.min(MAX_LIN - 1, v.l1 + lin - 1), Math.min(MAX_COL - 1, v.c1 + col - 1)));
  return ctx.mat(v);
}

/** Lista plana (1 dimensão) de uma faixa ou matriz. */
function vetor(v, ctx, limite) {
  const m = ctx.mat(v, limite);
  if (m.linhas === 1) return { lista: m.d[0], horizontal: true, m };
  if (m.colunas === 1) return { lista: m.d.map((r) => r[0]), horizontal: false, m };
  return null;
}

/** Comparação de busca (sem diferenciar maiúsculas; com curingas se pedir). */
function igualBusca(a, b, curinga) {
  if (curinga && typeof b === 'string' && typeof a === 'string' && /[*?~]/.test(b)) return curingaParaRegex(b).test(a);
  if (typeof a === 'string' && typeof b === 'string') return a.toLocaleLowerCase('pt-BR') === b.toLocaleLowerCase('pt-BR');
  return a === b;
}
const mesmoTipo = (a, b) => (typeof a === 'number' && typeof b === 'number') || (typeof a === 'string' && typeof b === 'string') || (typeof a === 'boolean' && typeof b === 'boolean');

/** Busca aproximada em lista ordenada (crescente): o último que é <= alvo. */
function buscaAproximada(lista, alvo) {
  let achou = -1;
  for (let i = 0; i < lista.length; i++) {
    const v = lista[i];
    if (v == null || !mesmoTipo(v, alvo)) continue;
    if (comparar(v, alvo) <= 0) achou = i;
    else break;
  }
  return achou;
}

/** Busca do PROCX/CORRESPX. Devolve o índice ou -1. */
function buscaX(lista, alvo, modo, sentido) {
  const ordem = sentido < 0 ? [...lista.keys()].reverse() : [...lista.keys()];
  if (modo === 0 || modo === 2) {
    for (const i of ordem) if (lista[i] != null && igualBusca(lista[i], alvo, modo === 2)) return i;
    return -1;
  }
  let melhor = -1;
  for (const i of ordem) {
    const v = lista[i];
    if (v == null || !mesmoTipo(v, alvo)) continue;
    const r = comparar(v, alvo);
    if (r === 0) return i;
    if (modo === -1 && r < 0 && (melhor < 0 || comparar(v, lista[melhor]) > 0)) melhor = i;
    if (modo === 1 && r > 0 && (melhor < 0 || comparar(v, lista[melhor]) < 0)) melhor = i;
  }
  return melhor;
}

function linhaOuColuna(v, idx, horizontal, ctx) {
  if (ehRef(v)) {
    if (horizontal) return new Ref(v.abaId, v.l1, v.c1 + idx, v.l2, v.c1 + idx);
    return new Ref(v.abaId, v.l1 + idx, v.c1, v.l1 + idx, v.c2);
  }
  const m = ctx.mat(v);
  if (horizontal) return new Mat(m.d.map((r) => [r[idx]]));
  return new Mat([m.d[idx]]);
}

/* ---------- datas ---------- */
const dataNum = (v) => { const n = aNumero(v); if (ehErro(n)) return n; if (n < 0) return E.NUM; return Math.floor(n); };

function numSemana(s, tipo) {
  const { ano } = dataDe(s);
  if (tipo === 21) {
    const d = new Date(Date.UTC(...(() => { const x = dataDe(s); return [x.ano, x.mes - 1, x.dia]; })()));
    const dia = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dia + 3);
    const primeiraQuinta = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    return 1 + Math.round(((d - primeiraQuinta) / 864e5 - 3 + ((primeiraQuinta.getUTCDay() + 6) % 7)) / 7);
  }
  const inicio = { 1: 1, 17: 1, 2: 2, 11: 2, 12: 3, 13: 4, 14: 5, 15: 6, 16: 7 }[tipo];
  if (!inicio) return E.NUM;
  const jan1 = serialDe(ano, 1, 1);
  const dsJan1 = diaSemana(jan1); // 1 = domingo
  const desloc = (dsJan1 - inicio + 7) % 7;
  return Math.floor((Math.floor(s) - jan1 + desloc) / 7) + 1;
}

function diaDaSemana(s, tipo) {
  const d = diaSemana(s); // 1 dom ... 7 sáb
  switch (tipo) {
    case 1: case 17: return d;
    case 2: case 11: return ((d + 5) % 7) + 1;
    case 3: return (d + 5) % 7;
    case 12: return ((d + 4) % 7) + 1;
    case 13: return ((d + 3) % 7) + 1;
    case 14: return ((d + 2) % 7) + 1;
    case 15: return ((d + 1) % 7) + 1;
    case 16: return (d % 7) + 1;
    default: return E.NUM;
  }
}

function feriadosDe(node, ctx) {
  const s = new Set();
  if (!node || node.t === 'vazio') return s;
  const v = ctx.av(node);
  let erro = null;
  ctx.cada(v, (x) => { if (typeof x === 'number') s.add(Math.floor(x)); else if (ehErro(x)) erro = x; });
  return erro || s;
}
const util = (d, fer) => { const w = diaSemana(d); return w !== 1 && w !== 7 && !fer.has(d); };

function somarMeses(s, meses, fimDoMes) {
  const { ano, mes, dia } = dataDe(s);
  const tot = ano * 12 + (mes - 1) + Math.trunc(meses);
  const a = Math.floor(tot / 12), m = (tot % 12) + 1;
  const dm = diasNoMes(a, m);
  return serialDe(a, m, fimDoMes ? dm : Math.min(dia, dm));
}

/* ---------- texto ---------- */
const T = (v) => aTexto(v);
function capitalizar(t) {
  return t.toLocaleLowerCase('pt-BR').replace(/(^|[^A-Za-zÀ-ÿ])([a-zà-ÿ])/g, (m, a, b) => a + b.toLocaleUpperCase('pt-BR'));
}

/* ---------- a tabela de funções ---------- */
export const IMPL = {
  /* Somar e contar */
  SUM: (args, ctx) => { const xs = numeros(args, ctx); return ehErro(xs) ? xs : soma(xs); },
  PRODUCT: (args, ctx) => { const xs = numeros(args, ctx); return ehErro(xs) ? xs : xs.reduce((a, b) => a * b, xs.length ? 1 : 0); },
  SUMIF: (args, ctx) => {
    const intervalo = ctx.av(args[0]);
    const cond = ctx.deref(ctx.av(args[1]));
    const m = ctx.mat(intervalo);
    const s = args[2] && args[2].t !== 'vazio' ? redimensionar(ctx.av(args[2]), m.linhas, m.colunas, ctx) : m;
    const teste = criterio(cond);
    let tot = 0;
    for (let i = 0; i < m.linhas; i++) for (let j = 0; j < m.colunas; j++) {
      if (!teste(m.d[i][j])) continue;
      const x = s.d[i] ? s.d[i][j] : null;
      if (ehErro(x)) return x;
      if (typeof x === 'number') tot += x;
    }
    return tot;
  },
  SUMIFS: (args, ctx) => condicional(args, ctx, 1, (xs) => soma(xs)),
  AVERAGEIF: (args, ctx) => {
    const intervalo = ctx.av(args[0]);
    const teste = criterio(ctx.deref(ctx.av(args[1])));
    const m = ctx.mat(intervalo);
    const s = args[2] && args[2].t !== 'vazio' ? redimensionar(ctx.av(args[2]), m.linhas, m.colunas, ctx) : m;
    const xs = [];
    for (let i = 0; i < m.linhas; i++) for (let j = 0; j < m.colunas; j++) {
      if (!teste(m.d[i][j])) continue;
      const x = s.d[i] ? s.d[i][j] : null;
      if (ehErro(x)) return x;
      if (typeof x === 'number') xs.push(x);
    }
    return media(xs);
  },
  AVERAGEIFS: (args, ctx) => condicional(args, ctx, 1, (xs) => media(xs)),
  MAXIFS: (args, ctx) => condicional(args, ctx, 1, (xs) => (xs.length ? Math.max(...xs) : 0)),
  MINIFS: (args, ctx) => condicional(args, ctx, 1, (xs) => (xs.length ? Math.min(...xs) : 0)),
  COUNTIF: (args, ctx) => {
    const m = ctx.mat(ctx.av(args[0]));
    const condV = ctx.av(args[1]);
    const conta = (cond) => { const t = criterio(cond); let n = 0; for (const r of m.d) for (const x of r) if (t(x)) n++; return n; };
    if (ehMultiplo(condV)) { const cm = ctx.mat(condV); return Mat.de(cm.linhas, cm.colunas, (i, j) => conta(cm.d[i][j])); }
    return conta(ctx.deref(condV));
  },
  COUNTIFS: (args, ctx) => condicional(args, ctx, 0, (xs, n) => n),
  SUMPRODUCT: (args, ctx) => {
    const ms = args.map((a) => ctx.mat(ctx.av(a)));
    const L = ms[0].linhas, C = ms[0].colunas;
    if (ms.some((m) => m.linhas !== L || m.colunas !== C)) return E.VALOR;
    let tot = 0;
    for (let i = 0; i < L; i++) for (let j = 0; j < C; j++) {
      let p = 1;
      for (const m of ms) {
        const x = m.d[i][j];
        if (ehErro(x)) return x;
        p *= typeof x === 'number' ? x : 0;
      }
      tot += p;
    }
    return tot;
  },
  COUNT: (args, ctx) => {
    let n = 0;
    for (const a of args) {
      if (a.t === 'vazio') continue;
      const v = ctx.av(a);
      if (ehRef(v) || ehMat(v)) ctx.cada(v, (x) => { if (typeof x === 'number') n++; });
      else if (typeof v === 'number' || typeof v === 'boolean' || (typeof v === 'string' && !ehErro(aNumero(v)))) n++;
    }
    return n;
  },
  COUNTA: (args, ctx) => {
    let n = 0;
    for (const a of args) {
      if (a.t === 'vazio') { n++; continue; }
      const v = ctx.av(a);
      if (ehRef(v) || ehMat(v)) ctx.cada(v, (x) => { if (x != null) n++; });
      else n++;
    }
    return n;
  },
  COUNTBLANK: (args, ctx) => {
    const v = ctx.av(args[0]);
    if (!ehRef(v)) return E.VALOR;
    let cheias = 0;
    ctx.cada(v, (x) => { if (x != null && x !== '') cheias++; });
    return v.linhas * v.colunas - cheias;
  },
  SUBTOTAL: (args, ctx) => {
    const cod = NI(ctx.deref(ctx.av(args[0])));
    if (ehErro(cod)) return cod;
    const ocultas = cod > 100;
    const base = cod % 100;
    const filtro = (aba, l, c) => !ctx.ehSubtotal(aba, l, c) && !(ocultas && ctx.linhaOculta(aba, l));
    return agregarCom(base, args.slice(1), ctx, { filtroCelula: filtro });
  },
  AGGREGATE: (args, ctx) => {
    const cod = NI(ctx.deref(ctx.av(args[0])));
    const op = NI(ctx.deref(ctx.av(args[1])));
    if (ehErro(cod)) return cod;
    if (ehErro(op)) return op;
    const ignoraErros = [2, 3, 6, 7].includes(op);
    const ignoraOcultas = [1, 3, 5, 7].includes(op);
    const ignoraSub = op <= 3;
    const filtro = (aba, l, c) => !(ignoraSub && ctx.ehSubtotal(aba, l, c)) && !(ignoraOcultas && ctx.linhaOculta(aba, l));
    if (cod >= 14 && cod <= 17) {
      const xs = numeros([args[2]], ctx, { ignorarErros: ignoraErros, filtroCelula: filtro });
      if (ehErro(xs)) return xs;
      const k = N(ctx.deref(ctx.av(args[3] || { t: 'vazio' })));
      if (ehErro(k)) return k;
      const o = [...xs].sort((a, b) => a - b);
      if (cod === 14) return k >= 1 && k <= o.length ? o[o.length - Math.ceil(k)] : E.NUM;
      if (cod === 15) return k >= 1 && k <= o.length ? o[Math.ceil(k) - 1] : E.NUM;
      if (cod === 16) return percentilInc(xs, k);
      return percentilInc(xs, Math.trunc(k) / 4);
    }
    return agregarCom(cod, args.slice(2), ctx, { filtroCelula: filtro, ignorarErros: ignoraErros });
  },

  /* Médias e estatística */
  AVERAGE: (args, ctx) => { const xs = numeros(args, ctx); return ehErro(xs) ? xs : media(xs); },
  MEDIAN: (args, ctx) => { const xs = numeros(args, ctx); return ehErro(xs) ? xs : mediana(xs); },
  MAX: (args, ctx) => { const xs = numeros(args, ctx); return ehErro(xs) ? xs : xs.length ? Math.max(...xs) : 0; },
  MIN: (args, ctx) => { const xs = numeros(args, ctx); return ehErro(xs) ? xs : xs.length ? Math.min(...xs) : 0; },
  LARGE: (args, ctx) => kEsimo(args, ctx, true),
  SMALL: (args, ctx) => kEsimo(args, ctx, false),
  'STDEV.S': (args, ctx) => { const xs = numeros(args, ctx); if (ehErro(xs)) return xs; const v = variancia(xs, true); return ehErro(v) ? v : Math.sqrt(v); },
  STDEV: (args, ctx) => IMPL['STDEV.S'](args, ctx),
  'STDEV.P': (args, ctx) => { const xs = numeros(args, ctx); if (ehErro(xs)) return xs; const v = variancia(xs, false); return ehErro(v) ? v : Math.sqrt(v); },
  'VAR.S': (args, ctx) => { const xs = numeros(args, ctx); return ehErro(xs) ? xs : variancia(xs, true); },
  'VAR.P': (args, ctx) => { const xs = numeros(args, ctx); return ehErro(xs) ? xs : variancia(xs, false); },
  'MODE.SNGL': (args, ctx) => { const xs = numeros(args, ctx); return ehErro(xs) ? xs : moda(xs); },
  'RANK.EQ': (args, ctx) => {
    const n = N(ctx.deref(ctx.av(args[0])));
    if (ehErro(n)) return n;
    const xs = numeros([args[1]], ctx);
    if (ehErro(xs)) return xs;
    const ordem = args[2] && args[2].t !== 'vazio' ? N(ctx.deref(ctx.av(args[2]))) : 0;
    if (ehErro(ordem)) return ordem;
    if (!xs.includes(n)) return E.NA;
    return 1 + xs.filter((x) => (ordem ? x < n : x > n)).length;
  },
  'PERCENTILE.INC': (args, ctx) => { const xs = numeros([args[0]], ctx); if (ehErro(xs)) return xs; const k = N(ctx.deref(ctx.av(args[1]))); return ehErro(k) ? k : percentilInc(xs, k); },
  'QUARTILE.INC': (args, ctx) => {
    const xs = numeros([args[0]], ctx); if (ehErro(xs)) return xs;
    const q = NI(ctx.deref(ctx.av(args[1]))); if (ehErro(q)) return q;
    return q < 0 || q > 4 ? E.NUM : percentilInc(xs, q / 4);
  },

  /* nomes antigos do Excel (iguais aos novos) */
  MODE: (args, ctx) => IMPL['MODE.SNGL'](args, ctx),
  RANK: (args, ctx) => IMPL['RANK.EQ'](args, ctx),
  PERCENTILE: (args, ctx) => IMPL['PERCENTILE.INC'](args, ctx),
  QUARTILE: (args, ctx) => IMPL['QUARTILE.INC'](args, ctx),
  CORREL: (args, ctx) => {
    if (args.length !== 2) return E.VALOR;
    const [va, vb] = [ctx.av(args[0]), ctx.av(args[1])];
    const tem = (v) => ehRef(v) || ehMat(v);
    if (!tem(va) || !tem(vb)) return E.NA;
    const A = ctx.mat(va), B = ctx.mat(vb);
    if (A.linhas !== B.linhas || A.colunas !== B.colunas) return E.NA;
    /* só entram os pares em que os dois lados são número (texto e vazio saem, como no Excel) */
    const xs = [], ys = [];
    for (let i = 0; i < A.linhas; i++) for (let j = 0; j < A.colunas; j++) {
      const x = A.d[i][j], y = B.d[i][j];
      if (ehErro(x)) return x;
      if (ehErro(y)) return y;
      if (typeof x === 'number' && typeof y === 'number') { xs.push(x); ys.push(y); }
    }
    if (xs.length < 2) return E.DIV0;
    const mx = soma(xs) / xs.length, my = soma(ys) / ys.length;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < xs.length; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
    if (sxx === 0 || syy === 0) return E.DIV0;
    return Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
  },
  FREQUENCY: (args, ctx) => {
    if (args.length !== 2) return E.VALOR;
    const dados = numeros([args[0]], ctx); if (ehErro(dados)) return dados;
    const lim = numeros([args[1]], ctx); if (ehErro(lim)) return lim;
    /* cada limite conta os valores acima do limite menor anterior e até ele; o último item conta o que passa de todos */
    const ord = [...new Set(lim)].sort((a, b) => a - b);
    const conta = new Map(ord.map((x) => [x, 0]));
    let acima = 0;
    for (const x of dados) {
      const alvo = ord.find((l) => x <= l);
      if (alvo === undefined) acima++; else conta.set(alvo, conta.get(alvo) + 1);
    }
    const col = [];
    const visto = new Set();
    for (const l of lim) { if (visto.has(l)) col.push(0); else { visto.add(l); col.push(conta.get(l)); } }
    col.push(acima);
    return Mat.de(col.length, 1, (i) => col[i]);
  },

  /* Lógica (preguiçosas: só calculam o lado que precisa) */
  IF: (args, ctx) => {
    const teste = ctx.av(args[0]);
    const lado = (b) => {
      const n = b ? args[1] : args[2];
      if (!n) return b ? true : false;
      if (n.t === 'vazio') return 0;
      return ctx.av(n);
    };
    if (ehMultiplo(teste)) {
      const m = ctx.mat(teste);
      const sim = lado(true), nao = lado(false);
      return aplicarEmMatriz([m, sim, nao], (t, s, n) => { if (ehErro(t)) return t; const b = aLogico(t); return ehErro(b) ? b : b ? s : n; }, ctx);
    }
    const t = ctx.deref(teste);
    if (ehErro(t)) return t;
    const b = aLogico(t);
    if (ehErro(b)) return b;
    return lado(b);
  },
  IFS: (args, ctx) => {
    if (args.length % 2) return E.NA;
    for (let i = 0; i < args.length; i += 2) {
      const t = ctx.deref(ctx.av(args[i]));
      if (ehErro(t)) return t;
      const b = aLogico(t);
      if (ehErro(b)) return b;
      if (b) return ctx.av(args[i + 1]);
    }
    return E.NA;
  },
  AND: (args, ctx) => logicos(args, ctx, (xs) => xs.every(Boolean)),
  OR: (args, ctx) => logicos(args, ctx, (xs) => xs.some(Boolean)),
  XOR: (args, ctx) => logicos(args, ctx, (xs) => xs.filter(Boolean).length % 2 === 1),
  NOT: esc((v) => { const b = aLogico(v); return ehErro(b) ? b : !b; }),
  IFERROR: (args, ctx) => {
    const v = ctx.av(args[0]);
    if (ehMultiplo(v)) {
      const alt = ctx.av(args[1]);
      return aplicarEmMatriz([ctx.mat(v), alt], (x, a) => (ehErro(x) ? a : x), ctx);
    }
    const x = ctx.deref(v);
    return ehErro(x) ? (args[1].t === 'vazio' ? 0 : ctx.av(args[1])) : v;
  },
  IFNA: (args, ctx) => {
    const v = ctx.av(args[0]);
    if (ehMultiplo(v)) {
      const alt = ctx.av(args[1]);
      return aplicarEmMatriz([ctx.mat(v), alt], (x, a) => (ehErro(x) && x.cod === '#N/A' ? a : x), ctx);
    }
    const x = ctx.deref(v);
    return ehErro(x) && x.cod === '#N/A' ? (args[1].t === 'vazio' ? 0 : ctx.av(args[1])) : v;
  },
  SWITCH: (args, ctx) => {
    const v = ctx.deref(ctx.av(args[0]));
    if (ehErro(v)) return v;
    let i = 1;
    for (; i + 1 < args.length; i += 2) {
      const c = ctx.deref(ctx.av(args[i]));
      if (ehErro(c)) return c;
      if (mesmoTipo(v, c) && comparar(v, c) === 0) return ctx.av(args[i + 1]);
    }
    return i < args.length ? ctx.av(args[i]) : E.NA;
  },
  CHOOSE: (args, ctx) => {
    const iv = ctx.av(args[0]);
    if (ehMultiplo(iv)) {
      const opcoes = args.slice(1).map((a) => ctx.av(a));
      return aplicarEmMatriz([ctx.mat(iv)], (x) => { const k = NI(x); if (ehErro(k)) return k; if (k < 1 || k > opcoes.length) return E.VALOR; return ctx.deref(opcoes[k - 1]); }, ctx);
    }
    const k = NI(ctx.deref(iv));
    if (ehErro(k)) return k;
    if (k < 1 || k >= args.length) return E.VALOR;
    return ctx.av(args[k]);
  },
  LET: (args, ctx) => {
    if (args.length < 3 || args.length % 2 === 0) return E.VALOR;
    const locais = new Map();
    ctx.lets.push(locais);
    try {
      for (let i = 0; i + 1 < args.length - 1; i += 2) {
        if (args[i].t !== 'nome') return E.VALOR;
        locais.set(args[i].n.toLowerCase(), ctx.av(args[i + 1]));
      }
      return ctx.av(args[args.length - 1]);
    } finally { ctx.lets.pop(); }
  },
  TRUE: () => true,
  FALSE: () => false,

  /* Buscar */
  VLOOKUP: (args, ctx) => procVH(args, ctx, false),
  HLOOKUP: (args, ctx) => procVH(args, ctx, true),
  MATCH: (args, ctx) => {
    const alvo = ctx.deref(ctx.av(args[0]));
    if (ehErro(alvo)) return alvo;
    const vt = vetor(ctx.av(args[1]), ctx);
    if (!vt) return E.NA;
    const tipo = args[2] && args[2].t !== 'vazio' ? NI(ctx.deref(ctx.av(args[2]))) : 1;
    if (ehErro(tipo)) return tipo;
    const L = vt.lista;
    if (tipo === 0) { const i = L.findIndex((x) => x != null && igualBusca(x, alvo, true)); return i < 0 ? E.NA : i + 1; }
    if (tipo > 0) { const i = buscaAproximada(L, alvo); return i < 0 ? E.NA : i + 1; }
    let achou = -1;
    for (let i = 0; i < L.length; i++) {
      if (L[i] == null || !mesmoTipo(L[i], alvo)) continue;
      if (comparar(L[i], alvo) >= 0) achou = i; else break;
    }
    return achou < 0 ? E.NA : achou + 1;
  },
  XMATCH: (args, ctx) => {
    const alvo = ctx.deref(ctx.av(args[0]));
    if (ehErro(alvo)) return alvo;
    const vt = vetor(ctx.av(args[1]), ctx);
    if (!vt) return E.VALOR;
    const modo = args[2] && args[2].t !== 'vazio' ? NI(ctx.deref(ctx.av(args[2]))) : 0;
    const sentido = args[3] && args[3].t !== 'vazio' ? NI(ctx.deref(ctx.av(args[3]))) : 1;
    const i = buscaX(vt.lista, alvo, modo, sentido);
    return i < 0 ? E.NA : i + 1;
  },
  XLOOKUP: (args, ctx) => {
    const alvoV = ctx.av(args[0]);
    const pesq = ctx.av(args[1]);
    const ret = ctx.av(args[2]);
    const vt = vetor(pesq, ctx);
    if (!vt) return E.VALOR;
    const modo = args[4] && args[4].t !== 'vazio' ? NI(ctx.deref(ctx.av(args[4]))) : 0;
    const sentido = args[5] && args[5].t !== 'vazio' ? NI(ctx.deref(ctx.av(args[5]))) : 1;
    const rm = ehRef(ret) ? ret : ctx.mat(ret);
    const tamRet = vt.horizontal ? rm.colunas : rm.linhas;
    if (tamRet !== vt.lista.length && !(ehRef(ret) && (vt.horizontal ? ret.colunas : ret.linhas) >= vt.lista.length)) return E.VALOR;
    const um = (alvo) => {
      if (ehErro(alvo)) return alvo;
      const i = buscaX(vt.lista, alvo, modo, sentido);
      if (i < 0) return args[3] && args[3].t !== 'vazio' ? ctx.av(args[3]) : E.NA;
      return linhaOuColuna(ret, i, vt.horizontal, ctx);
    };
    if (ehMultiplo(alvoV)) return aplicarEmMatriz([ctx.mat(alvoV)], (a) => ctx.deref(um(a)), ctx);
    return um(ctx.deref(alvoV));
  },
  INDEX: (args, ctx) => {
    const m = ctx.av(args[0]);
    const lin = args[1] && args[1].t !== 'vazio' ? NI(ctx.deref(ctx.av(args[1]))) : 0;
    const col = args[2] && args[2].t !== 'vazio' ? NI(ctx.deref(ctx.av(args[2]))) : null;
    if (ehErro(lin)) return lin;
    if (ehErro(col)) return col;
    const L = m.linhas ?? 1, C = m.colunas ?? 1;
    let li = lin, co = col;
    if (co == null) { if (L === 1 && C > 1) { co = li; li = 1; } else co = C === 1 ? 1 : 0; }
    if (li < 0 || co < 0 || li > L || co > C) return E.REF;
    if (ehRef(m)) {
      const l1 = li === 0 ? m.l1 : m.l1 + li - 1, l2 = li === 0 ? m.l2 : l1;
      const c1 = co === 0 ? m.c1 : m.c1 + co - 1, c2 = co === 0 ? m.c2 : c1;
      return new Ref(m.abaId, l1, c1, l2, c2);
    }
    const mm = ctx.mat(m);
    if (li === 0) return new Mat(mm.d.map((r) => [r[co - 1]]));
    if (co === 0) return new Mat([mm.d[li - 1]]);
    return mm.d[li - 1][co - 1];
  },
  OFFSET: (args, ctx) => {
    const r = ctx.av(args[0]);
    if (!ehRef(r)) return E.VALOR;
    const nums = [1, 2, 3, 4].map((k) => (args[k] && args[k].t !== 'vazio' ? NI(ctx.deref(ctx.av(args[k]))) : null));
    const e = nums.find(ehErro); if (e) return e;
    const [dl, dc, h, w] = nums;
    const alt = h ?? r.linhas, larg = w ?? r.colunas;
    if (alt === 0 || larg === 0) return E.REF;
    const l1 = r.l1 + (dl || 0), c1 = r.c1 + (dc || 0);
    const l2 = l1 + (alt > 0 ? alt - 1 : alt + 1), c2 = c1 + (larg > 0 ? larg - 1 : larg + 1);
    if (Math.min(l1, l2) < 0 || Math.min(c1, c2) < 0 || Math.max(l1, l2) >= MAX_LIN || Math.max(c1, c2) >= MAX_COL) return E.REF;
    return new Ref(r.abaId, l1, c1, l2, c2);
  },
  INDIRECT: (args, ctx) => {
    const t = ctx.deref(ctx.av(args[0]));
    if (ehErro(t)) return t;
    return ctx.refDeTexto(T(t)) || E.REF;
  },
  ROW: (args, ctx) => {
    if (!args.length || args[0].t === 'vazio') return ctx.l + 1;
    const r = ctx.av(args[0]);
    if (!ehRef(r)) return E.VALOR;
    return r.linhas > 1 ? Mat.de(r.linhas, 1, (i) => r.l1 + i + 1) : r.l1 + 1;
  },
  COLUMN: (args, ctx) => {
    if (!args.length || args[0].t === 'vazio') return ctx.c + 1;
    const r = ctx.av(args[0]);
    if (!ehRef(r)) return E.VALOR;
    return r.colunas > 1 ? Mat.de(1, r.colunas, (i, j) => r.c1 + j + 1) : r.c1 + 1;
  },
  ROWS: (args, ctx) => { const v = ctx.av(args[0]); return ehRef(v) || ehMat(v) ? v.linhas : ehErro(v) ? v : 1; },
  COLUMNS: (args, ctx) => { const v = ctx.av(args[0]); return ehRef(v) || ehMat(v) ? v.colunas : ehErro(v) ? v : 1; },
  TRANSPOSE: (args, ctx) => { const m = ctx.mat(ctx.av(args[0])); return Mat.de(m.colunas, m.linhas, (i, j) => (m.d[j][i] == null ? 0 : m.d[j][i])); },

  /* Matrizes que derramam */
  FILTER: (args, ctx) => {
    const m = ctx.mat(ctx.av(args[0]));
    const inc = ctx.mat(ctx.av(args[1]));
    const porLinha = inc.colunas === 1 && inc.linhas === m.linhas;
    const porCol = inc.linhas === 1 && inc.colunas === m.colunas;
    if (!porLinha && !porCol) return E.VALOR;
    const sel = (porLinha ? inc.d.map((r) => r[0]) : inc.d[0]).map((x) => {
      if (ehErro(x)) return x;
      const b = typeof x === 'string' ? E.VALOR : aLogico(x);
      return b;
    });
    const e = sel.find(ehErro); if (e) return e;
    const d = porLinha ? m.d.filter((_, i) => sel[i]) : m.d.map((r) => r.filter((_, j) => sel[j]));
    if (!d.length || !d[0].length) return args[2] && args[2].t !== 'vazio' ? ctx.av(args[2]) : E.CALC;
    return new Mat(d);
  },
  UNIQUE: (args, ctx) => {
    const m = ctx.mat(ctx.av(args[0]));
    const porCol = args[1] && args[1].t !== 'vazio' ? aLogico(ctx.deref(ctx.av(args[1]))) : false;
    const umaVez = args[2] && args[2].t !== 'vazio' ? aLogico(ctx.deref(ctx.av(args[2]))) : false;
    const linhas = porCol ? Mat.de(m.colunas, m.linhas, (i, j) => m.d[j][i]).d : m.d;
    const chave = (r) => JSON.stringify(r.map((x) => (typeof x === 'string' ? 's' + x.toLocaleLowerCase('pt-BR') : x == null ? '' : ehErro(x) ? x.cod : x)));
    const cont = new Map();
    for (const r of linhas) cont.set(chave(r), (cont.get(chave(r)) || 0) + 1);
    const vistos = new Set();
    const out = [];
    for (const r of linhas) {
      const k = chave(r);
      if (vistos.has(k)) continue;
      vistos.add(k);
      if (umaVez && cont.get(k) > 1) continue;
      out.push(r.map((x) => (x == null ? 0 : x)));
    }
    if (!out.length) return E.CALC;
    return porCol ? Mat.de(out[0].length, out.length, (i, j) => out[j][i]) : new Mat(out);
  },
  SORT: (args, ctx) => {
    const m = ctx.mat(ctx.av(args[0]));
    const idx = args[1] && args[1].t !== 'vazio' ? NI(ctx.deref(ctx.av(args[1]))) : 1;
    const ordem = args[2] && args[2].t !== 'vazio' ? NI(ctx.deref(ctx.av(args[2]))) : 1;
    const porCol = args[3] && args[3].t !== 'vazio' ? aLogico(ctx.deref(ctx.av(args[3]))) : false;
    if ([idx, ordem].some(ehErro)) return E.VALOR;
    const linhas = porCol ? Mat.de(m.colunas, m.linhas, (i, j) => m.d[j][i]).d : m.d.map((r) => [...r]);
    if (idx < 1 || idx > (linhas[0] || []).length) return E.VALOR;
    linhas.sort((a, b) => comparar(a[idx - 1], b[idx - 1]) * (ordem < 0 ? -1 : 1));
    const fim = linhas.map((r) => r.map((x) => (x == null ? 0 : x)));
    return porCol ? Mat.de(fim[0].length, fim.length, (i, j) => fim[j][i]) : new Mat(fim);
  },
  SORTBY: (args, ctx) => {
    const m = ctx.mat(ctx.av(args[0]));
    const chaves = [];
    for (let i = 1; i < args.length; i += 2) {
      const v = vetor(ctx.av(args[i]), ctx);
      if (!v || v.lista.length !== m.linhas) return E.VALOR;
      const o = args[i + 1] && args[i + 1].t !== 'vazio' ? NI(ctx.deref(ctx.av(args[i + 1]))) : 1;
      chaves.push({ l: v.lista, o: o < 0 ? -1 : 1 });
    }
    const idx = [...m.d.keys()];
    idx.sort((a, b) => { for (const k of chaves) { const r = comparar(k.l[a], k.l[b]); if (r) return r * k.o; } return a - b; });
    return new Mat(idx.map((i) => m.d[i].map((x) => (x == null ? 0 : x))));
  },
  SEQUENCE: (args, ctx) => {
    const v = [0, 1, 2, 3].map((k) => (args[k] && args[k].t !== 'vazio' ? N(ctx.deref(ctx.av(args[k]))) : null));
    const e = v.find(ehErro); if (e) return e;
    const L = Math.trunc(v[0]), C = Math.trunc(v[1] ?? 1), ini = v[2] ?? 1, passo = v[3] ?? 1;
    if (L < 1 || C < 1) return E.CALC;
    if (L * C > 1e6) return E.NUM;
    return Mat.de(L, C, (i, j) => ini + (i * C + j) * passo);
  },

  /* Data e hora */
  TODAY: () => serialHoje(),
  NOW: () => serialAgora(),
  DATE: esc((a, m, d) => {
    const [x, y, z] = [NI(a), NI(m), NI(d)];
    const e = [x, y, z].find(ehErro); if (e) return e;
    if (x < 0 || x > 9999) return E.NUM;
    const s = serialDe(x, y, z);
    return s < 0 ? E.NUM : s;
  }),
  TIME: esc((h, m, s) => {
    const [x, y, z] = [NI(h), NI(m), NI(s)];
    const e = [x, y, z].find(ehErro); if (e) return e;
    const tot = x * 3600 + y * 60 + z;
    if (tot < 0) return E.NUM;
    return (tot % 86400) / 86400;
  }),
  DAY: esc((v) => { const s = dataNum(v); return ehErro(s) ? s : dataDe(s).dia; }),
  MONTH: esc((v) => { const s = dataNum(v); return ehErro(s) ? s : dataDe(s).mes; }),
  YEAR: esc((v) => { const s = dataNum(v); return ehErro(s) ? s : dataDe(s).ano; }),
  HOUR: esc((v) => { const s = N(v); return ehErro(s) ? s : s < 0 ? E.NUM : horaDe(s).h; }),
  MINUTE: esc((v) => { const s = N(v); return ehErro(s) ? s : s < 0 ? E.NUM : horaDe(s).m; }),
  SECOND: esc((v) => { const s = N(v); return ehErro(s) ? s : s < 0 ? E.NUM : horaDe(s).s; }),
  WEEKDAY: esc((v, t) => { const s = dataNum(v); if (ehErro(s)) return s; const tipo = t == null ? 1 : NI(t); return ehErro(tipo) ? tipo : diaDaSemana(s, tipo); }),
  WEEKNUM: esc((v, t) => { const s = dataNum(v); if (ehErro(s)) return s; const tipo = t == null ? 1 : NI(t); return ehErro(tipo) ? tipo : numSemana(s, tipo); }),
  DAYS: esc((f, i) => { const a = dataNum(f), b = dataNum(i); if (ehErro(a)) return a; if (ehErro(b)) return b; return a - b; }),
  DATEDIF: esc((i, f, u) => {
    const a = dataNum(i), b = dataNum(f);
    if (ehErro(a)) return a; if (ehErro(b)) return b;
    if (a > b) return E.NUM;
    const x = dataDe(a), y = dataDe(b);
    const un = T(u).toUpperCase();
    const meses = (y.ano - x.ano) * 12 + (y.mes - x.mes) - (y.dia < x.dia ? 1 : 0);
    switch (un) {
      case 'D': return b - a;
      case 'M': return meses;
      case 'Y': return Math.floor(meses / 12);
      case 'YM': return meses % 12;
      case 'MD': { let d = y.dia - x.dia; if (d < 0) { const pm = y.mes === 1 ? 12 : y.mes - 1; const pa = y.mes === 1 ? y.ano - 1 : y.ano; d += diasNoMes(pa, pm); } return d; }
      case 'YD': { let ini = serialDe(y.ano, x.mes, x.dia); if (ini > b) ini = serialDe(y.ano - 1, x.mes, x.dia); return b - ini; }
      default: return E.NUM;
    }
  }),
  EDATE: esc((d, m) => { const s = dataNum(d); if (ehErro(s)) return s; const n = NI(m); return ehErro(n) ? n : somarMeses(s, n, false); }),
  EOMONTH: esc((d, m) => { const s = dataNum(d); if (ehErro(s)) return s; const n = NI(m); return ehErro(n) ? n : somarMeses(s, n, true); }),
  WORKDAY: (args, ctx) => {
    const s = dataNum(ctx.deref(ctx.av(args[0]))); if (ehErro(s)) return s;
    const n = NI(ctx.deref(ctx.av(args[1]))); if (ehErro(n)) return n;
    const fer = feriadosDe(args[2], ctx); if (ehErro(fer)) return fer;
    let d = s, falta = Math.abs(n);
    const passo = n < 0 ? -1 : 1;
    while (falta > 0) { d += passo; if (util(d, fer)) falta--; }
    return d;
  },
  NETWORKDAYS: (args, ctx) => {
    const a = dataNum(ctx.deref(ctx.av(args[0]))); if (ehErro(a)) return a;
    const b = dataNum(ctx.deref(ctx.av(args[1]))); if (ehErro(b)) return b;
    const fer = feriadosDe(args[2], ctx); if (ehErro(fer)) return fer;
    const [i, f, sinal] = a <= b ? [a, b, 1] : [b, a, -1];
    let n = 0;
    for (let d = i; d <= f; d++) if (util(d, fer)) n++;
    return n * sinal;
  },
  DATEVALUE: esc((t) => { if (typeof t !== 'string') return E.VALOR; const s = lerDataTexto(t); return s == null ? E.VALOR : s; }),
  TIMEVALUE: esc((t) => { if (typeof t !== 'string') return E.VALOR; const s = lerHoraTexto(t); return s == null ? E.VALOR : s; }),

  /* Texto */
  TEXT: esc((v, f) => {
    const cod = codigoDePt(T(f));
    const n = typeof v === 'string' ? aNumero(v) : v;
    if (ehErro(n)) return T(v);
    return formatar(typeof n === 'boolean' ? n : n ?? 0, cod).t;
  }),
  CONCAT: (args, ctx) => {
    let s = '';
    for (const a of args) {
      if (a.t === 'vazio') continue;
      const v = ctx.av(a);
      if (ehRef(v) || ehMat(v)) { let e = null; ctx.cada(v, (x) => { if (ehErro(x)) e = e || x; else s += T(x); }, true); if (e) return e; }
      else { if (ehErro(v)) return v; s += T(v); }
    }
    return s.length > 32767 ? E.VALOR : s;
  },
  CONCATENATE: esc((...xs) => xs.map(T).join('')),
  TEXTJOIN: (args, ctx) => {
    const d = ctx.deref(ctx.av(args[0]));
    if (ehErro(d)) return d;
    const ig = aLogico(ctx.deref(ctx.av(args[1])));
    if (ehErro(ig)) return ig;
    const partes = [];
    for (const a of args.slice(2)) {
      const v = a.t === 'vazio' ? '' : ctx.av(a);
      const vals = [];
      if (ehRef(v) || ehMat(v)) ctx.cada(v, (x) => vals.push(x), true); else vals.push(v);
      for (const x of vals) {
        if (ehErro(x)) return x;
        const t = T(x);
        if (ig && t === '') continue;
        partes.push(t);
      }
    }
    return partes.join(T(d));
  },
  LEFT: esc((t, n) => { const k = n == null ? 1 : NI(n); if (ehErro(k)) return k; if (k < 0) return E.VALOR; return [...T(t)].slice(0, k).join(''); }),
  RIGHT: esc((t, n) => { const k = n == null ? 1 : NI(n); if (ehErro(k)) return k; if (k < 0) return E.VALOR; const a = [...T(t)]; return k === 0 ? '' : a.slice(-k).join(''); }),
  MID: esc((t, i, n) => { const a = NI(i), k = NI(n); if (ehErro(a)) return a; if (ehErro(k)) return k; if (a < 1 || k < 0) return E.VALOR; return [...T(t)].slice(a - 1, a - 1 + k).join(''); }),
  LEN: esc((t) => [...T(t)].length),
  TRIM: esc((t) => T(t).replace(/ +/g, ' ').trim()),
  UPPER: esc((t) => T(t).toLocaleUpperCase('pt-BR')),
  LOWER: esc((t) => T(t).toLocaleLowerCase('pt-BR')),
  PROPER: esc((t) => capitalizar(T(t))),
  FIND: esc((p, t, i) => {
    const ini = i == null ? 1 : NI(i); if (ehErro(ini)) return ini;
    const s = T(t);
    if (ini < 1 || ini > s.length + 1) return E.VALOR;
    const k = s.indexOf(T(p), ini - 1);
    return k < 0 ? E.VALOR : k + 1;
  }),
  SEARCH: esc((p, t, i) => {
    const ini = i == null ? 1 : NI(i); if (ehErro(ini)) return ini;
    const s = T(t);
    if (ini < 1 || ini > s.length + 1) return E.VALOR;
    const pr = T(p);
    if (/[*?]/.test(pr)) {
      const rx = new RegExp(curingaParaRegex(pr).source.slice(1, -1), 'i');
      const m = rx.exec(s.slice(ini - 1));
      return m ? m.index + ini : E.VALOR;
    }
    const k = s.toLocaleLowerCase('pt-BR').indexOf(pr.toLocaleLowerCase('pt-BR'), ini - 1);
    return k < 0 ? E.VALOR : k + 1;
  }),
  SUBSTITUTE: esc((t, a, n, o) => {
    const s = T(t), velho = T(a), novo = T(n);
    if (!velho) return s;
    if (o == null) return s.split(velho).join(novo);
    const k = NI(o); if (ehErro(k)) return k; if (k < 1) return E.VALOR;
    let idx = -1;
    for (let c = 0; c < k; c++) { idx = s.indexOf(velho, idx + 1); if (idx < 0) return s; }
    return s.slice(0, idx) + novo + s.slice(idx + velho.length);
  }),
  REPLACE: esc((t, i, n, novo) => {
    const a = NI(i), k = NI(n); if (ehErro(a)) return a; if (ehErro(k)) return k;
    if (a < 1 || k < 0) return E.VALOR;
    const s = [...T(t)];
    return s.slice(0, a - 1).join('') + T(novo) + s.slice(a - 1 + k).join('');
  }),
  VALUE: esc((t) => {
    if (typeof t === 'number') return t;
    const s = T(t).replace(/R\$\s*/i, '').trim();
    const n = aNumero(s);
    if (!ehErro(n)) return n;
    const h = lerHoraTexto(s);
    return h == null ? E.VALOR : h;
  }),
  REPT: esc((t, n) => { const k = NI(n); if (ehErro(k)) return k; if (k < 0) return E.VALOR; const s = T(t).repeat(k); return s.length > 32767 ? E.VALOR : s; }),
  EXACT: esc((a, b) => T(a) === T(b)),
  CHAR: esc((n) => { const k = NI(n); if (ehErro(k)) return k; if (k < 1 || k > 255) return E.VALOR; return String.fromCharCode(k); }),
  CODE: esc((t) => { const s = T(t); return s ? s.charCodeAt(0) : E.VALOR; }),
  CLEAN: esc((t) => T(t).replace(/[\x00-\x1f]/g, '')),

  /* Números */
  ROUND: esc((n, d) => { const x = N(n), k = NI(d); if (ehErro(x)) return x; if (ehErro(k)) return k; return arred(x, k); }),
  ROUNDUP: esc((n, d) => { const x = N(n), k = NI(d); if (ehErro(x)) return x; if (ehErro(k)) return k; return arred(x, k, 'cima'); }),
  ROUNDDOWN: esc((n, d) => { const x = N(n), k = NI(d); if (ehErro(x)) return x; if (ehErro(k)) return k; return arred(x, k, 'baixo'); }),
  /* TETO e ARREDMULTB (o TETO/ARREDMULTB antigos do Excel): dividir e multiplicar pelo múltiplo; "pre" tira o ruído de 0,1 + 0,2 */
  CEILING: esc((n, m) => {
    const x = N(n), s = N(m); if (ehErro(x)) return x; if (ehErro(s)) return s;
    if (s === 0) return 0;
    if (x > 0 && s < 0) return E.NUM;
    return Number((Math.ceil(Number((x / s).toPrecision(14))) * s).toPrecision(15)) + 0;
  }),
  FLOOR: esc((n, m) => {
    const x = N(n), s = N(m); if (ehErro(x)) return x; if (ehErro(s)) return s;
    if (s === 0) return E.DIV0;
    if (x > 0 && s < 0) return E.NUM;
    return Number((Math.floor(Number((x / s).toPrecision(14))) * s).toPrecision(15)) + 0;
  }),
  TRUNC: esc((n, d) => { const x = N(n), k = d == null ? 0 : NI(d); if (ehErro(x)) return x; if (ehErro(k)) return k; return arred(x, k, 'baixo'); }),
  INT: esc((n) => { const x = N(n); return ehErro(x) ? x : Math.floor(x); }),
  MOD: esc((n, d) => { const x = N(n), y = N(d); if (ehErro(x)) return x; if (ehErro(y)) return y; if (y === 0) return E.DIV0; const r = x - y * Math.floor(x / y); return Math.abs(r) < 1e-12 ? 0 : r; }),
  ABS: esc((n) => { const x = N(n); return ehErro(x) ? x : Math.abs(x); }),
  POWER: esc((a, b) => potencia(N(a), N(b))),
  SQRT: esc((n) => { const x = N(n); if (ehErro(x)) return x; return x < 0 ? E.NUM : Math.sqrt(x); }),
  QUOTIENT: esc((a, b) => { const x = N(a), y = N(b); if (ehErro(x)) return x; if (ehErro(y)) return y; if (y === 0) return E.DIV0; return Math.trunc(x / y); }),
  PI: () => Math.PI,
  SIGN: esc((n) => { const x = N(n); return ehErro(x) ? x : Math.sign(x); }),
  RAND: () => Math.random(),
  RANDBETWEEN: esc((a, b) => { const x = Math.ceil(N(a)), y = Math.floor(N(b)); if (Number.isNaN(x) || Number.isNaN(y)) return E.VALOR; if (x > y) return E.NUM; return x + Math.floor(Math.random() * (y - x + 1)); }),

  /* Testes (recebem o erro em vez de passar adiante) */
  ISBLANK: (args, ctx) => {
    const v = ctx.av(args[0]);
    if (ehMultiplo(v)) return aplicarEmMatriz([ctx.mat(v)], (x) => x == null, ctx);
    return ehRef(v) ? ctx.deref(v) == null : false;
  },
  ISNUMBER: esc((v) => typeof v === 'number', { aceitaErro: true }),
  ISTEXT: esc((v) => typeof v === 'string', { aceitaErro: true }),
  ISLOGICAL: esc((v) => typeof v === 'boolean', { aceitaErro: true }),
  ISERR: esc((v) => ehErro(v) && v.cod !== '#N/A', { aceitaErro: true }),
  ISERROR: esc((v) => ehErro(v), { aceitaErro: true }),
  ISNA: esc((v) => ehErro(v) && v.cod === '#N/A', { aceitaErro: true }),
  NA: () => E.NA,
};

export function potencia(a, b) {
  if (ehErro(a)) return a;
  if (ehErro(b)) return b;
  if (a === 0 && b === 0) return E.NUM;
  if (a === 0 && b < 0) return E.DIV0;
  const r = a ** b;
  return Number.isFinite(r) ? r : E.NUM;
}

/* ---------- ajudantes que precisam do IMPL ---------- */

function condicional(args, ctx, deslocamento, fim) {
  const alvoNo = deslocamento ? args[0] : null;
  const pares = args.slice(deslocamento);
  if (!pares.length || pares.length % 2) return E.VALOR;
  const faixasV = [];
  const conds = [];
  for (let i = 0; i < pares.length; i += 2) {
    faixasV.push(ctx.av(pares[i]));
    conds.push(criterio(ctx.deref(ctx.av(pares[i + 1]))));
  }
  const alvoV = alvoNo ? ctx.av(alvoNo) : null;
  const ms = mesmasFaixas(alvoV ? [alvoV, ...faixasV] : faixasV, ctx);
  const alvo = alvoV ? ms.shift() : null;
  const L = ms[0].linhas, C = ms[0].colunas;
  if (ms.some((m) => m.linhas !== L || m.colunas !== C) || (alvo && (alvo.linhas !== L || alvo.colunas !== C))) return E.VALOR;
  const xs = [];
  let n = 0;
  for (let i = 0; i < L; i++) for (let j = 0; j < C; j++) {
    if (!conds.every((t, k) => t(ms[k].d[i][j]))) continue;
    n++;
    if (alvo) {
      const x = alvo.d[i][j];
      if (ehErro(x)) return x;
      if (typeof x === 'number') xs.push(x);
    }
  }
  return fim(xs, n);
}

function agregarCom(cod, refs, ctx, op) {
  const xs = numeros(refs, ctx, op);
  if (ehErro(xs)) return xs;
  switch (cod) {
    case 1: return media(xs);
    case 2: return xs.length;
    case 3: { let n = 0; for (const a of refs) { const v = ctx.av(a); ctx.cada(v, (x, l, c) => { if (x != null && (!op.filtroCelula || !ehRef(v) || op.filtroCelula(v.abaId, l, c))) n++; }); } return n; }
    case 4: return xs.length ? Math.max(...xs) : 0;
    case 5: return xs.length ? Math.min(...xs) : 0;
    case 6: return xs.reduce((a, b) => a * b, xs.length ? 1 : 0);
    case 7: { const v = variancia(xs, true); return ehErro(v) ? v : Math.sqrt(v); }
    case 8: { const v = variancia(xs, false); return ehErro(v) ? v : Math.sqrt(v); }
    case 9: return soma(xs);
    case 10: return variancia(xs, true);
    case 11: return variancia(xs, false);
    case 12: return mediana(xs);
    case 13: return moda(xs);
    default: return E.VALOR;
  }
}

function kEsimo(args, ctx, maior) {
  const xs = numeros([args[0]], ctx);
  if (ehErro(xs)) return xs;
  const kv = ctx.av(args[1]);
  const um = (k0) => {
    const k = N(k0);
    if (ehErro(k)) return k;
    const kk = Math.ceil(k);
    if (kk < 1 || kk > xs.length) return E.NUM;
    const o = [...xs].sort((a, b) => (maior ? b - a : a - b));
    return o[kk - 1];
  };
  if (ehMultiplo(kv)) return aplicarEmMatriz([ctx.mat(kv)], um, ctx);
  return um(ctx.deref(kv));
}

function logicos(args, ctx, fn) {
  const xs = [];
  for (const a of args) {
    if (a.t === 'vazio') continue;
    const v = ctx.av(a);
    if (ehRef(v) || ehMat(v)) {
      let e = null;
      ctx.cada(v, (x) => { if (e) return; if (ehErro(x)) e = x; else if (typeof x === 'boolean') xs.push(x); else if (typeof x === 'number') xs.push(x !== 0); });
      if (e) return e;
    } else {
      if (ehErro(v)) return v;
      const b = aLogico(v);
      if (ehErro(b)) return b;
      xs.push(b);
    }
  }
  return xs.length ? fn(xs) : E.VALOR;
}

function procVH(args, ctx, horizontal) {
  const alvoV = ctx.av(args[0]);
  const tab = ctx.av(args[1]);
  const m = ctx.mat(tab);
  const idx = NI(ctx.deref(ctx.av(args[2])));
  if (ehErro(idx)) return idx;
  const aprox = args[3] && args[3].t !== 'vazio' ? aLogico(ctx.deref(ctx.av(args[3]))) : true;
  if (ehErro(aprox)) return aprox;
  if (idx < 1) return E.VALOR;
  if (idx > (horizontal ? m.linhas : m.colunas)) return E.REF;
  const chaves = horizontal ? (m.d[0] || []) : m.d.map((r) => r[0]);
  const um = (alvo) => {
    if (ehErro(alvo)) return alvo;
    const i = aprox ? buscaAproximada(chaves, alvo) : chaves.findIndex((x) => x != null && igualBusca(x, alvo, true));
    if (i < 0) return E.NA;
    const v = horizontal ? m.d[idx - 1][i] : m.d[i][idx - 1];
    return v == null ? 0 : v;
  };
  if (ehMultiplo(alvoV)) return aplicarEmMatriz([ctx.mat(alvoV)], um, ctx);
  return um(ctx.deref(alvoV));
}

/** Funções que o motor sabe calcular (as outras ficam guardadas e mostram o último valor do Excel). */
export const sabeCalcular = (en) => Object.prototype.hasOwnProperty.call(IMPL, en);
export { lerEndereco };
