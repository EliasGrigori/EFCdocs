/* EFCdocs — Planilha (v0.5.1): validação de dados (lista suspensa), formatação condicional e comentários.
   Tudo aqui é conta pura (sem tela): o desenho e as janelas ficam em Planilha.jsx e ui.
   Modelo guardado na aba (nomes curtos como no resto do arquivo):
   - aba.val = [{ fx:'A1:B5 D3', t:'list'|'whole'|'decimal'|'date'|'time'|'textLength'|'custom', op, f1, f2, vz (aceita vazio), sd (sem seta), mi, mit, mim (aviso ao selecionar), me, ee:'stop'|'warning'|'information', met, mem }]
     f1 e f2 são fórmulas no formato do arquivo (inglês, sem "="); numa lista escrita na hora, f1 é um texto entre aspas: "a,b,c".
   - aba.cf = [{ id, fx, t:'cellIs'|'expression'|'duplicateValues'|'uniqueValues'|'containsText'|'notContainsText'|'beginsWith'|'endsWith'|'containsBlanks'|'notContainsBlanks'|'containsErrors'|'notContainsErrors'|'top10'|'aboveAverage',
                 op, f1, f2, tx, n, pc, bx, ab, ig, par (parar se verdadeiro), e:{ fundo, cor, b, i, u, st } }], da regra de mais força para a de menos força.
   - aba.com = { B3: { t:'texto', a:'autor', r:[{ a, t }] (respostas), enc:1 (veio encadeado) } }.
   Fórmula relativa vale a partir da célula de cima e da esquerda de toda a área (como o Excel guarda). */
import { lerGuardada, deslocar, escrever } from './formula.js';
import { lerEnderecoCaixa, normalFaixa, chave, lerChave, MAX_LIN, MAX_COL, letraCol } from './ref.js';
import { aTexto, aNumero, ehErro, comparar, E } from './valores.js';
import { Ref, Mat, ehRef, ehMat } from './tipos.js';
import { formatar } from './formato.js';
import { estiloDe } from './modelo.js';

/* ---------- faixas ("A1:B5 D3") ---------- */
const CACHE_FX = new Map();
/** Texto de faixas separadas por espaço → [{ l1, c1, l2, c2 }]. */
export function faixasDe(texto) {
  const t = String(texto || '').trim();
  let r = CACHE_FX.get(t);
  if (r) return r;
  r = [];
  for (const p of t.split(/\s+/)) {
    if (!p) continue;
    const f = lerEnderecoCaixa(p);
    if (f) r.push({ l1: f.l1, c1: f.c1, l2: f.l2, c2: f.c2 });
  }
  if (CACHE_FX.size > 5000) CACHE_FX.clear();
  CACHE_FX.set(t, r);
  return r;
}
const rotuloFaixa = (f) => {
  if (f.l1 === 0 && f.l2 === MAX_LIN - 1) return letraCol(f.c1) + ':' + letraCol(f.c2);
  if (f.c1 === 0 && f.c2 === MAX_COL - 1) return (f.l1 + 1) + ':' + (f.l2 + 1);
  const a = chave(f.l1, f.c1);
  return f.l1 === f.l2 && f.c1 === f.c2 ? a : a + ':' + chave(f.l2, f.c2);
};
export const textoFaixas = (fs) => fs.map(rotuloFaixa).join(' ');
export const emFaixas = (fs, l, c) => { for (const f of fs) if (l >= f.l1 && l <= f.l2 && c >= f.c1 && c <= f.c2) return true; return false; };
/** Célula de cima e da esquerda de todas as faixas (de onde contam as referências relativas). */
export function ancoraDe(fs) {
  let l = Infinity, c = Infinity;
  for (const f of fs) { if (f.l1 < l) l = f.l1; if (f.c1 < c) c = f.c1; }
  return l === Infinity ? { l: 0, c: 0 } : { l, c };
}
/** Faixas do EFCdocs ({l1,c1,l2,c2}) → texto "A1:B5 D3". */
export const faixasParaTexto = (fs) => textoFaixas(fs.map((f) => normalFaixa(f)));

/* ---------- avaliar fórmulas guardadas ---------- */
const CACHE_DESL = new Map();
function arvore(textoEn, dl, dc) {
  let a;
  try { a = lerGuardada(textoEn); } catch { return null; }
  if (!dl && !dc) return a;
  const k = textoEn + '|' + dl + '|' + dc;
  let d = CACHE_DESL.get(k);
  if (!d) { d = deslocar(a, dl, dc); if (CACHE_DESL.size > 8000) CACHE_DESL.clear(); CACHE_DESL.set(k, d); }
  return d;
}
/** Resultado bruto (valor, Ref ou Mat) da fórmula guardada, calculada como se estivesse na célula (l, c). */
export function calcular(motor, abaId, textoEn, l, c, dl = 0, dc = 0) {
  const a = arvore(textoEn, dl, dc);
  if (!a) return E.VALOR;
  return motor.avaliarNo(a, abaId, l, c);
}
/** Um valor só: faixa de uma célula, primeira da matriz ou o próprio valor. */
export function escalar(motor, r) {
  if (ehRef(r)) return r.unica ? motor.valor(r.abaId, r.l1, r.c1) : E.VALOR;
  if (ehMat(r)) return r.d[0] ? r.d[0][0] : null;
  return r;
}
const unico = (motor, abaId, f, l, c, anc) => (f == null || f === '' ? null : escalar(motor, calcular(motor, abaId, f, l, c, l - anc.l, c - anc.c)));
export function verdadeiro(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return false;
}

/* ---------- operadores ---------- */
export const OPERADORES = [
  ['between', 'entre'], ['notBetween', 'não está entre'], ['equal', 'igual a'], ['notEqual', 'diferente de'],
  ['greaterThan', 'maior que'], ['lessThan', 'menor que'], ['greaterThanOrEqual', 'maior ou igual a'], ['lessThanOrEqual', 'menor ou igual a'],
];
const NOME_OP = Object.fromEntries(OPERADORES);
export const nomeOperador = (op) => NOME_OP[op || 'between'] || NOME_OP.between;
/** Compara a com b1 (e b2 no "entre"). Texto compara sem ligar para maiúscula. */
function opera(op, a, b1, b2) {
  const cmp = (x, y) => {
    if (x == null) x = typeof y === 'string' ? '' : typeof y === 'boolean' ? false : 0;
    if (y == null) y = typeof x === 'string' ? '' : typeof x === 'boolean' ? false : 0;
    return comparar(x, y);
  };
  switch (op || 'between') {
    case 'between': return cmp(a, b1) >= 0 && cmp(a, b2) <= 0;
    case 'notBetween': return cmp(a, b1) < 0 || cmp(a, b2) > 0;
    case 'equal': return cmp(a, b1) === 0;
    case 'notEqual': return cmp(a, b1) !== 0;
    case 'greaterThan': return cmp(a, b1) > 0;
    case 'lessThan': return cmp(a, b1) < 0;
    case 'greaterThanOrEqual': return cmp(a, b1) >= 0;
    case 'lessThanOrEqual': return cmp(a, b1) <= 0;
    default: return false;
  }
}
const ehVazio = (v) => v == null || v === '';

/* ============================================================
   Formatação condicional
   ============================================================ */
export const TIPOS_REGRA = [
  ['cellIs', 'Valor da célula'], ['expression', 'Fórmula'], ['containsText', 'Texto que contém'], ['notContainsText', 'Texto que não contém'],
  ['beginsWith', 'Texto que começa com'], ['endsWith', 'Texto que termina com'], ['duplicateValues', 'Valores repetidos'], ['uniqueValues', 'Valores únicos'],
  ['containsBlanks', 'Células vazias'], ['notContainsBlanks', 'Células preenchidas'], ['containsErrors', 'Células com erro'], ['notContainsErrors', 'Células sem erro'],
  ['top10', 'Maiores ou menores valores'], ['aboveAverage', 'Acima ou abaixo da média'], ['dataBar', 'Barras de dados'],
];
const NOME_TIPO = Object.fromEntries(TIPOS_REGRA);

/** Frase curta que diz o que a regra faz (lista de regras e relatório). */
export function descreverRegra(r) {
  const op = nomeOperador(r.op);
  switch (r.t) {
    case 'cellIs': return `Valor da célula ${op} ${r.op === 'between' || r.op === 'notBetween' || !r.op ? `${fmtF(r.f1)} e ${fmtF(r.f2)}` : fmtF(r.f1)}`;
    case 'expression': return `Fórmula: =${fmtF(r.f1)}`;
    case 'containsText': return `Texto contém "${r.tx || ''}"`;
    case 'notContainsText': return `Texto não contém "${r.tx || ''}"`;
    case 'beginsWith': return `Texto começa com "${r.tx || ''}"`;
    case 'endsWith': return `Texto termina com "${r.tx || ''}"`;
    case 'top10': return `${r.bx ? 'Menores' : 'Maiores'} ${r.n || 10}${r.pc ? '%' : ''} valores`;
    case 'aboveAverage': return r.ab === 0 ? 'Abaixo da média' : 'Acima da média';
    case 'dataBar': return `Barras de dados${r.b && r.b.lisa ? ' lisas' : ''}${r.b && r.b.semValor ? ', só a barra' : ''}`;
    default: return NOME_TIPO[r.t] || r.t;
  }
}
function fmtF(f) {
  if (f == null || f === '') return '';
  try { return escrever(lerGuardada(f), 'pt'); } catch { return String(f); }
}

const compilados = new WeakMap(); // lista de regras → { rev, itens }

function compilar(motor, abaId, lista) {
  let k = compilados.get(lista);
  if (!k || k.motor !== motor || k.abaId !== abaId) {
    k = { motor, abaId, rev: -1, itens: lista.map((r) => { const fx = faixasDe(r.fx); return { r, fx, anc: ancoraDe(fx), cache: new Map(), todos: null }; }) };
    compilados.set(lista, k);
  }
  if (k.rev !== motor.rev) { k.rev = motor.rev; for (const it of k.itens) { it.cache.clear(); it.todos = null; it.lim = null; } }
  return k.itens;
}

const chaveValor = (v) => (typeof v === 'number' ? 'n' + v : typeof v === 'boolean' ? 'b' + v : ehErro(v) ? 'e' + v.cod : 's' + String(v).toLowerCase());

/** Valores de todas as faixas da regra (para repetidos, maiores valores e média). Vazios ficam de fora. */
function todosOsValores(motor, abaId, it) {
  if (it.todos) return it.todos;
  const nums = [], cont = new Map();
  let somaN = 0;
  for (const f of it.fx) {
    motor.cada(new Ref(abaId, f.l1, f.c1, Math.min(f.l2, MAX_LIN - 1), Math.min(f.c2, MAX_COL - 1)), (v) => {
      if (ehVazio(v)) return;
      const k = chaveValor(v);
      cont.set(k, (cont.get(k) || 0) + 1);
      if (typeof v === 'number') { nums.push(v); somaN += v; }
    });
  }
  nums.sort((a, b) => a - b);
  it.todos = { nums, cont, media: nums.length ? somaN / nums.length : 0 };
  return it.todos;
}

function acerta(motor, abaId, it, l, c) {
  const r = it.r;
  const v = motor.valor(abaId, l, c);
  switch (r.t) {
    case 'cellIs': {
      const a = unico(motor, abaId, r.f1, l, c, it.anc);
      const b = r.op === 'between' || r.op === 'notBetween' || !r.op ? unico(motor, abaId, r.f2, l, c, it.anc) : null;
      if (ehErro(a) || ehErro(b)) return false;
      if (ehErro(v)) return false;
      return opera(r.op, v, a, b);
    }
    case 'expression': return verdadeiro(unico(motor, abaId, r.f1, l, c, it.anc));
    case 'containsText': return !ehVazio(r.tx) && !ehErro(v) && aTexto(v).toLowerCase().includes(String(r.tx).toLowerCase());
    case 'notContainsText': return !ehVazio(r.tx) && !(!ehErro(v) && aTexto(v).toLowerCase().includes(String(r.tx).toLowerCase()));
    case 'beginsWith': return !ehVazio(r.tx) && !ehErro(v) && aTexto(v).toLowerCase().startsWith(String(r.tx).toLowerCase());
    case 'endsWith': return !ehVazio(r.tx) && !ehErro(v) && aTexto(v).toLowerCase().endsWith(String(r.tx).toLowerCase());
    case 'containsBlanks': return ehVazio(v);
    case 'notContainsBlanks': return !ehVazio(v);
    case 'containsErrors': return ehErro(v);
    case 'notContainsErrors': return !ehErro(v);
    case 'duplicateValues': return !ehVazio(v) && (todosOsValores(motor, abaId, it).cont.get(chaveValor(v)) || 0) > 1;
    case 'uniqueValues': return !ehVazio(v) && (todosOsValores(motor, abaId, it).cont.get(chaveValor(v)) || 0) === 1;
    case 'top10': {
      if (typeof v !== 'number') return false;
      const { nums } = todosOsValores(motor, abaId, it);
      if (!nums.length) return false;
      const n = Math.max(1, r.pc ? Math.floor(nums.length * (r.n || 10) / 100) || 1 : Math.floor(r.n || 10));
      const corte = r.bx ? nums[Math.min(nums.length, n) - 1] : nums[Math.max(0, nums.length - n)];
      return r.bx ? v <= corte : v >= corte;
    }
    case 'aboveAverage': {
      if (typeof v !== 'number') return false;
      const { media } = todosOsValores(motor, abaId, it);
      if (r.ab === 0) return r.ig ? v <= media : v < media;
      return r.ig ? v >= media : v > media;
    }
    default: return false;
  }
}

/** O que as regras mudam na célula: { fundo, cor, b, i, u, st } ou null. Regra de cima tem mais força em cada detalhe. */
export function estiloCondicional(motor, c, abaId, l, col) {
  const aba = c.abas[abaId];
  const lista = aba && aba.cf;
  if (!lista || !lista.length) return null;
  const itens = compilar(motor, abaId, lista);
  let out = null;
  const k = l * MAX_COL + col;
  for (const it of itens) {
    if (!emFaixas(it.fx, l, col)) continue;
    let ok = it.cache.get(k);
    if (ok === undefined) {
      try { ok = !!acerta(motor, abaId, it, l, col); } catch { ok = false; }
      it.cache.set(k, ok);
    }
    if (!ok) continue;
    const e = it.r.e || {};
    if (!out) out = {};
    for (const p of ['fundo', 'cor', 'b', 'i', 'u', 'st']) if (e[p] != null && out[p] === undefined) out[p] = e[p];
    if (it.r.par) break;
  }
  return out;
}
export const temCondicional = (aba) => !!(aba && aba.cf && aba.cf.length);

/* ---------- v0.6.18 (D-45): barras de dados ---------- */
export const BARRA_NOVA = { min: { t: 'autoMin' }, max: { t: 'autoMax' }, cor: '#638ec6', minL: 0, maxL: 100, x14: 1, neg: '#ff0000', eixo: 'auto' };
function limiteDaBarra(motor, abaId, it, o, nums, ehMax) {
  const lo = nums[0], hi = nums[nums.length - 1];
  const t = (o && o.t) || (ehMax ? 'max' : 'min');
  const valor = () => { if (typeof o.v === 'number') return o.v; const x = unico(motor, abaId, o.v, it.anc.l, it.anc.c, it.anc); return typeof x === 'number' ? x : aNumero(x); };
  switch (t) {
    case 'autoMin': return Math.min(0, lo);
    case 'autoMax': return Math.max(0, hi);
    case 'num': case 'formula': { const v = valor(); return typeof v === 'number' && Number.isFinite(v) ? v : ehMax ? hi : lo; }
    case 'percent': { const p = valor(); return typeof p === 'number' && Number.isFinite(p) ? lo + (hi - lo) * p / 100 : ehMax ? hi : lo; }
    case 'percentile': {
      const p = valor(); if (typeof p !== 'number' || !Number.isFinite(p)) return ehMax ? hi : lo;
      const k = Math.max(0, Math.min(1, p / 100)) * (nums.length - 1); const i = Math.floor(k);
      return nums[i] + (nums[Math.min(nums.length - 1, i + 1)] - nums[i]) * (k - i);
    }
    case 'max': return hi;
    default: return lo;
  }
}
/**
 * A barra da célula, em frações da largura útil: { a, b (de onde até onde), cor, lisa, borda, eixo (fração ou null), corEixo, semValor, rtl } ou null.
 * Como o Excel 2010: sem números negativos a barra cresce da esquerda; com negativos (eixo automático) o eixo fica onde o zero cai
 * e a barra negativa vai para a esquerda com a cor dos negativos. A primeira regra de barra que vale na célula ganha.
 */
export function barraDeDados(motor, c, abaId, l, col) {
  const aba = c.abas[abaId];
  const lista = aba && aba.cf;
  if (!lista || !lista.length) return null;
  const itens = compilar(motor, abaId, lista);
  for (const it of itens) {
    if (it.r.t !== 'dataBar' || !emFaixas(it.fx, l, col)) continue;
    const v = motor.valor(abaId, l, col);
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    const b = it.r.b || {};
    if (!it.lim) {
      const { nums } = todosOsValores(motor, abaId, it);
      if (!nums.length) return null;
      let lo = limiteDaBarra(motor, abaId, it, b.min, nums, false), hi = limiteDaBarra(motor, abaId, it, b.max, nums, true);
      if (hi < lo) [lo, hi] = [hi, lo];
      it.lim = { lo, hi };
    }
    const { lo, hi } = it.lim;
    const minL = (Number.isFinite(b.minL) ? b.minL : 10) / 100, maxL = (Number.isFinite(b.maxL) ? b.maxL : 90) / 100;
    const x = Math.max(lo, Math.min(hi, v));
    const base = { cor: b.cor || '#638ec6', lisa: !!b.lisa, borda: b.borda || null, semValor: !!b.semValor, rtl: b.dir === 'rtl', eixo: null, corEixo: b.corEixo || '#000000' };
    const temNeg = b.x14 && b.eixo !== 'nao' && (lo < 0 || b.eixo === 'meio');
    if (!temNeg) {
      const f = hi === lo ? maxL : minL + (x - lo) / (hi - lo) * (maxL - minL);
      return { ...base, a: 0, b: Math.max(0, Math.min(1, f)) };
    }
    /* com eixo: o zero divide a célula; cada lado na sua escala */
    const ax = b.eixo === 'meio' ? 0.5 : hi <= 0 ? 1 : lo >= 0 ? 0 : -lo / (hi - lo);
    const negativo = x < 0;
    const lado = negativo ? ax : 1 - ax;
    const ref = negativo ? (lo < 0 ? -lo : 1) : (hi > 0 ? hi : 1);
    const f = Math.max(0, Math.min(1, Math.abs(x) / ref)) * lado;
    return { ...base, eixo: ax, a: negativo ? ax - f : ax, b: negativo ? ax : ax + f, cor: negativo && b.neg ? b.neg : base.cor, borda: negativo && base.borda ? (b.negBorda || b.neg || base.borda) : base.borda };
  }
  return null;
}
/** Cor clara para o fim do degradê da barra (como o Excel: a ponta quase branca). */
export function corClaraDaBarra(hex, k = 0.88) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return '#ffffff';
  const n = parseInt(m[1], 16); const mix = (v) => Math.round(v + (255 - v) * k);
  return '#' + [mix(n >> 16 & 255), mix(n >> 8 & 255), mix(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
export const temBarras = (aba) => !!(aba && aba.cf && aba.cf.some((r) => r.t === 'dataBar'));
/** A barra em retângulos para a impressão e o PDF (o degradê vira faixas, que todo leitor de PDF mostra igual). */
export function opsDaBarra(bar, x, y, w, h, esc = 1) {
  const ops = [];
  const pad = 1.5 * Math.max(0.6, esc);
  const ux = x + pad, uw = Math.max(0, w - 2 * pad), uy = y + pad, uh = Math.max(0.5, h - 2 * pad);
  const sx = (f) => (bar.rtl ? ux + uw * (1 - f) : ux + uw * f);
  const x1 = Math.min(sx(bar.a), sx(bar.b)), x2 = Math.max(sx(bar.a), sx(bar.b));
  if (x2 - x1 >= 0.3) {
    if (bar.lisa) ops.push({ k: 'rect', x: x1, y: uy, w: x2 - x1, h: uh, fill: bar.cor });
    else {
      const n = Math.max(1, Math.min(24, Math.round((x2 - x1) / 2)));
      const deEixo = bar.eixo != null && bar.a < bar.eixo - 1e-9;
      const claro = corClaraDaBarra(bar.cor);
      const mistura = (t) => { const a = parseInt(bar.cor.slice(1), 16), b = parseInt(claro.slice(1), 16); const m = (s) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t); return '#' + [m(16), m(8), m(0)].map((v) => v.toString(16).padStart(2, '0')).join(''); };
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n; const passo = (x2 - x1) / n;
        const xi = x1 + i * passo;
        ops.push({ k: 'rect', x: xi, y: uy, w: passo + 0.05, h: uh, fill: mistura(deEixo !== bar.rtl ? 1 - t : t) });
      }
    }
    if (bar.borda) ops.push({ k: 'rectL', x: x1, y: uy, w: x2 - x1, h: uh, cor: bar.borda, w2: 0.5 });
  }
  if (bar.eixo != null && bar.eixo > 0 && bar.eixo < 1) ops.push({ k: 'line', x1: sx(bar.eixo), y1: y, x2: sx(bar.eixo), y2: y + h, cor: bar.corEixo || '#000000', w: 0.4 });
  return ops;
}

/** Estilo da célula já com a cor das regras por cima (só para desenhar; o arquivo não muda). */
export function estiloComRegras(base, ef) {
  if (!ef) return base;
  const e = { ...base };
  if (ef.fundo) e.fundo = ef.fundo;
  if (ef.cor) e.cor = ef.cor;
  if (ef.b != null) e.b = ef.b;
  if (ef.i != null) e.i = ef.i;
  if (ef.u != null) e.u = ef.u;
  if (ef.st != null) e.st = ef.st;
  return e;
}

let seqRegra = 1;
export const novoIdRegra = () => 'r' + Date.now().toString(36) + (seqRegra++);
/** Regra com id (as que vêm de arquivo antigo ou do Excel ganham um). */
export function comId(lista) { return lista.map((r) => (r.id ? r : { ...r, id: novoIdRegra() })); }

/* ============================================================
   Validação de dados
   ============================================================ */
export const TIPOS_VALIDACAO = [
  ['any', 'Qualquer valor'], ['list', 'Lista'], ['whole', 'Número inteiro'], ['decimal', 'Número decimal'], ['date', 'Data'], ['time', 'Hora'], ['textLength', 'Tamanho do texto'], ['custom', 'Personalizado (fórmula)'],
];
export const ESTILOS_ERRO = [['stop', 'Parar (não deixa)'], ['warning', 'Avisar (pergunta se continua)'], ['information', 'Informar (deixa)']];

/** Primeira regra de validação que vale para a célula (ou null). */
export function validacaoEm(aba, l, c) {
  const v = aba && aba.val;
  if (!v || !v.length) return null;
  for (const r of v) if (emFaixas(faixasDe(r.fx), l, c)) return r;
  return null;
}
export const temValidacao = (aba) => !!(aba && aba.val && aba.val.length);

/** Itens de uma lista suspensa: [{ v (valor), t (texto que aparece) }] e se foi escrita na hora (então maiúscula conta). */
export function opcoesLista(motor, c, abaId, regra, l, col) {
  const anc = ancoraDe(faixasDe(regra.fx));
  let a;
  try { a = lerGuardada(regra.f1 || '""'); } catch { return { itens: [], erro: 'A fonte da lista tem um problema.' }; }
  if (a.t === 'str' || (a.t === 'paren' && a.a.t === 'str')) {
    const s = a.t === 'str' ? a.v : a.a.v;
    const itens = String(s).split(',').map((x) => x.trim()).filter((x) => x !== '').map((x) => ({ v: x, t: x }));
    return { itens, literal: true };
  }
  /* v0.6.1 (Grok): faixa escrita sem $ (A2:A10) não anda célula a célula: senão a 2ª linha perdia o 1º item */
  const soFaixa = a.t === 'area';
  const r = calcular(motor, abaId, regra.f1, l, col, soFaixa ? 0 : l - anc.l, soFaixa ? 0 : col - anc.c);
  if (ehErro(r)) return { itens: [], erro: 'A fonte da lista deu erro (' + r.toString() + '). Confira a faixa ou o nome.' };
  const itens = [];
  const juntar = (v, abaFonte, ll, cc) => {
    if (ehVazio(v)) return;
    let t;
    if (abaFonte != null && ll != null) {
      const cel = c.abas[abaFonte] && c.abas[abaFonte].cel[chave(ll, cc)];
      const e = estiloDe(c, cel);
      t = formatar(v, e.nf).t;
    } else t = typeof v === 'string' ? v : ehErro(v) ? v.toString() : aTexto(v);
    itens.push({ v, t });
  };
  if (ehRef(r)) {
    const ate = Math.min(r.l2, motor.usado(r.abaId).lMax);
    const ateC = Math.min(r.c2, Math.max(motor.usado(r.abaId).cMax, r.c1));
    let n = 0;
    for (let ll = r.l1; ll <= ate && n < 5000; ll++) for (let cc = r.c1; cc <= ateC && n < 5000; cc++) { juntar(motor.valor(r.abaId, ll, cc), r.abaId, ll, cc); n++; }
  } else if (ehMat(r)) {
    for (const lin of r.d) for (const v of lin) juntar(v, null, null, null);
  } else juntar(r, null, null, null);
  return { itens: itens.slice(0, 5000), literal: false };
}

/** Tem a seta de lista suspensa nesta célula? */
export function listaDaCelula(aba, l, c) {
  const r = validacaoEm(aba, l, c);
  return r && r.t === 'list' && !r.sd ? r : null;
}

const MENSAGEM_PADRAO = 'Este valor não está de acordo com a regra de validação desta célula.';
export function mensagemDeErro(r) {
  return { titulo: r.met || 'Vértice Docs', texto: r.mem || MENSAGEM_PADRAO, nivel: r.ee || 'stop' };
}

/**
 * O valor digitado vale para a regra? valor = já lido (número, texto, lógico); texto = o que a pessoa digitou.
 * Apagar a célula nunca é barrado. Devolve true/false.
 */
export function valorValido(motor, c, abaId, regra, l, col, valor, texto) {
  if (ehVazio(valor)) return true;
  const anc = ancoraDe(faixasDe(regra.fx));
  const dl = l - anc.l, dc = col - anc.c;
  const num = (f) => { const x = f == null || f === '' ? null : escalar(motor, calcular(motor, abaId, f, l, col, dl, dc)); const n = aNumero(x); return ehErro(n) ? null : n; };
  switch (regra.t) {
    case 'list': {
      const { itens, literal, erro } = opcoesLista(motor, c, abaId, regra, l, col);
      if (erro) return true;
      const tx = String(texto ?? aTexto(valor));
      const ts = aTexto(valor);
      return itens.some((it) => {
        if (literal) return it.v === tx || it.v === ts;
        if (typeof it.v === typeof valor && (it.v === valor || (typeof it.v === 'string' && it.v.toLowerCase() === String(valor).toLowerCase()))) return true;
        return it.t.toLowerCase() === tx.toLowerCase() || aTexto(it.v).toLowerCase() === ts.toLowerCase();
      });
    }
    case 'whole': case 'decimal': case 'date': case 'time': {
      if (typeof valor !== 'number') return false;
      if (regra.t === 'whole' && !Number.isInteger(valor)) return false;
      const a = num(regra.f1), b = num(regra.f2);
      if (a == null || ((!regra.op || regra.op === 'between' || regra.op === 'notBetween') && b == null)) return true;
      return opera(regra.op, valor, a, b);
    }
    case 'textLength': {
      const a = num(regra.f1), b = num(regra.f2);
      if (a == null) return true;
      return opera(regra.op, aTexto(valor).length, a, b);
    }
    case 'custom': {
      if (!regra.f1) return true;
      return verdadeiro(escalar(motor, motor.comSubstituto(abaId, l, col, valor, () => calcular(motor, abaId, regra.f1, l, col, dl, dc))));
    }
    default: return true;
  }
}

/** Resumo em uma frase (janela e relatório). */
export function descreverValidacao(r) {
  switch (r.t) {
    case 'list': {
      if (/^"/.test(r.f1 || '')) return `Lista: ${String(r.f1).replace(/^"|"$/g, '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 4).join(', ')}${String(r.f1).split(',').length > 4 ? '…' : ''}`;
      return `Lista vinda de ${fmtF(r.f1)}`;
    }
    case 'whole': return `Número inteiro ${nomeOperador(r.op)} ${fmtF(r.f1)}${!r.op || r.op === 'between' || r.op === 'notBetween' ? ' e ' + fmtF(r.f2) : ''}`;
    case 'decimal': return `Número ${nomeOperador(r.op)} ${fmtF(r.f1)}${!r.op || r.op === 'between' || r.op === 'notBetween' ? ' e ' + fmtF(r.f2) : ''}`;
    case 'date': return `Data ${nomeOperador(r.op)} ${fmtF(r.f1)}${!r.op || r.op === 'between' || r.op === 'notBetween' ? ' e ' + fmtF(r.f2) : ''}`;
    case 'time': return `Hora ${nomeOperador(r.op)} ${fmtF(r.f1)}${!r.op || r.op === 'between' || r.op === 'notBetween' ? ' e ' + fmtF(r.f2) : ''}`;
    case 'textLength': return `Tamanho do texto ${nomeOperador(r.op)} ${fmtF(r.f1)}${!r.op || r.op === 'between' || r.op === 'notBetween' ? ' e ' + fmtF(r.f2) : ''}`;
    case 'custom': return `Fórmula: =${fmtF(r.f1)}`;
    default: return 'Qualquer valor';
  }
}

/* ============================================================
   Comentários
   ============================================================ */
export const comentarioEm = (aba, l, c) => (aba && aba.com ? aba.com[chave(l, c)] || null : null);
/** Texto inteiro do balão: a nota e as respostas. */
export function textoDoComentario(x) {
  if (!x) return '';
  const partes = [x.t || ''];
  for (const r of x.r || []) partes.push(`${r.a ? r.a + ': ' : ''}${r.t}`);
  return partes.join('\n');
}
export function listaComentarios(aba) {
  return Object.keys((aba && aba.com) || {}).map((k) => ({ k, p: lerChave(k), x: aba.com[k] })).filter((q) => q.p).sort((a, b) => a.p.l - b.p.l || a.p.c - b.p.c);
}

/* ============================================================
   Mexer nas faixas quando linhas/colunas entram ou saem
   ============================================================ */
/** Move uma faixa por inserção (n > 0) ou exclusão (n < 0) de linhas/colunas a partir de i. null = a faixa sumiu. */
export function moverFaixa(f, eixo, i, n) {
  const a = eixo === 'l' ? 'l1' : 'c1', b = eixo === 'l' ? 'l2' : 'c2';
  const max = eixo === 'l' ? MAX_LIN : MAX_COL;
  const r = { ...f };
  if (n > 0) {
    if (r[a] >= i) r[a] += n;
    if (r[b] >= i) r[b] += n;
  } else {
    const k = -n, fim = i + k - 1;
    const ajusta = (x, ehInicio) => { if (x < i) return x; if (x > fim) return x - k; return ehInicio ? i : i - 1; };
    if (r[b] >= i && r[a] <= fim && r[a] >= i && r[b] <= fim) return null;
    r[a] = ajusta(r[a], true); r[b] = ajusta(r[b], false);
    if (r[b] < r[a]) return null;
  }
  if (r[b] >= max) r[b] = max - 1;
  if (r[a] >= max) return null;
  return r;
}
export function moverRegras(aba, eixo, i, n) {
  const out = {};
  const mexe = (txt) => { const fs = faixasDe(txt).map((f) => moverFaixa(f, eixo, i, n)).filter(Boolean); return fs.length ? textoFaixas(fs) : null; };
  if (aba.val) { const v = aba.val.map((r) => { const fx = mexe(r.fx); return fx ? { ...r, fx } : null; }).filter(Boolean); out.val = v.length ? v : undefined; }
  if (aba.cf) { const v = aba.cf.map((r) => { const fx = mexe(r.fx); return fx ? { ...r, fx } : null; }).filter(Boolean); out.cf = v.length ? v : undefined; }
  if (aba.com) {
    const m = {};
    for (const k of Object.keys(aba.com)) {
      const p = lerChave(k);
      if (!p) continue;
      const f = moverFaixa({ l1: p.l, c1: p.c, l2: p.l, c2: p.c }, eixo, i, n);
      if (f) m[chave(f.l1, f.c1)] = aba.com[k];
    }
    out.com = Object.keys(m).length ? m : undefined;
  }
  return out;
}

/* ============================================================
   Tirar uma área das faixas de uma regra (limpar regras da seleção)
   ============================================================ */
function subtrair(a, b) {
  if (b.l1 > a.l2 || b.l2 < a.l1 || b.c1 > a.c2 || b.c2 < a.c1) return [a];
  const out = [];
  if (b.l1 > a.l1) out.push({ l1: a.l1, c1: a.c1, l2: b.l1 - 1, c2: a.c2 });
  if (b.l2 < a.l2) out.push({ l1: b.l2 + 1, c1: a.c1, l2: a.l2, c2: a.c2 });
  const l1 = Math.max(a.l1, b.l1), l2 = Math.min(a.l2, b.l2);
  if (b.c1 > a.c1) out.push({ l1, c1: a.c1, l2, c2: b.c1 - 1 });
  if (b.c2 < a.c2) out.push({ l1, c1: b.c2 + 1, l2, c2: a.c2 });
  return out;
}
/** "A1:B9 D3" menos as faixas da seleção → texto novo (vazio se nada sobrou). */
export function tirarDeFaixas(texto, sel) {
  let fs = faixasDe(texto);
  for (const s of sel) fs = fs.flatMap((f) => subtrair(f, normalFaixa(s)));
  return textoFaixas(fs);
}
/** Tem alguma regra mexendo nesta seleção? */
export const regraToca = (r, sel) => faixasDe(r.fx).some((f) => sel.some((s) => { const n = normalFaixa(s); return !(f.l1 > n.l2 || f.l2 < n.l1 || f.c1 > n.c2 || f.c2 < n.c1); }));
