/* Vértice Docs — Ponte 2 (v0.6.17): o painel "Campos do Cwork" (marcar, em cada célula, o dado que o EFCwork preenche)
   e a tela do pedido de impressão (prévia da cópia preenchida, Imprimir, Baixar PDF e a resposta ao EFCwork). */
import { useEffect, useMemo, useState } from 'react';
import { Icone } from '../ui/comum.jsx';
import { textoFaixa } from '../planilha/ref.js';
import { refAbsoluta } from '../planilha/operacoes.js';
import { svgDaPagina } from '../planilha/paginaDesenho.js';
import { imprimirPaginas } from '../planilha/imprimirLivro.js';
import { pdfDasPaginas, imagensDasPaginas, baixarBytes } from '../planilha/impressaoPdf.js';
import { EFD } from './ponte.js';
import { camposDoLivro, dicionario, capacidades } from './campos.js';
import { paginasDoPedido } from './pedido.js';
import { lerEstado, pegar, apagar, responder } from './caixa.js';

const nomeDe = (ch) => EFD.nomeExcel(ch.replace('[].', '.'));

/** Painel ao lado da planilha: escolhe a célula na grade e toca em Marcar no dado certo. Cada marca é um nome definido (efc_...). */
export function PainelCampos({ conteudo, sel, travado, aoMudar, aoFechar }) {
  const { campos, fora, excesso } = useMemo(() => camposDoLivro(conteudo), [conteudo]);
  const cap = useMemo(() => capacidades(conteudo, campos), [conteudo, campos]);
  const dic = useMemo(() => dicionario(), []);
  const marcado = new Map(campos.map((x) => [x.chave, x]));
  const cheio = campos.length + excesso >= EFD.CAMPOS_MAX;
  const onde = sel && conteudo.abas[sel.abaId] ? textoFaixa(sel.faixa) : '';
  const marcar = (d) => {
    const n = nomeDe(d.chave);
    aoMudar({ ['conteudo.nomes.' + n]: { n, ref: refAbsoluta(conteudo, sel.abaId, sel.faixa) } }, `Marcar campo: ${d.rotulo}`);
  };
  const tirar = (x) => { const nomes = { ...conteudo.nomes }; delete nomes[x.nome.toLowerCase()]; aoMudar({ 'conteudo.nomes': nomes }, `Tirar campo: ${x.rotulo}`); };
  let grupo = '';
  return (
    <aside className="resumo-envio painel-campos" aria-label="Campos do Cwork" data-campos>
      <div className="re-cab">
        <div><b>Campos do Cwork</b><span data-campos-conta>{campos.length} de {EFD.CAMPOS_MAX} marcados</span></div>
        <button type="button" className="iconbtn" aria-label="Fechar os campos" title="Fechar" onClick={aoFechar}><Icone n="x" /></button>
      </div>
      <p className="pc-dica">Clique na célula da planilha (na lista, selecione a coluna inteira das linhas) e toque em <b>Marcar</b> no dado que o Cwork deve pôr ali.{onde ? <> Seleção: <b data-campos-sel>{onde}</b>.</> : null}</p>
      {fora.length > 0 && <p className="pc-aviso" data-campos-fora>{fora.length === 1 ? 'Este nome começa' : 'Estes nomes começam'} com efc_ mas não {fora.length === 1 ? 'é campo' : 'são campos'} do Cwork: {fora.join(', ')}.</p>}
      {excesso > 0 && <p className="pc-aviso">O Cwork aceita até {EFD.CAMPOS_MAX} campos por documento: {excesso} {excesso === 1 ? 'ficou' : 'ficaram'} de fora.</p>}
      <div className="re-linhas">
        {dic.map((d) => {
          const x = marcado.get(d.chave), cab = d.grupo !== grupo ? (grupo = d.grupo) : null;
          return (
            <div key={d.chave}>
              {cab && <div className="pc-grupo">{cab}{d.lista && cap[d.lista] ? ` · cabem ${cap[d.lista]} ${cap[d.lista] === 1 ? 'linha' : 'linhas'}` : ''}</div>}
              <div className={'pc-linha' + (x ? ' on' : '')} data-campo={d.chave}>
                <span className="pc-rot">{d.rotulo}</span>
                {x ? (
                  <>
                    <span className="pc-onde" title={`${conteudo.abas[x.abaId].nome}!${textoFaixa(x)}`}>{textoFaixa(x)}</span>
                    <button type="button" className="iconbtn" disabled={travado} aria-label={`Tirar o campo ${d.rotulo}`} title="Tirar" onClick={() => tirar(x)}><Icone n="lixeira" /></button>
                  </>
                ) : (
                  <button type="button" className="btn sm" disabled={travado || !onde || cheio} data-campo-marcar={d.chave} onClick={() => marcar(d)}>Marcar</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

/** Tela do pedido de impressão: a cópia preenchida em memória, pronta para imprimir. O documento-modelo não muda. */
export function TelaPedido({ pid, local, banco, avisar, aoSair }) {
  const [fase, setFase] = useState('lendo');
  const [t, setT] = useState({});
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const item = local || await pegar(pid);
        if (!item || (!local && item.tipo !== 'pedido')) { if (vivo) { setT({ detalhe: 'Este pedido do Cwork não está mais na caixa deste aparelho.' }); setFase('erro'); } return; }
        const arquivo = await banco.abrir(item.docId);
        const r = paginasDoPedido(item, arquivo, (lerEstado()[item.docId] || {}).rev);
        if (r.erro && !local) { await responder(item, { ok: false, erro: r.erro }); await apagar(item.pid); }
        if (vivo) { setT({ item, nome: arquivo ? arquivo.ficha.nome : '', ...r }); setFase(r.erro ? 'erro' : 'pronto'); }
      } catch (e) { if (vivo) { setT({ detalhe: 'Não deu para montar a impressão: ' + (e.message || e) }); setFase('erro'); } }
    })();
    return () => { vivo = false; };
  }, [pid, local, banco]);
  const concluir = async (como) => {
    try {
      if (como === 'pdf') baixarBytes(pdfDasPaginas(t.paginas, { titulo: t.nome, imagens: await imagensDasPaginas(t.paginas) }), `${String(t.nome || 'ficha').replace(/[\\/:*?"<>|]/g, '_')} - preenchido.pdf`);
      else await imprimirPaginas(t.paginas, t.nome);
      if (!local) { await responder(t.item, { ok: true, paginas: t.paginas.length }); await apagar(t.item.pid); }
      setFase('feito');
    } catch (e) { avisar('Não deu para ' + (como === 'pdf' ? 'gerar o PDF: ' : 'imprimir: ') + (e.message || e), { ic: 'aviso', longo: true }); }
  };
  const n = (q, um, varios) => `${q} ${q === 1 ? um : varios}`;
  return (
    <div className="pagina pedido" data-pedido={fase}>
      <div className="pd-cab">
        <div>
          <h2 className="pg-tit">{local ? 'Preencher e imprimir' : 'Pedido do Cwork'}</h2>
          <p className="pd-sub">{fase === 'lendo' ? 'Montando a cópia preenchida…' : t.nome || 'Documento'}{fase === 'pronto' || fase === 'feito' ? ` · ${n(t.folhas, 'folha', 'folhas')} · ${n(t.paginas.length, 'página', 'páginas')}` : ''}</p>
        </div>
        <div className="pd-acoes">
          {fase === 'pronto' && <button type="button" className="btn sm" data-pedido-pdf onClick={() => concluir('pdf')}><Icone n="pdf" />Baixar PDF</button>}
          {fase === 'pronto' && <button type="button" className="btn sm primary" data-pedido-imprimir onClick={() => concluir('imprimir')}><Icone n="imprimir" />Imprimir</button>}
          <button type="button" className="btn sm" data-pedido-sair onClick={aoSair}>{fase === 'pronto' ? 'Agora não' : 'Voltar'}</button>
        </div>
      </div>
      {fase === 'erro' && <div className="pd-aviso crit" data-pedido-erro><b>Não deu para imprimir.</b> {t.detalhe}{t.erro && !local ? ' O Cwork foi avisado.' : ''}</div>}
      {fase === 'feito' && <div className="pd-aviso ok"><b>Pronto.</b> {local ? 'A cópia preenchida saiu; o documento guardado continua como modelo.' : 'O Cwork foi avisado; o documento guardado continua como modelo.'}</div>}
      {fase === 'pronto' && <p className="pd-dica">É uma cópia preenchida só para imprimir: nada disto fica gravado no documento.{local ? '' : ' "Agora não" deixa o pedido esperando na caixa.'}</p>}
      {(fase === 'pronto' || fase === 'feito') && (
        <div className="pd-paginas">
          {t.paginas.slice(0, 12).map((p, i) => <div key={i} className="pd-pg" style={{ aspectRatio: `${p.W} / ${p.H}` }} dangerouslySetInnerHTML={{ __html: svgDaPagina(p, { id: 'pd' + i + '_' }) }} />)}
          {t.paginas.length > 12 && <div className="pd-mais">e mais {n(t.paginas.length - 12, 'página', 'páginas')}</div>}
        </div>
      )}
    </div>
  );
}
