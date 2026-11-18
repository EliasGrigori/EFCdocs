/* EFCdocs — Planilha: o que a pessoa digita vira valor (como o Excel em pt-BR),
   com a robustez pedida no PL26: data digitada com a letra O no lugar do zero é corrigida com aviso,
   e data que não existe (31/02) fica como texto com aviso, em vez de virar número errado. */
import { lerNumeroPt, lerDataTexto, lerHoraTexto, serialDe, dataDe, dataValida, ERRO_DE_PT, ERRO_PT, erroPorCodigo } from './valores.js';
import { paraGuardar } from './formula.js';
import { FORMATO_MOEDA, FORMATO_DATA, FORMATO_HORA, MESES, MESES_CURTOS } from './formato.js';

const ehGeral = (c) => !c || /^general$/i.test(c);

/**
 * Lê o texto digitado. Devolve:
 * { vazio } | { f } (fórmula guardada) | { v, nf?, aviso? } | { erro } (fórmula com problema)
 * nf = formato sugerido (só usado se a célula estiver em "Geral").
 */
export function lerEntrada(texto, formatoAtual = 'General') {
  const t = String(texto ?? '');
  if (t === '') return { vazio: true };
  if (formatoAtual === '@') return { v: t };
  if (t[0] === "'") return { v: t.slice(1), texto: true };
  if (t[0] === '=' && t.length > 1) {
    try { return { f: paraGuardar(t.slice(1)) }; } catch (e) { return { erro: e }; }
  }
  const s = t.trim();
  const up = s.toUpperCase();
  if (up === 'VERDADEIRO' || up === 'TRUE') return { v: true };
  if (up === 'FALSO' || up === 'FALSE') return { v: false };
  if (ERRO_DE_PT[up] || ERRO_PT[up]) return { v: erroPorCodigo(ERRO_DE_PT[up] || up) };

  /* porcentagem: 12% · 12,5 % */
  let m = /^([+-]?[\d.,]+(?:[eE][+-]?\d+)?)\s*%$/.exec(s);
  if (m) {
    const n = lerNumeroPt(m[1]);
    if (n != null) return { v: n / 100, nf: /,/.test(m[1]) ? '0.00%' : '0%' };
  }
  /* moeda: R$ 10,50 · -R$ 5 · R$-5 */
  m = /^(-)?\s*R\$\s*(-)?\s*([\d.,]+)$/i.exec(s);
  if (m) {
    const n = lerNumeroPt(m[3]);
    if (n != null) return { v: (m[1] || m[2] ? -1 : 1) * n, nf: FORMATO_MOEDA };
  }
  const n = lerNumeroPt(s);
  /* 001, 0042: só dígitos, começa com zero e tem outro dígito depois (00 e 000 não perguntam). O número perde o zero; quem decide é a pessoa (zeroNaFrente) */
  if (n != null) return /^0\d*[1-9]\d*$/.test(s) ? { v: n, zeroNaFrente: s } : { v: n };

  /* data com a letra O no lugar do zero (1O/1O/2026) */
  const pareceData = /^[\dOo]{1,2}[/-][\dOo]{1,2}([/-][\dOo]{2,4})?$/.test(s) && /[Oo]/.test(s);
  if (pareceData) {
    const corrigida = s.replace(/[Oo]/g, '0');
    const d = lerDataTexto(corrigida);
    if (d != null) return { v: d, nf: FORMATO_DATA, aviso: `Troquei a letra O por zero: ${corrigida}.` };
  }
  const d = lerDataTexto(s);
  if (d != null) return { v: d, nf: FORMATO_DATA };
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/.exec(s);
  if (m) {
    const ano = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    if (!dataValida(ano, +m[2], +m[1])) return { v: t, aviso: `${s} não é uma data que existe. Ficou como texto.` };
  }
  /* data e hora: 25/10/2026 14:30 */
  m = /^(\S+)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/.exec(s);
  if (m) {
    const dd = lerDataTexto(m[1]), hh = lerHoraTexto(m[2]);
    if (dd != null && hh != null) return { v: dd + hh, nf: 'dd/mm/yyyy hh:mm' };
  }
  const h = lerHoraTexto(s);
  if (h != null) {
    /* 25:00 ou mais: o Excel mostra as horas somadas ([h]:mm), não 01:00 do dia seguinte */
    const seg = /:\d{2}:\d{2}/.test(s);
    const nf = h >= 1 ? (seg ? '[h]:mm:ss' : '[h]:mm') : seg ? 'hh:mm:ss' : FORMATO_HORA;
    return { v: h, nf };
  }
  return { v: t };
}

/** Formato que entra na célula ao digitar (só troca se a célula estiver em "Geral"). */
export const formatoAoDigitar = (atual, sugerido) => (sugerido && ehGeral(atual) ? sugerido : null);

/* ---------------- séries da alça de preenchimento ---------------- */

const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const LISTAS = [MESES_CURTOS, MESES, DIAS_CURTOS, DIAS];

function casarCaixa(modelo, t) {
  if (modelo === modelo.toUpperCase()) return t.toUpperCase();
  if (modelo[0] === modelo[0].toUpperCase()) return t[0].toUpperCase() + t.slice(1);
  return t;
}
function naLista(v) {
  if (typeof v !== 'string') return null;
  const k = v.trim().toLowerCase();
  for (const l of LISTAS) { const i = l.indexOf(k); if (i >= 0) return { l, i }; }
  return null;
}
const RX_COD = /^(.*?)(\d+)(\D*)$/;

/* v0.6.23: mais padrões para a alça (pedido do Elias: "colocar A, B e arrastar ficar A, B, C, D") */
const diaDaSemana = (serial) => new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 864e5).getUTCDay();
const util = (serial) => { const d = diaDaSemana(serial); return d !== 0 && d !== 6; };
/** letras como as colunas do Excel: A=1 ... Z=26, AA=27 */
const numDeLetras = (t) => [...t.toUpperCase()].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
const letrasDeNum = (n) => { let t = ''; while (n > 0) { const r = (n - 1) % 26; t = String.fromCharCode(65 + r) + t; n = Math.floor((n - 1) / 26); } return t; };
const ROMANOS = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const romanoDe = (n) => { let t = ''; for (const [v, r] of ROMANOS) while (n >= v) { t += r; n -= v; } return t; };
const numDeRomano = (t) => { const s = String(t).toUpperCase(); if (!/^[IVXLCDM]+$/.test(s)) return null; let n = 0, i = 0; for (const [v, r] of ROMANOS) while (s.startsWith(r, i)) { n += v; i += r.length; } return i === s.length && romanoDe(n) === s ? n : null; };
const passoFixo = (ns) => { const p = ns.length > 1 ? ns[1] - ns[0] : 1; return ns.every((n, i) => !i || n - ns[i - 1] === p) ? p : null; };
const mesmaCaixa = (ts) => ts.every((t) => t === t.toUpperCase()) || ts.every((t) => t === t.toLowerCase());

/**
 * Os próximos "quantos" valores da série a partir dos iniciais (como a alça do Excel).
 * ehData: os iniciais estão em formato de data. Devolve null quando é só copiar.
 */
export function continuarSerie(iniciais, quantos, { ehData = false } = {}) {
  const v = iniciais;
  if (!v.length) return null;
  /* números (e datas) */
  if (v.every((x) => typeof x === 'number')) {
    if (v.length === 1) {
      if (!ehData) return null;
      return Array.from({ length: quantos }, (_, i) => v[0] + i + 1);
    }
    if (ehData) {
      const ds = v.map(dataDe);
      const mesmoDia = ds.every((d) => d.dia === ds[0].dia);
      const passoMeses = (ds[1].ano - ds[0].ano) * 12 + ds[1].mes - ds[0].mes;
      if (mesmoDia && passoMeses !== 0) {
        const ult = ds[ds.length - 1];
        return Array.from({ length: quantos }, (_, i) => {
          const tot = ult.ano * 12 + ult.mes - 1 + passoMeses * (i + 1);
          return serialDe(Math.floor(tot / 12), (tot % 12) + 1, ult.dia);
        });
      }
    }
    /* v0.6.23: dias úteis — datas de semana que pulam o fim de semana (sexta → segunda) continuam pulando */
    if (ehData && v.length >= 3 && v.every(util)) {
      const gaps = v.slice(1).map((x, i) => Math.round(x - v[i]));
      if (gaps.some((g) => g === 3) && gaps.every((g, i) => g === 1 || (g === 3 && diaDaSemana(v[i]) === 5))) {
        const out = []; let d = v[v.length - 1];
        while (out.length < quantos) { d += 1; if (util(d)) out.push(d); }
        return out;
      }
    }
    /* v0.6.23: multiplicando (2, 4, 8 → 16, 32): só com 3 ou mais números e quando a soma não é constante */
    if (!ehData && v.length >= 3 && v.every((x) => x !== 0) && passoFixo(v) === null) {
      const r = v[1] / v[0];
      if (r !== 1 && v.every((x, i) => !i || Math.abs(x / v[i - 1] - r) < 1e-9)) {
        const ult = v[v.length - 1];
        return Array.from({ length: quantos }, (_, i) => Number((ult * r ** (i + 1)).toPrecision(15)));
      }
    }
    const passo = (v[v.length - 1] - v[0]) / (v.length - 1);
    const ult = v[v.length - 1];
    return Array.from({ length: quantos }, (_, i) => Number((ult + passo * (i + 1)).toPrecision(15)));
  }
  /* meses e dias da semana */
  const ls = v.map(naLista);
  if (ls.every(Boolean) && ls.every((x) => x.l === ls[0].l)) {
    const lista = ls[0].l;
    const passo = v.length > 1 ? ls[1].i - ls[0].i : 1;
    const ult = ls[ls.length - 1].i;
    return Array.from({ length: quantos }, (_, i) => casarCaixa(v[v.length - 1], lista[(((ult + passo * (i + 1)) % lista.length) + lista.length) % lista.length]));
  }
  /* v0.6.23: algarismos romanos (I, II → III, IV), com 2 ou mais */
  if (v.length >= 2 && v.every((x) => typeof x === 'string')) {
    const rs = v.map(numDeRomano);
    const p = rs.every((n) => n) ? passoFixo(rs) : null;
    if (p && v.some((x) => x.length > 1)) { /* só letras soltas (C, D) são letras, não romanos */
      const minus = v[0] === v[0].toLowerCase();
      const out = Array.from({ length: quantos }, (_, i) => rs[rs.length - 1] + p * (i + 1));
      if (out.every((n) => n > 0 && n < 4000)) return out.map((n) => (minus ? romanoDe(n).toLowerCase() : romanoDe(n)));
    }
  }
  /* v0.6.23: letras (A, B → C, D; AA, AB → AC) e texto terminado em letra (Amostra A, Amostra B → Amostra C), com 2 ou mais */
  if (v.length >= 2 && v.every((x) => typeof x === 'string')) {
    const ms = v.map((x) => /^(.*?[\s\-_./]|)([A-Za-z]{1,2})$/.exec(x));
    if (ms.every(Boolean) && ms.every((m) => m[1] === ms[0][1] && m[2].length === ms[0][2].length) && mesmaCaixa(ms.map((m) => m[2]))) {
      const ns = ms.map((m) => numDeLetras(m[2]));
      const p = passoFixo(ns);
      /* duas letras só andando de um em um (AA, AB), para não "continuar" siglas como OK, NG */
      if (p && (ms[0][2].length === 1 || Math.abs(p) === 1)) {
        const minus = ms[0][2] === ms[0][2].toLowerCase(), pre = ms[0][1];
        const out = Array.from({ length: quantos }, (_, i) => ns[ns.length - 1] + p * (i + 1));
        if (out.every((n) => n > 0 && n <= 702)) return out.map((n) => pre + (minus ? letrasDeNum(n).toLowerCase() : letrasDeNum(n)));
      }
    }
  }
  /* códigos com número no fim: Q-001, Lote 12 */
  const cs = v.map((x) => (typeof x === 'string' ? RX_COD.exec(x) : null));
  if (cs.every(Boolean) && cs.every((m) => m[1] === cs[0][1] && m[3] === cs[0][3])) {
    const nums = cs.map((m) => +m[2]);
    const passo = nums.length > 1 ? (nums[nums.length - 1] - nums[0]) / (nums.length - 1) : 1;
    const ult = cs[cs.length - 1];
    const largura = ult[2].length;
    return Array.from({ length: quantos }, (_, i) => {
      const k = Math.round(nums[nums.length - 1] + passo * (i + 1));
      const tx = String(Math.abs(k)).padStart(ult[2].startsWith('0') || largura > 1 ? largura : 1, '0');
      return ult[1] + (k < 0 ? '-' : '') + tx + ult[3];
    });
  }
  return null;
}

/* ---------------- copiar e colar (Excel, Google Planilhas, outros) ---------------- */

/** Texto separado por tabulação (o que o Excel põe na área de transferência). */
export function lerTSV(texto) {
  const t = String(texto).replace(/\r\n?/g, '\n').replace(/\n$/, '');
  const linhas = [];
  let lin = [], campo = '', i = 0, aspas = false;
  while (i < t.length) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"' && t[i + 1] === '"') { campo += '"'; i += 2; continue; }
      if (ch === '"') { aspas = false; i++; continue; }
      campo += ch; i++; continue;
    }
    if (ch === '"' && campo === '') { aspas = true; i++; continue; }
    if (ch === '\t') { lin.push(campo); campo = ''; i++; continue; }
    if (ch === '\n') { lin.push(campo); linhas.push(lin); lin = []; campo = ''; i++; continue; }
    campo += ch; i++;
  }
  lin.push(campo);
  linhas.push(lin);
  return linhas;
}

export function escreverTSV(linhas) {
  return linhas.map((l) => l.map((x) => {
    const s = String(x ?? '');
    return /[\t\n"]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join('\t')).join('\r\n') + '\r\n';
}

/** Tabela HTML (do Excel ou de páginas) → linhas de { texto, formula? } usando o DOM do navegador. */
export function lerTabelaHTML(html, DOM = typeof DOMParser !== 'undefined' ? DOMParser : null) {
  if (!DOM || !html || !/<table/i.test(html)) return null;
  const doc = new DOM().parseFromString(html, 'text/html');
  const tab = doc.querySelector('table');
  if (!tab) return null;
  const out = [];
  for (const tr of tab.querySelectorAll('tr')) {
    const lin = [];
    for (const td of tr.querySelectorAll('td,th')) {
      const f = td.getAttribute('x:fmla') || td.getAttribute('data-efc-f');
      const span = +(td.getAttribute('colspan') || 1);
      lin.push({ texto: td.textContent.replace(/ /g, ' ').trim(), formula: f || null });
      for (let i = 1; i < span; i++) lin.push({ texto: '' });
    }
    out.push(lin);
  }
  return out;
}

export const escHTML = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
