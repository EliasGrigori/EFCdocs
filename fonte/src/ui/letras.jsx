/* Vértice Docs v0.6.20 · fluidez, item a): o título entra letra por letra saindo do desfoque quando o TEXTO muda
   (trocar de área, de aba ou de arquivo). Na primeira vez que a tela abre e quando só um dado muda, nada anima.
   Feito dentro do React, para o título nunca ficar com o texto antigo. */
import { useLayoutEffect, useState } from 'react';

const ultimo = {}; /* canal → o último texto mostrado ali */
const parado = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function Letras({ texto, canal = 'titulo' }) {
  const [vivo, setVivo] = useState(null);
  useLayoutEffect(() => {
    const ant = ultimo[canal]; ultimo[canal] = texto;
    if (ant === undefined || ant === texto || parado() || !texto || texto.length > 48) { setVivo(null); return undefined; }
    setVivo(texto);
    const t = setTimeout(() => setVivo(null), Math.min(texto.length, 30) * 20 + 500 + 80);
    return () => clearTimeout(t);
  }, [texto, canal]);
  if (vivo !== texto) return texto;
  /* v0.6.24.2 (V24-05): o leitor de tela lê o texto escondido; as letras soltas ficam fora dele (sem aria-label em span sem papel) */
  return <span className="fz-tt" data-fz-tt><span className="so-leitor">{texto}</span>{[...texto].map((c, i) => <span key={i} aria-hidden="true" style={{ '--i': i }}>{c}</span>)}</span>;
}
