/* v0.6.41 · S1 da segmentação: a segmentação de tabela que veio do Excel aparece e filtra a tabela.
   Amostra inventada: testes/amostras/amostra-v0641.xlsx (gerar-amostra-v0641.py): TabColetas (Talhão, Fruta, Kg) filtrada em
   Fruta = Mamão; segmentações Fruta e Talhão (2 colunas de botões) na aba Coletas e "Fruta 1" (título "Fruta da colheita") na aba Painel.
   As linhas são contadas a partir de 0 (linha 3 do Excel = 2). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { Motor } from '../../src/planilha/motor.js';
import { aplicarMud } from '../../src/planilha/tabelaViva.js';
import { estrutura } from '../../src/planilha/operacoes.js';
import * as FT from '../../src/planilha/filtrosTabela.js';

const AMOSTRA = new URL('../amostras/amostra-v0641.xlsx', import.meta.url);
const abrir = async () => { const b = new Uint8Array(readFileSync(AMOSTRA)); const r = await lerXlsx(b); const c = r.conteudo; const id = (n) => c.ordem.find((x) => c.abas[x].nome === n); return { b, r, c, co: id('Coletas'), pa: id('Painel') }; };
const S = () => import('../../src/planilha/segmentacao.js');
const ocultas = (c, id) => Object.keys(c.abas[id].ocL || {}).map(Number).sort((a, b) => a - b);
const tocar = (S, c, s, texto, somar = false) => {
  const e = S.estadoDaSeg(c, new Motor(c), s), fil = S.filtroAoTocar(e, texto, somar);
  return fil ? aplicarMud(c, FT.mudancasDosFiltros(c, e.t.aba, e.alvo.k, fil, e.ler.textoDe, e.ler.x)) : null;
};

test('ao abrir: as segmentações de tabela ficam na aba em que estão desenhadas, ligadas à tabela e à coluna', async () => {
  const { r, c, co, pa } = await abrir();
  assert.deepEqual(c.abas[co].seg.map((s) => [s.nome, s.tab, s.cn, s.cols]), [['Fruta', 'tabcoletas', 'Fruta', 1], ['Talhão', 'tabcoletas', 'Talhão', 2]]);
  assert.deepEqual(c.abas[co].seg[0].a, { c1: 4, dx1: 4, l1: 1, dy1: 3, c2: 7, dx2: 0, l2: 11, dy2: 0 });
  assert.equal(c.abas[pa].seg[0].titulo, 'Fruta da colheita');
  assert.match(r.relatorio.fora.find((x) => /Segmentações/.test(x.item)).detalhe, /as 3 segmentações de tabela aparecem e filtram a tabela/);
});

test('o que a segmentação mostra: o valor filtrado marcado; sem filtro na coluna, todos marcados', async () => {
  const { c, co } = await abrir(); const s = await S();
  const fr = s.estadoDaSeg(c, new Motor(c), c.abas[co].seg[0]);
  assert.deepEqual(fr.itens.map((i) => [i.t, i.marcado, i.ok]), [['Acerola', false, true], ['Goiaba', false, true], ['Mamão', true, true]]);
  assert.equal(fr.filtrada, true); assert.equal(fr.alvo.k, 'tabcoletas'); assert.equal(fr.col, 1);
  const ta = s.estadoDaSeg(c, new Motor(c), c.abas[co].seg[1]);
  assert.ok(ta.itens.every((i) => i.marcado && i.ok)); assert.equal(ta.filtrada, false);
});

test('tocar num valor filtra a tabela só por ele; a outra segmentação apaga os valores que ficaram sem linha', async () => {
  const { c, co } = await abrir(); const s = await S();
  const n = tocar(s, c, c.abas[co].seg[0], 'Acerola');
  assert.deepEqual(n.tabelas.tabcoletas.fil.cr, { 1: { v: ['Acerola'] } });
  assert.deepEqual(ocultas(n, co), [1, 3, 4, 6, 7, 8]);
  const ta = s.estadoDaSeg(n, new Motor(n), n.abas[co].seg[1]);
  assert.deepEqual(ta.itens.map((i) => [i.t, i.ok]), [['T1', true], ['T2', true], ['T3', false], ['T4', false]], 'sem dados por último');
});

test('Ctrl+toque (ou seleção múltipla) soma e tira valores; fica sempre pelo menos um; todos marcados = sem filtro', async () => {
  const { c, co } = await abrir(); const s = await S();
  const n = tocar(s, c, c.abas[co].seg[0], 'Goiaba', true);
  assert.deepEqual(n.tabelas.tabcoletas.fil.cr[1].v.sort(), ['Goiaba', 'Mamão']);
  const e = s.estadoDaSeg(c, new Motor(c), c.abas[co].seg[0]);
  assert.equal(s.filtroAoTocar(e, 'Mamão', true), null, 'tirar o único valor não faz nada');
  const n2 = tocar(s, n, n.abas[co].seg[0], 'Acerola', true);
  assert.equal(n2.tabelas.tabcoletas.fil.cr[1], undefined, 'os três marcados = sem filtro na coluna');
  assert.deepEqual(ocultas(n2, co), []);
});

test('a segmentação de outra aba (Painel) filtra a tabela da aba Coletas', async () => {
  const { c, co, pa } = await abrir(); const s = await S();
  const n = tocar(s, c, c.abas[pa].seg[0], 'Goiaba');
  assert.deepEqual(ocultas(n, co), [1, 2, 3, 5, 6, 8]);
  assert.equal(n.abas[pa].ocL, undefined, 'na aba Painel nada some');
  const lim = s.filtroLimpo(s.estadoDaSeg(n, new Motor(n), n.abas[pa].seg[0]));
  assert.deepEqual(lim.cr, {});
});

test('salvar como Excel depois de usar a segmentação: ela volta igual e o filtro da tabela sai com o valor escolhido', async () => {
  const { b, c, co } = await abrir(); const s = await S();
  const n = tocar(s, c, c.abas[co].seg[0], 'Acerola');
  const g = (await gravarXlsx(n, new Motor(n), { original: b })).bytes, z = lerZip(g), txt = async (x) => new TextDecoder().decode(await z.bytes(x));
  for (const p of ['xl/slicerCaches/slicerCache1.xml', 'xl/slicerCaches/slicerCache2.xml', 'xl/slicers/slicer1.xml', 'xl/slicers/slicer2.xml']) assert.ok(z.nomes.includes(p), p + ' voltou');
  const tab = await txt(z.nomes.find((x) => /^xl\/tables\//.test(x)));
  assert.match(tab, /<autoFilter ref="A1:C9"><filterColumn colId="1"><filters><filter val="Acerola"\/><\/filters><\/filterColumn><\/autoFilter>/);
  /* e ao abrir de novo a segmentação continua lá */
  const c2 = (await lerXlsx(g)).conteudo;
  assert.equal(c2.abas[c2.ordem[0]].seg.length, 2);
});

test('a coluna é achada pelo título (inserir coluna na tabela não troca a coluna da segmentação); o tamanho não encolhe com as linhas escondidas', async () => {
  const { c, co } = await abrir(); const s = await S();
  const n = aplicarMud(c, estrutura(c, co, 'c', 1, 1)); n.abas[co].cel.B1 = { v: 'Lote' };
  assert.equal(s.colunaDaSeg(n, new Motor(n), n.abas[co].seg[0]).col, 2);
  const a = c.abas[co].seg[0].a;
  assert.deepEqual(s.tamanhoDaSeg(c.abas[co], a), s.tamanhoDaSeg({ ...c.abas[co], ocL: {} }, a));
  assert.equal(s.tamanhoDaSeg(c.abas[co], a).h, 10 * 20 - 3, '10 linhas de 20 px menos a folga de cima');
});
