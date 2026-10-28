/* EFCdocs — abrir um arquivo do Excel (.xlsx / .xlsm) como planilha do EFCdocs.
   - Lê as abas aos pedaços (uma aba de 200 MB não precisa caber inteira na memória).
   - Valores, fórmulas (com o último valor que o Excel calculou), estilos, larguras, alturas, ocultas,
     mescladas, congelar painéis, cor e abas ocultas, nomes definidos, tabelas (as fórmulas viram endereços).
   - Não vêm (e o relatório diz): macros, gráficos, tabelas dinâmicas (vêm os valores), imagens, controles,
     filtros, proteção. (v0.5.1: validação de dados, formatação condicional e comentários passam a vir.)
   - Linhas no fim que não mostram nada (fórmula copiada até a linha 1.048.576, só formatação ou ocultas com sobra)
     são cortadas, e o relatório diz onde. */
import { lerZip } from './zip.js';
import { atributos, tags, tag, desescapar, textoRico } from './xml.js';
import { lerTema, lerEstilos, corDe } from './estilos.js';
import { tirarPrefixos, trocarTabelas } from './formulas.js';
import { chave, letraCol, lerChave, numCol, MAX_LIN } from '../ref.js';
import { lerGuardada, deslocar, escrever, dependencias } from '../formula.js';
import { IMPL } from '../funcoes.js';
import { lerValidacoes, lerCondicionais, lerComentarios, lerPessoas } from './extras.js';
import { lerGraficosAba, ligarRefsAoLivro } from './graficosXlsx.js';
import { ligarFormaAoLivro } from './formasXlsx.js';
import { lerImpressaoAba, lerNomesImpressao } from './impressaoXlsx.js';
import { idObjeto } from '../objetos.js';
import { urlSegura } from '../inserir.js';
import { indiceEstilo, LARG_PADRAO, ALT_PADRAO, NOME_ABA_PADRAO } from '../modelo.js';
const RX_SO_DINAMICA = /(^|[^\w.])(FILTER|UNIQUE|SORT|SORTBY|SEQUENCE|RANDARRAY|XLOOKUP|XMATCH|TEXTSPLIT|VSTACK|HSTACK|TOCOL|TOROW|CHOOSECOLS|CHOOSEROWS|TAKE|DROP|EXPAND|WRAPCOLS|WRAPROWS|LET|LAMBDA)\(/i;

export const LIMITES = {
  folga: 1000, // linhas vazias (ou de fórmula que dá vazio) que ficam depois do último dado
  ocultas: 20000, // linhas ocultas com valores no fim: acima disso, cortadas
  guardaPendentes: 30000, // linhas "sem nada à vista" guardadas esperando para ver se vem dado depois
  celulasAba: 300000,
  celulasTotal: 800000,
};

const NS_REL = /^https?:\/\/[^ ]*\/relationships\//;

function caminho(base, alvo) {
  if (!alvo) return null;
  if (/^[a-z]+:\/\//i.test(alvo)) return null;
  if (alvo.startsWith('/')) return alvo.slice(1);
  const partes = base.split('/'); partes.pop();
  for (const p of alvo.split('/')) { if (p === '..') partes.pop(); else if (p !== '.') partes.push(p); }
  return partes.join('/');
}
const relsDe = (parte) => { const p = parte.split('/'); const n = p.pop(); return [...p, '_rels', n + '.rels'].join('/'); };
function lerRels(xml, parte) {
  const out = new Map();
  for (const r of tags(xml || '', 'Relationship')) out.set(r.a.Id, { tipo: (r.a.Type || '').replace(NS_REL, ''), alvo: r.a.TargetMode === 'External' ? null : caminho(parte, r.a.Target), externo: r.a.TargetMode === 'External', url: r.a.Target || '' });
  return out;
}

/** Formato de número é de data/hora? (para o sistema de datas 1904) */
const ehFormatoData = (nf) => !!nf && /[dmyhs]/i.test(nf.replace(/"[^"]*"|\[[^\]]*\]|\\./g, '')) && !/^[#0.,%E+\-\s]*$/.test(nf);

const fmtN = (n) => n.toLocaleString('pt-BR');

/**
 * bytes do .xlsx → { conteudo, relatorio }.
 * aoProgresso({ fase, aba, i, n, linha }) é chamado de vez em quando.
 */
export async function lerXlsx(bytes, { nomeArquivo = 'planilha.xlsx', aoProgresso = () => {}, limites = LIMITES, agora = new Date() } = {}) {
  const zip = lerZip(bytes);
  const rel = {
    arquivo: nomeArquivo, em: agora.toISOString(), bytes: bytes.length || bytes.byteLength || 0,
    abas: [], fora: [], avisos: [], semCalculo: 0, exemplosSemCalculo: [], celulas: 0, formulas: 0,
    /* v0.5.1: o que veio de validação de dados, formatação condicional e comentários */
    extras: { validacoes: 0, listas: 0, condicionais: 0, notas: 0, conversas: 0, respostas: 0, abasComRegras: [], graficos: 0 },
  };
  const fora = new Map();
  const juntarFora = (item, qtd = 1, detalhe = '') => { const x = fora.get(item) || { item, qtd: 0, detalhe }; x.qtd += qtd; if (detalhe && !x.detalhe) x.detalhe = detalhe; fora.set(item, x); };

  /* ---------- livro ---------- */
  const relsRaiz = lerRels(await zip.texto('_rels/.rels'), '');
  let pWb = 'xl/workbook.xml';
  for (const r of relsRaiz.values()) if (/officeDocument$/.test(r.tipo) && r.alvo) pWb = r.alvo;
  const wb = await zip.texto(pWb);
  if (!wb) throw new Error('Este arquivo não parece ser do Excel (falta o workbook.xml).');
  const relsWb = lerRels(await zip.texto(relsDe(pWb)), pWb);
  let pSst = null, pEst = null, pTema = null;
  for (const r of relsWb.values()) {
    if (/sharedStrings$/.test(r.tipo)) pSst = r.alvo;
    else if (/styles$/.test(r.tipo)) pEst = r.alvo;
    else if (/theme$/.test(r.tipo)) pTema = r.alvo;
  }
  const date1904 = /<workbookPr\b[^>]*date1904="(1|true)"/.test(wb);
  if (date1904) rel.avisos.push('O arquivo usa o sistema de datas de 1904 (Mac antigo): as datas foram convertidas para o sistema de 1900.');

  aoProgresso({ fase: 'textos' });
  const textos = [];
  if (pSst) {
    const sx = await zip.texto(pSst);
    const rx = /<si>([\s\S]*?)<\/si>|<si\/>/g;
    let m;
    while ((m = rx.exec(sx))) textos.push(m[1] ? textoRico(m[1]) : '');
  }
  const xmlTema = pTema ? await zip.texto(pTema) : null;
  const tema = lerTema(xmlTema);
  /* v0.6.5: fontes do tema (o texto das formas usa "+mn-lt" = a fonte do corpo) */
  const fontesTema = { menor: ((/<a:minorFont>\s*<a:latin typeface="([^"]*)"/.exec(xmlTema || '') || [])[1]) || 'Calibri', maior: ((/<a:majorFont>\s*<a:latin typeface="([^"]*)"/.exec(xmlTema || '') || [])[1]) || 'Calibri Light' };
  const est = lerEstilos(pEst ? await zip.texto(pEst) : null, tema);
  const pessoas = await lerPessoas(zip, relsWb);

  /* estilos do EFCdocs (sem repetição) e a ponte xf do Excel → índice do EFCdocs */
  let estilos = [{}];
  const ponte = est.xfs.map((e) => { const r = indiceEstilo(estilos, e); estilos = r.estilos; return r.s; });
  const sDe = (xf) => (xf == null ? 0 : ponte[+xf] || 0);
  const nfDe = (s) => (s ? estilos[s].nf : null);

  /* ---------- abas ---------- */
  const folhas = [];
  let idxFolha = -1;
  for (const s of tags(tag(wb, 'sheets')?.dentro || '', 'sheet')) {
    idxFolha++;
    const r = relsWb.get(s.a['r:id'] || s.a.id);
    if (!r || !r.alvo) continue;
    if (/chartsheet$/.test(r.tipo)) { juntarFora('Abas de gráfico', 1, s.a.name); continue; }
    if (!/worksheet$/.test(r.tipo)) { juntarFora('Abas de outro tipo (macro antiga ou diálogo)', 1, s.a.name); continue; }
    folhas.push({ nome: s.a.name, parte: r.alvo, oculta: s.a.state === 'hidden' || s.a.state === 'veryHidden', idx: idxFolha });
  }
  if (!folhas.length) throw new Error('O arquivo não tem nenhuma aba de planilha.');

  /* tabelas de todas as abas (as fórmulas de uma aba podem usar a tabela de outra) */
  const tabelas = new Map();
  for (const f of folhas) {
    f.rels = lerRels(await zip.texto(relsDe(f.parte)), f.parte);
    for (const r of f.rels.values()) {
      if (!/table$/.test(r.tipo) || !r.alvo) continue;
      const tx = await zip.texto(r.alvo);
      const t = tag(tx || '', 'table');
      if (!t || !t.a.ref) continue;
      const [a, b] = t.a.ref.split(':');
      const p1 = lerChave(a), p2 = lerChave(b || a);
      if (!p1 || !p2) continue;
      const cols = tags(t.dentro, 'tableColumn').map((c) => desescapar(c.a.name || ''));
      const nome = t.a.displayName || t.a.name;
      if (/<filterColumn\b/.test(t.dentro)) (f.filtros || (f.filtros = [])).push({ l1: p1.l + 1, l2: p2.l });
      tabelas.set(nome.toLowerCase(), {
        nome, aba: f.nome, l1: p1.l, c1: p1.c, l2: p2.l, c2: p2.c, cols,
        cab: t.a.headerRowCount === '0' ? 0 : 1, tot: +(t.a.totalsRowCount || 0) > 0 || t.a.totalsRowShown === '1' && +(t.a.totalsRowCount || 0) > 0 ? 1 : 0,
      });
    }
  }
  let exemploTabela = null;
  const conv = (txt, aba, l) => {
    const sem = tirarPrefixos(txt);
    if (!tabelas.size || sem.indexOf('[') < 0 && !exemploTabela) return trocarTabelas(sem, tabelas, { aba, l });
    const r = trocarTabelas(sem, tabelas, { aba, l });
    if (!exemploTabela && r !== sem) {
      /* exemplo para o relatório: o primeiro Tabela[...] (com os colchetes de dentro) */
      for (const m of sem.matchAll(/[A-Za-z_\\À-ÿ][\wÀ-ÿ.]*\[/g)) {
        let prof = 0, k = m.index + m[0].length - 1;
        for (; k < sem.length; k++) { if (sem[k] === "'") { k++; continue; } if (sem[k] === '[') prof++; else if (sem[k] === ']' && --prof === 0) break; }
        const pedaco = sem.slice(m.index, k + 1);
        if (prof !== 0 || pedaco.length > 60 || /[\r\n]/.test(pedaco)) continue;
        const d = trocarTabelas(pedaco, tabelas, { aba, l });
        if (d !== pedaco && !/#REF!/.test(d)) { exemploTabela = `${pedaco} virou ${d}`; break; }
      }
    }
    return r;
  };

  /* partes que o EFCdocs não traz */
  const nomes = zip.nomes;
  const conta = (rx) => nomes.filter((n) => rx.test(n)).length;
  if (conta(/vbaProject\.bin$/i)) juntarFora('Macros (VBA)', 1, 'os botões que rodam macro não funcionam aqui');
  const graficosLidos = []; // v0.6.0: { aba, o } para ligar os dados à aba certa no fim
  const formasLidas = []; // v0.6.5: formas (links e textos ligados apontam para o nome da aba até o fim)
  let grFora = 0;
  const nPartesGrafico = conta(/^xl\/charts\/chart\d+\.xml$/i);
  if (conta(/^xl\/pivotTables\//i)) juntarFora('Tabelas dinâmicas', conta(/^xl\/pivotTables\/pivotTable\d+\.xml$/i), 'vêm só os valores, que não atualizam');
  const nMidias = conta(/^xl\/media\//i);
  let imgLidas = 0;
  const linksLocais = []; // links de uma aba para outra, ligados no fim
  if (conta(/^xl\/(slicers|slicerCaches|timelines|timelineCaches)\//i)) juntarFora('Segmentações de dados e linhas do tempo', conta(/^xl\/(slicers|timelines)\/[^/]+\.xml$/i) || 1);
  if (conta(/^xl\/ctrlProps\//i)) juntarFora('Botões e caixas de controle', conta(/^xl\/ctrlProps\//i));
  if (conta(/^xl\/webextensions\//i)) juntarFora('Suplementos do Office', conta(/^xl\/webextensions\/webextension\d*\.xml$/i) || 1);
  if (conta(/^xl\/externalLinks\//i)) juntarFora('Vínculos com outros arquivos', conta(/^xl\/externalLinks\/externalLink\d*\.xml$/i), 'as fórmulas que usam outro arquivo mostram o último valor');
  if (conta(/^xl\/(connections\.xml|queryTables\/)/i)) juntarFora('Consultas e conexões de dados (Power Query)', 1);

  /* nomes definidos */
  const nomesDef = {};
  let areasImpressao = 0;
  const defsImp = {}; // v0.6.0: área e títulos de impressão por aba (índice da aba no livro)
  for (const d of tags(tag(wb, 'definedNames')?.dentro || '', 'definedName')) {
    const n = d.a.name || '';
    if (/^_xlnm\./i.test(n)) {
      if (/Print_(Area|Titles)/i.test(n) && d.a.localSheetId != null) {
        const x = lerNomesImpressao(n, d.dentro);
        const k = +d.a.localSheetId;
        defsImp[k] = { ...(defsImp[k] || {}), ...x };
        if (x.varias) areasImpressao++;
      }
      continue;
    }
    if (/^_xl/i.test(n)) continue;
    let ref = desescapar(d.dentro).trim();
    if (/\[\d+\]/.test(ref)) { juntarFora('Nomes que apontam para outro arquivo', 1); continue; }
    ref = conv(ref, null, 0);
    const k = n.toLowerCase();
    if (nomesDef[k]) { if (d.a.localSheetId != null) { juntarFora('Nomes que só valem numa aba (repetidos)', 1, n); } continue; }
    nomesDef[k] = { n, ref };
  }
  if (areasImpressao) juntarFora('Áreas de impressão com várias partes', areasImpressao, 'veio só a primeira parte');

  /* ---------- cada aba ---------- */
  const conteudo = { v: 1, ordem: [], abas: {}, estilos: null, nomes: nomesDef, seq: folhas.length + 1 };
  let totalCel = 0;
  const abasZero = [];
  const avisoFormula = (f, motivo) => { rel.semCalculo++; if (rel.exemplosSemCalculo.length < 5) rel.exemplosSemCalculo.push({ f: f.slice(0, 120), motivo }); };
  const funcaoOk = new Map();
  const checarFormula = (f) => {
    if (funcaoOk.has(f)) return funcaoOk.get(f);
    let r = '';
    try {
      const arv = lerGuardada(f);
      const d = dependencias(arv);
      const desc = d.desconhecidas.filter((n) => !IMPL[n]);
      if (desc.length) r = 'função ' + [...new Set(desc)].join(', ');
    } catch { r = 'o EFCdocs ainda não entende esta fórmula'; }
    funcaoOk.set(f, r);
    if (funcaoOk.size > 50000) funcaoOk.clear();
    return r;
  };

  for (let fi = 0; fi < folhas.length; fi++) {
    const F = folhas[fi];
    const id = 'a' + (fi + 1);
    aoProgresso({ fase: 'aba', aba: F.nome, i: fi + 1, n: folhas.length, linha: 0 });
    const aba = { id, nome: F.nome, cel: {} };
    if (F.oculta) aba.oculta = true;
    const ra = { nome: F.nome, celulas: 0, formulas: 0, linhas: 0, cortes: [] };
    let cab = '', resto = '', estado = 0, buf = '';
    let ultimaReal = -1;
    const pendentes = []; // linhas sem nada à vista (ou ocultas) esperando
    let contando = null; // { de, ate, comValor } linhas puladas por serem muitas
    let pararEm = null; // passou do limite de células
    const linhasDef = new Set(); // v0.6.4: linhas que o arquivo lista e não esconde (para zeroHeight)
    const masters = new Map(); // fórmula compartilhada: si → { f, l, c }
    const cobertos = new Map(); // linha → [[c1, c2]] área de matriz (os valores vêm da fórmula)
    let nCel = 0, nForm = 0, lMax = -1, cMax = -1;
    let zeroAltura = false;
    let ultimoAviso = 0;

    const gravarLinha = (L) => {
      if (pararEm != null) return;
      if (nCel + L.cells.length > limites.celulasAba || totalCel + L.cells.length > limites.celulasTotal) { pararEm = L.r; return; }
      for (const x of L.cells) {
        const k = chave(L.r, x.c);
        const cel = {};
        if (x.v !== undefined) cel.v = x.v;
        if (x.f != null) {
          cel.f = x.f; if (x.da || RX_SO_DINAMICA.test(x.f)) cel.da = 1; else cel.lg = 1; nForm++; // FILTRO, ÚNICO, CLASSIFICAR... só existem no Excel novo: sempre matriz dinâmica, mesmo se o arquivo (LibreOffice, etc.) não marcou
          const motivo = checarFormula(x.f);
          if (motivo) avisoFormula(x.f, motivo);
        }
        if (x.s) cel.s = x.s;
        if (cel.v === undefined && cel.f == null && !cel.s) continue;
        aba.cel[k] = cel;
        nCel++; totalCel++;
        if (cel.v !== undefined || cel.f != null) { if (L.r > lMax) lMax = L.r; if (x.c > cMax) cMax = x.c; }
      }
      if (L.ht != null && L.ht !== ALT_PADRAO) { (aba.alt || (aba.alt = {}))[L.r] = L.ht; }
      if (L.oculta) { (aba.ocL || (aba.ocL = {}))[L.r] = 1; }
    };
    const soltarPendentes = () => {
      for (const L of pendentes) gravarLinha(L);
      pendentes.length = 0;
      if (contando) {
        ra.cortes.push(`linhas ${fmtN(contando.de + 1)} a ${fmtN(contando.ate + 1)}: eram ${fmtN(contando.ate - contando.de + 1)} linhas sem nada à vista (ocultas, vazias ou com fórmula que dá vazio) e não vieram`);
        contando = null;
      }
    };

    const linha = (atr, corpo) => {
      const a = atributos(atr);
      const r = (a.r ? +a.r : (linha.ult ?? -1) + 2) - 1;
      linha.ult = r;
      if (r >= MAX_LIN) return;
      const L = { r, cells: [], oculta: a.hidden === '1' || a.hidden === 'true', ht: null, s: a.customFormat === '1' ? sDe(a.s) : 0 };
      if (!L.oculta) linhasDef.add(r);
      if (a.ht && (a.customHeight === '1' || a.customHeight === 'true')) L.ht = Math.max(0, Math.round(parseFloat(a.ht) * 4 / 3));
      else if (a.ht && parseFloat(a.ht) * 4 / 3 > ALT_PADRAO * 1.4) L.ht = Math.round(parseFloat(a.ht) * 4 / 3);
      let temValor = false, temVisivel = false;
      if (corpo) {
        const rx = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
        let m, cAuto = -1;
        while ((m = rx.exec(corpo))) {
          const ca = atributos(m[1]);
          let c;
          if (ca.r) { const p = /^([A-Z]+)/.exec(ca.r); c = p ? numCol(p[1]) : cAuto + 1; } else c = cAuto + 1;
          cAuto = c;
          if (c < 0) continue;
          const dentro = m[2] || '';
          const x = { c, s: sDe(ca.s) };
          /* valor */
          const vm = dentro.indexOf('<v') >= 0 ? /<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/.exec(dentro) : null;
          const tv = ca.t || 'n';
          let v;
          if (tv === 'inlineStr') { const is = /<is>([\s\S]*?)<\/is>/.exec(dentro); v = is ? textoRico(is[1]) : ''; } else if (vm) {
            const t = vm[1];
            if (tv === 's') v = textos[+t] ?? '';
            else if (tv === 'str') v = desescapar(t);
            else if (tv === 'b') v = t === '1' || t === 'true';
            else if (tv === 'e') v = { e: desescapar(t).trim() };
            else if (tv === 'd') { const d = Date.parse(t); v = Number.isFinite(d) ? d / 86400000 + 25569 : desescapar(t); } else if (t !== '') { const n = Number(t); v = Number.isFinite(n) ? n : desescapar(t); }
          }
          if (typeof v === 'number' && date1904 && ehFormatoData(nfDe(x.s))) v += 1462;
          /* fórmula */
          const fm = dentro.indexOf('<f') >= 0 ? /<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/.exec(dentro) : null;
          let f = null;
          if (fm) {
            const fa = atributos(fm[1]);
            const txt = fm[2] != null ? desescapar(fm[2]) : '';
            if (fa.t === 'shared') {
              if (txt) {
                f = conv(txt, F.nome, r);
                if (fa.si != null) masters.set(fa.si, { f, l: r, c });
              } else {
                const ms = masters.get(fa.si);
                if (ms) {
                  try { f = escrever(deslocar(lerGuardada(ms.f), r - ms.l, c - ms.c), 'en'); } catch { f = ms.f; }
                }
              }
            } else if (fa.t === 'dataTable') {
              juntarFora('Tabelas de dados (teste de hipóteses)', 1, 'vêm só os valores');
            } else if (txt) {
              f = conv(txt, F.nome, r);
              if (fa.t === 'array') {
                x.da = 1;
                const [a1, b1] = (fa.ref || '').split(':');
                const p1 = lerChave(a1 || ''), p2 = lerChave(b1 || a1 || '');
                if (p1 && p2 && (p2.l > p1.l || p2.c > p1.c)) {
                  for (let ll = p1.l; ll <= Math.min(p2.l, p1.l + 100000); ll++) {
                    const lst = cobertos.get(ll) || [];
                    lst.push([p1.c, p2.c, ll === p1.l ? p1.c : -1]);
                    cobertos.set(ll, lst);
                  }
                }
              }
            }
          }
          /* célula dentro da área de uma matriz: o valor vem da fórmula */
          if (f == null) {
            const cob = cobertos.get(r);
            if (cob && cob.some(([c1, c2, ancora]) => c >= c1 && c <= c2 && c !== ancora)) {
              if (v !== undefined && v !== '') { temValor = true; temVisivel = temVisivel || !L.oculta; }
              v = undefined;
            }
          }
          if (f != null) x.f = f;
          if (v !== undefined) x.v = v;
          const mostra = v !== undefined && v !== '' && !(typeof v === 'string' && !v.trim() && f != null);
          if (mostra) { temValor = true; if (!L.oculta) temVisivel = true; }
          if (x.v !== undefined || x.f != null || x.s) L.cells.push(x);
        }
      }
      ra.linhas = r + 1;
      if (r - ultimoAviso > 20000) { ultimoAviso = r; aoProgresso({ fase: 'aba', aba: F.nome, i: fi + 1, n: folhas.length, linha: r + 1 }); }
      /* linha "de verdade": mostra algo */
      if (temVisivel) {
        soltarPendentes();
        gravarLinha(L);
        ultimaReal = r;
        return;
      }
      /* sem nada à vista: espera para ver se vem dado depois */
      L.temValor = temValor;
      if (!L.cells.length && L.ht == null && !L.oculta) return;
      if (contando) { contando.ate = r; if (temValor) contando.comValor++; return; }
      if (pendentes.length >= limites.guardaPendentes) { contando = { de: r, ate: r, comValor: temValor ? 1 : 0 }; return; }
      pendentes.push(L);
    };

    /* lê a aba aos pedaços */
    const processar = (fimArquivo) => {
      let p = 0;
      if (estado === 0) {
        const i = buf.indexOf('<sheetData');
        if (i < 0) { if (fimArquivo) { cab = buf; buf = ''; } return; }
        const j = buf.indexOf('>', i);
        if (j < 0) return;
        cab = buf.slice(0, i);
        if (buf[j - 1] === '/') { estado = 2; buf = buf.slice(j + 1); resto += buf; buf = ''; return; }
        estado = 1; p = j + 1;
      }
      if (estado === 1) {
        for (;;) {
          const i = buf.indexOf('<', p);
          if (i < 0) { p = buf.length; break; }
          if (buf.startsWith('<row', i)) {
            const j = buf.indexOf('>', i);
            if (j < 0) { p = i; break; }
            if (buf[j - 1] === '/') { linha(buf.slice(i + 4, j - 1), ''); p = j + 1; continue; }
            const k = buf.indexOf('</row>', j);
            if (k < 0) { p = i; break; }
            linha(buf.slice(i + 4, j), buf.slice(j + 1, k));
            p = k + 6;
            continue;
          }
          if (buf.startsWith('</sheetData', i)) { estado = 2; const j = buf.indexOf('>', i); p = j < 0 ? buf.length : j + 1; break; }
          const j = buf.indexOf('>', i);
          if (j < 0) { p = i; break; }
          p = j + 1;
        }
        buf = buf.slice(p);
        if (estado === 2) { resto += buf; buf = ''; }
        return;
      }
      resto += buf; buf = '';
    };
    const ok = await zip.pedacos(F.parte, (pedaco) => { buf += pedaco; processar(false); });
    if (!ok) { rel.avisos.push(`A aba "${F.nome}" está faltando dentro do arquivo.`); continue; }
    processar(true);

    /* ---------- cabeçalho: congelar, cor, colunas ---------- */
    const sp = tag(cab, 'sheetPr');
    if (sp) { const tc = tag(sp.dentro, 'tabColor'); if (tc) { const cor = corDe(tc.a, tema); if (cor) aba.cor = cor; } }
    const pane = tag(cab, 'pane');
    if (pane && /frozen/i.test(pane.a.state || '')) {
      const l = Math.round(+(pane.a.ySplit || 0)), c = Math.round(+(pane.a.xSplit || 0));
      if (l > 0 || c > 0) aba.cong = { l, c };
    }
    const sfp = tag(cab, 'sheetFormatPr');
    if (sfp && (sfp.a.zeroHeight === '1' || sfp.a.zeroHeight === 'true')) zeroAltura = true;
    const colsDef = tags(tag(cab, 'cols')?.dentro || '', 'col');

    /* ---------- fim da aba: o que fica das linhas pendentes ---------- */
    if (pendentes.length || contando) {
      const ocultasComValor = pendentes.filter((L) => L.temValor).length + (contando ? contando.comValor : 0);
      let ateLinha = ultimaReal + limites.folga;
      const ultPend = pendentes.length ? pendentes[pendentes.length - 1].r : ultimaReal;
      const ultOcultaValor = [...pendentes].reverse().find((L) => L.temValor);
      if (ocultasComValor && ocultasComValor <= limites.ocultas && !contando && ultOcultaValor) ateLinha = Math.max(ateLinha, ultOcultaValor.r);
      const ficam = pendentes.filter((L) => L.r <= ateLinha);
      for (const L of ficam) gravarLinha(L);
      const ultima = contando ? contando.ate : ultPend;
      if (ultima > ateLinha) {
        const ini = Math.max(ateLinha + 1, ficam.length ? ficam[ficam.length - 1].r + 1 : ateLinha + 1);
        ra.cortes.push(ocultasComValor > limites.ocultas
          ? `linhas ${fmtN(ini + 1)} a ${fmtN(ultima + 1)}: eram ${fmtN(ocultasComValor)} linhas ocultas com valores no fim da aba (sobra de cópia); não vieram`
          : `linhas ${fmtN(ini + 1)} a ${fmtN(ultima + 1)}: não mostravam nada (vazias, só com formatação ou com fórmula que dá vazio). Ficaram ${fmtN(limites.folga)} linhas de folga depois do último dado; se precisar de mais, copie a fórmula para baixo`);
      }
      pendentes.length = 0; contando = null;
    }
    if (pararEm != null) ra.cortes.push(`a aba passou de ${fmtN(limites.celulasAba)} células: parou na linha ${fmtN(pararEm + 1)}`);
    if (zeroAltura) {
      /* v0.6.4: com zeroHeight o Excel esconde toda linha que o arquivo não lista; as de baixo ficam escondidas até 1.000 linhas depois da última listada */
      abasZero.push(F.nome);
      const ult = linhasDef.size ? Math.max(...linhasDef) : -1;
      const fim = Math.min(MAX_LIN - 1, ult + 1000);
      let n = 0;
      for (let r = 0; r <= fim; r++) if (!linhasDef.has(r)) { (aba.ocL || (aba.ocL = {}))[r] = 1; n++; }
      void n;
    }

    /* células só com formatação muito à direita do último dado saem */
    for (const k of Object.keys(aba.cel)) {
      const x = aba.cel[k];
      if (x.v !== undefined || x.f != null) continue;
      const p = lerChave(k);
      if (p && (p.c > cMax + 2 || p.l > lMax + limites.folga)) { delete aba.cel[k]; nCel--; totalCel--; }
    }

    /* colunas: largura, ocultas */
    const ultCol = Math.max(cMax + 50, 25);
    for (const cd of colsDef) {
      const c1 = +cd.a.min - 1, c2 = Math.min(+cd.a.max - 1, ultCol);
      if (!(c1 >= 0)) continue;
      const w = cd.a.width != null ? parseFloat(cd.a.width) : null;
      const px = w != null ? Math.max(0, Math.trunc(((256 * w + Math.trunc(128 / 7)) / 256) * 7)) : null;
      for (let c = c1; c <= c2; c++) {
        if (cd.a.hidden === '1' || cd.a.hidden === 'true') (aba.ocC || (aba.ocC = {}))[c] = 1;
        else if (px != null && (cd.a.customWidth === '1' || Math.abs(px - 64) > 2) && px !== LARG_PADRAO) (aba.larg || (aba.larg = {}))[c] = px;
      }
    }

    /* v0.6.0: configurar página (margens, papel, escala, títulos e área de impressão, cabeçalho e rodapé, quebras) */
    { const imp = lerImpressaoAba(cab, resto, defsImp[F.idx] || {}); if (imp) aba.imp = imp; }
    /* v0.6.0: gráficos da aba */
    if (F.rels && [...F.rels.values()].some((r) => /drawing$/.test(r.tipo))) {
      const gr = await lerGraficosAba(zip, F.rels, aba, async (parte) => lerRels(await zip.texto(relsDe(parte)), parte), tema, fontesTema);
      for (const o of gr.objs) {
        if (o.tipo === 'imagem') { (aba.objs || (aba.objs = [])).push({ id: idObjeto(), ...o }); imgLidas++; continue; }
        /* v0.6.5: formas e grupos (painéis, setas, botões com link, caixas de texto) */
        if (o.tipo === 'forma') {
          const f = { ...o, id: idObjeto() };
          (aba.objs || (aba.objs = [])).push(f); formasLidas.push(f);
          rel.extras.formas = (rel.extras.formas || 0) + 1;
          imgLidas += f.partes.filter((p) => p.g === 'img').length;
          continue;
        }
        graficosLidos.push({ aba, o }); rel.extras.graficos++;
      }
      for (const x of gr.fora) {
        if (x.gif) juntarFora('Imagens GIF animadas', 1, x.motivo);
        else if (x.imagem) juntarFora('Imagens', 1, x.motivo);
        else if (x.item) juntarFora(x.item, x.qtd || 1, x.motivo);
        else { juntarFora('Gráficos', 1, x.motivo); grFora += 1; }
      }
    }

    /* mescladas, e o que a aba tem que não vem */
    const mesc = [];
    for (const m of resto.matchAll(/<mergeCell ref="([^"]+)"/g)) {
      const [a1, b1] = m[1].split(':');
      const p1 = lerChave(a1), p2 = lerChave(b1 || a1);
      if (!p1 || !p2 || (p1.l === p2.l && p1.c === p2.c)) continue;
      if (p1.l > lMax + limites.folga) continue;
      mesc.push(m[1].toUpperCase());
    }
    if (mesc.length) aba.mesc = mesc;
    /* v0.5.1: validação de dados (listas suspensas), formatação condicional e comentários */
    if (resto.indexOf('dataValidation') >= 0) {
      const v = lerValidacoes(resto, conv, F.nome);
      if (v.val.length) { aba.val = v.val; rel.extras.validacoes += v.val.length; rel.extras.listas += v.val.filter((x) => x.t === 'list').length; }
      if (v.ignoradas) juntarFora('Validação de dados de tipo desconhecido', v.ignoradas);
    }
    if (resto.indexOf('onditionalFormatting') >= 0) {
      const cf = lerCondicionais(resto, est.dxfs || [], conv, F.nome, est.corFn);
      if (cf.regras.length) { aba.cf = cf.regras; rel.extras.condicionais += cf.regras.length; }
      if (cf.fora.escalas) juntarFora('Escalas de cor (formatação condicional)', cf.fora.escalas, 'chegam numa versão próxima; as outras regras da aba vieram');
      if (cf.fora.barras) juntarFora('Barras de dados (formatação condicional)', cf.fora.barras, 'chegam numa versão próxima');
      if (cf.fora.icones) juntarFora('Conjuntos de ícones (formatação condicional)', cf.fora.icones, 'chegam numa versão próxima');
      if (cf.fora.periodo) juntarFora('Regras de datas (hoje, ontem, esta semana...)', cf.fora.periodo);
      if (cf.fora.outras) juntarFora('Regras de formatação condicional que o EFCdocs não entende', cf.fora.outras);
    }
    if (aba.val || aba.cf) rel.extras.abasComRegras.push(F.nome);
    if (F.rels) {
      const co = await lerComentarios(zip, F.rels, pessoas);
      if (Object.keys(co.com).length) { aba.com = co.com; rel.extras.notas += co.notas; rel.extras.conversas += co.conversas; rel.extras.respostas += co.respostas; }
    }
    /* v0.6.3: links das células (internet e e-mail já; os de dentro da planilha são ligados no fim, quando todas as abas existem) */
    { let perdidos = 0;
      for (const h of tags(resto, 'hyperlink')) {
        const ref = String(h.a.ref || '').toUpperCase().split(':');
        const p1 = lerChave(ref[0]), p2 = lerChave(ref[1] || ref[0]);
        if (!p1 || !p2) { perdidos++; continue; }
        const dica = h.a.tooltip ? String(h.a.tooltip).slice(0, 255) : undefined;
        let lk = null;
        if (h.a['r:id']) {
          const rr = F.rels && F.rels.get(h.a['r:id']);
          const u = rr && rr.externo ? urlSegura(rr.url) : '';
          if (u) lk = { t: 'u', u, ...(dica ? { d: dica } : {}) };
        } else if (h.a.location) {
          const m = /^(?:'((?:[^']|'')+)'|([^'!]+))!\$?([A-Za-z]+)\$?(\d+)(?::.*)?$/.exec(String(h.a.location).trim());
          if (m) linksLocais.push({ aba, p1, p2, nomeAba: (m[1] ? m[1].replace(/''/g, "'") : m[2]).toLowerCase(), r: `${m[3].toUpperCase()}${m[4]}`, d: dica });
          else perdidos++;
          continue;
        }
        if (!lk) { perdidos++; continue; }
        for (let l = p1.l; l <= Math.min(p2.l, p1.l + 200); l++) for (let cc = p1.c; cc <= Math.min(p2.c, p1.c + 50); cc++) {
          const x = aba.cel[chave(l, cc)]; if (x) x.lk = { ...lk };
        }
        rel.extras.links = (rel.extras.links || 0) + 1;
      }
      if (perdidos) juntarFora('Links nas células', perdidos, 'link para arquivo, nome definido ou endereço que o EFCdocs não abre; o texto vem');
    }
    /* v0.6.3: filtro automático (setas + critérios de lista) e aba protegida */
    const filtros = [...(F.filtros || [])];
    const af = /<autoFilter\b([^>]*?)(?:\/>|>([\s\S]*?)<\/autoFilter>)/.exec(resto);
    if (af) {
      const at = atributos(af[1]);
      const [a1, b1] = String(at.ref || '').split(':');
      const p1 = lerChave(a1), p2 = lerChave(b1 || a1);
      const colunas = tags(af[2] || '', 'filterColumn');
      if (p1 && p2 && p2.l > p1.l) {
        const cr = {};
        let naoEntram = 0;
        for (const fc of colunas) {
          const lista = tag(fc.dentro, 'filters');
          const col = p1.c + (+fc.a.colId || 0);
          if (lista && !/<dateGroupItem\b/.test(lista.dentro) && col >= p1.c && col <= p2.c) {
            const v = tags(lista.dentro, 'filter').map((x) => x.a.val ?? '');
            if (lista.a.blank === '1' || lista.a.blank === 'true') v.push('');
            cr[col] = { v };
          } else naoEntram++;
        }
        aba.fil = { fx: `${chave(p1.l, p1.c)}:${chave(p2.l, p2.c)}`, cr };
        if (naoEntram) juntarFora('Filtros', naoEntram, 'critérios de data, cor ou "maiores que" não entram; as linhas escondidas continuam escondidas');
      } else if (colunas.length) juntarFora('Filtros', 1, 'as linhas escondidas pelo filtro continuam escondidas; os botões de filtro não vêm');
      if (colunas.length && p1 && p2) filtros.push({ l1: p1.l + 1, l2: p2.l });
    }
    if (filtros.length && aba.ocL) {
      for (const k of Object.keys(aba.ocL)) { const l = +k; if (filtros.some((x) => l >= x.l1 && l <= x.l2)) (aba.ocF || (aba.ocF = {}))[l] = 1; }
    }
    const protTag = /<sheetProtection\b([^>]*?)\/?>/.exec(resto);
    if (protTag) {
      const at = atributos(protTag[1]);
      if (at.sheet === '1' || at.sheet === 'true') {
        /* v0.6.4: guarda a senha e também as permissões finas (formatar células, inserir linhas...) para voltarem iguais */
        const guardados = {};
        for (const [k, v] of Object.entries(at)) if (k !== 'sheet' && /^[A-Za-z]+$/.test(k) && v !== '') guardados[k] = String(v);
        aba.prot = Object.keys(guardados).length ? { a: guardados } : 1;
      }
    }

    if (nCel < 0) nCel = 0;
    ra.celulas = nCel; ra.formulas = nForm;
    rel.celulas += nCel; rel.formulas += nForm;
    rel.abas.push(ra);
    conteudo.ordem.push(id);
    conteudo.abas[id] = aba;
  }

  if (abasZero.length) rel.avisos.push(`${abasZero.length === 1 ? `Na aba "${abasZero[0]}"` : `Nas abas ${abasZero.map((n) => `"${n}"`).join(', ')}`}, as linhas que o arquivo não lista ficavam escondidas no Excel; aqui continuam escondidas (Layout › Reexibir mostra de novo).`);
  if (tabelas.size) rel.avisos.push(`${tabelas.size === 1 ? 'A tabela' : `As ${tabelas.size} tabelas`} do Excel ${tabelas.size === 1 ? 'virou' : 'viraram'} faixa normal: nas fórmulas, o nome da coluna virou o endereço${exemploTabela ? ` (por exemplo, ${exemploTabela})` : ''}. A conta é a mesma.`);

  /* tabelas: guarda onde ficavam (para INDIRECT("Tabela[Coluna]") nas listas suspensas) */
  if (tabelas.size) {
    const porNome = new Map(conteudo.ordem.map((id) => [conteudo.abas[id].nome.toLowerCase(), id]));
    const tb = {};
    for (const [k, t] of tabelas) { const id = porNome.get(String(t.aba).toLowerCase()); if (id) tb[k] = { nome: t.nome, aba: id, l1: t.l1, c1: t.c1, l2: t.l2, c2: t.c2, cols: t.cols, cab: t.cab, tot: t.tot }; }
    if (Object.keys(tb).length) conteudo.tabelas = tb;
  }

  /* abas com nome repetido ou vazio (não deveria acontecer) */
  const vistos = new Set();
  conteudo.ordem.forEach((id, i) => {
    const a = conteudo.abas[id];
    let n = String(a.nome || '').trim().slice(0, 31) || NOME_ABA_PADRAO(i + 1);
    while (vistos.has(n.toLowerCase())) n = n.slice(0, 28) + ' ' + (i + 1);
    vistos.add(n.toLowerCase());
    a.nome = n;
  });
  if (conteudo.ordem.every((id) => conteudo.abas[id].oculta)) delete conteudo.abas[conteudo.ordem[0]].oculta;
  if (nMidias > imgLidas && !fora.has('Imagens')) juntarFora('Imagens', nMidias - imgLidas, 'figuras dentro de formas, de células ou de fundo não vêm');
  if (nPartesGrafico > graficosLidos.length + grFora) juntarFora('Gráficos', nPartesGrafico - graficosLidos.length - grFora, 'não estão presos a nenhuma aba');
  /* links de dentro da planilha: o nome da aba vira o id */
  {
    const porNomeL = new Map(conteudo.ordem.map((id) => [conteudo.abas[id].nome.toLowerCase(), id]));
    let sem = 0;
    for (const L of linksLocais) {
      const alvo = porNomeL.get(L.nomeAba);
      if (!alvo) { sem++; continue; }
      for (let l = L.p1.l; l <= Math.min(L.p2.l, L.p1.l + 200); l++) for (let cc = L.p1.c; cc <= Math.min(L.p2.c, L.p1.c + 50); cc++) {
        const x = L.aba.cel[chave(l, cc)]; if (x) x.lk = { t: 'a', a: alvo, r: L.r, ...(L.d ? { d: L.d } : {}) };
      }
      rel.extras.links = (rel.extras.links || 0) + 1;
    }
    if (sem) juntarFora('Links nas células', sem, 'levam a uma aba que não veio; o texto vem');
  }
  /* gráficos: o nome da aba dos dados vira o id da aba */
  {
    const porNome = new Map(conteudo.ordem.map((id) => [conteudo.abas[id].nome.toLowerCase(), id]));
    const avisosG = new Set();
    let soGuardado = 0;
    for (const { aba, o } of graficosLidos) {
      const { nomeAbaDados, avisos, ...resto } = o; void nomeAbaDados;
      for (const a of avisos || []) avisosG.add(a);
      if (o.g.t === 'excel') {
        /* v0.6.1: gráfico do Excel com a formatação toda; as referências passam a apontar para o id da aba */
        const g = { ...o.g };
        soGuardado += ligarRefsAoLivro(g, (nome) => porNome.get(String(nome).toLowerCase()) || null, aba.id);
        (aba.objs || (aba.objs = [])).push({ id: idObjeto(), ...resto, g });
        continue;
      }
      const idAba = o.g.dados.aba ? (conteudo.abas[o.g.dados.aba] ? o.g.dados.aba : porNome.get(String(o.g.dados.aba).toLowerCase())) : null;
      if (o.g.dados.aba && !idAba) { juntarFora('Gráficos', 1, 'os dados estão numa aba que não veio'); rel.extras.graficos--; continue; }
      const obj = { id: idObjeto(), ...resto, g: { ...o.g, dados: { ...o.g.dados, aba: idAba && idAba !== aba.id ? idAba : '' } } };
      (aba.objs || (aba.objs = [])).push(obj);
    }
    if (soGuardado) rel.avisos.push(`Em ${soGuardado === 1 ? 'uma série de gráfico' : `${soGuardado} séries de gráfico`}, os dados vêm de outro arquivo, de várias áreas ou de uma aba que não veio: o gráfico mostra os números que o Excel guardou e não acompanha mais as células.`);
    for (const a of avisosG) rel.avisos.push(`Gráficos: ${a}.`);
    /* v0.6.5: formas: o nome da aba dos links vira o id; e tudo do desenho na ordem do Excel (o de cima por último) */
    let linksSemAba = 0;
    for (const f of formasLidas) {
      ligarFormaAoLivro(f, (nome) => porNome.get(String(nome).toLowerCase()) || null);
      linksSemAba += f.partes.filter((p) => p.link && p.link.abaNome).length;
    }
    if (linksSemAba) juntarFora('Links de formas', linksSemAba, 'levam a uma aba que não veio');
    for (const id of conteudo.ordem) {
      const A = conteudo.abas[id];
      if (!A.objs || !A.objs.some((o) => o.ordem != null)) continue;
      A.objs = A.objs.map((o, i) => ({ o, i })).sort((a, b) => (a.o.ordem ?? 1e9) - (b.o.ordem ?? 1e9) || a.i - b.i).map(({ o }) => { const { ordem, ...resto } = o; void ordem; return resto; });
    }
  }
  conteudo.estilos = estilos;
  if (est.fonteBase && est.fonteBase.nome) conteudo.fonteBase = est.fonteBase.nome;
  /* v0.6.5: o tema do arquivo volta igual ao salvar (cores e estilos das formas e dos gráficos do Excel dependem dele) */
  if (xmlTema && xmlTema.length < 120000 && /<(\w+:)?theme\b/.test(xmlTema)) conteudo.temaXml = xmlTema.replace(/^\s*<\?xml[^>]*\?>\s*/, '');
  conteudo.calcExcel = true; // até a primeira mudança, as fórmulas começam com o último valor do Excel (abre rápido)
  rel.fora = [...fora.values()];
  conteudo.importado = rel;
  aoProgresso({ fase: 'pronto' });
  void letraCol;
  return { conteudo, relatorio: rel };
}
