/* EFCdocs — post-it de tarefa (v0.3.1): responsável, prazo e nota GUT.
   Regras puras. "Hoje" entra como texto AAAA-MM-DD para os testes não dependerem do relógio. */

import { listaItens, porColuna, TIPOS_ITEM } from './modelo.js';

const dois = (n) => String(n).padStart(2, '0');

export function hojeISO(d = new Date()) {
  return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
}

/** Data válida no formato AAAA-MM-DD (rejeita 2026-02-30). */
export function prazoValido(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return false;
  const [a, me, di] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(a, me - 1, di);
  return d.getFullYear() === a && d.getMonth() === me - 1 && d.getDate() === di && a >= 2000 && a <= 2100;
}

export const prazoBR = (iso) => (prazoValido(iso) ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : '');

/* ---------- GUT: Gravidade x Urgência x Tendência, cada uma de 1 a 5 ---------- */

export const NOTA_GUT = [1, 2, 3, 4, 5];
export const NIVEIS_GUT = [
  { id: 'alta', nome: 'Alta', min: 64 },
  { id: 'media', nome: 'Média', min: 27 },
  { id: 'baixa', nome: 'Baixa', min: 1 },
];

const nota = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 0; };

/** G x U x T; 0 enquanto faltar alguma das três notas. */
export const valorGut = (it) => (nota(it.g) && nota(it.u) && nota(it.t) ? nota(it.g) * nota(it.u) * nota(it.t) : 0);

export function nivelGut(valor) {
  const n = NIVEIS_GUT.find((x) => valor >= x.min);
  return n ? n.id : null;
}

/** Post-it que já tem alguma informação de tarefa. */
export const ehTarefa = (it) => !!it && it.tipo === 'postit' && !!(it.resp || it.prazo || nota(it.g) || nota(it.u) || nota(it.t));

/** Tarefa concluída = está na última coluna do Kanban (com pelo menos duas colunas). */
export function concluida(c, it) {
  const ult = c.colunas[c.colunas.length - 1];
  return c.colunas.length > 1 && !!ult && it.col === ult.id;
}

export const vencida = (c, it, hoje) => !!it.prazo && prazoValido(it.prazo) && it.prazo < hoje && !concluida(c, it);

export function nomeDaColuna(c, it) {
  const k = c.colunas.find((x) => x.id === it.col) || c.colunas[0];
  return k ? k.nome : '';
}

/** O que aparece no rodapé do post-it. null se não for tarefa. */
export function resumoTarefa(c, it, hoje) {
  if (!ehTarefa(it)) return null;
  const gut = valorGut(it);
  return {
    resp: it.resp || '',
    prazo: it.prazo ? prazoBR(it.prazo) : '',
    vencida: vencida(c, it, hoje),
    status: nomeDaColuna(c, it),
    concluida: concluida(c, it),
    gut,
    nivel: nivelGut(gut),
  };
}

/** Limpa o valor de um campo de tarefa; devolve undefined para "vazio". */
export function limparCampo(campo, valor) {
  if (campo === 'resp') { const v = String(valor ?? '').trim().slice(0, 60); return v || undefined; }
  if (campo === 'prazo') { const v = String(valor ?? '').trim(); return prazoValido(v) ? v : undefined; }
  if (campo === 'g' || campo === 'u' || campo === 't') return nota(valor) || undefined;
  return undefined;
}

/** Muda campos da tarefa de um post-it. Campo vazio some do item (não fica "vazio guardado"). */
export function mudancasTarefa(c, id, campos) {
  const it = c.itens[id];
  if (!it || it.tipo !== 'postit') return {};
  const novo = { ...it };
  for (const [k, v] of Object.entries(campos)) {
    const limpo = limparCampo(k, v);
    if (limpo === undefined) delete novo[k]; else novo[k] = limpo;
  }
  return JSON.stringify(novo) === JSON.stringify(it) ? {} : { ['itens.' + id]: novo };
}

/** Ordena cada coluna do Kanban pela nota GUT (maior primeiro). Sem nota vai para o fim, na ordem de antes. */
export function mudancasOrdenarGut(c) {
  const mud = {};
  const grupos = porColuna(c);
  for (const lista of Object.values(grupos)) {
    const ordenada = lista.map((it, i) => ({ it, i, g: valorGut(it) })).sort((a, b) => b.g - a.g || a.i - b.i);
    ordenada.forEach(({ it }, j) => {
      const atual = c.itens[it.id];
      if (atual.ko !== j + 1) mud['itens.' + it.id] = { ...atual, ko: j + 1 };
    });
  }
  return mud;
}

/** Quantas tarefas (post-its com dados de tarefa) o quadro tem. */
export const totalTarefas = (c) => listaItens(c).filter(ehTarefa).length;

export const POSTIT_KANBAN = TIPOS_ITEM.postit.kanban;
