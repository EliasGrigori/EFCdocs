/* v0.6.11.1 · achados das planilhas atuais do Elias (cópias anonimizadas, fora do repositório), reproduzidos com amostra inventada. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerXlsx } from '../../src/planilha/xlsx/ler.js';
import { gravarXlsx } from '../../src/planilha/xlsx/gravar.js';
import { lerZip } from '../../src/planilha/xlsx/zip.js';

test('v0.6.11.1 (D-28): tabela com um título que é só um espaço continua tabela ao salvar', async () => {
  const a = (await lerXlsx(new Uint8Array(readFileSync(new URL('../amostras/amostra-v0611.xlsx', import.meta.url))))).conteudo;
  const g = await gravarXlsx(a); const z = lerZip(g.bytes); let tab = '';
  for (const n of z.nomes) if (/tables\//.test(n)) { const t = new TextDecoder().decode(await z.bytes(n)); if (/name="TabEspaco"/.test(t)) tab = t; }
  assert.match(tab, /<tableColumn id="1" name=" "\/>/, 'a tabela TabEspaco foi gravada com o título " "');
  assert.ok(!(g.avisos || []).some((x) => /TabEspaco/.test(x)), 'sem aviso de faixa normal');
  const b = (await lerXlsx(g.bytes)).conteudo; assert.ok(Object.values(b.tabelas).some((t) => t.nome === 'TabEspaco'));
});
