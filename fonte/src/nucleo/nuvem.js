/* Vértice Docs · banco pronto para a nuvem (P1 do plano "Vértice como aba do Cwork", aprovada em 26/11 05:20).
   Ainda não liga em nada: a P4 troca o "remoto" falso pelo Firestore do Cwork (ficha + pedaços, como os Impressos).
   O que já fica decidido e testado aqui:
   - Fila de envio: cada arquivo mudado entra uma vez só (a última gravação vale); sem internet, espera e tenta de novo.
   - Cada arquivo lembra a versão da nuvem que conhece (ficha.nuvem = { versao, em }). Gravar na nuvem só vale se a nuvem
     ainda estiver nessa versão; se alguém gravou no meio, nada se perde: o que está no aparelho vira uma "cópia em conflito"
     (outro arquivo, também enviado) e o original passa a ser o da nuvem.
   O "remoto" precisa ter: ler(id) → { ficha, pacote, versao } | null · gravar({ ficha, pacote }, esperada) → { ok, versao } |
   { conflito: true } · e pode lançar erro (sem internet). O "local" é o backend do banco (um, por).
   Parte sem tela (testada no node com remoto falso). */

/** Fila de envio (na memória; a P4 guarda no aparelho). Cada id entra uma vez. */
export function criarFila(inicial = []) {
  const ids = [...new Set(inicial)];
  return {
    por(id) { if (!ids.includes(id)) ids.push(id); },
    tirar(id) { const i = ids.indexOf(id); if (i >= 0) ids.splice(i, 1); },
    lista: () => [...ids],
    get tamanho() { return ids.length; },
  };
}

export const nomeCopiaEmConflito = (nome, quem) => (String(nome || 'Arquivo') + ' (cópia em conflito de ' + String(quem || 'neste aparelho') + ')').slice(0, 120);
const novaMarca = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
/** Um id de cópia que ainda não existe no aparelho. */
async function idCopiaLivre(local, id, agora) {
  const base = id + 'c' + Date.parse(agora).toString(36);
  for (let k = 0; k < 50; k++) { const c = k ? base + k.toString(36) : base; if (!(await local.um(c))) return c; }
  return base + Math.random().toString(36).slice(2, 8);
}

/**
 * Envia o que está na fila. Devolve { enviados, conflitos: [{ id, copia }], parou: motivo | null }.
 * Para no primeiro erro de rede (o resto espera a próxima vez); arquivo que sumiu do aparelho sai da fila.
 * Se a pessoa salvar enquanto o envio está no caminho, o que ela salvou fica e o arquivo continua na fila (vai na próxima).
 * aoMarcar(id, nuvem): avisa o banco da versão nova da nuvem (banco.lembrarNuvem), para o próximo salvar não apagar.
 */
export async function enviarPendentes({ local, remoto, fila, quem = 'neste aparelho', agora = new Date().toISOString(), aoMarcar = () => {} }) {
  const out = { enviados: [], conflitos: [], parou: null };
  for (const id of fila.lista()) {
    const rec = await local.um(id);
    if (!rec) { fila.tirar(id); continue; }
    const esperada = (rec.ficha.nuvem && rec.ficha.nuvem.versao) || 0;
    let r;
    try { r = await remoto.gravar({ ficha: semNuvem(rec.ficha), pacote: rec.pacote }, esperada); } catch (e) { out.parou = String((e && e.message) || e || 'sem internet'); break; }
    if (r && r.ok) {
      const agoraRec = (await local.um(id)) || rec; /* relê: pode ter sido salvo no meio */
      const nuvem = { versao: r.versao, em: agora };
      await local.por({ ...agoraRec, ficha: { ...agoraRec.ficha, nuvem } });
      aoMarcar(id, nuvem);
      out.enviados.push(id);
      if ((agoraRec.ficha.gravacao || 0) === (rec.ficha.gravacao || 0)) fila.tirar(id); /* salvou no meio: continua na fila */
      continue;
    }
    if (r && r.conflito) {
      let daNuvem;
      try { daNuvem = await remoto.ler(id); } catch (e) { out.parou = String((e && e.message) || e || 'sem internet'); break; }
      const meu = (await local.um(id)) || rec; /* o mais novo do aparelho vai para a cópia */
      if (!daNuvem) { /* sumiu da nuvem: manda de novo como arquivo novo */
        const f = semNuvem(meu.ficha);
        await local.por({ ...meu, ficha: f }); aoMarcar(id, null);
        continue;
      }
      const copia = await idCopiaLivre(local, id, agora);
      await local.por({ ...meu, id: copia, marca: novaMarca(), ficha: { ...semNuvem(meu.ficha), id: copia, nome: nomeCopiaEmConflito(meu.ficha.nome, quem), gravacao: 1 } });
      const nuvem = { versao: daNuvem.versao, em: agora };
      await local.por({ ...meu, marca: novaMarca(), ficha: { ...daNuvem.ficha, id, nuvem }, pacote: daNuvem.pacote }); /* marca nova: a aba que tem o arquivo aberto percebe */
      aoMarcar(id, nuvem);
      fila.tirar(id); fila.por(copia);
      out.conflitos.push({ id, copia });
      continue;
    }
    out.parou = 'resposta estranha da nuvem'; break;
  }
  return out;
}

/** O que vai para a nuvem não leva a marca de versão da nuvem (quem manda nela é a nuvem). */
function semNuvem(ficha) { const f = { ...ficha }; delete f.nuvem; return f; }

/** Remoto falso (testes e modo demonstração): grava na memória com a mesma regra de versão da nuvem. */
export function remotoNaMemoria() {
  const docs = new Map();
  let fora = false;
  return {
    sairDoAr(v = true) { fora = v; },
    async ler(id) { if (fora) throw new Error('sem internet'); const d = docs.get(id); return d ? structuredClone(d) : null; },
    async gravar({ ficha, pacote }, esperada) {
      if (fora) throw new Error('sem internet');
      const atual = docs.get(ficha.id);
      if ((atual ? atual.versao : 0) !== esperada) return { conflito: true };
      const versao = (atual ? atual.versao : 0) + 1;
      docs.set(ficha.id, structuredClone({ ficha, pacote, versao }));
      return { ok: true, versao };
    },
    tamanho: () => docs.size,
  };
}
