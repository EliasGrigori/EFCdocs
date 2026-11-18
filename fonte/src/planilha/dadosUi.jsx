/* EFCdocs — Planilha (v0.6.3): janelas de Classificar, Remover duplicados e Travar modelo, e o menu da seta do filtro. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icone, Janela, usarEsc } from '../ui/comum.jsx';
import { letraCol } from './ref.js';

/** Nome da coluna para mostrar: "Coluna B (Nome)" quando tem cabeçalho. */
export const rotuloColuna = (cc, cab, titulo) => `Coluna ${letraCol(cc)}${cab && titulo ? ' (' + String(titulo).slice(0, 28) + ')' : ''}`;

/* ---------- v0.6.24.1 (DL02): uma coluna só com dados ao lado, como o "Aviso de classificação" do Excel ---------- */
export function JanelaExpandirOrdem({ coluna, area, aoEscolher, aoFechar }) {
  const [exp, setExp] = useState(true);
  return (
    <Janela titulo="Aviso de classificação" icone="classificar" subtitulo={`Há dados ao lado de ${coluna}`} aoFechar={aoFechar} classe="pl-jdados" rodape={(
      <>
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-foco data-expandir-ok onClick={() => aoEscolher(exp)}>Classificar</button>
      </>
    )}>
      <div className="janela-c rg-corpo" data-expandir-ordem-janela>
        <section className="rg-cartao">
          <span className="rg-cab">Os dados ao lado não serão classificados se você continuar só com a coluna</span>
          <label className="dd-col"><input type="radio" name="expandir" checked={exp} data-expandir-ordem="expandir" onChange={() => setExp(true)} /><span>Expandir a seleção para {area} (as linhas ficam juntas)</span></label>
          <label className="dd-col"><input type="radio" name="expandir" checked={!exp} data-expandir-ordem="so" onChange={() => setExp(false)} /><span>Continuar só com {coluna}</span></label>
        </section>
      </div>
    </Janela>
  );
}

/* ---------- Classificar ---------- */
export function JanelaClassificar({ faixa, subtitulo, titulos, cabecalho0, colInicial, aoAplicar, aoFechar }) {
  const cols = [];
  for (let cc = faixa.c1; cc <= faixa.c2; cc++) cols.push(cc);
  const [cab, setCab] = useState(cabecalho0);
  const [niveis, setNiveis] = useState([{ col: colInicial != null && colInicial >= faixa.c1 && colInicial <= faixa.c2 ? colInicial : faixa.c1, desc: false }]);
  const [erro, setErro] = useState('');
  const muda = (i, p) => setNiveis((l) => l.map((n, k) => (k === i ? { ...n, ...p } : n)));
  const aplicar = () => { const e = aoAplicar({ niveis, cabecalho: cab }); if (e) setErro(e); };
  return (
    <Janela titulo="Classificar" icone="classificar" subtitulo={subtitulo} aoFechar={aoFechar} classe="pl-jdados" rodape={(
      <>
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" data-foco onClick={aplicar}>Pôr em ordem</button>
      </>
    )}>
      <div className="janela-c rg-corpo">
        <section className="rg-cartao">
          <span className="rg-cab">Por qual coluna</span>
          {niveis.map((n, i) => (
            <div key={i} className="dd-nivel" data-nivel={i}>
              <span className="dd-nivel-n">{i === 0 ? 'Primeiro' : 'Depois'}</span>
              <select aria-label={i === 0 ? 'Coluna principal' : 'Coluna seguinte ' + i} value={n.col} onChange={(ev) => muda(i, { col: +ev.target.value })}>
                {cols.map((cc) => <option key={cc} value={cc}>{rotuloColuna(cc, cab, titulos(cc))}</option>)}
              </select>
              <span className="rg-seg" role="group" aria-label="Ordem">
                <button type="button" aria-pressed={!n.desc} onClick={() => muda(i, { desc: false })}>A a Z</button>
                <button type="button" aria-pressed={!!n.desc} onClick={() => muda(i, { desc: true })}>Z a A</button>
              </span>
              {i > 0 && <button type="button" className="iconbtn" aria-label="Tirar este nível" title="Tirar este nível" onClick={() => setNiveis((l) => l.filter((_, k) => k !== i))}><Icone n="x" /></button>}
            </div>
          ))}
          {niveis.length < 3 && cols.length > 1 && (
            <button type="button" className="btn sm dd-mais" onClick={() => setNiveis((l) => [...l, { col: cols.find((cc) => !l.some((n) => n.col === cc)) ?? cols[0], desc: false }])}><Icone n="plus" />Desempatar por outra coluna</button>
          )}
        </section>
        <label className="dd-cab"><input type="checkbox" checked={cab} onChange={(ev) => setCab(ev.target.checked)} /><span>A primeira linha é o cabeçalho (fica no lugar)</span></label>
        <p className="dd-dica">Números vêm antes do texto; células vazias ficam sempre no fim. As fórmulas acompanham a linha delas.</p>
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}

/* ---------- Remover duplicados ---------- */
export function JanelaDuplicados({ faixa, subtitulo, titulos, cabecalho0, contar, aoAplicar, aoFechar }) {
  const cols = [];
  for (let cc = faixa.c1; cc <= faixa.c2; cc++) cols.push(cc);
  const [cab, setCab] = useState(cabecalho0);
  const [marcadas, setMarcadas] = useState(() => new Set(cols));
  const [erro, setErro] = useState('');
  const escolhidas = cols.filter((cc) => marcadas.has(cc));
  const quantas = useMemo(() => contar(escolhidas, cab), [escolhidas.join(','), cab]); // eslint-disable-line react-hooks/exhaustive-deps
  const alternar = (cc) => setMarcadas((s) => { const n = new Set(s); if (n.has(cc)) n.delete(cc); else n.add(cc); return n; });
  const aplicar = () => { const e = aoAplicar({ colunas: escolhidas, cabecalho: cab }); if (e) setErro(e); };
  return (
    <Janela titulo="Remover duplicados" icone="dupl" subtitulo={subtitulo} aoFechar={aoFechar} classe="pl-jdados" rodape={(
      <>
        <button type="button" className="btn sm" onClick={aoFechar}>Cancelar</button>
        <button type="button" className="btn sm primary" disabled={!quantas || !escolhidas.length} data-foco onClick={aplicar}>{quantas ? `Remover ${quantas} linha${quantas > 1 ? 's' : ''}` : 'Nada repetido'}</button>
      </>
    )}>
      <div className="janela-c rg-corpo">
        <section className="rg-cartao">
          <span className="rg-cab">Uma linha é repetida quando estas colunas forem iguais</span>
          <div className="dd-cols">
            {cols.map((cc) => (
              <label key={cc} className="dd-col"><input type="checkbox" checked={marcadas.has(cc)} onChange={() => alternar(cc)} /><span>{rotuloColuna(cc, cab, titulos(cc))}</span></label>
            ))}
          </div>
          <div className="dd-atalhos">
            <button type="button" className="btn sm" onClick={() => setMarcadas(new Set(cols))}>Marcar todas</button>
            <button type="button" className="btn sm" onClick={() => setMarcadas(new Set())}>Desmarcar todas</button>
          </div>
        </section>
        <label className="dd-cab"><input type="checkbox" checked={cab} onChange={(ev) => setCab(ev.target.checked)} /><span>A primeira linha é o cabeçalho</span></label>
        <p className="dd-previa" role="status" data-dupl-previa>
          {!escolhidas.length ? 'Marque pelo menos uma coluna.' : quantas ? `${quantas} linha${quantas > 1 ? 's repetidas serão removidas' : ' repetida será removida'}; a primeira de cada grupo fica.` : 'Nenhuma linha repetida com estas colunas.'}
        </p>
        <p className="dd-dica">Letras maiúsculas e minúsculas contam como iguais. As linhas de baixo sobem; dá para desfazer.</p>
        {erro && <p className="rg-erro" role="alert">{erro}</p>}
      </div>
    </Janela>
  );
}

/* ---------- Travar modelo ---------- */
export function JanelaTravar({ travada, liberadas, selecao, selecaoLivre, temSelecao, aoTravar, aoDestravar, aoLiberar, aoFechar, somenteLeitura, comSenha, conferirSenha }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  /* v0.6.4: aba que veio do Excel com senha só destrava com a senha certa */
  const destravar = async () => {
    if (comSenha) {
      const ok = await conferirSenha(senha);
      if (ok === null) { setErro('Esta senha foi guardada de um jeito que o Vértice Docs não consegue conferir. Destrave a aba no Excel.'); return; }
      if (!ok) { setErro('Senha incorreta.'); return; }
    }
    aoDestravar();
  };
  return (
    <Janela titulo="Travar modelo" icone="cadeado" subtitulo={travada ? 'Esta aba está travada' : 'Esta aba está livre'} aoFechar={aoFechar} classe="pl-jdados" rodape={(
      <>
        <button type="button" className="btn sm" onClick={aoFechar}>Fechar</button>
        {!somenteLeitura && (travada
          ? <button type="button" className="btn sm primary" data-foco={comSenha ? undefined : ''} data-destravar onClick={destravar}>Destravar a aba</button>
          : <button type="button" className="btn sm primary" data-foco onClick={aoTravar}>Travar a aba</button>)}
      </>
    )}>
      <div className="janela-c rg-corpo">
        <section className="rg-cartao">
          <span className="rg-cab">Células que ficam livres</span>
          <p className="dd-texto">{liberadas ? `${liberadas} célula${liberadas > 1 ? 's' : ''} liberada${liberadas > 1 ? 's' : ''} para preencher.` : 'Nenhuma célula liberada ainda: com a aba travada, nada pode ser mudado.'}</p>
          {travada && <p className="dd-dica">Destrave a aba para escolher outras células livres.</p>}
          {travada && comSenha && (
            <label className="dd-campo">Senha da aba (veio do Excel)
              <input type="password" data-foco data-senha-aba autoComplete="off" value={senha} onChange={(ev) => { setSenha(ev.target.value); setErro(''); }} onKeyDown={(ev) => { if (ev.key === 'Enter') destravar(); }} />
            </label>
          )}
          {erro && <p className="rg-erro" role="alert" data-senha-erro>{erro}</p>}
          {temSelecao && !somenteLeitura && !travada && (
            <div className="dd-atalhos">
              <button type="button" className="btn sm" data-liberar onClick={() => aoLiberar(true)}><Icone n="check" />Liberar {selecao}</button>
              {selecaoLivre && <button type="button" className="btn sm" data-travar-sel onClick={() => aoLiberar(false)}>Travar {selecao}</button>}
            </div>
          )}
        </section>
        <p className="dd-dica">Com a aba travada só as células liberadas aceitam digitação, colagem e apagar; o resto fica protegido contra erro de mão. O filtro continua funcionando. Travar aqui não usa senha: serve para evitar acidente, e quem abre a janela pode destravar. Se a aba veio do Excel com senha, a senha continua valendo e é pedida para destravar. No Excel o arquivo sai com a aba protegida.</p>
      </div>
    </Janela>
  );
}

/* ---------- menu da seta do filtro ---------- */
/* v0.6.24 parte 2: o menu da seta do filtro foi para filtroMenu.jsx (padrão do EFCwork, com os filtros do Excel). */
