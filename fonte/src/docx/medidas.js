/* EFCdocs v0.7.0 — medidas de texto do Documento, sem navegador.
   Com elas o mesmo cálculo serve para a prévia de impressão, o PDF e a contagem de páginas,
   e os testes de regras conferem a quebra de linha sem abrir tela. */
import { larguraHelvetica } from '../planilha/impressaoPdf.js';

/* larguras AFM (milésimos do tamanho), caracteres 32 a 126 */
const TR = [250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 278, 278, 564, 564, 564, 444, 921, 722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722, 556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611, 333, 278, 333, 469, 500, 333, 444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500, 500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444, 480, 200, 480, 541];
const TB = [250, 333, 555, 500, 500, 1000, 833, 278, 333, 333, 500, 570, 250, 333, 250, 278, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 333, 333, 570, 570, 570, 500, 930, 722, 667, 722, 722, 667, 611, 778, 778, 389, 500, 778, 667, 944, 722, 778, 611, 778, 722, 556, 667, 722, 722, 1000, 722, 722, 667, 333, 278, 333, 581, 500, 333, 500, 556, 444, 556, 444, 333, 500, 556, 278, 333, 556, 278, 833, 556, 500, 556, 500, 444, 389, 333, 556, 500, 722, 500, 500, 444, 394, 220, 394, 520];
const TI = [250, 333, 420, 500, 500, 833, 778, 214, 333, 333, 500, 675, 250, 333, 250, 278, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 333, 333, 675, 675, 675, 500, 920, 611, 611, 667, 722, 611, 611, 722, 722, 333, 444, 667, 556, 833, 667, 722, 611, 722, 611, 500, 556, 722, 611, 833, 611, 556, 556, 389, 278, 389, 422, 500, 333, 500, 500, 444, 500, 444, 278, 500, 500, 278, 278, 444, 278, 722, 500, 500, 500, 500, 389, 389, 278, 500, 444, 667, 444, 444, 389, 400, 275, 400, 541];
const TBI = [250, 389, 555, 500, 500, 833, 778, 278, 333, 333, 500, 570, 250, 333, 250, 278, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 333, 333, 570, 570, 570, 500, 832, 667, 667, 667, 722, 667, 667, 722, 778, 389, 500, 667, 611, 889, 722, 722, 611, 722, 667, 556, 611, 722, 611, 833, 611, 556, 556, 333, 278, 333, 570, 500, 333, 500, 500, 444, 500, 444, 333, 444, 500, 278, 278, 444, 278, 722, 500, 500, 500, 500, 389, 389, 278, 500, 444, 667, 500, 444, 389, 348, 220, 348, 570];

/* a fonte escolhida no documento vira uma das fontes que todo PDF já tem */
export const FAMILIA = {
  Calibri: 'helv', Arial: 'helv', Verdana: 'helv',
  'Times New Roman': 'times', Georgia: 'times',
  'Courier New': 'cour',
};
export const familiaDe = (f) => FAMILIA[f] || 'helv';
/* nomes para o PDF; o gerador já traz as 4 Helvetica e recebe as outras pela mesma lista */
export const FONTE_PDF = {
  helv: ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique'],
  times: ['Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic'],
  cour: ['Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique'],
};

function larguraTabela(tab, t, pt) {
  let w = 0;
  for (const ch of String(t).normalize('NFD')) {
    const c = ch.charCodeAt(0);
    if (c >= 0x300 && c <= 0x36f) continue; /* o acento vai junto da letra */
    w += c >= 32 && c <= 126 ? tab[c - 32] : 500;
  }
  return (w * pt) / 1000;
}

/** Largura do texto em pontos. fam: helv | times | cour */
export function largura(t, pt, { n = 0, i = 0, fam = 'helv' } = {}) {
  if (fam === 'cour') return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').length * 0.6 * pt;
  if (fam === 'times') return larguraTabela(n && i ? TBI : n ? TB : i ? TI : TR, t, pt);
  return larguraHelvetica(t, pt, !!n);
}

export const TS_PADRAO = 11;
export const FONTE_PADRAO = 'Calibri';
/** Altura de uma linha: o Word usa cerca de 1,2 × o tamanho da letra, vezes o espaçamento. */
export const alturaLinha = (ts = TS_PADRAO, esp = 1.15) => ts * 1.2 * esp;

/** Parte os trechos do bloco em pedaços de uma letra só, com a formatação de cada um (para quebrar linhas). */
function letras(tr, tsBloco, fonteBloco) {
  const saida = [];
  for (const t of tr || []) {
    const ts = t.ts || tsBloco, fam = familiaDe(t.f || fonteBloco);
    for (const ch of t.x) saida.push({ ch, ts, fam, n: t.n ? 1 : 0, i: t.i ? 1 : 0, s: t.s ? 1 : 0, c: t.c || null, r: t.r || null, cp: t.cp || null, cm: t.cm || null });
  }
  return saida;
}

/** Junta letras vizinhas de formato igual em pedaços de texto (para desenhar menos). */
function juntar(letrasLinha) {
  const saida = [];
  for (const L of letrasLinha) {
    const u = saida[saida.length - 1];
    const igual = u && u.ts === L.ts && u.fam === L.fam && u.n === L.n && u.i === L.i && u.s === L.s && u.c === L.c && u.r === L.r && u.cp === L.cp;
    if (igual) u.x += L.ch; else saida.push({ x: L.ch, ts: L.ts, fam: L.fam, n: L.n, i: L.i, s: L.s, c: L.c, r: L.r, cp: L.cp });
  }
  return saida;
}

/**
 * Quebra o texto do bloco em linhas que caibam na largura (em pontos).
 * Corta nos espaços; palavra que não cabe sozinha é cortada no meio (como o Word faz com link comprido).
 * Devolve [{ pedacos: [{x, ts, fam, n, i, s, c, r, cp}], w, ts }]
 */
export function quebrarEmLinhas(tr, larguraMax, { ts = TS_PADRAO, fonte = FONTE_PADRAO } = {}) {
  const Ls = letras(tr, ts, fonte);
  if (!Ls.length) return [{ pedacos: [], w: 0, ts }];
  const linhas = [];
  let atual = [], w = 0, ultimoEspaco = -1, wNoEspaco = 0;
  const fechar = (ate = atual.length) => {
    const corte = atual.slice(0, ate);
    linhas.push({ pedacos: juntar(corte), w: corte.reduce((s, L) => s + largura(L.ch, L.ts, L), 0), ts: Math.max(ts, ...corte.map((L) => L.ts), 0) });
    atual = atual.slice(ate);
    w = atual.reduce((s, L) => s + largura(L.ch, L.ts, L), 0);
    ultimoEspaco = -1;
    for (let k = 0; k < atual.length; k++) if (atual[k].ch === ' ') { ultimoEspaco = k; wNoEspaco = atual.slice(0, k).reduce((s, L) => s + largura(L.ch, L.ts, L), 0); }
  };
  for (const L of Ls) {
    const lw = largura(L.ch, L.ts, L);
    if (L.ch === '\n') { atual.push(L); fechar(); continue; }
    if (w + lw > larguraMax && atual.length) {
      if (ultimoEspaco >= 0) { const ate = ultimoEspaco + 1; const wsalvo = wNoEspaco; fechar(ate); linhas[linhas.length - 1].w = wsalvo; }
      else fechar();
    }
    atual.push(L);
    if (L.ch === ' ') { ultimoEspaco = atual.length - 1; wNoEspaco = w; }
    w += lw;
  }
  if (atual.length || !linhas.length) fechar();
  /* a linha fechada no \n não mostra o \n */
  for (const l of linhas) for (const p of l.pedacos) p.x = p.x.replace(/\n/g, '');
  return linhas;
}

/** Altura que um bloco de texto vai ocupar (em pontos), já com as linhas quebradas. */
export function alturaDeLinhas(linhas, esp = 1.15, antes = 0, depois = 0) {
  return antes + depois + linhas.reduce((s, l) => s + alturaLinha(l.ts, esp), 0);
}
