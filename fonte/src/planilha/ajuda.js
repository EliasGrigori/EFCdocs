/* EFCdocs — Planilha: a ajuda enquanto se digita a fórmula (ideias dos editores de código).
   PL07 dica do argumento e autocompletar · PL08 erro avisado antes do Enter com "Corrigir" ·
   PL09 nome da coluna junto da referência · PL10 parênteses coloridos e nomes em inglês aceitos. */
import { tokenizar, ler, ErroFormula } from './formula.js';
import { acharFuncao, funcaoParecida, POR_EN, sugerirFuncoes } from './nomesFuncoes.js';
import { chave, letraCol } from './ref.js';

/* cores das referências (as mesmas para a fórmula e para a grade) e dos parênteses */
export const CORES_REF = ['#3b82f6', '#e5484d', '#8e4ec6', '#30a46c', '#f76b15', '#0d9488', '#d6409f', '#a18072'];
export const CORES_PAR = ['#d4a72c', '#c678dd', '#3b9bd1', '#5bb592', '#e0827b'];

/** Onde o cursor está: qual função, qual argumento e o pedaço de nome que está sendo digitado. */
export function contextoNoCursor(texto, pos) {
  const antes = texto.slice(0, pos);
  const tk = tokenizar(antes, 'pt');
  const pilha = [];
  let ultimoFn = null;
  for (const t of tk) {
    if (t.t === 'fn') ultimoFn = t;
    else if (t.t === 'abre') { pilha.push({ fn: ultimoFn, arg: 0, i: t.i }); ultimoFn = null; }
    else if (t.t === 'fecha') { pilha.pop(); ultimoFn = null; }
    else if (t.t === 'sep') { if (pilha.length) pilha[pilha.length - 1].arg++; ultimoFn = null; }
    else ultimoFn = null;
  }
  const dentroTexto = tk.length && tk[tk.length - 1].t === 'str' && tk[tk.length - 1].aberto;
  let topo = null;
  for (let i = pilha.length - 1; i >= 0; i--) if (pilha[i].fn) { topo = pilha[i]; break; }
  const achou = topo && acharFuncao(topo.fn.v);
  const m = dentroTexto ? null : /[A-Za-zÀ-ÿ_\\][\wÀ-ÿ.]*$/.exec(antes);
  const ultimo = tk[tk.length - 1];
  /* prefixo só conta se for um nome sendo digitado (não uma célula completa como B2) */
  const prefixo = m && ultimo && (ultimo.t === 'nome' || (ultimo.t === 'ref' && /[A-Za-z]$/.test(antes))) && ultimo.f === pos ? m[0] : (m && ultimo && ultimo.t === 'nome' ? m[0] : '');
  const esperaValor = !ultimo || ['op', 'abre', 'sep'].includes(ultimo.t);
  return {
    funcao: achou ? achou.f : null,
    nomeDigitado: topo ? topo.fn.v : null,
    arg: topo ? topo.arg : 0,
    prefixo: prefixo || '',
    esperaValor,
    dentroTexto: !!dentroTexto,
  };
}

/** Sugestões do autocompletar: funções, nomes definidos e títulos das colunas. */
export function sugestoes(prefixo, { nomes = [], colunas = [], max = 8 } = {}) {
  if (!prefixo) return [];
  const p = prefixo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const sem = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const out = [];
  for (const f of sugerirFuncoes(prefixo, max)) out.push({ tipo: 'fn', rotulo: f.pt, detalhe: f.desc, inserir: f.pt + '(', f });
  for (const n of nomes) if (sem(n.n).startsWith(p)) out.push({ tipo: 'nome', rotulo: n.n, detalhe: 'Nome · ' + n.mostra, inserir: n.n });
  if (prefixo.length >= 2) {
    for (const c of colunas) if (sem(c.titulo).split(/\s+/).some((w) => w.startsWith(p)) || sem(c.titulo).startsWith(p)) out.push({ tipo: 'col', rotulo: `${c.titulo} (${c.letra})`, detalhe: 'Coluna ' + c.letra + ' · célula ' + c.ref, inserir: c.ref });
  }
  return out.slice(0, max);
}

/**
 * Problemas da fórmula enquanto se digita, com conserto quando dá.
 * Cada um: { msg, i, f, nivel: 'erro'|'aviso', troca?: { i, f, novo }, rotulo? }
 */
export function diagnosticar(texto, { nomes = new Set(), abas = new Set() } = {}) {
  const out = [];
  const tk = tokenizar(texto, 'pt');
  /* aspas abertas */
  const aberta = tk.find((t) => t.t === 'str' && t.aberto);
  if (aberta) out.push({ nivel: 'erro', msg: 'Falta fechar as aspas do texto.', i: aberta.i, f: texto.length, troca: { i: texto.length, f: texto.length, novo: '"' }, rotulo: 'Fechar aspas' });
  /* vírgula no lugar de ponto e vírgula */
  for (let k = 0; k < tk.length; k++) {
    const t = tk[k];
    if (t.t === 'ruim' && t.v === ',') {
      const a = tk[k - 1], b = tk[k + 1];
      const entre = a && b ? `Entre ${trecho(texto, a)} e ${trecho(texto, b)} use ponto e vírgula, não vírgula.` : 'Use ponto e vírgula (;) entre os argumentos, não vírgula.';
      out.push({ nivel: 'erro', msg: entre, i: t.i, f: t.f, troca: { i: t.i, f: t.f, novo: ';' }, rotulo: 'Trocar por ;' });
    }
    if (t.t === 'num' && t.txt && t.txt[0] === ',' && k > 0 && ['num', 'ref', 'area', 'str', 'fecha', 'nome', 'bool'].includes(tk[k - 1].t) && tk[k - 1].f === t.i) {
      out.push({ nivel: 'erro', msg: 'Use ponto e vírgula (;) entre os argumentos. A vírgula é só para casas decimais.', i: t.i, f: t.i + 1, troca: { i: t.i, f: t.i + 1, novo: ';' }, rotulo: 'Trocar por ;' });
    }
    if (t.t === 'ruim' && t.v !== ',') out.push({ nivel: 'erro', msg: t.msg === 'aba sem célula' ? 'Depois do nome da aba e do ! falta a célula (ex.: Lotes!A1).' : `Não entendi o sinal "${t.v}".`, i: t.i, f: t.f });
  }
  /* nomes de função */
  for (const t of tk) {
    if (t.t !== 'fn') continue;
    const a = acharFuncao(t.v);
    if (!a) {
      const p = funcaoParecida(t.v);
      out.push(p
        ? { nivel: 'erro', msg: `A função ${t.v} não existe. Você quis dizer ${p.pt}?`, i: t.i, f: t.f, troca: { i: t.i, f: t.f, novo: p.pt }, rotulo: 'Usar ' + p.pt }
        : { nivel: 'aviso', msg: `O EFCdocs ainda não conhece a função ${t.v}. A fórmula fica guardada, mas a célula mostra #NOME?.`, i: t.i, f: t.f });
    } else if (a.como === 'en' && a.f.pt !== a.f.en) {
      out.push({ nivel: 'dica', msg: `${a.f.en} é ${a.f.pt} em português.`, i: t.i, f: t.f, troca: { i: t.i, f: t.f, novo: a.f.pt }, rotulo: 'Trocar' });
    } else if ((a.como === 'semAcento' || a.como === 'apelido') && t.v !== a.f.pt) {
      out.push({ nivel: 'dica', msg: `O nome certo é ${a.f.pt}.`, i: t.i, f: t.f, troca: { i: t.i, f: t.f, novo: a.f.pt }, rotulo: 'Trocar' });
    }
  }
  /* texto sem aspas (nome que não existe) */
  const locais = nomesDoLET(tk);
  for (let k = 0; k < tk.length; k++) {
    const t = tk[k];
    if (t.t !== 'nome') continue;
    const nm = t.v.toLowerCase();
    if (nomes.has(nm) || locais.has(nm)) continue;
    out.push({ nivel: 'erro', msg: `"${t.v}" não é célula, função nem nome. Se é texto, ponha entre aspas.`, i: t.i, f: t.f, troca: { i: t.i, f: t.f, novo: '"' + t.v + '"' }, rotulo: 'Pôr aspas' });
  }
  /* aba que não existe e intervalo invertido */
  for (const t of tk) {
    if ((t.t === 'ref' || t.t === 'area') && t.v.aba != null && abas.size && !abas.has(t.v.aba.toLowerCase())) {
      out.push({ nivel: 'erro', msg: `Não existe aba chamada "${t.v.aba}".`, i: t.i, f: t.f });
    }
    if (t.t === 'area' && t.v.tipo === 'cel' && (t.v.l1 > t.v.l2 || t.v.c1 > t.v.c2)) {
      const txt = texto.slice(t.i, t.f);
      const [a, b] = txt.split(':');
      const pref = a.includes('!') ? a.slice(0, a.lastIndexOf('!') + 1) : '';
      const aa = a.slice(pref.length);
      const lo = (s) => s.replace(/\$/g, '');
      const ca = /([A-Za-z]+)(\d+)/.exec(lo(aa)), cb = /([A-Za-z]+)(\d+)/.exec(lo(b));
      if (ca && cb) {
        const c1 = [ca[1], cb[1]].sort((x, y) => x.length - y.length || x.localeCompare(y)), l1 = [+ca[2], +cb[2]].sort((x, y) => x - y);
        const novo = pref + c1[0].toUpperCase() + l1[0] + ':' + c1[1].toUpperCase() + l1[1];
        out.push({ nivel: 'aviso', msg: `O intervalo está de trás para a frente. O certo é ${novo}.`, i: t.i, f: t.f, troca: { i: t.i, f: t.f, novo }, rotulo: 'Arrumar' });
      }
    }
  }
  /* parênteses e quantidade de argumentos */
  const pilha = [];
  let ultimoFn = null;
  for (const t of tk) {
    if (t.t === 'fn') { ultimoFn = t; continue; }
    if (t.t === 'abre') { pilha.push({ fn: ultimoFn, args: 0, temAlgo: false, i: t.i }); ultimoFn = null; continue; }
    ultimoFn = null;
    if (t.t === 'sep') { if (pilha.length) { pilha[pilha.length - 1].args++; } continue; }
    if (t.t === 'fecha') {
      const p = pilha.pop();
      if (!p) { out.push({ nivel: 'erro', msg: 'Tem um parêntese fechando sem ter aberto.', i: t.i, f: t.f, troca: { i: t.i, f: t.f, novo: '' }, rotulo: 'Tirar' }); continue; }
      if (p.fn) {
        const a = acharFuncao(p.fn.v);
        if (a) {
          const n = p.temAlgo || p.args > 0 ? p.args + 1 : 0;
          const min = a.f.args.filter((x) => !x.opc).length;
          const max = a.f.args.some((x) => x.rep) ? Infinity : a.f.args.length;
          if (n < min) {
            const falta = a.f.args.filter((x) => !x.opc).slice(n).map((x) => x.n).join(', ');
            out.push({ nivel: 'erro', msg: `${a.f.pt} precisa de ${min} ${min === 1 ? 'argumento' : 'argumentos'}. Falta: ${falta}.`, i: p.fn.i, f: t.f });
          } else if (n > max) {
            out.push({ nivel: 'erro', msg: `${a.f.pt} aceita no máximo ${max} ${max === 1 ? 'argumento' : 'argumentos'}.`, i: p.fn.i, f: t.f });
          }
        }
      }
      if (pilha.length) pilha[pilha.length - 1].temAlgo = true;
      continue;
    }
    if (pilha.length) pilha[pilha.length - 1].temAlgo = true;
  }
  if (pilha.length && !aberta) {
    const nomesF = pilha.filter((p) => p.fn).map((p) => { const a = acharFuncao(p.fn.v); return a ? a.f.pt : p.fn.v; });
    const msg = pilha.length === 1
      ? `Falta fechar o parêntese${nomesF.length ? ' do ' + nomesF[0] : ''}.`
      : `Faltam fechar ${pilha.length} parênteses.`;
    out.push({ nivel: 'erro', msg, i: pilha[pilha.length - 1].i, f: texto.length, troca: { i: texto.length, f: texto.length, novo: ')'.repeat(pilha.length) }, rotulo: 'Fechar' });
  }
  /* se nada acima pegou, o leitor diz o que não entendeu */
  if (!out.some((d) => d.nivel === 'erro') && texto.trim()) {
    try { ler(texto, 'pt'); } catch (e) {
      if (e instanceof ErroFormula) out.push({ nivel: 'erro', msg: e.message, i: e.pos, f: Math.min(texto.length, e.pos + 1) });
    }
  }
  return out;
}

const trecho = (texto, t) => { const s = texto.slice(t.i, t.f); return s.length > 14 ? s.slice(0, 12) + '…' : s; };

function nomesDoLET(tk) {
  const s = new Set();
  for (let k = 0; k < tk.length; k++) {
    if (tk[k].t === 'fn' && acharFuncao(tk[k].v) && acharFuncao(tk[k].v).f.en === 'LET') {
      /* LET(nome; valor; nome; valor; conta): nomes nas posições pares */
      let prof = 0, arg = 0;
      for (let j = k + 1; j < tk.length; j++) {
        const t = tk[j];
        if (t.t === 'abre') { prof++; continue; }
        if (t.t === 'fecha') { prof--; if (prof === 0) break; continue; }
        if (prof === 1 && t.t === 'sep') { arg++; continue; }
        if (prof === 1 && arg % 2 === 0 && t.t === 'nome') s.add(t.v.toLowerCase());
      }
    }
  }
  return s;
}

/** Aplica os consertos (do fim para o começo, para as posições não andarem). */
export function corrigir(texto, problemas) {
  const trocas = problemas.filter((p) => p.troca).map((p) => p.troca).sort((a, b) => b.i - a.i);
  let t = texto;
  let ultimo = Infinity;
  for (const x of trocas) {
    if (x.f > ultimo) continue;
    t = t.slice(0, x.i) + x.novo + t.slice(x.f);
    ultimo = x.i;
  }
  return t;
}

/**
 * Pedaços coloridos da fórmula (para desenhar atrás do campo e na barra de fórmula).
 * Cada ref recebe uma cor (a mesma usada na grade); cada par de parênteses outra cor.
 */
export function pedacosColoridos(texto, cursor = -1) {
  const tk = tokenizar(texto, 'pt');
  const refs = [];
  const mapaRef = new Map();
  const out = [];
  let prof = 0;
  const pares = [];
  const pilha = [];
  tk.forEach((t, k) => {
    if (t.t === 'abre') { pilha.push(k); prof++; }
    if (t.t === 'fecha') { const a = pilha.pop(); if (a != null) pares.push([a, k]); prof = Math.max(0, prof - 1); }
  });
  /* par do cursor: o parêntese logo antes ou logo depois do cursor */
  let parAtivo = null;
  for (const [a, b] of pares) {
    if (tk[a].i < cursor && cursor <= tk[b].f) { if (!parAtivo || tk[a].i > tk[parAtivo[0]].i) parAtivo = [a, b]; }
  }
  const profDe = new Map();
  let p2 = 0;
  tk.forEach((t, k) => {
    if (t.t === 'abre') { profDe.set(k, p2); p2++; }
    if (t.t === 'fecha') { p2 = Math.max(0, p2 - 1); profDe.set(k, p2); }
  });
  let pos = 0;
  tk.forEach((t, k) => {
    if (t.i > pos) out.push({ txt: texto.slice(pos, t.i) });
    const txt = texto.slice(t.i, t.f);
    let cls = '', cor = null;
    if (t.t === 'ref' || t.t === 'area') {
      const kref = txt.replace(/\$/g, '').toUpperCase();
      if (!mapaRef.has(kref)) { mapaRef.set(kref, refs.length); refs.push({ ...t.v, cor: CORES_REF[refs.length % CORES_REF.length], i: t.i, f: t.f }); }
      cor = CORES_REF[mapaRef.get(kref) % CORES_REF.length];
      cls = 'tk-ref';
    } else if (t.t === 'fn') cls = 'tk-fn';
    else if (t.t === 'str') cls = 'tk-str';
    else if (t.t === 'num') cls = 'tk-num';
    else if (t.t === 'err') cls = 'tk-err';
    else if (t.t === 'bool') cls = 'tk-bool';
    else if (t.t === 'nome') cls = 'tk-nome';
    else if (t.t === 'abre' || t.t === 'fecha') {
      cls = 'tk-par' + (parAtivo && (parAtivo[0] === k || parAtivo[1] === k) ? ' ativo' : '');
      cor = CORES_PAR[(profDe.get(k) || 0) % CORES_PAR.length];
    } else if (t.t === 'ruim') cls = 'tk-ruim';
    else if (t.t === 'op' || t.t === 'sep' || t.t === 'pct') cls = 'tk-op';
    out.push({ txt, cls, cor, t: t.t, v: t.v, i: t.i, f: t.f });
    pos = t.f;
  });
  if (pos < texto.length) out.push({ txt: texto.slice(pos) });
  return { pedacos: out, refs };
}

/** Texto da dica de argumentos: a assinatura com o argumento atual em destaque. */
export function assinatura(f, arg) {
  const args = f.args;
  let idx = arg;
  if (args.length && idx >= args.length) {
    /* argumentos que se repetem (núm1; núm2; ...) */
    const reps = args.filter((a) => a.rep);
    if (reps.length) {
      const base = args.length - reps.length;
      idx = base + ((idx - base) % reps.length);
    } else idx = args.length - 1;
  }
  return {
    partes: args.map((a, i) => ({ n: (a.opc ? '[' : '') + a.n + (a.opc ? ']' : '') + (a.rep && i === args.length - 1 ? '; ...' : ''), atual: i === idx })),
    atual: args[idx] || null,
  };
}

export { chave, letraCol, POR_EN };
