/* Vértice Docs — Planilha: índice vivo das células com conteúdo, por linha e por coluna (v0.6.12, D-16).
   Serve ao Ctrl+setas, à "próxima vazia", à área usada e à linha do cabeçalho. Antes era refeito inteiro a cada tecla
   (custava o tamanho da planilha); agora é montado uma vez por aba e atualizado só com o que o diário diz que mudou. */
import { lerChave } from './ref.js';
import { vigiar, desde } from '../nucleo/diario.js';

const indices = new WeakMap();
const cheia = (x) => !!x && (x.v !== undefined || x.f != null);

function montar(cel) {
  const porCol = new Map(), porLin = new Map();
  for (const k of Object.keys(cel)) {
    if (!cheia(cel[k])) continue;
    const p = lerChave(k);
    if (!p) continue;
    let a = porCol.get(p.c); if (!a) porCol.set(p.c, (a = [])); a.push(p.l);
    a = porLin.get(p.l); if (!a) porLin.set(p.l, (a = [])); a.push(p.c);
  }
  for (const a of porCol.values()) a.sort((x, y) => x - y);
  for (const a of porLin.values()) a.sort((x, y) => x - y);
  return { porCol, porLin, rev: 0, lim: null };
}

/** posição de x na lista ordenada (ou onde entraria) */
function lugar(a, x) { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return lo; }
function entrar(mapa, chave, x, ind) {
  let a = mapa.get(chave); if (!a) { mapa.set(chave, (a = [])); ind.lim = null; }
  const i = lugar(a, x); if (a[i] !== x) a.splice(i, 0, x);
}
function sair(mapa, chave, x, ind) {
  const a = mapa.get(chave); if (!a) return;
  const i = lugar(a, x); if (a[i] === x) a.splice(i, 1);
  if (!a.length) { mapa.delete(chave); ind.lim = null; }
}

/** Índice { porCol: Map coluna → linhas em ordem, porLin: Map linha → colunas em ordem } do objeto de células de uma aba. */
export function indiceDe(cel) {
  const d = vigiar(cel);
  let ind = indices.get(cel);
  if (ind && ind.rev === d.rev) return ind;
  const mud = ind ? desde(cel, ind.rev) : null;
  if (!mud) { ind = montar(cel); ind.rev = d.rev; indices.set(cel, ind); return ind; }
  for (const [k, m] of mud) {
    const antes = cheia(m.a), agora = cheia(m.d);
    if (antes === agora) continue;
    const p = lerChave(k); if (!p) continue;
    if (agora) { entrar(ind.porCol, p.c, p.l, ind); entrar(ind.porLin, p.l, p.c, ind); } else { sair(ind.porCol, p.c, p.l, ind); sair(ind.porLin, p.l, p.c, ind); }
  }
  ind.rev = d.rev;
  return ind;
}

/** Última linha e última coluna com conteúdo (-1 se a aba está vazia). */
export function limitesDe(cel) {
  const ind = indiceDe(cel);
  if (!ind.lim) {
    let lMax = -1, cMax = -1;
    for (const l of ind.porLin.keys()) if (l > lMax) lMax = l;
    for (const c of ind.porCol.keys()) if (c > cMax) cMax = c;
    ind.lim = { lMax, cMax };
  }
  return ind.lim;
}
