/* Testes do núcleo (rodam no Node: node --test testes/) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pegar, por, criarDiff, aplicarDiff, inverterDiff, diffVazio, novoHistorico, fazer, desfazer, refazer, podeDesfazer, podeRefazer, rotuloDesfazer } from '../src/nucleo/diff.js';
import { compactar, descompactar, tamanhoLegivel } from '../src/nucleo/compacta.js';
import { criarBanco, bancoNaMemoria, LIMITE_DEMO } from '../src/nucleo/banco.js';
import { criarArquivo, validarNome, carimbar, ativos, naLixeira, maisRecentes, novoId, VERSAO, TIPOS } from '../src/nucleo/modelo.js';
import { COMANDOS, PorId, chegaNa, valeNoModulo, buscarComandos, versaoMaior } from '../src/nucleo/comandos.js';
import { pode, PERFIS, MATRIZ } from '../src/nucleo/perfis.js';
import { normalizarPrefs, prefsPadrao, TEMAS, AMOSTRAS } from '../src/nucleo/prefs.js';
import { ehDemo, chave, ler, gravar } from '../src/nucleo/armazem.js';

test('versão é v0.4.9', () => assert.equal(VERSAO, 'v0.4.9'));

test('pegar e por não mexem no original', () => {
  const o = { a: { b: 1 } };
  const n = por(o, 'a.b', 2);
  assert.equal(o.a.b, 1);
  assert.equal(n.a.b, 2);
  assert.equal(pegar(n, 'a.b'), 2);
  assert.equal(pegar(n, 'x.y'), undefined);
  assert.deepEqual(por(n, 'a.b', undefined), { a: {} });
});

test('diff guarda só o que mudou e se inverte', () => {
  const e = { ficha: { nome: 'A' }, conteudo: { itens: { p1: { x: 1 } } } };
  const d = criarDiff(e, { 'ficha.nome': 'B', 'conteudo.itens.p1': { x: 1 } }, 'Renomear');
  assert.equal(d.ops.length, 1);
  const e2 = aplicarDiff(e, d);
  assert.equal(e2.ficha.nome, 'B');
  assert.deepEqual(aplicarDiff(e2, inverterDiff(d)), e);
  assert.ok(diffVazio(criarDiff(e, { 'ficha.nome': 'A' })));
});

test('diff apaga e recria item (desfazer de excluir)', () => {
  const e = { conteudo: { itens: { p1: { x: 1 } } } };
  const d = criarDiff(e, { 'conteudo.itens.p1': undefined });
  const e2 = aplicarDiff(e, d);
  assert.deepEqual(e2.conteudo.itens, {});
  assert.deepEqual(aplicarDiff(e2, inverterDiff(d)), e);
});

test('histórico: fazer, desfazer, refazer e limite', () => {
  let h = novoHistorico(3);
  let e = { n: 0 };
  for (let i = 1; i <= 5; i++) ({ h, estado: e } = fazer(h, e, criarDiff(e, { n: i }, 'passo ' + i)));
  assert.equal(h.feitos.length, 3);
  assert.equal(rotuloDesfazer(h), 'passo 5');
  ({ h, estado: e } = desfazer(h, e));
  assert.equal(e.n, 4);
  assert.ok(podeRefazer(h));
  ({ h, estado: e } = refazer(h, e));
  assert.equal(e.n, 5);
  ({ h, estado: e } = fazer(h, e, criarDiff(e, { n: 5 })));
  assert.ok(podeDesfazer(h));
  const r = desfazer(novoHistorico(), e);
  assert.equal(r.diff, null);
});

test('nova ação apaga o refazer', () => {
  let h = novoHistorico();
  let e = { n: 0 };
  ({ h, estado: e } = fazer(h, e, criarDiff(e, { n: 1 })));
  ({ h, estado: e } = desfazer(h, e));
  ({ h, estado: e } = fazer(h, e, criarDiff(e, { n: 2 })));
  assert.equal(podeRefazer(h), false);
});

test('compactação ida e volta; minúsculo fica em texto', async () => {
  const grande = { itens: Array.from({ length: 300 }, (_, i) => ({ id: 'p' + i, texto: 'Verificar cloro livre no packing house', x: i, y: i * 2 })) };
  const p = await compactar(grande);
  assert.equal(p.fmt, 'gzip');
  assert.ok(p.bytesFinal * 5 < p.bytesOriginal, 'compactou pelo menos 5x');
  assert.deepEqual(await descompactar(p), grande);
  const pequeno = await compactar({ a: 1 });
  assert.equal(pequeno.fmt, 'json');
  assert.deepEqual(await descompactar(pequeno), { a: 1 });
  assert.equal(tamanhoLegivel(512), '512 B');
  assert.equal(tamanhoLegivel(1536), '1,5 KB');
});

test('arquivo novo: ficha completa e conteúdo do quadro', () => {
  const a = criarArquivo({ tipo: 'postits', agora: '2026-10-25T10:00:00.000Z' });
  assert.equal(a.ficha.nome, 'Quadro sem título');
  assert.equal(a.ficha.status, 'rascunho');
  assert.deepEqual(a.conteudo.itens, {});
  assert.equal(a.conteudo.colunas.length, 3);
  assert.throws(() => criarArquivo({ tipo: 'xx' }));
  assert.equal(TIPOS.postits.chega, null);
  assert.equal(carimbar(a, 'eu', 'X').ficha.alteradoEm, 'X');
  assert.notEqual(novoId(), novoId());
});

test('validar nome', () => {
  assert.equal(validarNome('  '), 'Digite um nome.');
  assert.match(validarNome('a/b'), /Não use/);
  assert.match(validarNome('x'.repeat(121)), /120/);
  assert.equal(validarNome('Reunião de qualidade'), '');
});

test('listas: ativos, lixeira, recentes', () => {
  const f = [{ id: 1, status: 'rascunho', alteradoEm: '2026-01-01' }, { id: 2, status: 'lixeira', alteradoEm: '2026-03-01' }, { id: 3, status: 'rascunho', alteradoEm: '2026-02-01' }];
  assert.deepEqual(ativos(f).map((x) => x.id), [1, 3]);
  assert.deepEqual(naLixeira(f).map((x) => x.id), [2]);
  assert.deepEqual(maisRecentes(f).map((x) => x.id), [2, 3, 1]);
});

test('banco: criar, abrir, lixeira, restaurar, excluir de vez e histórico', async () => {
  const b = criarBanco({ backend: bancoNaMemoria() });
  const a = criarArquivo({ tipo: 'postits' });
  await b.criar(a);
  const ab = await b.abrir(a.ficha.id);
  assert.deepEqual(ab.conteudo, a.conteudo);
  await assert.rejects(() => b.excluirDeVez(a.ficha.id));
  await b.mandarParaLixeira(a.ficha.id);
  await b.restaurar(a.ficha.id);
  await b.mandarParaLixeira(a.ficha.id);
  assert.ok(await b.excluirDeVez(a.ficha.id));
  assert.equal(await b.abrir(a.ficha.id), null);
  const ev = (await b.eventos()).map((e) => e.acao);
  assert.deepEqual(ev, ['criou', 'lixeira', 'restaurou', 'lixeira', 'excluiu']);
});

test('demo guarda no máximo 3 arquivos', async () => {
  const b = criarBanco({ demo: true, backend: bancoNaMemoria() });
  for (let i = 0; i < LIMITE_DEMO; i++) await b.criar(criarArquivo({ tipo: 'postits' }));
  await assert.rejects(() => b.criar(criarArquivo({ tipo: 'postits' })), /até 3/);
});

test('comandos: ids únicos e ícone em todos', () => {
  const ids = COMANDOS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of COMANDOS) assert.ok(c.ic, c.id);
});

test('comandos da planilha chegam na v0.4.0 (menos os das próximas versões)', () => {
  for (const id of ['editar.colar', 'formatar.negrito', 'formatar.moeda', 'formatar.bordas', 'formula.inserir', 'formula.autosoma', 'formula.origem', 'exibir.congelar', 'exibir.grade', 'exibir.zoom'])
    assert.equal(chegaNa(PorId[id], 'planilha'), null, id);
  for (const id of ['formula.explicar', 'formula.fluxo', 'formula.problemas', 'formula.montar']) assert.equal(chegaNa(PorId[id], 'planilha'), null, id + ' já funciona na v0.4.3');
  assert.equal(chegaNa(PorId['formatar.condicional'], 'planilha'), 'v0.6.0');
  assert.equal(chegaNa(PorId['arquivo.exportarExcel'], 'planilha'), 'v0.5.0');
});

test('comandos do quadro continuam funcionando', () => {
  for (const id of ['inserir.postit', 'inserir.seta', 'organizar.kanban', 'arquivo.exportarPDF', 'arquivo.exportarImagem', 'editar.colar', 'exibir.zoom', 'exibir.minimapa', 'organizar.temporizador'])
    assert.equal(chegaNa(PorId[id], 'postits'), null, id);
  assert.equal(chegaNa(PorId['arquivo.exportarPDF'], 'planilha'), 'v0.5.0');
  assert.equal(chegaNa(PorId['inserir.grafico'], 'postits'), 'v0.6.0');
  assert.equal(chegaNa(PorId['dados.dinamica'], 'planilha'), 'depois da v1.0.0');
  assert.ok(versaoMaior('v0.10.0', 'v0.9.0'));
  assert.ok(!versaoMaior('v0.4.3', 'v0.4.3.1') && versaoMaior('v0.4.4', 'v0.4.3.1') && versaoMaior('v0.4.3.2', 'v0.4.3.1'), 'versões com 4 números');
  assert.equal(versaoMaior('v0.3.2', 'v0.3.2'), false);
});

test('comandos por módulo', () => {
  assert.ok(valeNoModulo(PorId['inserir.postit'], 'postits'));
  assert.equal(valeNoModulo(PorId['inserir.postit'], 'planilha'), false);
  assert.equal(valeNoModulo(PorId['editar.desfazer'], null), false);
  assert.ok(valeNoModulo(PorId['app.opcoes'], null));
});

test('busca de comandos por nome e sinônimo, sem acento', () => {
  assert.equal(buscarComandos('post-it', 'postits')[0].id, 'inserir.postit');
  assert.ok(buscarComandos('losango', 'postits').some((c) => c.id === 'inserir.decisao'));
  assert.ok(buscarComandos('reuniao', 'postits').some((c) => c.id === 'organizar.temporizador'));
  assert.ok(buscarComandos('esconder faixa', null).some((c) => c.id === 'exibir.faixaOculta'));
  assert.equal(buscarComandos('xyzw', null).length, 0);
  assert.ok(buscarComandos('', 'postits').every((c) => chegaNa(c, 'postits') === null));
});

test('perfis: matriz e dono', () => {
  assert.equal(Object.keys(PERFIS).length, 4);
  assert.ok(pode('admin', 'revisao.aprovar'));
  assert.equal(pode('editor', 'revisao.aprovar'), false);
  assert.ok(pode('operador', 'quadro.editar'));
  assert.equal(pode('leitor', 'quadro.editar'), false);
  assert.ok(pode('operador', 'arquivo.renomear', { usuario: 'a', criadoPor: 'a' }));
  assert.equal(pode('operador', 'arquivo.renomear', { usuario: 'a', criadoPor: 'b' }), false);
  assert.equal(pode('admin', 'nao.existe'), false);
  for (const linha of Object.values(MATRIZ)) assert.deepEqual(Object.keys(linha).sort(), Object.keys(PERFIS).sort());
});

test('preferências: padrão, tema Papel e valores inválidos', () => {
  assert.equal(prefsPadrao(false).tema, 'papel', 'v0.4.8 (L01): o tema claro Papel é o padrão');
  assert.equal(prefsPadrao(true).tema, 'papel');
  assert.equal(prefsPadrao(false).mesa, true, 'v0.4.8: papel sobre a mesa ligado');
  assert.equal(normalizarPrefs({ tema: 'light' }).tema, 'light', 'quem escolheu Claro continua no Claro');
  assert.equal(normalizarPrefs({ tema: 'petroleo' }).tema, 'petroleo');
  const p = normalizarPrefs({ tema: 'xx', faixa: 'nada', relevo: false, menu: 'icones' });
  assert.equal(p.tema, 'papel');
  assert.equal(p.faixa, 'tudo');
  assert.equal(p.relevo, false);
  assert.equal(p.menu, 'icones');
  assert.equal(TEMAS.length, 18);
  for (const [id] of TEMAS) assert.ok(AMOSTRAS[id], id);
});

test('armazém: chaves separadas na demo', () => {
  const m = new Map();
  const armazem = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
  assert.ok(gravar('prefs', { a: 1 }, { armazem, demo: false }));
  gravar('prefs', { a: 2 }, { armazem, demo: true });
  assert.deepEqual(ler('prefs', null, { armazem, demo: false }), { a: 1 });
  assert.deepEqual(ler('prefs', null, { armazem, demo: true }), { a: 2 });
  assert.equal(chave('x', true), 'efcdocs-demo:x');
  assert.ok(ehDemo('https://a/b/?demo=1'));
  assert.equal(ehDemo('https://a/b/'), false);
});

test('v0.4.1: duas abas gravando o mesmo arquivo: a segunda gravação com marca velha não passa', async () => {
  const b = criarBanco({ backend: bancoNaMemoria() });
  const a = criarArquivo({ tipo: 'planilha' });
  await b.criar(a);
  const aba1 = (await b.abrir(a.ficha.id)).marca;
  const aba2 = (await b.abrir(a.ficha.id)).marca;
  assert.equal(aba1, aba2);
  const g1 = await b.salvar({ ...a, ficha: { ...a.ficha, nome: 'Da aba 1' } }, 'salvou', aba1);
  assert.ok(g1.marca && !g1.conflito);
  const g2 = await b.salvar({ ...a, ficha: { ...a.ficha, nome: 'Da aba 2' } }, 'salvou', aba2);
  assert.equal(g2.conflito, true);
  assert.equal((await b.abrir(a.ficha.id)).ficha.nome, 'Da aba 1');
  /* "Gravar a minha por cima" grava sem conferir a marca */
  const g3 = await b.salvar({ ...a, ficha: { ...a.ficha, nome: 'Da aba 2' } }, 'salvou');
  assert.ok(g3.marca);
  assert.equal((await b.abrir(a.ficha.id)).ficha.nome, 'Da aba 2');
});

test('v0.4.9 (L09): temas claros e escuros pelo fundo; os principais têm 3 de cada', async () => {
  const { ehTemaClaro, TEMAS, TEMAS_DESTAQUE } = await import('../src/nucleo/prefs.js');
  const claros = TEMAS.filter(([id]) => ehTemaClaro(id)).map(([id]) => id);
  const escuros = TEMAS.filter(([id]) => !ehTemaClaro(id)).map(([id]) => id);
  assert.equal(claros.length + escuros.length, 18);
  for (const id of ['papel', 'light', 'campo', 'nevoa']) assert.ok(claros.includes(id), id + ' devia ser claro');
  for (const id of ['dark', 'ocean', 'petroleo', 'ouro']) assert.ok(escuros.includes(id), id + ' devia ser escuro');
  assert.equal(TEMAS_DESTAQUE.filter((id) => ehTemaClaro(id)).length, 3);
  assert.equal(TEMAS_DESTAQUE.filter((id) => !ehTemaClaro(id)).length, 3);
});
