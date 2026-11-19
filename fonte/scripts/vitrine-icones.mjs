/* Vértice Docs — vitrine da proposta de ícones da faixa (19/11/2026). Os mesmos desenhos de hoje em quatro tratamentos.
   Uso: node scripts/vitrine-icones.mjs <saida.html> */
import { writeFileSync } from 'node:fs';
import { NOVOS } from '../src/ui/iconesFaixa.js';
const [SAIDA] = process.argv.slice(2);
const ICS = [['colar', 'Colar', 'transf'], ['recortar', 'Recortar', 'transf'], ['copiar', 'Copiar', 'transf'], ['pincel', 'Pincel', 'transf'],
  ['condicional', 'Formatação condicional', 'forma'], ['soma', 'AutoSoma', 'formula'], ['estatistica', 'Estatística', 'formula'], ['localizar', 'Localizar', 'exibir'],
  ['grafico', 'Gráfico', 'inserir'], ['imagem', 'Imagem', 'inserir'], ['tabela', 'Tabela', 'inserir'], ['filtro', 'Filtrar', 'dados'],
  ['classificar', 'Classificar', 'dados'], ['amostra', 'Amostragem', 'dados'], ['validacao', 'Validação', 'dados'], ['duplicados', 'Duplicatas', 'dados'],
  ['congelar', 'Congelar', 'exibir'], ['cadeado', 'Proteger', 'exibir']];
const ESTILOS = [
  ['A', 'Hoje', 'Traço de 1,6 px na cor do texto; uma parte com toque dourado suave.'],
  ['B', 'Relevo suave', 'Traço de 1,5 px um pouco mais claro; as formas fechadas ganham um fundo bem leve e a parte de destaque um dourado mais firme, com uma sombra de 1 px embaixo: o ícone parece levemente em relevo, como os botões do estilo Camadas.'],
  ['C', 'Cor por família', 'Traço neutro; a parte de destaque ganha a cor da família do botão (área de transferência azul, fórmulas verde, inserir laranja, dados azul-petróleo, formatação roxa, exibir e proteger cinza-azulado), sempre em tom fechado. Ajuda a achar o grupo de olho, como no Office atual.'],
  ['D', 'Linha fina', 'Traço de 1,3 px, sem preenchimento; só a linha de destaque em dourado. Mais leve e minimalista.'],
  ['E', 'Linha fina com cor por família (C + D)', 'Traço de 1,3 px, sem fundo, como o D; a linha de destaque ganha a cor da família do botão, como o C. Leve e fácil de achar de olho.'],
];
const svg = (k, tam) => `<svg class="ic" viewBox="0 0 24 24" width="${tam}" height="${tam}" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${NOVOS[k]}</svg>`;
const faixa = (e) => `<div class="faixa est-${e}">
  <div class="gr">${ICS.slice(0, 9).map(([k, n, f]) => `<div class="bt fam-${f}">${svg(k, 26)}<span>${n}</span></div>`).join('')}</div>
  <div class="lupa">${['colar', 'condicional', 'grafico', 'filtro', 'validacao', 'cadeado'].map((k) => { const [, n, f] = ICS.find((x) => x[0] === k); return `<div class="fam-${f}">${svg(k, 48)}</div>`; }).join('')}</div>
  <div class="pq">${ICS.slice(9).map(([k, n, f]) => `<div class="bp fam-${f}">${svg(k, 17)}<span>${n}</span></div>`).join('')}</div></div>`;
const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Vértice Docs · proposta de ícones da faixa</title>
<style>
:root { --gold: #a5781e; }
body { margin: 0; font: 14px/1.4 'Segoe UI', system-ui, sans-serif; background: #f4f1ea; color: #1f2d36; }
.est { padding: 18px 24px 22px; border-bottom: 1px solid #e2dccf; }
.est h2 { margin: 0 0 2px; font-size: 18px; } .est p { margin: 0 0 12px; color: #5f6b73; max-width: 980px; }
.par { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.tema { border-radius: 12px; padding: 12px; } .claro { background: #fbf8f1; box-shadow: 0 1px 2px rgba(0,0,0,.06), 0 6px 16px rgba(0,0,0,.05); color: #1f2d36; }
.escuro { background: #1d252b; color: #e7e2d8; box-shadow: 0 1px 2px rgba(0,0,0,.3); --gold: #d8ae55; }
.faixa .gr { display: flex; flex-wrap: nowrap; gap: 2px; margin-bottom: 10px; } .faixa .pq { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 10px; }
.lupa { display: flex; gap: 18px; padding: 6px 4px 12px; margin-bottom: 8px; border-bottom: 1px solid color-mix(in srgb, currentColor 12%, transparent); }
.bt { width: 62px; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 2px; border-radius: 8px; text-align: center; font-size: 11.5px; line-height: 1.15; }
.bp { display: flex; align-items: center; gap: 7px; font-size: 12.5px; padding: 3px 4px; }
/* A · hoje */
.est-A .ic { stroke-width: 1.6; } .est-A .ic .t { fill: color-mix(in srgb, var(--gold) 22%, transparent); }
/* B · relevo suave */
.est-B .ic { stroke-width: 1.5; color: color-mix(in srgb, currentColor 88%, transparent); filter: drop-shadow(0 1px 0 rgba(0,0,0,.14)); }
.escuro .est-B .ic { filter: drop-shadow(0 1px 0 rgba(0,0,0,.55)); }
.est-B .ic rect:not(.t), .est-B .ic circle:not(.t), .est-B .ic ellipse:not(.t) { fill: color-mix(in srgb, currentColor 7%, transparent); }
.est-B .ic .t { fill: color-mix(in srgb, var(--gold) 38%, transparent); stroke: color-mix(in srgb, var(--gold) 80%, currentColor); }
/* C · cor por família */
.est-C .ic { stroke-width: 1.5; } .est-E .ic { stroke-width: 1.3; } .est-E .ic .t { fill: none; stroke: var(--fam); } .est-C .fam-transf, .est-E .fam-transf { --fam: #2f6fb3; } .est-C .fam-formula, .est-E .fam-formula { --fam: #2e7d4f; } .est-C .fam-inserir, .est-E .fam-inserir { --fam: #c0641a; }
.est-C .fam-dados, .est-E .fam-dados { --fam: #1f7f86; } .est-C .fam-forma, .est-E .fam-forma { --fam: #7348ad; } .est-C .fam-exibir, .est-E .fam-exibir { --fam: #4a6578; }
.escuro .est-C .fam-transf, .est-E .fam-transf { --fam: #6aa2e0; } .escuro .est-C .fam-formula, .est-E .fam-formula { --fam: #5fbf87; } .escuro .est-C .fam-inserir, .est-E .fam-inserir { --fam: #e8944f; }
.escuro .est-C .fam-dados, .est-E .fam-dados { --fam: #4fb7bd; } .escuro .est-C .fam-forma, .est-E .fam-forma { --fam: #a585d6; } .escuro .est-C .fam-exibir, .est-E .fam-exibir { --fam: #8fa8ba; }
.est-C .ic .t { fill: color-mix(in srgb, var(--fam) 26%, transparent); stroke: var(--fam); }
/* D · linha fina */
.est-D .ic { stroke-width: 1.3; } .est-D .ic .t { fill: none; stroke: var(--gold); }
.est-D .ic .f, .est-E .ic .f, .est-A .ic .f, .est-B .ic .f, .est-C .ic .f { fill: currentColor; }
</style></head><body>
${ESTILOS.map(([e, n, t]) => `<section class="est" id="est-${e}"><h2>${e} · ${n}</h2><p>${t}</p><div class="par"><div class="tema claro">${faixa(e)}</div><div class="tema escuro">${faixa(e)}</div></div></section>`).join('\n')}
</body></html>`;
writeFileSync(SAIDA, html);
console.log('ok', ICS.length, 'ícones x', ESTILOS.length, 'estilos');
