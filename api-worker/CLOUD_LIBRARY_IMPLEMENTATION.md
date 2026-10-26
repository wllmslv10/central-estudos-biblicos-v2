# Biblioteca na nuvem — preparação de 26/10/2026

## Estado e implantação

A reconciliação das permissões da cópia fornecida do Worker foi registrada em `main` no commit `c180ad1`; o GitHub Pages publicou essa etapa com sucesso na execução `40419318845`.

A implementação de upload nesta branch é uma preparação validada localmente, não uma funcionalidade já ativada em produção. Antes de integrar/publicar:

1. Configurar o acesso do Worker ao bucket privado. O endpoint não secreto está em `wrangler.toml`; `CEB_STORAGE_ACCESS_KEY_ID` e `CEB_STORAGE_SECRET_ACCESS_KEY` devem existir como segredos do Worker. Não colocar valores no GitHub ou frontend. Nenhuma credencial foi criada ou alterada nesta etapa; o responsável pediu consulta antes disso.
2. Aplicar a migração aditiva `003_cloud_materials.sql` na produção, após os testes já efetuados na branch Neon `dev-ceb-cloud-materials-20261026` (`br-falling-thunder-b4saoifs`). A produção ainda não recebeu essa migração.
3. Publicar o Worker na branch acompanhada pelo Cloudflare, preservando seu binding Hyperdrive e segredos existentes. Publicar o frontend apenas depois de validar o backend.
4. Validar upload/download de PDF, DOCX, PPTX e HTML, comparação dos bytes originais, falhas e reabertura em dois dispositivos/usuários. Os testes locais usam armazenamento simulado; upload real ainda não validado.

## Comportamento preparado

- Arquivos de até 20 MB: upload autenticado via API para `ceb-materiais`, registro de metadados, SHA-256 e texto no PostgreSQL. Sem originais em IndexedDB.
- Arquivos e pastas particulares por padrão; biblioteca geral somente para administradores autorizados. Alunos acessam apenas os próprios materiais.
- Download autorizado pelo backend e como anexo; HTML não é servido como página executável da API.
- Confirmação de sucesso depois do objeto e registro. Falha de leitura após insert não pode apagar um original já registrado.
- Pastas na nuvem; criação e seleção na importação.
- Excluir move para Lixeira e preserva o original. Restauração disponível. Expurgo definitivo deliberadamente não disponibilizado nesta etapa; exige operação destrutiva autorizada.
- Aplicação e data opcionais para importados, estudos e EBD; atualização de estudos usa merge JSONB no backend, sem substituir o restante do conteúdo.
- Interface consulta capacidade do backend. Importação permanece indisponível enquanto o armazenamento não estiver configurado.
- Nenhum original antigo do navegador foi apagado, migrado ou reinserido automaticamente.

## Validações

- Identidade visual aprovada: verificação automatizada passou.
- Compilação TypeScript/Vite: passou.
- Testes da API: 27 verificações de autenticação/permissões/upload simulado/falhas/Lixeira/download.
- Migração real na branch isolada, com papel `ceb_api_user`: passou.
- Teste SQL transacional de pasta, metadados, aplicação, exclusão lógica e restauração: passou e foi revertido com ROLLBACK.
- Lição `35ebc974-6f34-4222-827d-05d747b40de1` preservada; checksum de conteúdo `5a39fbb0b1723009162bfb1d1ed208bd`.

## Limites atuais

- Não há OCR; slides e PDFs baseados somente em imagem não fornecem texto.
- Testes manuais da UI, formatos reais e dois usuários ainda pendentes.
- Migração/eliminação de restos locais, expurgo de originais, PDF gerado e compartilhamento com alunos não foram concluídos nesta etapa.
- A branch de teste Neon foi mantida para continuidade; não foi apagada automaticamente.
