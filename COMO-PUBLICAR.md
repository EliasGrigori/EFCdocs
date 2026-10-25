# Como publicar o EFCdocs (pelo computador ou pelo celular)

Os arquivos desta pasta vão **todos juntos para a raiz** do repositório `EFCdocs`:
`index.html`, `sw.js`, `manifest.webmanifest`, `assets/` (pasta), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` e `apple-touch-icon.png`.

A partir da v0.3.0 o repositório também guarda o **código-fonte** na pasta `fonte/` (o que gera estes arquivos). Assim o código nunca se perde entre conversas. A pasta `fonte/` não muda nada no app publicado.

## Versão nova
Envie os arquivos novos por cima (o `sw.js` e a pasta `assets` sempre vão juntos). Apague da pasta `assets` os arquivos da versão anterior (o nome muda a cada versão). Quem já instalou vê "Versão nova pronta. Toque para atualizar".

## Primeira vez
1. No GitHub: **+** › **New repository** › nome `EFCdocs` › **Public** › **Create repository**.
2. **Add file** › **Upload files**: envie tudo, inclusive a pasta `assets`. **Commit changes**.
3. **Settings** › **Pages**: Branch `main` e `/ (root)` › **Save**. Espere 1 a 2 minutos.
4. O endereço fica `https://eliasgrigori.github.io/EFCdocs/`.
5. Abra no Chrome do celular e use o menu (três pontos) › **Instalar app**.

## Montar a partir do código (quem tiver Node)
Na pasta `fonte/`: `npm install`, depois `npm test` (testes) e `npm run build` (gera `dist/`).

O EFCdocs não guarda senha nem dado real no código. Fica separado do EFClaudian e do EFCquiz: só usa chaves `efcdocs:` no aparelho e caches `efcdocs-`.
