/* EFCdocs — .xlsx ⇄ validação de dados (listas suspensas), formatação condicional e comentários (v0.5.1). */
import { atributos, tags, tag, textoRico, desescapar, escapar, XML_CAB } from './xml.js';
import { faixasDe, ancoraDe, novoIdRegra } from '../regras.js';
import { chave, lerChave } from '../ref.js';
import { lerDxf } from './estilos.js';
import { porPrefixos } from './formulas.js';

const TIPOS_VAL = new Set(['list', 'whole', 'decimal', 'date', 'time', 'textLength', 'custom']);
const TIPOS_CF = new Set(['cellIs', 'expression', 'containsText', 'notContainsText', 'beginsWith', 'endsWith', 'containsBlanks', 'notContainsBlanks', 'containsErrors', 'notContainsErrors', 'duplicateValues', 'uniqueValues', 'top10', 'aboveAverage']);
const sim = (v) => v === '1' || v === 'true';

/* ---------- validação de dados ---------- */
const formulaN = (dentro, n) => {
  const m = new RegExp(`<(?:x14:)?formula${n}>(?:\\s*<xm:f>)?([\\s\\S]*?)(?:</xm:f>\\s*)?</(?:x14:)?formula${n}>`).exec(dentro);
  return m ? desescapar(m[1]).trim() : null;
};

/** Lê as validações da aba (as comuns e as do bloco novo do Excel 2010, que aceitam listas de outra aba). */
export function lerValidacoes(resto, conv, nomeAba) {
  const val = [];
  let ignoradas = 0;
  const um = (a, dentro, x14) => {
    const tipo = a.type || 'none';
    const sq = (x14 ? (/<xm:sqref>([^<]*)<\/xm:sqref>/.exec(dentro) || [])[1] : a.sqref) || '';
    const fx = sq.trim().replace(/\s+/g, ' ').toUpperCase();
    if (!fx) return;
    const temAviso = !!(a.prompt || a.promptTitle);
    if (!TIPOS_VAL.has(tipo) && !(tipo === 'none' && temAviso)) { if (tipo !== 'none') ignoradas++; return; }
    const lin = ancoraDe(faixasDe(fx)).l;
    const r = { fx, t: TIPOS_VAL.has(tipo) ? tipo : 'any' };
    if (a.operator && a.operator !== 'between') r.op = a.operator;
    const f1 = formulaN(dentro, 1), f2 = formulaN(dentro, 2);
    if (f1 != null && f1 !== '') r.f1 = r.t === 'list' && f1[0] === '"' ? f1 : conv(f1, nomeAba, lin);
    if (f2 != null && f2 !== '' && r.t !== 'list') r.f2 = conv(f2, nomeAba, lin);
    if (sim(a.allowBlank)) r.vz = 1;
    if (sim(a.showDropDown)) r.sd = 1;
    if (sim(a.showInputMessage)) r.mi = 1;
    if (a.promptTitle) r.mit = a.promptTitle;
    if (a.prompt) r.mim = a.prompt;
    if (sim(a.showErrorMessage)) r.me = 1;
    if (a.errorStyle === 'warning' || a.errorStyle === 'information') r.ee = a.errorStyle;
    if (a.errorTitle) r.met = a.errorTitle;
    if (a.error) r.mem = a.error;
    val.push(r);
  };
  for (const m of resto.matchAll(/<dataValidation\b([^>]*?)(?:\/>|>([\s\S]*?)<\/dataValidation>)/g)) um(atributos(m[1]), m[2] || '', false);
  for (const m of resto.matchAll(/<x14:dataValidation\b([^>]*?)>([\s\S]*?)<\/x14:dataValidation>/g)) um(atributos(m[1]), m[2] || '', true);
  return { val, ignoradas };
}

/* ---------- formatação condicional ---------- */
const CFVO_BARRA = new Set(['min', 'max', 'num', 'percent', 'percentile', 'formula', 'autoMin', 'autoMax']);
/** Uma barra de dados: velha = <dataBar> da regra comum (ou null), nova = miolo do <x14:cfRule> (ou null). */
function lerBarra(velha, nova, corFn, conv, nomeAba, lin) {
  const db = (x, pre) => { const m = new RegExp(`<${pre}dataBar\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${pre}dataBar>)`).exec(x || ''); return m ? { a: atributos(m[1]), dentro: m[2] || '' } : null; };
  const v = velha != null ? db(velha, '') : null, n = nova != null ? db(nova, 'x14:') : null;
  if (!v && !n) return null;
  const cfvos = (x, novo) => [...String(x || '').matchAll(novo ? /<x14:cfvo\b([^>]*?)(?:\/>|>([\s\S]*?)<\/x14:cfvo>)/g : /<cfvo\b([^>]*?)(?:\/>|>[\s\S]*?<\/cfvo>)/g)].map((m) => {
    const a = atributos(m[1]); const t = CFVO_BARRA.has(a.type) ? a.type : 'min';
    const f = novo ? ((/<xm:f>([\s\S]*?)<\/xm:f>/.exec(m[2] || '') || [])[1]) : a.val;
    const o = { t }; if (f != null && f !== '' && t !== 'min' && t !== 'max' && t !== 'autoMin' && t !== 'autoMax') { const ff = desescapar(f).trim(); o.v = /^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(ff) ? +ff : conv(ff, nomeAba, lin); }
    return o;
  });
  const cv = cfvos(n ? n.dentro : v.dentro, !!n);
  const b = { min: cv[0] || { t: n ? 'autoMin' : 'min' }, max: cv[1] || { t: n ? 'autoMax' : 'max' } };
  const cor = (v && corFn(v.dentro, 'color')) || (n && corFn(n.dentro, 'fillColor')) || '#638ec6';
  b.cor = cor;
  const at = (n && n.a) || {}, av = (v && v.a) || {};
  const num = (x, p) => (x != null && x !== '' && Number.isFinite(+x) ? Math.max(0, Math.min(100, +x)) : p);
  b.minL = num(at.minLength ?? av.minLength, 10); b.maxL = num(at.maxLength ?? av.maxLength, 90);
  if (av.showValue === '0' || av.showValue === 'false' || at.showValue === '0' || at.showValue === 'false') b.semValor = 1;
  if (n) {
    b.x14 = 1;
    if (at.gradient === '0' || at.gradient === 'false') b.lisa = 1;
    const borda = corFn(n.dentro, 'borderColor');
    if (at.border === '1' || at.border === 'true') b.borda = borda || cor;
    if (!(at.negativeBarColorSameAsPositive === '1' || at.negativeBarColorSameAsPositive === 'true')) b.neg = corFn(n.dentro, 'negativeFillColor') || '#ff0000';
    const nb = corFn(n.dentro, 'negativeBorderColor'); if (b.borda && nb && (at.negativeBarBorderColorSameAsPositive === '0' || at.negativeBarBorderColorSameAsPositive === 'false')) b.negBorda = nb;
    b.eixo = at.axisPosition === 'middle' ? 'meio' : at.axisPosition === 'none' ? 'nao' : 'auto';
    const ce = corFn(n.dentro, 'axisColor'); if (ce) b.corEixo = ce;
    if (at.direction === 'rightToLeft') b.dir = 'rtl'; else if (at.direction === 'leftToRight') b.dir = 'ltr';
  }
  return b;
}

/** Lê as regras da aba na ordem de força (a de cima ganha). dxfs vem do styles.xml. */
export function lerCondicionais(resto, dxfs, conv, nomeAba, corFn) {
  const regras = [];
  const fora = { escalas: 0, barras: 0, icones: 0, periodo: 0, outras: 0 };
  /* v0.6.18 (D-45): barras de dados. A regra antiga guarda o básico; o bloco do Excel 2010 (x14), ligado pelo id, guarda o resto
     (lisa ou com degradê, borda, cor dos negativos, eixo). Uma barra só conta uma vez. */
  const x14Barras = new Map();
  for (const m of resto.matchAll(/<x14:cfRule\b([^>]*?)>([\s\S]*?)<\/x14:cfRule>/g)) { const a = atributos(m[1]); if (a.type === 'dataBar' && a.id) x14Barras.set(a.id, m[2]); }
  const ligadas = new Set();
  const um = (fx, a, dentro, x14) => {
    const tipo = a.type;
    if (tipo === 'colorScale') { fora.escalas++; return; }
    if (tipo === 'dataBar') {
      if (x14 && a.id && ligadas.has(a.id)) return;
      let x = null;
      if (!x14) { const id = (/<x14:id>([^<]*)<\/x14:id>/.exec(dentro) || [])[1]; if (id && x14Barras.has(id)) { x = x14Barras.get(id); ligadas.add(id); } }
      const b = lerBarra(x14 ? null : dentro, x14 ? dentro : x, corFn, conv, nomeAba, ancoraDe(faixasDe(fx)).l);
      if (!b) { fora.barras++; return; }
      regras.push({ id: novoIdRegra(), fx, t: 'dataBar', b, e: {}, _p: +a.priority || 0 });
      return;
    }
    if (tipo === 'iconSet') { fora.icones++; return; }
    if (tipo === 'timePeriod') { fora.periodo++; return; }
    if (!TIPOS_CF.has(tipo) || a.stdDev) { fora.outras++; return; }
    let e;
    if (x14) { const d = /<x14:dxf>([\s\S]*?)<\/x14:dxf>/.exec(dentro); e = d ? lerDxf(d[1], corFn) : null; } else e = a.dxfId != null ? dxfs[+a.dxfId] : null;
    if (!e) { fora.outras++; return; }
    const lin = ancoraDe(faixasDe(fx)).l;
    const fs = x14 ? [...dentro.matchAll(/<xm:f>([\s\S]*?)<\/xm:f>/g)].map((m) => desescapar(m[1]).trim()) : [...dentro.matchAll(/<formula>([\s\S]*?)<\/formula>/g)].map((m) => desescapar(m[1]).trim());
    const r = { id: novoIdRegra(), fx, t: tipo, e: { ...e }, _p: +a.priority || 0 };
    if (sim(a.stopIfTrue)) r.par = 1;
    if (tipo === 'cellIs') {
      r.op = a.operator || 'equal';
      if (fs[0] != null) r.f1 = conv(fs[0], nomeAba, lin);
      if (fs[1] != null) r.f2 = conv(fs[1], nomeAba, lin);
    } else if (tipo === 'expression') {
      if (fs[0] == null) { fora.outras++; return; }
      r.f1 = conv(fs[0], nomeAba, lin);
    } else if (tipo === 'containsText' || tipo === 'notContainsText' || tipo === 'beginsWith' || tipo === 'endsWith') {
      r.tx = a.text != null ? a.text : '';
    } else if (tipo === 'top10') {
      r.n = +a.rank || 10;
      if (sim(a.percent)) r.pc = 1;
      if (sim(a.bottom)) r.bx = 1;
    } else if (tipo === 'aboveAverage') {
      if (a.aboveAverage === '0' || a.aboveAverage === 'false') r.ab = 0;
      if (sim(a.equalAverage)) r.ig = 1;
    }
    regras.push(r);
  };
  for (const b of resto.matchAll(/<conditionalFormatting\b([^>]*)>([\s\S]*?)<\/conditionalFormatting>/g)) {
    const fx = (atributos(b[1]).sqref || '').trim().replace(/\s+/g, ' ').toUpperCase();
    if (!fx) continue;
    for (const m of b[2].matchAll(/<cfRule\b([^>]*?)(?:\/>|>([\s\S]*?)<\/cfRule>)/g)) um(fx, atributos(m[1]), m[2] || '', false);
  }
  for (const b of resto.matchAll(/<x14:conditionalFormatting\b[^>]*>([\s\S]*?)<\/x14:conditionalFormatting>/g)) {
    const fx = ((/<xm:sqref>([^<]*)<\/xm:sqref>/.exec(b[1]) || [])[1] || '').trim().replace(/\s+/g, ' ').toUpperCase();
    if (!fx) continue;
    for (const m of b[1].matchAll(/<x14:cfRule\b([^>]*?)(?:\/>|>([\s\S]*?)<\/x14:cfRule>)/g)) um(fx, atributos(m[1]), m[2] || '', true);
  }
  regras.sort((a, b) => a._p - b._p);
  for (const r of regras) delete r._p;
  return { regras, fora };
}

/* ---------- comentários ---------- */
const semCabecalhoEncadeado = (t) => {
  const m = /^\[(?:Threaded comment|Coment[áa]rio encadeado)\][\s\S]*?(?:Comment|Coment[áa]rio):\s*\n?([\s\S]*)$/i.exec(t);
  return m ? m[1].trim() : t;
};

export async function lerPessoas(zip, relsWb) {
  const mapa = new Map();
  for (const r of relsWb.values()) {
    if (!/person$/.test(r.tipo) || !r.alvo) continue;
    const x = await zip.texto(r.alvo);
    for (const p of tags(x || '', 'person')) if (p.a.id) mapa.set(p.a.id.toLowerCase(), desescapar(p.a.displayName || ''));
  }
  return mapa;
}

/** Comentários de uma aba: anotações comuns e conversas do Excel 365 (a conversa vem como texto + respostas). */
export async function lerComentarios(zip, rels, pessoas) {
  const com = {};
  let notas = 0, conversas = 0, respostas = 0;
  const legado = new Map();
  const conv = new Map();
  for (const r of rels.values()) {
    if (!r.alvo) continue;
    if (/\/comments$/.test(r.tipo) || /comments$/.test(r.tipo) && !/threaded/i.test(r.tipo)) {
      const x = (await zip.texto(r.alvo)) || '';
      const autores = tags(tag(x, 'authors')?.dentro || '', 'author').map((a) => desescapar(a.dentro));
      for (const m of x.matchAll(/<comment\b([^>]*?)>([\s\S]*?)<\/comment>/g)) {
        const a = atributos(m[1]);
        const p = lerChave(a.ref || '');
        if (!p) continue;
        const aut = autores[+a.authorId] || '';
        let corpo = (/<text>([\s\S]*?)<\/text>/.exec(m[2]) || [])[1] || '';
        let t;
        /* a primeira parte em negrito é "Autor:"; sai */
        const runs = [...corpo.matchAll(/<r>([\s\S]*?)<\/r>/g)];
        if (runs.length > 1 && /<b\/>|<b val="1"/.test(runs[0][1]) && /:\s*$/.test(textoRico(runs[0][1]))) t = runs.slice(1).map((q) => textoRico(q[1])).join('').replace(/^\r?\n/, '');
        else t = textoRico(corpo);
        t = semCabecalhoEncadeado(t.replace(/\r\n?/g, '\n'));
        legado.set(chave(p.l, p.c), { t, a: /^tc=/.test(aut) ? '' : aut });
      }
    } else if (/threadedComment$/.test(r.tipo)) {
      const x = (await zip.texto(r.alvo)) || '';
      for (const m of x.matchAll(/<threadedComment\b([^>]*?)>([\s\S]*?)<\/threadedComment>/g)) {
        const a = atributos(m[1]);
        const p = lerChave(a.ref || '');
        if (!p) continue;
        const t = desescapar((/<text>([\s\S]*?)<\/text>/.exec(m[2]) || [])[1] || '').replace(/\r\n?/g, '\n');
        const k = chave(p.l, p.c);
        const aut = (a.personId && pessoas.get(a.personId.toLowerCase())) || '';
        const g = conv.get(k) || { raiz: null, r: [] };
        if (a.parentId) g.r.push({ a: aut, t }); else if (!g.raiz) g.raiz = { a: aut, t };
        conv.set(k, g);
      }
    }
  }
  for (const [k, g] of conv) {
    if (!g.raiz && !g.r.length) continue;
    const raiz = g.raiz || g.r.shift();
    legado.delete(k);
    g.r = g.r.filter((q) => q.t.trim());
    if (!raiz.t.trim() && !g.r.length) continue; // conversa em branco (sobra de um comentário apagado)
    com[k] = { t: raiz.t, a: raiz.a, enc: 1, ...(g.r.length ? { r: g.r } : {}) };
    conversas++; respostas += g.r.length;
    legado.delete(k);
  }
  for (const [k, x] of legado) {
    if (!x.t.trim()) continue;
    com[k] = { t: x.t, ...(x.a ? { a: x.a } : {}) };
    notas++;
  }
  return { com, notas, conversas, respostas };
}

/* ============================================================
   Gravar
   ============================================================ */
const OPS_CF = new Set(['between', 'notBetween', 'equal', 'notEqual', 'greaterThan', 'lessThan', 'greaterThanOrEqual', 'lessThanOrEqual']);
const NOME_ARQUIVO_OP = { containsText: 'containsText', notContainsText: 'notContains', beginsWith: 'beginsWith', endsWith: 'endsWith' };

export function gravarValidacoes(val) {
  if (!val || !val.length) return '';
  const itens = val.map((r) => {
    let a = '';
    if (r.t && r.t !== 'any') a += ` type="${r.t}"`;
    if (r.ee === 'warning' || r.ee === 'information') a += ` errorStyle="${r.ee}"`;
    if (r.op && r.t !== 'list' && r.t !== 'custom' && r.op !== 'between' && OPS_CF.has(r.op)) a += ` operator="${r.op}"`;
    if (r.vz) a += ' allowBlank="1"';
    if (r.sd) a += ' showDropDown="1"';
    if (r.mi) a += ' showInputMessage="1"';
    if (r.me) a += ' showErrorMessage="1"';
    if (r.met) a += ` errorTitle="${escapar(String(r.met).slice(0, 32), true)}"`;
    if (r.mem) a += ` error="${escapar(String(r.mem).slice(0, 255), true)}"`;
    if (r.mit) a += ` promptTitle="${escapar(String(r.mit).slice(0, 32), true)}"`;
    if (r.mim) a += ` prompt="${escapar(String(r.mim).slice(0, 255), true)}"`;
    a += ` sqref="${escapar(r.fx, true)}"`;
    const f = (n, x) => (x != null && x !== '' ? `<formula${n}>${escapar(r.t === 'list' && x[0] === '"' ? x : porPrefixos(x))}</formula${n}>` : '');
    return `<dataValidation${a}>${f(1, r.f1)}${r.t === 'list' || r.t === 'custom' ? '' : f(2, r.f2)}</dataValidation>`;
  });
  return `<dataValidations count="${itens.length}">${itens.join('')}</dataValidations>`;
}

/** Regras → <conditionalFormatting>. dxfs: lista que cresce (cada estilo único vira um dxf). */
const NS_X14 = 'http://schemas.microsoft.com/office/spreadsheetml/2009/9/main';
const NS_XM = 'http://schemas.microsoft.com/office/excel/2006/main';
let seqBarra = 0;
const guidBarra = () => `{EFC0B000-0618-4000-8000-${(++seqBarra).toString(16).padStart(12, '0').toUpperCase()}}`;
const argb = (h) => 'FF' + String(h || '#638ec6').replace('#', '').slice(0, 6).toUpperCase();
/** v0.6.18 (D-45): uma barra de dados → [regra comum, bloco do Excel 2010 ou ''] */
function gravarBarra(r, prio) {
  const b = r.b || {};
  const valCfvo = (o) => (o.v == null ? '' : typeof o.v === 'number' ? String(o.v) : porPrefixos(String(o.v)));
  const velho = (o, padrao) => { const t = o && o.t === 'autoMin' ? 'min' : o && o.t === 'autoMax' ? 'max' : (o && o.t) || padrao; const v = t === 'min' || t === 'max' ? '' : valCfvo(o); return `<cfvo type="${t}"${v !== '' ? ` val="${escapar(v, true)}"` : ''}/>`; };
  const novo = (o, padrao) => { const t = (o && o.t) || padrao; const v = t === 'min' || t === 'max' || t === 'autoMin' || t === 'autoMax' ? '' : valCfvo(o); return v !== '' ? `<x14:cfvo type="${t}"><xm:f>${escapar(v)}</xm:f></x14:cfvo>` : `<x14:cfvo type="${t}"/>`; };
  const minL = Number.isFinite(b.minL) ? b.minL : 10, maxL = Number.isFinite(b.maxL) ? b.maxL : 90;
  const atv = `${b.x14 ? '' : `${minL !== 10 ? ` minLength="${minL}"` : ''}${maxL !== 90 ? ` maxLength="${maxL}"` : ''}`}${b.semValor ? ' showValue="0"' : ''}`;
  if (!b.x14) return [`<cfRule type="dataBar" priority="${prio}"><dataBar${atv}>${velho(b.min, 'min')}${velho(b.max, 'max')}<color rgb="${argb(b.cor)}"/></dataBar></cfRule>`, ''];
  const id = guidBarra();
  const principal = `<cfRule type="dataBar" priority="${prio}"><dataBar${atv}>${velho(b.min, 'autoMin')}${velho(b.max, 'autoMax')}<color rgb="${argb(b.cor)}"/></dataBar>` +
    `<extLst><ext uri="{B025F937-C7B1-47D3-B67F-A62EFF666E3E}" xmlns:x14="${NS_X14}"><x14:id>${id}</x14:id></ext></extLst></cfRule>`;
  const at = ` minLength="${minL}" maxLength="${maxL}"${b.semValor ? ' showValue="0"' : ''}${b.borda ? ' border="1"' : ''}${b.lisa ? ' gradient="0"' : ''}${b.dir === 'rtl' ? ' direction="rightToLeft"' : b.dir === 'ltr' ? ' direction="leftToRight"' : ''}` +
    `${b.neg ? '' : ' negativeBarColorSameAsPositive="1"'}${b.borda && b.negBorda ? ' negativeBarBorderColorSameAsPositive="0"' : ''}${b.eixo === 'meio' ? ' axisPosition="middle"' : b.eixo === 'nao' ? ' axisPosition="none"' : ''}`;
  const filhos = `${novo(b.min, 'autoMin')}${novo(b.max, 'autoMax')}${b.borda ? `<x14:borderColor rgb="${argb(b.borda)}"/>` : ''}${b.neg ? `<x14:negativeFillColor rgb="${argb(b.neg)}"/>` : ''}` +
    `${b.borda && b.negBorda ? `<x14:negativeBorderColor rgb="${argb(b.negBorda)}"/>` : ''}<x14:axisColor rgb="${argb(b.corEixo || '#000000')}"/>`;
  return [principal, `<x14:conditionalFormatting xmlns:xm="${NS_XM}"><x14:cfRule type="dataBar" id="${id}"><x14:dataBar${at}>${filhos}</x14:dataBar></x14:cfRule><xm:sqref>${escapar(r.fx)}</xm:sqref></x14:conditionalFormatting>`];
}

/** Regras da aba → <conditionalFormatting>. exts (lista) recebe o bloco do Excel 2010 das barras de dados, para o extLst da aba. */
export function gravarCondicionais(cf, dxfs, exts = null) {
  if (!cf || !cf.length) return '';
  const novos = [];
  const chaveDxf = new Map(dxfs.map((d, i) => [JSON.stringify(d), i]));
  const idDxf = (e) => { const k = JSON.stringify(e || {}); let i = chaveDxf.get(k); if (i == null) { i = dxfs.length; dxfs.push(e || {}); chaveDxf.set(k, i); } return i; };
  let prio = 1;
  const out = [];
  for (const r of cf) {
    if (r.t === 'dataBar') { const [p1, p2] = gravarBarra(r, prio++); out.push(`<conditionalFormatting sqref="${escapar(r.fx, true)}">${p1}</conditionalFormatting>`); if (p2) novos.push(p2); continue; }
    if (!r.t || !TIPOS_CF.has(r.t)) continue;
    const anc = ancoraDe(faixasDe(r.fx));
    const A1 = chave(anc.l, anc.c);
    const tx = r.tx != null ? String(r.tx) : '';
    const aspas = '"' + tx.replace(/"/g, '""') + '"';
    let a = ` type="${r.t}" dxfId="${idDxf(r.e)}" priority="${prio++}"`;
    if (r.par) a += ' stopIfTrue="1"';
    let formulas = [];
    switch (r.t) {
      case 'cellIs': a += ` operator="${OPS_CF.has(r.op) ? r.op : 'equal'}"`; formulas = [r.f1, (r.op === 'between' || r.op === 'notBetween') ? r.f2 : null]; break;
      case 'expression': formulas = [r.f1]; break;
      case 'containsText': a += ` operator="containsText" text="${escapar(tx, true)}"`; formulas = [`NOT(ISERROR(SEARCH(${aspas},${A1})))`]; break;
      case 'notContainsText': a += ` operator="notContains" text="${escapar(tx, true)}"`; formulas = [`ISERROR(SEARCH(${aspas},${A1}))`]; break;
      case 'beginsWith': a += ` operator="beginsWith" text="${escapar(tx, true)}"`; formulas = [`LEFT(${A1},LEN(${aspas}))=${aspas}`]; break;
      case 'endsWith': a += ` operator="endsWith" text="${escapar(tx, true)}"`; formulas = [`RIGHT(${A1},LEN(${aspas}))=${aspas}`]; break;
      case 'containsBlanks': formulas = [`LEN(TRIM(${A1}))=0`]; break;
      case 'notContainsBlanks': formulas = [`LEN(TRIM(${A1}))>0`]; break;
      case 'containsErrors': formulas = [`ISERROR(${A1})`]; break;
      case 'notContainsErrors': formulas = [`NOT(ISERROR(${A1}))`]; break;
      case 'top10': a += ` rank="${Math.max(1, Math.floor(r.n || 10))}"${r.pc ? ' percent="1"' : ''}${r.bx ? ' bottom="1"' : ''}`; break;
      case 'aboveAverage': if (r.ab === 0) a += ' aboveAverage="0"'; if (r.ig) a += ' equalAverage="1"'; break;
      default: break;
    }
    const fx = formulas.filter((f) => f != null && f !== '').map((f) => `<formula>${escapar(porPrefixos(f))}</formula>`).join('');
    out.push(`<conditionalFormatting sqref="${escapar(r.fx, true)}"><cfRule${a}>${fx}</cfRule></conditionalFormatting>`);
  }
  void NOME_ARQUIVO_OP;
  if (novos.length && exts) exts.push(`<ext uri="{78C0D931-6437-407d-A8EE-F0AAD7539E65}" xmlns:x14="${NS_X14}"><x14:conditionalFormattings>${novos.join('')}</x14:conditionalFormattings></ext>`);
  return out.join('');
}

const FONTE_NOTA = '<rPr><sz val="9"/><color indexed="81"/><rFont val="Tahoma"/><family val="2"/></rPr>';
/** Comentários da aba → { comments, vml } (anotações do Excel; a conversa vira uma anotação só). */
export function gravarComentarios(com, indiceAba) {
  const ks = Object.keys(com || {}).map((k) => ({ k, p: lerChave(k) })).filter((q) => q.p).sort((a, b) => a.p.l - b.p.l || a.p.c - b.p.c);
  if (!ks.length) return null;
  const autores = [];
  const idAutor = (a) => { const n = a || 'Vértice Docs'; let i = autores.indexOf(n); if (i < 0) { autores.push(n); i = autores.length - 1; } return i; };
  const lista = ks.map(({ k, p }, i) => {
    const x = com[k];
    const aut = x.a || 'Vértice Docs';
    let corpo = x.t || '';
    for (const r of x.r || []) corpo += `\n\n${r.a ? r.a + ' respondeu: ' : 'Resposta: '}${r.t}`;
    const id = idAutor(x.a);
    const txt = `<text><r><rPr><b/><sz val="9"/><color indexed="81"/><rFont val="Tahoma"/><family val="2"/></rPr><t>${escapar(aut)}:</t></r><r>${FONTE_NOTA}<t xml:space="preserve">\n${escapar(corpo)}</t></r></text>`;
    return { k, p, i, xml: `<comment ref="${k}" authorId="${id}" shapeId="0">${txt}</comment>` };
  });
  const comments = `${XML_CAB}<comments xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><authors>${autores.map((a) => `<author>${escapar(a)}</author>`).join('')}</authors><commentList>${lista.map((q) => q.xml).join('')}</commentList></comments>`;
  const data = indiceAba + 1;
  const shapes = lista.map(({ p, i }) => (
    `<v:shape id="_x0000_s${data * 1024 + i + 1}" type="#_x0000_t202" style="position:absolute;margin-left:80pt;margin-top:2pt;width:160pt;height:70pt;z-index:${i + 1};visibility:hidden" fillcolor="#ffffe1" o:insetmode="auto">` +
    '<v:fill color2="#ffffe1"/><v:shadow on="t" color="black" obscured="t"/><v:path o:connecttype="none"/><v:textbox style="mso-direction-alt:auto"><div style="text-align:left"></div></v:textbox>' +
    `<x:ClientData ObjectType="Note"><x:MoveWithCells/><x:SizeWithCells/><x:Anchor>${p.c + 1}, 15, ${Math.max(0, p.l - 1)}, 2, ${p.c + 4}, 15, ${p.l + 4}, 16</x:Anchor><x:AutoFill>False</x:AutoFill><x:Row>${p.l}</x:Row><x:Column>${p.c}</x:Column></x:ClientData></v:shape>`
  )).join('');
  const vml = `<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><o:shapelayout v:ext="edit"><o:idmap v:ext="edit" data="${data}"/></o:shapelayout>` +
    '<v:shapetype id="_x0000_t202" coordsize="21600,21600" o:spt="202" path="m,l,21600r21600,l21600,xe"><v:stroke joinstyle="miter"/><v:path gradientshapeok="t" o:connecttype="rect"/></v:shapetype>' +
    `${shapes}</xml>`;
  return { comments, vml, total: ks.length, conversas: ks.filter(({ k }) => com[k].enc || (com[k].r && com[k].r.length)).length };
}
