/* EFCdocs — Planilha: objetos sobre a grade (v0.4.5: assinatura). Regras puras, sem tela.
   Cada aba guarda  objs: [{ id, tipo:'assinatura', l, c, dx, dy, w, h, nome, rub? }]
   (l, c = célula onde o canto de cima à esquerda está presa; dx, dy = folga em px a 100%; w, h = tamanho em px a 100%).
   O objeto acompanha a célula quando se inserem ou excluem linhas e colunas. A rubrica fica só no arquivo. */
import { MAX_COL, MAX_LIN } from './ref.js';
import { ASN, limparNome, rubricaValida } from '../nucleo/assinatura.js';

export const MAX_OBJETOS = 40;
const num = (v, p) => (typeof v === 'number' && Number.isFinite(v) ? v : p);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const objetosDaAba = (aba) => (aba && Array.isArray(aba.objs) ? aba.objs : []);

/** Limpa a lista que veio de um arquivo (ou de colar): tira o que está quebrado e a rubrica que não for PNG em texto. */
export function normalizarObjetos(lista) {
  if (!Array.isArray(lista)) return [];
  const ids = new Set();
  const out = [];
  for (const o of lista) {
    if (!o || o.tipo !== 'assinatura' || !o.id || ids.has(o.id) || out.length >= MAX_OBJETOS) continue;
    ids.add(o.id);
    const n = {
      id: String(o.id), tipo: 'assinatura',
      l: clamp(Math.round(num(o.l, 0)), 0, MAX_LIN - 1), c: clamp(Math.round(num(o.c, 0)), 0, MAX_COL - 1),
      dx: Math.max(0, num(o.dx, 0)), dy: Math.max(0, num(o.dy, 0)),
      w: clamp(num(o.w, ASN.W), ASN.W_MIN, 1200), h: clamp(num(o.h, ASN.H), ASN.H_MIN, 600),
      nome: limparNome(o.nome),
    };
    if (rubricaValida(o.rub)) n.rub = o.rub;
    out.push(n);
  }
  return out;
}

let cont = 0;
export const idObjeto = (agora = Date.now(), aleatorio = Math.random) => {
  cont = (cont + 1) % 1296;
  return 'o' + agora.toString(36) + cont.toString(36).padStart(2, '0') + Math.floor(aleatorio() * 46656).toString(36).padStart(3, '0');
};

/** Assinatura nova presa a uma célula. */
export function novaAssinatura({ nome, rub }, ancora, id = idObjeto()) {
  const o = { id, tipo: 'assinatura', l: ancora.l, c: ancora.c, dx: ancora.dx ?? 4, dy: ancora.dy ?? 4, w: ASN.W, h: ASN.H, nome: limparNome(nome) };
  if (rubricaValida(rub)) o.rub = rub;
  return o;
}

export const caminhoObjs = (abaId) => `conteudo.abas.${abaId}.objs`;

/** Mudança que troca a lista inteira (a lista é pequena; o desfazer guarda a anterior). */
export const mudancaObjetos = (abaId, lista) => ({ [caminhoObjs(abaId)]: lista.length ? lista : undefined });

export function comObjeto(lista, id, campos) {
  return lista.map((o) => (o.id === id ? { ...o, ...campos } : o));
}
export const semObjeto = (lista, id) => lista.filter((o) => o.id !== id);

/**
 * Inserir (n > 0) ou excluir (n < 0) linhas/colunas a partir do índice i, no eixo 'l' ou 'c':
 * o objeto desce/sobe junto com a célula. Se a célula dele é excluída, ele fica na primeira célula que sobrou naquele lugar.
 */
export function ajustarObjetosEstrutura(lista, eixo, i, n) {
  const k = Math.abs(n);
  const max = eixo === 'l' ? MAX_LIN : MAX_COL;
  return lista.map((o) => {
    const x = eixo === 'l' ? o.l : o.c;
    let nx = x;
    if (n > 0) nx = x >= i ? x + k : x;
    else if (x >= i + k) nx = x - k;
    else if (x >= i) nx = i;
    nx = Math.min(max - 1, nx);
    if (nx === x) return o;
    return eixo === 'l' ? { ...o, l: nx, ...(x >= i && x < i + k && n < 0 ? { dy: 0 } : {}) } : { ...o, c: nx, ...(x >= i && x < i + k && n < 0 ? { dx: 0 } : {}) };
  });
}

/* ---------- posição na tela (geometria de grade.js) ---------- */
/** Retângulo do objeto na tela (px da área da planilha, já com zoom). */
export function retDoObjeto(o, G) {
  return { x: G.xDe(o.c) + o.dx * G.z, y: G.yDe(o.l) + o.dy * G.z, w: o.w * G.z, h: o.h * G.z };
}

/** Âncora (célula + folga) para um ponto da tela: usado ao soltar o objeto depois de arrastar. */
export function ancoraNoPonto(G, x, y) {
  const l = Math.max(0, G.linEm(y)), c = Math.max(0, G.colEm(x));
  return { l, c, dx: Math.max(0, (x - G.xDe(c)) / G.z), dy: Math.max(0, (y - G.yDe(l)) / G.z) };
}

/**
 * Pedaço do objeto que aparece: o objeto preso numa parte congelada não passa dela, e o que rola não entra na parte congelada.
 * Devolve { visivel, corte:{ t, r, b, l } } em px da tela.
 */
export function recorteDoObjeto(o, r, G) {
  const x0 = o.c < G.cc ? G.hw : G.hw + G.fx, x1 = o.c < G.cc ? G.hw + G.fx : G.W;
  const y0 = o.l < G.cl ? G.hh : G.hh + G.fy, y1 = o.l < G.cl ? G.hh + G.fy : G.H;
  const corte = { l: Math.max(0, x0 - r.x), t: Math.max(0, y0 - r.y), r: Math.max(0, r.x + r.w - x1), b: Math.max(0, r.y + r.h - y1) };
  const visivel = corte.l + corte.r < r.w && corte.t + corte.b < r.h;
  return { visivel, corte, semCorte: !corte.l && !corte.t && !corte.r && !corte.b };
}
