/* v0.6.60 (D-85): a textura não usa o atalho "background" no estilo (com ele, trocar a cor apagava a imagem da textura). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estiloTextura } from '../../src/quadro/texturas.js';

test('D-85: nenhuma textura devolve o atalho background; a cor fica em backgroundColor', () => {
  for (const tex of ['dobrado', 'amassado', 'cafe']) {
    const e = estiloTextura({ tipo: 'postit', tex, w: 170, h: 130 }, '#fbe1ec');
    assert.equal('background' in e, false, tex);
  }
  assert.match(estiloTextura({ tipo: 'postit', tex: 'dobrado', w: 170, h: 130 }, '#fbe1ec').backgroundImage, /#fbe1ec/);
  const partes = readFileSync(new URL('../../src/quadro/partes.jsx', import.meta.url), 'utf8');
  assert.ok(!/style\.background\s*=/.test(partes), 'o post-it pinta só a cor (backgroundColor)');
});
