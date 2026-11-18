/* Vértice Docs — arquivo solto em cima do app (v0.6.22, D-62): o que fazer com cada tipo. Regra pura, sem tela. */

const EXCEL = /\.(xlsx|xlsm|xltx|xltm)$/i;

/** 'excel' (abre como planilha nova), 'excelAntigo' (.xls), 'csv', 'word', 'pdf' ou 'outro'. */
export function tipoDoArquivo(nome = '', mime = '') {
  const n = String(nome).toLowerCase(), m = String(mime).toLowerCase();
  if (EXCEL.test(n) || m.includes('spreadsheetml') || m.includes('ms-excel.sheet.macroenabled')) return 'excel';
  if (/\.xls$/.test(n) || m === 'application/vnd.ms-excel') return 'excelAntigo';
  if (/\.csv$/.test(n) || m === 'text/csv') return 'csv';
  if (/\.(docx|docm|doc|dotx)$/.test(n) || m.includes('wordprocessingml') || m === 'application/msword') return 'word';
  if (/\.pdf$/.test(n) || m === 'application/pdf') return 'pdf';
  return 'outro';
}

/** O aviso para o que ainda não abre (null quando abre). */
export function avisoDoArquivo(tipo, nome = '') {
  const q = nome ? `"${nome}"` : 'Este arquivo';
  switch (tipo) {
    case 'excel': return null;
    case 'excelAntigo': return `${q} é do Excel antigo (.xls). Abra no Excel, use Salvar como › Pasta de Trabalho do Excel (.xlsx) e solte o arquivo novo aqui.`;
    case 'csv': return `${q} é um CSV. Abrir CSV ainda não chegou; abra no Excel, salve como .xlsx e solte aqui.`;
    case 'word': return `${q} é do Word. Abrir Word chega com o editor do Documento (v0.7.0).`;
    case 'pdf': return `${q} é um PDF. Guardar e abrir PDF chega com os Documentos externos.`;
    default: return `${q} não é um arquivo que o Vértice abre. Solte um arquivo do Excel (.xlsx ou .xlsm).`;
  }
}

/** O arrasto traz arquivos? (texto ou imagem de outra janela não contam) */
export const trazArquivo = (dt) => !!dt && Array.from(dt.types || []).includes('Files');
