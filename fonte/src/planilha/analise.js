/* EFCdocs — Planilha (v0.6.25): as três ideias do Grok aprovadas pelo Elias em 18/11 (relatório da v0.6.23.1, seção 7).
   Conta pura, sem tela (as janelas ficam em analiseUi.jsx):
   - I02 Circular dados inválidos: as células que já têm valor fora da regra de validação (como o "Circular dados inválidos" do Excel).
   - I01 Estatística descritiva: resumo de cada coluna numa aba nova, com fórmulas ligadas aos dados (como o LibreOffice Calc).
   - I04 Amostragem: sorteia N linhas (ou uma a cada k) e copia para uma aba nova, com a linha de origem. */
import { validacaoEm, valorValido } from './regras.js';
import { lerChave, chave, letraCol, nomeAbaNaFormula } from './ref.js';
import { aTexto, ehErro } from './valores.js';
import { novaAba } from './operacoes.js';
import { indiceEstilo } from './modelo.js';

/* ---------------- I02 · circular dados inválidos ---------------- */

/** O Excel circula no máximo 255 células; aqui também (o resto é contado e avisado). */
export const LIMITE_CIRCULOS = 255;

const valorDaCelula = (motor, abaId, l, c) => { const v = motor.valor(abaId, l, c); return v && typeof v === 'object' && !ehErro(v) ? null : v; };

/** A célula tem valor e ele está fora da regra de validação dela? (vazia nunca é inválida, como no Excel) */
export function celulaInvalida(motor, c, abaId, l, col) {
  const aba = c.abas[abaId];
  const r = validacaoEm(aba, l, col);
  if (!r || r.t === 'any') return false;
  const v = valorDaCelula(motor, abaId, l, col);
  if (v == null || v === '') return false;
  if (ehErro(v)) return true;
  return !valorValido(motor, c, abaId, r, l, col, v, aTexto(v));
}

/** Todas as células da aba fora da validação: { cels: [{ l, c }] (até 255, em ordem), total, semRegra }. */
export function celulasInvalidas(motor, c, abaId) {
  const aba = c.abas[abaId];
  if (!aba || !aba.val || !aba.val.length) return { cels: [], total: 0, semRegra: true };
  const cels = [];
  for (const k of Object.keys(aba.cel)) {
    const p = lerChave(k);
    if (p && celulaInvalida(motor, c, abaId, p.l, p.c)) cels.push({ l: p.l, c: p.c });
  }
  cels.sort((a, b) => a.l - b.l || a.c - b.c);
  return { cels: cels.slice(0, LIMITE_CIRCULOS), total: cels.length, semRegra: false };
}

/** Depois de uma mudança: só ficam os círculos das células que continuam erradas (corrigiu, o círculo some, como no Excel). */
export const circulosQueFicam = (motor, c, abaId, cels) => cels.filter((p) => celulaInvalida(motor, c, abaId, p.l, p.c));

/* ---------------- nome de aba nova sem repetir ---------------- */
function nomeLivre(c, base) {
  const usados = new Set(c.ordem.map((id) => String(c.abas[id].nome).toLowerCase()));
  if (!usados.has(base.toLowerCase())) return base;
  let n = 2;
  while (usados.has(`${base} ${n}`.toLowerCase())) n++;
  return `${base} ${n}`;
}

/** Aba nova logo depois da atual, com as células e larguras dadas: { id, nome, mud }. */
function abaComCelulas(c, abaId, base, cel, larg, estilos) {
  const r = novaAba(c, abaId);
  const nome = nomeLivre(c, base);
  const mud = { ...r.mud, [`conteudo.abas.${r.id}`]: { ...r.mud[`conteudo.abas.${r.id}`], nome, cel, larg } };
  if (estilos !== c.estilos) mud['conteudo.estilos'] = estilos;
  return { id: r.id, nome, mud };
}

/* ---------------- I01 · estatística descritiva ---------------- */

/** As medidas, na ordem do LibreOffice (sem curtose e assimetria, que o motor ainda não tem), mais o coeficiente de variação,
    que é o que o controle de qualidade mais usa. § = a faixa da coluna. Fórmulas no formato guardado (inglês, vírgula, sem "="). */
const D3 = '#,##0.000'; /* três casas, como um laudo; o coeficiente de variação em porcentagem e a contagem inteira */
export const MEDIDAS = [
  ['Média', 'AVERAGE(§)', D3], ['Erro padrão', 'STDEV.S(§)/SQRT(COUNT(§))', D3], ['Mediana', 'MEDIAN(§)', D3], ['Moda', 'MODE.SNGL(§)', D3],
  ['Desvio padrão', 'STDEV.S(§)', D3], ['Variância', 'VAR.S(§)', D3], ['Coeficiente de variação', 'STDEV.S(§)/AVERAGE(§)', '0.0%'],
  ['Mínimo', 'MIN(§)', D3], ['Máximo', 'MAX(§)', D3], ['Amplitude', 'MAX(§)-MIN(§)', D3], ['Soma', 'SUM(§)', D3], ['Contagem', 'COUNT(§)'],
];

/** As mesmas medidas, contadas aqui (para a prévia da janela e para os testes). Sem números: tudo null. */
export function resumo(nums) {
  const n = nums.length;
  if (!n) return MEDIDAS.map(() => null);
  const soma = nums.reduce((s, x) => s + x, 0), media = soma / n;
  const ord = [...nums].sort((a, b) => a - b);
  const med = n % 2 ? ord[(n - 1) / 2] : (ord[n / 2 - 1] + ord[n / 2]) / 2;
  const cont = new Map(); let moda = null, max = 1;
  for (const x of nums) { const k = (cont.get(x) || 0) + 1; cont.set(x, k); if (k > max) { max = k; moda = x; } }
  const vari = n > 1 ? nums.reduce((s, x) => s + (x - media) ** 2, 0) / (n - 1) : null;
  const dp = vari == null ? null : Math.sqrt(vari);
  return [media, dp == null ? null : dp / Math.sqrt(n), med, moda, dp, vari, dp == null || !media ? null : dp / media, ord[0], ord[n - 1], ord[n - 1] - ord[0], soma, n];
}

/** Os números de uma coluna da área (sem o cabeçalho). */
export function numerosDaColuna(f, col, cabecalho, valorDe) {
  const out = [];
  for (let l = f.l1 + (cabecalho ? 1 : 0); l <= f.l2; l++) { const v = valorDe(l, col); if (typeof v === 'number' && Number.isFinite(v)) out.push(v); }
  return out;
}

/**
 * Monta a aba de estatística: coluna A com o nome das medidas, uma coluna por coluna escolhida, fórmulas ligadas aos dados
 * (mudou o dado, o resumo acompanha). f: a área; cols: as colunas; titulos(cc): o nome da coluna.
 */
export function montarEstatistica(c, abaId, f, { cols, cabecalho, titulos }) {
  if (!cols.length) return { erro: 'Escolha pelo menos uma coluna com números.' };
  const d0 = f.l1 + (cabecalho ? 1 : 0);
  if (d0 > f.l2) return { erro: 'A área não tem linhas de dados embaixo do cabeçalho.' };
  let estilos = c.estilos;
  const est = (e) => { const r = indiceEstilo(estilos, e); estilos = r.estilos; return r.s; };
  const sNeg = est({ b: 1 }), sNota = est({ i: 1, cor: '#5f6b73' }), sNf = {};
  for (const [, , nf] of MEDIDAS) if (nf && !sNf[nf]) sNf[nf] = est({ nf });
  const cel = { A1: { v: 'Medida', s: sNeg } };
  const aba = nomeAbaNaFormula(c.abas[abaId].nome);
  cols.forEach((cc, i) => {
    const L = letraCol(cc), col = i + 1;
    const t = cabecalho && titulos ? String(titulos(cc) || '') : '';
    cel[chave(0, col)] = { v: t || `Coluna ${L}`, s: sNeg };
    const X = `${aba}!$${L}$${d0 + 1}:$${L}$${f.l2 + 1}`;
    MEDIDAS.forEach(([, fx, nf], k) => { cel[chave(k + 1, col)] = { f: fx.split('§').join(X), ...(nf ? { s: sNf[nf] } : {}) }; });
  });
  MEDIDAS.forEach(([rot], k) => { cel[chave(k + 1, 0)] = { v: rot }; });
  cel[chave(MEDIDAS.length + 2, 0)] = { v: `Fórmulas ligadas a ${c.abas[abaId].nome}, ${letraCol(f.c1)}${d0 + 1}:${letraCol(f.c2)}${f.l2 + 1}: mudou o dado, o resumo acompanha.`, s: sNota };
  const larg = { 0: 180 };
  cols.forEach((_, i) => { larg[i + 1] = 120; });
  return abaComCelulas(c, abaId, 'Estatística', cel, larg, estilos);
}

/* ---------------- I04 · amostragem ---------------- */

/** Número sorteado em [0, n) (crypto quando houver, para não ter viés). */
export function sortear(n) {
  const cr = globalThis.crypto;
  if (cr && cr.getRandomValues) { const a = new Uint32Array(1); const lim = Math.floor(0x100000000 / n) * n; do cr.getRandomValues(a); while (a[0] >= lim); return a[0] % n; }
  return Math.floor(Math.random() * n);
}

/**
 * Escolhe as linhas da amostra entre as candidatas (em ordem). modo 'aleatorio': n linhas sem repetir;
 * 'periodico': uma a cada k, começando num ponto sorteado entre as k primeiras. Devolve as linhas em ordem.
 */
export function escolherLinhas(candidatas, { modo = 'aleatorio', n = 10, k = 5, sorteio = sortear } = {}) {
  if (modo === 'periodico') {
    const passo = Math.max(1, Math.floor(k));
    const ini = sorteio(Math.min(passo, candidatas.length));
    const out = [];
    for (let i = ini; i < candidatas.length; i += passo) out.push(candidatas[i]);
    return out;
  }
  const quantas = Math.max(0, Math.min(Math.floor(n), candidatas.length));
  const v = [...candidatas.keys()];
  for (let i = 0; i < quantas; i++) { const j = i + sorteio(v.length - i); [v[i], v[j]] = [v[j], v[i]]; }
  return v.slice(0, quantas).sort((a, b) => a - b).map((i) => candidatas[i]);
}

/**
 * Monta a aba da amostra: o cabeçalho (se houver), as linhas sorteadas copiadas (valores e formatos; fórmula vira o valor dela)
 * e, se origem, a coluna "Linha" com o número da linha de onde veio. escondida(l): linha oculta (filtro) não entra no sorteio.
 */
export function montarAmostra(c, abaId, f, { cabecalho, modo, n, k, origem = true, escondida = () => false, valorDe, sorteio = sortear, quando = new Date() }) {
  const aba = c.abas[abaId];
  const d0 = f.l1 + (cabecalho ? 1 : 0);
  const candidatas = [];
  for (let l = d0; l <= f.l2; l++) if (!escondida(l)) candidatas.push(l);
  if (!candidatas.length) return { erro: 'Não há linhas de dados para sortear.' };
  const linhas = escolherLinhas(candidatas, { modo, n, k, sorteio });
  if (!linhas.length) return { erro: 'A amostra ficou vazia: aumente a quantidade.' };
  let estilos = c.estilos;
  const sNeg = indiceEstilo(estilos, { b: 1 }); estilos = sNeg.estilos;
  const sNota = indiceEstilo(estilos, { i: 1, cor: '#5f6b73' }); estilos = sNota.estilos;
  const cel = {}, dx = origem ? 1 : 0;
  const copiar = (lo, ld) => {
    for (let cc = f.c1; cc <= f.c2; cc++) {
      const x = aba.cel[chave(lo, cc)];
      if (!x) continue;
      let v = x.f != null ? valorDe(lo, cc) : x.v;
      if (v != null && typeof v === 'object') v = aTexto(v);
      if ((v == null || v === '') && !x.s) continue;
      cel[chave(ld, cc - f.c1 + dx)] = { ...(v != null && v !== '' ? { v } : {}), ...(x.s ? { s: x.s } : {}) };
    }
  };
  let ld = 0;
  if (cabecalho) { copiar(f.l1, 0); if (origem) cel.A1 = { v: 'Linha', s: sNeg.s }; ld = 1; }
  for (const lo of linhas) { copiar(lo, ld); if (origem) cel[chave(ld, 0)] = { v: lo + 1 }; ld++; }
  const dd = (x) => String(x).padStart(2, '0');
  const data = `${dd(quando.getDate())}/${dd(quando.getMonth() + 1)}/${quando.getFullYear()} ${dd(quando.getHours())}:${dd(quando.getMinutes())}`;
  const como = modo === 'periodico' ? `uma a cada ${Math.max(1, Math.floor(k))}` : 'aleatória, sem repetir';
  cel[chave(ld + 1, 0)] = { v: `Sorteio de ${data}: ${linhas.length} de ${candidatas.length} linhas de ${aba.nome}, ${letraCol(f.c1)}${d0 + 1}:${letraCol(f.c2)}${f.l2 + 1} (${como}).`, s: sNota.s };
  const larg = {};
  for (let cc = f.c1; cc <= f.c2; cc++) if (aba.larg && aba.larg[cc] != null) larg[cc - f.c1 + dx] = aba.larg[cc];
  if (origem) larg[0] = 60;
  const r = abaComCelulas(c, abaId, 'Amostra', cel, larg, estilos);
  return { ...r, sorteadas: linhas.length, total: candidatas.length, linhas };
}
