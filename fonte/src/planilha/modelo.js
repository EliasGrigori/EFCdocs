/* EFCdocs — Planilha: o arquivo (abas, células, estilos, nomes) e as mudanças que viram desfazer.
   conteudo = { v:1, ordem:[ids], abas:{ id:{ id, nome, cor, oculta, cel:{ B12:{ v, f, s } }, larg:{col:px}, alt:{lin:px},
                ocL:{lin:1}, ocC:{col:1}, objs:[{ id, tipo:'assinatura', l, c, dx, dy, w, h, nome, rub? }] (v0.4.5, ver objetos.js), zeros:{col:'t'|'n'} (escolha lembrada para códigos com zero na frente), cong:{l,c}, mesc:['A1:C1'], cab } }, estilos:[{...}], nomes:{ chave:{ n, ref } }, seq }
   Célula: v = valor digitado (número, texto, lógico ou { e:'#N/A' }); f = fórmula guardada como no Excel (inglês, sem "=");
   s = número do estilo em "estilos". Linhas e colunas guardadas a partir de 0. */
import { chave, lerChave, letraCol, MAX_COL, MAX_LIN, normalFaixa } from './ref.js';
import { erroPorCodigo, Erro } from './valores.js';
import { normalizarObjetos } from './objetos.js';

export const LARG_PADRAO = 80; // px a 100% (o Excel usa 64 px; aqui um pouco mais largo para o toque)
export const ALT_PADRAO = 22;
export const NOME_ABA_PADRAO = (n) => 'Planilha' + n;

export function abaVazia(id, nome) {
  return { id, nome, cel: {} };
}

export function planilhaVazia() {
  return { v: 1, ordem: ['a1'], abas: { a1: abaVazia('a1', 'Planilha1') }, estilos: [{}], nomes: {}, seq: 2 };
}

/** Aceita o formato das versões antigas (v0.2.0 a v0.3.2: { abas:[{ id, nome, celulas }] }) e completa o que faltar. */
export function normalizarPlanilha(c) {
  if (!c || typeof c !== 'object') return planilhaVazia();
  if (Array.isArray(c.abas)) {
    const n = planilhaVazia();
    n.ordem = []; n.abas = {};
    c.abas.forEach((a, i) => {
      const id = a.id || 'a' + (i + 1);
      n.ordem.push(id);
      n.abas[id] = { ...abaVazia(id, a.nome || NOME_ABA_PADRAO(i + 1)), cel: { ...(a.celulas || a.cel || {}) } };
    });
    if (!n.ordem.length) return planilhaVazia();
    n.seq = n.ordem.length + 1;
    return n;
  }
  const out = { v: 1, ordem: [], abas: {}, estilos: Array.isArray(c.estilos) && c.estilos.length ? c.estilos : [{}], nomes: c.nomes || {}, seq: c.seq || 2 };
  const ordem = Array.isArray(c.ordem) ? c.ordem.filter((id) => c.abas && c.abas[id]) : Object.keys(c.abas || {});
  for (const id of ordem) {
    out.abas[id] = { cel: {}, ...c.abas[id], id };
    /* v0.4.5: objetos sobre a grade (assinatura); o que vier quebrado ou com imagem estranha é descartado */
    if (out.abas[id].objs !== undefined) { const lista = normalizarObjetos(out.abas[id].objs); if (lista.length) out.abas[id].objs = lista; else delete out.abas[id].objs; }
  }
  out.ordem = ordem;
  if (!out.ordem.length) return planilhaVazia();
  return out;
}

/* ---------- valores guardados ---------- */
export function valorGuardado(cel) {
  if (!cel || cel.v === undefined) return null;
  const v = cel.v;
  if (v && typeof v === 'object' && v.e) return erroPorCodigo(v.e) || null;
  return v;
}
export const paraGuardarValor = (v) => (v instanceof Erro ? { e: v.cod } : v);

/* ---------- estilos (compartilhados e sem repetição) ---------- */
const chaveEstilo = (e) => JSON.stringify(Object.keys(e).sort().reduce((o, k) => { if (e[k] != null && e[k] !== '' && e[k] !== false) o[k] = e[k]; return o; }, {}));

/** Índice do estilo (cria se não existir). Devolve { s, estilos } — estilos só muda quando cria. */
export function indiceEstilo(estilos, e) {
  const k = chaveEstilo(e);
  if (k === '{}') return { s: 0, estilos };
  const i = estilos.findIndex((x) => chaveEstilo(x) === k);
  if (i >= 0) return { s: i, estilos };
  return { s: estilos.length, estilos: [...estilos, JSON.parse(k)] };
}
export const estiloDe = (c, cel) => (cel && cel.s ? c.estilos[cel.s] || {} : {});

/* ---------- tamanho de linhas e colunas ---------- */
export const largCol = (aba, c) => (aba.ocC && aba.ocC[c] ? 0 : (aba.larg && aba.larg[c] != null ? aba.larg[c] : LARG_PADRAO));
export const altLin = (aba, l) => (aba.ocL && aba.ocL[l] ? 0 : (aba.alt && aba.alt[l] != null ? aba.alt[l] : ALT_PADRAO));

/**
 * Medidas acumuladas para achar posições sem somar 1 milhão de linhas:
 * guarda só as linhas/colunas com tamanho diferente do padrão.
 */
export function eixo(mapaTam, mapaOculto, padrao, max) {
  const esp = new Map();
  for (const k of Object.keys(mapaTam || {})) { const i = +k; if (i < max) esp.set(i, mapaTam[k]); }
  for (const k of Object.keys(mapaOculto || {})) { const i = +k; if (i < max && mapaOculto[k]) esp.set(i, 0); }
  const idx = [...esp.keys()].sort((a, b) => a - b);
  /* soma das diferenças até cada índice especial */
  const acum = [];
  let d = 0;
  for (const i of idx) { acum.push(d); d += esp.get(i) - padrao; }
  const difAte = (n) => { // soma das diferenças dos índices < n
    let lo = 0, hi = idx.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (idx[m] < n) lo = m + 1; else hi = m; }
    return lo === 0 ? 0 : acum[lo - 1] + esp.get(idx[lo - 1]) - padrao;
  };
  const pos = (n) => n * padrao + difAte(n);
  const tam = (n) => (esp.has(n) ? esp.get(n) : padrao);
  /** índice na posição p (px) */
  const em = (p) => {
    if (p <= 0) return 0;
    let lo = 0, hi = max - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (pos(m) <= p) lo = m; else hi = m - 1;
    }
    return lo;
  };
  return { pos, tam, em, max, total: pos(max) };
}

/* ---------- área usada ---------- */
export function areaUsada(aba) {
  let lMax = -1, cMax = -1;
  for (const k of Object.keys(aba.cel)) {
    const p = lerChave(k);
    if (!p) continue;
    const cel = aba.cel[k];
    if (cel.v === undefined && cel.f == null && !cel.s) continue;
    if (p.l > lMax) lMax = p.l;
    if (p.c > cMax) cMax = p.c;
  }
  return { lMax, cMax };
}

/* ---------- mescladas ---------- */
export function mescladas(aba) {
  return (aba.mesc || []).map((t) => {
    const [a, b] = t.split(':');
    const x = lerChave(a), y = lerChave(b || a);
    return x && y ? { ...normalFaixa({ l1: x.l, c1: x.c, l2: y.l, c2: y.c }), t } : null;
  }).filter(Boolean);
}
export function mesclaEm(lista, l, c) {
  return lista.find((m) => l >= m.l1 && l <= m.l2 && c >= m.c1 && c <= m.c2) || null;
}

/* ---------- caminhos das mudanças (para o desfazer e a gravação) ---------- */
export const caminhoCel = (abaId, l, c) => `conteudo.abas.${abaId}.cel.${chave(l, c)}`;
export const caminhoAba = (abaId, campo) => `conteudo.abas.${abaId}${campo ? '.' + campo : ''}`;

/** Nome de aba válido no Excel: até 31 letras, sem : \ / ? * [ ], não vazio e sem repetir. */
export function validarNomeAba(nome, c, idAtual) {
  const t = String(nome || '').trim();
  if (!t) return 'Digite um nome para a aba.';
  if (t.length > 31) return 'Use no máximo 31 letras (limite do Excel).';
  if (/[:\\/?*[\]]/.test(t)) return 'Não use : \\ / ? * [ ] no nome da aba (o Excel não aceita).';
  if (/^'|'$/.test(t)) return 'O nome não pode começar nem terminar com apóstrofo.';
  if (t.toLowerCase() === 'histórico' || t.toLowerCase() === 'history') return 'Esse nome é reservado pelo Excel.';
  const repetido = c.ordem.some((id) => id !== idAtual && c.abas[id].nome.toLowerCase() === t.toLowerCase());
  return repetido ? 'Já existe uma aba com esse nome.' : '';
}

/** Nome definido válido (regras do Excel): começa com letra ou _, sem espaço, não parece célula. */
export function validarNomeDefinido(nome, c, atual) {
  const t = String(nome || '').trim();
  if (!t) return 'Digite o nome.';
  if (t.length > 255) return 'Use no máximo 255 letras.';
  if (!/^[A-Za-zÀ-ÿ_\\][\wÀ-ÿ.]*$/.test(t)) return 'Comece com letra ou _ e use só letras, números, _ e ponto (sem espaço).';
  if (lerChave(t) || /^[A-Za-z]{1,3}\d+$/.test(t) || /^[Rr]\d*([Cc]\d*)?$/.test(t) || /^[Cc]\d*$/.test(t)) return 'Esse nome parece endereço de célula. Use outro (ex.: Meta_Cloro).';
  const k = t.toLowerCase();
  if (k === 'verdadeiro' || k === 'falso' || k === 'true' || k === 'false') return 'Esse nome é reservado.';
  if (c.nomes[k] && k !== (atual || '').toLowerCase()) return 'Já existe um nome igual.';
  return '';
}

export { chave, lerChave, letraCol, MAX_COL, MAX_LIN };
