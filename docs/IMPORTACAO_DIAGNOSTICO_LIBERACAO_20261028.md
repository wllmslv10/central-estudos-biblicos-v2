# Diagnóstico de liberação da importação — sem autorização de produção

Base: `8309e827e1cfb0b8bc695c993dccd36da47a093d`, na branch de trabalho existente.
Inspeções de produção somente de leitura em 28/10/2026. Nenhuma migração,
restauração, publicação ou ativação de upload executada. Não criar branches,
ambientes, credenciais, planos ou buckets para contornar os impedimentos.

## Recuperação: evidências e limites

- Produção: projeto `green-resonance-36660365`, branch `br-crimson-flower-b4m0g7mh`.
- Backup `backup-ceb-pre-matricula-ia-20261028`, `br-late-credit-b4fc1t2v`,
  está `ready` e suas tabelas são legíveis. Ponto de origem: 28/10 às 08:29:40
  de Brasília (11:29:40 UTC), não o horário posterior de criação da branch.
- Leitura agregada: produção tem 7 contas, 1 estudo, 1 questionário e 2 tentativas;
  esse backup tem 5 contas, 1 estudo, nenhum questionário e nenhuma tentativa.
  Portanto, ele comprova um backup antigo acessível, não recuperação do estado atual.
- Snapshot existente: `snap-round-cloud-b4asdjr3`, `ceb-before-quizzes-20261028`,
  criado às 00:51:20 de Brasília (03:51:20 UTC), anterior aos questionários.
- Janela configurada: 21.600 segundos (6 horas). Agenda de snapshots vazia.
- Organização e ambos os projetos continuam Free. O limite oficial Free é um
  snapshot manual, já ocupado. Nenhum snapshot foi apagado ou substituído.
- Não foi feito ensaio destrutivo de restauração em nenhuma branch existente.
  Recuperabilidade integral e atual ainda NÃO está certificada.

## Migração proposta

`006_material_classification.sql` acrescenta somente `category`, nullable, com
CHECK das seis categorias existentes. Não altera `kind`, não atualiza registros,
não toca em contas, questionários, respostas, pastas ou originais.
A coluna está ausente em produção. Proprietário da tabela: `neondb_owner`;
`ceb_api_user` já possui SELECT/INSERT/UPDATE. Não mudar esses privilégios.

Preparação adicional: `lock_timeout=3s` e `statement_timeout=15s`, locais à
transação, evitam espera indefinida. Não alteram configurações permanentes do Neon.
Executar futuramente a versão completa em uma conexão administrativa autorizada,
com BEGIN/COMMIT, após novo ponto de recuperação validado. Se houver timeout,
falha de verificação ou conflito inesperado: ROLLBACK e interrupção, sem retry infinito.

Teste novo executado: `node scripts/test-import-migration-recovery.mjs`.
Uma falha deliberada depois do ALTER e antes do COMMIT foi revertida localmente;
coluna removida pelo rollback transacional, registros e tentativas sintéticas
inalterados, timeouts locais revertidos. Isso NÃO é restauração real do Neon.
Os testes de classificação e formatos anteriormente aprovados não foram repetidos.

## Estratégia segura de recuperação

1. Antes de executar a migração, obter backup atual privado e verificável, com
   ponto temporal, esquema, integridade e procedimento de restauração confirmado.
   Preferir uma exportação lógica privada se isso permitir preservar o snapshot
   existente sem plano pago. Não apagar o snapshot nem sobrescrever backups
   existentes sem autorização específica; não criar branch adicional.
2. Antes do COMMIT: falha deve resultar em ROLLBACK da própria transação.
3. Depois do COMMIT: primeira recuperação é de código/configuração — manter
   uploads false e voltar ao Worker/interface oficiais compatíveis. Deixar a
   coluna nullable adicionada; não executar DROP COLUMN nem restaurar o banco
   inteiro por causa de uma falha de interface/upload.
4. Uma restauração total do Neon substitui a linha temporal do banco e perderia
   gravações posteriores. Só é admissível como último recurso, com autorização
   específica, proteção do estado atual e plano explícito para as gravações novas.
   Não usá-la como ensaio nem presumir que preserva notas ou matrículas recentes.
5. Object Storage não é revertido pela restauração do banco. Os originais estão
   em outro projeto e precisam ser preservados/verificados separadamente.

## Upload: causa e situação real

Worker oficial `6837e3db-ac5f-40ba-8b20-d09e9806aaca`, tráfego 100%, SHA
`796d89fbd79bcba5cb856b17a528c67b98e5d428`.
`CEB_WRITE_MODE=normal`, `CEB_STORAGE_PROVIDER=neon`, `CEB_UPLOADS_ENABLED=false`.
O bloqueio é intencional e ocorre antes de gravar SQL/objetos.

O endpoint configurado corresponde ao projeto isolado `ceb-arquivos`
(`solitary-mountain-32451807`, branch `br-holy-lake-b5wmosos`). Storage está
habilitado e há apenas o bucket privado `ceb-materiais`. Os dois segredos de
armazenamento já existem no Worker. Os metadados da credencial Neon incluem
storage:read e storage:write. Nenhum valor foi revelado ou trocado; presença do
segredo NÃO prova que o par instalado é correto ou que a assinatura funciona.

Existem os objetos técnicos de validação antigos no bucket. A inspeção não
repetiu upload nem alterou/excluiu esses objetos. Testes históricos via URLs do
conector não comprovam o caminho autenticado Worker → Storage → metadados.
A decisão anterior de usar o projeto Free isolado e a credencial por branch
já está registrada como autorizada; não é necessário rediscutir R2 nem criar chave.

## Ações que dependem de autorização específica

- Obter/verificar um backup atual e seu procedimento de restauração, sem novas
  branches/ambientes, sem cobrança e sem eliminar backups antigos. Se isso não
  for possível nessas condições, interromper antes da migração.
- Aplicar a migração 006 na produção somente depois dessa verificação.
- Publicar o candidato com uploads ainda bloqueados, herdando segredos,
  Hyperdrive e demais configurações exatamente como estão.
- Autorizar um teste real controlado do Worker com originais técnicos novos,
  sem dados pessoais: assinatura, upload/download e hash, registro de metadados,
  escopo de pasta e acesso indevido. Sem substituir ou apagar materiais existentes.
  Acesso autenticado administrativo será necessário; não solicitar senha na conversa.
- Somente após essa prova, liberar a flag de upload, publicar a interface e
  conferir o fluxo oficial. A etapa intermediária bloqueada não conta como entrega
  final; em falha, recuperar o código/configuração anterior e manter uploads false.

O único ajuste de configuração proposto é a liberação futura de
`CEB_UPLOADS_ENABLED`, após autorização e aprovação do teste real. Não alterar
plano, Hyperdrive, endpoint, credenciais, geradores ou permissões existentes.

## Fontes oficiais consultadas

- https://neon.com/docs/postgres/backup-restore/branch-restore
- https://neon.com/docs/postgres/backup-restore/history-window
- https://neon.com/docs/introduction/plans
- https://neon.com/faqs/free-plan-limits-and-quotas
- https://neon.com/docs/storage/authentication
