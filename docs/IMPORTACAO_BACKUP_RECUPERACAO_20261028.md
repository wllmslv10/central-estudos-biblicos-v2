# Preparação de segurança concluída — sem publicação

Base preservada: `06c095a666aa7fd2412480f46cd54f182dfd8528`.
Nenhum dump, conteúdo de usuário, hash de senha ou credencial deve integrar Git.
O arquivo privado do backup foi entregue separadamente, fora do repositório.

## Backup atualizado

- Origem: `ceb-biblioteca` / `neondb`, branch de produção existente.
- Ponto consistente: 28/10/2026 às 18:29:54 de Brasília (21:29:54 UTC).
- PostgreSQL 18, exportado por `pg_dump` nativo 18.6 em formato custom.
- Transação coordenadora REPEATABLE READ READ ONLY; `pg_export_snapshot` e
  `pg_dump --snapshot` usaram o mesmo ponto para exportação e fingerprints.
- Transporte PostgreSQL por túnel WebSocket TLS com destino Neon direto,
  passando apenas por loopback local. Nenhum serviço foi exposto externamente.
- 12 tabelas, 244 registros; inclui integralmente as tabelas da aplicação.
- Arquivo dump: 56.759 bytes.
- SHA-256 do dump: `159cea46b8107defdd73e2a53d334e8329d6ad3fd2cc4edff094c91b1096e6f8`.
- Pacote privado: 28.988 bytes; contém dump, manifesto, prova e instruções.
- SHA-256 do pacote: `65806760cc541d20ca7d3a256c95f5ee23f2962ff02bc630bf2af38659670708`.
- A cópia persistida foi recuperada e seu hash e integridade ZIP reconferidos.
- Credencial temporariamente utilizada para ler a origem não foi incluída no
  pacote. A configuração local contendo a conexão foi removida após o dump;
  nenhuma senha/credencial foi rotacionada ou publicada.
- Backup anterior `br-late-credit-b4fc1t2v` reconfirmado presente e ready.
  Nenhum snapshot/branch foi criado, apagado, sobrescrito ou restaurado.

## Prova de recuperação

`pg_restore` nativo 18.6 leu e descompactou o arquivo completo para SQL.
A restauração ocorreu em instância PGlite/PostgreSQL 18 em memória, recém-criada,
com zero tabelas de usuário antes do início, sem bindings ou conexão ao Neon.
A propriedade dos objetos foi normalizada ao proprietário local; os papéis
locais necessários foram criados sem senhas de produção.

Após restaurar: 12/12 tabelas, 244/244 registros e fingerprints completos de
cada tabela coincidiram com a transação de origem. Sequências conferidas e
permissões de leitura do papel da API em materiais/tentativas preservadas.
O processo local foi encerrado; nenhuma restauração ocorreu em banco remoto.

O dump preserva o banco, incluindo hashes de contas da aplicação, mas não
exporta senhas/definições globais dos papéis PostgreSQL nem configurações externas.
Não cobre o bucket separado de originais. A restauração futura precisa de destino
explicitamente autorizado e de verificação das permissões/ownership apropriadas.
Não restaurar produção como teste nem perder gravações posteriores ao backup.
Se houver novas gravações relevantes antes da migração, renovar o backup.

## Credenciais de upload — verificação sem revelar valores

- Worker oficial continua `6837e3db-ac5f-40ba-8b20-d09e9806aaca`, 100% do tráfego.
- `CEB_UPLOADS_ENABLED=false`, `CEB_WRITE_MODE=normal`, provedor Neon.
- Endpoint aponta ao projeto Free isolado `ceb-arquivos`, branch existente.
- Ambos os campos de acesso ao Storage estão cadastrados como `secret_text`.
- Metadados da credencial existente confirmam storage:read e storage:write
  na branch correta. Os valores não foram revelados nem modificados.
- Isso verifica configuração e escopo; NÃO comprova a assinatura com o par
  efetivamente instalado no Worker. Nenhum novo upload/download de escrita
  em Storage foi executado nesta etapa.

## Teste real preparado e efeitos que precisam de autorização

`scripts/prepare-import-upload-probe.mjs` prepara quatro arquivos técnicos
PDF/DOCX/PPTX/HTML e seus SHA-256 em diretório novo. Não contém rede, acesso
SQL, credenciais, upload ou remoção. Foi executado apenas para preparação.
Reutiliza DOCX/PPTX técnicos existentes; o PDF pequeno contém uma página válida.

Plano futuro, sem criar ambiente/branch e sem dados pessoais nos documentos:

1. Usar uma sessão administrativa autorizada e uma pasta particular existente.
   Não criar conta, trocar senha nem habilitar compartilhamento aos alunos.
2. Somente após autorização específica, disponibilizar um mecanismo de validação
   restrito ao administrador; não liberar uploads globalmente para fazer o teste.
   A forma dessa validação deve ser aprovada antes de qualquer publicação/configuração.
3. Enviar os quatro originais pela rota autenticada real do Worker. Efeito esperado:
   quatro novos registros de materiais e quatro objetos privados novos. O Worker
   escolhe IDs/chaves; nenhum arquivo existente é reutilizado ou sobrescrito.
4. Baixar os quatro arquivos e comparar bytes/SHA-256 com o manifesto; conferir
   metadados, categoria, pasta e recusa de acesso indevido, sem expor conteúdo.
5. Não apagar automaticamente arquivos ou registros. Deixar os técnicos claramente
   identificados; qualquer limpeza posterior exige escopo/autorização próprios.
6. Se qualquer verificação falhar, não ativar a importação nem publicar a entrega
   final. Preservar a versão oficial e os originais; não restaurar o banco inteiro
   para desfazer arquivos técnicos novos.

A migração 006, o mecanismo do teste real, a ativação global e a publicação
continuam pendentes de autorização específica. Não houve mudança em planos,
Hyperdrive, credenciais, questionários, IA, apresentações ou materiais existentes.
Os testes funcionais anteriormente aprovados não foram repetidos.
