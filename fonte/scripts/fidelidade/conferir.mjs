#!/usr/bin/env node
/* EFCdocs · rede de fidelidade (v0.6.10, Método Sabiá 2.0 lente 6.3).
   Para cada .xlsx: 1) ida e volta no próprio EFCdocs (lê → grava → lê, célula a célula; a 2ª volta tem de dar zero);
   2) openpyxl compara o original com o que o EFCdocs salvou; 3) LibreOffice recalcula o que o EFCdocs salvou.
   Uso: node scripts/fidelidade/conferir.mjs <arquivo.xlsx | pasta>... [--sem-libreoffice] [--fora]
   --fora: aplica as diferenças conhecidas das planilhas de fora do repositório (CONHECIDAS_FORA).
   Mostra só endereços, nomes de grupo e contagens; nunca o texto das células. Sai com 1 se houver diferença nova. */
import { existsSync, readFileSync, writeFileSync, mkdirSync, mkdtempSync, readdirSync, statSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, basename, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { normalizarPlanilha } from '../../src/planilha/modelo.js';
import { compararConteudos, resumir } from '../../testes/fidelidade/comparar.mjs';
import { conhecida } from '../../testes/fidelidade/conhecidas.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));

/** Quais conferentes de fora esta máquina tem. */
export function conferentesDisponiveis() {
  const py = spawnSync('python3', ['-c', 'import openpyxl'], { stdio: 'ignore' }).status === 0;
  const lo = ['soffice', 'libreoffice'].some((n) => spawnSync('sh', ['-c', `command -v ${n}`], { stdio: 'ignore' }).status === 0);
  const python = spawnSync('python3', ['-c', '1'], { stdio: 'ignore' }).status === 0;
  return { openpyxl: py, libreoffice: py && lo, python };
}

function rodarPython(script, args) {
  const r = spawnSync('python3', [join(AQUI, script), ...args], { encoding: 'utf8', timeout: 900000, maxBuffer: 64 * 1024 * 1024 });
  return r;
}

/** Confere um arquivo pelos três caminhos. Devolve os grupos de diferença de cada um. */
export async function conferirArquivo(arq, { libreoffice = true, openpyxl = true, pasta } = {}) {
  const tmp = pasta || mkdtempSync(join(tmpdir(), 'efc-fid-'));
  mkdirSync(tmp, { recursive: true });
  const orig = new Uint8Array(readFileSync(arq));
  /* v0.6.14 (D-51): como o app faz: o que é lido passa pela limpeza de quando a planilha fica guardada no aparelho */
  const a = normalizarPlanilha((await lerXlsx(orig)).conteudo);
  /* v0.6.13 (D-29): grava como o app grava, com o original guardado (devolve tabela dinâmica, segmentações, controles, macros) */
  const salvo = (await gravarXlsx(a, null, { original: orig })).bytes;
  const b = (await lerXlsx(salvo)).conteudo;
  /* v0.6.14: a 2ª volta também com o original (sem ele, o tema com figura vira cor lisa de propósito: D-33) */
  const c = (await lerXlsx((await gravarXlsx(b, null, { original: orig })).bytes)).conteudo;
  const d1 = compararConteudos(a, b, { limite: 1e7 }), d2 = compararConteudos(b, c, { limite: 1e7 });
  const out = {
    arquivo: basename(arq),
    idaVolta: resumir(d1).map((g) => ({ grupo: g.grupo, quantas: g.quantas, exemplo: g.exemplo.split(':')[0] })),
    segundaVolta: d2.length,
    calculadas: (d1.calculados || []).length,
  };
  const disp = conferentesDisponiveis();
  const arqSalvo = join(tmp, 'salvo-pelo-efcdocs.xlsx'); writeFileSync(arqSalvo, salvo);
  /* v0.6.13: conferência estrutural (o que faria o Excel pedir reparo): relações, tipos de conteúdo, XML, ordem dos elementos */
  if (disp.openpyxl || disp.python) {
    const r = rodarPython('conferir-estrutura.py', [arqSalvo]);
    const erros = (r.stdout || '').split('\n').filter((l) => /^ {2}\S/.test(l)).map((l) => l.trim());
    /* v0.6.14 (D-50): regras que o Excel cobra e outros leitores deixam passar (prefixo sem declaração, tabelas, estilos...) */
    const r2 = rodarPython('conferir-regras.py', [arqSalvo]);
    const erros2 = (r2.stdout || '').split('\n').filter((l) => /^ {3}\S/.test(l)).map((l) => l.trim());
    if (r2.status === 1) for (const e of erros2) erros.push(e);
    else if (r2.status !== 0) erros.push('erro do conferente de regras: ' + ((r2.stderr || '').split('\n').filter(Boolean).slice(-1)[0] || `saiu com ${r2.status}`));
    out.estrutura = r.status === 0 && !erros.length ? [] : erros.length ? Object.values(erros.reduce((g, e) => { const k = e.split(':')[0].replace(/ \S+$/, ''); (g[k] || (g[k] = { grupo: k, quantas: 0, exemplo: e.slice(0, 120) })).quantas++; return g; }, {})) : [{ grupo: 'erro do conferente: ' + ((r.stderr || '').split('\n').filter(Boolean).slice(-1)[0] || `saiu com ${r.status}`), quantas: 1 }];
  }
  if (openpyxl && disp.openpyxl) {
    const j = join(tmp, 'openpyxl.json'); const r = rodarPython('conferir-openpyxl.py', [arq, arqSalvo, '--json', j]);
    if ((r.status === 0 || r.status === 1) && existsSync(j)) {
      const x = JSON.parse(readFileSync(j, 'utf8'));
      out.openpyxl = Object.entries(x.grupos).map(([grupo, g]) => ({ grupo, quantas: g.quantas, exemplo: (g.exemplos[0] || '').split(' (')[0] }));
    } else out.openpyxl = { erro: (r.stderr || '').split('\n').filter(Boolean).slice(-1)[0] || `saiu com ${r.status}` };
  } else out.openpyxl = null;
  if (libreoffice && disp.libreoffice) {
    const j = join(tmp, 'libreoffice.json'); const r = rodarPython('conferir-libreoffice.py', [arqSalvo, '--json', j, '--pasta-temp', join(tmp, 'lo')]);
    if (r.status === 0 || r.status === 1) {
      const x = JSON.parse(readFileSync(j, 'utf8')); const g = {};
      for (const d of x.diferencas) { const k = d.funcoes.join(',') || '(sem função)'; (g[k] || (g[k] = { grupo: k, quantas: 0, exemplo: d.onde })).quantas++; }
      out.libreoffice = { formulas: x.formulas, naoConhece: x.libreoffice_nao_conhece.length, grupos: Object.values(g) };
    } else out.libreoffice = { erro: (r.stderr || '').split('\n').filter(Boolean).slice(-1)[0] || `saiu com ${r.status}` };
  } else out.libreoffice = null;
  if (!pasta) rmSync(tmp, { recursive: true, force: true });
  return out;
}

/** Separa o que é conhecido do que é novo. */
export function classificar(r, { fora = false } = {}) {
  const novas = [], sabidas = [];
  const ver = (fonte, lista) => { for (const g of lista || []) { const k = conhecida(r.arquivo, fonte, g.grupo, fora); (k ? sabidas : novas).push({ fonte, ...g, ...(k ? { id: k.id, motivo: k.motivo } : {}) }); } };
  ver('idaVolta', r.idaVolta);
  if (r.estrutura) ver('estrutura', r.estrutura);
  if (Array.isArray(r.openpyxl)) ver('openpyxl', r.openpyxl); else if (r.openpyxl?.erro) novas.push({ fonte: 'openpyxl', grupo: 'erro do conferente: ' + r.openpyxl.erro, quantas: 1 });
  if (r.libreoffice?.grupos) ver('libreoffice', r.libreoffice.grupos); else if (r.libreoffice?.erro) novas.push({ fonte: 'libreoffice', grupo: 'erro do conferente: ' + r.libreoffice.erro, quantas: 1 });
  if (r.segundaVolta) novas.push({ fonte: 'idaVolta', grupo: '2ª volta não deu zero', quantas: r.segundaVolta });
  return { novas, sabidas };
}

export const listarXlsx = (alvos) => alvos.flatMap((p) => (statSync(p).isDirectory() ? readdirSync(p).filter((n) => /\.xls[xm]$/i.test(n) && !n.startsWith('~$')).sort().map((n) => join(p, n)) : [p]));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2); const fora = args.includes('--fora'); const semLo = args.includes('--sem-libreoffice');
  const arqs = listarXlsx(args.filter((a) => !a.startsWith('--')));
  if (!arqs.length) { console.log('Uso: node scripts/fidelidade/conferir.mjs <arquivo.xlsx | pasta>... [--sem-libreoffice] [--fora]'); process.exit(2); }
  const disp = conferentesDisponiveis();
  console.log(`conferentes: openpyxl ${disp.openpyxl ? 'sim' : 'não'} · LibreOffice ${disp.libreoffice && !semLo ? 'sim' : 'não'}`);
  let totalNovas = 0;
  for (const arq of arqs) {
    const t = Date.now(); const r = await conferirArquivo(arq, { libreoffice: !semLo }); const { novas, sabidas } = classificar(r, { fora });
    totalNovas += novas.length;
    const lo = r.libreoffice?.formulas != null ? `, LibreOffice recalculou ${r.libreoffice.formulas} fórmulas` + (r.libreoffice.naoConhece ? ` (${r.libreoffice.naoConhece} com função que ele não conhece)` : '') : '';
    console.log(`\n${r.arquivo}: ${novas.length ? novas.length + ' diferença(s) NOVA(S)' : 'nenhuma diferença nova'}, ${sabidas.length} conhecida(s)${lo} · ${((Date.now() - t) / 1000).toFixed(1)} s`);
    for (const n of novas) console.log(`   NOVA  [${n.fonte}] ${n.grupo}: ${n.quantas} (ex.: ${n.exemplo || '-'})`);
    for (const s of sabidas) console.log(`   ${s.id.padEnd(5)} [${s.fonte}] ${s.grupo}: ${s.quantas}`);
  }
  process.exit(totalNovas ? 1 : 0);
}
