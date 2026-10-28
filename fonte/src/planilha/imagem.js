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

/** Devolve { src, w, h, nome }: w e h são o tamanho original (para a proporção). */
export async function lerImagem(file) {
  if (!file || !TIPOS.includes(file.type)) throw new Error('Use uma imagem PNG, JPG, WebP ou GIF.');
  if (file.size > MAX_ORIGINAL) throw new Error('A imagem é grande demais (até 25 MB).');
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
      if (src.startsWith('data:' + tipo) && src.length <= IMG.MAX_CHARS) return { src, w: w0, h: h0, nome };
    }
    k *= 0.8;
  }
  throw new Error('Não consegui deixar a imagem pequena o bastante. Tente uma menor.');
}
