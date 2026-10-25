/**
 * Formato que a fórmula "herda" ao ser digitada numa célula em Geral (como o Excel faz):
 * =DATA(...) e =HOJE() viram data; =AGORA() data e hora; =TEMPO(...) hora;
 * =A1 copia o formato de A1; =A1+1 com A1 data continua data (data - data fica número).
 */
import { lerGuardada } from './formula.js';
import { ehFormatoData } from './formato.js';

const DATA = 'dd/mm/yyyy';
const DATA_HORA = 'dd/mm/yyyy hh:mm';
const HORA = 'hh:mm';

const SAI_DATA = new Set(['DATE', 'TODAY', 'EDATE', 'EOMONTH', 'WORKDAY', 'DATEVALUE']);
const SAI_HORA = new Set(['TIME', 'TIMEVALUE']);
/* funções que devolvem um dos valores que receberam: herdam o formato do primeiro argumento com formato */
const REPASSA = new Set(['SUM', 'MAX', 'MIN', 'AVERAGE', 'MEDIAN', 'LARGE', 'SMALL', 'MAXIFS', 'MINIFS', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'TRUNC', 'ABS', 'INT']);
const ESCOLHE = { IF: [1, 2], IFERROR: [0, 1], IFNA: [0, 1], CHOOSE: null };

const geral = (nf) => !nf || /^general$/i.test(nf);
const ehHora = (nf) => ehFormatoData(nf) && !/[dy]/i.test(nf.replace(/"[^"]*"/g, ''));

/**
 * f: fórmula guardada (inglês, sem "="). nfDe(no): formato da célula do nó ref/area (canto de cima à esquerda).
 * Devolve o código de formato a usar, ou null para ficar em Geral.
 */
export function formatoDaFormula(f, nfDe) {
  let arv;
  try { arv = lerGuardada(f); } catch { return null; }
  const r = andar(arv, nfDe, 0);
  return r && !geral(r) ? r : null;
}

function andar(n, nfDe, prof) {
  if (!n || prof > 30) return null;
  switch (n.t) {
    case 'paren': return andar(n.a, nfDe, prof + 1);
    case 'un': return n.o === '+' ? andar(n.a, nfDe, prof + 1) : semData(andar(n.a, nfDe, prof + 1));
    case 'ref':
    case 'area': { const nf = nfDe(n); return geral(nf) || nf === '@' ? null : nf; }
    case 'bin': {
      if (n.o !== '+' && n.o !== '-') return null;
      const a = andar(n.a, nfDe, prof + 1), b = andar(n.b, nfDe, prof + 1);
      const da = a && ehFormatoData(a), db = b && ehFormatoData(b);
      if (n.o === '-' && da && db) {
        /* data - data dá dias (número); hora - hora continua hora */
        return ehHora(a) && ehHora(b) ? a : null;
      }
      if (da) return a;
      if (db) return b;
      return a || b || null;
    }
    case 'fn': {
      const nome = n.n;
      if (SAI_DATA.has(nome)) return DATA;
      if (nome === 'NOW') return DATA_HORA;
      if (SAI_HORA.has(nome)) return HORA;
      const args = n.args || [];
      if (REPASSA.has(nome)) {
        for (const a of args) { const r = andar(a, nfDe, prof + 1); if (r) return r; }
        return null;
      }
      if (nome in ESCOLHE) {
        const quais = ESCOLHE[nome] || args.map((_, i) => i).slice(1);
        for (const i of quais) { const r = andar(args[i], nfDe, prof + 1); if (r) return r; }
        return null;
      }
      return null;
    }
    default: return null;
  }
}

/* -A1 de uma data não é data */
function semData(nf) { return nf && ehFormatoData(nf) ? null : nf; }
