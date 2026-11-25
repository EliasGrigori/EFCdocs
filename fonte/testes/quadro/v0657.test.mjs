/* v0.6.57: letras do quadro (5 letras OFL, carregadas só quando usadas) e texturas de papel do post-it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Q from '../../src/quadro/modelo.js';
import { FONTES_Q, fonteValida, mudancasFonteQ, valorFonteQ, familiaCss, escalaDo, familiasUsadas } from '../../src/quadro/fontesQ.js';
import { TEXTURAS, mudancasTextura, valorTextura, estiloTextura, tamanhoDobra, lugarMancha, urlTextura } from '../../src/quadro/texturas.js';
import { trataEstiloQuadro, valorEstiloQuadro } from '../../src/quadro/estiloQuadro.js';
import { linhasQueCabem } from '../../src/quadro/postit.js';
import { aplicarDiff, criarDiff } from '../../src/nucleo/diff.js';
import { existsSync, readFileSync } from 'node:fs';

const aplicar = (c, mud) => aplicarDiff({ conteudo: c }, criarDiff({ conteudo: c }, Q.noArquivo(mud))).conteudo;
function quadro(tipos) {
  let c = Q.conteudoQuadroVazio();
  const ids = [];
  for (const t of tipos) { const r = Q.novoItem(c, t); c = aplicar(c, r.mudancas); ids.push(r.item.id); }
  return { c, ids };
}

test('letras: só as cinco da lista, com o arquivo e a licença na pasta', () => {
  assert.deepEqual(FONTES_Q.map((f) => f.id), ['', 'Caveat', 'Patrick Hand', 'Nunito', 'Merriweather', 'JetBrains Mono']);
  for (const f of FONTES_Q.filter((x) => x.arq)) {
    for (const p of f.pesos) assert.ok(existsSync(`src/fontes/extra/${f.arq}-latin-${p}-normal.woff2`), f.arq + ' ' + p);
    assert.match(readFileSync(`src/fontes/extra/OFL-${f.arq}.txt`, 'utf8'), /Open Font License/);
  }
  assert.equal(fonteValida('Comic Sans'), undefined);
  assert.equal(fonteValida('Caveat"; background:url(x)'), undefined);
  assert.equal(fonteValida('Caveat'), 'Caveat');
});

test('letras: trocar, desfazer para a padrão e o que a caixa mostra', () => {
  let { c, ids } = quadro(['postit', 'processo', 'imagem', 'raia']);
  c = aplicar(c, mudancasFonteQ(c, ids, 'Caveat'));
  assert.equal(c.itens[ids[0]].fonte.fam, 'Caveat');
  assert.equal(c.itens[ids[1]].fonte.fam, 'Caveat');
  assert.equal(c.itens[ids[2]].fonte, undefined, 'imagem não tem letra');
  assert.equal(c.itens[ids[3]].fonte, undefined, 'raia tem o próprio título');
  assert.equal(valorFonteQ(c, ids), 'Caveat');
  assert.deepEqual(familiasUsadas(c), ['Caveat']);
  assert.match(familiaCss(c.itens[ids[0]], 'X'), /^"Caveat", X$/);
  c = aplicar(c, mudancasFonteQ(c, [ids[1]], ''));
  assert.equal(c.itens[ids[1]].fonte.fam, undefined);
  assert.equal(valorFonteQ(c, [ids[0], ids[1]]), null, 'misturadas');
  assert.equal(valorFonteQ(c, [ids[1]]), '');
});

test('letras: a Caveat é maior, então cabem menos linhas no post-it', () => {
  const it = { tipo: 'postit', w: 170, h: 130, texto: 'x' };
  assert.equal(escalaDo({ ...it, fonte: { fam: 'Caveat' } }), 1.3);
  assert.ok(linhasQueCabem({ ...it, fonte: { fam: 'Caveat' } }) < linhasQueCabem(it));
});

test('arquivo: letra ou textura desconhecida é descartada ao abrir', () => {
  const { c, ids } = quadro(['postit', 'processo']);
  const bruto = structuredClone(c);
  bruto.itens[ids[0]] = { ...bruto.itens[ids[0]], fonte: { n: true, fam: 'url(javascript:x)' }, tex: 'sangue' };
  bruto.itens[ids[1]] = { ...bruto.itens[ids[1]], tex: 'cafe' };
  const n = Q.normalizarQuadro(bruto);
  assert.equal(n.itens[ids[0]].fonte.fam, undefined);
  assert.equal(n.itens[ids[0]].fonte.n, true, 'o negrito continua');
  assert.equal(n.itens[ids[0]].tex, undefined);
  assert.equal(n.itens[ids[1]].tex, undefined, 'textura só no post-it');
});

test('texturas: só em post-it, valor da lista e medidas', () => {
  let { c, ids } = quadro(['postit', 'postit', 'processo']);
  assert.deepEqual(TEXTURAS.map((t) => t.id), ['', 'dobrado', 'amassado', 'cafe']);
  c = aplicar(c, mudancasTextura(c, ids, 'cafe'));
  assert.equal(c.itens[ids[0]].tex, 'cafe');
  assert.equal(c.itens[ids[2]].tex, undefined);
  assert.equal(valorTextura(c, ids), 'cafe');
  c = aplicar(c, mudancasTextura(c, [ids[1]], ''));
  assert.equal(c.itens[ids[1]].tex, undefined);
  assert.equal(valorTextura(c, [ids[0], ids[1]]), null);
  const it = c.itens[ids[0]];
  assert.ok(tamanhoDobra(it) >= 12 && tamanhoDobra(it) <= 28);
  const m = lugarMancha(it); assert.ok(m.x + m.s > it.w && m.y < 0, 'passa da borda de cima à direita');
  assert.match(estiloTextura(it, '#fff').backgroundImage, /assets\/texturas\/cafe\.png/);
  for (const t of ['amassado', 'cafe']) assert.ok(existsSync('src/quadro/texturas/' + t + '.png') && urlTextura(t));
  assert.equal(urlTextura('dobrado'), '');
});

test('comandos: Letra e Textura passam pelo estiloQuadro e avisam sem nada escolhido', () => {
  const { c, ids } = quadro(['postit']);
  let mud = null, aviso = '';
  const cx = { c, selecionados: [], aplicarQ: (m) => { mud = m; }, avisar: (t) => { aviso = t; } };
  assert.equal(trataEstiloQuadro('formatar.fonteQ|Nunito', cx), true);
  assert.match(aviso, /Escolha/);
  assert.equal(trataEstiloQuadro('formatar.textura|dobrado', { ...cx, selecionados: ids }), true);
  assert.equal(mud['itens.' + ids[0]].tex, 'dobrado');
  assert.equal(trataEstiloQuadro('editar.copiar', cx), undefined);
  assert.equal(valorEstiloQuadro('valor.fonteQ', c, ids), '');
  assert.equal(valorEstiloQuadro('valor.outro', c, ids), undefined);
});
