/* Vértice Docs · Quadro · mapa mental (v0.6.71, Q1 do relatório do Quadro, aprovada em 26/11 04:55).
   - Shift+Enter, com um cartão escolhido, cria o IRMÃO: mesmo cartão de cima (o "pai", ligado por seta até este),
     logo depois deste, e já ligado ao pai com uma seta do mesmo estilo. O Enter continua abrindo a edição, como antes.
   - A direção sai de onde o cartão está em relação ao pai: se está ao lado do pai, os irmãos descem (um embaixo do outro);
     se está embaixo do pai, os irmãos vão para a direita. Vaga ocupada: anda mais um até achar espaço.
   - Cartão sem pai não cria nada e explica (o Tab cria o próximo, ligado a este).
   Parte sem tela (testada no node). As versões Q4 (árvore, grade e recolher ramos) também moram aqui. */
import { listaSetas, listaItens, ehFundo, novoItem, novaSeta, TIPOS_ITEM, tipoDoProximo } from './modelo.js';

export const ESPACO_IRMAO = 30;
export const SEM_PAI = 'Este cartão não tem um cartão de cima ligado por seta. Use Tab para criar o próximo, já ligado a ele.';

const centro = (it) => ({ x: it.x + it.w / 2, y: it.y + it.h / 2 });

/** A seta que chega neste item vinda de outro (a primeira, pela ordem do arquivo); null se não tem. */
export function setaDoPai(c, id) {
  return listaSetas(c).find((s) => s.para.id === id && s.de.id !== id && c.itens[s.de.id] && !ehFundo(c.itens[s.de.id])) || null;
}

/** Cria o irmão do item: mesmo pai, logo depois dele, ligado ao pai. Devolve { item, seta, mudancas } ou { erro }. */
export function irmaoPasso(c, id, espaco = ESPACO_IRMAO) {
  const base = c.itens[id];
  if (!base || ehFundo(base) || base.tipo === 'legenda') return null;
  const sp = setaDoPai(c, id);
  if (!sp) return { erro: SEM_PAI };
  const pai = c.itens[sp.de.id];
  const cb = centro(base), cp = centro(pai);
  const desce = Math.abs(cb.x - cp.x) >= Math.abs(cb.y - cp.y); /* ao lado do pai: os irmãos descem */
  const tipo = tipoDoProximo(base);
  const t = TIPOS_ITEM[tipo];
  const w = base.tipo === tipo ? base.w : t.w, h = base.tipo === tipo ? base.h : t.h;
  let x = desce ? base.x : base.x + base.w + espaco;
  let y = desce ? base.y + base.h + espaco : base.y;
  const ocupado = (px, py) => listaItens(c).some((o) => !ehFundo(o) && px < o.x + o.w && px + w > o.x && py < o.y + o.h && py + h > o.y);
  for (let i = 0; i < 30 && ocupado(x, y); i++) { if (desce) y += h + espaco; else x += w + espaco; }
  const campos = { x: Math.round(x), y: Math.round(y), w, h };
  if (base.cor && base.tipo === tipo) campos.cor = base.cor;
  if (base.col && t.kanban) campos.col = base.col;
  const novo = novoItem(c, tipo, campos);
  const c2 = { ...c, seq: novo.mudancas.seq ?? c.seq, itens: { ...c.itens, [novo.item.id]: novo.item } };
  const estilo = {}; /* a seta nova copia o jeito da seta do pai (estilo e pontas), sem o rótulo */
  for (const k of ['estilo', 'pontas']) if (sp[k] !== undefined) estilo[k] = sp[k];
  const s = novaSeta(c2, pai.id, novo.item.id, estilo);
  return { item: novo.item, seta: s.seta, mudancas: { ...novo.mudancas, ...s.mudancas } };
}

/** O que o Shift+Enter, o botão Irmão da faixa e o da barra do cartão fazem (o Quadro.jsx passa o que precisa). */
export function fazerIrmao({ c, id, aplicarQ, setSel, setEditando, mostrarItem, avisar }) {
  const r = irmaoPasso(c, id);
  if (!r) return false;
  if (r.erro) { avisar(r.erro, { ic: 'info' }); return false; }
  aplicarQ(r.mudancas, 'Cartão irmão', 'criou item');
  setSel({ itens: [r.item.id], seta: null });
  setEditando({ id: r.item.id, valor: '' });
  mostrarItem(r.item);
  return true;
}
