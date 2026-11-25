/* v0.6.61: defeitos do relatório do Grok de 25/11 (V56-01, V56-02, V56-03) e o Kanban com post-it travado. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ajustarParteSeg } from '../../src/planilha/xlsx/segmentacaoXlsx.js';
import { novasSegs } from '../../src/planilha/segmentacao.js';
import { estrutura } from '../../src/planilha/operacoes.js';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { normalizarPlanilha } from '../../src/planilha/modelo.js';
import { chave } from '../../src/planilha/ref.js';

const XML = '<?xml version="1.0"?>\n<slicers xmlns="x"><slicer name="Fruta" cache="Seg_Fruta" caption="Fruta" rowHeight="241300"/></slicers>';

test('V56-01: título com aspas, < e $ sai como XML certo e volta igual', () => {
  for (const titulo of ['Fruta "da casa"', 'Peso < 10 & >= 2', 'R$ 10 e $1']) {
    const out = ajustarParteSeg(XML, { seg: [{ nome: 'Fruta', titulo, mexida: 1, cols: 1 }] });
    const cap = /caption="([^"]*)"/.exec(out);
    assert.ok(cap, 'caption bem fechado: ' + out);
    const volta = cap[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    assert.equal(volta, titulo);
    assert.equal((out.match(/"/g) || []).length % 2, 0, 'aspas em par');
  }
});

test('V56-01: a segmentação da amostra com título entre aspas volta ao abrir de novo', async () => {
  const orig = readFileSync(new URL('../amostras/amostra-v0641.xlsx', import.meta.url));
  const c = normalizarPlanilha((await lerXlsx(orig)).conteudo);
  const [idAba, aba] = Object.entries(c.abas).find(([, a]) => (a.seg || []).length);
  const s = aba.seg[0];
  aba.seg = aba.seg.map((x) => (x.nome === s.nome ? { ...x, titulo: 'Fruta "da casa"', mexida: 1 } : x));
  const d = normalizarPlanilha((await lerXlsx((await gravarXlsx(c, null, { original: orig })).bytes)).conteudo);
  const volta = (d.abas[idAba].seg || []).find((x) => x.nome === s.nome);
  assert.ok(volta, 'a segmentação não some');
  assert.equal(volta.titulo, 'Fruta "da casa"');
});

test('V56-02: a segunda segmentação nova não nasce em cima da primeira', () => {
  const c = { tabelas: { t1: { aba: 'a1', l1: 0, c1: 0, l2: 5, c2: 3, cols: [] } }, abas: { a1: { nome: 'A', seg: [] } } };
  const m1 = novasSegs(c, 'a1', 't1', ['Kg']);
  const c2 = { ...c, abas: { a1: { ...c.abas.a1, seg: Object.values(m1)[0] } } };
  const lista = Object.values(novasSegs(c2, 'a1', 't1', ['Kg']))[0];
  assert.equal(lista.length, 2);
  assert.ok(lista[0].dx !== lista[1].dx || lista[0].dy !== lista[1].dy, JSON.stringify(lista.map((x) => [x.dx, x.dy])));
});

test('V56-03: coluna inserida no meio de outra tabela ganha título único (Coluna1, Coluna2...)', () => {
  const cel = { A1: { v: 'Lote' }, B1: { v: 'Talhão' }, C1: { v: 'Coluna1' }, A2: { v: 'L-1' }, B2: { v: 'T1' }, C2: { v: 5 } };
  const c = { ordem: ['a1'], abas: { a1: { nome: 'Pomar', cel, larg: {}, alt: {} } }, tabelas: { t1: { nome: 'Estoque', aba: 'a1', l1: 0, c1: 0, l2: 1, c2: 2, cab: 1 } }, estilos: [{}], nomes: {} };
  const mud = estrutura(c, 'a1', 'c', 1, 2); /* duas colunas antes da B */
  const nova = mud['conteudo.abas.a1.cel'];
  assert.equal(nova[chave(0, 1)].v, 'Coluna2', 'Coluna1 já existia');
  assert.equal(nova[chave(0, 2)].v, 'Coluna3');
  assert.equal(nova[chave(0, 3)].v, 'Talhão');
  assert.equal(mud['conteudo.tabelas'].t1.c2, 4);
  /* inserir antes da tabela não mexe nos títulos */
  const mud2 = estrutura(c, 'a1', 'c', 0, 1);
  assert.equal(mud2['conteudo.abas.a1.cel'][chave(0, 0)], undefined);
});
