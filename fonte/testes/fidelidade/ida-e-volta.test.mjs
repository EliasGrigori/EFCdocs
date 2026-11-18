/* v0.6.21 parte 2 · Programa de ida e volta (Método Sabiá 2.1, lente 7.3, "Programa do projeto").
   Planilha, Documento e Quadro guardados no aparelho, o PDF do Quadro e a trava do Documento em Word.
   Os conferentes de fora (Python: gzip/base64 próprios, openpyxl e pypdf) são pulados se a máquina não tiver.
   Dados inventados. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import { rodarIdaEVolta } from '../../scripts/fidelidade/ida-e-volta.mjs';
import { montarPdfFolhas } from '../../src/quadro/pdf.js';

const SCRIPTS = fileURLToPath(new URL('../../scripts/fidelidade/', import.meta.url));
const pasta = mkdtempSync(join(tmpdir(), 'efc-iv-teste-'));
const r = await rodarIdaEVolta({ saida: pasta });

test(`ida e volta: ${r.linhas.length} conferências sem diferença (Python ${r.conferentes.python ? 'sim' : 'NÃO'} · openpyxl ${r.conferentes.openpyxl ? 'sim' : 'NÃO'} · pypdf ${r.conferentes.pypdf ? 'sim' : 'NÃO'})`, () => {
  assert.deepEqual(r.linhas.filter((l) => !l.ok).map((l) => `${l.parte}: ${l.texto}`), []);
});

test('ida e volta cobre os três tipos, os dados antigos e a trava do Word', () => {
  const partes = new Set(r.linhas.map((l) => l.parte));
  for (const p of ['banco · postits', 'banco · docx', 'banco · planilha', 'dados antigos', 'Documento em Word', 'Planilha em Excel']) assert.ok(partes.has(p), 'faltou: ' + p);
});

/* Prova de que o conferente de fora acha diferença de verdade (se ele aprovasse tudo, não servia de juiz) */
const estragar = (mexer) => {
  const g = JSON.parse(readFileSync(join(pasta, 'gravado.json'), 'utf8'));
  for (const reg of g.registros) {
    const c = JSON.parse(reg.pacote.fmt === 'gzip' ? gunzipSync(Buffer.from(reg.pacote.dados, 'base64')).toString('utf8') : reg.pacote.dados);
    if (mexer(reg, c) === false) continue;
    const json = JSON.stringify(c), bytes = new TextEncoder().encode(json);
    reg.pacote = { fmt: 'gzip', dados: Buffer.from(gzipSync(bytes)).toString('base64'), bytesOriginal: bytes.length, bytesFinal: 0 };
  }
  const arq = join(pasta, 'estragado.json'); writeFileSync(arq, JSON.stringify(g));
  return spawnSync('python3', [join(SCRIPTS, 'conferir-banco.py'), arq, join(pasta, 'esperado.json')], { encoding: 'utf8' });
};

test('o conferente do banco acusa um acento perdido num post-it', { skip: !r.conferentes.python }, () => {
  const x = estragar((reg, c) => { if (reg.ficha.tipo !== 'postits') return false; c.itens.p2.texto = c.itens.p2.texto.replace('ação', 'acao'); });
  assert.equal(x.status, 1); assert.match(x.stdout, /FALHA quadro: os textos/);
});
test('o conferente do banco acusa um bloco que sumiu do documento', { skip: !r.conferentes.python }, () => {
  const x = estragar((reg, c) => { if (reg.ficha.tipo !== 'docx') return false; c.blocos.splice(3, 1); });
  assert.equal(x.status, 1); assert.match(x.stdout, /FALHA documento: 11 blocos/);
});
test('o conferente do banco acusa um texto mexido numa célula da planilha', { skip: !r.conferentes.openpyxl }, () => {
  let mexeu = '';
  const x = estragar((reg, c) => {
    if (reg.ficha.tipo !== 'planilha') return false;
    for (const a of Object.values(c.abas)) for (const [k, cel] of Object.entries(a.cel)) if (!mexeu && typeof cel.v === 'string' && !cel.f) { mexeu = k; cel.v = cel.v + ' '; }
  });
  assert.ok(mexeu, 'a amostra tem de ter uma célula de texto');
  assert.equal(x.status, 1); assert.match(x.stdout, /FALHA planilha: .*1 diferentes/);
});
test('o conferente do banco acusa pacote que não abre', { skip: !r.conferentes.python }, () => {
  const g = JSON.parse(readFileSync(join(pasta, 'gravado.json'), 'utf8'));
  g.registros[0].pacote.dados = g.registros[0].pacote.dados.slice(0, 40);
  const arq = join(pasta, 'cortado.json'); writeFileSync(arq, JSON.stringify(g));
  const x = spawnSync('python3', [join(SCRIPTS, 'conferir-banco.py'), arq, join(pasta, 'esperado.json')], { encoding: 'utf8' });
  assert.equal(x.status, 1); assert.match(x.stdout, /FALHA pacote de .* não abre fora do app/);
});
test('o conferente do PDF acusa folha a menos e título trocado', { skip: !r.conferentes.pypdf }, () => {
  const jpeg = { bytes: new Uint8Array(readFileSync(join(pasta, 'quadro.pdf'))).slice(0, 0), w: 8, h: 8 };
  const pdf = montarPdfFolhas({ titulo: 'Outro título', rodape: 'x', folhas: [{ jpeg }, { jpeg }] });
  const arq = join(pasta, 'duas-folhas.pdf'); writeFileSync(arq, pdf);
  const x = spawnSync('python3', [join(SCRIPTS, 'conferir-pdf.py'), arq, '3', 'Quadro inventado: ação 001', 'Vértice Docs · exemplo'], { encoding: 'utf8' });
  assert.equal(x.status, 1); assert.match(x.stdout, /FALHA 2 folhas \(pedido: 3\)/); assert.match(x.stdout, /FALHA título em todas as folhas/);
});
