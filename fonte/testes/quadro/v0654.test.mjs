/* v0.6.54: contas da configuração de página do Quadro (impressaoQuadro.js). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { normalizarImpQ, ehImpQPadrao, tamanhoPapel, areaUtil, paginasDaImpressao, IMPQ_PADRAO, PX_PT } from '../../src/quadro/impressaoQuadro.js';
import { aplicarDiff, criarDiff } from '../../src/nucleo/diff.js';

const aplicar = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;
function quadro(pos) {
  let c = Q.conteudoQuadroVazio();
  const ids = [];
  for (const [x, y] of pos) { const r = Q.novoItem(c, 'postit', { x, y }); c = aplicar(c, r.mudancas); c = aplicar(c, { ['itens.' + r.item.id]: { ...c.itens[r.item.id], x, y } }); ids.push(r.item.id); }
  return { c, ids };
}

test('padrão = como antes: A4 deitado, ajustado a 1 página, com cabeçalho; valores estranhos voltam ao padrão', () => {
  assert.deepEqual(normalizarImpQ(undefined), IMPQ_PADRAO);
  assert.ok(ehImpQPadrao({}));
  assert.deepEqual(normalizarImpQ({ papel: 'A9', orient: 'torto', escala: 'x', pct: 9999, largura: -3 }), { ...IMPQ_PADRAO, pct: 400, largura: 1 });
  const P = tamanhoPapel(IMPQ_PADRAO);
  assert.ok(P.w > P.h, 'deitado');
  assert.deepEqual(tamanhoPapel({ ...IMPQ_PADRAO, orient: 'retrato' }), { w: P.h, h: P.w });
});

test('ajustar a 1 página: uma folha que o quadro enche, como antes (pequeno aumenta, grande diminui)', () => {
  const { c } = quadro([[0, 0], [200, 0]]);
  const r = paginasDaImpressao(c, {});
  assert.equal(r.paginas.length, 1);
  assert.ok(r.esc > 1, 'pequeno: aumenta para encher a folha');
  const pg = r.paginas[0];
  assert.ok(Math.abs(pg.offX) < 0.5 || Math.abs(pg.offY) < 0.5, 'encosta na largura ou na altura da área');
  const g = quadro([[0, 0], [4000, 0]]).c;
  const r2 = paginasDaImpressao(g, {});
  assert.equal(r2.paginas.length, 1);
  assert.ok(r2.esc < 0.3, 'grande: diminui para caber');
});

test('tamanho real e porcentagem dividem o quadro em folhas; N páginas de largura respeita a largura', () => {
  const { c } = quadro([[0, 0], [2400, 0]]);
  const A = areaUtil(normalizarImpQ({ escala: 'real' }));
  const real = paginasDaImpressao(c, { escala: 'real' });
  const largura = 2400 + 170 + 24;
  assert.equal(real.paginas.length, Math.ceil(largura * PX_PT / A.w));
  assert.ok(real.paginas.every((p) => p.s === PX_PT));
  assert.equal(paginasDaImpressao(c, { escala: 'pct', pct: 50 }).paginas.length, Math.ceil(largura * PX_PT * 0.5 / A.w));
  const duas = paginasDaImpressao(c, { escala: 'largura', largura: 2 });
  assert.equal(duas.paginas.length, 2);
});

test('o que imprimir: itens escolhidos e cada página numa folha', () => {
  const { c, ids } = quadro([[0, 0], [600, 0], [1200, 0]]);
  assert.equal(paginasDaImpressao(c, { alvo: 'escolhidos' }, []).paginas.length, 0);
  assert.match(paginasDaImpressao(c, { alvo: 'escolhidos' }, []).aviso, /Escolha/);
  const um = paginasDaImpressao(c, { alvo: 'escolhidos' }, [ids[1]]);
  assert.equal(um.paginas.length, 1); assert.deepEqual([...um.paginas[0].ids], [ids[1]]);
  let comPg = c;
  const pg = Q.novoItem(comPg, 'pagina', { x: -20, y: -20 }); comPg = aplicar(comPg, pg.mudancas);
  comPg = aplicar(comPg, { ['itens.' + pg.item.id]: { ...comPg.itens[pg.item.id], x: -20, y: -20, w: 500, h: 300 } });
  const r = paginasDaImpressao(comPg, {});
  assert.equal(r.paginas.length, 2, 'automático com Página: uma folha da página e outra do que ficou fora');
  assert.equal(paginasDaImpressao(comPg, { alvo: 'tudo' }).paginas.length, 1);
});

test('a configuração fica guardada no quadro', () => {
  const { c } = quadro([[0, 0]]);
  const g = aplicar(c, { impressao: { orient: 'retrato', papel: 'oficio' } });
  const reaberto = Q.normalizarQuadro(JSON.parse(JSON.stringify(g)));
  assert.equal(normalizarImpQ(reaberto.impressao).papel, 'oficio');
  assert.equal(Q.normalizarQuadro(Q.conteudoQuadroVazio()).impressao, undefined);
});
