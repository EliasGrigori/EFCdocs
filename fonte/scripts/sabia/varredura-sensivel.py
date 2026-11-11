#!/usr/bin/env python3
"""Método Sabiá 2.0 — Varredura de dado sensível (lente 6.4).
Procura, numa pasta de projeto, o que NÃO pode ir para o repositório: senhas e chaves, e-mails, CPF, CNPJ, telefones,
e as palavras que o dono listar (nome da empresa, de pessoas, de fazendas...). Lista também as imagens e os arquivos
de escritório, porque um print pode carregar dado real e programa nenhum lê isso com certeza: esses são para olhar.

Uso: python3 varredura-sensivel.py <pasta> [--palavras arquivo.txt] [--ignorar pasta1,pasta2]
O arquivo de palavras (uma por linha) fica FORA do projeto. Sai com código 1 se achar algo."""
import os, re, sys, zipfile

PADROES = [
    ('chave ou senha', re.compile(r'(ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AIza[0-9A-Za-z_\-]{30,}|sk-[A-Za-z0-9]{24,}|xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16})')),
    ('senha escrita', re.compile(r'(?i)\b(senha|password|passwd|secret|token)\b\s*[:=]\s*["\']([^"\'\s]{6,})["\']')),
    ('e-mail', re.compile(r'\b[A-Za-z0-9._%+-]+@(?!(?:exemplo|example|empresa|dominio|teste|test|email|seudominio|anthropic)\.)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')),
    ('CPF', re.compile(r'(?<![\d.])\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)')),
    ('CNPJ', re.compile(r'(?<![\d.])\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}(?!\d)')),
    ('telefone', re.compile(r'(?<![\d.])\(?\b\d{2}\)?[ ]?9[ ]?\d{4}[- ]\d{4}(?!\d)')),
]
TEXTO = {'.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.py', '.json', '.md', '.txt', '.csv', '.html', '.htm', '.css', '.xml', '.yml', '.yaml', '.env', '.sh', '.sql', '.svg', '.toml', '.ini', '.rules', ''}
IMAGEM = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.pdf'}
ESCRITORIO = {'.xlsx', '.xlsm', '.docx', '.pptx', '.ods', '.odt'}
IGNORAR = {'node_modules', '.git', 'dist', 'build', '__pycache__', '.venv', 'venv'}

def main():
    if len(sys.argv) < 2: print(__doc__); return 2
    pasta = sys.argv[1]; palavras = []; ignorar = set(IGNORAR)
    args = sys.argv[2:]
    for i, a in enumerate(args):
        if a == '--palavras': palavras = [l.strip() for l in open(args[i + 1], encoding='utf-8') if l.strip() and not l.startswith('#')]
        if a == '--ignorar': ignorar |= set(args[i + 1].split(','))
    padroes = list(PADROES)
    if palavras: padroes.append(('palavra do dono', re.compile('(?i)(' + '|'.join(re.escape(p) for p in sorted(palavras, key=len, reverse=True)) + ')')))
    achados, olhar, lidos = [], [], 0; vistos = set()
    def examinar(nome, texto):
        for rotulo, rx in padroes:
            for m in rx.finditer(texto):
                linha = texto.count('\n', 0, m.start()) + 1; trecho = m.group(0)
                if rotulo in ('chave ou senha', 'senha escrita'): trecho = trecho[:6] + '…'
                if (rotulo, nome, linha, trecho[:60]) not in vistos: vistos.add((rotulo, nome, linha, trecho[:60])); achados.append((rotulo, nome, linha, trecho[:60]))
    for raiz, pastas, arquivos in os.walk(pasta):
        pastas[:] = [p for p in pastas if p not in ignorar]
        for a in arquivos:
            cam = os.path.join(raiz, a); rel = os.path.relpath(cam, pasta); ext = os.path.splitext(a)[1].lower()
            if ext in IMAGEM: olhar.append(rel); continue
            if ext in ESCRITORIO:
                olhar.append(rel)
                try:
                    with zipfile.ZipFile(cam) as z:
                        for n in z.namelist():
                            if n.endswith(('.xml', '.rels')): examinar(rel + '!' + n, re.sub(r'<[^>]+>', ' ', z.read(n).decode('utf-8', 'ignore')))
                except Exception: pass
                continue
            if ext not in TEXTO and not a.startswith('.env'): continue
            try:
                if os.path.getsize(cam) > 8_000_000: continue
                examinar(rel, open(cam, encoding='utf-8', errors='ignore').read()); lidos += 1
            except Exception: pass
    print(f'Arquivos de texto lidos: {lidos}')
    if achados:
        print(f'\nACHADOS ({len(achados)}):')
        for rotulo, nome, linha, trecho in achados[:200]: print(f'  [{rotulo}] {nome}:{linha}  {trecho}')
        if len(achados) > 200: print(f'  … e mais {len(achados) - 200}')
    else: print('Nada achado nos textos.')
    if olhar:
        print(f'\nPARA OLHAR À MÃO ({len(olhar)} imagens, PDFs e arquivos de escritório: um print pode ter dado real):')
        for o in olhar[:80]: print('  ' + o)
        if len(olhar) > 80: print(f'  … e mais {len(olhar) - 80}')
    return 1 if achados else 0
if __name__ == '__main__': sys.exit(main())
