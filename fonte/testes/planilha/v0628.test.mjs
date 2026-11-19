/* v0.6.28 · trava de toque em imagens e gráficos: o dedo rola a planilha, com embalo que freia. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { panComEmbalo, pararEmbalo } from '../../src/ui/panToque.js';

function ambiente() {
  const fila = [];
  globalThis.requestAnimationFrame = (f) => { fila.push(f); return fila.length; };
  globalThis.cancelAnimationFrame = () => { fila.length = 0; };
  return { fila, rodar: (n = 500) => { let k = 0; while (fila.length && k < n) { fila.shift()(); k++; } return k; } };
}

test('o dedo que sobe rola a planilha para baixo, na mesma medida', () => {
  ambiente();
  const el = { scrollLeft: 0, scrollTop: 0 };
  const g = panComEmbalo(el);
  g.comecar(100, 400, 0); g.mover(100, 380, 16); g.mover(100, 330, 32);
  assert.equal(el.scrollTop, 70); assert.equal(el.scrollLeft, 0);
});

test('soltando rápido, o embalo continua no mesmo sentido e freia até parar', () => {
  const amb = ambiente();
  const el = { scrollLeft: 0, scrollTop: 0 };
  const g = panComEmbalo(el);
  g.comecar(100, 400, 0); for (let i = 1; i <= 5; i++) g.mover(100, 400 - 30 * i, 16 * i);
  const solto = el.scrollTop; g.soltar();
  const quadros = amb.rodar();
  assert.ok(el.scrollTop > solto + 50, `embalo ${el.scrollTop - solto}`);
  assert.ok(quadros > 10 && quadros < 500, 'freia e para: ' + quadros);
});

test('dedo parado antes de soltar (devagar) não dá embalo; um dedo novo para o embalo', () => {
  const amb = ambiente();
  const el = { scrollLeft: 0, scrollTop: 0 };
  const g = panComEmbalo(el);
  g.comecar(0, 100, 0); g.mover(0, 98, 400); g.soltar();
  assert.equal(amb.fila.length, 0, 'devagar: sem embalo');
  const g2 = panComEmbalo(el);
  g2.comecar(0, 400, 0); for (let i = 1; i <= 5; i++) g2.mover(0, 400 - 40 * i, 16 * i); g2.soltar();
  assert.ok(amb.fila.length > 0);
  pararEmbalo(el); const y = el.scrollTop; amb.rodar();
  assert.equal(el.scrollTop, y, 'parou');
  delete globalThis.requestAnimationFrame; delete globalThis.cancelAnimationFrame;
});
