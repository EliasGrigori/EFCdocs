/* PONTE EFD v1 · caixa de troca entre os apps da família no MESMO aparelho e navegador (mesmo endereço: eliasgrigori.github.io).
   Sem nuvem, sem login, sem internet: um app deixa um item na caixa, o outro pega. Serve para o Vértice Docs e o Sabiá entregarem
   coisas ao EFCwork (que é quem tem login e grava na nuvem) e para o EFCwork entregar dados e arquivos a eles.
   Um arquivo só, sem dependências; o mesmo nos três apps. Banco IndexedDB "efd-ponte" (versão 1), uma gaveta "caixa" (chave pid).
   Arquivos vão como ArrayBuffer (não Blob), que todo navegador guarda igual. Aviso de chegada pelo canal "efd". */
(function (raiz) {
  const BANCO = 'efd-ponte', VERSAO = 1, GAVETA = 'caixa', CANAL = 'efd', VALIDADE_MS = 30 * 24 * 3600 * 1000;
  const APPS = ['efcwork', 'docs', 'sabia'], TIPOS = ['documento', 'abrir', 'resumo', 'pedido', 'treino', 'programados', 'resposta'];
  function abrir() {
    return new Promise((ok, no) => {
      const r = indexedDB.open(BANCO, VERSAO);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains(GAVETA)) d.createObjectStore(GAVETA, { keyPath: 'pid' }).createIndex('para', 'para'); };
      r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error || new Error('sem caixa de troca')); r.onblocked = () => no(new Error('caixa de troca ocupada'));
    });
  }
  const tx = (d, modo, f) => new Promise((ok, no) => { const t = d.transaction(GAVETA, modo), s = t.objectStore(GAVETA); let saida; const q = f(s); if (q) q.onsuccess = () => { saida = q.result; }; t.oncomplete = () => { d.close(); ok(saida); }; t.onerror = t.onabort = () => { d.close(); no(t.error || new Error('falha na caixa de troca')); }; });
  const novoPid = () => 'p' + Date.now().toString(36) + Math.floor(Math.random() * 2176782336).toString(36).padStart(6, '0');
  function confere(i) {
    const e = []; if (!i || typeof i !== 'object') return ['item vazio'];
    if (i.v !== 1) e.push('v'); if (!/^p[0-9a-z]{8,40}$/.test(i.pid || '')) e.push('pid'); if (APPS.indexOf(i.de) < 0) e.push('de'); if (APPS.indexOf(i.para) < 0 || i.para === i.de) e.push('para');
    if (TIPOS.indexOf(i.tipo) < 0) e.push('tipo'); if (!/^\d{4}-\d{2}-\d{2}T/.test(i.criadoEm || '')) e.push('criadoEm');
    ['pdf', 'original'].forEach(k => { if (i[k] != null && !(i[k] instanceof ArrayBuffer)) e.push(k + ' deve ser ArrayBuffer'); });
    if (i.tipo === 'documento' && !(i.ficha && i.pdf)) e.push('documento precisa de ficha e pdf');
    if (i.tipo === 'abrir' && !(i.original && i.nomeArquivo)) e.push('abrir precisa do arquivo original e do nome');
    return e;
  }
  let canal = null; const fala = m => { try { canal = canal || new BroadcastChannel(CANAL); canal.postMessage(m); } catch (e) {} };
  const Ponte = {
    BANCO, VERSAO, CANAL, novoPid, confere,
    /* deixa um item na caixa e avisa quem estiver aberto; devolve o pid */
    async por(item) {
      const i = Object.assign({ v: 1, pid: novoPid(), criadoEm: new Date().toISOString() }, item), e = confere(i); if (e.length) throw new Error('item fora do combinado: ' + e.join(', '));
      await tx(await abrir(), 'readwrite', s => s.put(i)); fala({ v: 1, tipo: 'chegou', pid: i.pid, para: i.para, de: i.de, oQue: i.tipo }); return i.pid;
    },
    /* o que está esperando por este app (mais antigo primeiro); joga fora o que passou da validade */
    async esperando(app) {
      const todos = await tx(await abrir(), 'readonly', s => s.index('para').getAll(app)) || [], agora = Date.now(), vivos = [];
      for (const i of todos) { if (agora - Date.parse(i.criadoEm) > VALIDADE_MS) await Ponte.apagar(i.pid); else vivos.push(i); }
      return vivos.sort((a, b) => String(a.criadoEm).localeCompare(String(b.criadoEm)));
    },
    async pegar(pid) { return await tx(await abrir(), 'readonly', s => s.get(pid)) || null; },
    /* só apague DEPOIS de guardar o que pegou (o EFCwork apaga quando a nuvem confirmou) */
    async apagar(pid) { await tx(await abrir(), 'readwrite', s => s.delete(pid)); },
    /* avisa quando chegar algo para este app enquanto ele está aberto; devolve a função que para de ouvir */
    ouvir(app, fn) { let c; try { c = new BroadcastChannel(CANAL); c.onmessage = ev => { const m = ev.data; if (m && m.v === 1 && m.tipo === 'chegou' && m.para === app) fn(m); }; } catch (e) {} return () => { try { c && c.close(); } catch (e) {} }; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Ponte; else raiz.EFDPonte = Ponte;
})(typeof window !== 'undefined' ? window : this);
