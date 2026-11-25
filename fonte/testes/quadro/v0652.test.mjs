/* v0.6.52: D-81 (PDF com a letra, as folgas e as linhas da tela) e seta curva com o texto na etiqueta ou na linha. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { pontosSeta, pontosCurva, sentidoDeLeitura, pontoNaLinha, comprimento, meioDoCaminho } from '../../src/quadro/geometria.js';
import { desenharQuadro, FONTE, tamanhoFonte } from '../../src/quadro/desenho.js';
import { linhasQueCabem } from '../../src/quadro/postit.js';
import { aplicarDiff, criarDiff } from '../../src/nucleo/diff.js';

const aplicar = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;

test('D-81: o PDF usa a letra da tela (Source Sans 3) e o item de Texto com 16 px, como o CSS', () => {
  assert.match(FONTE, /^"Source Sans 3"/);
  assert.equal(tamanhoFonte({ tipo: 'texto' }), 16);
  assert.equal(linhasQueCabem({ tipo: 'texto', h: 44 }), 1);
});

test('curva: começa e termina nos pontos das pontas e sai na direção de cada lado', () => {
  const pts = pontosCurva({ x: 0, y: 0 }, 'r', { x: 200, y: 120 }, 'l');
  assert.deepEqual(pts[0], { x: 0, y: 0 }); assert.deepEqual(pts[pts.length - 1], { x: 200, y: 120 });
  assert.ok(pts.length >= 30, 'linha de muitos pedacinhos, para parecer lisa');
  assert.ok(pts[1].x > pts[0].x && Math.abs(pts[1].y - pts[0].y) < 1, 'sai para a direita');
  const n = pts.length;
  assert.ok(pts[n - 1].x > pts[n - 2].x && Math.abs(pts[n - 1].y - pts[n - 2].y) < 1, 'chega pela esquerda (a ponta aponta para dentro)');
});

test('curva: pontosSeta com estilo curva liga as âncoras dos dois itens', () => {
  const a = { x: 0, y: 0, w: 100, h: 60 }, b = { x: 300, y: 200, w: 100, h: 60 };
  const { pontos } = pontosSeta(a, b, { estilo: 'curva' });
  const reta = pontosSeta(a, b, { estilo: 'reta' }).pontos;
  assert.deepEqual(pontos[0], reta[0]); assert.deepEqual(pontos[pontos.length - 1], reta[1]);
  const m = meioDoCaminho(pontos);
  assert.ok(m.x > 0 && m.x < 400 && m.y > 0 && m.y < 260, 'a etiqueta fica no meio da curva');
});

test('texto na linha: sempre no sentido de leitura e pontos ao longo do caminho', () => {
  const ida = [{ x: 0, y: 0 }, { x: 100, y: 0 }], volta = [{ x: 100, y: 0 }, { x: 0, y: 0 }];
  assert.deepEqual(sentidoDeLeitura(volta), ida);
  assert.equal(sentidoDeLeitura(ida), ida);
  assert.equal(comprimento(ida), 100);
  const p = pontoNaLinha(ida, 25);
  assert.equal(p.x, 25); assert.equal(p.y, 0); assert.equal(p.ang, 0);
});

test('curva e texto na linha ficam guardados no arquivo', () => {
  let c = Q.conteudoQuadroVazio();
  const r1 = Q.novoItem(c, 'processo', { x: 0, y: 0 }); c = aplicar(c, r1.mudancas);
  const r2 = Q.novoItem(c, 'processo', { x: 300, y: 200 }); c = aplicar(c, r2.mudancas);
  const s = Q.novaSeta ? Q.novaSeta(c, r1.item.id, r2.item.id) : null;
  const mud = s && s.mudancas ? s.mudancas : { ['setas.s1']: { id: 's1', de: { id: r1.item.id }, para: { id: r2.item.id }, rotulo: 'Sim', estilo: 'curva', pontas: 'fim', rotuloModo: 'linha' } };
  c = aplicar(c, mud);
  const id = Object.keys(c.setas)[0];
  c = aplicar(c, { ['setas.' + id]: { ...c.setas[id], estilo: 'curva', rotulo: 'Sim', rotuloModo: 'linha' } });
  const reaberto = Q.normalizarQuadro(JSON.parse(JSON.stringify(c)));
  assert.equal(reaberto.setas[id].estilo, 'curva'); assert.equal(reaberto.setas[id].rotuloModo, 'linha');
});

/* contexto de desenho falso: anota textos e letras */
function ctxFalso() {
  const reg = { textos: [] };
  const alvo = { canvas: { width: 2000, height: 1200 }, reg, font: '', measureText: (t) => ({ width: String(t).length * 6 }), fillText(t, x, y) { reg.textos.push({ t: String(t), font: this.font }); }, roundRect() {} };
  return new Proxy(alvo, { get: (o, k) => (k in o ? o[k] : typeof k === 'string' ? () => {} : undefined), set: (o, k, v) => { o[k] = v; return true; } });
}

test('PDF: texto da seta na linha sai letra por letra; na etiqueta, inteiro; tudo na letra da tela', () => {
  let c = Q.conteudoQuadroVazio();
  const r1 = Q.novoItem(c, 'processo', { x: 0, y: 0 }); c = aplicar(c, r1.mudancas);
  const r2 = Q.novoItem(c, 'processo', { x: 400, y: 200 }); c = aplicar(c, r2.mudancas);
  const seta = (modo) => ({ ['setas.s1']: { id: 's1', de: { id: r1.item.id }, para: { id: r2.item.id }, rotulo: 'Sim', estilo: 'curva', pontas: 'fim', rotuloModo: modo } });
  let ctx = ctxFalso(); desenharQuadro(ctx, aplicar(c, seta('linha')), { codigos: false });
  assert.deepEqual(ctx.reg.textos.filter((t) => ['S', 'i', 'm'].includes(t.t)).map((t) => t.t), ['S', 'i', 'm']);
  assert.ok(!ctx.reg.textos.some((t) => t.t === 'Sim'));
  ctx = ctxFalso(); desenharQuadro(ctx, aplicar(c, seta('etiqueta')), { codigos: false });
  assert.ok(ctx.reg.textos.some((t) => t.t === 'Sim'));
  assert.ok(ctx.reg.textos.every((t) => /Source Sans 3/.test(t.font)), 'todas as escritas na letra da tela');
});

test('D-81: rodapé da tarefa no PDF com os pesos da tela (responsável em negrito, prazo normal)', () => {
  let c = Q.conteudoQuadroVazio();
  const r = Q.novoItem(c, 'postit', { x: 0, y: 0 }); c = aplicar(c, r.mudancas);
  c = aplicar(c, { ['itens.' + r.item.id]: { ...c.itens[r.item.id], resp: 'ANA', prazo: '2099-11-25' } });
  const ctx = ctxFalso(); desenharQuadro(ctx, c, { codigos: false });
  const resp = ctx.reg.textos.find((t) => t.t.startsWith('Resp.:')), prazo = ctx.reg.textos.find((t) => t.t.startsWith('Prazo:'));
  assert.ok(resp && /^700 /.test(resp.font), resp && resp.font);
  assert.ok(prazo && /^400 /.test(prazo.font), prazo && prazo.font);
});
