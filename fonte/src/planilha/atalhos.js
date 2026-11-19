/* Vértice Docs — atalhos do Excel em português na planilha (v0.6.23).
   Lista conferida na página "Atalhos de teclado no Excel" do suporte da Microsoft em português (17/11/2026).
   atalhoDe(ev) só decide (regra pura, testável); fazerAtalho(id, p) faz, com o que a planilha passa em p.
   Ids: "comando" ou "comando|valor" (a planilha trata), "cx:comando" (o app trata), "@ação" (aqui).
   O que o navegador não deixa um site usar numa aba comum (Ctrl+N, Ctrl+T, Ctrl+W) só funciona com o app instalado;
   por isso o negrito também vale em Ctrl+2 e em Ctrl+Alt+N (o mesmo do Excel na Web). */

const dig = (key, code) => { const m = /^(?:Digit|Numpad)(\d)$/.exec(code || ''); return m ? m[1] : /^\d$/.test(key || '') ? key : null; };

/** O que a tecla pede na planilha (fora da edição de uma célula). null = não é atalho daqui. */
export function atalhoDe({ key = '', code = '', ctrlKey = false, metaKey = false, shiftKey = false, altKey = false }) {
  const ctrl = ctrlKey || metaKey, k = key.toLowerCase(), d = dig(key, code);
  if (!ctrl) {
    if (key === 'F3' && shiftKey && !altKey) return 'formula.inserir';
    if (key === 'F7' && !shiftKey && !altKey) return 'revisao.ortografia';
    if ((key === 'F11' && shiftKey && !altKey) || (key === 'F1' && shiftKey && altKey)) return 'planilha.novaAba';
    if (altKey && !shiftKey && (key === '=' || code === 'Equal')) return 'formula.autosoma';
    if (altKey && shiftKey && key === 'ArrowRight') return 'dados.agrupar'; /* v0.6.37 */
    if (altKey && shiftKey && key === 'ArrowLeft') return 'dados.desagrupar';
    return null;
  }
  if (altKey) {
    if (k === 'n') return 'formatar.negrito';
    if (k === 't') return 'inserir.tabela';
    if (k === 'v') return 'editar.colarValores';
    if (key === '=' || key === '+' || code === 'Equal' || code === 'NumpadAdd') return '@zoomMais';
    if (key === '-' || code === 'Minus' || code === 'NumpadSubtract') return '@zoomMenos';
    return null;
  }
  if (shiftKey) {
    if (k === 'z') return 'cx:editar.refazer';
    if (k === 'u') return 'exibir.barraFormula';
    if (k === 'l') return 'dados.filtrar';
    if (key === ' ') return '@tudo';
    if (key === '~' || code === 'Backquote') return 'formatar.formatoNumero|geral';
    if (key === '!' || d === '1') return 'formatar.formatoNumero|numero';
    if (key === '@' || d === '2') return 'formatar.formatoNumero|hora';
    if (key === '#' || d === '3') return 'formatar.formatoNumero|data';
    if (key === '$' || d === '4') return 'formatar.moeda';
    if (key === '%' || d === '5') return 'formatar.porcentagem';
    if (key === '^' || key === '¨' || d === '6') return 'formatar.formatoNumero|cientifico';
    if (key === '&' || d === '7') return '@borda:contorno';
    if (key === '*' || d === '8') return '@regiao';
    if (key === '_' || code === 'Minus') return '@borda:nenhuma';
    if (key === '+' || code === 'Equal' || code === 'NumpadAdd') return '@inserir';
    if (key === ':' || key === ';' || code === 'Semicolon') return '@hora';
    return null;
  }
  if (k === 'z') return 'cx:editar.desfazer';
  if (k === 'y') return 'cx:editar.refazer';
  if (k === 'a' || k === 't') return '@tudo';
  if (k === 'n' || d === '2') return 'formatar.negrito';
  if (k === 'i' || d === '3') return 'formatar.italico';
  if (k === 's' || d === '4') return 'formatar.sublinhado';
  if (d === '5') return 'formatar.tachado';
  if (d === '9') return 'planilha.ocultarLinha';
  if (d === '0') return 'planilha.ocultarColuna';
  if (d === '1') return 'formatar.formatoNumero';
  if (k === 'b') return 'cx:arquivo.salvar';
  if (k === 'u' || k === 'l' || k === 'f') return 'editar.localizar';
  if (k === 'd') return 'editar.preencherBaixo';
  if (k === 'r') return 'editar.preencherDireita';
  if (k === 'k') return 'inserir.link';
  if (k === 'g') return 'cx:app.buscar';
  if (key === ';' || code === 'Semicolon') return '@data';
  if (key === "'") return '@formulaDeCima';
  if (key === '-' || code === 'Minus' || code === 'NumpadSubtract') return '@excluir';
  if (key === '+' || code === 'NumpadAdd') return '@inserir';
  return null;
}

/** Linhas inteiras ou colunas inteiras escolhidas? (para Ctrl+- e Ctrl++) */
export function eixoInteiro(f, maxLin, maxCol) {
  if (f.c1 === 0 && f.c2 >= maxCol - 1) return 'linha';
  if (f.l1 === 0 && f.l2 >= maxLin - 1) return 'coluna';
  return null;
}

/** Faz o atalho. p = { trata(id), executar(id), tudo(), regiao(), agora(tipo), formulaDeCima(), bordas(tipo, nome), zoom(passo), faixa(), maxLin, maxCol, avisar } */
export function fazerAtalho(id, p) {
  if (id.startsWith('cx:')) { p.executar(id.slice(3)); return true; }
  if (!id.startsWith('@')) return p.trata(id);
  const [acao, arg] = id.slice(1).split(':');
  switch (acao) {
    case 'tudo': p.tudo(); return true;
    case 'regiao': p.regiao(); return true;
    case 'data': case 'hora': p.agora(acao); return true;
    case 'formulaDeCima': p.formulaDeCima(); return true;
    case 'borda': p.bordas(arg, arg === 'contorno' ? 'Contorno' : 'Sem bordas'); return true;
    case 'zoomMais': p.zoom(0.1); return true;
    case 'zoomMenos': p.zoom(-0.1); return true;
    case 'inserir': case 'excluir': {
      const eixo = eixoInteiro(p.faixa(), p.maxLin, p.maxCol);
      if (!eixo) { p.avisar(`Para ${acao} com o atalho, escolha linhas inteiras (Shift+Espaço) ou colunas inteiras (Ctrl+Espaço).`, { ic: 'info' }); return true; }
      return p.trata(`planilha.${acao}${eixo === 'linha' ? 'Linha' : 'Coluna'}`);
    }
    default: return false;
  }
}
