/* Página do anonimizador: escolher o arquivo, ver o relatório, baixar a cópia. Nada sai do computador. */
import { anonimizar } from './anonimizar.js';
const $ = (s) => document.querySelector(s);
const fmtTam = (n) => (n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
const num = (n) => Number(n).toLocaleString('pt-BR');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let pronto = null;

async function tratar(arquivo) {
  if (!arquivo) return;
  if (!/\.(xlsx|xlsm|xltx|xltm)$/i.test(arquivo.name)) { aviso('Escolha um arquivo do Excel (.xlsx ou .xlsm).'); return; }
  $('#passo1').hidden = true; $('#andando').hidden = false; $('#resultado').hidden = true; aviso('');
  try {
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    const t = performance.now();
    const { bytes: novo, relatorio: r } = await anonimizar(bytes, { numeros: $('#numeros').checked });
    pronto = new Blob([novo], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    mostrar(r, Math.round(performance.now() - t));
  } catch (e) { $('#passo1').hidden = false; aviso('Não consegui ler este arquivo. ' + (e && e.message ? e.message : '')); } finally { $('#andando').hidden = true; }
}
function aviso(t) { const a = $('#aviso'); a.textContent = t; a.hidden = !t; }
function mostrar(r, ms) {
  const linhas = [
    ['Textos trocados', num(r.textos)], ['Números trocados', num(r.numeros)], ['Datas e horas mudadas', num(r.datas)],
    ['Textos dentro de fórmulas', num(r.literais)], ['Imagens trocadas por um quadro cinza', num(r.imagens)], ['Partes apagadas (impressora, dados de fora, macros)', num(r.removidas.length)],
  ];
  $('#numerosRel').innerHTML = linhas.map(([a, b]) => `<div class="cx"><b class="num">${b}</b><span>${a}</span></div>`).join('');
  const ok = r.sobrou.length === 0;
  $('#conferencia').className = 'faixa ' + (ok ? 'ok' : 'cr');
  $('#conferencia').innerHTML = ok
    ? `<b>Conferência automática: nada do original foi encontrado.</b> Procurei os ${num(r.conferidos)} textos mais compridos do seu arquivo dentro da cópia e, um por um, os ${num(r.conferidosTodos || 0)} textos originais nos filtros, nas segmentações e nas outras partes: nenhum apareceu.`
    : `<b>Atenção: ${num(r.sobrou.length)} texto(s) do original ainda aparecem na cópia.</b> Não use este arquivo. Avise o Claude e diga em que parte foi: ${esc([...new Set(r.sobrou.map((s) => s.parte))].join(', '))}.`;
  const ficam = [];
  if (r.abas.length) ficam.push(`<li><b>Nomes das abas</b> (ficam como estão): ${r.abas.map(esc).join(' · ')}</li>`);
  if (r.tabelas.length) ficam.push(`<li><b>Nomes das tabelas</b>: ${r.tabelas.map(esc).join(' · ')}</li>`);
  if (r.nomesDefinidos.length) ficam.push(`<li><b>Nomes definidos</b>: ${r.nomesDefinidos.map(esc).join(' · ')}</li>`);
  if ((r.outrosNomes || []).length) ficam.push(`<li><b>Nomes das segmentações, linhas do tempo e tabelas dinâmicas</b>: ${r.outrosNomes.map(esc).join(' · ')}</li>`);
  if ((r.abasDeFora || []).length) ficam.push(`<li><b>Nomes de abas da outra pasta vinculada</b>: ${r.abasDeFora.map(esc).join(' · ')}</li>`);
  ficam.push('<li><b>Fórmulas</b>: a conta e os endereços das células ficam; só os textos entre aspas e os nomes das colunas de tabela mudam.</li>');
  ficam.push('<li><b>Cores, bordas, larguras, mesclas, congelamento e validações</b>: iguais ao original. Os números 0 e 1 também ficam.</li>');
  $('#ficam').innerHTML = ficam.join('');
  const alertas = [];
  if (r.imagensNaoTrocadas.length) alertas.push(`${r.imagensNaoTrocadas.length} imagem(ns) em formato que não sei refazer ficaram como estavam: ${esc(r.imagensNaoTrocadas.join(', '))}. Apague essas imagens no Excel antes de enviar.`);
  if (r.macros) alertas.push('O arquivo tinha macros. Elas foram apagadas da cópia.');
  if (r.tabelaDinamica) alertas.push('O arquivo tem tabela dinâmica. Troquei os dados guardados nela, mas confira essa aba com atenção.');
  if (r.naoConhecidas.length) alertas.push(`Partes que não conheço e deixei como estavam: ${esc(r.naoConhecidas.join(', '))}. Confira antes de enviar.`);
  for (const a of r.avisos) alertas.push(esc(a));
  $('#alertas').hidden = !alertas.length; $('#alertas').innerHTML = alertas.map((a) => `<p>${a}</p>`).join('');
  $('#rodape').textContent = `Arquivo original: ${fmtTam(r.tamanhoAntes)} · cópia: ${fmtTam(r.tamanhoDepois)} · feito em ${(ms / 1000).toFixed(1).replace('.', ',')} s, neste computador.`;
  $('#resultado').hidden = false;
}
function baixar() { if (!pronto) return; const a = document.createElement('a'); a.href = URL.createObjectURL(pronto); a.download = 'planilha-anonimizada.xlsx'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }

$('#arquivo').addEventListener('change', (e) => tratar(e.target.files[0]));
$('#baixar').addEventListener('click', baixar);
$('#outra').addEventListener('click', () => { pronto = null; $('#arquivo').value = ''; $('#resultado').hidden = true; $('#passo1').hidden = false; });
const solta = $('#solta');
['dragenter', 'dragover'].forEach((ev) => solta.addEventListener(ev, (e) => { e.preventDefault(); solta.classList.add('sobre'); }));
['dragleave', 'drop'].forEach((ev) => solta.addEventListener(ev, (e) => { e.preventDefault(); solta.classList.remove('sobre'); }));
solta.addEventListener('drop', (e) => tratar(e.dataTransfer.files[0]));
const tema = () => { const t = document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro'; document.documentElement.dataset.tema = t; };
$('#tema').addEventListener('click', tema);
if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.dataset.tema = 'escuro';
