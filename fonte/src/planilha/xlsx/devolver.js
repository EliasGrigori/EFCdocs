/* Vértice Docs v0.6.13 — "Guardar e devolver" (D-29).
   O app não edita macros, tabelas dinâmicas, segmentações de dados, linhas do tempo, botões e caixas de controle nem os
   suplementos. Mas o arquivo original do Excel fica guardado no aparelho (nucleo/originais.js, desde a v0.6.0). Ao salvar
   como Excel, estas partes são tiradas do original e postas de volta no arquivo novo, COMO VIERAM, com as ligações
   refeitas (relações, tipos de conteúdo, listas da aba e do livro, molduras no desenho).
   Regras:
   - só para arquivo aberto nesta versão ou depois (cada aba sabe de que parte do original veio: aba.org);
   - aba apagada no app leva junto o que era dela (a tabela dinâmica e as segmentações que dependiam dela);
   - nada é editado por dentro, a não ser os números que mudam de arquivo para arquivo (id da aba e da tabela);
   - a tabela dinâmica é marcada para se atualizar ao abrir no Excel (os dados podem ter mudado aqui).
   Recebe a lista de partes já montada por gravar.js e mexe nela. Ver docs/ARMADILHAS-EXCEL.md. */
import { lerZip } from './zip.js';
import { XML_CAB } from './xml.js';

const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
const REL_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const T_VBA = 'http://schemas.microsoft.com/office/2006/relationships/vbaProject';
const CT_VBA = 'application/vnd.ms-office.vbaProject';
const CT_XLSM = 'application/vnd.ms-excel.sheet.macroEnabled.main+xml';
const CT_DESENHO = 'application/vnd.openxmlformats-officedocument.drawing+xml';
const CT_VML = 'application/vnd.openxmlformats-officedocument.vmlDrawing';

/* tipo de conteúdo das figuras quando o original não declarou a extensão */
const TIPOS_FIGURA = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff', emf: 'image/x-emf', wmf: 'image/x-wmf', svg: 'image/svg+xml' };
const dirDe = (p) => p.slice(0, p.lastIndexOf('/') + 1);
const relsDe = (p) => dirDe(p) + '_rels/' + p.slice(p.lastIndexOf('/') + 1) + '.rels';
const desXml = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const escAtr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const atr = (s, n) => { const m = new RegExp(`(?:^|\\s)${n}="([^"]*)"`).exec(s); return m ? m[1] : null; };
function resolver(base, alvo) {
  if (alvo.startsWith('/')) return alvo.slice(1);
  const out = [];
  for (const s of (dirDe(base) + alvo).split('/')) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s); }
  return out.join('/');
}
/** caminho de `para` visto da pasta da parte `de` */
function relativo(de, para) {
  const a = dirDe(de).split('/').filter(Boolean), b = para.split('/');
  let i = 0; while (i < a.length && i < b.length - 1 && a[i] === b[i]) i++;
  return '../'.repeat(a.length - i) + b.slice(i).join('/');
}
const lerRelsXml = (x, parte) => {
  const out = [];
  for (const m of String(x || '').matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
    const id = atr(m[1], 'Id'), tipo = atr(m[1], 'Type'), alvo = atr(m[1], 'Target'), fora = atr(m[1], 'TargetMode') === 'External';
    if (id && tipo && alvo != null) out.push({ id, tipo, fora, alvo: fora ? desXml(alvo) : resolver(parte, desXml(alvo)) });
  }
  return out;
};
const fimTipo = (r, nome) => r.tipo.slice(r.tipo.lastIndexOf('/') + 1) === nome;

/** Prefixos usados num pedaço de XML que não são declarados nele ganham a declaração da raiz do original. */
function comNs(pedaco, raizXml, jaTem = '') {
  const abre = /^<([\w:]+)([^>]*)>/.exec(pedaco); if (!abre) return pedaco;
  const usados = new Set(); for (const m of pedaco.matchAll(/[<\s/]([A-Za-z_][\w.-]*):[A-Za-z_]/g)) usados.add(m[1]);
  /* v0.6.14 (D-50): o prefixo em Requires="x14" (e em Ignorable) também precisa estar declarado; sem isso o Excel pede reparo e
     apaga a aba (achado no arquivo real do Elias: o bloco dos botões ia sem xmlns:x14) */
  for (const m of pedaco.matchAll(/\b(?:Requires|mc:Ignorable|mc:ProcessContent)="([^"]*)"/g)) for (const p of m[1].split(/\s+/)) if (p) usados.add(p.split(':')[0]);
  let extra = '';
  for (const p of usados) {
    if (p === 'xml' || p === 'xmlns' || new RegExp(`xmlns:${p}=`).test(pedaco) || new RegExp(`xmlns:${p}=`).test(jaTem)) continue;
    const d = new RegExp(`xmlns:${p}="([^"]*)"`).exec(raizXml); if (d) extra += ` xmlns:${p}="${d[1]}"`;
  }
  return extra ? `<${abre[1]}${abre[2].replace(/\/$/, '')}${extra}${abre[2].endsWith('/') ? '/' : ''}>` + pedaco.slice(abre[0].length) : pedaco;
}
const raizDe = (x) => (/<[A-Za-z_][\w:.-]*\b[^>]*>/.exec(String(x).replace(/^<\?xml[^>]*\?>\s*/, '')) || [''])[0];

/** Segmentação ou linha do tempo que estava dentro de um grupo: posição e tamanho dela na aba (EMU), pelas contas do grupo. */
function soltarDoGrupo(ancora) {
  const out = [];
  const num = (s, n) => +(atr(s, n) || 0);
  const andar = (xml, T) => {
    /* filhos diretos de um grupo: percorre na ordem, descendo nos grupos */
    let i = 0;
    while (i < xml.length) {
      const m = /<(xdr:grpSp|mc:AlternateContent|xdr:graphicFrame|xdr:sp|xdr:pic|xdr:cxnSp)\b/.exec(xml.slice(i)); if (!m) break;
      const ini = i + m.index, nome = m[1];
      let prof = 0, j = ini; const rx = new RegExp(`<${nome}\\b[^>]*?(/?)>|</${nome}>`, 'g'); rx.lastIndex = ini; let q;
      while ((q = rx.exec(xml))) { if (q[0].startsWith('</')) prof--; else if (q[1] !== '/') prof++; if (!prof) { j = rx.lastIndex; break; } }
      if (j <= ini) break;
      const bloco = xml.slice(ini, j);
      if (nome === 'xdr:grpSp') {
        const pr = /<xdr:grpSpPr\b[\s\S]*?<\/xdr:grpSpPr>/.exec(bloco); const xf = pr && /<a:xfrm\b[\s\S]*?<\/a:xfrm>/.exec(pr[0]);
        const g = (t) => { const e = xf && new RegExp(`<a:${t}\\b([^>]*)/?>`).exec(xf[0]); return e ? e[1] : ''; };
        const off = g('off'), ext = g('ext'), ch = g('chOff') || off, ce = g('chExt') || ext;
        const kx = num(ce, 'cx') ? num(ext, 'cx') / num(ce, 'cx') : 1, ky = num(ce, 'cy') ? num(ext, 'cy') / num(ce, 'cy') : 1;
        const Tn = { ax: T.ax * kx, bx: T.ax * (num(off, 'x') - num(ch, 'x') * kx) + T.bx, ay: T.ay * ky, by: T.ay * (num(off, 'y') - num(ch, 'y') * ky) + T.by };
        const dentro = bloco.slice(bloco.indexOf('>') + 1, bloco.lastIndexOf('</xdr:grpSp>'));
        andar(pr ? dentro.replace(pr[0], '') : dentro, Tn);
      } else if ((nome === 'mc:AlternateContent' || nome === 'xdr:graphicFrame') && /<(?:sle:slicer|tsle:timeslicer)\b/.test(bloco)) {
        const xf = /<xdr:xfrm\b[\s\S]*?<\/xdr:xfrm>/.exec(bloco);
        const off = xf ? (/<a:off\b([^>]*)\/?>/.exec(xf[0]) || [])[1] || '' : '', ext = xf ? (/<a:ext\b([^>]*)\/?>/.exec(xf[0]) || [])[1] || '' : '';
        out.push({ bloco, x: Math.round(num(off, 'x') * T.ax + T.bx), y: Math.round(num(off, 'y') * T.ay + T.by), cx: Math.round(num(ext, 'cx') * T.ax), cy: Math.round(num(ext, 'cy') * T.ay) });
      }
      i = j;
    }
  };
  andar(ancora, { ax: 1, bx: 0, ay: 1, by: 0 });
  return out;
}

/** Tira de um XML os elementos <nome .../> ou <nome ...>...</nome> em que `fica(atributos)` diz que não. Devolve [xml, quantos ficaram]. */
function filtrar(xml, nome, fica) {
  let n = 0;
  const s = xml.replace(new RegExp(`<${nome}\\b((?:[^>"]|"[^"]*")*?)(/>|>[\\s\\S]*?</${nome}>)`, 'g'), (m, at) => { if (fica(at)) { n++; return m; } return ''; });
  return [s, n];
}

/**
 * Põe de volta nas `arquivos` (partes já montadas) o que o app não edita, tirado do arquivo original.
 * abas = [{ id, aba }] na ordem em que foram gravadas (a aba i está em xl/worksheets/sheet{i+1}.xml).
 * Devolve { macros, dinamicas, segmentacoes, linhasTempo, controles, suplementos, perdidos: [texto], soltas }.
 */
export async function devolver(arquivos, abas, bytesOriginal) {
  const res = { macros: false, dinamicas: 0, segmentacoes: 0, linhasTempo: 0, controles: 0, suplementos: 0, soltas: 0, perdidos: [] };
  let zip; try { zip = lerZip(bytesOriginal); } catch { return res; }
  const tem = new Set(zip.nomes);
  const por = new Map(arquivos.map((a) => [a.nome, a]));
  const texto = async (n) => (tem.has(n) ? zip.texto(n) : null);
  const tiposX = (await texto('[Content_Types].xml')) || '';
  const ctOrig = new Map(); for (const m of tiposX.matchAll(/<Override\b([^>]*?)\/?>/g)) { const p = atr(m[1], 'PartName'), ct = atr(m[1], 'ContentType'); if (p && ct) ctOrig.set(desXml(p).replace(/^\//, ''), ct); }
  const padraoOrig = new Map(); for (const m of tiposX.matchAll(/<Default\b([^>]*?)\/?>/g)) { const e = atr(m[1], 'Extension'), ct = atr(m[1], 'ContentType'); if (e && ct) padraoOrig.set(e.toLowerCase(), ct); }
  const novosOverrides = new Map(), novosPadroes = new Map();
  let nRel = 0; const novoId = () => `rIdDv${++nRel}`;

  /** acrescenta uma parte (texto ou bytes) com o tipo de conteúdo que ela tinha no original */
  const por1 = (nome, dados, ct) => {
    if (por.has(nome)) { por.get(nome).dados = dados; } else { const a = { nome, dados }; arquivos.push(a); por.set(nome, a); }
    const ext = nome.slice(nome.lastIndexOf('.') + 1).toLowerCase();
    const tipo = ct || ctOrig.get(nome);
    if (tipo) novosOverrides.set(nome, tipo); else if (padraoOrig.has(ext)) novosPadroes.set(ext, padraoOrig.get(ext)); else if (TIPOS_FIGURA[ext]) novosPadroes.set(ext, TIPOS_FIGURA[ext]);
  };
  const copiar = async (nome, comRels = false) => {
    if (!tem.has(nome)) return false;
    if (!por.has(nome)) por1(nome, /\.(xml|vml|rels)$/i.test(nome) ? await zip.texto(nome) : await zip.bytes(nome));
    if (comRels && tem.has(relsDe(nome)) && !por.has(relsDe(nome))) por1(relsDe(nome), await zip.texto(relsDe(nome)));
    return true;
  };
  /** acrescenta relações ao arquivo de relações de uma parte gerada (cria se não existe) */
  const maisRels = (parte, lista) => {
    if (!lista.length) return;
    const nome = relsDe(parte);
    const xml = lista.map((r) => `<Relationship Id="${r.id}" Type="${r.tipo}" Target="${escAtr(r.fora ? r.alvo : relativo(parte, r.alvo))}"${r.fora ? ' TargetMode="External"' : ''}/>`).join('');
    const a = por.get(nome);
    if (a) a.dados = String(a.dados).replace('</Relationships>', xml + '</Relationships>');
    else { const n = { nome, dados: `${XML_CAB}<Relationships xmlns="${REL_PKG}">${xml}</Relationships>` }; arquivos.push(n); por.set(nome, n); }
  };

  /* ---------- o livro original ---------- */
  const relsRaiz = lerRelsXml(await texto('_rels/.rels'), '');
  const pWb = (relsRaiz.find((r) => fimTipo(r, 'officeDocument')) || {}).alvo || 'xl/workbook.xml';
  const wbO = await texto(pWb); if (!wbO) return res;
  const relsWbO = lerRelsXml(await texto(relsDe(pWb)), pWb);
  const folhasO = new Map(); /* parte → { sheetId, nome } */
  for (const m of wbO.matchAll(/<sheet\b([^>]*?)\/?>/g)) { const r = relsWbO.find((x) => x.id === atr(m[1], 'r:id')); if (r) folhasO.set(r.alvo, { sheetId: atr(m[1], 'sheetId'), nome: desXml(atr(m[1], 'name') || '') }); }
  /* abas que continuam: parte original → { ia, aba } */
  const vivas = new Map();
  abas.forEach(({ aba }, ia) => { if (aba && aba.org && folhasO.has(aba.org) && tem.has(aba.org) && !vivas.has(aba.org)) vivas.set(aba.org, { ia, aba }); });
  if (!vivas.size) return res;
  const tabId = new Map(); for (const [p, v] of vivas) tabId.set(folhasO.get(p).sheetId, String(v.ia + 1));
  const wbG = por.get('xl/workbook.xml'); const relsWbNovas = [];

  /* tabelas: id e colunas do original → as do arquivo novo, pelo nome (a segmentação de tabela aponta por número) */
  const tabelasPorNome = async (lista, ler) => { const m = new Map(); for (const n of lista) { const x = await ler(n); const t = /<table\b([^>]*)>/.exec(x || ''); if (!t) continue; const cols = new Map(); for (const c of x.matchAll(/<tableColumn\b([^>]*?)\/?>/g)) cols.set(desXml(atr(c[1], 'name') || ''), atr(c[1], 'id')); m.set(atr(t[1], 'displayName') || atr(t[1], 'name'), { id: atr(t[1], 'id'), cols }); } return m; };
  const tabO = await tabelasPorNome(zip.nomes.filter((n) => /^xl\/tables\/[^/]+\.xml$/.test(n)), texto);
  const tabG = await tabelasPorNome([...por.keys()].filter((n) => /^xl\/tables\/[^/]+\.xml$/.test(n)), async (n) => String(por.get(n).dados));
  const tabelaNova = (idVelho, colVelha) => { for (const [nome, o] of tabO) { if (o.id !== idVelho) continue; const g = tabG.get(nome); if (!g) return null; let col = null; if (colVelha != null) { for (const [cn, cid] of o.cols) if (cid === colVelha) col = g.cols.get(cn) || null; if (!col) return null; } return { id: g.id, col }; } return null; };

  /* ---------- 1. o que cada aba viva tem ---------- */
  const porAba = [];
  const dinamicasVivas = new Set(); /* "idNovoDaAba|nome da tabela dinâmica" */
  const cachesUsados = new Set();
  for (const [parte, { ia, aba }] of vivas) {
    const sx = await texto(parte); const sr = lerRelsXml(await texto(relsDe(parte)), parte);
    const item = { parte, ia, aba, sx, sr, dinamicas: [] };
    for (const r of sr.filter((x) => fimTipo(x, 'pivotTable'))) {
      const px = await texto(r.alvo); if (!px) continue;
      const def = lerRelsXml(await texto(relsDe(r.alvo)), r.alvo).find((x) => fimTipo(x, 'pivotCacheDefinition'));
      if (!def || !tem.has(def.alvo)) continue;
      item.dinamicas.push({ parte: r.alvo, def: def.alvo });
      cachesUsados.add(def.alvo);
      dinamicasVivas.add(`${ia + 1}|${desXml(atr((/<pivotTableDefinition\b([^>]*)>/.exec(px) || ['', ''])[1], 'name') || '')}`);
    }
    porAba.push(item);
  }

  /* segmentações e linhas do tempo que aparecem em alguma aba viva (memória sem nenhuma vista não volta) */
  const comVista = new Set();
  for (const it of porAba) for (const r of it.sr.filter((x) => fimTipo(x, 'slicer') || fimTipo(x, 'timeline'))) for (const m of String((await texto(r.alvo)) || '').matchAll(/<(?:\w+:)?(?:slicer|timeline)\b[^>]*?\bcache="([^"]*)"/g)) comVista.add(desXml(m[1]));
  /* nome das abas: o do original → o de agora (a fonte da tabela dinâmica aponta pelo nome) */
  const nomeAgora = new Map(); for (const [p, v] of vivas) nomeAgora.set(folhasO.get(p).nome, v.aba.nome);
  const nomesOrig = new Set([...folhasO.values()].map((f) => f.nome));

  /* ---------- 2. memórias (caches) do livro: tabela dinâmica, segmentação e linha do tempo ---------- */
  const pivotCaches = [];
  for (const m of wbO.matchAll(/<pivotCache\b([^>]*?)\/?>/g)) {
    const r = relsWbO.find((x) => x.id === atr(m[1], 'r:id')); if (!r || !cachesUsados.has(r.alvo)) continue;
    let dx = await texto(r.alvo); if (!dx) continue;
    /* a fonte é uma faixa de outra aba: segue o nome novo dela; se a aba foi apagada, a tabela dinâmica fica com os dados guardados */
    let semFonte = false;
    dx = dx.replace(/<worksheetSource\b([^>]*?)\bsheet="([^"]*)"/, (mm, at, v) => { const n = desXml(v); if (!nomesOrig.has(n)) return mm; if (!nomeAgora.has(n)) { semFonte = true; return mm; } return `<worksheetSource${at}sheet="${escAtr(nomeAgora.get(n))}"`; });
    /* ou é uma tabela do Excel (ou um nome): tem de existir no arquivo novo */
    const fn = /<worksheetSource\b[^>]*?\bname="([^"]*)"/.exec(dx);
    if (fn && !tabG.has(desXml(fn[1])) && !new RegExp(`<definedName\\b[^>]*\\bname="${fn[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(String(wbG.dados))) semFonte = true;
    if (semFonte) res.semFonte = (res.semFonte || 0) + 1;
    /* o Excel refaz a tabela dinâmica ao abrir (os dados podem ter mudado aqui) */
    else dx = dx.replace(/<pivotCacheDefinition\b([^>]*)>/, (mm, at) => (/\srefreshOnLoad=/.test(at) ? mm : `<pivotCacheDefinition${at} refreshOnLoad="1">`));
    por1(r.alvo, dx);
    const rr = lerRelsXml(await texto(relsDe(r.alvo)), r.alvo);
    for (const x of rr) if (!x.fora) await copiar(x.alvo);
    await copiar(relsDe(r.alvo));
    const id = novoId(); relsWbNovas.push({ id, tipo: r.tipo, alvo: r.alvo });
    pivotCaches.push(`<pivotCache cacheId="${atr(m[1], 'cacheId')}" r:id="${id}"/>`);
  }
  /* segmentações e linhas do tempo: a memória fica se ainda tem de quem depender */
  const cachesVivos = new Map(); /* nome → { rid velho → novo } */ const ridCache = new Map();
  const nomesDeCache = [];
  for (const r of relsWbO.filter((x) => fimTipo(x, 'slicerCache') || fimTipo(x, 'timelineCache'))) {
    let cx = await texto(r.alvo); if (!cx) continue;
    const raiz = /<(?:\w+:)?(slicerCacheDefinition|timelineCacheDefinition)\b([^>]*)>/.exec(cx); if (!raiz) continue;
    const nome = desXml(atr(raiz[2], 'name') || '');
    let vive = true;
    if (/<(?:\w+:)?pivotTables\b/.test(cx)) {
      let n = 0;
      cx = cx.replace(/<((?:\w+:)?pivotTable)\b([^>]*?)\/>/g, (m, tg, at) => { const novo = tabId.get(atr(at, 'tabId')); if (!novo || !dinamicasVivas.has(`${novo}|${desXml(atr(at, 'name') || '')}`)) return ''; n++; return `<${tg}${at.replace(/(\s)tabId="[^"]*"/, `$1tabId="${novo}"`)}/>`; });
      vive = n > 0;
    }
    const ts = /<((?:\w+:)?tableSlicerCache)\b([^>]*?)(\/?)>/.exec(cx);
    if (ts) { const nv = tabelaNova(atr(ts[2], 'tableId'), atr(ts[2], 'column')); if (!nv) vive = false; else cx = cx.replace(ts[0], `<${ts[1]}${ts[2].replace(/(\s)tableId="[^"]*"/, `$1tableId="${nv.id}"`).replace(/(\s)column="[^"]*"/, `$1column="${nv.col}"`)}${ts[3]}>`); }
    if (vive && !comVista.has(nome)) vive = false;
    if (!vive) { res.perdidos.push({ nome, tipo: raiz[1] === 'timelineCacheDefinition' ? 'linha do tempo' : 'segmentação' }); continue; }
    por1(r.alvo, cx); await copiar(relsDe(r.alvo));
    const id = novoId(); relsWbNovas.push({ id, tipo: r.tipo, alvo: r.alvo }); ridCache.set(r.id, id);
    cachesVivos.set(nome, true); nomesDeCache.push(nome);
  }

  /* ---------- 3. cada aba: tabelas dinâmicas, segmentações, linhas do tempo, controles, molduras do desenho ---------- */
  for (const it of porAba) {
    const nomeG = `xl/worksheets/sheet${it.ia + 1}.xml`; const g = por.get(nomeG); if (!g) continue;
    let gx = String(g.dados); const relsNovas = []; const { sx, sr } = it;
    const raizO = raizDe(sx);
    const novaRel = (r) => { const id = novoId(); relsNovas.push({ id, tipo: r.tipo, alvo: r.alvo, fora: r.fora }); return id; };
    for (const d of it.dinamicas) { await copiar(d.parte, true); novaRel({ tipo: REL + 'pivotTable', alvo: d.parte }); res.dinamicas++; }
    /* segmentações e linhas do tempo da aba: ficam as que ainda têm memória */
    const ridNovo = new Map(); const nomesVivos = new Set();
    for (const r of sr.filter((x) => fimTipo(x, 'slicer') || fimTipo(x, 'timeline'))) {
      const px = await texto(r.alvo); if (!px) continue;
      const ehTempo = fimTipo(r, 'timeline');
      const [fx, n] = filtrar(px, ehTempo ? '(?:\\w+:)?timeline' : '(?:\\w+:)?slicer', (at) => { const ok = cachesVivos.has(desXml(atr(at, 'cache') || '')); if (ok) nomesVivos.add(desXml(atr(at, 'name') || '')); return ok; });
      if (!n) continue;
      por1(r.alvo, fx); ridNovo.set(r.id, novaRel(r));
      if (ehTempo) res.linhasTempo += n; else res.segmentacoes += n;
    }
    /* listas da aba (extLst): os blocos de segmentação e de linha do tempo, com as relações novas */
    const exts = [];
    for (const m of ((/<extLst>([\s\S]*)<\/extLst>\s*<\/worksheet>/.exec(sx) || [])[1] || '').matchAll(/<ext\b[^>]*>[\s\S]*?<\/ext>/g)) {
      if (!/slicerList|timelineRefs/.test(m[0])) continue;
      const [e, n] = filtrar(m[0], '(?:\\w+:)?(?:slicer|timelineRef)', (at) => ridNovo.has(atr(at, 'r:id')));
      if (n) exts.push(comNs(e.replace(/\br:id="([^"]*)"/g, (q, v) => `r:id="${ridNovo.get(v)}"`), raizO, raizDe(gx)));
    }
    /* botões e caixas de controle: o bloco <controls>, as propriedades e as formas no desenho antigo (VML) */
    let controles = '';
    const cb = /(?:<mc:AlternateContent\b[^>]*>\s*<mc:Choice\b[^>]*>\s*)?<controls>[\s\S]*?<\/controls>(?:\s*<\/mc:Choice>[\s\S]*?<\/mc:AlternateContent>)?/.exec(sx);
    const lg = /<legacyDrawing\b[^>]*\br:id="([^"]*)"/.exec(sx); const vmlO = lg && sr.find((x) => x.id === lg[1]);
    const vmlX = vmlO ? await texto(vmlO.alvo) : null;
    const formasCtl = vmlX ? [...vmlX.matchAll(/<v:shape\b[\s\S]*?<\/v:shape>/g)].map((m) => m[0]).filter((s) => /<x:ClientData\b/.test(s) && !/ObjectType="Note"/.test(s)) : [];
    if (cb && formasCtl.length) {
      const ridCtl = new Map(); let ok = true;
      for (const m of cb[0].matchAll(/\br:id="([^"]*)"/g)) {
        if (ridCtl.has(m[1])) continue;
        const r = sr.find((x) => x.id === m[1]); if (!r || r.fora || !(await copiar(r.alvo, true))) { ok = false; break; }
        ridCtl.set(m[1], novaRel(r));
      }
      if (ok) {
        controles = comNs(cb[0].replace(/\br:id="([^"]*)"/g, (q, v) => `r:id="${ridCtl.get(v)}"`), raizO, raizDe(gx));
        res.controles += new Set([...cb[0].matchAll(/\bshapeId="(\d+)"/g)].map((m) => m[1])).size;
        /* o desenho antigo: junto com as anotações do app, ou sozinho */
        const tiposForma = [...vmlX.matchAll(/<v:shapetype\b[\s\S]*?<\/v:shapetype>/g)].map((m) => m[0]);
        const blocos = new Set(formasCtl.map((s) => Math.floor(+(/\bid="_x0000_s(\d+)"/.exec(s) || [0, 1025])[1] / 1024)));
        const gl = /<legacyDrawing\b[^>]*\br:id="([^"]*)"/.exec(gx);
        const relsG = lerRelsXml(por.has(relsDe(nomeG)) ? String(por.get(relsDe(nomeG)).dados) : '', nomeG);
        const vmlG = gl && relsG.find((x) => x.id === gl[1]) ? por.get(relsG.find((x) => x.id === gl[1]).alvo) : null;
        let alvoVml;
        if (vmlG) {
          /* as anotações do app mudam para um bloco de números que os controles não usam */
          let livre = 1; while (blocos.has(livre)) livre++;
          let v = String(vmlG.dados).replace(/_x0000_s(\d+)/g, (q, n) => `_x0000_s${livre * 1024 + (+n % 1024)}`);
          const temTipo = (t) => new RegExp(`<v:shapetype\\b[^>]*\\bid="${(/\bid="([^"]*)"/.exec(t) || [])[1]}"`).test(v);
          v = v.replace(/<o:idmap\b[^>]*\/>/, `<o:idmap v:ext="edit" data="${[...blocos, livre].sort((a, b) => a - b).join(',')}"/>`).replace(/<\/xml>\s*$/, tiposForma.filter((t) => !temTipo(t)).join('') + formasCtl.join('') + '</xml>');
          vmlG.dados = v; alvoVml = vmlG.nome;
        } else {
          alvoVml = `xl/drawings/vmlDrawingDv${it.ia + 1}.vml`;
          const cab = (/^[\s\S]*?<\/o:shapelayout>/.exec(vmlX) || [(/^[\s\S]*?<xml\b[^>]*>/.exec(vmlX) || ['<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">'])[0]])[0];
          por1(alvoVml, cab + tiposForma.join('') + formasCtl.join('') + '</xml>'); novosPadroes.set('vml', CT_VML);
          gx = noFim(gx, `<legacyDrawing r:id="${novaRel({ tipo: REL + 'vmlDrawing', alvo: alvoVml })}"/>`);
        }
        /* imagens das formas (botão com figura): as relações do desenho antigo vão junto */
        const usadas = new Set(formasCtl.flatMap((s) => [...s.matchAll(/\bo:relid="([^"]*)"/g)].map((m) => m[1])));
        if (usadas.size) { const rv = lerRelsXml(await texto(relsDe(vmlO.alvo)), vmlO.alvo).filter((x) => usadas.has(x.id)); for (const x of rv) if (!x.fora) await copiar(x.alvo); maisRels(alvoVml, rv); }
      }
    }
    /* macro: o módulo da aba se liga pelo nome de código */
    it.codigo = atr((/<sheetPr\b([^>]*)>/.exec(sx) || ['', ''])[1], 'codeName');

    /* molduras no desenho: segmentações e linhas do tempo (soltas ou em grupo) e as formas-gêmeas dos controles */
    const dr = sr.find((x) => fimTipo(x, 'drawing')); const dx = dr ? await texto(dr.alvo) : null;
    const blocosD = []; const relsDO = dx ? lerRelsXml(await texto(relsDe(dr.alvo)), dr.alvo) : [];
    if (dx) {
      const semGemeas = dx.replace(/<mc:AlternateContent\b[^>]*>\s*<mc:Choice\b[^>]*>\s*<xdr:(twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[\s\S]*?<\/xdr:\1>\s*<\/mc:Choice>[\s\S]*?<\/mc:AlternateContent>/g, (b) => { if (controles && /<a14:compatExt\b/.test(b)) blocosD.push(b); else if (/<(?:sle:slicer|tsle:timeslicer)\b/.test(b) && nomesVivos.has(desXml(atr((/<(?:sle:slicer|tsle:timeslicer)\b([^>]*?)\/?>/.exec(b) || ['', ''])[1], 'name') || ''))) blocosD.push(b); return ''; }); /* segmentação com o AlternateContent por fora da âncora (outra forma que o arquivo pode ter) */
      let k = 0;
      for (const m of semGemeas.matchAll(/<xdr:(twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[\s\S]*?<\/xdr:\1>/g)) {
        const a = m[0]; if (!/<(?:sle:slicer|tsle:timeslicer)\b/.test(a)) continue;
        const nomeDe = (s) => desXml(atr((/<(?:sle:slicer|tsle:timeslicer)\b([^>]*?)\/?>/.exec(s) || ['', ''])[1], 'name') || '');
        const corpo = a.slice(a.indexOf('>') + 1).replace(/^\s*<xdr:from>[\s\S]*?<\/xdr:from>\s*(?:<xdr:to>[\s\S]*?<\/xdr:to>\s*)?|^\s*<xdr:pos\b[^>]*\/>\s*/, '').replace(/^\s*<xdr:ext\b[^>]*\/>\s*/, '');
        if (/^\s*<xdr:grpSp\b/.test(corpo)) {
          /* estava num grupo com formas: o grupo é do app; a segmentação volta solta, no mesmo lugar */
          for (const s of soltarDoGrupo(corpo)) { if (!nomesVivos.has(nomeDe(s.bloco))) continue; blocosD.push(`<xdr:absoluteAnchor><xdr:pos x="${s.x}" y="${s.y}"/><xdr:ext cx="${s.cx}" cy="${s.cy}"/>${s.bloco.replace(/(<xdr:cNvPr\b[^>]*?\bid=")\d+"/g, (q, p) => `${p}${60000 + ++k}"`)}<xdr:clientData/></xdr:absoluteAnchor>`); res.soltas++; }
        } else if (nomesVivos.has(nomeDe(a))) blocosD.push(a.replace(/(<xdr:cNvPr\b[^>]*?\bid=")\d+"/g, (q, p) => `${p}${60000 + ++k}"`));
      }
    }
    if (blocosD.length) {
      const nomeD = `xl/drawings/drawing${it.ia + 1}.xml`; let d = por.get(nomeD);
      if (!d) {
        por1(nomeD, `${XML_CAB}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${REL.slice(0, -1)}"></xdr:wsDr>`, CT_DESENHO);
        d = por.get(nomeD); gx = noFim(gx, `<drawing r:id="${novaRel({ tipo: REL + 'drawing', alvo: nomeD })}"/>`, true);
      }
      /* relações usadas dentro dos blocos (figura de um controle): vão com número novo */
      const relsD = []; let junto = blocosD.join('');
      junto = junto.replace(/\b(r:(?:embed|id|link|pict))="([^"]*)"/g, (q, a, v) => { const r = relsDO.find((x) => x.id === v); if (!r) return q; let n = relsD.find((x) => x.velho === v); if (!n) { n = { velho: v, id: novoId(), tipo: r.tipo, alvo: r.alvo, fora: r.fora }; relsD.push(n); } return `${a}="${n.id}"`; });
      for (const r of relsD) { if (r.fora) continue; if (por.has(r.alvo) && !tem.has(r.alvo)) continue; if (por.has(r.alvo)) { const novo = dirDe(r.alvo) + 'dv_' + r.alvo.slice(r.alvo.lastIndexOf('/') + 1); por1(novo, await zip.bytes(r.alvo), ctOrig.get(r.alvo)); if (!ctOrig.get(r.alvo)) { const e = novo.slice(novo.lastIndexOf('.') + 1).toLowerCase(); if (padraoOrig.has(e)) novosPadroes.set(e, padraoOrig.get(e)); } r.alvo = novo; } else await copiar(r.alvo); }
      maisRels(nomeD, relsD);
      /* v0.6.14 (D-55): grupo de controles que volta não pode ter o mesmo número de objeto das formas do app (o número do
         controle em si fica: é ele que liga ao desenho antigo pelo spid) */
      { const usados = new Set([...String(d.dados).matchAll(/<xdr:cNvPr\b[^>]*?\bid="(\d+)"/g)].map((m) => +m[1]));
        let prox = Math.max(70000, ...usados) + 1;
        junto = junto.replace(/<xdr:cNvPr\b([^>]*?)\bid="(\d+)"([^>]*)>([\s\S]*?)(?=<\/xdr:cNvPr>|<xdr:cNv(?:Sp|Grp|Pic|GraphicFrame|Cxn)Pr)/g, (q, a, id, b, dentro) => {
          if (/compatExt\b/.test(dentro) || !usados.has(+id)) { usados.add(+id); return q; }
          const n = prox++; usados.add(n); return `<xdr:cNvPr${a}id="${n}"${b}>${dentro}`;
        }); }
      let t = String(d.dados); const rz = raizDe(t); const nova = comNs(rz.replace(/\/?>$/, '>') + junto, raizDe(dx)).slice(0, -junto.length);
      t = t.replace(rz, nova.endsWith('>') ? nova : rz);
      d.dados = /<\/xdr:wsDr>\s*$/.test(t) ? t.replace(/<\/xdr:wsDr>\s*$/, junto + '</xdr:wsDr>') : t.replace(/\/>\s*$/, '>' + junto + '</xdr:wsDr>');
    }
    if (controles) gx = noFim(gx, controles);
    if (exts.length) gx = /<extLst>/.test(gx) ? gx.replace('</extLst>', exts.join('') + '</extLst>') : gx.replace(/<\/worksheet>\s*$/, `<extLst>${exts.join('')}</extLst></worksheet>`);
    g.dados = gx; it.relsNovas = relsNovas;
    maisRels(nomeG, relsNovas);
  }

  /* ---------- 4. macros ---------- */
  const vba = relsWbO.find((r) => r.tipo === T_VBA && tem.has(r.alvo));
  if (vba) {
    por1(vba.alvo, await zip.bytes(vba.alvo), CT_VBA); novosOverrides.delete(vba.alvo); novosPadroes.set('bin', CT_VBA);
    relsWbNovas.push({ id: novoId(), tipo: T_VBA, alvo: vba.alvo }); res.macros = true;
    const cn = atr((/<workbookPr\b([^>]*?)\/?>/.exec(wbO) || ['', ''])[1], 'codeName');
    if (cn) wbG.dados = String(wbG.dados).replace(/<workbookPr\b([^>]*?)(\/?)>/, (m, at, b) => `<workbookPr${at.replace(/\scodeName="[^"]*"/, '')} codeName="${cn}"${b}>`);
    for (const it of porAba) {
      if (!it.codigo) continue; const g = por.get(`xl/worksheets/sheet${it.ia + 1}.xml`); if (!g) continue;
      const x = String(g.dados);
      g.dados = /<sheetPr\b/.test(x) ? x.replace(/<sheetPr\b([^>]*?)(\/?)>/, (m, at, b) => `<sheetPr${at.replace(/\scodeName="[^"]*"/, '')} codeName="${it.codigo}"${b}>`) : x.replace(/(<worksheet\b[^>]*>)/, `$1<sheetPr codeName="${it.codigo}"/>`);
    }
  }

  /* ---------- 5. suplementos (painel de tarefas) ---------- */
  const painel = relsRaiz.find((r) => fimTipo(r, 'webextensiontaskpanes') && tem.has(r.alvo));
  let relsRaizNovas = '';
  if (painel) {
    await copiar(painel.alvo, true);
    for (const r of lerRelsXml(await texto(relsDe(painel.alvo)), painel.alvo)) if (!r.fora && (await copiar(r.alvo, true))) res.suplementos++;
    relsRaizNovas = `<Relationship Id="${novoId()}" Type="${painel.tipo}" Target="${escAtr(painel.alvo)}"/>`;
  }

  /* ---------- 5b. tema com figura (D-33): volta o tema original com a figura dele ---------- */
  const temaO = relsWbO.find((r) => fimTipo(r, 'theme') && tem.has(r.alvo));
  if (temaO && por.has('xl/theme/theme1.xml')) {
    const tx0 = await texto(temaO.alvo); const rt = lerRelsXml(await texto(relsDe(temaO.alvo)), temaO.alvo).filter((r) => !r.fora && tem.has(r.alvo));
    if (/\br:(?:embed|id|link)="/.test(tx0) && rt.length) {
      for (const r of rt) { const novo = 'xl/media/tema_' + r.alvo.slice(r.alvo.lastIndexOf('/') + 1); por1(novo, await zip.bytes(r.alvo)); const e = novo.slice(novo.lastIndexOf('.') + 1).toLowerCase(); if (padraoOrig.has(e)) novosPadroes.set(e, padraoOrig.get(e)); r.alvo = novo; }
      por.get('xl/theme/theme1.xml').dados = tx0;
      const nome = relsDe('xl/theme/theme1.xml'); const rx = rt.map((r) => `<Relationship Id="${r.id}" Type="${r.tipo}" Target="${escAtr(relativo('xl/theme/theme1.xml', r.alvo))}"/>`).join('');
      if (por.has(nome)) por.get(nome).dados = `${XML_CAB}<Relationships xmlns="${REL_PKG}">${rx}</Relationships>`; else { const a = { nome, dados: `${XML_CAB}<Relationships xmlns="${REL_PKG}">${rx}</Relationships>` }; arquivos.push(a); por.set(nome, a); }
      res.tema = true;
    }
  }

  /* ---------- 6. o livro: memórias, listas e nomes ---------- */
  let wx = String(wbG.dados);
  const extsWb = [];
  for (const m of ((/<extLst>([\s\S]*)<\/extLst>\s*<\/workbook>/.exec(wbO) || [])[1] || '').matchAll(/<ext\b[^>]*>[\s\S]*?<\/ext>/g)) {
    if (!/slicerCache|timelineCacheRef/.test(m[0])) continue;
    const [e, n] = filtrar(m[0], '(?:\\w+:)?(?:slicerCache|timelineCacheRef)', (at) => ridCache.has(atr(at, 'r:id')));
    if (n) extsWb.push(comNs(e.replace(/\br:id="([^"]*)"/g, (q, v) => `r:id="${ridCache.get(v)}"`), raizDe(wbO), raizDe(wx)));
  }
  /* cada memória de segmentação tem um nome definido com o mesmo nome (#N/D), como o Excel grava */
  const faltam = nomesDeCache.filter((n) => !new RegExp(`<definedName\\b[^>]*\\bname="${escAtr(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(wx));
  if (faltam.length) { const dn = faltam.map((n) => `<definedName name="${escAtr(n)}">#N/A</definedName>`).join(''); wx = /<definedNames>/.test(wx) ? wx.replace('</definedNames>', dn + '</definedNames>') : wx.replace(/<calcPr\b/, `<definedNames>${dn}</definedNames><calcPr`); }
  wx = wx.replace(/<\/workbook>\s*$/, `${pivotCaches.length ? `<pivotCaches>${pivotCaches.join('')}</pivotCaches>` : ''}${extsWb.length ? `<extLst>${extsWb.join('')}</extLst>` : ''}</workbook>`);
  wbG.dados = wx;
  maisRels('xl/workbook.xml', relsWbNovas);
  if (relsRaizNovas) { const rr = por.get('_rels/.rels'); rr.dados = String(rr.dados).replace('</Relationships>', relsRaizNovas + '</Relationships>'); }

  /* ---------- 7. tipos de conteúdo ---------- */
  const tp = por.get('[Content_Types].xml'); let tx = String(tp.dados);
  let mais = '';
  for (const [e, ct] of novosPadroes) if (!new RegExp(`<Default\\b[^>]*Extension="${e}"`, 'i').test(tx)) mais += `<Default Extension="${e}" ContentType="${ct}"/>`;
  tx = tx.replace(/(<Types\b[^>]*>)/, `$1${mais}`);
  mais = '';
  for (const [n, ct] of novosOverrides) { if (/\.rels$/.test(n) || new RegExp(`PartName="/${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(tx)) continue; mais += `<Override PartName="/${escAtr(n)}" ContentType="${ct}"/>`; }
  tx = tx.replace('</Types>', mais + '</Types>');
  if (res.macros) tx = tx.replace(/(<Override PartName="\/xl\/workbook\.xml" ContentType=")[^"]*"/, `$1${CT_XLSM}"`);
  tp.dados = tx;
  return res;
}

/** Põe um elemento no fim da aba, no lugar que o Excel exige: depois do desenho e antes das tabelas e das listas (extLst).
    antesDoAntigo = true põe antes do desenho antigo (legacyDrawing): é o caso do <drawing>. */
function noFim(gx, el, antesDoAntigo = false) {
  const marcas = antesDoAntigo ? ['<legacyDrawing', '<mc:AlternateContent', '<controls', '<tableParts', '<extLst', '</worksheet>'] : ['<tableParts', '<extLst', '</worksheet>'];
  const fim = gx.lastIndexOf('</sheetData>') >= 0 ? gx.lastIndexOf('</sheetData>') : gx.lastIndexOf('<sheetData/>');
  let pos = -1; for (const m of marcas) { const i = gx.indexOf(m, Math.max(0, fim)); if (i >= 0 && (pos < 0 || i < pos)) pos = i; }
  return pos < 0 ? gx : gx.slice(0, pos) + el + gx.slice(pos);
}
