/* EFCdocs — instalação (PWA) e aviso de versão nova. */

export const pwa = { aviso: null, instalar: null, ouvintes: new Set() };
const avisar = () => pwa.ouvintes.forEach((f) => f());

export function iniciarPwa() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (ev) => {
    ev.preventDefault();
    pwa.instalar = ev;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    pwa.instalar = null;
    avisar();
  });
  if (!('serviceWorker' in navigator)) return;
  const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (location.protocol !== 'https:' && !local) return;

  navigator.serviceWorker.register('sw.js').then((reg) => {
    const pronta = (sw) => {
      pwa.aviso = sw;
      avisar();
    };
    if (reg.waiting && navigator.serviceWorker.controller) pronta(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nova = reg.installing;
      if (!nova) return;
      nova.addEventListener('statechange', () => {
        if (nova.state === 'installed' && navigator.serviceWorker.controller) pronta(nova);
      });
    });
  }).catch(() => {});

  /* Só recarrega quando uma versão nova assume no lugar de outra.
     Na primeira visita não havia versão antes: recarregar ali piscava a tela à toa (corrigido na v0.3.0). */
  const tinhaVersao = !!navigator.serviceWorker.controller;
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!tinhaVersao || recarregou) return;
    recarregou = true;
    location.reload();
  });
}

/** Toque em "Versão nova pronta": a versão nova assume e a tela recarrega. */
export function atualizarAgora() {
  if (pwa.aviso) pwa.aviso.postMessage('pular');
}

export async function pedirInstalacao() {
  const ev = pwa.instalar;
  if (!ev) return false;
  ev.prompt();
  try {
    await ev.userChoice;
  } catch {
    /* sem resposta */
  }
  pwa.instalar = null;
  avisar();
  return true;
}
