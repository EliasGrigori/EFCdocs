/* EFCdocs v0.6.0 — "Baixar original": guarda no aparelho o arquivo do Excel exatamente como veio (bytes intactos),
   num banco separado (efcdocs-originais), para devolver o que a gravação do EFCdocs ainda não leva
   (macros, tabelas dinâmicas, imagens, assinatura digital...). Nada vai para a internet. */
import { ehDemo } from './armazem.js';

const NOME = () => (ehDemo() ? 'efcdocs-demo-originais' : 'efcdocs-originais');
function abrir() {
  return new Promise((ok, erro) => {
    if (typeof indexedDB === 'undefined') { erro(new Error('sem banco')); return; }
    const req = indexedDB.open(NOME(), 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('orig')) req.result.createObjectStore('orig'); };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => erro(req.error);
  });
}
async function fazer(modo, fn) {
  const db = await abrir();
  try {
    return await new Promise((ok, erro) => {
      const t = db.transaction('orig', modo);
      const r = fn(t.objectStore('orig'));
      t.oncomplete = () => ok(r && 'result' in r ? r.result : undefined);
      t.onerror = () => erro(t.error);
      t.onabort = () => erro(t.error);
    });
  } finally { db.close(); }
}
/** Guarda o original do arquivo id. dados = { nome, tipo, blob, em } */
export async function guardarOriginal(id, dados) { try { await fazer('readwrite', (s) => s.put({ ...dados, em: new Date().toISOString() }, id)); return true; } catch { return false; } }
export async function lerOriginal(id) { try { return (await fazer('readonly', (s) => s.get(id))) || null; } catch { return null; } }
export async function apagarOriginal(id) { try { await fazer('readwrite', (s) => s.delete(id)); } catch { /* sem banco */ } }
