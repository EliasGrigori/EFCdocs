/* Vértice Docs — soltar um arquivo em qualquer lugar do app (v0.6.22, D-62).
   Excel abre a janela "Abrir arquivo do Excel" já lendo o arquivo; Word, PDF e outros dizem o que fazer.
   Quem já trata o arrasto (a área da janela do Excel) chama preventDefault e aqui não faz nada de novo. */
import { useEffect, useRef, useState } from 'react';
import { Icone } from './comum.jsx';
import { tipoDoArquivo, avisoDoArquivo, trazArquivo } from '../nucleo/soltar.js';

export function SoltarArquivo({ aoExcel, avisar, desligado }) {
  const [sobre, setSobre] = useState(false);
  const conta = useRef(0);
  useEffect(() => {
    if (desligado) return undefined;
    const entra = (ev) => { if (!trazArquivo(ev.dataTransfer)) return; conta.current++; setSobre(true); };
    const sai = () => { conta.current = Math.max(0, conta.current - 1); if (!conta.current) setSobre(false); };
    const sobreTela = (ev) => { if (trazArquivo(ev.dataTransfer)) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; } };
    const solta = (ev) => {
      conta.current = 0; setSobre(false);
      if (!trazArquivo(ev.dataTransfer) || ev.defaultPrevented) return; /* a área da janela do Excel já tratou */
      ev.preventDefault(); /* nunca deixar o navegador abrir o arquivo no lugar do app */
      const lista = Array.from(ev.dataTransfer.files || []);
      if (!lista.length) return;
      const arq = lista.find((f) => tipoDoArquivo(f.name, f.type) === 'excel') || lista[0];
      const tipo = tipoDoArquivo(arq.name, arq.type);
      if (tipo === 'excel') { aoExcel(arq); if (lista.length > 1) avisar('Abri um arquivo por vez: ' + arq.name + '.', { ic: 'info' }); return; }
      avisar(avisoDoArquivo(tipo, arq.name), { ic: 'info', longo: true });
    };
    window.addEventListener('dragenter', entra); window.addEventListener('dragleave', sai);
    window.addEventListener('dragover', sobreTela); window.addEventListener('drop', solta);
    return () => { window.removeEventListener('dragenter', entra); window.removeEventListener('dragleave', sai); window.removeEventListener('dragover', sobreTela); window.removeEventListener('drop', solta); };
  }, [aoExcel, avisar, desligado]);
  if (!sobre || desligado) return null;
  return (
    <div className="solta-tela" aria-hidden="true">
      <div className="solta-tela-c"><Icone n="excel" /><b>Solte para abrir</b><span>Arquivo do Excel vira uma planilha nova; o original não muda.</span></div>
    </div>
  );
}
