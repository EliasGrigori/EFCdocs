/* Método Sabiá 2.0 — Auditoria visual (lente 6.1). Mede cada tela e compara com as metas.
   Uso: node auditoria-visual.mjs <config.json> [pasta-de-saída] [--base <auditoria-visual.json ou pasta da linha de base>]
   Sem --base: sai com erro (código 1) se alguma meta não for batida: serve de trava da versão.
   Com --base (regra "não pode piorar", enquanto o sistema está abaixo da meta): sai com erro se alguma medida PIOROU
   em relação à linha de base, se uma tela nova não bate a meta, ou se uma tela não abriu. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { abrirNavegador, fazer, APARELHOS, lerBase } from './passos.mjs';

const ARGS = process.argv.slice(2); const iBase = ARGS.indexOf('--base'); const BASE_ARQ = iBase >= 0 ? ARGS.splice(iBase, 2)[1] : null;
const cfg = JSON.parse(readFileSync(ARGS[0], 'utf8')); const OUT = ARGS[1] || 'auditoria-saida';
mkdirSync(OUT, { recursive: true });
const METAS = { letras: 7, cantos: 3, botaoMinPc: 28, botaoPc: 34, botaoToque: 44, maiusculasEspacadas: 0, emoji: 0, rolaDeLado: 0, errosConsole: 0, contraste: 4.5, ...(cfg.metas || {}) };

const medir = ({ alvosSel, minC }) => {
  const W = innerWidth, H = innerHeight;
  const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const cor = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map((x) => parseFloat(x)); return { r: p[0], g: p[1], b: p[2], a: p[3] == null ? 1 : p[3] }; };
  const fundoDe = (el) => { let e = el; let acc = null; while (e && e !== document.documentElement.parentNode) { const c = cor(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { if (!acc) acc = { ...c }; else { acc = { r: acc.r * acc.a + c.r * (1 - acc.a), g: acc.g * acc.a + c.g * (1 - acc.a), b: acc.b * acc.a + c.b * (1 - acc.a), a: Math.min(1, acc.a + c.a * (1 - acc.a)) }; } if (acc.a >= 0.99) break; } e = e.parentElement; } if (!acc || acc.a < 0.99) { const b = acc || { r: 255, g: 255, b: 255, a: 0 }; acc = { r: b.r * b.a + 255 * (1 - b.a), g: b.g * b.a + 255 * (1 - b.a), b: b.b * b.a + 255 * (1 - b.a), a: 1 }; } return acc; };
  const fontes = {}, cantos = {}, sombras = new Set(); let maiusc = 0, emoji = 0, sombraEBorda = 0; const alvos = [], exMaiusc = [], contrasteRuim = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= H || r.right <= 0 || r.left >= W) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) continue;
    const proprio = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    if (proprio) {
      const f = Math.round(parseFloat(cs.fontSize) * 2) / 2; fontes[f] = (fontes[f] || 0) + 1;
      if (cs.textTransform === 'uppercase' && parseFloat(cs.letterSpacing) > 0.2) { maiusc++; if (exMaiusc.length < 4) exMaiusc.push(proprio.slice(0, 24)); }
      if (/\p{Extended_Pictographic}/u.test(proprio.replace(/[★☆✓✕×▾▸◂▴▼▲←→↑↓©®™]/g, ''))) emoji++;
      const c = cor(cs.color), b = fundoDe(el);
      if (c && b && !el.closest('canvas,svg,[data-auditoria-ignorar]') && !cs.backgroundImage.includes('gradient')) { const mix = { r: c.r * c.a + b.r * (1 - c.a), g: c.g * c.a + b.g * (1 - c.a), b: c.b * c.a + b.b * (1 - c.a) }; const l1 = lum(mix.r, mix.g, mix.b), l2 = lum(b.r, b.g, b.b); const k = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); const grande = parseFloat(cs.fontSize) >= 18.5 || (parseFloat(cs.fontSize) >= 14 && +cs.fontWeight >= 700); if (k < (grande ? Math.min(3, minC) : minC) - 0.005 && !el.closest('[disabled],[aria-disabled=true]') && contrasteRuim.length < 8) contrasteRuim.push(`${proprio.slice(0, 20)} (${k.toFixed(1)})`); }
    }
    const tl = parseFloat(cs.borderTopLeftRadius) || 0; const borda = parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' && cor(cs.borderTopColor) && cor(cs.borderTopColor).a > 0.05;
    const temCaixa = (cor(cs.backgroundColor) || { a: 0 }).a > 0 || borda || cs.boxShadow !== 'none';
    if (tl > 0 && temCaixa && r.width > 12) { const k = tl >= Math.min(r.width, r.height) / 2 - 0.5 ? 'círculo' : Math.round(tl) + 'px'; cantos[k] = (cantos[k] || 0) + 1; }
    if (cs.boxShadow !== 'none') { sombras.add(cs.boxShadow); if (borda && !/inset/.test(cs.boxShadow) && r.width > 120 && r.height > 60 && !el.matches('button,input,select,textarea,dialog,[role=dialog]')) sombraEBorda++; }
    if (el.matches(alvosSel)) alvos.push({ h: Math.round(r.height), t: (el.getAttribute('aria-label') || el.title || el.textContent || el.tagName).trim().slice(0, 22) });
  }
  const hs = alvos.map((a) => a.h).sort((x, y) => x - y);
  return { letras: Object.keys(fontes).map(Number).sort((a, b) => a - b), cantos: Object.keys(cantos).filter((k) => k !== 'círculo'), sombras: sombras.size, sombraEBorda, maiusc, exMaiusc, emoji, alvos: alvos.length, hMin: hs[0] || 0, hMed: hs[Math.floor(hs.length / 2)] || 0, alturas: hs, exPequenos: alvos.filter((a) => a.h < 28).slice(0, 5).map((a) => `${a.t} (${a.h})`), contrasteRuim, rolaDeLado: document.documentElement.scrollWidth > W + 1 };
};

const ALVOS = cfg.alvos || 'button, [role=button], [role=tab], [role=menuitem], select, input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]), textarea';
const nav = await abrirNavegador(); const linhas = []; let fora = 0;
for (const ap of cfg.aparelhos || ['pc', 'celular']) {
  for (const tema of cfg.temas || [null]) {
    const ctx = await nav.newContext(APARELHOS[ap] || ap); const p = await ctx.newPage(); const erros = [];
    p.on('pageerror', (e) => erros.push(e.message.slice(0, 120))); p.on('console', (m) => { if (m.type() === 'error') erros.push(m.text().slice(0, 120)); });
    if (cfg.antes) await fazer(p, cfg.antes, cfg.base || '');
    for (const t of cfg.telas) {
      if (t.so && !t.so.includes(ap)) continue; // tela que só existe num aparelho
      let m; const antesErros = erros.length;
      try { await fazer(p, t.passos || [{ ir: t.url }], cfg.base || ''); if (tema) await fazer(p, [{ tema }]); await p.waitForTimeout(t.pausa || 500); m = await p.evaluate(medir, { alvosSel: ALVOS, minC: METAS.contraste }); } catch (e) { linhas.push({ aparelho: ap, tema, tela: t.nome, falhou: String(e.message).split('\n')[0].slice(0, 120) }); fora++; continue; }
      const arq = `${ap}-${tema ? tema.split('=')[1] + '-' : ''}${t.nome}`.replace(/[^a-z0-9-]/gi, '_') + '.png'; await p.screenshot({ path: `${OUT}/${arq}` });
      const toque = ap === 'celular'; const minimo = toque ? METAS.botaoToque : METAS.botaoMinPc;
      const pequenos = m.alturas.filter((h) => h < minimo).length;
      const r = { aparelho: ap, tema, tela: t.nome, print: arq, letras: m.letras.length, tamanhos: m.letras, cantos: m.cantos.length, quaisCantos: m.cantos, botoes: m.alvos, menor: m.hMin, abaixoDoMinimo: pequenos, maiusculasEspacadas: m.maiusc, emoji: m.emoji, sombraEBorda: m.sombraEBorda, contrasteFraco: m.contrasteRuim.length, rolaDeLado: m.rolaDeLado ? 1 : 0, errosConsole: erros.length - antesErros, exemplos: { pequenos: m.exPequenos, maiusculas: m.exMaiusc, contraste: m.contrasteRuim } };
      const isento = new Set(t.isento || []);
      r.fora = [['letras', r.letras > METAS.letras], ['cantos', r.cantos > METAS.cantos], ['botões', pequenos > 0], ['maiúsculas', r.maiusculasEspacadas > METAS.maiusculasEspacadas], ['emoji', r.emoji > METAS.emoji], ['rolagem de lado', r.rolaDeLado > 0], ['console', r.errosConsole > METAS.errosConsole], ['contraste', r.contrasteFraco > 0]].filter(([n, x]) => x && !isento.has(n)).map(([n]) => n);
      if (r.fora.length) fora++;
      linhas.push(r);
    }
    await ctx.close();
  }
}
await nav.close();
/* não pode piorar: compara cada tela com a mesma tela da linha de base */
const MEDIDAS = [['letras', 'letras'], ['cantos', 'cantos'], ['abaixoDoMinimo', 'botões'], ['maiusculasEspacadas', 'maiúsculas'], ['emoji', 'emoji'], ['contrasteFraco', 'contraste'], ['rolaDeLado', 'rolagem de lado'], ['errosConsole', 'console']];
let piorou = 0;
if (BASE_ARQ) {
  const base = lerBase(BASE_ARQ, 'auditoria-visual.json').telas || [];
  const chaveT = (r) => `${r.aparelho}|${r.tema || ''}|${r.tela}`; const porChave = new Map(base.map((b) => [chaveT(b), b]));
  for (const r of linhas) {
    if (r.falhou) { r.base = 'NÃO ABRIU'; piorou++; continue; }
    const b = porChave.get(chaveT(r));
    if (!b || b.falhou) { r.base = r.fora.length ? 'tela nova FORA da meta' : 'tela nova, dentro'; if (r.fora.length) piorou++; continue; }
    const pior = MEDIDAS.filter(([k]) => (r[k] || 0) > (b[k] || 0)).map(([k, n]) => `${n} ${b[k] || 0}→${r[k] || 0}`);
    const melhor = MEDIDAS.filter(([k]) => (r[k] || 0) < (b[k] || 0)).map(([k, n]) => `${n} ${b[k] || 0}→${r[k] || 0}`);
    r.piorou = pior; r.melhorou = melhor;
    r.base = pior.length ? 'PIOROU: ' + pior.join(', ') : melhor.length ? 'melhorou: ' + melhor.join(', ') : 'igual';
    if (pior.length) piorou++;
  }
}
writeFileSync(`${OUT}/auditoria-visual.json`, JSON.stringify({ metas: METAS, base: BASE_ARQ || null, piorou, telas: linhas }, null, 1));
const md = ['# Auditoria visual (Método Sabiá 2.0)', '', `Metas: até ${METAS.letras} tamanhos de letra, até ${METAS.cantos} tipos de canto, botão de ${METAS.botaoMinPc} px ou mais no PC e ${METAS.botaoToque} px no toque, sem maiúsculas espaçadas, sem emoji, sem rolagem de lado, console limpo, contraste ${METAS.contraste}.`, '', '| Aparelho | Tela | Letras | Cantos | Botões | Menor | Abaixo do mínimo | Maiúsc. | Contraste fraco | Console | Resultado |' + (BASE_ARQ ? ' Contra a base |' : ''), '|---|---|---|---|---|---|---|---|---|---|---|' + (BASE_ARQ ? '---|' : '')];
for (const r of linhas) md.push(r.falhou ? `| ${r.aparelho} | ${r.tela} | | | | | | | | | NÃO ABRIU: ${r.falhou} |` : `| ${r.aparelho}${r.tema ? ' ' + r.tema.split('=')[1] : ''} | ${r.tela} | ${r.letras} | ${r.cantos} | ${r.botoes} | ${r.menor} | ${r.abaixoDoMinimo} | ${r.maiusculasEspacadas} | ${r.contrasteFraco} | ${r.errosConsole} | ${r.fora.length ? 'FORA: ' + r.fora.join(', ') : 'dentro'} |${BASE_ARQ ? ` ${r.base} |` : ''}`);
md.push('', `${linhas.length - fora} de ${linhas.length} telas dentro das metas.` + (BASE_ARQ ? ` Contra a linha de base: ${piorou ? piorou + ' tela(s) PIORARAM ou não abriram' : 'nenhuma piorou'}.` : ''));
writeFileSync(`${OUT}/auditoria-visual.md`, md.join('\n') + '\n'); console.log(md.slice(4).join('\n'));
process.exit((BASE_ARQ ? piorou : fora) ? 1 : 0);
