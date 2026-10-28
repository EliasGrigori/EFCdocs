/* EFCdocs — Planilha (v0.6.3): Tabela, Coluna de status e Link. Regras puras, sem tela.
   - Tabela: formato (cabeçalho colorido, linhas listradas) + filtro + nome; guarda em c.tabelas (para INDIRECT("Nome[Coluna]")).
   - Status: lista suspensa (aba.val) + uma cor por opção (aba.cf, regra "célula igual a").
   - Link: dentro da própria célula, cel.lk = { t:'u'|'e'|'a', u, a, r, d } — assim acompanha a célula ao ordenar, copiar e inserir linhas. */
import { chave, normalFaixa, textoFaixa, lerEnderecoCaixa, lerChave, MAX_LIN } from './ref.js';
import { Lote } from './operacoes.js';
import { mescladas } from './modelo.js';
import { novoIdRegra, faixasDe, textoFaixas, tirarDeFaixas } from './regras.js';
import { novoFiltro } from './dados.js';

/* ---------------- Tabela ---------------- */
export const ESTILOS_TABELA = [
  { id: 'azul', nome: 'Azul', cab: '#1f4e79', letra: '#ffffff', faixa: '#e6eef7' },
  { id: 'verde', nome: 'Verde', cab: '#2e6b4f', letra: '#ffffff', faixa: '#e7f3ec' },
  { id: 'laranja', nome: 'Laranja', cab: '#b45f06', letra: '#ffffff', faixa: '#fbeedc' },
  { id: 'cinza', nome: 'Cinza', cab: '#404040', letra: '#ffffff', faixa: '#efefef' },
  { id: 'leve', nome: 'Leve', cab: '#eef1f4', letra: '#1b2a36', faixa: '#f7f8fa' },
];
const LINHA_TABELA = '#cfd6de';

/** Nome de tabela que o Excel aceita: letras, números e _; não começa com número; não parece endereço de célula. */
export function nomeDeTabelaValido(n) {
  const t = String(n || '').trim();
  if (!/^[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_]*$/.test(t) || t.length > 60) return false;
  if (/^[A-Za-z]{1,3}\d{1,7}$/.test(t) || /^[RrCc]$/.test(t)) return false;
  return true;
}
export function nomeNovoDeTabela(c, base = 'Tabela') {
  const usados = new Set(Object.values(c.tabelas || {}).map((t) => String(t.nome).toLowerCase()));
  for (const x of Object.values(c.nomes || {})) if (x && x.n) usados.add(String(x.n).toLowerCase());
  for (let i = 1; i < 500; i++) if (!usados.has((base + i).toLowerCase())) return base + i;
  return base + Date.now();
}
/** Títulos únicos (vazio vira "Coluna N"; repetido ganha número), como o Excel faz. */
export function titulosDaTabela(brutos) {
  const vistos = new Map();
  return brutos.map((b, i) => {
    let t = String(b == null ? '' : b).trim() || 'Coluna' + (i + 1);
    const k = t.toLowerCase();
    const n = vistos.get(k) || 0;
    vistos.set(k, n + 1);
    if (n) t = t + (n + 1);
    return t;
  });
}

/**
 * Formata a área como tabela. Opções: { nome, estilo (id), cabecalho, listras, filtro }.
 * Devolve { mud (mudanças já prontas) } ou { erro }.
 */
export function formatarComoTabela(c, abaId, faixa, op, valorDe) {
  const aba = c.abas[abaId];
  const f = normalFaixa(faixa);
  const est = ESTILOS_TABELA.find((e) => e.id === op.estilo) || ESTILOS_TABELA[0];
  if (!nomeDeTabelaValido(op.nome)) return { erro: 'O nome da tabela só pode ter letras, números e _ (sem espaço) e não pode começar com número.' };
  const outra = Object.entries(c.tabelas || {}).find(([, t]) => String(t.nome).toLowerCase() === op.nome.toLowerCase());
  const nomeEmUso = Object.values(c.nomes || {}).some((x) => x && x.n && String(x.n).toLowerCase() === op.nome.toLowerCase());
  const nomeAntigo = outra && outra[1].aba === abaId && outra[1].l1 === f.l1 && outra[1].c1 === f.c1;
  if ((outra && !nomeAntigo) || nomeEmUso) return { erro: 'Já existe uma tabela ou nome com esse nome. Escolha outro.' };
  if (f.l2 - f.l1 < (op.cabecalho ? 1 : 0)) return { erro: 'Escolha uma área com pelo menos uma linha de dados.' };
  if (mescladas(aba).some((m) => m.l1 <= f.l2 && m.l2 >= f.l1 && m.c1 <= f.c2 && m.c2 >= f.c1)) return { erro: 'Tem células mescladas nesta área. Desfaça a mescla antes.' };
  const lote = new Lote(c);
  const dados0 = f.l1 + (op.cabecalho ? 1 : 0);
  /* títulos */
  let cols = [];
  if (op.cabecalho) {
    cols = titulosDaTabela(Array.from({ length: f.c2 - f.c1 + 1 }, (_, i) => valorDe(f.l1, f.c1 + i)));
  } else cols = Array.from({ length: f.c2 - f.c1 + 1 }, (_, i) => 'Coluna' + (i + 1));
  for (let l = f.l1; l <= f.l2; l++) {
    for (let cc = f.c1; cc <= f.c2; cc++) {
      const k = chave(l, cc);
      const x = aba.cel[k] || {};
      const e = { ...(c.estilos[x.s] || {}) };
      const cab = op.cabecalho && l === f.l1;
      if (cab) { e.fundo = est.cab; e.cor = est.letra; e.b = true; }
      else {
        /* corpo: tira só o que uma tabela anterior pôs (listra, título em cor de tabela); o que a pessoa pintou fica */
        if (ESTILOS_TABELA.some((t) => t.faixa === e.fundo || t.cab === e.fundo)) { delete e.fundo; if (ESTILOS_TABELA.some((t) => t.letra === e.cor)) delete e.cor; }
        if (op.listras && (l - dados0) % 2 === 1 && !e.fundo) e.fundo = est.faixa;
        e.bd = { ...(e.bd || {}), b: 1 }; if (!e.bdc) e.bdc = LINHA_TABELA;
      }
      const nova = { ...x };
      if (cab && op.cabecalho && (x.v === undefined || x.v === '') && x.f == null) nova.v = cols[cc - f.c1];
      else if (cab && typeof x.v === 'string') nova.v = cols[cc - f.c1];
      nova.s = lote.estilo(e) || undefined;
      lote.por(abaId, k, nova);
    }
  }
  const mud = lote.mudancas();
  const chaveT = op.nome.toLowerCase();
  const tabelas = { ...(c.tabelas || {}) };
  if (outra) delete tabelas[outra[0]];
  tabelas[chaveT] = { nome: op.nome, aba: abaId, l1: f.l1, c1: f.c1, l2: f.l2, c2: f.c2, cols, cab: op.cabecalho ? 1 : 0, tot: 0 };
  mud['conteudo.tabelas'] = tabelas;
  if (op.filtro && op.cabecalho) mud[`conteudo.abas.${abaId}.fil`] = novoFiltro(f);
  return { mud, colunas: cols.length, linhas: f.l2 - dados0 + 1 };
}

/* ---------------- Coluna de status ---------------- */
export const TONS = {
  verde: { nome: 'Verde', fundo: '#c6efce', cor: '#006100' },
  amarelo: { nome: 'Amarelo', fundo: '#ffeb9c', cor: '#7a4a00' },
  vermelho: { nome: 'Vermelho', fundo: '#ffc7ce', cor: '#9c0006' },
  azul: { nome: 'Azul', fundo: '#cfe2f3', cor: '#0b3d6b' },
  cinza: { nome: 'Cinza', fundo: '#e7e6e6', cor: '#4a4a4a' },
};
export const MODELOS_STATUS = [
  { id: 'ok', nome: 'OK, Pendente, Não OK', itens: [['OK', 'verde'], ['Pendente', 'amarelo'], ['Não OK', 'vermelho']] },
  { id: 'conf', nome: 'Conforme, Não conforme, N/A', itens: [['Conforme', 'verde'], ['Não conforme', 'vermelho'], ['N/A', 'cinza']] },
  { id: 'feito', nome: 'Feito, Fazendo, A fazer', itens: [['Feito', 'verde'], ['Fazendo', 'amarelo'], ['A fazer', 'cinza']] },
  { id: 'sn', nome: 'Sim, Não', itens: [['Sim', 'verde'], ['Não', 'vermelho']] },
];
export const MAX_STATUS = 6;
/** Opções limpas: sem vírgula, sem repetir, sem vazio. */
export function limparOpcoes(itens) {
  const vistos = new Set();
  const out = [];
  for (const [t0, tom] of itens) {
    const t = String(t0 || '').replace(/[,"]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 30);
    if (!t || vistos.has(t.toLowerCase()) || out.length >= MAX_STATUS) continue;
    vistos.add(t.toLowerCase());
    out.push({ t, tom: TONS[tom] ? tom : 'cinza' });
  }
  return out;
}
/** Lista suspensa + uma regra de cor por opção sobre a faixa. Devolve { mud } ou { erro }. */
export function montarStatus(c, abaId, textoFx, itens) {
  const aba = c.abas[abaId];
  const fs = faixasDe(textoFx).map(normalFaixa);
  if (!fs.length) return { erro: 'Escreva a área da coluna de status, por exemplo D2:D41.' };
  const ops = limparOpcoes(itens);
  if (ops.length < 2) return { erro: 'Coloque pelo menos duas opções de status.' };
  const fx = textoFaixas(fs);
  const lista = ops.map((o) => o.t).join(',');
  if (lista.length > 250) return { erro: 'As opções ficaram grandes demais (até 250 letras juntas).' };
  const valAntes = (aba.val || []).map((r) => { const f = tirarDeFaixas(r.fx, fs); return f ? { ...r, fx: f } : null; }).filter(Boolean);
  const val = [{ fx, t: 'list', f1: `"${lista}"`, vz: 1, mi: 1, mit: 'Status', mim: 'Escolha uma das opções da lista.', me: 1, ee: 'warning', met: 'Status', mem: 'Esse valor não está na lista de status. Usar mesmo assim?' }, ...valAntes];
  /* tira as regras de cor "igual a" que já estavam exatamente nesta área (refazer não empilha) */
  const cfAntes = (aba.cf || []).filter((r) => !(r.t === 'cellIs' && r.op === 'equal' && r.fx === fx));
  const novas = ops.map((o) => ({ id: novoIdRegra(), fx, t: 'cellIs', op: 'equal', f1: `"${o.t}"`, e: { fundo: TONS[o.tom].fundo, cor: TONS[o.tom].cor, b: true } }));
  return { mud: { [`conteudo.abas.${abaId}.val`]: val, [`conteudo.abas.${abaId}.cf`]: [...novas, ...cfAntes] }, opcoes: ops.length, fx };
}
/** Área sugerida para a coluna de status: da célula ativa até o fim dos dados da coluna (sem o título). */
export function areaDeStatus(sel, regiao) {
  const f = normalFaixa(sel);
  if ((f.l2 - f.l1 + 1) * (f.c2 - f.c1 + 1) > 1) return f;
  let l1 = f.l1;
  const c0 = f.c1;
  if (regiao && l1 === regiao.l1 && regiao.l2 > regiao.l1) l1 = regiao.l1 + 1; // estava no título: começa embaixo
  const l2 = regiao && regiao.l2 > l1 && f.c1 >= regiao.c1 && f.c1 <= regiao.c2 ? regiao.l2 : Math.min(MAX_LIN - 1, l1 + 19);
  return { l1, c1: c0, l2: Math.max(l1, l2), c2: c0 };
}

/* ---------------- Link ---------------- */
const ESQUEMAS = /^(https?:|mailto:|tel:)/i;
/** Endereço seguro: só http, https, mailto e tel; sem esquema e com ponto vira https://. Devolve '' se não serve. */
export function urlSegura(u) {
  let t = String(u || '').trim();
  if (!t || /[\s<>"]/.test(t) || t.length > 2000) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(t) && !ESQUEMAS.test(t)) return '';
  if (!ESQUEMAS.test(t)) { if (/^[^@/]+@[^@/]+\.[^@/]+$/.test(t)) t = 'mailto:' + t; else if (/^[^/\s]+\.[^/\s]+/.test(t)) t = 'https://' + t; else return ''; }
  return t;
}
/** Link da célula: { t:'u', u } (internet ou e-mail) ou { t:'a', a: abaId, r: 'B3' } (dentro da planilha). */
export function novoLink(tipo, campos, c) {
  const d = String(campos.d || '').slice(0, 255) || undefined;
  if (tipo === 'a') {
    if (!c.abas[campos.a]) return { erro: 'Escolha a aba para onde o link leva.' };
    const r = String(campos.r || 'A1').trim().toUpperCase();
    if (!lerChave(r)) return { erro: 'A célula precisa ser um endereço, como B3.' };
    return { lk: { t: 'a', a: campos.a, r, ...(d ? { d } : {}) } };
  }
  const u = urlSegura(tipo === 'e' ? 'mailto:' + String(campos.u || '').replace(/^mailto:/i, '') : campos.u);
  if (!u) return { erro: tipo === 'e' ? 'Escreva um e-mail, como nome@empresa.com.br.' : 'Escreva um endereço de internet, como www.exemplo.com.br.' };
  if (tipo === 'e' && !/^mailto:[^@\s]+@[^@\s]+\.[^@\s]+/i.test(u)) return { erro: 'Escreva um e-mail, como nome@empresa.com.br.' };
  return { lk: { t: 'u', u, ...(d ? { d } : {}) } };
}
export const linkDaCelula = (aba, l, c) => { const x = aba.cel[chave(l, c)]; return x && x.lk && typeof x.lk === 'object' ? x.lk : null; };
/** O que o link mostra em poucas palavras. */
export function descreverLink(lk, c) {
  if (!lk) return '';
  if (lk.t === 'a') return `${c && c.abas[lk.a] ? c.abas[lk.a].nome : 'aba apagada'}!${lk.r}`;
  return String(lk.u || '').replace(/^mailto:/i, '').replace(/^https?:\/\//i, '').slice(0, 60);
}
/** Coloca o link na célula; se o texto está vazio, o texto vira o endereço. O visual (azul sublinhado) só entra se a célula ainda não tem cor. */
export function colocarLink(c, abaId, l, col, lk, texto) {
  const lote = new Lote(c);
  const k = chave(l, col);
  const x = { ...(c.abas[abaId].cel[k] || {}) };
  if (texto != null && String(texto).trim() !== '') { delete x.f; delete x.lg; x.v = String(texto); }
  else if (x.v === undefined && x.f == null) x.v = descreverLink(lk, c);
  x.lk = lk;
  const e = { ...(c.estilos[x.s] || {}) };
  if (!e.cor) { e.cor = '#0563c1'; e.u = true; e.lkv = true; }
  x.s = lote.estilo(e) || undefined;
  lote.por(abaId, k, x);
  return lote;
}
export function tirarLink(c, abaId, l, col) {
  const lote = new Lote(c);
  const k = chave(l, col);
  const x = { ...(c.abas[abaId].cel[k] || {}) };
  delete x.lk;
  const e = { ...(c.estilos[x.s] || {}) };
  if (e.lkv) { delete e.cor; delete e.u; delete e.lkv; x.s = lote.estilo(e) || undefined; }
  lote.por(abaId, k, x);
  return lote;
}
export { textoFaixa, lerEnderecoCaixa };
