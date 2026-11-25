/* v0.6.58: D-30 (forma com foto de fundo perdia a foto ao salvar) e D-17 (estilo de tabela próprio do arquivo não era
   desenhado e sumia do arquivo salvo). Amostra inventada: testes/amostras/amostra-v0658.xlsx (gerar-amostra-v0658.py). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { normalizarPlanilha } from '../../src/planilha/modelo.js';
import { estiloDeTabelaEm } from '../../src/planilha/tabelaEstilo.js';
import { mudarEstilo } from '../../src/planilha/tabelaViva.js';

const ORIG = readFileSync(new URL('../amostras/amostra-v0658.xlsx', import.meta.url));
const ler = async (b) => normalizarPlanilha((await lerXlsx(b)).conteudo);
const painel = (c) => Object.values(c.abas).find((a) => a.nome === 'Painel');
const foto = (c) => painel(c).objs.find((o) => o.nome === 'Forma com foto');
const abaTab = (c) => Object.entries(c.abas).find(([, a]) => a.nome === 'Tabela')[0];
const desenhoSalvo = (bytes) => {
  const d = mkdtempSync(join(tmpdir(), 'v0658-')), f = join(d, 's.xlsx'); writeFileSync(f, bytes);
  return execFileSync('python3', ['-c', `import zipfile,re,sys\nz=zipfile.ZipFile(sys.argv[1])\nn=[x for x in z.namelist() if re.search(r'drawings/drawing\\d+\\.xml$',x)]\nprint(''.join(z.read(x).decode() for x in n))\nprint('@@STYLES@@'+z.read('xl/styles.xml').decode())`, f]).toString();
};

test('D-30: a forma com foto de fundo abre com a foto (não cinza)', async () => {
  const c = await ler(ORIG);
  const p = foto(c).partes[0];
  assert.equal(p.preench.t, 'imagem');
  assert.match(p.preench.src, /^data:image\/png;base64,/);
});

test('D-30: salvar sem mexer, movida ou com outro tamanho: a foto continua no arquivo', async () => {
  const c = await ler(ORIG);
  for (const mexer of [() => {}, (o) => { o.dx += 5; }, (o) => { o.w += 8; }]) {
    const m = structuredClone(c); mexer(foto(m));
    const bytes = (await gravarXlsx(m, null, { original: ORIG })).bytes;
    const xml = desenhoSalvo(bytes).split('@@STYLES@@')[0];
    const sp = xml.split('</xdr:sp>').find((s) => s.includes('Forma com foto'));
    assert.match(sp, /<a:blipFill/, 'a foto de fundo ficou no XML');
    assert.equal(foto(await ler(bytes)).partes[0].preench.t, 'imagem', 'abre de novo com a foto');
  }
});

test('D-30: a cor do texto e o tipo de cada forma voltam iguais (estilo, lumMod, lista, parágrafo, duas cores, âncoras)', async () => {
  const c = await ler(ORIG);
  const resumo = (x) => painel(x).objs.map((o) => [o.tipo, o.nome, (o.partes || []).flatMap((p) => ((p.texto && p.texto.pars) || []).flatMap((pa) => (pa.runs || []).map((r) => r.cor || p.texto.cor))).join(',')].join('|'));
  const antes = resumo(c);
  assert.ok(antes.includes('forma|Texto pelo estilo|#ffffff') && antes.includes('forma|Duas cores|#1f4e79,#e36c09'));
  const depois = resumo(await ler((await gravarXlsx(c, null, { original: ORIG })).bytes));
  assert.deepEqual(depois, antes);
});

test('D-17: o estilo próprio do arquivo vira peças e é desenhado (título escuro, letra branca, listras)', async () => {
  const c = await ler(ORIG);
  const t = Object.values(c.tabelas)[0];
  assert.equal(t.est.nome, 'Estilo da Qualidade');
  assert.deepEqual(t.est.proprio.cab, { f: '#1f3b4d', t: '#ffffff', b: 1 });
  const aba = abaTab(c);
  const cab = estiloDeTabelaEm(c, aba, 0, 0), l2 = estiloDeTabelaEm(c, aba, 1, 1), l3 = estiloDeTabelaEm(c, aba, 2, 1);
  assert.equal(cab.fundo, '#1f3b4d'); assert.equal(cab.cor, '#ffffff'); assert.equal(cab.b, true);
  assert.equal(l2.fundo, '#dcebf5', 'primeira listra');
  assert.equal(l3.fundo, undefined, 'segunda linha sem listra');
});

test('D-17: o estilo próprio volta no arquivo salvo e abre igual de novo', async () => {
  const c = await ler(ORIG);
  const bytes = (await gravarXlsx(c, null, { original: ORIG })).bytes;
  const styles = desenhoSalvo(bytes).split('@@STYLES@@')[1];
  assert.match(styles, /<tableStyle name="Estilo da Qualidade"[^>]*count="3">/);
  const d = await ler(bytes);
  assert.deepEqual(Object.values(d.tabelas)[0].est.proprio, Object.values(c.tabelas)[0].est.proprio);
});

test('D-17: trocar para um estilo da galeria tira o próprio; nome com acento também é lido', async () => {
  const c = await ler(ORIG);
  const k = Object.keys(c.tabelas)[0];
  const r = mudarEstilo(c, k, 'TableStyleLight9');
  const novo = r.mud['conteudo.tabelas'][k];
  assert.equal(novo.est.nome, 'TableStyleLight9'); assert.equal(novo.est.proprio, undefined);
  const { lerTabProprias } = await import('../../src/planilha/xlsx/estilos.js');
  const m = lerTabProprias('<dxfs count="1"><dxf><fill><patternFill patternType="solid"><bgColor rgb="FF112233"/></patternFill></fill></dxf></dxfs><tableStyles count="1"><tableStyle name="Água Clara" count="1"><tableStyleElement type="headerRow" dxfId="0"/></tableStyle></tableStyles>', (d, n) => { const m2 = new RegExp('<' + n + ' rgb="FF([0-9A-F]{6})"').exec(d); return m2 ? '#' + m2[1] : null; });
  assert.deepEqual(m, { 'Água Clara': { cab: { f: '#112233' } } });
});
