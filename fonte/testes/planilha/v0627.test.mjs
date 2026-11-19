/* v0.6.27 · rolagem suave (pedido do Elias em 18/11): pixel a pixel com congeladas e roda do mouse em quadros. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geometria } from '../../src/planilha/grade.js';
import { andarSuave, rodaDeMouse, deltaEmPx } from '../../src/ui/rodaSuave.js';

const tam = (n) => ({ pos: (l) => l * n, tam: () => n, em: (y) => Math.floor(y / n) });

test('com linha e coluna congeladas, a parte que rola anda pixel a pixel (antes pulava para a linha e a coluna inteiras)', () => {
  for (const [sy, sx] of [[3, 5], [13, 40], [27, 70]]) {
    const G = geometria({ linhas: tam(20), colunas: tam(64), z: 1, sx, sy, cong: { l: 2, c: 1 }, W: 1000, H: 600 });
    assert.equal(G.yDe(2), G.hh + G.fy - sy, 'linha: ' + sy);
    assert.equal(G.xDe(1), G.hw + G.fx - sx, 'coluna: ' + sx);
  }
  /* sem congeladas continua igual */
  const G = geometria({ linhas: tam(20), colunas: tam(64), z: 1, sx: 0, sy: 13, cong: null, W: 1000, H: 600 });
  assert.equal(G.yDe(0), G.hh - 13);
});

test('roda do mouse: um clique de 100 px é feito em vários quadros, cliques seguidos se somam e o total é exato', () => {
  const fila = [];
  globalThis.requestAnimationFrame = (f) => { fila.push(f); return fila.length; };
  globalThis.cancelAnimationFrame = () => {};
  const chave = {}; let y = 0; const passos = [];
  andarSuave(chave, 0, 100, (px, py) => { y += py; passos.push(py); });
  andarSuave(chave, 0, 100, (px, py) => { y += py; passos.push(py); });
  let n = 0; while (fila.length && n < 200) { fila.shift()(); n++; }
  assert.ok(Math.abs(y - 200) < 1e-9, 'total ' + y);
  assert.ok(passos.length >= 8, 'quadros: ' + passos.length);
  assert.ok(passos[0] < 100 && passos[0] > passos[passos.length - 2], 'começa rápido e freia');
  delete globalThis.requestAnimationFrame; delete globalThis.cancelAnimationFrame;
});

test('touchpad (passo pequeno) não anima; linhas e páginas viram pixels; Shift rola para o lado', () => {
  assert.equal(rodaDeMouse({ deltaMode: 0, deltaY: 4, deltaX: 0 }), false);
  assert.equal(rodaDeMouse({ deltaMode: 0, deltaY: 100, deltaX: 0 }), true);
  assert.equal(rodaDeMouse({ deltaMode: 1, deltaY: 3, deltaX: 0 }), true);
  assert.deepEqual(deltaEmPx({ deltaMode: 1, deltaY: 3, deltaX: 0 }), { dx: 0, dy: 48 });
  assert.deepEqual(deltaEmPx({ deltaMode: 2, deltaY: 1, deltaX: 0 }, 500), { dx: 0, dy: 500 });
  assert.deepEqual(deltaEmPx({ deltaMode: 0, deltaY: 100, deltaX: 0, shiftKey: true }), { dx: 100, dy: 0 });
});
