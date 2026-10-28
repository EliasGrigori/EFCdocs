/* Testes da v0.6.1: gráficos que vêm do Excel com toda a formatação, voltam iguais, editor (estilos, cores) e velocímetro.
   Só dados inventados (testes/amostras/amostra-painel.xlsx é gerado por gerar-amostra-painel.py). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { gDoXml, planoDoXml, xmlDoPlano, lerFaixaDoLivro, assinaturaPlano } from '../src/planilha/xlsx/graficosXlsx.js';
import { svgDoGrafico, svgDoPlano } from '../src/planilha/desenhoGrafico.js';
import { construir, fxDoEstilo, aplicarPacote, pacoteCores, seriesDe, materializarCores, corSemaforo } from '../src/planilha/graficoPlano.js';
import { normalizarG, dadosDaFaixa } from '../src/planilha/graficos.js';
import { arvore, filho } from '../src/planilha/xlsx/xmlArvore.js';
import { lerXlsx } from '../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../src/planilha/xlsx/gravar.js';
import { lerZip } from '../src/planilha/xlsx/zip.js';
import { Motor } from '../src/planilha/motor.js';
import { normalizarPlanilha } from '../src/planilha/modelo.js';
import { estrutura } from '../src/planilha/operacoes.js';

const AMOSTRA = fileURLToPath(new URL('./amostras/amostra-painel.xlsx', import.meta.url));
const C = 'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const ser = (dentro) => `<c:ser><c:idx val="0"/><c:order val="0"/>${dentro}</c:ser>`;

/* velocímetro como o Excel grava: rosca com metade invisível (cores do tema) + pizza que faz o ponteiro */
const VELO = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace ${C}><c:roundedCorners val="0"/>` +
  '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice Requires="c14"><c14:style val="102"/></mc:Choice><mc:Fallback><c:style val="2"/></mc:Fallback></mc:AlternateContent>' +
  '<c:chart><c:autoTitleDeleted val="1"/><c:plotArea><c:layout/><c:doughnutChart><c:varyColors val="1"/>' +
  ser('<c:spPr><a:ln><a:noFill/></a:ln></c:spPr>' +
    '<c:dPt><c:idx val="0"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:schemeClr val="accent6"/></a:solidFill></c:spPr></c:dPt>' +
    '<c:dPt><c:idx val="1"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="FFC000"/></a:solidFill></c:spPr></c:dPt>' +
    '<c:dPt><c:idx val="2"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:schemeClr val="accent2"><a:lumMod val="75000"/></a:schemeClr></a:solidFill></c:spPr></c:dPt>' +
    '<c:dPt><c:idx val="3"/><c:bubble3D val="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:dPt>' +
    '<c:dLbls><c:delete val="1"/></c:dLbls><c:val><c:numRef><c:f>Verif!$D$2:$D$5</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="4"/><c:pt idx="0"><c:v>1</c:v></c:pt><c:pt idx="1"><c:v>0.5</c:v></c:pt><c:pt idx="2"><c:v>0.5</c:v></c:pt><c:pt idx="3"><c:v>2</c:v></c:pt></c:numCache></c:numRef></c:val>' +
    '<c:extLst><c:ext uri="{C3380CC4-5D6E-409C-BE32-E72D297353CC}" xmlns:c16="http://schemas.microsoft.com/office/drawing/2014/chart"><c16:uniqueId val="{00000000-0001}"/></c:ext></c:extLst>') +
  '<c:firstSliceAng val="270"/><c:holeSize val="60"/></c:doughnutChart>' +
  '<c:pieChart><c:varyColors val="1"/>' + ser('<c:dPt><c:idx val="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:dPt><c:dPt><c:idx val="1"/><c:spPr><a:solidFill><a:schemeClr val="tx1"/></a:solidFill></c:spPr></c:dPt><c:dPt><c:idx val="2"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr></c:dPt>' +
    '<c:val><c:numRef><c:f>Verif!$F$2:$F$4</c:f><c:numCache><c:ptCount val="3"/><c:pt idx="0"><c:v>0.58</c:v></c:pt><c:pt idx="1"><c:v>0.03</c:v></c:pt><c:pt idx="2"><c:v>3.39</c:v></c:pt></c:numCache></c:numRef></c:val>') +
  '<c:firstSliceAng val="270"/></c:pieChart></c:plotArea><c:plotVisOnly val="1"/></c:chart>' +
  '<c:spPr><a:solidFill><a:schemeClr val="bg1"/></a:solidFill><a:ln w="9525"><a:solidFill><a:schemeClr val="tx1"><a:lumMod val="15000"/><a:lumOff val="85000"/></a:schemeClr></a:solidFill></a:ln></c:spPr>' +
  '<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"><a:solidFill><a:schemeClr val="tx1"><a:lumMod val="65000"/><a:lumOff val="35000"/></a:schemeClr></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="pt-BR"/></a:p></c:txPr><c:externalData r:id="rId1"><c:autoUpdate val="0"/></c:externalData></c:chartSpace>';

/* painel escuro: colunas em degradê com brilho + linha curva no eixo da direita (mín -0,2, máx 1), rótulos em R$ */
const COMBO = `<c:chartSpace ${C}><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:p><a:pPr><a:defRPr sz="1600" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:defRPr></a:pPr><a:r><a:rPr lang="pt-BR" sz="1600" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr><a:t>DADOS DAS ANÁLISES</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/><c:plotArea>` +
  '<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>' + ser('<c:tx><c:v>Gasto</c:v></c:tx><c:spPr><a:gradFill><a:gsLst><a:gs pos="0"><a:srgbClr val="1F8FC9"/></a:gs><a:gs pos="100000"><a:srgbClr val="0E3D5C"/></a:gs></a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill><a:ln w="19050"><a:solidFill><a:srgbClr val="2E9FD8"/></a:solidFill></a:ln><a:effectLst><a:glow rad="63500"><a:srgbClr val="2E9FD8"><a:alpha val="40000"/></a:srgbClr></a:glow></a:effectLst></c:spPr><c:invertIfNegative val="0"/>' +
    '<c:dLbls><c:numFmt formatCode="&quot;R$&quot; #,##0.00" sourceLinked="0"/><c:spPr><a:noFill/></c:spPr><c:txPr><a:bodyPr/><a:p><a:pPr><a:defRPr sz="900" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:defRPr></a:pPr></a:p></c:txPr><c:dLblPos val="inEnd"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls>' +
    '<c:cat><c:strRef><c:f>Painel!$A$2:$A$3</c:f><c:strCache><c:ptCount val="2"/><c:pt idx="0"><c:v>BR 01</c:v></c:pt><c:pt idx="1"><c:v>BR 02</c:v></c:pt></c:strCache></c:strRef></c:cat><c:val><c:numRef><c:f>Painel!$B$2:$B$3</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="2"/><c:pt idx="0"><c:v>157.5</c:v></c:pt><c:pt idx="1"><c:v>708.75</c:v></c:pt></c:numCache></c:numRef></c:val>') +
  '<c:gapWidth val="60"/><c:axId val="1"/><c:axId val="2"/></c:barChart>' +
  '<c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/><c:ser><c:idx val="1"/><c:order val="1"/><c:tx><c:v>Coliformes</c:v></c:tx><c:spPr><a:ln w="28575" cap="rnd"><a:solidFill><a:srgbClr val="D2691E"/></a:solidFill><a:prstDash val="sysDash"/></a:ln></c:spPr><c:marker><c:symbol val="circle"/><c:size val="8"/><c:spPr><a:solidFill><a:srgbClr val="D2691E"/></a:solidFill></c:spPr></c:marker>' +
  '<c:val><c:numRef><c:f>Painel!$C$2:$C$3</c:f><c:numCache><c:ptCount val="2"/><c:pt idx="0"><c:v>0</c:v></c:pt><c:pt idx="1"><c:v>1</c:v></c:pt></c:numCache></c:numRef></c:val><c:smooth val="1"/></c:ser><c:marker val="1"/><c:axId val="3"/><c:axId val="4"/></c:lineChart>' +
  '<c:catAx><c:axId val="1"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:txPr><a:bodyPr/><a:p><a:pPr><a:defRPr sz="800" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:defRPr></a:pPr></a:p></c:txPr><c:crossAx val="2"/></c:catAx>' +
  '<c:valAx><c:axId val="2"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln><a:solidFill><a:srgbClr val="44546A"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="&quot;R$&quot; #,##0" sourceLinked="0"/><c:crossAx val="1"/></c:valAx>' +
  '<c:catAx><c:axId val="3"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="1"/><c:axPos val="b"/><c:crossAx val="4"/></c:catAx>' +
  '<c:valAx><c:axId val="4"/><c:scaling><c:orientation val="minMax"/><c:max val="1"/><c:min val="-0.2"/></c:scaling><c:delete val="0"/><c:axPos val="r"/><c:crossAx val="3"/><c:crosses val="max"/></c:valAx>' +
  '<c:spPr><a:noFill/></c:spPr></c:plotArea><c:legend><c:legendPos val="b"/><c:legendEntry><c:idx val="1"/><c:delete val="1"/></c:legendEntry></c:legend></c:chart>' +
  '<c:spPr><a:solidFill><a:srgbClr val="1F2A33"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:chartSpace>';

test('v0.6.1: XML em árvore: sem prefixo, AlternateContent fica o Fallback, extensões saem', () => {
  const r = arvore(VELO);
  assert.equal(r.n, 'chartSpace');
  assert.ok(filho(r, 'style'), 'Fallback do AlternateContent');
  assert.ok(!JSON.stringify(r).includes('uniqueId'), 'extLst sai');
  const sem = arvore('<chartSpace xmlns="x"><chart><plotArea/></chart></chartSpace>');
  assert.ok(filho(filho(sem, 'chart'), 'plotArea'), 'XML sem prefixo (openpyxl)');
});

test('v0.6.1: velocímetro do Excel: rosca + pizza, fatias invisíveis, giro e furo, cores do tema com mais escuro', () => {
  const { plano: P } = planoDoXml(VELO);
  assert.deepEqual(P.grupos.map((G) => G.tipo), ['doughnut', 'pie']);
  const [ro, pz] = P.grupos;
  assert.equal(ro.giro, 270); assert.equal(ro.furo, 60); assert.equal(pz.giro, 270);
  assert.equal(ro.series[0].pontos[0].preench.cor, '#70ad47', 'accent6 do tema padrão');
  assert.equal(ro.series[0].pontos[2].preench.cor, '#c55a11', 'accent2 com lumMod 75% ("Laranja, Ênfase 2, mais escuro 25%" do Excel)');
  assert.equal(ro.series[0].pontos[3].preench.t, 'nenhum', 'metade de baixo invisível');
  assert.equal(pz.series[0].pontos[1].preench.cor, '#000000', 'ponteiro preto (tx1)');
  assert.equal(P.fonte.tam, 9); assert.equal(P.fonte.cor, '#595959', 'tx1 com lumMod/lumOff');
  assert.equal(P.legenda, null); assert.equal(P.titulo, null);
  assert.equal(ro.series[0].rotulos, null, 'rótulos apagados');
  const svg = svgDoPlano(P, { w: 240, h: 180 });
  assert.equal((svg.match(/data-parte="ponto:0:/g) || []).length, 3, 'só as 3 fatias visíveis da rosca');
  assert.equal((svg.match(/data-parte="ponto:1:/g) || []).length, 1, 'só o ponteiro da pizza');
  assert.ok(!/NaN|undefined/.test(svg));
  /* o XML original vai junto, sem o que depende de outras partes do arquivo */
  const { g } = gDoXml(VELO);
  assert.equal(g.t, 'excel'); assert.ok(!g.xo.includes('externalData')); assert.ok(g.xo.includes('c14:style'));
});

test('v0.6.1: painel escuro: degradê, brilho, R$ nos rótulos, linha curva tracejada no eixo da direita, mínimo e máximo', () => {
  const { plano: P } = planoDoXml(COMBO);
  const [bar, lin] = P.grupos;
  assert.equal(bar.espaco, 60); assert.ok(!bar.eixo2); assert.equal(lin.eixo2, true);
  const S = bar.series[0];
  assert.equal(S.preench.t, 'degrade'); assert.equal(S.preench.paradas[1].cor, '#0e3d5c'); assert.equal(S.preench.ang, 90);
  assert.equal(S.efeito.brilho.raio, 5); assert.equal(S.efeito.brilho.alfa, 0.4);
  assert.equal(S.rotulos.fmt, '"R$" #,##0.00'); assert.equal(S.rotulos.pos, 'inEnd'); assert.equal(S.rotulos.cor, '#ffffff');
  const L = lin.series[0];
  assert.equal(L.suave, true); assert.equal(L.linha.tr, 'sysDash'); assert.equal(L.linha.larg, 2.25); assert.equal(L.marcador.forma, 'circle');
  assert.equal(P.eixos.y2.min, -0.2); assert.equal(P.eixos.y2.max, 1); assert.equal(P.eixos.y.fmt, '"R$" #,##0');
  assert.equal(P.fundo.preench.cor, '#1f2a33'); assert.equal(P.titulo.texto, 'DADOS DAS ANÁLISES'); assert.equal(P.titulo.tam, 16);
  assert.deepEqual(P.legenda.ocultas, [1]);
  const svg = svgDoPlano(P, { w: 600, h: 300 });
  assert.match(svg, /<linearGradient/); assert.match(svg, /<filter/); assert.match(svg, /R\$ 708,75/); assert.match(svg, /R\$ 800</);
  assert.match(svg, />-0,2</, 'eixo da direita começa em -0,2');
  assert.ok(!svg.includes('>Coliformes<'), 'item escondido da legenda');
  /* gravar de novo (depois de mexer) leva tudo */
  const x = xmlDoPlano(P, { textoRef: (r) => r && `${r.aba}!${r.fx}` });
  for (const k of ['<a:gradFill', '<a:glow', '<c:smooth val="1"/>', '<c:min val="-0.2"/>', 'formatCode="&quot;R$&quot; #,##0.00"', '<c:legendEntry><c:idx val="1"/><c:delete val="1"/>', '<a:prstDash val="sysDash"/>', 'srgbClr val="1F2A33"']) assert.ok(x.includes(k), k);
  const P2 = planoDoXml(x).plano;
  assert.equal(assinaturaPlano(P2).length > 100, true);
  assert.equal(P2.grupos[0].series[0].preench.t, 'degrade'); assert.equal(P2.eixos.y2.min, -0.2);
});

test('v0.6.1: segurança: cor estranha no arquivo não entra no desenho', () => {
  const { plano: P } = planoDoXml(COMBO);
  P.fundo.preench.cor = '"/><script>alert(1)</script>';
  P.grupos[0].series[0].preench = { t: 'solido', cor: 'red" onload="x' };
  const svg = svgDoPlano(P, { w: 300, h: 200 });
  assert.ok(!svg.includes('<script') && !svg.includes('onload'));
});

test('v0.6.1: amostra-painel.xlsx (openpyxl): 7 gráficos vêm com a formatação e voltam IGUAIS ao salvar sem mexer', async () => {
  const bytes = new Uint8Array(readFileSync(AMOSTRA));
  const { conteudo, relatorio } = await lerXlsx(bytes);
  assert.equal(relatorio.extras.graficos, 7);
  assert.ok(!relatorio.fora.some((f) => f.item === 'Gráficos'), JSON.stringify(relatorio.fora));
  const c = normalizarPlanilha(conteudo);
  const todos = c.ordem.flatMap((id) => (c.abas[id].objs || []).map((o) => ({ id, o })));
  assert.ok(todos.every(({ o }) => o.g.t === 'excel'));
  const painel = c.ordem.find((id) => c.abas[id].nome === 'Painel');
  /* referências viraram id de aba ('' = a própria aba) */
  const gb = todos.find(({ o }) => /Gasto por ponto/.test(o.g.titulo)).o.g;
  assert.deepEqual(gb.plano.grupos[0].series[0].vals.ref, { aba: '', fx: 'B2:B6' });
  /* números de agora, lidos da planilha */
  const m = new Motor(c);
  const svg = svgDoGrafico(gb, null, { w: 600, h: 260, lerFaixa: lerFaixaDoLivro(c, m, painel) });
  assert.match(svg, /R\$ 945,00/);
  const { bytes: b2 } = await gravarXlsx(c, m);
  const z0 = lerZip(bytes), z1 = lerZip(b2);
  for (let i = 1; i <= 7; i++) {
    const a = (await z0.texto(`xl/charts/chart${i}.xml`)).replace(/<\?xml[^>]*\?>\s*/, '');
    const b = (await z1.texto(`xl/charts/chart${i}.xml`)).replace(/<\?xml[^>]*\?>\s*/, '');
    assert.equal(b, a, `chart${i} igual ao original`);
  }
  /* mudar o estilo: o gráfico é refeito com a formatação nova; renomear a aba também refaz (referência com o nome novo) */
  const o = c.abas[painel].objs.find((x) => /Gasto por ponto/.test(x.g.titulo));
  o.g = aplicarPacote(o.g, fxDoEstilo('limpo', 1), { estilo: 'limpo' });
  c.abas[painel].nome = 'Painel 2';
  const { bytes: b3 } = await gravarXlsx(c, new Motor(c));
  const z3 = lerZip(b3);
  const xs = await Promise.all([1, 2, 3, 4, 5, 6, 7].map((i) => z3.texto(`xl/charts/chart${i}.xml`)));
  const novo = xs.find((x) => x.includes('Gasto por ponto'));
  assert.match(novo, /<c:f>'Painel 2'!\$B\$2:\$B\$6<\/c:f>/);
  assert.match(novo, /srgbClr val="0F4C5C"/i, 'cor do estilo Limpo');
  assert.match(novo, /formatCode="&quot;R\$&quot; #,##0.00"/, 'o formato R$ dos rótulos ficou');
});

test('v0.6.1: a mesma amostra com o XML no jeito do Excel (prefixo c:) também vem inteira', async () => {
  const { relatorio, conteudo } = await lerXlsx(new Uint8Array(readFileSync(AMOSTRA.replace('amostra-painel.xlsx', 'amostra-painel-excel.xlsx'))));
  assert.equal(relatorio.extras.graficos, 7);
  const gs = conteudo.ordem.flatMap((id) => (conteudo.abas[id].objs || []).map((o) => o.g));
  assert.ok(gs.every((g) => g.t === 'excel'));
  assert.deepEqual(gs[0].plano.grupos.map((G) => G.tipo), ['doughnut', 'pie']);
});

test('v0.6.1: inserir linhas acima dos dados: as referências do gráfico do Excel acompanham', async () => {
  const { conteudo } = await lerXlsx(new Uint8Array(readFileSync(AMOSTRA)));
  const c = normalizarPlanilha(conteudo);
  const painel = c.ordem.find((id) => c.abas[id].nome === 'Painel');
  const mud = estrutura(c, painel, 'l', 0, 2);
  const objs = mud[`conteudo.abas.${painel}.objs`];
  const g = objs.find((o) => /Gasto por ponto/.test(o.g.titulo)).g;
  assert.equal(g.plano.grupos[0].series[0].vals.ref.fx, 'B4:B8');
});

test('v0.6.1: velocímetro do EFCdocs: desenho e Excel (rosca com metade invisível + pizza ponteiro)', () => {
  const d = { cats: ['1'], series: [{ nome: 'Cloro', vals: [0.62], j: 0 }], temCat: false };
  const g = normalizarG({ t: 'velocimetro', titulo: 'Cloro na cozinha', op: { meta: 0.5, max: 2 } });
  const P = construir(g, d, { nome: [null], val: ['Verif!$B$2'], cat: null });
  const G = P.grupos[0];
  assert.equal(G.tipo, 'gauge'); assert.equal(G.valor, 0.62); assert.equal(G.max, 2);
  assert.deepEqual(G.faixas.map((f) => f.cor), ['#c0392b', '#e0a526', '#2e8b57'], 'vermelho abaixo, amarelo perto, verde na meta');
  const svg = svgDoPlano(P, { w: 300, h: 200 });
  assert.match(svg, /data-parte="ponteiro"/); assert.match(svg, />0,62</);
  const x = xmlDoPlano(P);
  assert.match(x, /<c:doughnutChart>[\s\S]*<c:firstSliceAng val="270"\/><c:holeSize val="60"\/><\/c:doughnutChart><c:pieChart>/);
  assert.equal((x.match(/<a:noFill\/>/g) || []).length >= 4, true, 'metade de baixo e as fatias da pizza invisíveis');
  const volta = planoDoXml(x).plano;
  assert.deepEqual(volta.grupos.map((gg) => gg.tipo), ['doughnut', 'pie']);
});

test('v0.6.1: estilos rápidos, cores e semáforo (que vai para o Excel como cor de cada ponto)', () => {
  const d = { cats: ['A', 'B', 'C'], series: [{ nome: 'Cloro', vals: [0.2, 0.55, 1.1], j: 1 }], temCat: true, cab: true };
  const base = normalizarG({ t: 'colunas', titulo: 'T', op: { meta: 0.5 } });
  const esc = aplicarPacote(base, fxDoEstilo('escuro', 1), { estilo: 'escuro' });
  assert.match(svgDoGrafico(esc, d, { w: 300, h: 200 }), /fill="#0f1d24"/);
  const sem = aplicarPacote(base, fxDoEstilo('semaforo', 1), { estilo: 'semaforo' });
  const svg = svgDoGrafico(sem, d, { w: 300, h: 200 });
  for (const cor of ['#c0392b', '#e0a526', '#2e8b57']) assert.ok(svg.includes(`fill="${cor}"`), cor);
  assert.equal(corSemaforo(0.2, { folga: 15 }, 0.5), '#c0392b'); assert.equal(corSemaforo(0.52, { folga: 15 }, 0.5), '#e0a526'); assert.equal(corSemaforo(1, { folga: 15 }, 0.5), '#2e8b57');
  assert.equal(corSemaforo(0.4, { sentido: 'menor' }, 0.5), '#2e8b57', 'menor é melhor');
  const P = materializarCores(construir(sem, d));
  assert.equal(P.grupos[0].series[0].pontos[0].preench.cor, '#c0392b');
  const cores = aplicarPacote(base, pacoteCores(construir(base, d), ['#111111', '#222222']));
  assert.equal(seriesDe(construir(cores, d))[0].S.preench.cor, '#111111');
  /* gravar leva a cor de cada ponto */
  const x = xmlDoPlano(construir(sem, d));
  assert.match(x, /<c:dPt><c:idx val="0"\/><c:invertIfNegative val="0"\/><c:bubble3D val="0"\/><c:spPr><a:solidFill><a:srgbClr val="C0392B">/);
});

test('v0.6.1: como no Excel, linhas e colunas ocultas ficam fora do gráfico; datas vão como datas', () => {
  const vals = { '0,0': 'Data', '0,1': 'Cloro', '1,0': 46027, '1,1': 0.4, '2,0': 46028, '2,1': 9, '3,0': 46029, '3,1': 0.7 };
  const ler = (l, c) => vals[`${l},${c}`] ?? null;
  const texto = (l, c) => { const v = ler(l, c); return typeof v === 'number' && c === 0 ? `0${l + 4}/01/2026` : String(v ?? ''); };
  const d = dadosDaFaixa({ l1: 0, c1: 0, l2: 3, c2: 1 }, ler, texto, false, (l, c) => (c === 0 ? 'dd/mm/yyyy' : null), { l: { 2: 1 }, c: {} });
  assert.deepEqual(d.series[0].vals, [0.4, 0.7], 'a linha oculta (9) fica fora');
  assert.equal(d.ocultas, 1);
  assert.deepEqual(d.catsNum, [46027, 46029]); assert.equal(d.catsFmt, 'dd/mm/yyyy');
  const x = xmlDoPlano(construir(normalizarG({ t: 'linha' }), d, { nome: ['A!$B$1'], val: ['A!$B$2:$B$4'], cat: 'A!$A$2:$A$4' }));
  assert.match(x, /<c:cat><c:numRef><c:f>A!\$A\$2:\$A\$4<\/c:f><c:numCache><c:formatCode>dd\/mm\/yyyy<\/c:formatCode>/, 'datas como datas (o LibreOffice mostrava número)');
});
