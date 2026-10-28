/* v0.6.3 — links das células e imagens: ida e volta pelo .xlsx */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarPlanilha, planilhaVazia } from '../src/planilha/modelo.js';
import { gravarXlsx } from '../src/planilha/xlsx/gravar.js';
import { lerXlsx } from '../src/planilha/xlsx/ler.js';
import { lerZip } from '../src/planilha/xlsx/zip.js';

// PNG de 1x1 pixel (inventado/mínimo)
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

function duasAbas() {
  const c = normalizarPlanilha(planilhaVazia());
  const a1 = c.abas[c.ordem[0]];
  const id2 = 'a2';
  c.abas[id2] = { ...normalizarPlanilha(planilhaVazia()).abas[c.ordem[0]], id: id2, nome: 'Resumo da Loja' };
  c.abas[id2].cel = {};
  c.ordem.push(id2);
  a1.cel.A1 = { v: 'Site' , lk: { t: 'u', u: 'https://www.exemplo.com.br/loja?a=1&b=2', d: 'Abrir o site' } };
  a1.cel.A2 = { v: 'Email', lk: { t: 'u', u: 'mailto:ana@exemplo.com.br' } };
  a1.cel.A3 = { v: 'Ir ao resumo', lk: { t: 'a', a: id2, r: 'B3' } };
  a1.cel.A4 = { v: 'Aba sumida', lk: { t: 'a', a: 'naoexiste', r: 'A1' } };
  return { c, a1, id2 };
}

test('xlsx: links de internet, e-mail e de uma aba para outra fazem a ida e volta', async () => {
  const { c, id2 } = duasAbas();
  const { bytes, avisos } = await gravarXlsx(c, null, {});
  const zip = await lerZip(bytes);
  const folha = await zip.texto('xl/worksheets/sheet1.xml');
  assert.match(folha, /<hyperlinks>/);
  assert.match(folha, /location="'Resumo da Loja'!B3"/);
  assert.ok(folha.indexOf('<hyperlinks>') > folha.indexOf('</sheetData>'));
  const rels = await zip.texto('xl/worksheets/_rels/sheet1.xml.rels');
  assert.match(rels, /Target="https:\/\/www\.exemplo\.com\.br\/loja\?a=1&amp;b=2" TargetMode="External"/);
  assert.match(rels, /Target="mailto:ana@exemplo\.com\.br" TargetMode="External"/);
  assert.ok((avisos || []).some((x) => /aba apagada/.test(x)), 'avisa do link sem aba');
  const volta = (await lerXlsx(bytes, {})).conteudo;
  const a = volta.abas[volta.ordem[0]];
  assert.deepEqual(a.cel.A1.lk, { t: 'u', u: 'https://www.exemplo.com.br/loja?a=1&b=2', d: 'Abrir o site' });
  assert.deepEqual(a.cel.A2.lk, { t: 'u', u: 'mailto:ana@exemplo.com.br' });
  assert.equal(a.cel.A3.lk.t, 'a');
  assert.equal(a.cel.A3.lk.a, volta.ordem[1]);
  assert.equal(a.cel.A3.lk.r, 'B3');
  assert.ok(!a.cel.A4.lk);
  void id2;
});

test('xlsx: imagem fica no desenho da aba e volta com posição e tamanho', async () => {
  const { c, a1 } = duasAbas();
  a1.objs = [{ id: 'i1', tipo: 'imagem', l: 2, c: 1, dx: 10, dy: 5, w: 160, h: 90, src: PNG, nome: 'Logo da loja' }];
  const { bytes } = await gravarXlsx(c, null, {});
  const zip = await lerZip(bytes);
  assert.ok((await zip.bytes('xl/media/image1.png')).length > 20, 'arquivo da figura');
  assert.match(await zip.texto('[Content_Types].xml'), /Extension="png" ContentType="image\/png"/);
  assert.match(await zip.texto('xl/drawings/drawing1.xml'), /<xdr:pic>/);
  assert.match(await zip.texto('xl/drawings/_rels/drawing1.xml.rels'), /relationships\/image" Target="\.\.\/media\/image1\.png"/);
  const volta = (await lerXlsx(bytes, {})).conteudo;
  const o = volta.abas[volta.ordem[0]].objs.find((x) => x.tipo === 'imagem');
  assert.ok(o, 'imagem voltou');
  assert.equal(o.l, 2); assert.equal(o.c, 1);
  assert.ok(Math.abs(o.w - 160) <= 2 && Math.abs(o.h - 90) <= 2, `tamanho ${o.w}x${o.h}`);
  assert.equal(o.nome, 'Logo da loja');
  assert.equal(o.src, PNG);
});

test('xlsx (v0.6.5): botão vai para o Excel como forma com link, e a gente avisa', async () => {
  const { c, a1 } = duasAbas();
  a1.objs = [{ id: 'b1', tipo: 'botao', l: 0, c: 3, dx: 0, dy: 0, w: 180, h: 40, nome: 'Ir ao resumo', alvo: 'a2', ref: 'A1', cor: '#2f6f4f' }];
  const { avisos, bytes } = await gravarXlsx(c, null, {});
  assert.ok(avisos.some((x) => /botão/.test(x) && /forma com link/.test(x)));
  const z = lerZip(bytes);
  assert.ok((await z.texto('xl/drawings/drawing1.xml')).includes('<a:t>Ir ao resumo</a:t>'));
  assert.ok(/Target="#[^"]*!A1"/.test(await z.texto('xl/drawings/_rels/drawing1.xml.rels')));
});
