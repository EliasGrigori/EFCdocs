#!/usr/bin/env python3
"""Método Sabiá 2.0 — Página de aprovação (um arquivo .html só, imagens embutidas).
Uso: python3 montar-aprovacao.py <itens.json> <saida.html>
O itens.json tem: titulo, subtitulo, data, chave (nome para guardar as respostas no aparelho), resumo (html curto),
numeros [[valor, rótulo], ...] e itens [{cod, titulo, grupo, texto (html), pergunta, fotos [[legenda, caminho-da-imagem], ...], grade: "par"|"tres"|"um"}].
Cada item ganha Aprovado / Reprovado, comentário, e no fim o botão "Copiar respostas"."""
import base64, html, json, mimetypes, os, sys
def uri(cam, base):
    c = cam if os.path.isabs(cam) else os.path.join(base, cam)
    return f'data:{mimetypes.guess_type(c)[0] or "image/png"};base64,' + base64.b64encode(open(c, 'rb').read()).decode()
def main():
    if len(sys.argv) < 3: print(__doc__); return 2
    arq, saida = sys.argv[1], sys.argv[2]; d = json.load(open(arq, encoding='utf-8')); base = os.path.dirname(os.path.abspath(arq)); E = html.escape
    partes, grupo = [], None
    for it in d['itens']:
        if it.get('grupo') and it['grupo'] != grupo: grupo = it['grupo']; partes.append(f'<h2 class="grupo">{E(grupo)}</h2>')
        figs = ''.join(f'<figure><figcaption>{E(leg)}</figcaption><img src="{uri(cam, base)}" alt="{E(leg)}"></figure>' for leg, cam in it.get('fotos', []))
        partes.append(f'''<article class="item" data-cod="{E(it["cod"])}" data-titulo="{E(it["titulo"])}">
  <div class="cab"><b class="cod">{E(it["cod"])}</b><h3>{E(it["titulo"])}</h3></div>
  <div class="txt">{it.get("texto", "")}<p class="q">{E(it.get("pergunta", "Aprova?"))}</p></div>
  {f'<div class="fotos {it.get("grade", "par")}">{figs}</div>' if figs else ''}
  <div class="resp">
    <label class="op sim"><input type="radio" name="{E(it["cod"])}" value="APROVADO"><span>Aprovado</span></label>
    <label class="op nao"><input type="radio" name="{E(it["cod"])}" value="REPROVADO"><span>Reprovado</span></label>
    <textarea placeholder="Comentário (opcional)" aria-label="Comentário {E(it["cod"])}"></textarea>
  </div>
</article>''')
    nums = ''.join(f'<div class="cx"><b>{E(str(v))}</b><span>{E(r)}</span></div>' for v, r in d.get('numeros', []))
    resumo = (f'<div class="nums">{nums}</div>' if nums else '') + d.get('resumo', '')
    modelo = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'aprovacao.modelo.html'), encoding='utf-8').read()
    out = (modelo.replace('{{ITENS}}', '\n'.join(partes)).replace('{{N}}', str(len(d['itens']))).replace('{{CHAVE}}', d.get('chave', 'aprovacao'))
           .replace('{{TITULO}}', E(d['titulo'])).replace('{{SUBTITULO}}', E(d.get('subtitulo', ''))).replace('{{DATA}}', E(d.get('data', ''))).replace('{{RESUMO}}', resumo))
    assert '{{' not in out
    open(saida, 'w', encoding='utf-8').write(out); print('página de aprovação:', saida, round(len(out) / 1024), 'KB,', len(d['itens']), 'itens')
    return 0
if __name__ == '__main__': sys.exit(main())
