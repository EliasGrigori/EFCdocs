/* v0.6.46 · D-75 (Elias, 24/11/2026): "quando uma imagem sobe ou desce cortando uma linha congelada ela é cortada e às vezes
   se perde dentro das células". Objeto preso na parte congelada era sempre cortado na linha fixa: a parte de baixo nunca
   aparecia. Agora aparece em pedaços, como no Excel. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eixo, MAX_LIN, MAX_COL } from '../../src/planilha/modelo.js';
import { geometria } from '../../src/planilha/grade.js';
import * as OB from '../../src/planilha/objetos.js';

const G = (sy = 0, sx = 0, cong = { l: 4, c: 0 }) => geometria({ linhas: eixo({}, {}, 20, MAX_LIN), colunas: eixo({}, {}, 64, MAX_COL), z: 1, sx, sy, cong, W: 1200, H: 800 });
const ped = (o, g, a) => (OB.pedacosDoObjeto ? OB.pedacosDoObjeto(o, g, a) : [{ ...o, _rc: OB.recorteDoObjeto(o, OB.retDoObjeto(o, g), g) }]);
const alturaVista = (ps) => ps.reduce((s, p) => s + (p._rc && p._rc.visivel === false ? 0 : p.h - (p._rc ? p._rc.corte.t + p._rc.corte.b : 0)), 0);
const img = { id: 'i1', tipo: 'imagem', l: 1, c: 3, dx: 0, dy: 0, w: 240, h: 140 };

test('imagem que começa nas linhas congeladas e passa da linha fixa: sem rolar, aparece inteira (em dois pedaços)', () => {
  const ps = ped(img, G());
  assert.equal(ps.length, 2);
  assert.equal(Math.round(alturaVista(ps)), 140);
});

test('ao rolar 40 px: o pedaço de cima fica no mesmo lugar, o de baixo sobe 40 px', () => {
  const p0 = ped(img, G(0)), p1 = ped(img, G(40));
  assert.equal(p1[0]._r.y, p0[0]._r.y, 'parte congelada parada');
  assert.equal(p1[1]._r.y, p0[1]._r.y - 40, 'parte que rola');
});

test('rolando além da imagem, só o pedaço congelado fica', () => {
  assert.equal(ped(img, G(400)).length, 1);
});

test('objeto fora das congeladas, ou sendo arrastado, continua um só (como antes)', () => {
  const o = { ...img, l: 10 };
  assert.deepEqual(ped(o, G()), [o]);
  const arr = ped(img, G(), true); assert.equal(arr.length, 1); assert.equal(arr[0]._r, undefined);
});

test('com linhas e colunas congeladas, a imagem no canto aparece em quatro pedaços que somam a área toda', () => {
  const g = G(0, 0, { l: 4, c: 4 }), o = { ...img, c: 2, w: 240 };
  const ps = ped(o, g);
  assert.equal(ps.length, 4);
  const area = ps.reduce((s, p) => s + (p.w - p._rc.corte.l - p._rc.corte.r) * (p.h - p._rc.corte.t - p._rc.corte.b), 0);
  assert.equal(Math.round(area), 240 * 140);
  assert.equal(ps.filter((p) => !p._semAlca).length, 1, 'uma alça só');
});
