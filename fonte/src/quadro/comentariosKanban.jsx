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
import { linhasHistorico } from './historico.js'; /* v0.6.69 (R44 parte 2) */

export const totalComentarios = (it) => (it && it.nota ? 1 : 0) + respostasDe(it).length;

export function GavetaComentarios({ c, id, ids, abrir, fechar, aplicarQ, somenteLeitura, pedido }) {
  const it = c.itens[id];
  const [txt, setTxt] = useState('');
  const [autor, setAutor] = useState(autorGuardado);
  const [aba, setAba] = useState('com'); /* v0.6.69: Comentários | Histórico (a aba fica ao passar de um cartão pelas setas) */
  useEffect(() => { setAba('com'); }, [pedido]); /* o balão do cartão abre sempre em Comentários */
  const ref = useRef(null), lista = useRef(null);
  useEffect(() => {
    const esc = (ev) => { if (ev.key === 'Escape' && !ev.defaultPrevented) { ev.preventDefault(); ev.stopPropagation(); fechar(); } };
    window.addEventListener('keydown', esc, true);
    return () => window.removeEventListener('keydown', esc, true);
  }, [fechar]);
  useEffect(() => { setTxt(''); if (ref.current) { const t = ref.current.querySelector('textarea'); if (t) t.focus({ preventScroll: true }); } }, [id]);
  useEffect(() => { if (lista.current) lista.current.scrollTop = lista.current.scrollHeight; }, [id, aba, it && it.nota, it && respostasDe(it).length]);
  if (!it) return null;
  const resps = respostasDe(it);
  const hist = linhasHistorico(it);
  const enviar = (ev) => {
    if (ev) ev.preventDefault();
    const t = txt.trim(); if (!t) return;
    const a = autor.trim(); guardarAutor(a);
    if (!it.nota) aplicarQ(mudancasCampo(c, [id], { nota: t.slice(0, 1000), notaA: a || undefined }), 'Comentário', 'formatou');
    else { const m = respostaNova(it, t, a); if (m) aplicarQ(mudancasCampo(c, [id], m), 'Responder comentário', 'formatou'); }
    setTxt('');
  };
  return (
    <aside className="kb-gaveta efl-gaveta" ref={ref} aria-label={(aba === 'hist' ? 'Histórico de ' : 'Comentários de ') + (it.cod || 'post-it')} data-kb-gaveta={id} onPointerDown={(ev) => ev.stopPropagation()}>
      <CabGaveta sub={(aba === 'hist' ? 'Histórico' : 'Comentários') + (it.cod ? ' · ' + it.cod : '')} titulo={it.texto.split('\n')[0] || 'Post-it'} fechar={fechar} rotuloFechar="Fechar os comentários" nav={{ ids, atual: id, abrir }} />
      <div className="kb-gv-abas" role="tablist" aria-label="Comentários ou histórico">
        {[['com', 'Comentários', totalComentarios(it)], ['hist', 'Histórico', hist.length]].map(([k, nome, n]) => (
          <button key={k} type="button" role="tab" id={'kb-aba-' + k} aria-controls={'kb-painel-' + k} aria-selected={aba === k} tabIndex={aba === k ? 0 : -1}
            onKeyDown={(ev) => { if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); const n = k === 'com' ? 'hist' : 'com'; setAba(n); const b = ev.currentTarget.parentNode.querySelector('#kb-aba-' + n); if (b) b.focus(); } }} className={'kb-gv-aba' + (aba === k ? ' on' : '')} data-kb-aba={k} onClick={() => setAba(k)}>{nome}{n > 0 && <span className="kb-gv-n">{n}</span>}</button>
        ))}
      </div>
      {aba === 'hist' && (
        <div className="kb-gv-msgs kb-gv-hist gv-corpo" role="tabpanel" id="kb-painel-hist" aria-labelledby="kb-aba-hist" tabIndex={0} data-kb-historico>
          {!hist.length && <p className="kb-gv-vazio">Nenhuma mudança registrada. O histórico conta só nos Documentos internos.</p>}
          {hist.map((l, i) => <div key={i} className="kb-gv-ev"><b>{l.quem}</b> {l.texto}<small>{l.quando}</small></div>)}
        </div>
      )}
      {aba === 'com' && <>
      <div className="kb-gv-msgs gv-corpo" ref={lista} role="tabpanel" id="kb-painel-com" aria-labelledby="kb-aba-com" tabIndex={0}>
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
      </>}
    </aside>
  );
}
