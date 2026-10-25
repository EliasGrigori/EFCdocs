/* EFCdocs — modelo do quadro de post-its (v0.3.1).
   Tudo aqui é regra pura, sem tela: cria, move, liga, apaga, organiza em Kanban.
   As funções devolvem "mudanças" no formato { "itens.<id>": valor } (undefined apaga),
   que viram diffs no núcleo (desfazer/refazer e gravação só do que mudou).

   conteúdo = {
     v: 1,
     itens:   { id: Item },      Item  = { id, tipo, x, y, w, h, z, texto, cor, cod?, fonte?, alinh?, nota?, link?, col?, ko?, src?,
                                         resp?, prazo?, g?, u?, t? (tarefa), borda? (texto), rot? (legenda) }
     setas:   { id: Seta },      Seta  = { id, de: { id, lado? }, para: { id, lado? }, rotulo, estilo, pontas }
     colunas: [{ id, nome }],    colunas do Kanban (A fazer, Fazendo, Feito)
     seq: n                      último número usado nos códigos Q-001, Q-002...
   } */

export const CORES = [
  ['amarelo', '#fde68a', 'Amarelo'], ['verde', '#bbf7d0', 'Verde'], ['azul', '#bfdbfe', 'Azul'],
  ['rosa', '#fbcfe8', 'Rosa'], ['laranja', '#fed7aa', 'Laranja'], ['lilas', '#ddd6fe', 'Lilás'],
  ['cinza', '#e5e7eb', 'Cinza'], ['branco', '#ffffff', 'Branco'],
];
export const COR = Object.fromEntries(CORES.map(([id, hex]) => [id, hex]));

export const CORES_FONTE = [
  ['#1f2328', 'Preto'], ['#b42318', 'Vermelho'], ['#175cd3', 'Azul'], ['#067647', 'Verde'], ['#93370d', 'Marrom'], ['#6941c6', 'Roxo'],
];

/* Tipos de item: tamanho padrão, cor padrão, se recebe código Q e se entra no Kanban */
export const TIPOS_ITEM = {
  postit: { nome: 'Post-it', w: 170, h: 130, cor: 'amarelo', codigo: true, kanban: true },
  processo: { nome: 'Atividade', w: 170, h: 74, cor: 'branco', codigo: true },
  decisao: { nome: 'Decisão', w: 150, h: 110, cor: 'branco', codigo: true },
  inicio: { nome: 'Início/Fim', w: 160, h: 62, cor: 'branco', codigo: true },
  dados: { nome: 'Entrada/Saída', w: 170, h: 74, cor: 'branco', codigo: true },
  texto: { nome: 'Texto', w: 200, h: 44, cor: null },
  raia: { nome: 'Raia', w: 1300, h: 200, cor: 'cinza' },
  pagina: { nome: 'Página', w: 560, h: 380, cor: null },
  legenda: { nome: 'Legenda', w: 340, h: 120, cor: null },
  imagem: { nome: 'Imagem', w: 240, h: 180, cor: null },
};
export const FORMAS = ['processo', 'decisao', 'inicio', 'dados'];
/** Fundo do quadro: não se liga com seta, não entra na seleção em área e carrega o que está dentro quando se arrasta. */
export const FUNDO = ['raia', 'pagina'];
export const ehFundo = (it) => !!it && FUNDO.includes(it.tipo);
const camada = (it) => (it.tipo === 'raia' ? 0 : it.tipo === 'pagina' ? 1 : 2);

export const COLUNAS_PADRAO = [
  { id: 'c1', nome: 'A fazer' }, { id: 'c2', nome: 'Fazendo' }, { id: 'c3', nome: 'Feito' },
];

export function conteudoQuadroVazio() {
  return { v: 1, itens: {}, setas: {}, colunas: COLUNAS_PADRAO.map((c) => ({ ...c })), seq: 0 };
}

let cont = 0;
export function idCurto(prefixo = 'i', agora = Date.now(), aleatorio = Math.random) {
  cont = (cont + 1) % 1296;
  return prefixo + agora.toString(36) + cont.toString(36).padStart(2, '0') + Math.floor(aleatorio() * 46656).toString(36).padStart(3, '0');
}

export const codigo = (n) => 'Q-' + String(n).padStart(3, '0');

const num = (v, padrao) => (typeof v === 'number' && Number.isFinite(v) ? v : padrao);

/** Aceita o conteúdo antigo da v0.2.0 ({ itens: [], setas: [] }) e qualquer campo faltando. */
export function normalizarQuadro(c) {
  const base = conteudoQuadroVazio();
  if (!c || typeof c !== 'object') return base;
  const lista = (x) => (Array.isArray(x) ? x : x && typeof x === 'object' ? Object.values(x) : []);
  const itens = {};
  for (const it of lista(c.itens)) {
    if (!it || !it.id || !TIPOS_ITEM[it.tipo]) continue;
    const t = TIPOS_ITEM[it.tipo];
    itens[it.id] = { ...it, x: num(it.x, 0), y: num(it.y, 0), w: num(it.w, t.w), h: num(it.h, t.h), z: num(it.z, 0), texto: String(it.texto ?? '') };
  }
  const setas = {};
  for (const s of lista(c.setas)) {
    if (!s || !s.id || !s.de || !s.para || !itens[s.de.id] || !itens[s.para.id]) continue;
    setas[s.id] = { estilo: 'cotovelo', pontas: 'fim', rotulo: '', ...s };
  }
  const colunas = Array.isArray(c.colunas) && c.colunas.length
    ? c.colunas.filter((k) => k && k.id).map((k) => ({ id: String(k.id), nome: String(k.nome || 'Coluna') }))
    : base.colunas;
  const maiorCod = Object.values(itens).reduce((m, it) => Math.max(m, it.cod ? parseInt(it.cod.slice(2), 10) || 0 : 0), 0);
  return { v: 1, itens, setas, colunas, seq: Math.max(num(c.seq, 0), maiorCod) };
}

export const listaItens = (c) => Object.values(c.itens);
export const listaSetas = (c) => Object.values(c.setas);
export const porZ = (c) => listaItens(c).sort((a, b) => camada(a) - camada(b) || a.z - b.z || (a.id < b.id ? -1 : 1));
export const maiorZ = (c) => listaItens(c).reduce((m, it) => Math.max(m, it.z), 0);
export const menorZ = (c) => listaItens(c).reduce((m, it) => Math.min(m, it.z), 0);

export function contagem(c) {
  const it = listaItens(c);
  return {
    postits: it.filter((i) => i.tipo === 'postit').length,
    formas: it.filter((i) => FORMAS.includes(i.tipo)).length,
    paginas: it.filter((i) => i.tipo === 'pagina').length,
    itens: it.length,
    setas: listaSetas(c).length,
  };
}

/** Cria um item novo; devolve o item e as mudanças (inclui o contador de códigos). */
export function novoItem(c, tipo, campos = {}, opcoes = {}) {
  const t = TIPOS_ITEM[tipo];
  if (!t) throw new Error('tipo de item desconhecido: ' + tipo);
  const id = opcoes.id || idCurto();
  const item = {
    id, tipo, x: 0, y: 0, w: t.w, h: t.h, z: maiorZ(c) + 1, texto: '',
    ...(t.cor ? { cor: t.cor } : {}),
    ...campos,
  };
  if (ehFundo(item)) item.z = menorZ(c) - 1;
  const mud = {};
  if (t.codigo && !item.cod) {
    const seq = (opcoes.seq ?? c.seq) + 1;
    item.cod = codigo(seq);
    mud.seq = seq;
  }
  if (t.kanban) {
    if (!item.col) item.col = c.colunas[0] ? c.colunas[0].id : 'c1';
    if (item.ko === undefined) item.ko = proximaOrdemKanban(c, item.col);
  }
  mud['itens.' + id] = item;
  return { item, mudancas: mud };
}

export function novaSeta(c, deId, paraId, campos = {}, opcoes = {}) {
  if (!c.itens[deId] || !c.itens[paraId]) throw new Error('a seta precisa de dois itens');
  if (deId === paraId) throw new Error('a seta não pode ligar um item a ele mesmo');
  for (const x of [c.itens[deId], c.itens[paraId]]) if (ehFundo(x) || x.tipo === 'legenda') throw new Error('raia, página e legenda não recebem seta');
  const id = opcoes.id || idCurto('s');
  const seta = { id, de: { id: deId }, para: { id: paraId }, rotulo: '', estilo: 'cotovelo', pontas: 'fim', ...campos };
  return { seta, mudancas: { ['setas.' + id]: seta } };
}

/** Já existe seta entre os dois (em qualquer sentido)? */
export const setaEntre = (c, a, b) =>
  listaSetas(c).find((s) => (s.de.id === a && s.para.id === b) || (s.de.id === b && s.para.id === a)) || null;

export const setasDoItem = (c, id) => listaSetas(c).filter((s) => s.de.id === id || s.para.id === id);

/** Apaga itens e setas; as setas presas aos itens apagados saem junto. */
export function mudancasExcluir(c, idsItens = [], idsSetas = []) {
  const mud = {};
  const fora = new Set(idsItens.filter((id) => c.itens[id]));
  for (const id of fora) mud['itens.' + id] = undefined;
  for (const s of listaSetas(c)) {
    if (idsSetas.includes(s.id) || fora.has(s.de.id) || fora.has(s.para.id)) mud['setas.' + s.id] = undefined;
  }
  return mud;
}

export function mudancasMover(c, ids, dx, dy) {
  const mud = {};
  for (const id of ids) {
    const it = c.itens[id];
    if (it) mud['itens.' + id] = { ...it, x: Math.round(it.x + dx), y: Math.round(it.y + dy) };
  }
  return mud;
}

export function mudancasCampo(c, ids, campos) {
  const mud = {};
  for (const id of ids) {
    const it = c.itens[id];
    if (it) mud['itens.' + id] = { ...it, ...campos };
  }
  return mud;
}

/** Guarda a seleção para colar depois (itens e as setas entre eles). */
export function copiar(c, ids) {
  const set = new Set(ids.filter((id) => c.itens[id]));
  return {
    itens: [...set].map((id) => structuredClone(c.itens[id])),
    setas: listaSetas(c).filter((s) => set.has(s.de.id) && set.has(s.para.id)).map((s) => structuredClone(s)),
  };
}

/** Cola (ou duplica) com códigos novos; devolve as mudanças e os ids novos. */
export function colar(c, clip, deslocamento = { x: 24, y: 24 }) {
  if (!clip || !clip.itens || !clip.itens.length) return { mudancas: {}, ids: [] };
  const mud = {};
  const mapa = {};
  let seq = c.seq;
  let z = maiorZ(c);
  const ordem = [...clip.itens].sort((a, b) => a.z - b.z);
  for (const orig of ordem) {
    const t = TIPOS_ITEM[orig.tipo];
    if (!t) continue;
    const id = idCurto();
    mapa[orig.id] = id;
    const it = { ...structuredClone(orig), id, x: Math.round(orig.x + deslocamento.x), y: Math.round(orig.y + deslocamento.y), z: ehFundo(orig) ? orig.z : ++z };
    delete it.cod;
    if (t.codigo) it.cod = codigo(++seq);
    if (t.kanban) {
      if (!c.colunas.some((k) => k.id === it.col)) it.col = c.colunas[0] ? c.colunas[0].id : 'c1';
      it.ko = proximaOrdemKanban(c, it.col) + Object.keys(mapa).length;
    }
    mud['itens.' + id] = it;
  }
  for (const s of clip.setas || []) {
    if (!mapa[s.de.id] || !mapa[s.para.id]) continue;
    const id = idCurto('s');
    mud['setas.' + id] = { ...structuredClone(s), id, de: { ...s.de, id: mapa[s.de.id] }, para: { ...s.para, id: mapa[s.para.id] } };
  }
  if (seq !== c.seq) mud.seq = seq;
  return { mudancas: mud, ids: Object.values(mapa) };
}

const DIRECOES = { r: [1, 0], b: [0, 1], l: [-1, 0], t: [0, -1] };

/** Que item vem depois: post-it puxa post-it; no fluxograma, depois de Início ou Decisão vem uma etapa (Processo). */
export function tipoDoProximo(base) {
  if (base.tipo === 'postit' || base.tipo === 'processo' || base.tipo === 'dados') return base.tipo;
  return 'processo';
}

/** "Próximo passo": cria um item igual ao lado (direita ou abaixo) já ligado por seta.
    Se a vaga estiver ocupada, desce até achar espaço. */
export function proximoPasso(c, id, direcao = 'r', espaco = 70) {
  const base = c.itens[id];
  if (!base || ehFundo(base) || base.tipo === 'legenda') return null;
  const tipo = tipoDoProximo(base);
  const t = TIPOS_ITEM[tipo];
  const [dx, dy] = DIRECOES[direcao] || DIRECOES.r;
  const w = base.tipo === tipo ? base.w : t.w;
  const h = base.tipo === tipo ? base.h : t.h;
  let x = dx > 0 ? base.x + base.w + espaco : dx < 0 ? base.x - w - espaco : base.x + (base.w - w) / 2;
  let y = dy > 0 ? base.y + base.h + espaco : dy < 0 ? base.y - h - espaco : base.y + (base.h - h) / 2;
  const ocupado = (px, py) => listaItens(c).some((o) => !ehFundo(o) && px < o.x + o.w && px + w > o.x && py < o.y + o.h && py + h > o.y);
  for (let i = 0; i < 20 && ocupado(x, y); i++) {
    if (dx !== 0) y += h + 30; else x += w + 30;
  }
  const campos = { x: Math.round(x), y: Math.round(y), w, h };
  if (base.cor && base.tipo === tipo) campos.cor = base.cor;
  if (base.col && t.kanban) campos.col = base.col;
  const novo = novoItem(c, tipo, campos);
  const c2 = { ...c, seq: novo.mudancas.seq ?? c.seq, itens: { ...c.itens, [novo.item.id]: novo.item } };
  const s = novaSeta(c2, id, novo.item.id);
  return { item: novo.item, seta: s.seta, mudancas: { ...novo.mudancas, ...s.mudancas } };
}

/** Primeira vaga livre perto do ponto (para não pôr um post-it em cima do outro). */
export function vagaLivre(c, x, y, w, h, passo = 28) {
  const ocupado = (px, py) => listaItens(c).some((o) => !ehFundo(o) && px < o.x + o.w && px + w > o.x && py < o.y + o.h && py + h > o.y);
  let px = Math.round(x), py = Math.round(y);
  for (let i = 0; i < 40 && ocupado(px, py); i++) { px += passo; py += passo; }
  return { x: px, y: py };
}

/** Lugar para um post-it criado pelo Kanban: abaixo dos outros da mesma coluna, no quadro livre. */
export function vagaKanban(c, colId) {
  const i = Math.max(0, c.colunas.findIndex((k) => k.id === colId));
  const t = TIPOS_ITEM.postit;
  const daColuna = listaItens(c).filter((o) => o.tipo === 'postit' && o.col === colId);
  const x = daColuna.length ? Math.min(...daColuna.map((o) => o.x)) : i * (t.w + 40);
  const y = daColuna.length ? Math.max(...daColuna.map((o) => o.y + o.h)) + 24 : 0;
  return vagaLivre(c, x, y, t.w, t.h);
}

/* ---------- Kanban ---------- */

export function proximaOrdemKanban(c, colId) {
  return listaItens(c).filter((i) => i.col === colId && TIPOS_ITEM[i.tipo] && TIPOS_ITEM[i.tipo].kanban)
    .reduce((m, i) => Math.max(m, num(i.ko, 0)), 0) + 1;
}

/** { colId: [itens em ordem] } — só post-its; post-it com coluna que não existe vai para a primeira. */
export function porColuna(c) {
  const grupos = Object.fromEntries(c.colunas.map((k) => [k.id, []]));
  const primeira = c.colunas[0] && c.colunas[0].id;
  for (const it of listaItens(c)) {
    if (!TIPOS_ITEM[it.tipo] || !TIPOS_ITEM[it.tipo].kanban) continue;
    const col = grupos[it.col] ? it.col : primeira;
    if (col) grupos[col].push(it);
  }
  for (const k of Object.keys(grupos)) grupos[k].sort((a, b) => num(a.ko, 0) - num(b.ko, 0) || (a.cod || '').localeCompare(b.cod || ''));
  return grupos;
}

/** Leva um post-it para a coluna colId na posição indice; renumera a ordem da coluna. */
export function mudancasMoverKanban(c, id, colId, indice) {
  const it = c.itens[id];
  if (!it || !c.colunas.some((k) => k.id === colId)) return {};
  const grupos = porColuna(c);
  for (const k of Object.keys(grupos)) grupos[k] = grupos[k].filter((x) => x.id !== id);
  const lista = grupos[colId];
  const pos = Math.max(0, Math.min(indice ?? lista.length, lista.length));
  lista.splice(pos, 0, { ...it, col: colId });
  const mud = {};
  lista.forEach((x, i) => {
    const atual = c.itens[x.id];
    if (atual.col !== colId || atual.ko !== i + 1) mud['itens.' + x.id] = { ...atual, col: colId, ko: i + 1 };
  });
  return mud;
}

export function adicionarColuna(c, nome) {
  const id = idCurto('c');
  return { id, mudancas: { colunas: [...c.colunas, { id, nome: String(nome || 'Nova coluna').slice(0, 40) }] } };
}

export function renomearColuna(c, colId, nome) {
  return { colunas: c.colunas.map((k) => (k.id === colId ? { ...k, nome: String(nome).slice(0, 40) } : k)) };
}

/** Só sai coluna vazia, e sempre fica pelo menos uma. */
export function removerColuna(c, colId) {
  if (c.colunas.length <= 1) return { erro: 'O Kanban precisa de pelo menos uma coluna.' };
  if ((porColuna(c)[colId] || []).length) return { erro: 'Só dá para tirar coluna vazia. Mova os post-its antes.' };
  return { mudancas: { colunas: c.colunas.filter((k) => k.id !== colId) } };
}

export function moverColuna(c, colId, delta) {
  const i = c.colunas.findIndex((k) => k.id === colId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= c.colunas.length) return {};
  const colunas = [...c.colunas];
  [colunas[i], colunas[j]] = [colunas[j], colunas[i]];
  return { colunas };
}

/* ---------- Raias por setor ---------- */

export function criarRaias(c, x, y, nomes = ['Setor 1', 'Setor 2', 'Setor 3'], largura = 1300, altura = 200) {
  const mud = {};
  let z = menorZ(c);
  nomes.forEach((nome, i) => {
    const id = idCurto('r');
    mud['itens.' + id] = { id, tipo: 'raia', x: Math.round(x), y: Math.round(y + i * altura), w: largura, h: altura, z: --z, texto: nome, cor: i % 2 ? 'branco' : 'cinza' };
  });
  return mud;
}

/* ---------- Páginas ---------- */

/** Página nova (moldura com título): o que estiver dentro anda junto quando ela é arrastada. */
export function novaPagina(c, x, y, titulo) {
  const n = listaItens(c).filter((i) => i.tipo === 'pagina').length + 1;
  return novoItem(c, 'pagina', { x: Math.round(x), y: Math.round(y), texto: titulo || 'Página ' + n });
}

/** Itens (fora o fundo) cujo centro está dentro da página. */
export function itensDaPagina(c, pg) {
  return listaItens(c).filter((o) => {
    if (ehFundo(o) || o.id === pg.id) return false;
    const mx = o.x + o.w / 2, my = o.y + o.h / 2;
    return mx >= pg.x && mx <= pg.x + pg.w && my >= pg.y && my <= pg.y + pg.h;
  });
}

/** Páginas na ordem de leitura (de cima para baixo, da esquerda para a direita). */
export function paginasEmOrdem(c) {
  const lista = listaItens(c).filter((i) => i.tipo === 'pagina');
  return lista.sort((a, b) => (Math.abs(a.y - b.y) > 80 ? a.y - b.y : a.x - b.x) || (a.id < b.id ? -1 : 1));
}

/** O que sai em cada folha do PDF: uma por página, mais uma com o que ficou fora de todas. */
export function folhas(c) {
  const pgs = paginasEmOrdem(c);
  if (!pgs.length) return [];
  const usados = new Set();
  const lista = pgs.map((pg) => {
    const dentro = itensDaPagina(c, pg);
    dentro.forEach((o) => usados.add(o.id));
    const ids = new Set(dentro.map((o) => o.id));
    ids.add(pg.id);
    return { titulo: pg.texto || 'Página', pagina: pg, ids };
  });
  const soltos = listaItens(c).filter((o) => !ehFundo(o) && !usados.has(o.id));
  if (soltos.length) lista.push({ titulo: 'Fora das páginas', pagina: null, ids: new Set(soltos.map((o) => o.id)) });
  return lista;
}

/** Conteúdo só com os itens de uma folha (e as setas entre eles). */
export function recorte(c, ids) {
  const itens = {};
  for (const id of ids) if (c.itens[id]) itens[id] = c.itens[id];
  const setas = {};
  for (const s of listaSetas(c)) if (itens[s.de.id] && itens[s.para.id]) setas[s.id] = s;
  return { ...c, itens, setas };
}

/* ---------- Ordem (frente/trás) ---------- */

export function mudancasFrente(c, ids) {
  let z = maiorZ(c);
  const mud = {};
  for (const id of ids) if (c.itens[id] && !ehFundo(c.itens[id])) mud['itens.' + id] = { ...c.itens[id], z: ++z };
  return mud;
}

export function mudancasTras(c, ids) {
  /* raias continuam sempre atrás de tudo */
  const semRaia = listaItens(c).filter((i) => !ehFundo(i));
  let z = semRaia.reduce((m, it) => Math.min(m, it.z), 0);
  const mud = {};
  for (const id of [...ids].reverse()) if (c.itens[id] && !ehFundo(c.itens[id])) mud['itens.' + id] = { ...c.itens[id], z: --z };
  const raias = listaItens(c).filter((i) => i.tipo === 'raia');
  for (const r of raias) if (r.z >= z) mud['itens.' + r.id] = { ...r, z: z - 1 - raias.indexOf(r) };
  return mud;
}

/* ---------- Localizar e substituir ---------- */

const semAcento = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function localizar(c, texto) {
  const q = semAcento(texto).trim();
  if (!q) return [];
  return porZ(c).filter((it) => semAcento(it.texto).includes(q) || semAcento(it.cod).includes(q) || semAcento(it.nota).includes(q)).map((it) => it.id);
}

export function substituirTudo(c, de, para) {
  if (!de) return { mudancas: {}, total: 0 };
  const rx = new RegExp(de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const mud = {};
  let total = 0;
  for (const it of listaItens(c)) {
    const n = (it.texto.match(rx) || []).length;
    if (n) {
      total += n;
      mud['itens.' + it.id] = { ...it, texto: it.texto.replace(rx, para) };
    }
  }
  for (const s of listaSetas(c)) {
    const n = (String(s.rotulo || '').match(rx) || []).length;
    if (n) {
      total += n;
      mud['setas.' + s.id] = { ...s, rotulo: s.rotulo.replace(rx, para) };
    }
  }
  return { mudancas: mud, total };
}

/** Mudanças relativas ao conteúdo → caminhos do arquivo ("conteudo.itens.x"). */
export const noArquivo = (mud) => Object.fromEntries(Object.entries(mud).map(([k, v]) => ['conteudo.' + k, v]));
