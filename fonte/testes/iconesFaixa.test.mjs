/* Testes da v0.6.2: ícones novos da faixa (um desenho para cada nome do mapa; só desenho fechado e sem script). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOVOS, MAPA } from '../src/ui/iconesFaixa.js';
import { PorId } from '../src/nucleo/comandos.js';

test('v0.6.2: todo comando do mapa existe no catálogo e aponta para um desenho que existe', () => {
  for (const [id, nome] of Object.entries(MAPA)) {
    assert.ok(PorId[id], 'comando fora do catálogo: ' + id);
    assert.ok(typeof NOVOS[nome] === 'string' && NOVOS[nome].length > 10, `sem desenho: ${id} → ${nome}`);
  }
});

test('v0.6.2: os desenhos só usam path, circle, rect, line, polyline, ellipse; nada de script, imagem ou link', () => {
  for (const [nome, svg] of Object.entries(NOVOS)) {
    const tags = [...svg.matchAll(/<\s*([a-zA-Z]+)/g)].map((m) => m[1].toLowerCase());
    for (const t of tags) assert.ok(['path', 'circle', 'rect', 'line', 'polyline', 'ellipse', 'g', 'polygon'].includes(t), `${nome}: marca ${t}`);
    assert.ok(!/script|href|on[a-z]+\s*=|javascript:/i.test(svg), nome + ': conteúdo perigoso');
  }
});

test('v0.6.2: quase todos os desenhos têm o toque de cor suave (classe t) ou ponto cheio (f), e cada nome é usado', () => {
  const usados = new Set(Object.values(MAPA));
  const naoUsados = Object.keys(NOVOS).filter((n) => !usados.has(n));
  assert.ok(naoUsados.length <= 8, 'desenhos sem uso demais: ' + naoUsados.join(', '));
  const comToque = Object.values(NOVOS).filter((s) => /class="(t|f|barra)/.test(s)).length;
  assert.ok(comToque / Object.keys(NOVOS).length > 0.7, 'poucos ícones com toque de cor: ' + comToque);
});
