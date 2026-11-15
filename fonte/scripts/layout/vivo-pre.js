/* Demonstração dentro da página de aprovação: um banco de mentira, só na memória, com arquivos inventados.
   Nada é lido nem gravado no aparelho. __VIVO = { sementes: [...], atraso: ms, rota: '#/planilha', tema, armazem: { chave: valor } } */
(function () {
  var V = window.__VIVO || {}, bancos = {};
  function pedido(fazer, atraso) {
    var r = { result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null };
    setTimeout(function () { try { fazer(r); } catch (e) { r.error = e; if (r.onerror) r.onerror({ target: r }); return; } if (r.onsuccess) r.onsuccess({ target: r }); }, atraso || 0);
    return r;
  }
  function Loja(nome, o) { this.nome = nome; this.chave = o && o.keyPath; this.auto = !!(o && o.autoIncrement); this.dados = new Map(); this.seq = 0; }
  function lojaTx(l, t) {
    var copia = function (v) { return v === undefined ? v : JSON.parse(JSON.stringify(v)); };
    var op = function (f) { t.pend++; return pedido(function (r) { r.result = f(); t.pend--; t.fim(); }); };
    return {
      getAll: function () { return op(function () { return Array.from(l.dados.values()).map(copia); }); },
      get: function (k) { return op(function () { return copia(l.dados.get(k)); }); },
      put: function (v, k) { return op(function () { var c = l.chave ? v[l.chave] : (k !== undefined ? k : ++l.seq); l.dados.set(c, copia(v)); return c; }); },
      add: function (v, k) { return op(function () { var c = l.chave ? v[l.chave] : (k !== undefined ? k : ++l.seq); l.dados.set(c, copia(v)); return c; }); },
      delete: function (k) { return op(function () { l.dados.delete(k); }); },
      clear: function () { return op(function () { l.dados.clear(); }); },
      count: function () { return op(function () { return l.dados.size; }); },
      getAllKeys: function () { return op(function () { return Array.from(l.dados.keys()); }); },
    };
  }
  function Banco(nome) {
    var lojas = {}, db = {
      name: nome, version: 1, close: function () {}, onversionchange: null,
      objectStoreNames: { contains: function (n) { return !!lojas[n]; } },
      createObjectStore: function (n, o) { lojas[n] = new Loja(n, o); return lojaTx(lojas[n], { pend: 0, fim: function () {} }); },
      transaction: function (n) {
        var t = { pend: 0, oncomplete: null, onerror: null, onabort: null, error: null, fim: function () { if (!t.pend) setTimeout(function () { if (!t.pend && t.oncomplete) { var f = t.oncomplete; t.oncomplete = null; f({ target: t }); } }, 0); } };
        t.objectStore = function (q) { if (!lojas[q]) lojas[q] = new Loja(q, {}); return lojaTx(lojas[q], t); };
        setTimeout(t.fim, 0); void n; return t;
      },
    };
    db._lojas = lojas; return db;
  }
  var falso = {
    open: function (nome) {
      var novo = !bancos[nome]; if (novo) bancos[nome] = Banco(nome);
      var db = bancos[nome];
      /* v0.6.20 parte 4: a criação das lojas (com a chave "id") acontece ANTES de avisar que o banco abriu.
         Antes ela vinha depois, a loja nascia sem chave e toda gravação da demonstração ia para o lugar errado. */
      var r = pedido(function (q) {
        q.result = db;
        if (novo) {
          q.transaction = db.transaction();
          if (q.onupgradeneeded) q.onupgradeneeded({ target: q });
          if (nome === 'efcdocs' && db._lojas.arquivos) (V.sementes || []).forEach(function (s) { db._lojas.arquivos.dados.set(s.id, s); });
        }
      }, (nome === 'efcdocs' && V.atraso) || 0);
      return r;
    },
    deleteDatabase: function (nome) { delete bancos[nome]; return pedido(function () {}); },
  };
  try { Object.defineProperty(window, 'indexedDB', { value: falso, configurable: true }); } catch (e) { /* segue com o banco do navegador */ }
  /* preferências só na memória (tema e menu), sem tocar no aparelho */
  var mem = {}; if (V.armazem) Object.keys(V.armazem).forEach(function (k) { mem[k] = String(V.armazem[k]); }); /* v0.6.20 parte 2: estado do envio ao Cwork inventado */
  if (V.tema) mem['efcdocs:prefs'] = JSON.stringify({ tema: V.tema });
  var arm = { getItem: function (k) { return k in mem ? mem[k] : null; }, setItem: function (k, v) { mem[k] = String(v); }, removeItem: function (k) { delete mem[k]; }, key: function (i) { return Object.keys(mem)[i] || null; }, clear: function () { mem = {}; } };
  Object.defineProperty(arm, 'length', { get: function () { return Object.keys(mem).length; } });
  try { Object.defineProperty(window, 'localStorage', { value: arm, configurable: true }); } catch (e) { /* segue */ }
  try { if (navigator.serviceWorker) Object.defineProperty(navigator, 'serviceWorker', { value: undefined, configurable: true }); } catch (e) { /* segue */ }
  if (V.rota) { try { location.hash = V.rota; } catch (e) { /* segue no Início */ } }
})();
