/* Vértice Docs — Ponte 2 (v0.6.17): os campos que o EFCwork sabe preencher. Regras sem tela.
   Um campo é um nome definido do Excel que segue o dicionário do contrato: coleta.os ↔ efc_coleta_os;
   coluna de lista amostras[].data ↔ efc_amostras_data (o nome cobre o intervalo da coluna; a altura é a capacidade).
   Preencher nunca mexe no documento-modelo: devolve uma cópia em memória. */
import { EFD, ROTULOS, ROTULOS_COLUNA } from './ponte.js';
import { chave as chaveCel, lerEndereco, normalFaixa } from '../planilha/ref.js';
import { estiloDe, mescladas, mesclaEm } from '../planilha/modelo.js';
import { ehFormatoData } from '../planilha/formato.js';

export const FOLHAS_MAX = 50, PAGINAS_MAX = 200;
const TIPO_COLUNA = { n: 'numero', qtd: 'numero', data: 'data', hora: 'hora' };
const RX_COLUNA = /^([a-z]+)\[\]\.([a-z]+)$/;

export const tipoDoCampo = (ch) => EFD.CAMPOS[ch] || TIPO_COLUNA[(RX_COLUNA.exec(ch) || [])[2]] || 'texto';
export function rotuloDoCampo(ch) {
  const m = RX_COLUNA.exec(ch);
  return (m ? `${ROTULOS[m[1] + '[]'] || m[1]} · ${ROTULOS_COLUNA[m[2]] || m[2]}` : ROTULOS[ch] || ch).slice(0, 60);
}
/** O dicionário na ordem de mostrar: [{ chave, rotulo, tipo, grupo }] (31 simples e as colunas das 2 listas). */
export function dicionario() {
  const grupo = (ch) => ({ empresa: 'Empresa e unidade', unidade: 'Empresa e unidade', lab: 'Laboratório', envio: 'Envio', coleta: 'Coleta', usuario: 'Quem e quando', hoje: 'Quem e quando', doc: 'Documento' }[ch.split('.')[0]] || 'Outros');
  const out = [];
  for (const ch of Object.keys(EFD.CAMPOS)) {
    if (EFD.CAMPOS[ch] !== 'lista') out.push({ chave: ch, rotulo: rotuloDoCampo(ch), tipo: tipoDoCampo(ch), grupo: grupo(ch) });
    else for (const col of EFD.COLUNAS[ch]) { const k = `${ch}.${col}`; out.push({ chave: k, rotulo: ROTULOS_COLUNA[col] || col, tipo: tipoDoCampo(k), grupo: ROTULOS[ch] || ch, lista: ch }); }
  }
  return out;
}

/** "'Aba 1'!$B$2:$B$9" → { abaId, l1, c1, l2, c2 } (ou null: sem aba, aba que não existe, várias áreas, endereço inválido). */
export function faixaDoNome(c, ref) {
  const m = /^=?(?:'((?:[^']|'')+)'|([^'!,]+))!([^!,]+)$/.exec(String(ref || '').trim());
  if (!m) return null;
  const nome = (m[1] ? m[1].replace(/''/g, "'") : m[2]).toLowerCase();
  const abaId = c.ordem.find((id) => c.abas[id].nome.toLowerCase() === nome);
  const f = lerEndereco(m[3].replace(/\$/g, '').toUpperCase());
  return abaId && f ? { abaId, ...normalFaixa(f) } : null;
}

/**
 * Os campos marcados no livro. Devolve { campos, fora, excesso }:
 * campos: [{ chave, nome, rotulo, tipo, abaId, l1, c1, l2, c2, lista?, col? }] na ordem do dicionário, no máximo 32;
 * fora: nomes que começam com efc_ mas não são do dicionário (ou apontam para lugar inválido): não viram campo;
 * excesso: quantos passaram do limite de 32.
 */
export function camposDoLivro(c) {
  const achados = new Map(), fora = [];
  for (const n of Object.values((c && c.nomes) || {})) {
    if (!n || !/^efc_/i.test(n.n || '')) continue;
    const ch = EFD.chaveDe(n.n), f = ch ? faixaDoNome(c, n.ref) : null;
    if (!ch || !f) { fora.push(n.n); continue; }
    const m = RX_COLUNA.exec(ch);
    achados.set(ch, { chave: ch, nome: n.n, rotulo: rotuloDoCampo(ch), tipo: tipoDoCampo(ch), ...f, ...(m ? { lista: m[1] + '[]', col: m[2] } : {}) });
  }
  const todos = dicionario().map((d) => achados.get(d.chave)).filter(Boolean);
  return { campos: todos.slice(0, EFD.CAMPOS_MAX), fora: fora.sort(), excesso: Math.max(0, todos.length - EFD.CAMPOS_MAX) };
}
/** O que vai em ficha.pub.campos (o EFCwork lê isto para saber o que mandar). */
export const camposParaPub = (campos) => campos.map((x) => ({ chave: x.chave, rotulo: x.rotulo, tipo: x.tipo }));

/* as casas de uma coluna de lista: uma por linha do intervalo, contando a mesclada uma vez só (a âncora) */
function casas(c, campo) {
  const ms = mescladas(c.abas[campo.abaId]), out = [], visto = new Set();
  for (let l = campo.l1; l <= campo.l2; l++) {
    const m = mesclaEm(ms, l, campo.c1), k = m ? chaveCel(m.l1, m.c1) : chaveCel(l, campo.c1);
    if (!visto.has(k)) { visto.add(k); out.push(k); }
  }
  return out;
}
/** Quantas linhas cabem em cada lista marcada: a menor coluna manda. { 'amostras[]': 12 } */
export function capacidades(c, campos) {
  const cap = {};
  for (const x of campos) if (x.lista) { const n = casas(c, x).length; cap[x.lista] = cap[x.lista] == null ? n : Math.min(cap[x.lista], n); }
  return cap;
}

const dataBr = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v)); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v); };
const serial = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v)); return m ? Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000) : null; };
/* o valor que entra na célula: número é número; data e hora viram número do Excel só quando a célula já tem formato de data ou hora
   (senão entra o texto 12/11/2026 ou 08:30, para não aparecer 46338) */
function valorPara(tipo, v, nf) {
  if (v == null) return '';
  if (tipo === 'numero') return typeof v === 'number' ? v : String(v);
  if (tipo === 'data') return ehFormatoData(nf) && serial(v) != null ? serial(v) : dataBr(v);
  if (tipo === 'hora') { const m = /^(\d{2}):(\d{2})$/.exec(String(v)); return m && ehFormatoData(nf) ? (+m[1] * 60 + +m[2]) / 1440 : String(v); }
  return String(v);
}

/**
 * Uma cópia do conteúdo com os dados nos campos. O original não muda (as abas tocadas são copiadas).
 * Campo simples: o valor entra na âncora (a célula de cima à esquerda da mescla). Lista: uma linha por casa, de cima para baixo;
 * as casas que sobram ficam vazias (não imprime a linha de exemplo do modelo). Devolve { conteudo, postos }.
 */
export function preencher(c, campos, dados) {
  const abas = { ...c.abas }, copiada = new Set(), mesc = {};
  let postos = 0;
  const por = (abaId, k, tipo, v) => {
    if (!copiada.has(abaId)) { abas[abaId] = { ...abas[abaId], cel: { ...abas[abaId].cel } }; copiada.add(abaId); }
    const antes = abas[abaId].cel[k], estilo = antes && antes.s != null ? { s: antes.s } : null;
    const valor = valorPara(tipo, v, antes ? estiloDe(c, antes).nf : null);
    /* casa que sobra fica vazia de verdade (sem valor), para as contas do modelo (CONT.VALORES, SOMA) não contarem com ela */
    if (valor === '') { if (estilo) abas[abaId].cel[k] = estilo; else delete abas[abaId].cel[k]; return; }
    abas[abaId].cel[k] = { ...estilo, v: valor };
    postos++;
  };
  for (const x of campos) {
    if (x.lista) {
      if (!(x.lista in dados)) continue;
      const linhas = Array.isArray(dados[x.lista]) ? dados[x.lista] : [];
      casas(c, x).forEach((k, i) => por(x.abaId, k, x.tipo, linhas[i] ? linhas[i][x.col] : null));
    } else if (x.chave in dados) {
      const ms = mesc[x.abaId] || (mesc[x.abaId] = mescladas(c.abas[x.abaId])), m = mesclaEm(ms, x.l1, x.c1);
      por(x.abaId, m ? chaveCel(m.l1, m.c1) : chaveCel(x.l1, x.c1), x.tipo, dados[x.chave]);
    }
  }
  return { conteudo: { ...c, abas }, postos };
}

/**
 * Confere um pedido do EFCwork contra o documento e monta as folhas a imprimir.
 * item: o que veio da caixa ({ pid, docId, de, copias, dados, folhas?, rev?, criadoEm }); c: conteúdo do documento (ou null);
 * revAtual: a versão compartilhada por último. Devolve { erro, detalhe } ou { folhas: [dados...] } (já com as cópias).
 * Erros do contrato: sem-documento, revisao-mudou, campo-desconhecido, nao-cabe.
 */
export function conferirPedido(item, { c, revAtual } = {}) {
  if (!c) return { erro: 'sem-documento', detalhe: 'Este documento não está neste aparelho (ou não é uma planilha).' };
  const forma = EFD.pedido({ v: 1, pid: item.pid, docId: item.docId, de: item.de, copias: item.copias, criadoEm: String(item.criadoEm || '').replace(/\.\d+Z$/, '.000Z'), dados: item.dados, ...(item.folhas != null ? { folhas: item.folhas } : {}) });
  if (forma.length) return { erro: 'campo-desconhecido', detalhe: 'O pedido não segue o combinado: ' + forma.join('; ') };
  if (typeof item.rev === 'number' && revAtual != null && item.rev !== revAtual) return { erro: 'revisao-mudou', detalhe: `O Cwork pediu a versão ${item.rev}, mas a versão compartilhada daqui é a ${revAtual}. Compartilhe de novo.` };
  const { campos } = camposDoLivro(c), marcados = new Set(campos.map((x) => x.lista || x.chave));
  const bases = item.folhas && item.folhas.length ? item.folhas.map((f) => ({ ...item.dados, ...f })) : [item.dados];
  const faltam = [...new Set(bases.flatMap((d) => Object.keys(d)))].filter((k) => !marcados.has(k));
  if (faltam.length) return { erro: 'campo-desconhecido', detalhe: 'O documento não tem campo marcado para: ' + faltam.map((k) => ROTULOS[k] || k).join(', ') + '.' };
  const cap = capacidades(c, campos), folhas = [];
  for (const d of bases) {
    const listas = Object.keys(d).filter((k) => EFD.CAMPOS[k] === 'lista');
    const partes = Math.max(1, ...listas.map((k) => Math.ceil(d[k].length / Math.max(1, cap[k]))));
    /* lista maior que a capacidade: repete a folha com as linhas seguintes (nunca descarta linha em silêncio) */
    for (let p = 0; p < partes; p++) { const f = { ...d }; for (const k of listas) f[k] = d[k].slice(p * cap[k], (p + 1) * cap[k]); folhas.push(f); }
  }
  const total = folhas.length * item.copias;
  if (total > FOLHAS_MAX) return { erro: 'nao-cabe', detalhe: `Daria ${total} folhas; o limite é ${FOLHAS_MAX} por pedido.` };
  const todas = [];
  for (let k = 0; k < item.copias; k++) todas.push(...folhas);
  return { folhas: todas };
}

/** D03: campos de número em que a ficha tem um valor e o envio diz outro. Devolve Map(chave → valor que está na ficha). */
export function divergencias(c, campos, dados) {
  const out = new Map();
  for (const x of campos) {
    if (x.lista || x.tipo !== 'numero' || typeof dados[x.chave] !== 'number') continue;
    const m = mesclaEm(mescladas(c.abas[x.abaId]), x.l1, x.c1), cel = c.abas[x.abaId].cel[m ? chaveCel(m.l1, m.c1) : chaveCel(x.l1, x.c1)];
    if (cel && typeof cel.v === 'number' && cel.f === undefined && cel.v !== dados[x.chave]) out.set(x.chave, cel.v);
  }
  return out;
}
