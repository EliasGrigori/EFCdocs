/* Método Sabiá 2.0 — Auditoria de rapidez (lente 6.2). Mede o tempo de cada ação, no aparelho normal e com o processador mais lento.
   Uso: node auditoria-rapidez.mjs <config.json> [pasta-de-saída] [--base <auditoria-rapidez.json ou pasta>]
   Sem --base: sai com código 1 se alguma meta estourar. Com --base ("não pode piorar"): sai com 1 se alguma ação
   ficou mais lenta que na linha de base (mais de 25%, ou 40% com o processador freado, e mais de 20 ms, para não acusar a
   variação normal) ou não rodou. Cada ação é medida várias vezes (repeticoes, padrão 5) e vale a mediana. */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { abrirNavegador, fazer, quieto, APARELHOS, lerBase } from './passos.mjs';
const ARGS = process.argv.slice(2); const iBase = ARGS.indexOf('--base'); const BASE_ARQ = iBase >= 0 ? ARGS.splice(iBase, 2)[1] : null;
const cfg = JSON.parse(readFileSync(ARGS[0], 'utf8')); const OUT = ARGS[1] || 'auditoria-saida'; mkdirSync(OUT, { recursive: true });
const META = { comum: 100, pesada: 1000, lento: 3, ...(cfg.metasRapidez || {}) };
const nav = await abrirNavegador(); const res = [];
for (const freio of cfg.freios || [1, 4]) {
  const ctx = await nav.newContext(APARELHOS[cfg.aparelhoRapidez || 'pc']); const p = await ctx.newPage();
  if (freio > 1) { const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: freio }); }
  if (cfg.antes) await fazer(p, cfg.antes, cfg.base || '');
  if (cfg.preparar) await fazer(p, cfg.preparar, cfg.base || '');
  for (const a of cfg.acoes || []) {
    try {
      if (a.preparar) await fazer(p, a.preparar, cfg.base || '');
      /* mede a mesma ação algumas vezes e fica com a mediana: uma medida só pode acusar variação normal da máquina */
      const vezes = []; for (let i = 0; i < (a.repeticoes || cfg.repeticoes || 5); i++) { await quieto(p); const t = Date.now(); await fazer(p, a.passos, cfg.base || ''); await quieto(p); vezes.push(Date.now() - t); }
      const ms = [...vezes].sort((x, y) => x - y)[Math.floor(vezes.length / 2)];
      const meta = (a.meta != null ? a.meta : a.pesada ? META.pesada : META.comum) * (freio > 1 ? META.lento : 1);
      res.push({ acao: a.nome, freio, ms, vezes, meta, fora: ms > meta });
    } catch (e) { res.push({ acao: a.nome, freio, falhou: String(e.message).split('\n')[0].slice(0, 120), fora: true }); }
  }
  await ctx.close();
}
await nav.close();
let piorou = 0;
if (BASE_ARQ) {
  const base = new Map((lerBase(BASE_ARQ, 'auditoria-rapidez.json').medidas || []).map((b) => [`${b.acao}|${b.freio}`, b]));
  for (const r of res) {
    const b = base.get(`${r.acao}|${r.freio}`);
    if (r.falhou) { r.base = 'NÃO RODOU'; piorou++; continue; }
    if (!b || b.falhou) { r.base = r.fora ? 'ação nova FORA da meta' : 'ação nova, dentro'; if (r.fora) piorou++; continue; }
    r.antes = b.ms;
    const folga = r.freio > 1 ? 1.4 : 1.25; // com o processador freado a variação normal é maior
    if (r.ms > b.ms * folga && r.ms - b.ms > 20) { r.base = `PIOROU: ${b.ms} → ${r.ms} ms`; piorou++; }
    else r.base = r.ms < b.ms * 0.8 && b.ms - r.ms > 20 ? `melhorou: ${b.ms} → ${r.ms} ms` : `igual (${b.ms} ms antes)`;
  }
}
writeFileSync(`${OUT}/auditoria-rapidez.json`, JSON.stringify({ metas: META, base: BASE_ARQ || null, piorou, medidas: res }, null, 1));
const md = ['# Auditoria de rapidez (Método Sabiá 2.0)', '', `Mediana de ${cfg.repeticoes || 5} medidas por ação. Metas: ação comum até ${META.comum} ms, ação pesada até ${META.pesada} ms; com o processador mais lento, até ${META.lento} vezes isso.`, '', '| Ação | Processador | Tempo | Meta | Resultado |' + (BASE_ARQ ? ' Contra a base |' : ''), '|---|---|---|---|---|' + (BASE_ARQ ? '---|' : '')];
for (const r of res) md.push(r.falhou ? `| ${r.acao} | ${r.freio === 1 ? 'normal' : r.freio + '× mais lento'} | | | NÃO RODOU: ${r.falhou} |${BASE_ARQ ? ' NÃO RODOU |' : ''}` : `| ${r.acao} | ${r.freio === 1 ? 'normal' : r.freio + '× mais lento'} | ${r.ms} ms | ${r.meta} ms | ${r.fora ? 'FORA' : 'dentro'} |${BASE_ARQ ? ` ${r.base} |` : ''}`);
writeFileSync(`${OUT}/auditoria-rapidez.md`, md.join('\n') + '\n'); console.log(md.slice(4).join('\n'));
if (BASE_ARQ) console.log(`\nContra a linha de base: ${piorou ? piorou + ' ação(ões) PIORARAM ou não rodaram' : 'nenhuma piorou'}.`);
process.exit((BASE_ARQ ? piorou : res.some((r) => r.fora)) ? 1 : 0);
