# Classificação e destino de novos documentos importados

Implementação preparada na branch existente. Não publicada: produção mantém
`CEB_UPLOADS_ENABLED=false` e ainda não possui a coluna aditiva `category`.
Nenhum SQL de migração foi executado no Neon de produção.

## Comportamento

- Categorias reutilizadas: estudo, esboço, lição EBD, manual do professor,
  apresentação EBD e material de apoio. Não cria estudos estruturados.
- `kind` mantém os valores legados. A nova coluna opcional `category` guarda
  apenas a classificação dos novos documentos EBD. Registros legados usam
  sua classificação anterior, sem atualização ou movimentação.
- Pastas selecionadas por ID e filtradas por visibilidade. O servidor exige
  escopo igual ao documento, propriedade ou autorização administrativa para
  pasta geral. Colisões de nome com outra visibilidade não alteram a pasta.
- Caminho completo exibido antes da confirmação. Texto extraído e original
  permanecem separados e íntegros; os extratores existentes não foram alterados.
- Documentos EBD aparecem como documentos importados nas seções EBD existentes,
  com leitura, download do original e filtro de pasta; sem conversão automática.
- Antes da migração, leitura e importação legadas continuam compatíveis;
  novas categorias ficam indisponíveis e são rejeitadas antes de gravar objetos.

## Pendências de publicação

1. Verificar backup/recuperação atual e aprovar a execução controlada da migração
   versionada `api-worker/migrations/006_material_classification.sql`.
2. Validar o armazenamento real e resolver a desativação existente de uploads,
   sem substituir chaves, ampliar planos ou alterar conexão automaticamente.
3. Publicar Worker, verificar capacidades e somente então publicar a interface.
   Manter a versão anterior disponível para recuperação. A migração é aditiva;
   não removê-la em um rollback de código.

## Verificações direcionadas

`node scripts/test-import-classification.mjs` usa o Worker real, PGlite local,
contas técnicas e um bucket em memória. Verifica compatibilidade antes da migração,
preservação de registros e idempotência da migração, categorias/visibilidade,
validação de pastas, bytes originais de PDF/DOCX/PPTX/HTML e fluxo no navegador.
Os formatos binários técnicos testam o transporte e preservação, não repetem os
extratores externos já existentes; a prévia e extração HTML são exercitadas na UI.

`node --test api-worker/test/materials.test.js` cobre os caminhos afetados de
permissão, armazenamento, compensação de falha e preservação dos originais.
