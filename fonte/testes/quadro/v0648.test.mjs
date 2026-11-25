/* v0.6.48 (D-77): no PDF e na imagem do Quadro, o código (Q-001) da forma Início/Fim fica depois da curva, a uma
   distância igual ao raio (metade do lado menor), como na tela. Antes usava sempre a metade da altura. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { desenharQuadro } from '../../src/quadro/desenho.js';
import { aplicarDiff, criarDiff } from '../../src/nucleo/diff.js';

const aplicar = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;

/* contexto de desenho falso: guarda onde cada texto foi escrito */
function ctxFalso() {
  const textos = [];
  const alvo = { canvas: { width: 2000, height: 1200 }, textos, measureText: (t) => ({ width: String(t).length * 6 }), fillText: (t, x, y) => textos.push({ t, x, y }) };
  return new Proxy(alvo, { get: (o, k) => (k in o ? o[k] : typeof k === 'string' ? () => {} : undefined), set: (o, k, v) => { o[k] = v; return true; } });
}
function codigoDaForma(w, h) {
  let c = Q.conteudoQuadroVazio();
  const r = Q.novoItem(c, 'inicio', { x: 100, y: 100 });
  c = aplicar(c, r.mudancas);
  c = { ...c, itens: { ...c.itens, [r.item.id]: { ...c.itens[r.item.id], w, h } } };
  const ctx = ctxFalso();
  desenharQuadro(ctx, c, { codigos: true });
  return ctx.textos.find((t) => t.t === c.itens[r.item.id].cod);
}

test('D-77: forma Início/Fim larga — o código começa no raio (metade da altura)', () => {
  const t = codigoDaForma(160, 62);
  assert.ok(t, 'código não foi escrito');
  assert.equal(t.x, 100 + 31);
});

test('D-77: forma Início/Fim mais estreita que alta — o raio é a metade da largura, não da altura', () => {
  const t = codigoDaForma(80, 120);
  assert.ok(t, 'código não foi escrito');
  assert.equal(t.x, 100 + 40);
});
