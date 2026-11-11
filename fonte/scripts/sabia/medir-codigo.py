#!/usr/bin/env python3
"""Método Sabiá 2.0 — Medidas do código (lente 6.5): tamanho por pasta, arquivos grandes demais, testes por módulo.
Uso: python3 medir-codigo.py <pasta-do-código> [--limite 800] [--testes pasta-dos-testes] [--json saida.json] [--base base.json]
Sem --base: sai com código 1 se houver arquivo acima do limite (dívida a dividir aos poucos).
Com --base ("não pode piorar"): sai com 1 só se apareceu arquivo NOVO acima do limite ou se um dos grandes CRESCEU."""
import json, os, sys
EXT = {'.js', '.mjs', '.jsx', '.ts', '.tsx', '.py', '.css', '.html', '.vue', '.svelte', '.cs', '.java', '.go', '.rb', '.php'}
IGN = {'node_modules', '.git', 'dist', 'build', '__pycache__'}
def linhas(c):
    try: return sum(1 for _ in open(c, encoding='utf-8', errors='ignore'))
    except Exception: return 0
def main():
    if len(sys.argv) < 2: print(__doc__); return 2
    pasta = sys.argv[1]; lim = 800; testes = None; saida = None; base = None; a = sys.argv[2:]
    for i, x in enumerate(a):
        if x == '--limite': lim = int(a[i + 1])
        if x == '--testes': testes = a[i + 1]
        if x == '--json': saida = a[i + 1]
        if x == '--base': base = a[i + 1]
    por_pasta, grandes, total = {}, [], 0
    for raiz, ps, arqs in os.walk(pasta):
        ps[:] = [p for p in ps if p not in IGN]
        for f in arqs:
            if os.path.splitext(f)[1].lower() not in EXT: continue
            c = os.path.join(raiz, f); n = linhas(c); total += n; rel = os.path.relpath(raiz, pasta)
            d = por_pasta.setdefault(rel, [0, 0]); d[0] += n; d[1] += 1
            if n > lim: grandes.append((n, os.path.relpath(c, pasta)))
    print(f'Total: {total} linhas\n\n| Pasta | Linhas | Arquivos |\n|---|---|---|')
    for k, (n, q) in sorted(por_pasta.items(), key=lambda x: -x[1][0]): print(f'| {k} | {n} | {q} |')
    print(f'\nArquivos acima de {lim} linhas: {len(grandes)}')
    for n, c in sorted(grandes, reverse=True): print(f'  {n:6d}  {c}')
    if testes and os.path.isdir(testes):
        q = sum(len([f for f in fs if 'test' in f.lower() or f.startswith('t_')]) for _, _, fs in os.walk(testes))
        print(f'\nArquivos de teste em {testes}: {q}')
    if saida: json.dump({'limite': lim, 'total': total, 'grandes': {c: n for n, c in grandes}}, open(saida, 'w'), ensure_ascii=False, indent=1)
    if base:
        b = json.load(open(base)).get('grandes', {}); piorou = []
        for n, c in grandes:
            if c not in b: piorou.append(f'novo acima de {lim}: {c} ({n})')
            elif n > b[c]: piorou.append(f'cresceu: {c} {b[c]} → {n}')
        melhorou = [f'{c} {b[c]} → {dict((x, y) for y, x in grandes).get(c, "abaixo do limite")}' for c in b if c not in dict((x, y) for y, x in grandes) or dict((x, y) for y, x in grandes)[c] < b[c]]
        print('\nContra a linha de base: ' + ('PIOROU: ' + '; '.join(piorou) if piorou else 'nenhum piorou') + ('. Diminuíram: ' + '; '.join(melhorou) if melhorou else ''))
        return 1 if piorou else 0
    return 1 if grandes else 0
if __name__ == '__main__': sys.exit(main())
