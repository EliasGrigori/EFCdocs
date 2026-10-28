/* EFCdocs — Planilha (v0.6.3): lê uma foto ou desenho do aparelho e guarda pequeno o bastante para ir dentro do arquivo.
   Só no navegador (usa canvas). A imagem fica dentro da planilha: nada vai para fora do aparelho. */
import { IMG } from './objetos.js';

const TIPOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_ORIGINAL = 25 * 1024 * 1024;
const LADO_MAX = 1600;

const carregar = (file) => new Promise((ok, erro) => {
  const url = URL.createObjectURL(file);
  const im = new Image();
  im.onload = () => { URL.revokeObjectURL(url); ok(im); };
  im.onerror = () => { URL.revokeObjectURL(url); erro(new Error('Não consegui abrir essa imagem.')); };
  im.src = url;
});

/** GIF com mais de um quadro (animado)? Conta os blocos de controle de quadro (0x21 0xF9). */
export function gifAnimado(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b.length < 14 || b[0] !== 0x47 || b[1] !== 0x49 || b[2] !== 0x46) return false;
  let n = 0;
  for (let i = 13; i < b.length - 1; i++) if (b[i] === 0x21 && b[i + 1] === 0xf9) { n++; if (n > 1) return true; }
  return false;
}
/** Devolve { src, w, h, nome, animada }: w e h são o tamanho original (para a proporção). */
export async function lerImagem(file) {
  if (!file || !TIPOS.includes(file.type)) throw new Error('Use uma imagem PNG, JPG, WebP ou GIF.');
  if (file.size > MAX_ORIGINAL) throw new Error('A imagem é grande demais (até 25 MB).');
  let animada = false;
  if (file.type === 'image/gif' && file.arrayBuffer) { try { animada = gifAnimado(new Uint8Array(await file.arrayBuffer())); } catch { animada = false; } }
  const im = await carregar(file);
  const w0 = im.naturalWidth, h0 = im.naturalHeight;
  if (!w0 || !h0) throw new Error('Não consegui abrir essa imagem.');
  let k = Math.min(1, LADO_MAX / Math.max(w0, h0));
  const cv = document.createElement('canvas');
  const nome = String(file.name || '').replace(/\.[^.]+$/, '').slice(0, 80);
  /* tenta PNG (guarda transparência) quando a imagem já era PNG/GIF/WebP; se não couber, WebP e depois JPEG, sempre menores */
  for (let volta = 0; volta < 12; volta++) {
    cv.width = Math.max(1, Math.round(w0 * k)); cv.height = Math.max(1, Math.round(h0 * k));
    const x = cv.getContext('2d');
    x.clearRect(0, 0, cv.width, cv.height);
    x.drawImage(im, 0, 0, cv.width, cv.height);
    const tentativas = file.type === 'image/jpeg' ? [['image/jpeg', 0.86], ['image/jpeg', 0.7]] : [['image/png'], ['image/webp', 0.85], ['image/jpeg', 0.75]];
    for (const [tipo, q] of tentativas) {
      let src = '';
      try { src = cv.toDataURL(tipo, q); } catch { src = ''; }
      if (src.startsWith('data:' + tipo) && src.length <= IMG.MAX_CHARS) return { src, w: w0, h: h0, nome, animada };
    }
    k *= 0.8;
  }
  throw new Error('Não consegui deixar a imagem pequena o bastante. Tente uma menor.');
}
