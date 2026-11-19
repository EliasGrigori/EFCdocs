/* Vértice Docs v0.6.36 — Planilha: Dados › Texto para colunas (D9, primeira parte), como o assistente do Excel.
   Fica fora de Planilha.jsx (arquivo grande não cresce): aqui só as regras, sem tela.
   - Delimitado: tabulação, ponto e vírgula, vírgula, espaço e outro; "considerar separadores seguidos como um só";
     texto entre aspas não é cortado (as aspas saem, "" vira ").
   - Largura fixa: cortes nas posições escolhidas.
   - Formato de cada coluna: Geral (o texto vira número, data, moeda... como se fosse digitado), Texto (fica como está)
     ou Pular (a coluna não vai para a planilha).
   - Destino: a primeira célula escolhida (por padrão a própria). Avisa quantas células com dado serão substituídas. */
import { chave, normalFaixa, letraCol } from './ref.js';
import { Lote } from './operacoes.js';
import { estiloDe } from './modelo.js';
import { lerEntrada } from './entrada.js';

export const SEPARADORES = [['tab', 'Tabulação', '\t'], ['pv', 'Ponto e vírgula', ';'], ['virgula', 'Vírgula', ','], ['espaco', 'Espaço', ' ']];
export const MAX_COLUNAS = 200;
export const MAX_LINHAS = 100000;

/** Corta um texto pelos separadores. op = { seps: { tab, pv, virgula, espaco }, outro: 'x', juntar: bool, aspas: '"' | '' } */
export function cortarDelimitado(texto, op) {
  const t = String(texto ?? '');
  const marcas = new Set(SEPARADORES.filter(([id]) => op.seps && op.seps[id]).map(([, , ch]) => ch));
  if (op.outro) marcas.add(String(op.outro)[0]);
  if (!marcas.size) return [t];
  const q = op.aspas === undefined ? '"' : op.aspas;
  const partes = [];
  let atual = '', dentro = false, foiAspas = false, i = 0;
  while (i < t.length) {
    const ch = t[i];
    if (q && ch === q) {
      if (dentro && t[i + 1] === q) { atual += q; i += 2; continue; }
      if (dentro) { dentro = false; i++; continue; }
      if (atual === '') { dentro = true; foiAspas = true; i++; continue; }
    }
    if (!dentro && marcas.has(ch)) {
      partes.push({ t: atual, aspas: foiAspas }); atual = ''; foiAspas = false; i++;
      if (op.juntar) while (i < t.length && marcas.has(t[i])) i++;
      continue;
    }
    atual += ch; i++;
  }
  partes.push({ t: atual, aspas: foiAspas });
  /* "seguidos como um só" também ignora o separador no começo (como o Excel com espaços na frente) */
  if (op.juntar && partes.length > 1 && partes[0].t === '' && !partes[0].aspas) partes.shift();
  return partes.map((p) => p.t);
}

/** Corta um texto nas posições (largura fixa). cortes: posições em letras, crescentes, maiores que 0. */
export function cortarFixo(texto, cortes) {
  const t = String(texto ?? '');
  const cs = [...new Set((cortes || []).map((n) => Math.round(n)).filter((n) => n > 0))].sort((a, b) => a - b);
  const partes = [];
  let ini = 0;
  for (const c of cs) { partes.push(t.slice(ini, c)); ini = c; }
  partes.push(t.slice(ini));
  /* o Excel tira os espaços do fim de cada pedaço na largura fixa */
  return partes.map((p) => p.replace(/\s+$/, ''));
}

/** Corta conforme o modo. op.modo = 'separador' | 'fixo'. */
export const cortar = (texto, op) => (op.modo === 'fixo' ? cortarFixo(texto, op.cortes) : cortarDelimitado(texto, op));

/** Sugestão de cortes para a largura fixa: posições onde todas as linhas têm espaço e a seguinte não (no máximo 20). */
export function sugerirCortes(textos) {
  const ts = textos.filter((t) => t !== '').slice(0, 200);
  if (!ts.length) return [];
  const max = Math.max(...ts.map((t) => t.length));
  const vazia = (p) => ts.every((t) => p >= t.length || t[p] === ' ');
  const cortes = [];
  for (let p = 1; p < max && cortes.length < 20; p++) if (vazia(p - 1) && !vazia(p)) cortes.push(p);
  return cortes;
}

/** Prévia: as primeiras linhas já cortadas (para a janela). */
export function previa(textos, op, n = 8) {
  const linhas = textos.slice(0, n).map((t) => cortar(t, op));
  const colunas = Math.min(MAX_COLUNAS, Math.max(1, ...linhas.map((l) => l.length)));
  return { linhas, colunas };
}

/** Valor e formato sugerido para um pedaço, conforme o formato da coluna ('geral' | 'texto'). */
export function valorDoPedaco(t, formato) {
  if (t === '') return { vazio: true };
  if (formato === 'texto') return { v: t, nf: '@' };
  if (t[0] === '=') return { v: t }; /* fórmula vinda de texto não é executada: fica como texto (o Excel também não calcula) */
  const r = lerEntrada(t, 'General');
  if (r.vazio || r.erro || r.f != null) return { v: t };
  /* 001 vira 1 no formato Geral, como no Excel; para manter o zero, a pessoa escolhe Texto na coluna */
  return { v: r.v, nf: r.nf };
}

/**
 * Faz o corte na planilha. faixa: a coluna escolhida (uma só). op: modo, seps, outro, juntar, aspas, cortes, formatos[] ('geral'|'texto'|'pular'),
 * destino: { l, c } (padrão: a primeira célula da faixa). textoDe(l, c): o texto que aparece na célula (o que vai ser cortado).
 * Devolve { lote, linhas, colunas, substitui } ou { erro }. Com conferir=true não monta o lote (só conta o que seria substituído).
 */
export function textoParaColunas(c, abaId, faixa, op, { textoDe, destino, conferir = false } = {}) {
  const aba = c.abas[abaId];
  const f = normalFaixa(faixa);
  if (f.c1 !== f.c2) return { erro: 'Escolha uma coluna só (o Excel também pede assim).' };
  if (f.l2 - f.l1 + 1 > MAX_LINHAS) return { erro: `Escolha até ${MAX_LINHAS.toLocaleString('pt-BR')} linhas.` };
  const d = destino || { l: f.l1, c: f.c1 };
  const formatos = op.formatos || [];
  const lote = conferir ? null : new Lote(c);
  let substitui = 0, colunas = 0, linhas = 0, comFormula = 0;
  const vistas = new Set();
  for (let l = f.l1; l <= f.l2; l++) {
    const k0 = chave(l, f.c1), orig = aba.cel[k0];
    if (orig && orig.f != null) { comFormula++; continue; } /* célula com fórmula não é cortada (o Excel corta o resultado; aqui fica como está, com aviso) */
    const t = textoDe(l, f.c1);
    if (t == null || t === '') continue;
    linhas++;
    const partes = cortar(t, op).slice(0, MAX_COLUNAS);
    let col = d.c;
    for (let i = 0; i < partes.length; i++) {
      const fm = formatos[i] || 'geral';
      if (fm === 'pular') continue;
      const ll = d.l + (l - f.l1), cc = col++;
      if (cc > 16383) return { erro: 'O resultado passa da última coluna (XFD). Escolha um destino mais à esquerda.' };
      colunas = Math.max(colunas, cc - d.c + 1);
      const k = chave(ll, cc);
      const atual = (lote ? lote.pegar(abaId, k) : aba.cel[k]);
      const ehOrigem = ll === l && cc === f.c1;
      if (!ehOrigem && !vistas.has(k) && atual && (atual.v !== undefined && atual.v !== '' || atual.f != null)) substitui++;
      vistas.add(k);
      if (!lote) continue;
      const r = valorDoPedaco(partes[i], fm);
      const est = estiloDe(c, atual);
      let s = atual && atual.s;
      if (r.nf && (!est.nf || /^general$/i.test(est.nf) || (fm === 'texto' && est.nf !== '@'))) s = lote.estilo({ ...est, nf: r.nf });
      if (r.vazio) lote.por(abaId, k, s ? { s } : undefined);
      else lote.por(abaId, k, s ? { v: r.v, s } : { v: r.v });
    }
  }
  if (!linhas) return { erro: comFormula ? 'As células desta coluna são fórmulas: copie e cole como valores antes de separar.' : 'Não há texto para separar nesta coluna.' };
  return { lote, linhas, colunas, substitui, comFormula };
}

/** "A1:A20" → texto curto da coluna para o subtítulo. */
export const textoDaColuna = (f) => `coluna ${letraCol(f.c1)}, linhas ${f.l1 + 1} a ${f.l2 + 1}`;
