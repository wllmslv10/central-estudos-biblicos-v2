# Validação do armazenamento isolado — 26/10/2026

Projeto: `ceb-arquivos` (`solitary-mountain-32451807`). Branch: `production` (`br-holy-lake-b5wmosos`). Bucket: `ceb-materiais`, privado. Organização confirmada no plano Free antes e depois da criação.

## Teste real de transporte no Neon Storage

Feito por URLs temporárias emitidas pelo conector Neon para objetos de teste. Nenhuma chave permanente foi lida, gravada em arquivo ou registrada na conversa. URLs e assinaturas não são incluídas neste relatório.

| Amostra técnica | Bytes | Upload | Download | Bytes idênticos | Acesso sem assinatura |
| --- | ---: | ---: | ---: | --- | ---: |
| HTML | 100 | 200 | 200 | Sim | 403 |
| PDF | 51 | 200 | 200 | Sim | 403 |
| DOCX | 789 | 200 | 200 | Sim | 403 |
| PPTX | 769 | 200 | 200 | Sim | 403 |

Um primeiro teste de conexão PDF de 38 bytes também foi gravado/recuperado com igualdade dos bytes. Os objetos técnicos foram mantidos privados em `_validation/20261026/`. Não houve exclusão remota ou mudança de documentos de usuário.

As amostras comprovam transporte de bytes e bloqueio de acesso público. Não comprovam renderização dos formatos na interface, autenticação do Worker com a chave definitiva, sincronização real entre dispositivos ou autorização de usuários reais.

## Testes da aplicação

45 testes locais passaram: autenticação, permissões, metadados, Material aplicado, Lixeira/restauração, falhas, runtime R2 local preservado e novo adaptador Neon com assinatura S3 e bloqueio de endpoint de outro projeto. Foi testado também que a importação exige liberação explícita `CEB_UPLOADS_ENABLED = "true"`; o PR mantém `false`.

Build TypeScript/Vite e validação de identidade visual passaram. Wrangler dry-run confirmou o Hyperdrive original e o provedor Neon; nenhum binding R2 foi configurado.

## Preservação

Reconsulta somente leitura ao projeto `ceb-biblioteca`: a lição `35ebc974-6f34-4222-827d-05d747b40de1` continua com checksum `5a39fbb0b1723009162bfb1d1ed208bd`. Nenhuma alteração de dados ou migração de produção foi realizada nesta etapa. O bucket anterior permanece preservado.

## Bloqueio restante

O Neon criou automaticamente uma credencial de armazenamento somente para o projeto novo. Só foram consultados metadados. Instalar seus valores diretamente no Cloudflare como segredos, sem passá-los pela conversa. Depois validar o fluxo completo do Worker com dados de teste e usuários distintos, aplicar a migração aditiva em momento seguro e publicar em sequência. A importação não foi liberada.
