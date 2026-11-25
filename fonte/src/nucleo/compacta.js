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

/* v0.6.45 (D-70): linhas/colunas escondidas da planilha (aba.ocL, ocC, ocF) com milhares de chaves (escondidas até o fim)
   vão guardadas como faixas ("130-1048575") e voltam inteiras ao abrir. Antes, cada salvamento automático levava 14 MB. */
const MAPAS_OC = ['ocL', 'ocC', 'ocF'];
const FAIXAS = '~faixas';
export function emFaixas(mapa) {
  const ks = Object.keys(mapa).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && mapa[n]);
  for (let i = 1; i < ks.length; i++) if (ks[i] <= ks[i - 1]) { ks.sort((x, y) => x - y); break; }
  const out = []; let a = null, b = null;
  for (const n of ks) { if (a != null && n === b + 1) b = n; else { if (a != null) out.push(a === b ? String(a) : `${a}-${b}`); a = b = n; } }
  if (a != null) out.push(a === b ? String(a) : `${a}-${b}`);
  return { [FAIXAS]: out.join(',') };
}
export function deFaixas(v) {
  const m = {};
  for (const k of Object.keys(v)) if (k !== FAIXAS && v[k]) m[k] = v[k]; /* chave solta (gravada por uma versão antiga em cima das faixas) fica */
  for (const p of String(v[FAIXAS] || '').split(',')) { if (!p) continue; const [a, b] = p.split('-').map(Number); for (let n = a; n <= (b ?? a); n++) m[n] = 1; }
  return m;
}
const JA = new WeakMap(); /* o mesmo mapa (sem mudar) não é refeito a cada salvamento */
const grandeMapa = (m) => { let n = 0; for (const k in m) if (++n > 2000) return true; return false; };
function paraGuardar(valor) {
  if (!valor || typeof valor !== 'object' || !valor.abas || typeof valor.abas !== 'object') return valor;
  let abas = null;
  for (const [id, aba] of Object.entries(valor.abas)) {
    if (!aba || typeof aba !== 'object') continue;
    let nova = null;
    for (const k of MAPAS_OC) { const m = aba[k]; if (m && typeof m === 'object' && !m[FAIXAS] && grandeMapa(m)) { nova = nova || { ...aba }; let f = JA.get(m); if (!f) { f = emFaixas(m); JA.set(m, f); } nova[k] = f; } }
    if (nova) { abas = abas || { ...valor.abas }; abas[id] = nova; }
  }
  return abas ? { ...valor, abas } : valor;
}
function deGuardado(valor) {
  if (!valor || typeof valor !== 'object' || !valor.abas || typeof valor.abas !== 'object') return valor;
  for (const aba of Object.values(valor.abas)) if (aba && typeof aba === 'object') for (const k of MAPAS_OC) if (aba[k] && aba[k][FAIXAS] != null) aba[k] = deFaixas(aba[k]);
  return valor;
}

export const temCompactador = () =>
  typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';

export async function compactar(valor, { forcarSem = false } = {}) {
  const json = JSON.stringify(paraGuardar(valor));
  const bytes = new TextEncoder().encode(json);
  const emTexto = { fmt: 'json', dados: json, bytesOriginal: bytes.length, bytesFinal: bytes.length };
  if (forcarSem || !temCompactador()) return emTexto;
  const gz = await passar(bytes, new CompressionStream('gzip'));
  if (gz.length >= bytes.length) return emTexto;
  return { fmt: 'gzip', dados: paraBase64(gz), bytesOriginal: bytes.length, bytesFinal: gz.length };
}

export async function descompactar(pacote) {
  if (!pacote) return null;
  if (pacote.fmt === 'json') return deGuardado(JSON.parse(pacote.dados));
  if (pacote.fmt !== 'gzip') throw new Error('formato desconhecido: ' + pacote.fmt);
  const bytes = await passar(deBase64(pacote.dados), new DecompressionStream('gzip'));
  return deGuardado(JSON.parse(new TextDecoder().decode(bytes)));
}

export function tamanhoLegivel(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1).replace('.', ',') + ' KB';
  return (bytes / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
}
