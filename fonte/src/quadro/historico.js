/* Vértice Docs · Quadro · R44 parte 2 (v0.6.69, aprovada em 26/11 03:19): histórico de quem fez cada atualização do cartão.
   - Só nos arquivos que estão em Documentos internos (o mesmo "rastrear" da parte 1) e só nos cartões do Kanban
     (post-its e, com o fluxo ligado, as atividades).
   - Fica no próprio item: it.hist = [{ q: quem, em: data ISO, o: o que mudou, de?, para? }], do mais antigo ao mais novo,
     guardando os últimos MAX_HIST. A coluna guarda o nome que ela tinha na hora (a coluna pode ser renomeada depois).
   - A mesma pessoa mexendo no mesmo campo em menos de JUNTAR_MS vira uma linha só (digitar o texto não enche a lista).
   - Copiar e colar não leva o histórico: a cópia começa com "criou o cartão" (se o arquivo for rastreado).
   - Desfazer e refazer devolvem o item inteiro, com o histórico de antes.
   Parte sem tela (testada no node); a tela fica na gaveta do cartão (comentariosKanban.jsx). */
import { noKanban, historicoValido, MAX_HIST } from './modelo.js';
export { historicoValido, MAX_HIST };
import { dataCurta } from './comentario.js';
import { registrarAndamento, colunaEfetiva } from './fluxoKanban.js';
import { valorGut, prazoBR } from './tarefa.js';
import { tituloDe } from './postit.js';

export const JUNTAR_MS = 2 * 60 * 1000;
const curto = (v, n = 80) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

const nomeColuna = (c, it) => { const id = colunaEfetiva(c, it); const k = c.colunas.find((x) => x.id === id); return k ? k.nome : ''; };
const nomeEtiqueta = (c, fr) => { const e = (c.etiquetas || []).find((x) => x.id === fr); return e ? e.nome : ''; };
const mesmaGut = (a, b) => ['g', 'u', 't'].every((k) => (a[k] || 0) === (b[k] || 0)) || valorGut(a) === valorGut(b) && !valorGut(a);

/** O que mudou entre o item velho e o novo, como linhas de histórico (sem quem e quando). */
export function diferencas(c, velho, novo, etiquetasNovas) {
  if (etiquetasNovas) c = { ...c, etiquetas: etiquetasNovas }; /* "Nova etiqueta › Criar e pôr" manda a lista nova junto */
  const out = [];
  if (c.colunas.length && colunaEfetiva(c, velho) !== colunaEfetiva(c, novo)) out.push({ o: 'col', de: nomeColuna(c, velho), para: nomeColuna(c, novo) });
  /* texto e título: só que mudou, sem guardar o conteúdo (o que alguém apagou do cartão não fica guardado no histórico) */
  if ((velho.texto || '') !== (novo.texto || '')) out.push({ o: 'texto', para: novo.texto && novo.texto.trim() ? 'sim' : '' });
  if (tituloDe(velho) !== tituloDe(novo)) out.push({ o: 'tit', para: tituloDe(novo) ? 'sim' : '' });
  if ((velho.resp || '') !== (novo.resp || '')) out.push({ o: 'resp', para: curto(novo.resp, 60) });
  if ((velho.prazo || '') !== (novo.prazo || '')) out.push({ o: 'prazo', para: novo.prazo || '' });
  if (!mesmaGut(velho, novo)) out.push({ o: 'gut', para: String(valorGut(novo) || '') });
  if ((velho.fr || '') !== (novo.fr || '')) out.push({ o: 'fr', para: nomeEtiqueta(c, novo.fr) || (novo.fr ? '?' : '') });
  if (!!velho.trava !== !!novo.trava) out.push({ o: 'trava', para: novo.trava ? 'sim' : '' });
  return out;
}

/** Acrescenta ao histórico a linha nova, juntando com a última se for a mesma pessoa e o mesmo campo, há pouco tempo. */
export function comLinha(hist, linha) {
  const h = Array.isArray(hist) ? hist.slice() : [];
  const ult = h[h.length - 1];
  const dt = ult ? Date.parse(linha.em) - Date.parse(ult.em) : -1;
  const perto = ult && ult.q === linha.q && dt >= 0 && dt < JUNTAR_MS; /* relógio de outro aparelho atrasado não junta */
  if (perto && ult.o === 'criou' && (linha.o === 'texto' || linha.o === 'tit')) return h.slice(-MAX_HIST); /* escrever logo depois de criar faz parte de criar */
  if (perto && ult.o === linha.o && linha.o !== 'criou') {
    const junta = { ...linha };
    if ('de' in ult) junta.de = ult.de;
    if (linha.o === 'col' && junta.de === junta.para) { h.pop(); return h; } /* foi e voltou: some */
    h[h.length - 1] = junta;
  } else h.push(linha);
  return h.slice(-MAX_HIST);
}

/** Grava no histórico o que cada cartão mudou. rastrear = o arquivo está em Documentos internos. */
export function registrarHistorico(c, mud, { rastrear, quem, agora = new Date() } = {}) {
  if (!mud || !c || !c.itens) return mud;
  const c2 = { ...c, fluxoKanban: 'fluxoKanban' in mud ? mud.fluxoKanban === true : c.fluxoKanban };
  const base = { q: curto(quem, 60), em: agora.toISOString() };
  let saida = mud;
  for (const [k, novo] of Object.entries(mud)) {
    if (!k.startsWith('itens.') || !novo || typeof novo !== 'object') continue;
    const velho = c.itens[k.slice(6)];
    if (!velho) { /* criado ou colado: começa sem o histórico do original */
      if (!('hist' in novo) && !(rastrear && noKanban(c2, novo))) continue;
      const n = { ...novo }; delete n.hist;
      if (rastrear && noKanban(c2, novo)) n.hist = [{ ...base, o: 'criou' }];
      saida = { ...saida, [k]: n };
      continue;
    }
    if (!rastrear || !noKanban(c2, novo)) continue;
    const dif = diferencas(c, velho, novo, Array.isArray(mud.etiquetas) ? mud.etiquetas : null);
    if (!dif.length) continue;
    let h = novo.hist;
    for (const d of dif) h = comLinha(h, { ...base, ...d });
    saida = { ...saida, [k]: { ...novo, hist: h } };
  }
  return saida;
}

/** Quem iniciou e quem concluiu (parte 1) e o histórico (parte 2), na ordem certa. É o que o aplicarQ do Quadro chama. */
export const registrarTudo = (c, mud, op) => registrarHistorico(c, registrarAndamento(c, mud, op), op);

/** Uma linha do histórico em português: { quem, texto, quando }. */
export function textoDaLinha(l) {
  const p = l.para || '';
  const t = {
    criou: 'criou o cartão',
    col: 'moveu de “' + (l.de || '?') + '” para “' + (p || '?') + '”',
    texto: !p ? 'apagou o texto' : p === 'sim' ? 'mudou o texto' : 'mudou o texto para “' + p + '”',
    tit: !p ? 'tirou o título' : p === 'sim' ? 'mudou o título' : 'mudou o título para “' + p + '”',
    resp: p ? 'passou para ' + p : 'tirou o responsável',
    prazo: p ? 'pôs o prazo ' + prazoBR(p) : 'tirou o prazo',
    gut: p ? 'mudou a GUT para ' + p : 'tirou a GUT',
    fr: p === '?' ? 'mudou a etiqueta' : p ? 'pôs a etiqueta ' + p : 'tirou a etiqueta',
    trava: p ? 'travou o cartão' : 'destravou o cartão',
  }[l.o] || 'mudou';
  return { quem: l.q || 'Alguém', texto: t, quando: dataCurta(l.em) };
}

/** O histórico do item, do mais novo para o mais antigo, já em texto. */
export const linhasHistorico = (it) => (historicoValido(it && it.hist) || []).slice().reverse().map(textoDaLinha);
