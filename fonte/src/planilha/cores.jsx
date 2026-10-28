/* EFCdocs v0.6.0 — painel de cores (estilo Camadas), usado em Cor de preenchimento, Cor da fonte, Cor da aba
   e na Formatação condicional. Seis módulos aprovados pelo Elias (E2):
   1. Desta planilha (cores que o arquivo já usa, em ordem de tom)   2. Recentes (últimas 10 no aparelho)
   3. Pegar de uma célula (conta-gotas na grade)                     4. Copiar o código da cor
   5. Trocar na aba toda (só nas janelas de célula)                  6. Aviso de leitura (contraste da letra com o fundo) */
import { useState } from 'react';
import { Icone } from '../ui/comum.jsx';
import { estiloDe } from './modelo.js';

export const CORES_PALETA = [
  ['#000000', 'Preto'], ['#595959', 'Cinza escuro'], ['#7f7f7f', 'Cinza'], ['#c00000', 'Vermelho escuro'], ['#ff0000', 'Vermelho'],
  ['#ffc000', 'Laranja'], ['#ffff00', 'Amarelo'], ['#92d050', 'Verde claro'], ['#00b050', 'Verde'], ['#00b0f0', 'Azul claro'],
  ['#0070c0', 'Azul'], ['#002060', 'Azul escuro'], ['#7030a0', 'Roxo'],
  ['#f2f2f2', 'Cinza bem claro'], ['#d9d9d9', 'Cinza claro'], ['#fce4d6', 'Pêssego'], ['#fff2cc', 'Amarelo claro'],
  ['#e2efda', 'Verde bem claro'], ['#ddebf7', 'Azul bem claro'], ['#ede7f6', 'Lilás'], ['#ffc7ce', 'Rosa (não conforme)'], ['#c6efce', 'Verde (conforme)'], ['#ffeb9c', 'Amarelo (atenção)'],
];

const CHAVE_RECENTES = 'efcdocs:cores-recentes';
const ehHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const norm = (v) => (ehHex(v) ? v.toLowerCase() : null);

export function lerRecentes() {
  try { const v = JSON.parse(localStorage.getItem(CHAVE_RECENTES) || '[]'); return Array.isArray(v) ? v.filter(ehHex).slice(0, 10) : []; } catch { return []; }
}
export function lembrarCor(hex) {
  const h = norm(hex);
  if (!h) return;
  try { localStorage.setItem(CHAVE_RECENTES, JSON.stringify([h, ...lerRecentes().filter((x) => x !== h)].slice(0, 10))); } catch { /* aparelho sem armazenamento */ }
}

/* ---------- contas de cor ---------- */
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lum(hex) {
  const c = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = rgb(hex);
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}
/** Contraste entre duas cores (1 a 21), como nas regras de acessibilidade (4,5 = leitura boa). */
export function contraste(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function matiz(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  const l = (mx + mn) / 2;
  if (d < 0.04) return [999, l]; // cinzas no fim, do claro ao escuro
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, l];
}
/** Cores que a planilha já usa (preenchimento, letra, cor das abas e regras de cor), em ordem de tom. */
export function coresDaPlanilha(c) {
  const s = new Set();
  for (const e of (c && c.estilos) || []) { if (e && norm(e.fundo)) s.add(norm(e.fundo)); if (e && norm(e.cor)) s.add(norm(e.cor)); }
  for (const id of (c && c.ordem) || []) {
    const a = c.abas[id];
    if (norm(a.cor)) s.add(norm(a.cor));
    for (const r of a.cf || []) { if (r.e && norm(r.e.fundo)) s.add(norm(r.e.fundo)); if (r.e && norm(r.e.cor)) s.add(norm(r.e.cor)); }
  }
  return [...s].sort((a, b) => { const [ha, la] = matiz(a), [hb, lb] = matiz(b); return ha - hb || lb - la; }).slice(0, 40);
}
/** Troca uma cor por outra em todas as células da aba (preenchimento ou letra). Devolve quantas mudaram. */
export function trocarCorNaAba(O, c, abaId, campo, de, para) {
  const aba = c.abas[abaId];
  const lote = new O.Lote(c);
  const alvo = norm(de);
  let n = 0;
  for (const k of Object.keys(aba.cel || {})) {
    const cel = lote.pegar(abaId, k) || {};
    const e = estiloDe({ estilos: lote.estilos }, cel);
    const atual = norm(e[campo]);
    if (alvo ? atual !== alvo : atual) continue;
    const novo = { ...e };
    if (para) novo[campo] = para; else delete novo[campo];
    const st = lote.estilo(novo);
    const nc = { ...cel };
    if (st) nc.s = st; else delete nc.s;
    lote.por(abaId, k, nc);
    n++;
  }
  return { lote, n };
}

/* ---------- a peça ---------- */
/**
 * valor: cor atual (hex ou vazio) · aoMudar(hex|undefined) · semCor: texto do botão "sem cor"
 * cores: coresDaPlanilha(c) · aoPegar(): Promise<hex|null> (conta-gotas na grade)
 * leitura: { letra } ou { fundo } para o aviso de leitura · trocar: { de, rotulo } liga "Trocar na aba toda"
 */
export function PainelCores({ rotulo, valor, aoMudar, semCor = 'Sem cor', cores = [], aoPegar, leitura, trocar, aoTrocar }) {
  const [aba, setAba] = useState('tema');
  const [recentes, setRecentes] = useState(lerRecentes);
  const [codigo, setCodigo] = useState(valor || '');
  const [aviso, setAviso] = useState('');
  const [trocarTudo, setTrocarTudo] = useState(false);
  const escolher = (hex) => {
    const h = norm(hex) || undefined;
    if (h) { lembrarCor(h); setRecentes(lerRecentes()); }
    setCodigo(h || '');
    if (trocarTudo && aoTrocar) aoTrocar(h); else aoMudar(h);
  };
  const copiar = async (hex) => {
    const h = (hex || '').toUpperCase();
    if (!ehHex(h)) return;
    setAviso(`${h} copiado`);
    setTimeout(() => setAviso(''), 2200);
    try { await navigator.clipboard.writeText(h); } catch { setAviso(`Código: ${h} (copie com Ctrl+C)`); }
  };
  const pegar = async () => {
    if (!aoPegar) return;
    const h = await aoPegar();
    if (h) escolher(h); else setAviso('A célula não tem essa cor');
  };
  const lista = aba === 'doc' ? cores.map((h) => [h, h.toUpperCase()]) : aba === 'rec' ? recentes.map((h) => [h, h.toUpperCase()]) : CORES_PALETA;
  const atual = norm(valor);
  /* aviso de leitura */
  let ler = null;
  if (leitura && atual) {
    const fundo = 'letra' in leitura ? atual : norm(leitura.fundo) || '#ffffff';
    const letra = 'letra' in leitura ? norm(leitura.letra) || '#000000' : atual;
    const r = contraste(fundo, letra);
    ler = { bom: r >= 4.5, t: r >= 4.5 ? `Leitura boa (${r.toFixed(1).replace('.', ',')}:1)` : `Leitura fraca (${r.toFixed(1).replace('.', ',')}:1): use uma ${'letra' in leitura ? 'letra mais escura ou um fundo mais claro' : 'letra mais escura'}` };
  }
  return (
    <div className="cr-painel" role="group" aria-label={rotulo || 'Cores'} data-cores>
      {rotulo && <span className="cr-rot">{rotulo}</span>}
      <div className="cr-abas" role="tablist">
        {[['tema', 'Paleta'], ['doc', 'Desta planilha'], ['rec', 'Recentes']].map(([k, t]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} className={aba === k ? 'on' : ''} data-cr-aba={k} onClick={() => setAba(k)}>{t}</button>
        ))}
      </div>
      <button type="button" className={'cr-sem' + (!atual ? ' on' : '')} onClick={() => escolher(undefined)}>{semCor}</button>
      {lista.length ? (
        <div className="cr-amostras">
          {lista.map(([hex, nome]) => (
            <span key={hex} className="cr-am-c">
              <button type="button" className={'cr-am' + (atual === hex.toLowerCase() ? ' on' : '')} title={nome} aria-label={nome} aria-pressed={atual === hex.toLowerCase()} style={{ background: hex }} data-cor={hex.toLowerCase()} onClick={() => escolher(hex)} />
              <button type="button" className="cr-cp" title={'Copiar ' + hex.toUpperCase()} aria-label={'Copiar o código ' + hex.toUpperCase()} data-cr-copiar onClick={() => copiar(hex)}><Icone n="copiar" /></button>
            </span>
          ))}
        </div>
      ) : <p className="cr-vazio">{aba === 'rec' ? 'As cores que você usar aparecem aqui.' : 'Esta planilha ainda não tem cores.'}</p>}
      <div className="cr-ferr">
        {aoPegar && <button type="button" className="btn sm cr-btn" data-cr-pegar onClick={pegar}><Icone n="contagotas" />Pegar de uma célula</button>}
        <span className="cr-hex">
          <input value={codigo} maxLength={7} placeholder="#RRGGBB" aria-label="Código da cor" data-cr-hex spellCheck={false}
            onChange={(ev) => setCodigo(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') { ev.preventDefault(); if (ehHex(codigo.trim())) escolher(codigo.trim()); } }}
            onBlur={() => { if (ehHex(codigo.trim()) && norm(codigo.trim()) !== atual) escolher(codigo.trim()); }} />
          <button type="button" className="btn sm cr-btn" title="Copiar o código" disabled={!ehHex(codigo.trim())} onClick={() => copiar(codigo.trim())}><Icone n="copiar" />Copiar</button>
          <label className="cr-livre" title="Escolher qualquer cor"><Icone n="cor" /><input type="color" value={atual || '#ffffff'} aria-label="Outra cor" onChange={(ev) => escolher(ev.target.value)} /></label>
        </span>
      </div>
      {trocar && aoTrocar && (
        <label className="cr-trocar">
          <input type="checkbox" checked={trocarTudo} onChange={(ev) => { const x = ev.target.checked; setTrocarTudo(x); (x ? aoTrocar : aoMudar)(atual || undefined); }} data-cr-trocar />
          <Icone n="trocarCor" /><span>Trocar na aba toda: as células com {trocar.de ? <i className="cr-mini" style={{ background: trocar.de }} /> : null}<b>{trocar.rotulo}</b> recebem a cor escolhida</span>
        </label>
      )}
      {ler && <span className={'cr-ler ' + (ler.bom ? 'bom' : 'fraca')} data-cr-leitura={ler.bom ? 'boa' : 'fraca'}>{ler.t}</span>}
      <span className="cr-aviso" role="status" aria-live="polite">{aviso}</span>
    </div>
  );
}
