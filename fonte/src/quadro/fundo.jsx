/* Vértice Docs · Quadro · janela do fundo (v0.6.50). As regras e o desenho ficam em fundo.js. */
import { useState } from 'react';
import { Janela } from '../ui/comum.jsx';
import { TIPOS_FUNDO, CORES_FUNDO, fundoValido, estiloDoFundo } from './fundo.js';

export { estiloDoFundo, fundoValido } from './fundo.js';
const COR_DO_FUNDO = Object.fromEntries(CORES_FUNDO.map(([id, hex]) => [id, hex]));

/** Janela Exibir › Fundo: tipo e cor, com uma amostra de cada; Aplicar grava (um Ctrl+Z desfaz). */
export function JanelaFundo({ fundo, aoAplicar, aoFechar, somenteLeitura }) {
  const [esc, setEsc] = useState(() => fundoValido(fundo));
  const amostra = (tipo, cor) => ({ ...estiloDoFundo({ tipo, cor }, { x: 3, y: 3, z: 0.5 }) });
  return (
    <Janela titulo="Fundo do quadro" icone="grade" subtitulo="Vale só para este quadro" aoFechar={aoFechar} classe="qd-jfundo"
      rodape={<>
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" disabled={somenteLeitura} data-fundo-aplicar onClick={() => { aoAplicar(esc); aoFechar(); }}>Aplicar</button>
      </>}>
      <section className="rg-cartao">
        <span className="rg-cab">Desenho</span>
        <div className="qd-fundos" role="radiogroup" aria-label="Desenho do fundo">
          {TIPOS_FUNDO.map(([id, nome]) => (
            <button key={id} type="button" role="radio" aria-checked={esc.tipo === id} data-fundo-tipo={id} className={'qd-fundo-op' + (esc.tipo === id ? ' on' : '')} onClick={() => setEsc({ ...esc, tipo: id })} {...(esc.tipo === id ? { 'data-foco': true } : {})}>
              <span className={'qd-fundo-am' + (COR_DO_FUNDO[esc.cor] ? ' com-cor' : '')} style={amostra(id, esc.cor)} />
              <span>{nome}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="rg-cartao">
        <span className="rg-cab">Cor</span>
        <div className="qd-fundos" role="radiogroup" aria-label="Cor do fundo">
          {CORES_FUNDO.map(([id, hex, nome]) => (
            <button key={id} type="button" role="radio" aria-checked={esc.cor === id} data-fundo-cor={id} className={'qd-fundo-op' + (esc.cor === id ? ' on' : '')} onClick={() => setEsc({ ...esc, cor: id })}>
              <span className={'qd-fundo-am' + (hex ? ' com-cor' : '')} style={amostra(esc.tipo, id)} />
              <span>{nome}</span>
            </button>
          ))}
        </div>
        <p className="qd-dica">Padrão = a cor do tema, como antes. No PDF e na imagem o fundo não sai, como no Excel.</p>
      </section>
    </Janela>
  );
}
