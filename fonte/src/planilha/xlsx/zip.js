/* EFCdocs — ZIP (o .xlsx é um ZIP de arquivos XML) com o compactador do próprio navegador.
   Sem biblioteca de fora: DecompressionStream / CompressionStream('deflate-raw').
   Ler: só o índice no fim do arquivo é lido de uma vez; cada parte é aberta quando for pedida (e pode vir aos pedaços). */

const U16 = (b, i) => b[i] | (b[i + 1] << 8);
const U32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const U64 = (b, i) => U32(b, i) + U32(b, i + 4) * 4294967296;

export class ErroZip extends Error {}

/** Abre o ZIP: devolve as partes por nome (sem descompactar nada ainda). */
export function lerZip(bytes) {
  if (!(bytes instanceof Uint8Array)) bytes = new Uint8Array(bytes);
  let fim = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) { fim = i; break; }
  }
  if (fim < 0) throw new ErroZip('Não é um arquivo do Excel (.xlsx): o arquivo não abre como pacote.');
  let total = U16(bytes, fim + 10);
  let ini = U32(bytes, fim + 16);
  /* ZIP64 (arquivos muito grandes) */
  if (ini === 0xffffffff || total === 0xffff) {
    const loc = fim - 20;
    if (loc >= 0 && U32(bytes, loc) === 0x07064b50) {
      const z = U64(bytes, loc + 8);
      if (U32(bytes, z) === 0x06064b50) { total = U64(bytes, z + 32); ini = U64(bytes, z + 48); }
    }
  }
  const partes = new Map();
  const dec = new TextDecoder();
  let p = ini;
  for (let n = 0; n < total; n++) {
    if (U32(bytes, p) !== 0x02014b50) throw new ErroZip('O índice do pacote está quebrado.');
    const metodo = U16(bytes, p + 10);
    let cTam = U32(bytes, p + 20), uTam = U32(bytes, p + 24);
    const nLen = U16(bytes, p + 28), xLen = U16(bytes, p + 30), cLen = U16(bytes, p + 32);
    let local = U32(bytes, p + 42);
    const nome = dec.decode(bytes.subarray(p + 46, p + 46 + nLen));
    /* campo extra do ZIP64 */
    let x = p + 46 + nLen;
    const xFim = x + xLen;
    while (x + 4 <= xFim) {
      const id = U16(bytes, x), tam = U16(bytes, x + 2);
      if (id === 1) {
        let q = x + 4;
        if (uTam === 0xffffffff) { uTam = U64(bytes, q); q += 8; }
        if (cTam === 0xffffffff) { cTam = U64(bytes, q); q += 8; }
        if (local === 0xffffffff) { local = U64(bytes, q); q += 8; }
      }
      x += 4 + tam;
    }
    partes.set(nome, { nome, metodo, cTam, uTam, local });
    p += 46 + nLen + xLen + cLen;
  }
  const dados = (pt) => {
    if (U32(bytes, pt.local) !== 0x04034b50) throw new ErroZip('Parte quebrada no pacote: ' + pt.nome);
    const ini2 = pt.local + 30 + U16(bytes, pt.local + 26) + U16(bytes, pt.local + 28);
    return bytes.subarray(ini2, ini2 + pt.cTam);
  };
  const achar = (nome) => partes.get(nome) || partes.get(nome.replace(/^\//, '')) || [...partes.values()].find((x) => x.nome.toLowerCase() === nome.replace(/^\//, '').toLowerCase());
  const zip = {
    nomes: [...partes.keys()],
    tem: (nome) => !!achar(nome),
    tamanho: (nome) => { const pt = achar(nome); return pt ? pt.uTam : 0; },
    /** Fluxo de bytes já descompactados (para as partes grandes). */
    fluxo(nome) {
      const pt = achar(nome);
      if (!pt) return null;
      const s = new Blob([dados(pt)]).stream();
      if (pt.metodo === 0) return s;
      if (pt.metodo !== 8) throw new ErroZip('Compactação que o EFCdocs não conhece em ' + nome);
      return s.pipeThrough(new DecompressionStream('deflate-raw'));
    },
    async bytes(nome) {
      const f = zip.fluxo(nome);
      return f ? new Uint8Array(await new Response(f).arrayBuffer()) : null;
    },
    async texto(nome) {
      const b = await zip.bytes(nome);
      return b ? new TextDecoder().decode(b) : null;
    },
    /** Lê o texto aos pedaços: cb(pedaço) para cada parte; devolve quando acabar. */
    async pedacos(nome, cb) {
      const f = zip.fluxo(nome);
      if (!f) return false;
      const leitor = f.pipeThrough(new TextDecoderStream()).getReader();
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        if (value) await cb(value);
      }
      return true;
    },
  };
  return zip;
}

/* ---------- gravar ---------- */
let TABELA_CRC = null;
export function crc32(b) {
  if (!TABELA_CRC) {
    TABELA_CRC = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; TABELA_CRC[n] = c >>> 0; }
  }
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TABELA_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function deflate(b) {
  const s = new Blob([b]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}

function dataDos(d) {
  const t = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const dt = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
  return [t, dt];
}

/** Monta o ZIP. arquivos = [{ nome, dados: Uint8Array | string }]. */
export async function criarZip(arquivos, agora = new Date()) {
  const enc = new TextEncoder();
  const [hora, data] = dataDos(agora);
  const blocos = [];
  const central = [];
  let pos = 0;
  for (const a of arquivos) {
    const cru = typeof a.dados === 'string' ? enc.encode(a.dados) : a.dados;
    const comp = await deflate(cru);
    const usar = comp.length < cru.length;
    const corpo = usar ? comp : cru;
    const nome = enc.encode(a.nome);
    const crc = crc32(cru);
    const h = new Uint8Array(30 + nome.length);
    const v = new DataView(h.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, usar ? 8 : 0, true);
    v.setUint16(10, hora, true); v.setUint16(12, data, true); v.setUint32(14, crc, true);
    v.setUint32(18, corpo.length, true); v.setUint32(22, cru.length, true); v.setUint16(26, nome.length, true); v.setUint16(28, 0, true);
    h.set(nome, 30);
    blocos.push(h, corpo);
    const c = new Uint8Array(46 + nome.length);
    const w = new DataView(c.buffer);
    w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true); w.setUint16(10, usar ? 8 : 0, true);
    w.setUint16(12, hora, true); w.setUint16(14, data, true); w.setUint32(16, crc, true);
    w.setUint32(20, corpo.length, true); w.setUint32(24, cru.length, true); w.setUint16(28, nome.length, true);
    w.setUint32(42, pos, true);
    c.set(nome, 46);
    central.push(c);
    pos += h.length + corpo.length;
  }
  const tamCentral = central.reduce((s, c) => s + c.length, 0);
  const fim = new Uint8Array(22);
  const f = new DataView(fim.buffer);
  f.setUint32(0, 0x06054b50, true); f.setUint16(8, arquivos.length, true); f.setUint16(10, arquivos.length, true);
  f.setUint32(12, tamCentral, true); f.setUint32(16, pos, true);
  const tudo = new Uint8Array(pos + tamCentral + 22);
  let o = 0;
  for (const b of [...blocos, ...central, fim]) { tudo.set(b, o); o += b.length; }
  return tudo;
}
