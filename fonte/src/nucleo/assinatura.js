/* EFCdocs — Assinatura (v0.4.5): regras puras, sem tela, usadas pelo quadro, pela planilha e (v0.7.0) pelo Docx.
   Uma assinatura é: uma linha em branco, o nome completo embaixo e, se a pessoa quiser, a rubrica (imagem PNG com fundo
   transparente) por cima da linha. A rubrica nasce de um desenho (mouse, dedo ou caneta) ou de uma foto do papel.
   A imagem fica só dentro do arquivo, no aparelho: não há "rubrica salva" à parte nem envio para fora. */

export const ASN = {
  W: 280, H: 96, W_MIN: 140, H_MIN: 64, // tamanho do bloco a 100%
  FAIXA_NOME: 26, // altura da faixa do nome, embaixo da linha
  NOME_MAX: 120,
  RUB_W: 600, RUB_H: 200, // maior rubrica guardada (px)
  RUB_BYTES: 150000, // limite do texto da imagem guardada
  TINTAS: [['preto', '#1f2328', 'Preto'], ['azul', '#1d3a8a', 'Azul']],
};
export const TINTA_PADRAO = '#1d3a8a';

/* ---------- nome ---------- */
export const limparNome = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, ASN.NOME_MAX);

/** '' = pode usar; senão a frase que explica. Nome vazio impede; nome de uma palavra só avisa (ver nomeIncompleto). */
export function avisoNome(t) {
  const n = limparNome(t);
  if (!n) return 'Escreva o nome completo que vai embaixo da linha.';
  return '';
}
export function nomeIncompleto(t) {
  const n = limparNome(t);
  if (!n) return false;
  /* "de", "da", "dos"... ligam nomes mas não são um nome */
  const palavras = n.split(' ').filter((p) => p.replace(/[^\p{L}]/gu, '').length >= 2 && !/^(d[aeo]s?|e)$/i.test(p));
  return palavras.length < 2;
}

/* ---------- rubrica guardada ---------- */
const RE_PNG = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/;
/** Só aceita PNG em texto (data URL) e de tamanho razoável: nunca um endereço de fora. */
export const rubricaValida = (s) => typeof s === 'string' && s.length > 40 && s.length <= ASN.RUB_BYTES && RE_PNG.test(s);

/** Campos da assinatura de um item/objeto, já limpos. */
export function limparAssinatura(x) {
  const nome = limparNome(x && (x.nome ?? x.texto));
  const out = { nome };
  if (x && rubricaValida(x.rub)) out.rub = x.rub;
  return out;
}

/* ---------- medidas do bloco (iguais na tela e no PNG/PDF) ---------- */
/** Tamanho da letra do nome: cabe na largura, entre 9 e 14 px. */
export function fonteDoNome(nome, largura) {
  const n = Math.max(1, limparNome(nome).length);
  return Math.max(9, Math.min(14, Math.floor(largura / (n * 0.56))));
}

export function medidas(w, h, nome = '') {
  const faixa = Math.min(ASN.FAIXA_NOME, Math.max(20, Math.round(h * 0.3)));
  const linhaY = Math.round(h - faixa);
  const fonte = fonteDoNome(nome, w - 12);
  return { w, h, faixa, linhaY, fonte, nomeY: linhaY + Math.round(faixa / 2) + 1, caixaRub: { x: 8, y: 2, w: Math.max(10, w - 16), h: Math.max(10, linhaY - 2 + 3) } };
}

/** Onde a rubrica (rw x rh) fica dentro da caixa: cabe inteira, centrada na horizontal e apoiada na linha. */
export function encaixarRubrica(rw, rh, caixa) {
  if (!(rw > 0) || !(rh > 0)) return null;
  const e = Math.min(caixa.w / rw, caixa.h / rh);
  const w = rw * e, h = rh * e;
  return { x: caixa.x + (caixa.w - w) / 2, y: caixa.y + caixa.h - h, w, h };
}

/* ---------- desenho com mouse, dedo ou caneta ---------- */
/** Tira pontos quase repetidos (menos de dmin px do anterior); mantém o último. */
export function simplificar(pontos, dmin = 1.2) {
  if (!pontos || pontos.length < 3) return pontos ? pontos.slice() : [];
  const out = [pontos[0]];
  for (let i = 1; i < pontos.length - 1; i++) {
    const a = out[out.length - 1], b = pontos[i];
    if (Math.hypot(b.x - a.x, b.y - a.y) >= dmin) out.push(b);
  }
  out.push(pontos[pontos.length - 1]);
  return out;
}

/** Caminho suave (curvas passando pelos pontos médios): [{ op:'P'|'M'|'L'|'Q', x, y, cx?, cy? }]. */
export function caminhoSuave(pontos) {
  const p = pontos || [];
  if (!p.length) return [];
  if (p.length === 1) return [{ op: 'P', x: p[0].x, y: p[0].y }];
  if (p.length === 2) return [{ op: 'M', x: p[0].x, y: p[0].y }, { op: 'L', x: p[1].x, y: p[1].y }];
  const ops = [{ op: 'M', x: p[0].x, y: p[0].y }];
  for (let i = 1; i < p.length - 1; i++) {
    const mx = (p[i].x + p[i + 1].x) / 2, my = (p[i].y + p[i + 1].y) / 2;
    ops.push({ op: 'Q', cx: p[i].x, cy: p[i].y, x: mx, y: my });
  }
  const u = p[p.length - 1];
  ops.push({ op: 'L', x: u.x, y: u.y });
  return ops;
}

/** Caixa que envolve todos os traços (com a metade da espessura de folga); null se não há traço. */
export function limitesTracos(tracos, espessura = 3) {
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const t of tracos || []) for (const q of t.pontos || []) {
    if (q.x < x1) x1 = q.x; if (q.y < y1) y1 = q.y; if (q.x > x2) x2 = q.x; if (q.y > y2) y2 = q.y;
  }
  if (!Number.isFinite(x1)) return null;
  const f = espessura / 2 + 1;
  return { x: x1 - f, y: y1 - f, w: Math.max(2, x2 - x1 + f * 2), h: Math.max(2, y2 - y1 + f * 2) };
}

/** Fator para o desenho caber em RUB_W x RUB_H (no máximo 2x, para o traço não ficar pixelado). */
export function fatorDaRubrica(lim) {
  if (!lim) return 1;
  return Math.max(0.1, Math.min(2, ASN.RUB_W / lim.w, ASN.RUB_H / lim.h));
}

/* ---------- foto do papel → rubrica com fundo transparente ---------- */
/** Escuridão de cada pixel em relação ao papel em volta (0 = igual ao papel, 1 = preto). Compensa sombra e luz desigual. */
export function escuridaoLocal(rgba, w, h) {
  const n = w * h;
  const lum = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) lum[i] = 0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2];
  /* papel em volta = média numa janela grande (imagem integral) */
  const W1 = w + 1;
  const integ = new Float64Array(W1 * (h + 1));
  for (let y = 0; y < h; y++) {
    let linha = 0;
    for (let x = 0; x < w; x++) {
      linha += lum[y * w + x];
      integ[(y + 1) * W1 + x + 1] = integ[y * W1 + x + 1] + linha;
    }
  }
  const R = Math.max(6, Math.round(Math.max(w, h) / 10));
  const esc = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - R), y1 = Math.min(h, y + R + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - R), x1 = Math.min(w, x + R + 1);
      const soma = integ[y1 * W1 + x1] - integ[y0 * W1 + x1] - integ[y1 * W1 + x0] + integ[y0 * W1 + x0];
      const papel = Math.max(40, soma / ((x1 - x0) * (y1 - y0)));
      const v = 1 - lum[y * w + x] / papel;
      esc[y * w + x] = v < 0 ? 0 : v > 1 ? 1 : v;
    }
  }
  return esc;
}

export const CORTE_MIN = 0.08, CORTE_MAX = 0.5;
/** Corte automático (Otsu) entre papel e tinta, limitado a uma faixa segura. */
export function corteAutomatico(esc) {
  const B = 64;
  const hist = new Float64Array(B);
  for (let i = 0; i < esc.length; i++) hist[Math.min(B - 1, Math.floor(esc[i] * B))]++;
  const total = esc.length;
  let somaTudo = 0;
  for (let b = 0; b < B; b++) somaTudo += b * hist[b];
  let somaF = 0, pesoF = 0, melhor = -1, corte = 0.2;
  for (let b = 0; b < B - 1; b++) {
    pesoF += hist[b];
    if (!pesoF) continue;
    const pesoT = total - pesoF;
    if (!pesoT) break;
    somaF += b * hist[b];
    const mF = somaF / pesoF, mT = (somaTudo - somaF) / pesoT;
    const v = pesoF * pesoT * (mF - mT) * (mF - mT);
    if (v > melhor) { melhor = v; corte = (b + 1) / B; }
  }
  return Math.max(CORTE_MIN + 0.04, Math.min(CORTE_MAX - 0.08, corte));
}

/** Controle 0 a 100 (mais traço → maior número) ⇄ corte. */
export const corteDoControle = (v) => CORTE_MAX - (CORTE_MAX - CORTE_MIN) * (Math.max(0, Math.min(100, v)) / 100);
export const controleDoCorte = (c) => Math.round(((CORTE_MAX - Math.max(CORTE_MIN, Math.min(CORTE_MAX, c))) / (CORTE_MAX - CORTE_MIN)) * 100);

/** Transparência de cada pixel: 0 = papel, 255 = tinta, com borda macia. */
export function mascaraDeTinta(esc, corte, suave = 0.12) {
  const a = new Uint8Array(esc.length);
  for (let i = 0; i < esc.length; i++) {
    const t = (esc[i] - corte) / suave;
    a[i] = t <= 0 ? 0 : t >= 1 ? 255 : Math.round(t * 255);
  }
  return a;
}

/** Tira manchinhas soltas (poeira, grão do papel): grupos de pixels com menos de minArea. */
export function tirarPontinhos(alfa, w, h, minArea = 14) {
  const visto = new Uint8Array(alfa.length);
  const pilha = [];
  for (let s = 0; s < alfa.length; s++) {
    if (!alfa[s] || visto[s]) continue;
    const grupo = [];
    pilha.push(s); visto[s] = 1;
    while (pilha.length) {
      const p = pilha.pop();
      grupo.push(p);
      const x = p % w, y = (p - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w || (!dx && !dy)) continue;
          const q = yy * w + xx;
          if (alfa[q] && !visto[q]) { visto[q] = 1; pilha.push(q); }
        }
      }
    }
    if (grupo.length < minArea) for (const p of grupo) alfa[p] = 0;
  }
  return alfa;
}

/** Corta a imagem na caixa onde há tinta (com margem). null se não há tinta. */
export function recortarTinta(alfa, w, h, margem = 3, limiar = 40) {
  let x1 = w, y1 = h, x2 = -1, y2 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (alfa[y * w + x] >= limiar) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
  }
  if (x2 < 0) return null;
  x1 = Math.max(0, x1 - margem); y1 = Math.max(0, y1 - margem); x2 = Math.min(w - 1, x2 + margem); y2 = Math.min(h - 1, y2 + margem);
  const nw = x2 - x1 + 1, nh = y2 - y1 + 1;
  const out = new Uint8Array(nw * nh);
  for (let y = 0; y < nh; y++) out.set(alfa.subarray((y1 + y) * w + x1, (y1 + y) * w + x1 + nw), y * nw);
  return { alfa: out, w: nw, h: nh };
}

/** Diminui (média de área) até caber em maxW x maxH; não aumenta. */
export function reduzirAlfa(alfa, w, h, maxW = ASN.RUB_W, maxH = ASN.RUB_H) {
  const e = Math.min(1, maxW / w, maxH / h);
  if (e >= 1) return { alfa, w, h };
  const nw = Math.max(1, Math.round(w * e)), nh = Math.max(1, Math.round(h * e));
  const out = new Uint8Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    const ya = Math.floor((y * h) / nh), yb = Math.max(ya + 1, Math.floor(((y + 1) * h) / nh));
    for (let x = 0; x < nw; x++) {
      const xa = Math.floor((x * w) / nw), xb = Math.max(xa + 1, Math.floor(((x + 1) * w) / nw));
      let s = 0, k = 0;
      for (let yy = ya; yy < yb; yy++) for (let xx = xa; xx < xb; xx++) { s += alfa[yy * w + xx]; k++; }
      out[y * nw + x] = Math.round(s / k);
    }
  }
  return { alfa: out, w: nw, h: nh };
}

export function hexParaRgb(hex) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [29, 58, 138];
}

/** Junta a transparência com a cor da tinta: imagem RGBA pronta para virar PNG. */
export function alfaParaRgba(alfa, tinta) {
  const [r, g, b] = Array.isArray(tinta) ? tinta : hexParaRgb(tinta);
  const out = new Uint8ClampedArray(alfa.length * 4);
  for (let i = 0, j = 0; i < alfa.length; i++, j += 4) { out[j] = r; out[j + 1] = g; out[j + 2] = b; out[j + 3] = alfa[i]; }
  return out;
}

/**
 * Foto do papel → rubrica. Devolve { rgba, w, h, corte } ou null se não achou tinta.
 * esc: escuridão já calculada (escuridaoLocal), para a tela refazer rápido ao mexer no controle.
 */
export function rubricaDaFoto(esc, w, h, { corte = null, tinta = TINTA_PADRAO } = {}) {
  const c = corte == null ? corteAutomatico(esc) : Math.max(CORTE_MIN, Math.min(CORTE_MAX, corte));
  const alfa = tirarPontinhos(mascaraDeTinta(esc, c), w, h, Math.max(10, Math.round((w * h) / 60000)));
  const rec = recortarTinta(alfa, w, h);
  if (!rec) return null;
  const red = reduzirAlfa(rec.alfa, rec.w, rec.h);
  return { rgba: alfaParaRgba(red.alfa, tinta), w: red.w, h: red.h, corte: c };
}
