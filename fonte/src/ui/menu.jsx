/* EFCdocs — menu lateral (igual ao .rail do EFClaudian), gaveta do celular e barra de baixo do celular. */
import { useEffect, useState } from 'react';
import { PERFIS } from '../nucleo/perfis.js';
import { Icone, Marca, irPara, usarEsc } from './comum.jsx';

const PRINCIPAIS = [['', 'casa', 'Início'], ['planilha', 'planilha', 'Planilhas'], ['docx', 'docx', 'Documentos'], ['postits', 'postits', 'Quadros']];
/* v0.4.9 (L04): como o Drive: Início, "Meus arquivos", Organizar e a Lixeira embaixo. [rota, ícone, nome, versão em que chega] */
const INICIO = PRINCIPAIS[0];
const MEUS = PRINCIPAIS.slice(1);
const ORGANIZAR = [['pastas', 'pasta', 'Pastas', 'v0.8.0'], ['externos', 'externo', 'Documentos externos', 'v0.8.0']];
const LIXEIRA = ['lixeira', 'lixeira', 'Lixeira'];
const NOVOS = [['arquivo.novaPlanilha', 'planilha', 'Planilha', 'planilha'], ['arquivo.novoDocumento', 'docx', 'Documento', 'docx'], ['arquivo.novoQuadro', 'postits', 'Quadro', 'postits']];

const ativo = (rota, modAtual, alvo) => (alvo === '' ? rota === '' : rota === alvo || (modAtual === alvo && rota.startsWith('arq/')));

export function Menu({ rota, modAtual, cont, prefs, cx, gaveta, fechar }) {
  const ir = (r) => { irPara(r); if (fechar) fechar(); };
  const link = ([r, ic, nome, chega]) => (
    <a key={r} href={'#/' + r} className={'rn' + (ativo(rota, modAtual, r) ? ' active' : '')}
      title={chega ? `${nome}: chega na ${chega}. Toque para ver o que vai ter.` : nome}
      aria-current={ativo(rota, modAtual, r) ? 'page' : undefined}
      onClick={(ev) => { ev.preventDefault(); ir(r); }}>
      <Icone n={ic} />
      <span>{nome}</span>
      {chega ? <span className="em" aria-label={'chega na ' + chega}>em breve</span> : cont[r] ? <span className="qt">{cont[r]}</span> : null}
    </a>
  );
  const recolhido = prefs.menu === 'icones';
  const [novoAberto, setNovoAberto] = useState(false);
  /* v0.5.1: a lista do Novo fecha com Esc em qualquer lugar e com um clique fora dela */
  usarEsc(() => setNovoAberto(false), novoAberto); // v0.6.0: Esc em pilha (fecha só a camada de cima)
  useEffect(() => {
    if (!novoAberto) return undefined;
    const fora = (ev) => { if (!(ev.target.closest && ev.target.closest('.novo-drive'))) setNovoAberto(false); };
    addEventListener('pointerdown', fora, true);
    return () => removeEventListener('pointerdown', fora, true);
  }, [novoAberto]);
  return (
    <nav className={gaveta ? 'gaveta' : 'rail'} aria-label="Menu principal">
      <div className="brand">
        {!gaveta && (
          <button type="button" className="iconbtn brand-recolhe" title={recolhido ? 'Abrir o menu completo' : 'Recolher o menu (só ícones)'}
            aria-label={recolhido ? 'Abrir o menu completo' : 'Recolher o menu (só ícones)'}
            onClick={() => cx.executar(recolhido ? 'exibir.menuCompleto' : 'exibir.menuIcones')}><Icone n="menu" /></button>
        )}
        <Marca className="brand-mark" />
        <div className="brand-txt">
          <div className="brand-name">EFCdocs</div>
          <div className="brand-sub">Planilha · Documento · Quadro</div>
        </div>
        {gaveta && <button type="button" className="iconbtn" aria-label="Fechar menu" onClick={fechar}><Icone n="x" /></button>}
      </div>
      <div className="novo-drive">
        <button type="button" className="btn primary novo-drive-b" aria-expanded={novoAberto} aria-haspopup="menu" title="Criar um arquivo novo" onClick={() => setNovoAberto(!novoAberto)}>
          <Icone n="plus" /><span>Novo</span>
        </button>
        {novoAberto && (
          <div className="novo-drive-m card" role="menu">
            {NOVOS.map(([cmd, ic, nome, t]) => (
              <button key={t} type="button" role="menuitem" disabled={!!cx.bloqueado(cmd)} onClick={() => { setNovoAberto(false); if (fechar) fechar(); cx.executar(cmd); }}><Icone n={ic} />{nome}</button>
            ))}
            <div className="novo-drive-sep" />
            <button type="button" role="menuitem" data-novo-excel onClick={() => { setNovoAberto(false); if (fechar) fechar(); cx.executar('arquivo.abrir'); }}><Icone n="excel" />Abrir do Excel (.xlsx)</button>
          </div>
        )}
      </div>
      {link(INICIO)}
      <div className="rail-sep">Meus arquivos</div>
      {MEUS.map(link)}
      <div className="rail-sep">Organizar</div>
      {ORGANIZAR.map(link)}
      <div className="rail-baixo">
        {link(LIXEIRA)}
        {!gaveta && (
          <button type="button" className="rn oculta-menu" data-menu-ocultar title="Esconder o menu (a tela fica toda para o arquivo). Para voltar, use a setinha na borda esquerda."
            aria-label="Esconder o menu lateral" onClick={() => cx.executar('exibir.menuOculto')}>
            <Icone n="tela" /><span>Esconder menu</span>
          </button>
        )}
      </div>
      <button type="button" className="rail-user" title="Perfil de teste (muda em Opções)" onClick={() => cx.executar('app.opcoes')}>
        <span className="av">EF</span>
        <div><b>Neste aparelho</b><span>Perfil de teste: {PERFIS[prefs.perfil].nome}</span></div>
      </button>
    </nav>
  );
}

/** Celular, fora de um arquivo: os quatro módulos sempre a um toque (achado 4 do Grok). */
export function BarraCelular({ rota, cont, abrirGaveta }) {
  return (
    <nav className="navcel" aria-label="Módulos">
      {PRINCIPAIS.map(([r, ic, nome]) => (
        <a key={r} href={'#/' + r} className={rota === r ? 'on' : ''} aria-current={rota === r ? 'page' : undefined}
          onClick={(ev) => { ev.preventDefault(); irPara(r); }}>
          <Icone n={ic} />
          <span>{nome}</span>
          {cont[r] ? <i className="qt">{cont[r]}</i> : null}
        </a>
      ))}
      <button type="button" onClick={abrirGaveta} aria-label="Mais: pastas, documentos externos e lixeira">
        <Icone n="menu" /><span>Mais</span>
      </button>
    </nav>
  );
}
