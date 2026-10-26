/* EFCdocs — lê o .xlsx num "trabalhador" (outra linha de execução): a tela não trava com arquivo grande. */
import { lerXlsx } from './ler.js';

self.onmessage = async (ev) => {
  const { bytes, nome } = ev.data || {};
  try {
    let ultimo = 0;
    const r = await lerXlsx(new Uint8Array(bytes), {
      nomeArquivo: nome,
      aoProgresso: (p) => { const t = Date.now(); if (p.fase !== 'aba' || t - ultimo > 120) { ultimo = t; self.postMessage({ tipo: 'progresso', p }); } },
    });
    self.postMessage({ tipo: 'pronto', conteudo: r.conteudo, relatorio: r.relatorio });
  } catch (e) {
    self.postMessage({ tipo: 'erro', msg: (e && e.message) || String(e) });
  }
};
