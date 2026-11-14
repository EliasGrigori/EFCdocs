/* Teste de conformidade do CONTRATO EFD v1. As duas pontas (EFCwork e Vértice Docs) rodam este mesmo arquivo.
   Uso: node tools/contrato/confere.js   ·   sai com erro se algum exemplo válido for recusado, algum inválido passar, ou o PDF não fechar com o sha256. */
const EFD = require('./efd-v1.js'), ex = require('./exemplos-efd-v1.json'), crypto = require('crypto');
let ok = 0, falhas = 0; const conf = (c, m) => { if (c) ok++; else { falhas++; console.log('  FALHA  ' + m); } };
const F = { fichas: EFD.ficha, impressos: EFD.impresso, pedidos: EFD.pedido, treinos: EFD.treino };
conf(ex.v === EFD.V, 'exemplos e conferente na mesma versão');
Object.keys(F).forEach(k => {
  ex.validos[k].forEach((o, i) => { const e = F[k](o); conf(!e.length, k + ' válido ' + (i + 1) + ' recusado: ' + e.join('; ')); });
  ex.invalidos[k].forEach(([nome, o]) => conf(F[k](o).length > 0, k + ' inválido passou: ' + nome));
});
ex.invalidos.copias.forEach(([nome, o]) => conf(EFD.copia(o).length > 0, 'cópia inválida passou: ' + nome));
ex.validos.fichas.filter(f => f.pub && ex.validos.copias[f.id]).forEach(f => {
  const partes = ex.validos.copias[f.id] || []; partes.forEach(p => conf(!EFD.copia(p).length, 'parte recusada: ' + f.nome));
  const b = Buffer.from(EFD.juntar(f.pub, partes), 'base64');
  conf(b.length === f.pub.bytes, 'tamanho do PDF confere: ' + f.nome);
  conf(crypto.createHash('sha256').update(b).digest('hex') === f.pub.sha256, 'sha256 do PDF confere: ' + f.nome);
  conf(b.slice(0, 5).toString() === '%PDF-', 'começa como PDF: ' + f.nome);
  let lancou = false; try { EFD.juntar(f.pub, partes.slice(1)); } catch (e) { lancou = true; } conf(lancou, 'faltando parte, juntar avisa: ' + f.nome);
});
[['coleta.os', 'efc_coleta_os'], ['lab.endereco', 'efc_lab_endereco'], ['amostras[].data', 'efc_amostras_data']].forEach(([c, n]) => { conf(EFD.nomeExcel(c) === n, 'nome do Excel de ' + c); conf(EFD.chaveDe(n) === c, 'volta de ' + n); });
conf(EFD.chaveDe('efc_cliente_cpf') === '' && EFD.chaveDe('Total') === '', 'nome fora do dicionário não vira campo');
Object.keys(EFD.CAMPOS).forEach(c => { if (EFD.CAMPOS[c] !== 'lista') conf(EFD.chaveDe(EFD.nomeExcel(c)) === c, 'ida e volta do campo ' + c); });
console.log(ok + ' ok, ' + falhas + ' falhas'); process.exit(falhas ? 1 : 0);
