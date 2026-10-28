/* EFCdocs — Planilha (v0.6.3): Classificar, Filtrar, Remover duplicados e Travar modelo.
   Tudo aqui é conta pura (sem tela). As janelas e as setas do filtro ficam em Planilha.jsx e dadosUi.jsx.
   Modelo guardado na aba:
   - aba.fil  = { fx:'A1:F100', cr:{ [coluna]: { v:[textos que ficam] } } }   (fx: a linha de cima é o cabeçalho)
   - aba.ocF  = { [linha]: 1 }   linhas escondidas pelo filtro (também estão em aba.ocL)
   - aba.prot = 1 | { a:'atributos do arquivo' }   aba travada; célula livre = estilo com lib:true */
import { chave, lerChave, MAX_COL, MAX_LIN, letraCol, normalFaixa, lerEnderecoCaixa, textoFaixa } from './ref.js';
import { Lote, existentes, moverFormula } from './operacoes.js';
import { mescladas } from './modelo.js';
import { ehErro } from './valores.js';

/* ---------- ordem dos valores ---------- */
const cole = (() => { try { return new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: false }); } catch { return null; } })();
const compTexto = (a, b) => (cole ? cole.compare(a, b) : (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0));

/** 0 número · 1 texto · 2 lógico · 3 erro · 4 vazio (vazio vai sempre para o fim, como no Excel). */
export function tipoDeOrdem(v) {
  if (v == null || v === '') return 4;
  if (typeof v === 'number') return 0;
  if (typeof v === 'boolean') return 2;
  if (typeof v === 'string') return ehErro(v) ? 3 : 1;
  if (ehErro(v)) return 3;
  return 1;
}
/** Compara dois valores em ordem crescente (números < texto < lógicos < erros; vazios no fim). */
export function compararOrdem(a, b) {
  const ta = tipoDeOrdem(a), tb = tipoDeOrdem(b);
  if (ta !== tb) return ta - tb;
  if (ta === 0) return a - b;
  if (ta === 1) return compTexto(String(a), String(b));
  if (ta === 2) return (a ? 1 : 0) - (b ? 1 : 0);
  if (ta === 3) return compTexto(String(a && a.msg != null ? a.msg : a), String(b && b.msg != null ? b.msg : b));
  return 0;
}
/** Com ordem decrescente os vazios continuam no fim. */
function compararNivel(a, b, desc) {
  const ta = tipoDeOrdem(a), tb = tipoDeOrdem(b);
  if (ta === 4 || tb === 4) return ta === tb ? 0 : ta === 4 ? 1 : -1;
  const r = compararOrdem(a, b);
  return desc ? -r : r;
}

const linhaTemMescla = (aba, f) => mescladas(aba).some((m) => m.l1 <= f.l2 && m.l2 >= f.l1 && m.c1 <= f.c2 && m.c2 >= f.c1);

/** Quantidade de linhas de dados (sem o cabeçalho). */
export const linhasDeDados = (f, cabecalho) => f.l2 - f.l1 + 1 - (cabecalho ? 1 : 0);

/* ---------- Classificar ---------- */
/**
 * Põe as linhas da faixa em ordem.
 * niveis: [{ col (número da coluna na planilha), desc }], do mais forte ao mais fraco.
 * valorDe(l, c) devolve o valor calculado da célula. Linhas escondidas por filtro ficam onde estão
 * (só as que aparecem trocam de lugar entre si, como no Excel).
 * Devolve { lote, linhas } ou { erro }.
 */
export function classificar(c, abaId, faixa, niveis, { cabecalho = true, valorDe }) {
  const aba = c.abas[abaId];
  const f = normalFaixa(faixa);
  const l1 = f.l1 + (cabecalho ? 1 : 0);
  if (l1 >= f.l2) return { erro: 'Escolha pelo menos duas linhas de dados para pôr em ordem.' };
  if (!niveis || !niveis.length) return { erro: 'Escolha por qual coluna a ordem vale.' };
  for (const n of niveis) if (n.col < f.c1 || n.col > f.c2) return { erro: 'A coluna escolhida está fora da área.' };
  if (linhaTemMescla(aba, { l1, l2: f.l2, c1: f.c1, c2: f.c2 })) return { erro: 'Tem células mescladas nesta área. Desfaça a mescla antes de pôr em ordem.' };
  const fora = aba.ocF || {};
  const linhas = [];
  for (let l = l1; l <= f.l2; l++) if (!fora[l]) linhas.push(l);
  if (linhas.length < 2) return { erro: 'Só uma linha aparece no filtro: nada para pôr em ordem.' };
  const chaves = new Map();
  for (const l of linhas) chaves.set(l, niveis.map((n) => valorDe(l, n.col)));
  const ordem = linhas.map((l, i) => ({ l, i })).sort((x, y) => {
    const kx = chaves.get(x.l), ky = chaves.get(y.l);
    for (let n = 0; n < niveis.length; n++) {
      const r = compararNivel(kx[n], ky[n], niveis[n].desc);
      if (r) return r;
    }
    return x.i - y.i; // estável
  });
  const lote = new Lote(c);
  let mexeu = 0;
  linhas.forEach((destino, pos) => {
    const origem = ordem[pos].l;
    if (origem === destino) return;
    mexeu++;
    for (let cc = f.c1; cc <= f.c2; cc++) {
      const x = aba.cel[chave(origem, cc)];
      if (!x) { lote.por(abaId, chave(destino, cc), undefined); continue; }
      const nova = { ...x };
      if (x.f != null) nova.f = moverFormula(x.f, destino - origem, 0);
      lote.por(abaId, chave(destino, cc), nova);
    }
  });
  return { lote, linhas: linhas.length, mexeu };
}

/* ---------- Remover duplicados ---------- */
const chaveDup = (v) => {
  if (v == null || v === '') return 'v:';
  if (typeof v === 'number') return 'n:' + v;
  if (typeof v === 'boolean') return 'b:' + (v ? 1 : 0);
  return 't:' + String(v).toLowerCase();
};
/** Quais linhas de dados repetem outra (a primeira fica). colunas: números de coluna da planilha. */
export function acharDuplicados(faixa, colunas, { cabecalho = true, valorDe }) {
  const f = normalFaixa(faixa);
  const vistos = new Set();
  const repetidas = [];
  for (let l = f.l1 + (cabecalho ? 1 : 0); l <= f.l2; l++) {
    const k = colunas.map((cc) => chaveDup(valorDe(l, cc))).join('\u0001');
    if (vistos.has(k)) repetidas.push(l); else vistos.add(k);
  }
  return repetidas;
}
/** Apaga as linhas repetidas e sobe as de baixo (só dentro da área). Devolve { lote, removidas, restantes } ou { erro }. */
export function removerDuplicados(c, abaId, faixa, colunas, { cabecalho = true, valorDe }) {
  const aba = c.abas[abaId];
  const f = normalFaixa(faixa);
  if (!colunas || !colunas.length) return { erro: 'Marque pelo menos uma coluna.' };
  if (linhaTemMescla(aba, f)) return { erro: 'Tem células mescladas nesta área. Desfaça a mescla antes.' };
  const rep = new Set(acharDuplicados(f, colunas, { cabecalho, valorDe }));
  const inicio = f.l1 + (cabecalho ? 1 : 0);
  if (!rep.size) return { lote: new Lote(c), removidas: 0, restantes: f.l2 - inicio + 1 };
  const lote = new Lote(c);
  let destino = inicio;
  for (let l = inicio; l <= f.l2; l++) {
    if (rep.has(l)) continue;
    if (destino !== l) {
      for (let cc = f.c1; cc <= f.c2; cc++) {
        const x = aba.cel[chave(l, cc)];
        if (!x) { lote.por(abaId, chave(destino, cc), undefined); continue; }
        const nova = { ...x };
        if (x.f != null) nova.f = moverFormula(x.f, destino - l, 0);
        lote.por(abaId, chave(destino, cc), nova);
      }
    }
    destino++;
  }
  for (let l = destino; l <= f.l2; l++) for (let cc = f.c1; cc <= f.c2; cc++) lote.por(abaId, chave(l, cc), undefined);
  return { lote, removidas: rep.size, restantes: destino - inicio };
}

/* ---------- Filtro ---------- */
export const VAZIO_FILTRO = '';
export function faixaDoFiltro(fil) {
  if (!fil || !fil.fx) return null;
  const f = lerEnderecoCaixa(fil.fx);
  return f ? normalFaixa(f) : null;
}
/** Filtro novo sobre a faixa (a linha de cima é o cabeçalho). */
export const novoFiltro = (faixa) => ({ fx: textoFaixa(normalFaixa(faixa)), cr: {} });
export const filtroAtivo = (fil) => !!fil && Object.keys(fil.cr || {}).length > 0;
export const colunaFiltrada = (fil, col) => !!(fil && fil.cr && fil.cr[col]);

/** O texto que o filtro compara: o que aparece na célula. */
const passa = (fil, col, texto) => {
  const cr = fil.cr[col];
  return !cr || cr.v.includes(texto);
};
/** Linhas de dados que o filtro esconde. textoDe(l, c) = texto mostrado na célula. */
export function linhasEscondidasPeloFiltro(fil, textoDe) {
  const f = faixaDoFiltro(fil);
  const out = new Set();
  if (!f) return out;
  const cols = Object.keys(fil.cr || {}).map(Number);
  if (!cols.length) return out;
  for (let l = f.l1 + 1; l <= f.l2; l++) {
    for (const col of cols) if (!passa(fil, col, textoDe(l, col))) { out.add(l); break; }
  }
  return out;
}
/**
 * Valores que a coluna tem, para a lista da seta. Considera os filtros das outras colunas (como o Excel):
 * quem foi escondido por outra coluna aparece com ok:false.
 * Devolve [{ t (texto), n (quantas linhas), marcado, ok }], em ordem crescente (vazios no fim).
 */
export function valoresDaColuna(fil, col, textoDe, valorDe) {
  const f = faixaDoFiltro(fil);
  if (!f) return [];
  const cr = fil.cr || {};
  const mapa = new Map();
  for (let l = f.l1 + 1; l <= f.l2; l++) {
    const t = textoDe(l, col);
    let ok = true;
    for (const k of Object.keys(cr)) { if (+k !== col && !passa(fil, +k, textoDe(l, +k))) { ok = false; break; } }
    let e = mapa.get(t);
    if (!e) { e = { t, n: 0, ok: false, v: valorDe ? valorDe(l, col) : t }; mapa.set(t, e); }
    if (ok) { e.n++; e.ok = true; }
  }
  const lista = [...mapa.values()].sort((a, b) => compararNivel(a.v, b.v, false));
  const atual = cr[col];
  return lista.map((e) => ({ t: e.t, n: e.n, ok: e.ok, marcado: atual ? atual.v.includes(e.t) : true }));
}
/** Muda o critério de uma coluna: escolhidos = textos que ficam. Todos marcados = sem critério. */
export function comCriterio(fil, col, escolhidos, todos) {
  const cr = { ...(fil.cr || {}) };
  const sel = [...new Set(escolhidos)];
  if (todos && sel.length >= todos.length && todos.every((t) => sel.includes(t))) delete cr[col];
  else cr[col] = { v: sel };
  return { ...fil, cr };
}
export const semCriterios = (fil) => ({ ...fil, cr: {} });

/**
 * Esconde ou mostra as linhas segundo o filtro. Mantém escondidas à mão (as que não eram do filtro).
 * Devolve as mudanças { 'conteudo.abas.ID.ocL': ..., ...ocF } já prontas para cx.aplicar.
 */
export function mudancasDoFiltro(aba, abaId, fil, textoDe) {
  const antigoF = aba.ocF || {};
  const ocL = {};
  for (const k of Object.keys(aba.ocL || {})) if (!antigoF[k]) ocL[k] = aba.ocL[k];
  const novas = fil ? linhasEscondidasPeloFiltro(fil, textoDe) : new Set();
  const ocF = {};
  for (const l of novas) { ocL[l] = 1; ocF[l] = 1; }
  const p = `conteudo.abas.${abaId}.`;
  return {
    [p + 'ocL']: Object.keys(ocL).length ? ocL : undefined,
    [p + 'ocF']: Object.keys(ocF).length ? ocF : undefined,
    [p + 'fil']: fil || undefined,
  };
}
/** Quantas linhas aparecem de quantas (para a mensagem "12 de 340 registros"). */
export function contagemDoFiltro(fil, textoDe) {
  const f = faixaDoFiltro(fil);
  if (!f) return { total: 0, visiveis: 0 };
  const total = f.l2 - f.l1;
  return { total, visiveis: total - linhasEscondidasPeloFiltro(fil, textoDe).size };
}

/** Linhas e colunas de uma aba mudaram de lugar (inserir/excluir): acerta a área do filtro. */
export function moverFiltro(fil, eixo, move) {
  if (!fil) return fil;
  const f = faixaDoFiltro(fil);
  if (!f) return undefined;
  if (eixo === 'l') {
    const a = move(f.l1), b = move(f.l2);
    if (a == null) return undefined;
    const fim = b == null ? (() => { let x = f.l2; while (x > a && move(x) == null) x--; return move(x); })() : b;
    if (fim == null || fim <= a) return undefined;
    return { ...fil, fx: textoFaixa({ ...f, l1: a, l2: fim }) };
  }
  const a = move(f.c1), b = move(f.c2);
  if (a == null || b == null) return undefined;
  const cr = {};
  for (const k of Object.keys(fil.cr || {})) { const n = move(+k); if (n != null) cr[n] = fil.cr[k]; }
  return { ...fil, fx: textoFaixa({ ...f, c1: a, c2: b }), cr };
}

/* ---------- Travar modelo ---------- */
export const abaTravada = (aba) => !!(aba && aba.prot);

/* ---------- senha da aba (v0.6.4): a que veio do Excel continua valendo ---------- */
/** Os campos da senha que vieram do arquivo (ou null se a aba não tem senha). */
export const senhaDaAba = (aba) => {
  const a = aba && aba.prot && aba.prot.a;
  return a && (a.password || a.hashValue) ? a : null;
};
/** Senha antiga do Excel (16 bits), em 4 letras e números. */
export function hashLegado(texto) {
  const pw = String(texto);
  let h = 0;
  for (let i = pw.length - 1; i >= 0; i--) {
    h = ((h >> 14) & 1) | ((h << 1) & 0x7fff);
    h ^= pw.charCodeAt(i);
  }
  h = ((h >> 14) & 1) | ((h << 1) & 0x7fff);
  h ^= pw.length;
  h ^= 0xce4b;
  return h.toString(16).toUpperCase().padStart(4, '0');
}
const ALGORITMOS = { 'SHA-1': 'SHA-1', 'SHA1': 'SHA-1', 'SHA-256': 'SHA-256', 'SHA256': 'SHA-256', 'SHA-384': 'SHA-384', 'SHA384': 'SHA-384', 'SHA-512': 'SHA-512', 'SHA512': 'SHA-512' };
const deB64 = (t) => { const b = atob(t); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
const paraB64 = (u) => { let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s); };
/** A senha digitada confere com a do arquivo? (true / false; null se o jeito de guardar não é conhecido) */
export async function conferirSenha(campos, senha) {
  if (!campos) return true;
  if (campos.hashValue) {
    const alg = ALGORITMOS[String(campos.algorithmName || 'SHA-512').toUpperCase()];
    if (!alg || !campos.saltValue || !globalThis.crypto || !globalThis.crypto.subtle) return null;
    const sub = globalThis.crypto.subtle;
    const pw = new Uint8Array(String(senha).length * 2);
    for (let i = 0; i < senha.length; i++) { pw[2 * i] = senha.charCodeAt(i) & 255; pw[2 * i + 1] = senha.charCodeAt(i) >> 8; }
    const sal = deB64(campos.saltValue);
    let h = new Uint8Array(await sub.digest(alg, new Uint8Array([...sal, ...pw])));
    const giros = Math.min(+campos.spinCount || 0, 1000000);
    for (let i = 0; i < giros; i++) {
      const bloco = new Uint8Array(h.length + 4);
      bloco.set(h); bloco[h.length] = i & 255; bloco[h.length + 1] = (i >> 8) & 255; bloco[h.length + 2] = (i >> 16) & 255; bloco[h.length + 3] = (i >>> 24) & 255;
      h = new Uint8Array(await sub.digest(alg, bloco));
    }
    return paraB64(h) === campos.hashValue;
  }
  if (campos.password) return hashLegado(senha) === String(campos.password).toUpperCase();
  return true;
}
export const celulaLivre = (c, cel) => !!(cel && cel.s && c.estilos[cel.s] && c.estilos[cel.s].lib);

/* caminhos que mexem no que o Excel trava; filtro e visão (zoom, congelar...) seguem livres */
const TRAVADOS = new Set(['cel', 'alt', 'larg', 'mesc', 'objs', 'val', 'cf', 'com', 'ocC', 'zeros']);
/**
 * Diz se as mudanças mexem em algo travado. mud = { caminho: valor }.
 * Devolve null (pode) ou o texto do motivo.
 */
export function bloqueioDaProtecao(c, mud) {
  const abasMud = new Map();
  for (const caminho of Object.keys(mud)) {
    const m = /^conteudo\.abas\.([^.]+)\.(.+)$/.exec(caminho);
    if (!m) continue;
    const aba = c.abas[m[1]];
    if (!aba || !aba.prot) continue;
    const [campo, ...resto] = m[2].split('.');
    if (!abasMud.has(m[1])) abasMud.set(m[1], []);
    abasMud.get(m[1]).push({ campo, resto, valor: mud[caminho] });
  }
  for (const [abaId, lista] of abasMud) {
    const aba = c.abas[abaId];
    const filtrando = lista.some((x) => x.campo === 'fil' || x.campo === 'ocF');
    for (const { campo, resto, valor } of lista) {
      if (campo === 'ocL' && !filtrando) return 'Esta aba está travada: não dá para esconder ou mostrar linhas.';
      if (!TRAVADOS.has(campo)) continue;
      if (campo !== 'cel') return 'Esta aba está travada: só dá para mudar as células liberadas.';
      if (resto.length) {
        if (!celulaLivre(c, aba.cel[resto[0]])) return 'Esta célula está travada. Para mexer, tire a trava da aba em Revisão > Travar modelo.';
      } else {
        const novo = valor || {};
        const ks = new Set([...Object.keys(aba.cel), ...Object.keys(novo)]);
        for (const k of ks) {
          if (aba.cel[k] === novo[k]) continue;
          if (!celulaLivre(c, aba.cel[k])) return 'Esta aba está travada: só dá para mudar as células liberadas.';
        }
      }
    }
  }
  return null;
}
/** Quantas células a aba tem liberadas. */
export function contarLiberadas(c, aba) {
  let n = 0;
  for (const k of Object.keys(aba.cel)) if (celulaLivre(c, aba.cel[k])) n++;
  return n;
}
/** Libera ou trava as células das faixas (muda só o estilo). Devolve o Lote. */
export function liberarCelulas(c, abaId, faixas, liberar) {
  const lote = new Lote(c);
  const aba = c.abas[abaId];
  for (const f0 of faixas) {
    const f = normalFaixa(f0);
    const area = (f.l2 - f.l1 + 1) * (f.c2 - f.c1 + 1);
    const lista = liberar && area <= 20000 ? (function* () { for (let l = f.l1; l <= f.l2; l++) for (let cc = f.c1; cc <= f.c2; cc++) yield [l, cc, chave(l, cc)]; })() : existentes(aba, f);
    for (const [, , k] of lista) {
      const x = aba.cel[k] || {};
      const e = { ...(c.estilos[x.s] || {}) };
      if (liberar) e.lib = true; else delete e.lib;
      const s = lote.estilo(e);
      lote.por(abaId, k, { ...x, s: s || undefined });
    }
  }
  return lote;
}

export { letraCol, lerChave, MAX_COL, MAX_LIN };
