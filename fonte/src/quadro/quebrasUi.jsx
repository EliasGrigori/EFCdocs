/* Vértice Docs · Quadro · tracejado da impressão no quadro (v0.6.55). Os comandos da aba ficam em layoutQuadro.js. */
import { normalizarImpQ, ehImpQPadrao, paginasDaImpressao } from './impressaoQuadro.js';

/** Tracejado da impressão no quadro (dentro do mundo: anda e cresce com a vista). */
export function CamadaQuebras({ c, mostrar }) {
  if (!mostrar || !c.impressao || ehImpQPadrao(c.impressao)) return null;
  const imp = normalizarImpQ(c.impressao);
  const r = paginasDaImpressao(c, imp.alvo === 'escolhidos' ? { ...imp, alvo: 'auto' } : imp);
  if (!r.paginas.length) return null;
  return (
    <div className="qd-quebras" aria-hidden="true" data-quebras={r.paginas.length}>
      {imp.area && <div className="qd-quebra-area" style={{ left: imp.area.x, top: imp.area.y, width: imp.area.w, height: imp.area.h }}><span>Área de impressão</span></div>}
      {r.paginas.map((pg, i) => {
        const x = pg.mundo.x - pg.offX / pg.s, y = pg.mundo.y - pg.offY / pg.s;
        return <div key={i} className="qd-quebra-folha" data-folha={i + 1} style={{ left: x, top: y, width: pg.area.w / pg.s, height: pg.area.h / pg.s }}><span>Folha {i + 1}</span></div>;
      })}
    </div>
  );
}
