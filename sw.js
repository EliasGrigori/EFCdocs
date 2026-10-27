/* EFCdocs — sw.js (gerado no build; não edite o de dist/).
   Guarda a TELA do app no aparelho para abrir sem internet. Os arquivos do usuário ficam no IndexedDB, fora deste cache.
   REGRA DE CONVIVÊNCIA: EFClaudian, EFCquiz e EFCdocs dividem o mesmo site. Este arquivo só mexe em
   caches que começam com "efcdocs-"; nunca lê, troca nem apaga cache de outro app. */
const VERSAO = 'efcdocs-v0.5.1';
const PREFIXO = 'efcdocs-';
const ARQUIVOS = [
  "./",
  "./apple-touch-icon.png",
  "./assets/app-DLDOORV5.css",
  "./assets/app-5VCZ4M4L.js",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./index.html",
  "./manifest.webmanifest"
];
const ESPERA_REDE_MS = 3500;

self.addEventListener('install', (ev) => {
  /* sem a tela guardada esta versão não se instala e a anterior continua valendo */
  ev.waitUntil(caches.open(VERSAO).then((c) => c.addAll(ARQUIVOS)));
});
self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.indexOf(PREFIXO) === 0 && k !== VERSAO).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', (ev) => { if (ev.data === 'pular') self.skipWaiting(); });

const guardada = () => caches.open(VERSAO).then((c) => c.match('./index.html').then((x) => x || c.match('./')));

/* a tela: primeiro a internet (pega a versão nova), no máximo 3,5 s; sem internet ou lenta, a guardada */
function navegar(r) {
  const rede = fetch(r).then((resp) => {
    if (resp && resp.ok && resp.type === 'basic') { const cp = resp.clone(); caches.open(VERSAO).then((c) => c.put('./index.html', cp)); }
    return resp;
  });
  return new Promise((res) => {
    let feito = false;
    const fim = (x) => { if (!feito && x) { feito = true; res(x); } };
    const t = setTimeout(() => guardada().then(fim), ESPERA_REDE_MS);
    rede.then((x) => { clearTimeout(t); fim(x); }, () => { clearTimeout(t); guardada().then((g) => g ? fim(g) : fim(Response.error())); });
  });
}

self.addEventListener('fetch', (ev) => {
  const r = ev.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;                 /* só o que é do próprio EFCdocs */
  if (r.mode === 'navigate') { ev.respondWith(navegar(r)); return; }
  ev.respondWith(caches.open(VERSAO).then((c) => c.match(r).then((x) => x || fetch(r).then((resp) => {
    if (resp && resp.status === 200) c.put(r, resp.clone());
    return resp;
  }))));
});
