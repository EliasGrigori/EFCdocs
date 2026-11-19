/* Vértice Docs — Quadro: ajustes de tela pequena e de arrasto (v0.6.32, relatório do Grok de 18/11).
   PL10: no celular, o item escolhido não fica atrás das barras de baixo (barra do item e faixa de cores).
   PL11: arrastar um item até a borda da área rola a tela, e o item continua debaixo do dedo.
   PL12: quando a área muda de tamanho (girar o celular, janela), o centro do que se via continua no centro. */
import { useEffect } from 'react';

const FOLGA = 10;

/** PL12: guarda o tamanho anterior da área e devolve quanto a vista anda para manter o centro. */
const TAM = new WeakMap();
export function manterCentro(el, setArea, setView) {
  const w = el.clientWidth, h = el.clientHeight, antes = TAM.get(el);
  TAM.set(el, { w, h });
  setArea({ w, h });
  if (antes && (antes.w !== w || antes.h !== h) && antes.w > 0 && antes.h > 0) {
    const dx = (w - antes.w) / 2, dy = (h - antes.h) / 2;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }
}

/** PL10: depois de escolher um item no celular, rola a vista para ele aparecer inteiro acima das barras de baixo. */
export function usarItemVisivel(ativo, areaRef, ids, livre, setView) {
  const chave = ativo && livre ? ids.join(',') : '';
  useEffect(() => {
    if (!chave) return undefined;
    const t = setTimeout(() => {
      const el = areaRef.current;
      if (!el) return;
      const a = el.getBoundingClientRect();
      const barras = [...el.querySelectorAll('.qd-barra, .qd-cores-cel')].map((b) => b.getBoundingClientRect().top).filter((y) => y > a.top);
      const limite = barras.length ? Math.min(...barras) : a.bottom;
      const ab = el.parentElement && el.parentElement.querySelector('.qd-vistas'); /* v0.6.33: as abas flutuam sobre o quadro */
      const topo = ab ? Math.max(a.top, ab.getBoundingClientRect().bottom + 6) : a.top + 56; /* abaixo das abas Quadro/Kanban */
      let baixo = -Infinity, cima = Infinity;
      for (const id of chave.split(',')) {
        const it = el.querySelector(`[data-item="${CSS.escape(id)}"]`);
        if (!it) continue;
        const r = it.getBoundingClientRect();
        baixo = Math.max(baixo, r.bottom); cima = Math.min(cima, r.top);
      }
      if (baixo === -Infinity) return;
      let dy = 0;
      if (baixo > limite - FOLGA) dy = limite - FOLGA - baixo;
      if (cima + dy < topo) dy = Math.min(0, topo - cima) || dy; /* item maior que o espaço: mostra o começo */
      if (dy) setView((v) => ({ ...v, y: v.y + dy }));
    }, 60);
    return () => clearTimeout(t);
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** PL11: com o dedo ou o mouse perto da borda durante o arrasto de um item, a vista anda naquela direção.
    g é o gesto em andamento (g.px, g.py guardam quanto a vista já andou); refazer(ev) repete o cálculo do arrasto. */
const BORDA = 36, VEL_MAX = 14;
export function rolarNaBorda(g, ev, el, gestoRef, setView, refazer) {
  g.ult = { clientX: ev.clientX, clientY: ev.clientY, altKey: ev.altKey, pointerId: ev.pointerId, pointerType: ev.pointerType };
  if (g.rolando) return;
  const vel = () => {
    const a = el.getBoundingClientRect(), p = g.ult;
    const fx = p.clientX < a.left + BORDA ? -(a.left + BORDA - p.clientX) : p.clientX > a.right - BORDA ? p.clientX - (a.right - BORDA) : 0;
    const fy = p.clientY < a.top + BORDA ? -(a.top + BORDA - p.clientY) : p.clientY > a.bottom - BORDA ? p.clientY - (a.bottom - BORDA) : 0;
    const k = (f) => Math.sign(f) * Math.min(VEL_MAX, Math.ceil((Math.min(Math.abs(f), BORDA) / BORDA) * VEL_MAX));
    return { x: k(fx), y: k(fy) };
  };
  if (!vel().x && !vel().y) return;
  g.rolando = true;
  const quadroDaBorda = () => {
    const s = vel();
    if (gestoRef.current !== g || (!s.x && !s.y)) { g.rolando = false; return; }
    g.px = (g.px || 0) + s.x; g.py = (g.py || 0) + s.y;
    setView((v) => ({ ...v, x: v.x - s.x, y: v.y - s.y }));
    refazer(g.ult);
    requestAnimationFrame(quadroDaBorda);
  };
  requestAnimationFrame(quadroDaBorda);
}
