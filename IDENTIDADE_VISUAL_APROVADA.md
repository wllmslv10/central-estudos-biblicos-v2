# Identidade visual aprovada — CEB V2

Esta é uma regra de manutenção do projeto aprovada em 26/10/2026.

- **Login e primeira troca de senha:** imagem da Bíblia aberta com CEB (`public/ceb-book.png`).
- **Cabeçalho e rodapé:** mesma Bíblia aberta com CEB, sem retornar à cruz dourada.
- **Aplicativo instalado no Windows, Android ou tablet:** manter os ícones atuais da pomba branca da IBNE (`public/icon-192.png` e `public/icon-512.png`).
- **Logomarca e imagens originais da Igreja Batista Nova Esperança:** preservar os arquivos na pasta `identidade-visual/`.

A verificação `scripts/check-visual-identity.mjs` compara os caminhos utilizados nos componentes, o manifesto do PWA, a página de instalação e os hashes dos arquivos visuais originais. O workflow de publicação executa essa validação **antes do build**; se falhar, a publicação automática não prossegue.

**Mudanças futuras:** somente alterar esses símbolos com autorização expressa do responsável pelo projeto e atualizar conscientemente a verificação e as referências aprovadas. Não remova a validação para contornar um erro. A proteção evita publicações acidentais e não substitui as permissões de escrita/branch protection do GitHub.
