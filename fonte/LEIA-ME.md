# EFCdocs · código-fonte

Este é o código que gera o app publicado na raiz do repositório.

- `src/nucleo/`: modelo de dados, diffs (desfazer/refazer), compactação, banco no aparelho, catálogo de comandos, perfis e preferências.
- `src/quadro/`: Post-its e Quadro (regras, geometria, tela, Kanban, desenho para PNG/PDF, PDF paisagem).
- `src/ui/`: menu, topo com faixa, janelas, páginas e ícones.
- `testes/`: testes das regras (`npm test`).
- `scripts/`: montagem (`npm run build` gera `dist/`), testes no navegador e página de aprovação.

Regras do projeto: nada de senha, chave ou dado real aqui; só chaves `efcdocs:` no aparelho e caches `efcdocs-`; o EFClaudian não é mexido por este repositório.
