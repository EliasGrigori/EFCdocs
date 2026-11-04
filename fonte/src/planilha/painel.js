/* EFCdocs v0.6.7 — Painel: uma aba da planilha que é um quadro em branco ligado às outras abas.
   Peças: gráfico (o mesmo gráfico do EFCdocs, com os dados de outra aba), número grande (cartão: uma conta ou uma célula,
   com meta e comparação), texto e tabela (um pedaço de outra aba, ao vivo). As peças encaixam numa grade de 12 colunas;
   "Arrumar" sobe tudo e tira os buracos. Regras puras (sem tela): modelo, encaixe, arrumar, PDF e Excel.

   aba.painel = { pecas: [P], fundo: '#eef2f5' }
   P = { id, t: 'grafico'|'numero'|'texto'|'tabela', x, y, w, h (em casas da grade), ...campos do tipo }
     grafico: g (como o dos objetos de gráfico; dados.aba = id da aba dos dados)
     numero : f (conta em inglês, como as células: 'SUM(Dados!B2:B7)'), rotulo, nf (formato), meta: { v, sentido:'maior'|'menor' }, fc (conta de comparação), cor
     texto  : texto, tam (pt), negrito, al ('e'|'c'|'d'), cor, fundo
     tabela : aba (id), fx ('A1:C8'), cab (1 = 1ª linha é título) */
import { normalizarG } from './graficos.js';
import { faixasDe, textoFaixas } from './regras.js';

export const PAINEL = { COLS: 12, LIN: 24, GAP: 12, PAD: 16, MAX: 60, MIN_W: 640 };
export const TAMANHO_PADRAO = { grafico: { w: 6, h: 11 }, numero: { w: 3, h: 5 }, texto: { w: 12, h: 2 }, tabela: { w: 6, h: 9 } };
export const NOME_PECA = { grafico: 'Gráfico', numero: 'Número', texto: 'Texto', tabela: 'Tabela' };
const COR_OK = /^#[0-9a-f]{6}$/i;
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
const int = (v, a, b, p) => (ehNum(v) ? Math.max(a, Math.min(b, Math.round(v))) : p);
const txt = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');

export const painelVazio = () => ({ pecas: [], fundo: '#eef2f5' });
export const ehPainel = (aba) => !!(aba && aba.painel && Array.isArray(aba.painel.pecas));
let seq = 0;
export const idPeca = () => 'p' + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 5);

/** Limpa o que veio de arquivo, de colar ou de versão antiga. */
export function normalizarPainel(p0) {
  const p = p0 && typeof p0 === 'object' ? p0 : {};
  const out = { pecas: [], fundo: COR_OK.test(p.fundo || '') ? p.fundo : '#eef2f5' };
  const ids = new Set();
  for (const q of Array.isArray(p.pecas) ? p.pecas : []) {
    if (!q || !NOME_PECA[q.t] || out.pecas.length >= PAINEL.MAX) continue;
    let id = typeof q.id === 'string' && q.id.length < 40 ? q.id : idPeca();
    if (ids.has(id)) id = idPeca();
    ids.add(id);
    const pd = TAMANHO_PADRAO[q.t];
    const w = int(q.w, 1, PAINEL.COLS, pd.w);
    const base = { id, t: q.t, x: int(q.x, 0, PAINEL.COLS - w, 0), y: int(q.y, 0, 2000, 0), w, h: int(q.h, 1, 200, pd.h) };
    if (q.t === 'grafico') { if (!q.g) continue; out.pecas.push({ ...base, g: normalizarG(q.g) }); continue; }
    if (q.t === 'numero') {
      const o = { ...base, f: txt(q.f, 2000), rotulo: txt(q.rotulo, 120) };
      if (q.nf) o.nf = txt(q.nf, 80);
      if (q.fc) o.fc = txt(q.fc, 2000);
      if (q.meta && ehNum(q.meta.v)) o.meta = { v: q.meta.v, sentido: q.meta.sentido === 'menor' ? 'menor' : 'maior' };
      if (COR_OK.test(q.cor || '')) o.cor = q.cor;
      out.pecas.push(o); continue;
    }
    if (q.t === 'texto') {
      const o = { ...base, texto: txt(q.texto, 4000), tam: int(q.tam, 6, 72, 14), al: ['e', 'c', 'd'].includes(q.al) ? q.al : 'e' };
      if (q.negrito) o.negrito = true;
      if (COR_OK.test(q.cor || '')) o.cor = q.cor;
      if (COR_OK.test(q.fundo || '') || q.fundo === 'nenhum') o.fundo = q.fundo;
      out.pecas.push(o); continue;
    }
    if (q.t === 'tabela') {
      const fs = faixasDe(txt(q.fx, 40));
      if (!fs.length) continue;
      out.pecas.push({ ...base, aba: txt(q.aba, 40), fx: textoFaixas([fs[0]]), cab: q.cab === 0 ? 0 : 1 });
    }
  }
  return out;
}

/* ---------------- grade: encaixe, lugar livre e arrumar ---------------- */
export const colide = (a, b) => a.id !== b.id && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Primeiro lugar livre (de cima para baixo, da esquerda para a direita) para uma peça w×h. */
export function lugarLivre(pecas, w, h) {
  const W = Math.min(PAINEL.COLS, Math.max(1, w));
  for (let y = 0; y < 4000; y++) {
    for (let x = 0; x <= PAINEL.COLS - W; x++) {
      const p = { id: '#', x, y, w: W, h };
      if (!pecas.some((q) => colide(p, q))) return { x, y };
    }
  }
  return { x: 0, y: Math.max(0, ...pecas.map((q) => q.y + q.h)) };
}

/** Peça nova do tipo t, no primeiro lugar livre. */
export function novaPeca(t, campos, pecas) {
  const pd = TAMANHO_PADRAO[t];
  const w = Math.min(PAINEL.COLS, campos.w || pd.w), h = campos.h || pd.h;
  const lugar = campos.x != null && campos.y != null ? { x: campos.x, y: campos.y } : lugarLivre(pecas, w, h);
  return { ...campos, id: idPeca(), t, x: lugar.x, y: lugar.y, w, h };
}

/** px da tela → casa da grade (para o arrastar), com o encaixe. */
export function medidas(larguraTela) {
  const W = Math.max(PAINEL.MIN_W, larguraTela);
  const col = (W - 2 * PAINEL.PAD - PAINEL.GAP * (PAINEL.COLS - 1)) / PAINEL.COLS;
  return {
    W, col, passoX: col + PAINEL.GAP, passoY: PAINEL.LIN,
    ret: (p) => ({ x: PAINEL.PAD + p.x * (col + PAINEL.GAP), y: PAINEL.PAD + p.y * PAINEL.LIN, w: p.w * (col + PAINEL.GAP) - PAINEL.GAP, h: p.h * PAINEL.LIN - PAINEL.GAP }),
  };
}
export function encaixar(p, M) {
  const w = int(p.w, 1, PAINEL.COLS, 1);
  return { x: int(p.x, 0, PAINEL.COLS - w, 0), y: int(p.y, 0, 4000, 0), w, h: int(p.h, 1, 200, 1) };
}

/** Tira as sobreposições empurrando para baixo quem está embaixo da peça que mudou. */
export function resolver(pecas, fixa) {
  const lista = pecas.map((q) => ({ ...q }));
  const ordem = [...lista].sort((a, b) => (a.id === fixa ? -1 : b.id === fixa ? 1 : a.y - b.y || a.x - b.x));
  const postas = [];
  for (const q of ordem) {
    let volta = 0;
    while (postas.some((r) => colide(q, r)) && volta++ < 4000) {
      const sobre = postas.filter((r) => colide(q, r));
      q.y = Math.max(...sobre.map((r) => r.y + r.h));
    }
    postas.push(q);
  }
  return lista.map((q) => postas.find((r) => r.id === q.id));
}

/** Muda uma peça de lugar ou de tamanho (já em casas da grade) e acomoda as outras. */
export function moverPeca(pecas, id, novo) {
  const lista = pecas.map((q) => (q.id === id ? { ...q, ...encaixar({ ...q, ...novo }) } : q));
  return resolver(lista, id);
}

/** "Arrumar": sobe cada peça o quanto der (sem buracos), na ordem de leitura; larguras que passam da grade voltam para dentro. */
export function arrumar(pecas) {
  const ordem = pecas.map((q) => ({ ...q, ...encaixar(q) })).sort((a, b) => a.y - b.y || a.x - b.x);
  const postas = [];
  for (const q of ordem) {
    let y = 0;
    for (;;) {
      const p = { ...q, y };
      const bate = postas.filter((r) => colide(p, r));
      if (!bate.length) { q.y = y; break; }
      y = Math.max(...bate.map((r) => r.y + r.h));
    }
    postas.push(q);
  }
  return pecas.map((q) => postas.find((r) => r.id === q.id));
}

/** 'meta: até 30' (menor é melhor) ou 'meta: 30 ou mais' */
export const textoDaMeta = (m) => (m ? (m.sentido === 'menor' ? `meta: até ${String(m.v).replace('.', ',')}` : `meta: ${String(m.v).replace('.', ',')} ou mais`) : '');
export const alturaDoPainel = (pecas) => Math.max(0, ...pecas.map((q) => q.y + q.h));

/* ---------------- número grande ---------------- */
/** valor da conta + comparação → { texto, cor, seta ('cima'|'baixo'|null), comp (texto) } (formatar: (v, nf) → texto) */
export function textoDoNumero(peca, valor, comp, formatar) {
  if (valor && typeof valor === 'object' && valor.cod) return { texto: valor.cod, cor: '#c0392b', erro: true };
  /* sem formato escolhido, o cartão mostra no máximo 2 casas (5,67 e não 5,666666…) */
  const geral = !peca.nf || peca.nf === 'General';
  const vv = typeof valor === 'number' && geral && !Number.isInteger(valor) ? Math.round(valor * 100) / 100 : valor;
  const t = vv == null || vv === '' ? '—' : typeof vv === 'number' ? formatar(vv, peca.nf || 'General') : String(vv);
  let cor = peca.cor || null;
  if (peca.meta && typeof valor === 'number') {
    const ok = peca.meta.sentido === 'menor' ? valor <= peca.meta.v : valor >= peca.meta.v;
    cor = ok ? '#2e8b57' : '#c0392b';
  }
  let seta = null, compT = '';
  if (typeof valor === 'number' && typeof comp === 'number') {
    const d = valor - comp;
    seta = d > 0 ? 'cima' : d < 0 ? 'baixo' : null;
    const pct = comp !== 0 ? d / Math.abs(comp) : null;
    compT = (d > 0 ? '+' : d < 0 ? '−' : '') + (pct != null ? Math.abs(Math.round(pct * 1000) / 10).toString().replace('.', ',') + '%' : formatar(Math.abs(d), peca.nf || 'General'));
  }
  return { texto: t, cor, seta, comp: compT };
}

/* ---------------- quando as abas mudam ---------------- */
/** Renomear/excluir aba, inserir/excluir linhas: as contas dos números (texto em inglês) passam pela mesma função das células. */
export function reescreverContas(painel, fn) {
  let mudou = false;
  const pecas = painel.pecas.map((q) => {
    if (q.t !== 'numero') return q;
    const o = { ...q };
    for (const k of ['f', 'fc']) {
      if (!q[k]) continue;
      try { const n = fn(q[k]); if (n !== q[k]) { o[k] = n; mudou = true; } } catch { /* fica */ }
    }
    return o;
  });
  return mudou ? { ...painel, pecas } : painel;
}
/** As faixas das tabelas acompanham as linhas e colunas da aba delas. mover(faixa) → faixa nova ou null. */
export function moverTabelas(painel, abaId, mover) {
  let mudou = false;
  const pecas = painel.pecas.map((q) => {
    if (q.t !== 'tabela' || q.aba !== abaId) return q;
    const f = faixasDe(q.fx)[0];
    const nf = f && mover(f);
    if (!nf) return q;
    const fx = textoFaixas([nf]);
    if (fx === q.fx) return q;
    mudou = true;
    return { ...q, fx };
  });
  return mudou ? { ...painel, pecas } : painel;
}
