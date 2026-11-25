/* EFCdocs — Planilha: o arquivo (abas, células, estilos, nomes) e as mudanças que viram desfazer.
   conteudo = { v:1, importado?:{relatório do Excel}, fonteBase?:'Calibri', calcExcel?:true (veio do Excel e ainda não mudou), ordem:[ids], abas:{ id:{ id, nome, cor, oculta, cel:{ B12:{ v, f, s } }, larg:{col:px}, alt:{lin:px},
                ocL:{lin:1}, ocC:{col:1}, objs:[{ id, tipo:'assinatura', l, c, dx, dy, w, h, nome, rub? }] (v0.4.5, ver objetos.js), zeros:{col:'t'|'n'} (escolha lembrada para códigos com zero na frente), cong:{l,c}, mesc:['A1:C1'], cab } }, estilos:[{...}], nomes:{ chave:{ n, ref } }, seq }
   Célula: v = valor digitado (número, texto, lógico ou { e:'#N/A' }); f = fórmula guardada como no Excel (inglês, sem "=");
   s = número do estilo em "estilos". Linhas e colunas guardadas a partir de 0. */
import { chave, lerChave, letraCol, MAX_COL, MAX_LIN, normalFaixa } from './ref.js';
import { erroPorCodigo, Erro } from './valores.js';
import { normalizarObjetos } from './objetos.js';
import { normalizarPainel } from './painel.js';

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
    /* v0.6.7: aba Painel */
    if (out.abas[id].painel !== undefined) { if (out.abas[id].painel && typeof out.abas[id].painel === 'object') out.abas[id].painel = normalizarPainel(out.abas[id].painel); else delete out.abas[id].painel; }
  }
  out.ordem = ordem;
  if (!out.ordem.length) return planilhaVazia();
  /* v0.5.0: veio do Excel (relatório, fonte padrão do arquivo e "ainda não mexido") */
  if (c.importado && typeof c.importado === 'object') out.importado = c.importado;
  if (typeof c.fonteBase === 'string') out.fonteBase = c.fonteBase;
  if (Number.isFinite(c.tamBase) && c.tamBase >= 1 && c.tamBase <= 409) out.tamBase = c.tamBase; /* v0.6.14 (D-48): tamanho da letra do Normal */
  /* v0.6.5: tema do Excel (XML), para o arquivo salvo voltar com as mesmas cores do tema */
  if (typeof c.temaXml === 'string' && c.temaXml.length < 120000 && /^<(\w+:)?theme\b/.test(c.temaXml) && !/<script/i.test(c.temaXml)) out.temaXml = c.temaXml;
  if (c.calcExcel === true) out.calcExcel = true;
  /* v0.5.1: tabelas do Excel (só os endereços, para INDIRECT("Tabela[Coluna]") das listas suspensas) */
  if (c.tabelas && typeof c.tabelas === 'object') out.tabelas = c.tabelas;
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
/** v0.6.14 (D-47): estilo que a célula vazia herda da linha inteira ou, se não, da coluna inteira (como o Excel). 0 = nenhum. */
export const estiloHerdado = (aba, l, c) => (aba && ((aba.estL && aba.estL[l]) || (aba.estC && aba.estC[c]) || (aba.estCFim && c >= aba.estCFim.c && aba.estCFim.s))) || 0;
/** A célula como está no modelo ou, vazia, só com o estilo herdado da linha/coluna. */
export const celOuHerdada = (aba, l, c, cel) => { if (cel) return cel; const s = estiloHerdado(aba, l, c); return s ? { s } : undefined; };

/* ---------- tamanho de linhas e colunas ---------- */
/** v0.6.6: largura padrão da aba (px): a do arquivo do Excel (aba.largP, ex.: 64 px) ou a do EFCdocs (80 px, melhor para o toque). */
export const largPadrao = (aba) => (aba && typeof aba.largP === 'number' && aba.largP >= 8 && aba.largP <= 600 ? aba.largP : LARG_PADRAO);
export const largCol = (aba, c) => (aba.ocC && aba.ocC[c] ? 0 : (aba.larg && aba.larg[c] != null ? aba.larg[c] : largPadrao(aba)));
/** v0.6.6: altura padrão das linhas da aba (px): a do arquivo do Excel (aba.altP, ex.: 20 px = 15 pt) ou a do EFCdocs (22 px). */
export const altPadrao = (aba) => (aba && typeof aba.altP === 'number' && aba.altP >= 4 && aba.altP <= 545 ? aba.altP : ALT_PADRAO);
export const altLin = (aba, l) => (aba.ocL && aba.ocL[l] ? 0 : (aba.alt && aba.alt[l] != null ? aba.alt[l] : altPadrao(aba)));

/**
 * Medidas acumuladas para achar posições sem somar 1 milhão de linhas:
 * guarda só as linhas/colunas com tamanho diferente do padrão.
 */
export function eixo(mapaTam, mapaOculto, padrao, max) {
  /* v0.6.45 (D-70): sem Map e sem ordenar. Com as linhas escondidas até o fim (um milhão de chaves) montar levava meio
     segundo a cada ocultar, reexibir ou filtrar. As chaves numéricas de um objeto já vêm em ordem crescente: basta
     intercalar as duas listas (a escondida vale 0, mesmo com tamanho próprio). */
  const ord = (m) => { const ks = Object.keys(m || {}); const out = []; for (const k of ks) { const i = +k; if (i >= 0 && i < max && Number.isInteger(i)) out.push(i); } let ok = true; for (let n = 1; n < out.length; n++) if (out[n] <= out[n - 1]) { ok = false; break; } return ok ? out : out.sort((a, b) => a - b).filter((x, n, l) => n === 0 || x !== l[n - 1]); }; /* "3" e "03": uma só */
  const kt = ord(mapaTam), ko = ord(mapaOculto).filter((i) => mapaOculto[i]);
  const n = kt.length + ko.length, idxT = new Int32Array(n), valT = new Float64Array(n);
  let a = 0, b = 0, q = 0;
  while (a < kt.length || b < ko.length) {
    if (b >= ko.length || (a < kt.length && kt[a] < ko[b])) { idxT[q] = kt[a]; valT[q++] = +mapaTam[kt[a]] || 0; a++; }
    else { if (a < kt.length && kt[a] === ko[b]) a++; idxT[q] = ko[b]; valT[q++] = 0; b++; }
  }
  const idx = idxT.subarray(0, q), val = valT.subarray(0, q);
  /* soma das diferenças até cada índice especial */
  const acum = new Float64Array(q);
  let d = 0;
  for (let k = 0; k < q; k++) { acum[k] = d; d += val[k] - padrao; }
  const achar = (x) => { let lo = 0, hi = q; while (lo < hi) { const m = (lo + hi) >> 1; if (idx[m] < x) lo = m + 1; else hi = m; } return lo; };
  const difAte = (x) => { const lo = achar(x); return lo === 0 ? 0 : acum[lo - 1] + val[lo - 1] - padrao; }; // soma das diferenças dos índices < x
  const pos = (x) => x * padrao + difAte(x);
  const tam = (x) => { const k = achar(x); return k < q && idx[k] === x ? val[k] : padrao; };
  /* a última linha/coluna que aparece: com as de baixo escondidas até o fim, a posição depois dela dava a última do livro
     (1.048.575) e a grade percorria um milhão de linhas de tamanho zero a cada quadro */
  let ultima = max - 1;
  for (let k = q - 1; k >= 0 && idx[k] === ultima && val[k] === 0; k--) ultima--;
  if (ultima < 0) ultima = 0;
  const fimVisto = pos(ultima + 1);
  /** índice na posição p (px) */
  const em = (p) => {
    if (p <= 0) return 0;
    if (ultima < max - 1 && p >= fimVisto) return ultima;
    let lo = 0, hi = max - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (pos(m) <= p) lo = m; else hi = m - 1;
    }
    return lo;
  };
  return { pos, tam, em, max, total: pos(max), ultima };
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
/* v0.5.0: planilha do Excel com milhares de mescladas: índice por linha (montado uma vez por lista) */
const INDICE_MESC = new WeakMap();
export function mesclaEm(lista, l, c) {
  if (lista.length < 40) return lista.find((m) => l >= m.l1 && l <= m.l2 && c >= m.c1 && c <= m.c2) || null;
  let ix = INDICE_MESC.get(lista);
  if (!ix) {
    ix = { porLinha: new Map(), largas: [] };
    for (const m of lista) {
      if (m.l2 - m.l1 > 2000) { ix.largas.push(m); continue; }
      for (let r = m.l1; r <= m.l2; r++) { let a = ix.porLinha.get(r); if (!a) ix.porLinha.set(r, (a = [])); a.push(m); }
    }
    INDICE_MESC.set(lista, ix);
  }
  const a = ix.porLinha.get(l);
  if (a) for (const m of a) if (c >= m.c1 && c <= m.c2) return m;
  for (const m of ix.largas) if (l >= m.l1 && l <= m.l2 && c >= m.c1 && c <= m.c2) return m;
  return null;
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
