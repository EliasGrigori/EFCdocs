/* v0.6.11 · os 4 defeitos de ida e volta que a rede de fidelidade achou na v0.6.10 (amostra inventada amostra-v0610.xlsx). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';
import { mudancasDoFiltro } from '../../src/planilha/dados.js';

const amostra = () => new Uint8Array(readFileSync(new URL('../amostras/amostra-v0610.xlsx', import.meta.url)));
async function idaVolta() {
  const a = (await lerXlsx(amostra())).conteudo;
  const g = await gravarXlsx(a);
  const z = lerZip(g.bytes); const txt = async (n) => new TextDecoder().decode(await z.bytes(n));
  const partes = {}; for (const n of z.nomes) if (/\.xml$/.test(n)) partes[n] = await txt(n);
  const b = (await lerXlsx(g.bytes)).conteudo;
  return { a, b, g, partes };
}
const aba = (c, nome) => Object.values(c.abas).find((x) => x.nome === nome);

test('v0.6.11 (D-20): tabela com título numérico volta como tabela, com o título em texto igual ao nome da coluna', async () => {
  const { b, g, partes } = await idaVolta();
  assert.ok(Object.values(b.tabelas).some((t) => t.nome === 'TabAnos'), 'TabAnos voltou');
  const tab = Object.entries(partes).find(([n, x]) => /tables\//.test(n) && /name="TabAnos"/.test(x))[1];
  assert.match(tab, /<tableColumn id="2" name="2024"\/>/);
  assert.equal(aba(b, 'TITULO').cel.B1.v, '2024');
  assert.ok(!(g.avisos || []).some((x) => /faixa normal/.test(x)), 'sem o aviso de faixa normal');
});

test('v0.6.11 (D-22): nome de aba com espaço no fim fica exato', async () => {
  const { a, b, partes } = await idaVolta();
  assert.ok(aba(a, 'Resumo '), 'leu com o espaço'); assert.ok(aba(b, 'Resumo '), 'voltou com o espaço');
  assert.match(partes['xl/workbook.xml'], /<sheet name="Resumo "/);
});

test('v0.6.11 (D-23): colunas ocultas até o fim da aba voltam como uma faixa até XFD; reexibir no meio encurta a faixa', async () => {
  const { a, partes } = await idaVolta();
  const folha = Object.entries(partes).find(([n, x]) => /worksheets\/sheet\d+\.xml$/.test(n) && /TabColetas|<autoFilter|hidden="1"/.test(x) && /max="16384"/.test(x));
  assert.ok(folha, 'tem <col ... max="16384" hidden="1">');
  assert.match(folha[1], /<col min="51" max="16384"[^>]*hidden="1"\/>/);
  const co = aba(a, 'Coletas'); assert.equal(co.ocCFim, 50);
  delete co.ocC[51]; // a pessoa reexibiu a coluna AZ
  const z = lerZip((await gravarXlsx(a)).bytes); let xml = '';
  for (const n of z.nomes) { const t = new TextDecoder().decode(await z.bytes(n)); if (/max="16384"/.test(t)) xml = t; }
  assert.match(xml, /<col min="53" max="16384"[^>]*hidden="1"\/>/, 'a faixa começa depois da reexibida');
});

test('v0.6.11 (D-24): critério de data do filtro da tabela volta ao salvar e as linhas continuam ocultas pelo filtro', async () => {
  const { b, partes } = await idaVolta();
  const tab = Object.entries(partes).find(([n, x]) => /tables\//.test(n) && /name="TabColetas"/.test(x))[1];
  assert.match(tab, /<autoFilter ref="A1:C31"><filterColumn colId="0"[^>]*><filters><dateGroupItem year="2026" month="11" dateTimeGrouping="month"\/><\/filters><\/filterColumn><\/autoFilter>/);
  const co = aba(b, 'Coletas');
  assert.equal(Object.keys(co.ocF || {}).length, 12, 'as 12 linhas de outubro continuam ocultas pelo filtro');
});

test('v0.6.11 (D-24): critério de filtro da aba que o app não entende fica em cx; mexer no filtro aqui tira o cx junto', () => {
  const fil = { fx: 'A1:C10', cr: {}, cx: { 0: '<filterColumn><filters><dateGroupItem year="2026" month="11" dateTimeGrouping="month"/></filters></filterColumn>' } };
  const m = mudancasDoFiltro({ ocL: {}, ocF: {} }, 'a1', fil, () => '');
  assert.equal(m['conteudo.abas.a1.fil'].cx, undefined);
});

test('v0.6.11 (D-24, Grok B05): filtro da aba com critério de data vem em cx, volta ao salvar, e o app tem o aviso para quando ele sai', async () => {
  const { AVISO_CX } = await import('../../src/planilha/dados.js');
  const bytes = new Uint8Array(readFileSync(new URL('../amostras/amostra-v0611.xlsx', import.meta.url)));
  const a = (await lerXlsx(bytes)).conteudo; const fd = aba(a, 'FILTRO DATA');
  assert.match(fd.fil.cx[0], /dateGroupItem year="2026" month="11"/);
  assert.equal(Object.keys(fd.ocF || {}).length, 5);
  const z = lerZip((await gravarXlsx(a)).bytes); let achou = false;
  for (const n of z.nomes) if (/worksheets\/sheet\d+\.xml$/.test(n) && /<autoFilter ref="A1:B11"><filterColumn colId="0"[^>]*><filters><dateGroupItem year="2026" month="11"/.test(new TextDecoder().decode(await z.bytes(n)))) achou = true;
  assert.ok(achou, 'o critério volta no autoFilter da aba');
  assert.match(AVISO_CX, /veio do Excel saiu/);
});
