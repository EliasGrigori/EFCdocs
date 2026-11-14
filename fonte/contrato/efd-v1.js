/* CONTRATO EFD v1 · conferente comum da família EFClaudian (EFCwork, Vértice Docs, Sabiá).
   Um arquivo só, sem dependências. Serve no navegador (window.EFD) e no Node (require). Não grava nem lê nada: só diz se um
   registro segue o contrato. As duas pontas rodam o MESMO arquivo contra os MESMOS exemplos (exemplos-efd-v1.json).
   Mudou o contrato? Sobe o número (v2) nos dois repositórios no mesmo dia, com a ordem do Elias. */
(function (raiz) {
  const V = 1, PARTE_MAX = 900000, PARTES_MAX = 5, CAMPOS_MAX = 32, ORIG_PARTES_MAX = 2; /* 12/11: só o essencial na nuvem grátis (cópia até ~3,3 MB; original até ~1,3 MB); de 1 a 32 campos por documento */
  const TIPOS = ['planilha', 'docx', 'postits', 'externo', 'link'] /* link (12/11, sugestão 8): só o endereço, sem arquivo */, STATUS = ['rascunho', 'vigente', 'obsoleto', 'lixeira'], ORIGENS = ['docs', 'efcwork', 'sabia'];
  const PAPEIS = ['A4', 'A5', 'etiqueta'], ORIENT = ['retrato', 'paisagem'], T_CAMPO = ['texto', 'data', 'hora', 'numero', 'lista'];
  const PONTOS = ['coletas.envio', 'coletas.amostra', 'agua.coleta', 'agua.acao', 'documentos.doc', 'qualidade.treino', 'livre'];
  /* dicionário de campos v1: o que o EFCwork sabe preencher. Listas terminam em [] e têm colunas. */
  const CAMPOS = {
    'empresa.nome': 'texto', 'unidade.nome': 'texto', 'unidade.endereco': 'texto', 'unidade.cidade': 'texto',
    'lab.nome': 'texto', 'lab.endereco': 'texto', 'lab.cidade': 'texto', 'lab.cep': 'texto', 'lab.contato': 'texto', 'lab.telefone': 'texto',
    'envio.data': 'data', 'envio.caixa': 'numero', 'envio.caixas': 'numero', 'envio.amostras': 'numero', 'envio.transporte': 'texto',
    'coleta.data': 'data', 'coleta.hora': 'hora', 'coleta.os': 'texto', 'coleta.solicitacao': 'texto', 'coleta.coletor': 'texto', 'coleta.analise': 'texto',
    'coleta.ponto': 'texto', 'coleta.talhao': 'texto', 'coleta.produto': 'texto', 'coleta.qtd': 'numero', 'coleta.identificacao': 'texto',
    'usuario.nome': 'texto', 'hoje.data': 'data', 'hoje.hora': 'hora', 'doc.codigo': 'texto', 'doc.rev': 'numero',
    'amostras[]': 'lista', 'participantes[]': 'lista'
  };
  const COLUNAS = { 'amostras[]': ['n', 'identificacao', 'data', 'hora', 'analise', 'ponto', 'talhao', 'produto', 'qtd'], 'participantes[]': ['n', 'nome', 'setor'] };
  const str = (x, min, max) => typeof x === 'string' && x.length >= (min || 0) && x.length <= (max == null ? 1e9 : max);
  const int = (x, min, max) => Number.isInteger(x) && x >= (min == null ? -1e15 : min) && x <= (max == null ? 1e15 : max);
  const iso = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(x);
  const dia = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
  const idDoc = x => typeof x === 'string' && /^d[0-9a-z]{6,24}$/.test(x);
  /* nome de célula do Excel para uma chave do dicionário e a volta: coleta.os <-> efc_coleta_os ; amostras[].data <-> efc_amostras_data */
  const nomeExcel = ch => 'efc_' + String(ch).replace('[]', '').replace(/\./g, '_');
  function chaveDe(nome) {
    const m = /^efc_([a-z]+)_([a-z]+)$/.exec(String(nome || '').toLowerCase()); if (!m) return '';
    if (CAMPOS[m[1] + '.' + m[2]]) return m[1] + '.' + m[2];
    return COLUNAS[m[1] + '[]'] && COLUNAS[m[1] + '[]'].indexOf(m[2]) >= 0 ? m[1] + '[].' + m[2] : '';
  }
  const campoOk = ch => !!CAMPOS[ch] || (/^([a-z]+)\[\]\.([a-z]+)$/.test(ch) && (COLUNAS[RegExp.$1 + '[]'] || []).indexOf(RegExp.$2) >= 0);

  function ficha(o) {
    const e = []; if (!o || typeof o !== 'object') return ['ficha vazia'];
    if (o.v !== V) e.push('v deve ser ' + V);
    if (!idDoc(o.id)) e.push('id fora do padrão (d + letras e números minúsculos)');
    if (TIPOS.indexOf(o.tipo) < 0) e.push('tipo desconhecido');
    if (!str(o.nome, 1, 120) || /[\\/:*?"<>|]/.test(o.nome)) e.push('nome vazio, longo ou com \\ / : * ? " < > |');
    if (!str(o.codigo || '', 0, 20)) e.push('codigo longo');
    if (STATUS.indexOf(o.status) < 0) e.push('status desconhecido');
    if (!int(o.rev, 0)) e.push('rev deve ser inteiro');
    if (ORIGENS.indexOf(o.origem) < 0) e.push('origem desconhecida');
    ['criado', 'alterado'].forEach(k => { if (!str(o[k + 'PorId'], 1, 128)) e.push(k + 'PorId faltando'); if (!str(o[k + 'Por'], 1, 80)) e.push(k + 'Por (nome) faltando'); if (!iso(o[k + 'Em'])) e.push(k + 'Em deve ser data e hora ISO em UTC'); });
    if (!str(o.pastaNome || '', 0, 40)) e.push('pastaNome longo');
    if (o.pub != null) e.push.apply(e, pub(o.pub).map(x => 'pub: ' + x));
    if (o.orig != null) { const g = o.orig; if (['xlsx', 'docx', 'pdf', 'imagem'].indexOf(g.formato) < 0 || !int(g.bytes, 1) || !int(g.partes, 1, ORIG_PARTES_MAX) || !/^[0-9a-f]{64}$/.test(g.sha256 || '') || !str(g.nomeArquivo, 1, 140)) e.push('orig (arquivo de reserva) incompleto ou grande demais'); }
    if (o.tipo === 'link') { if (!/^https:\/\/[^\s]{4,}$/.test(o.link || '') || String(o.link).length > 600) e.push('link deve ser um endereço https'); if (o.pub || o.orig) e.push('link não leva arquivo'); }
    else if (o.status === 'vigente' && !o.pub) e.push('vigente sem cópia publicada');
    if (o.tipo === 'externo' && o.pub && o.pub.preenche !== 'nao') e.push('documento externo não preenche sozinho');
    return e;
  }
  function pub(p) {
    const e = []; if (!p || typeof p !== 'object') return ['vazio'];
    if (!int(p.rev, 1)) e.push('rev deve ser 1 ou mais');
    if (!iso(p.em) || !str(p.porId, 1, 128) || !str(p.por, 1, 80)) e.push('quem e quando publicou faltando');
    if (p.formato !== 'pdf') e.push('formato deve ser pdf');
    if (!int(p.bytes, 100, PARTES_MAX * PARTE_MAX * 3 / 4)) e.push('bytes fora do limite');
    if (!int(p.partes, 1, PARTES_MAX)) e.push('partes de 1 a ' + PARTES_MAX);
    if (!/^[0-9a-f]{64}$/.test(p.sha256 || '')) e.push('sha256 deve ter 64 letras e números minúsculos');
    if (!int(p.paginas, 1, 200)) e.push('paginas faltando');
    if (PAPEIS.indexOf(p.papel) < 0) e.push('papel desconhecido');
    if (p.papel === 'etiqueta' && !(Array.isArray(p.mm) && p.mm.length === 2 && p.mm.every(x => x > 10 && x < 500))) e.push('etiqueta precisa de mm: [largura, altura]');
    if (ORIENT.indexOf(p.orient) < 0) e.push('orient desconhecida');
    if (['nao', 'docs'].indexOf(p.preenche) < 0) e.push('preenche deve ser nao ou docs');
    if (!Array.isArray(p.campos)) e.push('campos deve ser lista');
    else p.campos.forEach(c => { if (!c || !campoOk(c.chave)) e.push('campo fora do dicionário: ' + (c && c.chave)); else if (!str(c.rotulo, 1, 60) || T_CAMPO.indexOf(c.tipo) < 0) e.push('campo sem rótulo ou tipo: ' + c.chave); });
    if (p.preenche === 'docs' && Array.isArray(p.campos) && !p.campos.length) e.push('preenche pelo Docs mas não tem campos');
    if (Array.isArray(p.campos) && p.campos.length > CAMPOS_MAX) e.push('no máximo ' + CAMPOS_MAX + ' campos');
    return e;
  }
  function copia(c) {
    const e = []; if (!c || typeof c !== 'object') return ['parte vazia'];
    if (!int(c.rev, 1)) e.push('rev'); if (!int(c.de, 1, PARTES_MAX)) e.push('de'); if (!int(c.n, 0, (c.de || 1) - 1)) e.push('n fora de 0..de-1');
    if (!str(c.b64, 1, PARTE_MAX) || !/^[A-Za-z0-9+/]+=*$/.test(c.b64)) e.push('b64 vazio, grande demais ou com caracteres estranhos');
    return e;
  }
  /* junta as partes na ordem; devolve o base64 inteiro ou lança erro dizendo o que faltou */
  function juntar(p, partes) {
    const l = (partes || []).filter(x => x.rev === p.rev).sort((a, b) => a.n - b.n);
    if (l.length !== p.partes || l.some((x, k) => x.n !== k || x.de !== p.partes)) throw new Error('faltam partes da revisão ' + p.rev);
    return l.map(x => x.b64).join('');
  }
  function impresso(o) {
    const e = []; if (!o || typeof o !== 'object') return ['vazio'];
    if (o.v !== V) e.push('v'); if (PONTOS.indexOf(o.ponto) < 0) e.push('ponto desconhecido'); if (!str(o.nome, 1, 80)) e.push('nome'); if (!idDoc(o.docId)) e.push('docId');
    if (!str(o.lab || '', 0, 60)) e.push('lab'); if (!(o.copias === 'uma' || o.copias === 'porCaixa' || int(o.copias, 1, 20))) e.push('copias'); if (typeof o.ativo !== 'boolean') e.push('ativo');
    return e;
  }
  function pedido(o) {
    const e = []; if (!o || typeof o !== 'object') return ['vazio'];
    if (o.v !== V) e.push('v'); if (!str(o.pid, 6, 40) || !/^[0-9a-z]+$/.test(o.pid)) e.push('pid'); if (!idDoc(o.docId)) e.push('docId'); if (!iso(o.criadoEm)) e.push('criadoEm');
    if (['efcwork', 'sabia'].indexOf(o.de) < 0) e.push('de'); if (!int(o.copias, 1, 20)) e.push('copias');
    const dados = (d, onde) => { if (!d || typeof d !== 'object' || Array.isArray(d)) { e.push(onde); return; } Object.keys(d).forEach(k => { const v = d[k];
      if (!CAMPOS[k]) e.push('dado fora do dicionário: ' + k);
      else if (CAMPOS[k] === 'lista') { if (!Array.isArray(v) || v.some(r => !r || Object.keys(r).some(c => COLUNAS[k].indexOf(c) < 0))) e.push('lista com coluna desconhecida: ' + k); }
      else if (CAMPOS[k] === 'numero') { if (typeof v !== 'number') e.push('número esperado: ' + k); }
      else if (CAMPOS[k] === 'data') { if (!dia(v)) e.push('data AAAA-MM-DD esperada: ' + k); }
      else if (CAMPOS[k] === 'hora') { if (!/^\d{2}:\d{2}$/.test(v)) e.push('hora HH:MM esperada: ' + k); }
      else if (!str(v, 0, 300)) e.push('texto esperado: ' + k); }); };
    dados(o.dados, 'dados');
    /* folhas: uma impressão só com várias folhas do mesmo documento (ex.: uma etiqueta por caixa); cada folha troca só os campos que mudam */
    if (o.folhas != null) { if (!Array.isArray(o.folhas) || !o.folhas.length || o.folhas.length > 50) e.push('folhas de 1 a 50'); else o.folhas.forEach((f, k) => dados(f, 'folha ' + (k + 1))); }
    return e;
  }
  function treino(o) {
    const e = []; if (!o || typeof o !== 'object') return ['vazio'];
    if (o.v !== V) e.push('v'); if (!str(o.titulo, 1, 160)) e.push('titulo'); if (!dia(o.data)) e.push('data AAAA-MM-DD');
    if (o.teste === true) e.push('treinamento de teste ou ensaio não entra no histórico');
    if (['programado', 'realizado', 'cancelado'].indexOf(o.situacao) < 0) e.push('situacao'); if (['efcwork', 'sabia'].indexOf(o.origem) < 0) e.push('origem');
    if (!str(o.instrutorNome || '', 0, 80)) e.push('instrutorNome'); if (o.horas != null && !(typeof o.horas === 'number' && o.horas >= 0 && o.horas <= 200)) e.push('horas');
    if (o.situacao === 'cancelado' && !str(o.canceladoMotivo, 3, 300)) e.push('cancelado pede motivo');
    if (o.quiz != null) { const q = o.quiz; if (q.app !== 'sabia' && q.app !== 'efcquiz') e.push('quiz.app'); if (!str(q.sessaoId, 1, 60)) e.push('quiz.sessaoId'); if (q.cod && !/^SAB-[0-9A-F]{4}(-[0-9A-F]{4}){4}$/.test(q.cod)) e.push('quiz.cod'); if (q.pct != null && !(q.pct >= 0 && q.pct <= 100)) e.push('quiz.pct'); }
    if (o.origem === 'sabia' && !o.quiz) e.push('registro vindo do Sabiá precisa de quiz.sessaoId');
    if (!Array.isArray(o.participantes) || o.participantes.length > 400) e.push('participantes');
    else o.participantes.forEach((p, k) => { if (!p || !str(p.nome, 1, 80)) e.push('participante ' + (k + 1) + ' sem nome'); else { if (typeof p.presente !== 'boolean') e.push('presente: ' + p.nome); if (!(p.eficaz === true || p.eficaz === false || p.eficaz == null)) e.push('eficaz: ' + p.nome); if (p.pct != null && !(p.pct >= 0 && p.pct <= 100)) e.push('pct: ' + p.nome); } });
    if (o.situacao === 'realizado' && Array.isArray(o.participantes) && !o.participantes.length) e.push('realizado sem participantes');
    (o.docs || []).forEach(d => { if (!d || !idDoc(d.docId) || ['pop', 'material', 'lista', 'registro'].indexOf(d.papel) < 0) e.push('docs: vínculo inválido'); });
    if (!str(o.criadoPorId, 1, 128) || !iso(o.criadoEm)) e.push('criadoPorId e criadoEm');
    return e;
  }
  const EFD = { V, PARTE_MAX, PARTES_MAX, CAMPOS_MAX, ORIG_PARTES_MAX, TIPOS, STATUS, ORIGENS, PONTOS, CAMPOS, COLUNAS, nomeExcel, chaveDe, campoOk, ficha, pub, copia, juntar, impresso, pedido, treino };
  if (typeof module !== 'undefined' && module.exports) module.exports = EFD; else raiz.EFD = EFD;
})(typeof window !== 'undefined' ? window : this);
