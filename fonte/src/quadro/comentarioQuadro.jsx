/* Vértice Docs · Quadro · comentário no estilo do Word (v0.6.55; pedido do Elias em 25/11).
   - O item com comentário ganha um marcador (balãozinho) no canto de cima, por fora, como o do Word.
   - Passar o mouse (ou tocar) no marcador abre o cartão do comentário: quem escreveu, o texto e as respostas de outras
     pessoas (observações de terceiros), com o campo para responder. Clicar no marcador deixa o cartão aberto.
   - Dados no item: nota (texto, como antes), notaA (quem escreveu), notaR = [{ a, t, em }] (respostas).
   - O nome de quem responde fica no aparelho (mesma chave da Planilha: efcdocs.autor). */
import { useEffect, useRef, useState } from 'react';
import { Icone, usarEsc } from '../ui/comum.jsx';

import { autorGuardado, guardarAutor, respostasDe, dataCurta } from './comentario.js';
export { respostaNova, respostasDe, autorGuardado } from './comentario.js';

/** Marcador do comentário (fica dentro do ItemView, no canto de cima por fora). */
export function MarcadorComentario({ it, aoAbrir, aoSair }) {
  const n = respostasDe(it).length;
  return (
    <button type="button" className="qi-com" data-com-marcador={it.id} aria-label={`Comentário${n ? ` e ${n} resposta${n > 1 ? 's' : ''}` : ''}: ${it.nota}`}
      onPointerDown={(ev) => ev.stopPropagation()} onDoubleClick={(ev) => ev.stopPropagation()}
      onMouseEnter={(ev) => aoAbrir && aoAbrir(it.id, ev.currentTarget.getBoundingClientRect(), false)} onMouseLeave={() => aoSair && aoSair()}
      onClick={(ev) => { ev.stopPropagation(); if (aoAbrir) aoAbrir(it.id, ev.currentTarget.getBoundingClientRect(), true); }}>
      <Icone n="comentario" />{n > 0 && <span className="qi-com-n">{n}</span>}
    </button>
  );
}

/** Cartão do comentário, por cima do quadro (no tamanho normal da tela, sem zoom). */
export function CartaoComentario({ it, ret, fixo, somenteLeitura, aoResponder, aoEditar, aoExcluir, aoFechar, aoEntrar, aoSair }) {
  const [txt, setTxt] = useState('');
  const [autor, setAutor] = useState(autorGuardado);
  const ref = useRef(null);
  usarEsc(aoFechar, true, ref);
  const [pos, setPos] = useState({ left: ret.right + 8, top: ret.top - 6 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    const left = ret.right + 8 + r.width > W - 8 ? Math.max(8, ret.left - r.width - 8) : ret.right + 8;
    const top = Math.max(8, Math.min(ret.top - 6, H - r.height - 8));
    setPos({ left, top });
  }, [ret.left, ret.top, ret.right]);
  const resps = respostasDe(it);
  const responder = () => { if (!txt.trim()) return; guardarAutor(autor.trim()); aoResponder(txt, autor); setTxt(''); };
  return (
    <div className={'qd-com-cartao' + (fixo ? ' fixo' : '')} ref={ref} role="dialog" aria-label={'Comentário de ' + (it.cod || 'item')} data-com-cartao={it.id} style={pos}
      onMouseEnter={aoEntrar} onMouseLeave={aoSair} onPointerDown={(ev) => ev.stopPropagation()}>
      <div className="qd-com-cab">
        <span className="qd-com-ic" aria-hidden="true"><Icone n="comentario" /></span>
        <b>{it.notaA || 'Comentário'}</b>{it.cod && <small>{it.cod}</small>}
        <span style={{ flex: 1 }} />
        {!somenteLeitura && <button type="button" className="iconbtn" title="Mudar o comentário" aria-label="Mudar o comentário" data-com-editar onClick={aoEditar}><Icone n="renomear" /></button>}
        {!somenteLeitura && <button type="button" className="iconbtn perigo" title="Excluir o comentário e as respostas" aria-label="Excluir o comentário" data-com-excluir onClick={aoExcluir}><Icone n="lixeira" /></button>}
      </div>
      <p className="qd-com-texto">{it.nota}</p>
      {resps.length > 0 && (
        <ol className="qd-com-resps" aria-label="Respostas">
          {resps.map((r, i) => (
            <li key={i}><span className="qd-com-quem"><b>{r.a || 'Sem nome'}</b>{r.em && <small>{dataCurta(r.em)}</small>}</span><span>{r.t}</span></li>
          ))}
        </ol>
      )}
      {!somenteLeitura && (
        <div className="qd-com-resp">
          {!autorGuardado() && <input className="qd-com-campo" value={autor} maxLength={60} placeholder="Seu nome" aria-label="Seu nome (aparece na resposta)" data-com-autor onChange={(ev) => setAutor(ev.target.value)} />}
          <div className="qd-com-linha">
            <input className="qd-com-campo" value={txt} maxLength={1000} placeholder="Responder…" aria-label="Responder" data-com-responder
              onChange={(ev) => setTxt(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); responder(); } }} />
            <button type="button" className="btn sm primary" data-com-enviar disabled={!txt.trim()} onClick={responder}>Responder</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Janela para escrever ou mudar o comentário do item (a mesma de antes), guardando quem escreveu. */
export function pedirComentarioDo(cx, it, nomeTipo, aoSalvar) {
  cx.perguntar({ titulo: 'Comentário · ' + (it.cod || nomeTipo), campo: 'Comentário (aparece no balãozinho do item e no painel)', varias: true, valor: it.nota || '', confirmar: 'Salvar comentário', max: 1000,
    aoConfirmar: (v) => { const t = v.trim(); aoSalvar(t ? { nota: t, notaA: it.notaA || autorGuardado() || undefined } : { nota: undefined, notaA: undefined, notaR: undefined }, t ? 'Comentário' : 'Tirar comentário'); } });
}
