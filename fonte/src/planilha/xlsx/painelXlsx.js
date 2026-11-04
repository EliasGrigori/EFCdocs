/* EFCdocs v0.6.7 — Painel no Excel.
   Ao salvar: a aba Painel vira uma aba comum com os gráficos nativos, os números grandes como formas com o texto ligado
   a uma célula escondida embaixo deles (o Excel mostra o valor e atualiza), os textos como caixas de texto e as tabelas
   como células com fórmulas que apontam para a aba de origem. O painel inteiro vai também no extLst da aba (JSON, com os
   nomes das abas no lugar dos ids), para o EFCdocs abrir de novo como Painel.
   Ao abrir: se a aba tem esse JSON, ela volta a ser Painel (as formas e células feitas para o Excel são deixadas de lado). */
import { PAINEL, normalizarPainel, textoDoNumero, textoDaMeta } from '../painel.js';
import { refsDoPlano } from '../graficoPlano.js';
import { paraMostrar, ler as lerFormula, escrever } from '../formula.js';
import { formatar } from '../formato.js';
import { indiceEstilo, estiloDe } from '../modelo.js';
import { letraCol, lerChave } from '../ref.js';
import { ancoraMais } from './formasXlsx.js';
import { escapar } from './xml.js';

export const URI_PAINEL = '{5B7C0E1A-EFC0-4D0C-9A57-2F6D1C0E0067}';
const W0 = 1100;
const ehErroV = (v) => v && typeof v === 'object' && (v.cod || v.e);

/** Troca a referência às abas em todo o painel: f(idOuNome) → novo (ids → nomes ao salvar; nomes → ids ao abrir). */
export function trocarAbasDoPainel(painel, f) {
  const out = JSON.parse(JSON.stringify(painel));
  for (const p of out.pecas) {
    if (p.t === 'tabela' && p.aba) p.aba = f(p.aba) || p.aba;
    if (p.t === 'grafico' && p.g) {
      const g = p.g;
      if (g.t === 'excel' && g.plano) {
        for (const r of refsDoPlano(g.plano)) if (r && r.aba) r.aba = f(r.aba) || r.aba;
        for (const us of g.plano.formas || []) for (const q of (us.f && us.f.partes) || []) if (q.texto && q.texto.ligado && q.texto.ligado.aba) q.texto.ligado.aba = f(q.texto.ligado.aba) || q.texto.ligado.aba;
        if (g.xoAbas) { const xa = {}; for (const [k, v] of Object.entries(g.xoAbas)) xa[f(k) || k] = v; g.xoAbas = xa; }
      } else if (g.dados && g.dados.aba) g.dados.aba = f(g.dados.aba) || g.dados.aba;
    }
  }
  return out;
}

const ret = (p) => {
  const col = (W0 - 2 * PAINEL.PAD - PAINEL.GAP * (PAINEL.COLS - 1)) / PAINEL.COLS;
  return { x: PAINEL.PAD + p.x * (col + PAINEL.GAP), y: PAINEL.PAD + p.y * PAINEL.LIN, w: p.w * (col + PAINEL.GAP) - PAINEL.GAP, h: p.h * PAINEL.LIN - PAINEL.GAP };
};
const texto = (t, { tam = 11, cor = '#1f2d36', neg = false, al = 'l', anc = 't' } = {}) => ({
  pars: String(t ?? '').split('\n').map((ln) => ({ al, runs: ln ? [{ t: ln, tam, cor, ...(neg ? { neg: true } : {}) }] : [] })),
  anc, ins: [9.6, 4.8, 9.6, 4.8], wrap: true, cor,
});

/**
 * c (conteúdo) → conteúdo para gravar, com as abas Painel trocadas por abas comuns (e o JSON de volta em painelJson).
 * motor: o motor já carregado (para o valor de agora dos números, que o Excel mostra antes de recalcular).
 */
export function comPaineisParaExcel(c, motor) {
  if (!c.ordem.some((id) => c.abas[id] && c.abas[id].painel)) return c;
  const estilos = [...(c.estilos || [{}])];
  const abas = { ...c.abas };
  const nomeDe = (id) => (c.abas[id] ? c.abas[id].nome : null);
  for (const id of c.ordem) {
    const A = c.abas[id];
    if (!A.painel || !Array.isArray(A.painel.pecas)) continue;
    const painel = normalizarPainel(A.painel);
    /* imprime como o PDF do painel: A4 deitada, a aba toda numa página */
    const base = { id, nome: A.nome, cel: {}, largP: 64, altP: 20, imp: { orient: 'paisagem', papel: 'A4', escala: { modo: 'pagina' }, centH: true }, ...(A.cor ? { cor: A.cor } : {}), ...(A.oculta ? { oculta: true } : {}) };
    const objs = [];
    let usadas = new Set();
    const ancora = (px, py) => ancoraMais(base, 0, 0, 0, 0, px, py);
    /* sem forma de fundo: ela ficaria por cima das células das tabelas */
    for (const p of [...painel.pecas].sort((a, b) => a.y - b.y || a.x - b.x)) {
      const r = ret(p);
      const an = ancora(r.x, r.y);
      const caixa = (sufixo, w, h, partes, extra = {}) => ({ id: `${p.id}-${sufixo}`, tipo: 'forma', ...an, w, h, w0: w, h0: h, nome: extra.nome || 'Peça do painel', partes, ed: 'oneCell', ...extra });
      if (p.t === 'grafico') { objs.push({ id: p.id, tipo: 'grafico', ...an, w: Math.round(r.w), h: Math.round(r.h), g: p.g }); continue; }
      if (p.t === 'texto') {
        const fd = p.fundo && p.fundo !== 'nenhum' ? { t: 'solido', cor: p.fundo } : { t: 'nenhum' };
        objs.push(caixa('t', r.w, r.h, [{ g: 'rect', x: 0, y: 0, w: r.w, h: r.h, preench: fd, linha: { t: 'nenhum' }, txBox: true, texto: texto(p.texto, { tam: p.tam, cor: p.cor || '#1f2d36', neg: !!p.negrito, al: { e: 'l', c: 'ctr', d: 'r' }[p.al] || 'l', anc: 'ctr' }) }], { nome: 'Texto do painel' }));
        continue;
      }
      if (p.t === 'numero') {
        /* a célula embaixo do cartão guarda a conta; a caixa do número mostra a célula (textlink) */
        /* a primeira célula inteira embaixo do cartão (a da borda podia aparecer do lado dele) */
        let l = an.l + (an.dy > 0 ? 1 : 0), k = an.c + (an.dx > 0 ? 1 : 0);
        while (usadas.has(l + ':' + k)) k++;
        usadas.add(l + ':' + k);
        let v = null;
        try { const pv = motor.previa(paraMostrar(p.f), id, l, k); v = pv.erro ? null : pv.valor; } catch { v = null; }
        const nf = p.nf || 'General';
        const ie = indiceEstilo(estilos, nf !== 'General' ? { nf } : {});
        if (ie.estilos !== estilos) { estilos.length = 0; estilos.push(...ie.estilos); }
        /* sem formato: no Excel também no máximo 2 casas (ARRED só quando o valor de agora é número quebrado) */
        const quebrado = nf === 'General' && typeof v === 'number' && !Number.isInteger(v);
        base.cel[letraCol(k) + (l + 1)] = { f: quebrado ? `ROUND(${p.f},2)` : p.f, ...(ie.s ? { s: ie.s } : {}), vc: ehErroV(v) ? 0 : quebrado ? Math.round(v * 100) / 100 : v ?? 0 };
        let comp = null;
        if (p.fc) { try { const pc = motor.previa(paraMostrar(p.fc), id, l, k); comp = pc.erro ? null : pc.valor; } catch { comp = null; } }
        const n = textoDoNumero(p, v, comp, (x, f) => { try { return formatar(x, f).t; } catch { return String(x); } });
        const hRot = p.rotulo ? 26 : 0, hBaixo = n.comp || p.meta ? 22 : 0;
        const partes = [
          { g: 'roundRect', x: 0, y: 0, w: r.w, h: r.h, adj: { adj: 8000 }, preench: { t: 'solido', cor: '#ffffff' }, linha: { t: 'solido', cor: '#d5dde3', larg: 0.75 } },
        ];
        if (p.rotulo) partes.push({ g: 'rect', x: 0, y: 4, w: r.w, h: hRot, preench: { t: 'nenhum' }, linha: { t: 'nenhum' }, txBox: true, texto: texto(p.rotulo, { tam: 9, cor: '#5b6b76', neg: true }) });
        partes.push({ g: 'rect', x: 0, y: hRot, w: r.w, h: Math.max(20, r.h - hRot - hBaixo), preench: { t: 'nenhum' }, linha: { t: 'nenhum' }, txBox: true,
          texto: { ...texto(n.texto, { tam: Math.max(12, Math.min(40, Math.round((r.h - hRot - hBaixo) * 0.45))), cor: n.cor || '#1f2d36', neg: true, anc: 'ctr' }), ligado: { ref: letraCol(k) + (l + 1), v: n.texto } } });
        if (hBaixo) partes.push({ g: 'rect', x: 0, y: r.h - hBaixo - 2, w: r.w, h: hBaixo, preench: { t: 'nenhum' }, linha: { t: 'nenhum' }, txBox: true, texto: texto([n.comp, textoDaMeta(p.meta)].filter(Boolean).join('   '), { tam: 8, cor: '#5b6b76' }) });
        objs.push(caixa('n', r.w, r.h, partes, { nome: 'Número: ' + (p.rotulo || 'painel') }));
        continue;
      }
      if (p.t === 'tabela') {
        const orig = c.abas[p.aba];
        const m = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(p.fx || '');
        if (!orig || !m) continue;
        const a = lerChave(m[1] + m[2]), b = lerChave((m[3] || m[1]) + (m[4] || m[2]));
        const nomeO = /^[A-Za-z_][A-Za-z0-9_.]*$/.test(orig.nome) ? orig.nome : "'" + orig.nome.replace(/'/g, "''") + "'";
        /* a tabela começa na primeira célula inteira dentro da peça (senão a 1ª coluna ficava embaixo da peça do lado) */
        const l0 = an.l + (an.dy > 0 ? 1 : 0), c0 = an.c + (an.dx > 0 ? 1 : 0);
        let li = 0;
        for (let ll = a.l; ll <= b.l && li < 50; ll++, li++) {
          let ki = 0;
          for (let kk = a.c; kk <= b.c && ki < 12; kk++, ki++) {
            const ref = letraCol(kk) + (ll + 1);
            const src = orig.cel[ref];
            const alvo = letraCol(c0 + ki) + (l0 + li + 1);
            if (usadas.has((l0 + li) + ':' + (c0 + ki))) continue;
            let v; try { v = motor.valor(p.aba, ll, kk); } catch { v = null; }
            const e = estiloDe(c, src || {});
            base.cel[alvo] = { f: `${nomeO}!${ref}`, ...(src && src.s ? { s: src.s } : {}), vc: ehErroV(v) || v == null ? (e.nf && /@/.test(e.nf) ? '' : 0) : v };
          }
        }
        continue;
      }
    }
    base.objs = objs;
    base.painelJson = JSON.stringify(trocarAbasDoPainel(painel, nomeDe));
    abas[id] = base;
    void usadas;
    usadas = null;
  }
  return { ...c, abas, estilos };
}

/** O pedaço do extLst da aba com o painel (para o EFCdocs abrir de novo como Painel). */
export const extDoPainel = (json) => `<extLst><ext uri="${URI_PAINEL}" xmlns:efc="urn:efcdocs:painel"><efc:painel>${escapar(json)}</efc:painel></ext></extLst>`;

/** Ao abrir: o JSON do painel no fim da aba (resto do XML da aba) → painel com os ids das abas, ou null. */
export function painelDoXml(resto, idDoNome) {
  const m = /<efc:painel>([\s\S]*?)<\/efc:painel>/.exec(String(resto || ''));
  if (!m) return null;
  try {
    const t = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
    const p = normalizarPainel(JSON.parse(t));
    return trocarAbasDoPainel(p, (nome) => idDoNome(String(nome)) || null);
  } catch { return null; }
}
void lerFormula; void escrever;
