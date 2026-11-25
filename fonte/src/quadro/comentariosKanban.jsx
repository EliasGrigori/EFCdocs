/* Vértice Docs v0.6.67 (N2 do estudo do Kanban, aprovado em 25/11): comentários pelo número no cartão, numa gaveta ao lado.
   - O número de comentários fica no rodapé do cartão; um toque abre a gaveta com o histórico (o comentário e as respostas que
     já existem desde a v0.6.55: nota, notaA, notaR) e o campo para responder, sem tirar a pessoa do quadro.
   - Cartão sem comentário: o balãozinho aparece ao passar o mouse (no celular, sempre) e a gaveta abre para escrever o primeiro.
   - A gaveta segue a regra R8 da família: setas (e Alt + seta) para o cartão anterior e o próximo, o X por último, Esc fecha.
   - Nada muda no arquivo salvo: os comentários antigos aparecem do mesmo jeito. */
import { useEffect, useRef, useState } from 'react';
import { CabGaveta } from '../ui/gaveta.jsx';
import { autorGuardado, guardarAutor, respostasDe, dataCurta, respostaNova } from './comentario.js';
import { mudancasCampo } from './modelo.js';

export const totalComentarios = (it) => (it && it.nota ? 1 : 0) + respostasDe(it).length;

export function GavetaComentarios({ c, id, ids, abrir, fechar, aplicarQ, somenteLeitura }) {
  const it = c.itens[id];
  const [txt, setTxt] = useState('');
  const [autor, setAutor] = useState(autorGuardado);
  const ref = useRef(null), lista = useRef(null);
  useEffect(() => {
    const esc = (ev) => { if (ev.key === 'Escape' && !ev.defaultPrevented) { ev.preventDefault(); ev.stopPropagation(); fechar(); } };
    window.addEventListener('keydown', esc, true);
    return () => window.removeEventListener('keydown', esc, true);
  }, [fechar]);
  useEffect(() => { setTxt(''); if (ref.current) { const t = ref.current.querySelector('textarea'); if (t) t.focus({ preventScroll: true }); } }, [id]);
  useEffect(() => { if (lista.current) lista.current.scrollTop = lista.current.scrollHeight; }, [id, it && it.nota, it && respostasDe(it).length]);
  if (!it) return null;
  const resps = respostasDe(it);
  const enviar = (ev) => {
    if (ev) ev.preventDefault();
    const t = txt.trim(); if (!t) return;
    const a = autor.trim(); guardarAutor(a);
    if (!it.nota) aplicarQ(mudancasCampo(c, [id], { nota: t.slice(0, 1000), notaA: a || undefined }), 'Comentário', 'formatou');
    else { const m = respostaNova(it, t, a); if (m) aplicarQ(mudancasCampo(c, [id], m), 'Responder comentário', 'formatou'); }
    setTxt('');
  };
  return (
    <aside className="kb-gaveta efl-gaveta" ref={ref} aria-label={'Comentários de ' + (it.cod || 'post-it')} data-kb-gaveta={id} onPointerDown={(ev) => ev.stopPropagation()}>
      <CabGaveta sub={'Comentários' + (it.cod ? ' · ' + it.cod : '')} titulo={it.texto.split('\n')[0] || 'Post-it'} fechar={fechar} rotuloFechar="Fechar os comentários" nav={{ ids, atual: id, abrir }} />
      <div className="kb-gv-msgs gv-corpo" ref={lista}>
        {!it.nota && <p className="kb-gv-vazio">Nenhum comentário ainda.</p>}
        {it.nota && <div className="kb-gv-msg"><b>{it.notaA || 'Comentário'}</b><p>{it.nota}</p></div>}
        {resps.map((r, i) => <div key={i} className="kb-gv-msg"><b>{r.a || 'Sem nome'}</b>{r.em && <small>{dataCurta(r.em)}</small>}<p>{r.t}</p></div>)}
      </div>
      {!somenteLeitura && (
        <form className="kb-gv-form" onSubmit={enviar}>
          <input className="kb-gv-autor" value={autor} maxLength={60} placeholder="Seu nome" aria-label="Seu nome" onChange={(ev) => setAutor(ev.target.value)} />
          <span className="kb-gv-linha">
            <textarea rows={2} value={txt} maxLength={1000} placeholder={it.nota ? 'Escrever uma resposta' : 'Escrever um comentário'} aria-label={it.nota ? 'Resposta' : 'Comentário'}
              onChange={(ev) => setTxt(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) enviar(ev); }} />
            <button type="submit" className="btn primary" disabled={!txt.trim()}>Enviar</button>
          </span>
        </form>
      )}
    </aside>
  );
}
