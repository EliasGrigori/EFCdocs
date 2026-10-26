/* EFCdocs — Planilha: motor de cálculo próprio, separado das telas.
   - Recalcula só o que depende da célula alterada (mapa de quem usa quem).
   - Erros iguais aos do Excel; avisa conta circular (a célula fica com 0, como no Excel).
   - Fórmulas que derramam (FILTRO, ÚNICO, CLASSIFICAR, SEQUÊNCIA...) ocupam as células vizinhas ou dão #DESPEJAR!.
   - Função que o EFCdocs ainda não conhece: a fórmula fica guardada e a célula mostra o último valor do Excel. */
import { E, Erro, ehErro, aNumero, aTexto, comparar } from './valores.js';
import { Ref, Mat, ehRef, ehMat, ehMultiplo } from './tipos.js';
import { lerGuardada, ler, dependencias, ErroFormula } from './formula.js';
import { IMPL, potencia } from './funcoes.js';
import { POR_EN } from './nomesFuncoes.js';
import { MAX_COL, MAX_LIN, chave, lerChave, lerEndereco } from './ref.js';
import { valorGuardado } from './modelo.js';

const K = (l, c) => l * MAX_COL + c;
const LC = (k) => [Math.floor(k / MAX_COL), k % MAX_COL];
const FK = (abaId, k) => abaId + '|' + k;
const deFK = (fk) => { const i = fk.lastIndexOf('|'); return [fk.slice(0, i), +fk.slice(i + 1)]; };
const LARGO = 60;
/* funções cujos argumentos o Excel antigo calcula como matriz mesmo sem Ctrl+Shift+Enter */
const MATRIZ_LEGADO = new Set(['SUMPRODUCT', 'LOOKUP', 'INDEX', 'MMULT', 'MDETERM', 'MINVERSE', 'FREQUENCY', 'AGGREGATE', 'LINEST', 'LOGEST', 'TREND', 'GROWTH', 'SUMX2MY2', 'SUMX2PY2', 'SUMXMY2']); // faixas com mais colunas que isso vão para a lista "larga" do índice

const OPS = {
  '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b,
  '/': (a, b) => (b === 0 ? E.DIV0 : a / b), '^': potencia,
};
const CMP = {
  '=': (r) => r === 0, '<>': (r) => r !== 0, '<': (r) => r < 0, '>': (r) => r > 0, '<=': (r) => r <= 0, '>=': (r) => r >= 0,
};

function opBin(o, x, y) {
  if (ehErro(x)) return x;
  if (ehErro(y)) return y;
  if (o === '&') {
    const a = aTexto(x), b = aTexto(y);
    return a + b;
  }
  if (CMP[o]) {
    let a = x, b = y;
    if (typeof a === 'string' && typeof b === 'string') return CMP[o](comparar(a, b));
    return CMP[o](comparar(a, b));
  }
  const a = aNumero(x);
  if (ehErro(a)) return a;
  const b = aNumero(y);
  if (ehErro(b)) return b;
  const r = OPS[o](a, b);
  return typeof r === 'number' && !Number.isFinite(r) ? E.NUM : r;
}

export class Motor {
  constructor(conteudo) {
    this.carregar(conteudo);
  }

  /* ---------------- índice ---------------- */
  carregar(c) {
    this.c = c;
    this.idPorNome = new Map();
    for (const id of c.ordem) this.idPorNome.set(c.abas[id].nome.toLowerCase(), id);
    this.form = {}; this.vals = {}; this.spill = {}; this.spillDe = {};
    this.dep1 = {}; this.depCol = {}; this.depLargo = {}; this.usados = {};
    this.usoNomes = new Map(); this.volateis = new Set(); this.usaSpill = new Set(); this.subtotais = new Set();
    this.circ = new Set(); this.pilha = new Set();
    this.nomesArv = new Map();
    for (const [k, n] of Object.entries(c.nomes || {})) {
      try { this.nomesArv.set(k, ler(n.ref, 'en')); } catch { this.nomesArv.set(k, null); }
    }
    for (const id of c.ordem) {
      this.form[id] = new Map(); this.vals[id] = new Map(); this.spill[id] = new Map(); this.spillDe[id] = new Map();
      this.dep1[id] = new Map(); this.depCol[id] = new Map(); this.depLargo[id] = [];
    }
    for (const id of c.ordem) {
      const cel = c.abas[id].cel;
      for (const k of Object.keys(cel)) {
        if (cel[k] && cel[k].f != null) {
          const p = lerChave(k);
          if (p) this.registrar(id, p.l, p.c, cel[k].f, !!cel[k].lg);
        }
      }
      this.usados[id] = null;
    }
    if (c.calcExcel) this.semearDoExcel(); else this.recalcularTudo();
  }

  abaId(nome, atual) {
    if (nome == null) return atual;
    return this.idPorNome.get(String(nome).toLowerCase()) || null;
  }

  /** Faixas que a fórmula usa (com nomes definidos abertos), já com o id da aba. */
  faixasDe(arv, abaId, prof = 0) {
    const d = dependencias(arv);
    const out = [];
    for (const f of d.faixas) {
      const id = this.abaId(f.aba, abaId);
      if (id) out.push({ abaId: id, l1: f.l1, c1: f.c1, l2: f.l2, c2: f.c2, spill: f.spill });
    }
    if (prof < 5) {
      for (const n of d.nomes) {
        const a = this.nomesArv.get(n);
        if (a) out.push(...this.faixasDe(a, abaId, prof + 1).faixas);
      }
    }
    return { faixas: out, nomes: d.nomes, volatil: d.volatil, desconhecidas: d.desconhecidas };
  }

  registrar(abaId, l, c, f, lg = false) {
    const k = K(l, c);
    const fk = FK(abaId, k);
    let arv = null, erro = null;
    try { arv = lerGuardada(f); } catch (e) { erro = e; }
    const info = { abaId, l, c, k, fk, f, arv, erro, deps: [], nomes: [], desc: [], vol: false, lg };
    if (arv) {
      const d = this.faixasDe(arv, abaId);
      info.deps = d.faixas; info.nomes = d.nomes; info.desc = d.desconhecidas.filter((n) => !IMPL[n]);
      info.vol = d.volatil || /\b(INDIRECT|OFFSET)\(/.test(f);
      info.sub = /\b(SUBTOTAL|AGGREGATE)\(/.test(f);
    }
    this.form[abaId].set(k, info);
    for (const dp of info.deps) {
      if (dp.spill) this.usaSpill.add(fk);
      if (dp.l1 === dp.l2 && dp.c1 === dp.c2) {
        const m = this.dep1[dp.abaId];
        const kk = K(dp.l1, dp.c1);
        if (!m.has(kk)) m.set(kk, new Set());
        m.get(kk).add(fk);
      } else if (dp.c2 - dp.c1 + 1 > LARGO) this.depLargo[dp.abaId].push({ ...dp, fk });
      else {
        const mc = this.depCol[dp.abaId];
        for (let cc = dp.c1; cc <= dp.c2; cc++) {
          if (!mc.has(cc)) mc.set(cc, []);
          mc.get(cc).push({ l1: dp.l1, l2: dp.l2, fk });
        }
      }
    }
    for (const n of info.nomes) {
      if (!this.usoNomes.has(n)) this.usoNomes.set(n, new Set());
      this.usoNomes.get(n).add(fk);
    }
    if (info.vol) this.volateis.add(fk);
    if (info.sub) this.subtotais.add(fk);
  }

  desregistrar(abaId, k) {
    const info = this.form[abaId].get(k);
    if (!info) return;
    const fk = info.fk;
    for (const dp of info.deps) {
      if (dp.l1 === dp.l2 && dp.c1 === dp.c2) {
        const s = this.dep1[dp.abaId].get(K(dp.l1, dp.c1));
        if (s) s.delete(fk);
      } else if (dp.c2 - dp.c1 + 1 > LARGO) this.depLargo[dp.abaId] = this.depLargo[dp.abaId].filter((x) => x.fk !== fk);
      else {
        const mc = this.depCol[dp.abaId];
        for (let cc = dp.c1; cc <= dp.c2; cc++) {
          const l = mc.get(cc);
          if (l) mc.set(cc, l.filter((x) => x.fk !== fk));
        }
      }
    }
    for (const n of info.nomes) { const s = this.usoNomes.get(n); if (s) s.delete(fk); }
    this.volateis.delete(fk); this.usaSpill.delete(fk); this.subtotais.delete(fk); this.circ.delete(fk);
    this.form[abaId].delete(k);
    this.vals[abaId].delete(k);
    this.limparSpill(abaId, k);
  }

  /** Quem usa diretamente a célula (fk das fórmulas). */
  quemUsa(abaId, l, c) {
    const out = new Set();
    const s = this.dep1[abaId] && this.dep1[abaId].get(K(l, c));
    if (s) for (const x of s) out.add(x);
    const col = this.depCol[abaId] && this.depCol[abaId].get(c);
    if (col) for (const x of col) if (l >= x.l1 && l <= x.l2) out.add(x.fk);
    for (const x of (this.depLargo[abaId] || [])) if (l >= x.l1 && l <= x.l2 && c >= x.c1 && c <= x.c2) out.add(x.fk);
    return out;
  }

  /* ---------------- leitura de valores ---------------- */
  cel(abaId, l, c) {
    const a = this.c.abas[abaId];
    return a ? a.cel[chave(l, c)] : undefined;
  }

  valor(abaId, l, c) {
    const k = K(l, c);
    const fm = this.form[abaId] && this.form[abaId].get(k);
    if (fm) return this.valorFormula(fm);
    const sp = this.spill[abaId] && this.spill[abaId].get(k);
    if (sp != null) {
      const s = this.spillDe[abaId].get(sp);
      if (s) { const v = s.m.d[l - s.l1][c - s.c1]; return v == null ? 0 : v; }
    }
    return valorGuardado(this.cel(abaId, l, c));
  }

  valorFormula(fm) {
    const vals = this.vals[fm.abaId];
    if (vals.has(fm.k)) return vals.get(fm.k);
    if (this.pilha.has(fm.fk)) {
      /* conta circular: todas as células do círculo ficam com 0 (como no Excel) e o app avisa */
      const p = [...this.pilha];
      for (const x of p.slice(p.indexOf(fm.fk))) this.circ.add(x);
      return 0;
    }
    /* a célula fica na pilha até o fim de finalizar: =C2 só devolve uma referência, e é o finalizar que
       vai buscar o valor de C2 (se C2 for =C1, sem isso a conta circular nunca era vista e a pilha estourava) */
    this.pilha.add(fm.fk);
    let r;
    try {
      try { r = this.calcular(fm); } catch (e) { r = e instanceof RangeError ? E.CALC : E.VALOR; }
      if (!this.circ.has(fm.fk)) {
        try { r = this.finalizar(fm, r); } catch (e) { r = e instanceof RangeError ? E.CALC : E.VALOR; }
      }
    } finally { this.pilha.delete(fm.fk); }
    if (this.circ.has(fm.fk)) { this.limparSpill(fm.abaId, fm.k); r = 0; }
    vals.set(fm.k, r);
    return r;
  }

  calcular(fm) {
    if (fm.erro || fm.desc.length) {
      /* fórmula que o EFCdocs ainda não entende (veio do Excel): mostra o último valor que o Excel calculou */
      const v = valorGuardado(this.cel(fm.abaId, fm.l, fm.c));
      return v == null ? E.NOME : v;
    }
    const ctx = this.contexto(fm.abaId, fm.l, fm.c);
    if (fm.lg) { ctx.legado = true; ctx.matrizLeg = 0; }
    return this.avaliar(fm.arv, ctx);
  }

  /** Resultado final da célula: faixa vira valor; matriz derrama (ou #DESPEJAR!). */
  finalizar(fm, r) {
    /* fórmula antiga do Excel (sem matriz dinâmica): faixa vira a célula da mesma linha/coluna e matriz vira o 1º valor, sem derramar */
    if (fm.lg) {
      if (ehRef(r) && !r.unica) r = this.deref(r, { abaId: fm.abaId, l: fm.l, c: fm.c });
      if (ehMat(r)) r = r.d[0] && r.d[0][0] != null ? r.d[0][0] : 0;
    }
    if (ehRef(r)) {
      if (r.unica) { const v = this.valor(r.abaId, r.l1, r.c1); r = v == null ? 0 : v; }
      else r = this.matriz(r);
    }
    if (ehMat(r)) {
      if (r.linhas === 0 || r.colunas === 0) { this.limparSpill(fm.abaId, fm.k); return E.CALC; }
      if (r.linhas === 1 && r.colunas === 1) { this.limparSpill(fm.abaId, fm.k); const v = r.d[0][0]; return v == null ? 0 : v; }
      return this.derramar(fm, r);
    }
    this.limparSpill(fm.abaId, fm.k);
    return r == null ? 0 : r;
  }

  derramar(fm, m) {
    const { abaId, l, c, k } = fm;
    const l2 = l + m.linhas - 1, c2 = c + m.colunas - 1;
    const antes = this.spillDe[abaId].get(k);
    let bloqueado = l2 >= MAX_LIN || c2 >= MAX_COL;
    if (!bloqueado) {
      const aba = this.c.abas[abaId];
      /* checa as células ocupadas: área pequena olha célula por célula; grande, só as que existem no arquivo */
      const ocupa = (x) => x && (x.v !== undefined || x.f != null);
      if ((l2 - l + 1) * (c2 - c + 1) <= 20000) {
        for (let i = l; i <= l2 && !bloqueado; i++) for (let j = c; j <= c2; j++) { if ((i !== l || j !== c) && ocupa(aba.cel[chave(i, j)])) { bloqueado = true; break; } }
      } else {
        for (const ch of Object.keys(aba.cel)) {
          const p = lerChave(ch);
          if (!p || p.l < l || p.l > l2 || p.c < c || p.c > c2 || (p.l === l && p.c === c)) continue;
          if (ocupa(aba.cel[ch])) { bloqueado = true; break; }
        }
      }
      if (!bloqueado) {
        for (const [kk, outro] of this.spill[abaId]) {
          if (outro === k) continue;
          const [ll, cc] = LC(kk);
          if (ll >= l && ll <= l2 && cc >= c && cc <= c2) { bloqueado = true; break; }
        }
      }
    }
    this.limparSpill(abaId, k, true);
    if (bloqueado) { this.marcarSpillMudou(abaId, antes); return E.DESPEJAR; }
    const reg = { l1: l, c1: c, l2, c2, m };
    this.spillDe[abaId].set(k, reg);
    for (let i = l; i <= l2; i++) for (let j = c; j <= c2; j++) if (i !== l || j !== c) this.spill[abaId].set(K(i, j), k);
    if (!antes || antes.l2 !== l2 || antes.c2 !== c2 || JSON.stringify(antes.m.d) !== JSON.stringify(m.d)) {
      this.marcarSpillMudou(abaId, antes);
      this.marcarSpillMudou(abaId, reg);
    }
    const v = m.d[0][0];
    return v == null ? 0 : v;
  }

  limparSpill(abaId, k, silencioso = false) {
    const s = this.spillDe[abaId] && this.spillDe[abaId].get(k);
    if (!s) return;
    for (let i = s.l1; i <= s.l2; i++) for (let j = s.c1; j <= s.c2; j++) if (this.spill[abaId].get(K(i, j)) === k) this.spill[abaId].delete(K(i, j));
    this.spillDe[abaId].delete(k);
    if (!silencioso) this.marcarSpillMudou(abaId, s);
  }

  marcarSpillMudou(abaId, area) {
    if (!area) return;
    this.limparCacheMat();
    if (!this.spillPendente) this.spillPendente = [];
    this.spillPendente.push({ abaId, ...area });
  }

  /* ---------------- avaliação ---------------- */
  contexto(abaId, l, c) {
    const motor = this;
    const ctx = {
      abaId, l, c, lets: [],
      av: (n) => motor.avaliar(n, ctx),
      deref: (x) => motor.deref(x, ctx),
      mat: (x, limite) => motor.matriz(x, limite),
      cada: (x, cb, todas) => motor.cada(x, cb, todas),
      ultimaLinha: (refs) => Math.max(...refs.map((r) => motor.usado(r.abaId).lMax)),
      ehSubtotal: (a, ll, cc) => { const f = motor.form[a] && motor.form[a].get(K(ll, cc)); return !!(f && f.sub); },
      linhaOculta: (a, ll) => { const aba = motor.c.abas[a]; return !!(aba && aba.ocL && aba.ocL[ll]); },
      /* linha escondida por um filtro (veio do Excel): o SUBTOTAL sempre pula, como no Excel */
      linhaFiltrada: (a, ll) => { const aba = motor.c.abas[a]; return !!(aba && aba.ocF && aba.ocF[ll] && aba.ocL && aba.ocL[ll]); },
      refDeTexto: (t) => motor.refDeTexto(t, abaId),
    };
    return ctx;
  }

  avaliar(n, ctx) {
    switch (n.t) {
      case 'num': case 'str': case 'bool': return n.v;
      case 'err': return Object.values(E).find((e) => e.cod === n.v) || E.REF;
      case 'ref': {
        const id = this.abaId(n.aba, ctx.abaId);
        if (!id) return E.REF;
        if (n.spill) {
          const s = this.spillDe[id].get(K(n.l, n.c));
          const fm = this.form[id].get(K(n.l, n.c));
          if (fm) this.valorFormula(fm);
          const s2 = this.spillDe[id].get(K(n.l, n.c)) || s;
          if (!s2) return fm ? new Ref(id, n.l, n.c, n.l, n.c) : E.REF;
          return new Ref(id, s2.l1, s2.c1, s2.l2, s2.c2);
        }
        return new Ref(id, n.l, n.c, n.l, n.c);
      }
      case 'area': {
        const id = this.abaId(n.aba, ctx.abaId);
        if (!id) return E.REF;
        return new Ref(id, n.l1, n.c1, n.l2, n.c2);
      }
      case 'nome': {
        const k = n.n.toLowerCase();
        for (let i = ctx.lets.length - 1; i >= 0; i--) if (ctx.lets[i].has(k)) return ctx.lets[i].get(k);
        if (!this.nomesArv.has(k)) return E.NOME;
        const a = this.nomesArv.get(k);
        if (!a) return E.NOME;
        if (!ctx.prof) ctx.prof = 0;
        if (ctx.prof > 20) return E.CALC;
        ctx.prof++;
        try { return this.avaliar(a, ctx); } finally { ctx.prof--; }
      }
      case 'fn': {
        const f = IMPL[n.n];
        if (!f || n.desc) return E.NOME;
        const meta = POR_EN[n.n];
        if (meta) {
          const min = meta.args.filter((a) => !a.opc).length;
          const max = meta.args.some((a) => a.rep) ? Infinity : meta.args.length;
          if (n.args.length < min || n.args.length > max) return E.VALOR;
        }
        if (ctx.legado && MATRIZ_LEGADO.has(n.n)) { ctx.matrizLeg++; try { return f(n.args, ctx); } finally { ctx.matrizLeg--; } }
        return f(n.args, ctx);
      }
      case 'paren': return this.avaliar(n.a, ctx);
      case 'chamada': return E.NOME; // LAMBDA chamada na hora: ainda não calculada aqui
      case 'un': {
        const v = this.avaliar(n.a, ctx);
        if (n.o === '+') return v;
        return this.levantar([v], (x) => { if (ehErro(x)) return x; const a = aNumero(x); return ehErro(a) ? a : -a; }, ctx);
      }
      case 'pct': {
        const v = this.avaliar(n.a, ctx);
        return this.levantar([v], (x) => { if (ehErro(x)) return x; const a = aNumero(x); return ehErro(a) ? a : a / 100; }, ctx);
      }
      case 'bin': {
        if (n.o === ':') {
          const a = this.avaliar(n.a, ctx), b = this.avaliar(n.b, ctx);
          if (ehErro(a)) return a;
          if (ehErro(b)) return b;
          if (!ehRef(a) || !ehRef(b) || a.abaId !== b.abaId) return E.VALOR;
          return new Ref(a.abaId, Math.min(a.l1, b.l1), Math.min(a.c1, b.c1), Math.max(a.l2, b.l2), Math.max(a.c2, b.c2));
        }
        const a = this.avaliar(n.a, ctx), b = this.avaliar(n.b, ctx);
        return this.levantar([a, b], (x, y) => opBin(n.o, x, y), ctx);
      }
      case 'arr': return new Mat(n.lin.map((l) => l.map((x) => this.avaliar(x, ctx))));
      case 'vazio': return null;
      default: return E.VALOR;
    }
  }

  /** Aplica a conta item a item quando há matriz (como o Excel 365). */
  levantar(vals, fn, ctx) {
    /* fórmula antiga do Excel: faixa numa conta vira a célula da mesma linha (interseção implícita), a não ser dentro de SOMARPRODUTO e afins */
    if (ctx && ctx.legado && !ctx.matrizLeg) vals = vals.map((v) => (ehRef(v) && !v.unica ? this.deref(v, ctx) : v));
    if (!vals.some(ehMultiplo)) return fn(...vals.map((v) => this.deref(v, ctx)));
    const ms = vals.map((v) => (ehMultiplo(v) ? this.matriz(v) : null));
    const L = Math.max(...ms.map((m) => (m ? m.linhas : 1)));
    const C = Math.max(...ms.map((m) => (m ? m.colunas : 1)));
    const esc = vals.map((v, i) => (ms[i] ? null : this.deref(v, ctx)));
    return Mat.de(L, C, (i, j) => fn(...vals.map((_, k) => {
      const m = ms[k];
      if (!m) return esc[k];
      const ii = m.linhas === 1 ? 0 : i, jj = m.colunas === 1 ? 0 : j;
      if (ii >= m.linhas || jj >= m.colunas) return E.NA;
      return m.d[ii][jj];
    })));
  }

  /** Valor único de uma faixa (com a "interseção implícita" do Excel antigo). */
  deref(x, ctx) {
    if (ehRef(x)) {
      if (x.unica) return this.valor(x.abaId, x.l1, x.c1);
      if (ctx && x.c1 === x.c2 && ctx.abaId === x.abaId && ctx.l >= x.l1 && ctx.l <= x.l2) return this.valor(x.abaId, ctx.l, x.c1);
      if (ctx && x.l1 === x.l2 && ctx.abaId === x.abaId && ctx.c >= x.c1 && ctx.c <= x.c2) return this.valor(x.abaId, x.l1, ctx.c);
      return E.VALOR;
    }
    if (ehMat(x)) return x.d[0] ? x.d[0][0] : null;
    return x;
  }

  usado(abaId) {
    if (!this.usados[abaId]) {
      const aba = this.c.abas[abaId];
      let lMax = -1, cMax = -1;
      if (aba) {
        for (const k of Object.keys(aba.cel)) {
          const x = aba.cel[k];
          if (x.v === undefined && x.f == null) continue;
          const p = lerChave(k);
          if (!p) continue;
          if (p.l > lMax) lMax = p.l;
          if (p.c > cMax) cMax = p.c;
        }
        for (const s of this.spillDe[abaId].values()) { if (s.l2 > lMax) lMax = s.l2; if (s.c2 > cMax) cMax = s.c2; }
      }
      this.usados[abaId] = { lMax, cMax };
    }
    return this.usados[abaId];
  }

  /** Faixa → matriz de valores. Colunas inteiras (A:A) são cortadas na última linha usada. */
  matriz(x, limiteLin) {
    if (ehMat(x)) return x;
    if (!ehRef(x)) return new Mat([[x]]);
    const u = this.usado(x.abaId);
    let l2 = x.l2, c2 = x.c2;
    const lim = limiteLin != null ? Math.max(limiteLin, u.lMax) : u.lMax;
    if (l2 - x.l1 + 1 > 2000 && l2 > lim) l2 = Math.max(x.l1, lim);
    if (c2 - x.c1 + 1 > 200 && c2 > u.cMax) c2 = Math.max(x.c1, u.cMax);
    /* v0.5.0: a mesma faixa lida por milhares de fórmulas (PROCV, CORRESP...) é montada uma vez por recálculo */
    const area = (l2 - x.l1 + 1) * (c2 - x.c1 + 1);
    if (area >= 16 && this.cacheMat) {
      const ch = x.abaId + '|' + x.l1 + '|' + x.c1 + '|' + l2 + '|' + c2;
      const m0 = this.cacheMat.get(ch);
      if (m0) return m0;
      const v0 = this.versaoSpill;
      const m = Mat.de(l2 - x.l1 + 1, c2 - x.c1 + 1, (i, j) => this.valor(x.abaId, x.l1 + i, x.c1 + j));
      /* só guarda se nenhuma área derramada mudou enquanto montava */
      if (this.versaoSpill === v0 && this.cacheCel + area < 3000000) { this.cacheMat.set(ch, m); this.cacheCel += area; }
      return m;
    }
    return Mat.de(l2 - x.l1 + 1, c2 - x.c1 + 1, (i, j) => this.valor(x.abaId, x.l1 + i, x.c1 + j));
  }

  /** Passa por cada valor (não vazio, a não ser que "todas") da faixa ou matriz. */
  cada(x, cb, todas = false) {
    if (ehMat(x)) { for (const r of x.d) for (const v of r) if (todas || v != null) cb(v); return; }
    if (!ehRef(x)) { cb(x); return; }
    const u = this.usado(x.abaId);
    const l2 = Math.min(x.l2, todas ? x.l2 : u.lMax), c2 = Math.min(x.c2, todas ? x.c2 : u.cMax);
    const area = (l2 - x.l1 + 1) * (c2 - x.c1 + 1);
    if (!todas && area > 20000) {
      /* faixa grande: só as células que existem (mais as que derramam) */
      const aba = this.c.abas[x.abaId];
      const pos = [];
      for (const k of Object.keys(aba.cel)) {
        const p = lerChave(k);
        if (p && p.l >= x.l1 && p.l <= l2 && p.c >= x.c1 && p.c <= c2) pos.push(K(p.l, p.c));
      }
      for (const kk of this.spill[x.abaId].keys()) {
        const [ll, cc] = LC(kk);
        if (ll >= x.l1 && ll <= l2 && cc >= x.c1 && cc <= c2) pos.push(kk);
      }
      pos.sort((a, b) => a - b);
      for (const kk of pos) { const [ll, cc] = LC(kk); const v = this.valor(x.abaId, ll, cc); if (v != null) cb(v, ll, cc); }
      return;
    }
    const lim = todas ? Math.min(l2, x.l1 + 200000) : l2;
    for (let l = x.l1; l <= lim; l++) for (let c = x.c1; c <= c2; c++) {
      const v = this.valor(x.abaId, l, c);
      if (todas || v != null) cb(v, l, c);
    }
  }

  refDeTexto(t, abaAtual) {
    const k = String(t).trim().toLowerCase();
    if (this.nomesArv.get(k)) {
      const r = this.avaliar(this.nomesArv.get(k), this.contexto(abaAtual, 0, 0));
      return ehRef(r) ? r : null;
    }
    const e = lerEndereco(t);
    if (!e) return null;
    const id = e.aba ? this.abaId(e.aba, abaAtual) : abaAtual;
    if (!id) return null;
    return new Ref(id, e.l1, e.c1, e.l2, e.c2);
  }

  /* ---------------- recálculo ---------------- */
  todasFormulas() {
    const out = [];
    for (const id of this.c.ordem) {
      const ks = [...this.form[id].keys()].sort((a, b) => a - b);
      for (const k of ks) out.push(this.form[id].get(k));
    }
    return out;
  }

  limparCacheMat() { this.cacheMat = new Map(); this.cacheCel = 0; this.versaoSpill = (this.versaoSpill || 0) + 1; }

  recalcularTudo() {
    this.limparCacheMat();
    for (const id of this.c.ordem) { this.vals[id].clear(); }
    this.circ.clear();
    this.spillPendente = [];
    for (const fm of this.todasFormulas()) this.valorFormula(fm);
    this.resolverSpill();
  }

  /**
   * v0.5.0: arquivo que veio do Excel e ainda não foi mexido: as fórmulas começam com o último valor que o Excel
   * calculou (abre na hora); só calculam agora as de matriz dinâmica (derramam), as voláteis (HOJE, AGORA...) e quem depende delas.
   */
  semearDoExcel() {
    this.limparCacheMat();
    for (const id of this.c.ordem) this.vals[id].clear();
    this.circ.clear();
    this.spillPendente = [];
    const calcular = [];
    for (const id of this.c.ordem) {
      const aba = this.c.abas[id];
      for (const [k, fm] of this.form[id]) {
        const cel = aba.cel[chave(fm.l, fm.c)];
        if (cel && cel.v !== undefined && !cel.da && !fm.vol && !fm.erro && !fm.desc.length) this.vals[id].set(k, valorGuardado(cel) ?? 0);
        else calcular.push(fm);
      }
    }
    const sujos = this.volateis.size ? this.espalhar(new Set(this.volateis)) : new Set();
    for (const fk of sujos) { const [id, k] = deFK(fk); const fm = this.form[id].get(k); if (fm) { this.vals[id].delete(k); calcular.push(fm); } }
    for (const fm of calcular) this.valorFormula(fm);
    this.resolverSpill();
  }

  /** Quando uma área derramada muda, quem usa aquelas células recalcula; segue adiante só o que mudou de valor. */
  resolverSpill() {
    for (let volta = 0; volta < 10 && this.spillPendente && this.spillPendente.length; volta++) {
      const areas = this.spillPendente;
      this.spillPendente = [];
      for (const id of Object.keys(this.usados)) this.usados[id] = null;
      const sujos = new Set();
      for (const a of areas) {
        for (let l = a.l1; l <= a.l2; l++) for (let c = a.c1; c <= a.c2; c++) for (const fk of this.quemUsa(a.abaId, l, c)) sujos.add(fk);
      }
      for (const fk of this.usaSpill) sujos.add(fk);
      if (!sujos.size) break;
      this.propagar(sujos);
    }
    this.spillPendente = [];
  }

  /** Recalcula as fórmulas e, em ondas, quem usa as que mudaram de valor (para quando quase nada muda). */
  propagar(inicio) {
    const igual = (a, b) => a === b || (ehErro(a) && ehErro(b) && a.cod === b.cod);
    const ordem = new Map(this.c.ordem.map((id, i) => [id, i]));
    let fila = [...inicio];
    const vezes = new Map();
    for (let onda = 0; onda < 200 && fila.length; onda++) {
      const lista = [];
      const antes = new Map();
      for (const fk of new Set(fila)) {
        const n = (vezes.get(fk) || 0) + 1;
        if (n > 20) continue;
        vezes.set(fk, n);
        const [id, k] = deFK(fk);
        const fm = this.form[id] && this.form[id].get(k);
        if (!fm) continue;
        antes.set(fk, this.vals[id].get(k));
        this.vals[id].delete(k); this.circ.delete(fk);
        lista.push(fm);
      }
      this.limparCacheMat();
      lista.sort((a, b) => (ordem.get(a.abaId) - ordem.get(b.abaId)) || (a.k - b.k));
      for (const fm of lista) this.valorFormula(fm);
      fila = [];
      for (const fm of lista) {
        if (igual(antes.get(fm.fk), this.vals[fm.abaId].get(fm.k))) continue;
        for (const x of this.quemUsa(fm.abaId, fm.l, fm.c)) fila.push(x);
      }
    }
  }

  /** Todas as fórmulas que dependem (direta ou indiretamente) das fk iniciais. */
  espalhar(inicio) {
    const vistos = new Set(inicio);
    const fila = [...inicio];
    while (fila.length) {
      const fk = fila.pop();
      const [id, k] = deFK(fk);
      const [l, c] = LC(k);
      for (const x of this.quemUsa(id, l, c)) if (!vistos.has(x)) { vistos.add(x); fila.push(x); }
      const s = this.spillDe[id] && this.spillDe[id].get(k);
      if (s) {
        for (let i = s.l1; i <= s.l2; i++) for (let j = s.c1; j <= s.c2; j++) {
          for (const x of this.quemUsa(id, i, j)) if (!vistos.has(x)) { vistos.add(x); fila.push(x); }
        }
      }
    }
    return vistos;
  }

  recalcularSujos(fks, comSpill = true) {
    this.limparCacheMat();
    const lista = [];
    for (const fk of fks) {
      const [id, k] = deFK(fk);
      const fm = this.form[id] && this.form[id].get(k);
      if (fm) { this.vals[id].delete(k); this.circ.delete(fk); lista.push(fm); }
    }
    const ordem = new Map(this.c.ordem.map((id, i) => [id, i]));
    lista.sort((a, b) => (ordem.get(a.abaId) - ordem.get(b.abaId)) || (a.k - b.k));
    for (const fm of lista) this.valorFormula(fm);
    if (comSpill) this.resolverSpill();
  }

  /**
   * O arquivo mudou: compara com o anterior e recalcula só o necessário.
   * Devolve o número de fórmulas recalculadas.
   */
  atualizar(novo) {
    const velho = this.c;
    if (novo === velho) return 0;
    this.limparCacheMat();
    const estrutura = novo.ordem.length !== velho.ordem.length || novo.ordem.some((id, i) => id !== velho.ordem[i] || !velho.abas[id] || velho.abas[id].nome !== novo.abas[id].nome) || novo.nomes !== velho.nomes;
    if (estrutura) { this.carregar(novo); return -1; }
    const mudou = [];
    let ocultasMudaram = false;
    for (const id of novo.ordem) {
      const a = novo.abas[id], b = velho.abas[id];
      if (a === b) continue;
      if (a.ocL !== b.ocL || a.ocF !== b.ocF) ocultasMudaram = true;
      if (a.cel === b.cel) continue;
      for (const k of Object.keys(a.cel)) if (a.cel[k] !== b.cel[k]) mudou.push([id, k]);
      for (const k of Object.keys(b.cel)) if (!(k in a.cel)) mudou.push([id, k]);
      if (mudou.length > 4000) { this.carregar(novo); return -1; }
    }
    this.c = novo;
    for (const id of novo.ordem) if (novo.abas[id] !== velho.abas[id]) this.usados[id] = null;
    this.spillPendente = [];
    const sujos = new Set();
    for (const [id, ch] of mudou) {
      const p = lerChave(ch);
      if (!p) continue;
      const k = K(p.l, p.c);
      const antes = velho.abas[id].cel[ch], depois = novo.abas[id].cel[ch];
      const fAntes = antes && antes.f, fDepois = depois && depois.f;
      const lgMudou = !!(antes && antes.lg) !== !!(depois && depois.lg);
      if (fAntes != null && (fAntes !== fDepois || lgMudou)) this.desregistrar(id, k);
      if (fDepois != null && (fAntes !== fDepois || lgMudou || !this.form[id].has(k))) this.registrar(id, p.l, p.c, fDepois, !!depois.lg);
      if (fDepois != null) { sujos.add(FK(id, k)); this.vals[id].delete(k); }
      for (const x of this.quemUsa(id, p.l, p.c)) sujos.add(x);
      /* célula dentro de uma área derramada: a fórmula de origem confere de novo (pode virar #DESPEJAR!) */
      const ancora = this.spill[id].get(k);
      if (ancora != null) sujos.add(FK(id, ancora));
      for (const [anc, s] of this.spillDe[id]) {
        if (p.l >= s.l1 && p.l <= s.l2 && p.c >= s.c1 && p.c <= s.c2) sujos.add(FK(id, anc));
      }
    }
    /* uma fórmula que antes dava #DESPEJAR! pode ter ficado livre */
    if (mudou.length) {
      for (const id of novo.ordem) for (const [kk, fm] of this.form[id]) if (this.vals[id].get(kk) === E.DESPEJAR) sujos.add(fm.fk);
    }
    for (const fk of this.volateis) sujos.add(fk);
    if (ocultasMudaram) for (const fk of this.subtotais) sujos.add(fk);
    if (!sujos.size) return 0;
    const todos = this.espalhar(sujos);
    this.recalcularSujos(todos);
    return todos.size;
  }

  /* ---------------- para a tela ---------------- */
  formula(abaId, l, c) { return this.form[abaId] && this.form[abaId].get(K(l, c)); }

  /** Área derramada que contém a célula (ou que começa nela). */
  areaDerramada(abaId, l, c) {
    const k = K(l, c);
    const anc = this.spillDe[abaId] && this.spillDe[abaId].has(k) ? k : this.spill[abaId] && this.spill[abaId].get(k);
    if (anc == null) return null;
    const s = this.spillDe[abaId].get(anc);
    return s ? { l1: s.l1, c1: s.c1, l2: s.l2, c2: s.c2, ancora: LC(anc) } : null;
  }

  /** De onde vem: as faixas que a fórmula da célula usa. */
  precedentes(abaId, l, c) {
    const fm = this.formula(abaId, l, c);
    return fm ? fm.deps.map((d) => ({ ...d })) : [];
  }

  /** Quem usa esta célula: as fórmulas (de qualquer aba) que dependem dela. */
  dependentes(abaId, l, c, transitivo = false) {
    const diretos = this.quemUsa(abaId, l, c);
    const lista = transitivo ? this.espalhar(diretos) : diretos;
    return [...lista].map((fk) => { const [id, k] = deFK(fk); const [ll, cc] = LC(k); return { abaId: id, l: ll, c: cc }; });
  }

  circulares() {
    return [...this.circ].map((fk) => { const [id, k] = deFK(fk); const [l, c] = LC(k); return { abaId: id, l, c }; });
  }

  /** Prévia: calcula um texto de fórmula (pt-BR, sem "=") no lugar da célula, sem gravar. */
  previa(textoPt, abaId, l, c) {
    let arv;
    try { arv = ler(textoPt, 'pt'); } catch (e) { return { erro: e instanceof ErroFormula ? e : new ErroFormula('Conta incompleta.', 0) }; }
    const fk = FK(abaId, K(l, c));
    this.pilha.add(fk);
    let r;
    try { r = this.avaliar(arv, this.contexto(abaId, l, c)); } catch { r = E.VALOR; } finally { this.pilha.delete(fk); }
    if (this.circ.has(fk)) { this.circ.delete(fk); return { circular: true, valor: 0 }; }
    if (ehRef(r)) r = r.unica ? (this.valor(r.abaId, r.l1, r.c1) ?? 0) : this.matriz(r);
    if (ehMat(r)) return { valor: r.d[0] ? (r.d[0][0] ?? 0) : E.CALC, matriz: { linhas: r.linhas, colunas: r.colunas } };
    return { valor: r == null ? 0 : r, arv };
  }

  /** Avalia um nó qualquer da árvore (para "Explicar esta conta" na v0.4.1). */
  avaliarNo(n, abaId, l, c) {
    try { return this.avaliar(n, this.contexto(abaId, l, c)); } catch { return E.VALOR; }
  }
}

export { K, LC };
