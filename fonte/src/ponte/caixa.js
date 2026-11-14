/* Vértice Docs — a caixa de troca com o EFCwork no aparelho (contrato/efd-ponte.js, o mesmo arquivo do EFCwork).
   Só funciona no mesmo aparelho e no mesmo navegador (os dois apps moram em eliasgrigori.github.io). */
import Ponte from '../../contrato/efd-ponte.js';
import { ler, gravar } from '../nucleo/armazem.js';

export const temCaixa = () => typeof indexedDB !== 'undefined';
export const lerEstado = () => ler('ponte', {}) || {};
export function marcarEstado(id, e) { const m = { ...lerEstado() }; if (e) m[id] = e; else delete m[id]; gravar('ponte', m); return m; }

/** Põe o documento na caixa para o EFCwork; devolve o pid. */
export async function porNaCaixa(envio) {
  return Ponte.por({ de: 'docs', para: 'efcwork', tipo: 'documento', ficha: envio.ficha, pdf: envio.pdf, ...(envio.original ? { original: envio.original, nomeArquivo: envio.nomeArquivo } : {}) });
}
/** O EFCwork apaga da caixa depois de gravar na nuvem: item que sumiu = recebido. Atualiza e devolve o mapa. */
export async function conferirRecebidos() {
  const m = lerEstado();
  let mudou = false;
  for (const [id, e] of Object.entries(m)) {
    if (e.estado !== 'caixa' || !e.pid) continue;
    try { if (!(await Ponte.pegar(e.pid))) { m[id] = { ...e, estado: 'recebido' }; mudou = true; } } catch { /* sem caixa */ }
  }
  if (mudou) gravar('ponte', m);
  return m;
}
export const esperandoAqui = () => Ponte.esperando('docs');
export const pegar = (pid) => Ponte.pegar(pid);
export const apagar = (pid) => Ponte.apagar(pid);
export const ouvir = (fn) => Ponte.ouvir('docs', fn);
/** v0.6.17 (Ponte 2): a resposta de um pedido de impressão ({ pedido: pid, ok, erro, paginas }). */
export const responder = (item, { ok, erro, paginas = 0 }) => Ponte.por({ de: 'docs', para: item.de, tipo: 'resposta', pedido: item.pid, ok: !!ok, ...(erro ? { erro } : {}), paginas });
