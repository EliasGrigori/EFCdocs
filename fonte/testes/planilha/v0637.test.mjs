/* v0.6.37 · Agrupar e Desagrupar (Dados › Estrutura de tópicos). Contas puras e ida e volta no .xlsx; dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planilhaVazia, normalizarPlanilha } from '../../src/planilha/modelo.js';
import { Motor } from '../../src/planilha/motor.js';
import { agrupar, gruposDe, grupoEm, alternarGrupo, mostrarNivel, limparEstrutura, nivelMax, contornoDe, margemDe, contornoEm } from '../../src/planilha/contorno.js';
import { geometria } from '../../src/planilha/grade.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { atalhoDe } from '../../src/planilha/atalhos.js';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** Aplica as mudanças "conteudo.abas.a1.campo" numa cópia da aba. */
const aplicar = (aba, mud) => { const a = { ...aba }; for (const [k, v] of Object.entries(mud)) { const campo = k.split('.').pop(); if (v === undefined) delete a[campo]; else a[campo] = v; } return a; };
const abaVazia = () => normalizarPlanilha(planilhaVazia()).abas.a1;

test('agrupar linhas 2 a 4 (índices 1..3): nível 1 e um grupo com o botão na linha de baixo', () => {
  let a = abaVazia();
  a = aplicar(a, agrupar(a, 'a1', 'l', 1, 3, 1).mud);
  assert.deepEqual(a.grpL, { 1: 1, 2: 1, 3: 1 });
  assert.deepEqual(gruposDe(a, 'l'), [{ k: 1, ini: 1, fim: 3, resumo: 4, fechado: false }]);
  assert.equal(nivelMax(a, 'l'), 1);
});

test('grupo dentro de grupo: níveis 1 e 2; o de dentro fecha sozinho e abrir o de fora não abre o de dentro', () => {
  let a = abaVazia();
  a = aplicar(a, agrupar(a, 'a1', 'l', 1, 6, 1).mud);
  a = aplicar(a, agrupar(a, 'a1', 'l', 2, 3, 1).mud);
  const gs = gruposDe(a, 'l');
  assert.equal(gs.length, 2); assert.equal(nivelMax(a, 'l'), 2);
  const dentro = gs.find((g) => g.k === 2);
  a = aplicar(a, alternarGrupo(a, 'a1', 'l', dentro, true).mud);
  assert.deepEqual(a.ocL, { 2: 1, 3: 1 }); assert.deepEqual(a.grpFL, { 4: 1 });
  const fora = gruposDe(a, 'l').find((g) => g.k === 1);
  a = aplicar(a, alternarGrupo(a, 'a1', 'l', fora, true).mud);
  assert.deepEqual(Object.keys(a.ocL).map(Number), [1, 2, 3, 4, 5, 6]);
  a = aplicar(a, alternarGrupo(a, 'a1', 'l', gruposDe(a, 'l').find((g) => g.k === 1), false).mud);
  assert.deepEqual(a.ocL, { 2: 1, 3: 1 }, 'o de dentro continua fechado');
});

test('botão de nível: 1 fecha tudo, 3 abre tudo', () => {
  let a = abaVazia();
  a = aplicar(a, agrupar(a, 'a1', 'l', 1, 6, 1).mud);
  a = aplicar(a, agrupar(a, 'a1', 'l', 2, 3, 1).mud);
  a = aplicar(a, mostrarNivel(a, 'a1', 'l', 1).mud);
  assert.equal(Object.keys(a.ocL).length, 6);
  a = aplicar(a, mostrarNivel(a, 'a1', 'l', 2).mud);
  assert.deepEqual(a.ocL, { 2: 1, 3: 1 });
  a = aplicar(a, mostrarNivel(a, 'a1', 'l', 3).mud);
  assert.equal(a.ocL, undefined);
});

test('desagrupar tira um nível e mostra o que o grupo escondia; até 7 níveis', () => {
  let a = abaVazia();
  a = aplicar(a, agrupar(a, 'a1', 'l', 1, 3, 1).mud);
  a = aplicar(a, alternarGrupo(a, 'a1', 'l', gruposDe(a, 'l')[0], true).mud);
  a = aplicar(a, agrupar(a, 'a1', 'l', 1, 3, -1).mud);
  assert.equal(a.grpL, undefined); assert.equal(a.ocL, undefined); assert.equal(a.grpFL, undefined);
  assert.match(agrupar(a, 'a1', 'l', 1, 3, -1).erro, /não estão agrupadas/);
  for (let i = 0; i < 7; i++) a = aplicar(a, agrupar(a, 'a1', 'l', 1, 1, 1).mud);
  assert.match(agrupar(a, 'a1', 'l', 1, 1, 1).erro, /7 níveis/);
});

test('colunas e resumo em cima / à esquerda', () => {
  let a = { ...abaVazia(), grpEsq: 1 };
  a = aplicar(a, agrupar(a, 'a1', 'c', 2, 4, 1).mud);
  assert.deepEqual(gruposDe(a, 'c'), [{ k: 1, ini: 2, fim: 4, resumo: 1, fechado: false }]);
  assert.equal(grupoEm(a, 'c', 1).ini, 2, 'a coluna do botão acha o grupo');
});

test('limpar estrutura tira tudo e mostra o que estava escondido', () => {
  let a = abaVazia();
  a = aplicar(a, agrupar(a, 'a1', 'l', 1, 3, 1).mud);
  a = aplicar(a, mostrarNivel(a, 'a1', 'l', 1).mud);
  a = aplicar(a, limparEstrutura(a, 'a1', 'l'));
  assert.equal(a.grpL, undefined); assert.equal(a.ocL, undefined);
});

test('margem: geometria abre espaço à esquerda dos números e o toque acha o botão do grupo e o de nível', () => {
  let a = abaVazia();
  a = aplicar(a, agrupar(a, 'a1', 'l', 1, 3, 1).mud);
  const ct = contornoDe(a);
  const eixo = { pos: (i) => i * 20, tam: () => 20, em: (v) => Math.max(0, Math.floor(v / 20)) };
  const G0 = geometria({ linhas: eixo, colunas: eixo, z: 1, sx: 0, sy: 0, cong: null, W: 800, H: 600 });
  const G = geometria({ linhas: eixo, colunas: eixo, z: 1, sx: 0, sy: 0, cong: null, W: 800, H: 600, contorno: ct });
  assert.equal(G.hw - G0.hw, margemDe(ct, 1).mL); assert.equal(G.hh, G0.hh, 'sem grupo de colunas, a altura não muda');
  const yBotao = G.yDe(4) + 10;
  const o = contornoEm(G, 2 + 7, yBotao);
  assert.equal(o.tipo, 'contorno'); assert.equal(o.g.resumo, 4);
  const n = contornoEm(G, 2 + 14 + 7, G.hh / 2);
  assert.equal(n.n, 2);
});

test('atalhos: Shift+Alt+→ agrupa e Shift+Alt+← desagrupa', () => {
  assert.equal(atalhoDe({ key: 'ArrowRight', shiftKey: true, altKey: true }), 'dados.agrupar');
  assert.equal(atalhoDe({ key: 'ArrowLeft', shiftKey: true, altKey: true }), 'dados.desagrupar');
});

const temOpenpyxl = spawnSync('python3', ['-c', 'import openpyxl'], { stdio: 'ignore' }).status === 0;
test('ida e volta no .xlsx: níveis, botão fechado, linhas escondidas e resumo à esquerda; o openpyxl lê igual', { skip: !temOpenpyxl && 'sem openpyxl' }, async () => {
  const c = normalizarPlanilha(planilhaVazia());
  let a = c.abas.a1;
  for (let l = 0; l < 8; l++) a.cel['A' + (l + 1)] = { v: 'Item ' + (l + 1) };
  a = aplicar(a, agrupar(a, 'a1', 'l', 1, 5, 1).mud);
  a = aplicar(a, agrupar(a, 'a1', 'l', 2, 3, 1).mud);
  a = aplicar(a, alternarGrupo(a, 'a1', 'l', gruposDe(a, 'l').find((g) => g.k === 2), true).mud);
  a = { ...a, grpEsq: 1 };
  a = aplicar(a, agrupar(a, 'a1', 'c', 2, 3, 1).mud);
  const c2 = { ...c, abas: { a1: a } };
  const bytes = (await gravarXlsx(c2, new Motor(c2))).bytes;
  const xml = new TextDecoder().decode(await lerZip(bytes).bytes('xl/worksheets/sheet1.xml'));
  assert.match(xml, /outlineLevelRow="2"/); assert.match(xml, /outlineLevelCol="1"/); assert.match(xml, /<outlinePr summaryRight="0"\/>/);
  assert.match(xml, /<row r="3"[^>]*hidden="1"[^>]*outlineLevel="2"/); assert.match(xml, /<row r="5"[^>]*collapsed="1"/);
  const arq = join(mkdtempSync(join(tmpdir(), 'grp-')), 'grp.xlsx'); writeFileSync(arq, bytes);
  const py = `import openpyxl,json\nws=openpyxl.load_workbook(${JSON.stringify(arq)}).active\nprint(json.dumps({'n':[ws.row_dimensions[r].outline_level for r in range(1,8)],'h':[bool(ws.row_dimensions[r].hidden) for r in range(1,8)],'c':ws.column_dimensions['C'].outline_level,'d':ws.column_dimensions['C'].max,'right':ws.sheet_properties.outlinePr.summaryRight}))`;
  const o = JSON.parse(spawnSync('python3', ['-c', py], { encoding: 'utf8' }).stdout);
  assert.deepEqual(o.n, [0, 1, 2, 2, 1, 1, 0]); assert.deepEqual(o.h, [false, false, true, true, false, false, false]);
  assert.equal(o.c, 1); assert.equal(o.d, 4, 'a faixa C:D vai junta (min 3, max 4)'); assert.equal(o.right, false);
  const r = await lerXlsx(bytes); const v = (r.conteudo || r).abas; const b = Object.values(v)[0];
  assert.deepEqual(b.grpL, a.grpL); assert.deepEqual(b.grpFL, a.grpFL); assert.deepEqual(b.grpC, a.grpC); assert.equal(b.grpEsq, 1);
  assert.deepEqual(b.ocL, a.ocL);
});

import { estrutura } from '../../src/planilha/operacoes.js';
test('inserir uma linha em cima do grupo empurra o grupo e o botão fechado junto', () => {
  const c = normalizarPlanilha(planilhaVazia());
  let a = c.abas.a1; a.cel.A1 = { v: 'x' };
  a = aplicar(a, agrupar(a, 'a1', 'l', 2, 3, 1).mud);
  a = aplicar(a, alternarGrupo(a, 'a1', 'l', gruposDe(a, 'l')[0], true).mud);
  const c2 = { ...c, abas: { a1: a } };
  const mud = estrutura(c2, 'a1', 'l', 0, 1).mud || estrutura(c2, 'a1', 'l', 0, 1);
  const b = aplicar(a, Object.fromEntries(Object.entries(mud).filter(([k]) => /\.(grpL|grpFL|ocL)$/.test(k))));
  assert.deepEqual(b.grpL, { 3: 1, 4: 1 }); assert.deepEqual(b.grpFL, { 5: 1 }); assert.deepEqual(b.ocL, { 3: 1, 4: 1 });
});
