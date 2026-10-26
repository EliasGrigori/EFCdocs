/* EFCdocs — ponto de entrada. */
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { iniciarPwa } from './nucleo/pwa.js';
import './estilo-base.css';
import './quadro/quadro.css';
import './planilha/planilha.css';
import './ui/assinatura.css';

createRoot(document.getElementById('raiz')).render(<App />);
iniciarPwa();

/* tira a tela de abertura (fica pelo menos 450 ms para não piscar) */
const abertura = document.getElementById('abertura');
if (abertura) {
  const espera = Math.max(0, 450 - performance.now());
  requestAnimationFrame(() => setTimeout(() => {
    abertura.classList.add('sai');
    setTimeout(() => abertura.remove(), 320);
  }, espera));
}
