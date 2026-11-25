/* v0.6.53 (D-82): na forma Início/Fim com código, o texto começa abaixo do código, na tela e no PDF. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { desenharQuadro } from '../../src/quadro/desenho.js';
import { linhasQueCabem } from '../../src/quadro/postit.js';
import { aplicarDiff, criarDiff } from '../../src/nucleo/diff.js';

const aplicar = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;
function ctxFalso() {
  const textos = [];
  const alvo = { canvas: { width: 2000, height: 1200 }, textos, font: '', measureText: (t) => ({ width: String(t).length * 7 }), fillText(t, x, y) { textos.push({ t: String(t), y }); }, roundRect() {} };
  return new Proxy(alvo, { get: (o, k) => (k in o ? o[k] : typeof k === 'string' ? () => {} : undefined), set: (o, k, v) => { o[k] = v; return true; } });
}

test('D-82: com código, continuam cabendo 2 linhas na forma Início/Fim padrão (62 px)', () => {
  assert.equal(linhasQueCabem({ tipo: 'inicio', h: 62 }, false, false, true), 2);
  assert.equal(linhasQueCabem({ tipo: 'inicio', h: 62 }, false, false, false), 2);
});

test('D-82: no PDF, a primeira linha do texto fica abaixo do código', () => {
  let c = Q.conteudoQuadroVazio();
  const r = Q.novoItem(c, 'inicio', { x: 0, y: 0 }); c = aplicar(c, r.mudancas);
  c = aplicar(c, { ['itens.' + r.item.id]: { ...c.itens[r.item.id], texto: 'COMANDA DE PULVERIZAÇÃO - DEFENCIVOS' } });
  const ctx = ctxFalso(); desenharQuadro(ctx, c, { codigos: true });
  const cod = ctx.textos.find((t) => t.t === c.itens[r.item.id].cod);
  const primeira = ctx.textos.find((t) => t.t.startsWith('COMANDA'));
  /* a linha de base do código fica 13 px abaixo do topo; o texto (14 px) precisa começar depois dela */
  assert.ok(primeira.y - 14 * 0.98 >= cod.y, `código em ${cod.y}, topo do texto em ${(primeira.y - 14 * 0.98).toFixed(1)}`);
});
