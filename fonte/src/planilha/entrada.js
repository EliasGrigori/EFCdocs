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
