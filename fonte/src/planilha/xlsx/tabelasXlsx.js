/* Vértice Docs v0.6.39 — Planilha: o que a tabela do Excel tem a mais e antes se perdia ao salvar (T0 do estudo de tabelas).
   - Linha de totais: a função de cada coluna (totalsRowFunction) e o rótulo (totalsRowLabel) saem da própria linha de totais
     na hora de gravar: =SUBTOTAL(109;...) é "sum", texto é rótulo, outra fórmula é "custom" com a fórmula. Assim continuam
     certos depois de mexer no app (Design da Tabela › total da coluna).
   - Coluna calculada (calculatedColumnFormula): guardada como veio do Excel, por nome de coluna; volta enquanto a coluna
     existir com o mesmo nome e alguma linha de dados dela tiver fórmula (o Excel aceita exceções na coluna calculada e só as marca).
   - Ordenação guardada (sortState): guardada como veio; volta enquanto a tabela estiver no mesmo lugar e do mesmo tamanho.
   v0.6.40 (T2): o filtro da tabela vira o filtro dela no app (fil, com setas); tabela sem <autoFilter> fica sem setas (sf). */
import { tags, tag, desescapar, escapar } from './xml.js';
import { chave, lerChave } from '../ref.js';
import { criterioDoXlsx } from '../filtroCriterios.js';

/** Critérios do <autoFilter> da tabela: lista de valores e os que o app entende vão em cr; o resto, cru, em cx (como no filtro da aba). */
function filtroDaTabelaXlsx(af, ref) {
  const p1 = lerChave(String(ref || '').split(':')[0]);
  const cr = {}, cx = {};
  if (!p1) return { cr };
  for (const fc of tags(af.dentro || '', 'filterColumn')) {
    const col = p1.c + (+fc.a.colId || 0), lista = tag(fc.dentro, 'filters');
    if (lista && !/<dateGroupItem\b/.test(lista.dentro)) {
      const v = tags(lista.dentro, 'filter').map((x) => x.a.val ?? '');
      if (lista.a.blank === '1' || lista.a.blank === 'true') v.push('');
      cr[col] = { v };
    } else { const k = criterioDoXlsx(fc.dentro); if (k) cr[col] = k; else cx[col] = fc.bruto.replace(/\scolId="[^"]*"/, ''); }
  }
  return { cr, ...(Object.keys(cx).length ? { cx } : {}) };
}

/** Código do SUBTOTAL → totalsRowFunction do Excel. */
const FN_DO_CODIGO = { 101: 'average', 102: 'countNums', 103: 'count', 104: 'max', 105: 'min', 107: 'stdDev', 109: 'sum', 110: 'var', 1: 'average', 2: 'countNums', 3: 'count', 4: 'max', 5: 'min', 7: 'stdDev', 9: 'sum', 10: 'var' };

/** Ao ler: { fxc: { nomeDaColuna: fórmula }, ord: '<sortState…>', ordRef, fil | sf } com o que existir. */
export function extrasDaTabela(t) {
  const out = {};
  const fxc = {};
  for (const c of tags(t.dentro, 'tableColumn')) {
    const f = tag(c.dentro, 'calculatedColumnFormula');
    if (f && f.dentro && !/array="1"/.test(f.bruto)) fxc[desescapar(c.a.name || '')] = desescapar(f.dentro);
  }
  if (Object.keys(fxc).length) out.fxc = fxc;
  if (t.a.headerRowCount !== '0') { const af = tag(t.dentro, 'autoFilter'); if (af) out.fil = filtroDaTabelaXlsx(af, t.a.ref); else out.sf = 1; }
  const so = tag(t.dentro, 'sortState');
  if (so) { out.ord = so.bruto; out.ordRef = t.a.ref; }
  return out;
}

/** Ao gravar: os atributos e filhos de cada <tableColumn> (totais e coluna calculada). t = tabela do modelo, aba = a aba dela,
    titulo = o título que vai no arquivo (vale quando t.cols está vazio). v0.6.40 (D-66): depois de inserir ou excluir coluna, t.cols fica vazio até salvar
    (os títulos são relidos das células) e ler t.cols[i] derrubava o Salvar como Excel. */
export function extrasDaColuna(t, aba, i, titulo) {
  const col = t.c1 + i, nome = t.cols && t.cols[i] != null ? t.cols[i] : titulo; /* o nome como veio do Excel (é a chave do fxc) */
  let atr = '', filhos = '';
  if (t.tot && aba) {
    const x = aba.cel[chave(t.l2, col)];
    if (x && x.f != null) {
      const m = /^SUBTOTAL\((\d+),/i.exec(x.f);
      const fn = m && FN_DO_CODIGO[+m[1]];
      if (fn) atr += ` totalsRowFunction="${fn}"`;
      else { atr += ' totalsRowFunction="custom"'; filhos += `<totalsRowFormula>${escapar(x.f)}</totalsRowFormula>`; }
    } else if (x && x.v != null && x.v !== '' && typeof x.v === 'string') atr += ` totalsRowLabel="${escapar(x.v, true)}"`;
  }
  const fx = t.fxc && t.fxc[nome];
  if (fx != null && aba && t.cab) {
    let alguma = false;
    for (let l = t.l1 + 1; l <= t.l2 - (t.tot ? 1 : 0); l++) { const x = aba.cel[chave(l, col)]; if (x && x.f != null) { alguma = true; break; } }
    if (alguma) filhos = `<calculatedColumnFormula>${escapar(fx)}</calculatedColumnFormula>` + filhos;
  }
  return { atr, filhos };
}

/** Ao gravar: põe a ordenação guardada dentro do <autoFilter> (se a tabela continua no mesmo lugar). */
export function comOrdenacao(autoXml, t, ref) {
  if (!t.ord || t.ordRef !== ref || !autoXml) return autoXml;
  if (/<sortState\b/.test(autoXml)) return autoXml;
  return /\/>\s*$/.test(autoXml) ? autoXml.replace(/\/>\s*$/, `>${t.ord}</autoFilter>`) : autoXml.replace(/<\/autoFilter>\s*$/, `${t.ord}</autoFilter>`);
}
