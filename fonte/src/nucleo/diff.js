/* EFCdocs — diffs e histórico de desfazer/refazer.
   Um diff guarda só o que mudou: [{ c: caminho, a: antes, d: depois }].
   O mesmo formato serve para revisões (guardar só o que mudou) e para o desfazer. */

const partes = (caminho) => (Array.isArray(caminho) ? caminho : String(caminho).split('.'));

export function pegar(obj, caminho) {
  let atual = obj;
  for (const p of partes(caminho)) {
    if (atual == null) return undefined;
    atual = atual[p];
  }
  return atual;
}

/** Devolve uma cópia com o valor trocado (undefined apaga a chave). Não mexe no original. */
export function por(obj, caminho, valor) {
  const [primeira, ...resto] = partes(caminho);
  const copia = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  if (resto.length) {
    copia[primeira] = por(obj ? obj[primeira] : undefined, resto, valor);
    return copia;
  }
  if (valor === undefined) delete copia[primeira];
  else copia[primeira] = valor;
  return copia;
}

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** mudancas: { "conteudo.itens.p1": novoValor, ... } */
export function criarDiff(estado, mudancas, rotulo = '') {
  const ops = Object.entries(mudancas)
    .map(([c, d]) => ({ c, a: pegar(estado, c), d }))
    .filter((op) => !igual(op.a, op.d));
  return { rotulo, ops };
}

export const diffVazio = (diff) => !diff || !diff.ops || diff.ops.length === 0;

export function aplicarDiff(estado, diff) {
  return diff.ops.reduce((acc, op) => por(acc, op.c, op.d), estado);
}

export function inverterDiff(diff) {
  return { rotulo: diff.rotulo, ops: [...diff.ops].reverse().map((op) => ({ c: op.c, a: op.d, d: op.a })) };
}

export const LIMITE_HISTORICO = 200;

export function novoHistorico(limite = LIMITE_HISTORICO) {
  return { feitos: [], desfeitos: [], limite };
}

export function fazer(hist, estado, diff) {
  if (diffVazio(diff)) return { h: hist, estado };
  const feitos = [...hist.feitos, diff];
  if (feitos.length > hist.limite) feitos.shift();
  return { h: { ...hist, feitos, desfeitos: [] }, estado: aplicarDiff(estado, diff) };
}

export function desfazer(hist, estado) {
  if (!hist.feitos.length) return { h: hist, estado, diff: null };
  const diff = hist.feitos[hist.feitos.length - 1];
  return {
    h: { ...hist, feitos: hist.feitos.slice(0, -1), desfeitos: [...hist.desfeitos, diff] },
    estado: aplicarDiff(estado, inverterDiff(diff)),
    diff,
  };
}

export function refazer(hist, estado) {
  if (!hist.desfeitos.length) return { h: hist, estado, diff: null };
  const diff = hist.desfeitos[hist.desfeitos.length - 1];
  return {
    h: { ...hist, desfeitos: hist.desfeitos.slice(0, -1), feitos: [...hist.feitos, diff] },
    estado: aplicarDiff(estado, diff),
    diff,
  };
}

export const podeDesfazer = (h) => h.feitos.length > 0;
export const podeRefazer = (h) => h.desfeitos.length > 0;
export const rotuloDesfazer = (h) => (h.feitos.length ? h.feitos[h.feitos.length - 1].rotulo : '');
export const rotuloRefazer = (h) => (h.desfeitos.length ? h.desfeitos[h.desfeitos.length - 1].rotulo : '');
