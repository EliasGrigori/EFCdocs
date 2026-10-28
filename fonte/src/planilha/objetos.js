/* EFCdocs — Planilha: objetos sobre a grade (v0.4.5: assinatura). Regras puras, sem tela.
   Cada aba guarda  objs: [{ id, tipo:'assinatura', l, c, dx, dy, w, h, nome, rub? }]
   (l, c = célula onde o canto de cima à esquerda está presa; dx, dy = folga em px a 100%; w, h = tamanho em px a 100%).
   O objeto acompanha a célula quando se inserem ou excluem linhas e colunas. A rubrica fica só no arquivo. */
import { MAX_COL, MAX_LIN } from './ref.js';
import { ASN, limparNome, rubricaValida } from '../nucleo/assinatura.js';
import { normalizarG } from './graficos.js';
import { limparForma } from './formas.js';

/* v0.6.0: gráfico também é objeto da aba (tipo 'grafico', com g = { t, titulo, dados, op }) */
export const GR = { W: 480, H: 300, W_MIN: 180, H_MIN: 120 };

/* v0.6.3: imagem (foto ou desenho guardado no arquivo) e botão que leva a outra aba */
export const IMG = { W: 240, H: 160, W_MIN: 24, H_MIN: 24, MAX_CHARS: 500000 }; // MAX_CHARS: tamanho do texto da imagem guardada (cerca de 370 KB)
export const BTN = { W: 180, H: 40, W_MIN: 72, H_MIN: 26 };
export const imagemValida = (src) => typeof src === 'string' && src.length <= IMG.MAX_CHARS && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(src);
const COR_BOTAO = /^#[0-9a-fA-F]{6}$/;

export const MAX_OBJETOS = 400; // v0.6.5: painéis do Excel têm muitas formas
const num = (v, p) => (typeof v === 'number' && Number.isFinite(v) ? v : p);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const objetosDaAba = (aba) => (aba && Array.isArray(aba.objs) ? aba.objs : []);

/** Limpa a lista que veio de um arquivo (ou de colar): tira o que está quebrado e a rubrica que não for PNG em texto. */
export function normalizarObjetos(lista) {
  if (!Array.isArray(lista)) return [];
  const ids = new Set();
  const out = [];
  for (const o of lista) {
    if (!o || (o.tipo !== 'assinatura' && o.tipo !== 'grafico' && o.tipo !== 'imagem' && o.tipo !== 'botao' && o.tipo !== 'forma') || !o.id || ids.has(o.id) || out.length >= MAX_OBJETOS) continue;
    ids.add(o.id);
    if (o.tipo === 'forma') {
      const f = limparForma(o, { id: String(o.id), l: clamp(Math.round(num(o.l, 0)), 0, MAX_LIN - 1), c: clamp(Math.round(num(o.c, 0)), 0, MAX_COL - 1), dx: Math.max(0, num(o.dx, 0)), dy: Math.max(0, num(o.dy, 0)) });
      if (f) { if (o.xoRels && typeof o.xoRels === 'object' && f.xo) f.xoRels = o.xoRels; out.push(f); }
      continue;
    }
    if (o.tipo === 'imagem') {
      if (!imagemValida(o.src)) continue;
      out.push({
        id: String(o.id), tipo: 'imagem',
        l: clamp(Math.round(num(o.l, 0)), 0, MAX_LIN - 1), c: clamp(Math.round(num(o.c, 0)), 0, MAX_COL - 1),
        dx: Math.max(0, num(o.dx, 0)), dy: Math.max(0, num(o.dy, 0)),
        w: clamp(num(o.w, IMG.W), IMG.W_MIN, 4000), h: clamp(num(o.h, IMG.H), IMG.H_MIN, 4000),
        src: o.src, nome: String(o.nome || '').slice(0, 200),
      });
      continue;
    }
    if (o.tipo === 'botao') {
      const b = {
        id: String(o.id), tipo: 'botao',
        l: clamp(Math.round(num(o.l, 0)), 0, MAX_LIN - 1), c: clamp(Math.round(num(o.c, 0)), 0, MAX_COL - 1),
        dx: Math.max(0, num(o.dx, 0)), dy: Math.max(0, num(o.dy, 0)),
        w: clamp(num(o.w, BTN.W), BTN.W_MIN, 800), h: clamp(num(o.h, BTN.H), BTN.H_MIN, 300),
        nome: String(o.nome || '').slice(0, 60), alvo: String(o.alvo || ''),
      };
      if (typeof o.ref === 'string' && /^[A-Za-z]{1,3}\d{1,7}$/.test(o.ref)) b.ref = o.ref.toUpperCase();
      if (typeof o.cor === 'string' && COR_BOTAO.test(o.cor)) b.cor = o.cor.toLowerCase();
      out.push(b);
      continue;
    }
    if (o.tipo === 'grafico') {
      out.push({
        id: String(o.id), tipo: 'grafico',
        l: clamp(Math.round(num(o.l, 0)), 0, MAX_LIN - 1), c: clamp(Math.round(num(o.c, 0)), 0, MAX_COL - 1),
        dx: Math.max(0, num(o.dx, 0)), dy: Math.max(0, num(o.dy, 0)),
        w: clamp(num(o.w, GR.W), GR.W_MIN, 2400), h: clamp(num(o.h, GR.H), GR.H_MIN, 1600),
        g: normalizarG(o.g),
      });
      continue;
    }
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

/** Imagem nova presa a uma célula (w e h já na proporção da foto). */
export function novaImagem({ src, nome, w, h }, ancora, id = idObjeto()) {
  return { id, tipo: 'imagem', l: ancora.l, c: ancora.c, dx: ancora.dx ?? 6, dy: ancora.dy ?? 6, w: Math.round(w || IMG.W), h: Math.round(h || IMG.H), src, nome: String(nome || '').slice(0, 200) };
}
/** Botão novo que leva a outra aba. */
export function novoBotao({ nome, alvo, ref, cor }, ancora, id = idObjeto()) {
  const o = { id, tipo: 'botao', l: ancora.l, c: ancora.c, dx: ancora.dx ?? 6, dy: ancora.dy ?? 6, w: BTN.W, h: BTN.H, nome: String(nome || '').slice(0, 60), alvo: String(alvo || '') };
  if (ref) o.ref = String(ref).toUpperCase();
  if (cor) o.cor = cor;
  return o;
}
/** Tamanho que cabe em w×h mantendo a proporção da foto. */
export function caberImagem(largura, altura, maxW = 360, maxH = 260) {
  const k = Math.min(1, maxW / largura, maxH / altura);
  return { w: Math.max(IMG.W_MIN, Math.round(largura * k)), h: Math.max(IMG.H_MIN, Math.round(altura * k)) };
}

/** Gráfico novo preso a uma célula. */
export function novoGrafico(g, ancora, id = idObjeto()) {
  return { id, tipo: 'grafico', l: ancora.l, c: ancora.c, dx: ancora.dx ?? 6, dy: ancora.dy ?? 6, w: ancora.w || GR.W, h: ancora.h || GR.H, g: normalizarG(g) };
}

export const caminhoObjs = (abaId) => `conteudo.abas.${abaId}.objs`;

/** Mudança que troca a lista inteira (a lista é pequena; o desfazer guarda a anterior). */
export const mudancaObjetos = (abaId, lista) => ({ [caminhoObjs(abaId)]: lista.length ? lista : undefined });

export function comObjeto(lista, id, campos) {
  return lista.map((o) => (o.id === id ? { ...o, ...campos } : o));
}
export const semObjeto = (lista, id) => lista.filter((o) => o.id !== id);

/** v0.6.6: forma que "move e muda de tamanho com as células" (como no Excel: âncora de duas células). */
export const esticaComCelulas = (o) => o.tipo === 'forma' && (o.ed || (o.xo ? 'twoCell' : 'oneCell')) === 'twoCell';

/**
 * Inserir (n > 0) ou excluir (n < 0) linhas/colunas a partir do índice i, no eixo 'l' ou 'c':
 * o objeto desce/sobe junto com a célula. Se a célula dele é excluída, ele fica na primeira célula que sobrou naquele lugar.
 * v0.6.6 (Grok): a forma que estica com as células (painel de fundo) cresce quando as linhas entram no meio dela
 * e encolhe quando saem. medidas: { pos(k), tam(k), padrao } do eixo ANTES da mudança (sem elas, só move).
 */
export function ajustarObjetosEstrutura(lista, eixo, i, n, medidas = null) {
  const k = Math.abs(n);
  const max = eixo === 'l' ? MAX_LIN : MAX_COL;
  return lista.map((o) => {
    const x = eixo === 'l' ? o.l : o.c;
    let nx = x;
    if (n > 0) nx = x >= i ? x + k : x;
    else if (x >= i + k) nx = x - k;
    else if (x >= i) nx = i;
    nx = Math.min(max - 1, nx);
    const campo = eixo === 'l' ? 'h' : 'w', folga = eixo === 'l' ? 'dy' : 'dx', ancora = eixo === 'l' ? 'l' : 'c';
    let tam = o[campo];
    if (medidas && esticaComCelulas(o)) {
      const Y0 = medidas.pos(x) + (o[folga] || 0), Y1 = Y0 + (o[campo] || 0);
      if (n > 0) {
        const p = medidas.pos(i);
        if (x < i && p > Y0 && p < Y1) tam += k * medidas.padrao;
      } else {
        const b0 = medidas.pos(i), b1 = medidas.pos(i + k);
        const sobra = Math.max(0, Math.min(Y1, b1) - Math.max(Y0, b0));
        if (sobra > 0) tam = Math.max(1, tam - sobra);
      }
    }
    if (nx === x && tam === o[campo]) return o;
    const out = { ...o, [ancora]: nx, [campo]: tam };
    if (x >= i && x < i + k && n < 0) out[folga] = 0;
    return out;
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
  const visivel = corte.l + corte.r < Math.max(1, r.w) && corte.t + corte.b < Math.max(1, r.h); // v0.6.5: linha reta tem altura zero
  return { visivel, corte, semCorte: !corte.l && !corte.t && !corte.r && !corte.b };
}
