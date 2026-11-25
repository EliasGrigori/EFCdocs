/* Vértice Docs · Quadro · R44 parte 1 (v0.6.68): o fluxo ligado ao Kanban, com quem iniciou e quem concluiu.
   - Ligar o fluxo: cada caixa de atividade do fluxo (tipo "processo") vira um cartão do Kanban; as que ainda não têm
     coluna entram na primeira ("A fazer"), na ordem do código. Post-its continuam como antes.
   - Andamento: só nos arquivos que estão em Documentos internos (ficha.pastaNome). Sair da primeira coluna grava quem
     iniciou (it.ini); chegar na última grava quem concluiu (it.fim). Voltar para a primeira apaga os dois; sair da
     última para o meio apaga só o "concluiu". Os dois ficam no próprio item: { q: quem, em: data ISO }.
   - "Quem", enquanto não há login: o nome usado nos comentários deste aparelho; sem ele, o perfil deste aparelho.
   Parte sem tela (testada no node); a tela fica no Kanban.jsx e no partes.jsx. */
import { noKanban, proximaOrdemKanban, listaItens, marcaValida } from './modelo.js';
import { autorGuardado, dataCurta } from './comentario.js';

export const fluxoLigado = (c) => !!c && c.fluxoKanban === true;
export const atividadesDoFluxo = (c) => listaItens(c).filter((it) => it.tipo === 'processo');

/** A coluna em que o item aparece no Kanban (coluna que não existe conta como a primeira). */
export function colunaEfetiva(c, it) {
  if (!c.colunas.length) return null;
  return c.colunas.some((k) => k.id === it.col) ? it.col : c.colunas[0].id;
}

/** Mudanças para ligar (true) ou desligar (false) o fluxo ao Kanban. Ligar põe as atividades sem coluna na primeira. */
export function mudancasLigarFluxo(c, ligar) {
  const mud = { fluxoKanban: !!ligar };
  if (!ligar || !c.colunas.length) return mud;
  const primeira = c.colunas[0].id;
  const sem = atividadesDoFluxo(c).filter((it) => !c.colunas.some((k) => k.id === it.col))
    .sort((a, b) => (a.cod || '').localeCompare(b.cod || '') || a.y - b.y || a.x - b.x);
  let ko = proximaOrdemKanban({ ...c, fluxoKanban: true }, primeira); /* conta as atividades que já estão na primeira */
  for (const it of sem) { const n = { ...it, col: primeira, ko: ko++ }; delete n.ini; delete n.fim; mud['itens.' + it.id] = n; } /* volta para "A fazer": sem andamento */
  return mud;
}

/** Quem está mexendo neste aparelho. */
export function quemAgora(perfilNome) {
  const a = String(autorGuardado() || '').trim();
  return (a || String(perfilNome || '').trim() || 'Neste aparelho').slice(0, 60);
}

/** Acrescenta às mudanças o "quem iniciou" e o "quem concluiu" de cada item que mudou de coluna.
    rastrear = o arquivo está em Documentos internos. Sem rastrear, nada é gravado (o que já existe fica). */
export function registrarAndamento(c, mud, { rastrear, quem, agora = new Date() } = {}) {
  if (!mud || !c || !c.colunas || c.colunas.length < 2) return mud;
  const c2 = { ...c, fluxoKanban: 'fluxoKanban' in mud ? mud.fluxoKanban === true : c.fluxoKanban };
  const primeira = c.colunas[0].id, ultima = c.colunas[c.colunas.length - 1].id;
  const marca = { q: String(quem || '').trim().slice(0, 60), em: agora.toISOString() };
  let saida = mud;
  for (const [k, novo] of Object.entries(mud)) {
    if (!k.startsWith('itens.') || !novo || typeof novo !== 'object') continue;
    const id = k.slice(6), velho = c.itens[id];
    if (!noKanban(c2, novo)) continue;
    const para = colunaEfetiva(c, novo);
    if (!velho) { /* item novo (criado ou colado): começa sem andamento; criar ou colar não é iniciar nem concluir */
      if ('ini' in novo || 'fim' in novo) { const n = { ...novo }; delete n.ini; delete n.fim; saida = { ...saida, [k]: n }; }
      continue;
    }
    if (!rastrear || colunaEfetiva(c, velho) === para) continue;
    const n = { ...novo };
    if (para === primeira) { delete n.ini; delete n.fim; } else {
      if (!marcaValida(n.ini)) n.ini = marca;
      if (para === ultima) n.fim = marca; else delete n.fim;
    }
    saida = { ...saida, [k]: n };
  }
  return saida;
}

/** As linhas do cartão: "Iniciado por ... · data" e "Concluído por ... · data" (só o que existe). */
export function linhasAndamento(it) {
  const out = [];
  const ini = marcaValida(it && it.ini), fim = marcaValida(it && it.fim);
  if (ini) out.push({ tipo: 'ini', texto: 'Iniciado por ' + (ini.q || 'alguém') + ' · ' + dataCurta(ini.em) });
  if (fim) out.push({ tipo: 'fim', texto: 'Concluído por ' + (fim.q || 'alguém') + ' · ' + dataCurta(fim.em) });
  return out;
}

/** A situação da atividade no fluxo (selo embaixo da caixa): nome da coluna e se está na primeira, no meio ou feita. */
export function situacaoNoFluxo(c, it) {
  if (!fluxoLigado(c) || !it || it.tipo !== 'processo' || !c.colunas.length) return null;
  const col = colunaEfetiva(c, it), i = c.colunas.findIndex((k) => k.id === col);
  const fase = c.colunas.length > 1 && i === c.colunas.length - 1 ? 'feito' : i === 0 ? 'afazer' : 'andamento';
  return { nome: c.colunas[i].nome, fase };
}

/* Para o desenho da caixa no quadro (partes.jsx não recebe o quadro): o Quadro.jsx lembra o conteúdo atual aqui. */
let atual = null;
export const lembrarFluxo = (c) => { atual = c; };
export const situacaoAgora = (it) => (atual ? situacaoNoFluxo(atual, it) : null);
