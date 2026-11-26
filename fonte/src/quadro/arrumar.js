/* Vértice Docs · Quadro · arrumar itens (v0.6.59; o básico guardado em 24/11, visto no Doory: docs/ideias/DOORY-…md).
   Alinhar vários itens (pela caixa que envolve os escolhidos, como o PowerPoint), distribuir com espaço igual e travar item
   (travado não se move, não muda de tamanho e não é excluído; o texto e a cor continuam editáveis). Nada do código do Doory. */

export const ALINHAR = [
  { id: 'esq', nome: 'Alinhar à esquerda' }, { id: 'centro', nome: 'Centralizar' }, { id: 'dir', nome: 'Alinhar à direita' },
  { id: 'topo', nome: 'Alinhar em cima' }, { id: 'meio', nome: 'Alinhar ao meio' }, { id: 'base', nome: 'Alinhar embaixo' },
];
export const DISTRIBUIR = [{ id: 'h', nome: 'Distribuir na horizontal' }, { id: 'v', nome: 'Distribuir na vertical' }];
/* v0.6.71 (Q1, F513): igualar o tamanho pelo maior dos escolhidos; o canto de cima à esquerda fica parado */
export const IGUALAR = [{ id: 'w', nome: 'Igualar a largura' }, { id: 'h', nome: 'Igualar a altura' }, { id: 'wh', nome: 'Igualar largura e altura' }];
export const AVISO_TRAVADO = 'Este item está travado. Para mexer, use Organizar › Travar de novo.';
export const travado = (it) => !!(it && it.trava);
/* raias e páginas são fundos: não entram no alinhar nem no distribuir */
const FUNDOS = new Set(['raia', 'pagina']);
const livres = (c, ids) => ids.map((id) => c.itens[id]).filter((it) => it && !travado(it) && !FUNDOS.has(it.tipo));

/** Alinha os escolhidos (2 ou mais) pela borda ou pelo meio da caixa que envolve todos. */
export function mudancasAlinhar(c, ids, como) {
  const its = livres(c, ids);
  if (its.length < 2) return null;
  const x1 = Math.min(...its.map((i) => i.x)), y1 = Math.min(...its.map((i) => i.y));
  const x2 = Math.max(...its.map((i) => i.x + i.w)), y2 = Math.max(...its.map((i) => i.y + i.h));
  const mud = {};
  for (const it of its) {
    const p = { esq: { x: x1 }, centro: { x: (x1 + x2) / 2 - it.w / 2 }, dir: { x: x2 - it.w }, topo: { y: y1 }, meio: { y: (y1 + y2) / 2 - it.h / 2 }, base: { y: y2 - it.h } }[como];
    if (!p) return null;
    const novo = { ...it, ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Math.round(v)])) };
    if (novo.x !== it.x || novo.y !== it.y) mud['itens.' + it.id] = novo;
  }
  return mud;
}

/** Espaço igual entre os escolhidos (3 ou mais): os das pontas ficam, os do meio andam. */
export function mudancasDistribuir(c, ids, eixo) {
  const its = livres(c, ids);
  if (its.length < 3 || (eixo !== 'h' && eixo !== 'v')) return null;
  const P = eixo === 'h' ? 'x' : 'y', T = eixo === 'h' ? 'w' : 'h';
  const ord = [...its].sort((a, b) => a[P] - b[P] || a.id.localeCompare(b.id));
  const ini = ord[0][P], fim = ord[ord.length - 1][P] + ord[ord.length - 1][T];
  const vao = (fim - ini - ord.reduce((s, i) => s + i[T], 0)) / (ord.length - 1);
  const mud = {};
  let pos = ini;
  for (const it of ord) {
    const v = Math.round(pos);
    if (v !== it[P]) mud['itens.' + it.id] = { ...it, [P]: v };
    pos += it[T] + vao;
  }
  return mud;
}

/** Igualar o tamanho (2 ou mais): todos ficam do tamanho do maior, sem sair do lugar. A legenda tem altura própria: fica de fora. */
export function mudancasIgualar(c, ids, como) {
  const its = livres(c, ids).filter((it) => it.tipo !== 'legenda');
  if (its.length < 2 || !['w', 'h', 'wh'].includes(como)) return null;
  const W = Math.max(...its.map((i) => i.w)), H = Math.max(...its.map((i) => i.h));
  const mud = {};
  for (const it of its) {
    const novo = { ...it, ...(como.includes('w') ? { w: W } : {}), ...(como.includes('h') ? { h: H } : {}) };
    if (novo.w !== it.w || novo.h !== it.h) mud['itens.' + it.id] = novo;
  }
  return mud;
}

/** Trava ou destrava: se algum escolhido está solto, trava todos; se todos estão travados, destrava. */
export function mudancasTravar(c, ids) {
  const its = ids.map((id) => c.itens[id]).filter(Boolean);
  if (!its.length) return null;
  const travar = !its.every(travado);
  const mud = {};
  for (const it of its) { const novo = { ...it }; if (travar) novo.trava = true; else delete novo.trava; mud['itens.' + it.id] = novo; }
  return { mud, travar };
}

/** Comandos (Quadro.jsx chama no começo do trata): organizar.alinhar|<como>, organizar.distribuir|<eixo>, organizar.igualar|<w|h|wh>, organizar.travar. */
export function trataArrumar(id, { c, selecionados, aplicarQ, avisar }) {
  const [base, valor] = String(id).split('|');
  if (base === 'organizar.travar') {
    const r = mudancasTravar(c, selecionados);
    if (!r) { avisar('Escolha no quadro os itens que vão ficar travados.', { ic: 'info' }); return true; }
    aplicarQ(r.mud, r.travar ? 'Travar' : 'Destravar', 'formatou');
    avisar(r.travar ? (selecionados.length === 1 ? 'Item travado: não sai do lugar nem muda de tamanho.' : `${selecionados.length} itens travados: não saem do lugar nem mudam de tamanho.`) : 'Destravado.', { ic: 'cadeado' });
    return true;
  }
  if (base === 'organizar.igualar') { /* v0.6.71 (Q1) */
    if (!valor) return true;
    const mud = mudancasIgualar(c, selecionados, valor);
    if (!mud) { avisar('Escolha dois ou mais itens soltos (não travados) para igualar o tamanho.', { ic: 'info' }); return true; }
    const nome = IGUALAR.find((x) => x.id === valor);
    if (Object.keys(mud).length) aplicarQ(mud, nome ? nome.nome : 'Igualar tamanho', 'formatou');
    else avisar('Os itens escolhidos já estão do mesmo tamanho.', { ic: 'info' });
    return true;
  }
  if (base !== 'organizar.alinhar' && base !== 'organizar.distribuir') return undefined;
  if (!valor) return true; /* o botão só abre a lista */
  const alinhar = base === 'organizar.alinhar';
  const mud = alinhar ? mudancasAlinhar(c, selecionados, valor) : mudancasDistribuir(c, selecionados, valor);
  if (!mud) { avisar(alinhar ? 'Escolha dois ou mais itens soltos (não travados) para alinhar.' : 'Escolha três ou mais itens soltos (não travados) para distribuir.', { ic: 'info' }); return true; }
  const nome = (alinhar ? ALINHAR : DISTRIBUIR).find((x) => x.id === valor);
  if (Object.keys(mud).length) aplicarQ(mud, nome ? nome.nome : 'Arrumar', 'moveu');
  return true;
}

/** Travar fica marcado na faixa quando todos os escolhidos estão travados. */
export function valorArrumar(id, c, selecionados) {
  if (id !== 'organizar.travar') return undefined;
  const its = selecionados.map((i) => c.itens[i]).filter(Boolean);
  return its.length > 0 && its.every(travado);
}
