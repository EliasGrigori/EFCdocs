/* Vértice Docs v0.6.44 — S3 da segmentação: a segmentação feita no app (aba.seg[i].novo) vai para o arquivo do Excel.
   Roda no fim da gravação, depois do "guardar e devolver" (devolver.js), sobre as partes já montadas. Escreve como o Excel
   2013 em diante grava a segmentação de tabela:
   - xl/slicerCaches/…: a memória (slicerCacheDefinition) com x15:tableSlicerCache (número da tabela e da coluna no arquivo);
   - xl/slicers/…: a segmentação (título, colunas de botões, altura do botão), uma parte por aba (junta na que já existe);
   - o desenho da aba: o quadro (twoCellAnchor, "mover, mas não dimensionar") com sle:slicer e a forma de reserva para
     versões antigas do Excel;
   - a aba: a lista x14:slicerList no extLst; o livro: x15:slicerCaches no extLst e o nome definido da memória (#N/A);
   - as relações e os tipos de conteúdo de cada parte nova.
   O filtro que a segmentação faz já vai no filtro da tabela (v0.6.40). Devolve { gravadas, fora: [nome] }. */
import { XML_CAB } from './xml.js';
import { noFim, extLstDaRaiz, noExtLst } from './devolver.js';
import { pontasDaSeg } from './segmentacaoXlsx.js';

const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
const REL_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const T_SLICER = 'http://schemas.microsoft.com/office/2007/relationships/slicer';
const T_CACHE = 'http://schemas.microsoft.com/office/2007/relationships/slicerCache';
const CT_SLICER = 'application/vnd.ms-excel.slicer+xml', CT_CACHE = 'application/vnd.ms-excel.slicerCache+xml';
const CT_DESENHO = 'application/vnd.openxmlformats-officedocument.drawing+xml';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const X14 = 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/main';
const X15 = 'http://schemas.microsoft.com/office/spreadsheetml/2010/11/main';
const MC = 'http://schemas.openxmlformats.org/markup-compatibility/2006';
const U_LISTA = '{3A4CF648-6AED-40f4-86FF-DC5316D8AED3}', U_CACHES = '{46BE6895-7355-4a93-B00E-2C351335B9C9}', U_TAB = '{2F2917AC-EB37-4324-AD4E-5DD8C200BD13}';
const EMU = 9525;

const dirDe = (p) => p.slice(0, p.lastIndexOf('/') + 1);
const relsDe = (p) => dirDe(p) + '_rels/' + p.slice(p.lastIndexOf('/') + 1) + '.rels';
const desXml = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const escAtr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\r?\n/g, '&#10;');
const atr = (s, n) => { const m = new RegExp(`(?:^|\\s)${n}="([^"]*)"`).exec(s); return m ? m[1] : null; };
/** nome de coluna como o Excel grava (_x000a_ para a quebra de linha) → texto */
const nomeCol = (s) => desXml(s).replace(/_x000([ad9])_/g, (q, c) => ({ a: '\n', d: '\r', 9: '\t' })[c]);
function resolver(base, alvo) {
  if (alvo.startsWith('/')) return alvo.slice(1);
  const out = [];
  for (const s of (dirDe(base) + alvo).split('/')) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s); }
  return out.join('/');
}
const relativo = (de, para) => { const a = dirDe(de).split('/').filter(Boolean), b = para.split('/'); let i = 0; while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++; return '../'.repeat(a.length - i) + b.slice(i).join('/'); };
const lerRels = (x, parte) => [...String(x || '').matchAll(/<Relationship\b([^>]*?)\/?>/g)].map((m) => ({ id: atr(m[1], 'Id'), tipo: atr(m[1], 'Type') || '', alvo: atr(m[1], 'TargetMode') === 'External' ? atr(m[1], 'Target') : resolver(parte, desXml(atr(m[1], 'Target') || '')) }));

/** Nome definido válido no Excel a partir do nome da coluna ("SegmentaçãodeDados_<coluna>", como o Excel em português). */
export function nomeDaMemoria(coluna, usados) {
  let base = 'SegmentaçãodeDados_' + String(coluna || 'Coluna').replace(/[^A-Za-z0-9_.À-ÖØ-öø-ɏ]+/g, '_') /* sem × e ÷ (revisor) */.replace(/^_+|_+$/g, '');
  if (base.length > 240) base = base.slice(0, 240);
  if (/_$/.test(base)) base += 'Coluna';
  let n = base, i = 1;
  while (usados.has(n.toLowerCase())) n = `${base}${i++}`;
  usados.add(n.toLowerCase());
  return n;
}

/** O bloco do desenho de uma segmentação (mesmo formato do Excel; a forma de reserva aparece nas versões que não têm segmentação). */
export function ancoraDaSeg(aba, s, id) {
  const { from, to } = pontasDaSeg(aba, s);
  const nome = escAtr(s.nome);
  return `<xdr:twoCellAnchor xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" editAs="oneCell">${from}${to}<mc:AlternateContent xmlns:mc="${MC}"><mc:Choice xmlns:sle15="http://schemas.microsoft.com/office/drawing/2012/slicer" Requires="sle15">` +
    `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id}" name="${nome}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/drawing/2010/slicer"><sle:slicer xmlns:sle="http://schemas.microsoft.com/office/drawing/2010/slicer" name="${nome}"/></a:graphicData></a:graphic></xdr:graphicFrame>` +
    `</mc:Choice><mc:Fallback><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="0" name=""/><xdr:cNvSpPr><a:spLocks noTextEdit="1"/></xdr:cNvSpPr></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.round(s.w * EMU)}" cy="${Math.round(s.h * EMU)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:prstClr val="white"/></a:solidFill><a:ln w="1"><a:solidFill><a:prstClr val="green"/></a:solidFill></a:ln></xdr:spPr>` +
    `<xdr:txBody><a:bodyPr vertOverflow="clip" horzOverflow="clip"/><a:lstStyle/><a:p><a:r><a:rPr lang="pt-BR" sz="1100"/><a:t>Esta forma representa uma segmentação de dados de tabela. Ela precisa do Excel 2013 ou mais novo.</a:t></a:r></a:p></xdr:txBody></xdr:sp></mc:Fallback></mc:AlternateContent><xdr:clientData/></xdr:twoCellAnchor>`;
}

/** Elemento <slicer> da parte xl/slicers/… */
export const elementoDaSeg = (s, cache) => `<slicer name="${escAtr(s.nome)}" cache="${escAtr(cache)}" caption="${escAtr(s.titulo != null ? s.titulo : s.nome)}"${s.cols > 1 ? ` columnCount="${s.cols}"` : ''}${s.semTitulo ? ' showCaption="0"' : ''} rowHeight="${Math.round((s.alt || 25) * EMU)}"/>`;

/**
 * arquivos = partes montadas [{ nome, dados }]; abas = abas na ordem gravada (a aba i em xl/worksheets/sheet{i+1}.xml);
 * tabelas = c.tabelas (a chave da segmentação, s.tab, é a chave de lá).
 */
export function gravarSegsNovas(arquivos, abas, tabelas, { vivas = null } = {}) {
  const res = { gravadas: 0, fora: [], semSetas: [], repetidas: [] };
  /* vivas = abas cujas segmentações o guardar e devolver pôs de volta; nas outras (ou sem o original), as que vieram do Excel também vão por aqui */
  const todas = (ia) => !vivas || !vivas.has(ia);
  const novas = abas.map((aba, ia) => ({ aba, ia, lista: ((aba && aba.seg) || []).filter((s) => s && (s.novo || todas(ia))) })).filter((x) => x.lista.length);
  if (!novas.length) return res;
  const por = new Map(arquivos.map((a) => [a.nome, a]));
  const txt = (n) => (por.has(n) ? String(por.get(n).dados) : null);
  const guardar = (nome, dados) => { if (por.has(nome)) por.get(nome).dados = dados; else { const a = { nome, dados }; arquivos.push(a); por.set(nome, a); } };
  const livre = (molde) => { let i = 1; while (por.has(molde(i))) i++; return molde(i); };
  const overrides = [];
  const maisRel = (parte, tipo, alvo) => {
    const nome = relsDe(parte); let x = (txt(nome) || `${XML_CAB}<Relationships xmlns="${REL_PKG}"></Relationships>`).replace(/<Relationships\b([^>]*?)\s*\/>/, '<Relationships$1></Relationships>'); /* revisor: a forma que fecha em si */
    const usados = new Set([...x.matchAll(/\bId="([^"]*)"/g)].map((m) => m[1])); let k = 1; while (usados.has(`rIdSg${k}`)) k++;
    const id = `rIdSg${k}`;
    x = x.replace('</Relationships>', `<Relationship Id="${id}" Type="${tipo}" Target="${escAtr(relativo(parte, alvo))}"/></Relationships>`);
    guardar(nome, x); return id;
  };

  /* tabelas gravadas: nome (sem caixa) → { id, colunas: nome → id } */
  const tabs = new Map();
  for (const [n, a] of por) {
    if (!/^xl\/tables\/[^/]+\.xml$/.test(n)) continue;
    const x = String(a.dados), t = /<table\b([^>]*)>/.exec(x); if (!t) continue;
    const cols = new Map(); for (const m of x.matchAll(/<tableColumn\b([^>]*?)\/?>/g)) cols.set(nomeCol(atr(m[1], 'name') || '').toLowerCase(), atr(m[1], 'id'));
    tabs.set(desXml(atr(t[1], 'displayName') || atr(t[1], 'name') || '').toLowerCase(), { id: atr(t[1], 'id'), cols, temFiltro: /<autoFilter\b/.test(x) });
  }
  /* nomes já usados no livro (nomes definidos e memórias que voltaram do original) */
  let wx = txt('xl/workbook.xml'); if (!wx) return res;
  wx = wx.replace(/<definedNames\s*\/>/, ''); /* revisor: <definedNames/> vazio não pode virar dois */
  { /* nome #N/A de memória de segmentação (Segmenta…/Slicer_…) sem a memória no arquivo (apagada, ou refeita por aqui): sai */
    const vivos = new Set(); for (const [n, a] of por) if (/^xl\/slicerCaches\//.test(n)) { const m = /<(?:\w+:)?slicerCacheDefinition\b[^>]*?\bname="([^"]*)"/.exec(String(a.dados)); if (m) vivos.add(m[1]); }
    wx = wx.replace(/<definedName\b[^>]*?\bname="((?:Segmenta|Slicer_)[^"]*)"[^>]*>#N\/A<\/definedName>/g, (m, n) => (vivos.has(n) ? m : '')).replace(/<definedNames>\s*<\/definedNames>/, '');
  }
  guardar('xl/workbook.xml', wx);
  const usados = new Set([...wx.matchAll(/<definedName\b[^>]*\bname="([^"]*)"/g)].map((m) => desXml(m[1]).toLowerCase()));
  for (const [n, a] of por) if (/^xl\/slicerCaches\//.test(n)) { const m = /<(?:\w+:)?slicerCacheDefinition\b[^>]*?\bname="([^"]*)"/.exec(String(a.dados)); if (m) usados.add(desXml(m[1]).toLowerCase()); }
  for (const k of tabs.keys()) usados.add(k); /* os nomes definidos dividem o espaço com os nomes das tabelas */

  /* nomes de segmentação que já estão no arquivo (voltaram do original): nome repetido no livro faz o Excel reparar */
  const nomesSeg = new Set(); for (const [n, a] of por) if (/^xl\/slicers\/[^/]+\.xml$/.test(n)) for (const m of String(a.dados).matchAll(/<(?:\w+:)?slicer\b[^>]*?\bname="([^"]*)"/g)) nomesSeg.add(desXml(m[1]).toLowerCase());
  const memorias = new Map(); /* "tabela|coluna" → nome da memória (duas segmentações da mesma coluna dividem a memória, como no Excel) */
  const ridsCache = [];
  for (const { aba, ia, lista } of novas) {
    const parteAba = `xl/worksheets/sheet${ia + 1}.xml`; let gx = txt(parteAba);
    if (!gx || !/<worksheet\b/.test(gx)) { res.fora.push(...lista.map((s) => s.nome)); continue; }
    const elementos = [], blocos = [];
    for (const s of lista) {
      const t = tabelas && tabelas[s.tab], tb = t && tabs.get(String(t.nome || '').toLowerCase()), col = tb && tb.cols.get(String(s.cn || '').toLowerCase());
      if (!tb || !col || !t.cab) { res.fora.push(s.nome); continue; }
      if (nomesSeg.has(String(s.nome).toLowerCase())) { res.repetidas.push(s.nome); continue; }
      nomesSeg.add(String(s.nome).toLowerCase());
      if (!tb.temFiltro) { res.semSetas.push(s.nome); continue; } /* revisor (I3): a escolha da segmentação de tabela fica no filtro da tabela; sem ele, não se garante no Excel */
      const chave = `${tb.id}|${col}`;
      let cache = memorias.get(chave);
      if (!cache) {
        cache = nomeDaMemoria(s.cn, usados); memorias.set(chave, cache);
        const parte = livre((i) => `xl/slicerCaches/slicerCacheApp${i}.xml`);
        guardar(parte, `${XML_CAB}<slicerCacheDefinition xmlns="${X14}" xmlns:mc="${MC}" mc:Ignorable="x" xmlns:x="${NS}" name="${escAtr(cache)}" sourceName="${escAtr(s.cn)}"><extLst><x:ext xmlns:x15="${X15}" uri="${U_TAB}"><x15:tableSlicerCache tableId="${tb.id}" column="${col}"/></x:ext></extLst></slicerCacheDefinition>`);
        overrides.push([parte, CT_CACHE]); ridsCache.push(maisRel('xl/workbook.xml', T_CACHE, parte));
      }
      elementos.push(elementoDaSeg(s, cache)); blocos.push(s); res.gravadas++;
    }
    if (!elementos.length) continue;
    /* a parte de segmentações da aba: junta na que já existe (voltou do original) ou cria uma */
    const rels = lerRels(txt(relsDe(parteAba)), parteAba);
    const listaTab = (/<ext\b[^>]*uri="\{3A4CF648-6AED-40f4-86FF-DC5316D8AED3\}"[^>]*>[\s\S]*?<\/ext>/.exec(gx) || [''])[0];
    const jaTem = rels.find((r) => r.tipo === T_SLICER && por.has(r.alvo) && listaTab.includes(`r:id="${r.id}"`)); /* revisor (I1): só a parte das de tabela, nunca a das de tabela dinâmica */
    if (jaTem) guardar(jaTem.alvo, txt(jaTem.alvo).replace(/<\/((?:\w+:)?slicers)>\s*$/, (m, tg) => (tg.includes(':') ? elementos.map((e) => e.replace(/^<slicer\b/, `<${tg.split(':')[0]}:slicer`)).join('') : elementos.join('')) + m));
    else {
      const parte = livre((i) => `xl/slicers/slicerApp${i}.xml`);
      guardar(parte, `${XML_CAB}<slicers xmlns="${X14}" xmlns:mc="${MC}" mc:Ignorable="x" xmlns:x="${NS}">${elementos.join('')}</slicers>`);
      overrides.push([parte, CT_SLICER]);
      const rid = maisRel(parteAba, T_SLICER, parte);
      const lista = `<x14:slicer r:id="${rid}"/>`;
      if (!/xmlns:r="/.test((/<worksheet\b[^>]*>/.exec(gx) || [''])[0])) gx = gx.replace(/<worksheet\b/, `<worksheet xmlns:r="${REL.slice(0, -1)}"`);
      const ext = new RegExp(`<ext\\b[^>]*uri="${U_LISTA.replace(/[{}]/g, '\\$&')}"[^>]*>[\\s\\S]*?</ext>`).exec(gx);
      if (ext && /<\/x14:slicerList>/.test(ext[0])) gx = gx.replace(ext[0], ext[0].replace('</x14:slicerList>', lista + '</x14:slicerList>'));
      else {
        const novo = `<ext uri="${U_LISTA}" xmlns:x15="${X15}"><x14:slicerList xmlns:x14="${X14}">${lista}</x14:slicerList></ext>`;
        gx = noExtLst(gx, 'worksheet', novo); /* revisor (B1): só o extLst da raiz */
      }
    }
    /* o desenho da aba: junta no que existe ou cria um */
    const relsAgora = lerRels(txt(relsDe(parteAba)), parteAba);
    const rd = relsAgora.find((r) => /\/drawing$/.test(r.tipo) && gx.includes(`<drawing r:id="${r.id}"`));
    let pd;
    if (rd) { pd = rd.alvo; if (!por.has(pd)) { guardar(pd, `${XML_CAB}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"></xdr:wsDr>`); overrides.push([pd, CT_DESENHO]); } } /* revisor (B4): a aba só pode ter um <drawing> */
    else if (/<drawing\b/.test(gx)) throw new Error('a aba tem um desenho sem relação');
    else {
      pd = livre((i) => (i === 1 ? `xl/drawings/drawing${ia + 1}.xml` : `xl/drawings/drawingApp${ia + 1}_${i}.xml`));
      guardar(pd, `${XML_CAB}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"></xdr:wsDr>`);
      overrides.push([pd, CT_DESENHO]);
      const rid = maisRel(parteAba, REL + 'drawing', pd);
      if (!/xmlns:r="/.test((/<worksheet\b[^>]*>/.exec(gx) || [''])[0])) gx = gx.replace(/<worksheet\b/, `<worksheet xmlns:r="${REL.slice(0, -1)}"`);
      gx = noFim(gx, `<drawing r:id="${rid}"/>`, true);
    }
    let d = txt(pd);
    let prox = Math.max(1, ...[...d.matchAll(/<(?:\w+:)?cNvPr\b[^>]*?\bid="(\d+)"/g)].map((m) => +m[1])) + 1;
    const junto = blocos.map((s) => ancoraDaSeg(aba, s, prox++)).join(''); /* cada bloco declara xdr e a (revisor, I2) */
    const fecha = /<\/((?:\w+:)?wsDr)>\s*$/.exec(d), soAbre = /<((?:\w+:)?wsDr)\b([^>]*?)\s*\/>\s*$/.exec(d);
    if (fecha) d = d.slice(0, fecha.index) + junto + d.slice(fecha.index);
    else if (soAbre) d = d.slice(0, soAbre.index) + `<${soAbre[1]}${soAbre[2]}>${junto}</${soAbre[1]}>`;
    else throw new Error('desenho da aba sem a raiz wsDr');
    guardar(pd, d);
    guardar(parteAba, gx);
  }
  if (!ridsCache.length && !res.gravadas) return res;

  /* o livro: a lista das memórias (x15:slicerCaches) e o nome definido de cada memória */
  wx = txt('xl/workbook.xml');
  if (ridsCache.length) {
    if (!/xmlns:r="/.test((/<workbook\b[^>]*>/.exec(wx) || [''])[0])) wx = wx.replace(/<workbook\b/, `<workbook xmlns:r="${REL.slice(0, -1)}"`);
    const itens = ridsCache.map((r) => `<x14:slicerCache r:id="${r}"/>`).join('');
    const er = extLstDaRaiz(wx, 'workbook'), dentro = er ? wx.slice(er[0], er[1]) : '';
    const ext = new RegExp(`<ext\\b[^>]*uri="${U_CACHES.replace(/[{}]/g, '\\$&')}"[^>]*>[\\s\\S]*?</ext>`).exec(dentro);
    if (ext && /<\/x15:slicerCaches>/.test(ext[0])) wx = wx.slice(0, er[0]) + dentro.replace(ext[0], ext[0].replace('</x15:slicerCaches>', itens + '</x15:slicerCaches>')) + wx.slice(er[1]);
    else wx = noExtLst(wx, 'workbook', `<ext uri="${U_CACHES}" xmlns:x15="${X15}"><x15:slicerCaches xmlns:x14="${X14}">${itens}</x15:slicerCaches></ext>`); /* revisor (B1): só o extLst da raiz */
    const dn = [...memorias.values()].map((n) => `<definedName name="${escAtr(n)}">#N/A</definedName>`).join('');
    if (/<definedNames>/.test(wx)) wx = wx.replace('</definedNames>', dn + '</definedNames>');
    else { const ini = Math.max(0, wx.indexOf('</sheets>')), i = ini + wx.slice(ini).search(/<calcPr\b|<oleSize\b|<customWorkbookViews\b|<pivotCaches\b|<smartTagPr\b|<smartTagTypes\b|<webPublishing\b|<fileRecoveryPr\b|<webPublishObjects\b|<extLst>|<\/workbook>/); wx = wx.slice(0, i) + `<definedNames>${dn}</definedNames>` + wx.slice(i); } /* depois de </sheets>: a janela do livro também pode ter extLst */
    guardar('xl/workbook.xml', wx);
  }
  /* tipos de conteúdo */
  let tx = txt('[Content_Types].xml');
  tx = tx.replace('</Types>', overrides.filter(([n]) => !tx.includes(`PartName="/${n}"`)).map(([n, ct]) => `<Override PartName="/${escAtr(n)}" ContentType="${ct}"/>`).join('') + '</Types>');
  guardar('[Content_Types].xml', tx);
  return res;
}
