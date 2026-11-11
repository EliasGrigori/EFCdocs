/* Testes da v0.6.7: Painel (peças na grade, arrumar, números com meta e comparação, renomear/inserir linhas, PDF e Excel)
   e a aba Gráfico (barras de erro, meta arrastável, estilo guardado como modelo). Amostras inventadas. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { normalizarPlanilha } from '../../src/planilha/modelo.js';
import { PAINEL, painelVazio, novaPeca, lugarLivre, moverPeca, arrumar, colide, normalizarPainel, textoDoNumero, textoDaMeta, ehPainel } from '../../src/planilha/painel.js';
import { trocarAbasDoPainel } from '../../src/planilha/xlsx/painelXlsx.js';
import { tamanhoDoErro, svgDoGrafico } from '../../src/planilha/desenhoGrafico.js';
import { pacoteDoGrafico, refsDoPlano } from '../../src/planilha/graficoPlano.js';
import { normalizarG } from '../../src/planilha/graficos.js';
import * as O from '../../src/planilha/operacoes.js';

const amostra = (n) => new Uint8Array(readFileSync(new URL(`../amostras/${n}`, import.meta.url)));
const ler = async (n) => (await lerXlsx(amostra(n))).conteudo;
const idDe = (c, nome) => c.ordem.find((id) => c.abas[id].nome === nome);
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
const texto = async (bytes) => { const z = lerZip(bytes); const out = {}; for (const n of z.nomes) out[n] = await z.texto(n); return out; };

/** amostra-formas + uma aba Painel com as 4 peças */
async function comPainel() {
  const c = await ler('amostra-formas.xlsx');
  const idP = idDe(c, 'Painel'), idD = idDe(c, 'Dados');
  const graf = c.abas[idP].objs.find((o) => o.tipo === 'grafico');
  const g = JSON.parse(JSON.stringify(graf.g));
  for (const r of refsDoPlano(g.plano)) if (!r.aba) r.aba = idP;
  const pecas = [];
  pecas.push(novaPeca('texto', { texto: 'Painel da semana (inventado)', tam: 18, negrito: true, al: 'e' }, pecas));
  pecas.push(novaPeca('numero', { f: 'SUM(Dados!B2:B7)', rotulo: 'Não conformidades', meta: { v: 30, sentido: 'menor' }, fc: 'Dados!B6' }, pecas));
  pecas.push(novaPeca('grafico', { g }, pecas));
  pecas.push(novaPeca('tabela', { aba: idD, fx: 'A1:C7', cab: 1 }, pecas));
  c.ordem.push('a9'); c.abas.a9 = { id: 'a9', nome: 'Resumo', cel: {}, painel: { ...painelVazio(), pecas } };
  return { c, idD, idP };
}

test('v0.6.7: peças do painel: lugar livre, sem sobrepor, mover empurra para baixo e Arrumar tira os buracos', () => {
  const pecas = [];
  const a = novaPeca('numero', {}, pecas); pecas.push(a);
  const b = novaPeca('numero', {}, pecas); pecas.push(b);
  const g = novaPeca('grafico', { g: { t: 'colunas', dados: { fx: 'A1:B3' } } }, pecas); pecas.push(g);
  assert.deepEqual([a.x, a.y, b.x, b.y, g.x, g.y], [0, 0, 3, 0, 6, 0], 'enchem a primeira faixa da esquerda para a direita');
  assert.ok(!pecas.some((p) => pecas.some((q) => colide(p, q))));
  const t = novaPeca('texto', { texto: 'x' }, pecas);
  assert.deepEqual([t.x, t.y, t.w], [0, 11, 12], 'texto de largura toda vai para baixo do gráfico');
  const m = moverPeca([...pecas, t], a.id, { x: 6, y: 0 });
  const g2 = m.find((p) => p.id === g.id), a2 = m.find((p) => p.id === a.id);
  assert.deepEqual([a2.x, a2.y], [6, 0]);
  assert.equal(g2.y, 5, 'o gráfico desceu para dar lugar');
  assert.ok(!m.some((p) => m.some((q) => colide(p, q))));
  const ar = arrumar([{ id: 'x', t: 'texto', x: 0, y: 30, w: 4, h: 2 }, { id: 'y', t: 'texto', x: 4, y: 10, w: 4, h: 2 }]);
  assert.deepEqual(ar.map((p) => p.y), [0, 0], 'tudo sobe');
  assert.deepEqual(lugarLivre([{ id: 'q', x: 0, y: 0, w: 12, h: 3 }], 4, 2), { x: 0, y: 3 });
});

test('v0.6.7: número grande: formato, meta (verde/vermelho), comparação em % com seta, erro', () => {
  const f = (v, nf) => (nf === '0%' ? Math.round(v * 100) + '%' : String(v).replace('.', ','));
  let n = textoDoNumero({ meta: { v: 30, sentido: 'menor' } }, 34, 40, f);
  assert.equal(n.texto, '34'); assert.equal(n.cor, '#c0392b'); assert.equal(n.seta, 'baixo'); assert.equal(n.comp, '−15%');
  n = textoDoNumero({ meta: { v: 30, sentido: 'maior' } }, 34, 34, f);
  assert.equal(n.cor, '#2e8b57'); assert.equal(n.seta, null);
  assert.equal(textoDoNumero({ nf: '0%' }, 0.42, null, f).texto, '42%');
  assert.equal(textoDoNumero({}, { cod: '#DIV/0!' }, null, f).texto, '#DIV/0!');
  assert.equal(textoDoNumero({}, 34 / 6, null, f).texto, '5,67', 'sem formato: no máximo 2 casas');
  assert.equal(textoDoNumero({ nf: '0.000' }, 34 / 6, null, (v) => v.toFixed(3)).texto, '5.667', 'com formato: o formato manda');
  assert.equal(textoDaMeta({ v: 0.5, sentido: 'menor' }), 'meta: até 0,5');
  assert.equal(textoDaMeta({ v: 30, sentido: 'maior' }), 'meta: 30 ou mais');
});

test('v0.6.7: o painel guardado é limpo (tipo estranho, tamanhos fora da grade, cor que não é cor)', () => {
  const p = normalizarPainel({ fundo: 'url(x)', pecas: [{ t: 'virus' }, { id: 'a', t: 'texto', x: 50, w: 40, texto: 'oi', cor: 'red' }, { t: 'tabela', fx: 'lixo' }, { t: 'numero', f: 'A1', meta: { v: 'x' } }] });
  assert.equal(p.fundo, '#eef2f5');
  assert.equal(p.pecas.length, 2);
  assert.deepEqual([p.pecas[0].x, p.pecas[0].w, p.pecas[0].cor], [0, PAINEL.COLS, undefined]);
  assert.equal(p.pecas[1].meta, undefined);
  const c = normalizarPlanilha({ v: 1, ordem: ['a1'], abas: { a1: { nome: 'P', cel: {}, painel: { pecas: [{ t: 'texto', texto: 'x' }] } } } });
  assert.ok(ehPainel(c.abas.a1));
});

test('v0.6.7: renomear a aba, inserir linhas e excluir a aba: as contas, as tabelas e os gráficos do painel acompanham', async () => {
  const { c, idD } = await comPainel();
  let c2 = aplicar(c, O.renomearAba(c, idD, 'Base de dados'));
  const num = (cc) => cc.abas.a9.painel.pecas.find((p) => p.t === 'numero');
  assert.equal(num(c2).f, "SUM('Base de dados'!B2:B7)");
  assert.equal(num(c2).fc, "'Base de dados'!B6");
  c2 = aplicar(c2, O.estrutura(c2, idD, 'l', 1, 2));
  assert.equal(num(c2).f, "SUM('Base de dados'!B4:B9)");
  assert.equal(c2.abas.a9.painel.pecas.find((p) => p.t === 'tabela').fx, 'A1:C9');
  const g = c2.abas.a9.painel.pecas.find((p) => p.t === 'grafico').g;
  const r = refsDoPlano(g.plano).find((x) => x.aba === idD && x.fx.includes(':'));
  assert.ok(/9$/.test(r.fx), 'a faixa do gráfico desceu: ' + r.fx);
  const c3 = aplicar(c2, O.excluirAba(c2, idD));
  assert.match(num(c3).f, /#REF!/);
});

test('v0.6.7: salvar como Excel: o painel vira aba com número ligado à célula, gráfico, texto e tabela; abrir de novo traz o Painel', async () => {
  const { c, idD } = await comPainel();
  const { bytes } = await gravarXlsx(c);
  const arq = await texto(bytes);
  const wb = arq['xl/workbook.xml'];
  const n = [...wb.matchAll(/<sheet name="([^"]+)"/g)].findIndex((m) => m[1] === 'Resumo') + 1;
  const sh = arq[`xl/worksheets/sheet${n}.xml`];
  assert.match(sh, /<f>SUM\(Dados!B2:B7\)<\/f><v>34<\/v>/, 'a conta do número numa célula, com o valor de agora');
  assert.match(sh, /<f>Dados!A1<\/f>/, 'a tabela aponta para a aba de origem');
  assert.match(sh, /<pageSetup [^>]*fitToWidth="1" fitToHeight="1"[^>]*orientation="landscape"/, 'imprime numa página deitada');
  assert.match(sh, /<extLst><ext uri="\{5B7C0E1A-EFC0-4D0C-9A57-2F6D1C0E0067\}" xmlns:efc="urn:efcdocs:painel"><efc:painel>/);
  assert.match(sh, /<\/extLst><\/worksheet>$/);
  const dr = arq[`xl/drawings/drawing${n}.xml`];
  assert.match(dr, /textlink="\$[A-Z]+\$\d+"/, 'a caixa do número mostra a célula');
  assert.match(dr, /<a:t>34<\/a:t>/);
  assert.match(dr, /Painel da semana \(inventado\)/);
  assert.match(dr, /graphicFrame/);
  /* o JSON vai com os nomes das abas, não com os ids */
  const json = /<efc:painel>([\s\S]*?)<\/efc:painel>/.exec(sh)[1];
  assert.ok(json.includes('Dados') && !json.includes(`"aba":"${idD}"`));
  /* abrir de novo */
  const { conteudo: c2, relatorio } = await lerXlsx(bytes);
  const A = c2.abas[idDe(c2, 'Resumo')];
  assert.ok(ehPainel(A));
  assert.deepEqual(A.painel.pecas.map((p) => p.t), ['texto', 'numero', 'grafico', 'tabela']);
  assert.equal(A.painel.pecas[3].aba, idDe(c2, 'Dados'));
  assert.equal(A.objs, undefined); assert.deepEqual(A.cel, {});
  assert.ok(relatorio.avisos.some((a) => /voltou como Painel/.test(a)));
  /* número quebrado sem formato: no Excel também no máximo 2 casas */
  const A0 = c.abas[idDe(c, 'Resumo')];
  const c3 = { ...c, abas: { ...c.abas, [A0.id]: { ...A0, painel: { ...A0.painel, pecas: [...A0.painel.pecas, novaPeca('numero', { f: 'AVERAGE(Dados!B2:B7)', rotulo: 'Média' }, A0.painel.pecas)] } } } };
  const arq3 = await texto((await gravarXlsx(c3)).bytes);
  assert.match(arq3[`xl/worksheets/sheet${n}.xml`], /<f>ROUND\(AVERAGE\(Dados!B2:B7\),2\)<\/f><v>5\.67<\/v>/);
});

test('v0.6.7: troca das abas do painel (ids ↔ nomes) cobre tabela, gráfico do EFCdocs e do Excel', () => {
  const p = { pecas: [{ t: 'tabela', aba: 'a2', fx: 'A1' }, { t: 'grafico', g: { t: 'colunas', dados: { aba: 'a2', fx: 'A1:B2' } } }, { t: 'grafico', g: { t: 'excel', plano: { grupos: [{ series: [{ vals: { ref: { aba: 'a2', fx: 'B1' } }, cats: {}, nome: {} }] }] } } }] };
  const q = trocarAbasDoPainel(p, (x) => ({ a2: 'Dados' }[x]));
  assert.equal(q.pecas[0].aba, 'Dados'); assert.equal(q.pecas[1].g.dados.aba, 'Dados'); assert.equal(q.pecas[2].g.plano.grupos[0].series[0].vals.ref.aba, 'Dados');
  assert.equal(p.pecas[0].aba, 'a2', 'o original não muda');
});

test('v0.6.7: barras de erro: tamanho (%, fixo, desvio), desenho e Excel (ida e volta)', async () => {
  const S = { vals: { num: [2, 4, 6] }, erro: { tipo: 'pct', v: 10 } };
  assert.equal(tamanhoDoErro(S, 4), 0.4);
  assert.equal(tamanhoDoErro({ ...S, erro: { tipo: 'fixo', v: 1.5 } }, 4), 1.5);
  assert.equal(tamanhoDoErro({ ...S, erro: { tipo: 'desvio', v: 1 } }, 4), 2);
  const g = normalizarG({ t: 'colunas', dados: { fx: 'A1:B4' }, fx: { series: { 0: { erro: { tipo: 'pct', v: 10 } } } } });
  const d = { cats: ['a', 'b', 'c'], series: [{ nome: 'S', vals: [2, 4, 6] }] };
  const svg = svgDoGrafico(g, d, { w: 400, h: 240 });
  assert.equal((svg.match(/data-erro="1"/g) || []).length, 3);
  /* Excel */
  const c = await ler('amostra-formas.xlsx');
  const A = c.abas[idDe(c, 'Painel')];
  const o = A.objs.find((x) => x.tipo === 'grafico');
  o.g.plano.grupos[0].series[0].erro = { tipo: 'desvio', v: 1 };
  const arq = await texto((await gravarXlsx(c)).bytes);
  const ch = Object.entries(arq).find(([k, v]) => /charts\/chart\d+\.xml$/.test(k) && /errBars/.test(v));
  assert.ok(ch, 'errBars gravado');
  assert.match(ch[1], /<c:errValType val="stdDev"\/><c:noEndCap val="0"\/><c:val val="1"\/>/);
  const c2 = (await lerXlsx((await gravarXlsx(c)).bytes)).conteudo;
  const o2 = c2.abas[idDe(c2, 'Painel')].objs.find((x) => x.tipo === 'grafico');
  assert.deepEqual(o2.g.plano.grupos[0].series[0].erro, { tipo: 'desvio', v: 1 });
});

test('v0.6.7: meta arrastável: a linha da meta vem com a escala (para virar valor ao arrastar)', () => {
  const g = normalizarG({ t: 'colunas', dados: { fx: 'A1:B4' }, op: { meta: 5 } });
  const svg = svgDoGrafico(g, { cats: ['a', 'b'], series: [{ nome: 'S', vals: [2, 8] }] }, { w: 400, h: 240 });
  const m = /data-meta-arrastar="([^"]+)"/.exec(svg);
  assert.ok(m, 'faixa de arrastar');
  const [v0, p0, v1, p1] = m[1].split(',').map(Number);
  assert.ok(v1 > v0 && p0 > p1, 'valor maior fica mais em cima');
});

test('v0.6.7: guardar estilo como modelo: a formatação do gráfico do Excel (sem textos nem dados)', async () => {
  const c = await ler('amostra-v066.xlsx');
  const o = c.abas[idDe(c, 'Painel')].objs.find((x) => x.tipo === 'grafico' && x.g.plano.grupos[0].tipo === 'bar');
  const pac = pacoteDoGrafico(o.g);
  assert.ok(pac.fundo && 'legenda' in pac && pac.legenda.pos === 'r', JSON.stringify(pac));
  assert.equal(pac.titulo.texto, undefined, 'sem o texto do título');
  assert.ok(!JSON.stringify(pac).includes('"ref"'), 'sem as referências dos dados');
  assert.deepEqual(pacoteDoGrafico(normalizarG({ t: 'colunas', dados: { fx: 'A1:B2' }, fx: { paleta: ['#111111'] } })), { paleta: ['#111111'] });
});
