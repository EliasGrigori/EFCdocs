/* Testes do quadro de post-its (regras, geometria e PDF) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../src/quadro/modelo.js';
import * as G from '../src/quadro/geometria.js';
import { montarPdfPaisagem, textoPdf } from '../src/quadro/pdf.js';
import { aplicarDiff, criarDiff, inverterDiff } from '../src/nucleo/diff.js';
import { PDFDocument } from 'pdf-lib';

const aplicar = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;

function quadroCom(...tipos) {
  let c = Q.conteudoQuadroVazio();
  const ids = [];
  tipos.forEach((t, i) => {
    const r = Q.novoItem(c, t, { x: i * 300, y: 0 });
    c = aplicar(c, r.mudancas);
    ids.push(r.item.id);
  });
  return { c, ids };
}

test('código Q-001 automático, sem repetir', () => {
  const { c, ids } = quadroCom('postit', 'processo', 'texto', 'decisao');
  assert.equal(c.itens[ids[0]].cod, 'Q-001');
  assert.equal(c.itens[ids[1]].cod, 'Q-002');
  assert.equal(c.itens[ids[2]].cod, undefined, 'texto solto não tem código');
  assert.equal(c.itens[ids[3]].cod, 'Q-003');
  const c2 = aplicar(c, Q.mudancasExcluir(c, [ids[3]]));
  const r = Q.novoItem(c2, 'postit');
  assert.equal(r.item.cod, 'Q-004', 'número apagado não volta');
});

test('post-it novo entra na primeira coluna do Kanban', () => {
  const { c, ids } = quadroCom('postit', 'postit');
  assert.equal(c.itens[ids[0]].col, 'c1');
  assert.equal(c.itens[ids[1]].ko, 2);
  assert.equal(c.itens[ids[0]].cor, 'amarelo');
});

test('id não tem ponto (caminho do diff)', () => {
  for (let i = 0; i < 50; i++) assert.ok(!Q.idCurto().includes('.'));
});

test('seta presa: liga dois itens e sai junto quando um é apagado', () => {
  const { c, ids } = quadroCom('processo', 'processo', 'processo');
  const s = Q.novaSeta(c, ids[0], ids[1]);
  let c2 = aplicar(c, s.mudancas);
  c2 = aplicar(c2, Q.novaSeta(c2, ids[1], ids[2]).mudancas);
  assert.equal(Q.listaSetas(c2).length, 2);
  assert.ok(Q.setaEntre(c2, ids[1], ids[0]));
  const c3 = aplicar(c2, Q.mudancasExcluir(c2, [ids[1]]));
  assert.equal(Q.listaSetas(c3).length, 0);
  assert.throws(() => Q.novaSeta(c, ids[0], ids[0]));
});

test('setas acompanham o item ao mover', () => {
  const { c, ids } = quadroCom('processo', 'processo');
  const c2 = aplicar(c, Q.novaSeta(c, ids[0], ids[1]).mudancas);
  const s = Q.listaSetas(c2)[0];
  const antes = G.pontosSeta(c2.itens[ids[0]], c2.itens[ids[1]], s).pontos;
  const c3 = aplicar(c2, Q.mudancasMover(c2, [ids[1]], 0, 200));
  const depois = G.pontosSeta(c3.itens[ids[0]], c3.itens[ids[1]], s).pontos;
  assert.notDeepEqual(antes, depois);
  const fim = depois[depois.length - 1];
  const alvo = c3.itens[ids[1]];
  assert.ok(fim.x >= alvo.x && fim.x <= alvo.x + alvo.w && fim.y >= alvo.y && fim.y <= alvo.y + alvo.h, 'ponta continua na borda do item');
});

test('excluir e desfazer devolve itens e setas', () => {
  const { c, ids } = quadroCom('postit', 'postit');
  const c2 = aplicar(c, Q.novaSeta(c, ids[0], ids[1]).mudancas);
  const est = { conteudo: c2 };
  const d = criarDiff(est, Q.noArquivo(Q.mudancasExcluir(c2, ids)));
  const apagado = aplicarDiff(est, d);
  assert.equal(Q.listaItens(apagado.conteudo).length, 0);
  assert.deepEqual(aplicarDiff(apagado, inverterDiff(d)), est);
});

test('copiar e colar: códigos novos e setas internas', () => {
  const { c, ids } = quadroCom('postit', 'postit', 'postit');
  let c2 = aplicar(c, Q.novaSeta(c, ids[0], ids[1]).mudancas);
  c2 = aplicar(c2, Q.novaSeta(c2, ids[1], ids[2]).mudancas);
  const clip = Q.copiar(c2, [ids[0], ids[1]]);
  assert.equal(clip.setas.length, 1, 'só a seta entre os copiados');
  const r = Q.colar(c2, clip);
  const c3 = aplicar(c2, r.mudancas);
  assert.equal(r.ids.length, 2);
  assert.deepEqual(r.ids.map((id) => c3.itens[id].cod).sort(), ['Q-004', 'Q-005']);
  assert.equal(Q.listaSetas(c3).length, 3);
  assert.equal(c3.itens[r.ids[0]].x, c2.itens[ids[0]].x + 24);
});

test('próximo passo cria item ligado e não sobrepõe', () => {
  const { c, ids } = quadroCom('processo');
  const r1 = Q.proximoPasso(c, ids[0], 'r');
  let c2 = aplicar(c, r1.mudancas);
  assert.equal(r1.item.tipo, 'processo');
  assert.ok(r1.item.x > c.itens[ids[0]].x + c.itens[ids[0]].w);
  assert.equal(r1.seta.de.id, ids[0]);
  const r2 = Q.proximoPasso(c2, ids[0], 'r');
  c2 = aplicar(c2, r2.mudancas);
  const a = c2.itens[r1.item.id], b = c2.itens[r2.item.id];
  assert.ok(!(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y), 'não ficou em cima do outro');
  assert.equal(Q.listaSetas(c2).length, 2);
});

test('próximo passo no fluxograma: depois de Início e de Decisão vem Processo', () => {
  const { c, ids } = quadroCom('inicio', 'decisao', 'postit', 'dados');
  assert.equal(Q.proximoPasso(c, ids[0], 'b').item.tipo, 'processo');
  assert.equal(Q.proximoPasso(c, ids[1], 'b').item.tipo, 'processo');
  assert.equal(Q.proximoPasso(c, ids[2], 'r').item.tipo, 'postit');
  assert.equal(Q.proximoPasso(c, ids[3], 'r').item.tipo, 'dados');
  assert.equal(Q.tipoDoProximo({ tipo: 'texto' }), 'processo');
});

test('Kanban: mover entre colunas e renumerar', () => {
  const { c, ids } = quadroCom('postit', 'postit', 'postit', 'processo');
  const g = Q.porColuna(c);
  assert.equal(g.c1.length, 3, 'forma não entra no Kanban');
  let c2 = aplicar(c, Q.mudancasMoverKanban(c, ids[2], 'c2', 0));
  c2 = aplicar(c2, Q.mudancasMoverKanban(c2, ids[0], 'c2', 0));
  const g2 = Q.porColuna(c2);
  assert.deepEqual(g2.c2.map((i) => i.id), [ids[0], ids[2]]);
  assert.deepEqual(g2.c1.map((i) => i.id), [ids[1]]);
  c2 = aplicar(c2, Q.mudancasMoverKanban(c2, ids[1], 'c1', 0));
  assert.equal(c2.itens[ids[1]].ko, 1);
});

test('Kanban: colunas (criar, renomear, mover, tirar só vazia)', () => {
  const { c, ids } = quadroCom('postit');
  const nova = Q.adicionarColuna(c, 'Bloqueado');
  let c2 = aplicar(c, nova.mudancas);
  assert.equal(c2.colunas.length, 4);
  c2 = aplicar(c2, Q.renomearColuna(c2, 'c2', 'Em andamento'));
  assert.equal(c2.colunas[1].nome, 'Em andamento');
  assert.match(Q.removerColuna(c2, 'c1').erro, /vazia/);
  c2 = aplicar(c2, Q.removerColuna(c2, nova.id).mudancas);
  assert.equal(c2.colunas.length, 3);
  c2 = aplicar(c2, Q.moverColuna(c2, 'c3', -1));
  assert.deepEqual(c2.colunas.map((k) => k.id), ['c1', 'c3', 'c2']);
  assert.equal(c2.itens[ids[0]].col, 'c1');
});

test('raias ficam atrás de tudo', () => {
  const { c } = quadroCom('postit');
  const c2 = aplicar(c, Q.criarRaias(c, 0, 0));
  const ordem = Q.porZ(c2);
  assert.equal(ordem.slice(0, 3).every((i) => i.tipo === 'raia'), true);
  assert.equal(ordem[3].tipo, 'postit');
});

test('frente e trás', () => {
  const { c, ids } = quadroCom('postit', 'postit', 'postit');
  let c2 = aplicar(c, Q.mudancasFrente(c, [ids[0]]));
  assert.equal(Q.porZ(c2).at(-1).id, ids[0]);
  c2 = aplicar(c2, Q.criarRaias(c2, 0, 0, ['A']));
  c2 = aplicar(c2, Q.mudancasTras(c2, [ids[2]]));
  const ordem = Q.porZ(c2);
  assert.equal(ordem[0].tipo, 'raia', 'raia continua atrás');
  assert.equal(ordem[1].id, ids[2]);
});

test('localizar e substituir (sem acento, inclui código)', () => {
  let { c, ids } = quadroCom('postit', 'postit');
  c = aplicar(c, Q.mudancasCampo(c, [ids[0]], { texto: 'Verificação do cloro' }));
  c = aplicar(c, Q.mudancasCampo(c, [ids[1]], { texto: 'Coleta de amostra' }));
  assert.deepEqual(Q.localizar(c, 'verificacao'), [ids[0]]);
  assert.deepEqual(Q.localizar(c, 'q-002'), [ids[1]]);
  const r = Q.substituirTudo(c, 'cloro', 'cloro livre');
  assert.equal(r.total, 1);
  assert.equal(aplicar(c, r.mudancas).itens[ids[0]].texto, 'Verificação do cloro livre');
});

test('conteúdo antigo da v0.2.0 abre normal', () => {
  const c = Q.normalizarQuadro({ itens: [], setas: [] });
  assert.deepEqual(c.itens, {});
  assert.equal(c.colunas.length, 3);
  const c2 = Q.normalizarQuadro({ itens: [{ id: 'a', tipo: 'postit', cod: 'Q-007' }, { id: 'b', tipo: 'xx' }], setas: [{ id: 's', de: { id: 'a' }, para: { id: 'z' } }] });
  assert.equal(Object.keys(c2.itens).length, 1);
  assert.equal(Object.keys(c2.setas).length, 0, 'seta solta sai');
  assert.equal(c2.seq, 7);
  assert.equal(Q.normalizarQuadro(null).v, 1);
});

test('geometria: lados automáticos e seta em cotovelo reta nos ângulos', () => {
  const a = { x: 0, y: 0, w: 100, h: 60 }, b = { x: 300, y: 200, w: 100, h: 60 };
  assert.deepEqual(G.escolherLados(a, b), ['r', 'l']);
  assert.deepEqual(G.escolherLados(a, { x: 0, y: 300, w: 100, h: 60 }), ['b', 't']);
  const { pontos } = G.pontosSeta(a, b, { estilo: 'cotovelo' });
  for (let i = 1; i < pontos.length; i++) assert.ok(pontos[i].x === pontos[i - 1].x || pontos[i].y === pontos[i - 1].y, 'só linhas retas');
  assert.equal(G.pontosSeta(a, b, { estilo: 'reta' }).pontos.length, 2);
  const m = G.meioDoCaminho([{ x: 0, y: 0 }, { x: 100, y: 0 }]);
  assert.deepEqual(m, { x: 50, y: 0 });
  assert.match(G.caminhoSVG(pontos), /^M/);
});

test('geometria: item de cima, seleção por área, limites e enquadrar', () => {
  const raia = { id: 'r', tipo: 'raia', x: 0, y: 0, w: 1000, h: 300, z: -5 };
  const p1 = { id: 'p1', tipo: 'postit', x: 10, y: 10, w: 100, h: 100, z: 1 };
  const p2 = { id: 'p2', tipo: 'postit', x: 50, y: 50, w: 100, h: 100, z: 2 };
  assert.equal(G.itemNoPonto([raia, p1, p2], { x: 60, y: 60 }).id, 'p2');
  assert.equal(G.itemNoPonto([raia, p1], { x: 500, y: 200 }).id, 'r');
  assert.deepEqual(G.itensNoRet([raia, p1, p2], { x: 0, y: 0, w: 60, h: 60 }).sort(), ['p1', 'p2']);
  const l = G.limites([p1, p2]);
  assert.deepEqual(l, { x: 10, y: 10, w: 140, h: 140 });
  const v = G.enquadrar(l, 800, 600);
  assert.ok(v.z <= 1.5 && v.z >= 0.2);
  assert.equal(G.limites([]), null);
});

test('PDF paisagem A4 válido, com título acentuado', async () => {
  const jpegFalso = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const bytes = montarPdfPaisagem({ titulo: 'Reunião de Qualidade — ação', direita: '25/10/2026 04:30', rodape: 'EFCdocs', jpeg: { bytes: jpegFalso, w: 1600, h: 900 } });
  const txt = new TextDecoder('latin1').decode(bytes);
  assert.ok(txt.startsWith('%PDF-1.4'));
  assert.ok(txt.includes('/MediaBox [0 0 842 595]'), 'paisagem');
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 1);
  const { width, height } = doc.getPage(0).getSize();
  assert.ok(width > height);
  assert.equal(doc.getTitle(), 'Reunião de Qualidade — ação');
  assert.equal(textoPdf('a(b)'), '(a\\(b\\))');
  assert.equal(textoPdf('ção'), '(\xE7\xE3o)');
});
