/* Testes da v0.4.5: Assinatura (nome, medidas, traços, foto → rubrica) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../src/nucleo/assinatura.js';

/* ---------- nome ---------- */
test('nome: limpa espaços, corta em 120 e exige algo escrito', () => {
  assert.equal(A.limparNome('  José   Elias \n Florêncio  Beserra '), 'José Elias Florêncio Beserra');
  assert.equal(A.limparNome('x'.repeat(300)).length, A.ASN.NOME_MAX);
  assert.equal(A.limparNome(null), '');
  assert.notEqual(A.avisoNome('   '), '', 'vazio impede');
  assert.equal(A.avisoNome('Maria Souza'), '');
});

test('nome: uma palavra só avisa que não é o nome completo; "de" não conta como palavra', () => {
  assert.equal(A.nomeIncompleto('Elias'), true);
  assert.equal(A.nomeIncompleto('Elias Beserra'), false);
  assert.equal(A.nomeIncompleto('Elias de'), true, '"de" liga nomes, não é um nome');
  assert.equal(A.nomeIncompleto('José de Souza'), false);
});

/* ---------- rubrica guardada ---------- */
test('rubrica guardada: só PNG em texto e de tamanho razoável', () => {
  const ok = 'data:image/png;base64,' + 'A'.repeat(100);
  assert.equal(A.rubricaValida(ok), true);
  assert.equal(A.rubricaValida('https://exemplo.com/a.png'), false, 'nunca um endereço de fora');
  assert.equal(A.rubricaValida('data:image/svg+xml;base64,' + 'A'.repeat(100)), false);
  assert.equal(A.rubricaValida('data:image/png;base64,' + 'A'.repeat(A.ASN.RUB_BYTES)), false, 'grande demais');
  assert.equal(A.rubricaValida(null), false);
  assert.deepEqual(A.limparAssinatura({ texto: ' Ana  Lima ', rub: 'lixo' }), { nome: 'Ana Lima' });
  assert.deepEqual(A.limparAssinatura({ nome: 'Ana Lima', rub: ok }), { nome: 'Ana Lima', rub: ok });
});

/* ---------- medidas ---------- */
test('medidas: a linha fica acima da faixa do nome e a rubrica cabe acima dela', () => {
  const m = A.medidas(280, 96, 'José Elias Florêncio Beserra');
  assert.equal(m.linhaY, 96 - m.faixa);
  assert.ok(m.nomeY > m.linhaY && m.nomeY < 96);
  assert.ok(m.caixaRub.y + m.caixaRub.h <= m.linhaY + 4, 'a rubrica encosta na linha');
  const pequeno = A.medidas(140, 64, 'Ana');
  assert.ok(pequeno.faixa >= 20 && pequeno.linhaY > 20);
});

test('letra do nome: encolhe com o nome, nunca abaixo de 9 nem acima de 14', () => {
  assert.equal(A.fonteDoNome('Ana', 268), 14);
  assert.ok(A.fonteDoNome('x'.repeat(40), 268) < 14);
  assert.equal(A.fonteDoNome('x'.repeat(120), 268), 9);
});

test('rubrica encaixada: cabe inteira, centrada e apoiada na linha', () => {
  const r = A.encaixarRubrica(600, 200, { x: 8, y: 2, w: 264, h: 70 });
  assert.ok(r.w <= 264 + 1e-9 && r.h <= 70 + 1e-9);
  assert.ok(Math.abs(r.y + r.h - 72) < 1e-9, 'apoiada embaixo');
  assert.ok(Math.abs(r.x + r.w / 2 - 140) < 1e-9, 'centrada');
  assert.equal(A.encaixarRubrica(0, 10, { x: 0, y: 0, w: 10, h: 10 }), null);
});

/* ---------- traços ---------- */
test('traços: tira pontos repetidos, mantém o último e faz curva suave', () => {
  const pts = [{ x: 0, y: 0 }, { x: 0.2, y: 0 }, { x: 0.4, y: 0 }, { x: 5, y: 0 }, { x: 10, y: 4 }];
  const s = A.simplificar(pts, 1.2);
  assert.deepEqual(s.map((p) => p.x), [0, 5, 10]);
  assert.deepEqual(A.simplificar([{ x: 1, y: 1 }]), [{ x: 1, y: 1 }]);
  const ops = A.caminhoSuave([{ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 20, y: 0 }, { x: 30, y: 10 }]);
  assert.equal(ops[0].op, 'M');
  assert.ok(ops.slice(1, -1).every((o) => o.op === 'Q'));
  assert.equal(ops[ops.length - 1].op, 'L');
  assert.deepEqual(A.caminhoSuave([{ x: 3, y: 4 }]), [{ op: 'P', x: 3, y: 4 }], 'um toque vira ponto');
  assert.deepEqual(A.caminhoSuave([]), []);
});

test('traços: caixa que envolve tudo e fator para caber em 600 x 200', () => {
  assert.equal(A.limitesTracos([]), null);
  const lim = A.limitesTracos([{ pontos: [{ x: 10, y: 20 }, { x: 110, y: 60 }] }, { pontos: [{ x: 50, y: 5 }] }], 4);
  assert.ok(lim.x < 10 && lim.y < 5 && lim.x + lim.w > 110 && lim.y + lim.h > 60);
  assert.equal(A.fatorDaRubrica({ w: 100, h: 40 }), 2, 'desenho pequeno sobe no máximo 2x');
  assert.ok(Math.abs(A.fatorDaRubrica({ w: 1200, h: 100 }) - 0.5) < 1e-9);
  assert.equal(A.fatorDaRubrica(null), 1);
});

/* ---------- foto → rubrica ---------- */
/** Folha branca com sombra suave (mais escura à direita), um rabisco azul-escuro e poeira. */
function folhaDeTeste(w, h, { poeira = true } = {}) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const papel = 245 - Math.round((x / w) * 60); // 245 → 185
    const i = (y * w + x) * 4;
    rgba[i] = papel; rgba[i + 1] = papel; rgba[i + 2] = papel; rgba[i + 3] = 255;
  }
  const tinta = (x, y, v = 40) => { const i = (y * w + x) * 4; rgba[i] = v; rgba[i + 1] = v; rgba[i + 2] = v + 30; };
  /* traço grosso de 3 px, em onda, no meio da folha */
  for (let x = Math.round(w * 0.3); x < Math.round(w * 0.7); x++) {
    const y = Math.round(h * 0.5 + Math.sin(x / 9) * 10);
    for (let d = -1; d <= 1; d++) tinta(x, y + d);
  }
  if (poeira) for (const [px, py] of [[5, 5], [w - 6, 8], [10, h - 7]]) { tinta(px, py, 90); }
  return rgba;
}

test('foto: acha a tinta, ignora sombra do papel e poeira, e devolve PNG-pronto com fundo transparente', () => {
  const w = 300, h = 160;
  const esc = A.escuridaoLocal(folhaDeTeste(w, h), w, h);
  const r = A.rubricaDaFoto(esc, w, h, { tinta: '#1d3a8a' });
  assert.ok(r, 'achou o traço');
  assert.ok(r.w >= 100 && r.w <= 130, 'largura do rabisco (~120 px): ' + r.w);
  assert.ok(r.h < 60, 'a poeira dos cantos não aumentou a caixa: ' + r.h);
  assert.equal(r.rgba.length, r.w * r.h * 4);
  let tintaPx = 0, transp = 0;
  for (let i = 0; i < r.w * r.h; i++) { if (r.rgba[i * 4 + 3] > 200) tintaPx++; if (r.rgba[i * 4 + 3] === 0) transp++; }
  assert.ok(tintaPx > 100, 'há tinta');
  assert.ok(transp > r.w * r.h * 0.4, 'o fundo é transparente');
  assert.deepEqual([r.rgba[0], r.rgba[1], r.rgba[2]], [29, 58, 138], 'cor da tinta escolhida');
});

test('foto: folha em branco não tem rubrica; o controle de traço muda o corte', () => {
  const w = 120, h = 80;
  const branca = new Uint8ClampedArray(w * h * 4).fill(240);
  const esc = A.escuridaoLocal(branca, w, h);
  assert.equal(A.rubricaDaFoto(esc, w, h), null);
  assert.ok(A.corteDoControle(100) < A.corteDoControle(0), 'mais traço = corte menor');
  assert.equal(A.controleDoCorte(A.corteDoControle(37)), 37);
  const corte = A.corteAutomatico(A.escuridaoLocal(folhaDeTeste(300, 160), 300, 160));
  assert.ok(corte >= A.CORTE_MIN && corte <= A.CORTE_MAX);
});

test('foto: foto grande é reduzida para caber em 600 x 200', () => {
  const alfa = new Uint8Array(1200 * 400).fill(255);
  const r = A.reduzirAlfa(alfa, 1200, 400);
  assert.deepEqual([r.w, r.h], [600, 200]);
  assert.equal(r.alfa[0], 255);
  const peq = A.reduzirAlfa(new Uint8Array(50 * 20), 50, 20);
  assert.deepEqual([peq.w, peq.h], [50, 20], 'não aumenta');
});

test('foto: manchinhas soltas somem, o traço comprido fica', () => {
  const w = 40, h = 20;
  const alfa = new Uint8Array(w * h);
  for (let x = 5; x < 35; x++) alfa[10 * w + x] = 255; // traço de 30 px
  alfa[2 * w + 2] = 255; alfa[2 * w + 3] = 255; // poeira de 2 px
  A.tirarPontinhos(alfa, w, h, 14);
  assert.equal(alfa[2 * w + 2], 0);
  assert.equal(alfa[10 * w + 20], 255);
});

/* ---------- quadro: peça assinatura ---------- */
import * as Q from '../src/quadro/modelo.js';
import { COMANDOS, PorId, chegaNa, valeNoModulo } from '../src/nucleo/comandos.js';
import { normalizarPlanilha, planilhaVazia, eixo, ALT_PADRAO, LARG_PADRAO } from '../src/planilha/modelo.js';
import * as OB from '../src/planilha/objetos.js';
import * as O from '../src/planilha/operacoes.js';
import { geometria } from '../src/planilha/grade.js';
import { MAX_LIN, MAX_COL } from '../src/planilha/ref.js';
import { aplicarDiff, criarDiff } from '../src/nucleo/diff.js';

const RUB = 'data:image/png;base64,' + 'iVBORw0KGgo'.repeat(10);
const aplicarQ = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;

test('quadro: assinatura nova tem o tamanho padrão, nome no texto e não ganha código Q', () => {
  const c = Q.conteudoQuadroVazio();
  const r = Q.novoItem(c, 'assinatura', { x: 10, y: 20, texto: 'Ana Lima', rub: RUB });
  assert.equal(r.item.w, A.ASN.W);
  assert.equal(r.item.h, A.ASN.H);
  assert.equal(r.item.cod, undefined, 'assinatura não é item do fluxo');
  assert.equal(r.mudancas.seq, undefined);
  const c2 = aplicarQ(c, r.mudancas);
  assert.equal(c2.itens[r.item.id].rub, RUB);
});

test('quadro: ao abrir o arquivo, rubrica que não é PNG em texto é descartada e o tamanho mínimo vale', () => {
  const lixo = { v: 1, itens: {
    a: { id: 'a', tipo: 'assinatura', x: 0, y: 0, w: 10, h: 10, z: 1, texto: '  Ana   Lima ', rub: 'https://exemplo.com/x.png' },
    b: { id: 'b', tipo: 'assinatura', x: 0, y: 0, w: 280, h: 96, z: 2, texto: 'Bia Souza', rub: RUB },
  }, setas: {}, colunas: [], seq: 0 };
  const c = Q.normalizarQuadro(lixo);
  assert.equal(c.itens.a.texto, 'Ana Lima');
  assert.equal(c.itens.a.rub, undefined);
  assert.equal(c.itens.a.w, A.ASN.W_MIN);
  assert.equal(c.itens.a.h, A.ASN.H_MIN);
  assert.equal(c.itens.b.rub, RUB, 'rubrica boa fica');
});

test('quadro: duplicar leva a rubrica; colar algo de fora com rubrica estranha não leva', () => {
  let c = Q.conteudoQuadroVazio();
  const r = Q.novoItem(c, 'assinatura', { texto: 'Ana Lima', rub: RUB });
  c = aplicarQ(c, r.mudancas);
  const dup = Q.colar(c, Q.copiar(c, [r.item.id]));
  const novo = dup.mudancas['itens.' + dup.ids[0]];
  assert.equal(novo.rub, RUB);
  assert.notEqual(novo.id, r.item.id);
  const forjado = { itens: [{ id: 'z', tipo: 'assinatura', x: 0, y: 0, w: 280, h: 96, z: 1, texto: 'X Y', rub: 'javascript:alert(1)' }], setas: [] };
  const col = Q.colar(c, forjado);
  assert.equal(col.mudancas['itens.' + col.ids[0]].rub, undefined);
});

test('comando Assinatura: liga no quadro e na planilha agora; no Docx só na v0.7.0', () => {
  const cmd = PorId['inserir.assinatura'];
  assert.equal(chegaNa(cmd, 'postits'), null);
  assert.equal(chegaNa(cmd, 'planilha'), null);
  assert.equal(chegaNa(cmd, 'docx'), 'v0.7.0');
  for (const m of ['postits', 'planilha', 'docx']) assert.equal(valeNoModulo(cmd, m), true, m);
  assert.equal(cmd.acao, 'quadro.editar', 'o Leitor não insere');
  assert.equal(COMANDOS.filter((x) => x.id === 'inserir.assinatura').length, 1);
});

/* ---------- planilha: objetos sobre a grade ---------- */
const abaComObjs = (objs) => ({ ...planilhaVazia(), abas: { a1: { id: 'a1', nome: 'Planilha1', cel: {}, objs } } });
const obj = (o = {}) => ({ id: 'o1', tipo: 'assinatura', l: 5, c: 2, dx: 4, dy: 4, w: 280, h: 96, nome: 'Ana Lima', rub: RUB, ...o });

test('planilha: ao abrir, descarta objeto quebrado, rubrica de fora e passa do limite (v0.6.5: 400)', () => {
  const lista = [obj(), { id: 'x', tipo: 'xyz', l: 0, c: 0 }, obj({ id: 'o2', rub: 'http://x/y.png', nome: '  Bia   Souza ', w: 5, h: 5 }), obj({ id: 'o1' }), null];
  const c = normalizarPlanilha(abaComObjs(lista));
  const objs = c.abas.a1.objs;
  assert.deepEqual(objs.map((o) => o.id), ['o1', 'o2'], 'tipo errado, duplicado e nulo saem');
  assert.equal(objs[1].rub, undefined);
  assert.equal(objs[1].nome, 'Bia Souza');
  assert.equal(objs[1].w, A.ASN.W_MIN);
  const muitos = Array.from({ length: OB.MAX_OBJETOS + 20 }, (_, i) => obj({ id: 'k' + i }));
  assert.equal(OB.normalizarObjetos(muitos).length, OB.MAX_OBJETOS);
  assert.equal(normalizarPlanilha(abaComObjs([])).abas.a1.objs, undefined, 'lista vazia não fica no arquivo');
  assert.equal(OB.novaAssinatura({ nome: ' Ana  Lima ', rub: 'x' }, { l: 1, c: 1 }).rub, undefined);
});

test('planilha: inserir e excluir linhas e colunas leva a assinatura junto', () => {
  let c = normalizarPlanilha(abaComObjs([obj({ l: 5, c: 2 })]));
  const apl = (mud) => { c = aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, mud)).conteudo; };
  const pos = () => [c.abas.a1.objs[0].l, c.abas.a1.objs[0].c];
  apl(O.estrutura(c, 'a1', 'l', 2, 3)); // 3 linhas acima
  assert.deepEqual(pos(), [8, 2]);
  apl(O.estrutura(c, 'a1', 'l', 20, 1)); // linha abaixo: não mexe
  assert.deepEqual(pos(), [8, 2]);
  apl(O.estrutura(c, 'a1', 'l', 0, -2)); // exclui 2 linhas acima
  assert.deepEqual(pos(), [6, 2]);
  apl(O.estrutura(c, 'a1', 'c', 0, 1)); // coluna nova antes
  assert.deepEqual(pos(), [6, 3]);
  apl(O.estrutura(c, 'a1', 'c', 3, -1)); // exclui a coluna onde ela está: fica na que ocupou o lugar
  assert.deepEqual(pos(), [6, 3]);
  apl(O.estrutura(c, 'a1', 'l', 6, -1)); // exclui a linha onde ela está
  assert.deepEqual(pos(), [6, 3]);
  assert.equal(c.abas.a1.objs[0].rub, RUB, 'a rubrica não se perde');
});

test('planilha: duplicar a aba leva a assinatura', () => {
  const c = normalizarPlanilha(abaComObjs([obj()]));
  const r = O.duplicarAba(c, 'a1');
  assert.equal(r.mud[`conteudo.abas.${r.id}`].objs.length, 1);
});

function geo(extra = {}) {
  const aba = { alt: undefined, ocL: undefined, larg: undefined, ocC: undefined };
  return geometria({ linhas: eixo(aba.alt, aba.ocL, ALT_PADRAO, MAX_LIN), colunas: eixo(aba.larg, aba.ocC, LARG_PADRAO, MAX_COL), z: 1, sx: 0, sy: 0, cong: null, W: 1000, H: 600, ...extra });
}

test('planilha: posição na tela e de volta (arrastar e soltar acha a mesma célula e folga)', () => {
  const G = geo();
  const o = obj({ l: 3, c: 2, dx: 10, dy: 6 });
  const r = OB.retDoObjeto(o, G);
  assert.equal(r.w, 280);
  const an = OB.ancoraNoPonto(G, r.x, r.y);
  assert.deepEqual([an.l, an.c], [3, 2]);
  assert.ok(Math.abs(an.dx - 10) < 1e-6 && Math.abs(an.dy - 6) < 1e-6);
  const G2 = geo({ z: 2 });
  const r2 = OB.retDoObjeto(o, G2);
  assert.equal(r2.w, 560);
  const an2 = OB.ancoraNoPonto(G2, r2.x, r2.y);
  assert.deepEqual([an2.l, an2.c], [3, 2]);
  assert.ok(Math.abs(an2.dx - 10) < 1e-6, 'folga em px a 100%, mesmo com zoom');
});

test('planilha: com painéis congelados a assinatura que rola não passa por cima da parte congelada', () => {
  const G = geo({ cong: { l: 0, c: 2 }, sx: 100 }); // 2 colunas congeladas e a grade rolada 100 px
  const solta = obj({ l: 1, c: 3, dx: 0, dy: 0 });
  const r = OB.retDoObjeto(solta, G);
  const rc = OB.recorteDoObjeto(solta, r, G);
  assert.equal(rc.visivel, true);
  assert.ok(rc.corte.l > 0 || r.x >= G.hw + G.fx, 'a parte que entra na área congelada é cortada');
  const presa = obj({ l: 1, c: 0, dx: 0, dy: 0 });
  const rp = OB.retDoObjeto(presa, G);
  assert.equal(OB.recorteDoObjeto(presa, rp, G).visivel, true, 'a que está na parte congelada continua à vista');
  const longe = obj({ l: 1, c: 3, dx: 0, dy: 0 });
  const G3 = geo({ cong: { l: 0, c: 2 }, sx: 5000 });
  assert.equal(OB.recorteDoObjeto(longe, OB.retDoObjeto(longe, G3), G3).visivel, false, 'rolou para fora da tela');
});
