#!/usr/bin/env python3
"""Vértice Docs · conferente de fora do PDF do Quadro (Método Sabiá 2.1, lente 7.3).

Lê com o pypdf (outro programa, não o app) o PDF que o Quadro exporta e confere:
número de folhas, tamanho A4 deitado, título e rodapé em cada folha, uma imagem por folha.

Uso: conferir-pdf.py arquivo.pdf <folhas> <título> <rodapé>
Uma linha por conferência, começando por "ok" ou "FALHA". Sai com 1 se houver falha.
"""
import sys

from pypdf import PdfReader

falhas = 0


def diz(ok, texto):
    global falhas
    if not ok:
        falhas += 1
    print(("ok    " if ok else "FALHA ") + texto)


def main():
    arq, folhas, titulo, rodape = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4]
    try:
        pdf = PdfReader(arq, strict=True)
    except Exception as erro:  # noqa: BLE001
        diz(False, f"o leitor de fora não abriu o PDF: {erro}")
        sys.exit(1)
    n = len(pdf.pages)
    diz(n == folhas, f"{n} folhas (pedido: {folhas})")
    deitado = all(abs(float(p.mediabox.width) - 841.89) < 1 and abs(float(p.mediabox.height) - 595.28) < 1 for p in pdf.pages)
    diz(deitado, "todas as folhas em A4 deitado (842 x 595 pontos)")
    textos = [p.extract_text() or "" for p in pdf.pages]
    diz(all(titulo in t for t in textos), "título em todas as folhas, com acento")
    diz(all(f"{rodape} · folha {i + 1} de {n}" in t for i, t in enumerate(textos)), "rodapé com 'folha X de N' em cada folha")
    diz(all(len(p.images) == 1 for p in pdf.pages), "uma imagem por folha")
    diz((pdf.metadata.title or "") == titulo, "título nas propriedades do arquivo")
    sys.exit(1 if falhas else 0)


main()
