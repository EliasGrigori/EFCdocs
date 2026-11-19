/* EFCdocs — ponto de entrada. */
import { createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import { iniciarPwa } from './nucleo/pwa.js';
import './estilo-base.css';
import './quadro/quadro.css';
import './planilha/planilha.css';
import './ui/assinatura.css';
import './camadas.css';
import './cwork.css';
import './layout/efc-movimento.css';
import './movimento.css';
import './layout/efc-layout.css';
import './layout/efc-layout.js';
import './ui/listas.css';
import './ui/gaveta.css';
import './ui/fluidez.css';
import './quadro/kanban.css';
import './ui/parte4.css';
import './ui/faixa-excel.css';
import './ui/soltar.css'; /* v0.6.22 (D-62) */
import './ui/deitado.css'; /* v0.6.34 (S1 e D1 da v0.6.33) */
import { instalarFluidez } from './ui/fluidez.js';

createRoot(document.getElementById('raiz')).render(<App />);
iniciarPwa();
instalarFluidez();

/* tira a tela de abertura (fica pelo menos 450 ms para não piscar) */
const abertura = document.getElementById('abertura');
if (abertura) {
  const espera = Math.max(0, 450 - performance.now());
  requestAnimationFrame(() => setTimeout(() => {
    abertura.classList.add('sai');
    setTimeout(() => abertura.remove(), 320);
  }, espera));
}
