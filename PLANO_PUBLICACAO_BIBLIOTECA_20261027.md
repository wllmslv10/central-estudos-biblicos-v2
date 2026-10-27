# CEB V2 — revisão da migração, reversão e publicação controlada

**Estado: preparado para análise de William. Não autoriza executar a migração ou publicar em produção.** Revisão em 27/10/2026. Não será criado outro ambiente para testes visuais. Os testes visuais serão feitos no aplicativo oficial depois da publicação controlada que William vier a autorizar.

## 1. Evidências e versões de referência

| Componente | Referência confirmada |
| --- | --- |
| Interface oficial, `main` | `da144968e95682b260faffaf87c8d0bec8663b2b` |
| Última publicação Pages bem-sucedida da `main` | execução `40436043627`, no mesmo commit |
| Branch ligada historicamente ao build do Worker oficial | `feature/sincronizacao-nuvem-ceb`, commit `72c223d1dfd4c5cf502513c516e2978761f1a2d9` |
| Versão do Worker publicada por esse build histórico | `ff56edf0-231f-40d4-a691-cf08c9b5eb47`; build `9b9275e3-7583-4573-9f89-dddd062a1c16` |
| Código do PR #3 revisado nesta etapa | `2d3987b3d10b296ffc8fa18fe8e7c38181b589ea` |
| Rodada funcional remota aprovada | execução `40507655155`, commit `00407bb0117c6053f0f6abe6dce5ba8b7f266090`: 26 verificações reais |
| CI do código final de validação | execução `40508446778`: 56 testes aprovados, build e identidade visual aprovados |

**A versão histórica do Worker não está certificada como a versão ativa atual.** Houve alterações manuais anteriores no painel. Não assumir que a branch Git ou o build acima representa a configuração que está servindo hoje. Antes de qualquer publicação, registrar no Cloudflare o UUID completo da versão ativa, bindings e nomes dos segredos (sem valores), compatibilidade, branch e comando de build. Não usar automaticamente `ff56edf0-...` como rollback.

A fonte na `main` já preserva as regras manuais conhecidas de estudos particulares/gerais. A branch `feature/...` tem diferenças antigas de interface e não deve substituir a `main` inteira. O PR está em draft e apresenta conflito de merge. Os cinco commits exclusivos da `main` alteram somente `CONTINUIDADE_IMPLEMENTACOES_CEB.md`; o histórico de ambos os lados deverá ser preservado ao resolver esse documento, sem force-push ou reset da `main`.

## 2. Comparação efetiva dos schemas

Comparação somente leitura entre a produção `br-crimson-flower-b4m0g7mh` e a branch validada `br-falling-thunder-b4saoifs`, banco `neondb`. O diff de schema confirmou somente os objetos abaixo para a biblioteca. As contas e materiais técnicos da branch de testes **não serão copiados**.

| Objeto | Produção atual | Alteração necessária |
| --- | --- | --- |
| `ceb_folders` | não existe | tabela de pastas com dono, nome, escopo e criação; UUID/PK; nome de 1–80 caracteres; escopo private/general; unicidade por dono/nome; FK para usuários |
| `ceb_materials` | não existe | tabela de metadados, texto, associação a pasta/dono, chave privada do original, SHA-256, tamanho/tipo, categoria, aplicado/data, Lixeira e datas |
| Restrições de materiais | não existem | PK/UUID, chave de objeto única, FKs sem cascata, título 1–240 caracteres, arquivo >0 e até 20 MiB, categorias estudo/esboço, escopos private/general |
| Índice de materiais | não existe | `ceb_materials_owner_updated_idx` por dono e atualização |
| `ceb_studies.deleted_at` | não existe | coluna `timestamptz` opcional, inicialmente NULL |
| Grants explícitos novos | não existem | SELECT, INSERT e UPDATE de pastas/materiais para `ceb_api_user` |
| Usuários, sessões, tentativas de login e demais colunas de estudos | já existem | nenhuma migração de autenticação necessária |

Arquivo aplicável: **somente `api-worker/migrations/003_cloud_materials.sql`**. Não reaplicar as migrações antigas de autenticação. O script 003 contém CREATE TABLE/INDEX IF NOT EXISTS, ADD COLUMN IF NOT EXISTS e GRANT; não contém DROP, TRUNCATE, DELETE, UPDATE ou INSERT de registros existentes. Não altera o conteúdo, dono, visibilidade ou ID dos estudos. A nova coluna opcional mantém todos os estudos anteriores fora da Lixeira.

A aplicação deve executar o arquivo em transação, por conexão direta administrativa, com `lock_timeout` curto (por exemplo 3 s) e `statement_timeout` limitado (por exemplo 30 s). Antes, confirmar que as tabelas/coluna novas ainda não existem ou correspondem exatamente ao schema revisado: IF NOT EXISTS não valida uma tabela parcialmente criada ou diferente. Se houver lock ou qualquer erro, ROLLBACK e não publicar o backend. Depois do COMMIT, não remover os objetos novos para reverter uma aplicação.

### Preservação da lição e dos dados

Inventário somente leitura em 27/10/2026 às 13:18:05 UTC: 5 usuários, 1 estudo e 52 sessões. Esses contadores são referência, não devem ser impostos por UPDATE/DELETE, pois novos acessos podem alterá-los legitimamente.

- Lição: `35ebc974-6f34-4222-827d-05d747b40de1`, **A Postura do Cristão Diante das Ofertas do Mundo**.
- MD5 de `content::text`: `5a39fbb0b1723009162bfb1d1ed208bd`, 7.359 caracteres.
- Impressão agregada dos IDs/conteúdos dos estudos: `72147daa994d197645e73d01e5334b15`.

Repetir a consulta imediatamente antes e depois da migração. A contagem não pode diminuir. Se o conteúdo de um usuário mudar legitimamente entre as consultas, comparar IDs e timestamps; nunca restaurar o checksum antigo sobrescrevendo uma edição nova. Não editar a lição para fazer testes visuais.

### Autenticação, permissões e compatibilidade

- As rotas de login, sessão, logout e troca de senha no Worker revisado são idênticas às da `main`: não se troca algoritmo de hash, tabela, cookie, token ou credencial.
- A regra existente de administrador/particular/geral foi preservada. As 26 verificações remotas provaram sessões distintas, privacidade entre administradores/aluno e acesso anônimo negado. Isso não implementa o compartilhamento granular previsto na tarefa #4.
- O novo Worker entende os endpoints antigos. O banco deve ser atualizado primeiro: o Worker novo consulta a coluna de Lixeira e as tabelas novas, inclusive para proteger a exclusão de usuários com materiais vinculados.
- A revisão encontrou um ajuste pequeno recomendado antes da publicação: a restauração de estudos estruturados devolve sucesso sem verificar quantas linhas o UPDATE realmente alterou. Em uma mudança concorrente de permissão/registro, pode confirmar uma restauração que não ocorreu. O WHERE continua impedindo acesso indevido. Corrigir a confirmação pelo `rowCount` e testar esse caso, sem alterar dados ou credenciais; a correção **não foi implementada nesta etapa de planejamento**.
- DELETE de estudos passa a ser lógico; originais importados também usam Lixeira lógica. Recuperação mantém o mesmo ID/chave e não cria cópias do arquivo.
- O código da interface separa `libraryReady` de `uploadsReady`: com upload bloqueado, ainda é possível consultar a biblioteca e os controles disponíveis; não é necessário habilitar importação para conferir login/leitura.
- A role SQL atual já herda `neon_superuser` e possui CREATEROLE, CREATEDB e BYPASSRLS. Isso antecede esta migração. Os grants explícitos novos são limitados, mas **não tornam essa role globalmente de privilégio mínimo**. Não revoguei heranças nem alterei senha/Hyperdrive. Uma redução desses privilégios é uma mudança de segurança distinta, que exige revisão de compatibilidade e autorização; não deve ser misturada à publicação silenciosamente.
- Materiais locais antigos de IndexedDB não são migrados automaticamente pelo PR. Eles não são apagados, mas o inventário novo vem da nuvem. Se existirem importações locais anteriores, preservá-las/exportá-las antes da troca e definir sua recuperação/importação; o backup SQL não contém arquivos que só existam no navegador. Não limpar armazenamento do navegador.

## 3. Ponto de recuperação preparado

Foi criado **um ponto de recuperação sem compute**, não um novo ambiente visual:

| Campo | Valor |
| --- | --- |
| Nome | `backup-ceb-before-cloud-library-20261027` |
| ID | `br-late-tooth-b4g3b04j` |
| Origem | produção `br-crimson-flower-b4m0g7mh`, projeto `ceb-biblioteca` |
| Estado copiado | 27/10/2026 13:20:20 UTC (10:20:20 de Brasília), LSN `0/23C7738` |
| Criação | 13:20:34 UTC; estado `ready` confirmado |
| Compute | nenhum endpoint; lista de computes vazia; zero tempo de compute |
| Conexões existentes | nenhuma alterada; nenhuma string de conexão obtida/exportada |

O projeto estava em Free, com quatro branches; passou a cinco dentro do limite de dez. A cópia é mantida no mesmo projeto por copy-on-write. Não substitui um backup independente contra exclusão do projeto inteiro, e uma restauração completa não foi ensaiada nesta etapa.

A janela atual de recuperação temporal do projeto é de 21.600 s (6 horas). Não depender exclusivamente dessa janela para uma publicação posterior. Imediatamente antes da migração autorizada, conferir se o ponto cobre os dados atuais; se houver alterações posteriores relevantes, criar um ponto final sem compute, sem apagar o atual e somente dentro da franquia Free. Não resetar/reaproveitar destrutivamente o backup.

O projeto separado `ceb-arquivos` não está incluído no ponto SQL do `ceb-biblioteca`. Os originais desse projeto devem permanecer intactos durante qualquer reversão. As chaves de objetos são UUIDs novos; reverter código não deve apagar o bucket, objetos ou metadados posteriores.

## 4. Plano de reversão sem descartar dados novos

**Princípio:** reverter código preservando o banco e o Storage vivos. Não executar uma down migration, não trocar Hyperdrive por uma cópia antiga e não restaurar o backup inteiro sobre a produção que já recebeu novas gravações.

| Situação | Ação prevista | Preservação |
| --- | --- | --- |
| A migração falha antes do COMMIT | ROLLBACK da própria transação; manter Worker/interface atuais | Estado antigo permanece; não é necessário restaurar backup |
| Migração terminou, backend novo ainda não foi publicado | Deixar objetos aditivos no banco e manter aplicação antiga | Nenhum registro anterior foi alterado |
| Interface nova apresenta problema | Voltar os arquivos de interface ao commit `da144968...` por **novo commit**, preservando backend compatível e novos dados | Novos materiais podem ficar temporariamente fora da interface antiga, mas não são removidos |
| Problema no backend após novas gravações/Lixeira | Bloquear novas gravações com uma versão compatível de contingência, preservar leitura/login quando seguros e corrigir para a frente | Manter coluna/tabelas, IDs, soft deletes e originais; não usar cegamente um Worker antigo |
| Perda/corrupção real de registros | Preservar também o estado atual; consultar o ponto de recuperação e reconciliar somente IDs afetados | Não sobrescrever edições novas nem registros criados depois do backup |

O Worker antigo pode listar estudos da Lixeira como ativos e fazer DELETE físico. Por isso, **restaurar a versão anterior não é um rollback automaticamente seguro após novas operações**. Antes de ativar importações, deve existir um checkpoint de backend compatível, com upload bloqueado, e um procedimento de contingência que bloqueie gravações se necessário. Um modo geral de manutenção somente leitura ainda não existe no código atual; não prometer acioná-lo por uma variável inexistente. Preparar/validar essa versão de contingência faz parte da execução autorizada, antes da ativação de escritas novas.

A reversão da interface deve restaurar somente os arquivos necessários por novo commit, sem reset/force-push e sem remover os módulos de backend ou o histórico do PR. Registrar o novo build Pages e manter o backend compatível. Se for necessário um rollback de versão Cloudflare, conferir o UUID efetivamente capturado no painel e os bindings/compatibilidade daquela versão; as versões podem incluir configurações, não apenas JavaScript.

Se algum registro precisar ser recuperado, usar a cópia como fonte de comparação/extração; inserir apenas IDs comprovadamente ausentes ou reconciliar campos após revisão. Um conflito deve ser resolvido individualmente, não por sobrescrita em massa. Restauração destrutiva do banco continua exigindo autorização específica e não faz parte deste plano normal.

## 5. Sequência de publicação — executar somente após autorização

1. **Fechar o estado anterior.** Revalidar os SHAs acima, UUID ativo do Worker, configuração de build, nomes de segredos, binding Hyperdrive e planos gratuitos. Registrar o checkpoint final de dados. Não criar outra implantação visual. Manter o Worker de validação fechado; suas contas técnicas estão inativas e uploads bloqueados.
2. **Resolver o conflito documental do PR.** Preservar os registros de continuidade da `main` e do PR. Não fazer merge ainda: ele dispara GitHub Pages antes do momento correto. Não mudar a branch padrão do repositório.
   Na preparação autorizada, incluir o ajuste de confirmação da restauração acima e seus testes, sem iniciar a tarefa #4. Preservar também o artefato/identificação do site atualmente publicado, antes que a retenção dos artefatos da CI termine; o SHA de fonte permite recompilar, mas não é uma cópia do bundle compilado.
3. **Aplicar somente a migração 003.** Transação limitada, na produção original, sem trocar a branch do Hyperdrive. Conferir tabelas, constraints, grants, IDs, contagens e checksum da lição. Parar se houver diferença inesperada.
4. **Atualizar primeiro o backend oficial, com `CEB_UPLOADS_ENABLED=false`.** Usar o vínculo GitHub/Workers Builds existente, depois de confirmar sua branch/comando no painel. Integrar somente o runtime de produção do PR na branch `feature/sincronizacao-nuvem-ceb`, preservando suas alterações existentes: `worker.js`, `materials.js`, `storage.js`, `neon-storage.js`, `r2-storage.js`, `package.json`, `package-lock.json` e `wrangler.toml`; manter `auth.js` inalterado. Não publicar `validation-worker.js` nem usar `wrangler.validation.toml`. Não copiar credenciais/URL SQL de testes. Hyperdrive continua `48d8b2d8d2a048a1a90219030f4b9329`. Segredos S3 já cadastrados em produção permanecem no backend, sem rotação.
5. **Verificar backend antes da interface.** Capturar nova versão Cloudflare. Conferir `/health` conectado; sem sessão, biblioteca negada; com sessão, `/auth/me`, `/studies`, `/library/materials`, `/library/folders` e `/library/capabilities`, este com `uploads:false`. A lição deve manter seu ID/conteúdo. O `/health` de produção atual consulta SQL, não Storage: não confundir saúde SQL com comprovação de S3. Preparar e registrar o checkpoint compatível de contingência.
6. **Publicar a interface oficial.** Somente após o backend aprovado, integrar o PR na `main` com os conflitos resolvidos, preservando a identidade visual e o workflow Pages existente. Não substituir a `main` pela branch `feature/...`. Aguardar o build Pages bem-sucedido. O endereço e `API_BASE` continuam os atuais. Nenhum segredo entra no bundle do frontend.
7. **Verificação imediata no aplicativo oficial, ainda sem importação.** Login/identidade; papéis admin/aluno; leitura da lição e referências; listagem de materiais; pastas/Lixeira; botão de importação bloqueado; modo de leitura; apresentação HTML e identidade; abrir no PC e tablet/celular. Usar novo material técnico caso seja necessário testar gravação, nunca editar/excluir a lição preservada. As 26 verificações remotas concentraram-se nos originais importados: criar/editar/excluir logicamente/restaurar um estudo estruturado técnico é parte do smoke test da publicação, não um teste já comprovado para a lição existente. Recarregar a página para verificar a versão publicada, sem limpar IndexedDB/localStorage.
8. **Ativação posterior e controlada.** A primeira publicação não ativa importação. Depois do aceite da interface, evidência do plano Free e checkpoint de reversão compatível, apresentar o resultado a William e combinar a liberação. O primeiro upload em produção deverá ser um arquivo técnico pequeno, seguido de download/checksum, privacidade, Lixeira e recuperação, antes de liberar uso normal. As credenciais de produção devem ser verificadas efetivamente nessa operação; as chaves do Worker de validação não são prova automática do segredo instalado em outro Worker.

## 6. Preservação visual e escopo

Comparação direta de código com a `main` confirmou igualdade de `buildSlides`, `createPresentationHtml` e do bloco de conteúdo do modo de leitura. CSS, imagens e demais arquivos da identidade não aparecem no diff funcional do PR contra a `main`. A validação de identidade visual e o build passaram na CI final.

Hashes de referência: gerador HTML `44e5db4672942891720bb1fe8e08138f11b2960b3d06105b398c55ecd94688c4`; bloco de leitura `1fee6a03cf0ea98b811d222adaf5b3f2786cf585466a9405261743941d0fe766`; rotas de login/sessão/senha `a72cd05f3ed892e5206a220c2ca6690247862b59d33be304399943af8c505c36`.

A tarefa #4 não será iniciada. Compartilhamento granular com alunos, reorganização de cartões/botões/categorias e edição de documentos importados sem cópias não estão sendo prometidos como parte desta publicação de armazenamento.

## 7. Despesa zero e condições antes da execução

Neon Free reconfirmado nesta revisão; projeto atual com limite de 1 GiB e 10 branches, cinco em uso após o checkpoint. A documentação oficial atual informa 5 GB de Object Storage por projeto e janela Free de 6 h. Nenhuma assinatura, cartão, histórico ampliado, R2 ou recurso pago foi ativado. O checkpoint sem compute não cria consumo de execução; continua usando as franquias de armazenamento/branches, que não são ilimitadas.

Cloudflare: a solução utiliza os recursos já configurados e não requer contratação, mas o agente não tem acesso ao painel de faturamento para comprovar o plano atual da conta. **A confirmação de Workers Free e da franquia disponível é condição antes da execução; não está certificada por este relatório.** O GitHub não substitui essa verificação. Se a interface pedir upgrade, assinatura, cartão ou indicar cobrança, parar. Não habilitar Workers Paid, R2, plano pago Neon ou outro serviço para contornar limites.

Não será solicitado que William envie credenciais. As informações eventualmente necessárias do painel são apenas plano e UUID ativo/configuração não secreta. A publicação oficial depende de autorização expressa posterior; este documento não a presume.

## Fontes e evidências

- Comparação MCP de schemas, metadados do projeto, branches/compute e consultas SQL somente leitura, nesta revisão.
- https://github.com/wllmslv10/central-estudos-biblicos-v2/actions/runs/40436043627
- https://github.com/wllmslv10/central-estudos-biblicos-v2/actions/runs/40507655155
- https://github.com/wllmslv10/central-estudos-biblicos-v2/actions/runs/40508446778
- https://neon.com/docs/introduction/plans
- https://neon.com/docs/introduction/branching
- https://neon.com/blog/neon-free-plan-1-gb-per-project
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/
- https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/
