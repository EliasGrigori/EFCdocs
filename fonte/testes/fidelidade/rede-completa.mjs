/* v0.6.10 · Rede de fidelidade completa (Método Sabiá 2.0, lente 6.3): npm run test:fidelidade
   Para cada amostra de testes/amostras (e, se existir, cada .xlsx da pasta EFC_AMOSTRAS_FORA, como a planilha
   anonimizada do Elias, que NÃO fica no repositório):
   1) ida e volta no EFCdocs, célula a célula, e a 2ª volta tem de dar zero;
   2) openpyxl compara o original com o que o EFCdocs salvou (pula se não houver python3 + openpyxl);
   3) LibreOffice recalcula o que o EFCdocs salvou (pula se não houver; EFC_SEM_LIBREOFFICE=1 também pula).
   Só passa se toda diferença estiver em conhecidas.mjs; e falha se uma conhecida sumir (defeito corrigido: apagar a linha). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { conferirArquivo, classificar, conferentesDisponiveis, listarXlsx } from '../../scripts/fidelidade/conferir.mjs';
import { CONHECIDAS } from './conhecidas.mjs';

const pasta = fileURLToPath(new URL('../amostras/', import.meta.url));
const fora = process.env.EFC_AMOSTRAS_FORA;
const disp = conferentesDisponiveis();
const comLo = disp.libreoffice && !process.env.EFC_SEM_LIBREOFFICE;
const linha = (n) => `[${n.fonte}] ${n.grupo}: ${n.quantas} (ex.: ${n.exemplo || '-'})`;

test(`conferentes de fora nesta máquina: openpyxl ${disp.openpyxl ? 'sim' : 'NÃO (pulado)'} · LibreOffice ${comLo ? 'sim' : 'NÃO (pulado)'}`, () => {});

for (const arq of listarXlsx([pasta])) {
  const nome = arq.split('/').pop();
  test(`fidelidade ${nome}`, { timeout: 600000 }, async () => {
    const r = await conferirArquivo(arq, { libreoffice: comLo });
    const { novas, sabidas } = classificar(r);
    assert.equal(r.segundaVolta, 0, '2ª volta tem de dar zero');
    assert.deepEqual(novas.map(linha), [], 'diferença nova: é defeito novo (anotar na memória e em conhecidas.mjs) ou piora (consertar)');
    /* conhecida que não apareceu mais: o defeito foi corrigido; tirar a linha para o teste cobrar que não volte */
    const vistas = new Set(sabidas.map((s) => `${s.fonte}|${s.id}`));
    const sumiram = (CONHECIDAS[nome] || []).filter((k) => (k.fonte !== 'openpyxl' || disp.openpyxl) && (k.fonte !== 'libreoffice' || comLo) && !vistas.has(`${k.fonte}|${k.id}`));
    assert.deepEqual(sumiram.map((k) => `${k.id} [${k.fonte}]`), [], 'diferença conhecida não aparece mais: apagar de conhecidas.mjs');
  });
}

if (fora && existsSync(fora)) {
  for (const arq of listarXlsx([fora])) {
    test(`fidelidade (de fora) ${arq.split('/').pop()}`, { timeout: 900000 }, async () => {
      const r = await conferirArquivo(arq, { libreoffice: comLo });
      const { novas } = classificar(r, { fora: true });
      assert.equal(r.segundaVolta, 0, '2ª volta tem de dar zero');
      assert.deepEqual(novas.map(linha), [], 'diferença nova na planilha de fora');
    });
  }
} else test('planilhas de fora: EFC_AMOSTRAS_FORA não definida ou pasta não existe (pulado)', () => {});
