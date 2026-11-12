/* Fidelidade (Método Sabiá 2.0, lente 6.3): compara dois conteúdos do EFCdocs célula a célula.
   Usado na ida e volta: ler o .xlsx → gravar → ler de novo → comparar. O número do estilo pode mudar;
   o que conta é o estilo de verdade (fonte, cor, borda, formato...). */
const IGNORAR_CONTEUDO = new Set(['v', 'seq', 'importado', 'abas', 'ordem', 'estilos']);
const IGNORAR_ABA = new Set(['id', 'cel']);

/* números de identificação sorteados ou renumerados a cada leitura/gravação (objetos, regras, ligações internas do desenho) não contam.
   No XML guardado de formas e grupos, a posição (a:off/a:ext) é refeita a partir da âncora, que é comparada à parte (l, c, dx, dy, w, h).
   Medidas podem variar meio ponto na conversão de unidades do Excel. */
const INTERNOS = new Set(['id', 'xoRels', 'xoNs', 'grTok', 'tok']);
const limparXml = (t) => t.replace(/ (id|r:id|r:embed|r:link|r:pict)="[^"]*"/g, '').replace(/ xmlns:r="[^"]*"/g, '').replace(/<a:(off|ext|chOff|chExt)\b[^>]*\/>/g, '<a:$1/>').replace(/\d+\.\d+/g, (n) => String(Math.round(+n)));
const semIds = (x, chave) => (Array.isArray(x) ? x.map((y) => semIds(y)) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).filter((k) => !INTERNOS.has(k)).map((k) => [k, semIds(x[k], k)])) : typeof x === 'string' && (chave === 'xo' || chave === 'xoSig') ? limparXml(x) : x);
/** igualdade com folga de meio ponto nos números com casas decimais */
function iguais(p, q) {
  if (typeof p === 'number' && typeof q === 'number') return p === q || (!(Number.isInteger(p) && Number.isInteger(q)) && Math.abs(p - q) <= 0.5);
  if (p && q && typeof p === 'object' && typeof q === 'object') { if (Array.isArray(p) !== Array.isArray(q)) return false; const ks = new Set([...Object.keys(p), ...Object.keys(q)]); for (const k of ks) if (!iguais(p[k], q[k])) return false; return true; }
  return p === q;
}
/* altura e largura iguais ao padrão da aba são o mesmo que não ter */
const semPadrao = (mapa, padrao) => (mapa && typeof mapa === 'object' ? Object.fromEntries(Object.entries(mapa).filter(([, v]) => v !== padrao)) : mapa);
const ordenar = (x) => (Array.isArray(x) ? x.map(ordenar) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, ordenar(x[k])])) : x);
const js = (x) => JSON.stringify(ordenar(x));
const curto = (x) => { const s = typeof x === 'string' ? JSON.stringify(x) : js(x); return s === undefined ? '(nada)' : s.length > 90 ? s.slice(0, 87) + '...' : s; };

/** Estilo de verdade de uma célula (sem o número). Estilo vazio e "sem estilo" contam igual. */
function estiloDe(c, s) { const e = s != null ? c.estilos[s] : null; if (!e) return '{}'; const o = {}; for (const k of Object.keys(e)) if (e[k] !== undefined && e[k] !== null && e[k] !== false && e[k] !== '') o[k] = e[k]; return js(o); }
function celulaNormal(c, x) { if (!x) return null; const o = {}; for (const k of Object.keys(x)) { if (k === 's') continue; if (x[k] !== undefined) o[k] = x[k]; } o.estilo = estiloDe(c, x.s); return o; }
const vazia = (o) => !o || (Object.keys(o).length === 1 && o.estilo === '{}');

/**
 * @returns {{aba:string, onde:string, campo:string, antes:string, depois:string}[]} com .calculados = fórmulas que o original não tinha valor guardado
 */
export function compararConteudos(a, b, { limite = 400 } = {}) {
  const dif = [], calculados = []; const add = (aba, onde, campo, x, y) => { if (dif.length < limite) dif.push({ aba, onde, campo, antes: curto(x), depois: curto(y) }); };
  const nomesA = a.ordem.map((id) => a.abas[id].nome), nomesB = b.ordem.map((id) => b.abas[id].nome);
  if (js(nomesA) !== js(nomesB)) add('(pasta)', '', 'abas', nomesA, nomesB);
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { if (IGNORAR_CONTEUDO.has(k)) continue; if (!iguais(semIds(a[k]), semIds(b[k]))) add('(pasta)', '', k, a[k], b[k]); }
  for (let i = 0; i < Math.min(a.ordem.length, b.ordem.length); i++) {
    const x = a.abas[a.ordem[i]], y = b.abas[b.ordem[i]], nome = x.nome;
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (IGNORAR_ABA.has(k)) continue;
      let p = semIds(x[k]), q = semIds(y[k]);
      if (k === 'alt') { p = semPadrao(p, x.altP); q = semPadrao(q, y.altP); } else if (k === 'larg') { p = semPadrao(p, x.largP); q = semPadrao(q, y.largP); }
      if (!iguais(p, q)) add(nome, '', k, p, q);
    }
    for (const ref of new Set([...Object.keys(x.cel || {}), ...Object.keys(y.cel || {})])) {
      const p = celulaNormal(a, x.cel[ref]), q = celulaNormal(b, y.cel[ref]);
      if (vazia(p) && vazia(q)) continue;
      if (!p || !q) { add(nome, ref, p ? 'célula sumiu' : 'célula apareceu', p, q); continue; }
      for (const k of new Set([...Object.keys(p), ...Object.keys(q)])) {
        if (js(p[k]) === js(q[k])) continue;
        /* fórmula sem valor guardado no original: o valor novo é o que o EFCdocs calculou (quem confere é o LibreOffice) */
        if (k === 'v' && p.f != null && p.v === undefined) { calculados.push({ aba: nome, ref, f: p.f, v: q.v }); continue; }
        /* v0.6.11: número que voltou como o mesmo texto (título de tabela: o Excel guarda como texto) */
        if (k === 'v' && (typeof p.v === 'number' || typeof p.v === 'boolean') && typeof q.v === 'string' && (String(p.v) === q.v || (p.v === true ? 'VERDADEIRO' : 'FALSO') === q.v)) { add(nome, ref, 'v (número virou o mesmo texto)', p[k], q[k]); continue; }
        add(nome, ref, k, p[k], q[k]);
      }
    }
  }
  dif.calculados = calculados;
  return dif;
}

/** Agrupa as diferenças por aba e campo, para o relatório. */
export function resumir(dif) { const g = {}; for (const d of dif) { const k = `${d.aba} · ${d.campo}`; (g[k] || (g[k] = { n: 0, exemplo: d })).n++; } return Object.entries(g).sort((p, q) => q[1].n - p[1].n).map(([k, v]) => ({ grupo: k, quantas: v.n, exemplo: `${v.exemplo.onde}: ${v.exemplo.antes} → ${v.exemplo.depois}` })); }
