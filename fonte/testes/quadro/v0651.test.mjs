/* v0.6.51: título do post-it e caixinha de feito ligada à última coluna do Kanban (propostas 3A e 4A). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { mudancasTitulo, mudancasFeito, mostraCaixas, estaFeito, tituloDe, TITULO_MAX } from '../../src/quadro/postit.js';
import { desenharQuadro } from '../../src/quadro/desenho.js';
import { aplicarDiff, criarDiff } from '../../src/nucleo/diff.js';

const aplicar = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;
function quadroCom(n = 2) {
  let c = Q.conteudoQuadroVazio();
  const ids = [];
  for (let i = 0; i < n; i++) { const r = Q.novoItem(c, 'postit', { x: 100 + i * 200, y: 100 }); c = aplicar(c, r.mudancas); ids.push(r.item.id); }
  return { c, ids };
}

test('título: põe, troca e tira; corta em 80 letras e junta espaços', () => {
  let { c, ids: [a] } = quadroCom(1);
  c = aplicar(c, mudancasTitulo(c, [a], '  Conferir   calibração '));
  assert.equal(c.itens[a].tit, 'Conferir calibração');
  assert.equal(tituloDe(c.itens[a]), 'Conferir calibração');
  c = aplicar(c, mudancasTitulo(c, [a], 'x'.repeat(200)));
  assert.equal(c.itens[a].tit.length, TITULO_MAX);
  c = aplicar(c, mudancasTitulo(c, [a], ''));
  assert.equal(c.itens[a].tit, undefined);
  assert.deepEqual(mudancasTitulo(c, [a], ''), {}, 'sem título e pedindo sem título: nada a fazer');
});

test('título: só post-it recebe título', () => {
  let c = Q.conteudoQuadroVazio();
  const r = Q.novoItem(c, 'processo', { x: 0, y: 0 }); c = aplicar(c, r.mudancas);
  assert.deepEqual(mudancasTitulo(c, [r.item.id], 'Teste'), {});
});

test('feito: marcar leva para a coluna Feito e desmarcar volta para a coluna de antes', () => {
  let { c, ids: [a, b] } = quadroCom(2);
  c = aplicar(c, Q.mudancasMoverKanban(c, a, 'c2'));
  assert.equal(c.itens[a].col, 'c2');
  assert.ok(mostraCaixas(c));
  assert.ok(!estaFeito(c, c.itens[a]));
  c = aplicar(c, mudancasFeito(c, a, true));
  assert.equal(c.itens[a].col, 'c3'); assert.equal(c.itens[a].colAntes, 'c2');
  assert.ok(estaFeito(c, c.itens[a]));
  assert.deepEqual(mudancasFeito(c, a, true), {}, 'marcar de novo não faz nada');
  c = aplicar(c, mudancasFeito(c, a, false));
  assert.equal(c.itens[a].col, 'c2'); assert.equal(c.itens[a].colAntes, undefined);
  assert.ok(!estaFeito(c, c.itens[a]));
  assert.equal(c.itens[b].col, 'c1', 'o outro post-it não mudou');
});

test('feito: se a coluna de antes foi apagada, desmarcar volta para a primeira', () => {
  let { c, ids: [a] } = quadroCom(1);
  c = aplicar(c, Q.mudancasMoverKanban(c, a, 'c2'));
  c = aplicar(c, mudancasFeito(c, a, true));
  c = { ...c, colunas: c.colunas.filter((k) => k.id !== 'c2') };
  c = aplicar(c, mudancasFeito(c, a, false));
  assert.equal(c.itens[a].col, 'c1');
});

test('feito: quadro com uma coluna só, ou com as caixinhas desligadas, não mostra a caixinha', () => {
  let { c, ids: [a] } = quadroCom(1);
  const uma = { ...c, colunas: [c.colunas[0]] };
  assert.ok(!mostraCaixas(uma)); assert.deepEqual(mudancasFeito(uma, a, true), {});
  c = aplicar(c, { caixas: false });
  assert.ok(!mostraCaixas(c));
  assert.equal(Q.normalizarQuadro(JSON.parse(JSON.stringify(c))).caixas, false, 'a escolha fica guardada no arquivo');
  assert.equal(Q.normalizarQuadro(Q.conteudoQuadroVazio()).caixas, undefined);
});

/* contexto de desenho falso: guarda textos, retângulos e cores */
function ctxFalso() {
  const reg = { textos: [], rets: [], caixas: 0 };
  const alvo = { canvas: { width: 2000, height: 1200 }, reg, fillStyle: '#000', textAlign: 'left',
    measureText: (t) => ({ width: String(t).length * 6 }),
    fillText(t, x, y) { reg.textos.push({ t, x, y, cor: this.fillStyle, alinh: this.textAlign }); },
    fillRect(x, y, w, h) { reg.rets.push({ x, y, w, h, cor: this.fillStyle }); },
    roundRect() { reg.caixas++; } };
  return new Proxy(alvo, { get: (o, k) => (k in o ? o[k] : typeof k === 'string' ? () => {} : undefined), set: (o, k, v) => { o[k] = v; return true; } });
}

test('PDF e imagem: título com fio, texto à esquerda, caixinha e texto riscado quando feito', () => {
  let { c, ids: [a, b] } = quadroCom(2);
  c = aplicar(c, { ['itens.' + a]: { ...c.itens[a], texto: 'Balança do packing' }, ['itens.' + b]: { ...c.itens[b], texto: 'Trocar filtro' } });
  c = aplicar(c, mudancasTitulo(c, [a], 'Conferir calibração'));
  c = aplicar(c, mudancasFeito(c, b, true));
  const ctx = ctxFalso();
  desenharQuadro(ctx, c, { codigos: false });
  const t = ctx.reg.textos;
  const tit = t.find((x) => x.t === 'Conferir calibração');
  assert.ok(tit, 'título desenhado');
  const corpo = t.find((x) => x.t === 'Balança do packing');
  assert.ok(corpo.y > tit.y + 10, 'o texto fica abaixo do título');
  assert.equal(corpo.alinh, 'left', 'com título, o texto vai para a esquerda');
  assert.ok(ctx.reg.rets.some((r) => r.h === 1 && r.w === c.itens[a].w - 24), 'fio embaixo do título');
  assert.equal(ctx.reg.caixas, 2, 'uma caixinha em cada post-it');
  const feito = t.find((x) => x.t === 'Trocar filtro');
  assert.match(String(feito.cor), /rgba\(31,35,40,\.55\)/, 'texto do feito mais claro');
  assert.ok(ctx.reg.rets.some((r) => r.h === 1.2 && Math.abs(r.y - (feito.y - 14 * 0.32)) < 0.5), 'texto do feito riscado');
});
