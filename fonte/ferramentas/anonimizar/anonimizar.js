/* EFCdocs — anonimizador de planilhas (.xlsx/.xlsm).
   Troca TODOS os dados (textos, números, datas, textos dentro de fórmulas, comentários, imagens, autor, impressora, links)
   por dados inventados e mantém a ESTRUTURA (mesclas, estilos, bordas, larguras, congelamento, tabelas, validações, formatação condicional, fórmulas).
   Roda no navegador (e no Node, para os testes). Nada é enviado para fora: tudo acontece na memória do aparelho.
   Uso: const { bytes, relatorio } = await anonimizar(bytesDoArquivo, { numeros: true }); */
import { lerZip, criarZip, crc32 } from '../../src/planilha/xlsx/zip.js';

/* ---------- sorteio com semente (a mesma entrada dá sempre a mesma saída, dentro de UMA execução) ---------- */
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function sorteador(semente) { let a = semente >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const VOG = 'aeiou', CON = 'bcdfgjlmnprstvz';
const semAcento = (ch) => ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const ehLetra = (ch) => /\p{L}/u.test(ch);

/* ---------- XML: entidades e escapes _xHHHH_ ---------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export const lerXmlTexto = (s) => s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e]));
const AVISO_TINTA = 'O arquivo tinha desenho feito à mão (tinta): os traços foram apagados.';
const AVISO_SUPLEMENTO = 'O arquivo usa suplementos do Office: as configurações guardadas por eles foram apagadas.';
const lerEscapesX = (s) => s.replace(/_x([0-9a-fA-F]{4})_/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
const escXml = (s, atributo) => { let r = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); if (atributo) r = r.replace(/"/g, '&quot;').replace(/\n/g, '&#10;').replace(/\r/g, '&#13;').replace(/\t/g, '&#9;'); return r; };
/* texto de célula: \r e controles viram _xHHHH_; um "_xHHHH_" de verdade ganha o escape do sublinhado */
const gravarTextoCelula = (s) => escXml(s.replace(/_(?=x[0-9a-fA-F]{4}_)/g, '_x005F_').replace(/[\u0000-\u0008\u000b-\u001f]/g, (c) => '_x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') + '_'));
/* nome de coluna de tabela (atributo): quebra de linha vira _x000a_, como o Excel grava */
const gravarNomeColuna = (s) => escXml(s.replace(/_(?=x[0-9a-fA-F]{4}_)/g, '_x005F_'), false).replace(/"/g, '&quot;').replace(/\r/g, '_x000d_').replace(/\n/g, '_x000a_').replace(/\t/g, '_x0009_');

export function criarAnonimizador(sal = Math.floor(Math.random() * 4294967296)) {
  const mapaTexto = new Map(), usados = new Set(), mapaNum = new Map();
  const cont = { textos: 0, numeros: 0, datas: 0, literais: 0 };
  const originais = new Set();
  const deslocDias = 300 + Math.floor(sorteador(sal ^ 0x9e3779b9)() * 500);

  /** Texto inventado com o MESMO formato: mesma quantidade de letras e dígitos, mesma pontuação, mesmas maiúsculas. */
  function texto(orig) {
    if (orig == null || orig === '') return orig;
    if (mapaTexto.has(orig)) return mapaTexto.get(orig);
    /* v0.6.10 (rede de segurança, D-21): o Excel guarda o título da célula com \r\n e o nome da coluna da tabela só com \n;
       os dois têm de virar o MESMO texto inventado, senão a tabela fica com nome de coluna diferente do título */
    if (orig.includes('\r')) {
      const so = orig.replace(/\r\n/g, '\n');
      if (so !== orig && !so.includes('\r')) { const novo = texto(so).replace(/\n/g, '\r\n'); mapaTexto.set(orig, novo); return novo; }
    }
    if (!/[\p{L}\d]/u.test(orig)) { mapaTexto.set(orig, orig); return orig; }
    let novo = orig;
    for (let tentativa = 0; tentativa < 50; tentativa++) {
      const rnd = sorteador(hash(orig) ^ sal ^ Math.imul(tentativa, 0x85ebca6b));
      let r = '', soZeros = true, emNumero = false;
      for (const ch of orig) {
        if (/\d/.test(ch)) {
          if (!emNumero) { emNumero = true; soZeros = true; }
          if (ch === '0' && soZeros) r += '0'; else { soZeros = false; r += String(Math.floor(rnd() * 10)); }
        } else {
          emNumero = false;
          if (ehLetra(ch)) {
            const base = semAcento(ch).toLowerCase();
            const pool = VOG.includes(base) ? VOG : /[a-z]/.test(base) ? CON : 'abcdefgijlmnoprstuvz';
            const n = pool[Math.floor(rnd() * pool.length)];
            r += ch !== ch.toLowerCase() && ch === ch.toUpperCase() ? n.toUpperCase() : n;
          } else r += ch;
        }
      }
      novo = r;
      if (novo !== orig && !usados.has(novo)) break;
      if ([...orig].filter((c) => /[\p{L}\d]/u.test(c)).length <= 1 && novo !== orig) break; // 1 letra só: repetir é inevitável
    }
    usados.add(novo); mapaTexto.set(orig, novo); cont.textos++;
    if (orig.length >= 4) originais.add(orig);
    return novo;
  }

  /** Número inventado: zero e um ficam; código comprido (5+ dígitos) troca os dígitos; os outros mudam de 30% para cima ou para baixo, com as mesmas casas. */
  function numero(bruto, ehData) {
    const x = Number(bruto);
    if (!Number.isFinite(x) || bruto.trim() === '') return bruto;
    if (ehData) {
      if (Math.abs(x) < 61) { // hora ou duração: muda até 30%, no mesmo passo (minuto ou segundo)
        if (x === 0) return bruto;
        const r0 = sorteador(hash('h' + bruto.trim()) ^ sal); let y = x * (0.7 + r0() * 0.6); if (Math.abs(x) < 1 && Math.abs(y) >= 1) y = x * 0.8;
        const passo = Math.abs(x * 1440 - Math.round(x * 1440)) < 1e-6 ? 1440 : 86400; y = Math.round(y * passo) / passo; if (y === x) y = x + 1 / passo * (x + 1 / passo < 1 || Math.abs(x) >= 1 ? 1 : -1);
        cont.datas++; return String(+y.toFixed(10));
      }
      const y = x - deslocDias; if (y < 61) return bruto; cont.datas++; return String(Number.isInteger(x) ? y : +y.toFixed(10));
    }
    if (x === 0 || x === 1) return bruto;
    const chave = bruto.trim();
    if (mapaNum.has(chave)) return mapaNum.get(chave);
    const rnd = sorteador(hash('n' + chave) ^ sal);
    let novo;
    if (/^-?\d{5,}$/.test(chave)) { novo = chave.replace(/\d/g, (d, i) => (i === (chave[0] === '-' ? 1 : 0) ? String(1 + Math.floor(rnd() * 9)) : String(Math.floor(rnd() * 10)))); } else {
      const fator = 0.7 + rnd() * 0.6;
      const casas = /[eE]/.test(chave) ? -1 : (chave.split('.')[1] || '').length;
      let y = x * fator;
      if (casas === 0) { y = Math.round(y); if (y === 0) y = x > 0 ? 1 : -1; if (y === x) y = x + (x > 0 ? 1 : -1); novo = String(y); } else if (casas > 0) { const cs = Math.min(casas, 12); let z = +y.toFixed(cs); if (z === x || z === 0) { const passo = 10 ** -cs; z = +(x + (x > 0 ? passo : -passo) * (1 + Math.floor(rnd() * 3))).toFixed(cs); } novo = String(z); } else novo = String(Number(y.toPrecision(12)));
    }
    if (Number(novo) === x) novo = String(Number((x * 1.13 + (Number.isInteger(x) ? 1 : 0)).toPrecision(10))); // garantia: nunca devolver o mesmo número
    mapaNum.set(chave, novo); cont.numeros++;
    return novo;
  }

  /* literal que é formato (dd/mm/aaaa, 0,00, hh:mm) ou só símbolo fica como está: trocar quebraria a fórmula */
  const literalFica = (s) => s === '' || !/[\p{L}\d]/u.test(s) || /^[dmyaDMYAhHsS0#?.,:/\\ \-%[\]$@*_;"'+()E]+$/.test(s);
  /** Fórmula: mantém a conta e os endereços; troca os textos entre aspas e os nomes de coluna de tabela ([Coluna]). */
  function formula(f) {
    let r = '', i = 0;
    while (i < f.length) {
      const ch = f[i];
      if (ch === '"') { // literal de texto
        let j = i + 1, s = '';
        for (; j < f.length; j++) { if (f[j] === '"') { if (f[j + 1] === '"') { s += '"'; j++; } else break; } else s += f[j]; }
        if (literalFica(s)) r += f.slice(i, j + 1); else { cont.literais++; r += '"' + texto(s).replace(/"/g, '""') + '"'; }
        i = j + 1;
      } else if (ch === "'") { // nome de aba entre apóstrofos: fica
        let j = i + 1; for (; j < f.length; j++) { if (f[j] === "'") { if (f[j + 1] === "'") j++; else break; } }
        r += f.slice(i, j + 1); i = j + 1;
      } else if (ch === '[') { // [Coluna], [@Coluna], [#Tudo], [1] (pasta externa)
        let j = i + 1, s = '';
        for (; j < f.length; j++) { if (f[j] === "'" && j + 1 < f.length) { s += f[j] + f[j + 1]; j++; } else if (f[j] === ']' || f[j] === '[') break; else s += f[j]; }
        if (f[j] !== ']') { r += ch; i++; continue; } // [[...]: o de fora é só agrupador
        const arroba = s.startsWith('@') ? '@' : ''; const miolo = arroba ? s.slice(1) : s;
        if (miolo === '' || miolo.startsWith('#') || /^-?\d+$/.test(miolo)) r += '[' + s + ']';
        else { const nome = miolo.replace(/'(.)/g, '$1'); r += '[' + arroba + nomeColuna(nome).replace(/[[\]#']/g, "'$&") + ']'; }
        i = j + 1;
      } else { r += ch; i++; }
    }
    return r;
  }
  /* nome de coluna de tabela: número puro fica (a célula do título também fica), o resto segue o mesmo sorteio do texto da célula */
  const colunasQueFicam = new Set();
  const nomeColuna = (nome) => (colunasQueFicam.has(nome) ? nome : texto(nome));

  return { texto, numero, formula, nomeColuna, colunasQueFicam, cont, originais, deslocDias };
}

/* ---------- datas: quais estilos (cellXfs) são de data ---------- */
const FMT_DATA = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
export function estilosDeData(stylesXml) {
  const custom = new Map();
  for (const m of stylesXml.matchAll(/<numFmt\b[^>]*?numFmtId="(\d+)"[^>]*?formatCode="([^"]*)"/g)) custom.set(+m[1], lerXmlTexto(m[2]));
  for (const m of stylesXml.matchAll(/<numFmt\b[^>]*?formatCode="([^"]*)"[^>]*?numFmtId="(\d+)"/g)) custom.set(+m[2], lerXmlTexto(m[1]));
  const ehData = (id) => { if (FMT_DATA.has(id)) return true; const c = custom.get(id); if (!c) return false; const limpo = c.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, ''); return /[dmyhsDMYHS]/.test(limpo) && !/^general$/i.test(limpo.trim()); };
  const bloco = (stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/) || [])[1] || '';
  return [...bloco.matchAll(/<xf\b([^>]*)/g)].map((m) => ehData(+((m[1].match(/numFmtId="(\d+)"/) || [])[1] || 0)));
}

const numCol = (letras) => { let n = 0; for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64); return n; };
const letraCol = (n) => { let s = ''; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
const pastaDe = (caminho) => caminho.slice(0, caminho.lastIndexOf('/') + 1);
function resolver(base, alvo) { if (alvo.startsWith('/')) return alvo.slice(1); const p = (pastaDe(base) + alvo).split('/'); const r = []; for (const x of p) { if (x === '..') r.pop(); else if (x !== '.') r.push(x); } return r.join('/'); }

/* ---------- imagem de troca (PNG cinza com faixas, do mesmo tamanho) ---------- */
async function pngDeTroca(larg, alt) {
  larg = Math.max(1, Math.min(larg, 4000)); alt = Math.max(1, Math.min(alt, 4000));
  const linha = larg * 3 + 1, cru = new Uint8Array(linha * alt);
  for (let y = 0; y < alt; y++) for (let x = 0; x < larg; x++) { const v = ((x + y) >> 4) % 2 ? 214 : 196; const o = y * linha + 1 + x * 3; cru[o] = v; cru[o + 1] = v; cru[o + 2] = v + 4; }
  const z = new Uint8Array(await new Response(new Blob([cru]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  const pedaco = (tipo, dados) => { const b = new Uint8Array(12 + dados.length); const v = new DataView(b.buffer); v.setUint32(0, dados.length); for (let i = 0; i < 4; i++) b[4 + i] = tipo.charCodeAt(i); b.set(dados, 8); v.setUint32(8 + dados.length, crc32(b.subarray(4, 8 + dados.length))); return b; };
  const ihdr = new Uint8Array(13); const v = new DataView(ihdr.buffer); v.setUint32(0, larg); v.setUint32(4, alt); ihdr[8] = 8; ihdr[9] = 2;
  const partes = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), pedaco('IHDR', ihdr), pedaco('IDAT', z), pedaco('IEND', new Uint8Array(0))];
  const tudo = new Uint8Array(partes.reduce((s, p) => s + p.length, 0)); let o = 0; for (const p of partes) { tudo.set(p, o); o += p.length; }
  return tudo;
}
function tamanhoJpeg(b) { let i = 2; while (i + 9 < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { alt: (b[i + 5] << 8) | b[i + 6], larg: (b[i + 7] << 8) | b[i + 8] }; i += 2 + ((b[i + 2] << 8) | b[i + 3]); } return null; }
async function trocarImagem(nome, bytes) {
  const ext = nome.slice(nome.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'png' && bytes.length > 24) { const v = new DataView(bytes.buffer, bytes.byteOffset); return pngDeTroca(v.getUint32(16), v.getUint32(20)); }
  if (ext === 'svg') return new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#c8c8cc"/></svg>');
  if (ext === 'jpg' || ext === 'jpeg') {
    const t = tamanhoJpeg(bytes) || { larg: 200, alt: 100 };
    if (typeof OffscreenCanvas !== 'undefined') { const c = new OffscreenCanvas(Math.min(t.larg, 4000), Math.min(t.alt, 4000)); const x = c.getContext('2d'); x.fillStyle = '#c8c8cc'; x.fillRect(0, 0, c.width, c.height); x.fillStyle = '#b9b9c0'; for (let i = -c.height; i < c.width; i += 32) { x.beginPath(); x.moveTo(i, c.height); x.lineTo(i + c.height, 0); x.lineTo(i + c.height + 16, 0); x.lineTo(i + 16, c.height); x.fill(); } return new Uint8Array(await (await c.convertToBlob({ type: 'image/jpeg', quality: 0.7 })).arrayBuffer()); }
    return JPEG_CINZA;
  }
  return null; // formato que não sei refazer: fica marcado no relatório
}
/* JPEG cinza mínimo (16×16), para quando não há tela de desenho (testes no Node) */
const JPEG_CINZA = Uint8Array.from(atob('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAA0JCgsKCA0LCgsODg0PEyAVExISEyccHhcgLikxMC4pLSwzOko+MzZGNywtQFdBRkxOUlNSMj5aYVpQYEpRUk//2wBDAQ4ODhMREyYVFSZPNS01T09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0//wAARCAAQABADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDrKKKKYH//2Q=='), (c) => c.charCodeAt(0));

/* ---------- a troca, parte por parte ---------- */
export async function anonimizar(entrada, { numeros = true, sal } = {}) {
  const zip = lerZip(entrada);
  const A = criarAnonimizador(sal);
  const rel = { partes: zip.nomes.length, imagens: 0, imagensNaoTrocadas: [], removidas: [], naoConhecidas: [], abas: [], tabelas: [], nomesDefinidos: [], outrosNomes: [], abasDeFora: [], abasCitadas: [], macros: false, tabelaDinamica: false, avisos: [] };
  const ler = (n) => zip.texto(n);
  const saida = new Map(); // nome -> string | Uint8Array | null (removida)

  /* 1. mapa das partes */
  const nomes = zip.nomes.filter((n) => !n.endsWith('/'));
  const wbRels = (await ler('xl/_rels/workbook.xml.rels')) || '';
  const wb = (await ler('xl/workbook.xml')) || '';
  const idParaAlvo = new Map([...wbRels.matchAll(/<Relationship\b([^>]*)\/?>/g)].map((m) => [(m[1].match(/Id="([^"]*)"/) || [])[1], resolver('xl/workbook.xml', (m[1].match(/Target="([^"]*)"/) || [])[1] || '')]));
  for (const m of wb.matchAll(/<sheet\b([^>]*)\/?>/g)) rel.abas.push(lerXmlTexto((m[1].match(/name="([^"]*)"/) || [])[1] || ''));
  for (const m of wb.matchAll(/<definedName\b[^>]*name="([^"]*)"/g)) if (!m[1].startsWith('_xlnm.')) rel.nomesDefinidos.push(lerXmlTexto(m[1]));
  const datas = nomes.includes('xl/styles.xml') ? estilosDeData(await ler('xl/styles.xml')) : [];

  /* 2. tabelas: de qual aba é cada uma, e quais títulos são NÚMERO na célula (esses ficam como estão) */
  const folhas = nomes.filter((n) => /^xl\/(worksheets|chartsheets|dialogsheets|macrosheets)\/[^/]+\.xml$/.test(n));
  const tabelaDaFolha = new Map(); // caminho da tabela -> caminho da folha
  for (const f of folhas) { const r = await ler(pastaDe(f) + '_rels/' + f.slice(f.lastIndexOf('/') + 1) + '.rels'); if (!r) continue; for (const m of r.matchAll(/<Relationship\b([^>]*)\/?>/g)) { const alvo = (m[1].match(/Target="([^"]*)"/) || [])[1] || ''; if (/\/table"/.test(m[1]) || /tables\//.test(alvo)) tabelaDaFolha.set(resolver(f, alvo), f); } }
  const titulosNumero = new Map(); // folha -> Set de endereços de título que são número
  const tabelas = [];
  for (const t of nomes.filter((n) => /^xl\/tables\/[^/]+\.xml$/.test(n) || tabelaDaFolha.has(n))) {
    const x = await ler(t); const cab = x.match(/<table\b([^>]*)>/); if (!cab) continue;
    const ref = (cab[1].match(/\bref="([^"]*)"/) || [])[1] || ''; const semTitulo = /headerRowCount="0"/.test(cab[1]);
    const m = ref.match(/^\$?([A-Z]+)\$?(\d+)/); rel.tabelas.push(lerXmlTexto((cab[1].match(/displayName="([^"]*)"/) || [])[1] || ''));
    const m2 = ref.match(/:\$?([A-Z]+)\$?\d+$/);
    tabelas.push({ t, folha: tabelaDaFolha.get(t), c1: m ? numCol(m[1]) : 0, c2: m2 ? numCol(m2[1]) : (m ? numCol(m[1]) : 0), l1: m ? +m[2] : 0, semTitulo });
  }
  for (const tb of tabelas) {
    if (!tb.folha || tb.semTitulo || !tb.l1) continue;
    const x = await ler(tb.folha); const linha = x.match(new RegExp(`<row\\b[^>]*\\br="${tb.l1}"[^>]*>([\\s\\S]*?)</row>`)); if (!linha) continue;
    const conj = titulosNumero.get(tb.folha) || new Set(); titulosNumero.set(tb.folha, conj);
    for (const c of linha[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) { const r = (c[1].match(/\br="([A-Z]+\d+)"/) || [])[1]; const tipo = (c[1].match(/\bt="([^"]*)"/) || [])[1] || 'n'; const colC = r ? numCol(r.replace(/\d+/g, '')) : 0; if (r && colC >= tb.c1 && colC <= tb.c2 && (tipo === 'n' || tipo === 'b' || tipo === 'e') && c[2] && /<v\b/.test(c[2])) { conj.add(r); const v = (c[2].match(/<v\b[^>]*>([^<]*)<\/v>/) || [])[1]; if (v != null) A.colunasQueFicam.add(lerXmlTexto(v)); } }
  }

  /* v0.6.11.1 (D-27): os valores escolhidos num filtro (<filter val>, <customFilter val>) são textos das células e as datas do
     filtro (<dateGroupItem>) são datas de verdade: trocam pelo MESMO sorteio das células, para o filtro continuar casando. */
  const valorFiltro = (v) => { const cru = lerEscapesX(lerXmlTexto(v)); if (cru.trim() === '') return v; if (/^-?\d+(\.\d+)?$/.test(cru.trim())) return numeros ? A.numero(cru.trim(), false) : v; return gravarNomeColuna(A.texto(cru)); };
  const dataDoGrupo = (at) => {
    if (!numeros) return at;
    const pega = (k) => { const m = at.match(new RegExp(`\\b${k}="(\\d+)"`)); return m ? +m[1] : null; };
    const ano = pega('year'); if (ano == null) return at;
    const d = new Date(Date.UTC(ano, (pega('month') || 1) - 1, pega('day') || 1, pega('hour') || 0, pega('minute') || 0, pega('second') || 0) - A.deslocDias * 86400000);
    const novo = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() };
    return at.replace(/\b(year|month|day|hour|minute|second)="\d+"/g, (m, k) => `${k}="${novo[k]}"`);
  };
  /* v0.6.12 (D-31): data por extenso (2026-06-01T00:00:00) anda os mesmos dias das outras datas */
  const dataIso = (v) => { const m = numeros && String(v).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/); if (!m) return v; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - A.deslocDias * 86400000); return d.toISOString().slice(0, 19); };
  const trocarFiltros = (xml) => (xml.indexOf('utoFilter') < 0 ? xml : xml.replace(/<((?:\w+:)?autoFilter)\b[^>]*>[\s\S]*?<\/\1>/g, (bloco) => bloco
    .replace(/<((?:\w+:)?(?:filter|customFilter))\b([^>]*?)\bval="([^"]*)"( data-efc-ok="1")?/g, (m, tag, at, v, ok) => { A.cont.filtros = (A.cont.filtros || 0) + 1; return `<${tag}${at}val="${ok ? v : valorFiltro(v)}"`; })
    .replace(/<((?:\w+:)?dateGroupItem)\b([^>]*?)(\/?)>/g, (m, tag, at, barra) => { A.cont.filtros = (A.cont.filtros || 0) + 1; return `<${tag}${dataDoGrupo(at)}${barra}>`; })
    .replace(/<((?:\w+:)?top10)\b([^>]*?)\bfilterVal="([^"]*)"/g, (m, tag, at, v) => `<${tag}${at}filterVal="${numeros ? A.numero(v, false) : v}"`)
    .replace(/<((?:\w+:)?dynamicFilter)\b([^>]*?)(\/?)>/g, (m, tag, at, barra) => `<${tag}${at.replace(/\s(?:val|maxVal|valIso|maxValIso)="[^"]*"/g, '')}${barra}>`)));

  /* 3. cada parte */
  const trocarT = (xml) => xml.replace(/<(a:)?t\b([^>]*)>([^<]*)<\/\1?t>/g, (m, p, at, tx) => `<${p || ''}t${at}>${gravarTextoCelula(A.texto(lerEscapesX(lerXmlTexto(tx))))}</${p || ''}t>`);
  /* texto com vários trechos de formatação (texto rico): sorteia a frase inteira e reparte pelos trechos, para o título de tabela continuar igual ao da célula */
  const trocarRico = (dentro) => {
    const ts = [...dentro.matchAll(/<t\b([^>]*)>([^<]*)<\/t>/g)];
    if (ts.length <= 1) return trocarT(dentro);
    const pedacos = ts.map((t) => lerEscapesX(lerXmlTexto(t[2]))); const novo = [...A.texto(pedacos.join(''))]; let pos = 0, i = 0;
    return dentro.replace(/<t\b([^>]*)>([^<]*)<\/t>/g, (mm, at) => { const tam = [...pedacos[i++]].length; const parte = novo.slice(pos, pos + tam).join(''); pos += tam; return `<t${at}>${gravarTextoCelula(parte)}</t>`; });
  };
  const trocarAtributos = (xml, lista) => xml.replace(new RegExp(`\\b(${lista.join('|')})="([^"]*)"`, 'g'), (m, n, v) => `${n}="${escXml(A.texto(lerXmlTexto(v)), true)}"`);
  const trocarFormulasTag = (xml, tags) => xml.replace(new RegExp(`<(${tags.join('|')})\\b([^>]*)>([^<]*)</\\1>`, 'g'), (m, tag, at, f) => `<${tag}${at}>${escXml(A.formula(lerXmlTexto(f)))}</${tag}>`);

  for (const n of nomes) {
    const baixo = n.toLowerCase();
    /* partes que saem inteiras */
    if (/^customxml\//.test(baixo) || /printersettings/.test(baixo) || /vbaproject\.bin$/.test(baixo) || /vbaprojectsignature/.test(baixo) || /^docprops\/thumbnail/.test(baixo)) { saida.set(n, null); rel.removidas.push(n); if (/vbaproject/.test(baixo)) rel.macros = true; continue; }
    if (/^xl\/media\//.test(baixo)) { const b = await zip.bytes(n); const novo = await trocarImagem(n, b); if (novo) { saida.set(n, novo); rel.imagens++; } else { saida.set(n, b); rel.imagensNaoTrocadas.push(n); } continue; }
    if (!/\.(xml|rels|vml)$/.test(baixo)) { saida.set(n, await zip.bytes(n)); if (!/\.(bin|png|jpe?g|gif|emf|wmf)$/.test(baixo)) rel.naoConhecidas.push(n); else if (/\.bin$/.test(baixo)) rel.naoConhecidas.push(n); continue; }
    let x = await ler(n);
    const raiz = ((x.match(/<([A-Za-z_][\w.:-]*)[\s>/]/) || [])[1] || '').replace(/^.*:/, ''); // o tipo da parte vem do conteúdo, não só do caminho (cada programa guarda numa pasta)

    if (n === '[Content_Types].xml') {
      x = x.replace(/<Override\b[^>]*PartName="\/(customXml|xl\/printerSettings|docProps\/thumbnail)[^"]*"[^>]*\/>/gi, '').replace(/<Override\b[^>]*vbaProject[^>]*\/>/gi, '').replace(/<Default\b[^>]*Extension="bin"[^>]*vbaProject[^>]*\/>/gi, '')
        .replace(/application\/vnd\.ms-excel\.sheet\.macroEnabled\.main\+xml/g, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml').replace(/application\/vnd\.ms-excel\.template\.macroEnabled\.main\+xml/g, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml');
    } else if (/\.rels$/.test(baixo)) {
      x = x.replace(/<Relationship\b[^>]*\/>/g, (m) => {
        if (/customXml|printerSettings|vbaProject|thumbnail/i.test(m)) return '';
        if (/TargetMode="External"/.test(m)) return m.replace(/Target="[^"]*"/, 'Target="https://exemplo.invalid/"');
        return m;
      });
    } else if (n === 'docProps/core.xml') {
      x = x.replace(/<(dc:creator|cp:lastModifiedBy|dc:title|dc:subject|dc:description|cp:keywords|cp:category|cp:contentStatus|cp:lastPrintedBy|dc:identifier|dc:language|cp:revision|cp:version)\b([^>]*)>[^<]*<\/\1>/g, (m, t, at) => `<${t}${at}>${/creator|lastModifiedBy/.test(t) ? 'Anonimo' : ''}</${t}>`)
        .replace(/<(dcterms:created|dcterms:modified|cp:lastPrinted)\b([^>]*)>[^<]*<\/\1>/g, '<$1$2>2000-01-01T00:00:00Z</$1>');
    } else if (n === 'docProps/app.xml') {
      x = x.replace(/<(Company|Manager|HyperlinkBase)\b([^>]*)>[^<]*<\/\1>/g, '<$1$2></$1>');
    } else if (n === 'docProps/custom.xml') {
      x = x.replace(/<vt:(lpwstr|lpstr|bstr)>[^<]*<\/vt:\1>/g, '<vt:$1></vt:$1>');
    } else if (n === 'xl/sharedStrings.xml' || raiz === 'sst') {
      x = x.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').replace(/<phoneticPr\b[^>]*\/>/g, '').replace(/<si>([\s\S]*?)<\/si>/g, (m, dentro) => '<si>' + trocarRico(dentro) + '</si>');
    } else if (folhas.includes(n) || raiz === 'worksheet') {
      const ficam = titulosNumero.get(n) || new Set();
      x = x.replace(/<c\b([^>]*?)(\/>|>([\s\S]*?)<\/c>)/g, (m, at, fim, dentro) => {
        if (dentro == null) return m;
        const tipo = (at.match(/\bt="([^"]*)"/) || [])[1] || 'n';
        let d = dentro.replace(/<f\b([^>]*)>([^<]*)<\/f>/g, (mm, fa, f) => `<f${fa}>${escXml(A.formula(lerXmlTexto(f)))}</f>`);
        if (tipo === 'inlineStr') d = trocarRico(d);
        else if (tipo === 'str') d = d.replace(/<v\b([^>]*)>([^<]*)<\/v>/, (mm, va, v) => `<v${va}>${gravarTextoCelula(A.texto(lerEscapesX(lerXmlTexto(v))))}</v>`);
        else if (tipo === 'n' && numeros) { const r = (at.match(/\br="([A-Z]+\d+)"/) || [])[1]; if (!r || !ficam.has(r)) { const s = +((at.match(/\bs="(\d+)"/) || [])[1] || 0); d = d.replace(/<v\b([^>]*)>([^<]*)<\/v>/, (mm, va, v) => `<v${va}>${A.numero(v, !!datas[s])}</v>`); } }
        return `<c${at}>${d}</c>`;
      });
      /* validação de dados: lista escrita na regra ("A,B,C") troca item por item, para continuar batendo com as células */
      /* v0.6.13 (D-32): `[^>]*?` (o mínimo): com o máximo, uma validação fechada em si mesma engolia as seguintes e os avisos delas (prompt, error) ficavam */
      x = x.replace(/<dataValidation\b([^>]*?)(\/>|>([\s\S]*?)<\/dataValidation>)/g, (m, at, fim, dentro) => {
        const at2 = trocarAtributos(at, ['promptTitle', 'prompt', 'errorTitle', 'error']);
        if (dentro == null) return `<dataValidation${at2}/>`;
        const ehLista = /type="list"/.test(at);
        const d = dentro.replace(/<(formula1|formula2)>([^<]*)<\/\1>/g, (mm, tag, f) => { const cru = lerXmlTexto(f); const lit = ehLista && /^"[\s\S]*"$/.test(cru) ? cru.slice(1, -1).replace(/""/g, '"') : null; return `<${tag}>${escXml(lit != null ? '"' + lit.split(',').map((it) => { const a = it.match(/^(\s*)([\s\S]*?)(\s*)$/); return a[1] + A.texto(a[2]) + a[3]; }).join(',').replace(/"/g, '""') + '"' : A.formula(cru))}</${tag}>`; });
        return `<dataValidation${at2}>${d}</dataValidation>`;
      });
      x = x.replace(/<cfRule\b([^>]*)>/g, (m, at) => `<cfRule${trocarAtributos(at, ['text'])}>`);
      x = x.replace(/<conditionalFormatting\b[\s\S]*?<\/conditionalFormatting>/g, (m) => trocarFormulasTag(m, ['formula']));
      x = x.replace(/<hyperlink\b([^>]*)\/>/g, (m, at) => `<hyperlink${trocarAtributos(at, ['display', 'tooltip'])}/>`);
      x = x.replace(/<(oddHeader|oddFooter|evenHeader|evenFooter|firstHeader|firstFooter)>([^<]*)<\/\1>/g, (m, tag, v) => `<${tag}>${escXml(lerXmlTexto(v).split(/(&"[^"]*"|&\d+|&[A-Za-z+\-])/).map((p, i) => (i % 2 ? p : A.texto(p))).join(''))}</${tag}>`);
      x = x.replace(/(<pageSetup\b[^>]*?)\s+r:id="[^"]*"/g, '$1').replace(/<legacyDrawingHF\b[^>]*\/>/g, '');
      x = x.replace(/(<sheetProtection\b[^>]*?)\s+(password|hashValue|saltValue)="[^"]*"/g, '$1');
    } else if (/^xl\/tables\//.test(baixo) || raiz === 'table') {
      const tb = tabelas.find((q) => q.t === n); const ficam = tb && tb.folha ? titulosNumero.get(tb.folha) || new Set() : new Set(); let i = 0;
      x = x.replace(/<tableColumn\b([^>]*?)(\/?)>/g, (m, at, barra) => { const end = tb && !tb.semTitulo ? letraCol(tb.c1 + i) + tb.l1 : ''; i++; return `<tableColumn${at.replace(/\bname="([^"]*)"/, (mm, v) => { const nome = lerEscapesX(lerXmlTexto(v)); return `name="${gravarNomeColuna(ficam.has(end) ? nome : A.nomeColuna(nome))}"`; }).replace(/\b(totalsRowLabel)="([^"]*)"/, (mm, k, v) => `${k}="${escXml(A.texto(lerXmlTexto(v)), true)}"`)}${barra}>`; });
      x = trocarFormulasTag(x, ['calculatedColumnFormula', 'totalsRowFormula']);
    } else if (n === 'xl/workbook.xml' || raiz === 'workbook') {
      x = x.replace(/<definedName\b([^>]*)>([^<]*)<\/definedName>/g, (m, at, f) => `<definedName${at.replace(/\b(comment|description|help|statusBar)="[^"]*"/g, '')}>${escXml(A.formula(lerXmlTexto(f)))}</definedName>`);
      /* o Excel guarda o caminho da pasta do arquivo (com o nome do usuário do computador): sai */
      x = x.replace(/<mc:AlternateContent\b[^>]*>(?:(?!<\/mc:AlternateContent>)[\s\S])*?absPath[\s\S]*?<\/mc:AlternateContent>/g, '').replace(/<x15ac:absPath\b[^>]*\/>/g, '');
      x = x.replace(/\buserName="[^"]*"/g, 'userName="Anonimo"').replace(/<fileSharing\b[^>]*\/>/g, '').replace(/(<workbookProtection\b[^>]*?)\s+(workbookPassword|revisionsPassword|workbookHashValue|workbookSaltValue)="[^"]*"/g, '$1');
      x = /<calcPr\b/.test(x) ? x.replace(/<calcPr\b([^>]*?)\/>/, (m, at) => `<calcPr${at.replace(/\s+fullCalcOnLoad="[^"]*"/, '')} fullCalcOnLoad="1"/>`) : x;
    } else if (/^xl\/drawings\/[^/]+\.xml$/.test(baixo) || /^xl\/diagrams\//.test(baixo) || raiz === 'wsDr') {
      x = trocarAtributos(trocarT(x), ['descr', 'title']);
    } else if (/^xl\/charts\//.test(baixo) || /^xl\/chartex\//.test(baixo) || raiz === 'chartSpace') {
      /* v0.6.13 (D-32): gráficos novos (cascata, mapa de árvore, funil: prefixo cx): título, rótulos e números guardados */
      x = x.replace(/<cx:strDim\b[\s\S]*?<\/cx:strDim>/g, (m) => m.replace(/<cx:pt\b([^>]*)>([^<]*)<\/cx:pt>/g, (mm, at, v) => `<cx:pt${at}>${gravarTextoCelula(A.texto(lerXmlTexto(v)))}</cx:pt>`))
        .replace(/<cx:numDim\b[\s\S]*?<\/cx:numDim>/g, (m) => (numeros ? m.replace(/<cx:pt\b([^>]*)>([^<]*)<\/cx:pt>/g, (mm, at, v) => `<cx:pt${at}>${A.numero(v, false)}</cx:pt>`) : m))
        .replace(/<cx:v>([^<]*)<\/cx:v>/g, (m, v) => `<cx:v>${gravarTextoCelula(A.texto(lerXmlTexto(v)))}</cx:v>`)
        .replace(/<cx:f\b([^>]*)>([^<]*)<\/cx:f>/g, (m, at, f) => `<cx:f${at}>${escXml(A.formula(lerXmlTexto(f)))}</cx:f>`);
      /* v0.6.15 (D-56): rótulos em vários níveis (gráfico de tabela dinâmica: <c:multiLvlStrCache>), faixa de rótulos (c15) e o nome da
         pasta de trabalho guardado no gráfico de tabela dinâmica ("[arquivo.xlsx]Aba!Tabela dinâmica1"; o Excel não usa o nome do arquivo) */
      x = x.replace(/<(c:multiLvlStrCache|c15:dlblRangeCache)>[\s\S]*?<\/\1>/g, (m) => m.replace(/<c:v>([^<]*)<\/c:v>/g, (mm, v) => `<c:v>${gravarTextoCelula(A.texto(lerXmlTexto(v)))}</c:v>`))
        .replace(/(<c:pivotSource>\s*<c:name>)\[[^\]<]*\]/g, '$1[Pasta1.xlsx]');
      x = trocarT(x).replace(/<c:strCache>[\s\S]*?<\/c:strCache>/g, (m) => m.replace(/<c:v>([^<]*)<\/c:v>/g, (mm, v) => `<c:v>${gravarTextoCelula(A.texto(lerXmlTexto(v)))}</c:v>`))
        .replace(/<c:(numCache|numLit)>[\s\S]*?<\/c:\1>/g, (m) => (numeros ? m.replace(/<c:v>([^<]*)<\/c:v>/g, (mm, v) => `<c:v>${A.numero(v, false)}</c:v>`) : m))
        .replace(/<c:strLit>[\s\S]*?<\/c:strLit>/g, (m) => m.replace(/<c:v>([^<]*)<\/c:v>/g, (mm, v) => `<c:v>${gravarTextoCelula(A.texto(lerXmlTexto(v)))}</c:v>`))
        .replace(/<c:f>([^<]*)<\/c:f>/g, (m, f) => `<c:f>${escXml(A.formula(lerXmlTexto(f)))}</c:f>`).replace(/<c:externalData\b[^>]*>[\s\S]*?<\/c:externalData>|<c:externalData\b[^>]*\/>/g, '');
    } else if (raiz === 'comments' || raiz === 'ThreadedComments' || /comment/.test(baixo) && !/\.vml$/.test(baixo)) {
      x = trocarT(x).replace(/<author>[^<]*<\/author>/g, '<author>Autor</author>').replace(/<text\b([^>]*)>([^<]*)<\/text>/g, (m, at, v) => `<text${at}>${gravarTextoCelula(A.texto(lerEscapesX(lerXmlTexto(v))))}</text>`); /* v0.6.13 (D-32): <text xml:space="preserve"> também */
    } else if (/^xl\/persons\//.test(baixo) || raiz === 'personList') {
      let i = 0; x = x.replace(/\bdisplayName="[^"]*"/g, () => `displayName="Pessoa ${++i}"`).replace(/\b(userId|providerId)="[^"]*"/g, '$1=""');
    } else if (/\.vml$/.test(baixo)) {
      x = x.replace(/<div\b([^>]*)>[\s\S]*?<\/div>/g, '<div$1></div>').replace(/<x:(FmlaMacro|FmlaLink)>[^<]*<\/x:\1>/g, '');
    } else if (/^xl\/externallinks\/[^/]+\.xml$/.test(baixo) || raiz === 'externalLink') {
      x = x.replace(/<v\b[^>]*>([^<]*)<\/v>/g, (m, v) => `<v>${/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(v) ? (numeros ? A.numero(v, false) : v) : gravarTextoCelula(A.texto(lerXmlTexto(v)))}</v>`); const AV = 'O arquivo tem vínculo com outra pasta de trabalho: o endereço do vínculo foi trocado por um de exemplo.'; if (!rel.avisos.includes(AV)) rel.avisos.push(AV);
      /* v0.6.12 (D-31): os nomes das abas da OUTRA pasta ficam (as fórmulas usam); vão para a lista que o dono confere */
      for (const m of x.matchAll(/<(?:\w+:)?(?:sheetName\b[^>]*?\bval|definedName\b[^>]*?\bname)="([^"]*)"/g)) { const v = lerXmlTexto(m[1]); if (v && !rel.abas.includes(v) && !rel.abasDeFora.includes(v)) rel.abasDeFora.push(v); }
    } else if (/^xl\/pivotcache\//.test(baixo) || raiz === 'pivotCacheDefinition' || raiz === 'pivotCacheRecords') {
      rel.tabelaDinamica = true;
      x = x.replace(/<(s|e)\b([^>]*?)\bv="([^"]*)"/g, (m, tag, at, v) => `<${tag}${at}v="${escXml(A.texto(lerXmlTexto(v)), true)}"`).replace(/<n\b([^>]*?)\bv="([^"]*)"/g, (m, at, v) => `<n${at}v="${numeros ? A.numero(v, false) : v}"`)
        .replace(/<cacheField\b([^>]*?)\bname="([^"]*)"/g, (m, at, v) => `<cacheField${at}name="${escXml(A.nomeColuna(lerEscapesX(lerXmlTexto(v))), true)}"`).replace(/\brefreshedBy="[^"]*"/g, 'refreshedBy="Anonimo"');
    } else if (/^xl\/pivottables\//.test(baixo) || raiz === 'pivotTableDefinition') {
      rel.tabelaDinamica = true; for (const m of x.matchAll(/<(?:\w+:)?pivotTableDefinition\b[^>]*?\bname="([^"]*)"/g)) { const v = lerXmlTexto(m[1]); if (v && !rel.outrosNomes.includes(v)) rel.outrosNomes.push(v); }
      x = x.replace(/<dataField\b([^>]*?)\bname="([^"]*)"/g, (m, at, v) => `<dataField${at}name="${escXml(A.texto(lerXmlTexto(v)), true)}"`).replace(/\b(rowHeaderCaption|colHeaderCaption|dataCaption|grandTotalCaption|errorCaption|missingCaption)="([^"]*)"/g, (m, k, v) => `${k}="${escXml(A.texto(lerXmlTexto(v)), true)}"`)
        /* v0.6.12 (D-31): o filtro da tabela dinâmica leva o nome do campo (título de coluna) e textos de rótulo; campo e item com legenda própria */
        .replace(/<((?:\w+:)?filter)\b([^>]*?\bfld="[^"]*"[^>]*)>/g, (m, tag, at) => `<${tag}${at.replace(/\bname="([^"]*)"/, (q, v) => `name="${escXml(A.nomeColuna(lerEscapesX(lerXmlTexto(v))), true)}"`).replace(/\b(description|stringValue1|stringValue2)="([^"]*)"/g, (q, k, v) => `${k}="${escXml(A.texto(lerXmlTexto(v)), true)}"`)}>`)
        .replace(/<((?:\w+:)?(?:pivotField|pivotHierarchy))\b([^>]*?)\b(name|caption|subtotalCaption)="([^"]*)"/g, (m, tag, at, k, v) => `<${tag}${at}${k}="${escXml(A.nomeColuna(lerEscapesX(lerXmlTexto(v))), true)}"`)
        .replace(/<item\b([^>]*?)\bn="([^"]*)"/g, (m, at, v) => `<item${at}n="${escXml(A.texto(lerXmlTexto(v)), true)}"`);
      if (numeros) x = x.replace(/<((?:\w+:)?filter)\b[^>]*?\btype="date[^"]*"[^>]*>[\s\S]*?<\/\1>/g, (bloco) => bloco.replace(/(<(?:\w+:)?customFilter\b[^>]*?\bval=")(\d+(?:\.\d+)?)"/g, (m, a, v) => `${a}${Math.round((+v - A.deslocDias) * 1e6) / 1e6}" data-efc-ok="1"`));
    } else if (n === 'xl/connections.xml' || raiz === 'connections') {
      x = x.replace(/\b(connection|command|sourceFile|odcFile|url|post|description)="[^"]*"/g, '$1=""'); rel.avisos.push('O arquivo tem conexões de dados: os endereços foram apagados.');
    } else if (/^xl\/(slicers|timelines)\//.test(baixo) || raiz === 'slicers' || raiz === 'timelines') {
      /* v0.6.11.1 (D-27): segmentação de dados: a legenda é um título de coluna (troca como o título); o nome fica (é o que liga o desenho) */
      x = x.replace(/\bcaption="([^"]*)"/g, (m, v) => `caption="${escXml(A.nomeColuna(lerEscapesX(lerXmlTexto(v))), true)}"`).replace(/\bscrollPosition="([^"]*)"/g, (m, v) => `scrollPosition="${dataIso(v)}"`);
      for (const m of x.matchAll(/<(?:\w+:)?(?:slicer|timeline)\b[^>]*?\bname="([^"]*)"/g)) { const v = lerXmlTexto(m[1]); if (v && !rel.outrosNomes.includes(v)) rel.outrosNomes.push(v); }
    } else if (/^xl\/(slicercaches|timelinecaches)\//.test(baixo) || raiz === 'slicerCacheDefinition' || raiz === 'timelineCacheDefinition') {
      /* o campo de origem tem de ser igual ao nome da coluna (ou do campo da tabela dinâmica) já trocado, senão o Excel pede reparo */
      x = x.replace(/\bsourceName="([^"]*)"/g, (m, v) => `sourceName="${escXml(A.nomeColuna(lerEscapesX(lerXmlTexto(v))), true)}"`);
      /* v0.6.12 (D-31): linha do tempo: as datas escolhidas e os limites andam junto com as outras datas */
      x = x.replace(/\b(startDate|endDate)="([^"]*)"/g, (m, k, v) => `${k}="${dataIso(v)}"`);
    } else if (/^xl\/ink\//.test(baixo) || raiz === 'ink') {
      x = x.replace(/(<(?:\w+:)?trace\b[^>]*>)[^<]*(<\/(?:\w+:)?trace>)/g, '$10 0$2'); if (!rel.avisos.includes(AVISO_TINTA)) rel.avisos.push(AVISO_TINTA);
    } else if (/^xl\/webextensions\//.test(baixo) || raiz === 'webextension' || raiz === 'taskpanes') {
      if (/<(?:\w+:)?property\b/.test(x)) { x = x.replace(/(<(?:\w+:)?property\b[^>]*?\bvalue=")[^"]*"/g, '$1&quot;&quot;"'); if (!rel.avisos.includes(AVISO_SUPLEMENTO)) rel.avisos.push(AVISO_SUPLEMENTO); }
    } else if (/^xl\/(styles|theme\/|calcchain|metadata|richdata\/|worksheets\/|chartsheets\/|featurepropertybag\/|ctrlprops\/|activex\/|querytables\/|model\/)/.test(baixo) || /^_rels\//.test(baixo)) {
      if (/^xl\/(querytables|model|activex)/.test(baixo)) rel.naoConhecidas.push(n);
    } else rel.naoConhecidas.push(n);
    x = trocarFiltros(x).replace(/ data-efc-ok="1"/g, '');
    saida.set(n, x);
  }

  /* 4. montar na mesma ordem */
  const arquivos = []; for (const n of nomes) { const d = saida.get(n); if (d != null) arquivos.push({ nome: n, dados: d }); }
  const bytes = await criarZip(arquivos);

  /* v0.6.14 (D-35): link de forma ou de célula que leva a uma aba que não existe mais nesta planilha ("#'Controle de Lote'!A1"):
     o nome da aba fica (como os outros nomes de aba) e vai para a lista que o dono confere */
  for (const a of arquivos) {
    if (typeof a.dados !== 'string') continue;
    const alvos = /\.rels$/.test(a.nome) ? [...a.dados.matchAll(/\bTarget="#([^"]*)"/g)].map((m) => { try { return decodeURIComponent(lerXmlTexto(m[1])); } catch { return lerXmlTexto(m[1]); } })
      : /^xl\/worksheets\//.test(a.nome) ? [...a.dados.matchAll(/<hyperlink\b[^>]*?\blocation="([^"]*)"/g)].map((m) => lerXmlTexto(m[1])) : [];
    for (const t of alvos) {
      const m = /^(?:'((?:[^']|'')+)'|([^!]+))!/.exec(t); if (!m) continue;
      const nome = m[1] != null ? m[1].replace(/''/g, "'") : m[2];
      if (nome && !rel.abas.includes(nome) && !rel.abasCitadas.includes(nome)) rel.abasCitadas.push(nome);
    }
  }

  /* 5. conferência: procura no arquivo novo os textos originais mais compridos */
  const procurar = [...A.originais].filter((s) => s.length >= 6 && /\p{L}{3}/u.test(s)).sort((a, b) => b.length - a.length).slice(0, 400);
  const sobrou = [];
  /* nomes que ficam de propósito (segmentação, tabela dinâmica, objeto do desenho, nome definido) não contam como sobra */
  /* v0.6.12 (D-31): nome de aba, de tabela e nome definido aparecem em fórmulas, em docProps/app.xml e nos vínculos; uma célula com
     o mesmo texto (ex.: "ENTRADAS", que também é nome de aba) dava aviso falso. Os nomes que ficam saem do texto antes da procura. */
  const nomesQueFicam = [...new Set([...rel.abas, ...rel.tabelas, ...rel.nomesDefinidos, ...rel.outrosNomes, ...rel.abasDeFora, ...rel.abasCitadas])].filter((s) => s.length >= 3).sort((a, b) => b.length - a.length);
  /* v0.6.15: o que nunca leva dado da pessoa sai antes da procura: declarações de namespace e endereços de esquema (um texto original
     como "http://" aparecia em todas as partes) e, nas fórmulas, os nomes das funções e as palavras das tabelas (uma célula "SUBTOTAL"
     aparecia dentro de SUBTOTAL(9;...)) */
  /* rótulos que o Excel gera ao agrupar datas ou números da tabela dinâmica ("21/out") já foram trocados; um trocado pode, por acaso,
     ficar igual a outro rótulo original (só 3 letras e 2 números): não é sobra */
  const semEstrutura = (t) => t.replace(/(<rangePr\b[^>]*\/>\s*<groupItems\b[^>]*>)[\s\S]*?(<\/groupItems>)/g, '$1$2').replace(/\s(?:xmlns(?::[\w.-]+)?|mc:Ignorable|Requires|uri|ContentType|PartName|Type)="[^"]*"/g, ' ')
    .replace(/<((?:\w+:)?(?:f|formula|formula1|formula2|calculatedColumnFormula|totalsRowFormula|definedName))\b([^>]*)>([^<]*)<\/\1>/g, (m, tag, at, f) => `<${tag}${at}>${f.replace(/\b[A-Z][A-Z0-9._]*\(/g, '\u0001(').replace(/#(?:This Row|Headers|Totals|Data|All)/g, '\u0001')}</${tag}>`);
  const semNomes = (a) => { let t = semEstrutura(/^xl\/(slicers|slicerCaches|timelines|timelineCaches|drawings|pivotTables)\//i.test(a.nome) || a.nome === 'xl/workbook.xml' ? a.dados.replace(/\s(?:name|cache|displayName)="[^"]*"/g, '') : a.dados); for (const nm of nomesQueFicam) { /* v0.6.14 (D-35): no link, o nome da aba vem com %20 no lugar do espaço ("#'Relatório%20e%20Estatística'!A1") */ for (const v of new Set([nm.replace(/ /g, '%20'), escXml(nm.replace(/ /g, '%20'), true)])) if (v !== nm && t.includes(v)) t = t.split(v).join('\u0001'); if (t.includes(nm)) t = t.split(nm).join('\u0001'); const e = escXml(nm, true); if (e !== nm && t.includes(e)) t = t.split(e).join('\u0001'); } return t; };
  if (procurar.length) for (const a of arquivos) { if (typeof a.dados !== 'string') continue; const onde = semNomes(a); for (const s of procurar) { if (onde.includes(s) || onde.includes(escXml(s, true))) { sobrou.push({ parte: a.nome, tamanho: s.length, lugar: lugarNoXml(onde, onde.includes(s) ? onde.indexOf(s) : onde.indexOf(escXml(s, true))) }); if (sobrou.length > 50) break; } } if (sobrou.length > 50) break; }
  /* v0.6.11.1 (D-27): segunda conferência, com TODOS os textos originais: procura valor idêntico em atributos e textos de todas as
     partes (menos as células, que a troca cobre, e os estilos). Nomes que ficam de propósito (abas, tabelas, nomes definidos,
     segmentações) não contam. Foi assim que os valores de filtro passaram sem aparecer na primeira conferência. */
  const todos = new Set([...A.originais].filter((s) => s.length >= 4 && /\p{L}{3}/u.test(s)));
  let conferidosExatos = 0;
  if (todos.size) {
    const ficam = new Set([...rel.abas, ...rel.tabelas, ...rel.nomesDefinidos, ...rel.outrosNomes, ...rel.abasDeFora, ...rel.abasCitadas]);
    for (const a of arquivos) { if (typeof a.dados !== 'string') continue; for (const m of a.dados.matchAll(/<(?:\w+:)?(?:slicer|timeline|slicerCacheDefinition|timelineCacheDefinition|pivotTableDefinition|pivotTable|cNvPr|definedName|table)\b[^>]*?\b(?:name|displayName|cache)="([^"]*)"/g)) ficam.add(lerXmlTexto(m[1])); }
    for (const v of [...ficam]) ficam.add(String(v).trim()); /* v0.6.13 (D-32): nome que fica com espaço no fim ("RESPONSAVEL ") é comparado sem o espaço */
    for (const a of arquivos) {
      if (typeof a.dados !== 'string' || /^xl\/(styles\.xml|theme\/|sharedStrings\.xml|calcChain\.xml)/i.test(a.nome) || /\.rels$/.test(a.nome) || a.nome === '[Content_Types].xml') continue;
      const corpo = (/^xl\/(worksheets|chartsheets|macrosheets|dialogsheets)\//i.test(a.nome) ? a.dados.replace(/<sheetData\b[\s\S]*?<\/sheetData>/, '') : a.dados)
        .replace(/(<rangePr\b[^>]*\/>\s*<groupItems\b[^>]*>)[\s\S]*?(<\/groupItems>)/g, '$1$2'); /* v0.6.15: rótulo gerado pelo Excel, trocado (ver semEstrutura) */
      for (const m of corpo.matchAll(/="([^"]{4,})"|>([^<]{4,})</g)) {
        conferidosExatos++;
        const v = lerEscapesX(lerXmlTexto(m[1] != null ? m[1] : m[2])).trim();
        if (todos.has(v) && !ficam.has(v)) { sobrou.push({ parte: a.nome, tamanho: v.length, lugar: lugarNoXml(corpo, m.index + 2) }); if (sobrou.length > 200) break; }
      }
      if (sobrou.length > 200) break;
    }
  }
  Object.assign(rel, { ...A.cont, deslocDias: A.deslocDias, conferidos: procurar.length, conferidosTodos: todos.size, sobrou, tamanhoAntes: entrada.length || entrada.byteLength, tamanhoDepois: bytes.length });
  return { bytes, relatorio: rel };
}

/* v0.6.14: em que tipo de lugar do XML está uma posição (para o aviso dizer onde sobrou texto, sem mostrar o texto) */
const LUGARES = { f: 'numa fórmula', v: 'num valor guardado', t: 'num texto', Relationship: 'num link ou numa ligação', hyperlink: 'num link de célula', formula1: 'numa validação', formula2: 'numa validação', definedName: 'num nome definido', text: 'num comentário', 'c:v': 'num gráfico', 'cx:v': 'num gráfico', 'cx:pt': 'num gráfico', 'c:f': 'num gráfico', 'a:t': 'numa forma ou caixa de texto', cfRule: 'numa regra de cor', dataValidation: 'numa validação', filter: 'num filtro', customFilter: 'num filtro', tableColumn: 'num título de tabela', oddHeader: 'no cabeçalho ou rodapé', oddFooter: 'no cabeçalho ou rodapé', evenHeader: 'no cabeçalho ou rodapé', evenFooter: 'no cabeçalho ou rodapé', firstHeader: 'no cabeçalho ou rodapé', firstFooter: 'no cabeçalho ou rodapé' };
export function lugarNoXml(xml, i) {
  if (i < 0) return '';
  const ini = xml.lastIndexOf('<', i); if (ini < 0) return '';
  const pedaco = xml.slice(ini, i); const tag = (/^<\/?([\w:.-]+)/.exec(pedaco) || [])[1] || '';
  const dentroDaTag = pedaco.indexOf('>') < 0;
  if (dentroDaTag) { const at = (/([\w:.-]+)="[^"]*$/.exec(pedaco) || [])[1]; const l = LUGARES[tag] || LUGARES[tag.split(':').pop()]; return l ? `${l} (${at || 'atributo'})` : `no atributo ${at || '?'} de <${tag}>`; }
  return LUGARES[tag] || LUGARES[tag.split(':').pop()] || (tag ? `dentro de <${tag}>` : '');
}
