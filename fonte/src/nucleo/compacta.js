/* EFCdocs — compactação do conteúdo com o compactador do próprio navegador (gzip).
   Arquivo minúsculo, que ficaria maior compactado, fica em texto. */

function paraBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768));
  return btoa(s);
}

function deBase64(texto) {
  const s = atob(texto);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function passar(bytes, transformador) {
  const resp = new Response(new Blob([bytes]).stream().pipeThrough(transformador));
  return new Uint8Array(await resp.arrayBuffer());
}

export const temCompactador = () =>
  typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

export async function compactar(valor, { forcarSem = false } = {}) {
  const json = JSON.stringify(valor);
  const bytes = new TextEncoder().encode(json);
  const emTexto = { fmt: 'json', dados: json, bytesOriginal: bytes.length, bytesFinal: bytes.length };
  if (forcarSem || !temCompactador()) return emTexto;
  const gz = await passar(bytes, new CompressionStream('gzip'));
  if (gz.length >= bytes.length) return emTexto;
  return { fmt: 'gzip', dados: paraBase64(gz), bytesOriginal: bytes.length, bytesFinal: gz.length };
}

export async function descompactar(pacote) {
  if (!pacote) return null;
  if (pacote.fmt === 'json') return JSON.parse(pacote.dados);
  if (pacote.fmt !== 'gzip') throw new Error('formato desconhecido: ' + pacote.fmt);
  const bytes = await passar(deBase64(pacote.dados), new DecompressionStream('gzip'));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function tamanhoLegivel(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1).replace('.', ',') + ' KB';
  return (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}
