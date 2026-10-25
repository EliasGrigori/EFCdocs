# Como publicar o EFCdocs (pelo computador ou pelo celular)

Os arquivos desta pasta vão **todos juntos para a raiz** do repositório `EFCdocs`:
`index.html`, `sw.js`, `manifest.webmanifest`, `assets/` (pasta), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` e `apple-touch-icon.png`.

## Primeira vez
1. No GitHub: **+** › **New repository** › nome `EFCdocs` › **Public** › **Create repository**.
2. **Add file** › **Upload files**: envie tudo, inclusive a pasta `assets`. **Commit changes**.
3. **Settings** › **Pages**: Branch `main` e `/ (root)` › **Save**. Espere 1 a 2 minutos.
4. O endereço fica `https://eliasgrigori.github.io/EFCdocs/`. Esse domínio já é o do EFClaudian, então o login do Firebase já o aceita (confira em Authentication › Settings › Authorized domains).
5. Abra no Chrome do celular e use o menu (três pontos) › **Instalar app**.

## Versão nova
Envie os arquivos novos por cima (o `sw.js` e a pasta `assets` sempre vão juntos). Quem já instalou vê "Versão nova pronta. Toque para atualizar". O ícone novo pode demorar a trocar no celular; se não trocar, desinstale e instale de novo.

O EFCdocs não guarda senha nem dado real no código. Fica separado do EFClaudian e do EFCquiz: só usa chaves `efcdocs:` no aparelho e caches `efcdocs-`.
