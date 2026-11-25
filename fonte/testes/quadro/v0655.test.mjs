/* v0.6.55: comentário com respostas (estilo Word), Layout da Página do Quadro e área de impressão. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { respostaNova, respostasDe } from '../../src/quadro/comentario.js';
import { trataLayoutQuadro, valorLayoutQuadro } from '../../src/quadro/layoutQuadro.js';
import { normalizarImpQ, paginasDaImpressao, areaDosItens } from '../../src/quadro/impressaoQuadro.js';
import { aplicarDiff, criarDiff } from '../../src/nucleo/diff.js';

const aplicar = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;
function quadro(pos) {
  let c = Q.conteudoQuadroVazio();
  const ids = [];
  for (const [x, y] of pos) { const r = Q.novoItem(c, 'postit', { x, y }); c = aplicar(c, r.mudancas); c = aplicar(c, { ['itens.' + r.item.id]: { ...c.itens[r.item.id], x, y } }); ids.push(r.item.id); }
  return { c, ids };
}
/* roda um comando do Layout num quadro e devolve o quadro mudado */
function rodar(c, id, selecionados = []) {
  let saida = c, avisos = [], janela = 0, qp = 0;
  const r = trataLayoutQuadro(id, { c, selecionados, aplicarQ: (mud) => { saida = aplicar(c, mud); }, abrirJanela: () => { janela++; }, trocarQp: () => { qp++; }, avisar: (t) => avisos.push(t) });
  return { r, c: saida, avisos, janela, qp };
}

test('comentário: respostas com nome e hora; vazia não entra', () => {
  const it = { nota: 'Conferir laudo' };
  const m = respostaNova(it, '  Conferido  ', 'Ana', new Date('2026-11-25T10:00:00Z'));
  assert.deepEqual(m.notaR, [{ a: 'Ana', t: 'Conferido', em: '2026-11-25T10:00:00.000Z' }]);
  assert.equal(respostaNova(it, '   ', 'Ana'), null);
  const it2 = { ...it, notaR: m.notaR };
  assert.equal(respostaNova(it2, 'Enviado', '').notaR.length, 2);
  assert.equal(respostasDe({ notaR: [{ t: '' }, null, { a: 'B', t: 'ok' }] }).length, 1);
});

test('comentário: as respostas ficam guardadas no arquivo', () => {
  let { c, ids: [a] } = quadro([[0, 0]]);
  c = aplicar(c, Q.mudancasCampo(c, [a], { nota: 'Ver', notaA: 'Ana', notaR: [{ a: 'Bia', t: 'Visto', em: '2026-11-25T10:00:00.000Z' }] }));
  const r = Q.normalizarQuadro(JSON.parse(JSON.stringify(c)));
  assert.equal(r.itens[a].notaR[0].t, 'Visto'); assert.equal(r.itens[a].notaA, 'Ana');
});

test('Layout: margens, orientação, papel e ajuste pelas listas; o que não é daqui fica de fora', () => {
  const { c } = quadro([[0, 0]]);
  let x = rodar(c, 'impressao.orientacao|retrato');
  assert.equal(x.r, true); assert.equal(normalizarImpQ(x.c.impressao).orient, 'retrato');
  assert.equal(valorLayoutQuadro('valor.orientacao', x.c, {}), 'retrato');
  x = rodar(x.c, 'impressao.margens|larga'); assert.equal(valorLayoutQuadro('valor.margens', x.c, {}), 'larga');
  x = rodar(x.c, 'impressao.papel|oficio'); assert.equal(valorLayoutQuadro('valor.papel', x.c, {}), 'oficio');
  x = rodar(x.c, 'impressao.ajustar|real'); assert.equal(valorLayoutQuadro('valor.ajusteQ', x.c, {}), 'real');
  assert.equal(rodar(c, 'impressao.configurar').janela, 1);
  assert.equal(rodar(c, 'impressao.margens').janela, 1, 'sem valor: abre a janela');
  assert.equal(rodar(c, 'inserir.postit').r, undefined);
  assert.equal(rodar(c, 'exibir.quebras').qp, 1);
  assert.equal(valorLayoutQuadro('exibir.quebras', c, {}), true);
  assert.equal(valorLayoutQuadro('exibir.quebras', c, { quebras: false }), false);
});

test('Layout: voltar tudo ao padrão não deixa nada guardado', () => {
  const { c } = quadro([[0, 0]]);
  const x = rodar(rodar(c, 'impressao.orientacao|retrato').c, 'impressao.orientacao|paisagem');
  assert.ok(!x.c.impressao);
});

test('área de impressão: definir pelos itens escolhidos, só ela vai para o papel, e limpar', () => {
  const { c, ids } = quadro([[0, 0], [3000, 0]]);
  assert.match(rodar(c, 'impressao.area', []).avisos[0], /Escolha/);
  let x = rodar(c, 'impressao.area', [ids[0]]);
  const imp = normalizarImpQ(x.c.impressao);
  assert.deepEqual(imp.area, areaDosItens(c, [ids[0]]));
  const r = paginasDaImpressao(x.c, { ...imp, escala: 'real' });
  assert.equal(r.paginas.length, 1, 'só a área: um post-it em tamanho real cabe numa folha');
  assert.deepEqual([...r.paginas[0].ids], [ids[0]]);
  x = rodar(x.c, 'impressao.limparArea');
  assert.ok(!x.c.impressao, 'limpar volta ao padrão');
  assert.match(rodar(x.c, 'impressao.limparArea').avisos[0], /não tem área/);
});
