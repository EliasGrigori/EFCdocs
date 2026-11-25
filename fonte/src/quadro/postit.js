/* Vértice Docs · Quadro · título e caixinha de feito do post-it (v0.6.51; propostas 3A e 4A aprovadas em 25/11).
   - Título: campo opcional `tit` do post-it (até 80 letras, uma linha), em negrito com um fio embaixo, acima do texto.
   - Feito: a caixinha no canto de baixo é o mesmo que estar na última coluna do Kanban (Feito), que já contava como
     concluído (tarefa.js). Marcar leva para Feito e guarda a coluna de onde veio (`colAntes`); desmarcar volta para ela
     (ou para a primeira, se ela não existir mais). A caixinha aparece quando o quadro tem duas colunas ou mais e pode
     ser desligada para o quadro todo em Exibir (`conteudo.caixas === false`). */
import { mudancasMoverKanban } from './modelo.js';
import { concluida } from './tarefa.js';

export const TITULO_MAX = 80;
export const limparTitulo = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, TITULO_MAX);
export const tituloDe = (it) => (it && it.tipo === 'postit' ? limparTitulo(it.tit) : '');

/** Mudanças para pôr (ou tirar, com texto vazio) o título dos post-its escolhidos. */
export function mudancasTitulo(c, ids, titulo) {
  const t = limparTitulo(titulo), mud = {};
  for (const id of ids) {
    const it = c.itens[id];
    if (!it || it.tipo !== 'postit' || tituloDe(it) === t) continue;
    const novo = { ...it };
    if (t) novo.tit = t; else delete novo.tit;
    mud['itens.' + id] = novo;
  }
  return mud;
}

export const colunaFeito = (c) => (c.colunas && c.colunas.length > 1 ? c.colunas[c.colunas.length - 1] : null);
export const mostraCaixas = (c) => c.caixas !== false && !!colunaFeito(c);
export const estaFeito = (c, it) => !!it && it.tipo === 'postit' && concluida(c, it);

/** Mudanças para marcar (true) ou desmarcar (false) a caixinha de feito do post-it. */
export function mudancasFeito(c, id, marcar) {
  const it = c.itens[id], fim = colunaFeito(c);
  if (!it || it.tipo !== 'postit' || !fim) return {};
  if (marcar) {
    if (it.col === fim.id) return {};
    const mud = mudancasMoverKanban(c, id, fim.id);
    const de = c.colunas.some((k) => k.id === it.col) ? it.col : c.colunas[0].id;
    mud['itens.' + id] = { ...(mud['itens.' + id] || it), col: fim.id, colAntes: de };
    return mud;
  }
  if (it.col !== fim.id) return {};
  const volta = it.colAntes && it.colAntes !== fim.id && c.colunas.some((k) => k.id === it.colAntes) ? it.colAntes : c.colunas[0].id;
  const mud = mudancasMoverKanban(c, id, volta);
  const novo = { ...(mud['itens.' + id] || it), col: volta };
  delete novo.colAntes;
  mud['itens.' + id] = novo;
  return mud;
}

/** Quantas linhas de texto cabem no item (a tela corta com "…" nesse número; v0.6.52: o PDF usa a mesma conta). */
export function linhasQueCabem(it, comTarefa, comCaixa, comCod) {
  const fs = it.tipo === 'texto' && !it.borda ? 16 : 14; /* v0.6.52: o CSS do item de Texto é 16 px (era 18 nesta conta) */
  /* v0.6.51: o título ocupa 30 px em cima; a caixinha de feito, 18 px embaixo (quando não há o rodapé de tarefa) */
  /* v0.6.53 (D-82): na forma Início/Fim com código, o texto começa abaixo do código (20 px em cima) */
  const pad = it.tipo === 'postit' ? 28 + (comTarefa ? 38 : comCaixa ? 18 : 0) + (tituloDe(it) ? 30 : 0) : it.tipo === 'decisao' ? it.h * 0.44 : it.tipo === 'texto' ? 4 : it.tipo === 'inicio' && comCod ? 24 : 12;
  return Math.max(1, Math.floor((it.h - pad) / (fs * 1.3)));
}

/* ---------- PDF e imagem (desenho.js chama) ---------- */
const ALTURA_TITULO = 30;

/** Desenha o título (com o fio) e devolve quanto o texto deve descer. */
export function desenharTitulo(ctx, it, fonte) {
  const t = tituloDe(it);
  if (!t) return 0;
  ctx.save();
  ctx.font = `700 14px ${fonte}`; ctx.fillStyle = '#1f2328'; ctx.textAlign = 'left';
  let s = t;
  const larg = it.w - 24;
  while (s.length > 1 && ctx.measureText(s).width > larg) s = s.slice(0, -2) + '…';
  ctx.fillText(s, it.x + 12, it.y + 18 + 14);
  ctx.fillStyle = 'rgba(31,35,40,.16)';
  ctx.fillRect(it.x + 12, it.y + 18 + 21, it.w - 24, 1);
  ctx.restore();
  return ALTURA_TITULO;
}

/** Desenha a caixinha de feito (marcada ou não) no canto de baixo do post-it. */
export function desenharCaixa(ctx, it, feito, comTarefa) {
  const x = it.x + 9, y = it.y + it.h - (comTarefa ? 25 : 24), l = 15;
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, l, l, 4); else ctx.rect(x, y, l, l);
  ctx.fillStyle = feito ? '#2e7d4f' : 'rgba(255,255,255,.6)'; ctx.fill();
  ctx.strokeStyle = feito ? '#2e7d4f' : 'rgba(31,35,40,.45)'; ctx.stroke();
  if (feito) {
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x + 4, y + 7.8); ctx.lineTo(x + 6.6, y + 10.4); ctx.lineTo(x + 11.2, y + 4.8); ctx.stroke();
  }
  ctx.restore();
}
