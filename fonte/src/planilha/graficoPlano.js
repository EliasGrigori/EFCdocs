/* EFCdocs v0.6.1 — o "plano" do gráfico: uma descrição completa, no jeito do Excel, de tudo que se vê.
   O desenho (desenhoGrafico.js), o Excel (xlsx/graficosXlsx.js) e o editor (graficosUi.jsx) trabalham todos em cima dele.

   De onde vem o plano:
   - gráfico do EFCdocs (g.t = colunas, linha, pareto...): montado a cada desenho a partir dos dados da faixa (construir),
     e as mudanças do editor ficam em g.fx, por cima (aplicarFx);
   - gráfico que veio do Excel (g.t = 'excel'): o plano lido do arquivo fica em g.plano, com as referências das séries,
     e os números são lidos da planilha na hora (resolverPlano).

   Plano P = { titulo, fonte, fundo, area, legenda, eixos:{ x, y, x2, y2 }, grupos:[G], ref:[linhas], paleta, vazio }
   Preenchimento Pr = null (automático) | { t:'solido', cor, alfa } | { t:'nenhum' } | { t:'degrade', paradas:[{ p, cor, alfa }], ang }
   Linha Ln = null | { t:'solido'|'nenhum', cor, larg (pt), tr ('solid'|'dash'|'sysDash'|'dot'|'sysDot'|'lgDash'|'dashDot') }
   Eixo E = { tipo:'cat'|'val', pos, apagado, min, max, passo, fmt, grade:Ln|null, linha:Ln|null, rotulo:{ tam, cor, negrito, girar },
              titulo:{ texto, tam, cor, negrito }|null, inverter, cruza:'auto'|'max'|'min'|número, entre:bool }
   Grupo G = { tipo:'bar'|'line'|'area'|'pie'|'doughnut'|'scatter'|'gauge', dir:'col'|'bar', agrup:'clustered'|'stacked'|'percentStacked'|'standard',
               espaco, sobrepor, giro, furo, eixo2, variar, series:[S] }
   Série S = { nome:{ txt, ref }, cats:{ txt, num, ref, fmt }, vals:{ num, ref, fmt }, preench, contorno, linha, efeito, suave,
               marcador:{ forma, tam, preench, contorno }|null, rotulos:{ val, pct, cat, nome, pos, fmt, tam, cor, negrito }|null,
               pontos:{ [i]: { preench, contorno, marcador, rotulo } }, explodir, tendencia }
   Referência ref = { aba: id da aba (ou '' = a aba do gráfico), fx: 'B2:B6' } */
import { PALETA_GRAFICO, COR_FORA, COR_MEDIA, pareto, cartaControle, histograma, numeroCurto } from './graficos.js';

export const PT = 96 / 72; // px por ponto
const ehNum = (v) => typeof v === 'number' && Number.isFinite(v);
export const clonar = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));
const objeto = (x) => x && typeof x === 'object' && !Array.isArray(x);

/** Junta b em cima de a (objetos por dentro; listas e valores trocam). null em b apaga. */
export function juntar(a, b) {
  if (b === undefined) return a;
  if (!objeto(b) || !objeto(a)) return clonar(b);
  const o = { ...a };
  for (const k of Object.keys(b)) {
    if (b[k] === undefined) continue;
    o[k] = objeto(b[k]) && objeto(a[k]) ? juntar(a[k], b[k]) : clonar(b[k]);
  }
  return o;
}

/* ---------- séries de todos os grupos, em ordem ---------- */
export const seriesDe = (P) => (P && P.grupos ? P.grupos.flatMap((G) => G.series.map((S) => ({ G, S }))) : []);

/* ============================================================ montar o plano de um gráfico do EFCdocs ============================================================ */
const solido = (cor) => ({ t: 'solido', cor });
const serieBase = (s, i, d, refs, cor) => ({
  nome: { txt: s.nome, ref: refs && refs.nome[i] || null },
  cats: { txt: d.cats, ref: refs && refs.cat || null, num: d.catsNum || null, fmt: d.catsFmt || null },
  vals: { num: s.vals, ref: refs && refs.val[i] || null, fmt: s.fmt || null },
  preench: solido(cor), linha: { t: 'solido', cor: cor, larg: 2.25 }, contorno: null, linha: null, marcador: null, rotulos: null, pontos: {},
});
const eixoCat = (pos = 'b', titulo = '') => ({ tipo: 'cat', pos, titulo: titulo ? { texto: titulo } : null, grade: null, linha: { t: 'solido', cor: null }, entre: true });
const eixoVal = (pos = 'l', titulo = '', extra = {}) => ({ tipo: 'val', pos, titulo: titulo ? { texto: titulo } : null, grade: { t: 'solido', cor: null }, linha: null, ...extra });

/**
 * g (normalizado) + d (dadosDaFaixa) → plano. refs (opcional): { nome[i], cat, val[i] } para o Excel.
 * As escolhas do editor (g.fx) entram por cima.
 */
export function construir(g, d, refs = null) {
  const op = g.op || {};
  const cores = op.cores && op.cores.length ? [...op.cores, ...PALETA_GRAFICO] : PALETA_GRAFICO;
  const fxS = (g.fx && g.fx.series) || {};
  const P = {
    nativo: true,
    titulo: g.titulo ? { texto: g.titulo } : null,
    fonte: { tam: null, cor: null }, fundo: { preench: null, borda: null }, area: { preench: null, borda: null },
    legenda: op.legenda === 'nao' ? null : { pos: op.legenda === 'dir' ? 'r' : 'b' },
    eixos: { x: eixoCat('b', op.eixoX), y: eixoVal('l', op.eixoY), x2: null, y2: null },
    grupos: [], ref: [], paleta: cores.slice(0, 12), vazio: 'gap',
  };
  const rot = op.rotulos ? { val: true } : null;
  const meta = ehNum(op.meta) ? [{ v: op.meta, cor: '#d79a22', rot: 'Meta ' + numeroCurto(op.meta), tr: true }] : [];
  const t = g.t;
  const ser = d.series.map((s, i) => ({ ...serieBase(s, i, d, refs, cores[i % cores.length]), rotulos: rot && { ...rot } }));
  const porTipo = (tipoPadrao, base) => {
    /* cada série pode virar outro tipo (editor › Séries › Tipo) e ir para o eixo da direita */
    const grupos = new Map();
    ser.forEach((S, i) => {
      const f = fxS[i] || {};
      const tp = f.tipo || tipoPadrao;
      const e2 = !!f.eixo2;
      const k = tp + (e2 ? '2' : '');
      if (!grupos.has(k)) grupos.set(k, { ...base(tp), tipo: tp, eixo2: e2, series: [] });
      grupos.get(k).series.push(S);
    });
    return [...grupos.values()];
  };
  const baseDe = (tp) => {
    if (tp === 'bar') return { dir: t === 'barras' ? 'bar' : 'col', agrup: op.empilhado === '100' ? 'percentStacked' : op.empilhado ? 'stacked' : 'clustered', espaco: 80, sobrepor: op.empilhado ? 100 : 0 };
    if (tp === 'area') return { agrup: op.empilhado === '100' ? 'percentStacked' : op.empilhado ? 'stacked' : 'standard' };
    return { agrup: 'standard', marcas: true };
  };
  switch (t) {
    case 'colunas': case 'barras':
      P.grupos = porTipo('bar', baseDe);
      if (t === 'barras') { P.eixos.x = { ...eixoCat('l', op.eixoY), inverter: true }; P.eixos.y = eixoVal('b', op.eixoX); }
      P.ref = meta;
      break;
    case 'linha': case 'area':
      ser.forEach((S) => { S.marcador = t === 'linha' && d.cats.length <= 40 ? { forma: 'circle', tam: 5 } : null; });
      if (t === 'area') ser.forEach((S) => { S.preench = { t: 'solido', cor: S.preench.cor, alfa: 0.35 }; S.contorno = { t: 'solido', cor: S.preench.cor, larg: 1.65 }; });
      P.grupos = porTipo(t === 'area' ? 'area' : 'line', baseDe);
      P.ref = meta;
      break;
    case 'combinado': {
      const [b0, ...ls] = ser;
      const maxB = Math.max(0, ...((b0 && b0.vals.num) || []).filter(ehNum));
      const maxL = Math.max(0, ...ls.flatMap((s) => s.vals.num).filter(ehNum));
      const dir = maxB && maxL && (maxB / maxL > 5 || maxL / maxB > 5);
      ls.forEach((S) => { S.marcador = { forma: 'circle', tam: 5 }; });
      if (b0) P.grupos.push({ tipo: 'bar', dir: 'col', agrup: 'clustered', espaco: 80, sobrepor: 0, series: [b0] });
      if (ls.length) P.grupos.push({ tipo: 'line', agrup: 'standard', eixo2: !!dir, series: ls });
      if (dir) { P.eixos.x2 = { ...eixoCat('b'), apagado: true }; P.eixos.y2 = eixoVal('r', '', { grade: null, cruza: 'max' }); }
      P.ref = meta;
      break;
    }
    case 'pizza': case 'rosca': {
      const S = ser[0];
      if (S) {
        S.preench = null;
        S.pontos = {};
        d.cats.forEach((_, k) => { S.pontos[k] = { preench: solido(cores[k % cores.length]), contorno: { t: 'solido', cor: '#ffffff', larg: 1.1 } }; });
        S.rotulos = { pct: true, pos: 'ctr', cor: '#ffffff', negrito: true, min: 0.05 };
      }
      P.grupos = [{ tipo: t === 'rosca' ? 'doughnut' : 'pie', variar: true, giro: 0, furo: t === 'rosca' ? 58 : 0, series: S ? [S] : [], centroTotal: t === 'rosca' }];
      P.eixos = { x: null, y: null, x2: null, y2: null };
      if (P.legenda) P.legenda = { pos: op.legenda === 'dir' ? 'r' : 'b', auto: op.legenda !== 'dir', valores: true };
      break;
    }
    case 'dispersao': {
      const [x, ...ys] = ser;
      ys.forEach((S, i) => {
        S.cats = { txt: null, num: x ? x.vals.num : [], ref: x ? x.vals.ref : null };
        S.linha = { t: 'nenhum' };
        S.marcador = { forma: 'circle', tam: 6, preench: solido(cores[i % cores.length]), contorno: { t: 'nenhum' } };
        S.preench = solido(cores[i % cores.length]);
      });
      P.grupos = [{ tipo: 'scatter', estilo: 'lineMarker', series: ys }];
      P.eixos.x = eixoVal('b', op.eixoX, { grade: null, linha: { t: 'solido', cor: null } });
      break;
    }
    case 'pareto': {
      const p = pareto(d);
      const nome = (d.series[0] && d.series[0].nome) || 'Quantidade';
      const cats = { txt: p.cats, ref: null };
      P.grupos = [
        { tipo: 'bar', dir: 'col', agrup: 'clustered', espaco: 40, sobrepor: 0, series: [{ ...serieBase({ nome, vals: p.vals }, 0, { cats: p.cats }, null, cores[0]), cats, rotulos: rot }] },
        { tipo: 'line', agrup: 'standard', eixo2: true, series: [{ ...serieBase({ nome: '% acumulado', vals: p.acum.map((v) => Math.round(v * 10) / 10) }, 0, { cats: p.cats }, null, cores[1]), cats, preench: null, linha: { t: 'solido', cor: cores[1], larg: 2.25 }, marcador: { forma: 'circle', tam: 5 } }] },
      ];
      P.eixos.x2 = { ...eixoCat('b'), apagado: true };
      P.eixos.y2 = eixoVal('r', '', { grade: null, min: 0, max: 100, passo: 20, fmt: '0"%"', cruza: 'max' });
      if (op.rotulos) P.grupos[1].series[0].rotulos = { val: true, fmt: '0"%"', pos: 't' };
      P.ref = [{ v: 80, cor: cores[1], rot: '80%', tr: true, eixo2: true }];
      break;
    }
    case 'controle': {
      const s0 = ser[0];
      if (s0) {
        const k = cartaControle(s0.vals.num, op);
        s0.preench = null; s0.linha = { t: 'solido', cor: cores[0], larg: 1.65 }; s0.marcador = { forma: 'circle', tam: 5 };
        k.fora.forEach((f, i) => { if (f) s0.pontos[i] = { marcador: { forma: 'circle', tam: 7, preench: solido(COR_FORA), contorno: { t: 'solido', cor: COR_FORA } } }; });
        P.grupos = [{ tipo: 'line', agrup: 'standard', series: [s0] }];
        P.ref = [
          { v: k.lsc, cor: COR_FORA, rot: 'LSC ' + numeroCurto(k.lsc), tr: true, leg: 'LSC' },
          { v: k.media, cor: COR_MEDIA, rot: 'Média ' + numeroCurto(k.media), leg: 'Média' },
          { v: k.lic, cor: COR_FORA, rot: 'LIC ' + numeroCurto(k.lic), tr: true, leg: 'LIC' },
          ...meta.map((m) => ({ ...m, leg: 'Meta' })),
        ];
        P.carta = k;
        P.folga = 0.08;
      }
      break;
    }
    case 'histograma': {
      const h = histograma(d.series.flatMap((s) => s.vals));
      P.grupos = [{ tipo: 'bar', dir: 'col', agrup: 'clustered', espaco: 2, sobrepor: 0, series: [{ ...serieBase({ nome: 'Frequência', vals: h.vals }, 0, { cats: h.cats }, null, cores[0]), rotulos: rot }] }];
      if (!op.eixoY) P.eixos.y.titulo = { texto: 'Frequência' };
      P.colado = true;
      break;
    }
    case 'velocimetro': {
      const s0 = d.series[0];
      const v = s0 ? s0.vals.find(ehNum) : undefined;
      const mn = ehNum(op.min) ? op.min : 0;
      const mx = ehNum(op.max) && op.max > mn ? op.max : ehNum(v) ? Math.max(1, escalaTopo(v)) : 1;
      P.grupos = [{ tipo: 'gauge', valor: ehNum(v) ? v : null, min: mn, max: mx, faixas: faixasVelo(op, mn, mx), fmt: (s0 && s0.fmt) || null, series: [] }];
      P.eixos = { x: null, y: null, x2: null, y2: null };
      P.legenda = null;
      if (!P.titulo && s0 && s0.nome && !/^Série \d+$/.test(s0.nome)) P.titulo = { texto: s0.nome };
      P.valorRef = refs && refs.val[0] ? refs.val[0] : null;
      break;
    }
    default: break;
  }
  return aplicarFx(P, g.fx);
}

const escalaTopo = (v) => { const a = Math.abs(v) || 1; const p = 10 ** Math.floor(Math.log10(a)); return Math.ceil((a * 1.25) / p) * p; };
/** Faixas do velocímetro: as escritas, ou verde / amarelo / vermelho pela meta. */
export function faixasVelo(op, mn, mx) {
  if (Array.isArray(op.faixas) && op.faixas.length) return op.faixas.filter((f) => ehNum(f.ate) && f.cor).map((f) => ({ ate: f.ate, cor: f.cor })).sort((a, b) => a.ate - b.ate);
  const r = mx - mn;
  if (ehNum(op.meta)) {
    const menorMelhor = op.sentido === 'menor';
    return menorMelhor
      ? [{ ate: op.meta, cor: '#2e8b57' }, { ate: Math.min(mx, op.meta + r * 0.15), cor: '#e0a526' }, { ate: mx, cor: '#c0392b' }]
      : [{ ate: Math.max(mn, op.meta - r * 0.15), cor: '#c0392b' }, { ate: op.meta, cor: '#e0a526' }, { ate: mx, cor: '#2e8b57' }];
  }
  return [{ ate: mn + r * 0.6, cor: '#2e8b57' }, { ate: mn + r * 0.85, cor: '#e0a526' }, { ate: mx, cor: '#c0392b' }];
}

/** As escolhas do editor (g.fx) por cima do plano montado. */
export function aplicarFx(P, fx) {
  if (!fx) return P;
  if (fx.titulo !== undefined) P.titulo = fx.titulo === null ? null : P.titulo || fx.titulo.texto ? juntar(P.titulo || {}, fx.titulo) : P.titulo;
  for (const k of ['fonte', 'fundo', 'area']) if (fx[k]) P[k] = juntar(P[k] || {}, fx[k]);
  if (fx.legenda !== undefined) P.legenda = fx.legenda === null ? null : juntar(P.legenda || { pos: 'b' }, fx.legenda);
  if (fx.eixos) for (const k of ['x', 'y', 'x2', 'y2']) if (fx.eixos[k] && P.eixos && P.eixos[k]) P.eixos[k] = juntar(P.eixos[k], fx.eixos[k]);
  if (fx.grupo) for (const G of P.grupos) for (const k of ['espaco', 'sobrepor', 'giro', 'furo']) if (fx.grupo[k] !== undefined && G[k] !== undefined) G[k] = fx.grupo[k];
  const lista = seriesDe(P);
  if (fx.rotulos !== undefined) for (const { G, S } of lista) if (G.tipo !== 'pie' && G.tipo !== 'doughnut') S.rotulos = fx.rotulos === null ? null : juntar(S.rotulos || {}, fx.rotulos);
  if (fx.series) lista.forEach(({ S }, i) => { const f = fx.series[i]; if (!f) return; const { tipo, eixo2, ...resto } = f; void tipo; void eixo2; Object.assign(S, juntar(S, resto)); });
  if (fx.paleta) P.paleta = fx.paleta.slice();
  if (fx.semaforo) P.semaforo = { ...fx.semaforo };
  if (fx.destaque) P.destaque = fx.destaque;
  if (fx.ref === null) P.ref = [];
  return P;
}

/* ============================================================ gráfico que veio do Excel ============================================================ */
/**
 * Lê os números da planilha para as séries (quando a referência ainda vale); senão fica o que veio guardado no arquivo.
 * lerFaixa(ref) → { num:[...], txt:[...] } | null
 */
export function resolverPlano(plano, lerFaixa) {
  const P = clonar(plano);
  if (!lerFaixa) return P;
  for (const { S } of seriesDe(P)) {
    if (S.vals && S.vals.ref) { const r = lerFaixa(S.vals.ref); if (r) S.vals.num = r.num; }
    if (S.cats && S.cats.ref) { const r = lerFaixa(S.cats.ref); if (r) { S.cats.txt = r.txt; S.cats.num = r.num; } }
    if (S.nome && S.nome.ref) { const r = lerFaixa(S.nome.ref); if (r && r.txt && r.txt.length) S.nome.txt = r.txt.filter(Boolean).join(' '); }
  }
  for (const G of P.grupos) if (G.tipo === 'gauge' && G.valorRef) { const r = lerFaixa(G.valorRef); if (r && r.num && ehNum(r.num[0])) G.valor = r.num[0]; }
  /* v0.6.6: título ligado a célula, rótulos com o "valor das células" e o texto ligado das caixas por cima do gráfico */
  if (P.titulo && P.titulo.ref) { const r = lerFaixa(P.titulo.ref); if (r && r.txt) P.titulo.texto = r.txt.filter(Boolean).join(' ') || P.titulo.texto; }
  for (const { S } of seriesDe(P)) if (S.rotFaixa && S.rotFaixa.ref) { const r = lerFaixa(S.rotFaixa.ref); if (r && r.txt) S.rotFaixa.txt = r.txt; }
  for (const us of P.formas || []) for (const p of (us.f && us.f.partes) || []) {
    const lg = p.texto && p.texto.ligado;
    if (lg && lg.ref) { const r = lerFaixa({ aba: lg.aba || '', fx: lg.ref }); if (r && r.txt) lg.v = r.txt[0] ?? ''; }
  }
  return P;
}

/** Todas as referências de um plano (para mexer quando as linhas/colunas mudam). */
export function refsDoPlano(P) {
  const out = [];
  for (const { S } of seriesDe(P)) for (const k of ['nome', 'cats', 'vals']) if (S[k] && S[k].ref) out.push(S[k].ref);
  for (const G of (P && P.grupos) || []) if (G.valorRef) out.push(G.valorRef);
  /* v0.6.6 */
  if (P && P.titulo && P.titulo.ref) out.push(P.titulo.ref);
  for (const { S } of seriesDe(P)) if (S.rotFaixa && S.rotFaixa.ref) out.push(S.rotFaixa.ref);
  return out;
}

/* ============================================================ estilos rápidos, layouts e cores ============================================================ */
export const PALETAS = [
  ['efc', 'EFCdocs', PALETA_GRAFICO.slice(0, 6)],
  ['petroleo', 'Petróleo', ['#0f4c5c', '#3f8a99', '#8fc1cb', '#d79a22', '#5b6770', '#c9d6dc']],
  ['agua', 'Água', ['#1f6f8b', '#4aa3c0', '#9ad0e0', '#0d3b4f', '#6bc4b8', '#cfe9f2']],
  ['terra', 'Terra', ['#8a5a2b', '#c08a4a', '#e2bf86', '#6b7b3a', '#a3542b', '#d9c6a5']],
  ['cinza', 'Cinza com destaque', ['#d79a22', '#5b6770', '#8d99a2', '#c3cbd1', '#3d4850', '#e4e8eb']],
  ['semaforo', 'Semáforo', ['#2e8b57', '#e0a526', '#c0392b', '#5b6770', '#7fb59a', '#e8a598']],
  ['vivo', 'Vivo', ['#3d7dca', '#e07b39', '#2fa37a', '#c0457a', '#8a5cc2', '#d9b310']],
  ['excel', 'Office', ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47']],
];
export const PALETA_POR_ID = Object.fromEntries(PALETAS.map(([id, , c]) => [id, c]));

export const ESTILOS_RAPIDOS = [
  ['classico', 'Clássico', 'O jeito do Excel: grade, legenda embaixo, cores do Office.'],
  ['limpo', 'Limpo', 'Sem caixas: grade clara e números na série principal.'],
  ['apresentacao', 'Apresentação', 'Título grande; só o destaque leva cor.'],
  ['escuro', 'Escuro', 'Fundo escuro com cores vivas, para painel e TV.'],
  ['semaforo', 'Semáforo da qualidade', 'Verde dentro da meta, amarelo perto, vermelho fora.'],
  ['minimo', 'Mínimo', 'Só as barras e os números.'],
];
const SEM = { t: 'nenhum' };
/** O pacote de formatação de cada estilo rápido (vai em g.fx, ou direto no plano do Excel). */
export function fxDoEstilo(id, nSeries = 1) {
  const ser = (fn) => Object.fromEntries(Array.from({ length: Math.max(1, nSeries) }, (_, i) => [i, fn(i)]));
  switch (id) {
    case 'classico': return {
      fundo: { preench: solido('#ffffff'), borda: { t: 'solido', cor: '#d9d9d9', larg: 0.75 } }, area: { preench: null, borda: null },
      fonte: { tam: 9, cor: '#595959' }, titulo: { tam: 14, negrito: false, cor: '#595959' }, legenda: { pos: 'b', cor: '#595959' },
      eixos: { x: { rotulo: { cor: '#595959' },  grade: null, linha: { t: 'solido', cor: '#d9d9d9' }, apagado: false }, y: { rotulo: { cor: '#595959' },  grade: { t: 'solido', cor: '#d9d9d9' }, linha: null, apagado: false }, y2: { rotulo: { cor: '#595959' } } },
      paleta: PALETA_POR_ID.excel, rotulos: null, series: ser((i) => ({ preench: solido(PALETA_POR_ID.excel[i % 6]), linha: { t: 'solido', cor: PALETA_POR_ID.excel[i % 6], larg: 2.25 }, contorno: null, efeito: null })), semaforo: null, destaque: null,
    };
    case 'limpo': return {
      fundo: { preench: solido('#ffffff'), borda: SEM }, area: { preench: null, borda: null },
      fonte: { tam: 9, cor: '#4b5b66' }, titulo: { tam: 12, negrito: true, cor: '#15222a', alinhar: 'e' }, legenda: { pos: 't', cor: '#4b5b66' },
      eixos: { x: { rotulo: { cor: '#4b5b66' },  grade: null, linha: SEM, apagado: false }, y: { rotulo: { cor: '#4b5b66' },  grade: { t: 'solido', cor: '#eef2f5' }, linha: null, apagado: false }, y2: { rotulo: { cor: '#4b5b66' } } },
      rotulos: null,
      series: ser((i) => ({ preench: solido(i === nSeries - 1 ? '#0f4c5c' : ['#b9c7cf', '#d5dee3', '#9fb3bf'][i % 3]), linha: { t: 'solido', cor: i === nSeries - 1 ? '#0f4c5c' : ['#b9c7cf', '#d5dee3', '#9fb3bf'][i % 3], larg: 2.25 }, contorno: null, efeito: null, rotulos: i === nSeries - 1 ? { val: true, cor: '#15222a', negrito: true } : null })),
      semaforo: null, destaque: null,
    };
    case 'apresentacao': return {
      fundo: { preench: solido('#ffffff'), borda: SEM }, area: { preench: null, borda: null },
      fonte: { tam: 10, cor: '#15222a' }, titulo: { tam: 14, negrito: true, cor: '#15222a', alinhar: 'e' }, legenda: null,
      eixos: { x: { rotulo: { cor: '#15222a' },  grade: null, linha: SEM, apagado: false }, y: { rotulo: { cor: '#15222a' },  grade: null, linha: null, apagado: true }, y2: { rotulo: { cor: '#15222a' } } },
      rotulos: { val: true, negrito: true, tam: 11 }, grupo: { espaco: 45 },
      series: ser(() => ({ preench: solido('#c9d3da'), linha: { t: 'solido', cor: '#c9d3da', larg: 2.25 }, contorno: null, efeito: null })), destaque: { como: 'max', cor: '#0f4c5c' }, semaforo: null,
    };
    case 'escuro': {
      const viva = ['#5ec2d4', '#f2b84b', '#7bd389', '#ef7d7d', '#b39ddb', '#f48fb1'];
      return {
        fundo: { preench: solido('#0f1d24'), borda: SEM }, area: { preench: null, borda: null },
        fonte: { tam: 9, cor: '#c9d6dc' }, titulo: { tam: 13, negrito: true, cor: '#ffffff', alinhar: 'e' }, legenda: { pos: 't', cor: '#c9d6dc' },
        eixos: { x: { rotulo: { cor: '#c9d6dc' },  grade: null, linha: { t: 'solido', cor: '#2c414c' }, apagado: false }, y: { rotulo: { cor: '#c9d6dc' },  grade: { t: 'solido', cor: '#22343d' }, linha: null, apagado: false }, y2: { rotulo: { cor: '#c9d6dc' } } },
        paleta: viva, rotulos: null, series: ser((i) => ({ preench: solido(viva[i % 6]), linha: { t: 'solido', cor: viva[i % 6], larg: 2.25 }, contorno: null, efeito: null })), semaforo: null, destaque: null,
      };
    }
    case 'semaforo': return {
      fundo: { preench: solido('#ffffff'), borda: SEM }, area: { preench: null, borda: null },
      fonte: { tam: 9, cor: '#15222a' }, titulo: { tam: 12, negrito: true, cor: '#15222a', alinhar: 'e' }, legenda: null,
      eixos: { x: { rotulo: { cor: '#4b5b66' },  grade: null, linha: { t: 'solido', cor: '#c3cbd1' }, apagado: false }, y: { rotulo: { cor: '#4b5b66' },  grade: { t: 'solido', cor: '#eef2f5' }, linha: null, apagado: false }, y2: { rotulo: { cor: '#4b5b66' } } },
      rotulos: { val: true, negrito: true }, series: ser(() => ({ contorno: null, efeito: null })), semaforo: { folga: 15 }, destaque: null,
    };
    case 'minimo': return {
      fundo: { preench: solido('#ffffff'), borda: SEM }, area: { preench: null, borda: null },
      fonte: { tam: 8, cor: '#4b5b66' }, titulo: { tam: 10, negrito: false, cor: '#76848f', alinhar: 'e' }, legenda: null,
      eixos: { x: { rotulo: { cor: '#4b5b66' },  grade: null, linha: SEM, apagado: false }, y: { rotulo: { cor: '#4b5b66' },  grade: null, linha: null, apagado: true }, y2: { rotulo: { cor: '#4b5b66' } } },
      rotulos: { val: true, tam: 8 }, grupo: { espaco: 60 }, series: ser(() => ({ preench: solido('#0f4c5c'), linha: { t: 'solido', cor: '#0f4c5c', larg: 2.25 }, contorno: null, efeito: null })), semaforo: null, destaque: null,
    };
    default: return null;
  }
}

export const LAYOUTS_RAPIDOS = [
  ['titulo-baixo', 'Título e legenda embaixo'], ['legenda-direita', 'Legenda à direita'], ['valores', 'Números nas barras, sem legenda'],
  ['eixos', 'Eixos com nome'], ['so', 'Só o gráfico'],
];
/** O pacote de cada layout rápido. tituloPadrao/eixos: textos para quando faltar. */
export function fxDoLayout(id, { titulo = 'Título do gráfico', eixoX = 'Categorias', eixoY = 'Valores' } = {}) {
  switch (id) {
    case 'titulo-baixo': return { titulo: { texto: titulo }, legenda: { pos: 'b' } };
    case 'legenda-direita': return { titulo: { texto: titulo }, legenda: { pos: 'r' } };
    case 'valores': return { legenda: null, rotulos: { val: true } };
    case 'eixos': return { eixos: { x: { titulo: { texto: eixoX } }, y: { titulo: { texto: eixoY } } } };
    case 'so': return { titulo: null, legenda: null, rotulos: null, eixos: { x: { titulo: null }, y: { titulo: null } } };
    default: return null;
  }
}

/** Aplica um pacote (estilo, layout ou cores) num gráfico: no fx (EFCdocs) ou direto no plano (Excel). Devolve g novo. */
export function aplicarPacote(g, pacote, extra = {}) {
  if (!pacote) return g;
  if (g.t === 'excel') {
    const P = clonar(g.plano);
    /* o formato dos números (R$, %) que veio do Excel fica, mesmo trocando o estilo */
    const fmts = seriesDe(P).map(({ S }) => S.rotulos && S.rotulos.fmt);
    aplicarFx(P, pacote);
    seriesDe(P).forEach(({ S }, i) => { if (S.rotulos && !S.rotulos.fmt && fmts[i]) S.rotulos.fmt = fmts[i]; });
    return { ...g, ...extra, plano: P };
  }
  return { ...g, ...extra, fx: juntar(g.fx || {}, pacote) };
}
/** Troca as cores das séries (ou das fatias) por uma paleta. */
export function pacoteCores(P, cores) {
  const fx = { paleta: cores.slice(), series: {} };
  seriesDe(P).forEach(({ G, S }, i) => {
    if (G.tipo === 'pie' || G.tipo === 'doughnut') {
      const pontos = {};
      for (const k of Object.keys(S.pontos || {})) if (!(S.pontos[k].preench && S.pontos[k].preench.t === 'nenhum')) pontos[k] = { preench: solido(cores[k % cores.length]) };
      (S.cats.txt || S.vals.num || []).forEach((_, k) => { if (!(S.pontos && S.pontos[k] && S.pontos[k].preench && S.pontos[k].preench.t === 'nenhum')) pontos[k] = { preench: solido(cores[k % cores.length]) }; });
      fx.series[i] = { pontos };
    } else {
      const cor = cores[i % cores.length];
      fx.series[i] = S.preench && S.preench.t === 'nenhum'
        ? { contorno: { t: 'solido', cor } }
        : { preench: solido(cor), ...(G.tipo === 'line' || G.tipo === 'scatter' ? { linha: { ...(S.linha || {}), t: S.linha && S.linha.t === 'nenhum' ? 'nenhum' : 'solido', cor }, marcador: S.marcador ? { ...S.marcador, preench: solido(cor), contorno: { t: 'solido', cor } } : S.marcador } : {}) };
    }
  });
  return fx;
}

/* ============================================================ cores do semáforo e destaque ============================================================ */
/** Cor do ponto pelo semáforo: meta (op.meta ou a média), folga em %, sentido 'maior' (maior é melhor) ou 'menor'. */
export function corSemaforo(v, sem, metaPadrao) {
  if (!ehNum(v)) return null;
  const meta = ehNum(sem.meta) ? sem.meta : metaPadrao;
  if (!ehNum(meta)) return '#2e8b57';
  const folga = Math.abs(meta) * ((ehNum(sem.folga) ? sem.folga : 15) / 100);
  if (sem.sentido === 'menor') return v <= meta ? '#2e8b57' : v <= meta + folga ? '#e0a526' : '#c0392b';
  return v >= meta + folga ? '#2e8b57' : v >= meta ? '#e0a526' : '#c0392b';
}

/** Meta que o semáforo usa quando não tem uma escrita: a linha de meta do gráfico ou a média. */
export function metaPadraoDe(P) {
  const m = (P.ref || []).find((r) => /^Meta/.test(r.rot || r.leg || ''));
  if (m) return m.v;
  const v = seriesDe(P).flatMap(({ S }) => S.vals.num || []).filter(ehNum);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : undefined;
}
/** Escreve nas séries as cores do semáforo e do destaque (para o Excel, que não sabe calcular). */
export function materializarCores(P0) {
  if (!P0.semaforo && !P0.destaque) return P0;
  const P = clonar(P0);
  const meta = metaPadraoDe(P);
  seriesDe(P).forEach(({ G, S }, i) => {
    if (G.tipo === 'pie' || G.tipo === 'doughnut' || G.tipo === 'gauge') return;
    const vals = S.vals.num || [];
    const mx = Math.max(...vals.filter(ehNum));
    vals.forEach((v, k) => {
      if (!ehNum(v)) return;
      const pt = (S.pontos[k] = S.pontos[k] || {});
      if (pt.preench) return;
      let cor = null;
      if (P.semaforo) cor = corSemaforo(v, P.semaforo, meta);
      else if (P.destaque && P.destaque.como === 'max' && i === 0 && v === mx) cor = P.destaque.cor;
      if (!cor) return;
      if (G.tipo === 'line' || G.tipo === 'scatter') pt.marcador = { ...(S.marcador || { forma: 'circle', tam: 6 }), preench: { t: 'solido', cor }, contorno: { t: 'solido', cor } };
      else pt.preench = { t: 'solido', cor };
    });
  });
  delete P.semaforo; delete P.destaque;
  return P;
}
