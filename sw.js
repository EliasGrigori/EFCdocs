/* EFCdocs · sw.js do endereço antigo (P5, 26/11/2026). O Vértice mudou para /efcwork/vertice/ (com o sw.js dele).
   Este se instala no lugar do antigo, não guarda nada, não apaga nenhum cache e se desliga sozinho.
   As páginas abertas aqui seguem pela rede (a index.html leva ao endereço novo). */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (ev) {
  ev.waitUntil(self.clients.claim().then(function () { return self.registration.unregister(); }).then(function () {
    return self.clients.matchAll({ type: 'window' }).then(function (cs) {
      cs.forEach(function (c) { try { var u = new URL(c.url); if (/^\/EFCdocs\//i.test(u.pathname)) c.navigate(u.href); /* recarrega pela rede: a index.html nova decide o destino */ } catch (e) {} });
    });
  }));
});
