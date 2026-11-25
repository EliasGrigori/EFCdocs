/* v0.6.56: Ctrl+A em dois passos, como o Ctrl+A do Excel (primeiro a região, depois a planilha toda).
   Com itens escolhidos, o primeiro Ctrl+A escolhe tudo o que está ligado a eles por setas (em qualquer sentido, de ponta a ponta);
   se a escolha já é isso, o Ctrl+A seguinte escolhe todos os itens do quadro. Raias e Páginas (fundos) não entram. */
import { listaItens, listaSetas, ehFundo } from './modelo.js';

/** Todos os itens ligados aos escolhidos, seguindo as setas nos dois sentidos (os próprios escolhidos entram). */
export function ligadosA(c, ids) {
  const viz = new Map();
  for (const s of listaSetas(c)) {
    const a = s.de && s.de.id, b = s.para && s.para.id;
    if (!c.itens[a] || !c.itens[b]) continue;
    if (!viz.has(a)) viz.set(a, []); if (!viz.has(b)) viz.set(b, []);
    viz.get(a).push(b); viz.get(b).push(a);
  }
  const vistos = new Set(ids.filter((id) => c.itens[id]));
  const fila = [...vistos];
  while (fila.length) for (const v of viz.get(fila.shift()) || []) if (!vistos.has(v)) { vistos.add(v); fila.push(v); }
  return [...vistos].filter((id) => !ehFundo(c.itens[id]));
}

/** O que o Ctrl+A escolhe agora, a partir do que está escolhido. */
export function proximaSelecaoTudo(c, sel = []) {
  const todos = listaItens(c).filter((i) => !ehFundo(i)).map((i) => i.id);
  const atual = sel.filter((id) => c.itens[id] && !ehFundo(c.itens[id]));
  if (!atual.length) return todos;
  const regiao = ligadosA(c, atual);
  const igual = regiao.length === atual.length && regiao.every((id) => atual.includes(id));
  return igual ? todos : regiao;
}
