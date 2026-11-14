/* Vértice Docs — Ponte 2 (v0.6.17): do pedido do EFCwork às páginas prontas para imprimir.
   Preenche uma cópia em memória para cada folha, refaz as contas e monta as páginas pelo mesmo caminho do Imprimir. */
import { Motor } from '../planilha/motor.js';
import { normalizarPlanilha } from '../planilha/modelo.js';
import { normalizarImp } from '../planilha/impressao.js';
import { gerarImpressao } from '../planilha/imprimirLivro.js';
import { EFD } from './ponte.js';
import { camposDoLivro, preencher, conferirPedido, PAGINAS_MAX } from './campos.js';

/** arquivo: o que veio de banco.abrir (ou null). Devolve { erro, detalhe } ou { paginas, folhas, campos }. */
export function paginasDoPedido(item, arquivo, revAtual) {
  const serve = arquivo && arquivo.ficha.tipo === 'planilha' && arquivo.ficha.status !== 'lixeira';
  const c = serve ? normalizarPlanilha(arquivo.conteudo) : null;
  const r = conferirPedido(item, { c, revAtual });
  if (r.erro) return r;
  const { campos } = camposDoLivro(c);
  let paginas = [];
  for (const dados of r.folhas) {
    const { conteudo } = preencher(c, campos, dados);
    const abaId = conteudo.ordem.find((id) => !conteudo.abas[id].oculta) || conteudo.ordem[0];
    const g = gerarImpressao(conteudo, new Motor(conteudo), { imp: normalizarImp(conteudo.abas[abaId].imp), alvo: 'todas', abaId, nomeArquivo: arquivo.ficha.nome });
    if (!g.paginas.length) return { erro: 'nao-cabe', detalhe: g.aviso || 'Não há nada para imprimir neste documento.' };
    paginas = paginas.concat(g.paginas);
    if (paginas.length > PAGINAS_MAX) return { erro: 'nao-cabe', detalhe: `Passaria de ${PAGINAS_MAX} páginas: peça menos folhas ou diminua a área de impressão.` };
  }
  return { paginas, folhas: r.folhas.length, campos: campos.length };
}

/** "Preencher e imprimir" a partir do resumo do envio: vale só o que o documento tem marcado (o resto fica no painel). */
export function pedidoDoResumo(resumo, conteudo) {
  const marcados = new Set(camposDoLivro(conteudo).campos.map((x) => x.lista || x.chave)), dados = {};
  for (const [k, v] of Object.entries(resumo.dados || {})) if (marcados.has(k) && k in EFD.CAMPOS) dados[k] = v;
  return { local: true, pid: 'plocal00', docId: resumo.docId, de: 'efcwork', copias: 1, criadoEm: new Date().toISOString(), dados, titulo: resumo.titulo || '' };
}
