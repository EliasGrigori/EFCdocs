/* Testes da v0.6.5: formas do Excel (painéis, setas, botões com link, caixas de texto, grupos) — ler, desenhar e gravar.
   Amostra inventada: testes/amostras/amostra-formas.xlsx (gerar-amostra-formas.py). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../src/planilha/xlsx/gravar.js';
import { lerZip } from '../src/planilha/xlsx/zip.js';
import { lerFormaDaAncora, linkDoAlvo, lerTextLink, ancoraMais } from '../src/planilha/xlsx/formasXlsx.js';
import { caminhoDoDesenho, CONHECIDOS, svgDaForma, arrumarTexto, novaForma, comTexto, parteNoPonto, assinaturaForma, limparForma } from '../src/planilha/formas.js';
import { normalizarObjetos } from '../src/planilha/objetos.js';
import { planilhaVazia } from '../src/planilha/modelo.js';

const AMOSTRA = new URL('./amostras/amostra-formas.xlsx', import.meta.url);
const ler = async (bytes) => (await lerXlsx(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))).conteudo;
const abaPorNome = (c, n) => c.abas[c.ordem.find((id) => c.abas[id].nome === n)];

test('v0.6.5: o painel do Excel vem com as formas, na ordem do desenho (o fundo embaixo, o gráfico do grupo solto)', async () => {
  const { conteudo: c, relatorio } = await lerXlsx(new Uint8Array(readFileSync(AMOSTRA)));
  const A = abaPorNome(c, 'Painel');
  const tipos = A.objs.map((o) => o.tipo);
  assert.equal(tipos.filter((t) => t === 'forma').length, 10);
  assert.equal(tipos.filter((t) => t === 'grafico').length, 1);
  assert.equal(relatorio.extras.formas, 10);
  /* o painel de fundo é o primeiro (fica embaixo de tudo) */
  assert.equal(A.objs[0].tipo, 'forma'); assert.equal(A.objs[0].partes[0].g, 'roundRect');
  assert.equal(A.objs[0].partes[0].preench.t, 'degrade');
  /* o gráfico que estava dentro do grupo sai solto, logo depois do grupo e 2 linhas abaixo do começo dele */
  const ig = tipos.indexOf('grafico');
  const grupo = A.objs[ig - 1];
  assert.equal(grupo.tipo, 'forma'); assert.equal(grupo.partes.length, 1, 'no grupo ficou só a etiqueta');
  assert.equal(A.objs[ig].l, grupo.l + 2); assert.equal(A.objs[ig].c, grupo.c);
  assert.ok(Math.abs(A.objs[ig].w - grupo.w) < 2);
});

test('v0.6.5: botões de navegação: o link vira a aba certa (com nome com espaço e acento) e o texto ligado lê a célula', async () => {
  const c = await ler(readFileSync(AMOSTRA));
  const A = abaPorNome(c, 'Painel');
  const nav = A.objs.find((o) => o.tipo === 'forma' && o.partes.length === 3);
  assert.ok(nav, 'grupo de navegação');
  const alvos = nav.partes.map((p) => c.abas[p.link.aba].nome);
  assert.deepEqual(alvos, ['Dados', 'Ações Corretivas', 'Painel']);
  assert.ok(nav.partes.every((p) => p.g === 'round2DiagRect'));
  assert.ok(nav.partes[0].efeito && nav.partes[0].efeito.sombra, 'sombra do primeiro botão');
  /* cor do tema (accent6 do arquivo) e texto do estilo */
  assert.match(nav.partes[0].preench.cor, /^#[0-9a-f]{6}$/);
  assert.equal(nav.partes[0].texto.pars[0].runs[0].t, 'Dados');
  assert.ok(nav.partes[0].texto.pars[0].runs[0].neg);
  const lig = A.objs.find((o) => o.tipo === 'forma' && o.partes[0].texto && o.partes[0].texto.ligado);
  assert.deepEqual(lig.partes[0].texto.ligado, { ref: 'C40' });
  const seta = A.objs.find((o) => o.tipo === 'forma' && o.partes[0].g === 'rightArrow');
  assert.equal(c.abas[seta.partes[0].link.aba].nome, 'Ações Corretivas');
  const linha = A.objs.find((o) => o.tipo === 'forma' && o.partes[0].g === 'straightConnector1');
  assert.equal(linha.partes[0].linha.fim, 'triangle'); assert.equal(linha.h, 0);
  const livre = A.objs.find((o) => o.tipo === 'forma' && o.partes[0].g === 'cust');
  assert.equal(livre.partes[0].cust[0].cmds.map((k) => k.t).join(''), 'MLCZ');
  const logo = A.objs.find((o) => o.tipo === 'forma' && o.partes.some((p) => p.g === 'img'));
  assert.equal(logo.partes[0].corte, 'ellipse');
  assert.match(logo.partes[0].src, /^data:image\/png;base64,/);
});

test('v0.6.5: salvar sem mexer: cada forma volta com o XML original (nome, desenho, estilo do tema e link), e o tema do arquivo vai junto', async () => {
  const bytes = new Uint8Array(readFileSync(AMOSTRA));
  const c = await ler(bytes);
  const { bytes: saida } = await gravarXlsx(c);
  const z = lerZip(saida);
  const d = await z.texto('xl/drawings/drawing1.xml');
  const rels = await z.texto('xl/drawings/_rels/drawing1.xml.rels');
  for (const nome of ['Painel de fundo', 'Botão Dados', 'Botão Ações', 'Seta Ações', 'Conector', 'Desenho livre', 'Total ligado', 'Etiqueta do gráfico', 'Figura']) assert.ok(d.includes(`name="${nome}"`), nome);
  assert.ok(d.includes('<a:schemeClr val="accent6"/>'), 'cor do tema guardada');
  assert.ok(d.includes('<xdr:style>'), 'estilo da forma');
  assert.ok(d.includes('textlink="$C$40"'));
  assert.ok(rels.includes('Target="#Dados!A1"') && rels.includes("Target=\"#'Ações Corretivas'!A1\""));
  assert.ok(/Target="\.\.\/media\/image\d+\.png"/.test(rels), 'figura do grupo');
  /* nenhum r:id sem relação, e os ids das formas não se repetem */
  const ids = [...d.matchAll(/r:(?:id|embed)="([^"]+)"/g)].map((m) => m[1]);
  for (const id of ids) assert.ok(rels.includes(`Id="${id}"`), 'r:id ' + id);
  const cnv = [...d.matchAll(/<xdr:cNvPr id="(\d+)"/g)].map((m) => m[1]);
  assert.equal(new Set(cnv).size, cnv.length, 'ids únicos');
  const tema = await z.texto('xl/theme/theme1.xml');
  assert.ok(tema && tema.includes('<a:accent6>'), 'tema vai junto');
  assert.ok((await z.texto('[Content_Types].xml')).includes('/xl/theme/theme1.xml'));
  /* e abre de novo igual */
  const c2 = await ler(saida);
  const A2 = abaPorNome(c2, 'Painel');
  assert.equal(A2.objs.filter((o) => o.tipo === 'forma').length, 10);
  const nav2 = A2.objs.find((o) => o.tipo === 'forma' && o.partes.length === 3);
  assert.deepEqual(nav2.partes.map((p) => c2.abas[p.link.aba].nome), ['Dados', 'Ações Corretivas', 'Painel']);
});

test('v0.6.5: forma mexida é escrita de novo (texto, cor, link para aba renomeada); forma nova e botão vão como formas com link', async () => {
  const c = await ler(readFileSync(AMOSTRA));
  const idP = c.ordem.find((id) => c.abas[id].nome === 'Painel');
  const idD = c.ordem.find((id) => c.abas[id].nome === 'Dados');
  const A = c.abas[idP];
  const seta = A.objs.find((o) => o.tipo === 'forma' && o.partes[0].g === 'rightArrow');
  const k = A.objs.indexOf(seta);
  A.objs[k] = { ...seta, partes: [{ ...comTexto(seta.partes[0], 'Ver ações'), preench: { t: 'solido', cor: '#3db54a' }, link: { aba: idD, ref: 'B2' } }] };
  c.abas[idD].nome = 'Dados 2026';
  A.objs.push(novaForma('ellipse', { l: 40, c: 5 }, 'novaElipse', { texto: 'Nova' }));
  A.objs.push({ id: 'b1', tipo: 'botao', l: 42, c: 5, dx: 0, dy: 0, w: 180, h: 40, nome: 'Ir aos dados', alvo: idD, ref: 'A1', cor: '#2f6f4f' });
  const { bytes, avisos } = await gravarXlsx(c);
  assert.ok(avisos.some((x) => /botão/.test(x) && /forma com link/.test(x)), avisos.join(' | '));
  const z = lerZip(bytes);
  const d = await z.texto('xl/drawings/drawing1.xml'), rels = await z.texto('xl/drawings/_rels/drawing1.xml.rels');
  assert.ok(d.includes('<a:t>Ver ações</a:t>') && d.includes('val="3DB54A"'));
  assert.ok(rels.includes("Target=\"#'Dados 2026'!B2\""), 'link com o nome novo da aba');
  assert.ok(d.includes('prst="ellipse"') && d.includes('<a:t>Nova</a:t>'));
  assert.ok(d.includes('<a:t>Ir aos dados</a:t>'));
  const c2 = await ler(bytes);
  const A2 = abaPorNome(c2, 'Painel');
  const seta2 = A2.objs.find((o) => o.tipo === 'forma' && o.partes[0].g === 'rightArrow');
  assert.equal(seta2.partes[0].texto.pars[0].runs[0].t, 'Ver ações');
  assert.equal(c2.abas[seta2.partes[0].link.aba].nome, 'Dados 2026'); assert.equal(seta2.partes[0].link.ref, 'B2');
  const btn = A2.objs.find((o) => o.tipo === 'forma' && o.partes[0].texto && o.partes[0].texto.pars[0].runs[0].t === 'Ir aos dados');
  assert.ok(btn && btn.partes[0].link && c2.abas[btn.partes[0].link.aba].nome === 'Dados 2026', 'botão voltou como forma com link');
});

test('v0.6.5: segmentação de dados (slicer) dentro do grupo fica fora e o resto do grupo vem', async () => {
  const el = '<xdr:grpSp><xdr:nvGrpSpPr><xdr:cNvPr id="5" name="G"/><xdr:cNvGrpSpPr/></xdr:nvGrpSpPr><xdr:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="952500" cy="476250"/><a:chOff x="0" y="0"/><a:chExt cx="952500" cy="476250"/></a:xfrm></xdr:grpSpPr>' +
    '<mc:AlternateContent xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"><mc:Choice Requires="a14"><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="6" name="Mês"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="476250" cy="476250"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/drawing/2010/slicer"><sle:slicer xmlns:sle="http://schemas.microsoft.com/office/drawing/2010/slicer" name="Mês"/></a:graphicData></a:graphic></xdr:graphicFrame></mc:Choice>' +
    '<mc:Fallback><xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="0" name=""/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="476250" cy="476250"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr><xdr:txBody><a:bodyPr/><a:p><a:r><a:t>Esta forma representa uma segmentação</a:t></a:r></a:p></xdr:txBody></xdr:sp></mc:Fallback></mc:AlternateContent>' +
    '<xdr:sp macro="" textlink=""><xdr:nvSpPr><xdr:cNvPr id="7" name="Moldura"/><xdr:cNvSpPr/></xdr:nvSpPr><xdr:spPr><a:xfrm><a:off x="476250" y="0"/><a:ext cx="476250" cy="476250"/></a:xfrm><a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></xdr:spPr></xdr:sp></xdr:grpSp>';
  const aba = { cel: {} };
  const r = await lerFormaDaAncora(el, { zip: null, relsD: new Map(), tema: null, fontes: {}, aba, geo: { l: 0, c: 0, dx: 0, dy: 0, w: 100, h: 50 }, ns: {} });
  assert.ok(r.fora.some((x) => /Segmenta/.test(x.item)));
  assert.equal(r.obj.partes.length, 1);
  assert.equal(r.obj.partes[0].g, 'ellipse');
  assert.equal(Math.round(r.obj.partes[0].x), 50); assert.equal(Math.round(r.obj.partes[0].w), 50);
  assert.ok(!/segmentação/.test(r.obj.xo), 'o XML guardado não leva a segmentação');
});

test('v0.6.5: todos os desenhos conhecidos dão um caminho válido (sem NaN), em vários tamanhos, e o SVG não tem NaN', () => {
  for (const g of CONHECIDOS) for (const [w, h] of [[120, 60], [40, 90], [0, 30], [200, 0]]) {
    const r = caminhoDoDesenho(g, w, h, {});
    assert.ok(typeof r.d === 'string' && r.d.length > 3, g);
    assert.ok(!/NaN|undefined|Infinity/.test(r.d + (r.extra || []).join('') + (r.ponta || '')), `${g} ${w}x${h}: ${r.d}`);
  }
  const o = novaForma('wedgeRoundRectCallout', { l: 0, c: 0 }, 'x', { texto: 'Olá' });
  const s = svgDaForma(o, 160, 64);
  assert.ok(!/NaN|undefined/.test(s));
  assert.ok(s.includes('Olá') && s.includes('data-parte="0"'));
  const linha = novaForma('arrowLine', { l: 0, c: 0 }, 'y');
  assert.ok(svgDaForma(linha, 160, 0).includes('marker-end'));
});

test('v0.6.5: texto da forma quebra na largura, respeita o Enter e corta palavra maior que a linha', () => {
  const t = { pars: [{ al: 'ctr', runs: [{ t: 'Não conformidades do mês de janeiro', tam: 11 }] }, { al: 'l', runs: [{ t: 'linha 2\nlinha 3', tam: 11 }] }], wrap: true };
  const a = arrumarTexto(t, 90);
  assert.ok(a.linhas.length >= 4, 'quebrou: ' + a.linhas.length);
  assert.ok(a.linhas.every((l) => l.larg <= 92 || l.pedacos.length === 1));
  const b = arrumarTexto({ pars: [{ al: 'l', runs: [{ t: 'Supercalifragilisticexpialidoso', tam: 11 }] }], wrap: true }, 40);
  assert.ok(b.linhas.length >= 2);
  const sem = arrumarTexto({ pars: [{ al: 'l', runs: [{ t: 'uma linha só bem comprida', tam: 11 }] }], wrap: false }, 20);
  assert.equal(sem.linhas.length, 1);
  const lig = arrumarTexto({ pars: [{ al: 'ctr', runs: [{ t: 'velho', tam: 16, neg: true }] }], wrap: true }, 200, '34');
  assert.equal(lig.linhas[0].pedacos[0].t, '34'); assert.ok(lig.linhas[0].pedacos[0].run.neg);
});

test('v0.6.5: clique na parte certa do grupo (de cima para baixo) e só nas que têm link', () => {
  const o = { w: 300, h: 40, w0: 300, h0: 40, partes: [{ g: 'rect', x: 0, y: 0, w: 300, h: 40 }, { g: 'rect', x: 0, y: 0, w: 100, h: 40, link: { aba: 'a2' } }, { g: 'rect', x: 200, y: 0, w: 100, h: 40, link: { aba: 'a3' } }] };
  assert.equal(parteNoPonto(o, 50, 20), 1);
  assert.equal(parteNoPonto(o, 150, 20), 0);
  assert.equal(parteNoPonto(o, 150, 20, true), -1);
  assert.equal(parteNoPonto({ ...o, w: 600, h: 80 }, 500, 40, true), 2, 'acompanha o tamanho novo');
});

test('v0.6.5: forma salva no aparelho passa pela limpeza (cores, links, desenho desconhecido, data: só de imagem) e a assinatura muda quando mexe', () => {
  const lista = normalizarObjetos([{ id: 'f1', tipo: 'forma', l: 2, c: 1, dx: 0, dy: 0, w: 100, h: 50, partes: [
    { g: 'inventado', x: 0, y: 0, w: 100, h: 50, preench: { t: 'solido', cor: 'red' }, link: { url: 'javascript:alert(1)' } },
    { g: 'img', x: 0, y: 0, w: 10, h: 10, src: 'data:text/html;base64,AAA' },
    { g: 'ellipse', x: 0, y: 0, w: 10, h: 10, link: { aba: 'a2', ref: '$B$3' }, texto: { pars: [{ al: 'ctr', runs: [{ t: 'oi', cor: '#ABCDEF', tam: 900 }] }], anc: 'meio' } },
  ] }]);
  assert.equal(lista.length, 1);
  const p = lista[0].partes;
  assert.equal(p.length, 2, 'imagem com data: errado sai');
  assert.equal(p[0].g, 'rect'); assert.equal(p[0].preench.cor, '#888888'); assert.equal(p[0].link, undefined);
  assert.deepEqual(p[1].link, { aba: 'a2', ref: 'B3' });
  assert.equal(p[1].texto.pars[0].runs[0].cor, '#abcdef'); assert.equal(p[1].texto.pars[0].runs[0].tam, 400); assert.equal(p[1].texto.anc, 't');
  const f = limparForma({ partes: [{ g: 'rect', x: 0, y: 0, w: 10, h: 10 }], w: 10, h: 10 }, { id: 'z', l: 0, c: 0, dx: 0, dy: 0 });
  const s1 = assinaturaForma(f);
  assert.notEqual(assinaturaForma({ ...f, partes: [{ ...f.partes[0], preench: { t: 'solido', cor: '#000000' } }] }), s1);
});

test('v0.6.5: links do desenho e texto ligado', () => {
  assert.deepEqual(linkDoAlvo("#'Ações Corretivas'!$A$1"), { abaNome: 'Ações Corretivas', ref: 'A1' });
  assert.deepEqual(linkDoAlvo('#Solo!B7'), { abaNome: 'Solo', ref: 'B7' });
  assert.deepEqual(linkDoAlvo('https://exemplo.com.br'), { url: 'https://exemplo.com.br' });
  assert.equal(linkDoAlvo('#NomeDefinido'), null);
  assert.deepEqual(lerTextLink('$C$5'), { ref: 'C5' });
  assert.deepEqual(lerTextLink("'Painel 2'!$B$2"), { abaNome: 'Painel 2', ref: 'B2' });
  assert.deepEqual(lerTextLink('=Dados!D4'), { abaNome: 'Dados', ref: 'D4' });
  assert.equal(lerTextLink(''), null);
  const aba = { larg: { 0: 100 }, alt: {} };
  assert.deepEqual(ancoraMais(aba, 0, 0, 10, 0, 120, 25), { l: 1, c: 1, dx: 30, dy: 3 });
});

test('v0.6.5: planilha nova (sem tema do Excel) também leva um tema ao salvar', async () => {
  const c = planilhaVazia();
  const id = c.ordem[0];
  c.abas[id].objs = [novaForma('roundRect', { l: 1, c: 1 }, 'f1', { texto: 'Olá' })];
  const { bytes } = await gravarXlsx(c);
  const z = lerZip(bytes);
  const tema = await z.texto('xl/theme/theme1.xml');
  assert.ok(tema.includes('<a:fmtScheme'), 'tema completo');
  const d = await z.texto('xl/drawings/drawing1.xml');
  assert.ok(d.includes('prst="roundRect"') && d.includes('<a:t>Olá</a:t>'));
  const c2 = await ler(bytes);
  assert.equal(c2.abas[c2.ordem[0]].objs[0].partes[0].texto.pars[0].runs[0].t, 'Olá');
});
