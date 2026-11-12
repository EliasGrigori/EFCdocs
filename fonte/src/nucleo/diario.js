/* Vértice Docs — diário de objetos grandes que mudam NO LUGAR (v0.6.12, D-16).
   Uma planilha de 360 mil células guarda as células num objeto só. Copiar esse objeto a cada tecla (como o resto do app faz,
   para o desfazer) custava o tamanho da planilha. Quem cuida de um objeto assim pede para ele ser "vigiado": daí em diante
   a troca de UMA chave (nucleo/diff.js › por) mexe no próprio objeto e anota aqui o que mudou (chave, antes, depois).
   Quem precisa saber o que mudou (motor de cálculo, índice das células) lê o diário a partir da revisão que já viu,
   em vez de comparar o objeto inteiro. O objeto de cima (a aba, o arquivo) continua sendo copiado: é por ele que a tela
   sabe que houve mudança. */

const diarios = new WeakMap();
const GUARDA = 4096; /* quantas mudanças o diário guarda; quem ficou mais para trás que isso refaz a conta do zero */

/** Passa a vigiar o objeto (se já vigia, devolve o mesmo diário). */
export function vigiar(obj) {
  let d = diarios.get(obj);
  if (!d) { d = { rev: 0, base: 0, itens: [] }; diarios.set(obj, d); }
  return d;
}

export const vigiado = (obj) => (obj && typeof obj === 'object' ? diarios.get(obj) : undefined);

/** Revisão atual do objeto vigiado (-1 se ninguém vigia). */
export const revisao = (obj) => { const d = vigiado(obj); return d ? d.rev : -1; };

/** Troca (ou apaga, com undefined) uma chave no próprio objeto e anota. Só para objeto vigiado. */
export function trocarNoLugar(obj, k, valor) {
  const d = diarios.get(obj);
  const antes = obj[k];
  if (valor === undefined) delete obj[k]; else obj[k] = valor;
  d.rev++;
  d.itens.push({ k, a: antes, d: valor });
  if (d.itens.length > GUARDA * 2) { d.itens.splice(0, d.itens.length - GUARDA); d.base = d.rev - d.itens.length; }
  return obj;
}

/** O que mudou desde a revisão `rev`: Map chave → { a: como estava naquela revisão, d: como está agora }.
    null quando o diário já não alcança (quem chamou refaz do zero). */
export function desde(obj, rev) {
  const d = vigiado(obj);
  if (!d || rev < d.base || rev > d.rev) return null;
  const out = new Map();
  for (let i = rev - d.base; i < d.itens.length; i++) {
    const m = d.itens[i]; const ja = out.get(m.k);
    if (ja) ja.d = m.d; else out.set(m.k, { a: m.a, d: m.d });
  }
  return out;
}
