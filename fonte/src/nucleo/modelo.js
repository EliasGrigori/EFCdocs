/* EFCdocs — modelo de dados comum (ficha + conteúdo).
   A ficha fica sem compactar (busca e filtros precisam dela); o conteúdo vai compactado. */

import { conteudoQuadroVazio } from '../quadro/modelo.js';
import { planilhaVazia } from '../planilha/modelo.js';

export const VERSAO = 'v0.6.2';

export const TIPOS = {
  planilha: { nome: 'Planilha', novo: 'Nova planilha', padrao: 'Planilha sem título', chega: null },
  docx: { nome: 'Documento', novo: 'Novo documento', padrao: 'Documento sem título', chega: 'v0.7.0' },
  postits: { nome: 'Quadro', novo: 'Novo quadro', padrao: 'Quadro sem título', chega: null },
};

let contadorId = 0;
export function novoId(agora = Date.now(), aleatorio = Math.random) {
  contadorId = (contadorId + 1) % 1296;
  return 'd' + agora.toString(36) + contadorId.toString(36).padStart(2, '0') +
    Math.floor(aleatorio() * 1679616).toString(36).padStart(4, '0');
}

export function conteudoVazio(tipo) {
  if (tipo === 'planilha') return planilhaVazia();
  if (tipo === 'docx') return { blocos: [] };
  return conteudoQuadroVazio();
}

export function criarArquivo({ tipo, nome, autor = 'neste aparelho', agora = new Date().toISOString(), id } = {}) {
  if (!TIPOS[tipo]) throw new Error('tipo desconhecido: ' + tipo);
  const n = String(nome || '').trim() || TIPOS[tipo].padrao;
  return {
    ficha: {
      id: id || novoId(), tipo, nome: n.slice(0, 120), status: 'rascunho', rev: 0,
      criadoPor: autor, criadoEm: agora, alteradoPor: autor, alteradoEm: agora,
      cancelado: false, motivo: '', lixeiraEm: null,
    },
    conteudo: conteudoVazio(tipo),
  };
}

export function validarNome(nome) {
  const t = String(nome ?? '').trim();
  if (!t) return 'Digite um nome.';
  if (t.length > 120) return 'Use no máximo 120 letras.';
  if (/[\\/:*?"<>|]/.test(t)) return 'Não use \\ / : * ? " < > | no nome (o Windows não aceita no arquivo exportado).';
  return '';
}

export function carimbar(arquivo, autor = 'neste aparelho', agora = new Date().toISOString()) {
  return { ...arquivo, ficha: { ...arquivo.ficha, alteradoPor: autor, alteradoEm: agora } };
}

export const ativos = (fichas) => fichas.filter((f) => f.status !== 'lixeira');
export const naLixeira = (fichas) => fichas.filter((f) => f.status === 'lixeira');
export const maisRecentes = (fichas) =>
  [...fichas].sort((a, b) => (b.alteradoEm || '').localeCompare(a.alteradoEm || ''));
