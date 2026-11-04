/* EFCdocs — modelo do Documento (v0.7.0).
   O documento é uma lista de blocos. Cada bloco de texto guarda "trechos" (como as runs do Word):
   um pedaço de texto com a formatação dele. Assim o negrito de meia palavra sobrevive ao salvar em Word.
   Tudo aqui é função pura: os testes de regras não precisam do navegador. */

/* ---------- medidas da folha (em pontos; 1 pt = 1/72 pol) ---------- */
export const PT_POR_CM = 72 / 2.54;
export const PAPEIS = {
  A4: { nome: 'A4', w: 595.28, h: 841.89 },
  carta: { nome: 'Carta', w: 612, h: 792 },
  oficio: { nome: 'Ofício', w: 612, h: 1008 },
};
export const MARGENS_PADRAO = { t: 2.5, b: 2.5, e: 3, d: 2 }; /* em cm, como o Word em português */

export function folhaDe(pag) {
  const p = PAPEIS[pag && pag.papel] || PAPEIS.A4;
  const deitada = pag && pag.orient === 'paisagem';
  const w = deitada ? p.h : p.w, h = deitada ? p.w : p.h;
  const m = { ...MARGENS_PADRAO, ...((pag && pag.margens) || {}) };
  return { w, h, m, util: { w: w - (m.e + m.d) * PT_POR_CM, h: h - (m.t + m.b) * PT_POR_CM } };
}

/* ---------- tipos de bloco ---------- */
export const BLOCOS = {
  p: { nome: 'Texto normal', texto: true, ts: 11 },
  h1: { nome: 'Título 1', texto: true, ts: 16, nivel: 1 },
  h2: { nome: 'Título 2', texto: true, ts: 14, nivel: 2 },
  h3: { nome: 'Título 3', texto: true, ts: 12, nivel: 3 },
  li: { nome: 'Lista com marcadores', texto: true, ts: 11, lista: 'marcador' },
  ol: { nome: 'Lista numerada', texto: true, ts: 11, lista: 'numero' },
  ck: { nome: 'Checklist', texto: true, ts: 11, lista: 'marcar' },
  tab: { nome: 'Tabela' },
  img: { nome: 'Imagem' },
  gr: { nome: 'Gráfico' },
  asn: { nome: 'Assinatura' },
  sum: { nome: 'Sumário' },
  quebra: { nome: 'Quebra de página' },
};
export const TEXTO = (b) => !!(b && BLOCOS[b.t] && BLOCOS[b.t].texto);
export const TITULO = (b) => !!(b && BLOCOS[b.t] && BLOCOS[b.t].nivel);
export const LISTA = (b) => (b && BLOCOS[b.t] ? BLOCOS[b.t].lista || '' : '');
export const ESTILOS_TEXTO = ['p', 'h1', 'h2', 'h3', 'li', 'ol', 'ck'];

export const FONTES = ['Calibri', 'Arial', 'Times New Roman', 'Verdana', 'Georgia', 'Courier New'];
export const TAMANHOS = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32];
export const ALINHAR = { esq: 'À esquerda', cen: 'Centralizado', dir: 'À direita', just: 'Justificado' };
export const ESPACOS = [1, 1.15, 1.5, 2];

/* ---------- identificadores ---------- */
let cont = 0;
export function idBloco(prefixo = 'b', agora = Date.now(), aleatorio = Math.random) {
  cont = (cont + 1) % 1296;
  return prefixo + agora.toString(36) + cont.toString(36).padStart(2, '0') + Math.floor(aleatorio() * 46656).toString(36).padStart(3, '0');
}

/* ---------- trechos (runs) ---------- */
/* trecho: { x: texto, n: negrito, i: itálico, s: sublinhado, c: cor, r: realce, f: fonte, ts: tamanho,
             cp: campo de formulário { r: rótulo, k: 'texto'|'data'|'num' }, cm: id do comentário } */
const MARCAS = ['n', 'i', 's', 'c', 'r', 'f', 'ts', 'cp', 'cm'];
export const formatoDo = (tr) => { const o = {}; for (const k of MARCAS) if (tr[k] != null) o[k] = tr[k]; return o; };
const chave = (v) => (v && typeof v === 'object' ? JSON.stringify(v) : String(v ?? ''));
const mesmoFormato = (a, b) => MARCAS.every((k) => chave(a[k]) === chave(b[k]));
const comTexto = (tr, x) => ({ ...formatoDo(tr), x });

export const trecho = (x, f = {}) => ({ ...f, x: String(x ?? '') });
export const textoDoBloco = (b) => (b && b.tr ? b.tr.map((t) => t.x).join('') : '');
export const tamanhoBloco = (b) => textoDoBloco(b).length;

/** Junta trechos vizinhos de formatação igual e tira os vazios (menos campos, que existem vazios). */
export function limparTrechos(tr) {
  const saida = [];
  for (const t of tr || []) {
    if (!t) continue;
    const x = String(t.x ?? '');
    if (!x && !t.cp) continue;
    const ultimo = saida[saida.length - 1];
    /* dois pedaços do MESMO campo (mesmo id) viram um; campos diferentes nunca se juntam */
    if (ultimo && mesmoFormato(ultimo, t)) saida[saida.length - 1] = comTexto(ultimo, ultimo.x + x);
    else saida.push(comTexto(t, x));
  }
  return saida.length ? saida : [trecho('')];
}

/** Corta a lista de trechos nas posições dadas (em letras), para aplicar formato num intervalo. */
function cortar(tr, pos) {
  const saida = [];
  let i = 0;
  for (const t of tr) {
    const fim = i + t.x.length;
    const dentro = pos.filter((p) => p > i && p < fim).sort((a, b) => a - b);
    let de = i;
    for (const p of dentro) { saida.push(comTexto(t, t.x.slice(de - i, p - i))); de = p; }
    saida.push(comTexto(t, t.x.slice(de - i)));
    i = fim;
  }
  return saida;
}

/** Liga, desliga ou troca uma marca no intervalo [de, ate). valor null tira a marca. */
export function aplicarMarca(b, de, ate, chave, valor) {
  if (!TEXTO(b)) return b;
  const n = tamanhoBloco(b);
  const d = Math.max(0, Math.min(n, Math.min(de, ate))), a = Math.max(0, Math.min(n, Math.max(de, ate)));
  if (d === a) return b;
  const partes = cortar(b.tr, [d, a]);
  let i = 0;
  const tr = partes.map((t) => {
    const fim = i + t.x.length, pega = i >= d && fim <= a;
    i = fim;
    if (!pega) return t;
    const novo = { ...t };
    if (valor == null || valor === false) delete novo[chave]; else novo[chave] = valor;
    return novo;
  });
  return { ...b, tr: limparTrechos(tr) };
}

/** A marca vale em todo o intervalo? (para o botão do negrito aparecer ligado) */
export function marcaNoIntervalo(b, de, ate, chave) {
  if (!TEXTO(b)) return null;
  const tr = cortar(b.tr, [de, ate]);
  let i = 0; const valores = [];
  for (const t of tr) {
    const fim = i + t.x.length;
    if (i >= de && fim <= ate && (t.x.length || t.cp)) valores.push(t[chave] ?? null);
    i = fim;
  }
  if (!valores.length) {
    const sol = trechoEm(b, de);
    return sol ? sol[chave] ?? null : null;
  }
  const primeiro = valores[0];
  return valores.every((v) => String(v ?? '') === String(primeiro ?? '')) ? primeiro ?? null : null;
}

/** O trecho que vale na posição do cursor (o de antes do cursor, como no Word). */
export function trechoEm(b, pos) {
  if (!TEXTO(b) || !b.tr.length) return null;
  let i = 0;
  for (const t of b.tr) { const fim = i + t.x.length; if (pos <= fim && pos > i) return t; i = fim; }
  return b.tr[0];
}

/** Põe texto na posição, herdando o formato de onde o cursor está. Devolve o bloco e o novo cursor. */
export function inserirTexto(b, pos, texto, formato = null) {
  if (!TEXTO(b) || !texto) return { bloco: b, pos };
  /* sem formato dito, herda o de onde o cursor está — mas fora do campo:
     quem digita no fim de um campo está escrevendo depois dele, não dentro.
     O editor passa o formato do campo de propósito quando o cursor está dentro. */
  const base = formato ? { ...formato } : formatoDo(trechoEm(b, pos) || {});
  if (!formato) delete base.cp;
  const partes = cortar(b.tr, [pos]);
  const saida = []; let i = 0, posto = false;
  for (const t of partes) {
    if (!posto && i === pos) { saida.push(trecho(texto, base)); posto = true; }
    saida.push(t); i += t.x.length;
  }
  if (!posto) saida.push(trecho(texto, base));
  return { bloco: { ...b, tr: limparTrechos(saida) }, pos: pos + texto.length };
}

/** Apaga o intervalo [de, ate). */
export function apagarTexto(b, de, ate) {
  if (!TEXTO(b)) return b;
  const d = Math.min(de, ate), a = Math.max(de, ate);
  if (d === a) return b;
  const partes = cortar(b.tr, [d, a]);
  let i = 0; const tr = [];
  for (const t of partes) { const fim = i + t.x.length; if (!(i >= d && fim <= a)) tr.push(t); i = fim; }
  return { ...b, tr: limparTrechos(tr) };
}

/** Parte o bloco no cursor: Enter. O segundo pedaço continua o mesmo estilo (menos título, que volta a texto). */
export function dividirBloco(b, pos) {
  const n = tamanhoBloco(b);
  const partes = cortar(b.tr, [pos]);
  let i = 0; const a = [], d = [];
  for (const t of partes) { const fim = i + t.x.length; (fim <= pos ? a : d).push(t); i = fim; }
  const segundo = TITULO(b) && pos >= n ? 'p' : b.t;
  return [
    { ...b, tr: limparTrechos(a) },
    { ...b, id: idBloco(), t: segundo, tr: limparTrechos(d) },
  ];
}

/** Junta dois blocos de texto (Backspace no começo da linha). */
export function juntarBlocos(a, b) {
  if (!TEXTO(a) || !TEXTO(b)) return null;
  return { bloco: { ...a, tr: limparTrechos([...a.tr, ...b.tr]) }, pos: tamanhoBloco(a) };
}

/* ---------- blocos novos ---------- */
export const paragrafo = (texto = '', extra = {}) => ({ id: idBloco(), t: 'p', al: 'esq', esp: 1.15, tr: limparTrechos([trecho(texto)]), ...extra });
export const titulo = (texto, nivel = 1) => ({ ...paragrafo(texto), t: 'h' + nivel });

/** Campo de formulário: um trecho que só aceita texto na hora de preencher. */
export const campoNovo = (rotulo, k = 'texto', valor = '') => trecho(valor, { cp: { id: idBloco('c'), r: String(rotulo || '').slice(0, 60), k } });

export function celulaVazia() { return { tr: [trecho('')] }; }
export function tabelaNova(linhas = 3, colunas = 3, cab = 1) {
  const l = [];
  for (let i = 0; i < linhas; i++) l.push(Array.from({ length: colunas }, () => celulaVazia()));
  return { id: idBloco(), t: 'tab', cab, larg: Array.from({ length: colunas }, () => Math.round(100 / colunas)), linhas: l };
}
export const imagemNova = (src, w, h, leg = '') => ({ id: idBloco(), t: 'img', src, w, h, leg, al: 'cen' });
export const graficoNovo = (g, d, w = 420, h = 260) => ({ id: idBloco(), t: 'gr', g, d, w, h, al: 'cen' });
export const assinaturaNova = (nome = '', cargo = '') => ({ id: idBloco(), t: 'asn', nome, cargo, rub: '', al: 'cen' });
export const quebraNova = () => ({ id: idBloco(), t: 'quebra' });
export const sumarioNovo = () => ({ id: idBloco(), t: 'sum', niveis: 3 });

/* ---------- cabeçalho do POP ---------- */
export const CABECALHO_VAZIO = {
  ligado: 0, codigo: '', titulo: '', rev: '00', data: '', setor: '',
  elaborado: '', revisado: '', aprovado: '', logo: '', logoW: 0, logoH: 0,
};
export const RODAPE_VAZIO = { texto: '', numero: 1 };

/* ---------- documento ---------- */
export function documentoVazio() {
  return {
    v: 1,
    blocos: [paragrafo('')],
    pag: { papel: 'A4', orient: 'retrato', margens: { ...MARGENS_PADRAO } },
    cab: { ...CABECALHO_VAZIO },
    rod: { ...RODAPE_VAZIO },
    rev: { controlar: 0, marcas: [] },
    coment: {},
    revisoes: [],
  };
}

const nTexto = (x, p = '') => (x == null ? p : String(x));
const nNum = (x, p) => (Number.isFinite(Number(x)) ? Number(x) : p);

function normalizarTrechos(tr) {
  const lista = Array.isArray(tr) ? tr : [];
  const saida = [];
  for (const t of lista) {
    if (!t || typeof t !== 'object') continue;
    const novo = { x: nTexto(t.x) };
    if (t.n) novo.n = 1;
    if (t.i) novo.i = 1;
    if (t.s) novo.s = 1;
    if (t.c) novo.c = String(t.c).slice(0, 9);
    if (t.r) novo.r = String(t.r).slice(0, 9);
    if (t.f && FONTES.includes(t.f)) novo.f = t.f;
    if (t.ts) novo.ts = Math.max(6, Math.min(72, nNum(t.ts, 11)));
    if (t.cm) novo.cm = String(t.cm).slice(0, 24);
    if (t.cp && typeof t.cp === 'object') {
      novo.cp = { id: nTexto(t.cp.id).slice(0, 24) || idBloco('c'), r: nTexto(t.cp.r).slice(0, 60), k: ['texto', 'data', 'num'].includes(t.cp.k) ? t.cp.k : 'texto' };
    }
    saida.push(novo);
  }
  return limparTrechos(saida);
}

function normalizarBloco(b) {
  if (!b || typeof b !== 'object' || !BLOCOS[b.t]) return null;
  const base = { id: nTexto(b.id) || idBloco(), t: b.t };
  if (b.al && ALINHAR[b.al]) base.al = b.al;
  if (b.t === 'tab') {
    const linhas = (Array.isArray(b.linhas) ? b.linhas : []).map((l) => (Array.isArray(l) ? l : []).map((c) => ({
      tr: normalizarTrechos(c && c.tr),
      ...(c && c.cl ? { cl: String(c.cl).slice(0, 9) } : {}),
      ...(c && c.cols > 1 ? { cols: Math.min(20, nNum(c.cols, 1)) } : {}),
    })));
    if (!linhas.length || !linhas[0].length) return null;
    const colunas = linhas[0].length;
    return {
      ...base, cab: b.cab ? 1 : 0, linhas: linhas.map((l) => (l.length ? l : [celulaVazia()])),
      larg: Array.isArray(b.larg) && b.larg.length === colunas ? b.larg.map((x) => Math.max(3, nNum(x, 10))) : Array.from({ length: colunas }, () => Math.round(100 / colunas)),
      ...(b.borda === 0 ? { borda: 0 } : {}),
    };
  }
  if (b.t === 'img') {
    if (!b.src) return null;
    return { ...base, src: String(b.src), w: Math.max(16, nNum(b.w, 300)), h: Math.max(16, nNum(b.h, 200)), leg: nTexto(b.leg).slice(0, 200) };
  }
  if (b.t === 'gr') {
    if (!b.g || !b.d) return null;
    return { ...base, g: b.g, d: b.d, w: Math.max(80, nNum(b.w, 420)), h: Math.max(60, nNum(b.h, 260)), leg: nTexto(b.leg).slice(0, 200) };
  }
  if (b.t === 'asn') return { ...base, nome: nTexto(b.nome).slice(0, 120), cargo: nTexto(b.cargo).slice(0, 120), rub: nTexto(b.rub) };
  if (b.t === 'sum') return { ...base, niveis: Math.max(1, Math.min(3, nNum(b.niveis, 3))) };
  if (b.t === 'quebra') return base;
  /* blocos de texto */
  const r = { ...base, tr: normalizarTrechos(b.tr), esp: ESPACOS.includes(Number(b.esp)) ? Number(b.esp) : 1.15 };
  if (!r.al) r.al = 'esq';
  if (LISTA(r)) r.niv = Math.max(0, Math.min(4, nNum(b.niv, 0)));
  if (r.t === 'ck') r.m = b.m ? 1 : 0;
  if (b.esq) r.esq = Math.max(0, Math.min(2000, nNum(b.esq, 0)));
  if (b.antes) r.antes = Math.max(0, Math.min(72, nNum(b.antes, 0)));
  if (b.depois) r.depois = Math.max(0, Math.min(72, nNum(b.depois, 0)));
  return r;
}

export function normalizarDocumento(c) {
  const base = documentoVazio();
  if (!c || typeof c !== 'object') return base;
  const blocos = (Array.isArray(c.blocos) ? c.blocos : []).map(normalizarBloco).filter(Boolean);
  const pag = c.pag && typeof c.pag === 'object' ? c.pag : {};
  const m = pag.margens && typeof pag.margens === 'object' ? pag.margens : {};
  const cab = c.cab && typeof c.cab === 'object' ? c.cab : {};
  const rod = c.rod && typeof c.rod === 'object' ? c.rod : {};
  const coment = {};
  for (const [k, v] of Object.entries(c.coment && typeof c.coment === 'object' ? c.coment : {})) {
    if (!v || typeof v !== 'object') continue;
    coment[String(k).slice(0, 24)] = { texto: nTexto(v.texto).slice(0, 2000), autor: nTexto(v.autor, 'neste aparelho').slice(0, 60), em: nTexto(v.em), resolvido: v.resolvido ? 1 : 0 };
  }
  return {
    v: 1,
    blocos: blocos.length ? blocos : [paragrafo('')],
    pag: {
      papel: PAPEIS[pag.papel] ? pag.papel : 'A4',
      orient: pag.orient === 'paisagem' ? 'paisagem' : 'retrato',
      margens: { t: nNum(m.t, MARGENS_PADRAO.t), b: nNum(m.b, MARGENS_PADRAO.b), e: nNum(m.e, MARGENS_PADRAO.e), d: nNum(m.d, MARGENS_PADRAO.d) },
    },
    cab: {
      ligado: cab.ligado ? 1 : 0, codigo: nTexto(cab.codigo).slice(0, 40), titulo: nTexto(cab.titulo).slice(0, 160),
      rev: nTexto(cab.rev).slice(0, 10) || '00', data: nTexto(cab.data).slice(0, 10), setor: nTexto(cab.setor).slice(0, 80),
      elaborado: nTexto(cab.elaborado).slice(0, 80), revisado: nTexto(cab.revisado).slice(0, 80), aprovado: nTexto(cab.aprovado).slice(0, 80),
      logo: nTexto(cab.logo), logoW: nNum(cab.logoW, 0), logoH: nNum(cab.logoH, 0),
    },
    rod: { texto: nTexto(rod.texto).slice(0, 160), numero: rod.numero === 0 ? 0 : 1 },
    rev: { controlar: c.rev && c.rev.controlar ? 1 : 0, marcas: [] },
    coment,
    revisoes: (Array.isArray(c.revisoes) ? c.revisoes : []).slice(0, 200).map((r) => ({
      rev: nTexto(r && r.rev).slice(0, 10), em: nTexto(r && r.em), autor: nTexto(r && r.autor, 'neste aparelho').slice(0, 60),
      motivo: nTexto(r && r.motivo).slice(0, 400), palavras: nNum(r && r.palavras, 0),
    })),
  };
}

/* ---------- contagens e sumário ---------- */
export function contagem(c) {
  let palavras = 0, letras = 0, titulos = 0, campos = 0, tabelas = 0, imagens = 0, graficos = 0, assinaturas = 0;
  const conta = (tr) => {
    for (const t of tr || []) {
      letras += t.x.length;
      if (t.cp) campos++;
    }
    const txt = (tr || []).map((t) => t.x).join(' ');
    palavras += (txt.match(/[^\s]+/g) || []).length;
  };
  for (const b of c.blocos || []) {
    if (TEXTO(b)) { conta(b.tr); if (TITULO(b)) titulos++; }
    else if (b.t === 'tab') { tabelas++; for (const l of b.linhas) for (const cel of l) conta(cel.tr); }
    else if (b.t === 'img') imagens++;
    else if (b.t === 'gr') graficos++;
    else if (b.t === 'asn') assinaturas++;
  }
  return { palavras, letras, titulos, campos, tabelas, imagens, graficos, assinaturas, blocos: (c.blocos || []).length };
}

/** Lista dos títulos, para o sumário e para o painel de navegação. */
export function sumarioDe(c, niveis = 3) {
  const saida = [];
  const n = [0, 0, 0];
  for (const b of c.blocos || []) {
    const nivel = TITULO(b) ? BLOCOS[b.t].nivel : 0;
    if (!nivel || nivel > niveis) continue;
    n[nivel - 1]++;
    for (let i = nivel; i < 3; i++) n[i] = 0;
    saida.push({ id: b.id, nivel, texto: textoDoBloco(b), num: n.slice(0, nivel).join('.') });
  }
  return saida;
}

/* ---------- caminhos para o diff (o App guarda só o que mudou) ---------- */
export const noArquivo = (mud) => Object.fromEntries(Object.entries(mud).map(([k, v]) => ['conteudo.' + k, v]));
export const caminhoBloco = (i, resto = '') => 'blocos.' + i + (resto ? '.' + resto : '');
export const indiceDe = (c, id) => (c.blocos || []).findIndex((b) => b.id === id);

/** Mudança que troca a lista de blocos inteira (inserir, excluir, mover). */
export const trocarBlocos = (blocos) => ({ blocos });

/* ---------- utilidades do editor ---------- */
export function proximoTexto(blocos, de, passo = 1) {
  for (let i = de + passo; i >= 0 && i < blocos.length; i += passo) if (TEXTO(blocos[i])) return i;
  return -1;
}

/** Numeração das listas: conta os vizinhos do mesmo nível, parando em outro tipo de bloco. */
export function numeroDaLista(blocos, i) {
  const b = blocos[i];
  if (!b || b.t !== 'ol') return 0;
  let n = 1;
  for (let k = i - 1; k >= 0; k--) {
    const a = blocos[k];
    if (!a || a.t !== 'ol' || (a.niv || 0) > (b.niv || 0)) {
      if (a && a.t === 'ol' && (a.niv || 0) > (b.niv || 0)) continue;
      break;
    }
    if ((a.niv || 0) === (b.niv || 0)) n++;
  }
  return n;
}

export const MARCADORES = ['•', '◦', '▪', '–', '·'];
export const marcadorDe = (niv = 0) => MARCADORES[Math.min(MARCADORES.length - 1, niv)] || '•';
