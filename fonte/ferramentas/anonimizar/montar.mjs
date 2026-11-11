/* Monta a página única do anonimizador (um arquivo .html só, sem internet). Uso: node ferramentas/anonimizar/montar.mjs [saída] */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const aqui = fileURLToPath(new URL('.', import.meta.url));
const r = await build({ entryPoints: [aqui + 'pagina.js'], bundle: true, minify: true, format: 'iife', write: false, legalComments: 'none' });
const html = readFileSync(aqui + 'pagina.modelo.html', 'utf8').replace('/*__JS__*/', () => r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script'));
const saida = process.argv[2] || aqui + 'anonimizar-planilha.html';
writeFileSync(saida, html); console.log('montado:', saida, Math.round(html.length / 1024) + ' KB');
