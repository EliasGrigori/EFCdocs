/* EFCdocs — modelos de quadro da qualidade (v0.3.1).
   Todos genéricos: textos de exemplo, sem nome de pessoa, setor ou dado da empresa.
   Cada modelo é uma lista de itens e de setas; aplicarModelo() gera as mudanças com os códigos Q em ordem. */

import { novoItem, novaSeta, listaItens, ehFundo, TIPOS_ITEM } from './modelo.js';
import { limitesDoQuadro } from './desenho.js';

const I = (k, tipo, x, y, w, h, texto, extra = {}) => ({ k, tipo, x, y, w, h, texto, ...extra });
const S = (de, para, rotulo = '', extra = {}) => ({ de, para, rotulo, ...extra });

/* ---- Fluxograma de RNC (registro de não conformidade) ---- */
function fluxoRnc() {
  return {
    itens: [
      I('a', 'inicio', 20, 0, 160, 62, 'NC identificada', { cor: 'laranja' }),
      I('b', 'processo', 10, 120, 180, 70, 'Registrar a RNC', { cor: 'lilas' }),
      I('c', 'dados', 10, 250, 180, 74, 'Evidências (foto, texto)', { cor: 'verde' }),
      I('d', 'decisao', 25, 390, 150, 110, 'Afeta o produto?', { cor: 'azul' }),
      I('e', 'processo', 290, 408, 180, 74, 'Conter: segregar o lote', { cor: 'lilas' }),
      I('f', 'processo', 10, 580, 180, 74, 'Análise de causa (5 porquês)', { cor: 'lilas' }),
      I('g', 'processo', 290, 580, 180, 74, 'Plano de ação', { cor: 'lilas' }),
      I('h', 'decisao', 560, 562, 150, 110, 'Ação eficaz?', { cor: 'azul' }),
      I('i', 'inicio', 780, 588, 160, 62, 'Encerrar RNC', { cor: 'laranja' }),
    ],
    setas: [
      S('a', 'b'), S('b', 'c'), S('c', 'd'),
      S('d', 'e', 'Sim'), S('d', 'f', 'Não'), S('e', 'f'),
      S('f', 'g'), S('g', 'h'), S('h', 'i', 'Sim'),
      S('h', 'f', 'Não', { ld: 'b', lp: 'b' }),
    ],
  };
}

/* ---- Ishikawa 6M ---- */
function ishikawa() {
  const cats = [
    ['Método', 0, 0, 'azul'], ['Mão de obra', 230, 0, 'verde'], ['Material', 460, 0, 'laranja'],
    ['Máquina', 0, 430, 'lilas'], ['Medição', 230, 430, 'rosa'], ['Meio ambiente', 460, 430, 'cinza'],
  ];
  const itens = [I('ef', 'processo', 780, 200, 210, 90, 'Problema (efeito)', { cor: 'laranja' })];
  const setas = [];
  cats.forEach(([nome, x, y, cor], i) => {
    itens.push(I('c' + i, 'processo', x, y, 170, 56, nome, { cor }));
    const topo = y === 0;
    itens.push(I('p' + i, 'postit', x, topo ? 92 : 300, 170, 100, 'Causa provável', { cor: 'amarelo' }));
    setas.push(S('p' + i, 'c' + i), S('c' + i, 'ef'));
  });
  return { itens, setas };
}

/* ---- 5W2H ---- */
function cincoW() {
  const campos = [
    ['O quê?', 'O que será feito.', 'amarelo'], ['Por quê?', 'O motivo, o objetivo.', 'verde'], ['Onde?', 'O local ou setor.', 'azul'], ['Quando?', 'Prazo e datas.', 'rosa'],
    ['Quem?', 'O responsável.', 'laranja'], ['Como?', 'O método, os passos.', 'lilas'], ['Quanto?', 'Custo ou recurso.', 'cinza'],
  ];
  const itens = [I('t', 'texto', 0, 0, 560, 44, '5W2H · Plano de ação')];
  campos.forEach(([n, d, cor], i) => itens.push(I('q' + i, 'postit', (i % 4) * 190, 64 + Math.floor(i / 4) * 150, 170, 130, n + '\n' + d, { cor })));
  return { itens, setas: [] };
}

/* ---- Matriz GUT (tabela de texto com borda) ---- */
function matrizGut() {
  const col = [['Problema', 280], ['G', 70], ['U', 70], ['T', 70], ['GUT', 80]];
  const itens = [I('t', 'texto', 0, 0, 570, 44, 'Matriz GUT · Gravidade × Urgência × Tendência')];
  let x = 0;
  col.forEach(([nome, w], j) => {
    itens.push(I('h' + j, 'texto', x, 56, w, 38, nome, { borda: true, alinh: 'c' }));
    for (let r = 0; r < 5; r++) itens.push(I(`l${r}c${j}`, 'texto', x, 94 + r * 38, w, 38, '', { borda: true, alinh: j ? 'c' : 'e' }));
    x += w;
  });
  itens.push(I('n', 'texto', 0, 296, 570, 40, 'Notas de 1 a 5. GUT = G × U × T. Resolva primeiro o maior valor.'));
  return { itens, setas: [] };
}

/* ---- PDCA ---- */
function pdca() {
  return {
    itens: [
      I('p', 'processo', 0, 0, 230, 90, 'Planejar (Plan)\nO que, por quê, quem e quando', { cor: 'azul' }),
      I('d', 'processo', 330, 0, 230, 90, 'Fazer (Do)\nExecutar o que foi planejado', { cor: 'verde' }),
      I('c', 'processo', 330, 190, 230, 90, 'Verificar (Check)\nConferir se deu certo', { cor: 'laranja' }),
      I('a', 'processo', 0, 190, 230, 90, 'Agir (Act)\nPadronizar ou corrigir', { cor: 'rosa' }),
    ],
    setas: [S('p', 'd'), S('d', 'c'), S('c', 'a'), S('a', 'p')],
  };
}

/* ---- Kanban ---- */
function kanban(c) {
  const col = (i) => (c.colunas[i] || c.colunas[c.colunas.length - 1] || { id: 'c1' }).id;
  return {
    itens: [
      I('a', 'postit', 0, 0, 170, 130, 'Exemplo: tarefa a fazer', { cor: 'amarelo', col: col(0), g: 4, u: 4, t: 3 }),
      I('b', 'postit', 190, 0, 170, 130, 'Exemplo: tarefa em andamento', { cor: 'azul', col: col(1) }),
      I('c', 'postit', 380, 0, 170, 130, 'Exemplo: tarefa concluída', { cor: 'verde', col: col(2) }),
    ],
    setas: [],
  };
}

/* ---- Mapa mental ---- */
function mapaMental() {
  const sat = [['s1', 345, 40, 'amarelo'], ['s2', 30, 215, 'verde'], ['s3', 660, 215, 'azul'], ['s4', 110, 420, 'rosa'], ['s5', 580, 420, 'laranja']];
  return {
    itens: [
      I('c', 'inicio', 330, 230, 200, 80, 'Tema central', { cor: 'azul' }),
      ...sat.map(([k, x, y, cor], i) => I(k, 'postit', x, y, 170, 110, 'Ideia ' + (i + 1), { cor })),
    ],
    setas: sat.map(([k]) => S('c', k, '', { estilo: 'reta', pontas: 'nenhuma' })),
  };
}

/* ---- Linha do tempo ---- */
function linhaDoTempo() {
  const itens = [];
  const setas = [];
  for (let i = 0; i < 5; i++) {
    itens.push(I('e' + i, 'inicio', i * 220, 0, 150, 62, 'Etapa ' + (i + 1), { cor: 'azul' }));
    itens.push(I('d' + i, 'postit', i * 220, 110, 150, 110, 'Data e detalhe', { cor: 'amarelo' }));
    if (i) setas.push(S('e' + (i - 1), 'e' + i));
  }
  return { itens, setas };
}

export const MODELOS = [
  { id: 'rnc', nome: 'Fluxograma de RNC', descr: 'Do registro da não conformidade ao encerramento, com as decisões.', ic: 'decisao', fazer: fluxoRnc },
  { id: 'ishikawa', nome: 'Ishikawa 6M', descr: 'Causa e efeito: método, mão de obra, material, máquina, medição, meio ambiente.', ic: 'conector', fazer: ishikawa },
  { id: '5w2h', nome: '5W2H', descr: 'Plano de ação em sete perguntas.', ic: 'postit', fazer: cincoW },
  { id: 'gut', nome: 'Matriz GUT', descr: 'Tabela para dar prioridade aos problemas.', ic: 'tabela', fazer: matrizGut },
  { id: 'pdca', nome: 'PDCA', descr: 'Planejar, fazer, verificar e agir, em ciclo.', ic: 'restaurar', fazer: pdca },
  { id: 'kanban', nome: 'Kanban', descr: 'Três post-its de exemplo, um em cada coluna.', ic: 'kanban', fazer: kanban },
  { id: 'mapa', nome: 'Mapa mental', descr: 'Um tema no centro e cinco ideias em volta.', ic: 'mapa', fazer: mapaMental },
  { id: 'tempo', nome: 'Linha do tempo', descr: 'Cinco etapas em sequência, com data e detalhe.', ic: 'temporizador', fazer: linhaDoTempo },
];
export const ModeloPorId = Object.fromEntries(MODELOS.map((m) => [m.id, m]));

/** Onde o modelo entra: no canto de cima se o quadro está vazio; senão, abaixo de tudo o que já existe. */
export function origemDoModelo(c) {
  if (!listaItens(c).length) return { x: 0, y: 0 };
  const lim = limitesDoQuadro(c);
  return { x: Math.round(lim.x), y: Math.round(lim.y + lim.h + 100) };
}

/** Devolve { mudancas, ids, lim } para inserir o modelo; ids são os itens novos (para selecionar). */
export function aplicarModelo(c, id, origem = origemDoModelo(c)) {
  const m = ModeloPorId[id];
  if (!m) throw new Error('modelo desconhecido: ' + id);
  const spec = m.fazer(c);
  const mud = {};
  const chaves = {};
  let atual = c;
  for (const it of spec.itens) {
    const t = TIPOS_ITEM[it.tipo];
    const { k, tipo, x, y, w, h, texto, ...extra } = it;
    const r = novoItem(atual, tipo, { x: Math.round(origem.x + x), y: Math.round(origem.y + y), w, h: h ?? t.h, texto, ...extra });
    chaves[k] = r.item.id;
    Object.assign(mud, r.mudancas);
    atual = { ...atual, seq: r.mudancas.seq ?? atual.seq, itens: { ...atual.itens, [r.item.id]: r.item } };
  }
  for (const s of spec.setas) {
    const { de, para, rotulo, ld, lp, ...resto } = s;
    const campos = { rotulo, ...resto };
    if (ld) campos.de = { id: chaves[de], lado: ld };
    if (lp) campos.para = { id: chaves[para], lado: lp };
    const r = novaSeta(atual, chaves[de], chaves[para], campos);
    Object.assign(mud, r.mudancas);
  }
  const novos = Object.values(chaves);
  const itensNovos = novos.map((nid) => ({ ...(atual.itens[nid]) }));
  const x1 = Math.min(...itensNovos.map((i) => i.x)), y1 = Math.min(...itensNovos.map((i) => i.y));
  const x2 = Math.max(...itensNovos.map((i) => i.x + i.w)), y2 = Math.max(...itensNovos.map((i) => i.y + i.h));
  return { mudancas: mud, ids: novos.filter((nid) => !ehFundo(atual.itens[nid])), lim: { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } };
}
