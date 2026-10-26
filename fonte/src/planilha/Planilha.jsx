/* EFCdocs — editor da Planilha (v0.4.0).
   Grade do tamanho do Excel desenhada num canvas (só o que aparece), motor de cálculo próprio,
   digitação e atalhos iguais ao Excel, formatos guardados no código do Excel, barra de fórmula com ajuda
   (dica, autocompletar, erro antes do Enter, nome da coluna, prévia), nomes fáceis, "Ir para" e "Quem usa".
   Toda mudança vira um diff: entra no desfazer (até 200 passos, com nome) e grava só o que mudou. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ler, gravar } from '../nucleo/armazem.js';
import { Icone, Janela } from '../ui/comum.jsx';
import { PortalPainel } from '../quadro/partes.jsx';
import { Motor } from './motor.js';
import { MAX_LIN, MAX_COL, chave, lerChave, letraCol, textoFaixa, textoFaixaCaixa, normalFaixa, lerEndereco, lerEnderecoCaixa, nomeAbaNaFormula } from './ref.js';
import { eixo, ALT_PADRAO, LARG_PADRAO, estiloDe, mescladas, mesclaEm, valorGuardado, paraGuardarValor, validarNomeAba, validarNomeDefinido } from './modelo.js';
import { geometria, desenhar, ondeCaiu, textoCelula, fonteCanvas, FONTE_PADRAO, corLegivel } from './grade.js';
import { formatar, codigoPt, mudarCasas, FORMATO_MOEDA, FORMATO_PCT, ehFormatoData } from './formato.js';
import { lerEntrada, lerTSV, escreverTSV, lerTabelaHTML, escHTML } from './entrada.js';
import { paraMostrar, refTexto, tokenizar, ler as lerFormula, paraGuardar, escrever } from './formula.js';
import { explicarConta, numeroEmData, causaDaConta, causaCircular, problemasDaPlanilha, grafoDaConta, trocarNumeroPorNome } from './explicar.js';
import { JanelaExplicar, JanelaFluxo, JanelaMontar, PainelProblemas, quadroDaConta } from './entender.jsx';
import { diagnosticar, corrigir, contextoNoCursor, sugestoes, pedacosColoridos, CORES_REF, funcoesQueFaltam } from './ajuda.js';
import { formatoDaFormula } from './formatoAuto.js';
import { ERRO_EXPLICA, ehErro, numeroCheio, serialHoje, serialAgora, lerNumeroPt, numeroGeral } from './valores.js';
import * as O from './operacoes.js';
import { objetosDaAba, novaAssinatura, mudancaObjetos, comObjeto, semObjeto, retDoObjeto, ancoraNoPonto, recorteDoObjeto, MAX_OBJETOS } from './objetos.js';
import { JanelaAssinatura, AssinaturaView } from '../ui/assinatura.jsx';
import { ASN } from '../nucleo/assinatura.js';
import { CampoFormula, AjudaFormula } from './EditorFormula.jsx';
import { AbasPlanilha, MenuFlutuante, JanelaCor, JanelaFormato, JanelaFonte, JanelaCongelar, JanelaFuncoes, JanelaNomes, JanelaOrigem, JanelaLocalizar, JanelaZeros, JanelaNumeroData, BarraSimbolos, ESTATS } from './partes.jsx';

const Z_MIN = 0.5, Z_MAX = 2;
const CORES_FOLHA_CLARA = {
  fundo: '#ffffff', fundoHex: '#ffffff', texto: '#1f1f1f', textoFraco: '#777777', grade: '#dadcdf', borda: '#1f1f1f',
  cab: '#f3f4f6', cabTexto: '#555b66', cabSel: '#dbe7f6', cabSelTexto: '#1d4f91', cabLinha: '#c9ccd1',
  sel: '#1a73e8', selFundo: 'rgba(26,115,232,.12)', congelado: '#9aa3ad', spill: '#1a73e8',
};
const vazioOuTexto = (v) => v == null || v === '';
const FUNCOES_CEL = ['SOMA', 'SE', 'PROCV', 'CONT.SE', 'MÉDIA', 'HOJE'];

/* área de transferência interna (vale entre planilhas deste aparelho) */
let clipInterno = null;

/* v0.4.7: barra de fórmula esticável (como no Excel): mínimo = a altura de sempre; máximo = 220 px */
const FX_MIN = 34;
const FX_MAX = 220;
const FX_ABRIR = 96;
const limitaFx = (v, maxArea) => Math.round(Math.max(FX_MIN, Math.min(Number(v) || FX_MIN, FX_MAX, maxArea || FX_MAX)));

function lerCores(el) {
  const st = getComputedStyle(el);
  const v = (n, p) => st.getPropertyValue(n).trim() || p;
  const fundo = v('--surface', '#ffffff');
  const prim = v('--primary', '#1a73e8');
  return {
    fundo, fundoHex: fundo.startsWith('#') ? fundo : '#ffffff', texto: v('--text', '#1f1f1f'), textoFraco: v('--text-muted', '#777'),
    grade: v('--border', '#dadcdf'), borda: v('--text', '#1f1f1f'),
    cab: v('--surface-2', '#f3f4f6'), cabTexto: v('--text-muted', '#555'), cabSel: v('--primary-soft', 'rgba(26,115,232,.16)'), cabSelTexto: v('--text', '#111'), cabLinha: v('--border-light', '#ccc'),
    sel: prim, selFundo: v('--primary-soft', 'rgba(26,115,232,.12)'), congelado: v('--text-dim', '#999'), spill: prim,
  };
}

/** Índice das células com conteúdo por linha e por coluna (para Ctrl+setas e "próxima vazia"). */
function indiceCheias(aba) {
  const porCol = new Map(), porLin = new Map();
  for (const k of Object.keys(aba.cel)) {
    const x = aba.cel[k];
    if (x.v === undefined && x.f == null) continue;
    const p = lerChave(k);
    if (!p) continue;
    if (!porCol.has(p.c)) porCol.set(p.c, []);
    porCol.get(p.c).push(p.l);
    if (!porLin.has(p.l)) porLin.set(p.l, []);
    porLin.get(p.l).push(p.c);
  }
  for (const a of porCol.values()) a.sort((x, y) => x - y);
  for (const a of porLin.values()) a.sort((x, y) => x - y);
  return { porCol, porLin };
}

/** Ctrl+seta: o próximo limite dos dados (regra do Excel). */
function pularBorda(lista, atual, passo, max) {
  const tem = (i) => lista && binTem(lista, i);
  const prox = atual + passo;
  if (prox < 0 || prox > max) return atual;
  if (tem(atual) && tem(prox)) {
    let i = prox;
    while (i + passo >= 0 && i + passo <= max && tem(i + passo)) i += passo;
    return i;
  }
  /* próximo cheio na direção */
  if (!lista || !lista.length) return passo > 0 ? max : 0;
  if (passo > 0) { const n = lista.find((x) => x > atual); return n == null ? max : n; }
  for (let k = lista.length - 1; k >= 0; k--) if (lista[k] < atual) return lista[k];
  return 0;
}
function binTem(a, x) {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (a[m] === x) return true; if (a[m] < x) lo = m + 1; else hi = m - 1; }
  return false;
}

/** Linha do cabeçalho (PL09): a primeira linha com títulos de texto seguida de dados; ou a marcada pela pessoa. */
export function linhaCabecalho(aba, motor, abaId) {
  if (aba.cab != null) return aba.cab;
  const idx = indiceCheias(aba);
  const linhas = [...idx.porLin.keys()].sort((a, b) => a - b).slice(0, 30);
  for (const l of linhas) {
    const cols = idx.porLin.get(l);
    if (cols.length < 2) continue;
    const textos = cols.filter((c) => typeof motor.valor(abaId, l, c) === 'string').length;
    if (textos >= Math.max(2, cols.length * 0.5) && idx.porLin.has(l + 1)) return l;
  }
  return -1;
}

export function Planilha({ arquivo, cx }) {
  const ficha = arquivo.ficha;
  const c = arquivo.conteudo;
  const somenteLeitura = !cx.pode('planilha.editar');
  const cel = !!cx.cel;

  /* ---------- motor de cálculo (recalcula só o que mudou) ---------- */
  const motorRef = useRef(null);
  const motor = useMemo(() => {
    if (!motorRef.current) motorRef.current = new Motor(c);
    else motorRef.current.atualizar(c);
    return motorRef.current;
  }, [c]);

  /* ---------- estado da tela ---------- */
  const [abaIdEstado, setAbaIdEstado] = useState(() => { const s = ler('pl-aba:' + ficha.id, null); return c.abas[s] ? s : c.ordem.find((id) => !c.abas[id].oculta) || c.ordem[0]; });
  const abaId = c.abas[abaIdEstado] ? abaIdEstado : c.ordem[0];
  const aba = c.abas[abaId];
  const [sel, setSelEstado] = useState({ ativa: { l: 0, c: 0 }, faixas: [{ l1: 0, c1: 0, l2: 0, c2: 0 }] });
  const selPorAba = useRef({});
  const [z, setZ] = useState(() => { const v = Number(ler('pl-zoom:' + ficha.id, 1)); return v >= Z_MIN && v <= Z_MAX ? v : 1; });
  const [rol, setRol] = useState({ x: 0, y: 0 });
  const [tam, setTam] = useState({ W: 800, H: 500 });
  const [edit, setEditEstado] = useState(null);
  const editRef = useRef(null);
  const setEdit = (e) => { editRef.current = typeof e === 'function' ? e(editRef.current) : e; setEditEstado(editRef.current); };
  const [menu, setMenu] = useState(null);
  const [janela, setJanela] = useState(null);
  const [arrasto, setArrasto] = useState(null);
  const [copia, setCopia] = useState(null);
  const [pincel, setPincel] = useState(null);
  const [prefs, setPrefs] = useState(() => ({ folhaClara: false, status: ['soma', 'media', 'cont'], fxAlt: FX_MIN, ...ler('planilha-prefs', {}) }));
  /* v0.4.7: altura da barra de fórmula (arrasto ao vivo) */
  const [fxArr, setFxArr] = useState(null);
  const fxDrag = useRef(null);
  const [cores, setCores] = useState(CORES_FOLHA_CLARA);
  const [selSug, setSelSug] = useState(0);
  const [semSug, setSemSug] = useState(false);
  const [probAberto, setProbAberto] = useState(false);
  /* v0.4.5: assinatura sobre a grade */
  const [objSel, setObjSelEstado] = useState(null);
  const objSelRef = useRef(null);
  const setObjSel = (id) => { objSelRef.current = id; setObjSelEstado(id); };
  const [asn, setAsn] = useState(null); /* janela: { id (null = nova), inicial } */
  const arrObjRef = useRef(null);
  const [arrObj, setArrObjEstado] = useState(null);
  const setArrObj = (v) => { arrObjRef.current = v; setArrObjEstado(v); };
  const [listaProb, setListaProb] = useState([]);
  const voltar = useRef([]);
  const extensao = useRef({ l: 0, c: 0 });
  const raiz = useRef(null);
  const rolRef = useRef(null);
  const cvRef = useRef(null);
  const capRef = useRef(null);
  const campoCel = useRef(null);
  const campoBarra = useRef(null);
  const toque = useRef(null);

  useEffect(() => { gravar('planilha-prefs', prefs); }, [prefs]);
  useEffect(() => { gravar('pl-zoom:' + ficha.id, z); }, [z, ficha.id]);
  useEffect(() => { gravar('pl-aba:' + ficha.id, abaId); }, [abaId, ficha.id]);

  const setSel = useCallback((s) => { setSelEstado(s); selPorAba.current[abaId] = s; }, [abaId]);
  /* quem só pode ver recebe um aviso ao tentar mexer (sem repetir a cada tecla) */
  const ultimoAvisoLeitura = useRef(0);
  const avisarLeitura = () => {
    if (cx.travado && cx.chamarFaixa) cx.chamarFaixa();
    if (Date.now() - ultimoAvisoLeitura.current < 2500) return;
    ultimoAvisoLeitura.current = Date.now();
    cx.avisar(cx.travado && cx.travado.motivo === 'conflito' ? 'Antes de continuar, escolha no aviso do topo: ver a versão gravada ou gravar a sua por cima.' : cx.travado ? 'Só para ver: este arquivo está aberto em outra aba. Toque em "Editar aqui" no topo para editar nesta.' : 'Só leitura: seu perfil de teste (Leitor) só vê a planilha. Para editar, troque o perfil em Opções.', { ic: 'ver' });
  };
  const faixa = sel.faixas[sel.faixas.length - 1];

  /* cores do tema (a grade acompanha o tema; "Folha clara" deixa branca) */
  useEffect(() => {
    const ler1 = () => { if (raiz.current) setCores(prefs.folhaClara ? CORES_FOLHA_CLARA : lerCores(raiz.current)); };
    ler1();
    const ob = new MutationObserver(ler1);
    ob.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    return () => ob.disconnect();
  }, [prefs.folhaClara]);

  /* tamanho da área */
  useLayoutEffect(() => {
    const el = rolRef.current;
    if (!el) return undefined;
    const med = () => setTam({ W: el.clientWidth, H: el.clientHeight });
    med();
    const ro = new ResizeObserver(med);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------- eixos e geometria ---------- */
  const linhas = useMemo(() => eixo(aba.alt, aba.ocL, ALT_PADRAO, MAX_LIN), [aba.alt, aba.ocL]);
  const colunas = useMemo(() => eixo(aba.larg, aba.ocC, LARG_PADRAO, MAX_COL), [aba.larg, aba.ocC]);
  const cong = aba.cong || null;
  const mesc = useMemo(() => mescladas(aba), [aba.mesc]); // eslint-disable-line react-hooks/exhaustive-deps
  const cheias = useMemo(() => indiceCheias(aba), [aba.cel]); // eslint-disable-line react-hooks/exhaustive-deps
  const usado = motor.usado(abaId);

  /* extensão da rolagem: área usada + folga, e cresce ao chegar perto do fim */
  const extL = Math.min(MAX_LIN, Math.max(usado.lMax + 60, sel.ativa.l + 40, extensao.current.l, Math.ceil(tam.H / (ALT_PADRAO * z)) * 2));
  const extC = Math.min(MAX_COL, Math.max(usado.cMax + 12, sel.ativa.c + 8, extensao.current.c, Math.ceil(tam.W / (LARG_PADRAO * z)) * 2));
  const cl = cong ? cong.l : 0, cc0 = cong ? cong.c : 0;
  const conteudoH = (linhas.pos(extL) - linhas.pos(cl)) * z;
  const conteudoW = (colunas.pos(extC) - colunas.pos(cc0)) * z;
  const ESP_MAX = 1.5e7;
  const espH = Math.min(conteudoH + tam.H, ESP_MAX), espW = Math.min(conteudoW + tam.W, ESP_MAX);
  const fatorY = conteudoH + tam.H > ESP_MAX ? (conteudoH) / (ESP_MAX - tam.H) : 1;
  const fatorX = conteudoW + tam.W > ESP_MAX ? (conteudoW) / (ESP_MAX - tam.W) : 1;

  const G = useMemo(() => geometria({ linhas, colunas, z, sx: rol.x, sy: rol.y, cong, W: tam.W, H: tam.H }), [linhas, colunas, z, rol, cong, tam]);

  const aoRolar = () => {
    const el = rolRef.current;
    if (!el) return;
    const y = (el.scrollTop * fatorY) / z, x = (el.scrollLeft * fatorX) / z;
    setRol({ x, y });
    /* perto do fim: estica a área */
    if (el.scrollTop + el.clientHeight > el.scrollHeight - el.clientHeight * 0.5 && extL < MAX_LIN) extensao.current = { ...extensao.current, l: Math.min(MAX_LIN, extL + 200) };
    if (el.scrollLeft + el.clientWidth > el.scrollWidth - el.clientWidth * 0.5 && extC < MAX_COL) extensao.current = { ...extensao.current, c: Math.min(MAX_COL, extC + 20) };
  };

  /** Rola para a célula aparecer (respeitando os painéis congelados). */
  const mostrarCelula = useCallback((l, col, { centro = false } = {}) => {
    const el = rolRef.current;
    if (!el) return;
    const Gx = geometria({ linhas, colunas, z, sx: rol.x, sy: rol.y, cong, W: el.clientWidth, H: el.clientHeight });
    let { x, y } = rol;
    if (l >= cl) {
      const topo = linhas.pos(l) - linhas.pos(cl), alt = linhas.tam(l);
      const visivel = (el.clientHeight - Gx.hh - Gx.fy) / z;
      /* "Ir para": a célula vai para o meio da tela se estiver perto da borda (não fica colada nas abas) */
      const margem = centro ? Math.min(alt * 2, visivel / 4) : 0;
      if (centro && (topo < y + margem || topo + alt > y + visivel - margem)) y = Math.max(0, topo - (visivel - alt) / 2);
      else if (topo < y) y = topo;
      else if (topo + alt > y + visivel) y = topo + alt - visivel;
    }
    if (col >= cc0) {
      const esq = colunas.pos(col) - colunas.pos(cc0), lar = colunas.tam(col);
      const visivel = (el.clientWidth - Gx.hw - Gx.fx) / z;
      const margemX = centro ? Math.min(lar, visivel / 6) : 0;
      if (centro && (esq < x + margemX || esq + lar > x + visivel - margemX)) x = Math.max(0, Math.min(esq, esq - (visivel - lar) / 2));
      else if (esq < x) x = esq;
      else if (esq + lar > x + visivel) x = Math.min(esq, esq + lar - visivel);
    }
    if (x !== rol.x || y !== rol.y) {
      if (l + 40 > extensao.current.l) extensao.current = { ...extensao.current, l: Math.min(MAX_LIN, l + 60) };
      if (col + 8 > extensao.current.c) extensao.current = { ...extensao.current, c: Math.min(MAX_COL, col + 12) };
      setRol({ x: Math.max(0, x), y: Math.max(0, y) });
      requestAnimationFrame(() => {
        if (!rolRef.current) return;
        rolRef.current.scrollTop = (Math.max(0, y) * z) / fatorY;
        rolRef.current.scrollLeft = (Math.max(0, x) * z) / fatorX;
      });
    }
  }, [linhas, colunas, z, rol, cong, cl, cc0, fatorX, fatorY]);

  /* ---------- seleção e navegação ---------- */
  const expandirMesclas = (f) => {
    let r = normalFaixa(f);
    for (let i = 0; i < 4; i++) {
      let mudou = false;
      for (const m of mesc) {
        if (m.l2 < r.l1 || m.l1 > r.l2 || m.c2 < r.c1 || m.c1 > r.c2) continue;
        const n = { l1: Math.min(r.l1, m.l1), c1: Math.min(r.c1, m.c1), l2: Math.max(r.l2, m.l2), c2: Math.max(r.c2, m.c2) };
        if (n.l1 !== r.l1 || n.c1 !== r.c1 || n.l2 !== r.l2 || n.c2 !== r.c2) { r = n; mudou = true; }
      }
      if (!mudou) break;
    }
    return r;
  };

  const selecionar = useCallback((l, col, { estender = false, adicionar = false, ancora = null, semRolar = false } = {}) => {
    l = Math.max(0, Math.min(MAX_LIN - 1, l));
    col = Math.max(0, Math.min(MAX_COL - 1, col));
    if (estender) {
      const a = ancora || sel.ativa;
      const f = expandirMesclas({ l1: a.l, c1: a.c, l2: l, c2: col });
      setSel({ ativa: sel.ativa, faixas: [...sel.faixas.slice(0, -1), f] });
    } else if (adicionar) {
      const f = expandirMesclas({ l1: l, c1: col, l2: l, c2: col });
      setSel({ ativa: { l, c: col }, faixas: [...sel.faixas, f] });
    } else {
      const m = mesclaEm(mesc, l, col);
      const f = m ? { l1: m.l1, c1: m.c1, l2: m.l2, c2: m.c2 } : { l1: l, c1: col, l2: l, c2: col };
      setSel({ ativa: { l: m ? m.l1 : l, c: m ? m.c1 : col }, faixas: [f] });
    }
    if (!semRolar) mostrarCelula(l, col);
  }, [sel, setSel, mesc, mostrarCelula]); // eslint-disable-line react-hooks/exhaustive-deps

  const trocarAba = useCallback((id, manterEdicao = false) => {
    /* a aba pode ter acabado de ser criada (ainda não está neste "c"): troca assim mesmo */
    if (!manterEdicao && editRef.current) confirmarRef.current(null);
    selPorAba.current[abaId] = sel;
    setAbaIdEstado(id);
    setSelEstado(selPorAba.current[id] || { ativa: { l: 0, c: 0 }, faixas: [{ l1: 0, c1: 0, l2: 0, c2: 0 }] });
    setRol({ x: 0, y: 0 });
    extensao.current = { l: 0, c: 0 };
    if (rolRef.current) { rolRef.current.scrollTop = 0; rolRef.current.scrollLeft = 0; }
    setCopia(null);
  }, [c, abaId, sel]);

  /** Vai para um endereço (com aba) e guarda o caminho para o Alt+← voltar. */
  const irPara = useCallback((alvo, guardar = true) => {
    if (guardar) voltar.current.push({ abaId, sel });
    if (voltar.current.length > 50) voltar.current.shift();
    const id = alvo.abaId || abaId;
    if (id !== abaId) trocarAba(id);
    const f = { l1: alvo.l1 ?? alvo.l, c1: alvo.c1 ?? alvo.c, l2: alvo.l2 ?? alvo.l, c2: alvo.c2 ?? alvo.c };
    const s = { ativa: { l: f.l1, c: f.c1 }, faixas: [f] };
    setTimeout(() => {
      setSelEstado(s);
      selPorAba.current[id] = s;
      mostrarCelula(f.l1, f.c1, { centro: true });
    }, 0);
    setTimeout(() => capRef.current && capRef.current.focus(), 30);
  }, [abaId, sel, trocarAba, mostrarCelula]);

  const andar = (dl, dc, { estender = false, pular = false } = {}) => {
    const base = estender ? { l: faixaPonta().l, c: faixaPonta().c } : sel.ativa;
    let l = base.l, col = base.c;
    if (pular) {
      if (dl) l = pularBorda(cheias.porCol.get(col), l, dl, MAX_LIN - 1);
      if (dc) col = pularBorda(cheias.porLin.get(l), col, dc, MAX_COL - 1);
    } else {
      /* pula linhas/colunas ocultas e mescladas */
      l += dl; col += dc;
      while (l > 0 && l < MAX_LIN - 1 && !linhas.tam(l)) l += dl || 1;
      while (col > 0 && col < MAX_COL - 1 && !colunas.tam(col)) col += dc || 1;
      if (!estender) {
        const m = mesclaEm(mesc, sel.ativa.l, sel.ativa.c);
        if (m && dl > 0) l = m.l2 + 1;
        if (m && dc > 0) col = m.c2 + 1;
      }
    }
    if (estender) selecionar(l, col, { estender: true });
    else selecionar(l, col);
  };
  /* ponta móvel da seleção (o canto oposto à ativa) */
  const faixaPonta = () => ({ l: faixa.l1 === sel.ativa.l ? faixa.l2 : faixa.l1, c: faixa.c1 === sel.ativa.c ? faixa.c2 : faixa.c1 });

  /* ---------- mudanças ---------- */
  const mudar = useCallback((mud, rotulo, acao = 'editou') => {
    if (somenteLeitura) { avisarLeitura(); return false; }
    if (!mud || !Object.keys(mud).length) return false;
    return cx.aplicar(mud, rotulo, acao);
  }, [somenteLeitura, cx]);
  const aplicarLote = (lote, rotulo) => (lote.vazio ? false : mudar(lote.mudancas(), rotulo));
  const contaCelulas = (fs) => fs.reduce((n, f) => n + (f.l2 - f.l1 + 1) * (f.c2 - f.c1 + 1), 0);
  const nomeSel = () => (sel.faixas.length > 1 ? `${sel.faixas.length} faixas` : textoFaixa(faixa).replace(/:?\b[A-Z]+1048576\b/, '').replace(/^A(\d+):XFD\1$/, 'linha $1'));

  /* ---------- edição ---------- */
  const celulaAtiva = aba.cel[chave(sel.ativa.l, sel.ativa.c)];
  const estiloAtivo = estiloDe(c, celulaAtiva);

  /** Texto que vai para o campo ao editar (fórmula em pt-BR; data como dd/mm/aaaa; porcentagem com %). */
  const textoParaEditar = (x, e) => {
    if (!x) return '';
    if (x.f != null) return '=' + paraMostrar(x.f);
    const v = valorGuardado(x);
    if (v == null) return '';
    if (typeof v === 'number') {
      const nf = e.nf || '';
      if (/\[h\]/i.test(nf)) return formatar(v, /s/i.test(nf) ? '[h]:mm:ss' : '[h]:mm').t;
      if (ehFormatoData(nf)) {
        const t = formatar(v, Number.isInteger(v) ? 'dd/mm/yyyy' : /h/i.test(nf) && v >= 1 ? 'dd/mm/yyyy hh:mm:ss' : v < 1 ? 'hh:mm:ss' : 'dd/mm/yyyy hh:mm').t;
        return t.replace(/:00$/, (m) => (/:\d\d:00$/.test(t) ? '' : m));
      }
      if (/%/.test(nf)) return numeroCheio(v * 100) + '%';
      return numeroCheio(v);
    }
    if (typeof v === 'boolean') return v ? 'VERDADEIRO' : 'FALSO';
    if (ehErro(v)) return v.toString();
    return String(v);
  };

  const comecarEdicao = useCallback(({ texto, modo = 'editar', onde = cel ? 'banda' : 'celula', cursor = null, l = sel.ativa.l, col = sel.ativa.c } = {}) => {
    if (somenteLeitura) { avisarLeitura(); return; }
    const m = mesclaEm(mesc, l, col);
    if (m) { l = m.l1; col = m.c1; }
    const x = aba.cel[chave(l, col)];
    const t = texto != null ? texto : textoParaEditar(x, estiloDe(c, x));
    setSemSug(false); setSelSug(0);
    setEdit({ texto: t, cursor: cursor == null ? t.length : cursor, modo, onde, l, c: col, abaId, original: textoParaEditar(x, estiloDe(c, x)), aponta: null });
    mostrarCelula(l, col);
  }, [somenteLeitura, cx, mesc, aba, c, sel, abaId, cel, mostrarCelula]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Esc fecha a lista de Problemas (também quando o foco está no botão da lâmpada) */
  useEffect(() => {
    if (!probAberto) return undefined;
    const tecla = (ev) => {
      if (ev.key !== 'Escape' || editRef.current || document.querySelector('.fundo')) return;
      setProbAberto(false);
      setTimeout(voltarFocoGrade, 0);
    };
    addEventListener('keydown', tecla);
    return () => removeEventListener('keydown', tecla);
  }, [probAberto]); // eslint-disable-line react-hooks/exhaustive-deps

  /* celular: o teclado encolhe a grade; a célula que está sendo digitada tem de continuar à vista */
  useEffect(() => {
    if (cel && edit) mostrarCelula(edit.l, edit.c);
  }, [tam.H, cel, edit && edit.l, edit && edit.c]); // eslint-disable-line react-hooks/exhaustive-deps
  /* celular: enquanto digita, a faixa e as abas dela saem de cena para a grade ter espaço (volta ao confirmar) */
  useEffect(() => {
    const ligado = !!(cel && edit);
    document.body.classList.toggle('editando-cel', ligado);
    return () => document.body.classList.remove('editando-cel');
  }, [cel, !!edit]); // eslint-disable-line react-hooks/exhaustive-deps

  const nomesDefinidos = useMemo(() => new Set(Object.keys(c.nomes || {})), [c.nomes]);

  /** Nome da coluna (‹Cloro livre›) de uma célula de qualquer aba: só abaixo da linha de títulos. */
  const cacheTitulos = useMemo(() => new Map(), [c]);
  const tituloDe = useCallback((id, l, col) => {
    const a = c.abas[id];
    if (!a) return null;
    let t = cacheTitulos.get(id);
    if (!t) {
      const cab = linhaCabecalho(a, motor, id);
      const mapa = new Map();
      if (cab >= 0) {
        for (const k of Object.keys(a.cel)) {
          const p = lerChave(k);
          if (!p || p.l !== cab) continue;
          const v = motor.valor(id, cab, p.c);
          if (typeof v === 'string' && v.trim()) mapa.set(p.c, v.trim());
        }
      }
      t = { cab, mapa };
      cacheTitulos.set(id, t);
    }
    return t.cab >= 0 && l > t.cab ? t.mapa.get(col) || null : null;
  }, [cacheTitulos, c, motor]);
  const nomesAbas = useMemo(() => new Set(c.ordem.map((id) => c.abas[id].nome.toLowerCase())), [c.ordem, c.abas]);

  /** Número ou data que não cabe numa coluna de largura padrão: alarga a coluna (como o Excel faz ao digitar). */
  const medidor = useRef(null);
  const alargar = (lote, id, itens) => {
    const a = c.abas[id];
    const porCol = new Map();
    if (!medidor.current) medidor.current = document.createElement('canvas').getContext('2d');
    const m = medidor.current;
    const familia = getComputedStyle(document.body).fontFamily;
    for (const { col, v, est } of itens) {
      if (typeof v !== 'number' || (a.larg && a.larg[col] != null)) continue;
      const t = formatar(v, est.nf).t;
      m.font = fonteCanvas(est, 1, familia);
      const w = Math.ceil(m.measureText(t).width + 12);
      if (w > LARG_PADRAO && w > (porCol.get(col) || 0)) porCol.set(col, Math.min(w, 300));
    }
    for (const [col, w] of porCol) lote.outras[`conteudo.abas.${id}.larg.${col}`] = w;
  };

  /** Formato da célula apontada por um nó ref/area da fórmula (para a fórmula herdar data, moeda...). */
  const nfDaRef = (id0) => (n) => {
    let id = id0;
    if (n.aba) { id = c.ordem.find((x) => c.abas[x].nome.toLowerCase() === String(n.aba).toLowerCase()); if (!id) return null; }
    const a = c.abas[id];
    const x = a && a.cel[chave(n.t === 'ref' ? n.l : n.l1, n.t === 'ref' ? n.c : n.c1)];
    return x ? estiloDe(c, x).nf || null : null;
  };

  /** Grava o que foi digitado. mover: [dl, dc] ou null. Devolve false se a fórmula tem erro. */
  const confirmar = (mover, { preencherTudo = false, zero = null, lembrar = false, numdata = null } = {}) => {
    let e = editRef.current;
    if (!e) return true;
    if (autoTextoRef.current && autoTextoRef.current.toLowerCase().startsWith(e.texto.toLowerCase())) e = { ...e, texto: autoTextoRef.current };
    const texto = e.texto;
    const abaE = c.abas[e.abaId];
    if (!abaE) { setEdit(null); return true; }
    if (texto === e.original && !preencherTudo) {
      flushSync(() => setEdit(null));
      voltarFocoGrade();
      if (e.abaId !== abaId) trocarAba(e.abaId, true);
      else if (mover) andar(mover[0], mover[1]);
      return true;
    }
    if (texto.startsWith('=') && texto.length > 1) {
      const probs = diagnosticar(texto.slice(1), { nomes: nomesDefinidos, abas: nomesAbas }).filter((p) => p.nivel === 'erro');
      if (probs.length) {
        setEdit({ ...e, mostrarErros: true });
        cx.avisar('A fórmula tem um problema: ' + probs[0].msg, { ic: 'aviso' });
        return false;
      }
    }
    const k = chave(e.l, e.c);
    const atual = abaE.cel[k] || {};
    const est = estiloDe(c, atual);
    let r = lerEntrada(texto, est.nf || 'General');
    if (r.erro) {
      setEdit({ ...e, mostrarErros: true });
      cx.avisar('A fórmula tem um problema: ' + r.erro.message, { ic: 'aviso' });
      return false;
    }
    /* código com zero na frente (001): a pessoa decide se fica como texto; a escolha pode ficar lembrada na coluna */
    let memoZero = null;
    if (r.zeroNaFrente) {
      const lembrada = (abaE.zeros || {})[e.c];
      const esc = zero || lembrada;
      if (!esc) {
        setJanela({
          tipo: 'zero', codigos: [r.zeroNaFrente], colunas: [e.c],
          aoEscolher: (ec, lemb) => { setJanela(null); confirmarRef.current(mover, { preencherTudo, zero: ec, lembrar: lemb }); },
          aoFechar: () => { setJanela(null); setTimeout(() => { const f = (editRef.current && editRef.current.onde === 'barra' ? campoBarra : campoCel).current; if (f) f.focar(); }, 0); },
        });
        return false;
      }
      if (esc === 't') r = { v: r.zeroNaFrente, texto: true };
      if (zero && lembrar) memoZero = { ...(abaE.zeros || {}), [e.c]: zero };
    }
    /* conta que dá número pequeno numa célula formatada como data (0,9 viraria 31/12/1899): pergunta uma vez */
    if (r.f != null && !preencherTudo && !numdata && est.nf && ehFormatoData(est.nf)) {
      const auto = formatoDaFormula(r.f, nfDaRef(e.abaId));
      if (!auto || !ehFormatoData(auto)) {
        const pv = motor.previa(texto.replace(/^\s*=/, ''), e.abaId, e.l, e.c);
        if (!pv.erro && numeroEmData(pv.valor, est.nf)) {
          setJanela({
            tipo: 'numdata', valor: numeroGeral(pv.valor), mostra: formatar(pv.valor, est.nf).t,
            aoEscolher: (esc) => { setJanela(null); confirmarRef.current(mover, { preencherTudo, zero, lembrar, numdata: esc }); },
            aoFechar: () => { setJanela(null); setTimeout(() => { const f = (editRef.current && editRef.current.onde === 'barra' ? campoBarra : campoCel).current; if (f) f.focar(); }, 0); },
          });
          return false;
        }
      }
    }
    const lote = new O.Lote(c);
    const nova = { ...atual };
    delete nova.v; delete nova.f;
    if (r.f != null) nova.f = r.f;
    else if (!r.vazio) nova.v = paraGuardarValor(r.v);
    const nfNovo = r.nf || (r.f != null ? formatoDaFormula(r.f, nfDaRef(e.abaId)) : null);
    if (nfNovo && (!est.nf || /^general$/i.test(est.nf))) { const s = lote.estilo({ ...est, nf: nfNovo }); if (s) nova.s = s; }
    if (numdata === 'n') { const s = lote.estilo({ ...est, nf: 'General' }); if (s) nova.s = s; }
    /* grava e devolve o teclado para a grade na mesma hora (quem digita rápido não perde letra) */
    flushSync(() => {
      setEdit(null);
      if (preencherTudo && sel.faixas.length) {
        const lt = O.preencherSelecao(c, e.abaId, sel.faixas, { ...nova }, e.l, e.c);
        if (memoZero) lt.outras[`conteudo.abas.${e.abaId}.zeros`] = memoZero;
        aplicarLote(lt, `Preencher ${contaCelulas(sel.faixas)} células`);
      } else {
        if (memoZero) lote.outras[`conteudo.abas.${e.abaId}.zeros`] = memoZero;
        lote.por(e.abaId, k, nova);
        if (nova.v !== undefined) alargar(lote, e.abaId, [{ col: e.c, v: nova.v, est: estiloDe({ estilos: lote.estilos }, nova) }]);
        aplicarLote(lote, r.vazio ? `Apagar ${chave(e.l, e.c)}` : `Digitar em ${chave(e.l, e.c)}`);
      }
    });
    voltarFocoGrade();
    if (r.aviso) cx.avisar(r.aviso, { ic: 'info' });
    if (e.abaId !== abaId) trocarAba(e.abaId, true);
    else if (mover) andar(mover[0], mover[1]);
    return true;
  };
  const confirmarRef = useRef(confirmar);
  const autoTextoRef = useRef('');
  confirmarRef.current = confirmar;

  const voltarFocoGrade = () => { if (capRef.current) capRef.current.focus({ preventScroll: true }); };

  /* ---------- assinatura sobre a grade (v0.4.5) ---------- */
  const objs = objetosDaAba(aba);
  useEffect(() => { setObjSel(null); setArrObj(null); }, [abaId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (objSelRef.current && !objs.some((o) => o.id === objSelRef.current)) setObjSel(null); }, [objs]); // eslint-disable-line react-hooks/exhaustive-deps
  const gravarObjs = (lista, rotulo) => mudar(mudancaObjetos(abaId, lista), rotulo);
  const abrirAssinatura = (o) => {
    if (somenteLeitura) { avisarLeitura(); return; }
    setObjSel(o.id);
    setAsn({ id: o.id, inicial: { nome: o.nome, rub: o.rub } });
  };
  const excluirObjeto = (o) => {
    if (somenteLeitura) { avisarLeitura(); return; }
    if (gravarObjs(semObjeto(objs, o.id), 'Excluir assinatura') !== false) {
      setObjSel(null);
      cx.avisar('Assinatura excluída.', { ic: 'lixeira', acao: { rotulo: 'Desfazer', fazer: () => cx.executar('editar.desfazer') } });
    }
    voltarFocoGrade();
  };
  const confirmarAssinatura = (v) => {
    const alvo = asn && asn.id ? objs.find((o) => o.id === asn.id) : null;
    if (alvo) {
      const lista = objs.map((o) => { if (o.id !== alvo.id) return o; const n = { ...o, nome: v.nome }; if (v.rub) n.rub = v.rub; else delete n.rub; return n; });
      gravarObjs(lista, 'Assinatura');
    } else {
      if (objs.length >= MAX_OBJETOS) { cx.avisar(`No máximo ${MAX_OBJETOS} assinaturas por aba.`, { ic: 'aviso' }); return; }
      /* entra na célula ativa; se ela não está à vista, na primeira célula que aparece */
      const aVista = sel.ativa.l >= Math.max(G.cl, G.l0) && sel.ativa.l < G.l1 && sel.ativa.c >= Math.max(G.cc, G.c0) && sel.ativa.c < G.c1;
      const ancora = aVista ? { l: sel.ativa.l, c: sel.ativa.c } : { l: Math.max(G.cl, G.l0) + 1, c: Math.max(G.cc, G.c0) };
      const o = novaAssinatura(v, ancora);
      if (gravarObjs([...objs, o], 'Nova assinatura') !== false) { setObjSel(o.id); cx.avisar('Assinatura inserida. Arraste para mover; dois cliques para mudar o nome ou a rubrica.', { ic: 'assinatura' }); }
    }
    setTimeout(voltarFocoGrade, 0);
  };
  const aoBaixarObj = (ev, o, modo) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    ev.stopPropagation();
    ev.preventDefault();
    setObjSel(o.id);
    voltarFocoGrade();
    if (somenteLeitura) { avisarLeitura(); return; }
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* sem captura */ }
    const r = retDoObjeto(o, G);
    setArrObj({ id: o.id, modo, px: ev.clientX, py: ev.clientY, r0: r, ...r, moveu: false });
  };
  const aoMoverObj = (ev) => {
    const a = arrObjRef.current;
    if (!a) return;
    const dx = ev.clientX - a.px, dy = ev.clientY - a.py;
    if (!a.moveu && Math.hypot(dx, dy) < (ev.pointerType === 'touch' ? 6 : 3)) return;
    if (a.modo === 'mover') setArrObj({ ...a, moveu: true, x: a.r0.x + dx, y: a.r0.y + dy });
    else setArrObj({ ...a, moveu: true, w: Math.max(ASN.W_MIN * z, a.r0.w + dx), h: Math.max(ASN.H_MIN * z, a.r0.h + dy) });
  };
  const aoSoltarObj = () => {
    const a = arrObjRef.current;
    setArrObj(null);
    if (!a || !a.moveu) return;
    const o = objs.find((x) => x.id === a.id);
    if (!o) return;
    if (a.modo === 'mover') {
      /* o canto de cima à esquerda decide a célula; fora da área das células, volta para a borda */
      const an = ancoraNoPonto(G, Math.max(G.hw + 1, a.x), Math.max(G.hh + 1, a.y));
      gravarObjs(comObjeto(objs, o.id, an), 'Mover assinatura');
    } else gravarObjs(comObjeto(objs, o.id, { w: Math.round(a.w / z), h: Math.round(a.h / z) }), 'Mudar o tamanho da assinatura');
  };
  const cancelar = () => {
    const e = editRef.current;
    flushSync(() => setEdit(null));
    voltarFocoGrade();
    if (e && e.abaId !== abaId) trocarAba(e.abaId, true);
  };

  /* contexto da fórmula sendo digitada (para a ajuda) */
  const ehFormula = edit && edit.texto.startsWith('=');
  const ctxCursor = ehFormula ? contextoNoCursor(edit.texto.slice(1), Math.max(0, edit.cursor - 1)) : null;
  const tituloCols = useMemo(() => {
    const out = new Map();
    const cab = linhaCabecalho(aba, motor, abaId);
    if (cab < 0) return { cab, mapa: out };
    for (const col of cheias.porLin.get(cab) || []) {
      const v = motor.valor(abaId, cab, col);
      if (typeof v === 'string' && v.trim()) out.set(col, v.trim());
    }
    return { cab, mapa: out };
  }, [aba, motor, abaId, cheias]); // eslint-disable-line react-hooks/exhaustive-deps
  const listaNomes = useMemo(() => Object.values(c.nomes || {}).map((n) => ({ n: n.n, mostra: paraMostrar(n.ref) })), [c.nomes]);
  const listaColunas = useMemo(() => {
    const l = edit ? edit.l : sel.ativa.l;
    return [...tituloCols.mapa.entries()].map(([col, titulo]) => ({ titulo, letra: letraCol(col), ref: letraCol(col) + (l > tituloCols.cab ? l + 1 : tituloCols.cab + 2) }));
  }, [tituloCols, edit, sel.ativa.l]);
  /* sugestão de texto que já existe na coluna (como o Excel): Enter ou Tab aceita, apagar recusa */
  const autoTexto = useMemo(() => {
    if (!edit || ehFormula || edit.modo !== 'entrar' || edit.semAuto || !edit.texto || edit.cursor !== edit.texto.length || /^[\d.,%R$\s/-]+$/.test(edit.texto)) return '';
    const q = edit.texto.toLocaleLowerCase('pt-BR');
    const achados = new Map();
    const lista = (cheias.porCol.get(edit.c) || []).slice(0, 5000);
    for (const l of lista) {
      if (l === edit.l) continue;
      const v = motor.valor(edit.abaId, l, edit.c);
      if (typeof v !== 'string' || v.length <= edit.texto.length) continue;
      const k = v.toLocaleLowerCase('pt-BR');
      if (k.startsWith(q)) achados.set(k, v);
      if (achados.size > 1) return '';
    }
    if (achados.size !== 1) return '';
    const v = [...achados.values()][0];
    return edit.texto + v.slice(edit.texto.length);
  }, [edit && edit.texto, edit && edit.semAuto, edit && edit.cursor, ehFormula, cheias]); // eslint-disable-line react-hooks/exhaustive-deps
  autoTextoRef.current = autoTexto;
  const sugest = ehFormula && !semSug && ctxCursor && ctxCursor.prefixo ? sugestoes(ctxCursor.prefixo, { nomes: listaNomes, colunas: listaColunas }) : [];
  const problemas = ehFormula && edit.texto.length > 1 ? diagnosticar(edit.texto.slice(1), { nomes: nomesDefinidos, abas: nomesAbas })
    .filter((p) => edit.mostrarErros || !(p.f >= edit.cursor - 1 && p.i <= edit.cursor - 1 && /não é célula|não existe|Falta um|Não entendi|terminou/.test(p.msg)) || p.nivel === 'dica') : [];
  const previa = useMemo(() => {
    if (!ehFormula || edit.texto.length < 2) return '';
    /* conta ainda incompleta (faltam partes, parêntese aberto, texto sem aspas): não mostra prévia de erro */
    if (diagnosticar(edit.texto.slice(1), { nomes: nomesDefinidos, abas: nomesAbas }).some((p) => p.nivel === 'erro')) return '';
    /* função real do Excel que ainda falta aqui: a grafia está certa, então não fala em "confira a grafia" */
    if (funcoesQueFaltam(edit.texto.slice(1)).length) return '#NOME? por enquanto. Pode gravar sem medo: a fórmula fica guardada e funciona quando abrir no Excel.';
    const r = motor.previa(edit.texto.slice(1), edit.abaId, edit.l, edit.c);
    if (r.erro) return '';
    if (r.circular) return '0 (conta circular: a célula usa ela mesma)';
    const est = estiloDe(c, c.abas[edit.abaId] && c.abas[edit.abaId].cel[chave(edit.l, edit.c)]);
    const t = formatar(r.valor, est.nf).t;
    return (t === '' ? '(vazio)' : t) + (r.matriz ? `  · derrama em ${r.matriz.linhas} × ${r.matriz.colunas} células` : '') + (ehErro(r.valor) ? ' — ' + (ERRO_EXPLICA[r.valor.cod] || '') : '');
  }, [ehFormula, edit && edit.texto, motor]); // eslint-disable-line react-hooks/exhaustive-deps
  const refsDaFormula = useMemo(() => {
    if (!ehFormula) return [];
    const { refs } = pedacosColoridos(edit.texto.slice(1));
    return refs.filter((r) => (r.aba == null ? edit.abaId === abaId : c.abas[abaId].nome.toLowerCase() === String(r.aba).toLowerCase()))
      .map((r) => ({ ...(r.t === 'ref' ? { l1: r.l, c1: r.c, l2: r.l, c2: r.c } : normalFaixa(r)), cor: r.cor }))
      .map((r) => ({ ...r, l2: Math.min(r.l2, Math.max(r.l1, usado.lMax + 1, G.l1)), c2: Math.min(r.c2, Math.max(r.c1, usado.cMax + 1, G.c1)) }));
  }, [ehFormula, edit && edit.texto, abaId, c.abas, usado, G.l1, G.c1]); // eslint-disable-line react-hooks/exhaustive-deps
  const etiquetas = useMemo(() => {
    if (!ehFormula) return [];
    const out = [];
    const vistos = new Set();
    for (const t of tokenizar(edit.texto.slice(1), 'pt')) {
      if (t.t !== 'ref' || t.v.aba != null) continue;
      const titulo = tituloCols.mapa.get(t.v.c);
      const k = letraCol(t.v.c) + (t.v.l + 1);
      if (!titulo || t.v.l <= tituloCols.cab || vistos.has(k)) continue;
      vistos.add(k);
      out.push({ ref: k, titulo, cor: CORES_REF[out.length % CORES_REF.length] });
    }
    return out;
  }, [ehFormula, edit && edit.texto, tituloCols]); // eslint-disable-line react-hooks/exhaustive-deps

  const mudarTexto = (texto, cursor, soCursor) => {
    const e = editRef.current;
    if (!e) return;
    if (soCursor) { if (e.cursor !== cursor) setEdit({ ...e, cursor }); return; }
    setSemSug(false); setSelSug(0);
    setEdit({ ...e, texto, cursor, aponta: null, mostrarErros: false, semAuto: e.semAuto || texto.length < e.texto.length });
  };

  const inserirNoCursor = (txt) => {
    const e = editRef.current;
    if (!e) { comecarEdicao({ texto: txt, modo: 'entrar' }); return; }
    const t = e.texto.slice(0, e.cursor) + txt + e.texto.slice(e.cursor);
    setEdit({ ...e, texto: t, cursor: e.cursor + txt.length, aponta: null });
    setTimeout(() => { const r = (e.onde === 'barra' ? campoBarra : campoCel).current; if (r) r.focar(); }, 0);
  };

  const escolherSugestao = (s) => {
    const e = editRef.current;
    if (!e || !ctxCursor) return;
    const p = ctxCursor.prefixo;
    const ini = e.cursor - p.length;
    let ins = s.inserir;
    let fim = e.cursor;
    if (s.tipo === 'fn' && e.texto[fim] === '(') ins = ins.slice(0, -1);
    const t = e.texto.slice(0, ini) + ins + e.texto.slice(fim);
    setEdit({ ...e, texto: t, cursor: ini + ins.length, aponta: null });
    setSelSug(0);
  };

  /** Modo "apontar": clicar ou usar as setas durante a fórmula insere a referência (como no Excel). */
  const podeApontar = (e) => {
    if (!e || !e.texto.startsWith('=')) return false;
    if (e.aponta) return true;
    const ctxc = contextoNoCursor(e.texto.slice(1), Math.max(0, e.cursor - 1));
    return ctxc.esperaValor && !ctxc.dentroTexto && e.cursor === e.texto.length ? true : ctxc.esperaValor && !ctxc.dentroTexto;
  };
  const textoRefPara = (f, abaDoClique) => {
    const e = editRef.current;
    const pref = abaDoClique !== e.abaId ? nomeAbaNaFormula(c.abas[abaDoClique].nome) + '!' : '';
    return pref + textoFaixa(normalFaixa(f));
  };
  const apontar = (f, abaDoClique = abaId) => {
    const e = editRef.current;
    if (!e) return;
    const txt = textoRefPara(f, abaDoClique);
    const ini = e.aponta ? e.aponta.i : e.cursor;
    const fim = e.aponta ? e.aponta.f : e.cursor;
    const t = e.texto.slice(0, ini) + txt + e.texto.slice(fim);
    setEdit({ ...e, texto: t, cursor: ini + txt.length, aponta: { i: ini, f: ini + txt.length, ancora: e.aponta && e.aponta.ancora ? e.aponta.ancora : { l: f.l1, c: f.c1 }, ponta: { l: f.l2, c: f.c2 } } });
  };

  /* ---------- teclado ---------- */
  const teclaEdicao = (ev) => {
    const e = editRef.current;
    if (!e) return;
    const ctrl = ev.ctrlKey || ev.metaKey;
    if (sugest.length) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); setSelSug((s) => (s + 1) % sugest.length); return; }
      if (ev.key === 'ArrowUp') { ev.preventDefault(); setSelSug((s) => (s - 1 + sugest.length) % sugest.length); return; }
      if (ev.key === 'Tab' || (ev.key === 'Enter' && !ev.altKey && !ctrl)) { ev.preventDefault(); escolherSugestao(sugest[Math.min(selSug, sugest.length - 1)]); return; }
      if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); setSemSug(true); return; }
    }
    if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); cancelar(); return; }
    if (ev.key === 'Enter' && ev.altKey) { ev.preventDefault(); inserirNoCursor('\n'); return; }
    if (ev.key === 'Enter') { ev.preventDefault(); confirmar(ctrl ? null : [ev.shiftKey ? -1 : 1, 0], { preencherTudo: ctrl && contaCelulas(sel.faixas) > 1 }); return; }
    if (ev.key === 'Tab') { ev.preventDefault(); confirmar([0, ev.shiftKey ? -1 : 1]); return; }
    if (ev.key === 'F4' && e.texto.startsWith('=')) { ev.preventDefault(); alternarCifrao(); return; }
    if (ev.key === 'F2') { ev.preventDefault(); setEdit({ ...e, modo: e.modo === 'editar' ? 'entrar' : 'editar' }); return; }
    const setas = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (setas[ev.key] && e.modo === 'entrar') {
      const [dl, dc] = setas[ev.key];
      if (podeApontar(e)) {
        ev.preventDefault();
        const ponta = e.aponta ? e.aponta.ponta : { l: e.l, c: e.c };
        const nl = Math.max(0, Math.min(MAX_LIN - 1, ponta.l + dl)), nc = Math.max(0, Math.min(MAX_COL - 1, ponta.c + dc));
        const anc = ev.shiftKey && e.aponta ? e.aponta.ancora : { l: nl, c: nc };
        apontar({ l1: anc.l, c1: anc.c, l2: nl, c2: nc });
        if (e.aponta) editRef.current.aponta.ancora = anc;
        mostrarCelula(nl, nc);
        return;
      }
      if (!e.texto.startsWith('=')) { ev.preventDefault(); confirmar([dl, dc]); }
    }
    if (ctrl && ev.key.toLowerCase() === 'z' && e.texto === e.original) { ev.preventDefault(); cancelar(); cx.executar('editar.desfazer'); }
  };

  /** F4: troca A1 → $A$1 → A$1 → $A1 → A1 na referência onde está o cursor. */
  const alternarCifrao = () => {
    const e = editRef.current;
    const tk = tokenizar(e.texto.slice(1), 'pt');
    const pos = e.cursor - 1;
    const t = tk.find((x) => (x.t === 'ref' || x.t === 'area') && pos >= x.i && pos <= x.f) || [...tk].reverse().find((x) => (x.t === 'ref' || x.t === 'area') && x.f <= pos);
    if (!t) return;
    const ciclo = (al, ac) => (!al && !ac ? [true, true] : al && ac ? [true, false] : al && !ac ? [false, true] : [false, false]);
    const v = { ...t.v };
    if (v.t === 'ref') { const [a, b] = ciclo(v.al, v.ac); v.al = a; v.ac = b; }
    else { const [a, b] = ciclo(v.al1, v.ac1); v.al1 = a; v.ac1 = b; v.al2 = a; v.ac2 = b; }
    const novo = refTexto(v);
    const texto = '=' + e.texto.slice(1, t.i + 1) + novo + e.texto.slice(t.f + 1);
    setEdit({ ...e, texto, cursor: t.i + 1 + novo.length, aponta: null });
  };

  const teclaGrade = (ev) => {
    if (editRef.current) return;
    const ctrl = ev.ctrlKey || ev.metaKey;
    const k = ev.key;
    /* assinatura escolhida: Delete exclui, Enter edita, Esc solta; qualquer outra tecla volta para as células */
    if (objSelRef.current) {
      const o = objs.find((x) => x.id === objSelRef.current);
      if (o && (k === 'Delete' || k === 'Backspace')) { ev.preventDefault(); excluirObjeto(o); return; }
      if (o && (k === 'Enter' || k === 'F2')) { ev.preventDefault(); abrirAssinatura(o); return; }
      if (k === 'Escape') { setObjSel(null); return; }
      if (!ctrl && k.length > 1 && k !== 'Shift' && k !== 'Control' && k !== 'Alt' && k !== 'Meta') setObjSel(null);
    }
    const setas = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (setas[k]) { ev.preventDefault(); andar(setas[k][0], setas[k][1], { estender: ev.shiftKey, pular: ctrl }); return; }
    if (k === 'Tab') { ev.preventDefault(); andar(0, ev.shiftKey ? -1 : 1); return; }
    if (k === 'Enter') { ev.preventDefault(); andar(ev.shiftKey ? -1 : 1, 0); return; }
    if (k === 'PageDown' || k === 'PageUp') {
      ev.preventDefault();
      if (ctrl) { trocarAbaVizinha(k === 'PageDown' ? 1 : -1); return; }
      const n = Math.max(1, Math.floor((tam.H - G.hh) / (ALT_PADRAO * z)) - 1);
      andar(k === 'PageDown' ? n : -n, 0, { estender: ev.shiftKey });
      return;
    }
    if (k === 'Home') { ev.preventDefault(); if (ctrl) selecionar(cl, cc0); else selecionar(sel.ativa.l, cc0); return; }
    if (k === 'End' && ctrl) { ev.preventDefault(); selecionar(Math.max(0, usado.lMax), Math.max(0, usado.cMax)); return; }
    if (k === 'F2') { ev.preventDefault(); comecarEdicao({ modo: 'editar' }); return; }
    if (k === 'Delete') { ev.preventDefault(); if (somenteLeitura) avisarLeitura(); else apagar(); return; }
    if (k === 'Backspace') { ev.preventDefault(); if (somenteLeitura) avisarLeitura(); else comecarEdicao({ texto: '', modo: 'entrar' }); return; }
    if (k === 'Escape') { if (probAberto) { setProbAberto(false); return; } setCopia(null); setPincel(null); return; }
    if (k === 'F4' && !ctrl) { return; }
    if (ev.key === ' ' && ev.shiftKey && !ctrl) { ev.preventDefault(); setSel({ ativa: sel.ativa, faixas: [{ l1: faixa.l1, c1: 0, l2: faixa.l2, c2: MAX_COL - 1 }] }); return; }
    if (ev.key === ' ' && ctrl) { ev.preventDefault(); setSel({ ativa: sel.ativa, faixas: [{ l1: 0, c1: faixa.c1, l2: MAX_LIN - 1, c2: faixa.c2 }] }); return; }
    if (ev.altKey && ev.key === 'ArrowLeft') return;
    if (ctrl) {
      const kk = k.toLowerCase();
      if (kk === 'z' && !ev.shiftKey) { ev.preventDefault(); cx.executar('editar.desfazer'); return; }
      if (kk === 'y' || (kk === 'z' && ev.shiftKey)) { ev.preventDefault(); cx.executar('editar.refazer'); return; }
      if (kk === 'u' && ev.shiftKey) { ev.preventDefault(); trata('exibir.barraFormula'); return; }
      if (kk === 'a') { ev.preventDefault(); setSel({ ativa: sel.ativa, faixas: [{ l1: 0, c1: 0, l2: MAX_LIN - 1, c2: MAX_COL - 1 }] }); return; }
      if (kk === 'n' || kk === 'b') { ev.preventDefault(); trata('formatar.negrito'); return; }
      if (kk === 'i') { ev.preventDefault(); trata('formatar.italico'); return; }
      if (kk === 's' || kk === 'u') { ev.preventDefault(); trata('formatar.sublinhado'); return; }
      if (kk === 'd') { ev.preventDefault(); trata('editar.preencherBaixo'); return; }
      if (kk === 'r') { ev.preventDefault(); trata('editar.preencherDireita'); return; }
      if (kk === '1') { ev.preventDefault(); trata('formatar.formatoNumero'); return; }
      if (kk === 'l' || kk === 'f') { ev.preventDefault(); trata('editar.localizar'); return; }
      if (kk === 'g') { ev.preventDefault(); cx.executar('app.buscar'); return; }
      if (k === ';' || ev.code === 'Semicolon' || ev.code === 'Comma' && false) {
        ev.preventDefault();
        if (ev.shiftKey) inserirAgora('hora'); else inserirAgora('data');
        return;
      }
      if (k === ':' ) { ev.preventDefault(); inserirAgora('hora'); return; }
      if (ev.shiftKey && (k === '$' || ev.code === 'Digit4')) { ev.preventDefault(); trata('formatar.moeda'); return; }
      if (ev.shiftKey && (k === '%' || ev.code === 'Digit5')) { ev.preventDefault(); trata('formatar.porcentagem'); return; }
      return;
    }
    if (ev.altKey && (k === '=' || ev.code === 'Equal')) { ev.preventDefault(); trata('formula.autosoma'); return; }
  };

  const inserirAgora = (tipo) => {
    if (somenteLeitura) return;
    const v = tipo === 'data' ? serialHoje() : serialAgora() - serialHoje();
    const nf = tipo === 'data' ? 'dd/mm/yyyy' : 'hh:mm';
    if (editRef.current) { inserirNoCursor(formatar(v, nf).t); return; }
    const lote = new O.Lote(c);
    const k = chave(sel.ativa.l, sel.ativa.c);
    const atual = aba.cel[k] || {};
    const est = estiloDe(c, atual);
    const nova = { ...atual, v };
    delete nova.f;
    const s = lote.estilo({ ...est, nf: est.nf && !/^general$/i.test(est.nf) ? est.nf : nf });
    if (s) nova.s = s;
    lote.por(abaId, k, nova);
    aplicarLote(lote, tipo === 'data' ? 'Data de hoje' : 'Hora de agora');
  };

  const trocarAbaVizinha = (d) => {
    const vis = c.ordem.filter((id) => !c.abas[id].oculta);
    const i = vis.indexOf(abaId);
    const j = Math.max(0, Math.min(vis.length - 1, i + d));
    if (vis[j] !== abaId) trocarAba(vis[j]);
  };

  /* Alt+← volta para onde estava antes do "Ir para" */
  useEffect(() => {
    const f = (ev) => {
      if (ev.altKey && ev.key === 'ArrowLeft' && !editRef.current && voltar.current.length) {
        ev.preventDefault();
        const v = voltar.current.pop();
        if (v.abaId !== abaId) trocarAba(v.abaId);
        setTimeout(() => { setSelEstado(v.sel); selPorAba.current[v.abaId] = v.sel; mostrarCelula(v.sel.ativa.l, v.sel.ativa.c); }, 0);
      }
    };
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, [abaId, trocarAba, mostrarCelula]);

  /* ---------- conteúdo: apagar, colar, copiar ---------- */
  const apagar = () => {
    if (somenteLeitura) return;
    const lote = O.limparConteudo(c, abaId, sel.faixas);
    if (lote.vazio) return;
    aplicarLote(lote, `Apagar ${contaCelulas(sel.faixas) === 1 ? chave(sel.ativa.l, sel.ativa.c) : contaCelulas(sel.faixas) + ' células'}`);
  };

  const montarCopia = (recortar) => {
    if (sel.faixas.length > 1) { cx.avisar('Para copiar, selecione uma faixa só.', { ic: 'aviso' }); return null; }
    const f = normalFaixa(faixa);
    const lim = { ...f, l2: Math.min(f.l2, Math.max(f.l1, usado.lMax)), c2: Math.min(f.c2, Math.max(f.c1, usado.cMax)) };
    if ((lim.l2 - lim.l1 + 1) * (lim.c2 - lim.c1 + 1) > 200000) { cx.avisar('Seleção grande demais para copiar (mais de 200 mil células).', { ic: 'aviso' }); return null; }
    const clip = O.copiar(c, abaId, lim, motor);
    clip.marca = Math.random().toString(36).slice(2);
    clip.recortar = !!recortar;
    clipInterno = clip;
    const textos = clip.linhas.map((lin, i) => lin.map((x, j) => textoCelula(motor, c, abaId, lim.l1 + i, lim.c1 + j).t));
    const tsv = escreverTSV(textos);
    const html = '<table data-efc="' + clip.marca + '">' + clip.linhas.map((lin, i) => '<tr>' + lin.map((x, j) => {
      const f2 = x.cel && x.cel.f != null ? ' x:fmla="=' + escHTML(x.cel.f) + '"' : '';
      const e = x.estilo || {};
      const st = [e.b && 'font-weight:700', e.i && 'font-style:italic', e.cor && 'color:' + e.cor, e.fundo && 'background:' + e.fundo].filter(Boolean).join(';');
      return `<td${f2}${st ? ` style="${st}"` : ''}>${escHTML(textos[i][j])}</td>`;
    }).join('') + '</tr>').join('') + '</table>';
    setCopia(recortar || true ? lim : null);
    return { tsv, html, lim };
  };

  const colarDados = ({ html, texto, modo = 'tudo', zero = null, lembrar = false }) => {
    if (somenteLeitura) { cx.avisar('Seu perfil não permite esta ação.', { ic: 'aviso' }); return; }
    const marca = html && /data-efc="([^"]+)"/.exec(html);
    const destino = normalFaixa(faixa);
    if (clipInterno && ((marca && marca[1] === clipInterno.marca) || (!html && !texto))) {
      const { lote, area } = O.colar(c, abaId, destino.l1, destino.c1, clipInterno, { modo, recortar: clipInterno.recortar, motor, destinoFaixa: destino });
      const n = (area.l2 - area.l1 + 1) * (area.c2 - area.c1 + 1);
      aplicarLote(lote, (clipInterno.recortar ? 'Mover ' : modo === 'valores' ? 'Colar valores em ' : 'Colar ') + n + (n === 1 ? ' célula' : ' células'));
      if (clipInterno.recortar) { clipInterno = null; setCopia(null); }
      setSel({ ativa: { l: area.l1, c: area.c1 }, faixas: [area] });
      return;
    }
    /* de fora (Excel, Google Planilhas, página): tabela HTML ou texto com tabulação */
    let linhasTx = null;
    const tab = lerTabelaHTML(html);
    if (tab && tab.length) linhasTx = tab;
    else if (texto != null) linhasTx = lerTSV(texto).map((l) => l.map((t) => ({ texto: t })));
    if (!linhasTx || !linhasTx.length) return;
    const total = linhasTx.reduce((n, l) => n + l.length, 0);
    if (total > 200000) { cx.avisar('Colagem grande demais (mais de 200 mil células). Divida em partes.', { ic: 'aviso' }); return; }
    /* códigos com zero na frente (001, 0042): pergunta uma vez se ficam como texto */
    if (!zero) {
      const cods = [];
      const cols = new Set();
      linhasTx.forEach((lin, i) => lin.forEach((x, j) => {
        if (x.formula && modo !== 'valores') return;
        const col = destino.c1 + j, t = String(x.texto ?? '').trim();
        if (!/^0\d*[1-9]\d*$/.test(t) || (aba.zeros || {})[col]) return;
        const nf = estiloDe(c, aba.cel[chave(destino.l1 + i, col)]).nf;
        if (nf && !/^general$/i.test(nf)) return;
        cods.push(t); cols.add(col);
      }));
      if (cods.length) {
        setJanela({
          tipo: 'zero', codigos: cods, colunas: [...cols].sort((x, y) => x - y), colar: true,
          aoEscolher: (ec, lemb) => { setJanela(null); colarDados({ html, texto, modo, zero: ec, lembrar: lemb }); },
          aoFechar: () => setJanela(null),
        });
        return;
      }
    }
    const memoNovo = {};
    const lote = new O.Lote(c);
    let corrigidas = 0, invalidas = 0, maxC = 0;
    linhasTx.forEach((lin, i) => {
      maxC = Math.max(maxC, lin.length);
      lin.forEach((x, j) => {
        const l = destino.l1 + i, col = destino.c1 + j;
        if (l >= MAX_LIN || col >= MAX_COL) return;
        const k = chave(l, col);
        const atual = lote.pegar(abaId, k) || {};
        const est = estiloDe({ estilos: lote.estilos }, atual);
        const nova = { ...atual };
        delete nova.v; delete nova.f;
        if (x.formula && modo !== 'valores') {
          try { lerFormula(x.formula.replace(/^=/, ''), 'en'); nova.f = x.formula.replace(/^=/, ''); } catch { nova.v = x.texto; }
        } else {
          let r = lerEntrada(x.texto, est.nf || 'General');
          if (r.zeroNaFrente) {
            const esc = (aba.zeros || {})[col] || zero;
            if (esc === 't') r = { v: r.zeroNaFrente, texto: true };
            if (zero && lembrar && !(aba.zeros || {})[col]) memoNovo[col] = zero;
          }
          if (r.f != null) nova.f = r.f;
          else if (!r.vazio && !r.erro) nova.v = paraGuardarValor(r.v);
          else if (r.erro) nova.v = x.texto;
          const nfNovo = r.nf || (r.f != null ? formatoDaFormula(r.f, nfDaRef(e.abaId)) : null);
    if (nfNovo && (!est.nf || /^general$/i.test(est.nf))) { const s = lote.estilo({ ...est, nf: nfNovo }); if (s) nova.s = s; }
          if (r.aviso && /letra O/.test(r.aviso)) corrigidas++;
          if (r.aviso && /não é uma data/.test(r.aviso)) invalidas++;
        }
        lote.por(abaId, k, nova);
      });
    });
    const area = { l1: destino.l1, c1: destino.c1, l2: Math.min(MAX_LIN - 1, destino.l1 + linhasTx.length - 1), c2: Math.min(MAX_COL - 1, destino.c1 + maxC - 1) };
    if (total <= 20000) {
      const itens = [];
      for (let i = 0; i < linhasTx.length; i++) for (let j = 0; j < linhasTx[i].length; j++) {
        const x = lote.pegar(abaId, chave(destino.l1 + i, destino.c1 + j));
        if (x && typeof x.v === 'number') itens.push({ col: destino.c1 + j, v: x.v, est: estiloDe({ estilos: lote.estilos }, x) });
      }
      alargar(lote, abaId, itens);
    }
    if (Object.keys(memoNovo).length) lote.outras[`conteudo.abas.${abaId}.zeros`] = { ...(aba.zeros || {}), ...memoNovo };
    aplicarLote(lote, `Colar ${total} ${total === 1 ? 'célula' : 'células'}`);
    setSel({ ativa: { l: area.l1, c: area.c1 }, faixas: [area] });
    const avisos = [];
    if (corrigidas) avisos.push(`${corrigidas} ${corrigidas === 1 ? 'data tinha' : 'datas tinham'} a letra O no lugar do zero e ${corrigidas === 1 ? 'foi corrigida' : 'foram corrigidas'}`);
    if (invalidas) avisos.push(`${invalidas} ${invalidas === 1 ? 'data não existe e ficou' : 'datas não existem e ficaram'} como texto`);
    if (avisos.length) cx.avisar(avisos.join('; ') + '.', { ic: 'aviso' });
  };

  const aoCopiar = (ev, recortar = false) => {
    if (editRef.current) return;
    const r = montarCopia(recortar);
    if (!r) return;
    ev.preventDefault();
    ev.clipboardData.setData('text/plain', r.tsv);
    ev.clipboardData.setData('text/html', r.html);
    const n = (r.lim.l2 - r.lim.l1 + 1) * (r.lim.c2 - r.lim.c1 + 1);
    cx.avisar(`${recortar ? 'Recortado' : 'Copiado'}: ${n} ${n === 1 ? 'célula' : 'células'}. Cole com Ctrl+V (vale também no Excel).`, { ic: recortar ? 'recortar' : 'copiar' });
  };
  const aoColar = (ev) => {
    if (editRef.current) return;
    ev.preventDefault();
    colarDados({ html: ev.clipboardData.getData('text/html'), texto: ev.clipboardData.getData('text/plain') });
  };

  /* ---------- formatar ---------- */
  const formatarSel = (fn, rotulo) => {
    const lote = O.mudarEstilo(c, abaId, sel.faixas, fn);
    aplicarLote(lote, rotulo);
  };
  const alternarEstilo = (campo, rotulo) => {
    const ligado = !!estiloAtivo[campo];
    formatarSel((e) => { const n = { ...e }; if (ligado) delete n[campo]; else n[campo] = 1; return n; }, rotulo);
  };

  /* ---------- estrutura ---------- */
  const linhasSel = () => ({ i: Math.min(faixa.l1, faixa.l2), n: Math.abs(faixa.l2 - faixa.l1) + 1 });
  const colsSel = () => ({ i: Math.min(faixa.c1, faixa.c2), n: Math.abs(faixa.c2 - faixa.c1) + 1 });
  const inserirLinhas = () => { const { i, n } = linhasSel(); if (n > 5000) { cx.avisar('Selecione até 5.000 linhas para inserir.', { ic: 'aviso' }); return; } mudar(O.estrutura(c, abaId, 'l', i, n), n === 1 ? `Inserir linha ${i + 1}` : `Inserir ${n} linhas`); };
  const inserirColunas = () => { const { i, n } = colsSel(); if (n > 500) { cx.avisar('Selecione até 500 colunas para inserir.', { ic: 'aviso' }); return; } mudar(O.estrutura(c, abaId, 'c', i, n), n === 1 ? `Inserir coluna ${letraCol(i)}` : `Inserir ${n} colunas`); };
  const excluirLinhas = () => {
    const { i, n } = linhasSel();
    const antes = contarRefErros();
    if (mudar(O.estrutura(c, abaId, 'l', i, -n), n === 1 ? `Excluir linha ${i + 1}` : `Excluir ${n} linhas`)) avisarRefs(antes);
  };
  const excluirColunas = () => {
    const { i, n } = colsSel();
    const antes = contarRefErros();
    if (mudar(O.estrutura(c, abaId, 'c', i, -n), n === 1 ? `Excluir coluna ${letraCol(i)}` : `Excluir ${n} colunas`)) avisarRefs(antes);
  };
  const contarRefErros = () => { let n = 0; for (const id of c.ordem) for (const k of Object.keys(c.abas[id].cel)) { const x = c.abas[id].cel[k]; if (x.f && x.f.includes('#REF!')) n++; } return n; };
  const avisarRefs = (antes) => setTimeout(() => {
    const depois = contarRefErros();
    if (depois > antes) cx.avisar(`${depois - antes} ${depois - antes === 1 ? 'fórmula passou' : 'fórmulas passaram'} a mostrar #REF! (apontavam para o que foi excluído). Ctrl+Z desfaz.`, { ic: 'aviso' });
  }, 50);
  const ocultar = (eixoX, mostrar) => {
    const campo = eixoX === 'l' ? 'ocL' : 'ocC';
    const { i, n } = eixoX === 'l' ? linhasSel() : colsSel();
    const atual = { ...(aba[campo] || {}) };
    if (mostrar) {
      const ini = Math.max(0, i - 1), fim = i + n;
      for (const k of Object.keys(atual)) if (+k >= ini && +k <= fim) delete atual[k];
    } else for (let x = i; x < i + Math.min(n, 100000); x++) atual[x] = 1;
    mudar({ [`conteudo.abas.${abaId}.${campo}`]: atual }, (mostrar ? 'Reexibir ' : 'Ocultar ') + (eixoX === 'l' ? 'linhas' : 'colunas'));
  };

  /** Largura que cabe o maior texto da coluna (dois toques na divisa). */
  const autoAjustar = (col) => {
    const cv = document.createElement('canvas').getContext('2d');
    const familia = getComputedStyle(document.body).fontFamily;
    let max = 30;
    for (const l of cheias.porCol.get(col) || []) {
      const tx = textoCelula(motor, c, abaId, l, col);
      if (!tx.t) continue;
      cv.font = fonteCanvas(tx.e, 1, familia);
      max = Math.max(max, Math.ceil(cv.measureText(tx.t).width + 12));
    }
    mudar({ [`conteudo.abas.${abaId}.larg.${col}`]: Math.min(600, max) }, `Ajustar largura da coluna ${letraCol(col)}`);
  };

  /* ---------- AutoSoma e "pôr a conta" ---------- */
  const autoSoma = (fn = 'SOMA') => {
    if (somenteLeitura) return;
    const f = normalFaixa(faixa);
    if (f.l1 === f.l2 && f.c1 === f.c2) {
      /* célula sozinha: soma os números de cima (ou da esquerda) */
      const { l, c: col } = sel.ativa;
      const num = (ll, cc) => typeof motor.valor(abaId, ll, cc) === 'number';
      let a = l - 1;
      while (a >= 0 && !num(a, col) && a > l - 3) a--;
      let ini = a;
      while (ini - 1 >= 0 && num(ini - 1, col)) ini--;
      let txt;
      if (a >= 0 && num(a, col)) txt = `=${fn}(${textoFaixa({ l1: ini, c1: col, l2: a, c2: col })})`;
      else {
        let b = col - 1;
        while (b >= 0 && !num(l, b) && b > col - 3) b--;
        let ini2 = b;
        while (ini2 - 1 >= 0 && num(l, ini2 - 1)) ini2--;
        txt = b >= 0 && num(l, b) ? `=${fn}(${textoFaixa({ l1: l, c1: ini2, l2: l, c2: b })})` : `=${fn}()`;
      }
      comecarEdicao({ texto: txt, modo: 'entrar', cursor: txt.length - (txt.endsWith('()') ? 1 : 0) });
      return;
    }
    porConta(fn, 'baixo');
  };
  const porConta = (fn, onde) => {
    const f = normalFaixa(faixa);
    const lote = new O.Lote(c);
    const feitas = [];
    if (onde === 'baixo') {
      for (let col = f.c1; col <= Math.min(f.c2, f.c1 + 200); col++) {
        let l = Math.min(f.l2, usado.lMax) + 1;
        while (aba.cel[chave(l, col)] && (aba.cel[chave(l, col)].v !== undefined || aba.cel[chave(l, col)].f != null)) l++;
        if (l >= MAX_LIN) continue;
        const fx = paraGuardar(`${fn}(${textoFaixa({ l1: f.l1, c1: col, l2: Math.min(f.l2, usado.lMax), c2: col })})`);
        lote.por(abaId, chave(l, col), { ...(aba.cel[chave(l, col)] || {}), f: fx });
        feitas.push(chave(l, col));
      }
    } else {
      for (let l = f.l1; l <= Math.min(f.l2, f.l1 + 2000, usado.lMax); l++) {
        let col = Math.min(f.c2, usado.cMax) + 1;
        while (aba.cel[chave(l, col)] && (aba.cel[chave(l, col)].v !== undefined || aba.cel[chave(l, col)].f != null)) col++;
        if (col >= MAX_COL) continue;
        const fx = paraGuardar(`${fn}(${textoFaixa({ l1: l, c1: f.c1, l2: l, c2: Math.min(f.c2, usado.cMax) })})`);
        lote.por(abaId, chave(l, col), { ...(aba.cel[chave(l, col)] || {}), f: fx });
        feitas.push(chave(l, col));
      }
    }
    if (aplicarLote(lote, `Pôr ${fn} em ${feitas.length === 1 ? feitas[0] : feitas.length + ' células'}`)) {
      cx.avisar(`Conta posta em ${feitas.slice(0, 3).join(', ')}${feitas.length > 3 ? '…' : ''}.`, { ic: 'soma' });
      const p = lerChave(feitas[0]);
      if (p) selecionar(p.l, p.c);
    }
  };

  /* ---------- nomes ---------- */
  const darNome = () => {
    if (somenteLeitura) return;
    const f = normalFaixa(faixa);
    cx.perguntar({
      titulo: 'Dar nome', campo: `Nome para ${c.abas[abaId].nome}!${textoFaixa(f)}`, valor: '', confirmar: 'Dar nome',
      validar: (t) => validarNomeDefinido(t, c),
      aoConfirmar: (t) => { if (mudar(O.definirNome(c, t, O.refAbsoluta(c, abaId, f)), `Dar nome ${t}`)) cx.avisar(`Pronto. Agora dá para usar ${t} nas fórmulas, ex.: =SE(B2>=${t};"OK";"Ajustar").`, { ic: 'check' }); },
    });
  };
  const renomearNomeDef = (n) => cx.perguntar({
    titulo: 'Renomear nome', campo: 'Novo nome (troca em todas as fórmulas)', valor: n.n, confirmar: 'Renomear',
    validar: (t) => validarNomeDefinido(t, c, n.n),
    aoConfirmar: (t) => { if (t !== n.n) mudar(O.renomearNome(c, n.n, t), `Renomear ${n.n} para ${t}`); },
  });

  /* ---------- abas ---------- */
  const novaAbaFn = () => { const r = O.novaAba(c, abaId); if (mudar(r.mud, 'Nova aba')) setTimeout(() => trocarAba(r.id), 0); };
  const menuAba = (id, pos, direto) => {
    const a = c.abas[id];
    const renomear = () => cx.perguntar({
      titulo: 'Renomear aba', campo: 'Nome da aba', valor: a.nome, confirmar: 'Renomear', validar: (t) => validarNomeAba(t, c, id),
      aoConfirmar: (t) => { if (t !== a.nome) mudar(O.renomearAba(c, id, t), `Renomear aba ${a.nome} para ${t}`); },
    });
    if (direto === 'renomear') { renomear(); return; }
    const ocultas = c.ordem.filter((x) => c.abas[x].oculta);
    const visiveis = c.ordem.length - ocultas.length;
    setMenu({
      x: pos ? pos.x : 100, y: pos ? pos.y - 280 : 100,
      itens: somenteLeitura ? [{ nome: 'Seu perfil só permite ver', ic: 'ver', fazer: () => {}, desligado: 'Só leitura' }] : [
        { nome: 'Renomear', ic: 'renomear', fazer: renomear },
        { nome: 'Cor da aba', ic: 'cor', fazer: () => setJanela({ tipo: 'corAba', id }) },
        { nome: 'Duplicar', ic: 'dupl', fazer: () => { const r = O.duplicarAba(c, id); if (mudar(r.mud, `Duplicar aba ${a.nome}`)) setTimeout(() => trocarAba(r.id), 0); } },
        { nome: 'Mover para a esquerda', ic: 'setaEsq', fazer: () => mudar(O.moverAba(c, id, -1), 'Mover aba'), desligado: c.ordem.indexOf(id) === 0 ? 'Já é a primeira' : '' },
        { nome: 'Mover para a direita', ic: 'setaDir', fazer: () => mudar(O.moverAba(c, id, 1), 'Mover aba'), desligado: c.ordem.indexOf(id) === c.ordem.length - 1 ? 'Já é a última' : '' },
        '-',
        { nome: 'Ocultar', ic: 'ver', fazer: () => { if (mudar({ [`conteudo.abas.${id}.oculta`]: true }, `Ocultar aba ${a.nome}`)) trocarAbaVizinha(1); }, desligado: visiveis <= 1 ? 'Precisa ficar pelo menos uma aba visível' : '' },
        ...ocultas.map((x) => ({ nome: 'Reexibir ' + c.abas[x].nome, ic: 'ver', fazer: () => { mudar({ [`conteudo.abas.${x}.oculta`]: undefined }, `Reexibir aba ${c.abas[x].nome}`); setTimeout(() => trocarAba(x), 0); } })),
        '-',
        { nome: 'Excluir aba', ic: 'lixeira', perigo: true, desligado: c.ordem.length <= 1 ? 'A planilha precisa de pelo menos uma aba' : '', fazer: () => cx.perguntar({
          titulo: 'Excluir a aba?', texto: `A aba "${a.nome}" e tudo o que tem nela serão excluídos. Fórmulas de outras abas que usam esta passam a mostrar #REF!. Dá para desfazer com Ctrl+Z.`,
          confirmar: 'Excluir aba', perigo: true,
          aoConfirmar: () => { const prox = c.ordem.find((x) => x !== id && !c.abas[x].oculta) || c.ordem.find((x) => x !== id); trocarAba(prox); mudar(O.excluirAba(c, id), `Excluir aba ${a.nome}`); },
        }) },
      ],
    });
  };

  /* ---------- entender a conta (v0.4.3): consertos de um toque e fórmula montada ---------- */
  /* lista de problemas: refeita um instante depois de cada mudança (não atrapalha quem digita) */
  useEffect(() => {
    const t = setTimeout(() => { try { setListaProb(problemasDaPlanilha(motor, c, tituloDe)); } catch { setListaProb([]); } }, 250);
    return () => clearTimeout(t);
  }, [c]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Grava uma fórmula (texto com "=") numa célula; nf opcional (ex.: 0,0% da porcentagem). */
  const gravarFormula = (texto, { l = sel.ativa.l, col = sel.ativa.c, id = abaId, nf = null, rotulo } = {}) => {
    if (somenteLeitura) { avisarLeitura(); return false; }
    const probs = diagnosticar(texto.replace(/^\s*=/, ''), { nomes: nomesDefinidos, abas: nomesAbas }).filter((p) => p.nivel === 'erro');
    if (probs.length) { cx.avisar('A fórmula tem um problema: ' + probs[0].msg, { ic: 'aviso' }); return false; }
    const r = lerEntrada(texto.trim(), 'General');
    if (r.erro || r.f == null) { cx.avisar('A fórmula tem um problema: ' + (r.erro ? r.erro.message : 'não é uma conta'), { ic: 'aviso' }); return false; }
    const k = chave(l, col);
    const atual = c.abas[id].cel[k] || {};
    const est = estiloDe(c, atual);
    const lote = new O.Lote(c);
    const nova = { ...atual };
    delete nova.v;
    nova.f = r.f;
    const nfNovo = nf || formatoDaFormula(r.f, nfDaRef(id));
    if (nfNovo && (!est.nf || /^general$/i.test(est.nf))) { const s2 = lote.estilo({ ...est, nf: nfNovo }); if (s2) nova.s = s2; }
    lote.por(id, k, nova);
    return aplicarLote(lote, rotulo || `Fórmula em ${k}`);
  };

  /** Consertos que vêm do "Por que deu erro?" e da lista de problemas. */
  const fazerAcao = (a) => {
    if (a.tipo === 'ir') { setJanela(null); irPara({ abaId: a.alvo.abaId, l: a.alvo.l, c: a.alvo.c }); return true; }
    if (somenteLeitura) { avisarLeitura(); return false; }
    const id = a.alvo.abaId, k = chave(a.alvo.l, a.alvo.c);
    const atual = c.abas[id] && c.abas[id].cel[k];
    if (a.tipo === 'seerro') {
      if (!atual || atual.f == null) return false;
      const ok = mudar({ [`conteudo.abas.${id}.cel.${k}`]: { ...atual, f: `IFERROR(${atual.f},"")` } }, `SEERRO em ${k}`);
      if (ok) { setJanela(null); cx.avisar(`${k} agora mostra vazio no lugar do erro: =SEERRO(...;""). Ctrl+Z desfaz.`, { ic: 'check' }); }
      return ok;
    }
    if (a.tipo === 'converter') {
      const lote = new O.Lote(c);
      let n = 0;
      for (const x of a.celulas || [a.alvo]) {
        const kk = chave(x.l, x.c);
        const cel0 = c.abas[x.abaId] && c.abas[x.abaId].cel[kk];
        const num = cel0 && typeof cel0.v === 'string' ? lerNumeroPt(cel0.v.trim()) : null;
        if (num == null) continue;
        lote.por(x.abaId, kk, { ...cel0, v: num });
        n++;
      }
      const ok = aplicarLote(lote, `Converter ${n} ${n === 1 ? 'texto' : 'textos'} em número`);
      if (ok) { setJanela(null); cx.avisar(`${n} ${n === 1 ? 'célula virou número' : 'células viraram número'}. As contas já contam ${n === 1 ? 'ela' : 'elas'}.`, { ic: 'check' }); }
      return ok;
    }
    if (a.tipo === 'igualar') {
      if (!atual) return false;
      return mudar({ [`conteudo.abas.${id}.cel.${k}`]: { ...atual, f: a.formula } }, `Igualar ${k} às vizinhas`);
    }
    if (a.tipo === 'nomearNumero') {
      cx.perguntar({
        titulo: 'Dar nome ao número', texto: `O ${numeroGeral(a.v)} vira um nome nas ${a.celulas.length === 1 ? 'fórmula' : a.celulas.length + ' fórmulas'}. Quando o valor mudar, troque uma vez só em Fórmulas › Nomes e todas as contas acompanham.`,
        campo: 'Nome (sem espaço, ex.: Fator_Ajuste)', valor: 'Fator', confirmar: 'Dar nome', validar: (t) => validarNomeDefinido(t, c),
        aoConfirmar: (t) => {
          const lote = new O.Lote(c);
          for (const x of a.celulas) {
            const kk = chave(x.l, x.c);
            const cel0 = c.abas[x.abaId] && c.abas[x.abaId].cel[kk];
            if (cel0 && cel0.f != null) lote.por(x.abaId, kk, { ...cel0, f: trocarNumeroPorNome(cel0.f, a.v, t) });
          }
          if (mudar({ ...lote.mudancas(), ...O.definirNome(c, t, escrever({ t: 'num', v: a.v }, 'en')) }, `Dar o nome ${t} ao número ${numeroGeral(a.v)}`)) cx.avisar(`Pronto: ${t} vale ${numeroGeral(a.v)}. Para mudar, Fórmulas › Nomes.`, { ic: 'check' });
        },
      });
      return true;
    }
    return false;
  };

  /** Colunas com título de todas as abas (para as receitas do "Montar a conta"). */
  const colunasComTitulo = () => {
    const out = [];
    for (const id of c.ordem) {
      const a = c.abas[id];
      if (a.oculta) continue;
      const cab = linhaCabecalho(a, motor, id);
      if (cab < 0) continue;
      const pref = id !== abaId ? nomeAbaNaFormula(a.nome) + '!' : '';
      const cols = [];
      for (const k of Object.keys(a.cel)) { const p = lerChave(k); if (p && p.l === cab) cols.push(p.c); }
      cols.sort((x, y) => x - y);
      for (const col of cols) {
        const t = motor.valor(id, cab, col);
        if (typeof t !== 'string' || !t.trim()) continue;
        out.push({ id: id + '|' + col, rotulo: `${t.trim()} (${letraCol(col)})${id !== abaId ? ' · ' + a.nome : ''}`, faixa: `${pref}${letraCol(col)}${cab + 2}:${letraCol(col)}${MAX_LIN}` }); /* a coluna inteira, não só até a linha 200 */
      }
    }
    return out;
  };

  /** Exemplos tirados da própria planilha (colunas e valores de verdade) para as receitas do Montar a conta. */
  const amostrasDaPlanilha = () => {
    const out = {};
    const cab = linhaCabecalho(aba, motor, abaId);
    if (cab < 0) return out;
    const cols = [];
    for (const k of Object.keys(aba.cel)) { const p = lerChave(k); if (p && p.l === cab) cols.push(p.c); }
    cols.sort((x, y) => x - y);
    const textos = [];
    const titulos = [];
    for (const col of cols) {
      const t = motor.valor(abaId, cab, col);
      if (typeof t !== 'string' || !t.trim()) continue;
      const titulo = t.trim();
      const vals = [];
      for (let l = cab + 1; l <= Math.min(cab + 60, usado.lMax); l++) { const v = motor.valor(abaId, l, col); if (v != null && v !== '') vals.push({ v, l }); }
      if (!vals.length) continue;
      titulos.push(titulo);
      const nums = vals.filter((x) => typeof x.v === 'number');
      if (nums.length >= vals.length * 0.8) {
        const nf = estiloDe(c, aba.cel[chave(vals[0].l, col)]).nf;
        if (nf && ehFormatoData(nf)) { if (!out.data) out.data = { titulo }; } else if (!out.numero) out.numero = { titulo };
      } else {
        const strs = vals.filter((x) => typeof x.v === 'string').map((x) => x.v.trim()).filter(Boolean);
        if (strs.length) textos.push({ titulo, valores: strs, distintos: new Set(strs) });
      }
    }
    const categoria = textos.find((t) => t.distintos.size < t.valores.length);
    const chaveCol = textos.find((t) => t.distintos.size === t.valores.length) || textos[0];
    if (categoria) {
      const cont = new Map();
      for (const v of categoria.valores) cont.set(v, (cont.get(v) || 0) + 1);
      out.texto = { titulo: categoria.titulo, valor: [...cont.entries()].sort((a, b) => b[1] - a[1])[0][0] };
    } else if (chaveCol) out.texto = { titulo: chaveCol.titulo, valor: chaveCol.valores[0] };
    if (chaveCol) out.chave = { titulo: chaveCol.titulo, valor: chaveCol.valores[0] };
    const outra = titulos.find((t) => !out.chave || t !== out.chave.titulo);
    if (outra) out.outra = { titulo: outra };
    return out;
  };
  /** Valor de uma célula escrita como B2 ou Aba!B2 (null se vazia; undefined se o endereço não existe). */
  const valorDoEndereco = (t) => {
    const e = lerEndereco(t);
    if (!e) return undefined;
    const id = e.aba ? c.ordem.find((x) => c.abas[x].nome.toLowerCase() === String(e.aba).toLowerCase()) : abaId;
    if (!id) return undefined;
    const v = motor.valor(id, e.l1, e.c1);
    return v == null ? null : v;
  };

  /** N04: botão direito no cabeçalho (A, B, 1, 2...): seleciona e oferece inserir, excluir, ocultar, largura. */
  const abrirMenuCabecalho = (x, y, o) => {
    const ehCol = o.tipo === 'col';
    const f = normalFaixa(faixa);
    const inteira = ehCol ? f.l1 === 0 && f.l2 === MAX_LIN - 1 : f.c1 === 0 && f.c2 === MAX_COL - 1;
    const dentro = ehCol ? o.c >= f.c1 && o.c <= f.c2 : o.l >= f.l1 && o.l <= f.l2;
    const i = inteira && dentro ? (ehCol ? f.c1 : f.l1) : (ehCol ? o.c : o.l);
    const n = inteira && dentro ? (ehCol ? f.c2 - f.c1 + 1 : f.l2 - f.l1 + 1) : 1;
    if (!(inteira && dentro)) {
      setSel(ehCol
        ? { ativa: { l: Math.max(cl, G.l0), c: o.c }, faixas: [{ l1: 0, l2: MAX_LIN - 1, c1: o.c, c2: o.c }] }
        : { ativa: { l: o.l, c: Math.max(cc0, G.c0) }, faixas: [{ c1: 0, c2: MAX_COL - 1, l1: o.l, l2: o.l }] });
    }
    const eixoX = ehCol ? 'c' : 'l';
    const nome = (k) => (ehCol ? letraCol(k) : String(k + 1));
    const quais = n === 1 ? (ehCol ? `coluna ${nome(i)}` : `linha ${nome(i)}`) : (ehCol ? `${n} colunas` : `${n} linhas`);
    const plural = n === 1 ? '' : 's';
    const inserir = (onde) => {
      if (n > (ehCol ? 500 : 5000)) { cx.avisar(`Selecione até ${ehCol ? 500 : 5000} ${ehCol ? 'colunas' : 'linhas'} para inserir.`, { ic: 'aviso' }); return; }
      const em = onde === 'antes' ? i : i + n;
      mudar(O.estrutura(c, abaId, eixoX, em, n), `Inserir ${n === 1 ? (ehCol ? 'coluna ' + nome(em) : 'linha ' + nome(em)) : n + (ehCol ? ' colunas' : ' linhas')}`);
    };
    const excluir = () => { const antes = contarRefErros(); if (mudar(O.estrutura(c, abaId, eixoX, i, -n), `Excluir ${quais}`)) avisarRefs(antes); };
    const mapa = ehCol ? 'ocC' : 'ocL';
    const ocultas = Object.keys(aba[mapa] || {}).map(Number);
    const reexibir = () => {
      const atual = { ...(aba[mapa] || {}) };
      for (const k of Object.keys(atual)) if (+k >= i - 1 && +k <= i + n) delete atual[k];
      mudar({ [`conteudo.abas.${abaId}.${mapa}`]: atual }, ehCol ? 'Reexibir colunas' : 'Reexibir linhas');
    };
    const ocultarEssas = () => { const atual = { ...(aba[mapa] || {}) }; for (let k = i; k < i + Math.min(n, 100000); k++) atual[k] = 1; mudar({ [`conteudo.abas.${abaId}.${mapa}`]: atual }, `Ocultar ${quais}`); };
    const tamanho = () => cx.perguntar({
      titulo: ehCol ? `Largura da ${quais}` : `Altura da ${quais}`, campo: ehCol ? 'Largura em pixels (padrão 80)' : 'Altura em pixels (padrão 22)',
      valor: String(ehCol ? colunas.tam(i) || LARG_PADRAO : linhas.tam(i) || ALT_PADRAO), confirmar: 'Aplicar', modo: 'numeric',
      validar: (t) => (/^\d{1,3}$/.test(t.trim()) && +t >= (ehCol ? 4 : 6) && +t <= (ehCol ? 600 : 400) ? '' : (ehCol ? 'Use um número de 4 a 600.' : 'Use um número de 6 a 400.')),
      aoConfirmar: (t) => {
        const mud = {};
        for (let k = i; k < i + Math.min(n, 2000); k++) mud[`conteudo.abas.${abaId}.${ehCol ? 'larg' : 'alt'}.${k}`] = +t;
        mudar(mud, `${ehCol ? 'Largura' : 'Altura'} da ${quais}`);
      },
    });
    const ajustar = () => {
      if (ehCol) { for (let k = i; k < i + Math.min(n, 60); k++) autoAjustar(k); return; }
      const mud = {};
      for (let k = i; k < i + Math.min(n, 2000); k++) mud[`conteudo.abas.${abaId}.alt.${k}`] = undefined;
      mudar(mud, `Altura padrão da ${quais}`);
    };
    const ro = somenteLeitura;
    setMenu({
      x, y,
      itens: ro ? [
        { nome: 'Copiar', ic: 'copiar', atalho: 'Ctrl+C', fazer: () => copiarPorBotao(false) },
        { nome: 'Seu perfil só permite ver', ic: 'ver', fazer: () => {}, desligado: 'Só leitura' },
      ] : [
        { nome: ehCol ? `Inserir ${n === 1 ? 'coluna' : n + ' colunas'} antes (à esquerda)` : `Inserir ${n === 1 ? 'linha' : n + ' linhas'} antes (acima)`, ic: 'inserir', fazer: () => inserir('antes') },
        { nome: ehCol ? `Inserir ${n === 1 ? 'coluna' : n + ' colunas'} depois (à direita)` : `Inserir ${n === 1 ? 'linha' : n + ' linhas'} depois (abaixo)`, ic: 'inserir', fazer: () => inserir('depois') },
        { nome: `Excluir ${quais}`, ic: 'lixeira', perigo: true, fazer: excluir },
        '-',
        { nome: `Ocultar ${quais}`, ic: 'ver', fazer: ocultarEssas },
        { nome: ehCol ? 'Reexibir colunas' : 'Reexibir linhas', ic: 'ver', fazer: reexibir, desligado: ocultas.some((k) => k >= i - 1 && k <= i + n) ? '' : `Nenhuma ${ehCol ? 'coluna' : 'linha'} oculta ao lado. Selecione as ${ehCol ? 'colunas' : 'linhas'} dos dois lados da escondida.` },
        '-',
        ...(ehCol && n === 1 ? [{
          nome: (aba.zeros || {})[i] ? `Zeros à esquerda: perguntar de novo (hoje: ${aba.zeros[i] === 't' ? 'texto' : 'número'})` : 'Zeros à esquerda: sempre texto nesta coluna', ic: 'renomear',
          fazer: () => {
            const z = { ...(aba.zeros || {}) };
            if (z[i]) delete z[i]; else z[i] = 't';
            mudar({ [`conteudo.abas.${abaId}.zeros`]: Object.keys(z).length ? z : undefined }, z[i] ? `Coluna ${letraCol(i)}: zeros à esquerda como texto` : `Coluna ${letraCol(i)}: perguntar sobre zeros à esquerda`);
          },
        }] : []),
        { nome: ehCol ? `Largura da${plural ? 's' : ''} coluna${plural}...` : `Altura da${plural ? 's' : ''} linha${plural}...`, ic: ehCol ? 'setaDir' : 'setaBaixo', fazer: tamanho },
        { nome: ehCol ? 'Ajustar à largura do texto' : 'Voltar à altura padrão', ic: 'ajustar', fazer: ajustar },
        '-',
        { nome: 'Copiar', ic: 'copiar', atalho: 'Ctrl+C', fazer: () => setTimeout(() => copiarPorBotao(false), 0) },
        { nome: 'Limpar conteúdo', ic: 'x', atalho: 'Delete', fazer: () => setTimeout(apagar, 0) },
      ],
    });
  };

  /* ---------- comandos da faixa ---------- */
  const trata = (id) => {
    const ed = (fn) => { if (somenteLeitura) { cx.avisar('Seu perfil não permite esta ação.', { ic: 'aviso' }); return true; } fn(); return true; };
    switch (id) {
      case 'formatar.negrito': return ed(() => alternarEstilo('b', 'Negrito'));
      case 'formatar.italico': return ed(() => alternarEstilo('i', 'Itálico'));
      case 'formatar.sublinhado': return ed(() => alternarEstilo('u', 'Sublinhado'));
      case 'formatar.corFonte': return ed(() => setJanela({ tipo: 'corFonte' }));
      case 'formatar.preenchimento': return ed(() => setJanela({ tipo: 'fundo' }));
      case 'formatar.bordas': return ed(() => abrirMenuBordas());
      case 'formatar.esquerda': return ed(() => formatarSel((e) => ({ ...e, al: e.al === 'e' ? undefined : 'e' }), 'Alinhar à esquerda'));
      case 'formatar.centro': return ed(() => formatarSel((e) => ({ ...e, al: e.al === 'c' ? undefined : 'c' }), 'Centralizar'));
      case 'formatar.direita': return ed(() => formatarSel((e) => ({ ...e, al: e.al === 'd' ? undefined : 'd' }), 'Alinhar à direita'));
      case 'formatar.quebrar': return ed(() => alternarEstilo('qb', 'Quebrar texto'));
      case 'formatar.mesclar': return ed(() => alternarMescla());
      case 'formatar.moeda': return ed(() => formatarSel((e) => ({ ...e, nf: FORMATO_MOEDA }), 'Formato moeda'));
      case 'formatar.porcentagem': return ed(() => formatarSel((e) => ({ ...e, nf: FORMATO_PCT }), 'Formato porcentagem'));
      case 'formatar.milhar': return ed(() => formatarSel((e) => ({ ...e, nf: '#,##0.00' }), 'Separador de milhares'));
      case 'formatar.maisCasas': return ed(() => formatarSel((e) => ({ ...e, nf: mudarCasas(e.nf || 'General', 1, motor.valor(abaId, sel.ativa.l, sel.ativa.c)) }), 'Mais casas decimais'));
      case 'formatar.menosCasas': return ed(() => formatarSel((e) => ({ ...e, nf: mudarCasas(e.nf || 'General', -1, motor.valor(abaId, sel.ativa.l, sel.ativa.c)) }), 'Menos casas decimais'));
      case 'formatar.formatoNumero': return ed(() => setJanela({ tipo: 'formato' }));
      case 'formatar.fonte': return ed(() => setJanela({ tipo: 'fonte' }));
      case 'formatar.limpar': return ed(() => aplicarLote(O.limparFormatos(c, abaId, sel.faixas), 'Limpar formatos'));
      case 'editar.copiar': copiarPorBotao(false); return true;
      case 'editar.recortar': return ed(() => copiarPorBotao(true));
      case 'editar.colar': return ed(() => colarPorBotao('tudo'));
      case 'editar.colarValores': return ed(() => colarPorBotao('valores'));
      case 'editar.pincel': return ed(() => { setPincel(estiloAtivo); cx.avisar('Toque na célula ou arraste na faixa que vai receber o formato.', { ic: 'pincel' }); });
      case 'editar.localizar': setJanela({ tipo: 'localizar' }); return true;
      case 'editar.selecionarTudo': setSel({ ativa: sel.ativa, faixas: [{ l1: 0, c1: 0, l2: MAX_LIN - 1, c2: MAX_COL - 1 }] }); return true;
      case 'editar.preencherBaixo': return ed(() => {
        const f = normalFaixa(faixa);
        if (f.l1 === f.l2) { if (f.l1 === 0) return; aplicarLote(O.preencher(c, abaId, { ...f, l1: f.l1 - 1, l2: f.l1 - 1 }, f, 'b', motor), 'Preencher para baixo'); return; }
        aplicarLote(O.preencher(c, abaId, { ...f, l2: f.l1 }, { ...f, l1: f.l1 + 1 }, 'b', motor), 'Preencher para baixo');
      });
      case 'editar.preencherDireita': return ed(() => {
        const f = normalFaixa(faixa);
        if (f.c1 === f.c2) { if (f.c1 === 0) return; aplicarLote(O.preencher(c, abaId, { ...f, c1: f.c1 - 1, c2: f.c1 - 1 }, f, 'd', motor), 'Preencher para a direita'); return; }
        aplicarLote(O.preencher(c, abaId, { ...f, c2: f.c1 }, { ...f, c1: f.c1 + 1 }, 'd', motor), 'Preencher para a direita');
      });
      case 'planilha.limparConteudo': return ed(apagar);
      case 'planilha.inserirLinha': return ed(inserirLinhas);
      case 'planilha.inserirColuna': return ed(inserirColunas);
      case 'planilha.excluirLinha': return ed(excluirLinhas);
      case 'planilha.excluirColuna': return ed(excluirColunas);
      case 'planilha.ocultarLinha': return ed(() => ocultar('l', false));
      case 'planilha.ocultarColuna': return ed(() => ocultar('c', false));
      case 'planilha.reexibir': return ed(() => { ocultar('l', true); });
      case 'planilha.reexibirColuna': return ed(() => { ocultar('c', true); });
      case 'planilha.novaAba': return ed(novaAbaFn);
      case 'inserir.assinatura': return ed(() => setAsn({ id: null, inicial: {} }));
      case 'planilha.cabecalho': return ed(() => mudar({ [`conteudo.abas.${abaId}.cab`]: sel.ativa.l }, `Linha ${sel.ativa.l + 1} é o cabeçalho`));
      case 'formula.inserir': return ed(() => setJanela({ tipo: 'funcoes' }));
      case 'formula.autosoma': return ed(() => autoSoma('SOMA'));
      case 'formula.origem': setJanela({ tipo: 'origem' }); return true;
      case 'formula.explicar': setJanela({ tipo: 'explicar' }); return true;
      case 'formula.fluxo': setJanela({ tipo: 'fluxo' }); return true;
      case 'formula.problemas': setProbAberto((x) => !x); return true;
      case 'formula.montar': return ed(() => setJanela({ tipo: 'montar' }));
      case 'formula.nome': return ed(darNome);
      case 'formula.nomes': setJanela({ tipo: 'nomes' }); return true;
      case 'exibir.congelar': setJanela({ tipo: 'congelar' }); return true;
      case 'exibir.grade': mudar({ [`conteudo.abas.${abaId}.semGrade`]: aba.semGrade ? undefined : 1 }, aba.semGrade ? 'Mostrar linhas de grade' : 'Esconder linhas de grade'); return true;
      case 'exibir.folhaClara': setPrefs((p) => ({ ...p, folhaClara: !p.folhaClara })); cx.avisar(prefs.folhaClara ? 'A grade volta a seguir o tema.' : 'Folha clara: a grade fica branca neste aparelho.', { ic: 'tema' }); return true;
      case 'exibir.zoom': setJanela({ tipo: 'zoom' }); return true;
      case 'exibir.barraFormula': alternarFx(); return true;
      default: return false;
    }
  };
  const ligado = (id) => {
    switch (id) {
      case 'formatar.negrito': return !!estiloAtivo.b;
      case 'formatar.italico': return !!estiloAtivo.i;
      case 'formatar.sublinhado': return !!estiloAtivo.u;
      case 'formatar.esquerda': return estiloAtivo.al === 'e';
      case 'formatar.centro': return estiloAtivo.al === 'c';
      case 'formatar.direita': return estiloAtivo.al === 'd';
      case 'formatar.quebrar': return !!estiloAtivo.qb;
      case 'formatar.mesclar': return !!mesclaEm(mesc, sel.ativa.l, sel.ativa.c);
      case 'formatar.moeda': return (estiloAtivo.nf || '').includes('R$');
      case 'formatar.porcentagem': return (estiloAtivo.nf || '').includes('%');
      case 'exibir.grade': return !aba.semGrade;
      case 'exibir.folhaClara': return !!prefs.folhaClara;
      case 'exibir.barraFormula': return fxAltura > FX_MIN + 2;
      case 'exibir.congelar': return !!(cong && (cong.l || cong.c));
      case 'editar.pincel': return !!pincel;
      case 'formula.problemas': return probAberto;
      default: return false;
    }
  };

  const alternarMescla = () => {
    const f = normalFaixa(faixa);
    const m = mesclaEm(mesc, sel.ativa.l, sel.ativa.c);
    if (m && f.l1 === m.l1 && f.c1 === m.c1 && f.l2 === m.l2 && f.c2 === m.c2) { mudar(O.desmesclar(c, abaId, f), 'Desfazer mesclagem'); return; }
    if (f.l1 === f.l2 && f.c1 === f.c2) { if (m) mudar(O.desmesclar(c, abaId, m), 'Desfazer mesclagem'); else cx.avisar('Selecione duas ou mais células para mesclar.', { ic: 'info' }); return; }
    if ((f.l2 - f.l1 + 1) * (f.c2 - f.c1 + 1) > 10000) { cx.avisar('Faixa grande demais para mesclar.', { ic: 'aviso' }); return; }
    const fazer = () => aplicarLote(O.mesclar(c, abaId, f), 'Mesclar e centralizar');
    if (O.perdeValoresAoMesclar(c, abaId, f)) {
      cx.perguntar({ titulo: 'Mesclar células?', texto: 'Só o valor da primeira célula (em cima, à esquerda) fica. Os outros valores serão apagados (dá para desfazer).', confirmar: 'Mesclar', aoConfirmar: fazer });
    } else fazer();
  };

  const abrirMenuBordas = () => {
    const b = document.querySelector('[data-cmd="formatar.bordas"]');
    const r = b ? b.getBoundingClientRect() : { left: 200, bottom: 150 };
    const op = (nome, tipo) => ({ nome, ic: 'borda', fazer: () => aplicarLote(O.aplicarBordas(c, abaId, sel.faixas, tipo), 'Bordas: ' + nome.toLowerCase()) });
    setMenu({ x: r.left, y: r.bottom + 4, itens: [op('Todas as bordas', 'todas'), op('Contorno', 'contorno'), op('Contorno grosso', 'grossa'), op('Embaixo', 'baixo'), op('Em cima', 'cima'), op('À esquerda', 'esq'), op('À direita', 'dir'), '-', op('Sem bordas', 'nenhuma')] });
  };

  const copiarPorBotao = async (recortar) => {
    const r = montarCopia(recortar);
    if (!r) return;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([r.tsv], { type: 'text/plain' }), 'text/html': new Blob([r.html], { type: 'text/html' }) })]);
      } else if (navigator.clipboard) await navigator.clipboard.writeText(r.tsv);
    } catch { /* fica só a cópia interna */ }
    cx.avisar(recortar ? 'Recortado. Escolha o destino e cole.' : 'Copiado. Cole aqui ou no Excel.', { ic: recortar ? 'recortar' : 'copiar' });
  };
  const colarPorBotao = async (modo) => {
    if (clipInterno) { colarDados({ modo }); return; }
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const itens = await navigator.clipboard.read();
        for (const it of itens) {
          const html = it.types.includes('text/html') ? await (await it.getType('text/html')).text() : '';
          const texto = it.types.includes('text/plain') ? await (await it.getType('text/plain')).text() : '';
          colarDados({ html, texto, modo });
          return;
        }
      }
      if (navigator.clipboard && navigator.clipboard.readText) { colarDados({ texto: await navigator.clipboard.readText(), modo }); return; }
    } catch { /* sem permissão */ }
    cx.avisar('O navegador não deixou ler a área de transferência. Use Ctrl+V (ou segure na célula e escolha Colar).', { ic: 'info' });
  };

  /* ---------- registro no app (faixa, busca Ctrl+K, status) ---------- */
  const buscar = (q) => {
    const t = String(q || '').trim();
    if (!t) return [];
    const out = [];
    const end = lerEndereco(t);
    if (end) {
      const id = end.aba ? c.ordem.find((x) => c.abas[x].nome.toLowerCase() === end.aba.toLowerCase()) : abaId;
      if (id) out.push({ id: 'ir', nome: `Ir para ${end.aba ? c.abas[id].nome + '!' : ''}${textoFaixa(end)}`, ic: 'busca', dir: 'célula', fazer: () => irPara({ abaId: id, ...end }) });
    }
    const sem = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const qn = sem(t);
    for (const n of Object.values(c.nomes || {})) {
      if (!sem(n.n).includes(qn)) continue;
      const r = motor.refDeTexto(n.n, abaId);
      out.push({ id: 'nome' + n.n, nome: `${n.n} → ${paraMostrar(n.ref)}`, ic: 'renomear', dir: 'nome', fazer: () => r && irPara({ abaId: r.abaId, l1: r.l1, c1: r.c1, l2: r.l2, c2: r.c2 }) });
    }
    for (const id of c.ordem) {
      const a = c.abas[id];
      if (sem(a.nome).includes(qn)) out.push({ id: 'aba' + id, nome: `Aba ${a.nome}`, ic: 'planilha', dir: 'aba', fazer: () => trocarAba(id) });
      const cab = linhaCabecalho(a, motor, id);
      if (cab < 0) continue;
      const idx = id === abaId ? cheias : indiceCheias(a);
      for (const col of idx.porLin.get(cab) || []) {
        const v = motor.valor(id, cab, col);
        if (typeof v === 'string' && sem(v).includes(qn)) out.push({ id: 'col' + id + col, nome: `Coluna ${v} (${letraCol(col)}) · ${a.nome}`, ic: 'planilha', dir: 'coluna', fazer: () => irPara({ abaId: id, l: cab + 1, c: col }) });
      }
    }
    return out.slice(0, 8);
  };

  const maos = useRef({});
  maos.current = { trata, ligado, buscar };
  useEffect(() => {
    cx.registrarEditor({ trata: (id) => maos.current.trata(id), ligado: (id) => maos.current.ligado(id), buscar: (q) => maos.current.buscar(q) });
    return () => cx.registrarEditor(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* status: soma, média e contagem da seleção (PL06) */
  const calc = useMemo(() => {
    let soma = 0, n = 0, cont = 0, min = Infinity, max = -Infinity, celulas = 0;
    for (const f0 of sel.faixas) {
      const f = normalFaixa(f0);
      celulas += (f.l2 - f.l1 + 1) * (f.c2 - f.c1 + 1);
      const lim = { ...f, l2: Math.min(f.l2, usado.lMax), c2: Math.min(f.c2, usado.cMax) };
      if (lim.l2 < lim.l1 || lim.c2 < lim.c1) continue;
      const area = (lim.l2 - lim.l1 + 1) * (lim.c2 - lim.c1 + 1);
      const visitar = (l, col) => {
        const v = motor.valor(abaId, l, col);
        if (v == null || v === '') return;
        cont++;
        if (typeof v === 'number') { soma += v; n++; if (v < min) min = v; if (v > max) max = v; }
      };
      if (area <= 60000) { for (let l = lim.l1; l <= lim.l2; l++) for (let col = lim.c1; col <= lim.c2; col++) visitar(l, col); }
      else for (const [l, col] of O.existentes(aba, lim)) visitar(l, col);
    }
    if (celulas < 2 || cont < 2) return null;
    return { soma: n ? soma : 0, media: n ? soma / n : null, cont, contNum: n, min: n ? min : null, max: n ? max : null };
  }, [sel, motor, c, abaId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const nfAtivo = estiloAtivo.nf;
    cx.setStatus({
      planilha: {
        calc, mostrar: prefs.status, faixa: normalFaixa(faixa), somenteLeitura,
        formatar: (v) => formatar(v, nfAtivo && !/%/.test(nfAtivo) ? nfAtivo : 'General').t,
        semLugar: faixa.l1 !== faixa.l2 && faixa.c1 !== faixa.c2 && false,
        dica: edit ? (ehFormula ? 'Digitando fórmula: clique nas células ou use as setas para apontar' : 'Digitando') : null,
        acoes: {
          copiar: (t) => { try { navigator.clipboard.writeText(t); cx.avisar(`Copiado: ${t}`, { ic: 'copiar' }); } catch { cx.avisar(t, { ic: 'info' }); } },
          porConta: (fn, onde) => porConta(fn, onde),
          alternar: (k) => setPrefs((p) => ({ ...p, status: p.status.includes(k) ? p.status.filter((x) => x !== k) : [...p.status, k].sort((a, b) => ESTATS.findIndex(([x]) => x === a) - ESTATS.findIndex(([x]) => x === b)) })),
        },
      },
      zoom: z,
    });
  }, [calc, prefs.status, faixa, z, edit && !!edit, ehFormula, estiloAtivo.nf, c]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- desenho ---------- */
  const familia = useMemo(() => (typeof document !== 'undefined' ? getComputedStyle(document.body).fontFamily : 'sans-serif'), []);
  useLayoutEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(tam.W * dpr) || cv.height !== Math.round(tam.H * dpr)) {
      cv.width = Math.round(tam.W * dpr); cv.height = Math.round(tam.H * dpr);
      cv.style.width = tam.W + 'px'; cv.style.height = tam.H + 'px';
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const spill = motor.areaDerramada(abaId, sel.ativa.l, sel.ativa.c);
    desenhar({
      ctx, c, motor, abaId, G, cores, familia, grade: !aba.semGrade, mesclas: mesc,
      sel: edit && edit.abaId === abaId && ehFormula ? null : sel, refsFormula: refsDaFormula,
      copia: copia && !edit ? copia : null, spill, celular: cel, editando: !!edit, somenteLeitura,
      destino: arrasto && arrasto.tipo === 'alca' ? arrasto.destino : null,
    });
  });

  /* ---------- toque e mouse na grade ---------- */
  const ponto = (ev) => { const r = cvRef.current.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  const pertoDaAlca = (p) => {
    if (cel || somenteLeitura) return false;
    const x = G.xDe(faixa.c2 + 1 > faixa.c1 ? Math.max(faixa.c1, faixa.c2) + 1 : faixa.c1 + 1), y = G.yDe(Math.max(faixa.l1, faixa.l2) + 1);
    return Math.abs(p.x - x) <= 6 && Math.abs(p.y - y) <= 6;
  };

  const aoBaixar = (ev) => {
    if (!cvRef.current) return;
    if (objSelRef.current) setObjSel(null);
    const p = ponto(ev);
    const o = ondeCaiu(G, p.x, p.y);
    const toqueDedo = ev.pointerType === 'touch';
    if (toqueDedo) {
      /* no dedo: decide no soltar (para não atrapalhar a rolagem) */
      toque.current = { p, o, t: Date.now(), id: ev.pointerId, longo: setTimeout(() => { toque.current = null; abrirMenuCelula(ev.clientX, ev.clientY, o); }, 550) };
      return;
    }
    /* o pointerdown não traz o número de cliques: conta aqui (dois cliques em até 400 ms no mesmo lugar) */
    const agora = Date.now();
    const u = ultimoClique.current;
    const detalhe = u && agora - u.t < 400 && Math.abs(u.x - p.x) < 6 && Math.abs(u.y - p.y) < 6 ? 2 : 1;
    ultimoClique.current = detalhe === 2 ? null : { t: agora, x: p.x, y: p.y };
    if (ev.button === 2) {
      if (o.tipo === 'col' || o.tipo === 'lin') return; /* o menu do cabeçalho seleciona a coluna/linha */
      if (o.tipo === 'cel' && !sel.faixas.some((f) => O.normalFaixa(f).l1 <= o.l && o.l <= O.normalFaixa(f).l2 && O.normalFaixa(f).c1 <= o.c && o.c <= O.normalFaixa(f).c2)) selecionar(o.l, o.c, { semRolar: true });
      return;
    }
    const e = editRef.current;
    if (e && o.tipo === 'cel' && podeApontar(e)) {
      ev.preventDefault();
      const f = { l1: o.l, c1: o.c, l2: o.l, c2: o.c };
      const pre = e.aponta && !ev.ctrlKey ? e : { ...e, aponta: null };
      editRef.current = pre;
      apontar(f);
      setArrasto({ tipo: 'apontar', ancora: { l: o.l, c: o.c } });
      try { cvRef.current.setPointerCapture(ev.pointerId); } catch { /* sem captura */ }
      return;
    }
    if (e) { if (!confirmar(null)) return; }
    if (o.tipo === 'cel') {
      if (pertoDaAlca(p)) {
        ev.preventDefault();
        if (detalhe === 2) { preencherAteOFim(); return; }
        setArrasto({ tipo: 'alca', origem: normalFaixa(faixa), destino: null });
        try { cvRef.current.setPointerCapture(ev.pointerId); } catch { /* sem captura */ }
        return;
      }
      if (detalhe === 2 && !ev.shiftKey) { comecarEdicao({ modo: 'editar', l: o.l, col: o.c }); return; }
      if (ev.shiftKey) selecionar(o.l, o.c, { estender: true, semRolar: true });
      else selecionar(o.l, o.c, { adicionar: ev.ctrlKey || ev.metaKey, semRolar: true });
      setArrasto({ tipo: 'sel', ancora: ev.shiftKey ? sel.ativa : { l: o.l, c: o.c } });
      try { cvRef.current.setPointerCapture(ev.pointerId); } catch { /* sem captura */ }
    } else if (o.tipo === 'col') {
      const f = { l1: 0, l2: MAX_LIN - 1, c1: ev.shiftKey ? sel.ativa.c : o.c, c2: o.c };
      setSel({ ativa: { l: ev.shiftKey ? sel.ativa.l : Math.max(cl, G.l0), c: ev.shiftKey ? sel.ativa.c : o.c }, faixas: [...(ev.ctrlKey ? sel.faixas : []), normalFaixa(f)] });
      setArrasto({ tipo: 'cols', ancora: o.c });
      try { cvRef.current.setPointerCapture(ev.pointerId); } catch { /* sem captura */ }
    } else if (o.tipo === 'lin') {
      const f = { c1: 0, c2: MAX_COL - 1, l1: ev.shiftKey ? sel.ativa.l : o.l, l2: o.l };
      setSel({ ativa: { l: ev.shiftKey ? sel.ativa.l : o.l, c: ev.shiftKey ? sel.ativa.c : Math.max(cc0, G.c0) }, faixas: [...(ev.ctrlKey ? sel.faixas : []), normalFaixa(f)] });
      setArrasto({ tipo: 'lins', ancora: o.l });
      try { cvRef.current.setPointerCapture(ev.pointerId); } catch { /* sem captura */ }
    } else if (o.tipo === 'canto') {
      setSel({ ativa: sel.ativa, faixas: [{ l1: 0, c1: 0, l2: MAX_LIN - 1, c2: MAX_COL - 1 }] });
    } else if (o.tipo === 'bordaCol' && !somenteLeitura) {
      if (detalhe === 2) { autoAjustar(o.c); return; }
      setArrasto({ tipo: 'largura', c: o.c, x0: p.x, w0: colunas.tam(o.c) });
      try { cvRef.current.setPointerCapture(ev.pointerId); } catch { /* sem captura */ }
    } else if (o.tipo === 'bordaLin' && !somenteLeitura) {
      if (detalhe === 2) { mudar({ [`conteudo.abas.${abaId}.alt.${o.l}`]: undefined }, `Altura da linha ${o.l + 1}`); return; }
      setArrasto({ tipo: 'altura', l: o.l, y0: p.y, h0: linhas.tam(o.l) });
      try { cvRef.current.setPointerCapture(ev.pointerId); } catch { /* sem captura */ }
    }
    setTimeout(() => { if (!editRef.current && capRef.current) capRef.current.focus({ preventScroll: true }); }, 0);
  };

  const aoMover = (ev) => {
    const p = cvRef.current ? ponto(ev) : null;
    if (!p) return;
    if (toque.current && ev.pointerId === toque.current.id) {
      if (Math.hypot(p.x - toque.current.p.x, p.y - toque.current.p.y) > 8) { clearTimeout(toque.current.longo); toque.current = null; }
      return;
    }
    if (!arrasto) {
      /* cursor do mouse: divisa de coluna/linha e alça */
      const o = ondeCaiu(G, p.x, p.y);
      const cur = o.tipo === 'bordaCol' ? 'col-resize' : o.tipo === 'bordaLin' ? 'row-resize' : pertoDaAlca(p) ? 'crosshair' : o.tipo === 'col' ? 's-resize' : o.tipo === 'lin' ? 'e-resize' : 'cell';
      if (cvRef.current.style.cursor !== cur) cvRef.current.style.cursor = cur;
      return;
    }
    rolarNaBorda(p);
    const l = Math.max(0, G.linEm(Math.max(G.hh + 1, Math.min(tam.H - 2, p.y))));
    const col = Math.max(0, G.colEm(Math.max(G.hw + 1, Math.min(tam.W - 2, p.x))));
    switch (arrasto.tipo) {
      case 'sel': selecionar(l, col, { estender: true, ancora: arrasto.ancora, semRolar: true }); break;
      case 'apontar': apontar({ l1: arrasto.ancora.l, c1: arrasto.ancora.c, l2: l, c2: col }); break;
      case 'cols': setSel({ ativa: sel.ativa, faixas: [...sel.faixas.slice(0, -1), normalFaixa({ l1: 0, l2: MAX_LIN - 1, c1: arrasto.ancora, c2: col })] }); break;
      case 'lins': setSel({ ativa: sel.ativa, faixas: [...sel.faixas.slice(0, -1), normalFaixa({ c1: 0, c2: MAX_COL - 1, l1: arrasto.ancora, l2: l })] }); break;
      case 'largura': setArrasto({ ...arrasto, w: Math.max(4, Math.round(arrasto.w0 + (p.x - arrasto.x0) / z)) }); break;
      case 'altura': setArrasto({ ...arrasto, h: Math.max(6, Math.round(arrasto.h0 + (p.y - arrasto.y0) / z)) }); break;
      case 'alca': {
        const o = arrasto.origem;
        const dl = l > o.l2 ? l - o.l2 : l < o.l1 ? l - o.l1 : 0;
        const dc = col > o.c2 ? col - o.c2 : col < o.c1 ? col - o.c1 : 0;
        let destino = null, dir = null;
        if (Math.abs(dl) >= Math.abs(dc) && dl) { dir = dl > 0 ? 'b' : 'c'; destino = dl > 0 ? { ...o, l1: o.l2 + 1, l2: o.l2 + dl } : { ...o, l1: o.l1 + dl, l2: o.l1 - 1 }; }
        else if (dc) { dir = dc > 0 ? 'd' : 'e'; destino = dc > 0 ? { ...o, c1: o.c2 + 1, c2: o.c2 + dc } : { ...o, c1: o.c1 + dc, c2: o.c1 - 1 }; }
        setArrasto({ ...arrasto, destino: destino && { l1: Math.min(o.l1, destino.l1), c1: Math.min(o.c1, destino.c1), l2: Math.max(o.l2, destino.l2), c2: Math.max(o.c2, destino.c2) }, dir, alvo: destino });
        break;
      }
      default:
    }
  };

  const rolarNaBorda = (p) => {
    const el = rolRef.current;
    if (!el) return;
    const m = 24;
    if (p.y > tam.H - m) el.scrollTop += 20;
    else if (p.y < G.hh + G.fy + 4 && p.y > 0 && rol.y > 0) el.scrollTop -= 20;
    if (p.x > tam.W - m) el.scrollLeft += 30;
    else if (p.x < G.hw + G.fx + 4 && p.x > 0 && rol.x > 0) el.scrollLeft -= 30;
  };

  const aoSoltar = (ev) => {
    if (toque.current && ev.pointerId === toque.current.id) {
      clearTimeout(toque.current.longo);
      const { o, t } = toque.current;
      toque.current = null;
      if (Date.now() - t > 500) return;
      const e = editRef.current;
      if (e && o.tipo === 'cel' && podeApontar(e)) { apontar({ l1: o.l, c1: o.c, l2: o.l, c2: o.c }); return; }
      if (e) { if (!confirmar(null)) return; }
      if (o.tipo === 'cel') {
        const dois = ultimoToque.current && Date.now() - ultimoToque.current.t < 380 && ultimoToque.current.l === o.l && ultimoToque.current.c === o.c;
        ultimoToque.current = { t: Date.now(), l: o.l, c: o.c };
        if (pincel) { aplicarPincel([{ l1: o.l, c1: o.c, l2: o.l, c2: o.c }]); return; }
        if (dois) {
          /* abre o campo já com o foco, ainda dentro do toque: o teclado do celular sobe e o primeiro dígito não se perde */
          flushSync(() => comecarEdicao({ modo: 'editar', l: o.l, col: o.c }));
          if (campoCel.current) campoCel.current.focar();
        }
        else selecionar(o.l, o.c, { semRolar: true });
      } else if (o.tipo === 'col') setSel({ ativa: { l: Math.max(cl, G.l0), c: o.c }, faixas: [{ l1: 0, l2: MAX_LIN - 1, c1: o.c, c2: o.c }] });
      else if (o.tipo === 'lin') setSel({ ativa: { l: o.l, c: Math.max(cc0, G.c0) }, faixas: [{ c1: 0, c2: MAX_COL - 1, l1: o.l, l2: o.l }] });
      return;
    }
    const a = arrasto;
    if (!a) return;
    setArrasto(null);
    if (a.tipo === 'largura' && a.w != null && a.w !== a.w0) mudar({ [`conteudo.abas.${abaId}.larg.${a.c}`]: a.w }, `Largura da coluna ${letraCol(a.c)}`);
    if (a.tipo === 'altura' && a.h != null && a.h !== a.h0) mudar({ [`conteudo.abas.${abaId}.alt.${a.l}`]: a.h }, `Altura da linha ${a.l + 1}`);
    if (a.tipo === 'alca' && a.alvo) {
      const n = (a.alvo.l2 - a.alvo.l1 + 1) * (a.alvo.c2 - a.alvo.c1 + 1);
      if (n > 200000) { cx.avisar('Preenchimento grande demais.', { ic: 'aviso' }); return; }
      if (aplicarLote(O.preencher(c, abaId, a.origem, a.alvo, a.dir, motor), `Preencher ${n} ${n === 1 ? 'célula' : 'células'}`)) {
        setSel({ ativa: sel.ativa, faixas: [a.destino] });
      }
    }
    if (a.tipo === 'sel' && pincel) aplicarPincel(sel.faixas);
    if (a.tipo === 'apontar') { const r = (editRef.current && editRef.current.onde === 'barra' ? campoBarra : campoCel).current; if (r) r.focar(); }
  };
  const ultimoToque = useRef(null);
  const ultimoClique = useRef(null);

  const aplicarPincel = (faixas) => {
    const est = pincel;
    setPincel(null);
    const lote = O.mudarEstilo(c, abaId, faixas, () => ({ ...est }));
    aplicarLote(lote, 'Pincel de formatação');
  };

  /** Dois toques na alça: preenche até o fim dos dados da coluna vizinha (como o Excel). */
  const preencherAteOFim = () => {
    const o = normalFaixa(faixa);
    const viz = cheias.porCol.get(o.c1 - 1) || cheias.porCol.get(o.c2 + 1) || [];
    let fim = o.l2;
    while (binTem(viz, fim + 1)) fim++;
    if (fim <= o.l2) { cx.avisar('Não achei dados na coluna ao lado para saber até onde preencher.', { ic: 'info' }); return; }
    const alvo = { ...o, l1: o.l2 + 1, l2: fim };
    if (aplicarLote(O.preencher(c, abaId, o, alvo, 'b', motor), `Preencher até a linha ${fim + 1}`)) setSel({ ativa: sel.ativa, faixas: [{ ...o, l2: fim }] });
  };

  const abrirMenuCelula = (x, y, o) => {
    if (o && (o.tipo === 'col' || o.tipo === 'lin')) { abrirMenuCabecalho(x, y, o); return; }
    if (o && o.tipo === 'cel' && !sel.faixas.some((f) => { const n = normalFaixa(f); return n.l1 <= o.l && o.l <= n.l2 && n.c1 <= o.c && o.c <= n.c2; })) selecionar(o.l, o.c, { semRolar: true });
    const quemUsa = motor.dependentes(abaId, sel.ativa.l, sel.ativa.c).length;
    const ro = somenteLeitura;
    const linhasInteiras = faixa.c1 === 0 && faixa.c2 === MAX_COL - 1;
    const colunasInteiras = faixa.l1 === 0 && faixa.l2 === MAX_LIN - 1;
    setMenu({
      x, y,
      itens: [
        !ro && { nome: 'Recortar', ic: 'recortar', atalho: 'Ctrl+X', fazer: () => copiarPorBotao(true) },
        { nome: 'Copiar', ic: 'copiar', atalho: 'Ctrl+C', fazer: () => copiarPorBotao(false) },
        !ro && { nome: 'Colar', ic: 'colar', atalho: 'Ctrl+V', fazer: () => colarPorBotao('tudo') },
        !ro && { nome: 'Colar só os valores', ic: 'colar', fazer: () => colarPorBotao('valores') },
        '-',
        !ro && !colunasInteiras && { nome: linhasSel().n > 1 ? `Inserir ${linhasSel().n} linhas acima` : 'Inserir linha acima', ic: 'inserir', fazer: inserirLinhas },
        !ro && !linhasInteiras && { nome: colsSel().n > 1 ? `Inserir ${colsSel().n} colunas à esquerda` : 'Inserir coluna à esquerda', ic: 'inserir', fazer: inserirColunas },
        !ro && !colunasInteiras && { nome: linhasSel().n > 1 ? `Excluir ${linhasSel().n} linhas` : `Excluir linha ${faixa.l1 + 1}`, ic: 'lixeira', fazer: excluirLinhas },
        !ro && !linhasInteiras && { nome: colsSel().n > 1 ? `Excluir ${colsSel().n} colunas` : `Excluir coluna ${letraCol(faixa.c1)}`, ic: 'lixeira', fazer: excluirColunas },
        !ro && linhasInteiras && { nome: 'Ocultar linhas', ic: 'ver', fazer: () => ocultar('l', false) },
        !ro && colunasInteiras && { nome: 'Ocultar colunas', ic: 'ver', fazer: () => ocultar('c', false) },
        !ro && linhasInteiras && { nome: 'Reexibir linhas', ic: 'ver', fazer: () => ocultar('l', true) },
        !ro && colunasInteiras && { nome: 'Reexibir colunas', ic: 'ver', fazer: () => ocultar('c', true) },
        !ro && { nome: 'Limpar conteúdo', ic: 'x', atalho: 'Delete', fazer: apagar },
        '-',
        !ro && { nome: 'Formato de número...', ic: 'formatar', atalho: 'Ctrl+1', fazer: () => setJanela({ tipo: 'formato' }) },
        !ro && { nome: 'Dar nome...', ic: 'renomear', fazer: darNome },
        motor.formula(abaId, sel.ativa.l, sel.ativa.c) && { nome: ehErro(motor.valor(abaId, sel.ativa.l, sel.ativa.c)) ? 'Por que deu erro?' : 'Explicar esta conta', ic: 'explicar', fazer: () => setJanela({ tipo: 'explicar' }) },
        { nome: `De onde vem / quem usa${quemUsa ? ` (${quemUsa})` : ''}`, ic: 'origem', fazer: () => setJanela({ tipo: 'origem' }) },
        !ro && { nome: `Linha ${sel.ativa.l + 1} é o cabeçalho`, ic: 'titulo', fazer: () => trata('planilha.cabecalho'), dica: 'Os títulos desta linha aparecem junto das referências nas fórmulas' },
      ],
    });
  };

  const aoMenuContexto = (ev) => {
    ev.preventDefault();
    if (editRef.current) return;
    const p = ponto(ev);
    abrirMenuCelula(ev.clientX, ev.clientY, ondeCaiu(G, p.x, p.y));
  };

  const aoRoda = (ev) => {
    if (ev.ctrlKey || ev.metaKey) {
      ev.preventDefault();
      setZ((zz) => Math.max(Z_MIN, Math.min(Z_MAX, Math.round((zz * (ev.deltaY < 0 ? 1.1 : 1 / 1.1)) * 20) / 20)));
    }
  };
  useEffect(() => {
    const el = rolRef.current;
    if (!el) return undefined;
    el.addEventListener('wheel', aoRoda, { passive: false });
    return () => el.removeEventListener('wheel', aoRoda);
  });

  /* foco no campo escondido (recebe o teclado da grade) */
  useEffect(() => {
    if (edit || janela || menu || cx.temJanela) return undefined;
    /* espera a tecla que fechou a janela terminar (o Enter não pode virar texto na célula) */
    const t = setTimeout(() => { if (!editRef.current && capRef.current && !document.querySelector('.fundo, .pl-menu')) capRef.current.focus({ preventScroll: true }); }, 0);
    return () => clearTimeout(t);
  }, [edit, janela, menu, cx.temJanela]);

  /* ---------- tipo da coluna (celular: teclado numérico ou calendário) ---------- */
  const tipoColuna = useMemo(() => {
    if (!edit) return 'texto';
    const ls = (cheias.porCol.get(edit.c) || []).filter((l) => l !== edit.l && l > tituloCols.cab).slice(-30);
    if (ls.length < 2) return 'texto';
    let num = 0, data = 0;
    for (const l of ls) {
      const v = motor.valor(abaId, l, edit.c);
      const x = aba.cel[chave(l, edit.c)];
      const nf = estiloDe(c, x).nf || '';
      if (typeof v === 'number') { if (ehFormatoData(nf)) data++; else num++; }
    }
    if (data >= ls.length * 0.6) return 'data';
    if (num >= ls.length * 0.6) return 'numero';
    return 'texto';
  }, [edit && edit.c, edit && edit.l, cheias]); // eslint-disable-line react-hooks/exhaustive-deps

  const proximaVazia = () => {
    if (!confirmar(null)) return;
    const col = sel.ativa.c;
    let l = sel.ativa.l + 1;
    const lista = cheias.porCol.get(col) || [];
    while (binTem(lista, l)) l++;
    setTimeout(() => { selecionar(l, col); comecarEdicao({ modo: 'entrar', texto: '', l, col }); }, 0);
  };

  /* ---------- painel lateral: a célula ativa ---------- */
  const valorAtivo = motor.valor(abaId, sel.ativa.l, sel.ativa.c);
  const fmAtiva = motor.formula(abaId, sel.ativa.l, sel.ativa.c);
  const usadaPor = motor.dependentes(abaId, sel.ativa.l, sel.ativa.c).length;
  const secaoPainel = (
    <div className="side-s pl-painel">
      <h4>Célula {chave(sel.ativa.l, sel.ativa.c)}</h4>
      <dl>
        <dt>Mostra</dt><dd>{formatar(valorAtivo, estiloAtivo.nf).t || '(vazia)'}</dd>
        {fmAtiva && <><dt>Fórmula</dt><dd><code>={paraMostrar(fmAtiva.f)}</code></dd></>}
        <dt>Formato</dt><dd>{codigoPt(estiloAtivo.nf || 'General')}</dd>
        <dt>Usada por</dt><dd>{usadaPor ? <button type="button" className="lnk" onClick={() => setJanela({ tipo: 'origem' })}>{usadaPor} {usadaPor === 1 ? 'fórmula' : 'fórmulas'}</button> : 'nenhuma fórmula'}</dd>
        {fmAtiva && fmAtiva.desc.length > 0 && <><dt>Aviso</dt><dd>O EFCdocs ainda não calcula {fmAtiva.desc.join(', ')}. Mostra o último valor do Excel.</dd></>}
        {ehErro(valorAtivo) && <><dt>Erro</dt><dd>{valorAtivo.toString()}: {ERRO_EXPLICA[valorAtivo.cod]}</dd></>}
        {fmAtiva && <><dt>Entender</dt><dd><button type="button" className="lnk" onClick={() => setJanela({ tipo: 'explicar' })}>{ehErro(valorAtivo) ? 'Por que deu erro?' : 'Explicar esta conta'}</button></dd></>}
        {motor.circulares().some((x) => x.abaId === abaId && x.l === sel.ativa.l && x.c === sel.ativa.c) && <><dt>Aviso</dt><dd>{(causaCircular(motor, c, abaId, sel.ativa.l, sel.ativa.c) || {}).msg}</dd></>}
      </dl>
    </div>
  );

  /* conta circular: avisa uma vez quando aparece */
  const circAvisado = useRef('');
  useEffect(() => {
    const lista = motor.circulares();
    const chaves = lista.map((x) => x.abaId + chave(x.l, x.c));
    const k = chaves.join(',');
    if (k && k !== circAvisado.current) {
      /* avisa do círculo que apareceu agora (não repete o que já foi avisado) */
      const antes = new Set(circAvisado.current.split(',').filter(Boolean));
      const x = lista.find((y, i) => !antes.has(chaves[i]));
      const cc = x && causaCircular(motor, c, x.abaId, x.l, x.c);
      if (x) cx.avisar('Conta circular: ' + (cc ? cc.msg : 'uma célula usa ela mesma e fica 0.'), { ic: 'aviso' });
    }
    circAvisado.current = k;
  }, [c]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- campos de edição ---------- */
  const editandoAqui = edit && edit.abaId === abaId;
  const posEditor = editandoAqui ? (() => {
    const m = mesclaEm(mesc, edit.l, edit.c);
    const x = G.xDe(edit.c), y = G.yDe(edit.l);
    const w = m ? G.xDe(m.c2 + 1) - x : colunas.tam(edit.c) * z;
    const h = m ? G.yDe(m.l2 + 1) - y : linhas.tam(edit.l) * z;
    return { x, y, w, h };
  })() : null;
  const estEdit = edit ? estiloDe(c, c.abas[edit.abaId] && c.abas[edit.abaId].cel[chave(edit.l, edit.c)]) : {};
  const largEditor = posEditor ? Math.max(posEditor.w, Math.min(tam.W - posEditor.x - 4, 12 + (edit.texto.length + 1) * 7.6 * z)) : 0;
  const ajuda = edit && ehFormula ? (
    <AjudaFormula ctxCursor={ctxCursor} sugest={sugest} selSug={selSug} aoEscolher={escolherSugestao}
      problemas={problemas} aoCorrigir={(p) => { const t = '=' + corrigir(edit.texto.slice(1), [p]); setEdit({ ...edit, texto: t, cursor: Math.min(t.length, edit.cursor + (p.troca.novo.length - (p.troca.f - p.troca.i))), mostrarErros: false }); }}
      aoCorrigirTudo={() => { const t = '=' + corrigir(edit.texto.slice(1), problemas.filter((x) => x.nivel === 'erro')); setEdit({ ...edit, texto: t, cursor: t.length, mostrarErros: false }); }}
      previa={previa} etiquetas={etiquetas}
      estilo={cel ? undefined : edit.onde === 'barra' || !posEditor ? { left: 8, top: 4 } : { left: Math.min(Math.max(0, posEditor.x), Math.max(0, tam.W - 380)), top: posEditor.y + posEditor.h + 4 + 40 }} />
  ) : null;

  const campoProps = (onde) => ({
    valor: edit ? edit.texto : '', cursor: edit ? edit.cursor : 0,
    aoMudar: mudarTexto, aoTecla: teclaEdicao,
    aoFocar: () => { if (editRef.current && editRef.current.onde !== onde) setEdit({ ...editRef.current, onde }); },
    aoSair: () => {},
    fantasma: autoTexto,
  });

  /* v0.4.7: esticar a barra de fórmula */
  const maxFxArea = () => { const h = raiz.current ? raiz.current.clientHeight : 600; return Math.max(FX_MIN, Math.floor(h * 0.45)); };
  const fxAltura = cel ? FX_MIN : (fxArr != null ? fxArr : limitaFx(prefs.fxAlt, 9999));
  const fxAberta = fxAltura > FX_MIN + 2;
  const fixarFx = (v) => setPrefs((p) => ({ ...p, fxAlt: limitaFx(v, maxFxArea()) }));
  function alternarFx() { fixarFx(fxAberta ? FX_MIN : FX_ABRIR); }
  const alcaFx = {
    onPointerDown: (ev) => {
      if (ev.button != null && ev.button !== 0) return;
      ev.preventDefault();
      ev.currentTarget.setPointerCapture(ev.pointerId);
      fxDrag.current = { y: ev.clientY, h: fxAltura };
    },
    onPointerMove: (ev) => {
      const d = fxDrag.current; if (!d) return;
      setFxArr(limitaFx(d.h + (ev.clientY - d.y), maxFxArea()));
    },
    onPointerUp: (ev) => {
      const d = fxDrag.current; if (!d) return;
      fxDrag.current = null;
      const novo = limitaFx(d.h + (ev.clientY - d.y), maxFxArea());
      setFxArr(null);
      fixarFx(novo < FX_MIN + 8 ? FX_MIN : novo);
    },
    onPointerCancel: () => { fxDrag.current = null; setFxArr(null); },
    onDoubleClick: () => alternarFx(),
    onKeyDown: (ev) => {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); fixarFx(fxAltura + 18); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); fixarFx(fxAltura - 18); }
      else if (ev.key === 'Home') { ev.preventDefault(); fixarFx(FX_MIN); }
    },
  };

  /* barra de fórmula quando não está editando: a fórmula colorida com o nome da coluna (PL09) */
  const textoBarra = textoParaEditar(celulaAtiva, estiloAtivo);
  const barraLeitura = useMemo(() => {
    if (!textoBarra.startsWith('=')) return <span className="pl-fx-txt">{textoBarra}</span>;
    const { pedacos } = pedacosColoridos(textoBarra.slice(1));
    return (
      <span className="pl-fx-txt formula">
        <span className="tk-op">=</span>
        {pedacos.map((p, i) => {
          if (p.t === 'ref' || p.t === 'area') {
            const v = p.v;
            const titulo = p.t === 'ref' && v.aba == null && v.l > tituloCols.cab ? tituloCols.mapa.get(v.c) : null;
            const alvoAba = v.aba == null ? abaId : c.ordem.find((x) => c.abas[x].nome.toLowerCase() === String(v.aba).toLowerCase());
            return (
              <span key={i} className="tk-ref-b" style={{ color: p.cor }} title="Ctrl+clique para ir até lá (Alt+← volta)"
                onClick={(ev) => { if ((ev.ctrlKey || ev.metaKey || cel) && alvoAba) { ev.stopPropagation(); irPara({ abaId: alvoAba, ...(p.t === 'ref' ? { l: v.l, c: v.c } : normalFaixa(v)) }); } }}>
                {p.txt}{titulo && <i className="pl-inlay">‹{titulo}›</i>}
              </span>
            );
          }
          return <span key={i} className={p.cls} style={p.cor ? { color: p.cor } : undefined}>{p.txt}</span>;
        })}
      </span>
    );
  }, [textoBarra, tituloCols, abaId, c]); // eslint-disable-line react-hooks/exhaustive-deps

  const caixaNome = edit ? chave(edit.l, edit.c) : (arrasto && arrasto.tipo === 'sel' && (faixa.l1 !== faixa.l2 || faixa.c1 !== faixa.c2)
    ? `${Math.abs(faixa.l2 - faixa.l1) + 1}L × ${Math.abs(faixa.c2 - faixa.c1) + 1}C`
    : (Object.values(c.nomes || {}).find((n) => { const r = motor.refDeTexto(n.n, abaId); const f = normalFaixa(faixa); return r && r.abaId === abaId && r.l1 === f.l1 && r.c1 === f.c1 && r.l2 === f.l2 && r.c2 === f.c2; }) || {}).n || (() => { const fn = normalFaixa(faixa); const inteira = sel.faixas.length === 1 && ((fn.l1 === 0 && fn.l2 === MAX_LIN - 1) || (fn.c1 === 0 && fn.c2 === MAX_COL - 1)); return inteira ? textoFaixaCaixa(fn) : chave(sel.ativa.l, sel.ativa.c); })());
  const [caixaTexto, setCaixaTexto] = useState(null);

  const irPelaCaixa = (t) => {
    setCaixaTexto(null);
    const s = t.trim();
    if (!s) return;
    const end = lerEnderecoCaixa(s);
    if (end) {
      const id = end.aba ? c.ordem.find((x) => c.abas[x].nome.toLowerCase() === end.aba.toLowerCase()) : abaId;
      if (!id) { cx.avisar(`Não existe aba chamada "${end.aba}".`, { ic: 'aviso' }); return; }
      irPara({ abaId: id, ...end });
      return;
    }
    const r = motor.refDeTexto(s, abaId);
    if (r) { irPara({ abaId: r.abaId, l1: r.l1, c1: r.c1, l2: r.l2, c2: r.c2 }); return; }
    /* nome novo: dá nome à seleção (como no Excel) */
    const erro = validarNomeDefinido(s, c);
    if (erro) { cx.avisar(erro, { ic: 'aviso' }); return; }
    if (mudar(O.definirNome(c, s, O.refAbsoluta(c, abaId, normalFaixa(faixa))), `Dar nome ${s}`)) cx.avisar(`Nome ${s} criado para ${textoFaixa(normalFaixa(faixa))}.`, { ic: 'check' });
  };

  /* alças do celular (aumentar a seleção sem mouse) */
  const alcaCel = (qual) => {
    const f = normalFaixa(faixa);
    const x = qual === 'a' ? G.xDe(f.c1) : G.xDe(f.c2 + 1), y = qual === 'a' ? G.yDe(f.l1) : G.yDe(f.l2 + 1);
    if (x < G.hw - 10 || y < G.hh - 10 || x > tam.W + 10 || y > tam.H + 10) return null;
    return (
      <span className={'pl-alca-cel ' + qual} style={{ left: x, top: y }} aria-label={qual === 'a' ? 'Alça do início da seleção' : 'Alça do fim da seleção'}
        onPointerDown={(ev) => { ev.preventDefault(); ev.stopPropagation(); try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* sem captura */ } setArrasto({ tipo: 'alcaCel', qual, fixo: qual === 'a' ? { l: f.l2, c: f.c2 } : { l: f.l1, c: f.c1 } }); }}
        onPointerMove={(ev) => {
          if (!arrasto || arrasto.tipo !== 'alcaCel') return;
          const p = ponto(ev);
          rolarNaBorda(p);
          const l = Math.max(0, G.linEm(Math.max(G.hh + 1, Math.min(tam.H - 2, p.y)))), col = Math.max(0, G.colEm(Math.max(G.hw + 1, Math.min(tam.W - 2, p.x))));
          setSel({ ativa: sel.ativa, faixas: [normalFaixa({ l1: arrasto.fixo.l, c1: arrasto.fixo.c, l2: l, c2: col })] });
        }}
        onPointerUp={() => setArrasto(null)} onPointerCancel={() => setArrasto(null)} />
    );
  };

  const temSelMulti = faixa.l1 !== faixa.l2 || faixa.c1 !== faixa.c2;

  return (
    <div className={'sup sup-planilha pl' + (somenteLeitura ? ' leitura' : '') + (prefs.folhaClara ? ' clara' : '') + (cel ? ' pl-cel' : '')} ref={raiz}>
      {/* barra de fórmula */}
      <div className={'pl-fx' + (fxAberta ? ' aberta' : '') + (fxArr != null ? ' arrastando' : '')} role="group" aria-label="Barra de fórmula" style={fxAberta ? { height: fxAltura } : undefined} data-fx-alt={fxAltura}>
        <input className="pl-nome" aria-label="Caixa de nome: endereço ou nome (digite para ir até lá ou para dar nome)" spellCheck={false}
          value={caixaTexto != null ? caixaTexto : caixaNome} onFocus={(ev) => { setCaixaTexto(caixaNome); setTimeout(() => ev.target.select(), 0); }}
          onChange={(ev) => setCaixaTexto(ev.target.value)} onBlur={() => setCaixaTexto(null)}
          onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); irPelaCaixa(ev.currentTarget.value); ev.currentTarget.blur(); } if (ev.key === 'Escape') { setCaixaTexto(null); ev.currentTarget.blur(); } }} />
        <button type="button" className="pl-fx-b" title="Inserir função" aria-label="Inserir função" data-cmd="formula.inserir" onClick={() => trata('formula.inserir')}><i>fx</i></button>
        <div className="pl-fx-campo" onClick={() => { if (!edit && !somenteLeitura) comecarEdicao({ modo: 'editar', onde: cel ? 'banda' : 'barra' }); }}>
          {edit && !cel
            ? <CampoFormula ref={campoBarra} {...campoProps('barra')} classe="barra" rotulo="Conteúdo da célula" focar={edit.onde === 'barra'} />
            : barraLeitura}
        </div>
        {!cel && (
          <button type="button" className="pl-fx-exp" data-fx-exp={fxAberta ? 'recolher' : 'expandir'}
            aria-label={fxAberta ? 'Recolher a barra de fórmula (tamanho mínimo)' : 'Expandir a barra de fórmula'}
            title={fxAberta ? 'Recolher a barra de fórmula (Ctrl+Shift+U)' : 'Expandir a barra de fórmula (Ctrl+Shift+U)'}
            onClick={() => alternarFx()}>
            <Icone n={fxAberta ? 'chevronCima' : 'chevronBaixo'} />
          </button>
        )}
        {!cel && (
          <div className="pl-fx-alca" role="separator" aria-orientation="horizontal" tabIndex={0} data-fx-alca
            aria-label="Altura da barra de fórmula: arraste, ou use as setas para cima e para baixo"
            aria-valuemin={FX_MIN} aria-valuemax={FX_MAX} aria-valuenow={fxAltura}
            title="Arraste para esticar ou encolher a barra de fórmula" {...alcaFx}><i /></div>
        )}
      </div>
      {somenteLeitura && <div className="qd-modo leitura pl-leitura"><Icone n="ver" />{cx.travado && cx.travado.motivo === 'conflito' ? 'Em espera: escolha no aviso do topo o que fazer.' : cx.travado ? 'Só para ver' : 'Só leitura: seu perfil de teste não edita a planilha.'}</div>}

      <div className="pl-area">
        <div className="pl-rol" ref={rolRef} onScroll={aoRolar} onContextMenu={aoMenuContexto}>
          <div className="pl-esp" style={{ width: espW, height: espH }}>
            <canvas ref={cvRef} className="pl-cv" role="grid" aria-label={'Planilha ' + ficha.nome + ', aba ' + aba.nome}
              aria-rowcount={MAX_LIN} aria-colcount={MAX_COL}
              onPointerDown={aoBaixar} onPointerMove={aoMover} onPointerUp={aoSoltar}
              onMouseDown={(ev) => { const f = document.activeElement; if (f && (f.classList.contains('pl-cap') || f.classList.contains('ef-campo'))) ev.preventDefault(); else if (f && f.closest && f.closest('.pl-fx') && f.tagName === 'BUTTON') { ev.preventDefault(); if (!editRef.current && capRef.current) capRef.current.focus({ preventScroll: true }); } /* v0.4.7: depois dos botões da barra fx a grade volta a receber o teclado */ }}
              onPointerCancel={() => { if (toque.current) { clearTimeout(toque.current.longo); toque.current = null; } setArrasto(null); }} />
          </div>
        </div>
        {/* assinaturas sobre a grade (v0.4.5) */}
        {objs.length > 0 && (
          <div className="pl-objs" style={{ left: G.hw, top: G.hh, width: Math.max(0, tam.W - G.hw), height: Math.max(0, tam.H - G.hh) }}>
            {objs.map((o) => {
              const base = retDoObjeto(o, G);
              const r = arrObj && arrObj.id === o.id ? { x: arrObj.x, y: arrObj.y, w: arrObj.w, h: arrObj.h } : base;
              const rc = recorteDoObjeto(o, r, G);
              if (!rc.visivel) return null;
              const escolhida = objSel === o.id;
              return (
                <div key={o.id} className={'pl-obj' + (escolhida ? ' sel' : '')} data-obj={o.id} role="img" aria-label={'Assinatura de ' + o.nome}
                  style={{ left: r.x - G.hw, top: r.y - G.hh, width: r.w, height: r.h, zIndex: escolhida ? 3 : 2, clipPath: rc.semCorte ? undefined : `inset(${rc.corte.t}px ${rc.corte.r}px ${rc.corte.b}px ${rc.corte.l}px)` }}
                  onPointerDown={(ev) => aoBaixarObj(ev, o, 'mover')} onPointerMove={aoMoverObj} onPointerUp={aoSoltarObj} onPointerCancel={aoSoltarObj}
                  onDoubleClick={() => abrirAssinatura(o)}
                  onWheel={(ev) => { if (rolRef.current) rolRef.current.scrollBy({ left: ev.deltaX, top: ev.deltaY }); }}>
                  <div style={{ width: r.w / z, height: r.h / z, transform: `scale(${z})`, transformOrigin: '0 0' }}>
                    <AssinaturaView nome={o.nome} rub={o.rub} w={Math.round(r.w / z)} h={Math.round(r.h / z)} />
                  </div>
                  {escolhida && !somenteLeitura && <span className="pl-obj-alca" data-alca="obj" aria-label="Mudar o tamanho" onPointerDown={(ev) => aoBaixarObj(ev, o, 'tamanho')} />}
                </div>
              );
            })}
          </div>
        )}
        {(() => {
          const o = objSel && objs.find((x) => x.id === objSel);
          if (!o || (arrObj && arrObj.moveu)) return null;
          const r = retDoObjeto(o, G);
          const topo = r.y - 40 >= G.hh ? r.y - 40 : r.y + r.h + 8;
          return (
            <div className="pl-obj-barra" style={{ left: Math.max(4, Math.min(tam.W - 80, r.x)), top: topo }} role="toolbar" aria-label="Assinatura">
              <button type="button" className="iconbtn" data-obj-ed="1" aria-label="Nome e rubrica" title="Nome e rubrica (Enter)" onClick={() => abrirAssinatura(o)}><Icone n="assinatura" /></button>
              {!somenteLeitura && <button type="button" className="iconbtn" data-obj-ex="1" aria-label="Excluir assinatura" title="Excluir (Delete)" onClick={() => excluirObjeto(o)}><Icone n="lixeira" /></button>}
            </div>
          );
        })()}
        {/* campo escondido que recebe o teclado da grade (e o colar do celular) */}
        <textarea ref={capRef} className="pl-cap" aria-label={`Célula ${chave(sel.ativa.l, sel.ativa.c)}: ${formatar(valorAtivo, estiloAtivo.nf).t || 'vazia'}`}
          style={{ left: Math.max(0, Math.min(tam.W - 2, G.xDe(sel.ativa.c))), top: Math.max(0, Math.min(tam.H - 2, G.yDe(sel.ativa.l))) }}
          autoCapitalize="off" autoComplete="off" spellCheck={false} inputMode={cel ? 'none' : undefined}
          onKeyDown={teclaGrade}
          onInput={(ev) => {
            const t = ev.target.value; ev.target.value = '';
            if (!t || /^[\r\n\t]+$/.test(t) || editRef.current) return;
            if (somenteLeitura) { avisarLeitura(); return; }
            /* troca o foco na mesma hora, para não perder as letras seguintes de quem digita rápido */
            flushSync(() => comecarEdicao({ texto: t, modo: 'entrar' }));
            const r = campoCel.current;
            if (r) { r.focar(); const el = r.el(); if (el) { const n = el.value.length; el.setSelectionRange(n, n); } }
          }}
          onCopy={(ev) => aoCopiar(ev, false)} onCut={(ev) => { if (somenteLeitura) return; aoCopiar(ev, true); }} onPaste={aoColar} />
        {/* edição dentro da célula (computador) */}
        {editandoAqui && !cel && posEditor && (
          <div className="pl-edcel" style={{ left: posEditor.x, top: posEditor.y, minWidth: posEditor.w, width: largEditor, minHeight: posEditor.h, font: fonteCanvas(estEdit, z, familia), background: estEdit.fundo || undefined, color: estEdit.cor ? corLegivel(estEdit.cor, estEdit.fundo || cores.fundoHex, estEdit.fundo ? null : cores.texto) : undefined }}>
            <CampoFormula ref={campoCel} {...campoProps('celula')} classe="celula" rotulo={'Editando ' + chave(edit.l, edit.c)} focar={edit.onde === 'celula'} />
          </div>
        )}
        {!cel && ajuda && <div className="pl-ajuda-ancora">{ajuda}</div>}
        {cel && !edit && !somenteLeitura && (<>{alcaCel('a')}{alcaCel('b')}</>)}
        {!cel || !edit ? <PainelProblemas alvo={cel ? null : cx.alvoRodape} lista={listaProb} aberto={probAberto} aoAlternar={() => { if (probAberto) setTimeout(voltarFocoGrade, 0); setProbAberto(!probAberto); }} somenteLeitura={somenteLeitura}
          aoIr={(p) => { if (cel) setProbAberto(false); /* no celular a lista cobre a grade */ irPara({ abaId: p.abaId, l: p.l, c: p.c }); }} aoAcao={fazerAcao} /> : null}
        {pincel && <div className="qd-modo pl-modo"><Icone n="pincel" />Toque onde vai o formato.<button type="button" className="btn sm" onClick={() => setPincel(null)}>Cancelar</button></div>}
      </div>

      {/* faixa de edição do celular (PL19): grande, embaixo, com os símbolos que faltam no teclado */}
      {cel && edit && (
        <div className="pl-banda" role="group" aria-label={'Editando ' + chave(edit.l, edit.c)}>
          {ajuda}
          {(ehFormula || edit.texto === '') && <BarraSimbolos aoInserir={inserirNoCursor} funcoes={FUNCOES_CEL} />}
          <div className="pl-banda-l">
            <span className="pl-banda-cel">{chave(edit.l, edit.c)}</span>
            <CampoFormula ref={campoCel} {...campoProps('banda')} classe="banda" rotulo={'Conteúdo de ' + chave(edit.l, edit.c)} focar
              modoTeclado={!ehFormula && tipoColuna === 'numero' ? 'decimal' : undefined} />
            {tipoColuna === 'data' && !ehFormula && (
              <label className="iconbtn pl-cal" title="Escolher a data no calendário" aria-label="Calendário">
                <Icone n="data" />
                <input type="date" onChange={(ev) => { const [a, m, d] = ev.target.value.split('-'); if (a) setEdit({ ...editRef.current, texto: `${d}/${m}/${a}`, cursor: 10 }); }} />
              </label>
            )}
          </div>
          <div className="pl-banda-b">
            <button type="button" className="btn sm" onClick={cancelar}><Icone n="x" />Cancelar</button>
            <button type="button" className="btn sm" onClick={proximaVazia} title="Grava e vai para a próxima célula vazia da coluna"><Icone n="setaBaixo" />Próxima vazia</button>
            <button type="button" className="btn sm primary" onClick={() => confirmar([1, 0])}><Icone n="check" />OK</button>
          </div>
        </div>
      )}

      <div className="pl-rodape">
        <AbasPlanilha c={c} abaId={abaId} aoTrocar={(id) => { if (edit && ehFormula) { setEdit({ ...edit, onde: 'barra' }); trocarAba(id, true); } else trocarAba(id); }} aoNova={novaAbaFn} aoMenu={menuAba} somenteLeitura={somenteLeitura} />
        <div className="pl-zoom" role="group" aria-label="Zoom">
          <button type="button" className="rbi" aria-label="Diminuir o zoom" onClick={() => setZ((v) => Math.max(Z_MIN, Math.round((v - 0.1) * 10) / 10))}><Icone n="menos" /></button>
          <button type="button" className="pl-zpct" title="Voltar a 100%" onClick={() => setZ(1)}>{Math.round(z * 100)}%</button>
          <button type="button" className="rbi" aria-label="Aumentar o zoom" onClick={() => setZ((v) => Math.min(Z_MAX, Math.round((v + 0.1) * 10) / 10))}><Icone n="maiszoom" /></button>
        </div>
      </div>

      {menu && <MenuFlutuante x={menu.x} y={menu.y} itens={menu.itens} aoFechar={() => setMenu(null)} />}
      <PortalPainel alvo={cx.alvoPainel}>{secaoPainel}</PortalPainel>

      {asn && <JanelaAssinatura inicial={asn.inicial} titulo={asn.id ? 'Editar assinatura' : 'Nova assinatura'} confirmar={asn.id ? 'Salvar' : 'Inserir'} aoConfirmar={confirmarAssinatura} aoFechar={() => { setAsn(null); setTimeout(voltarFocoGrade, 0); }} />}
      {janela && janela.tipo === 'corFonte' && <JanelaCor titulo="Cor da fonte" semCor="Automática" aoEscolher={(hex) => formatarSel((e) => ({ ...e, cor: hex || undefined }), 'Cor da fonte')} aoFechar={() => setJanela(null)} />}
      {janela && janela.tipo === 'fundo' && <JanelaCor titulo="Cor de preenchimento" semCor="Sem preenchimento" aoEscolher={(hex) => formatarSel((e) => ({ ...e, fundo: hex || undefined }), 'Cor de preenchimento')} aoFechar={() => setJanela(null)} />}
      {janela && janela.tipo === 'corAba' && <JanelaCor titulo="Cor da aba" semCor="Sem cor" aoEscolher={(hex) => mudar({ [`conteudo.abas.${janela.id}.cor`]: hex || undefined }, 'Cor da aba')} aoFechar={() => setJanela(null)} />}
      {janela && janela.tipo === 'formato' && <JanelaFormato atual={estiloAtivo.nf} exemplo={typeof valorAtivo === 'number' ? valorAtivo : undefined} aoAplicar={(cod) => formatarSel((e) => ({ ...e, nf: /^general$/i.test(cod) ? undefined : cod }), 'Formato de número')} aoFechar={() => setJanela(null)} />}
      {janela && janela.tipo === 'fonte' && <JanelaFonte estilo={estiloAtivo} aoAplicar={(x) => formatarSel((e) => ({ ...e, ...x }), 'Fonte')} aoFechar={() => setJanela(null)} />}
      {janela && janela.tipo === 'congelar' && <JanelaCongelar ativa={sel.ativa} cong={cong} aoEscolher={(v) => mudar({ [`conteudo.abas.${abaId}.cong`]: v && (v.l || v.c) ? v : undefined }, v ? 'Congelar painéis' : 'Descongelar painéis')} aoFechar={() => setJanela(null)} />}
      {janela && janela.tipo === 'funcoes' && <JanelaFuncoes aoEscolher={(f) => { if (editRef.current && editRef.current.texto.startsWith('=')) inserirNoCursor(f.pt + '('); else comecarEdicao({ texto: '=' + f.pt + '(', modo: 'entrar' }); }} aoFechar={() => setJanela(null)} />}
      {janela && janela.tipo === 'numdata' && <JanelaNumeroData valor={janela.valor} mostra={janela.mostra} aoEscolher={janela.aoEscolher} aoFechar={janela.aoFechar} />}
      {janela && janela.tipo === 'zero' && <JanelaZeros codigos={janela.codigos} colunas={janela.colunas} colar={!!janela.colar} aoEscolher={janela.aoEscolher} aoFechar={janela.aoFechar} />}
      {janela && janela.tipo === 'nomes' && (
        <JanelaNomes c={c} somenteLeitura={somenteLeitura} aoFechar={() => setJanela(null)} aoNovo={darNome}
          aoIr={(n) => { const r = motor.refDeTexto(n.n, abaId); if (r) irPara({ abaId: r.abaId, l1: r.l1, c1: r.c1, l2: r.l2, c2: r.c2 }); }}
          aoRenomear={renomearNomeDef}
          aoMudar={(n) => cx.perguntar({
            titulo: 'Mudar ' + n.n, campo: 'Vale (um número, uma célula ou uma faixa, ex.: 1,15 ou Metas!B3)', valor: paraMostrar(n.ref), confirmar: 'Mudar',
            validar: (t) => { try { paraGuardar(t.trim().replace(/^=/, '')); return ''; } catch (e) { return e.message; } },
            aoConfirmar: (t) => { if (mudar(O.definirNome(c, n.n, paraGuardar(t.trim().replace(/^=/, ''))), `Mudar ${n.n}`)) cx.avisar(`${n.n} agora vale ${t.trim()}. Todas as fórmulas que usam o nome acompanham.`, { ic: 'check' }); },
          })}
          aoExcluir={(n) => cx.perguntar({ titulo: 'Excluir o nome?', texto: `As fórmulas que usam ${n.n} passam a mostrar #NOME?.`, confirmar: 'Excluir', perigo: true, aoConfirmar: () => mudar(O.excluirNome(c, n.n), `Excluir nome ${n.n}`) })} />
      )}
      {janela && janela.tipo === 'origem' && (() => {
        const nomeAba = (id) => (c.abas[id] ? c.abas[id].nome : '?');
        const de = motor.precedentes(abaId, sel.ativa.l, sel.ativa.c).map((d) => {
          const tx = textoFaixa(normalFaixa(d));
          const titulo = d.abaId === abaId && d.l1 === d.l2 ? tituloCols.mapa.get(d.c1) : null;
          const v = d.l1 === d.l2 && d.c1 === d.c2 ? formatar(motor.valor(d.abaId, d.l1, d.c1), estiloDe(c, c.abas[d.abaId].cel[chave(d.l1, d.c1)]).nf).t : `${(d.l2 - d.l1 + 1) * (d.c2 - d.c1 + 1) > 1e6 ? 'coluna inteira' : (d.l2 - d.l1 + 1) * (d.c2 - d.c1 + 1) + ' células'}`;
          return { abaId: d.abaId, l1: d.l1, c1: d.c1, l2: d.l2, c2: d.c2, rotulo: (d.abaId !== abaId ? nomeAba(d.abaId) + '!' : '') + tx + (titulo ? ` ‹${titulo}›` : ''), detalhe: v };
        });
        const para = motor.dependentes(abaId, sel.ativa.l, sel.ativa.c).map((d) => {
          const fm = motor.formula(d.abaId, d.l, d.c);
          return { abaId: d.abaId, l: d.l, c: d.c, rotulo: (d.abaId !== abaId ? nomeAba(d.abaId) + '!' : '') + chave(d.l, d.c), detalhe: fm ? '=' + paraMostrar(fm.f) : '' };
        });
        return <JanelaOrigem titulo={'De onde vem / quem usa · ' + chave(sel.ativa.l, sel.ativa.c)} nomeCel={chave(sel.ativa.l, sel.ativa.c)} de={de} para={para} aoIr={(x) => irPara(x)} aoFluxo={() => setJanela({ tipo: 'fluxo' })} aoFechar={() => setJanela(null)} />;
      })()}
      {janela && janela.tipo === 'explicar' && (() => {
        const k = chave(sel.ativa.l, sel.ativa.c);
        const dados = explicarConta(motor, c, abaId, sel.ativa.l, sel.ativa.c, tituloDe);
        const causa = dados ? causaDaConta(motor, c, abaId, sel.ativa.l, sel.ativa.c, tituloDe) : null;
        return (
          <JanelaExplicar key={abaId + k + (dados ? dados.formula : '')} nomeCel={k} dados={dados} causa={causa} somenteLeitura={somenteLeitura}
            titulo={(v) => (v.aba == null ? tituloDe(abaId, v.l, v.c) : null)} aoAcao={fazerAcao}
            aoAplicar={(t) => gravarFormula(t, { rotulo: `Editar a fórmula de ${k}` })}
            aoFluxo={() => setJanela({ tipo: 'fluxo' })} aoMontar={() => setJanela({ tipo: 'montar' })} aoFechar={() => setJanela(null)} />
        );
      })()}
      {janela && janela.tipo === 'fluxo' && (() => {
        const k = chave(sel.ativa.l, sel.ativa.c);
        const grafo = grafoDaConta(motor, c, abaId, sel.ativa.l, sel.ativa.c, tituloDe);
        return (
          <JanelaFluxo nomeCel={k} grafo={grafo} somenteLeitura={somenteLeitura} aoFechar={() => setJanela(null)}
            aoIr={(n) => { setJanela(null); irPara({ abaId: n.abaId, l1: n.l1, c1: n.c1, l2: n.l2, c2: n.c2 }); }}
            aoQuadro={() => { setJanela(null); cx.criarCom && cx.criarCom('postits', `Conta de ${k} - ${ficha.nome}`.slice(0, 120), quadroDaConta(grafo, k, ficha.nome)); }} />
        );
      })()}
      {janela && janela.tipo === 'montar' && (() => {
        const k = chave(sel.ativa.l, sel.ativa.c);
        const x = aba.cel[k];
        return (
          <JanelaMontar nomeCel={k} ocupada={!!(x && (x.v !== undefined || x.f != null))} colunas={colunasComTitulo()}
            amostras={amostrasDaPlanilha()} valorCel={valorDoEndereco}
            previa={(t, nf) => {
              const r = motor.previa(t, abaId, sel.ativa.l, sel.ativa.c);
              if (r.erro) return 'a conta ainda não está completa';
              if (r.circular) return '0 (conta circular: a célula usaria ela mesma)';
              /* no máximo 4 casas depois da vírgula na prévia (1,1667 e não 1,166666667) */
              let v = r.valor;
              if (typeof v === 'number' && Number.isFinite(v) && !Number.isInteger(v) && (!nf || /^general$/i.test(nf))) v = Math.round(v * 1e4) / 1e4;
              return (formatar(v, nf || 'General').t || '(vazio)') + (r.matriz ? ` · derrama em ${r.matriz.linhas} × ${r.matriz.colunas} células` : '');
            }}
            aoPor={(t, nf) => gravarFormula(t, { nf, rotulo: `Montar a conta em ${k}` })} aoFechar={() => setJanela(null)} />
        );
      })()}
      {janela && janela.tipo === 'localizar' && (
        <JanelaLocalizar somenteLeitura={somenteLeitura} aoFechar={() => setJanela(null)}
          aoAchar={(q) => {
            const ql = q.toLowerCase();
            const lista = [];
            for (const id of c.ordem) for (const k of Object.keys(c.abas[id].cel)) {
              const p = lerChave(k); if (!p) continue;
              const x = c.abas[id].cel[k];
              const t = (x.f != null ? '=' + paraMostrar(x.f) + ' ' : '') + textoCelula(motor, c, id, p.l, p.c).t;
              if (t.toLowerCase().includes(ql)) lista.push({ id, ...p });
            }
            if (!lista.length) return `Nada encontrado para "${q}".`;
            const ordem = new Map(c.ordem.map((id, i) => [id, i]));
            lista.sort((a, b) => ordem.get(a.id) - ordem.get(b.id) || a.l - b.l || a.c - b.c);
            const atualIdx = ordem.get(abaId);
            const prox = lista.find((x) => ordem.get(x.id) > atualIdx || (x.id === abaId && (x.l > sel.ativa.l || (x.l === sel.ativa.l && x.c > sel.ativa.c)))) || lista[0];
            irPara({ abaId: prox.id, l: prox.l, c: prox.c }, false);
            return `${lista.length} ${lista.length === 1 ? 'célula encontrada' : 'células encontradas'}. Mostrando ${c.abas[prox.id].nome}!${chave(prox.l, prox.c)}.`;
          }}
          aoSubstituir={(q, novo) => {
            const lote = new O.Lote(c);
            let n = 0;
            const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            for (const id of c.ordem) for (const k of Object.keys(c.abas[id].cel)) {
              const x = c.abas[id].cel[k];
              if (typeof x.v === 'string' && rx.test(x.v)) { lote.por(id, k, { ...x, v: x.v.replace(rx, novo) }); n++; }
              rx.lastIndex = 0;
            }
            if (!n) return `Nada para trocar (só textos digitados são trocados; fórmulas ficam como estão).`;
            aplicarLote(lote, `Substituir ${n} ${n === 1 ? 'célula' : 'células'}`);
            return `${n} ${n === 1 ? 'troca feita' : 'trocas feitas'}. Ctrl+Z desfaz.`;
          }} />
      )}
      {janela && janela.tipo === 'zoom' && (
        <JanelaZoomPl z={z} aoEscolher={(v) => { setZ(v); setJanela(null); }} aoFechar={() => setJanela(null)} />
      )}
      {arrasto && (arrasto.tipo === 'largura' || arrasto.tipo === 'altura') && (
        <div className="pl-medida" style={arrasto.tipo === 'largura' ? { left: G.xDe(arrasto.c) + 8, top: 4 } : { left: 50, top: G.yDe(arrasto.l) + 4 }}>
          {arrasto.tipo === 'largura' ? `Largura: ${arrasto.w ?? arrasto.w0} px` : `Altura: ${arrasto.h ?? arrasto.h0} px`}
        </div>
      )}
      {temSelMulti && null}
    </div>
  );
}

function JanelaZoomPl({ z, aoEscolher, aoFechar }) {
  return (
    <Janela titulo="Zoom" aoFechar={aoFechar}>
      <div className="janela-c">
        <div className="chips">
          {[50, 75, 90, 100, 125, 150, 200].map((p) => <button key={p} type="button" className={'chipb' + (Math.round(z * 100) === p ? ' on' : '')} onClick={() => aoEscolher(p / 100)}>{p}%</button>)}
        </div>
        <p className="qd-dica">No computador: Ctrl + roda do mouse.</p>
      </div>
    </Janela>
  );
}
