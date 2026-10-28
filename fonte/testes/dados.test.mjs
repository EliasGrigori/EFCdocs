/* Testes da v0.6.3: Classificar, Remover duplicados, Filtro e Travar modelo (contas puras). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Motor } from '../src/planilha/motor.js';
import { normalizarPlanilha, planilhaVazia } from '../src/planilha/modelo.js';
import {
  compararOrdem, classificar, acharDuplicados, removerDuplicados, novoFiltro, valoresDaColuna, comCriterio,
  linhasEscondidasPeloFiltro, mudancasDoFiltro, contagemDoFiltro, bloqueioDaProtecao, liberarCelulas, contarLiberadas, celulaLivre, moverFiltro,
} from '../src/planilha/dados.js';
import { textoCelula } from '../src/planilha/grade.js';

function montar(linhas, extra = {}) {
  const c = planilhaVazia();
  const a = c.abas.a1;
  linhas.forEach((lin, l) => lin.forEach((v, cc) => {
    if (v == null) return;
    const k = String.fromCharCode(65 + cc) + (l + 1);
    a.cel[k] = typeof v === 'string' && v.startsWith('=') ? { f: v.slice(1) } : { v };
  }));
  Object.assign(a, extra);
  const n = normalizarPlanilha(c);
  const m = new Motor(n);
  return { c: n, m, valorDe: (l, cc) => m.valor('a1', l, cc), textoDe: (l, cc) => textoCelula(m, n, 'a1', l, cc).t };
}
const aplicar = (c, lote) => {
  const mud = lote.mudancas();
  const cel = { ...c.abas.a1.cel };
  for (const [k, v] of Object.entries(mud)) {
    if (k.endsWith('.cel')) Object.assign(cel, {}), Object.keys(cel).forEach((x) => delete cel[x]), Object.assign(cel, v);
    else { const kk = k.split('.cel.')[1]; if (v === undefined) delete cel[kk]; else cel[kk] = v; }
  }
  return cel;
};
const col = (cel, cc, de, ate) => { const o = []; for (let l = de; l <= ate; l++) { const x = cel[String.fromCharCode(65 + cc) + (l + 1)]; o.push(x ? (x.f != null ? '=' + x.f : x.v) : null); } return o; };

test('ordem: números < texto < lógicos, sem diferença de maiúsculas, acentos juntos', () => {
  const l = [true, 'b', 3, 'A', 1, 'á'];
  l.sort(compararOrdem);
  assert.deepEqual(l, [1, 3, 'A', 'á', 'b', true]);
});

test('classificar: crescente, decrescente, vazios sempre no fim, cabeçalho fica', () => {
  const { c, valorDe } = montar([['Nome', 'N'], ['Rui', 3], ['Ana', 10], ['Zé', null], ['Bia', 1]]);
  let r = classificar(c, 'a1', { l1: 0, c1: 0, l2: 4, c2: 1 }, [{ col: 1, desc: false }], { cabecalho: true, valorDe });
  assert.ok(r.lote);
  let cel = aplicar(c, r.lote);
  assert.deepEqual(col(cel, 0, 0, 4), ['Nome', 'Bia', 'Rui', 'Ana', 'Zé']);
  r = classificar(c, 'a1', { l1: 0, c1: 0, l2: 4, c2: 1 }, [{ col: 1, desc: true }], { cabecalho: true, valorDe });
  cel = aplicar(c, r.lote);
  assert.deepEqual(col(cel, 0, 0, 4), ['Nome', 'Ana', 'Rui', 'Bia', 'Zé']);
});

test('classificar: dois níveis e estável; fórmula da própria linha continua certa', () => {
  const { c, valorDe } = montar([['x', 2, '=B1*10'], ['y', 1, '=B2*10'], ['x', 1, '=B3*10']]);
  const r = classificar(c, 'a1', { l1: 0, c1: 0, l2: 2, c2: 2 }, [{ col: 0, desc: false }, { col: 1, desc: false }], { cabecalho: false, valorDe });
  const cel = aplicar(c, r.lote);
  assert.deepEqual(col(cel, 0, 0, 2), ['x', 'x', 'y']);
  assert.deepEqual(col(cel, 1, 0, 2), [1, 2, 1]);
  assert.deepEqual(col(cel, 2, 0, 2), ['=B1*10', '=B2*10', '=B3*10']);
});

test('classificar: recusa mescladas, uma linha e coluna fora', () => {
  const { c, valorDe } = montar([[1], [2]], { mesc: ['A1:B1'] });
  assert.match(classificar(c, 'a1', { l1: 0, c1: 0, l2: 1, c2: 1 }, [{ col: 0 }], { cabecalho: false, valorDe }).erro, /mescl/i);
  const s = montar([[1], [2]]);
  assert.ok(classificar(s.c, 'a1', { l1: 0, c1: 0, l2: 0, c2: 0 }, [{ col: 0 }], { cabecalho: false, valorDe: s.valorDe }).erro);
  assert.ok(classificar(s.c, 'a1', { l1: 0, c1: 0, l2: 1, c2: 0 }, [{ col: 3 }], { cabecalho: false, valorDe: s.valorDe }).erro);
});

test('classificar: linhas escondidas pelo filtro ficam no lugar', () => {
  const { c, valorDe } = montar([['n'], [3], [1], [2]], { ocF: { 2: 1 }, ocL: { 2: 1 } });
  const r = classificar(c, 'a1', { l1: 0, c1: 0, l2: 3, c2: 0 }, [{ col: 0 }], { cabecalho: true, valorDe });
  const cel = aplicar(c, r.lote);
  assert.deepEqual(col(cel, 0, 1, 3), [2, 1, 3]);
});

test('duplicados: acha pelas colunas marcadas, sem diferenciar maiúsculas; a primeira fica', () => {
  const { c, valorDe } = montar([['Nome', 'N'], ['Ana', 1], ['ana', 2], ['Bia', 1], ['Ana', 1]]);
  assert.deepEqual(acharDuplicados({ l1: 0, c1: 0, l2: 4, c2: 1 }, [0], { cabecalho: true, valorDe }), [2, 4]);
  assert.deepEqual(acharDuplicados({ l1: 0, c1: 0, l2: 4, c2: 1 }, [0, 1], { cabecalho: true, valorDe }), [4]);
  const r = removerDuplicados(c, 'a1', { l1: 0, c1: 0, l2: 4, c2: 1 }, [0], { cabecalho: true, valorDe });
  assert.equal(r.removidas, 2); assert.equal(r.restantes, 2);
  const cel = aplicar(c, r.lote);
  assert.deepEqual(col(cel, 0, 0, 4), ['Nome', 'Ana', 'Bia', null, null]);
  assert.deepEqual(col(cel, 1, 0, 4), ['N', 1, 1, null, null]);
});

test('duplicados: nenhum repetido não muda nada', () => {
  const { c, valorDe } = montar([['a'], ['b']]);
  const r = removerDuplicados(c, 'a1', { l1: 0, c1: 0, l2: 1, c2: 0 }, [0], { cabecalho: false, valorDe });
  assert.equal(r.removidas, 0); assert.ok(r.lote.vazio);
});

test('filtro: lista de valores, critério, linhas escondidas e contagem', () => {
  const { c, m, valorDe, textoDe } = montar([['Cor', 'Qtd'], ['azul', 1], ['verde', 2], ['azul', 3], ['rosa', 4]]);
  let fil = novoFiltro({ l1: 0, c1: 0, l2: 4, c2: 1 });
  assert.equal(fil.fx, 'A1:B5');
  let vs = valoresDaColuna(fil, 0, textoDe, valorDe);
  assert.deepEqual(vs.map((x) => [x.t, x.n, x.marcado]), [['azul', 2, true], ['rosa', 1, true], ['verde', 1, true]]);
  fil = comCriterio(fil, 0, ['azul'], vs.map((x) => x.t));
  assert.deepEqual([...linhasEscondidasPeloFiltro(fil, textoDe)], [2, 4]);
  assert.deepEqual(contagemDoFiltro(fil, textoDe), { total: 4, visiveis: 2 });
  /* a lista de outra coluna só conta quem passou */
  vs = valoresDaColuna(fil, 1, textoDe, valorDe);
  assert.deepEqual(vs.map((x) => [x.t, x.ok]), [['1', true], ['2', false], ['3', true], ['4', false]]);
  /* marcar tudo tira o critério */
  const todos = valoresDaColuna(fil, 0, textoDe, valorDe).map((x) => x.t);
  assert.deepEqual(comCriterio(fil, 0, todos, todos).cr, {});
  const mud = mudancasDoFiltro(c.abas.a1, 'a1', fil, textoDe);
  assert.deepEqual(mud['conteudo.abas.a1.ocL'], { 2: 1, 4: 1 });
  assert.deepEqual(mud['conteudo.abas.a1.ocF'], { 2: 1, 4: 1 });
});

test('filtro: refazer mantém as linhas escondidas à mão e solta as do filtro', () => {
  const { c, textoDe } = montar([['Cor'], ['a'], ['b'], ['c']], { ocL: { 1: 1, 3: 1 }, ocF: { 3: 1 } });
  const fil = { fx: 'A1:A4', cr: { 0: { v: ['a', 'b', 'c'] } } };
  const mud = mudancasDoFiltro(c.abas.a1, 'a1', fil, textoDe);
  assert.deepEqual(mud['conteudo.abas.a1.ocL'], { 1: 1 });
  assert.equal(mud['conteudo.abas.a1.ocF'], undefined);
  const lim = mudancasDoFiltro(c.abas.a1, 'a1', undefined, textoDe);
  assert.equal(lim['conteudo.abas.a1.fil'], undefined);
});

test('filtro: inserir linha acima empurra a área; apagar a coluna do critério tira o critério', () => {
  const fil = { fx: 'B2:D10', cr: { 2: { v: ['x'] } } };
  const sobe = moverFiltro(fil, 'l', (i) => (i >= 0 ? i + 3 : i));
  assert.equal(sobe.fx, 'B5:D13');
  const semC = moverFiltro(fil, 'c', (i) => (i === 2 ? null : i > 2 ? i - 1 : i));
  assert.deepEqual(semC.cr, {});
});

test('travar: só mexe em célula liberada; filtro continua livre; destravada não bloqueia', () => {
  const { c } = montar([[1, 2], [3, 4]]);
  const lote = liberarCelulas(c, 'a1', [{ l1: 0, c1: 0, l2: 0, c2: 0 }], true);
  const mud = lote.mudancas();
  const c2 = JSON.parse(JSON.stringify(c));
  c2.estilos = mud['conteudo.estilos'];
  c2.abas.a1.cel.A1 = mud['conteudo.abas.a1.cel.A1'];
  assert.ok(celulaLivre(c2, c2.abas.a1.cel.A1));
  assert.equal(contarLiberadas(c2, c2.abas.a1), 1);
  assert.equal(bloqueioDaProtecao(c2, { 'conteudo.abas.a1.cel.B1': { v: 9 } }), null, 'sem trava pode');
  c2.abas.a1.prot = 1;
  assert.equal(bloqueioDaProtecao(c2, { 'conteudo.abas.a1.cel.A1': { ...c2.abas.a1.cel.A1, v: 9 } }), null);
  assert.match(bloqueioDaProtecao(c2, { 'conteudo.abas.a1.cel.B1': { v: 9 } }), /travada/);
  assert.match(bloqueioDaProtecao(c2, { 'conteudo.abas.a1.larg': { 0: 100 } }), /travada/);
  assert.match(bloqueioDaProtecao(c2, { 'conteudo.abas.a1.ocL': { 1: 1 } }), /travada/);
  assert.equal(bloqueioDaProtecao(c2, { 'conteudo.abas.a1.ocL': { 1: 1 }, 'conteudo.abas.a1.ocF': { 1: 1 }, 'conteudo.abas.a1.fil': {} }), null);
  assert.equal(bloqueioDaProtecao(c2, { 'conteudo.abas.a1.prot': undefined }), null, 'destravar sempre pode');
  /* troca do objeto inteiro: só vale se mexeu em liberadas */
  assert.equal(bloqueioDaProtecao(c2, { 'conteudo.abas.a1.cel': { ...c2.abas.a1.cel, A1: { ...c2.abas.a1.cel.A1, v: 5 } } }), null);
  assert.match(bloqueioDaProtecao(c2, { 'conteudo.abas.a1.cel': { ...c2.abas.a1.cel, B2: { v: 5 } } }), /travada/);
});

/* ---------- Excel: ida e volta do filtro e da proteção ---------- */
import { gravarXlsx } from '../src/planilha/xlsx/gravar.js';
import { lerXlsx } from '../src/planilha/xlsx/ler.js';
import { lerZip } from '../src/planilha/xlsx/zip.js';

test('xlsx: filtro com critérios, linhas escondidas, aba protegida e célula liberada fazem a ida e volta', async () => {
  const { c, textoDe } = montar([['Cor', 'Qtd'], ['azul', 1], ['verde', 2], ['azul', 3]]);
  const fil = { fx: 'A1:B4', cr: { 0: { v: ['azul'] } } };
  const mudancas = mudancasDoFiltro(c.abas.a1, 'a1', fil, textoDe);
  c.abas.a1.fil = fil;
  c.abas.a1.ocL = mudancas['conteudo.abas.a1.ocL'];
  c.abas.a1.ocF = mudancas['conteudo.abas.a1.ocF'];
  c.abas.a1.prot = 1;
  const lote = liberarCelulas(c, 'a1', [{ l1: 1, c1: 1, l2: 1, c2: 1 }], true);
  const mud = lote.mudancas();
  c.estilos = mud['conteudo.estilos'];
  c.abas.a1.cel.B2 = mud['conteudo.abas.a1.cel.B2'];
  const { bytes } = await gravarXlsx(c, null, {});
  const zip = await lerZip(bytes);
  const folha = await zip.texto('xl/worksheets/sheet1.xml');
  assert.match(folha, /<sheetProtection sheet="1"/);
  assert.match(folha, /<autoFilter ref="A1:B4"><filterColumn colId="0"><filters><filter val="azul"\/><\/filters><\/filterColumn><\/autoFilter>/);
  assert.ok(folha.indexOf('</sheetData><sheetProtection') > 0 && folha.indexOf('<autoFilter') > folha.indexOf('<sheetProtection'), 'ordem do Excel');
  assert.match(await zip.texto('xl/styles.xml'), /<protection locked="0"\/>/);
  const volta = (await lerXlsx(bytes, {})).conteudo;
  const a = volta.abas[volta.ordem[0]];
  assert.deepEqual(a.fil, { fx: 'A1:B4', cr: { 0: { v: ['azul'] } } });
  assert.deepEqual(a.ocF, { 2: 1 });
  assert.ok(a.prot);
  assert.ok(celulaLivre(volta, a.cel.B2), 'B2 continua liberada');
  assert.ok(!celulaLivre(volta, a.cel.A2), 'A2 continua travada');
});

/* ---------- v0.6.4: senha e permissões da aba protegida ---------- */
import { hashLegado, conferirSenha, senhaDaAba } from '../src/planilha/dados.js';
import { createHash, randomBytes } from 'node:crypto';

test('v0.6.4: senha antiga do Excel (16 bits) e senha nova (SHA-512 com sal e giros) conferem; a errada não', async () => {
  assert.equal(hashLegado('password'), '83AF');
  assert.equal(await conferirSenha({ password: '83AF' }, 'password'), true);
  assert.equal(await conferirSenha({ password: '83AF' }, 'Password'), false);
  const sal = randomBytes(16);
  let h = createHash('sha512').update(Buffer.concat([sal, Buffer.from('segredo', 'utf16le')])).digest();
  for (let i = 0; i < 500; i++) { const b = Buffer.alloc(4); b.writeUInt32LE(i); h = createHash('sha512').update(Buffer.concat([h, b])).digest(); }
  const campos = { algorithmName: 'SHA-512', saltValue: sal.toString('base64'), hashValue: h.toString('base64'), spinCount: '500' };
  assert.equal(await conferirSenha(campos, 'segredo'), true);
  assert.equal(await conferirSenha(campos, 'outra'), false);
  assert.equal(await conferirSenha({ algorithmName: 'MD5', saltValue: 'AA==', hashValue: 'AA==' }, 'x'), null, 'jeito desconhecido: não finge que conferiu');
  assert.ok(senhaDaAba({ prot: { a: { password: '83AF' } } }));
  assert.ok(!senhaDaAba({ prot: 1 }));
  assert.ok(!senhaDaAba({ prot: { a: { formatCells: '0' } } }), 'só permissões, sem senha');
});

test('v0.6.4: as permissões finas do Excel e a senha voltam iguais ao salvar', async () => {
  const { c } = montar([['Cor', 'Qtd'], ['azul', 1]]);
  c.abas.a1.prot = { a: { password: '83AF', formatCells: '0', insertRows: '0', selectLockedCells: '1' } };
  const { bytes } = await gravarXlsx(c, null, {});
  const folha = await (await lerZip(bytes)).texto('xl/worksheets/sheet1.xml');
  assert.match(folha, /<sheetProtection sheet="1"[^>]*password="83AF"/);
  assert.match(folha, /formatCells="0"/);
  const volta = (await lerXlsx(bytes, {})).conteudo;
  assert.deepEqual(volta.abas[volta.ordem[0]].prot, { a: { objects: '1', scenarios: '1', password: '83AF', formatCells: '0', insertRows: '0', selectLockedCells: '1' } });
});
