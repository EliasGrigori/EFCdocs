/* Vértice Docs — pinça de dois dedos para aproximar e afastar a planilha (v0.6.22, D-61).
   O navegador não dá o zoom da página na grade (touch-action: pan-x pan-y); aqui a distância entre os dedos vira o zoom da planilha,
   em passos de 5%, entre o mínimo e o máximo dela. O estado do gesto fica num objeto de fora (sobrevive a cada desenho da tela). */

/** Zoom novo a partir do zoom do começo do gesto e da distância dos dedos (no começo e agora). */
export function zoomDaPinca(z0, d0, d, min, max) {
  if (!(d0 > 0) || !(d > 0)) return z0;
  return Math.max(min, Math.min(max, Math.round(((z0 * d) / d0) * 20) / 20));
}

const distancia = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

/** Quem segura o dedo pergunta: houve pinça agora há pouco? (o primeiro dedo da pinça não pode abrir o menu da célula) */
export const pincaRecente = (est) => !!est && (est.d0 > 0 || Date.now() - (est.ate || 0) < 700);

/** Liga a pinça no elemento. est = { d0, z0, ate, aoComecar } guardado fora (aoComecar cancela o toque de um dedo); lerZ() dá o zoom de agora; mudarZ(z) aplica. Devolve quem desliga. */
export function ligarPinca(el, est, lerZ, mudarZ, min, max) {
  if (!el) return () => {};
  const comeca = (ev) => { if (ev.touches.length === 2) { est.d0 = distancia(ev.touches); est.z0 = lerZ(); ev.preventDefault(); if (est.aoComecar) est.aoComecar(); } };
  const move = (ev) => {
    if (ev.touches.length !== 2 || !est.d0) return;
    ev.preventDefault();
    const z = zoomDaPinca(est.z0, est.d0, distancia(ev.touches), min, max);
    if (z !== lerZ()) mudarZ(z);
  };
  const acaba = (ev) => { if (ev.touches.length < 2 && est.d0) { est.d0 = 0; est.ate = Date.now(); } };
  el.addEventListener('touchstart', comeca, { passive: false });
  el.addEventListener('touchmove', move, { passive: false });
  el.addEventListener('touchend', acaba);
  el.addEventListener('touchcancel', acaba);
  return () => {
    el.removeEventListener('touchstart', comeca); el.removeEventListener('touchmove', move);
    el.removeEventListener('touchend', acaba); el.removeEventListener('touchcancel', acaba);
  };
}
