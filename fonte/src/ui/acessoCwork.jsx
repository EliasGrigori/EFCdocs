/* Vértice Docs · telas de acesso pelo Cwork (P2, aprovada em 26/11 06:02).
   - "Abra pelo Cwork": o Vértice publicado aberto fora do Cwork (decisão do Elias: só dentro do Cwork).
   - "Entre no Cwork": dentro do Cwork, mas ninguém logado (por exemplo, saiu da conta com a aba aberta): nada do aparelho aparece. */
import { Marca } from './comum.jsx';
import { ENDERECO_CWORK } from '../nucleo/loginCwork.js';

export function TelaAcesso({ tipo }) {
  const trava = tipo === 'trava';
  return (
    <main className="acesso-cwork" data-acesso={tipo} role="main" aria-labelledby="acesso-tit">
      <div className="acesso-cartao">
        <Marca className="acesso-marca" />
        <h1 id="acesso-tit">{trava ? 'O Vértice Docs abre pelo Cwork' : 'Entre no Cwork para continuar'}</h1>
        <p>{trava
          ? 'Os seus documentos, planilhas e quadros ficam numa aba do Cwork, com o mesmo login. Abra o Cwork e toque em Vértice Docs no menu.'
          : 'A conta saiu do Cwork. Entre de novo no Cwork, e o Vértice volta com os seus arquivos.'}</p>
        {trava && <a className="btn primary efl-bt-ouro" href={ENDERECO_CWORK} target="_top" data-abrir-cwork>Abrir o Cwork</a>}
      </div>
    </main>
  );
}
