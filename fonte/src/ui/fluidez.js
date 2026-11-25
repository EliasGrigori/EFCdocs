/* Vértice Docs — fluidez (v0.6.20, parte 3): a regra fixa de fluidez da família, aplicada no app inteiro.
   Modelo: fluidez.js e fluidez.css do EFCwork v0.6.15; escala e funções Mov de src/layout/efc-movimento.css/.js.
   O Vértice é feito em React e as telas somem da página na hora em que fecham. Por isso esta camada trabalha por fora,
   olhando a página: quando uma aba muda, anima o conteúdo e desliza o traço; quando uma superfície sai (menu, janela,
   gaveta, aviso), o próprio pedaço que saiu volta por um instante, só para encolher e sumir.
   Só anima transform, opacity e filter, só com durações da escala, e nada disso acontece com "movimento reduzido".
   Redesenho porque um dado mudou não anima: tudo aqui parte de troca de aba, de tela, abrir ou fechar. */
import Mov from '../layout/efc-movimento.cjs';

const SUAVE = 'cubic-bezier(.22,1,.36,1)';
const ms = (token, pad) => Mov.ms(token, pad);
const vivo = () => !Mov.reduzido();
const $$ = (s, e) => [...(e || document).querySelectorAll(s)];

/* ---------- a) abas: traço (ou pílula) que desliza e conteúdo que entra na direção da aba ---------- */
/* barra = onde ficam as abas · item = cada aba · ativo = a escolhida · modo = desenho do marcador ·
   painel(barra) = o conteúdo que troca · nome = como a lista de áreas e abas chama esta barra */
export const BARRAS = [
  { nome: 'menu', barra: '.rail', item: 'a.rn', ativo: '.active', modo: 'lado', painel: null },
  { nome: 'faixa', barra: '.tabs', item: '.tab', ativo: '.active', modo: 'baixo', painel: () => document.querySelector('.ribbon') },
  { nome: 'sub-abas dos documentos internos', barra: '.int-abas', item: '.int-aba', ativo: '.on', modo: 'baixo', painel: (b) => { const p = b.closest('.pagina'); return p && p.querySelector('.tb-fora'); } },
  { nome: 'abas da planilha', barra: '.pl-abas-l', item: '.pl-aba', ativo: '.on', modo: 'cima', painel: (b) => { const p = b.closest('.pl'); return p && p.querySelector('.pl-area'); } },
  { nome: 'visão do quadro', barra: '.qd-vistas', item: 'button', ativo: '.on', modo: 'pilula', painel: (b) => { const p = b.closest('.sup'); return p && p.querySelector('.qd-palco, .kb, .qd-area'); } },
  { nome: 'abas da janela de regras', barra: '.rg-abas', item: '.rg-aba', ativo: '.on', modo: 'baixo', painel: (b) => b.nextElementSibling },
  { nome: 'abas da janela de cores', barra: '.cr-abas', item: 'button', ativo: '.on', modo: 'pilula', painel: (b) => b.nextElementSibling },
  { nome: 'abas do editor de gráfico', barra: '.ge-abas', item: 'button', ativo: '[aria-selected=true]', modo: 'pilula', painel: (b) => b.nextElementSibling },
  { nome: 'jeitos de fazer a rubrica', barra: '.seg[role=tablist]', item: 'button', ativo: '.on', modo: 'pilula', painel: (b) => b.nextElementSibling },
];
const estado = new WeakMap(); /* barra → { indice, caixa } */

function caixaDe(barra, el) {
  return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
}
function marcador(barra, modo) {
  let m = barra.querySelector(':scope > .fz-ind');
  if (!m) { m = document.createElement('span'); m.className = 'fz-ind'; m.setAttribute('aria-hidden', 'true'); m.dataset.modo = modo; barra.appendChild(m); barra.classList.add('fz-abas'); barra.dataset.fzModo = modo; }
  return m;
}
function entra(painel, dir) {
  if (!painel || !vivo()) return;
  painel.classList.add('fz-entra');
  const a = painel.animate([{ opacity: 0, transform: `translateX(${dir * 12}px)` }, { opacity: 1, transform: 'none' }], { duration: ms('--duration-fast', 250), easing: SUAVE });
  a.id = 'fz-entra';
  const fim = () => painel.classList.remove('fz-entra');
  a.onfinish = fim; a.oncancel = fim;
}
function olhaBarra(cfg, barra) {
  const itens = $$(cfg.item, barra).filter((x) => x.offsetParent !== null || x.getClientRects().length);
  const ativa = itens.find((x) => x.matches(cfg.ativo));
  const ant = estado.get(barra);
  if (!ativa) { const m = barra.querySelector(':scope > .fz-ind'); if (m) m.style.opacity = '0'; estado.set(barra, { indice: -1, caixa: null }); return; }
  const indice = itens.indexOf(ativa), caixa = caixaDe(barra, ativa), m = marcador(barra, cfg.modo);
  m.style.opacity = '';
  m.style.left = caixa.x + 'px'; m.style.top = caixa.y + 'px'; m.style.width = caixa.w + 'px'; m.style.height = caixa.h + 'px';
  const mudou = ant && ant.indice >= 0 && ant.indice !== indice;
  if (mudou && vivo() && ant.caixa) {
    const de = ant.caixa;
    m.animate([{ transform: `translate(${de.x - caixa.x}px, ${de.y - caixa.y}px) scale(${de.w / (caixa.w || 1)}, ${de.h / (caixa.h || 1)})` }, { transform: 'none' }], { duration: ms('--tabs-dur', 250), easing: SUAVE }).id = 'fz-traco';
  }
  if (mudou && cfg.painel) entra(cfg.painel(barra), indice > ant.indice ? 1 : -1);
  estado.set(barra, { indice, caixa });
}
function olhaBarras() {
  for (const cfg of BARRAS) for (const b of $$(cfg.barra)) olhaBarra(cfg, b);
}

/* ---------- a) troca de área: o conteúdo da tela entra deslizando ---------- */
let telaAnt = null;
function olhaTela() {
  const main = document.querySelector('.wk-main'); if (!main) return;
  const el = main.firstElementChild, chave = location.hash + '|' + (el ? el.className.split(' ')[0] : '');
  if (telaAnt !== null && telaAnt !== chave) entra(el, 1);
  telaAnt = chave;
}

/* ---------- b, c, d, e) saída: o pedaço que fechou volta por um instante só para sair com movimento ---------- */
const SAIDAS = [
  { tipo: 'menu', sel: '.novo-drive-m, .pl-menu, .pl-fmenu, .ge-pop, .faixa-menu, .filtro-p, .col-menu, .pl-balao, .rb-lista', dura: '--dropdown-close-dur', pad: 150, para: () => ({ opacity: 0, transform: 'scale(.99)' }) },
  { tipo: 'janela', sel: '.fundo', dura: '--modal-close-dur', pad: 150, para: () => ({ opacity: 0 }), dentro: '.janela', paraDentro: { opacity: 0, transform: 'scale(.96)' } },
  { tipo: 'gaveta', sel: '.side, .kb-gaveta', dura: '--panel-close-dur', pad: 350, para: (el) => (el.closest('.app.cel') ? { opacity: 0.6, transform: 'translateY(100%)' } : { opacity: 0.6, transform: 'translateX(100%)', filter: 'blur(2px)' }) },
  { tipo: 'aviso', sel: '.toast', dura: '--toast-close', pad: 250, para: () => ({ opacity: 0, transform: 'translateY(16px) scale(.97)', filter: 'blur(2px)' }) },
];
function sai(no, pai, antes, s) {
  if (!vivo() || !pai || !pai.isConnected || no.dataset.fzFant) return;
  no.dataset.fzFant = s.tipo; no.setAttribute('aria-hidden', 'true'); no.inert = true; no.style.pointerEvents = 'none';
  no.getAnimations().forEach((a) => a.cancel());
  no.style.animation = 'none';
  pai.insertBefore(no, antes && antes.parentNode === pai ? antes : null);
  /* v0.6.65 (V4): a gaveta que sai flutua por cima, no mesmo lugar; o conteúdo toma o espaço na hora (antes ficava uma faixa vazia até ela sumir) */
  if (s.tipo === 'gaveta' && !no.closest('.app.cel')) { const r = no.getBoundingClientRect(); Object.assign(no.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: '0', zIndex: '40' }); }
  const dur = ms(s.dura, s.pad), tira = () => { if (no.parentNode) no.remove(); };
  const a = no.animate([{}, s.para(no)], { duration: dur, easing: SUAVE, fill: 'forwards' }); a.id = 'fz-sai';
  if (s.dentro) { const d = no.querySelector(s.dentro); if (d) { d.style.animation = 'none'; d.animate([{}, s.paraDentro], { duration: dur, easing: SUAVE, fill: 'forwards' }); } }
  a.onfinish = tira; a.oncancel = tira; setTimeout(tira, dur + 80);
}

/* ---------- e) aviso de sucesso: o visto se desenha; k) faíscas no botão dourado quando a ação deu certo ---------- */
let toque = null;
function faiscas() {
  const p = toque; toque = null; if (!p || Date.now() - p.t > 2500 || !vivo()) return;
  const s = document.createElement('span'); s.className = 'fz-spk'; s.setAttribute('aria-hidden', 'true'); s.style.left = p.x + 'px'; s.style.top = p.y + 'px';
  for (let i = 0; i < 8; i++) { const r = document.createElement('i'); r.style.setProperty('--r', i * 45 + 'deg'); s.appendChild(r); }
  document.body.appendChild(s); setTimeout(() => s.remove(), ms('--duration-very-slow', 500));
}
function avisoEntrou(t) {
  const v = t.querySelector('.t-success-check');
  if (v) { setTimeout(() => Mov.visto(v), 90); faiscas(); }
}

/* ---------- g) lista que aparece: itens em sequência (até o 6º) ---------- */
function sequencia(itens) {
  if (!vivo()) return;
  itens.slice(0, 12).forEach((x, i) => { x.style.setProperty('--i', i); x.classList.add('fz-li'); });
}
function gavetaEntrou(g) {
  sequencia([...$$('.gv-sit, .gv-corpo > .side-s, :scope > .side-s', g)]);
  fimLista(g.querySelector('.gv-corpo') || g);
}

/* ---------- i) desfoque no fim quando tem mais conteúdo embaixo ---------- */
function fimLista(c) { if (c && c.classList) c.classList.toggle('fz-mais', c.scrollHeight - c.scrollTop - c.clientHeight > 6); }
const ROLA_FIM = '.gv-corpo, .side, .rail';

/* ---------- h) erro de formulário: tremida curta só na mensagem ---------- */
function erroMudou(el) { if (el && el.textContent.trim()) Mov.treme(el); }

/* ---------- f) filtro, busca e paleta: o resultado troca suave, as linhas não pulam ---------- */
function resultadoSuave(alvo) {
  if (!alvo || !vivo()) return;
  alvo.getAnimations().filter((a) => a.id === 'fz-troca').forEach((a) => a.cancel());
  alvo.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: ms('--duration-quick', 150), easing: 'ease-out' }).id = 'fz-troca';
}
function aoDigitar(ev) {
  const t = ev.target; if (!t || !t.closest) return;
  if (t.closest('.paleta')) {
    /* R12: a caixa da paleta muda de altura suave (peça da família: classe efl-altura-suave) e o resultado troca leve */
    const cx = t.closest('.paleta'), h0 = cx.offsetHeight;
    requestAnimationFrame(() => {
      resultadoSuave(cx.querySelector('ul, .nada'));
      if (!vivo()) return; const h1 = cx.offsetHeight; if (Math.abs(h1 - h0) < 2) return;
      cx.classList.add('efl-altura-suave'); cx.style.height = h0 + 'px'; void cx.offsetHeight; cx.style.height = h1 + 'px';
      clearTimeout(cx._fzAlt); cx._fzAlt = setTimeout(() => { cx.style.height = ''; cx.classList.remove('efl-altura-suave'); }, ms('--duration-quick', 150) + 30);
    });
  }
  else if (t.closest('.filtro-p')) { const p = t.closest('.pagina'); resultadoSuave(p && p.querySelector('.tb-arq tbody')); }
  /* v0.6.24: busca e caixas do menu da coluna (padrão do EFCwork) trocam a tabela suave, como o filtro antigo */
  else if (t.closest('.col-menu')) { const p = t.closest('.pagina') || document; resultadoSuave(p.querySelector('.tb-arq tbody')); }
  else if (t.closest('.pl-fmenu')) resultadoSuave(t.closest('.pl-fmenu').querySelector('.pl-fm-lista, ul'));
}

/* ---------- a instalação: um observador só para a página inteira ---------- */
let instalado = false;
export function instalarFluidez() {
  if (instalado || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  instalado = true;
  let marcado = false;
  const depois = () => { if (marcado) return; marcado = true; requestAnimationFrame(() => { marcado = false; try { olhaTela(); olhaBarras(); } catch (e) { console.error(e); } }); };
  new MutationObserver((lista) => {
    let olhar = false;
    for (const m of lista) {
      if (m.type === 'attributes') { if (!m.target.classList.contains('fz-ind') && !m.target.dataset.fzFant) olhar = true; continue; }
      if (m.type === 'characterData') { const e = m.target.parentElement; if (e && e.matches('.erro-t, [role=alert]')) erroMudou(e); continue; }
      for (const no of m.removedNodes) {
        if (no.nodeType !== 1 || no.dataset.fzFant) continue;
        const s = SAIDAS.find((x) => no.matches(x.sel));
        if (s) sai(no, m.target, m.nextSibling, s);
        olhar = true;
      }
      for (const no of m.addedNodes) {
        if (no.nodeType === 3) { const e = no.parentElement; if (e && e.matches('.erro-t, [role=alert]')) erroMudou(e); continue; }
        if (no.nodeType !== 1 || no.dataset.fzFant || no.classList.contains('fz-ind') || no.classList.contains('fz-spk')) continue;
        olhar = true;
        if (no.matches('.toast')) avisoEntrou(no);
        if (no.matches('.side')) gavetaEntrou(no);
        if (no.matches('.fundo') && no.querySelector('.paleta')) sequencia($$('.paleta li', no));
        if (no.matches('.novo-drive-m, .faixa-menu, .rb-lista')) sequencia($$(':scope > button, :scope > [role=menuitem]', no));
      }
    }
    if (olhar) depois();
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'aria-selected'] });
  addEventListener('hashchange', depois);
  addEventListener('resize', depois);
  document.addEventListener('input', aoDigitar, true);
  document.addEventListener('scroll', (e) => { const c = e.target; if (c && c.matches && c.matches(ROLA_FIM)) fimLista(c); }, true);
  document.addEventListener('pointerdown', (e) => { const b = e.target.closest && e.target.closest('.btn.primary'); toque = b ? { x: e.clientX, y: e.clientY, t: Date.now() } : null; }, true);
  depois();
}
export { Mov };
