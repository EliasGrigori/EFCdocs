/* v0.6.33 · Quadro com o celular deitado: o primeiro post-it nasce dentro da parte da tela que aparece. Dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';

const t = Q.TIPOS_ITEM.postit;

test('v0.6.33: quadro vazio, centro da tela embaixo das abas: o post-it desce para a parte livre', () => {
  /* tela deitada: a parte livre começa em y = 60 (abaixo das abas) e tem 230 de altura; o centro da tela inteira daria y = 80 - 65 */
  const livre = { x: 0, y: 60, w: 844, h: 230 };
  const v = Q.vagaLivre(Q.conteudoQuadroVazio(), 337, 15, t.w, t.h, 28, livre);
  assert.ok(v.y >= livre.y + 8 && v.y + t.h <= livre.y + livre.h - 8, 'y = ' + v.y);
  assert.equal(v.x, 337);
});

test('v0.6.33: item maior que a parte livre não é empurrado (fica onde estava)', () => {
  const livre = { x: 0, y: 60, w: 844, h: 100 };
  const v = Q.vagaLivre(Q.conteudoQuadroVazio(), 337, 15, t.w, t.h, 28, livre);
  assert.equal(v.y, 15);
});

test('v0.6.33: sem a parte livre, nada muda (o caminho antigo continua)', () => {
  assert.deepEqual(Q.vagaLivre(Q.conteudoQuadroVazio(), 337, 15, t.w, t.h), { x: 337, y: 15 });
});
