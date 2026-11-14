/* Vértice Docs — os números e textos de uma faixa do livro, para os gráficos que vieram do Excel (v0.6.1; arquivo próprio desde a v0.6.18). */
import { faixasDe } from '../regras.js';
import { letraCol } from '../ref.js';
import { formatar } from '../formato.js';
import { estiloDe } from '../modelo.js';

/** ref → { num:[...], txt:[...] } lido do livro (pulando linhas/colunas ocultas, como o Excel). */
export function lerFaixaDoLivro(c, motor, abaDoGrafico, ocultosTambem = false) {
  return (ref) => {
    if (!ref || typeof ref !== 'object') return null;
    const id = ref.aba || abaDoGrafico;
    const A = c.abas[id];
    const fs = faixasDe(ref.fx || '');
    if (!A || !fs.length) return null;
    const f = fs[0];
    if ((f.l2 - f.l1 + 1) * (f.c2 - f.c1 + 1) > 20000) return null;
    const num = [], txt = [];
    for (let l = f.l1; l <= f.l2; l++) {
      if (!ocultosTambem && A.ocL && A.ocL[l] && f.l2 > f.l1) continue;
      for (let cc = f.c1; cc <= f.c2; cc++) {
        if (!ocultosTambem && A.ocC && A.ocC[cc] && f.c2 > f.c1) continue;
        let v; try { v = motor.valor(id, l, cc); } catch { v = null; }
        if (v && typeof v === 'object') v = null;
        num.push(typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'boolean' ? +v : null);
        const cel = A.cel && A.cel[letraCol(cc) + (l + 1)];
        let t = '';
        if (v != null && v !== '') { try { t = formatar(v, estiloDe(c, cel || {}).nf).t; } catch { t = String(v); } }
        txt.push(t);
      }
    }
    return { num, txt };
  };
}
