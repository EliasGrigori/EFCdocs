/* EFCdocs v0.6.0 — configurar página ⇄ .xlsx: margens, papel, orientação, escala, títulos e área de impressão,
   cabeçalho e rodapé, quebras de página e opções (grade, títulos A B C, centralizar). */
import { tag, tags, desescapar, escapar } from './xml.js';
import { normalizarImp, impParaGuardar, cabParaExcel, cabDoExcel, PAPEIS, lerIntervalo } from '../impressao.js';
import { letraCol } from '../ref.js';

const pol = (cm) => Math.round((cm / 2.54) * 10000) / 10000;
const cmDe = (p) => Math.round(+p * 2.54 * 100) / 100;
const nomeAba = (n) => "'" + String(n).replace(/'/g, "''") + "'";

/** Pedaços do XML da aba (na ordem que o Excel pede) e os nomes definidos (área e títulos). */
export function gravarImpressaoAba(imp0, nomeA) {
  const guarda = impParaGuardar(imp0);
  const imp = normalizarImp(imp0);
  const m = imp.marg;
  const out = { sheetPr: '', printOptions: '', margens: '', pageSetup: '', headerFooter: '', quebras: '', nomes: [] };
  out.margens = `<pageMargins left="${pol(m.l)}" right="${pol(m.r)}" top="${pol(m.t)}" bottom="${pol(m.b)}" header="${pol(m.cab)}" footer="${pol(m.rod)}"/>`;
  if (!guarda) { out.margens = '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>'; return out; }
  const po = [imp.centH ? ' horizontalCentered="1"' : '', imp.centV ? ' verticalCentered="1"' : '', imp.titulos ? ' headings="1"' : '', imp.grade ? ' gridLines="1"' : ''].join('');
  if (po) out.printOptions = `<printOptions${po}/>`;
  const e = imp.escala;
  let esc = '';
  if (e.modo === 'pct') esc = ` scale="${Math.round(e.pct)}"`;
  else if (e.modo !== 'nenhum') {
    const [w, h] = e.modo === 'pagina' ? [1, 1] : e.modo === 'colunas' ? [1, 0] : e.modo === 'linhas' ? [0, 1] : [e.largura, e.altura];
    esc = ` fitToWidth="${w}" fitToHeight="${h}"`;
    out.sheetPr = '<pageSetUpPr fitToPage="1"/>';
  }
  out.pageSetup = `<pageSetup paperSize="${PAPEIS[imp.papel].xl}"${esc}${imp.ordem === 'lado' ? ' pageOrder="overThenDown"' : ''} orientation="${imp.orient === 'paisagem' ? 'landscape' : 'portrait'}"/>`;
  const cab = cabParaExcel(imp.cab), rod = cabParaExcel(imp.rod);
  if (cab || rod) out.headerFooter = `<headerFooter>${cab ? `<oddHeader>${escapar(cab)}</oddHeader>` : ''}${rod ? `<oddFooter>${escapar(rod)}</oddFooter>` : ''}</headerFooter>`;
  if (imp.qL.length) out.quebras += `<rowBreaks count="${imp.qL.length}" manualBreakCount="${imp.qL.length}">${imp.qL.map((l) => `<brk id="${l}" max="16383" man="1"/>`).join('')}</rowBreaks>`;
  if (imp.qC.length) out.quebras += `<colBreaks count="${imp.qC.length}" manualBreakCount="${imp.qC.length}">${imp.qC.map((c) => `<brk id="${c}" max="1048575" man="1"/>`).join('')}</colBreaks>`;
  if (imp.area && /^[A-Z]+\d+(:[A-Z]+\d+)?$/.test(imp.area)) {
    const [a, b = a] = imp.area.split(':');
    const dol = (r) => r.replace(/^([A-Z]+)(\d+)$/, '$$$1$$$2');
    out.nomes.push({ nome: '_xlnm.Print_Area', ref: `${nomeAba(nomeA)}!${dol(a)}:${dol(b)}` });
  }
  const tl = lerIntervalo(imp.titLin, 'l'), tc = lerIntervalo(imp.titCol, 'c');
  const partes = [];
  if (tc) partes.push(`${nomeAba(nomeA)}!$${letraCol(tc.a)}:$${letraCol(tc.b)}`);
  if (tl) partes.push(`${nomeAba(nomeA)}!$${tl.a + 1}:$${tl.b + 1}`);
  if (partes.length) out.nomes.push({ nome: '_xlnm.Print_Titles', ref: partes.join(',') });
  return out;
}

/** Lê a configuração de página da aba. cab = XML antes de sheetData, resto = XML depois; defs = { area, titulos } dos nomes definidos. */
export function lerImpressaoAba(cab, resto, defs = {}) {
  const x = {};
  const po = tag(resto, 'printOptions');
  if (po) { const s = (k) => po.a[k] === '1' || po.a[k] === 'true'; x.centH = s('horizontalCentered'); x.centV = s('verticalCentered'); x.titulos = s('headings'); x.grade = s('gridLines'); }
  const pm = tag(resto, 'pageMargins');
  if (pm) x.marg = { l: cmDe(pm.a.left ?? 0.7), r: cmDe(pm.a.right ?? 0.7), t: cmDe(pm.a.top ?? 0.75), b: cmDe(pm.a.bottom ?? 0.75), cab: cmDe(pm.a.header ?? 0.3), rod: cmDe(pm.a.footer ?? 0.3) };
  const ps = tag(resto, 'pageSetup');
  if (ps) {
    x.orient = ps.a.orientation === 'landscape' ? 'paisagem' : 'retrato';
    const pp = Object.entries(PAPEIS).find(([, p]) => String(p.xl) === String(ps.a.paperSize || '9'));
    x.papel = pp ? pp[0] : 'A4';
    if (ps.a.pageOrder === 'overThenDown') x.ordem = 'lado';
    const ajusta = /<pageSetUpPr\b[^>]*fitToPage="(1|true)"/.test(cab);
    if (ajusta) {
      const w = ps.a.fitToWidth != null ? +ps.a.fitToWidth : 1, h = ps.a.fitToHeight != null ? +ps.a.fitToHeight : 1;
      x.escala = { modo: w === 1 && h === 1 ? 'pagina' : w === 1 && h === 0 ? 'colunas' : w === 0 && h === 1 ? 'linhas' : 'paginas', largura: w, altura: h, pct: 100 };
    } else if (ps.a.scale && +ps.a.scale !== 100) x.escala = { modo: 'pct', pct: +ps.a.scale };
  }
  const hf = tag(resto, 'headerFooter');
  if (hf) {
    const oh = tag(hf.dentro, 'oddHeader'), of = tag(hf.dentro, 'oddFooter');
    x.cab = cabDoExcel(oh ? desescapar(oh.dentro) : ''); x.rod = cabDoExcel(of ? desescapar(of.dentro) : '');
  } else { x.cab = { e: '', c: '', d: '' }; x.rod = { e: '', c: '', d: '' }; }
  const qb = (nome) => { const t = tag(resto, nome); return t ? tags(t.dentro, 'brk').filter((b) => b.a.man === '1' || b.a.man === 'true').map((b) => +b.a.id).filter((v) => v > 0) : []; };
  x.qL = qb('rowBreaks'); x.qC = qb('colBreaks');
  if (defs.area) x.area = defs.area;
  if (defs.titLin) x.titLin = defs.titLin;
  if (defs.titCol) x.titCol = defs.titCol;
  if (!po && !ps && !hf && !defs.area && !defs.titLin && !defs.titCol && !x.qL.length && !x.qC.length) return undefined;
  return impParaGuardar(x);
}

/** Nomes _xlnm.Print_Area / Print_Titles → { area, titLin, titCol } (o que der para usar; várias áreas: só a primeira). */
export function lerNomesImpressao(nome, ref) {
  const t = desescapar(ref || '').replace(/\$/g, '');
  const partes = t.split(',').map((p) => p.trim().replace(/^.*!/, ''));
  if (/Print_Area/i.test(nome)) { const p = partes[0]; return /^[A-Z]+\d+(:[A-Z]+\d+)?$/i.test(p) ? { area: p.toUpperCase(), varias: partes.length > 1 } : {}; }
  const out = {};
  for (const p of partes) {
    if (/^\d+:\d+$/.test(p)) out.titLin = p;
    else if (/^[A-Z]+:[A-Z]+$/i.test(p)) out.titCol = p.toUpperCase();
  }
  return out;
}
