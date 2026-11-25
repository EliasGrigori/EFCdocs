/* Vértice Docs · Quadro · janela do título do post-it (v0.6.51). As regras ficam em postit.js. */
import { useState } from 'react';
import { Janela } from '../ui/comum.jsx';
import { TITULO_MAX, limparTitulo, tituloDe } from './postit.js';

/** Título do post-it: escrever e Aplicar (Enter); "Sem título" tira; Esc ou Cancelar fecha sem mudar. */
export function JanelaTitulo({ it, aoAplicar, aoFechar }) {
  const [valor, setValor] = useState(() => tituloDe(it));
  const aplicar = (v) => { aoAplicar(limparTitulo(v)); aoFechar(); };
  return (
    <Janela titulo="Título do post-it" icone="titulo" subtitulo={it.cod ? `Post-it ${it.cod}` : 'Post-it'} aoFechar={aoFechar} classe="qd-jtitulo"
      rodape={<>
        {tituloDe(it) && <button type="button" className="btn sm" data-titulo-tirar onClick={() => aplicar('')}>Sem título</button>}
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-titulo-aplicar onClick={() => aplicar(valor)}>Aplicar</button>
      </>}>
      <section className="rg-cartao">
        <span className="rg-cab">Título</span>
        <input type="text" className="qd-jtitulo-campo" data-foco data-titulo-campo value={valor} maxLength={TITULO_MAX} placeholder="Ex.: Conferir calibração"
          aria-label="Título do post-it" onChange={(ev) => setValor(ev.target.value)}
          onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); aplicar(valor); } }} />
        <p className="qd-dica">Fica em negrito, acima do texto, com um fio embaixo. No Kanban, aparece no cartão.</p>
      </section>
    </Janela>
  );
}
