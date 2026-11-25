/* Vértice Docs · Quadro · comentário com respostas (v0.6.55), parte sem tela. A tela fica em comentarioQuadro.jsx.
   Dados no item: nota (texto), notaA (quem escreveu), notaR = [{ a, t, em }] (respostas). O nome de quem responde fica no
   aparelho (mesma chave da Planilha: efcdocs.autor). */
export const autorGuardado = () => { try { return localStorage.getItem('efcdocs.autor') || ''; } catch { return ''; } };
export const guardarAutor = (a) => { try { if (a) localStorage.setItem('efcdocs.autor', a); } catch { /* sem armazenamento */ } };
export const respostasDe = (it) => (Array.isArray(it && it.notaR) ? it.notaR.filter((r) => r && typeof r.t === 'string' && r.t.trim()) : []);
export const dataCurta = (iso) => { const d = new Date(iso); return Number.isNaN(+d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); };

/** Mudanças para pôr uma resposta no comentário do item. */
export function respostaNova(it, texto, autor, agora = new Date()) {
  const t = String(texto || '').trim().slice(0, 1000);
  if (!t) return null;
  return { notaR: [...respostasDe(it), { a: String(autor || '').trim().slice(0, 60), t, em: agora.toISOString() }] };
}
