/* EFCdocs — abrir e salvar Excel a partir da tela.
   Abrir: o arquivo é lido num trabalhador (código montado junto com o app, sem baixar nada); sem trabalhador, lê aqui mesmo.
   Salvar: monta o .xlsx e baixa. */
import { gravarXlsx } from './gravar.js';

/* o build põe aqui o código do trabalhador (scripts/build.mjs); nos testes ele não existe */
const CODIGO = typeof __EFC_TRABALHADOR_XLSX__ === 'string' ? __EFC_TRABALHADOR_XLSX__ : null; // eslint-disable-line no-undef

export const MAX_BYTES = 80 * 1024 * 1024;
export const ehExcel = (nome) => /\.(xlsx|xlsm|xltx|xltm)$/i.test(String(nome || ''));

/** Lê o arquivo escolhido. aoProgresso({ fase, aba, i, n, linha }). Devolve { conteudo, relatorio }. */
export async function lerArquivoExcel(arquivo, aoProgresso = () => {}) {
  if (!ehExcel(arquivo.name)) {
    if (/\.xls$/i.test(arquivo.name)) throw new Error('Este é o formato antigo do Excel (.xls). No Excel, use "Salvar como" → "Pasta de Trabalho do Excel (.xlsx)" e abra o novo arquivo.');
    if (/\.(csv|ods|docx?)$/i.test(arquivo.name)) throw new Error('Por enquanto o EFCdocs abre só arquivos do Excel (.xlsx ou .xlsm).');
    throw new Error('Escolha um arquivo do Excel (.xlsx ou .xlsm).');
  }
  if (arquivo.size > MAX_BYTES) throw new Error(`O arquivo tem ${(arquivo.size / 1048576).toFixed(0)} MB; o limite aqui é ${MAX_BYTES / 1048576} MB.`);
  const bytes = await arquivo.arrayBuffer();
  if (CODIGO && typeof Worker === 'function' && typeof Blob === 'function') {
    try {
      return await new Promise((ok, falha) => {
        const url = URL.createObjectURL(new Blob([CODIGO], { type: 'text/javascript' }));
        const w = new Worker(url);
        const fim = () => { w.terminate(); URL.revokeObjectURL(url); };
        w.onmessage = (ev) => {
          const d = ev.data || {};
          if (d.tipo === 'progresso') aoProgresso(d.p);
          else if (d.tipo === 'pronto') { fim(); ok({ conteudo: d.conteudo, relatorio: d.relatorio }); } else if (d.tipo === 'erro') { fim(); falha(new Error(d.msg)); }
        };
        w.onerror = (ev) => { fim(); falha(new Error((ev && ev.message) || 'O leitor de Excel parou.')); };
        w.postMessage({ bytes, nome: arquivo.name }, [bytes]);
      });
    } catch (e) {
      if (!/parou|Worker/i.test(e.message)) throw e;
    }
  }
  const { lerXlsx } = await import('./ler.js');
  return lerXlsx(new Uint8Array(bytes.byteLength ? bytes : await arquivo.arrayBuffer()), { nomeArquivo: arquivo.name, aoProgresso });
}

/** Monta o .xlsx e baixa com o nome do arquivo. Devolve os avisos. */
export async function baixarXlsx(conteudo, motor, nome) {
  const { bytes, avisos } = await gravarXlsx(conteudo, motor, { titulo: nome });
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = String(nome || 'planilha').replace(/[\\/:*?"<>|]/g, '_') + '.xlsx';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
  return { avisos, bytes: bytes.length };
}
