#!/usr/bin/env node
/* EFCdocs · as cinco auditorias do Método Sabiá 2.0 contra a linha de base ("não pode piorar").  npm run auditoria
   1 Visual e 2 Rapidez (navegador, no app montado), 3 Fidelidade (ida e volta + openpyxl + LibreOffice),
   4 Segurança (varredura de dado sensível; as palavras do dono vêm de EFC_PALAVRAS, arquivo FORA do projeto),
   5 Código (arquivos acima de 800 linhas).
   Saída em .auditoria/<versão>/ (fora do repositório) com RESUMO.md e os JSON. Sai com 1 se alguma lente PIOROU.
   Variáveis: EFC_BASE (pasta da linha de base; padrão docs/auditorias/base-v0.6.12), EFC_AMOSTRAS_FORA, EFC_PALAVRAS,
   EFC_PULAR (ex.: "visual,rapidez"), CHROME (navegador para o Playwright). */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';
import { VERSAO } from '../../src/nucleo/modelo.js';

const RAIZ = new URL('../../', import.meta.url).pathname;
const BASE = process.env.EFC_BASE || join(RAIZ, 'docs/auditorias/base-v0.6.12');
const OUT = join(RAIZ, '.auditoria', VERSAO); mkdirSync(OUT, { recursive: true });
const PULAR = new Set((process.env.EFC_PULAR || '').split(',').filter(Boolean));
const PORTA = 8741;
const rodar = (cmd, args, opt = {}) => { const t = Date.now(); const r = spawnSync(cmd, args, { cwd: RAIZ, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 3600000, ...opt }); return { ...r, s: ((Date.now() - t) / 1000).toFixed(0) }; };
const ultima = (t, rx) => (String(t || '').split('\n').filter((l) => rx.test(l)).pop() || '').trim();
const linhas = [];
const lente = (nome, meta, base, medido, resultado, piorou) => { linhas.push({ nome, meta, base, medido, resultado, piorou }); console.log(`\n== ${nome}: ${resultado}`); };

/* app montado e servido */
console.log(`Auditorias do EFCdocs ${VERSAO} contra ${BASE.replace(RAIZ, '')}`);
const mont = rodar('npm', ['run', 'build']); if (mont.status !== 0) { console.error(mont.stdout + mont.stderr); process.exit(2); }
const avisosMontar = (mont.stdout + mont.stderr).split('\n').filter((l) => /\[WARNING\]/.test(l)).length;
/* tamanho do que o usuário baixa: js, css e html de dist/ */
const tamanho = (() => { let b = 0, z = 0; const andar = (d) => { for (const n of readdirSync(d)) { const c = join(d, n); if (statSync(c).isDirectory()) andar(c); else if (/\.(js|css|html)$/.test(n)) { const x = readFileSync(c); b += x.length; z += gzipSync(x, { level: 9 }).length; } } }; andar(join(RAIZ, 'dist')); return { bytes: b, compactado: z }; })();
const kb = (n) => `${Math.round(n / 1024)} KB`;
let servidor = null;
const noAr = async () => { try { const r = await fetch(`http://localhost:${PORTA}/`); return r.ok; } catch { return false; } };
if (!(await noAr())) { servidor = spawn('python3', ['scripts/sabia/servir.py', String(PORTA), 'dist'], { cwd: RAIZ, stdio: 'ignore' }); for (let i = 0; i < 50 && !(await noAr()); i++) await new Promise((r) => setTimeout(r, 200)); }

try {
  /* amostra grande (inventada, gerada na hora; não vai para o repositório) */
  const pastaGrande = join(RAIZ, '.auditoria');
  if (!existsSync(join(pastaGrande, 'amostra-grande.xlsx'))) rodar('python3', [join(RAIZ, 'testes/amostras/gerar-amostras-auditoria.py')], { cwd: pastaGrande });

  if (!PULAR.has('visual')) {
    const r = rodar('node', ['scripts/sabia/auditoria-visual.mjs', 'scripts/sabia/efcdocs.config.json', join(OUT, 'visual'), '--base', BASE]);
    const j = existsSync(join(OUT, 'visual/auditoria-visual.json')) ? JSON.parse(readFileSync(join(OUT, 'visual/auditoria-visual.json'), 'utf8')) : { telas: [] };
    const dentro = j.telas.filter((t) => !t.falhou && !t.fora.length).length;
    const melhorou = j.telas.filter((t) => t.melhorou?.length).length;
    lente('1 Visual', 'até 7 letras, 3 cantos, botão ≥ 28 px (44 no toque), 0 maiúsculas, contraste 4,5', '0 de 10 telas dentro', `${dentro} de ${j.telas.length} telas dentro; ${melhorou} melhoraram`, ultima(r.stdout, /Contra a linha de base|telas dentro/), r.status !== 0);
  }
  if (!PULAR.has('rapidez')) {
    const r = rodar('node', ['scripts/sabia/auditoria-rapidez.mjs', 'scripts/sabia/efcdocs.config.json', join(OUT, 'rapidez'), '--base', BASE]);
    const j = existsSync(join(OUT, 'rapidez/auditoria-rapidez.json')) ? JSON.parse(readFileSync(join(OUT, 'rapidez/auditoria-rapidez.json'), 'utf8')) : { medidas: [] };
    const txt = (m) => m.map((x) => `${x.acao.split(' ')[0]}${x.freio > 1 ? ' (4×)' : ''} ${x.falhou ? 'não rodou' : x.ms + ' ms'}`).join('; ');
    const b = JSON.parse(readFileSync(join(BASE, 'auditoria-rapidez.json'), 'utf8')).medidas;
    const tb = JSON.parse(readFileSync(join(BASE, 'codigo.json'), 'utf8')).tamanhoApp;
    const cresceu = tb && tamanho.compactado > tb.compactado * 1.02;
    lente('2 Rapidez', 'ação comum < 100 ms (300 ms com 4× mais lento); app não cresce sem motivo', txt(b) + (tb ? `; app ${kb(tb.bytes)} (${kb(tb.compactado)} compactado)` : ''), txt(j.medidas) + `; app ${kb(tamanho.bytes)} (${kb(tamanho.compactado)} compactado)`, ultima(r.stdout, /Contra a linha de base/) + (cresceu ? ' App cresceu mais de 2%.' : ''), r.status !== 0 || cresceu);
  }
  if (!PULAR.has('fidelidade')) {
    const args = ['scripts/fidelidade/conferir.mjs', 'testes/amostras'];
    const r = rodar('node', args); writeFileSync(join(OUT, 'fidelidade.txt'), r.stdout + r.stderr);
    const novas = (r.stdout.match(/NOVA\b/g) || []).length; const arqs = (r.stdout.match(/^\S+\.xlsx:/gm) || []).length;
    let fora = '';
    if (process.env.EFC_AMOSTRAS_FORA && existsSync(process.env.EFC_AMOSTRAS_FORA)) {
      const f = rodar('node', ['scripts/fidelidade/conferir.mjs', process.env.EFC_AMOSTRAS_FORA, '--fora']); writeFileSync(join(OUT, 'fidelidade-fora.txt'), f.stdout + f.stderr);
      const nf = (f.stdout.match(/NOVA\b/g) || []).length; fora = `; planilha(s) de fora: ${nf ? nf + ' diferença(s) NOVA(S)' : 'nenhuma nova'}`;
      if (nf) r.status = 1;
    }
    lente('3 Fidelidade', '0 diferenças fora das conhecidas', 'medido pela primeira vez nesta versão', `${arqs} amostras: ${novas ? novas + ' diferença(s) NOVA(S)' : 'nenhuma diferença nova'}${fora}`, `${ultima(r.stdout, /^conferentes:/)}`, r.status !== 0);
  }
  if (!PULAR.has('seguranca')) {
    const args = ['scripts/sabia/varredura-sensivel.py', '..', '--ignorar', 'node_modules,dist,.git,.auditoria,assets'];
    if (process.env.EFC_PALAVRAS && existsSync(process.env.EFC_PALAVRAS)) args.push('--palavras', process.env.EFC_PALAVRAS);
    const r = rodar('python3', args); writeFileSync(join(OUT, 'seguranca.txt'), r.stdout + r.stderr);
    const ach = /ACHADOS \((\d+)\)/.exec(r.stdout); const olhar = /PARA OLHAR À MÃO \((\d+)/.exec(r.stdout);
    lente('4 Segurança', '0 achados', '0', `${ach ? ach[1] : 0} achados${process.env.EFC_PALAVRAS ? ' (com as palavras do dono)' : ' (SEM a lista de palavras do dono: EFC_PALAVRAS não definida)'}; ${olhar ? olhar[1] : 0} imagens e arquivos para olhar à mão`, ach ? 'ACHOU' : 'nada achado', !!ach);
  }
  if (!PULAR.has('codigo')) {
    const r = rodar('python3', ['scripts/sabia/medir-codigo.py', 'src', '--testes', 'testes', '--json', join(OUT, 'codigo.json'), '--base', join(BASE, 'codigo.json')]);
    writeFileSync(join(OUT, 'codigo.txt'), r.stdout);
    const b = JSON.parse(readFileSync(join(BASE, 'codigo.json'), 'utf8')); const j = JSON.parse(readFileSync(join(OUT, 'codigo.json'), 'utf8'));
    const avBase = b.avisosMontar ?? 0;
    lente('5 Código', 'nenhum arquivo novo acima de 800 linhas; os grandes não crescem; montar sem avisos', `${Object.keys(b.grandes).length} arquivos acima de 800; ${avBase} aviso(s) ao montar`, `${Object.keys(j.grandes).length} arquivos acima de 800; ${avisosMontar} aviso(s) ao montar`, ultima(r.stdout, /Contra a linha de base/) + (avisosMontar > avBase ? `; avisos ao montar ${avBase} → ${avisosMontar}` : ''), r.status !== 0 || avisosMontar > avBase);
  }
} finally { if (servidor) servidor.kill(); }

const piorou = linhas.filter((l) => l.piorou);
const md = [`# Auditorias do EFCdocs ${VERSAO} (Método Sabiá 2.0)`, '', `Linha de base: \`${BASE.replace(RAIZ, '')}\`. Regra: nenhuma medida pode piorar.`, '', '| Lente | Meta | Linha de base | Medido agora | Contra a base |', '|---|---|---|---|---|',
  ...linhas.map((l) => `| ${l.nome} | ${l.meta} | ${l.base} | ${l.medido} | ${l.piorou ? 'PIOROU · ' : ''}${l.resultado} |`), '', piorou.length ? `**${piorou.length} lente(s) pioraram: a versão não sai sem decisão do dono.**` : 'Nenhuma lente piorou.'];
writeFileSync(join(OUT, 'RESUMO.md'), md.join('\n') + '\n');
console.log('\n' + md.join('\n') + `\n\nArquivos em ${OUT.replace(RAIZ, '')}/`);
process.exit(piorou.length ? 1 : 0);
