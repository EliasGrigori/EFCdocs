/* Vértice Docs · Quadro · comandos de Letra e Textura do post-it (v0.6.57). Quadro.jsx só chama daqui. */
import { mudancasFonteQ, valorFonteQ, aceitaFonte, garantirFonte, fonteValida, FONTES_Q } from './fontesQ.js';
import { mudancasTextura, valorTextura, TEXTURAS } from './texturas.js';
import { mudancasEtiqueta, novaEtiqueta, valorEtiqueta, etiquetasDe } from './etiquetas.js'; /* v0.6.66 (N1) */

export function trataEstiloQuadro(id, { c, selecionados, aplicarQ, avisar, perguntar }) {
  const [base, valor = ''] = String(id).split('|');
  if (base === 'formatar.etiqueta' || base === 'formatar.etiquetaNova') return trataEtiqueta(base, valor, { c, selecionados, aplicarQ, avisar, perguntar });
  if (base !== 'formatar.fonteQ' && base !== 'formatar.textura') return undefined;
  if (base === 'formatar.fonteQ') {
    const alvo = selecionados.filter((i) => aceitaFonte(c.itens[i]));
    if (!alvo.length) { avisar('Escolha no quadro um post-it, uma forma ou um texto para trocar a letra.', { ic: 'info' }); return true; }
    if (valor && !fonteValida(valor)) return true;
    garantirFonte(valor);
    const nome = (FONTES_Q.find((f) => f.id === valor) || FONTES_Q[0]).nome.split(' · ')[0];
    aplicarQ(mudancasFonteQ(c, alvo, valor), 'Letra: ' + nome, 'formatou');
    return true;
  }
  const alvo = selecionados.filter((i) => c.itens[i] && c.itens[i].tipo === 'postit');
  if (!alvo.length) { avisar('Escolha no quadro um ou mais post-its para trocar a textura.', { ic: 'info' }); return true; }
  const t = TEXTURAS.find((x) => x.id === valor);
  if (!t) return true;
  aplicarQ(mudancasTextura(c, alvo, valor), 'Textura: ' + t.nome, 'formatou');
  return true;
}

/** O que a faixa mostra na caixa Letra e marca na lista Textura (ou undefined se não é daqui). */
export function valorEstiloQuadro(id, c, selecionados) {
  if (id === 'valor.fonteQ') return valorFonteQ(c, selecionados);
  if (id === 'valor.textura') return valorTextura(c, selecionados);
  if (id === 'valor.etiqueta') return valorEtiqueta(c, selecionados);
  return undefined;
}

/* v0.6.66 (N1): Página Inicial › Post-it › Etiqueta (escolher, tirar ou criar uma nova, que já vai para os escolhidos) */
function trataEtiqueta(base, valor, { c, selecionados, aplicarQ, avisar, perguntar }) {
  const alvo = selecionados.filter((i) => c.itens[i] && c.itens[i].tipo === 'postit');
  if (!alvo.length) { avisar('Escolha no quadro um ou mais post-its para pôr a etiqueta.', { ic: 'info' }); return true; }
  if (base === 'formatar.etiqueta') {
    const e = etiquetasDe(c).find((x) => x.id === valor);
    if (valor && !e) return true;
    const mud = mudancasEtiqueta(c, alvo, valor);
    if (Object.keys(mud).length) aplicarQ(mud, e ? 'Etiqueta: ' + e.nome : 'Tirar etiqueta', 'formatou');
    return true;
  }
  if (!perguntar) return true;
  perguntar({ titulo: 'Nova etiqueta', campo: 'Nome da etiqueta (ex.: o setor ou a frente de trabalho)', valor: '', confirmar: 'Criar e pôr', max: 30,
    validar: (v) => (v.trim() ? '' : 'Digite um nome.'),
    aoConfirmar: (nome) => {
      const r = novaEtiqueta(c, nome);
      if (r.erro) { avisar(r.erro, { ic: 'aviso' }); return; }
      const c2 = r.mudancas.etiquetas ? { ...c, etiquetas: r.mudancas.etiquetas } : c;
      aplicarQ({ ...r.mudancas, ...mudancasEtiqueta(c2, alvo, r.id) }, 'Etiqueta: ' + nome.trim(), 'formatou');
    } });
  return true;
}
