/* EFCdocs — Planilha: montar a conta respondendo uma pergunta (PL18, v0.4.3).
   Parte do que a pessoa quer fazer, não do nome da função. Cada receita monta o texto da fórmula em pt-BR (sem o "=");
   a tela mostra a fórmula e o resultado antes de pôr na célula. */
import { lerNumeroPt, dataValida } from './valores.js';
import { lerEndereco } from './ref.js';

/** Valor digitado vira número (0,5) ou texto entre aspas ("Ajustar"). */
export function valorNaFormula(t) {
  const s = String(t ?? '').trim();
  if (s === '') return '""';
  const n = lerNumeroPt(s);
  if (n != null) return String(n).replace('.', ',');
  if (/^(verdadeiro|falso)$/i.test(s)) return s.toUpperCase();
  return '"' + s.replace(/"/g, '""') + '"';
}

/** Data digitada (25/10/2026) ou célula (B1) vira pedaço de fórmula: DATA(2026;10;25) ou B1. null se não entendeu. */
export function dataNaFormula(t) {
  const s = String(t ?? '').trim();
  if (!s) return null;
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return dataValida(+m[3], +m[2], +m[1]) ? `DATA(${+m[3]};${+m[2]};${+m[1]})` : null;
  return lerEndereco(s) ? s.toUpperCase() : null;
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
    id: 'contar', nome: 'Contar quantos...', exemplo: (a) => (a.texto ? `Quantas linhas de ${a.texto.titulo} estão como "${a.texto.valor}"?` : 'Quantas linhas têm um certo valor numa coluna?'),
    campos: [
      { id: 'col', tipo: 'coluna', rotulo: 'Contar na coluna', escolha: 'Escolha a coluna' },
      { id: 'comp', tipo: 'comparacao', rotulo: 'as células que', padrao: 'igual' },
      { id: 'valor', tipo: 'texto', rotulo: 'valor', padrao: '', dica: 'ex.: Ajustar ou 0,5' },
    ],
    montar: (v) => (v.col && !faltaValor(v) ? { texto: `CONT.SE(${v.col};${criterio(v.comp, v.valor)})` } : null),
  },
  {
    id: 'somarQuando', nome: 'Somar quando...', exemplo: (a) => (a.numero && a.texto ? `Somar ${a.numero.titulo} só das linhas em que ${a.texto.titulo} é "${a.texto.valor}".` : 'Somar uma coluna só das linhas que combinam com um valor.'),
    campos: [
      { id: 'soma', tipo: 'coluna', rotulo: 'Somar a coluna', escolha: 'Escolha a coluna dos números' },
      { id: 'quando', tipo: 'coluna', rotulo: 'quando a coluna', escolha: 'Escolha a coluna do critério' },
      { id: 'comp', tipo: 'comparacao', rotulo: '', padrao: 'igual' },
      { id: 'valor', tipo: 'texto', rotulo: 'valor', padrao: '' },
    ],
    montar: (v) => (v.soma && v.quando && !faltaValor(v) ? { texto: `SOMASE(${v.quando};${criterio(v.comp, v.valor)};${v.soma})` } : null),
  },
  {
    id: 'media', nome: 'Média de...', exemplo: (a) => (a.numero ? `A média de ${a.numero.titulo}${a.texto ? ` (só das linhas em que ${a.texto.titulo} é "${a.texto.valor}", se quiser)` : ''}.` : 'A média de uma coluna de números, de todas as linhas ou só de algumas.'),
    campos: [
      { id: 'col', tipo: 'coluna', rotulo: 'Média da coluna', escolha: 'Escolha a coluna dos números' },
      { id: 'quando', tipo: 'coluna', rotulo: 'só quando a coluna (opcional)', opcional: true },
      { id: 'comp', tipo: 'comparacao', rotulo: '', padrao: 'igual' },
      { id: 'valor', tipo: 'texto', rotulo: 'valor', padrao: '' },
    ],
    montar: (v) => (!v.col || (v.quando && faltaValor(v)) ? null : v.quando ? { texto: `MÉDIASE(${v.quando};${criterio(v.comp, v.valor)};${v.col})` } : { texto: `MÉDIA(${v.col})` }),
  },
  {
    id: 'buscar', nome: 'Buscar um valor em outra tabela', exemplo: (a) => (a.chave && a.outra ? `Achar o valor de ${a.outra.titulo} do item "${a.chave.valor}" (procurando na coluna ${a.chave.titulo}).` : 'Achar numa tabela o valor que corresponde a um item (como o PROCV, mas mais simples).'),
    campos: [
      { id: 'cel', tipo: 'celula', rotulo: 'Procurar o que está na célula', escolha: 'Escolha a célula com o item' },
      { id: 'em', tipo: 'coluna', rotulo: 'na coluna', escolha: 'Escolha a coluna onde procurar' },
      { id: 'traz', tipo: 'coluna', rotulo: 'e trazer da coluna', escolha: 'Escolha a coluna do resultado' },
      { id: 'senao', tipo: 'texto', rotulo: 'se não achar, mostrar', padrao: 'Não achou' },
    ],
    montar: (v) => (v.cel && v.em && v.traz ? { texto: `PROCX(${v.cel};${v.em};${v.traz};${valorNaFormula(v.senao)})` } : null),
  },
  {
    id: 'seMaior', nome: 'Se for maior ou menor que, mostrar...', exemplo: (a) => (a.numero ? `Se ${a.numero.titulo} for maior ou igual a 0,5, mostrar "OK"; se não, "Ajustar".` : 'Se uma célula for maior ou menor que um valor, mostrar um texto; se não, outro.'),
    campos: [
      { id: 'cel', tipo: 'celula', rotulo: 'Se a célula', escolha: 'Escolha a célula' },
      { id: 'comp', tipo: 'comparaCel', rotulo: '', padrao: '>=' },
      { id: 'valor', tipo: 'texto', rotulo: 'valor', padrao: '0,5' },
      { id: 'sim', tipo: 'texto', rotulo: 'mostrar', padrao: 'OK' },
      { id: 'nao', tipo: 'texto', rotulo: 'se não, mostrar', padrao: 'Ajustar' },
    ],
    montar: (v) => (v.cel ? { texto: `SE(${v.cel}${v.comp}${valorNaFormula(v.valor)};${valorNaFormula(v.sim)};${valorNaFormula(v.nao)})` } : null),
  },
  {
    id: 'faixa', nome: 'Está dentro da faixa?', exemplo: (a) => (a.numero ? `${a.numero.titulo} está entre 0,5 e 2?` : 'Um número está entre um mínimo e um máximo?'),
    campos: [
      { id: 'cel', tipo: 'celula', rotulo: 'A célula', escolha: 'Escolha a célula' },
      { id: 'min', tipo: 'texto', rotulo: 'está entre', padrao: '0,5' },
      { id: 'max', tipo: 'texto', rotulo: 'e', padrao: '2' },
      { id: 'sim', tipo: 'texto', rotulo: 'se estiver, mostrar', padrao: 'OK' },
      { id: 'nao', tipo: 'texto', rotulo: 'se não, mostrar', padrao: 'Fora da faixa' },
    ],
    montar: (v) => (v.cel ? { texto: `SE(E(${v.cel}>=${valorNaFormula(v.min)};${v.cel}<=${valorNaFormula(v.max)});${valorNaFormula(v.sim)};${valorNaFormula(v.nao)})` } : null),
  },
  {
    id: 'dias', nome: 'Dias entre duas datas', exemplo: (a) => (a.data ? `Quantos dias passaram desde ${a.data.titulo}?` : 'Quantos dias há entre duas datas (ou de uma data até hoje)?'),
    campos: [
      { id: 'ini', tipo: 'celula', rotulo: 'Da data na célula', escolha: 'Escolha a célula da data', espera: 'data' },
      { id: 'fim', tipo: 'celula', rotulo: 'até a data na célula (vazio = hoje)', opcional: true, escolha: 'opcional: célula da data final', espera: 'data' },
    ],
    montar: (v) => (v.ini ? { texto: `${v.fim || 'HOJE()'}-${v.ini}`, nf: '0' } : null),
  },
  {
    id: 'porcentagem', nome: 'Porcentagem de...', exemplo: (a) => (a.texto ? `Quantos % das linhas de ${a.texto.titulo} estão como "${a.texto.valor}"?` : 'Quantos % das linhas de uma coluna têm um certo valor?'),
    campos: [
      { id: 'col', tipo: 'coluna', rotulo: 'Na coluna', escolha: 'Escolha a coluna' },
      { id: 'comp', tipo: 'comparacao', rotulo: 'a porcentagem das células que', padrao: 'igual' },
      { id: 'valor', tipo: 'texto', rotulo: 'valor', padrao: 'OK' },
    ],
    montar: (v) => (v.col && !faltaValor(v) ? { texto: `CONT.SE(${v.col};${criterio(v.comp, v.valor)})/CONT.VALORES(${v.col})`, nf: '0.0%' } : null),
  },
  {
    id: 'juntar', nome: 'Juntar textos', exemplo: (a) => (a.chave && a.outra ? `Juntar ${a.chave.titulo} e ${a.outra.titulo} numa célula só.` : 'Juntar o texto de duas ou três células numa só.'),
    campos: [
      { id: 'a', tipo: 'celula', rotulo: 'Juntar a célula', escolha: 'Escolha a célula' },
      { id: 'b', tipo: 'celula', rotulo: 'com a célula', escolha: 'Escolha a célula' },
      { id: 'c', tipo: 'celula', rotulo: 'e a célula (opcional)', opcional: true },
      { id: 'sep', tipo: 'texto', rotulo: 'pondo entre elas', padrao: ' - ' },
    ],
    montar: (v) => (v.a && v.b ? { texto: `UNIRTEXTO(${'"' + String(v.sep ?? '').replace(/"/g, '""') + '"'};VERDADEIRO;${[v.a, v.b, v.c].filter(Boolean).join(';')})` } : null),
  },
  {
    id: 'espacos', nome: 'Tirar espaços sobrando', exemplo: (a) => (a.texto ? `Tirar espaços sobrando do texto de ${a.texto.titulo} (o PROCV passa a achar).` : 'Tirar espaços sobrando de um texto (o PROCV passa a achar).'),
    campos: [{ id: 'cel', tipo: 'celula', rotulo: 'Do texto na célula', escolha: 'Escolha a célula' }],
    montar: (v) => (v.cel ? { texto: `ARRUMAR(${v.cel})` } : null),
  },
  {
    id: 'contarEntre', nome: 'Contar entre duas datas',
    exemplo: (a) => (a.data ? `Quantas linhas de ${a.data.titulo} caem entre duas datas (ex.: de 01/10/2026 a 31/10/2026)?` : 'Quantas linhas têm data entre duas datas?'),
    campos: [
      { id: 'col', tipo: 'coluna', rotulo: 'Na coluna de datas', escolha: 'Escolha a coluna de datas' },
      { id: 'de', tipo: 'data', rotulo: 'de', escolha: 'ex.: 01/10/2026 ou B1' },
      { id: 'ate', tipo: 'data', rotulo: 'até', escolha: 'ex.: 31/10/2026 ou B2' },
    ],
    montar: (v) => {
      const de = dataNaFormula(v.de), ate = dataNaFormula(v.ate);
      return v.col && de && ate ? { texto: `CONT.SES(${v.col};">="&${de};${v.col};"<="&${ate})` } : null;
    },
  },
  {
    id: 'desvio', nome: 'Desvio padrão de...',
    exemplo: (a) => (a.numero ? `O desvio padrão de ${a.numero.titulo}: quanto os valores se espalham em volta da média.` : 'Quanto os valores de uma coluna se espalham em volta da média.'),
    campos: [
      { id: 'col', tipo: 'coluna', rotulo: 'Da coluna', escolha: 'Escolha a coluna dos números' },
      { id: 'tipo', tipo: 'escolha', rotulo: 'considerando', padrao: 'amostra', opcoes: [{ id: 'amostra', nome: 'uma amostra (o mais comum)' }, { id: 'populacao', nome: 'a população inteira' }] },
    ],
    montar: (v) => (v.col ? { texto: `${v.tipo === 'populacao' ? 'DESVPAD.P' : 'DESVPAD.A'}(${v.col})` } : null),
  },
];

export { faltaValor };
