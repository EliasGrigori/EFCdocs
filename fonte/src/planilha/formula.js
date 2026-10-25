/* EFCdocs — Planilha: leitor de fórmula (pt-BR e inglês), árvore da conta e escrita de volta.
   A fórmula é guardada como no arquivo do Excel (nomes em inglês, vírgula entre argumentos, ponto decimal)
   e mostrada em pt-BR (ponto e vírgula, vírgula decimal). Assim o arquivo vai e volta do Excel sem tradução. */

import { MAX_LIN, MAX_COL, numCol, letraCol, nomeAbaNaFormula } from './ref.js';
import { acharFuncao, POR_EN } from './nomesFuncoes.js';
import { ERRO_PT, ERRO_DE_PT } from './valores.js';

export const LOC = {
  pt: { sep: ';', dec: ',', arrCol: '\\', arrLin: ';', V: 'VERDADEIRO', F: 'FALSO' },
  en: { sep: ',', dec: '.', arrCol: ',', arrLin: ';', V: 'TRUE', F: 'FALSE' },
};

export class ErroFormula extends Error {
  constructor(msg, pos, extra = {}) { super(msg); this.pos = pos; Object.assign(this, extra); }
}

const RX_ERRO = /^#(DIV\/0!|N\/A|N\/D|REF!|VALUE!|VALOR!|NAME\?|NOME\?|NUM!|NÚM!|NULL!|NULO!|SPILL!|DESPEJAR!|CALC!)/i;
const RX_ABA_ASPAS = /^'((?:[^']|'')+)'!/;
const RX_ABA = /^([A-Za-zÀ-ÿ_][\wÀ-ÿ.]*)!/;
const RX_CEL = /^(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})(?::(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7}))?(?![\wÀ-ÿ.(])/;
const RX_COLS = /^(\$?)([A-Za-z]{1,3}):(\$?)([A-Za-z]{1,3})(?![\wÀ-ÿ.(])/;
const RX_LINS = /^(\$?)(\d{1,7}):(\$?)(\d{1,7})(?![\wÀ-ÿ.(])/;
const RX_ID = /^[A-Za-zÀ-ÿ_\\][\wÀ-ÿ.]*/;

const linOk = (n) => n >= 1 && n <= MAX_LIN;

/** Lê a célula/faixa na posição (com aba opcional). null se não for referência. */
function lerRef(s, i) {
  const resto = s.slice(i);
  let aba = null, tam = 0;
  let m = RX_ABA_ASPAS.exec(resto);
  if (m) { aba = m[1].replace(/''/g, "'"); tam = m[0].length; }
  else if ((m = RX_ABA.exec(resto))) { aba = m[1]; tam = m[0].length; }
  const r = resto.slice(tam);
  if ((m = RX_CEL.exec(r))) {
    const c1 = numCol(m[2]), l1 = +m[4];
    if (c1 >= 0 && linOk(l1)) {
      if (m[6]) {
        const c2 = numCol(m[6]), l2 = +m[8];
        if (c2 < 0 || !linOk(l2)) return null;
        return { t: 'area', tipo: 'cel', aba, l1: l1 - 1, c1, l2: l2 - 1, c2, al1: !!m[3] && m[3] === '$', ac1: m[1] === '$', al2: m[7] === '$', ac2: m[5] === '$', tam: tam + m[0].length };
      }
      return { t: 'ref', aba, l: l1 - 1, c: c1, al: m[3] === '$', ac: m[1] === '$', tam: tam + m[0].length };
    }
  }
  if ((m = RX_COLS.exec(r))) {
    const c1 = numCol(m[2]), c2 = numCol(m[4]);
    if (c1 >= 0 && c2 >= 0) return { t: 'area', tipo: 'col', aba, l1: 0, l2: MAX_LIN - 1, c1, c2, ac1: m[1] === '$', ac2: m[3] === '$', al1: false, al2: false, tam: tam + m[0].length };
  }
  if ((m = RX_LINS.exec(r))) {
    const l1 = +m[2], l2 = +m[4];
    if (linOk(l1) && linOk(l2)) return { t: 'area', tipo: 'lin', aba, c1: 0, c2: MAX_COL - 1, l1: l1 - 1, l2: l2 - 1, al1: m[1] === '$', al2: m[3] === '$', ac1: false, ac2: false, tam: tam + m[0].length };
  }
  return aba ? { t: 'abaSemRef', aba, tam } : null;
}

/**
 * Quebra o texto (sem o "=") em pedaços. Tolerante: nunca falha; o que não entende vira { t:'ruim' }.
 * Cada pedaço tem i (início) e f (fim) no texto, para cores, dicas e "Corrigir".
 */
export function tokenizar(s, loc = 'pt') {
  const L = LOC[loc];
  const out = [];
  let i = 0;
  let chaves = 0;
  const num = loc === 'pt' ? /^(\d+(,\d*)?|,\d+)([eE][+-]?\d+)?/ : /^(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/;
  while (i < s.length) {
    const ch = s[i];
    if (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r') { i++; continue; }
    const ini = i;
    const anterior = out[out.length - 1];
    const podeRef = !anterior || !['num', 'str', 'ref', 'area', 'nome', 'fecha', 'bool', 'err'].includes(anterior.t);
    if (chaves > 0 && (ch === L.arrCol || ch === L.arrLin) && ch !== L.dec) {
      out.push({ t: ch === L.arrCol ? 'arrCol' : 'arrLin', i: ini, f: i + 1 }); i++; continue;
    }
    if (ch === '"') {
      let j = i + 1, v = '', aberto = true;
      while (j < s.length) {
        if (s[j] === '"') {
          if (s[j + 1] === '"') { v += '"'; j += 2; continue; }
          aberto = false; j++; break;
        }
        v += s[j++];
      }
      out.push({ t: 'str', v, i: ini, f: j, aberto });
      i = j; continue;
    }
    if (ch === '#') {
      const m = RX_ERRO.exec(s.slice(i));
      if (m) {
        const tx = m[0].toUpperCase();
        out.push({ t: 'err', v: ERRO_DE_PT[tx] || (Object.keys(ERRO_PT).includes(tx) ? tx : '#N/A'), i: ini, f: i + m[0].length });
        i += m[0].length; continue;
      }
      if (anterior && (anterior.t === 'ref') && anterior.f === i) { anterior.spill = true; anterior.f = i + 1; i++; continue; }
      out.push({ t: 'ruim', v: ch, i: ini, f: i + 1 }); i++; continue;
    }
    if (podeRef && (/[A-Za-zÀ-ÿ_'$\d]/.test(ch))) {
      const r = lerRef(s, i);
      if (r && r.t !== 'abaSemRef') {
        const { tam, ...v } = r;
        out.push({ t: v.t, v, i: ini, f: i + tam });
        i += tam; continue;
      }
      if (r && r.t === 'abaSemRef') {
        out.push({ t: 'ruim', v: s.slice(i, i + r.tam), i: ini, f: i + r.tam, msg: 'aba sem célula' });
        i += r.tam; continue;
      }
    }
    if (/\d/.test(ch) || (ch === L.dec && /\d/.test(s[i + 1] || ''))) {
      const m = num.exec(s.slice(i));
      if (m) {
        out.push({ t: 'num', v: Number(m[0].replace(',', '.')), txt: m[0], i: ini, f: i + m[0].length });
        i += m[0].length; continue;
      }
    }
    const mid = RX_ID.exec(s.slice(i));
    if (mid) {
      const nome = mid[0];
      const f = i + nome.length;
      const up = nome.toUpperCase();
      if (s[f] === '(') {
        out.push({ t: 'fn', v: up, i: ini, f });
      } else if (up === 'TRUE' || up === 'VERDADEIRO') out.push({ t: 'bool', v: true, i: ini, f, txt: nome });
      else if (up === 'FALSE' || up === 'FALSO') out.push({ t: 'bool', v: false, i: ini, f, txt: nome });
      else out.push({ t: 'nome', v: nome, i: ini, f });
      i = f; continue;
    }
    const dois = s.slice(i, i + 2);
    if (dois === '<=' || dois === '>=' || dois === '<>') { out.push({ t: 'op', v: dois, i: ini, f: i + 2 }); i += 2; continue; }
    if ('+-*/^&=<>:'.includes(ch)) { out.push({ t: 'op', v: ch, i: ini, f: i + 1 }); i++; continue; }
    if (ch === '%') { out.push({ t: 'pct', i: ini, f: i + 1 }); i++; continue; }
    if (ch === '(') { out.push({ t: 'abre', i: ini, f: i + 1 }); i++; continue; }
    if (ch === ')') { out.push({ t: 'fecha', i: ini, f: i + 1 }); i++; continue; }
    if (ch === '{') { chaves++; out.push({ t: 'chaveA', i: ini, f: i + 1 }); i++; continue; }
    if (ch === '}') { chaves = Math.max(0, chaves - 1); out.push({ t: 'chaveF', i: ini, f: i + 1 }); i++; continue; }
    if (chaves > 0) {
      if (ch === L.arrCol) { out.push({ t: 'arrCol', i: ini, f: i + 1 }); i++; continue; }
      if (ch === L.arrLin) { out.push({ t: 'arrLin', i: ini, f: i + 1 }); i++; continue; }
    }
    if (ch === L.sep) { out.push({ t: 'sep', i: ini, f: i + 1 }); i++; continue; }
    out.push({ t: 'ruim', v: ch, i: ini, f: i + 1 });
    i++;
  }
  return out;
}

/* ---------------- leitor (gera a árvore) ---------------- */

const COMPARA = ['=', '<>', '<', '>', '<=', '>='];

export function ler(texto, loc = 'pt') {
  const tk = tokenizar(texto, loc);
  let p = 0;
  const olha = () => tk[p];
  const fim = () => (tk[p] ? tk[p].i : texto.length);
  const espera = (t, msg) => {
    if (!tk[p] || tk[p].t !== t) throw new ErroFormula(msg, fim());
    return tk[p++];
  };
  const ruim = tk.find((t) => t.t === 'ruim');
  if (ruim) {
    const msg = ruim.v === ',' && loc === 'pt' ? 'Use ponto e vírgula (;) entre os argumentos, não vírgula.'
      : ruim.v === ';' && loc === 'en' ? 'Use vírgula entre os argumentos.'
        : ruim.msg === 'aba sem célula' ? 'Depois do nome da aba (!) falta a célula, ex.: Lotes!A1.'
          : `Não entendi o sinal "${ruim.v}".`;
    throw new ErroFormula(msg, ruim.i, { tk: ruim });
  }
  const aberto = tk.find((t) => t.t === 'str' && t.aberto);
  if (aberto) throw new ErroFormula('O texto foi aberto com aspas e não foi fechado. Todo texto vai entre um par de aspas, assim: "OK".', aberto.i);

  function expr() { return comparacao(); }
  function comparacao() {
    let a = concat();
    while (olha() && olha().t === 'op' && COMPARA.includes(olha().v)) {
      const o = tk[p++].v;
      a = { t: 'bin', o, a, b: concat() };
    }
    return a;
  }
  function concat() {
    let a = soma();
    while (olha() && olha().t === 'op' && olha().v === '&') { p++; a = { t: 'bin', o: '&', a, b: soma() }; }
    return a;
  }
  function soma() {
    let a = produto();
    while (olha() && olha().t === 'op' && (olha().v === '+' || olha().v === '-')) { const o = tk[p++].v; a = { t: 'bin', o, a, b: produto() }; }
    return a;
  }
  function produto() {
    let a = potencia();
    while (olha() && olha().t === 'op' && (olha().v === '*' || olha().v === '/')) { const o = tk[p++].v; a = { t: 'bin', o, a, b: potencia() }; }
    return a;
  }
  function potencia() {
    let a = porcento();
    while (olha() && olha().t === 'op' && olha().v === '^') { p++; a = { t: 'bin', o: '^', a, b: porcento() }; }
    return a;
  }
  function porcento() {
    let a = unario();
    while (olha() && olha().t === 'pct') { p++; a = { t: 'pct', a }; }
    return a;
  }
  function unario() {
    const t = olha();
    if (t && t.t === 'op' && (t.v === '-' || t.v === '+')) { p++; return { t: 'un', o: t.v, a: unario() }; }
    return intervalo();
  }
  /** LAMBDA(x;x*2)(4): a função devolvida é chamada com os valores entre os parênteses seguintes. */
  function chamadas(a) {
    while ((a.t === 'fn' || a.t === 'paren' || a.t === 'chamada') && olha() && olha().t === 'abre') {
      p++;
      a = { t: 'chamada', f: a, args: argumentos() };
    }
    return a;
  }
  function intervalo() {
    let a = chamadas(primario());
    while (olha() && olha().t === 'op' && olha().v === ':') { p++; a = { t: 'bin', o: ':', a, b: primario() }; }
    return a;
  }
  function argumentos() {
    const args = [];
    if (olha() && olha().t === 'fecha') { p++; return args; }
    for (;;) {
      const t = olha();
      if (!t) throw new ErroFormula('Falta fechar o parêntese: ponha ")" no fim.', texto.length, { falta: ')' });
      if (t.t === 'sep' || t.t === 'fecha') args.push({ t: 'vazio' });
      else args.push(expr());
      const d = olha();
      if (!d) throw new ErroFormula('Falta fechar o parêntese: ponha ")" no fim.', texto.length, { falta: ')' });
      if (d.t === 'sep') { p++; continue; }
      if (d.t === 'fecha') { p++; return args; }
      throw new ErroFormula('Entre dois valores falta um ponto e vírgula (;) ou um sinal de conta (+, -, *, /).', d.i);
    }
  }
  function constante() {
    const t = olha();
    if (!t) throw new ErroFormula('Matriz incompleta.', texto.length);
    let neg = false;
    if (t.t === 'op' && t.v === '-') { neg = true; p++; }
    const u = tk[p++];
    if (!u) throw new ErroFormula('Matriz incompleta.', texto.length);
    if (u.t === 'num') return { t: 'num', v: neg ? -u.v : u.v };
    if (!neg && u.t === 'str') return { t: 'str', v: u.v };
    if (!neg && u.t === 'bool') return { t: 'bool', v: u.v };
    if (!neg && u.t === 'err') return { t: 'err', v: u.v };
    throw new ErroFormula('Dentro de { } só vão números, textos, VERDADEIRO/FALSO ou erros.', u.i);
  }
  function primario() {
    const t = tk[p++];
    if (!t) throw new ErroFormula('A conta terminou no meio: depois do último sinal falta um número, uma célula ou uma função.', texto.length);
    switch (t.t) {
      case 'num': return { t: 'num', v: t.v, i: t.i, f: t.f };
      case 'str': return { t: 'str', v: t.v, i: t.i, f: t.f };
      case 'bool': return { t: 'bool', v: t.v, i: t.i, f: t.f };
      case 'err': return { t: 'err', v: t.v, i: t.i, f: t.f };
      case 'ref': return { ...t.v, spill: !!t.spill, i: t.i, f: t.f };
      case 'area': return { ...t.v, i: t.i, f: t.f };
      case 'nome': return { t: 'nome', n: t.v, i: t.i, f: t.f };
      case 'fn': {
        espera('abre', 'Falta abrir o parêntese.');
        const achou = acharFuncao(t.v);
        const args = argumentos();
        return { t: 'fn', n: achou ? achou.f.en : t.v, desc: !achou, como: achou ? achou.como : null, digitado: t.v, args, i: t.i, f: tk[p - 1].f };
      }
      case 'abre': {
        const a = expr();
        espera('fecha', 'Falta fechar o parêntese: ponha ")" no fim.');
        return { t: 'paren', a };
      }
      case 'chaveA': {
        const lin = [[constante()]];
        for (;;) {
          const d = tk[p++];
          if (!d) throw new ErroFormula('Falta fechar a chave }.', texto.length);
          if (d.t === 'chaveF') break;
          if (d.t === 'arrCol') lin[lin.length - 1].push(constante());
          else if (d.t === 'arrLin') lin.push([constante()]);
          else throw new ErroFormula('Separador errado dentro da matriz.', d.i);
        }
        if (lin.some((l) => l.length !== lin[0].length)) throw new ErroFormula('As linhas da matriz têm tamanhos diferentes.', t.i);
        return { t: 'arr', lin };
      }
      case 'op': throw new ErroFormula(`Antes do sinal "${t.v}" falta um valor. Exemplo: =A1${t.v}B1.`, t.i);
      case 'fecha': throw new ErroFormula('Este parêntese fecha algo que não foi aberto. Cada "(" precisa de um ")".', t.i);
      case 'sep': throw new ErroFormula('O ponto e vírgula só separa as partes de uma função, como em SOMA(A1;B1). Aqui ele está fora de qualquer função.', t.i);
      default: throw new ErroFormula('Não consegui entender esta parte da conta. Confira se não sobrou ou faltou algum sinal.', t.i);
    }
  }
  if (!tk.length) throw new ErroFormula('Depois do = falta a conta. Exemplo: =A1+B1.', 0);
  const arv = expr();
  if (p < tk.length) {
    const t = tk[p];
    if (t.t === 'fecha') throw new ErroFormula('Este parêntese fecha algo que não foi aberto. Cada "(" precisa de um ")".', t.i);
    throw new ErroFormula('Entre dois valores falta um sinal de conta (+, -, *, /) ou o & para juntar textos.', t.i);
  }
  return arv;
}

/* ---------------- escrita (árvore → texto) ---------------- */

function numTexto(v, loc) {
  let s = String(v);
  if (/e/i.test(s)) {
    const [m, e] = s.split(/e/i);
    const ex = Number(e);
    s = m + 'E' + (ex < 0 ? '-' : '+') + String(Math.abs(ex)).padStart(2, '0');
  }
  return loc === 'pt' ? s.replace('.', ',') : s;
}
const prefixo = (aba) => (aba == null ? '' : nomeAbaNaFormula(aba) + '!');
const celTx = (l, c, al, ac) => (ac ? '$' : '') + letraCol(c) + (al ? '$' : '') + (l + 1);

export function refTexto(n) {
  if (n.t === 'ref') return prefixo(n.aba) + celTx(n.l, n.c, n.al, n.ac) + (n.spill ? '#' : '');
  if (n.tipo === 'col') return prefixo(n.aba) + (n.ac1 ? '$' : '') + letraCol(n.c1) + ':' + (n.ac2 ? '$' : '') + letraCol(n.c2);
  if (n.tipo === 'lin') return prefixo(n.aba) + (n.al1 ? '$' : '') + (n.l1 + 1) + ':' + (n.al2 ? '$' : '') + (n.l2 + 1);
  return prefixo(n.aba) + celTx(n.l1, n.c1, n.al1, n.ac1) + ':' + celTx(n.l2, n.c2, n.al2, n.ac2);
}

export function escrever(n, loc = 'en') {
  const L = LOC[loc];
  const w = (x) => escrever(x, loc);
  switch (n.t) {
    case 'num': return numTexto(n.v, loc);
    case 'str': return '"' + n.v.replace(/"/g, '""') + '"';
    case 'bool': return n.v ? L.V : L.F;
    case 'err': return loc === 'pt' ? (ERRO_PT[n.v] || n.v) : n.v;
    case 'ref': case 'area': return refTexto(n);
    case 'nome': return n.n;
    case 'fn': {
      const f = !n.desc && POR_EN[n.n];
      const nome = f ? (loc === 'pt' ? f.pt : f.en) : n.n;
      return nome + '(' + n.args.map(w).join(L.sep) + ')';
    }
    case 'paren': return '(' + w(n.a) + ')';
    case 'chamada': return w(n.f) + '(' + n.args.map(w).join(L.sep) + ')';
    case 'bin': return w(n.a) + n.o + w(n.b);
    case 'un': return n.o + w(n.a);
    case 'pct': return w(n.a) + '%';
    case 'vazio': return '';
    case 'arr': return '{' + n.lin.map((l) => l.map(w).join(L.arrCol)).join(L.arrLin) + '}';
    default: return '';
  }
}

/** Texto digitado em pt-BR (sem "=") → texto guardado (Excel, inglês). Lança ErroFormula se não der. */
export function paraGuardar(textoPt) { return escrever(ler(textoPt, 'pt'), 'en'); }
/** Texto guardado → texto mostrado em pt-BR. */
export function paraMostrar(textoEn) {
  try { return escrever(lerGuardada(textoEn), 'pt'); } catch { return textoEn; }
}

const cacheArv = new Map();
/** Árvore de uma fórmula guardada (com memória, porque a mesma fórmula aparece em muitas linhas). */
export function lerGuardada(textoEn) {
  let a = cacheArv.get(textoEn);
  if (!a) {
    a = ler(textoEn, 'en');
    if (cacheArv.size > 20000) cacheArv.clear();
    cacheArv.set(textoEn, a);
  }
  return a;
}

/* ---------------- mexer nas referências ---------------- */

/** Copia a árvore trocando cada referência por fnRef(nó) (que pode devolver o próprio nó). */
export function mapearRefs(n, fnRef, fnNome) {
  const m = (x) => mapearRefs(x, fnRef, fnNome);
  switch (n.t) {
    case 'ref': case 'area': return fnRef(n);
    case 'nome': return fnNome ? fnNome(n) : n;
    case 'fn': return { ...n, args: n.args.map(m) };
    case 'chamada': return { ...n, f: m(n.f), args: n.args.map(m) };
    case 'paren': case 'un': case 'pct': return { ...n, a: m(n.a) };
    case 'bin': return { ...n, a: m(n.a), b: m(n.b) };
    default: return n;
  }
}

const REF_ERR = { t: 'err', v: '#REF!' };

/** Copiar/arrastar a fórmula: anda as partes sem $ (como o Excel). */
export function deslocar(arv, dl, dc) {
  return mapearRefs(arv, (n) => {
    if (n.t === 'ref') {
      const l = n.al ? n.l : n.l + dl, c = n.ac ? n.c : n.c + dc;
      if (l < 0 || c < 0 || l >= MAX_LIN || c >= MAX_COL) return REF_ERR;
      return { ...n, l, c };
    }
    const r = { ...n };
    if (n.tipo !== 'col') {
      if (!n.al1) r.l1 += dl;
      if (!n.al2) r.l2 += dl;
    }
    if (n.tipo !== 'lin') {
      if (!n.ac1) r.c1 += dc;
      if (!n.ac2) r.c2 += dc;
    }
    if (r.l1 < 0 || r.l2 < 0 || r.c1 < 0 || r.c2 < 0 || r.l1 >= MAX_LIN || r.l2 >= MAX_LIN || r.c1 >= MAX_COL || r.c2 >= MAX_COL) return REF_ERR;
    return r;
  });
}

const daAba = (n, abaAlvo, abaDaFormula) => { const a = n.aba == null ? abaDaFormula : n.aba; return a != null && abaAlvo != null && String(a).toLowerCase() === String(abaAlvo).toLowerCase(); };

/**
 * Inserir (n > 0) ou excluir (n < 0) linhas/colunas a partir do índice i na aba abaAlvo.
 * eixo: 'l' ou 'c'. Referência a algo excluído vira #REF! (como no Excel).
 */
export function ajustarEstrutura(arv, { abaAlvo, abaDaFormula, eixo, i, n }) {
  const exclui = n < 0;
  const k = Math.abs(n);
  const MAX = eixo === 'l' ? MAX_LIN : MAX_COL;
  const um = (x) => {
    if (!exclui) return x >= i ? x + k : x;
    if (x >= i && x < i + k) return null;
    return x >= i + k ? x - k : x;
  };
  return mapearRefs(arv, (r) => {
    if (!daAba(r, abaAlvo, abaDaFormula)) return r;
    if (r.t === 'ref') {
      const v = um(eixo === 'l' ? r.l : r.c);
      if (v == null || v >= MAX) return REF_ERR;
      return eixo === 'l' ? { ...r, l: v } : { ...r, c: v };
    }
    if ((eixo === 'l' && r.tipo === 'col') || (eixo === 'c' && r.tipo === 'lin')) return r;
    const [k1, k2] = eixo === 'l' ? ['l1', 'l2'] : ['c1', 'c2'];
    let a = r[k1], b = r[k2];
    if (!exclui) {
      if (a >= i) a += k;
      if (b >= i) b += k;
      if (b >= MAX) b = MAX - 1;
      if (a >= MAX) return REF_ERR;
    } else {
      const na = a < i ? a : a >= i + k ? a - k : i;
      const nb = b < i ? b : b >= i + k ? b - k : i - 1;
      if (nb < na) return REF_ERR;
      a = na; b = nb;
    }
    return { ...r, [k1]: a, [k2]: b };
  });
}

export function renomearAbaNaArvore(arv, velho, novo) {
  return mapearRefs(arv, (r) => (r.aba != null && r.aba.toLowerCase() === velho.toLowerCase() ? { ...r, aba: novo } : r));
}
export function excluirAbaNaArvore(arv, nome) {
  return mapearRefs(arv, (r) => (r.aba != null && r.aba.toLowerCase() === nome.toLowerCase() ? REF_ERR : r));
}
export function renomearNomeNaArvore(arv, velho, novo) {
  return mapearRefs(arv, (r) => r, (n) => (n.n.toLowerCase() === velho.toLowerCase() ? { ...n, n: novo } : n));
}

/** Lista o que a conta usa: faixas (com aba), nomes, e se é volátil (HOJE, DESLOC, INDIRETO...). */
export function dependencias(arv) {
  const faixas = [], nomes = new Set();
  let volatil = false, desconhecidas = [];
  (function vai(n) {
    switch (n.t) {
      case 'ref': faixas.push({ aba: n.aba, l1: n.l, c1: n.c, l2: n.l, c2: n.c, spill: !!n.spill }); break;
      case 'area': faixas.push({ aba: n.aba, l1: n.l1, c1: n.c1, l2: n.l2, c2: n.c2 }); break;
      case 'nome': nomes.add(n.n.toLowerCase()); break;
      case 'fn': {
        const f = POR_EN[n.n];
        if (n.desc) desconhecidas.push(n.n);
        if (f && f.vol) volatil = true;
        n.args.forEach(vai); break;
      }
      case 'chamada': vai(n.f); n.args.forEach(vai); break;
      case 'paren': case 'un': case 'pct': vai(n.a); break;
      case 'bin': vai(n.a); vai(n.b); break;
      default:
    }
  })(arv);
  return { faixas, nomes: [...nomes], volatil, desconhecidas };
}

/** O texto da fórmula guardada depois de aplicar uma mudança na árvore. */
export const reescrever = (textoEn, fn) => {
  try { return escrever(fn(lerGuardada(textoEn)), 'en'); } catch { return textoEn; }
};
