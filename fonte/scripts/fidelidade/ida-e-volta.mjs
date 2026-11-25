#!/usr/bin/env node
/* Vértice Docs · programa de ida e volta (Método Sabiá 2.1, lente 7.3: Programa do projeto).  npm run test:idaevolta
   O app grava em três lugares; cada um tem a sua ida e volta e o seu conferente de fora:

   1. Planilha em arquivo do Excel (.xlsx)  → scripts/fidelidade/conferir.mjs (célula a célula + openpyxl + LibreOffice).
      É a rede que já existia (npm run test:fidelidade); este programa só confere que ela está ligada.
   2. Planilha, Documento e Quadro (post-its) guardados no aparelho (banco "efcdocs")
        ida e volta: cria pelo mesmo caminho do app (criarBanco › criar/salvar), abre de novo e compara tudo;
        a segunda gravação tem de dar o mesmo; normalizar o que abriu não pode mudar nada;
        dados antigos: os registros de testes/fidelidade/guardados/ (gravados por versões anteriores) têm de abrir;
        conferente de fora: conferir-banco.py (Python) lê os registros crus, descompacta por conta própria e compara
        com o que foi pedido (e, na planilha, com o openpyxl lendo o arquivo original).
   3. Quadro em PDF (o que o app exporta hoje)
        conferente de fora: conferir-pdf.py (pypdf) lê o PDF: número de folhas, tamanho A4 deitado, título e rodapé.

   Documento em Word e em PDF: ainda não existe (chega na v0.7.0). Trava: no dia em que o comando "Exportar Word"
   ligar, este programa FALHA até ganhar o conferente do .docx (python-docx e LibreOffice).

   Uso: node scripts/fidelidade/ida-e-volta.mjs [pasta de saída] [--gravar-guardados]
   Sai com 1 se houver qualquer diferença. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { criarBanco, bancoNaMemoria } from '../../src/nucleo/banco.js';
import { criarArquivo, VERSAO } from '../../src/nucleo/modelo.js';
import { PorId, chegaNa } from '../../src/nucleo/comandos.js';
import * as Q from '../../src/quadro/modelo.js';
import * as D from '../../src/docx/modelo.js';
import { montarPdfFolhas } from '../../src/quadro/pdf.js';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { normalizarPlanilha } from '../../src/planilha/modelo.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '../..');
const GUARDADOS = join(RAIZ, 'testes/fidelidade/guardados');
const AMOSTRA = join(RAIZ, 'testes/amostras/amostra-v0619.xlsx');
const AGORA = '2026-11-15T12:00:00.000Z';

/* ---------- conteúdos inventados (nenhum dado real) ---------- */
const aplicar = (c, mud) => { for (const [k, v] of Object.entries(mud)) { const p = k.split('.'); let o = c; for (let i = 0; i < p.length - 1; i++) o = o[p[i]] || (o[p[i]] = {}); o[p[p.length - 1]] = v; } return c; };

export function quadroInventado() {
  const c = Q.conteudoQuadroVazio();
  const por = (tipo, campos, id) => { const r = Q.novoItem(c, tipo, campos, { id }); aplicar(c, r.mudancas); return r.item; };
  c.etiquetas = [{ id: 'e1', nome: 'Laboratório', cor: '#0f766e' }]; /* v0.6.66 (N1): etiqueta de frente */
  por('postit', { texto: 'Calibrar a balança 001', x: 40, y: 40, resp: 'Pessoa A', prazo: '2026-12-01', g: 3, u: 2, t: 4, fr: 'e1' }, 'p1');
  por('postit', { texto: 'Conferir o lote 0043: ação, não-conformidade e até “aspas”', x: 240, y: 40, cor: 'verde' }, 'p2');
  por('postit', { texto: 'Linha 1\nLinha 2\n=1+1 (texto, não fórmula)', x: 440, y: 40, cor: 'rosa' }, 'p3');
  c.fluxoKanban = true; /* v0.6.68 (R44): fluxo ligado ao Kanban, com quem iniciou e quem concluiu */
  por('processo', { texto: 'Receber a amostra', x: 40, y: 260, col: 'c3', ini: { q: 'Pessoa A', em: '2026-11-25T13:00:00.000Z' }, fim: { q: 'Pessoa B', em: '2026-11-25T15:30:00.000Z' } }, 'f1');
  por('decisao', { texto: 'Está dentro do limite?', x: 260, y: 250 }, 'f2');
  por('inicio', { texto: 'Fim', x: 480, y: 262 }, 'f3');
  por('texto', { texto: 'Texto solto com acento: água, coração', x: 40, y: 400 }, 't1');
  por('raia', { texto: 'Laboratório', x: 0, y: 520 }, 'r1');
  por('pagina', { texto: 'Folha 1', x: 0, y: 0 }, 'g1');
  aplicar(c, Q.novaSeta(c, 'f1', 'f2', { rotulo: 'depois' }, { id: 's1' }).mudancas);
  aplicar(c, Q.novaSeta(c, 'f2', 'f3', { rotulo: 'Sim' }, { id: 's2' }).mudancas);
  return Q.normalizarQuadro(c);
}
export const esperadoQuadro = () => ({
  itens: 9, setas: 2,
  textos: ['Calibrar a balança 001', 'Conferir o lote 0043: ação, não-conformidade e até “aspas”', 'Linha 1\nLinha 2\n=1+1 (texto, não fórmula)', 'Receber a amostra', 'Está dentro do limite?', 'Fim', 'Texto solto com acento: água, coração', 'Laboratório', 'Folha 1'],
  rotulos: ['depois', 'Sim'], colunas: Q.COLUNAS_PADRAO.map((x) => x.nome),
  tarefa: { id: 'p1', resp: 'Pessoa A', prazo: '2026-12-01', g: 3, u: 2, t: 4 },
  etiqueta: { id: 'p1', fr: 'e1', nome: 'Laboratório' },
  andamento: { id: 'f1', col: 'c3', ini: { q: 'Pessoa A', em: '2026-11-25T13:00:00.000Z' }, fim: { q: 'Pessoa B', em: '2026-11-25T15:30:00.000Z' } },
});

export function documentoInventado() {
  const c = D.documentoVazio();
  const b = (x, id) => ({ ...x, id });
  c.blocos = [
    b(D.titulo('Procedimento de exemplo 001', 1), 'b1'),
    b(D.aplicarMarca(D.paragrafo('Texto com negrito no meio e acentuação: é, ã, ç.'), 10, 17, 'n', 1), 'b2'),
    b(D.titulo('Passos', 2), 'b3'),
    b({ ...D.paragrafo('Primeiro passo'), t: 'ol' }, 'b4'),
    b({ ...D.paragrafo('Segundo passo'), t: 'ol' }, 'b5'),
    b({ ...D.paragrafo('Item de lista'), t: 'li' }, 'b6'),
    b({ ...D.paragrafo('Conferido'), t: 'ck' }, 'b7'),
    b(D.tabelaNova(2, 3, 1), 'b8'),
    b(D.assinaturaNova('Pessoa B', 'Função inventada'), 'b9'),
    b(D.quebraNova(), 'b10'),
    b(D.sumarioNovo(), 'b11'),
    b({ ...D.paragrafo(''), tr: [D.trecho('Código: '), { ...D.campoNovo('Código do lote', 'texto', '0043'), cp: { id: 'c1', r: 'Código do lote', k: 'texto' } }] }, 'b12'),
  ];
  return D.normalizarDocumento(c);
}
export const esperadoDocumento = () => ({
  blocos: 12, tipos: ['h1', 'p', 'h2', 'ol', 'ol', 'li', 'ck', 'tab', 'asn', 'quebra', 'sum', 'p'],
  textos: ['Procedimento de exemplo 001', 'Texto com negrito no meio e acentuação: é, ã, ç.', 'Passos', 'Primeiro passo', 'Segundo passo', 'Item de lista', 'Conferido', 'Código: 0043'],
  negrito: 'negrito', assinatura: { nome: 'Pessoa B', cargo: 'Função inventada' },
});

export async function planilhaInventada() {
  return normalizarPlanilha((await lerXlsx(new Uint8Array(readFileSync(AMOSTRA)))).conteudo);
}

/* ---------- comparação ---------- */
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((n) => [n, x[n]])) : x));
function primeiraDiferenca(a, b, onde = '') {
  if (canon(a) === canon(b)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = primeiraDiferenca(a[k], b[k], onde ? onde + '.' + k : k); if (d) return d; }
  }
  return `${onde || '(raiz)'}: ${JSON.stringify(a)?.slice(0, 80)} ≠ ${JSON.stringify(b)?.slice(0, 80)}`;
}

const NORMALIZAR = { planilha: normalizarPlanilha, docx: D.normalizarDocumento, postits: Q.normalizarQuadro };
const JPEG_8 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAIAAgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDoqKKK8Y7j/9k=';

/** Roda tudo. Devolve { linhas: [{ parte, ok, texto }], diferencas: n, conferentes: { python, pypdf } }. */
export async function rodarIdaEVolta({ saida, gravarGuardados = false } = {}) {
  const out = saida || mkdtempSync(join(tmpdir(), 'efc-idaevolta-'));
  mkdirSync(out, { recursive: true });
  const linhas = [];
  const nota = (parte, ok, texto) => linhas.push({ parte, ok, texto });
  const temPy = spawnSync('python3', ['-c', 'import json'], { stdio: 'ignore' }).status === 0;
  const temOpenpyxl = temPy && spawnSync('python3', ['-c', 'import openpyxl'], { stdio: 'ignore' }).status === 0;
  const temPypdf = temPy && spawnSync('python3', ['-c', 'import pypdf'], { stdio: 'ignore' }).status === 0;

  /* 2. banco do aparelho */
  const amostras = [
    { tipo: 'postits', nome: 'Quadro inventado', id: 'iv-quadro', conteudo: quadroInventado(), esperado: esperadoQuadro() },
    { tipo: 'docx', nome: 'Documento inventado', id: 'iv-documento', conteudo: documentoInventado(), esperado: esperadoDocumento() },
    { tipo: 'planilha', nome: 'Planilha inventada', id: 'iv-planilha', conteudo: await planilhaInventada(), esperado: { arquivo: AMOSTRA } },
  ];
  const backend = bancoNaMemoria();
  const banco = criarBanco({ backend, agora: () => AGORA });
  for (const a of amostras) {
    const arq = criarArquivo({ tipo: a.tipo, nome: a.nome, id: a.id, agora: AGORA });
    arq.conteudo = structuredClone(a.conteudo);
    await banco.criar(arq);
    const v1 = await banco.abrir(a.id);
    const d1 = primeiraDiferenca(a.conteudo, v1.conteudo);
    nota(`banco · ${a.tipo}`, !d1, d1 ? `1ª volta diferente em ${d1}` : `1ª volta igual (${v1.tamanho.fmt}, ${v1.tamanho.bytesOriginal} → ${v1.tamanho.bytesFinal} bytes)`);
    await banco.salvar({ ficha: v1.ficha, conteudo: v1.conteudo }, 'salvou', v1.marca);
    const v2 = await banco.abrir(a.id);
    const d2 = primeiraDiferenca(v1.conteudo, v2.conteudo);
    nota(`banco · ${a.tipo}`, !d2, d2 ? `2ª volta diferente em ${d2}` : '2ª volta igual');
    const d3 = primeiraDiferenca(v2.conteudo, NORMALIZAR[a.tipo](structuredClone(v2.conteudo)));
    nota(`banco · ${a.tipo}`, !d3, d3 ? `abrir de novo muda o conteúdo em ${d3}` : 'abrir de novo não muda nada');
    const f = primeiraDiferenca({ ...arq.ficha }, { ...v2.ficha });
    nota(`banco · ${a.tipo}`, !f, f ? `ficha diferente em ${f}` : 'ficha igual');
  }
  const crus = await backend.todos();
  writeFileSync(join(out, 'gravado.json'), JSON.stringify({ versao: VERSAO, registros: crus }));
  writeFileSync(join(out, 'esperado.json'), JSON.stringify(Object.fromEntries(amostras.map((a) => [a.id, { tipo: a.tipo, nome: a.nome, ...a.esperado }]))));
  if (gravarGuardados) { mkdirSync(GUARDADOS, { recursive: true }); writeFileSync(join(GUARDADOS, `registros-${VERSAO}.json`), JSON.stringify({ versao: VERSAO, gravadoEm: AGORA, registros: crus.filter((r) => r.ficha.tipo !== 'planilha') }) + '\n'); }

  /* dados antigos continuam abrindo */
  const antigos = existsSync(GUARDADOS) ? readdirSync(GUARDADOS).filter((n) => n.endsWith('.json')).sort() : [];
  for (const n of antigos) {
    const g = JSON.parse(readFileSync(join(GUARDADOS, n), 'utf8'));
    const b2 = bancoNaMemoria(); for (const r of g.registros) await b2.por(r);
    const banco2 = criarBanco({ backend: b2 });
    let ok = true, msg = '';
    for (const r of g.registros) {
      try {
        const a = await banco2.abrir(r.id);
        const c = NORMALIZAR[r.ficha.tipo](structuredClone(a.conteudo));
        const esp = r.ficha.tipo === 'postits' ? esperadoQuadro() : esperadoDocumento();
        const textos = r.ficha.tipo === 'postits' ? Q.listaItens(c).map((i) => i.texto).sort() : c.blocos.map((x) => D.textoDoBloco(x)).filter(Boolean).sort();
        if (canon(textos) !== canon([...esp.textos].sort())) { ok = false; msg = `${r.ficha.tipo}: os textos mudaram ao abrir`; }
      } catch (e) { ok = false; msg = `${r.ficha.tipo}: não abriu (${String(e.message).slice(0, 80)})`; }
    }
    nota('dados antigos', ok, ok ? `${n}: ${g.registros.length} registros gravados pela ${g.versao} abrem com os mesmos textos` : `${n}: ${msg}`);
  }
  if (!antigos.length) nota('dados antigos', false, 'nenhum registro guardado em testes/fidelidade/guardados (rode com --gravar-guardados)');

  /* conferente de fora do banco */
  if (temPy) {
    const r = spawnSync('python3', [join(AQUI, 'conferir-banco.py'), join(out, 'gravado.json'), join(out, 'esperado.json')], { encoding: 'utf8' });
    for (const l of (r.stdout || '').split('\n').filter(Boolean)) nota('conferente de fora (Python)', !/^FALHA/.test(l), l.replace(/^(ok|FALHA)\s+/, ''));
    if (r.status !== 0 && !/FALHA/.test(r.stdout || '')) nota('conferente de fora (Python)', false, 'não rodou: ' + String(r.stderr || '').slice(-200));
    if (!temOpenpyxl) nota('conferente de fora (Python)', true, 'openpyxl não está nesta máquina: a planilha guardada não foi comparada com o arquivo original (PULADO)');
  } else nota('conferente de fora (Python)', true, 'python3 não está nesta máquina (PULADO)');

  /* 3. PDF do Quadro */
  const jpeg = { bytes: new Uint8Array(Buffer.from(JPEG_8, 'base64')), w: 8, h: 8 };
  const titulo = 'Quadro inventado: ação 001', rodape = 'Vértice Docs · exemplo';
  const pdf = montarPdfFolhas({ titulo, rodape, folhas: [{ jpeg, direita: 'Folha A' }, { jpeg, direita: 'Folha B' }, { jpeg, direita: 'Folha C' }] });
  writeFileSync(join(out, 'quadro.pdf'), pdf);
  if (temPypdf) {
    const r = spawnSync('python3', [join(AQUI, 'conferir-pdf.py'), join(out, 'quadro.pdf'), '3', titulo, rodape], { encoding: 'utf8' });
    for (const l of (r.stdout || '').split('\n').filter(Boolean)) nota('PDF do Quadro (pypdf)', !/^FALHA/.test(l), l.replace(/^(ok|FALHA)\s+/, ''));
    if (r.status !== 0 && !/FALHA/.test(r.stdout || '')) nota('PDF do Quadro (pypdf)', false, 'não rodou: ' + String(r.stderr || '').slice(-200));
  } else nota('PDF do Quadro (pypdf)', true, 'pypdf não está nesta máquina (PULADO)');

  /* trava do Documento em Word */
  const word = PorId['arquivo.exportarWord'];
  const wordLigado = !!word && !chegaNa(word, 'docx');
  const temConferenteDocx = existsSync(join(AQUI, 'conferir-docx.py'));
  nota('Documento em Word', !wordLigado || temConferenteDocx, wordLigado ? (temConferenteDocx ? 'exportar Word ligado e com conferente' : 'o comando Exportar Word LIGOU e ainda não há conferir-docx.py: fazer o conferente antes de entregar') : 'ainda não existe (chega na v0.7.0); a trava está armada');

  /* 1. a rede do .xlsx está no lugar */
  const rede = existsSync(join(AQUI, 'conferir.mjs')) && existsSync(join(RAIZ, 'testes/fidelidade/rede-completa.mjs'));
  nota('Planilha em Excel', rede, rede ? 'rede de ida e volta do .xlsx no lugar (npm run test:fidelidade)' : 'a rede do .xlsx sumiu');

  return { linhas, diferencas: linhas.filter((l) => !l.ok).length, pulados: linhas.filter((l) => /PULADO/.test(l.texto)).length, saida: out, conferentes: { python: temPy, openpyxl: temOpenpyxl, pypdf: temPypdf } };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const r = await rodarIdaEVolta({ saida: args.find((a) => !a.startsWith('--')), gravarGuardados: args.includes('--gravar-guardados') });
  for (const l of r.linhas) console.log(`${l.ok ? '  ok   ' : '  FALHA'} ${l.parte}: ${l.texto}`);
  console.log(`\nida e volta: ${r.linhas.length} conferências, ${r.diferencas} diferença(s), ${r.pulados} pulada(s) · conferentes: Python ${r.conferentes.python ? 'sim' : 'não'} · openpyxl ${r.conferentes.openpyxl ? 'sim' : 'não'} · pypdf ${r.conferentes.pypdf ? 'sim' : 'não'}`);
  process.exit(r.diferencas ? 1 : 0);
}
