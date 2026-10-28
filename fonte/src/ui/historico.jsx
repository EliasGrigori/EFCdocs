/* EFCdocs — linha do tempo do desfazer (PL17): os passos com nome; tocar num deles volta até ali.
   Vale para todos os módulos (quadro, planilha e, depois, documento). */
import { Janela, Icone } from './comum.jsx';

export function LinhaDoTempo({ h, aoIr, aoFechar }) {
  const feitos = h.feitos;
  const desfeitos = [...h.desfeitos].reverse();
  return (
    <Janela titulo="Linha do tempo do desfazer" icone="historico" aoFechar={aoFechar} classe="linha-tempo">
      <div className="janela-c">
        <p className="qd-dica">Toque num passo para voltar até ele (ou avançar de novo). Guarda os últimos {h.limite} passos desta sessão.</p>
        <ol className="lt-lista">
          {desfeitos.map((d, i) => (
            <li key={'r' + i} className="desfeito">
              <button type="button" onClick={() => { aoIr(feitos.length + desfeitos.length - i); aoFechar(); }}>
                <Icone n="refazer" /><span>{d.rotulo || 'Ação'}</span><small>desfeito</small>
              </button>
            </li>
          ))}
          <li className="agora"><span><Icone n="check" />Agora</span></li>
          {[...feitos].reverse().map((d, i) => (
            <li key={'f' + i}>
              <button type="button" onClick={() => { aoIr(feitos.length - i - 1); aoFechar(); }} title="Voltar até antes deste passo">
                <Icone n="desfazer" /><span>{d.rotulo || 'Ação'}</span><small>{i === 0 ? 'último' : `${i + 1} passos atrás`}</small>
              </button>
            </li>
          ))}
          <li className="inicio"><span>Quando o arquivo foi aberto</span></li>
        </ol>
      </div>
    </Janela>
  );
}
