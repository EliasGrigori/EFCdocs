/* Testes da v0.6.3: Tabela, Coluna de status e Link (regras puras). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Motor } from '../src/planilha/motor.js';
import { normalizarPlanilha, planilhaVazia } from '../src/planilha/modelo.js';
import {
  formatarComoTabela, nomeDeTabelaValido, nomeNovoDeTabela, titulosDaTabela, montarStatus, areaDeStatus, urlSegura, novoLink, colocarLink, tirarLink, linkDaCelula, descreverLink, limparOpcoes,
} from '../src/planilha/inserir.js';
import { normalizarObjetos, novaImagem, novoBotao, caberImagem } from '../src/planilha/objetos.js';
import { validacaoEm, estiloCondicional } from '../src/planilha/regras.js';

function montar(linhas, extra = {}) {
  const c = planilhaVazia();
  const a = c.abas.a1;
  linhas.forEach((lin, l) => lin.forEach((v, cc) => { if (v != null) a.cel[String.fromCharCode(65 + cc) + (l + 1)] = { v }; }));
  Object.assign(a, extra);
  const n = normalizarPlanilha(c);
  const m = new Motor(n);
  return { c: n, m, valorDe: (l, cc) => m.valor('a1', l, cc) };
}
const aplicar = (c, mud) => {
  const n = JSON.parse(JSON.stringify(c));
  for (const [k, v] of Object.entries(mud)) {
    const p = k.replace(/^conteudo\./, '').split('.');
    let o = n;
    for (let i = 0; i < p.length - 1; i++) { o[p[i]] = o[p[i]] || {}; o = o[p[i]]; }
    if (v === undefined) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = v;
  }
  return n;
};

test('tabela: nome válido, nome novo e títulos únicos', () => {
  assert.ok(nomeDeTabelaValido('Vendas_2026'));
  assert.ok(!nomeDeTabelaValido('Minha tabela') && !nomeDeTabelaValido('2026') && !nomeDeTabelaValido('A1') && !nomeDeTabelaValido(''));
  const { c } = montar([['x']]);
  assert.equal(nomeNovoDeTabela(c), 'Tabela1');
  c.tabelas = { tabela1: { nome: 'Tabela1' } };
  assert.equal(nomeNovoDeTabela(c), 'Tabela2');
  assert.deepEqual(titulosDaTabela(['Nome', '', 'Nome', null]), ['Nome', 'Coluna2', 'Nome2', 'Coluna4']);
});

test('tabela: cabeçalho colorido, listras, filtro e registro em c.tabelas', () => {
  const { c, valorDe } = montar([['Nome', 'Qtd'], ['a', 1], ['b', 2], ['c', 3]]);
  const r = formatarComoTabela(c, 'a1', { l1: 0, c1: 0, l2: 3, c2: 1 }, { nome: 'Pedidos', estilo: 'azul', cabecalho: true, listras: true, filtro: true }, valorDe);
  assert.ok(r.mud, r.erro);
  const n = aplicar(c, r.mud);
  const cab = n.estilos[n.abas.a1.cel.A1.s];
  assert.equal(cab.fundo, '#1f4e79'); assert.equal(cab.b, true); assert.equal(cab.cor, '#ffffff');
  assert.equal(n.estilos[n.abas.a1.cel.A2.s].fundo, undefined, 'primeira linha de dados sem listra');
  assert.equal(n.estilos[n.abas.a1.cel.A3.s].fundo, '#e6eef7', 'segunda linha listrada');
  assert.deepEqual(n.abas.a1.fil, { fx: 'A1:B4', cr: {} });
  assert.deepEqual(n.tabelas.pedidos.cols, ['Nome', 'Qtd']);
  assert.equal(n.tabelas.pedidos.l2, 3);
  /* refazer com outro estilo troca as cores sem empilhar */
  const r2 = formatarComoTabela(n, 'a1', { l1: 0, c1: 0, l2: 3, c2: 1 }, { nome: 'Pedidos', estilo: 'verde', cabecalho: true, listras: true, filtro: false }, (l, cc) => n.abas.a1.cel[String.fromCharCode(65 + cc) + (l + 1)].v);
  assert.ok(r2.mud, r2.erro);
  const n2 = aplicar(n, r2.mud);
  assert.equal(n2.estilos[n2.abas.a1.cel.A1.s].fundo, '#2e6b4f');
  assert.equal(n2.estilos[n2.abas.a1.cel.A3.s].fundo, '#e7f3ec');
  assert.equal(Object.keys(n2.tabelas).length, 1);
});

test('tabela: recusa nome ruim, nome repetido, mescladas e área de uma linha', () => {
  const { c, valorDe } = montar([['a'], ['b']]);
  const f = { l1: 0, c1: 0, l2: 1, c2: 0 };
  assert.match(formatarComoTabela(c, 'a1', f, { nome: 'a b', estilo: 'azul', cabecalho: true }, valorDe).erro, /nome/i);
  c.tabelas = { x: { nome: 'X', aba: 'a2', l1: 0, c1: 0, l2: 1, c2: 0 } };
  assert.match(formatarComoTabela(c, 'a1', f, { nome: 'x', estilo: 'azul', cabecalho: true }, valorDe).erro, /Já existe/);
  assert.ok(formatarComoTabela(c, 'a1', { l1: 0, c1: 0, l2: 0, c2: 0 }, { nome: 'Y', estilo: 'azul', cabecalho: true }, valorDe).erro);
  c.abas.a1.mesc = ['A1:B1'];
  assert.match(formatarComoTabela(c, 'a1', f, { nome: 'Y', estilo: 'azul', cabecalho: true }, valorDe).erro, /mescl/i);
});

test('status: lista suspensa + uma cor por opção, refazer não empilha', () => {
  const { c } = montar([['Item', 'Status'], ['a'], ['b']]);
  const r = montarStatus(c, 'a1', 'B2:B3', [['OK', 'verde'], ['Pendente', 'amarelo'], ['Não, OK', 'vermelho'], ['ok', 'azul']]);
  assert.ok(r.mud, r.erro);
  assert.equal(r.opcoes, 3, 'sem vírgula e sem repetir');
  const n = aplicar(c, r.mud);
  const v = validacaoEm(n.abas.a1, 1, 1);
  assert.equal(v.t, 'list'); assert.equal(v.f1, '"OK,Pendente,Não OK"');
  assert.equal(n.abas.a1.cf.length, 3);
  assert.deepEqual(n.abas.a1.cf.map((x) => x.f1), ['"OK"', '"Pendente"', '"Não OK"']);
  const r2 = montarStatus(n, 'a1', 'B2:B3', [['Sim', 'verde'], ['Não', 'vermelho']]);
  const n2 = aplicar(n, r2.mud);
  assert.equal(n2.abas.a1.cf.length, 2, 'as regras da mesma área foram trocadas');
  assert.equal(n2.abas.a1.val.length, 1);
  assert.ok(montarStatus(c, 'a1', 'B2:B3', [['só um', 'verde']]).erro);
  assert.ok(montarStatus(c, 'a1', 'zzz', [['a', 'verde'], ['b', 'azul']]).erro);
  assert.deepEqual(limparOpcoes([['', 'verde'], ['A', 'xx']]), [{ t: 'A', tom: 'cinza' }]);
});

test('status: a cor pinta a célula quando o valor bate', () => {
  const { c } = montar([['Item', 'Status'], ['a', 'OK'], ['b', 'Não OK'], ['c', 'x']]);
  const n = aplicar(c, montarStatus(c, 'a1', 'B2:B4', [['OK', 'verde'], ['Não OK', 'vermelho']]).mud);
  const m = new Motor(n);
  assert.equal(estiloCondicional(m, n, 'a1', 1, 1).fundo, '#c6efce');
  assert.equal(estiloCondicional(m, n, 'a1', 2, 1).fundo, '#ffc7ce');
  assert.ok(!estiloCondicional(m, n, 'a1', 3, 1), 'valor fora da lista não pinta');
});

test('status: área sugerida começa embaixo do título e vai até o fim dos dados', () => {
  assert.deepEqual(areaDeStatus({ l1: 0, c1: 1, l2: 0, c2: 1 }, { l1: 0, c1: 0, l2: 9, c2: 3 }), { l1: 1, c1: 1, l2: 9, c2: 1 });
  assert.deepEqual(areaDeStatus({ l1: 4, c1: 1, l2: 4, c2: 1 }, { l1: 0, c1: 0, l2: 9, c2: 3 }), { l1: 4, c1: 1, l2: 9, c2: 1 });
  assert.deepEqual(areaDeStatus({ l1: 2, c1: 5, l2: 6, c2: 5 }, null), { l1: 2, c1: 5, l2: 6, c2: 5 });
});

test('link: só http, https, mailto e tel; esquema perigoso é recusado', () => {
  assert.equal(urlSegura('www.exemplo.com.br/a'), 'https://www.exemplo.com.br/a');
  assert.equal(urlSegura('http://x.com'), 'http://x.com');
  assert.equal(urlSegura('rui@empresa.com'), 'mailto:rui@empresa.com');
  for (const ruim of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'vbscript:x', 'texto sem ponto', '', 'a b.com']) assert.equal(urlSegura(ruim), '', ruim);
});

test('link: novo link, texto e visual entram na célula e saem sem deixar rastro', () => {
  const { c } = montar([['x'], ['y']]);
  const r = novoLink('u', { u: 'www.exemplo.com.br' }, c);
  assert.deepEqual(r.lk, { t: 'u', u: 'https://www.exemplo.com.br' });
  let n = aplicar(c, colocarLink(c, 'a1', 3, 0, r.lk, 'Site da empresa').mudancas());
  assert.equal(n.abas.a1.cel.A4.v, 'Site da empresa');
  assert.deepEqual(linkDaCelula(n.abas.a1, 3, 0), r.lk);
  assert.equal(n.estilos[n.abas.a1.cel.A4.s].u, true);
  assert.equal(descreverLink(r.lk, n), 'www.exemplo.com.br');
  n = aplicar(n, tirarLink(n, 'a1', 3, 0).mudancas());
  assert.equal(linkDaCelula(n.abas.a1, 3, 0), null);
  assert.ok(!n.abas.a1.cel.A4.s || !n.estilos[n.abas.a1.cel.A4.s].u, 'o azul sublinhado do link sai junto');
  assert.equal(n.abas.a1.cel.A4.v, 'Site da empresa', 'o texto fica');
  const interno = novoLink('a', { a: 'a1', r: 'b3' }, c);
  assert.deepEqual(interno.lk, { t: 'a', a: 'a1', r: 'B3' });
  assert.ok(novoLink('a', { a: 'nao', r: 'B3' }, c).erro && novoLink('a', { a: 'a1', r: 'xx' }, c).erro && novoLink('e', { u: 'sem-arroba' }, c).erro && novoLink('u', { u: 'javascript:1' }, c).erro);
  assert.equal(novoLink('e', { u: 'rui@empresa.com' }, c).lk.u, 'mailto:rui@empresa.com');
});

test('link: cor própria da célula é respeitada', () => {
  const { c } = montar([['x']]);
  c.estilos = [{}, { cor: '#ff0000' }];
  c.abas.a1.cel.A1.s = 1;
  const n = aplicar(c, colocarLink(c, 'a1', 0, 0, { t: 'u', u: 'https://a.com' }).mudancas());
  assert.equal(n.estilos[n.abas.a1.cel.A1.s].cor, '#ff0000');
  assert.equal(n.estilos[n.abas.a1.cel.A1.s].u, undefined);
});

test('objetos: imagem e botão são aceitos; imagem com endereço estranho e botão com cor ruim são limpos', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  const lista = normalizarObjetos([
    { id: 'i1', tipo: 'imagem', l: 1, c: 2, dx: 0, dy: 0, w: 100, h: 60, src: png, nome: 'logo' },
    { id: 'i2', tipo: 'imagem', l: 1, c: 2, w: 100, h: 60, src: 'https://x.com/a.png' },
    { id: 'i3', tipo: 'imagem', l: 1, c: 2, w: 100, h: 60, src: 'data:text/html;base64,AAAA' },
    { id: 'b1', tipo: 'botao', l: 0, c: 0, w: 150, h: 36, nome: 'Ir para o resumo', alvo: 'a2', ref: 'b3', cor: '#12ab34' },
    { id: 'b2', tipo: 'botao', l: 0, c: 0, nome: 'x', alvo: 'a1', cor: 'vermelho', ref: 'xx' },
  ]);
  assert.deepEqual(lista.map((o) => o.id), ['i1', 'b1', 'b2']);
  assert.equal(lista[1].ref, 'B3'); assert.equal(lista[1].cor, '#12ab34');
  assert.equal(lista[2].cor, undefined); assert.equal(lista[2].ref, undefined);
  assert.equal(novaImagem({ src: png, nome: 'a', w: 80.4, h: 40 }, { l: 1, c: 1 }).w, 80);
  assert.equal(novoBotao({ nome: 'Ir', alvo: 'a1', ref: 'c4' }, { l: 0, c: 0 }).ref, 'C4');
  assert.deepEqual(caberImagem(1000, 500, 360, 260), { w: 360, h: 180 });
  assert.deepEqual(caberImagem(100, 50), { w: 100, h: 50 });
});
