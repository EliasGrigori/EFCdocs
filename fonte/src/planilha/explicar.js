/* EFCdocs — Planilha: entender a conta (v0.4.3). Só lê; quem muda a planilha é a tela.
   PL11 "Explicar esta conta": a fórmula em linhas, o valor de cada pedaço e uma frase em português.
   PL12 "Por que deu erro?": segue a cadeia de células até onde o erro começa e diz o motivo.
   PL13 "Problemas": todos os erros e avisos da planilha numa lista.
   PL15 A conta desenhada: caixas e setas de onde vem a conta e para onde vai. */
import { lerGuardada, escrever, mapearRefs, deslocar, dependencias } from './formula.js';
import { POR_EN, funcaoDoExcelQueFalta } from './nomesFuncoes.js';
import { ehErro, ERRO_EXPLICA, numeroGeral, lerNumeroPt } from './valores.js';
import { Ref, ehRef, ehMat } from './tipos.js';
import { chave, lerChave, letraCol, textoFaixa, MAX_COL } from './ref.js';
import { formatar } from './formato.js';
import { estiloDe } from './modelo.js';

const MAX_CEL_FAIXA = 5000; // ao procurar o erro dentro de uma faixa, olha no máximo isto

/* ---------------- valores em texto ---------------- */

/** Valor como aparece para a pessoa (texto entre aspas, vazio, erro em pt-BR). */
export function txtValor(v, nf = 'General') {
  if (v == null || v === '') return '(vazio)';
  if (ehErro(v)) return v.toString();
  if (typeof v === 'string') return '"' + v + '"';
  if (typeof v === 'boolean') return v ? 'VERDADEIRO' : 'FALSO';
  if (typeof v === 'number') { try { return formatar(v, nf || 'General').t; } catch { return numeroGeral(v); } }
  return String(v);
}

/** Nome da aba pelo id (ou o id, se sumiu). */
const nomeAba = (c, id) => (c.abas[id] ? c.abas[id].nome : id);
const nfDe = (c, abaId, l, col) => { const a = c.abas[abaId]; return a ? estiloDe(c, a.cel[chave(l, col)]).nf : undefined; };

/** Contexto comum: motor, conteúdo, a célula da conta e o título das colunas (‹Cloro livre›). */
function criarCtx(motor, c, abaId, l, col, titulo) {
  const ctx = { motor, c, abaId, l, col, titulo: titulo || (() => null) };
  ctx.idAba = (n) => (n.aba == null ? abaId : motor.abaId(n.aba, abaId));
  ctx.avaliar = (n) => motor.avaliarNo(n, abaId, l, col);
  /** Texto do valor de um nó: célula com o formato dela; faixa vira "24 valores". */
  ctx.valorTxt = (n) => {
    const v = ctx.avaliar(n);
    if (ehRef(v)) {
      if (v.unica) return txtValor(motor.valor(v.abaId, v.l1, v.c1), nfDe(c, v.abaId, v.l1, v.c1));
      let n2 = 0;
      motor.cada(v, () => { n2++; });
      return n2 === 1 ? '1 valor' : `${n2} valores`;
    }
    if (ehMat(v)) return `${v.linhas} × ${v.colunas} valores`;
    return txtValor(v, n.t === 'ref' ? nfDe(c, ctx.idAba(n) || abaId, n.l, n.c) : 'General');
  };
  /** "B2 ‹Cloro livre›" (o título só para célula da mesma aba, abaixo do cabeçalho). */
  ctx.rotuloRef = (n) => {
    const id = ctx.idAba(n);
    const pre = n.aba != null ? nomeAba(c, id) + '!' : '';
    if (n.t === 'ref') {
      const t = id ? ctx.titulo(id, n.l, n.c) : null;
      return pre + chave(n.l, n.c) + (t ? ` ‹${t}›` : '');
    }
    const t = id && n.c1 === n.c2 ? ctx.titulo(id, n.l1 + 1, n.c1) : null;
    return pre + textoFaixaRef(n) + (t ? ` ‹${t}›` : '');
  };
  return ctx;
}
const textoFaixaRef = (n) => escrever({ ...n, aba: null }, 'pt');

/* ---------------- PL11: a fórmula em linhas ---------------- */

const LARGURA_LINHA = 34;
const nomePt = (n) => { const f = !n.desc && POR_EN[n.n]; return f ? f.pt : n.n; };
const literal = (n) => ['num', 'str', 'bool', 'err', 'vazio'].includes(n.t);

/**
 * Quebra a conta em linhas com recuo, como num editor de código. Cada linha: { recuo, texto, no, final }
 * (no = o pedaço cujo valor aparece ao lado; final = linha que fecha a conta).
 */
export function linhasDaConta(arv) {
  const out = [];
  const vai = (n, recuo, sufixo) => {
    const tx = escrever(n, 'pt');
    if (n.t === 'fn' && n.args.length && (tx.length > LARGURA_LINHA || n.args.some((a) => a.t === 'fn' && escrever(a, 'pt').length > 12))) {
      out.push({ recuo, texto: nomePt(n) + '(', no: null });
      n.args.forEach((a, i) => vai(a, recuo + 1, i < n.args.length - 1 ? ';' : ''));
      out.push({ recuo, texto: ')' + sufixo, no: n });
      return;
    }
    if (n.t === 'bin' && n.o !== ':' && tx.length > LARGURA_LINHA) {
      vai(n.a, recuo, '');
      out.push({ recuo, texto: n.o, no: null, op: true });
      vai(n.b, recuo, sufixo);
      return;
    }
    out.push({ recuo, texto: tx + sufixo, no: literal(n) ? null : n });
  };
  vai(arv, 0, '');
  if (out.length) out[0] = { ...out[0], texto: '=' + out[0].texto };
  out[out.length - 1].final = true;
  return out;
}

/** O texto em várias linhas (para editar ali mesmo; o leitor ignora as quebras). */
export const textoEmLinhas = (linhas) => linhas.map((x) => '  '.repeat(x.recuo) + x.texto).join('\n');

/* ---------------- PL11: a frase em português ---------------- */

const OP_FRASE = { '>=': 'for maior ou igual a', '<=': 'for menor ou igual a', '>': 'for maior que', '<': 'for menor que', '=': 'for igual a', '<>': 'for diferente de' };
const ehComparacao = (n) => n.t === 'bin' && OP_FRASE[n.o];
const mesmaRef = (a, b) => a && b && a.t === 'ref' && b.t === 'ref' && a.l === b.l && a.c === b.c && String(a.aba || '') === String(b.aba || '');

function frases(ctx) {
  /** Como um pedaço aparece na frase: B2 vira "o Cloro livre (B2 = 1,2)". */
  const d = (n) => {
    switch (n.t) {
      case 'num': return numeroGeral(n.v);
      case 'str': return `"${n.v}"`;
      case 'bool': return n.v ? 'VERDADEIRO' : 'FALSO';
      case 'vazio': return 'vazio';
      case 'ref': {
        const id = ctx.idAba(n);
        const t = id ? ctx.titulo(id, n.l, n.c) : null;
        const end = (n.aba != null ? nomeAba(ctx.c, id) + '!' : '') + chave(n.l, n.c);
        return t ? `o ${t} (${end} = ${ctx.valorTxt(n)})` : `${end} (${ctx.valorTxt(n)})`;
      }
      case 'area': {
        const id = ctx.idAba(n);
        const t = id && n.c1 === n.c2 ? ctx.titulo(id, n.l1 + 1, n.c1) : null;
        const end = (n.aba != null ? nomeAba(ctx.c, id) + '!' : '') + textoFaixaRef(n);
        return t ? `a coluna ${t} (${end})` : end;
      }
      case 'nome': return n.n;
      case 'paren': return d(n.a);
      default: {
        const tx = escrever(n, 'pt');
        return (tx.length > 28 ? tx.slice(0, 26) + '…' : tx) + ` (= ${ctx.valorTxt(n)})`;
      }
    }
  };
  const cond = (n) => {
    if (n.t === 'paren') return cond(n.a);
    if (ehComparacao(n)) return `${d(n.a)} ${OP_FRASE[n.o]} ${d(n.b)}`;
    if (n.t === 'fn' && (n.n === 'AND' || n.n === 'OR') && n.args.length) {
      const [a, b] = n.args;
      /* E(B2>=0,5; B2<=2): "estiver entre 0,5 e 2" */
      if (n.n === 'AND' && n.args.length === 2 && ehComparacao(a) && ehComparacao(b) && mesmaRef(a.a, b.a) && /^>/.test(a.o) && /^</.test(b.o)) {
        return `${d(a.a)} estiver entre ${d(a.b)} e ${d(b.b)}`;
      }
      return n.args.map(cond).join(n.n === 'AND' ? ' e ' : ' ou ');
    }
    if (n.t === 'fn' && n.n === 'NOT' && n.args[0]) return `não for verdade que ${cond(n.args[0])}`;
    return `${d(n)} der VERDADEIRO`;
  };
  const crit = (n) => {
    if (n.t === 'str') {
      const m = /^(>=|<=|<>|>|<|=)(.*)$/.exec(n.v);
      if (m) return `${{ '>=': 'maiores ou iguais a', '<=': 'menores ou iguais a', '<>': 'diferentes de', '>': 'maiores que', '<': 'menores que', '=': 'iguais a' }[m[1]]} ${m[2]}`;
      if (/[*?]/.test(n.v)) return `parecidas com "${n.v}" (* vale qualquer texto)`;
      return `iguais a "${n.v}"`;
    }
    return `iguais a ${d(n)}`;
  };
  const faixas = (args) => args.filter((a) => a.t !== 'vazio').map(d).join(', ');
  /** Frase de uma conta (uma oração, sem ponto final). */
  const f = (n) => {
    if (n.t === 'paren') return f(n.a);
    if (n.t === 'bin') {
      const nome = { '+': 'soma', '-': 'subtrai', '*': 'multiplica', '/': 'divide', '^': 'eleva', '&': 'junta' }[n.o];
      if (n.o === '-') return `subtrai ${d(n.b)} de ${d(n.a)}`;
      if (n.o === '/') return `divide ${d(n.a)} por ${d(n.b)}`;
      if (n.o === '*') return `multiplica ${d(n.a)} por ${d(n.b)}`;
      if (n.o === '^') return `eleva ${d(n.a)} à potência ${d(n.b)}`;
      if (n.o === '&') return `junta o texto de ${d(n.a)} com ${d(n.b)}`;
      if (OP_FRASE[n.o]) return `confere se ${cond(n)}`;
      return `${nome} ${d(n.a)} com ${d(n.b)}`;
    }
    if (n.t !== 'fn') return `mostra ${d(n)}`;
    const a = n.args;
    switch (n.n) {
      case 'IF': return `se ${cond(a[0])}, mostra ${d(a[1] || { t: 'bool', v: true })}; se não, mostra ${a[2] ? d(a[2]) : 'FALSO'}`;
      case 'IFERROR': return `${f(a[0])}; se der erro, mostra ${d(a[1])}`;
      case 'IFNA': return `${f(a[0])}; se não achar (#N/D), mostra ${d(a[1])}`;
      case 'SUM': return `soma ${faixas(a)}`;
      case 'AVERAGE': return `calcula a média de ${faixas(a)}`;
      case 'MAX': return `pega o maior valor de ${faixas(a)}`;
      case 'MIN': return `pega o menor valor de ${faixas(a)}`;
      case 'COUNT': return `conta quantos números há em ${faixas(a)}`;
      case 'COUNTA': return `conta quantas células preenchidas há em ${faixas(a)}`;
      case 'COUNTBLANK': return `conta quantas células vazias há em ${faixas(a)}`;
      case 'COUNTIF': return `conta quantas células de ${d(a[0])} são ${crit(a[1])}`;
      case 'SUMIF': return `soma ${d(a[2] || a[0])} nas linhas em que ${d(a[0])} são ${crit(a[1])}`;
      case 'AVERAGEIF': return `calcula a média de ${d(a[2] || a[0])} nas linhas em que ${d(a[0])} são ${crit(a[1])}`;
      case 'COUNTIFS': case 'SUMIFS': case 'AVERAGEIFS': {
        const ini = n.n === 'COUNTIFS' ? 0 : 1;
        const conds = [];
        for (let i = ini; i + 1 < a.length; i += 2) conds.push(`${d(a[i])} são ${crit(a[i + 1])}`);
        const oQue = n.n === 'COUNTIFS' ? 'conta as linhas' : n.n === 'SUMIFS' ? `soma ${d(a[0])} nas linhas` : `calcula a média de ${d(a[0])} nas linhas`;
        return `${oQue} em que ${conds.join(' e ')}`;
      }
      case 'VLOOKUP': return `procura ${d(a[0])} na primeira coluna de ${d(a[1])} e traz o valor da coluna ${a[2] ? d(a[2]) : '?'} da mesma linha${a[3] && a[3].t !== 'vazio' && (a[3].v === 0 || a[3].v === false) ? ' (só se achar igualzinho)' : ''}`;
      case 'XLOOKUP': return `procura ${d(a[0])} em ${d(a[1])} e traz o valor da mesma posição em ${d(a[2])}${a[3] && a[3].t !== 'vazio' ? `; se não achar, mostra ${d(a[3])}` : ''}`;
      case 'MATCH': return `diz em que posição ${d(a[0])} aparece em ${d(a[1])}`;
      case 'INDEX': return `pega, dentro de ${d(a[0])}, o valor da linha ${a[1] ? d(a[1]) : '?'}${a[2] ? ` e da coluna ${d(a[2])}` : ''}`;
      case 'ROUND': return `arredonda ${d(a[0])} para ${a[1] ? d(a[1]) : '0'} casas`;
      case 'TODAY': return 'mostra a data de hoje';
      case 'NOW': return 'mostra a data e a hora de agora';
      case 'AND': return `confere se ${cond(n)}`;
      case 'OR': return `confere se ${cond(n)}`;
      case 'CONCAT': case 'CONCATENATE': case 'TEXTJOIN': return `junta os textos de ${faixas(n.n === 'TEXTJOIN' ? a.slice(2) : a)}`;
      case 'TRIM': return `tira os espaços sobrando de ${d(a[0])}`;
      default: {
        const meta = !n.desc && POR_EN[n.n];
        if (!meta) return `usa ${n.n}, que o EFCdocs ainda não calcula (no Excel funciona)`;
        return `usa ${meta.pt} (${meta.desc.replace(/\.$/, '').toLowerCase()}) com ${faixas(a) || 'nada'}`;
      }
    }
  };
  return { f, d, cond };
}

const maiuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * PL11: tudo o que a janela "Explicar esta conta" mostra.
 * titulo(abaId, l, c) devolve o nome da coluna (‹Cloro livre›) ou null.
 */
export function explicarConta(motor, c, abaId, l, col, titulo) {
  const fm = motor.formula(abaId, l, col);
  if (!fm) return null;
  const valor = motor.valor(abaId, l, col);
  const nf = nfDe(c, abaId, l, col);
  if (!fm.arv) return { formula: fm.f, linhas: [], frase: 'A fórmula tem um erro de escrita e não pôde ser lida.', valor: txtValor(valor, nf), erro: ehErro(valor) ? valor.cod : null };
  const ctx = criarCtx(motor, c, abaId, l, col, titulo);
  const linhas = linhasDaConta(fm.arv).map((x) => ({ ...x, valor: x.no ? ctx.valorTxt(x.no) : null }));
  /* a linha final mostra o resultado da célula (com o formato dela) */
  if (linhas.length) linhas[linhas.length - 1].valor = txtValor(valor, nf);
  let frase;
  try { frase = maiuscula(frases(ctx).f(fm.arv)) + '.'; } catch { frase = ''; }
  const agora = ` Agora mostra ${txtValor(valor, nf)}.`;
  return {
    formula: escrever(fm.arv, 'pt'), linhas, frase: frase + agora, valor: txtValor(valor, nf),
    erro: ehErro(valor) ? valor.cod : null,
    faltam: fm.desc && fm.desc.length ? fm.desc.map((n) => (POR_EN[n] ? POR_EN[n].pt : n)) : [],
  };
}

/* ---------------- PL12: por que deu erro? ---------------- */

/** As células que a fórmula usa, uma a uma (faixas grandes: só até MAX_CEL_FAIXA). */
function* celulasUsadas(motor, fm) {
  for (const d of fm.deps) {
    const u = motor.usado(d.abaId);
    const l2 = Math.min(d.l2, Math.max(d.l1, u.lMax)), c2 = Math.min(d.c2, Math.max(d.c1, u.cMax));
    let n = 0;
    for (let ll = d.l1; ll <= l2; ll++) for (let cc = d.c1; cc <= c2; cc++) {
      if (++n > MAX_CEL_FAIXA) break;
      yield { abaId: d.abaId, l: ll, c: cc };
    }
  }
}

/** Onde o erro começa: segue as células com o mesmo erro até a primeira que não herda de outra. */
export function origemDoErro(motor, abaId, l, col) {
  const v = motor.valor(abaId, l, col);
  if (!ehErro(v)) return null;
  const caminho = [{ abaId, l, c: col }];
  const vistos = new Set([abaId + '|' + chave(l, col)]);
  let atual = { abaId, l, c: col };
  for (let passo = 0; passo < 40; passo++) {
    const fm = motor.formula(atual.abaId, atual.l, atual.c);
    if (!fm || fm.desc.length || fm.erro) break;
    let prox = null;
    for (const x of celulasUsadas(motor, fm)) {
      const k = x.abaId + '|' + chave(x.l, x.c);
      if (vistos.has(k)) continue;
      const vv = motor.valor(x.abaId, x.l, x.c);
      if (ehErro(vv) && vv.cod === v.cod) { prox = x; vistos.add(k); break; }
    }
    if (!prox) break;
    caminho.push(prox);
    atual = prox;
  }
  return { cod: v.cod, erro: v, origem: atual, caminho };
}

/** Procura no desenho da conta um pedaço que satisfaz teste (o primeiro, da esquerda para a direita). */
function acharNo(arv, teste) {
  let achou = null;
  (function vai(n) {
    if (achou || !n) return;
    if (teste(n)) { achou = n; return; }
    if (n.t === 'fn' || n.t === 'chamada') { if (n.f) vai(n.f); n.args.forEach(vai); }
    else if (n.t === 'bin') { vai(n.a); vai(n.b); }
    else if (n.t === 'paren' || n.t === 'un' || n.t === 'pct') vai(n.a);
  })(arv);
  return achou;
}

/**
 * PL12: o motivo do erro em português, com o caminho e os consertos.
 * Devolve { cod, erroPt, origem, caminho, msg, acoes: [{ tipo:'ir'|'seerro'|'converter', rotulo, alvo }] }.
 */
export function causaDoErro(motor, c, abaId, l, col, titulo) {
  const o = origemDoErro(motor, abaId, l, col);
  if (!o) return null;
  const { origem } = o;
  const ctx = criarCtx(motor, c, origem.abaId, origem.l, origem.c, titulo);
  const fm = motor.formula(origem.abaId, origem.l, origem.c);
  const nomeCel = (x) => (x.abaId !== abaId ? nomeAba(c, x.abaId) + '!' : '') + chave(x.l, x.c);
  const tituloCel = (x) => { const t = titulo ? titulo(x.abaId, x.l, x.c) : null; return t ? ` ‹${t}›` : ''; };
  const acoes = [];
  const ir = (x, rot) => acoes.push({ tipo: 'ir', rotulo: rot || 'Ir para ' + nomeCel(x), alvo: x });
  const seerro = () => { if (fm && fm.arv && !/^IFERROR\(/i.test(fm.f)) acoes.push({ tipo: 'seerro', rotulo: `Usar SEERRO em ${nomeCel(origem)}`, alvo: origem }); };
  const contaTx = fm && fm.arv ? '=' + escrever(fm.arv, 'pt') : '';
  let motivo = '';

  if (!fm) {
    motivo = `O erro está escrito na própria célula (veio assim de outro arquivo), não é resultado de conta. Apague ou digite o valor certo.`;
  } else if (fm.erro) {
    motivo = 'A fórmula tem um erro de escrita e não pôde ser lida. Abra a célula (dois cliques) para ver o que falta.';
  } else if (o.cod === '#NAME?') {
    const faltam = fm.desc.map((n) => (POR_EN[n] ? POR_EN[n].pt : n));
    const nomes = dependencias(fm.arv).nomes.filter((n) => !motor.nomesArv.has(n));
    if (faltam.length) motivo = `${faltam.join(', ')} ${faltam.length === 1 ? 'é uma função' : 'são funções'} que o EFCdocs ainda não calcula${faltam.some((n) => funcaoDoExcelQueFalta(n)) ? ' (no Excel funciona)' : ''}. A fórmula está guardada e não se perde.`;
    else if (nomes.length) motivo = `"${nomes[0]}" não é uma célula, uma função nem um nome definido. Se for texto, ponha entre aspas; se for um nome, crie em Fórmulas › Dar nome.`;
    else motivo = ERRO_EXPLICA[o.cod];
  } else if (o.cod === '#DIV/0!') {
    /* o divisor que vale zero ou está vazio */
    const div = acharNo(fm.arv, (n) => n.t === 'bin' && n.o === '/' && (() => { const v = ctx.avaliar(n.b); const vv = ehRef(v) && v.unica ? motor.valor(v.abaId, v.l1, v.c1) : v; return vv == null || vv === '' || vv === 0; })());
    const media = acharNo(fm.arv, (n) => n.t === 'fn' && ['AVERAGE', 'AVERAGEIF', 'AVERAGEIFS'].includes(n.n) && ehErro(ctx.avaliar(n)));
    if (div && div.b.t === 'ref') {
      const id = ctx.idAba(div.b);
      const x = { abaId: id, l: div.b.l, c: div.b.c };
      const v = motor.valor(id, x.l, x.c);
      motivo = `A conta é ${contaTx}, e ${nomeCel(x)}${tituloCel(x)} ${v == null || v === '' ? 'está vazio' : 'vale 0'}. Para resolver, preencha ${nomeCel(x)} ou use SEERRO.`;
      ir(x);
    } else if (div) {
      motivo = `A conta é ${contaTx}, e o divisor (${escrever(div.b, 'pt')}) dá 0. Para resolver, confira o divisor ou use SEERRO.`;
    } else if (media) {
      motivo = `A ${nomePt(media)} não achou nenhum número em ${media.args[0] ? escrever(media.args[0], 'pt') : 'nenhuma faixa'} (está tudo vazio ou com texto). Preencha a faixa ou use SEERRO.`;
    } else motivo = 'A conta ' + contaTx + ' divide por zero. ' + ERRO_EXPLICA[o.cod].replace(/^a conta divide por zero, ou por uma célula vazia\. /, '');
    seerro();
  } else if (o.cod === '#N/A') {
    const busca = acharNo(fm.arv, (n) => n.t === 'fn' && ['VLOOKUP', 'HLOOKUP', 'XLOOKUP', 'MATCH', 'XMATCH', 'LOOKUP'].includes(n.n) && ehErro(ctx.avaliar(n)));
    if (busca && busca.args[0] && busca.args[1]) {
      const procurado = ctx.avaliar(busca.args[0]);
      const pv = ehRef(procurado) && procurado.unica ? motor.valor(procurado.abaId, procurado.l1, procurado.c1) : procurado;
      const onde = busca.args[1];
      const ondeTx = ctx.rotuloRef(onde.t === 'ref' || onde.t === 'area' ? onde : { t: 'nome', n: escrever(onde, 'pt') }) || escrever(onde, 'pt');
      const prim = busca.n === 'VLOOKUP' ? 'na primeira coluna de ' : busca.n === 'HLOOKUP' ? 'na primeira linha de ' : 'em ';
      motivo = `${nomePt(busca)} não achou ${txtValor(pv)} ${prim}${ondeTx}.`;
      /* parecido, mas diferente: espaço sobrando ou número guardado como texto */
      const r = ctx.avaliar(onde);
      if (ehRef(r) && pv != null) {
        const alvo = String(pv).trim().toLowerCase();
        let quase = null;
        motor.cada(new Ref(r.abaId, r.l1, r.c1, busca.n === 'HLOOKUP' ? r.l1 : r.l2, busca.n === 'VLOOKUP' ? r.c1 : r.c2), (v, ll, cc) => {
          if (quase || v == null) return;
          if (String(v).trim().toLowerCase() === alvo && v !== pv) quase = { abaId: r.abaId, l: ll, c: cc, v };
        });
        if (quase) {
          motivo += ` Existe ${txtValor(quase.v)} em ${nomeCel(quase)}: ${typeof quase.v === 'string' && /^\s|\s$/.test(quase.v) ? 'tem espaço sobrando' : typeof quase.v !== typeof pv ? (typeof pv === 'number' ? 'lá está guardado como texto' : 'lá é número e aqui é texto') : 'a diferença é de maiúscula ou espaço'}.`;
          ir(quase);
        } else motivo += ' Confira se está escrito igual (espaços e maiúsculas contam) ou se o item ainda não foi cadastrado.';
      }
      if (onde.t === 'ref' || onde.t === 'area') { const id = ctx.idAba(onde); if (id) acoes.push({ tipo: 'ir', rotulo: 'Ver a lista', alvo: { abaId: id, l: onde.t === 'ref' ? onde.l : onde.l1, c: onde.t === 'ref' ? onde.c : onde.c1 } }); }
      seerro();
    } else motivo = ERRO_EXPLICA[o.cod];
  } else if (o.cod === '#VALUE!') {
    /* uma célula com texto entrando numa conta de número */
    let achou = null;
    acharNo(fm.arv, (n) => {
      if (achou || n.t !== 'bin' || !'+-*/^'.includes(n.o)) return false;
      for (const lado of [n.a, n.b]) {
        if (lado.t !== 'ref') continue;
        const id = ctx.idAba(lado);
        const v = id ? motor.valor(id, lado.l, lado.c) : null;
        if (typeof v === 'string' && v !== '') { achou = { abaId: id, l: lado.l, c: lado.c, v }; return true; }
      }
      return false;
    });
    if (achou) {
      const numTexto = lerNumeroPt(String(achou.v).trim()) != null;
      motivo = `A conta é ${contaTx}, e ${nomeCel(achou)}${tituloCel(achou)} tem o texto ${txtValor(achou.v)}. ${numTexto ? 'Parece um número, mas está guardado como texto.' : 'Conta de somar, subtrair, multiplicar ou dividir precisa de número.'}`;
      ir(achou);
      if (numTexto) acoes.push({ tipo: 'converter', rotulo: 'Converter em número', alvo: achou });
    } else motivo = `A conta é ${contaTx}: ${ERRO_EXPLICA[o.cod]}.`;
  } else if (o.cod === '#REF!') {
    motivo = `A fórmula ${contaTx} aponta para algo que foi excluído (aparece #REF! dentro dela). Refaça a referência, ou desfaça a exclusão com Ctrl+Z se acabou de acontecer.`;
  } else if (o.cod === '#SPILL!') {
    const r = motor.previa(escrever(fm.arv, 'pt'), origem.abaId, origem.l, origem.c);
    let bloq = null;
    if (r && r.matriz) {
      const aba = c.abas[origem.abaId];
      for (let i = 0; i < r.matriz.linhas && !bloq; i++) for (let j = 0; j < r.matriz.colunas; j++) {
        if (!i && !j) continue;
        const x = aba.cel[chave(origem.l + i, origem.c + j)];
        if (x && (x.v !== undefined || x.f != null)) { bloq = { abaId: origem.abaId, l: origem.l + i, c: origem.c + j }; break; }
      }
      motivo = `O resultado ocupa ${r.matriz.linhas} × ${r.matriz.colunas} células a partir de ${nomeCel(origem)}${bloq ? `, e ${nomeCel(bloq)} já tem conteúdo` : ', e alguma delas já tem conteúdo'}. Esvazie essas células para o resultado aparecer.`;
      if (bloq) ir(bloq);
    } else motivo = ERRO_EXPLICA[o.cod];
  } else {
    motivo = `A conta é ${contaTx}: ${ERRO_EXPLICA[o.cod] || 'o resultado não é válido'}.`;
  }

  const inicio = o.caminho[0];
  const veio = o.caminho.length > 1
    ? `${nomeCel(inicio)} mostra ${o.erro.toString()} porque usa ${o.caminho.slice(1, -1).map(nomeCel).concat(nomeCel(origem)).join(', que usa ')}. O erro começa em ${nomeCel(origem)}. `
    : '';
  if (o.caminho.length > 1) acoes.unshift({ tipo: 'ir', rotulo: 'Ir para ' + nomeCel(origem), alvo: origem });
  /* sem repetir o mesmo "Ir para" */
  const vistos = new Set();
  const unicas = acoes.filter((a) => { const k = a.tipo + (a.alvo ? a.alvo.abaId + chave(a.alvo.l, a.alvo.c) : ''); if (vistos.has(k)) return false; vistos.add(k); return true; });
  return { cod: o.cod, erroPt: o.erro.toString(), origem, caminho: o.caminho, titulo: `${o.erro.toString()} em ${nomeCel(origem)}`, msg: veio + motivo, motivo, acoes: unicas.slice(0, 3) };
}

/* ---------------- PL13: problemas da planilha ---------------- */

/** A forma da fórmula sem as posições (para comparar com as vizinhas): A2*1,15 na linha 2 = A3*1,15 na linha 3. */
export function formaRelativa(arv, l, col) {
  return escrever(mapearRefs(arv, (n) => {
    if (n.t === 'ref') return { t: 'nome', n: `R${n.al ? n.l : '[' + (n.l - l) + ']'}C${n.ac ? n.c : '[' + (n.c - col) + ']'}${n.aba ? '@' + n.aba : ''}` };
    const p = (x, abs, base) => (abs ? x : '[' + (x - base) + ']');
    return { t: 'nome', n: `R${p(n.l1, n.al1, l)}C${p(n.c1, n.ac1, col)}:R${p(n.l2, n.al2, l)}C${p(n.c2, n.ac2, col)}${n.aba ? '@' + n.aba : ''}` };
  }), 'en');
}

const COMUNS = new Set([0.5, 0.25, 0.1, 0.01, 0.001]);
/** Número fixo dentro da conta (=E2*1,15): a meta muda e alguém esquece de trocar. */
function numerosFixos(arv) {
  const out = [];
  (function vai(n, pai) {
    if (!n) return;
    if (n.t === 'num' && pai && pai.t === 'bin' && (pai.o === '*' || pai.o === '/') && !Number.isInteger(n.v) && !COMUNS.has(Math.abs(n.v))) out.push(n.v);
    if (n.t === 'fn' || n.t === 'chamada') n.args.forEach((a) => vai(a, n));
    else if (n.t === 'bin') { vai(n.a, n); vai(n.b, n); }
    else if (n.t === 'paren' || n.t === 'un' || n.t === 'pct') vai(n.a, pai);
  })(arv, null);
  return [...new Set(out)];
}

/** Troca, na conta, o número fixo v pelo nome (para "Dar nome ao número"). */
export function trocarNumeroPorNome(textoEn, v, nome) {
  const arv = lerGuardada(textoEn);
  const troca = (n, pai) => {
    if (!n) return n;
    if (n.t === 'num' && n.v === v && pai && pai.t === 'bin' && (pai.o === '*' || pai.o === '/')) return { t: 'nome', n: nome };
    if (n.t === 'fn' || n.t === 'chamada') return { ...n, ...(n.f ? { f: troca(n.f, n) } : {}), args: n.args.map((a) => troca(a, n)) };
    if (n.t === 'bin') return { ...n, a: troca(n.a, n), b: troca(n.b, n) };
    if (n.t === 'paren' || n.t === 'un' || n.t === 'pct') return { ...n, a: troca(n.a, pai) };
    return n;
  };
  return escrever(troca(arv, null), 'en');
}

/** A fórmula de cima, trazida para esta linha (conserto "Igualar"). */
export const formulaDeCima = (textoEn) => escrever(deslocar(lerGuardada(textoEn), 1, 0), 'en');

/**
 * PL13: lista de problemas da planilha inteira. Cada um:
 * { id, nivel: 'erro'|'aviso', abaId, l, c, cel, texto, acoes: [...] } — erros primeiro.
 */
export function problemasDaPlanilha(motor, c, titulo, { max = 200 } = {}) {
  const out = [];
  const ordemAba = new Map(c.ordem.map((id, i) => [id, i]));
  const nomeCel = (abaId, l, col) => (c.ordem.length > 1 ? nomeAba(c, abaId) + '!' : '') + chave(l, col);
  const add = (p) => out.push({ ...p, cel: nomeCel(p.abaId, p.l, p.c) });

  /* 1. erros: um item por origem, contando quantas células herdam o mesmo erro */
  const origens = new Map();
  let vistas = 0;
  for (const id of c.ordem) {
    for (const fm of motor.form[id].values()) {
      const v = motor.valor(id, fm.l, fm.c);
      if (!ehErro(v) || fm.desc.length) continue;
      if (++vistas > 400) break;
      const o = origemDoErro(motor, id, fm.l, fm.c);
      const k = o.origem.abaId + '|' + chave(o.origem.l, o.origem.c);
      if (!origens.has(k)) origens.set(k, { o, mais: 0 });
      else origens.get(k).mais++;
    }
  }
  for (const [k, { o, mais }] of origens) {
    const causa = causaDoErro(motor, c, o.origem.abaId, o.origem.l, o.origem.c, titulo);
    if (!causa) continue;
    add({
      id: 'erro:' + k, nivel: 'erro', abaId: o.origem.abaId, l: o.origem.l, c: o.origem.c,
      texto: `${causa.erroPt}: ${causa.motivo}${mais ? ` Mais ${mais} ${mais === 1 ? 'célula mostra' : 'células mostram'} este erro por causa desta.` : ''}`,
      acoes: causa.acoes.filter((a) => a.tipo !== 'ir' || a.alvo.l !== o.origem.l || a.alvo.c !== o.origem.c || a.alvo.abaId !== o.origem.abaId),
    });
  }

  /* 2. conta circular */
  for (const x of motor.circulares()) {
    const fm = motor.formula(x.abaId, x.l, x.c);
    add({ id: 'circ:' + x.abaId + chave(x.l, x.c), nivel: 'erro', abaId: x.abaId, l: x.l, c: x.c, texto: `Conta circular: ${chave(x.l, x.c)} depende dela mesma${fm && fm.arv ? ` (=${escrever(fm.arv, 'pt')})` : ''}. Fica 0 até corrigir.`, acoes: [] });
  }

  /* 3. número guardado como texto (agrupado por coluna) */
  for (const id of c.ordem) {
    const aba = c.abas[id];
    const porCol = new Map();
    for (const k of Object.keys(aba.cel)) {
      const x = aba.cel[k];
      if (typeof x.v !== 'string' || x.f != null) continue;
      const t = x.v.trim();
      if (!t || !/\d/.test(t) || lerNumeroPt(t) == null) continue;
      if (/^0\d/.test(t)) continue; // códigos com zero na frente (001, 0123) ficam como texto de propósito
      const nf = estiloDe(c, x).nf;
      if (nf === '@') continue; // formato Texto: a pessoa quis texto
      const p = lerChave(k);
      if (!p) continue;
      const usada = motor.quemUsa(id, p.l, p.c).size > 0;
      if (!porCol.has(p.c)) porCol.set(p.c, []);
      porCol.get(p.c).push({ l: p.l, v: x.v, usada });
    }
    for (const [col, lista] of porCol) {
      /* só avisa se alguma fórmula usa, ou se a coluna é de números */
      let nums = 0;
      motor.cada(new Ref(id, 0, col, Math.max(0, motor.usado(id).lMax), col), (v) => { if (typeof v === 'number') nums++; });
      if (!lista.some((x) => x.usada) && nums < 3) continue;
      lista.sort((a, b) => a.l - b.l);
      const p = lista[0];
      add({
        id: 'texto:' + id + col, nivel: 'aviso', abaId: id, l: p.l, c: col,
        texto: lista.length === 1
          ? `Número guardado como texto (${txtValor(p.v)}). A SOMA e as outras contas não contam essa célula.`
          : `${lista.length} números da coluna ${letraCol(col)} estão guardados como texto (${txtValor(p.v)}...). A SOMA e as outras contas não contam essas células.`,
        acoes: [{ tipo: 'converter', rotulo: lista.length === 1 ? 'Converter' : `Converter os ${lista.length}`, alvo: { abaId: id, l: p.l, c: col }, celulas: lista.map((x) => ({ abaId: id, l: x.l, c: col })) }],
      });
    }
  }

  /* 4. fórmula diferente das vizinhas, 5. número fixo na conta, 6. funções que o EFCdocs ainda não calcula */
  const faltam = new Map();
  const fixos = new Map();
  for (const id of c.ordem) {
    const forms = motor.form[id];
    let n = 0;
    for (const fm of forms.values()) {
      if (++n > 20000) break;
      if (!fm.arv) continue;
      if (fm.desc.length) {
        for (const f of fm.desc) {
          const nome = POR_EN[f] ? POR_EN[f].pt : f;
          if (!faltam.has(nome)) faltam.set(nome, []);
          faltam.get(nome).push(fm);
        }
        continue;
      }
      const forma = formaRelativa(fm.arv, fm.l, fm.c);
      const cima = forms.get((fm.l - 1) * MAX_COL + fm.c), baixo = forms.get((fm.l + 1) * MAX_COL + fm.c);
      if (cima && baixo && cima.arv && baixo.arv) {
        const fc = formaRelativa(cima.arv, cima.l, cima.c);
        if (fc === formaRelativa(baixo.arv, baixo.l, baixo.c) && fc !== forma) {
          add({
            id: 'vizinha:' + id + chave(fm.l, fm.c), nivel: 'aviso', abaId: id, l: fm.l, c: fm.c,
            texto: `Fórmula diferente das vizinhas: ${chave(cima.l, cima.c)} e ${chave(baixo.l, baixo.c)} fazem =${escrever(cima.arv, 'pt')} (no jeito delas), e esta faz =${escrever(fm.arv, 'pt')}.`,
            acoes: [{ tipo: 'igualar', rotulo: 'Igualar', alvo: { abaId: id, l: fm.l, c: fm.c }, formula: formulaDeCima(cima.f) }],
          });
        }
      }
      for (const v of numerosFixos(fm.arv)) {
        const k = id + '|' + fm.c + '|' + v + '|' + forma;
        if (!fixos.has(k)) fixos.set(k, { id, v, lista: [] });
        fixos.get(k).lista.push(fm);
      }
    }
  }
  for (const [k, { id, v, lista }] of fixos) {
    lista.sort((a, b) => a.l - b.l);
    const p = lista[0], u = lista[lista.length - 1];
    const onde = lista.length > 1 ? `${chave(p.l, p.c)}:${chave(u.l, u.c)}` : chave(p.l, p.c);
    add({
      id: 'fixo:' + k, nivel: 'aviso', abaId: id, l: p.l, c: p.c,
      texto: `Número fixo na conta: =${escrever(p.arv, 'pt')}${lista.length > 1 ? ` (e em mais ${lista.length - 1} ${lista.length === 2 ? 'fórmula' : 'fórmulas'} de ${onde})` : ''}. Se ${numeroGeral(v)} mudar, alguém precisa lembrar de trocar em todas. Melhor dar um nome a ele.`,
      acoes: [{ tipo: 'nomearNumero', rotulo: 'Dar nome ao número', alvo: { abaId: id, l: p.l, c: p.c }, v, celulas: lista.map((x) => ({ abaId: id, l: x.l, c: x.c })) }],
    });
  }
  for (const [nome, lista] of faltam) {
    const p = lista[0];
    add({
      id: 'falta:' + nome, nivel: 'aviso', abaId: p.abaId, l: p.l, c: p.c,
      texto: `${nome}${lista.length > 1 ? ` (em ${lista.length} células)` : ''} é uma função que o EFCdocs ainda não calcula. A fórmula fica guardada e funciona quando abrir no Excel; aqui mostra o último valor do Excel ou #NOME?.`,
      acoes: [],
    });
  }

  out.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'erro' ? -1 : 1) || (ordemAba.get(a.abaId) - ordemAba.get(b.abaId)) || a.l - b.l || a.c - b.c);
  return out.slice(0, max);
}

/* ---------------- PL15: a conta desenhada ---------------- */

/**
 * Caixas e setas de onde vem a conta (até 3 níveis para trás) e para onde vai (1 nível).
 * Devolve { nos: [{ id, nivel, tipo, rotulo, titulo, valor, formula, abaId, l1, c1, l2, c2, alvo }], setas: [{ de, para }] }.
 * nivel 0 = a célula; 1, 2, 3 = de onde vem; -1 = quem usa.
 */
export function grafoDaConta(motor, c, abaId, l, col, titulo, { niveis = 3, max = 28 } = {}) {
  const nos = new Map();
  const setas = [];
  const idDe = (x) => x.abaId + '|' + x.l1 + ':' + x.c1 + ':' + x.l2 + ':' + x.c2;
  const nomeF = (x) => (x.abaId !== abaId ? nomeAba(c, x.abaId) + '!' : '') + textoFaixa(x);
  const criar = (x, nivel) => {
    const id = idDe(x);
    if (nos.has(id)) { const n = nos.get(id); if (nivel > n.nivel && nivel > 0) n.nivel = nivel; return n; }
    if (nos.size >= max) return null;
    const unica = x.l1 === x.l2 && x.c1 === x.c2;
    const fm = unica ? motor.formula(x.abaId, x.l1, x.c1) : null;
    let valor;
    if (unica) valor = txtValor(motor.valor(x.abaId, x.l1, x.c1), nfDe(c, x.abaId, x.l1, x.c1));
    else { let n = 0; motor.cada(new Ref(x.abaId, x.l1, x.c1, x.l2, x.c2), () => { n++; }); valor = n === 1 ? '1 valor' : `${n} valores`; }
    const t = titulo ? (unica ? titulo(x.abaId, x.l1, x.c1) : x.c1 === x.c2 ? titulo(x.abaId, x.l1 + 1, x.c1) : null) : null;
    const n = {
      id, nivel, tipo: fm ? 'conta' : unica ? 'valor' : 'faixa', rotulo: nomeF(x), titulo: t, valor,
      formula: fm && fm.arv ? '=' + escrever(fm.arv, 'pt') : fm ? '=' + fm.f : null,
      abaId: x.abaId, l1: x.l1, c1: x.c1, l2: x.l2, c2: x.c2,
    };
    nos.set(id, n);
    return n;
  };
  const raiz = criar({ abaId, l1: l, c1: col, l2: l, c2: col }, 0);
  const fila = [[raiz, 0]];
  while (fila.length) {
    const [n, nivel] = fila.shift();
    if (nivel >= niveis || n.tipo !== 'conta') continue;
    for (const d of motor.precedentes(n.abaId, n.l1, n.c1)) {
      const filho = criar({ abaId: d.abaId, l1: d.l1, c1: d.c1, l2: d.l2, c2: d.c2 }, nivel + 1);
      if (!filho) continue;
      if (!setas.some((s) => s.de === filho.id && s.para === n.id)) setas.push({ de: filho.id, para: n.id });
      if (filho.tipo === 'conta') fila.push([filho, nivel + 1]);
      /* faixa pequena: as contas de dentro dela também entram (primeiro as que dão erro) */
      if (filho.tipo === 'faixa' && (d.l2 - d.l1 + 1) * (d.c2 - d.c1 + 1) <= 60 && nivel + 1 < niveis) {
        const dentro = [];
        for (let ll = d.l1; ll <= d.l2; ll++) for (let cc = d.c1; cc <= d.c2; cc++) if (motor.formula(d.abaId, ll, cc)) dentro.push({ abaId: d.abaId, l1: ll, c1: cc, l2: ll, c2: cc, erro: ehErro(motor.valor(d.abaId, ll, cc)) });
        const comErro = dentro.filter((x) => x.erro);
        for (const x of (comErro.length ? comErro : dentro).slice(0, comErro.length ? 4 : 3)) {
          const neto = criar(x, nivel + 2);
          if (!neto) continue;
          if (!setas.some((s) => s.de === neto.id && s.para === filho.id)) setas.push({ de: neto.id, para: filho.id });
          fila.push([neto, nivel + 2]);
        }
      }
    }
  }
  for (const d of motor.dependentes(abaId, l, col).slice(0, 8)) {
    const n = criar({ abaId: d.abaId, l1: d.l, c1: d.c, l2: d.l, c2: d.c }, -1);
    if (n) setas.push({ de: raiz.id, para: n.id });
  }
  return { nos: [...nos.values()], setas };
}

/** Posições das caixas: quem dá origem à esquerda, a célula no meio, quem usa à direita. */
export function arrumarGrafo(g, { w = 190, h = 64, gx = 70, gy = 18 } = {}) {
  const niveis = [...new Set(g.nos.map((n) => n.nivel))].sort((a, b) => b - a);
  const col = new Map(niveis.map((n, i) => [n, i]));
  const porNivel = new Map();
  for (const n of g.nos) { if (!porNivel.has(n.nivel)) porNivel.set(n.nivel, []); porNivel.get(n.nivel).push(n); }
  const alturaMax = Math.max(...[...porNivel.values()].map((l) => l.length));
  const pos = new Map();
  for (const [nivel, lista] of porNivel) {
    lista.sort((a, b) => a.abaId.localeCompare(b.abaId) || a.l1 - b.l1 || a.c1 - b.c1);
    const off = ((alturaMax - lista.length) * (h + gy)) / 2;
    lista.forEach((n, i) => pos.set(n.id, { x: col.get(nivel) * (w + gx), y: off + i * (h + gy), w, h }));
  }
  return { pos, largura: niveis.length * (w + gx) - gx, altura: alturaMax * (h + gy) - gy };
}

export const _teste = { numerosFixos, acharNo, criarCtx };
