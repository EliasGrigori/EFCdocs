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
/** Lê as regras da aba na ordem de força (a de cima ganha). dxfs vem do styles.xml. */
export function lerCondicionais(resto, dxfs, conv, nomeAba, corFn) {
  const regras = [];
  const fora = { escalas: 0, barras: 0, icones: 0, periodo: 0, outras: 0 };
  const um = (fx, a, dentro, x14) => {
    const tipo = a.type;
    if (tipo === 'colorScale') { fora.escalas++; return; }
    if (tipo === 'dataBar') { fora.barras++; return; }
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
export function gravarCondicionais(cf, dxfs) {
  if (!cf || !cf.length) return '';
  const chaveDxf = new Map(dxfs.map((d, i) => [JSON.stringify(d), i]));
  const idDxf = (e) => { const k = JSON.stringify(e || {}); let i = chaveDxf.get(k); if (i == null) { i = dxfs.length; dxfs.push(e || {}); chaveDxf.set(k, i); } return i; };
  let prio = 1;
  const out = [];
  for (const r of cf) {
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
  return out.join('');
}

const FONTE_NOTA = '<rPr><sz val="9"/><color indexed="81"/><rFont val="Tahoma"/><family val="2"/></rPr>';
/** Comentários da aba → { comments, vml } (anotações do Excel; a conversa vira uma anotação só). */
export function gravarComentarios(com, indiceAba) {
  const ks = Object.keys(com || {}).map((k) => ({ k, p: lerChave(k) })).filter((q) => q.p).sort((a, b) => a.p.l - b.p.l || a.p.c - b.p.c);
  if (!ks.length) return null;
  const autores = [];
  const idAutor = (a) => { const n = a || 'EFCdocs'; let i = autores.indexOf(n); if (i < 0) { autores.push(n); i = autores.length - 1; } return i; };
  const lista = ks.map(({ k, p }, i) => {
    const x = com[k];
    const aut = x.a || 'EFCdocs';
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
