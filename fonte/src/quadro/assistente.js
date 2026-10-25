/* EFCdocs — Assistente do quadro (v0.3.1): revisa o fluxograma e as tarefas como um auditor.
   Só olha; não muda nada. Cada problema leva até o item. */

import { listaItens, listaSetas, FORMAS } from './modelo.js';
import { ehTarefa, vencida, prazoBR } from './tarefa.js';

const nomeDe = (it) => it.cod || it.texto || 'item';

/** Lista de problemas: [{ id, nivel: 'erro' | 'aviso', item, texto }]. Erros primeiro. */
export function problemas(c, hoje) {
  const lista = [];
  const add = (regra, it, nivel, texto) => lista.push({ id: regra + ':' + (it ? it.id : 'quadro'), nivel, item: it ? it.id : null, texto, ordem: it ? (it.cod || '~') : '~' });
  const setas = listaSetas(c);
  const saem = (id) => setas.filter((s) => s.de.id === id);
  const chegam = (id) => setas.filter((s) => s.para.id === id);
  const formas = listaItens(c).filter((i) => FORMAS.includes(i.tipo));

  /* decisão precisa de duas saídas, cada uma dizendo qual é (Sim, Não...) */
  for (const d of formas.filter((i) => i.tipo === 'decisao')) {
    const s = saem(d.id);
    if (s.length < 2) add('decisao-saidas', d, 'erro', `A decisão ${nomeDe(d)} tem ${s.length === 0 ? 'nenhuma saída' : 'só uma saída'}. Ela precisa de pelo menos duas (Sim e Não).`);
    else if (s.some((x) => !String(x.rotulo || '').trim())) add('decisao-rotulo', d, 'aviso', `Escreva Sim, Não (ou outro texto) em cada saída da decisão ${nomeDe(d)}.`);
  }

  /* passo solto (só faz sentido com mais de uma forma no quadro) */
  if (formas.length >= 2) {
    const temInicio = formas.some((i) => i.tipo === 'inicio');
    for (const f of formas) {
      const s = saem(f.id).length, e = chegam(f.id).length;
      if (!s && !e) add('solto', f, 'aviso', `${nomeDe(f)} está solto: nenhuma seta chega nele nem sai dele.`);
      else if (temInicio && f.tipo !== 'inicio' && !e) add('sem-entrada', f, 'aviso', `Nada chega em ${nomeDe(f)}. Ligue o passo anterior com uma seta.`);
    }
  }

  /* o fluxo precisa de começo e de fim */
  if (formas.length >= 3) {
    const inicios = formas.filter((i) => i.tipo === 'inicio');
    if (!inicios.length) add('inicio-fim', null, 'aviso', 'O fluxo não tem Início nem Fim. Use a forma Início/Fim.');
    else {
      if (!inicios.some((i) => !chegam(i.id).length && saem(i.id).length)) add('sem-inicio', null, 'aviso', 'Falta o Início do fluxo: uma forma Início/Fim sem seta chegando e com seta saindo.');
      if (!inicios.some((i) => chegam(i.id).length && !saem(i.id).length)) add('sem-fim', null, 'aviso', 'Falta o Fim do fluxo: uma forma Início/Fim com seta chegando e sem seta saindo.');
    }
  }

  /* tarefas: responsável e prazo */
  for (const p of listaItens(c).filter(ehTarefa)) {
    if (!p.resp) add('sem-resp', p, 'aviso', `${nomeDe(p)} tem prazo ou nota GUT, mas falta o responsável.`);
    if (vencida(c, p, hoje)) add('vencida', p, 'erro', `${nomeDe(p)} está com o prazo vencido (${prazoBR(p.prazo)}).`);
  }

  return lista.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'erro' ? -1 : 1) || a.ordem.localeCompare(b.ordem)).map(({ ordem, ...resto }) => resto);
}
