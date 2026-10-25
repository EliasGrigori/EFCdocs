/* EFCdocs — legenda do quadro (v0.3.1).
   A legenda mostra só as formas que o quadro realmente usa e se atualiza sozinha.
   O texto de cada linha pode ser trocado (guardado em item.rot[tipo] = { n: nome, d: descrição }). */

import { listaItens, listaSetas } from './modelo.js';

export const LEGENDA_PADRAO = {
  inicio: ['Início/Fim', 'Onde o processo começa ou termina.'],
  processo: ['Atividade', 'Uma etapa ou ação do processo.'],
  decisao: ['Decisão', 'Pergunta com duas saídas (Sim e Não).'],
  dados: ['Entrada/Saída', 'Dado, registro ou documento que entra ou sai.'],
  postit: ['Post-it', 'Tarefa com responsável, prazo e situação.'],
  seta: ['Seta', 'Liga uma etapa à seguinte.'],
};
export const ORDEM_LEGENDA = ['inicio', 'processo', 'decisao', 'dados', 'postit', 'seta'];

export const MEDIDAS = { topo: 40, linha: 38, base: 10 };

/** Linhas que a legenda mostra agora: [{ tipo, nome, descr }]. */
export function linhasLegenda(c, leg) {
  const usados = new Set();
  for (const it of listaItens(c)) usados.add(it.tipo);
  if (listaSetas(c).length) usados.add('seta');
  const rot = (leg && leg.rot) || {};
  return ORDEM_LEGENDA.filter((t) => usados.has(t)).map((tipo) => {
    const [n, d] = LEGENDA_PADRAO[tipo];
    const mudou = rot[tipo] || {};
    return { tipo, nome: mudou.n || n, descr: mudou.d || d };
  });
}

export const alturaLegenda = (c, leg) => MEDIDAS.topo + Math.max(1, linhasLegenda(c, leg).length) * MEDIDAS.linha + MEDIDAS.base;

/** Conteúdo para desenhar: cada legenda ganha a altura e as linhas calculadas com o quadro inteiro.
    Isso nunca é gravado: o arquivo guarda só o que a pessoa mudou (item.rot). */
export function derivar(c) {
  let mudou = false;
  const itens = {};
  for (const it of listaItens(c)) {
    if (it.tipo === 'legenda' && !it.linhas) {
      const linhas = linhasLegenda(c, it);
      itens[it.id] = { ...it, linhas, h: MEDIDAS.topo + Math.max(1, linhas.length) * MEDIDAS.linha + MEDIDAS.base };
      mudou = true;
    } else itens[it.id] = it;
  }
  return mudou ? { ...c, itens } : c;
}

/** Troca o nome ou a descrição de uma linha da legenda. Texto vazio volta ao padrão. */
export function mudancasLegenda(c, id, tipo, campo, valor) {
  const it = c.itens[id];
  if (!it || it.tipo !== 'legenda' || !LEGENDA_PADRAO[tipo] || (campo !== 'n' && campo !== 'd')) return {};
  const texto = String(valor ?? '').trim().slice(0, campo === 'n' ? 30 : 90);
  const rot = { ...(it.rot || {}) };
  const linha = { ...(rot[tipo] || {}) };
  if (texto && texto !== LEGENDA_PADRAO[tipo][campo === 'n' ? 0 : 1]) linha[campo] = texto; else delete linha[campo];
  if (Object.keys(linha).length) rot[tipo] = linha; else delete rot[tipo];
  const novo = { ...it };
  if (Object.keys(rot).length) novo.rot = rot; else delete novo.rot;
  return JSON.stringify(novo) === JSON.stringify(it) ? {} : { ['itens.' + id]: novo };
}
