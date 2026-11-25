/* v0.6.21 parte 3 · faixa igual ao Excel: Layout da Página, Dados, Revisão e Exibir (R25).
   O que dá para provar sem tela: o que cada comando e cada "comando|valor" pede, o que a lista marca e o que muda na impressão.
   Os lugares dos botões são conferidos no app de verdade por scripts/testar-faixa.mjs. Dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerPedido, tratarFaixaExtra, estadoFaixaExtra, margemDe, congeladoDe, congelarPara, AJUSTES, CONGELAR } from '../../src/planilha/faixaExtra.js';
import { normalizarImp, MARGENS, PAPEIS } from '../../src/planilha/impressao.js';
import { PorId, chegaNa } from '../../src/nucleo/comandos.js';
import { DESCRICAO } from '../../src/nucleo/dicas.js';
import { NOVOS, MAPA } from '../../src/ui/iconesFaixa.js';

/* uma planilha de mentira: guarda a impressão e o que foi pedido */
function falsa({ ativa = { l: 3, c: 2 }, faixa = { l1: 1, c1: 0, l2: 4, c2: 3 }, leitura = false } = {}) {
  const f = { imp: normalizarImp(undefined), feito: [], avisos: [], rotulos: [] };
  f.p = {
    ed: (fn) => { if (!leitura) fn(); return true; },
    get imp() { return f.imp; },
    mudarImp: (fn, rot) => { f.imp = normalizarImp(fn(f.imp)); f.rotulos.push(rot); },
    janelaImp: (s) => f.feito.push('janela:' + s), avisar: (t) => f.avisos.push(t), faixa, ativa,
    ordenar: (desc) => f.feito.push('ordenar:' + (desc ? 'za' : 'az')), limparFiltro: () => f.feito.push('limparFiltro'),
    zoom: (z) => f.feito.push('zoom:' + z), congelar: (v, rot) => { f.feito.push('congelar:' + JSON.stringify(v ?? null)); f.rotulos.push(rot); },
  };
  return f;
}

test('lerPedido: cada "comando|valor" da parte 3 e recusa valor que não existe', () => {
  assert.deepEqual(lerPedido('impressao.margens|estreita'), { fazer: 'margens', m: 'estreita' });
  assert.deepEqual(lerPedido('impressao.margens|gigante'), { fazer: 'nada' });
  assert.deepEqual(lerPedido('impressao.orientacao|paisagem'), { fazer: 'orientacao', o: 'paisagem' });
  assert.deepEqual(lerPedido('impressao.orientacao|deitada'), { fazer: 'nada' });
  assert.deepEqual(lerPedido('impressao.papel|carta'), { fazer: 'papel', p: 'carta' });
  assert.deepEqual(lerPedido('impressao.papel|A3'), { fazer: 'nada' });
  assert.deepEqual(lerPedido('impressao.ajustar|colunas'), { fazer: 'escala', modo: 'colunas' });
  assert.deepEqual(lerPedido('impressao.ajustar|pct'), { fazer: 'nada' }, 'porcentagem fica na janela');
  assert.deepEqual(lerPedido('exibir.congelar|linha'), { fazer: 'congelar', como: 'linha' });
  assert.deepEqual(lerPedido('exibir.congelar|tudo'), { fazer: 'nada' });
  assert.equal(lerPedido('exibir.congelar'), null, 'o comando puro continua abrindo a janela de sempre');
});

test('lerPedido: os comandos de impressão saíram de Planilha.jsx e continuam abrindo a mesma seção da janela', () => {
  const sec = { 'impressao.configurar': 'o-que', 'impressao.margens': 'margens', 'impressao.titulos': 'titulos', 'impressao.ajustar': 'ajustar', 'impressao.cabecalho': 'cabecalho', 'impressao.papel': 'pagina' };
  for (const [id, s] of Object.entries(sec)) assert.deepEqual(lerPedido(id), { fazer: 'janelaImp', secao: s }, id);
  assert.deepEqual(lerPedido('impressao.orientacao'), { fazer: 'orientacao', o: '' });
  assert.deepEqual(lerPedido('impressao.area'), { fazer: 'area', limpar: false });
  assert.deepEqual(lerPedido('impressao.limparArea'), { fazer: 'area', limpar: true });
  assert.deepEqual(lerPedido('impressao.quebra'), { fazer: 'quebra', tirar: false });
  assert.deepEqual(lerPedido('impressao.semQuebras'), { fazer: 'quebra', tirar: true });
  assert.deepEqual(lerPedido('impressao.grade'), { fazer: 'opcaoImp', campo: 'grade' });
  assert.deepEqual(lerPedido('impressao.titulosLC'), { fazer: 'opcaoImp', campo: 'titulos' });
  assert.deepEqual(lerPedido('dados.az'), { fazer: 'ordenar', desc: false });
  assert.deepEqual(lerPedido('dados.za'), { fazer: 'ordenar', desc: true });
  assert.deepEqual(lerPedido('dados.limparFiltro'), { fazer: 'limparFiltro' });
  assert.deepEqual(lerPedido('exibir.zoom100'), { fazer: 'zoom', z: 1 });
  assert.equal(lerPedido('arquivo.exportarPDF'), null, 'Exportar PDF e Imprimir continuam na planilha');
  assert.equal(lerPedido('dados.classificar'), null); assert.equal(lerPedido('dados.filtrar'), null);
});

test('Margens, orientação, papel e ajuste mudam só o campo certo da impressão, num passo de desfazer cada', () => {
  const f = falsa();
  tratarFaixaExtra('impressao.margens|larga', f.p);
  assert.deepEqual(f.imp.marg, { t: 2.5, b: 2.5, l: 2.5, r: 2.5, cab: 1.3, rod: 1.3 }); assert.equal(margemDe(f.imp.marg), 'larga');
  tratarFaixaExtra('impressao.orientacao|paisagem', f.p); assert.equal(f.imp.orient, 'paisagem');
  tratarFaixaExtra('impressao.orientacao', f.p); assert.equal(f.imp.orient, 'retrato', 'o comando puro alterna, como antes');
  tratarFaixaExtra('impressao.papel|oficio', f.p); assert.equal(f.imp.papel, 'oficio');
  tratarFaixaExtra('impressao.ajustar|linhas', f.p); assert.equal(f.imp.escala.modo, 'linhas');
  assert.equal(f.imp.marg.t, 2.5, 'as outras escolhas ficam');
  assert.deepEqual(f.rotulos, ['Margens largas', 'Página em paisagem', 'Página em retrato', 'Papel ' + PAPEIS.oficio.nome, AJUSTES.linhas]);
  assert.equal(f.avisos[0], 'Margens largas.');
});

test('Opções de planilha: Imprimir a grade e as letras e números ligam e desligam; a área e as quebras como antes', () => {
  const f = falsa();
  tratarFaixaExtra('impressao.grade', f.p); tratarFaixaExtra('impressao.titulosLC', f.p);
  assert.equal(f.imp.grade, true); assert.equal(f.imp.titulos, true);
  assert.equal(estadoFaixaExtra('impressao.grade', { imp: f.imp }), true);
  tratarFaixaExtra('impressao.grade', f.p); assert.equal(f.imp.grade, false);
  assert.deepEqual(f.rotulos, ['Imprimir as linhas de grade', 'Imprimir as letras e números', 'Não imprimir as linhas de grade']);
  tratarFaixaExtra('impressao.area', f.p); assert.equal(f.imp.area, 'A2:D5');
  tratarFaixaExtra('impressao.limparArea', f.p); assert.equal(f.imp.area, '');
  tratarFaixaExtra('impressao.quebra', f.p); assert.deepEqual([f.imp.qL, f.imp.qC], [[3], [2]]);
  tratarFaixaExtra('impressao.semQuebras', f.p); assert.deepEqual([f.imp.qL, f.imp.qC], [[], []]);
  const a1 = falsa({ ativa: { l: 0, c: 0 } }); tratarFaixaExtra('impressao.quebra', a1.p);
  assert.deepEqual(a1.imp.qL, []); assert.match(a1.avisos[0], /não pode ser a A1/);
});

test('Congelar painéis: linha superior, primeira coluna, até a célula, descongelar; na A1 avisa sem mudar', () => {
  assert.deepEqual(congelarPara('linha', { l: 5, c: 5 }), { l: 1, c: 0 });
  assert.deepEqual(congelarPara('coluna', { l: 5, c: 5 }), { l: 0, c: 1 });
  assert.deepEqual(congelarPara('ativa', { l: 2, c: 1 }), { l: 2, c: 1 });
  assert.equal(congelarPara('ativa', { l: 0, c: 0 }), undefined);
  assert.equal(congelarPara('nada', { l: 2, c: 1 }), undefined);
  assert.equal(congeladoDe({ l: 1, c: 0 }), 'linha'); assert.equal(congeladoDe({ l: 0, c: 1 }), 'coluna'); assert.equal(congeladoDe({ l: 3, c: 2 }), 'ativa');
  assert.equal(congeladoDe(undefined), ''); assert.equal(congeladoDe({ l: 0, c: 0 }), '');
  const f = falsa(); tratarFaixaExtra('exibir.congelar|linha', f.p); tratarFaixaExtra('exibir.congelar|nada', f.p);
  assert.deepEqual(f.feito, ['congelar:{"l":1,"c":0}', 'congelar:null']); assert.deepEqual(f.rotulos, [CONGELAR.linha, 'Descongelar painéis']);
  const a1 = falsa({ ativa: { l: 0, c: 0 } }); tratarFaixaExtra('exibir.congelar|ativa', a1.p);
  assert.deepEqual(a1.feito, []); assert.match(a1.avisos[0], /não pode ser a A1/);
});

test('A a Z, Z a A, Limpar filtro e Zoom 100% chamam a planilha; com só leitura nada muda (o zoom é só da tela)', () => {
  const f = falsa();
  for (const id of ['dados.az', 'dados.za', 'dados.limparFiltro', 'exibir.zoom100']) assert.equal(tratarFaixaExtra(id, f.p), true, id);
  assert.deepEqual(f.feito, ['ordenar:az', 'ordenar:za', 'limparFiltro', 'zoom:1']);
  const so = falsa({ leitura: true });
  for (const id of ['dados.az', 'dados.limparFiltro', 'impressao.margens|estreita', 'impressao.grade', 'exibir.congelar|linha', 'exibir.zoom100']) tratarFaixaExtra(id, so.p);
  assert.deepEqual(so.feito, ['zoom:1']); assert.equal(margemDe(so.imp.marg), 'normal'); assert.equal(so.imp.grade, false);
});

test('O que a lista marca: margem pronta, orientação, papel, ajuste e congelado', () => {
  const imp = normalizarImp(undefined);
  assert.equal(estadoFaixaExtra('valor.margens', { imp }), 'normal');
  assert.equal(estadoFaixaExtra('valor.margens', { imp: normalizarImp({ marg: { t: 3, b: 1, l: 1, r: 1 } }) }), '', 'do seu jeito: nenhuma marcada');
  assert.equal(estadoFaixaExtra('valor.orientacao', { imp }), 'retrato');
  assert.equal(estadoFaixaExtra('valor.papel', { imp }), 'A4');
  assert.equal(estadoFaixaExtra('valor.ajustar', { imp }), 'nenhum');
  assert.equal(estadoFaixaExtra('valor.ajustar', { imp: normalizarImp({ escala: { modo: 'pct', pct: 80 } }) }), '', 'porcentagem: nenhuma marcada');
  assert.equal(estadoFaixaExtra('valor.congelar', { imp, cong: { l: 1, c: 0 } }), 'linha');
  /* só lê a impressão quando o botão é dela (a planilha passa um "get imp") */
  let leu = 0; const ctx = { get imp() { leu++; return imp; }, cong: undefined };
  assert.equal(estadoFaixaExtra('formatar.negrito', ctx), undefined); assert.equal(estadoFaixaExtra('valor.congelar', ctx), ''); assert.equal(leu, 0);
  assert.deepEqual(Object.keys(MARGENS), ['normal', 'estreita', 'larga']);
});

test('Comandos novos: no catálogo, só na planilha, já funcionando, com dica e com desenho próprio', () => {
  const ids = ['dados.az', 'dados.za', 'dados.limparFiltro', 'impressao.papel', 'impressao.grade', 'impressao.titulosLC', 'exibir.zoom100'];
  for (const id of ids) {
    assert.ok(PorId[id], id); assert.deepEqual(PorId[id].mods.filter((m) => !(m === 'postits' && id === 'impressao.papel')), ['planilha'], id); /* v0.6.55: Tamanho do papel também no Quadro (Layout da Página) */ assert.equal(chegaNa(PorId[id], 'planilha'), null, id + ' já funciona');
    assert.ok((DESCRICAO[id] || '').length > 20, 'sem dica: ' + id); assert.ok(NOVOS[MAPA[id]], 'sem desenho: ' + id);
  }
  assert.equal(new Set(ids.map((id) => MAPA[id])).size, ids.length, 'um desenho para cada');
});
