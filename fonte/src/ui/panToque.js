/* Vértice Docs — v0.6.28: rolar com o dedo a partir de algo que fica por cima da área que rola (imagens e gráficos da planilha).
   Pedido do Elias em 18/11: "no telefone, toda hora que dou um toque numa imagem ou num gráfico ele se desloca; seria
   interessante uma trava de toque acidental; tem horas que vou precisar rolar a tela e só vai ter imagem para tocar".
   A camada dos objetos fica fora do que rola, então o navegador não rola sozinho a partir dela: aqui o dedo rola o elemento
   e, ao soltar, o embalo continua e freia (como a rolagem do celular). "Reduzir movimento": sem embalo. */

const rodando = new WeakMap(); /* elemento → quadro do embalo em andamento */
const reduzido = () => { try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

/** Para o embalo que estiver rodando no elemento (um dedo novo segura a rolagem, como no celular). */
export function pararEmbalo(el) { const q = el && rodando.get(el); if (q) { cancelAnimationFrame(q); rodando.delete(el); } }

/** Um gesto de rolar com o dedo: comecar(x, y, t), mover(x, y, t), soltar(). */
export function panComEmbalo(el) {
  let ult = null, vx = 0, vy = 0;
  return {
    comecar(x, y, t) { pararEmbalo(el); ult = { x, y, t }; vx = 0; vy = 0; },
    mover(x, y, t) {
      if (!ult) { ult = { x, y, t }; return; }
      const dx = x - ult.x, dy = y - ult.y, dt = Math.max(1, t - ult.t);
      el.scrollLeft -= dx; el.scrollTop -= dy;
      vx = 0.7 * (dx / dt) + 0.3 * vx; vy = 0.7 * (dy / dt) + 0.3 * vy; /* px por ms, com um pouco do passo anterior */
      ult = { x, y, t };
    },
    soltar() {
      if (reduzido() || typeof requestAnimationFrame !== 'function' || Math.hypot(vx, vy) < 0.15) return;
      let px = -vx * 16, py = -vy * 16; /* px por quadro (16 ms) */
      const quadroSeguinte = () => {
        el.scrollLeft += px; el.scrollTop += py;
        px *= 0.94; py *= 0.94;
        if (Math.hypot(px, py) > 0.4) rodando.set(el, requestAnimationFrame(quadroSeguinte)); else rodando.delete(el);
      };
      rodando.set(el, requestAnimationFrame(quadroSeguinte));
    },
  };
}
