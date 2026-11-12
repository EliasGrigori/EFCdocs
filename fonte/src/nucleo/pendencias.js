/* Vértice Docs — diário de segurança (v0.6.12, D-16).
   Arquivo grande deixou de ser gravado a cada tecla (gravar o arquivo inteiro prendia a tela): a gravação espera a pessoa
   parar de digitar. Para nada se perder se a página fechar nesse meio tempo, cada mudança ainda não gravada fica anotada
   aqui, no localStorage (é pequena e a escrita é na hora). Ao abrir o arquivo, se sobrou anotação que casa com o que está
   gravado, as mudanças são refeitas e o arquivo é gravado.
   Formato: { de: carimbo (ficha.alteradoEm) do último estado gravado com certeza, lotes: [{ t: carimbo depois do lote, ops: [{ c, d } | { c, x: 1 }] }] }.
   As mudanças são "ponha este valor neste caminho" (x = apagar): refazer uma que já estava gravada não estraga nada. */
import { chave } from './armazem.js';

const NOME = (id) => chave('pend:' + id);
const LIMITE_TEXTO = 1500000; /* acima disso não vale a pena anotar: grava logo */
const LIMITE_LOTES = 3000;
const padrao = (a) => { if (a) return a; try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
/* valor grande demais para anotar (ex.: todas as células de uma aba trocadas de uma vez) */
const grande = (v) => !!v && typeof v === 'object' && Object.keys(v).length > 500;

export const novoDiarioSeguro = () => ({ id: null, de: null, lotes: [], furo: 0 });

function escrever(d, armazem) {
  const a = padrao(armazem); if (!a) return false;
  try {
    if (!d.lotes.length) { a.removeItem(NOME(d.id)); return true; }
    const texto = JSON.stringify({ de: d.de, lotes: d.lotes.map((l) => ({ t: l.t, ops: l.ops })) });
    if (texto.length > LIMITE_TEXTO) return false;
    a.setItem(NOME(d.id), texto); return true;
  } catch { return false; }
}

/** Anota um lote de mudanças ainda não gravadas. Devolve false quando não deu para anotar (quem chamou grava na hora).
    de = carimbo do último estado gravado deste arquivo; seq = número da mudança; t = carimbo do arquivo depois dela. */
export function anotar(d, id, de, seq, t, ops, armazem) {
  if (d.id !== id) { d.id = id; d.de = de; d.lotes = []; d.furo = 0; }
  /* depois de uma mudança que não deu para anotar, nada mais entra até uma gravação cobrir o buraco (senão o diário pularia um passo) */
  if (d.furo) return false;
  if (!ops || !ops.length || d.lotes.length >= LIMITE_LOTES || ops.some((o) => grande(o.d))) { d.furo = seq; return false; }
  d.lotes.push({ seq, t, ops: ops.map((o) => (o.d === undefined ? { c: o.c, x: 1 } : { c: o.c, d: o.d })) });
  if (escrever(d, armazem)) return true;
  d.lotes.pop(); d.furo = seq; return false;
}

/** A gravação do estado da mudança `seq` (carimbo t) terminou: o que ela cobre sai do diário. */
export function gravou(d, id, seq, t, armazem) {
  if (d.id !== id) { apagarPendencia(id, armazem); return; }
  d.lotes = d.lotes.filter((l) => l.seq > seq); d.de = t;
  if (d.furo && d.furo <= seq) d.furo = 0;
  escrever(d, armazem);
}

export function lerPendencia(id, armazem) {
  const a = padrao(armazem); if (!a) return null;
  try { const v = a.getItem(NOME(id)); const p = v ? JSON.parse(v) : null; return p && Array.isArray(p.lotes) ? p : null; } catch { return null; }
}

export function apagarPendencia(id, armazem) { const a = padrao(armazem); try { if (a) a.removeItem(NOME(id)); } catch { /* sem armazém */ } }

function porNoLugar(obj, caminho, valor) {
  const ps = String(caminho).split('.'); let o = obj;
  for (let i = 0; i < ps.length - 1; i++) { if (o[ps[i]] == null || typeof o[ps[i]] !== 'object') o[ps[i]] = {}; o = o[ps[i]]; }
  const k = ps[ps.length - 1];
  if (valor === undefined) delete o[k]; else o[k] = valor; /* igual ao `por` de nucleo/diff.js */
}

/** Refaz no arquivo recém-aberto (mexe nele) as mudanças anotadas que ainda não estavam gravadas.
    Só vale se o que está gravado é um estado conhecido do diário (o ponto de partida ou o fim de um lote).
    Devolve quantas mudanças refez (0 = nada a fazer ou o diário é de outra história do arquivo). */
export function recuperar(arquivo, pend) {
  if (!pend || !Array.isArray(pend.lotes) || !pend.lotes.length) return 0;
  const agora = arquivo.ficha.alteradoEm;
  let i = pend.de === agora ? 0 : -1;
  if (i < 0) { for (let k = pend.lotes.length - 1; k >= 0; k--) if (pend.lotes[k].t === agora) { i = k + 1; break; } }
  if (i < 0) return 0;
  let n = 0;
  for (const l of pend.lotes.slice(i)) { for (const o of l.ops) porNoLugar(arquivo, o.c, o.x ? undefined : o.d); n++; }
  return n;
}
