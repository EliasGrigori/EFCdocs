/* v0.6.4 — correções do relatório do Grok (v0.6.1 a v0.6.3) */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lerXlsx } from '../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../src/planilha/xlsx/gravar.js';
import { lerZip } from '../src/planilha/xlsx/zip.js';
import { renomearAba } from '../src/planilha/operacoes.js';
import { Motor } from '../src/planilha/motor.js';

const amostra = (n) => new Uint8Array(fs.readFileSync(fileURLToPath(new URL(`./amostras/${n}`, import.meta.url))));

test('X05: renomear a aba Painel: nenhum gráfico gravado no Excel continua apontando para o nome antigo', async () => {
  for (const arq of ['amostra-painel.xlsx', 'amostra-painel-excel.xlsx']) {
    const c = (await lerXlsx(amostra(arq), {})).conteudo;
    const alvo = c.ordem.find((i) => c.abas[i].nome === 'Painel');
    const mud = renomearAba(c, alvo, 'Custos');
    assert.equal(mud[`conteudo.abas.${alvo}.nome`], 'Custos');
    c.abas[alvo].nome = 'Custos';
    const { bytes } = await gravarXlsx(c, new Motor(c), {});
    const z = await lerZip(bytes);
    let n = 0;
    for (let k = 1; k < 40; k++) {
      const t = await z.texto(`xl/charts/chart${k}.xml`);
      if (!t) break;
      n++;
      assert.ok(!/<c:f>[^<]*Painel[^<]*<\/c:f>/.test(t), `${arq}: gráfico ${k} ainda aponta para Painel`);
    }
    assert.ok(n >= 5, 'gráficos gravados');
  }
});

test('X05: gráfico do Excel sem lista de abas guardada também é refeito quando a aba muda de nome', async () => {
  const c = (await lerXlsx(amostra('amostra-painel-excel.xlsx'), {})).conteudo;
  for (const id of c.ordem) for (const o of c.abas[id].objs || []) if (o.tipo === 'grafico') o.g.xoAbas = {}; // como se o arquivo guardado não soubesse
  const alvo = c.ordem.find((i) => c.abas[i].nome === 'Painel');
  c.abas[alvo].nome = 'Custos';
  const { bytes } = await gravarXlsx(c, new Motor(c), {});
  const z = await lerZip(bytes);
  for (let k = 1; k < 40; k++) {
    const t = await z.texto(`xl/charts/chart${k}.xml`);
    if (!t) break;
    assert.ok(!/<c:f>[^<]*Painel[^<]*<\/c:f>/.test(t), `gráfico ${k} ainda aponta para Painel`);
  }
});

import { tabelasNaFormula } from '../src/planilha/inserir.js';
test('B05: Tabela[Coluna] digitado vira endereço (também em português e de outra aba)', () => {
  const c = { abas: { a1: { nome: 'Coletas' }, a2: { nome: 'Resumo' } }, tabelas: { coletas: { nome: 'Coletas', aba: 'a1', l1: 0, c1: 0, l2: 5, c2: 1, cols: ['Ponto', 'Cloro'], cab: true, tot: false } } };
  assert.equal(tabelasNaFormula(c, '=SOMA(Coletas[Cloro])', 'a1', 7), '=SOMA($B$2:$B$6)');
  assert.equal(tabelasNaFormula(c, '=SOMA(Coletas[Cloro])', 'a2', 0), '=SOMA(Coletas!$B$2:$B$6)');
  assert.equal(tabelasNaFormula(c, '=CONT.VALORES(Coletas[[#Cabeçalhos];[Cloro]])', 'a2', 0), '=CONT.VALORES(Coletas!$B$1)');
  assert.equal(tabelasNaFormula(c, '=Coletas[@Cloro]*2', 'a1', 3), '=$B4*2');
  assert.equal(tabelasNaFormula(c, '=SOMA(Coletas[Outra])', 'a1', 0), '=SOMA(#REF!)');
  assert.equal(tabelasNaFormula(c, '=SOMA(A1:A3)', 'a1', 0), '=SOMA(A1:A3)');
  assert.equal(tabelasNaFormula(c, 'texto [livre]', 'a1', 0), 'texto [livre]');
});

// v0.6.4 (Grok B07): o link acompanha a célula ao copiar e colar
import * as OP from '../src/planilha/operacoes.js';
import { aplicarDiff, criarDiff } from '../src/nucleo/diff.js';
test('B07: copiar e colar leva o link junto', () => {
  const c = { abas: { a1: { nome: 'A', cel: { A1: { v: 'site', lk: { t: 'u', u: 'https://exemplo.com' } } }, ocF: {}, fil: null } }, estilos: {}, ordem: ['a1'], tabelas: {}, nomes: {} };
  const clip = OP.copiar(c, 'a1', { l1: 0, c1: 0, l2: 0, c2: 0 });
  const { lote } = OP.colar(c, 'a1', 3, 2, clip);
  const c2 = aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, lote.mudancas())).conteudo;
  assert.equal(c2.abas.a1.cel.C4.v, 'site');
  assert.deepEqual(c2.abas.a1.cel.C4.lk, { t: 'u', u: 'https://exemplo.com' });
});

// v0.6.4 (Grok): gráfico no PDF não é partido entre duas páginas
import { paginar } from '../src/planilha/impressao.js';
test('paginar: gráfico que cabe numa página vai inteiro para a página seguinte', () => {
  const area = { l1: 0, c1: 0, l2: 199, c2: 3 };
  const sem = paginar({}, area, () => 64, () => 20);
  assert.ok(sem.paginas.length > 2);
  const fim = sem.paginas[0].lins[sem.paginas[0].lins.length - 1];
  const obj = { l: fim - 5, c: 0, dx: 0, dy: 0, w: 300, h: 20 * 12 }; // 12 linhas, começa 6 linhas antes do fim da 1ª página
  const com = paginar({}, area, () => 64, () => 20, { objetos: [obj] });
  const cobre = [];
  for (let k = obj.l; k < obj.l + 12; k++) cobre.push(k);
  for (const p of com.paginas) {
    const dentro = cobre.filter((k) => p.lins.includes(k)).length;
    assert.ok(dentro === 0 || dentro === 12, `página com ${dentro} de 12 linhas do gráfico`);
  }
  // sem o objeto a quebra seria no meio dele
  assert.ok(cobre.filter((k) => sem.paginas[0].lins.includes(k)).length > 0 && cobre.filter((k) => sem.paginas[0].lins.includes(k)).length < 12);
});

import { gifAnimado } from '../src/planilha/imagem.js';
test('gifAnimado: reconhece GIF com vários quadros', () => {
  const cab = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0];
  const quadro = [0x21, 0xf9, 4, 0, 0, 0, 0, 0];
  assert.equal(gifAnimado(new Uint8Array([...cab, ...quadro, 0x3b])), false);
  assert.equal(gifAnimado(new Uint8Array([...cab, ...quadro, ...quadro, 0x3b])), true);
  assert.equal(gifAnimado(new Uint8Array([1, 2, 3])), false);
});

// v0.6.4: arquivo com zeroHeight (linhas que o arquivo não lista ficam escondidas) e linha escondida de verdade
test('linhas ocultas do Excel vêm ocultas (zeroHeight e hidden)', async () => {
  const bytes = new Uint8Array(fs.readFileSync(fileURLToPath(new URL('./amostras/amostra-v064.xlsx', import.meta.url))));
  const r = await lerXlsx(bytes);
  const aba = r.conteudo.abas[r.conteudo.ordem[0]];
  assert.ok(aba.ocL, 'sem linhas ocultas');
  assert.ok(aba.ocL[11] && aba.ocL[12], 'linhas 12 e 13 estavam ocultas no arquivo');
  assert.ok(!aba.ocL[6], 'a linha 7 (cabeçalho) fica visível');
  assert.ok(!aba.ocL[9], 'a linha 10 está listada e visível');
  assert.ok(aba.ocL[5], 'a linha 6 não é listada no arquivo: fica oculta (zeroHeight)');
  assert.deepEqual(aba.cong, { l: 7, c: 0 });
});
