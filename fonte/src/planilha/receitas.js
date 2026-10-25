/* EFCdocs — Planilha: montar a conta respondendo uma pergunta (PL18, v0.4.3).
   Parte do que a pessoa quer fazer, não do nome da função. Cada receita monta o texto da fórmula em pt-BR (sem o "=");
   a tela mostra a fórmula e o resultado antes de pôr na célula. */
import { lerNumeroPt } from './valores.js';

/** Valor digitado vira número (0,5) ou texto entre aspas ("Ajustar"). */
export function valorNaFormula(t) {
  const s = String(t ?? '').trim();
  if (s === '') return '""';
  const n = lerNumeroPt(s);
  if (n != null) return String(n).replace('.', ',');
  if (/^(verdadeiro|falso)$/i.test(s)) return s.toUpperCase();
  return '"' + s.replace(/"/g, '""') + '"';
}

/** Comparações das receitas: o que a pessoa lê e o sinal na fórmula. */
export const COMPARACOES = [
  { id: 'igual', nome: 'são iguais a', sinal: '=' },
  { id: 'diferente', nome: 'são diferentes de', sinal: '<>' },
  { id: 'maior', nome: 'são maiores que', sinal: '>' },
  { id: 'maiorIgual', nome: 'são maiores ou iguais a', sinal: '>=' },
  { id: 'menor', nome: 'são menores que', sinal: '<' },
  { id: 'menorIgual', nome: 'são menores ou iguais a', sinal: '<=' },
  { id: 'contem', nome: 'contêm o texto', sinal: null },
  { id: 'vazio', nome: 'estão vazias', sinal: null, semValor: true },
  { id: 'preenchido', nome: 'estão preenchidas', sinal: null, semValor: true },
];
/** Comparações de uma célula só (SE). */
export const COMPARA_CEL = [
  { id: '>=', nome: 'for maior ou igual a' }, { id: '>', nome: 'for maior que' },
  { id: '<=', nome: 'for menor ou igual a' }, { id: '<', nome: 'for menor que' },
  { id: '=', nome: 'for igual a' }, { id: '<>', nome: 'for diferente de' },
];

/** Critério do CONT.SE / SOMASE: "Ajustar", 5, ">5", "<>OK", "*cloro*", "" ou "<>". */
export function criterio(comp, valor) {
  const s = String(valor ?? '').trim();
  switch (comp) {
    case 'igual': return valorNaFormula(s);
    case 'contem': return '"*' + s.replace(/"/g, '""') + '*"';
    case 'vazio': return '""';
    case 'preenchido': return '"<>"';
    default: {
      const c = COMPARACOES.find((x) => x.id === comp);
      const n = lerNumeroPt(s);
      return '"' + (c ? c.sinal : '=') + (n != null ? String(n).replace('.', ',') : s.replace(/"/g, '""')) + '"';
    }
  }
}

/** A comparação precisa de um valor escrito? (vazias / preenchidas não precisam) */
const faltaValor = (v) => {
  const c = COMPARACOES.find((x) => x.id === v.comp);
  return !(c && c.semValor) && String(v.valor ?? '').trim() === '';
};

/**
 * Receitas. Campos: coluna (escolhe uma coluna com título), celula (endereço como B2), texto, numero,
 * comparacao (lista COMPARACOES), comparaCel (lista COMPARA_CEL). opcional: true deixa em branco.
 * montar(v) devolve { texto, nf? } ou null se faltar algo.
 */
export const RECEITAS = [
  {
    id: 'contar', nome: 'Contar quantos...', exemplo: 'Quantos lotes estão como "Ajustar"?',
    campos: [
      { id: 'col', tipo: 'coluna', rotulo: 'Contar na coluna' },
      { id: 'comp', tipo: 'comparacao', rotulo: 'as células que', padrao: 'igual' },
      { id: 'valor', tipo: 'texto', rotulo: 'valor', padrao: '', dica: 'ex.: Ajustar ou 0,5' },
    ],
    montar: (v) => (v.col && !faltaValor(v) ? { texto: `CONT.SE(${v.col};${criterio(v.comp, v.valor)})` } : null),
  },
  {
    id: 'somarQuando', nome: 'Somar quando...', exemplo: 'Somar a quantidade só do setor Packing.',
    campos: [
      { id: 'soma', tipo: 'coluna', rotulo: 'Somar a coluna' },
      { id: 'quando', tipo: 'coluna', rotulo: 'quando a coluna' },
      { id: 'comp', tipo: 'comparacao', rotulo: '', padrao: 'igual' },
      { id: 'valor', tipo: 'texto', rotulo: 'valor', padrao: '' },
    ],
    montar: (v) => (v.soma && v.quando && !faltaValor(v) ? { texto: `SOMASE(${v.quando};${criterio(v.comp, v.valor)};${v.soma})` } : null),
  },
  {
    id: 'media', nome: 'Média de...', exemplo: 'A média do cloro livre (só dos lotes do dia, se quiser).',
    campos: [
      { id: 'col', tipo: 'coluna', rotulo: 'Média da coluna' },
      { id: 'quando', tipo: 'coluna', rotulo: 'só quando a coluna (opcional)', opcional: true },
      { id: 'comp', tipo: 'comparacao', rotulo: '', padrao: 'igual' },
      { id: 'valor', tipo: 'texto', rotulo: 'valor', padrao: '' },
    ],
    montar: (v) => (!v.col || (v.quando && faltaValor(v)) ? null : v.quando ? { texto: `MÉDIASE(${v.quando};${criterio(v.comp, v.valor)};${v.col})` } : { texto: `MÉDIA(${v.col})` }),
  },
  {
    id: 'buscar', nome: 'Buscar um valor em outra tabela', exemplo: 'Achar o fornecedor do lote L-012 na aba Lotes.',
    campos: [
      { id: 'cel', tipo: 'celula', rotulo: 'Procurar o que está na célula' },
      { id: 'em', tipo: 'coluna', rotulo: 'na coluna' },
      { id: 'traz', tipo: 'coluna', rotulo: 'e trazer da coluna' },
      { id: 'senao', tipo: 'texto', rotulo: 'se não achar, mostrar', padrao: 'Não achou' },
    ],
    montar: (v) => (v.cel && v.em && v.traz ? { texto: `PROCX(${v.cel};${v.em};${v.traz};${valorNaFormula(v.senao)})` } : null),
  },
  {
    id: 'seMaior', nome: 'Se for maior ou menor que, mostrar...', exemplo: 'Se o cloro for maior ou igual a 0,5, mostrar "OK".',
    campos: [
      { id: 'cel', tipo: 'celula', rotulo: 'Se a célula' },
      { id: 'comp', tipo: 'comparaCel', rotulo: '', padrao: '>=' },
      { id: 'valor', tipo: 'texto', rotulo: 'valor', padrao: '0,5' },
      { id: 'sim', tipo: 'texto', rotulo: 'mostrar', padrao: 'OK' },
      { id: 'nao', tipo: 'texto', rotulo: 'se não, mostrar', padrao: 'Ajustar' },
    ],
    montar: (v) => (v.cel ? { texto: `SE(${v.cel}${v.comp}${valorNaFormula(v.valor)};${valorNaFormula(v.sim)};${valorNaFormula(v.nao)})` } : null),
  },
  {
    id: 'faixa', nome: 'Está dentro da faixa?', exemplo: 'O cloro está entre 0,5 e 2?',
    campos: [
      { id: 'cel', tipo: 'celula', rotulo: 'A célula' },
      { id: 'min', tipo: 'texto', rotulo: 'está entre', padrao: '0,5' },
      { id: 'max', tipo: 'texto', rotulo: 'e', padrao: '2' },
      { id: 'sim', tipo: 'texto', rotulo: 'se estiver, mostrar', padrao: 'OK' },
      { id: 'nao', tipo: 'texto', rotulo: 'se não, mostrar', padrao: 'Fora da faixa' },
    ],
    montar: (v) => (v.cel ? { texto: `SE(E(${v.cel}>=${valorNaFormula(v.min)};${v.cel}<=${valorNaFormula(v.max)});${valorNaFormula(v.sim)};${valorNaFormula(v.nao)})` } : null),
  },
  {
    id: 'dias', nome: 'Dias entre duas datas', exemplo: 'Quantos dias desde a coleta até hoje.',
    campos: [
      { id: 'ini', tipo: 'celula', rotulo: 'Da data na célula' },
      { id: 'fim', tipo: 'celula', rotulo: 'até a data na célula (vazio = hoje)', opcional: true },
    ],
    montar: (v) => (v.ini ? { texto: `${v.fim || 'HOJE()'}-${v.ini}`, nf: '0' } : null),
  },
  {
    id: 'porcentagem', nome: 'Porcentagem de...', exemplo: 'Quantos % dos lotes estão "OK".',
    campos: [
      { id: 'col', tipo: 'coluna', rotulo: 'Na coluna' },
      { id: 'comp', tipo: 'comparacao', rotulo: 'a porcentagem das células que', padrao: 'igual' },
      { id: 'valor', tipo: 'texto', rotulo: 'valor', padrao: 'OK' },
    ],
    montar: (v) => (v.col && !faltaValor(v) ? { texto: `CONT.SE(${v.col};${criterio(v.comp, v.valor)})/CONT.VALORES(${v.col})`, nf: '0.0%' } : null),
  },
  {
    id: 'juntar', nome: 'Juntar textos', exemplo: 'Juntar o lote e a data: "L-012 - 01/03/2024".',
    campos: [
      { id: 'a', tipo: 'celula', rotulo: 'Juntar a célula' },
      { id: 'b', tipo: 'celula', rotulo: 'com a célula' },
      { id: 'c', tipo: 'celula', rotulo: 'e a célula (opcional)', opcional: true },
      { id: 'sep', tipo: 'texto', rotulo: 'pondo entre elas', padrao: ' - ' },
    ],
    montar: (v) => (v.a && v.b ? { texto: `UNIRTEXTO(${'"' + String(v.sep ?? '').replace(/"/g, '""') + '"'};VERDADEIRO;${[v.a, v.b, v.c].filter(Boolean).join(';')})` } : null),
  },
  {
    id: 'espacos', nome: 'Tirar espaços sobrando', exemplo: 'Limpar "  L-012 " para "L-012" (o PROCV passa a achar).',
    campos: [{ id: 'cel', tipo: 'celula', rotulo: 'Do texto na célula' }],
    montar: (v) => (v.cel ? { texto: `ARRUMAR(${v.cel})` } : null),
  },
];

export { faltaValor };
