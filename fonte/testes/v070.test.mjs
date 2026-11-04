/* EFCdocs v0.7.0 — Documento (modelo, paginação, Word, PDF) e gráfico no Quadro.
   Dados inventados: nenhuma planilha nem documento da empresa entra nos testes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../src/docx/modelo.js';

const txt = (b) => D.textoDoBloco(b);

test('trechos: junta vizinhos iguais e mantém o negrito de meia palavra', () => {
  const b = D.paragrafo('Qualidade da água');
  const n = D.aplicarMarca(b, 0, 9, 'n', 1);
  assert.equal(txt(n), 'Qualidade da água');
  assert.equal(n.tr.length, 2);
  assert.equal(n.tr[0].n, 1);
  assert.equal(n.tr[0].x, 'Qualidade');
  assert.equal(n.tr[1].n, undefined);
  /* tirar a marca volta a um trecho só */
  const v = D.aplicarMarca(n, 0, 9, 'n', null);
  assert.equal(v.tr.length, 1);
});

test('marcaNoIntervalo diz se vale no pedaço todo', () => {
  const b = D.aplicarMarca(D.paragrafo('abcdef'), 2, 4, 'n', 1);
  assert.equal(D.marcaNoIntervalo(b, 2, 4, 'n'), 1);
  assert.equal(D.marcaNoIntervalo(b, 0, 6, 'n'), null);
  assert.equal(D.marcaNoIntervalo(b, 0, 2, 'n'), null);
});

test('inserir texto herda o formato de onde está o cursor', () => {
  let b = D.aplicarMarca(D.paragrafo('ab'), 0, 2, 'n', 1);
  const r = D.inserirTexto(b, 1, 'XY');
  assert.equal(txt(r.bloco), 'aXYb');
  assert.equal(r.pos, 3);
  assert.equal(r.bloco.tr.length, 1, 'tudo negrito, um trecho só');
  assert.equal(r.bloco.tr[0].n, 1);
});

test('apagar, dividir e juntar blocos', () => {
  const b = D.paragrafo('Coleta de amostra');
  assert.equal(txt(D.apagarTexto(b, 0, 7)), 'de amostra');
  const [a, d] = D.dividirBloco(b, 7);
  assert.equal(txt(a), 'Coleta ');
  assert.equal(txt(d), 'de amostra');
  const j = D.juntarBlocos(a, d);
  assert.equal(txt(j.bloco), 'Coleta de amostra');
  assert.equal(j.pos, 7);
});

test('Enter no fim de um título começa texto normal', () => {
  const h = D.titulo('Objetivo', 1);
  const [, segundo] = D.dividirBloco(h, 8);
  assert.equal(segundo.t, 'p');
  const [, meio] = D.dividirBloco(h, 3);
  assert.equal(meio.t, 'h1', 'partido no meio, continua título');
});

test('campo de formulário não é engolido pelo texto digitado ao lado', () => {
  const b = D.paragrafo('Responsável: ');
  const campo = D.campoNovo('Responsável');
  const comCampo = { ...b, tr: D.limparTrechos([...b.tr, campo]) };
  assert.equal(comCampo.tr.length, 2, 'campo vazio não é descartado');
  const depois = D.inserirTexto(comCampo, 13, 'X');
  assert.equal(depois.bloco.tr.some((t) => t.cp && t.x === ''), true, 'o campo continua lá e vazio');
  assert.equal(depois.bloco.tr.filter((t) => !t.cp).map((t) => t.x).join(''), 'Responsável: X');
  /* digitando dentro do campo, o texto fica no campo */
  const dentro = D.inserirTexto(comCampo, 13, 'Maria', D.formatoDo(campo));
  const oCampo = dentro.bloco.tr.find((t) => t.cp);
  assert.equal(oCampo.x, 'Maria');
});

test('normalizar joga fora bloco estranho e conserta medidas', () => {
  const c = D.normalizarDocumento({
    blocos: [{ t: 'p', tr: [{ x: 'ok' }] }, { t: 'inventado' }, null, { t: 'img' }, { t: 'img', src: 'data:,x', w: 2, h: -5 }],
    pag: { papel: 'nao-existe', orient: 'paisagem', margens: { e: 'x' } },
    cab: { ligado: true, rev: '', codigo: 'POP-01' },
  });
  assert.equal(c.blocos.length, 2);
  assert.equal(c.blocos[1].w, 16);
  assert.equal(c.pag.papel, 'A4');
  assert.equal(c.pag.orient, 'paisagem');
  assert.equal(c.pag.margens.e, D.MARGENS_PADRAO.e);
  assert.equal(c.cab.ligado, 1);
  assert.equal(c.cab.rev, '00');
});

test('folha deitada troca largura e altura e desconta as margens', () => {
  const f = D.folhaDe({ papel: 'A4', orient: 'paisagem', margens: { t: 2, b: 2, e: 2, d: 2 } });
  assert.ok(f.w > f.h);
  assert.equal(Math.round(f.util.w), Math.round(841.89 - 4 * D.PT_POR_CM));
});

test('contagem de palavras e peças', () => {
  const c = D.normalizarDocumento({
    blocos: [
      D.titulo('Objetivo', 1), D.paragrafo('Medir o cloro livre da água'),
      D.tabelaNova(2, 2), D.imagemNova('data:,x', 100, 80), D.assinaturaNova('Fulano'),
    ],
  });
  const n = D.contagem(c);
  assert.equal(n.palavras, 7);
  assert.equal(n.titulos, 1);
  assert.equal(n.tabelas, 1);
  assert.equal(n.imagens, 1);
  assert.equal(n.assinaturas, 1);
});

test('sumário numera os títulos por nível', () => {
  const c = D.normalizarDocumento({
    blocos: [D.titulo('Um', 1), D.titulo('Um.um', 2), D.titulo('Um.dois', 2), D.titulo('Dois', 1), D.titulo('Dois.um', 2), D.paragrafo('texto')],
  });
  const s = D.sumarioDe(c, 3);
  assert.deepEqual(s.map((x) => x.num), ['1', '1.1', '1.2', '2', '2.1']);
  assert.equal(s[1].texto, 'Um.um');
  assert.equal(D.sumarioDe(c, 1).length, 2);
});

test('lista numerada conta certo e o marcador muda com o nível', () => {
  const blocos = [
    { ...D.paragrafo('a'), t: 'ol' }, { ...D.paragrafo('b'), t: 'ol' },
    { ...D.paragrafo('c'), t: 'p' }, { ...D.paragrafo('d'), t: 'ol' },
  ];
  assert.equal(D.numeroDaLista(blocos, 0), 1);
  assert.equal(D.numeroDaLista(blocos, 1), 2);
  assert.equal(D.numeroDaLista(blocos, 3), 1, 'texto normal no meio recomeça a numeração');
  assert.equal(D.marcadorDe(0), '•');
  assert.notEqual(D.marcadorDe(1), D.marcadorDe(0));
});
