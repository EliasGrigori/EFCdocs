/* Vértice Docs · Quadro · letras dos itens (v0.6.57; proposta 7 dos post-its, aprovada em 25/11).
   Cinco letras de licença livre (SIL OFL 1.1, pacotes @fontsource, só o recorte latino), em src/fontes/extra/.
   Elas NÃO vêm no pacote inicial do app: cada uma é baixada na primeira vez que aparece (garantirFonte) e depois
   fica guardada pelo sw.js para uso sem internet. O item guarda só o nome (it.fonte.fam), sempre conferido nesta lista. */

export const FONTES_Q = [
  { id: '', nome: 'Padrão', k: 1 },
  { id: 'Caveat', nome: 'Caveat · à mão', arq: 'caveat', pesos: [400, 700], k: 1.3 },
  { id: 'Patrick Hand', nome: 'Patrick Hand · bilhete', arq: 'patrick-hand', pesos: [400], k: 1.12 },
  { id: 'Nunito', nome: 'Nunito · arredondada', arq: 'nunito', pesos: [400, 700], k: 1 },
  { id: 'Merriweather', nome: 'Merriweather · com serifa', arq: 'merriweather', pesos: [400, 700], k: 0.92 },
  { id: 'JetBrains Mono', nome: 'JetBrains Mono · máquina', arq: 'jetbrains-mono', pesos: [400, 700], k: 0.88 },
];
const POR_ID = new Map(FONTES_Q.map((f) => [f.id, f]));
/* raia, página e legenda têm o próprio título; imagem e assinatura não têm texto */
const ACEITA = new Set(['postit', 'processo', 'decisao', 'inicio', 'dados', 'texto']);

export const fonteValida = (id) => (typeof id === 'string' && id && POR_ID.has(id) ? id : undefined);
export const aceitaFonte = (it) => !!it && ACEITA.has(it.tipo);
export const familiaDo = (it) => (aceitaFonte(it) && it.fonte ? fonteValida(it.fonte.fam) : undefined);
/** Quanto a letra cresce ou encolhe para ficar do tamanho da padrão (a Caveat é miúda, a JetBrains é larga). */
export const escalaDo = (it) => (POR_ID.get(familiaDo(it) || '') || FONTES_Q[0]).k;
/** A família para o CSS e para o canvas: a escolhida e, se ela ainda não chegou, a padrão. */
export const familiaCss = (it, padrao) => { const f = familiaDo(it); return f ? `"${f}", ${padrao}` : padrao; };
export const familiasUsadas = (c) => [...new Set(Object.values((c && c.itens) || {}).map(familiaDo).filter(Boolean))];

/** Mudanças para trocar a letra dos itens ('' = padrão). Itens sem texto ficam como estão. */
export function mudancasFonteQ(c, ids, fam) {
  const f = fonteValida(fam);
  const mud = {};
  for (const id of ids) {
    const it = c.itens[id];
    if (!aceitaFonte(it)) continue;
    const fonte = { ...(it.fonte || {}) };
    if (f) fonte.fam = f; else delete fonte.fam;
    mud['itens.' + id] = { ...it, fonte };
  }
  return mud;
}

/** O valor que a caixa Letra mostra: a letra comum aos escolhidos, '' (Padrão) ou null quando estão misturados. */
export function valorFonteQ(c, ids) {
  const fams = [...new Set(ids.map((id) => c.itens[id]).filter(aceitaFonte).map((it) => familiaDo(it) || ''))];
  return fams.length === 1 ? fams[0] : fams.length ? null : '';
}

/* ---------- só no navegador ---------- */
const pedidas = new Map();
/** Baixa a letra uma vez (todos os pesos dela) e devolve quando estiver pronta; sem navegador, não faz nada. */
export function garantirFonte(id) {
  const f = POR_ID.get(fonteValida(id) || '');
  if (!f || !f.arq) return Promise.resolve();
  if (pedidas.has(f.id)) return pedidas.get(f.id);
  if (typeof document === 'undefined' || !document.fonts || typeof FontFace === 'undefined') return Promise.resolve();
  const p = Promise.all(f.pesos.map((peso) => {
    const ff = new FontFace(f.id, `url(assets/fontes/${f.arq}-latin-${peso}-normal.woff2) format("woff2")`, { weight: String(peso), style: 'normal', display: 'swap' });
    document.fonts.add(ff);
    return ff.load().catch(() => null); /* sem internet e sem cópia guardada: fica a padrão */
  })).then(() => undefined);
  pedidas.set(f.id, p);
  return p;
}
export const garantirFontesDo = (c) => Promise.all(familiasUsadas(c).map(garantirFonte));
