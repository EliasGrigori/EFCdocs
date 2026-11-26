/* EFCdocs — arquivos guardados no aparelho (IndexedDB "efcdocs"; demo: "efcdocs-demo").
   Cada registro: { id, ficha, pacote } — pacote é o conteúdo compactado.
   Tudo o que acontece fica anotado no histórico ("hist"). */

import { compactar, descompactar } from './compacta.js';
import { ativos } from './modelo.js';

export const LIMITE_DEMO = 3;
export const nomeBanco = (demo) => (demo ? 'efcdocs-demo' : 'efcdocs');

export function bancoNaMemoria() {
  const arquivos = new Map();
  const hist = [];
  return {
    tipo: 'memoria',
    async todos() { return [...arquivos.values()].map((r) => structuredClone(r)); },
    async um(id) { const r = arquivos.get(id); return r ? structuredClone(r) : null; },
    async por(r) { arquivos.set(r.id, structuredClone(r)); },
    async porSe(r, esperado) {
      const atual = arquivos.get(r.id);
      if (atual && esperado !== undefined && (atual.marca || null) !== (esperado || null)) return false;
      arquivos.set(r.id, structuredClone(r));
      return true;
    },
    async tira(id) { arquivos.delete(id); },
    async anota(ev) { hist.push(structuredClone(ev)); },
    async eventos() { return hist.map((e) => structuredClone(e)); },
  };
}

function bancoIndexedDB(nome) {
  let aberto = null;
  const abrir = () => aberto || (aberto = new Promise((ok, erro) => {
    const req = indexedDB.open(nome, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('arquivos')) db.createObjectStore('arquivos', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('hist')) db.createObjectStore('hist', { autoIncrement: true });
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  }));
  const tx = (loja, modo, fazer) => abrir().then((db) => new Promise((ok, erro) => {
    const t = db.transaction(loja, modo);
    const req = fazer(t.objectStore(loja));
    let resultado;
    if (req) req.onsuccess = () => { resultado = req.result; };
    t.oncomplete = () => ok(resultado);
    t.onerror = () => erro(t.error);
    t.onabort = () => erro(t.error);
  }));
  return {
    tipo: 'indexeddb',
    todos: () => tx('arquivos', 'readonly', (s) => s.getAll()),
    um: (id) => tx('arquivos', 'readonly', (s) => s.get(id)).then((r) => r || null),
    por: (r) => tx('arquivos', 'readwrite', (s) => s.put(r)),
    /* grava só se ninguém gravou no meio (outra aba): ler e gravar na mesma transação */
    porSe: (r, esperado) => abrir().then((db) => new Promise((ok, erro) => {
      const t = db.transaction('arquivos', 'readwrite');
      const s = t.objectStore('arquivos');
      let gravou = false;
      const g = s.get(r.id);
      g.onsuccess = () => {
        const atual = g.result;
        if (atual && esperado !== undefined && (atual.marca || null) !== (esperado || null)) return;
        s.put(r);
        gravou = true;
      };
      t.oncomplete = () => ok(gravou);
      t.onerror = () => erro(t.error);
      t.onabort = () => erro(t.error);
    })),
    tira: (id) => tx('arquivos', 'readwrite', (s) => s.delete(id)),
    anota: (ev) => tx('hist', 'readwrite', (s) => s.add(ev)),
    eventos: () => tx('hist', 'readonly', (s) => s.getAll()),
  };
}

function bancoPadrao(demo) {
  try {
    if (typeof indexedDB !== 'undefined' && indexedDB) return bancoIndexedDB(nomeBanco(demo));
  } catch {
    /* sem IndexedDB: fica na memória */
  }
  return bancoNaMemoria();
}

export function criarBanco({ demo = false, backend = bancoPadrao(demo), agora = () => new Date().toISOString() } = {}) {
  const anotar = (acao, ficha, extra = {}) =>
    backend.anota({ em: agora(), acao, id: ficha.id, nome: ficha.nome, tipo: ficha.tipo, ...extra });

  /* v0.6.72 (P1): número de gravação de cada arquivo (ficha.gravacao), para a nuvem saber o que é mais novo (P4).
     A última de cada arquivo fica na memória; a primeira vez lê do aparelho uma vez só. */
  const gravacoes = new Map();
  const nuvens = new Map(); /* a versão da nuvem que cada arquivo conhece (ficha.nuvem): o salvar não pode apagar */
  const lembrar = (ficha) => {
    if (!ficha) return;
    gravacoes.set(ficha.id, Math.max(gravacoes.get(ficha.id) || 0, ficha.gravacao || 0));
    if (ficha.nuvem) nuvens.set(ficha.id, ficha.nuvem);
  };
  const proximaGravacao = async (ficha) => {
    if (!gravacoes.has(ficha.id)) lembrar((await backend.um(ficha.id) || {}).ficha); /* só a primeira vez na sessão, se não abriu antes */
    const n = Math.max(gravacoes.get(ficha.id) || 0, ficha.gravacao || 0) + 1; /* o maior entre o que esta aba sabe e a ficha que chegou (outra aba pode ter gravado) */
    gravacoes.set(ficha.id, n);
    return n;
  };

  return {
    demo,
    backend,
    async fichas() {
      return (await backend.todos()).map((r) => r.ficha);
    },
    async podeCriar() {
      if (!demo) return { ok: true };
      const n = ativos(await this.fichas()).length;
      if (n < LIMITE_DEMO) return { ok: true, restam: LIMITE_DEMO - n };
      return {
        ok: false,
        motivo: `A demonstração guarda até ${LIMITE_DEMO} arquivos. Mande um para a lixeira ou exclua um da lixeira para criar outro.`,
      };
    },
    async criar(arquivo) {
      const pode = await this.podeCriar();
      if (!pode.ok) throw Object.assign(new Error(pode.motivo), { codigo: 'limite-demo' });
      await this.salvar(arquivo, 'criou');
      return arquivo;
    },
    /**
     * Grava o arquivo. esperado = a marca da última gravação que esta aba conhece:
     * se outra aba gravou no meio, não grava e devolve { conflito: true } (nada se perde em silêncio).
     */
    async salvar(arquivo, acao = 'salvou', esperado) {
      const pacote = await compactar(arquivo.conteudo);
      const marca = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const gravacao = await proximaGravacao(arquivo.ficha);
      const ficha = { ...arquivo.ficha, gravacao, ...(nuvens.has(arquivo.ficha.id) ? { nuvem: nuvens.get(arquivo.ficha.id) } : {}) }; /* a versão da nuvem que esta aba conhece vale mais que a da ficha que chegou */
      const r = { id: ficha.id, ficha, pacote, marca };
      if (esperado !== undefined && backend.porSe) {
        const ok = await backend.porSe(r, esperado);
        if (!ok) { gravacoes.delete(ficha.id); return { conflito: true }; }
      } else await backend.por(r);
      if (acao) await anotar(acao, ficha);
      return { bytesOriginal: pacote.bytesOriginal, bytesFinal: pacote.bytesFinal, fmt: pacote.fmt, marca, gravacao };
    },
    async abrir(id) {
      const r = await backend.um(id);
      if (!r) return null;
      lembrar(r.ficha); /* v0.6.72: o salvar já sabe o número e a versão da nuvem sem ler de novo */
      return {
        ficha: r.ficha,
        marca: r.marca || null,
        conteudo: await descompactar(r.pacote),
        tamanho: { bytesOriginal: r.pacote.bytesOriginal, bytesFinal: r.pacote.bytesFinal, fmt: r.pacote.fmt },
      };
    },
    async mudarFicha(id, mudancas, acao, extra) {
      const r = await backend.um(id);
      if (!r) return null;
      lembrar(r.ficha);
      const ficha = { ...r.ficha, ...mudancas, gravacao: await proximaGravacao(r.ficha) }; /* v0.6.72: mudar a ficha também conta */
      await backend.por({ ...r, ficha, marca: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) });
      if (acao) await anotar(acao, ficha, extra);
      return ficha;
    },
    mandarParaLixeira(id) {
      return this.mudarFicha(id, { status: 'lixeira', lixeiraEm: agora() }, 'lixeira');
    },
    restaurar(id) {
      return this.mudarFicha(id, { status: 'rascunho', lixeiraEm: null }, 'restaurou');
    },
    async excluirDeVez(id) {
      const r = await backend.um(id);
      if (!r) return false;
      if (r.ficha.status !== 'lixeira') throw new Error('Só se exclui de vez o que está na lixeira.');
      await backend.tira(id);
      await anotar('excluiu', r.ficha);
      return true;
    },
    eventos: () => backend.eventos(),
    /** v0.6.72: quem envia para a nuvem (P4) avisa a versão nova aqui, para o próximo salvar não apagar. */
    lembrarNuvem(id, nuvem) { if (nuvem) nuvens.set(id, nuvem); else nuvens.delete(id); },
  };
}
