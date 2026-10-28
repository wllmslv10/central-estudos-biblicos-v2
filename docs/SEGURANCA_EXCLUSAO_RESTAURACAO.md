# Exclusão e restauração administrativas — proposta para o PR #6

## Escopo e situação

Correção preparada para revisão, **sem implantação**. Base do PR antes desta correção: `264fa7a1b86205a05f6767b4c2b5415fb4b76a8e`. A branch permanece `work/ceb-biblioteca-etapa1-20261027`.

Nenhuma consulta ou alteração no Neon, documento real, credencial, Hyperdrive, segredo, configuração de upload ou Worker implantado. O empacotamento foi realizado somente com `wrangler deploy --dry-run`; o fluxo real de deploy é manual e não foi acionado. Não há migração nem operação de dados a executar para esta correção.

## Análise antes da mudança

O papel efetivo vem de `currentUser`, por sessão autenticada. Sessões inválidas e troca obrigatória de senha já são tratadas antes de acessar documentos.

| Operação | Comportamento anterior | Proposta |
| --- | --- | --- |
| Listar/ler estudos e consultar Lixeira | Filtros existentes por usuário, papel e escopo | Igual |
| Baixar arquivo original | Proprietário; administrador se material geral; arquivo na Lixeira indisponível | Igual |
| Criar estudo próprio e editar próprio por PUT | Aluno proprietário permitido; aluno não publica como geral | Igual, fora da restrição mínima solicitada |
| Marcar Material aplicado por PATCH | Proprietário ou administrador autorizado | Igual |
| Criar pasta; importar arquivo | Pasta própria; arquivo próprio e privado para aluno; upload depende da configuração | Igual; importações continuam bloqueadas pela configuração existente |
| Excluir estudo/arquivo | Proprietário, inclusive aluno; ou administrador com acesso ao geral | Somente administrador com acesso ao documento |
| Restaurar estudo/arquivo | Proprietário, inclusive aluno; ou administrador com acesso ao geral | Somente administrador com acesso ao documento |

Administrador autorizado significa: sessão administrativa válida **e** permissão sobre o documento. Administrador continua podendo atuar em documento próprio ou geral permitido, mas não em particular de terceiro. Não se amplia acesso administrativo a pastas privadas.

## Alteração mínima

- `api-worker/worker.js`: antes de consultar o registro para DELETE ou POST de restauração de estudo, responder 403 se `app_role` autenticado não for `admin`. As checagens de propriedade/privacidade subsequentes permanecem.
- `api-worker/materials.js`: aplicar a mesma restrição nas duas operações de arquivos, antes de abrir transação, acessar o registro ou tocar o armazenamento.
- Nenhuma mudança de SQL, tabelas, schema, token, senha, sessão, leitura, download, criação, PUT ou PATCH.
- O papel não é obtido de corpo ou cabeçalhos enviados pelo cliente. Uma futura autorização de leitura compartilhada não substitui esta checagem administrativa. O compartilhamento em si ainda não foi implementado nem declarado validado por esta mudança.
- A exclusão continua lógica (`deleted_at`). A restauração continua removendo essa marca. Conteúdo, propriedade, escopo, referências de arquivo e permissões não são apagados. Nenhum DELETE físico ou remoção de objeto foi acrescentado.

## Testes executados

`npm test` em `api-worker`: **125 testes aprovados, zero falhas**, incluindo **60 novos casos** em `test/document-admin-actions.test.js` e toda a suíte anterior de autenticação, contingência, armazenamento e permissões.

São chamadas diretas a `worker.fetch(new Request(...))`, executando o roteamento e as verificações reais do Worker. PostgreSQL, sessões retornadas pelo banco e armazenamento usam doubles técnicos em memória. **Não são chamadas ao Worker publicado** e não há banco ou bucket real envolvido.

Cobertura nova:

- Aluno proprietário ou terceiro, material próprio/geral/particular: DELETE e restauração retornam 403; nenhum UPDATE, INSERT, DELETE SQL, transação ou acesso ao armazenamento de arquivos ocorre após a negação.
- Administrador proprietário: excluir/restaurar permitidos; administrador de material geral permitido; particular de terceiro negado (403 em estudos, 404 em arquivos, preservando os códigos existentes).
- Sessão inválida: 401; troca obrigatória de senha: 403; nenhuma mutação.
- Corpo/cabeçalhos forjados com `role: admin`, `app_role: admin` ou outro proprietário não promovem aluno.
- Listagem ativa e da Lixeira e Material aplicado continuam com os mesmos filtros e permissões para administrador e aluno.
- Download permitido retorna exatamente os bytes do original técnico; particular de terceiro continua inacessível.
- PUT de estudo próprio por aluno permanece permitido: a proposta não bloqueia outras operações desnecessariamente.
- As mutações administrativas autorizadas alteram somente marca de Lixeira e data de atualização; não removem objetos ou registros nem alteram conteúdo, escopo ou proprietário.

Empacotamento local do Worker com `--dry-run`: concluído sem publicar. As variáveis mantêm `CEB_UPLOADS_ENABLED=false`, provedor Neon e os vínculos existentes. Não foi feita validação de credenciais ou conexão real, pois não fazem parte desta correção de autorização.

## Plano de publicação e reversão — não executar nesta etapa

1. Antes de qualquer publicação autorizada, registrar a versão/UUID **realmente ativa naquele momento**, o percentual de tráfego e as configurações de contingência. Não presumir que um UUID de uma conversa anterior continua ativo. A sessão do Cloudflare não foi acessada nesta etapa.
2. Conferir a branch/vínculo de implantação realmente utilizado pelo Worker; integrar o PR não comprova publicação do backend. Conferir que o pacote a publicar contém estas duas checagens e preserva os vínculos/segredos existentes. Não executar migrações, restaurações de banco ou alterações de credenciais. Manter uploads bloqueados.
3. Após autorização expressa, validar a versão candidata em ambiente isolado já autorizado, se disponível, com contas/documentos exclusivamente técnicos, antes de direcionar produção. Não usar documentos existentes para testar exclusão/restauração.
4. Se houver falha após uma implantação futura, preferir a contingência compatível `CEB_WRITE_MODE=readonly`, já suportada e testada na suíte: mantém leitura e autenticação e bloqueia mutações de documentos. A alteração de configuração também exige autorização de execução; não foi realizada agora.
5. Restaurar a versão de código previamente registrada somente por operação autorizada, preservando os guardas administrativos ou mantendo o modo somente leitura até a correção. **Não voltar cegamente à base antiga em modo normal**, pois isso reabre a exclusão/restauração por aluno proprietário.
6. Não reverter `deleted_at` em lote, não restaurar snapshot do banco e não apagar arquivos. Os novos documentos criados após uma implantação devem permanecer no mesmo banco/armazenamento. Não existe migração inversa a aplicar.
7. Se necessário abandonar apenas esta proposta antes de integrar, reverter o commit de código na branch de trabalho; produção já permanece intacta. Manter o registro da pendência de segurança em aberto.

A correção está preparada no PR #6. Não integrar ou publicar o Worker nem a interface oficial sem autorização expressa do responsável.
