/* Vértice Docs v0.6.66 (N1 do estudo do Kanban, aprovado em 25/11): etiqueta de frente no post-it e filtro único.
   - O quadro guarda a lista: conteudo.etiquetas = [{ id, nome, cor }] (até 20; nome até 30 letras; cor da paleta).
   - O post-it guarda só o id da etiqueta: it.fr. Etiqueta que não existe mais é tirada ao abrir (normalizar).
   - A etiqueta aparece no Quadro livre, no cartão do Kanban e no PDF; o Kanban tem um filtro único com a contagem.
   - As Raias por setor, com etiquetas no quadro, saem uma por etiqueta, com os post-its dela dentro.
   Regra sem tela (os testes de node importam daqui). */

export const CORES_ETIQUETA = ['#0f766e', '#475569', '#b7791f', '#2563eb', '#9f1239', '#6d28d9'];
export const MAX_ETIQUETAS = 20, MAX_NOME = 30;
export const SEM = ''; /* "sem etiqueta" no filtro */

const corValida = (c) => (CORES_ETIQUETA.includes(c) ? c : CORES_ETIQUETA[0]);
const nomeLimpo = (n) => String(n || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NOME);

/** Lista conferida (ao abrir o arquivo): ids únicos, nome limpo, cor da paleta. */
export function etiquetasValidas(lista) {
  if (!Array.isArray(lista)) return [];
  const vistos = new Set(), out = [];
  for (const e of lista) {
    if (!e || typeof e !== 'object') continue;
    const id = String(e.id || ''), nome = nomeLimpo(e.nome);
    if (!/^[\w-]{1,24}$/.test(id) || !nome || vistos.has(id)) continue;
    vistos.add(id); out.push({ id, nome, cor: corValida(e.cor) });
    if (out.length >= MAX_ETIQUETAS) break;
  }
  return out;
}

export const etiquetasDe = (c) => (c && Array.isArray(c.etiquetas) ? c.etiquetas : []);
export const etiquetaDo = (c, it) => (it && it.fr ? etiquetasDe(c).find((e) => e.id === it.fr) || null : null);

/** Para as telas que não recebem o quadro (a faixa e o item do Quadro livre): a lista do quadro aberto. */
let atuais = [];
export const lembrarEtiquetas = (c) => { atuais = etiquetasDe(c); };
export const etiquetasAtuais = () => atuais;
export const etiquetaPorId = (id) => (id ? atuais.find((e) => e.id === id) || null : null);

/** Mudanças para pôr (ou tirar, com '') a etiqueta nos post-its escolhidos. */
export function mudancasEtiqueta(c, ids, id) {
  const valida = !id || etiquetasDe(c).some((e) => e.id === id);
  if (!valida) return {};
  const mud = {};
  for (const i of ids) {
    const it = c.itens[i];
    if (!it || it.tipo !== 'postit' || (it.fr || '') === (id || '')) continue;
    const novo = { ...it };
    if (id) novo.fr = id; else delete novo.fr;
    mud['itens.' + i] = novo;
  }
  return mud;
}

/** Etiqueta nova (cor seguinte da paleta). Devolve { id, mudancas } ou { erro }. */
export function novaEtiqueta(c, nome) {
  const n = nomeLimpo(nome), lista = etiquetasDe(c);
  if (!n) return { erro: 'Digite um nome para a etiqueta.' };
  const igual = lista.find((e) => e.nome.toLowerCase() === n.toLowerCase());
  if (igual) return { id: igual.id, mudancas: {} };
  if (lista.length >= MAX_ETIQUETAS) return { erro: `O quadro já tem ${MAX_ETIQUETAS} etiquetas.` };
  let k = lista.length + 1; while (lista.some((e) => e.id === 'e' + k)) k++;
  const e = { id: 'e' + k, nome: n, cor: CORES_ETIQUETA[lista.length % CORES_ETIQUETA.length] };
  return { id: e.id, mudancas: { etiquetas: [...lista, e] } };
}

/** O que a faixa marca na lista Etiqueta: o id comum dos escolhidos, '' para nenhum, null para vários diferentes. */
export function valorEtiqueta(c, ids) {
  const vs = ids.map((i) => c.itens[i]).filter((it) => it && it.tipo === 'postit').map((it) => it.fr || '');
  if (!vs.length) return undefined;
  return vs.every((v) => v === vs[0]) ? vs[0] : null;
}

/** Quantos post-its de cada etiqueta (SEM = sem etiqueta). */
export function contagemEtiquetas(lista) {
  const n = { [SEM]: 0 };
  for (const it of lista) { const k = it.fr || SEM; n[k] = (n[k] || 0) + 1; }
  return n;
}

/** O cartão aparece com este filtro? (escondidas = Set de ids escondidos; vazio = todas) */
export const passaNoFiltro = (it, escondidas) => !escondidas || !escondidas.size || !escondidas.has(it.fr || SEM);

/** Resumo do botão do filtro. */
export function resumoFiltro(c, escondidas) {
  const todas = [...etiquetasDe(c).map((e) => e.id), SEM];
  const mostra = todas.filter((k) => !escondidas.has(k));
  if (mostra.length === todas.length) return 'Todas as etiquetas';
  if (!mostra.length) return 'Nenhuma etiqueta';
  return mostra.map((k) => (k === SEM ? 'Sem etiqueta' : (etiquetasDe(c).find((e) => e.id === k) || {}).nome)).join(', ');
}

/** Com o filtro ligado, a vaga conta só os cartões à vista: devolve o lugar na coluna inteira (sem o que foi arrastado). */
export function indiceNaColuna(cheia, visiveis, indice) {
  if (cheia.length === visiveis.length) return indice;
  if (indice < visiveis.length) return Math.max(0, cheia.indexOf(visiveis[indice]));
  return visiveis.length ? cheia.indexOf(visiveis[visiveis.length - 1]) + 1 : cheia.length;
}

/** Raias por setor com etiquetas: uma raia por etiqueta (na ordem da lista), com os post-its dela arrumados dentro. */
export function raiasPorEtiqueta(c, x, y, { largura = 1300, altura = 200, idCurto, menorZ } = {}) {
  const lista = etiquetasDe(c);
  if (!lista.length) return null;
  const mud = {};
  let z = menorZ(c);
  lista.forEach((e, i) => {
    const id = idCurto('r'), ry = Math.round(y + i * altura);
    mud['itens.' + id] = { id, tipo: 'raia', x: Math.round(x), y: ry, w: largura, h: altura, z: --z, texto: e.nome, cor: i % 2 ? 'branco' : 'cinza' };
    let px = Math.round(x) + 64;
    for (const it of Object.values(c.itens).filter((o) => o.tipo === 'postit' && o.fr === e.id && !o.trava)) {
      const top = ry + Math.max(10, Math.round((altura - it.h) / 2));
      mud['itens.' + it.id] = { ...it, x: px, y: top };
      px += it.w + 20;
    }
  });
  return mud;
}
