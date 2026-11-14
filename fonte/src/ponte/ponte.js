/* Vértice Docs — Ponte 1 com o EFCwork (v0.6.16). Regras sem tela: montar a ficha do contrato EFD v1, as sub-abas dos
   documentos internos, o resumo do envio (rótulos, valores mostrados como no Brasil, o que já está na ficha) e o estado
   de cada documento compartilhado. O contrato e a caixa de troca ficam em contrato/ (iguais aos do EFCwork, sem mudar). */
import EFD from '../../contrato/efd-v1.js';

export { EFD };
/* sub-abas de "Documentos internos" (pedido do Elias em 12/11; nomes confirmados na aprovação da v0.6.16) */
export const SUBABAS = ['Etiquetas', 'Fichas e custódias', 'Formulários', 'Fluxogramas', 'POPs e procedimentos'];
export const PODE_COMPARTILHAR = { planilha: true, postits: true, docx: false };
const PAPEL_EFD = { A4: 'A4', A5: 'A5' };

/* rótulos do dicionário de campos do contrato, em português simples */
export const ROTULOS = {
  'empresa.nome': 'Empresa', 'unidade.nome': 'Unidade', 'unidade.endereco': 'Endereço da unidade', 'unidade.cidade': 'Cidade da unidade',
  'lab.nome': 'Laboratório', 'lab.endereco': 'Endereço do laboratório', 'lab.cidade': 'Cidade do laboratório', 'lab.cep': 'CEP do laboratório',
  'lab.contato': 'Contato no laboratório', 'lab.telefone': 'Telefone do laboratório',
  'envio.data': 'Data do envio', 'envio.caixa': 'Número da caixa', 'envio.caixas': 'Quantidade de caixas', 'envio.amostras': 'Quantidade de amostras', 'envio.transporte': 'Transporte',
  'coleta.data': 'Data da coleta', 'coleta.hora': 'Hora da coleta', 'coleta.os': 'OS', 'coleta.solicitacao': 'Solicitação', 'coleta.coletor': 'Coletor',
  'coleta.analise': 'Análise', 'coleta.ponto': 'Ponto', 'coleta.talhao': 'Talhão', 'coleta.produto': 'Produto', 'coleta.qtd': 'Quantidade',
  'coleta.identificacao': 'Identificação', 'usuario.nome': 'Quem preencheu', 'hoje.data': 'Data de hoje', 'hoje.hora': 'Hora de agora',
  'doc.codigo': 'Código do documento', 'doc.rev': 'Revisão do documento', 'amostras[]': 'Lista de amostras', 'participantes[]': 'Participantes',
};
export const ROTULOS_COLUNA = { n: 'Nº', identificacao: 'Identificação', data: 'Data', hora: 'Hora', analise: 'Análise', ponto: 'Ponto', talhao: 'Talhão', produto: 'Produto', qtd: 'Qtd', nome: 'Nome', setor: 'Setor' };

const dataBr = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v ?? ''); };
const numBr = (v) => (typeof v === 'number' ? v.toLocaleString('pt-BR') : String(v ?? ''));

/** O valor como a pessoa vê: data 2026-11-12 → 12/11/2026, número com vírgula, o resto como veio. */
export function mostrar(tipo, v) {
  if (tipo === 'data') return dataBr(v);
  if (tipo === 'numero') return numBr(v);
  return String(v ?? '');
}

/** As linhas do resumo, na ordem do dicionário: { chave, rotulo, tipo, texto, bruto, linhas? (para as listas) }. */
export function linhasDoResumo(dados) {
  const d = dados && typeof dados === 'object' ? dados : {};
  const out = [];
  for (const chave of Object.keys(EFD.CAMPOS)) {
    if (!(chave in d)) continue;
    const tipo = EFD.CAMPOS[chave], v = d[chave];
    if (tipo === 'lista') {
      const cols = EFD.COLUNAS[chave];
      const linhas = (Array.isArray(v) ? v : []).map((r) => cols.filter((c) => r && r[c] != null && r[c] !== '').map((c) => (c === 'data' ? dataBr(r[c]) : c === 'qtd' ? numBr(r[c]) : String(r[c]))).join(' · '));
      out.push({ chave, rotulo: ROTULOS[chave] || chave, tipo, texto: `${linhas.length} ${linhas.length === 1 ? 'linha' : 'linhas'}`, bruto: v, linhas });
    } else out.push({ chave, rotulo: ROTULOS[chave] || chave, tipo, texto: mostrar(tipo, v), bruto: v });
  }
  return out;
}

/** "Copiar tudo": o resumo em texto, uma linha por dado. */
export function textoDoResumo(titulo, linhas) {
  const l = [titulo || 'Resumo do envio'];
  for (const x of linhas) {
    if (x.tipo === 'lista') { l.push(`${x.rotulo}:`); x.linhas.forEach((t) => l.push('  ' + t)); } else l.push(`${x.rotulo}: ${x.texto}`);
  }
  return l.join('\n');
}

const norm = (s) => String(s ?? '').normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
const serialDe = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 86400000) : null; };

/** Quais dados do resumo já estão em alguma célula da planilha (valor guardado, sem precisar abrir a conta).
    Texto: igual sem diferença de maiúsculas e espaços. Número: igual. Data: o número de série do Excel ou o texto 12/11/2026. */
export function noDocumento(conteudo, linhas) {
  const textos = new Set(), numeros = new Set();
  const abas = conteudo && conteudo.abas ? Object.values(conteudo.abas) : [];
  for (const a of abas) {
    for (const x of Object.values(a.cel || a.celulas || {})) {
      const v = x && typeof x === 'object' ? x.v : x;
      if (typeof v === 'number') numeros.add(v);
      else if (v != null && v !== '') textos.add(norm(v));
    }
  }
  const achou = new Set();
  for (const x of linhas) {
    if (x.tipo === 'lista') continue;
    const v = x.bruto;
    if (x.tipo === 'numero' ? numeros.has(v) || textos.has(norm(numBr(v))) : x.tipo === 'data' ? numeros.has(serialDe(v)) || textos.has(norm(dataBr(v))) : textos.has(norm(v))) achou.add(x.chave);
  }
  return achou;
}

/* tamanho em base64 e quantos pedaços de 900.000 letras o EFCwork vai gravar */
export const partesDe = (bytes) => Math.max(1, Math.ceil((Math.ceil(bytes / 3) * 4) / EFD.PARTE_MAX));

export async function sha256(bytes) {
  const d = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Monta o que vai para a caixa: a ficha do contrato (passa em EFD.ficha), o PDF e, se couber, o original.
 * entrada: { ficha (do Vértice), pdf: Uint8Array, paginas, papel, orient, original?: { bytes: Uint8Array, nome }, rev (a nova), agora, autor, campos?: [{ chave, rotulo, tipo }] }
 * Devolve { ficha, pdf: ArrayBuffer, original?: ArrayBuffer, nomeArquivo?, avisos } ou lança erro com o motivo.
 */
export async function montarEnvio({ ficha, pdf, paginas, papel, orient, original, rev, agora = new Date().toISOString(), autor = 'Vértice Docs (neste aparelho)', mm, campos = [] }) {
  const avisos = [];
  if (!pdf || !pdf.length) throw new Error('Não há nada para o PDF: o arquivo está vazio.');
  if (partesDe(pdf.length) > EFD.PARTES_MAX) throw new Error(`O PDF ficou com ${(pdf.length / 1048576).toFixed(1).replace('.', ',')} MB; o Cwork aceita até 3,3 MB. Diminua a área de impressão ou divida o arquivo.`);
  const papelEfd = PAPEL_EFD[papel] || 'A4';
  if (papel && !PAPEL_EFD[papel]) avisos.push(`O papel ${papel} vai como A4 para o Cwork (ele conhece A4, A5 e etiqueta).`);
  const quem = String(autor).slice(0, 80), id = 'vertice-docs';
  const pub = {
    rev, em: agora, porId: id, por: quem, formato: 'pdf', bytes: pdf.length, partes: partesDe(pdf.length), sha256: await sha256(pdf),
    paginas: Math.max(1, Math.min(200, paginas | 0)), papel: papelEfd, orient: orient === 'paisagem' ? 'paisagem' : 'retrato', preenche: campos.length ? 'docs' : 'nao', campos, /* v0.6.17 (Ponte 2): campos marcados por nome de célula */
  };
  if (papelEfd === 'etiqueta') pub.mm = mm;
  let orig = null, buf = null, nomeArquivo;
  if (original && original.bytes && original.bytes.length) {
    if (partesDe(original.bytes.length) <= EFD.ORIG_PARTES_MAX) {
      nomeArquivo = String(original.nome || ficha.nome + '.xlsx').replace(/[\\/:*?"<>|]/g, '_').slice(0, 140);
      orig = { formato: 'xlsx', bytes: original.bytes.length, partes: partesDe(original.bytes.length), sha256: await sha256(original.bytes), nomeArquivo };
      buf = original.bytes.slice().buffer;
    } else avisos.push(`A planilha original tem ${(original.bytes.length / 1048576).toFixed(1).replace('.', ',')} MB e o Cwork guarda até 1,3 MB: vai só o PDF.`);
  }
  const f = {
    v: 1, id: ficha.id, tipo: ficha.tipo, nome: ficha.nome, codigo: String(ficha.codigo || '').slice(0, 20), pasta: '', pastaNome: String(ficha.pastaNome || '').slice(0, 40),
    orig, status: 'vigente', rev, origem: 'docs', cancelado: false, motivo: '', lixeiraEm: null, pub,
    criadoPorId: id, criadoPor: String(ficha.criadoPor || quem).slice(0, 80), criadoEm: ficha.criadoEm || agora,
    alteradoPorId: id, alteradoPor: quem, alteradoEm: agora,
  };
  const erros = EFD.ficha(f);
  if (erros.length) throw new Error('A ficha não passou no contrato com o Cwork: ' + erros.join('; '));
  return { ficha: f, pdf: pdf.slice().buffer, original: buf, nomeArquivo, avisos };
}

/* estado de cada documento compartilhado, guardado no aparelho (fora do arquivo, para o desfazer não mexer nele):
   { [id]: { rev, pid, em, estado: 'caixa' | 'recebido' } } */
export function estadoDoc(mapa, id) {
  const e = mapa && mapa[id];
  if (!e) return { texto: 'Não compartilhado', tom: '' };
  if (e.estado === 'recebido') return { texto: `Recebido pelo Cwork · versão ${e.rev}`, tom: 'ok' };
  return { texto: `Na caixa do Cwork · versão ${e.rev}`, tom: 'warn' };
}
