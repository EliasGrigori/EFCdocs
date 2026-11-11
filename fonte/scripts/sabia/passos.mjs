/* Método Sabiá 2.0 — passos de tela usados pelas auditorias. Cada passo é um objeto com UMA chave:
   { "ir": "endereço" } · { "clicar": "seletor" } · { "preencher": ["seletor", "texto"] } · { "digitar": "texto" } · { "tecla": "Enter" }
   · { "arquivo": ["seletor", "caminho"] } · { "esperar": "seletor" ou milissegundos } · { "sumir": "seletor" (espera a abertura, o aviso ou o carregando sair) }
   · { "tema": "atributo=valor" (no <html>) } */
import { chromium } from 'playwright';
import { readFileSync as lerArq, statSync as infoArq } from 'node:fs';

export async function abrirNavegador() {
  return chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
}
export async function fazer(pagina, passos = [], base = '') {
  for (const p of passos) {
    if (p.ir != null) await pagina.goto(/^https?:|^file:/.test(p.ir) ? p.ir : base + p.ir);
    else if (p.clicar) await pagina.locator(p.clicar).first().click();
    else if (p.preencher) await pagina.locator(p.preencher[0]).first().fill(p.preencher[1]);
    else if (p.digitar != null) await pagina.keyboard.type(p.digitar);
    else if (p.tecla) await pagina.keyboard.press(p.tecla);
    else if (p.arquivo) await pagina.locator(p.arquivo[0]).first().setInputFiles(p.arquivo[1]);
    else if (p.tema) { const [a, v] = p.tema.split('='); await pagina.evaluate(([x, y]) => { document.documentElement.setAttribute(x, y); }, [a, v]); }
    else if (p.sumir) await pagina.waitForSelector(p.sumir, { state: 'hidden', timeout: 120000 });
    else if (p.esperar != null) { if (typeof p.esperar === 'number') await pagina.waitForTimeout(p.esperar); else await pagina.waitForSelector(p.esperar, { timeout: 120000 }); }
    else throw new Error('Passo que não conheço: ' + JSON.stringify(p));
  }
}
export const quieto = (pagina) => pagina.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(ok, 0)))));
export const APARELHOS = {
  pc: { viewport: { width: 1366, height: 700 } },
  celular: { viewport: { width: 384, height: 790 }, hasTouch: true, isMobile: true },
};

/** Linha de base ("não pode piorar"): aceita o .json da auditoria ou a pasta onde ele está. */
export function lerBase(caminho, nome) {
  const arq = infoArq(caminho).isDirectory() ? `${caminho.replace(/\/$/, '')}/${nome}` : caminho;
  return JSON.parse(lerArq(arq, 'utf8'));
}
