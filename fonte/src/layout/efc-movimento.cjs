/* EFC · movimento — a pequena orquestração das receitas de efc-movimento.css (mesmo arquivo para toda a família).
   Lê as durações das variáveis CSS, para que mudar um token mude o app inteiro. Versão 1 (13/11/2026). */
const Mov = (() => {
  const raiz = () => getComputedStyle(document.documentElement);
  const ms = (nome, pad) => { const v = raiz().getPropertyValue(nome).trim(); const n = parseFloat(v); if (!Number.isFinite(n)) return pad; return /ms$/.test(v) ? n : /s$/.test(v) ? n * 1000 : n; };
  const reduzido = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
  /* abre uma superfície (.t-dropdown, .t-modal, .t-gaveta, .t-folha, .t-toast, .t-fundo) */
  function abre(el) { if (!el) return; el.classList.remove('is-closing'); void el.offsetWidth; el.classList.add('is-open'); }
  /* fecha e só chama "depois" quando a animação de saída terminou (limpa o is-closing: a próxima abertura não pula) */
  function fecha(el, depois, token) {
    if (!el) { if (depois) depois(); return; }
    const t = reduzido() ? 0 : ms(token || '--dropdown-close-dur', 150);
    el.classList.remove('is-open'); el.classList.add('is-closing');
    setTimeout(() => { el.classList.remove('is-closing'); if (depois) depois(); }, t);
  }
  /* tremida de erro, uma vez, repetível */
  function treme(el) { if (!el || reduzido()) return; el.classList.add('t-shake'); el.classList.remove('is-shaking'); void el.offsetWidth; el.classList.add('is-shaking');
    setTimeout(() => el.classList.remove('is-shaking'), ms('--shake-dur-a', 80) * 2 + ms('--shake-dur-b', 60) * 2 + 20); }
  /* número que mudou: só os dígitos que mudaram sobem ou descem */
  function numero(el, novo) {
    if (!el) return; const ant = el.getAttribute('data-valor'); const txt = String(novo); el.setAttribute('data-valor', txt); el.setAttribute('aria-label', txt);
    if (ant == null || ant === txt || reduzido()) { el.textContent = txt; return; }
    const a = Number(String(ant).replace(/\D/g, '')), b = Number(txt.replace(/\D/g, '')), mesmo = ant.length === txt.length;
    el.classList.add('t-subtle-number'); el.style.setProperty('--subtle-dir', b >= a ? '1' : '-1'); el.classList.remove('is-animating'); el.replaceChildren();
    [...txt].forEach((c, i) => { if (mesmo && ant[i] === c) { el.append(c); return; }
      const s = document.createElement('span'); s.className = 't-subtle-slot';
      if (mesmo) { const o = document.createElement('span'); o.className = 't-subtle-old'; o.setAttribute('aria-hidden', 'true'); o.textContent = ant[i]; s.appendChild(o); }
      const f = document.createElement('span'); f.className = 't-subtle-new'; f.textContent = c; s.appendChild(f); el.appendChild(s); });
    void el.offsetHeight; el.classList.add('is-animating');
  }
  /* traço da aba: põe a linha embaixo da aba ativa; na primeira vez, sem animar */
  function linhaAba(barra, ativa, semAnimar) {
    if (!barra || !ativa) return; let l = barra.querySelector('.t-abas-linha');
    if (!l) { l = document.createElement('span'); l.className = 't-abas-linha'; l.setAttribute('aria-hidden', 'true'); barra.appendChild(l); semAnimar = true; }
    if (semAnimar) l.style.transition = 'none';
    l.style.width = ativa.offsetWidth + 'px'; l.style.transform = 'translateX(' + ativa.offsetLeft + 'px)';
    if (semAnimar) { void l.offsetWidth; l.style.transition = ''; }
  }
  /* visto de "salvo": mede o traço e desenha uma vez */
  function visto(el) { if (!el) return; const p = el.querySelector('path'); if (p && p.getTotalLength) el.style.setProperty('--check-len', Math.ceil(p.getTotalLength())); el.setAttribute('data-state', 'out'); void el.offsetWidth; el.setAttribute('data-state', 'in'); }
  return { ms, reduzido, abre, fecha, treme, numero, linhaAba, visto };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Mov;
