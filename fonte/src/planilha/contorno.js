/* Vértice Docs v0.6.37 — Planilha: Agrupar e Desagrupar (Dados › Estrutura de tópicos), como o Excel.
   Fica fora de Planilha.jsx (arquivo grande não cresce): aqui as regras e o desenho da barra da margem.
   Na aba:
   - grpL = { [linha]: nível 1..7 } e grpC = { [coluna]: nível }: o nível de agrupamento (outlineLevel do Excel);
   - grpFL / grpFC = { [linha|coluna]: 1 }: o botão do grupo está fechado (collapsed do Excel, na linha do resumo);
   - grpAcima / grpEsq = 1: o resumo fica em cima / à esquerda (summaryBelow="0" / summaryRight="0"); o padrão é embaixo / à direita.
   Fechar um grupo esconde as linhas (aba.ocL) ou colunas (aba.ocC) dele, como o Excel. */
import { MAX_LIN, MAX_COL } from './ref.js';

export const NIVEL_MAX = 7;
const CAMPOS = { l: { niv: 'grpL', fech: 'grpFL', oc: 'ocL', antes: 'grpAcima', max: MAX_LIN }, c: { niv: 'grpC', fech: 'grpFC', oc: 'ocC', antes: 'grpEsq', max: MAX_COL } };

/** Maior nível do eixo ('l' ou 'c'). */
export function nivelMax(aba, eixo) {
  const m = aba && aba[CAMPOS[eixo].niv];
  let n = 0;
  if (m) for (const k in m) if (m[k] > n) n = m[k];
  return Math.min(NIVEL_MAX, n);
}

/** Os grupos do eixo: [{ k (nível), ini, fim, resumo (linha/coluna do botão), fechado }], de fora para dentro. */
export function gruposDe(aba, eixo) {
  const C = CAMPOS[eixo], m = aba && aba[C.niv];
  if (!m) return [];
  const idx = Object.keys(m).map(Number).filter((i) => m[i] > 0).sort((a, b) => a - b);
  const max = nivelMax(aba, eixo), out = [];
  const antes = !!aba[C.antes], fech = aba[C.fech] || {};
  for (let k = 1; k <= max; k++) {
    let ini = null, ant = null;
    const fecha = () => { if (ini == null) return; const resumo = antes ? ini - 1 : ant + 1; out.push({ k, ini, fim: ant, resumo, fechado: !!fech[resumo] }); ini = null; };
    for (const i of idx) {
      if (m[i] < k) { fecha(); continue; }
      if (ini == null) ini = i; else if (i !== ant + 1) { fecha(); ini = i; }
      ant = i;
    }
    fecha();
  }
  return out;
}

/** O grupo mais de dentro que contém i (ou cujo botão está em i). */
export function grupoEm(aba, eixo, i) {
  const gs = gruposDe(aba, eixo);
  let melhor = null;
  for (const g of gs) if ((i >= g.ini && i <= g.fim) || g.resumo === i) if (!melhor || g.k > melhor.k) melhor = g;
  return melhor;
}

const copia = (o) => ({ ...(o || {}) });
const ouNada = (o) => (o && Object.keys(o).length ? o : undefined);
const caminho = (abaId, campo) => `conteudo.abas.${abaId}.${campo}`;

/** Agrupa (+1) ou desagrupa (-1) as linhas/colunas i1..i2. Devolve { mud, rotulo } ou { erro }. */
export function agrupar(aba, abaId, eixo, i1, i2, passo) {
  const C = CAMPOS[eixo];
  const a = Math.max(0, Math.min(i1, i2)), b = Math.min(C.max - 1, Math.max(i1, i2));
  if (b - a + 1 > 100000) return { erro: 'Escolha até 100 mil linhas ou colunas.' };
  const niv = copia(aba[C.niv]), oc = copia(aba[C.oc]), fech = copia(aba[C.fech]);
  let mudou = 0, topo = false;
  for (let i = a; i <= b; i++) {
    const v = (niv[i] || 0) + passo;
    if (passo > 0 && v > NIVEL_MAX) { topo = true; continue; }
    if (v <= 0) { if (niv[i]) { delete niv[i]; mudou++; } if (oc[i]) delete oc[i]; continue; }
    niv[i] = v; mudou++;
    if (passo < 0 && oc[i]) delete oc[i]; /* desagrupar mostra o que estava escondido pelo grupo, como o Excel */
  }
  if (!mudou) return { erro: topo ? `O Excel aceita até ${NIVEL_MAX} níveis de grupo.` : 'Estas linhas não estão agrupadas.' };
  if (passo < 0) { delete fech[a - 1]; delete fech[b + 1]; }
  const nome = eixo === 'l' ? (b > a ? `linhas ${a + 1} a ${b + 1}` : `linha ${a + 1}`) : (b > a ? `${b - a + 1} colunas` : '1 coluna');
  return { mud: { [caminho(abaId, C.niv)]: ouNada(niv), [caminho(abaId, C.oc)]: ouNada(oc), [caminho(abaId, C.fech)]: ouNada(fech) }, rotulo: (passo > 0 ? 'Agrupar ' : 'Desagrupar ') + nome, n: b - a + 1 };
}

/** Esconde ou mostra o que está dentro do grupo g; ao mostrar, subgrupos fechados continuam fechados. */
function abrirOuFechar(aba, eixo, g, fechar, oc, fech) {
  const C = CAMPOS[eixo], niv = aba[C.niv] || {};
  if (fechar) { for (let i = g.ini; i <= g.fim; i++) oc[i] = 1; fech[g.resumo] = 1; return; }
  delete fech[g.resumo];
  const dentro = gruposDe({ ...aba, [C.fech]: fech }, eixo).filter((s) => s.k === g.k + 1 && s.ini >= g.ini && s.fim <= g.fim);
  for (let i = g.ini; i <= g.fim; i++) if ((niv[i] || 0) >= g.k) delete oc[i];
  for (const s of dentro) if (s.fechado) for (let i = s.ini; i <= s.fim; i++) oc[i] = 1;
}

/** Abre ou fecha o grupo g (do gruposDe). */
export function alternarGrupo(aba, abaId, eixo, g, fechar = !g.fechado) {
  const C = CAMPOS[eixo];
  const oc = copia(aba[C.oc]), fech = copia(aba[C.fech]);
  abrirOuFechar(aba, eixo, g, fechar, oc, fech);
  return { mud: { [caminho(abaId, C.oc)]: ouNada(oc), [caminho(abaId, C.fech)]: ouNada(fech) }, rotulo: fechar ? 'Ocultar detalhe' : 'Mostrar detalhe' };
}

/** Botão de nível n: mostra até o nível n (grupos de nível ≥ n ficam fechados). */
export function mostrarNivel(aba, abaId, eixo, n) {
  const C = CAMPOS[eixo];
  const oc = copia(aba[C.oc]), fech = copia(aba[C.fech]);
  const gs = gruposDe(aba, eixo);
  for (const g of gs) { delete fech[g.resumo]; for (let i = g.ini; i <= g.fim; i++) delete oc[i]; }
  for (const g of gs) if (g.k >= n) { for (let i = g.ini; i <= g.fim; i++) oc[i] = 1; fech[g.resumo] = 1; }
  return { mud: { [caminho(abaId, C.oc)]: ouNada(oc), [caminho(abaId, C.fech)]: ouNada(fech) }, rotulo: `Mostrar o nível ${n}` };
}

/** Limpar estrutura de tópicos: tira todos os grupos do eixo e mostra o que eles escondiam. */
export function limparEstrutura(aba, abaId, eixo) {
  const C = CAMPOS[eixo];
  if (!nivelMax(aba, eixo)) return null;
  const oc = copia(aba[C.oc]);
  for (const g of gruposDe(aba, eixo)) for (let i = g.ini; i <= g.fim; i++) delete oc[i];
  return { [caminho(abaId, C.niv)]: undefined, [caminho(abaId, C.fech)]: undefined, [caminho(abaId, C.oc)]: ouNada(oc) };
}

/* ---------- a margem com a barra (desenho e toque) ---------- */
export const PASSO = 14;
/** Na tela de toque cada nível da margem é mais largo (20 px), para o dedo acertar o botão. */
export const passoDoAparelho = () => (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches ? 20 : PASSO);

/** O que a geometria precisa saber: níveis e grupos de cada eixo (ou null quando a aba não tem grupos). */
export function contornoDe(aba) {
  const nL = nivelMax(aba, 'l'), nC = nivelMax(aba, 'c');
  if (!nL && !nC) return null;
  return { nL, nC, gL: nL ? gruposDe(aba, 'l') : [], gC: nC ? gruposDe(aba, 'c') : [] };
}

/** Largura da margem das linhas e altura da margem das colunas, na escala da tela. */
export const margemDe = (ct, zz, passo = PASSO) => ({ mL: ct && ct.nL ? Math.round(((ct.nL + 1) * passo + 4) * zz) : 0, mC: ct && ct.nC ? Math.round(((ct.nC + 1) * passo + 4) * zz) : 0, passo });

/** O que há no ponto (x, y) da margem: botão de nível ou botão de grupo. Devolve { tipo:'contorno', eixo, n } | { tipo:'contorno', eixo, g } | null. */
export function contornoEm(G, x, y) {
  const ct = G.contorno;
  if (!ct) return null;
  const s = (G.passo || PASSO) * G.zz, { mL, mC, hw, hh } = G;
  /* botões de nível: os das linhas na faixa dos títulos das colunas (em cima da margem das linhas); os das colunas à esquerda */
  if (mL && x < mL && y < hh && y >= mC) { const n = Math.floor((x - 2 * G.zz) / s) + 1; return n >= 1 && n <= ct.nL + 1 ? { tipo: 'contorno', eixo: 'l', n } : { tipo: 'contorno', eixo: 'l' }; }
  if (mC && y < mC && x < hw && x >= mL) { const n = Math.floor((y - 2 * G.zz) / s) + 1; return n >= 1 && n <= ct.nC + 1 ? { tipo: 'contorno', eixo: 'c', n } : { tipo: 'contorno', eixo: 'c' }; }
  if (mL && x < mL && y >= hh) {
    const k = Math.floor((x - 2 * G.zz) / s) + 1, l = G.linEm(y);
    const g = ct.gL.find((q) => q.k === k && q.resumo === l) || ct.gL.filter((q) => q.resumo === l).sort((p, q) => Math.abs(p.k - k) - Math.abs(q.k - k))[0];
    return { tipo: 'contorno', eixo: 'l', g: g || null };
  }
  if (mC && y < mC && x >= hw) {
    const k = Math.floor((y - 2 * G.zz) / s) + 1, c = G.colEm(x);
    const g = ct.gC.find((q) => q.k === k && q.resumo === c) || ct.gC.filter((q) => q.resumo === c).sort((p, q) => Math.abs(p.k - k) - Math.abs(q.k - k))[0];
    return { tipo: 'contorno', eixo: 'c', g: g || null };
  }
  return { tipo: 'contorno', eixo: x < mL ? 'l' : 'c' };
}

/** O que o toque na margem faz: { mud, rotulo } ou null. */
export function tocarContorno(aba, abaId, o) {
  if (o.n) return mostrarNivel(aba, abaId, o.eixo, o.n);
  if (o.g) return alternarGrupo(aba, abaId, o.eixo, o.g);
  return null;
}

/** Desenha a margem: botões de nível, a barra de cada grupo e o botão de mais ou menos. */
export function desenharContorno(ctx, G, cores, familia) {
  const ct = G.contorno;
  if (!ct) return;
  const { mL, mC, hw, hh, W, H, zz } = G;
  const s = (G.passo || PASSO) * zz, lado = Math.round((G.passo > PASSO ? 15 : 11) * zz), meio = (k) => Math.round(2 * zz + (k - 1) * s + s / 2);
  ctx.save();
  ctx.fillStyle = cores.cab;
  if (mL) ctx.fillRect(0, mC, mL, H - mC);
  if (mC) ctx.fillRect(mL, 0, W - mL, mC);
  ctx.fillStyle = cores.cabLinha;
  if (mL) ctx.fillRect(mL - 1, hh, 1, H - hh);
  if (mC) ctx.fillRect(hw, mC - 1, W - hw, 1);
  ctx.font = `600 ${(10 * zz).toFixed(1)}px ${familia}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const botao = (cx, cy, rot) => {
    const x = Math.round(cx - lado / 2) + 0.5, y = Math.round(cy - lado / 2) + 0.5;
    ctx.fillStyle = cores.fundo || '#fff'; ctx.fillRect(x, y, lado, lado);
    ctx.strokeStyle = cores.cabTexto; ctx.lineWidth = 1; ctx.strokeRect(x, y, lado, lado);
    ctx.fillStyle = cores.cabTexto;
    if (rot === '+' || rot === '-') { const m = Math.round(lado * 0.25); ctx.fillRect(x + m, Math.round(cy) - 0.5, lado - 2 * m, 1); if (rot === '+') ctx.fillRect(Math.round(cx) - 0.5, y + m, 1, lado - 2 * m); }
    else ctx.fillText(rot, cx, cy + 0.5);
  };
  /* níveis */
  const yNivL = mC + (hh - mC) / 2, xNivC = mL + (hw - mL) / 2;
  if (mL) for (let n = 1; n <= ct.nL + 1; n++) botao(meio(n), yNivL, String(n));
  if (mC) for (let n = 1; n <= ct.nC + 1; n++) botao(xNivC, meio(n), String(n));
  /* grupos das linhas */
  if (mL) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, hh, mL, H - hh); ctx.clip();
    for (const g of ct.gL) {
      const x = meio(g.k), yr = G.linhas.tam(g.resumo) ? G.yDe(g.resumo) + (G.linhas.tam(g.resumo) * G.z) / 2 : null;
      if (!g.fechado) {
        const y1 = G.yDe(g.ini), y2 = G.yFim(g.fim);
        if (y2 > hh && y1 < H) { ctx.fillStyle = cores.cabTexto; ctx.fillRect(x - 0.5, Math.max(hh, y1 + 2 * zz), 1, Math.max(0, y2 - Math.max(hh, y1 + 2 * zz))); if (yr == null) ctx.fillRect(x - 0.5, y2 - 1, Math.round(4 * zz), 1); }
      }
      if (yr != null && yr > hh - lado && yr < H + lado) botao(x, yr, g.fechado ? '+' : '-');
    }
    ctx.restore();
  }
  /* grupos das colunas */
  if (mC) {
    ctx.save(); ctx.beginPath(); ctx.rect(hw, 0, W - hw, mC); ctx.clip();
    for (const g of ct.gC) {
      const y = meio(g.k), xr = G.colunas.tam(g.resumo) ? G.xDe(g.resumo) + (G.colunas.tam(g.resumo) * G.z) / 2 : null;
      if (!g.fechado) {
        const x1 = G.xDe(g.ini), x2 = G.xFim(g.fim);
        if (x2 > hw && x1 < W) { ctx.fillStyle = cores.cabTexto; ctx.fillRect(Math.max(hw, x1 + 2 * zz), y - 0.5, Math.max(0, x2 - Math.max(hw, x1 + 2 * zz)), 1); }
      }
      if (xr != null && xr > hw - lado && xr < W + lado) botao(xr, y, g.fechado ? '+' : '-');
    }
    ctx.restore();
  }
  ctx.restore();
}
