/* EFCdocs — Assinatura (v0.4.5): o bloco (linha + nome completo + rubrica) e a janela onde se faz a rubrica
   (desenhada com mouse, dedo ou caneta, ou a partir da foto de um papel). Usada pelo quadro e pela planilha
   (e, na v0.7.0, pelo Docx). A imagem da rubrica fica só no arquivo, no aparelho. */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Icone, Janela } from './comum.jsx';
import * as A from '../nucleo/assinatura.js';

/* ---------- o bloco ---------- */
export function AssinaturaView({ nome, rub, w, h, fundo = true }) {
  const m = useMemo(() => A.medidas(w, h, nome), [w, h, nome]);
  return (
    <div className={'asn' + (fundo ? ' asn-fundo' : '')} style={{ width: w, height: h }}>
      {rub && <img className="asn-rub" src={rub} alt="Rubrica" draggable="false" style={{ left: m.caixaRub.x, top: m.caixaRub.y, width: m.caixaRub.w, height: m.caixaRub.h }} />}
      <span className="asn-linha" style={{ top: m.linhaY, left: 6, right: 6 }} />
      <span className="asn-nome" style={{ top: m.linhaY + 1, height: m.faixa - 1, lineHeight: (m.faixa - 1) + 'px', fontSize: m.fonte }} title={nome}>{nome}</span>
    </div>
  );
}

/* ---------- desenho em canvas (também usado para exportar o quadro) ---------- */
export function desenharTracos(ctx, tracos, k = 1, ox = 0, oy = 0, tinta = A.TINTA_PADRAO) {
  ctx.save();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = tinta; ctx.fillStyle = tinta;
  for (const t of tracos) {
    const ops = A.caminhoSuave(A.simplificar(t.pontos));
    const e = (t.esp || 3) * k;
    ctx.lineWidth = e;
    if (ops.length === 1 && ops[0].op === 'P') { ctx.beginPath(); ctx.arc(ops[0].x * k + ox, ops[0].y * k + oy, e / 2, 0, Math.PI * 2); ctx.fill(); continue; }
    ctx.beginPath();
    for (const o of ops) {
      if (o.op === 'M') ctx.moveTo(o.x * k + ox, o.y * k + oy);
      else if (o.op === 'L') ctx.lineTo(o.x * k + ox, o.y * k + oy);
      else ctx.quadraticCurveTo(o.cx * k + ox, o.cy * k + oy, o.x * k + ox, o.y * k + oy);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Traços → PNG com fundo transparente, apertado em volta do desenho. null se não há traço ou ficou pesado demais. */
export function tracosParaPng(tracos, tinta) {
  const esp = Math.max(...tracos.map((t) => t.esp || 3), 3);
  const lim = A.limitesTracos(tracos, esp);
  if (!lim) return null;
  let k = A.fatorDaRubrica(lim);
  for (let tentativa = 0; tentativa < 4; tentativa++, k *= 0.7) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.ceil(lim.w * k)); cv.height = Math.max(1, Math.ceil(lim.h * k));
    desenharTracos(cv.getContext('2d'), tracos, k, -lim.x * k, -lim.y * k, tinta);
    const url = cv.toDataURL('image/png');
    if (A.rubricaValida(url)) return url;
  }
  return null;
}

function rgbaParaPng(rgba, w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  cv.getContext('2d').putImageData(new ImageData(rgba, w, h), 0, 0);
  return cv.toDataURL('image/png');
}

/** Lê a foto (qualquer tamanho), reduz a 900 px e calcula a escuridão em relação ao papel. */
export function lerFoto(arquivo, max = 900) {
  return new Promise((ok, erro) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('Não deu para abrir essa foto. Use JPG ou PNG.')); };
    img.onload = () => {
      const e = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * e)), h = Math.max(1, Math.round(img.naturalHeight * e));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try {
        const dados = ctx.getImageData(0, 0, w, h).data;
        const esc = A.escuridaoLocal(dados, w, h);
        ok({ esc, w, h, auto: A.corteAutomatico(esc) });
      } catch { erro(new Error('Não deu para ler a foto.')); }
    };
    img.src = url;
  });
}

/* ---------- área de desenho ---------- */
const ESPESSURAS = [['fina', 2, 'Fina'], ['media', 3.5, 'Média'], ['grossa', 6, 'Grossa']];

function AreaDesenho({ tracos, tinta, aoMudar }) {
  const cvRef = useRef(null);
  const ativo = useRef(null);
  const [tam, setTam] = useState({ w: 300, h: 150 });
  const dpr = typeof devicePixelRatio === 'number' ? Math.min(3, devicePixelRatio || 1) : 1;

  useLayoutEffect(() => {
    const el = cvRef.current;
    if (!el) return undefined;
    const med = () => setTam({ w: Math.max(60, el.clientWidth), h: Math.max(60, el.clientHeight) });
    med();
    const ro = new ResizeObserver(med);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const redesenhar = useCallback((extra) => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.scale(dpr, dpr);
    /* a linha-guia: a rubrica se apoia nela, como no bloco final */
    ctx.save();
    ctx.strokeStyle = 'rgba(120,120,140,.55)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(10, tam.h - 26.5); ctx.lineTo(tam.w - 10, tam.h - 26.5); ctx.stroke();
    ctx.restore();
    desenharTracos(ctx, extra ? [...tracos, extra] : tracos, 1, 0, 0, tinta);
  }, [tracos, tinta, tam, dpr]);

  useLayoutEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    cv.width = Math.round(tam.w * dpr); cv.height = Math.round(tam.h * dpr);
    redesenhar(ativo.current);
  }, [tam, dpr, redesenhar]);

  const pt = (ev) => { const r = cvRef.current.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  const baixar = (ev) => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    ev.preventDefault();
    try { cvRef.current.setPointerCapture(ev.pointerId); } catch { /* sem captura */ }
    ativo.current = { pontos: [pt(ev)], esp: aoMudar.espessura };
    redesenhar(ativo.current);
  };
  const mover = (ev) => {
    const a = ativo.current;
    if (!a) return;
    const lista = typeof ev.getCoalescedEvents === 'function' ? ev.getCoalescedEvents() : [];
    for (const e of lista.length ? lista : [ev]) a.pontos.push(pt(e));
    redesenhar(a);
  };
  const soltar = () => {
    const a = ativo.current;
    ativo.current = null;
    if (!a) return;
    aoMudar.novo({ pontos: a.pontos, esp: a.esp });
  };

  return (
    <canvas ref={cvRef} className="asn-desenho" aria-label="Área para desenhar a rubrica com o mouse, o dedo ou a caneta" role="img"
      style={{ touchAction: 'none' }}
      onPointerDown={baixar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar} />
  );
}

/* ---------- a janela ---------- */
/**
 * inicial: { nome, rub } · aoConfirmar({ nome, rub? }) · aoFechar() · titulo
 * avisar(texto): mostra um aviso fora da janela (opcional).
 */
export function JanelaAssinatura({ inicial = {}, titulo = 'Assinatura', confirmar = 'Pronto', aoConfirmar, aoFechar }) {
  const fecharRef = useRef(aoFechar);
  fecharRef.current = aoFechar;
  const fechar = useCallback(() => fecharRef.current(), []); /* identidade fixa: a janela não rouba o foco a cada desenho */

  const [nome, setNome] = useState(inicial.nome || '');
  const [tentou, setTentou] = useState(false);
  const [modo, setModo] = useState(A.rubricaValida(inicial.rub) ? 'atual' : 'desenhar');
  const [tinta, setTinta] = useState(A.TINTA_PADRAO);
  const [esp, setEsp] = useState(3.5);
  const [tracos, setTracos] = useState([]);
  const [rubDesenho, setRubDesenho] = useState(null);
  const [foto, setFoto] = useState(null); /* { esc, w, h, auto } */
  const [controle, setControle] = useState(50);
  const [rubFoto, setRubFoto] = useState(null);
  const [msgFoto, setMsgFoto] = useState('');
  const [lendo, setLendo] = useState(false);
  const arqRef = useRef(null);

  /* desenho → PNG (sempre que um traço entra ou a cor muda) */
  useEffect(() => { setRubDesenho(tracos.length ? tracosParaPng(tracos, tinta) : null); }, [tracos, tinta]);

  /* foto → PNG (ao escolher a foto, mexer no traço ou trocar a cor) */
  useEffect(() => {
    if (!foto) { setRubFoto(null); return undefined; }
    const t = setTimeout(() => {
      const r = A.rubricaDaFoto(foto.esc, foto.w, foto.h, { corte: A.corteDoControle(controle), tinta });
      if (!r) { setRubFoto(null); setMsgFoto('Não achei traços na foto. Aumente o "Traço", ou tire outra foto com mais luz e caneta escura.'); return; }
      const url = rgbaParaPng(r.rgba, r.w, r.h);
      if (!A.rubricaValida(url)) { setRubFoto(null); setMsgFoto('A rubrica ficou pesada demais. Diminua o "Traço" ou chegue mais perto.'); return; }
      setMsgFoto(''); setRubFoto(url);
    }, 50);
    return () => clearTimeout(t);
  }, [foto, controle, tinta]);

  const escolherFoto = async (arq) => {
    if (!arq) return;
    if (!/^image\//.test(arq.type)) { setMsgFoto('Escolha uma imagem (JPG ou PNG).'); return; }
    setLendo(true); setMsgFoto('');
    try {
      const f = await lerFoto(arq);
      setFoto(f);
      setControle(A.controleDoCorte(f.auto));
    } catch (e) { setMsgFoto(e.message); }
    setLendo(false);
  };

  const rub = modo === 'atual' ? inicial.rub : modo === 'desenhar' ? rubDesenho : modo === 'foto' ? rubFoto : null;
  const erroNome = A.avisoNome(nome);
  const incompleto = A.nomeIncompleto(nome);
  const nomeLimpo = A.limparNome(nome);

  const concluir = () => {
    setTentou(true);
    if (erroNome) return;
    const out = { nome: nomeLimpo };
    if (rub && A.rubricaValida(rub)) out.rub = rub;
    aoConfirmar(out);
    fechar();
  };

  const modos = [...(A.rubricaValida(inicial.rub) ? [['atual', 'Atual']] : []), ['desenhar', 'Desenhar'], ['foto', 'Foto'], ['nenhuma', 'Só a linha']];

  return (
    <Janela titulo={titulo} icone="assinatura" aoFechar={fechar} classe="asn-j" rodape={(
      <>
        <button type="button" className="btn sm" onClick={fechar}>Cancelar</button>
        <button type="button" className="btn sm primary" onClick={concluir} data-asn="pronto">{confirmar}</button>
      </>
    )}>
      <div className="janela-c asn-corpo">
       <div className="asn-col">
        <label className="campo-t">
          Nome completo (fica embaixo da linha)
          <input value={nome} maxLength={A.ASN.NOME_MAX} placeholder="Ex.: Maria da Silva Souza" data-asn="nome"
            onChange={(ev) => setNome(ev.target.value)} onKeyDown={(ev) => { if (ev.key === 'Enter') concluir(); }} />
          <span className="asn-cont" data-asn="contador" aria-live="polite">{[...nome].length}/{A.ASN.NOME_MAX}{[...nome].length >= A.ASN.NOME_MAX ? ' (limite)' : ''}</span>
          <span className="erro-t" role="alert">{tentou && erroNome ? erroNome : ''}</span>
        </label>
        {incompleto && !erroNome && <p className="asn-aviso" role="status">Só um nome. Escreva o nome completo para a assinatura valer como identificação.</p>}

        <div className="asn-bloco">
          <span className="asn-rot">Rubrica (opcional)</span>
          <div className="seg" role="tablist" aria-label="Como fazer a rubrica">
            {modos.map(([id, rot]) => (
              <button key={id} type="button" role="tab" aria-selected={modo === id} className={'chipb' + (modo === id ? ' on' : '')} data-asn-modo={id} onClick={() => setModo(id)}>{rot}</button>
            ))}
          </div>

          {modo === 'desenhar' && (
            <>
              <AreaDesenho tracos={tracos} tinta={tinta} aoMudar={{ espessura: esp, novo: (t) => setTracos((x) => [...x, t]) }} />
              <div className="asn-ferr">
                <div className="seg" aria-label="Espessura do traço">
                  {ESPESSURAS.map(([id, v, rot]) => <button key={id} type="button" className={'chipb' + (esp === v ? ' on' : '')} onClick={() => setEsp(v)}>{rot}</button>)}
                </div>
                <div className="seg" aria-label="Cor da tinta">
                  {A.ASN.TINTAS.map(([id, hex, rot]) => <button key={id} type="button" className={'chipb' + (tinta === hex ? ' on' : '')} onClick={() => setTinta(hex)}><i className="asn-gota" style={{ background: hex }} />{rot}</button>)}
                </div>
                <span className="asn-esp" />
                <button type="button" className="iconbtn" aria-label="Desfazer o último traço" title="Desfazer o último traço" disabled={!tracos.length} onClick={() => setTracos((x) => x.slice(0, -1))}><Icone n="desfazer" /></button>
                <button type="button" className="iconbtn" aria-label="Apagar tudo" title="Apagar tudo" disabled={!tracos.length} onClick={() => setTracos([])}><Icone n="lixeira" /></button>
              </div>
              <p className="asn-dica">Assine em cima da linha tracejada, com o mouse, o dedo ou a caneta.</p>
            </>
          )}

          {modo === 'foto' && (
            <>
              <div className="asn-foto">
                <input ref={arqRef} type="file" accept="image/*" hidden data-asn="arquivo" onChange={(ev) => { escolherFoto(ev.target.files && ev.target.files[0]); ev.target.value = ''; }} />
                <button type="button" className="btn sm" onClick={() => arqRef.current && arqRef.current.click()}><Icone n="foto" />{foto ? 'Trocar a foto' : 'Escolher ou tirar a foto'}</button>
                <div className="seg" aria-label="Cor da tinta">
                  {A.ASN.TINTAS.map(([id, hex, rot]) => <button key={id} type="button" className={'chipb' + (tinta === hex ? ' on' : '')} onClick={() => setTinta(hex)}><i className="asn-gota" style={{ background: hex }} />{rot}</button>)}
                </div>
              </div>
              {foto && (
                <label className="asn-ctl">
                  <span>Traço</span>
                  <input type="range" min="0" max="100" value={controle} data-asn="traco" onChange={(ev) => setControle(+ev.target.value)} />
                  <button type="button" className="btn sm" onClick={() => setControle(A.controleDoCorte(foto.auto))}>Automático</button>
                </label>
              )}
              {lendo && <p className="asn-dica" role="status">Lendo a foto…</p>}
              {msgFoto && <p className="asn-aviso" role="alert">{msgFoto}</p>}
              {!foto && !lendo && <p className="asn-dica">Assine num papel branco, com caneta escura, e fotografe de perto e com luz. O fundo do papel sai sozinho.</p>}
            </>
          )}

          {modo === 'nenhuma' && <p className="asn-dica">A linha fica em branco, para assinar à mão depois de imprimir.</p>}
          {modo === 'atual' && <p className="asn-dica">Esta é a rubrica que já está na assinatura. Escolha Desenhar ou Foto para trocar.</p>}
        </div>

       </div>
       <div className="asn-col">
        <div className="asn-bloco">
          <span className="asn-rot">Como vai ficar</span>
          <div className="asn-previa" data-asn="previa"><AssinaturaView nome={nomeLimpo || 'Nome completo'} rub={rub} w={A.ASN.W} h={A.ASN.H} /></div>
        </div>
        <p className="asn-privado"><Icone n="cadeado" />A imagem da rubrica fica só dentro deste arquivo, neste aparelho.</p>
       </div>
      </div>
    </Janela>
  );
}
