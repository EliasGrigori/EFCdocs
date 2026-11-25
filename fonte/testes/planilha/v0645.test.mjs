/* v0.6.45 · D-70 (Elias, 24/11/2026): "quando oculto muitas colunas e fileiras o app fica travado".
   Causa: com as linhas (ou colunas) escondidas até o fim, eixo.em(p) para uma posição depois da última visível devolvia a
   última do livro (1.048.575): a janela visível da grade ia até o fim e o desenho percorria um milhão de linhas e 16 mil
   colunas de tamanho zero a cada quadro; e a coluna dos números alargava como se a linha 1.048.575 estivesse na tela. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eixo, MAX_LIN, MAX_COL } from '../../src/planilha/modelo.js';
import { geometria } from '../../src/planilha/grade.js';

const ateOFim = (de, max) => { const o = {}; for (let i = de; i < max; i++) o[i] = 1; return o; };

test('eixo.em depois da última linha visível devolve a última visível, não a última do livro', () => {
  const e = eixo({}, ateOFim(130, MAX_LIN), 20, MAX_LIN);
  assert.equal(e.total, 130 * 20);
  assert.equal(e.em(129 * 20 + 5), 129, 'dentro da última visível');
  assert.equal(e.em(130 * 20), 129, 'logo depois do fim do que se vê');
  assert.equal(e.em(1e9), 129, 'muito depois');
});

test('eixo.em continua igual no meio: linhas escondidas no meio não mudam o resultado', () => {
  const e = eixo({ 3: 40 }, { 5: 1, 6: 1, 7: 1 }, 20, MAX_LIN);
  assert.equal(e.em(0), 0); assert.equal(e.em(65), 3); assert.equal(e.em(100), 4);
  assert.equal(e.em(120), 8, 'a divisa depois das escondidas cai na primeira visível depois delas');
  assert.equal(e.em(1e12), MAX_LIN - 1, 'sem nada escondido no fim, o último é o último do livro');
});

test('geometria com linhas e colunas escondidas até o fim: a janela visível termina na última visível', () => {
  const linhas = eixo({}, ateOFim(130, MAX_LIN), 20, MAX_LIN), colunas = eixo({}, ateOFim(9, MAX_COL), 64, MAX_COL);
  const G = geometria({ linhas, colunas, z: 1, sx: 0, sy: 0, cong: null, W: 1200, H: 3200 });
  assert.ok(G.l1 <= 130, 'l1 = ' + G.l1); assert.ok(G.c1 <= 9, 'c1 = ' + G.c1);
  assert.ok(G.hw <= 10 + 7 * 3, 'a coluna dos números tem largura de 3 algarismos (linha 131), não de 7 (1.048.575): ' + G.hw);
});

test('clicar abaixo da última linha visível escolhe a última visível (não uma escondida)', () => {
  const linhas = eixo({}, ateOFim(130, MAX_LIN), 20, MAX_LIN), colunas = eixo({}, {}, 64, MAX_COL);
  const G = geometria({ linhas, colunas, z: 1, sx: 0, sy: 0, cong: null, W: 1200, H: 3200 });
  assert.equal(G.linEm(G.hh + 131 * 20), 129);
});

/* ---------- salvar como Excel, abrir de novo e salvar no aparelho com as escondidas até o fim ---------- */
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import * as GR from '../../src/planilha/xlsx/gravar.js';
const { gravarXlsx } = GR; const fimOcultoL = (...a) => (GR.fimOcultoL ? GR.fimOcultoL(...a) : null);
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { Motor } from '../../src/planilha/motor.js';
import { compactar, descompactar } from '../../src/nucleo/compacta.js';
const AMOSTRA = new Uint8Array(readFileSync(new URL('../amostras/amostra-varredura.xlsx', import.meta.url)));
const comOcultas = async () => { const c = (await lerXlsx(AMOSTRA)).conteudo; const a = c.abas[c.ordem[0]]; a.ocL = ateOFim(129, MAX_LIN); a.ocC = ateOFim(9, MAX_COL); a.ocL[5] = 1; a.ocC[3] = 1; return c; };

test('salvar como Excel: linhas escondidas até o fim vão como zeroHeight (só as que aparecem listadas) e colunas numa faixa só', async () => {
  const c = await comOcultas();
  const g = await gravarXlsx(c, new Motor(c), { original: AMOSTRA });
  const sx = new TextDecoder().decode(await lerZip(g.bytes).bytes('xl/worksheets/sheet1.xml'));
  assert.match(sx, /<sheetFormatPr[^>]*zeroHeight="1"/);
  assert.ok((sx.match(/<row\b/g) || []).length < 200, 'linhas listadas: ' + (sx.match(/<row\b/g) || []).length);
  assert.doesNotMatch(sx, /<row r="6"/, 'a escondida do meio não vai listada (com zeroHeight, quem não está na lista fica escondido)');
  assert.match(sx, /<col min="10" max="16384"[^>]*hidden="1"\/>/);
  assert.match(sx, /<col min="4" max="4"[^>]*hidden="1"/);
  assert.ok(sx.length < 200000, 'tamanho da aba: ' + sx.length);
});

test('abrir de novo: as escondidas até o fim continuam escondidas (linhas e colunas), e as do meio também', async () => {
  const c = await comOcultas();
  const g = await gravarXlsx(c, new Motor(c), { original: AMOSTRA });
  const c2 = (await lerXlsx(g.bytes)).conteudo, a = c2.abas[c2.ordem[0]];
  assert.ok(a.ocL[MAX_LIN - 1] && a.ocL[129] && a.ocL[5] && !a.ocL[128] && !a.ocL[4]);
  assert.ok(a.ocC[MAX_COL - 1] && a.ocC[9] && a.ocC[3] && !a.ocC[8]);
  assert.equal(fimOcultoL(a.ocL, MAX_LIN), 129); assert.equal(fimOcultoL(a.ocC, MAX_COL, 2), 9);
});

test('salvar no aparelho: as escondidas vão como faixas (pequeno) e voltam iguais', async () => {
  const c = await comOcultas();
  const p = await compactar(c, { forcarSem: true });
  const base = (await lerXlsx(AMOSTRA)).conteudo, pb = await compactar(base, { forcarSem: true });
  assert.ok(p.bytesOriginal - pb.bytesOriginal < 10000, `as escondidas ocupam ${p.bytesOriginal - pb.bytesOriginal} bytes (antes: uns 14 MB)`);
  const c2 = await descompactar(p), a = c2.abas[c2.ordem[0]], o = c.abas[c.ordem[0]];
  assert.equal(Object.keys(a.ocL).length, Object.keys(o.ocL).length); assert.equal(Object.keys(a.ocC).length, Object.keys(o.ocC).length);
  assert.ok(a.ocL[5] && a.ocL[MAX_LIN - 1] && !a.ocL[6]);
  assert.ok(o.ocL[200] && !o.ocL['~faixas'], 'o conteúdo em uso não muda ao salvar');
});

/* ---------- achados do revisor novo (v0.6.45) ---------- */
import { estrutura } from '../../src/planilha/operacoes.js';
import { emFaixas, deFaixas } from '../../src/nucleo/compacta.js';
import { criarDiff } from '../../src/nucleo/diff.js';

test('revisor: excluir linhas ou colunas mantém as escondidas até o fim (e nada passa do fim do livro)', async () => {
  const c = await comOcultas(); const id = c.ordem[0];
  const mud = estrutura(c, id, 'l', 10, -3);
  const ocL = mud[`conteudo.abas.${id}.ocL`];
  assert.ok(ocL[MAX_LIN - 1] && ocL[MAX_LIN - 3] && ocL[126], 'continua escondido até a última linha (o bloco começa 3 acima)');
  const mc = estrutura(c, id, 'c', 2, -2), ocC = mc[`conteudo.abas.${id}.ocC`];
  assert.ok(ocC[MAX_COL - 1] && ocC[MAX_COL - 2] && ocC[7]);
  const mi = estrutura(c, id, 'l', 10, 5), ocL2 = mi[`conteudo.abas.${id}.ocL`];
  assert.ok(!Object.keys(ocL2).some((k) => +k >= MAX_LIN), 'inserir não deixa chave depois da última linha');
});

test('revisor: salvar com só as últimas 1.000 linhas escondidas não liga zeroHeight (não lista um milhão de linhas visíveis)', async () => {
  const c = (await lerXlsx(AMOSTRA)).conteudo; const a = c.abas[c.ordem[0]]; a.ocL = ateOFim(MAX_LIN - 1000, MAX_LIN);
  const g = await gravarXlsx(c, new Motor(c), { original: AMOSTRA });
  const sx = new TextDecoder().decode(await lerZip(g.bytes).bytes('xl/worksheets/sheet1.xml'));
  assert.doesNotMatch(sx, /zeroHeight/); assert.ok(sx.length < 400000, 'tamanho ' + sx.length);
});

test('revisor: a faixa de colunas escondidas até a XFD começa depois da última com largura própria', async () => {
  const c = await comOcultas(); const a = c.abas[c.ordem[0]]; a.larg = { ...(a.larg || {}), 20: 90 };
  const g = await gravarXlsx(c, new Motor(c), { original: AMOSTRA });
  const sx = new TextDecoder().decode(await lerZip(g.bytes).bytes('xl/worksheets/sheet1.xml'));
  assert.match(sx, /<col min="21" max="21"[^>]*hidden="1"/); assert.match(sx, /<col min="22" max="16384"[^>]*hidden="1"\/>/);
});

test('revisor: faixas guardadas no aparelho ignoram chave negativa e mantêm chave solta gravada por versão antiga', () => {
  assert.deepEqual(emFaixas({ '-3': 1, 2: 1, 3: 1, 7: 1 }), { '~faixas': '2-3,7' });
  assert.deepEqual(deFaixas({ '~faixas': '2-3', 9: 1 }), { 2: 1, 3: 1, 9: 1 });
});

test('revisor: o desfazer não transforma em texto um mapa com um milhão de linhas a cada mudança', () => {
  const grande = ateOFim(129, MAX_LIN), estado = { conteudo: { abas: { a1: { ocL: grande } } } };
  const t0 = Date.now(); const d = criarDiff(estado, { 'conteudo.abas.a1.ocL': { ...grande, 5: 1 } }, 'Ocultar'); const ms = Date.now() - t0;
  assert.ok(d && d.ops && d.ops.length === 1, 'a mudança entra'); assert.ok(ms < 250, `criarDiff levou ${ms} ms (antes uns 340)`);
});
