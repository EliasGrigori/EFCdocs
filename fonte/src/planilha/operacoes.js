/* EFCdocs — Planilha: as ações que mudam o arquivo (sempre como "mudanças" { caminho: valor },
   que viram uma linha no desfazer e gravam só o que mudou). */
import { chave, lerChave, MAX_COL, MAX_LIN, letraCol, textoFaixa, normalFaixa } from './ref.js';
import { reescrever, deslocar, ajustarEstrutura, renomearAbaNaArvore, excluirAbaNaArvore, renomearNomeNaArvore, paraMostrar, lerGuardada, escrever, mapearRefs } from './formula.js';
import { indiceEstilo, estiloDe, abaVazia, mescladas, valorGuardado, paraGuardarValor } from './modelo.js';
import { ajustarObjetosEstrutura } from './objetos.js';
import { continuarSerie } from './entrada.js';
import { moverRegras } from './regras.js';
import { ehFormatoData } from './formato.js';

/** Junta mudanças de células de uma aba; com muitas, troca o objeto inteiro (mais rápido e leve). */
export class Lote {
  constructor(c) { this.c = c; this.cels = {}; this.outras = {}; this.estilos = c.estilos; }
  pegar(abaId, k) {
    const m = this.cels[abaId];
    if (m && k in m) return m[k];
    return this.c.abas[abaId].cel[k];
  }
  por(abaId, k, cel) {
    if (!this.cels[abaId]) this.cels[abaId] = {};
    const limpo = cel && (cel.v !== undefined || cel.f != null || cel.s) ? cel : undefined;
    this.cels[abaId][k] = limpo;
  }
  estilo(e) { const r = indiceEstilo(this.estilos, e); this.estilos = r.estilos; return r.s; }
  mudancas() {
    const out = { ...this.outras };
    for (const [abaId, m] of Object.entries(this.cels)) {
      const ks = Object.keys(m);
      if (ks.length > 30) {
        const cel = { ...this.c.abas[abaId].cel };
        for (const k of ks) { if (m[k] === undefined) delete cel[k]; else cel[k] = m[k]; }
        out[`conteudo.abas.${abaId}.cel`] = cel;
      } else for (const k of ks) out[`conteudo.abas.${abaId}.cel.${k}`] = m[k];
    }
    if (this.estilos !== this.c.estilos) out['conteudo.estilos'] = this.estilos;
    return out;
  }
  get vazio() { return !Object.keys(this.cels).length && !Object.keys(this.outras).length; }
}

const celulasDaFaixa = function* (f) {
  for (let l = f.l1; l <= f.l2; l++) for (let c = f.c1; c <= f.c2; c++) yield [l, c];
};

/** Células que existem dentro da faixa (rápido mesmo com a coluna inteira selecionada). */
export function existentes(aba, f) {
  const out = [];
  const area = (f.l2 - f.l1 + 1) * (f.c2 - f.c1 + 1);
  if (area <= 5000) {
    for (const [l, c] of celulasDaFaixa(f)) { const k = chave(l, c); if (aba.cel[k]) out.push([l, c, k]); }
    return out;
  }
  for (const k of Object.keys(aba.cel)) {
    const p = lerChave(k);
    if (p && p.l >= f.l1 && p.l <= f.l2 && p.c >= f.c1 && p.c <= f.c2) out.push([p.l, p.c, k]);
  }
  return out;
}

/* ---------------- conteúdo ---------------- */

/** Apaga só o conteúdo (Delete): o formato fica. */
export function limparConteudo(c, abaId, faixas) {
  const lote = new Lote(c);
  const aba = c.abas[abaId];
  for (const f of faixas) for (const [, , k] of existentes(aba, f)) {
    const cel = aba.cel[k];
    if (cel.v === undefined && cel.f == null) continue;
    const { v, f: ff, ...resto } = cel;
    lote.por(abaId, k, resto);
  }
  return lote;
}

export function limparFormatos(c, abaId, faixas) {
  const lote = new Lote(c);
  const aba = c.abas[abaId];
  for (const f of faixas) for (const [, , k] of existentes(aba, f)) {
    const cel = aba.cel[k];
    if (!cel.s) continue;
    const { s, ...resto } = cel;
    lote.por(abaId, k, resto);
  }
  const mesc = (aba.mesc || []).filter((t) => !faixas.some((f) => { const m = mescladas({ mesc: [t] })[0]; return m && m.l1 >= f.l1 && m.l2 <= f.l2 && m.c1 >= f.c1 && m.c2 <= f.c2; }));
  if (mesc.length !== (aba.mesc || []).length) lote.outras[`conteudo.abas.${abaId}.mesc`] = mesc;
  return lote;
}

/**
 * Muda o estilo das células (cria as que não existem). fn(estiloAtual) → estilo novo.
 * Com coluna/linha inteira selecionada, mexe só nas células que existem (mais as da área usada).
 */
export function mudarEstilo(c, abaId, faixas, fn, lote = new Lote(c)) {
  const aba = c.abas[abaId];
  const visto = new Set();
  for (const f0 of faixas) {
    const area = (f0.l2 - f0.l1 + 1) * (f0.c2 - f0.c1 + 1);
    const lista = area <= 20000 ? [...celulasDaFaixa(f0)].map(([l, cc]) => [l, cc, chave(l, cc)]) : existentes(aba, f0);
    for (const [, , k] of lista) {
      if (visto.has(k)) continue;
      visto.add(k);
      const cel = lote.pegar(abaId, k) || {};
      const e = estiloDe({ estilos: lote.estilos }, cel);
      const novo = fn({ ...e });
      const s = lote.estilo(novo);
      if ((cel.s || 0) === s) continue;
      const nc = { ...cel };
      if (s) nc.s = s; else delete nc.s;
      lote.por(abaId, k, nc);
    }
  }
  return lote;
}

/** Bordas: tipo 'todas' | 'contorno' | 'baixo' | 'cima' | 'esq' | 'dir' | 'nenhuma' | 'grossa' */
export function aplicarBordas(c, abaId, faixas, tipo) {
  const lote = new Lote(c);
  for (const f of faixas) {
    mudarEstilo(c, abaId, [f], (e) => e, lote); // garante as células
    for (const [l, cc] of celulasDaFaixa(f)) {
      const k = chave(l, cc);
      const cel = lote.pegar(abaId, k) || {};
      const e = { ...estiloDe({ estilos: lote.estilos }, cel) };
      let bd = { ...(e.bd || {}) };
      const borda = { top: l === f.l1, bot: l === f.l2, esq: cc === f.c1, dir: cc === f.c2 };
      if (tipo === 'nenhuma') bd = {};
      if (tipo === 'todas') bd = { t: 1, b: 1, l: 1, r: 1 };
      if (tipo === 'contorno' || tipo === 'grossa') {
        const w = tipo === 'grossa' ? 2 : 1;
        if (borda.top) bd.t = w; if (borda.bot) bd.b = w; if (borda.esq) bd.l = w; if (borda.dir) bd.r = w;
      }
      if (tipo === 'baixo' && borda.bot) bd.b = 1;
      if (tipo === 'cima' && borda.top) bd.t = 1;
      if (tipo === 'esq' && borda.esq) bd.l = 1;
      if (tipo === 'dir' && borda.dir) bd.r = 1;
      if (Object.keys(bd).length) e.bd = bd; else delete e.bd;
      const s = lote.estilo(e);
      const nc = { ...cel };
      if (s) nc.s = s; else delete nc.s;
      lote.por(abaId, k, nc);
    }
  }
  return lote;
}

/** Fórmula copiada de (lo, co) para (ld, cd): anda as referências sem $. */
export function moverFormula(f, dl, dc) {
  if (!dl && !dc) return f;
  return reescrever(f, (a) => deslocar(a, dl, dc));
}

/* ---------------- alça de preenchimento e Ctrl+Enter / Ctrl+D ---------------- */

/**
 * Preenche "destino" continuando a "origem" (mesma largura ou altura).
 * dir: 'b' (baixo), 'c' (cima), 'd' (direita), 'e' (esquerda).
 */
export function preencher(c, abaId, origem, destino, dir, motor) {
  const lote = new Lote(c);
  const aba = c.abas[abaId];
  const vertical = dir === 'b' || dir === 'c';
  const nOrig = vertical ? origem.l2 - origem.l1 + 1 : origem.c2 - origem.c1 + 1;
  const nDest = vertical ? destino.l2 - destino.l1 + 1 : destino.c2 - destino.c1 + 1;
  const faixas = vertical ? origem.c2 - origem.c1 + 1 : origem.l2 - origem.l1 + 1;
  for (let i = 0; i < faixas; i++) {
    const pega = (j) => (vertical ? [origem.l1 + j, origem.c1 + i] : [origem.l1 + i, origem.c1 + j]);
    const iniciais = [];
    for (let j = 0; j < nOrig; j++) { const [l, cc] = pega(j); iniciais.push(aba.cel[chave(l, cc)]); }
    const valores = iniciais.map((x) => (x && x.f == null ? valorGuardado(x) : null));
    const temFormula = iniciais.some((x) => x && x.f != null);
    const ehData = iniciais.some((x) => x && x.s && ehFormatoData((c.estilos[x.s] || {}).nf || ''));
    const reversa = dir === 'c' || dir === 'e';
    let serie = null;
    if (!temFormula && valores.every((v) => v != null)) {
      const base = reversa ? [...valores].reverse() : valores;
      serie = continuarSerie(base, nDest, { ehData });
    }
    for (let j = 0; j < nDest; j++) {
      const pos = reversa ? -(j + 1) : nOrig + j; // posição relativa ao início da origem
      const idxOrig = ((pos % nOrig) + nOrig) % nOrig;
      const fonte = iniciais[idxOrig];
      const [lo, co] = pega(idxOrig);
      const [ld, cd] = vertical ? [reversa ? origem.l1 - j - 1 : origem.l2 + j + 1, origem.c1 + i] : [origem.l1 + i, reversa ? origem.c1 - j - 1 : origem.c2 + j + 1];
      if (ld < 0 || cd < 0 || ld >= MAX_LIN || cd >= MAX_COL) continue;
      const k = chave(ld, cd);
      if (!fonte) { lote.por(abaId, k, undefined); continue; }
      const nova = { ...fonte };
      if (fonte.f != null) nova.f = moverFormula(fonte.f, ld - lo, cd - co);
      else if (serie) nova.v = serie[j];
      lote.por(abaId, k, nova);
    }
  }
  return lote;
}

/** Ctrl+Enter: o mesmo conteúdo em toda a seleção (fórmula anda como no Excel). */
export function preencherSelecao(c, abaId, faixas, celBase, lBase, cBase) {
  const lote = new Lote(c);
  for (const f of faixas) for (const [l, cc] of celulasDaFaixa(f)) {
    const k = chave(l, cc);
    const atual = c.abas[abaId].cel[k] || {};
    const nova = { ...atual };
    delete nova.v; delete nova.f; delete nova.da; delete nova.lg;
    if (celBase.f != null) { nova.f = moverFormula(celBase.f, l - lBase, cc - cBase); if (celBase.lg) nova.lg = 1; }
    else if (celBase.v !== undefined) nova.v = celBase.v;
    if (celBase.s != null && !atual.s) nova.s = celBase.s;
    lote.por(abaId, k, nova);
  }
  return lote;
}

/* ---------------- copiar e colar ---------------- */

/** O que vai para a área de transferência interna: as células com fórmulas e estilos. */
export function copiar(c, abaId, f, motor) {
  const aba = c.abas[abaId];
  const linhas = [];
  for (let l = f.l1; l <= f.l2; l++) {
    const lin = [];
    for (let cc = f.c1; cc <= f.c2; cc++) {
      const cel = aba.cel[chave(l, cc)];
      lin.push({ cel: cel ? { ...cel } : null, estilo: cel && cel.s ? c.estilos[cel.s] : null, valor: motor ? motor.valor(abaId, l, cc) : valorGuardado(cel) });
    }
    linhas.push(lin);
  }
  return { abaId, f, linhas, larguras: null };
}

/** Cola o que foi copiado a partir de (l, c). modo: 'tudo' | 'valores' | 'formatos'. Devolve { lote, area }. */
export function colar(c, abaId, l0, c0, clip, { modo = 'tudo', recortar = false, motor, destinoFaixa = null } = {}) {
  const lote = new Lote(c);
  const L = clip.linhas.length, C = clip.linhas[0].length;
  /* seleção maior que o copiado e múltipla dele: repete (como o Excel) */
  let repL = 1, repC = 1;
  if (destinoFaixa) {
    const dl = destinoFaixa.l2 - destinoFaixa.l1 + 1, dc = destinoFaixa.c2 - destinoFaixa.c1 + 1;
    if (dl % L === 0 && dc % C === 0) { repL = dl / L; repC = dc / C; }
  }
  if (recortar && clip.abaId) {
    for (let i = 0; i < L; i++) for (let j = 0; j < C; j++) {
      lote.por(clip.abaId, chave(clip.f.l1 + i, clip.f.c1 + j), undefined);
    }
  }
  for (let ri = 0; ri < repL; ri++) for (let rj = 0; rj < repC; rj++) {
    for (let i = 0; i < L; i++) for (let j = 0; j < C; j++) {
      const l = l0 + ri * L + i, cc = c0 + rj * C + j;
      if (l >= MAX_LIN || cc >= MAX_COL) continue;
      const item = clip.linhas[i][j];
      const k = chave(l, cc);
      const atual = lote.pegar(abaId, k) || {};
      let nova;
      if (modo === 'formatos') {
        nova = { ...atual };
        const s = item && item.estilo ? lote.estilo(item.estilo) : 0;
        if (s) nova.s = s; else delete nova.s;
      } else if (modo === 'valores') {
        nova = { ...atual };
        delete nova.f; delete nova.v;
        const v = item ? item.valor : null;
        if (v != null) nova.v = paraGuardarValor(v);
      } else {
        nova = {};
        if (item && item.cel) {
          if (item.cel.f != null) {
            nova.f = recortar ? item.cel.f : moverFormula(item.cel.f, l - (clip.f.l1 + i), cc - (clip.f.c1 + j));
            if (clip.abaId && clip.abaId !== abaId && !recortar) nova.f = item.cel.f && moverFormula(item.cel.f, l - (clip.f.l1 + i), cc - (clip.f.c1 + j));
          } else if (item.cel.v !== undefined) nova.v = item.cel.v;
          if (item.estilo) { const s = lote.estilo(item.estilo); if (s) nova.s = s; }
        } else if (item && item.valor != null && !item.cel) {
          nova.v = item.valor;
          if (item.estilo) { const s = lote.estilo(item.estilo); if (s) nova.s = s; }
        }
      }
      lote.por(abaId, k, nova);
    }
  }
  /* recortar e colar: fórmulas que apontavam para a origem passam a apontar para o destino */
  if (recortar && clip.abaId && modo === 'tudo') {
    const dl = l0 - clip.f.l1, dc = c0 - clip.f.c1;
    const nomeOrig = c.abas[clip.abaId].nome, nomeDest = c.abas[abaId].nome;
    for (const id of c.ordem) {
      const aba = c.abas[id];
      for (const k of Object.keys(aba.cel)) {
        const cel = lote.pegar(id, k);
        if (!cel || cel.f == null) continue;
        const novo = reescrever(cel.f, (a) => mapearRefs(a, (r) => {
          const abaR = r.aba == null ? c.abas[id].nome : r.aba;
          if (abaR.toLowerCase() !== nomeOrig.toLowerCase()) return r;
          if (r.t === 'ref' && r.l >= clip.f.l1 && r.l <= clip.f.l2 && r.c >= clip.f.c1 && r.c <= clip.f.c2) {
            return { ...r, l: r.l + dl, c: r.c + dc, aba: clip.abaId !== abaId ? nomeDest : r.aba };
          }
          if (r.t === 'area' && r.tipo === 'cel' && r.l1 >= clip.f.l1 && r.l2 <= clip.f.l2 && r.c1 >= clip.f.c1 && r.c2 <= clip.f.c2) {
            return { ...r, l1: r.l1 + dl, l2: r.l2 + dl, c1: r.c1 + dc, c2: r.c2 + dc, aba: clip.abaId !== abaId ? nomeDest : r.aba };
          }
          return r;
        }));
        if (novo !== cel.f) lote.por(id, k, { ...cel, f: novo });
      }
    }
  }
  return { lote, area: { l1: l0, c1: c0, l2: Math.min(MAX_LIN - 1, l0 + L * repL - 1), c2: Math.min(MAX_COL - 1, c0 + C * repC - 1) } };
}

/* ---------------- inserir e excluir linhas e colunas ---------------- */

/** n > 0 insere, n < 0 exclui, a partir do índice i. eixo 'l' ou 'c'. Ajusta fórmulas de todas as abas. */
export function estrutura(c, abaId, eixo, i, n) {
  const exclui = n < 0, k = Math.abs(n);
  const aba = c.abas[abaId];
  const nomeAba = aba.nome;
  const mud = {};
  const move = (x) => (exclui ? (x >= i && x < i + k ? null : x >= i + k ? x - k : x) : x >= i ? x + k : x);
  /* 1) células da aba */
  const cel = {};
  for (const ch of Object.keys(aba.cel)) {
    const p = lerChave(ch);
    if (!p) continue;
    const nl = eixo === 'l' ? move(p.l) : p.l, nc = eixo === 'c' ? move(p.c) : p.c;
    if (nl == null || nc == null || nl >= MAX_LIN || nc >= MAX_COL) continue;
    cel[chave(nl, nc)] = aba.cel[ch];
  }
  /* 2) fórmulas de todas as abas */
  const ajustaAbaMin = (f, idDaFormula) => reescrever(f, (a) => ajustarEstrutura(a, { abaAlvo: nomeAba, abaDaFormula: c.abas[idDaFormula].nome, eixo, i, n }));
  for (const ch of Object.keys(cel)) {
    const x = cel[ch];
    if (x.f != null) { const nf = ajustaAbaMin(x.f, abaId); if (nf !== x.f) cel[ch] = { ...x, f: nf }; }
  }
  mud[`conteudo.abas.${abaId}.cel`] = cel;
  for (const id of c.ordem) {
    if (id === abaId) continue;
    const outra = c.abas[id];
    let mudou = false;
    const cel2 = { ...outra.cel };
    for (const ch of Object.keys(cel2)) {
      const x = cel2[ch];
      if (x.f == null || !x.f.includes('!')) continue;
      const nf = ajustaAbaMin(x.f, id);
      if (nf !== x.f) { cel2[ch] = { ...x, f: nf }; mudou = true; }
    }
    if (mudou) mud[`conteudo.abas.${id}.cel`] = cel2;
  }
  /* 3) tamanhos, ocultas, mescladas e congelamento */
  const mapaIdx = (obj) => {
    if (!obj) return obj;
    const out = {};
    for (const key of Object.keys(obj)) { const v = move(+key); if (v != null) out[v] = obj[key]; }
    return out;
  };
  if (eixo === 'l') {
    if (aba.alt) mud[`conteudo.abas.${abaId}.alt`] = mapaIdx(aba.alt);
    if (aba.ocL) mud[`conteudo.abas.${abaId}.ocL`] = mapaIdx(aba.ocL);
  } else {
    if (aba.larg) mud[`conteudo.abas.${abaId}.larg`] = mapaIdx(aba.larg);
    if (aba.ocC) mud[`conteudo.abas.${abaId}.ocC`] = mapaIdx(aba.ocC);
    if (aba.zeros) mud[`conteudo.abas.${abaId}.zeros`] = mapaIdx(aba.zeros);
  }
  if (aba.mesc && aba.mesc.length) {
    const nova = [];
    for (const m of mescladas(aba)) {
      let { l1, l2, c1, c2 } = m;
      const [a, b] = eixo === 'l' ? [l1, l2] : [c1, c2];
      let na, nb;
      if (!exclui) { na = a >= i ? a + k : a; nb = b >= i ? b + k : b; }
      else { na = a < i ? a : a >= i + k ? a - k : i; nb = b < i ? b : b >= i + k ? b - k : i - 1; }
      if (nb < na || (eixo === 'l' ? (nb === na && c1 === c2) : (nb === na && l1 === l2))) continue;
      if (eixo === 'l') { l1 = na; l2 = nb; } else { c1 = na; c2 = nb; }
      nova.push(textoFaixa({ l1, c1, l2, c2 }));
    }
    mud[`conteudo.abas.${abaId}.mesc`] = nova;
  }
  /* 3b) objetos sobre a grade (assinatura) descem/sobem junto com a célula em que estão presos */
  if (aba.objs && aba.objs.length) mud[`conteudo.abas.${abaId}.objs`] = ajustarObjetosEstrutura(aba.objs, eixo, i, n);
  /* 3c) v0.5.1: faixas da validação, da formatação condicional e dos comentários acompanham as linhas/colunas; as fórmulas das regras também */
  const mr = moverRegras(aba, eixo, i, n);
  for (const kk of Object.keys(mr)) mud[`conteudo.abas.${abaId}.${kk}`] = mr[kk];
  for (const id of c.ordem) {
    for (const campo of ['val', 'cf']) {
      const lista = id === abaId && campo in mr ? mr[campo] : c.abas[id][campo];
      if (!lista || !lista.length) continue;
      let mudou = false;
      const nova = lista.map((r) => {
        let x = r;
        for (const fk of ['f1', 'f2']) {
          const f = r[fk];
          if (!f || (id !== abaId && !f.includes('!')) || (campo === 'val' && r.t === 'list' && f[0] === '"')) continue;
          let nf = f;
          try { nf = ajustaAbaMin(f, id); } catch { nf = f; }
          if (nf !== f) { if (x === r) x = { ...r }; x[fk] = nf; mudou = true; }
        }
        return x;
      });
      if (mudou) mud[`conteudo.abas.${id}.${campo}`] = nova;
    }
  }
  /* 4) nomes definidos que apontam para a aba */
  const nomes = { ...c.nomes };
  let nomesMudaram = false;
  for (const [key, def] of Object.entries(c.nomes || {})) {
    const nr = reescrever(def.ref, (a) => ajustarEstrutura(a, { abaAlvo: nomeAba, abaDaFormula: null, eixo, i, n }));
    if (nr !== def.ref) { nomes[key] = { ...def, ref: nr }; nomesMudaram = true; }
  }
  if (nomesMudaram) mud['conteudo.nomes'] = nomes;
  return mud;
}

/* ---------------- abas ---------------- */

export function novaAba(c, depoisDe) {
  let n = c.ordem.length + 1;
  const usados = new Set(c.ordem.map((id) => c.abas[id].nome.toLowerCase()));
  while (usados.has(('Planilha' + n).toLowerCase())) n++;
  const id = 'a' + c.seq;
  const ordem = [...c.ordem];
  const pos = depoisDe ? ordem.indexOf(depoisDe) + 1 : ordem.length;
  ordem.splice(pos, 0, id);
  return { id, mud: { [`conteudo.abas.${id}`]: abaVazia(id, 'Planilha' + n), 'conteudo.ordem': ordem, 'conteudo.seq': c.seq + 1 } };
}

/** Renomear a aba troca o nome em todas as fórmulas e nomes (como o Excel). */
export function renomearAba(c, abaId, novo) {
  const velho = c.abas[abaId].nome;
  const mud = { [`conteudo.abas.${abaId}.nome`]: novo };
  for (const id of c.ordem) {
    const aba = c.abas[id];
    const cel = { ...aba.cel };
    let mudou = false;
    for (const ch of Object.keys(cel)) {
      const x = cel[ch];
      if (x.f == null || !x.f.includes('!')) continue;
      const nf = reescrever(x.f, (a) => renomearAbaNaArvore(a, velho, novo));
      if (nf !== x.f) { cel[ch] = { ...x, f: nf }; mudou = true; }
    }
    if (mudou) mud[`conteudo.abas.${id}.cel`] = cel;
  }
  const nomes = {};
  let nm = false;
  for (const [k, d] of Object.entries(c.nomes || {})) {
    const r = reescrever(d.ref, (a) => renomearAbaNaArvore(a, velho, novo));
    nomes[k] = r !== d.ref ? { ...d, ref: r } : d;
    if (r !== d.ref) nm = true;
  }
  if (nm) mud['conteudo.nomes'] = nomes;
  return mud;
}

/** Excluir a aba: quem apontava para ela passa a mostrar #REF! (como o Excel). */
export function excluirAba(c, abaId) {
  const nome = c.abas[abaId].nome;
  const mud = { [`conteudo.abas.${abaId}`]: undefined, 'conteudo.ordem': c.ordem.filter((x) => x !== abaId) };
  for (const id of c.ordem) {
    if (id === abaId) continue;
    const aba = c.abas[id];
    const cel = { ...aba.cel };
    let mudou = false;
    for (const ch of Object.keys(cel)) {
      const x = cel[ch];
      if (x.f == null || !x.f.includes('!')) continue;
      const nf = reescrever(x.f, (a) => excluirAbaNaArvore(a, nome));
      if (nf !== x.f) { cel[ch] = { ...x, f: nf }; mudou = true; }
    }
    if (mudou) mud[`conteudo.abas.${id}.cel`] = cel;
  }
  return mud;
}

export function duplicarAba(c, abaId) {
  const orig = c.abas[abaId];
  const usados = new Set(c.ordem.map((id) => c.abas[id].nome.toLowerCase()));
  let n = 2;
  const base = orig.nome.replace(/ \(\d+\)$/, '').slice(0, 25);
  while (usados.has(`${base} (${n})`.toLowerCase())) n++;
  const id = 'a' + c.seq;
  const ordem = [...c.ordem];
  ordem.splice(ordem.indexOf(abaId) + 1, 0, id);
  const copia = JSON.parse(JSON.stringify(orig));
  copia.id = id; copia.nome = `${base} (${n})`;
  return { id, mud: { [`conteudo.abas.${id}`]: copia, 'conteudo.ordem': ordem, 'conteudo.seq': c.seq + 1 } };
}

export function moverAba(c, abaId, delta) {
  const ordem = [...c.ordem];
  const i = ordem.indexOf(abaId);
  const j = Math.max(0, Math.min(ordem.length - 1, i + delta));
  if (i === j) return null;
  ordem.splice(i, 1);
  ordem.splice(j, 0, abaId);
  return { 'conteudo.ordem': ordem };
}

/* ---------------- nomes definidos (PL16) ---------------- */

export function definirNome(c, nome, refTexto) {
  return { [`conteudo.nomes.${nome.toLowerCase()}`]: { n: nome, ref: refTexto } };
}

/** Renomear troca em todas as fórmulas de uma vez ("renomear símbolo"). */
export function renomearNome(c, velho, novo) {
  const kv = velho.toLowerCase();
  const def = c.nomes[kv];
  const nomes = { ...c.nomes };
  delete nomes[kv];
  nomes[novo.toLowerCase()] = { ...def, n: novo };
  const mud = { 'conteudo.nomes': nomes };
  const rx = new RegExp('(^|[^\\wÀ-ÿ.])' + velho.replace(/[.\\]/g, '\\$&') + '(?![\\wÀ-ÿ.(!])', 'i');
  for (const id of c.ordem) {
    const aba = c.abas[id];
    const cel = { ...aba.cel };
    let mudou = false;
    for (const ch of Object.keys(cel)) {
      const x = cel[ch];
      if (x.f == null || !rx.test(x.f)) continue;
      const nf = reescrever(x.f, (a) => renomearNomeNaArvore(a, velho, novo));
      if (nf !== x.f) { cel[ch] = { ...x, f: nf }; mudou = true; }
    }
    if (mudou) mud[`conteudo.abas.${id}.cel`] = cel;
  }
  return mud;
}

export function excluirNome(c, nome) {
  const nomes = { ...c.nomes };
  delete nomes[nome.toLowerCase()];
  return { 'conteudo.nomes': nomes };
}

/** Texto da referência absoluta para um nome: 'Planilha1'!$B$2:$B$9 */
export function refAbsoluta(c, abaId, f) {
  const nome = c.abas[abaId].nome;
  const a = { t: f.l1 === f.l2 && f.c1 === f.c2 ? 'ref' : 'area', tipo: 'cel', aba: nome, l: f.l1, c: f.c1, al: true, ac: true, l1: f.l1, c1: f.c1, l2: f.l2, c2: f.c2, al1: true, ac1: true, al2: true, ac2: true };
  return escrever(a, 'en');
}

/* ---------------- mesclar ---------------- */
export function mesclar(c, abaId, f) {
  const aba = c.abas[abaId];
  const lista = mescladas(aba).filter((m) => m.l2 < f.l1 || m.l1 > f.l2 || m.c2 < f.c1 || m.c1 > f.c2);
  const lote = new Lote(c);
  /* fica só o valor da primeira célula (como o Excel avisa) */
  for (const [l, cc] of celulasDaFaixa(f)) {
    if (l === f.l1 && cc === f.c1) continue;
    const k = chave(l, cc);
    const cel = aba.cel[k];
    if (cel && (cel.v !== undefined || cel.f != null)) { const { v, f: ff, ...r } = cel; lote.por(abaId, k, r); }
  }
  mudarEstilo(c, abaId, [{ l1: f.l1, c1: f.c1, l2: f.l1, c2: f.c1 }], (e) => ({ ...e, al: 'c', av: e.av || 'm' }), lote);
  lote.outras[`conteudo.abas.${abaId}.mesc`] = [...lista.map((m) => m.t), textoFaixa(f)];
  return lote;
}
export function desmesclar(c, abaId, f) {
  const aba = c.abas[abaId];
  const lista = mescladas(aba).filter((m) => m.l2 < f.l1 || m.l1 > f.l2 || m.c2 < f.c1 || m.c1 > f.c2);
  return { [`conteudo.abas.${abaId}.mesc`]: lista.map((m) => m.t) };
}
export function perdeValoresAoMesclar(c, abaId, f) {
  const aba = c.abas[abaId];
  for (const [l, cc] of celulasDaFaixa(f)) {
    if (l === f.l1 && cc === f.c1) continue;
    const cel = aba.cel[chave(l, cc)];
    if (cel && (cel.v !== undefined || cel.f != null)) return true;
  }
  return false;
}

export { paraMostrar, lerGuardada, letraCol, normalFaixa };
