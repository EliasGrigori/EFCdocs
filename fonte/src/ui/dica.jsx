/* EFCdocs — balão de dica dos botões: nome, o que faz e o atalho (ao parar o mouse em cima).
   Um só ouvinte para a tela toda: vale para a faixa, a barra curta e qualquer botão com data-cmd. */
import { useEffect, useRef, useState } from 'react';
import { PorId } from '../nucleo/comandos.js';
import { dicaDoComando } from '../nucleo/dicas.js';

const ESPERA = 450;

export function DicasComandos({ mod }) {
  const [dica, setDica] = useState(null);
  const tempo = useRef(null);
  const alvo = useRef(null);
  useEffect(() => {
    if (typeof matchMedia !== 'undefined' && !matchMedia('(hover: hover)').matches) return undefined;
    const esconder = () => { clearTimeout(tempo.current); alvo.current = null; setDica(null); };
    const entrou = (ev) => {
      const el = ev.target.closest && ev.target.closest('[data-cmd],[data-dica]');
      if (!el || el === alvo.current) return;
      esconder();
      alvo.current = el;
      tempo.current = setTimeout(() => {
        if (!document.contains(el)) return;
        let conteudo;
        if (el.dataset.cmd && PorId[el.dataset.cmd]) {
          const d = dicaDoComando(PorId[el.dataset.cmd], mod);
          conteudo = { ...d, nota: el.dataset.nota || '' };
        } else if (el.dataset.dica) {
          const [nome, desc] = el.dataset.dica.split('|');
          conteudo = { nome, desc: desc || '', atalho: '', nota: '' };
        }
        if (!conteudo) return;
        const r = el.getBoundingClientRect();
        setDica({ ...conteudo, x: r.left + r.width / 2, y: r.bottom + 6, topo: r.top });
      }, ESPERA);
    };
    const saiu = (ev) => { if (alvo.current && !(ev.relatedTarget && alvo.current.contains && alvo.current.contains(ev.relatedTarget))) esconder(); };
    document.addEventListener('mouseover', entrou);
    document.addEventListener('mouseout', saiu);
    addEventListener('mousedown', esconder, true);
    addEventListener('keydown', esconder, true);
    addEventListener('scroll', esconder, true);
    addEventListener('wheel', esconder, { capture: true, passive: true }); // roda do mouse em cima da faixa (sem rolar nada)
    addEventListener('hashchange', esconder); // trocou de página: o botão da dica sumiu
    return () => {
      clearTimeout(tempo.current);
      document.removeEventListener('mouseover', entrou);
      document.removeEventListener('mouseout', saiu);
      removeEventListener('mousedown', esconder, true);
      removeEventListener('keydown', esconder, true);
      removeEventListener('scroll', esconder, true);
      removeEventListener('wheel', esconder, { capture: true });
      removeEventListener('hashchange', esconder);
      setDica(null);
    };
  }, [mod]);
  if (!dica) return null;
  const larg = 260;
  const esq = Math.max(8, Math.min(dica.x - larg / 2, innerWidth - larg - 8));
  return (
    <div className="dica-cmd" role="tooltip" style={{ left: esq, top: dica.y, width: larg }}>
      <div className="dica-t"><b>{dica.nome}</b>{dica.atalho && <kbd>{dica.atalho}</kbd>}</div>
      {dica.desc && <div className="dica-d">{dica.desc}</div>}
      {dica.nota && <div className="dica-n">{dica.nota}</div>}
    </div>
  );
}
