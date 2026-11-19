/* Vértice Docs — v0.6.27: rolagem suave da roda do mouse (pedido do Elias em 18/11: "na rolagem da planilha parece que pula
   de fileira em fileira e coluna em coluna, em vez de uma transição suave; verifica também nos post-its").
   Um clique da roda manda de 100 px a 3 linhas de uma vez; aqui o caminho é feito em alguns quadros da tela, cada um andando
   uma parte do que falta (começa rápido e freia), e cliques seguidos se somam. O touchpad, que já manda passos pequenos,
   e "reduzir movimento" passam direto. Só muda a posição de rolagem (nada de transition em cor ou tamanho: R32). */

const estado = new WeakMap(); /* alvo → { dx, dy, quadro } que ainda falta andar */
const PARTE = 0.28; /* fração do que falta, por quadro (cerca de 12 quadros, 200 ms, para um clique de 100 px) */

/** Passo de roda que merece animação: em linhas ou páginas, ou grande (mouse comum). */
export const rodaDeMouse = (ev) => ev.deltaMode !== 0 || Math.abs(ev.deltaY) >= 50 || Math.abs(ev.deltaX) >= 50;

/** Delta da roda em pixels (deltaMode 1 = linhas, 2 = páginas). */
export function deltaEmPx(ev, pagina = 600) {
  const k = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? pagina : 1;
  return { dx: (ev.shiftKey && !ev.deltaX ? ev.deltaY : ev.deltaX) * k, dy: (ev.shiftKey && !ev.deltaX ? 0 : ev.deltaY) * k };
}

const reduzido = () => { try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

/**
 * Anda (dx, dy) em quadros: aplicar(px, py) recebe o pedaço de cada quadro. chave = quem rola (o elemento ou a função de
 * estado), para somar cliques seguidos. Devolve true quando animou.
 */
export function andarSuave(chave, dx, dy, aplicar) {
  if (reduzido() || typeof requestAnimationFrame !== 'function') { aplicar(dx, dy); return false; }
  let s = estado.get(chave);
  if (!s) { s = { dx: 0, dy: 0, quadro: 0 }; estado.set(chave, s); }
  s.dx += dx; s.dy += dy;
  if (s.quadro) return true;
  const quadroSeguinte = () => {
    let px = s.dx * PARTE, py = s.dy * PARTE;
    if (Math.abs(s.dx) < 1.5) px = s.dx;
    if (Math.abs(s.dy) < 1.5) py = s.dy;
    s.dx -= px; s.dy -= py;
    aplicar(px, py);
    s.quadro = (s.dx || s.dy) ? requestAnimationFrame(quadroSeguinte) : 0;
  };
  s.quadro = requestAnimationFrame(quadroSeguinte);
  return true;
}

/** Quanto ainda falta andar (para quem quer mirar o fim: a planilha com congeladas mira a linha inteira). */
export function faltaAndar(chave) { const s = estado.get(chave); return s && s.quadro ? { dx: s.dx, dy: s.dy } : { dx: 0, dy: 0 }; }

/** Para a animação (ex.: o dedo ou o mouse começou a arrastar). */
export function pararSuave(chave) { const s = estado.get(chave); if (s) { if (s.quadro) cancelAnimationFrame(s.quadro); s.dx = 0; s.dy = 0; s.quadro = 0; } }

/** Rolagem suave de um elemento que rola (a planilha). O navegador arredonda scrollTop para o pixel; por isso cada quadro
    põe a posição certa (começo + o que já andou), em vez de somar pedaços pequenos que se perderiam no arredondamento. */
const posEl = new WeakMap();
export function rolarSuave(el, dx, dy) {
  const s = estado.get(el);
  let p = posEl.get(el);
  if (!s || !s.quadro || !p) { p = { x: el.scrollLeft, y: el.scrollTop }; posEl.set(el, p); }
  return andarSuave(el, dx, dy, (px, py) => {
    const maxX = el.scrollWidth - el.clientWidth, maxY = el.scrollHeight - el.clientHeight;
    p.x = Math.max(0, Math.min(maxX, p.x + px)); p.y = Math.max(0, Math.min(maxY, p.y + py));
    el.scrollLeft = p.x; el.scrollTop = p.y;
  });
}
