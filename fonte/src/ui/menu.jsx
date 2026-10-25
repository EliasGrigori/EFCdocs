/* EFCdocs — menu lateral (igual ao .rail do EFClaudian), gaveta do celular e barra de baixo do celular. */
import { PERFIS } from '../nucleo/perfis.js';
import { Icone, Marca, irPara } from './comum.jsx';

const PRINCIPAIS = [['', 'casa', 'Início'], ['planilha', 'planilha', 'Planilhas'], ['docx', 'docx', 'Documentos'], ['postits', 'postits', 'Post-its']];
/* [rota, ícone, nome, versão em que chega] */
const ORGANIZAR = [['pastas', 'pasta', 'Pastas', 'v0.8.0'], ['externos', 'externo', 'Documentos externos', 'v0.8.0'], ['lixeira', 'lixeira', 'Lixeira']];

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
  return (
    <nav className={gaveta ? 'gaveta' : 'rail'} aria-label="Menu principal">
      <div className="brand">
        <Marca className="brand-mark" />
        <div className="brand-txt">
          <div className="brand-name">EFCdocs</div>
          <div className="brand-sub">Planilha · Doc · Post-its</div>
        </div>
        {gaveta && <button type="button" className="iconbtn" aria-label="Fechar menu" onClick={fechar}><Icone n="x" /></button>}
      </div>
      {PRINCIPAIS.map(link)}
      <div className="rail-sep">Organizar</div>
      {ORGANIZAR.map(link)}
      {!gaveta && (
        <button type="button" className="rn recolhe" title={recolhido ? 'Abrir o menu completo' : 'Recolher o menu (só ícones)'}
          aria-label={recolhido ? 'Abrir o menu completo' : 'Recolher o menu (só ícones)'}
          onClick={() => cx.executar(recolhido ? 'exibir.menuCompleto' : 'exibir.menuIcones')}>
          <Icone n="recolher" /><span>Recolher menu</span>
        </button>
      )}
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
