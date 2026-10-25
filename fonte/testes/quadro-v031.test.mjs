/* Testes da v0.3.1 do quadro: tarefa/GUT, legenda, assistente, modelos, páginas e PDF de várias folhas */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../src/quadro/modelo.js';
import * as T from '../src/quadro/tarefa.js';
import { derivar, linhasLegenda, mudancasLegenda } from '../src/quadro/legenda.js';
import { problemas } from '../src/quadro/assistente.js';
import { MODELOS, aplicarModelo } from '../src/quadro/modelos.js';
import { montarPdfFolhas } from '../src/quadro/pdf.js';
import { aplicarDiff, criarDiff } from '../src/nucleo/diff.js';
import { PDFDocument } from 'pdf-lib';

const aplicar = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;
const novo = (c, tipo, campos = {}) => { const r = Q.novoItem(c, tipo, campos); return { c: aplicar(c, r.mudancas), id: r.item.id }; };
const HOJE = '2026-10-25';

/* ---------- tarefa e GUT ---------- */
test('prazo: data válida, rejeita 30/02 e formato errado', () => {
  assert.ok(T.prazoValido('2026-10-25'));
  assert.equal(T.prazoValido('2026-02-30'), false);
  assert.equal(T.prazoValido('2O26-10-25'), false, 'letra O no lugar do zero');
  assert.equal(T.prazoValido('25/10/2026'), false);
  assert.equal(T.prazoBR('2026-10-25'), '25/10/2026');
});

test('GUT: multiplica as três notas e dá o nível', () => {
  assert.equal(T.valorGut({ g: 5, u: 4, t: 4 }), 80);
  assert.equal(T.valorGut({ g: 5, u: 4 }), 0, 'falta uma nota');
  assert.equal(T.valorGut({ g: 6, u: 4, t: 4 }), 0, 'nota fora de 1 a 5');
  assert.equal(T.nivelGut(80), 'alta');
  assert.equal(T.nivelGut(64), 'alta');
  assert.equal(T.nivelGut(27), 'media');
  assert.equal(T.nivelGut(26), 'baixa');
  assert.equal(T.nivelGut(0), null);
});

test('tarefa: grava, apaga campo vazio e ignora prazo inválido', () => {
  let { c, id } = novo(Q.conteudoQuadroVazio(), 'postit');
  c = aplicar(c, T.mudancasTarefa(c, id, { resp: ' Ana ', prazo: '2026-11-01', g: '3', u: 3, t: 3 }));
  assert.equal(c.itens[id].resp, 'Ana');
  assert.equal(c.itens[id].g, 3);
  assert.ok(T.ehTarefa(c.itens[id]));
  assert.deepEqual(T.mudancasTarefa(c, id, { prazo: '2026-02-30' }), { ['itens.' + id]: (() => { const x = { ...c.itens[id] }; delete x.prazo; return x; })() }, 'prazo inválido apaga o prazo');
  c = aplicar(c, T.mudancasTarefa(c, id, { resp: '', prazo: '', g: '', u: '', t: '' }));
  assert.equal('resp' in c.itens[id], false);
  assert.equal(T.ehTarefa(c.itens[id]), false);
  assert.deepEqual(T.mudancasTarefa(c, id, { resp: '' }), {}, 'sem mudança não grava nada');
});

test('tarefa vencida: só se o prazo passou e não está na última coluna', () => {
  let { c, id } = novo(Q.conteudoQuadroVazio(), 'postit');
  c = aplicar(c, T.mudancasTarefa(c, id, { resp: 'Ana', prazo: '2026-10-01' }));
  assert.ok(T.vencida(c, c.itens[id], HOJE));
  assert.equal(T.vencida(c, c.itens[id], '2026-09-30'), false);
  const ult = c.colunas[c.colunas.length - 1].id;
  c = aplicar(c, Q.mudancasMoverKanban(c, id, ult));
  assert.ok(T.concluida(c, c.itens[id]));
  assert.equal(T.vencida(c, c.itens[id], HOJE), false, 'concluída não vence');
  const r = T.resumoTarefa(c, c.itens[id], HOJE);
  assert.equal(r.prazo, '01/10/2026');
  assert.equal(r.concluida, true);
});

test('ordenar pelo GUT: maior primeiro em cada coluna, sem nota no fim, estável', () => {
  let c = Q.conteudoQuadroVazio();
  const ids = [];
  for (const g of [{ g: 1, u: 1, t: 1 }, {}, { g: 5, u: 5, t: 5 }, { g: 3, u: 3, t: 3 }, {}]) {
    const r = novo(c, 'postit', { col: c.colunas[0].id }); c = r.c;
    c = aplicar(c, T.mudancasTarefa(c, r.id, g)); ids.push(r.id);
  }
  c = aplicar(c, T.mudancasOrdenarGut(c));
  const ordem = Q.porColuna(c)[c.colunas[0].id].map((i) => i.id);
  assert.deepEqual(ordem, [ids[2], ids[3], ids[0], ids[1], ids[4]]);
  assert.deepEqual(T.mudancasOrdenarGut(c), {}, 'já ordenado: nada a gravar');
});

/* ---------- legenda ---------- */
test('legenda: mostra só as formas usadas e muda sozinha', () => {
  let c = Q.conteudoQuadroVazio();
  let r = novo(c, 'legenda'); c = r.c; const leg = r.id;
  assert.equal(linhasLegenda(c, c.itens[leg]).length, 0);
  r = novo(c, 'inicio'); c = r.c;
  r = novo(c, 'decisao'); c = r.c;
  assert.deepEqual(linhasLegenda(c, c.itens[leg]).map((l) => l.tipo), ['inicio', 'decisao']);
  const d = derivar(c);
  assert.equal(d.itens[leg].linhas.length, 2);
  assert.ok(d.itens[leg].h > c.itens[leg].h || d.itens[leg].h > 0);
  assert.equal(c.itens[leg].linhas, undefined, 'linhas calculadas nunca são gravadas');
});

test('legenda: trocar o texto e voltar ao padrão', () => {
  let { c, id } = novo(Q.conteudoQuadroVazio(), 'legenda');
  ({ c } = novo(c, 'processo'));
  c = aplicar(c, mudancasLegenda(c, id, 'processo', 'n', 'Etapa da fazenda'));
  assert.equal(linhasLegenda(c, c.itens[id])[0].nome, 'Etapa da fazenda');
  assert.deepEqual(c.itens[id].rot, { processo: { n: 'Etapa da fazenda' } });
  c = aplicar(c, mudancasLegenda(c, id, 'processo', 'n', ''));
  assert.equal(c.itens[id].rot, undefined, 'texto vazio volta ao padrão e limpa');
  assert.deepEqual(mudancasLegenda(c, id, 'processo', 'x', 'a'), {});
});

/* ---------- assistente ---------- */
test('assistente: decisão com uma saída é erro; sem rótulo é aviso', () => {
  let c = Q.conteudoQuadroVazio();
  let r = novo(c, 'inicio'); c = r.c; const a = r.id;
  r = novo(c, 'decisao'); c = r.c; const d = r.id;
  r = novo(c, 'processo'); c = r.c; const p = r.id;
  r = novo(c, 'inicio'); c = r.c; const f = r.id;
  c = aplicar(c, Q.novaSeta(c, a, d).mudancas);
  c = aplicar(c, Q.novaSeta(c, d, p).mudancas);
  c = aplicar(c, Q.novaSeta(c, p, f).mudancas);
  let ps = problemas(c, HOJE);
  assert.equal(ps[0].nivel, 'erro');
  assert.match(ps[0].texto, /decisão/);
  assert.equal(ps[0].item, d);
  const r2 = novo(c, 'processo'); c = r2.c;
  c = aplicar(c, Q.novaSeta(c, d, r2.id).mudancas);
  ps = problemas(c, HOJE);
  assert.ok(ps.some((x) => x.id === 'decisao-rotulo:' + d && x.nivel === 'aviso'));
  assert.ok(!ps.some((x) => x.id.startsWith('decisao-saidas')));
});

test('assistente: passo solto, fluxo sem início e fim, tarefa sem responsável e vencida', () => {
  let c = Q.conteudoQuadroVazio();
  for (const t of ['processo', 'processo', 'processo']) c = novo(c, t).c;
  const ps = problemas(c, HOJE);
  assert.equal(ps.filter((x) => x.id.startsWith('solto:')).length, 3);
  assert.ok(ps.some((x) => x.id === 'inicio-fim:quadro'));

  let q = Q.conteudoQuadroVazio();
  const r = novo(q, 'postit'); q = r.c;
  q = aplicar(q, T.mudancasTarefa(q, r.id, { prazo: '2026-10-01' }));
  const pq = problemas(q, HOJE);
  assert.ok(pq.some((x) => x.id === 'sem-resp:' + r.id));
  assert.ok(pq.some((x) => x.id === 'vencida:' + r.id && x.nivel === 'erro'));
  assert.equal(pq[0].nivel, 'erro', 'erros primeiro');
  assert.deepEqual(problemas(Q.conteudoQuadroVazio(), HOJE), []);
});

/* ---------- modelos ---------- */
test('todos os modelos entram, com códigos Q em ordem e setas ligadas a itens que existem', () => {
  for (const m of MODELOS) {
    let c = Q.conteudoQuadroVazio();
    const r = aplicarModelo(c, m.id);
    c = aplicar(c, r.mudancas);
    const itens = Q.listaItens(c);
    assert.ok(itens.length >= 3, m.id);
    for (const s of Q.listaSetas(c)) {
      assert.ok(c.itens[s.de.id] && c.itens[s.para.id], m.id + ': seta solta');
    }
    const cods = itens.map((i) => i.cod).filter(Boolean);
    assert.equal(new Set(cods).size, cods.length, m.id + ': código repetido');
    assert.ok(r.ids.length > 0 && r.lim.w > 0 && r.lim.h > 0, m.id);
  }
});

test('modelo RNC: fluxo sem erro no assistente além do esperado; segundo modelo entra embaixo do primeiro', () => {
  let c = Q.conteudoQuadroVazio();
  const r = aplicarModelo(c, 'rnc');
  c = aplicar(c, r.mudancas);
  assert.equal(problemas(c, HOJE).filter((x) => x.nivel === 'erro').length, 0);
  const antes = Object.keys(c.itens).length;
  const r2 = aplicarModelo(c, 'pdca');
  c = aplicar(c, r2.mudancas);
  assert.ok(Object.keys(c.itens).length > antes);
  const maxY1 = Math.max(...r.ids.map((id) => c.itens[id].y + c.itens[id].h));
  assert.ok(r2.lim.y > maxY1, 'modelo novo entra abaixo do que já existia');
});

test('modelo Kanban cria post-its nas colunas existentes', () => {
  let c = Q.conteudoQuadroVazio();
  c = aplicar(c, aplicarModelo(c, 'kanban').mudancas);
  const cols = new Set(Q.listaItens(c).map((i) => i.col));
  assert.equal(cols.size, 3);
  for (const i of Q.listaItens(c)) assert.ok(c.colunas.some((k) => k.id === i.col));
});

/* ---------- páginas ---------- */
test('páginas: fundo, ordem de leitura e folhas do PDF', () => {
  let c = Q.conteudoQuadroVazio();
  let r = novo(c, 'postit', { x: 700, y: 20 }); c = r.c; const b = r.id;
  r = novo(c, 'postit', { x: 20, y: 20 }); c = r.c; const a = r.id;
  r = novo(c, 'postit', { x: 5000, y: 5000 }); c = r.c; const fora = r.id;
  const p2 = Q.novaPagina(c, 640, 0, 'Segunda'); c = aplicar(c, p2.mudancas);
  const p1 = Q.novaPagina(c, 0, 0, 'Primeira'); c = aplicar(c, p1.mudancas);
  assert.deepEqual(Q.paginasEmOrdem(c).map((p) => p.texto), ['Primeira', 'Segunda']);
  assert.equal(Q.porZ(c)[0].tipo === 'pagina' || Q.porZ(c)[0].tipo === 'raia', true, 'fundo desenhado primeiro');
  const f = Q.folhas(c);
  assert.deepEqual(f.map((x) => x.titulo), ['Primeira', 'Segunda', 'Fora das páginas']);
  assert.ok(f[0].ids.has(a) && !f[0].ids.has(b));
  assert.ok(f[1].ids.has(b));
  assert.ok(f[2].ids.has(fora));
  assert.equal(Q.contagem(c).paginas, 2);
  const rec = Q.recorte(c, f[0].ids);
  assert.ok(rec.itens[a] && !rec.itens[b]);
  assert.deepEqual(Q.folhas(Q.conteudoQuadroVazio()), []);
});

test('mover a página leva os itens de dentro: itensDaPagina usa o centro', () => {
  let c = Q.conteudoQuadroVazio();
  let r = novo(c, 'postit', { x: 30, y: 60 }); c = r.c;
  const p = Q.novaPagina(c, 0, 0, 'P'); c = aplicar(c, p.mudancas);
  assert.equal(Q.itensDaPagina(c, c.itens[p.item.id]).length, 1);
  assert.equal(c.itens[p.item.id].cod, undefined, 'página não ganha código Q');
});

/* ---------- PDF de várias folhas ---------- */
test('PDF com várias folhas: uma página A4 paisagem por folha', async () => {
  const jpeg = { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), w: 1600, h: 900 };
  const f = { jpeg, noTopo: false, direita: '25/10/2026' };
  const bytes = montarPdfFolhas({ titulo: 'Fluxo — Qualidade', rodape: 'EFCdocs v0.3.1', folhas: [f, f, f] });
  const doc = await PDFDocument.load(bytes);
  assert.equal(doc.getPageCount(), 3);
  const { width, height } = doc.getPage(0).getSize();
  assert.ok(width > height, 'paisagem');
});

test('raia, página e legenda não recebem seta nem "próximo passo"', () => {
  let c = Q.conteudoQuadroVazio();
  const a = novo(c, 'postit'); c = a.c;
  const pg = Q.novaPagina(c, 0, 0, 'P'); c = aplicar(c, pg.mudancas);
  const lg = novo(c, 'legenda'); c = lg.c;
  assert.throws(() => Q.novaSeta(c, a.id, pg.item.id), /não recebem seta/);
  assert.throws(() => Q.novaSeta(c, lg.id, a.id), /não recebem seta/);
  assert.equal(Q.proximoPasso(c, pg.item.id), null);
  assert.equal(Q.proximoPasso(c, lg.id), null);
});

/* ---------- texto: palavra gigante ---------- */
import { quebrarTexto } from '../src/quadro/desenho.js';
const ctxFalso = { measureText: (t) => ({ width: String(t).length * 7 }) };
test('quebra de texto: palavra maior que a caixa é cortada, mesmo depois de outras palavras', () => {
  const linhas = quebrarTexto(ctxFalso, 'Longo ' + 'a'.repeat(50) + ' fim', 70);
  assert.ok(linhas.every((l) => l.length * 7 <= 70), JSON.stringify(linhas));
  assert.equal(linhas.join('').replace(/\s/g, ''), 'Longo' + 'a'.repeat(50) + 'fim');
  assert.deepEqual(quebrarTexto(ctxFalso, 'um dois', 70), ['um dois']);
  assert.deepEqual(quebrarTexto(ctxFalso, '', 70), ['']);
});

/* ---------- desfazer: criar + escrever numa ação só ---------- */
import { novoHistorico, fazer, juntarUltimas, desfazer } from '../src/nucleo/diff.js';
test('juntarUltimas: criar e escrever viram uma ação; um desfazer volta ao estado antes de criar', () => {
  let est = { conteudo: { itens: {} } };
  let h = novoHistorico();
  const passos = [
    [{ 'conteudo.itens.a': { id: 'a', texto: '' } }, 'Novo: post-it'],
    [{ 'conteudo.itens.a': { id: 'a', texto: 'Oi' } }, 'Editar texto'],
  ];
  for (const [m, rot] of passos) { const r = fazer(h, est, criarDiff(est, m, rot)); h = r.h; est = r.estado; }
  assert.equal(h.feitos.length, 2);
  h = juntarUltimas(h);
  assert.equal(h.feitos.length, 1);
  assert.equal(h.feitos[0].rotulo, 'Novo: post-it');
  const d = desfazer(h, est);
  assert.deepEqual(d.estado.conteudo.itens, {});
  assert.equal(juntarUltimas(novoHistorico()).feitos.length, 0);
});
