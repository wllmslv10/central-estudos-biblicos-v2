# Ponto de continuidade — CEB V2

Atualizado em 26/10/2026. Este documento registra as entregas e pendências sem alterar os materiais dos usuários.

## Já implementado no repositório
1. Proteção automática da identidade visual aprovada (login/cabeçalho: Bíblia CEB; ícones de instalação: pomba IBNE; imagens institucionais preservadas).
2. Importação: PDF e DOCX existentes mantidos; suporte a PPTX e HTML incorporado à leitura de texto.
3. Pastas de materiais importados: criação/seleção de pasta no ato de importar e filtro por pasta na Biblioteca. Os arquivos originais permanecem no IndexedDB deste navegador e a lista de pastas no localStorage.
4. Materiais importados: opção "Material aplicado", data opcional e alteração discreta somente da cor do cartão. A alteração de estado preserva o arquivo original (blob) existente.

## Validação
- Deploy #110 (commit aabda81): sucesso, relativo à etapa 1.
- Confirmar que os commits posteriores de "Material aplicado" compilaram e foram publicados.
- Ainda é necessário testar no navegador com arquivos reais PDF, DOCX, PPTX e HTML, verificando extração de texto, prévia, salvamento, reabertura, download do original e filtros.
- PDF digitalizado e materiais baseados em imagens não recebem OCR automático.
- Importações/pastas ainda NÃO sincronizam entre dispositivos.

## Próximos passos por prioridade
1. Validar "Material aplicado" em arquivo importado no navegador e aplicar controle equivalente aos materiais criados na CEB e materiais da EBD, sincronizando a propriedade corretamente no fluxo de nuvem.
2. Melhorar importação de HTML (preservação legível de títulos, parágrafos, listas) e erros nos arquivos PPTX.
3. Completar pastas/organização conforme necessário para outros tipos de material, evitando mudanças destrutivas.
4. Prévia e confirmação explícita antes de salvar estudos, esboços e aulas criados pelo gerador, com seleção da biblioteca correta.
5. Compartilhamento com alunos e autorização de downloads, com checagem de permissões no backend Neon/Cloudflare (não apenas esconder botão).
6. Exportação para PDF e identidade institucional nos downloads.
7. Apresentações HTML e opções de visualizar/baixar; aguardar modelo visual de referência aprovado.
8. Testes de regressão completos, compatibilidade de instalação PWA, conteúdo existente e backup.

## Regras inegociáveis
- Não substituir Bíblia CEB no login/cabeçalho nem a pomba IBNE do aplicativo; manter verificação de identidade visual no workflow.
- Não excluir ou alterar intencionalmente materiais já salvos; não fazer migrações de dados sem backup e verificação.
- Preferir melhorias incrementais, cada uma com build e teste antes da próxima. Não publicar como concluídas funcionalidades ainda não testadas.

## Decisão de arquitetura — biblioteca online (26/10/2026)
- Regra aprovada: os materiais salvos na CEB devem persistir na nuvem, não depender do armazenamento de um único navegador.
- Projeto Neon: `ceb-biblioteca`; branch `production`; **bucket privado `ceb-materiais` criado no armazenamento Neon em 26/10/2026**.
- Banco PostgreSQL: metadados, texto estruturado, pastas, proprietários, permissões, datas e exclusão lógica.
- Bucket privado: arquivos originais PDF/DOCX/PPTX/HTML, sem acesso público direto.
- Ainda PENDENTE: migração de esquema (testada em branch), endpoints de upload/download/exclusão com autorização no backend, integração frontend e testes entre dois administradores.
- Exclusão: oferecer ação Excluir com confirmação; recomendada Lixeira/restauração e exclusão definitiva controlada. Excluir objeto armazenado somente com regras de permissão e consistência verificadas.
- Migrar originais do IndexedDB apenas após confirmar upload íntegro; não apagar dados existentes antes de concluir/verificar a migração.
- O bucket criado **não significa** que upload/sincronização já está operacional.

## Reinício da biblioteca — 26/10/2026 (solicitação aprovada)
- O único registro encontrado em `public.ceb_studies` do Neon foi `A Postura do Cristão Diante das Ofertas do Mundo` (Mateus 4:1–11). Foi preservado e marcado como `private/draft` para o proprietário acessá-lo na consulta atual da API.
- Os 20 estudos antigos e os 11 esboços incluídos no código deixaram de ser listados na biblioteca, assim como o material José que era reinserido automaticamente. Os arquivos antigos permanecem no histórico Git (não são documentos publicados no Neon).
- Os estudos novos passam a entrar na lista da Biblioteca apenas após confirmação da API Neon. Mensagens de falha deixam claro quando não houve salvamento. A lista deixa de mesclar materiais locais antigos.
- A importação de novos arquivos foi DESABILITADA TEMPORARIAMENTE na interface. Não anunciar como cloud-first até implementar upload seguro para o bucket privado `ceb-materiais`, gravar os metadados no PostgreSQL e confirmar recuperação noutro dispositivo.
- Publicação GitHub Pages após a limpeza: execução `40415297912` concluída com sucesso, commit `fbc1cac`.
- PENDENTE: endpoints de documentos (upload/download/listagem), metadados e autorização no Cloudflare/Neon, compartilhamento entre administradores, exclusão com confirmação, integração da UI, migração/eliminação segura de restos locais e testes end-to-end.
- Tentativa de disponibilizar a exclusão pela interface não foi aplicada por bloqueio de segurança da ferramenta de escrita; confirmar no GitHub antes de anunciar esse recurso.

## Reconciliação com Worker enviado do painel — 26/10/2026
- Comparado o arquivo fornecido pelo responsável (`Texto colado(20261026-231835).txt`) com build local de `46cd5b8`: dependências, autenticação, rotas administrativas e tratamento final idênticos.
- Diferença localizada nas rotas `/studies`: biblioteca geral acessível/editável por administradores; `libraryScope: private/particular` permanece exclusivo do proprietário; alunos acessam somente os próprios materiais. Essa regra da cópia de produção foi integrada ao código-fonte, sem alterar usuários, senhas ou dados.
- Validação: 14 testes passaram (4 existentes e 10 verificações de permissões); identidade visual aprovada.
- Lição preservada: `35ebc974-6f34-4222-827d-05d747b40de1`, checksum `5a39fbb0b1723009162bfb1d1ed208bd`, 7359 caracteres de conteúdo JSON.
- A origem verificável da diferença é o arquivo enviado do painel; não foi possível atribuir autor/data exatos do ajuste sem acesso ao histórico autenticado Cloudflare.
- Importação na nuvem ainda pendente; não habilitar até configurar acesso do Worker ao bucket privado e validar upload/recuperação com autorização.

## Biblioteca online em preparação — 26/10/2026
- Reconciliação em `main`: commit `c180ad1`, Pages `40419318845` concluído com sucesso.
- Upload privado, metadados/pastas no Neon, controles de acesso, Lixeira/restauração e Material aplicado preparados em `work/biblioteca-nuvem-20261026`. Consultar `api-worker/CLOUD_LIBRARY_IMPLEMENTATION.md` para implantação e limites.
- Testes: build, identidade visual e 27 testes locais; migração e operações reais na branch isolada `br-falling-thunder-b4saoifs` validadas; teste de dados revertido com ROLLBACK.
- PRODUÇÃO: esquema e Worker desta nova etapa ainda não publicados. Upload real ainda não testado. Segredos de armazenamento ainda não configurados; nenhuma credencial criada/alterada.
- Consultar o responsável antes de criar/configurar credenciais, conforme sua instrução expressa. Não solicitar segredos na conversa.

## Ponto de parada — credenciais de armazenamento
- PR de preparação: https://github.com/wllmslv10/central-estudos-biblicos-v2/pull/3 (`work/biblioteca-nuvem-20261026`, commit `7db76e6`).
- Cinco execuções de validação no GitHub concluídas com sucesso; testes locais, build, identidade e banco isolado também passaram.
- Para continuar: consultar William antes de criar uma credencial específica de armazenamento (leitura/gravação, branch production), conforme instrução expressa; configurar dois segredos do Worker por mecanismo seguro. A sessão Cloudflare remota continua sem autenticação concluída. Não solicitar valores secretos no chat.
- Depois: migração aditiva em produção, deploy do Worker pela branch configurada, frontend e validação real dos quatro formatos com dois usuários/dispositivos. Upload real ainda não operacional.

## Limite obrigatório de credencial — 26/10/2026
- William autorizou credencial exclusiva APENAS para o bucket `ceb-materiais`; não autorizou acesso a todos os buckets da branch, alteração/revogação de chaves existentes nem exposição de segredos.
- Verificação da API e documentação oficiais: o endpoint Neon de criação oferece scopes `storage:read`/`storage:write` por branch, sem filtro de bucket. Políticas S3 de escrita não estão disponíveis para contornar isso. Limitar o bucket no código não equivale a restringir a credencial no provedor.
- Nenhuma credencial foi criada. A publicação do PR #3 continua bloqueada até decidir uma solução que respeite esse limite, ou obter autorização expressa diferente. Não usar a autorização anterior para emitir uma chave mais ampla.
- Fontes: https://api-docs.neon.tech/reference/createcredential e https://neon.com/docs/storage/s3-compatibility.

## Solução autorizada: R2 binding direto — 26/10/2026
- William autorizou adaptar exclusivamente os arquivos originais para Cloudflare R2. Todos os dados estruturados permanecem no Neon PostgreSQL.
- PR #3 adaptado para bucket privado `ceb-materiais`, binding `CEB_MATERIAIS` no Worker `ceb-biblioteca-api`, com Hyperdrive preservado. Nenhuma credencial S3 necessária/criada/alterada.
- 36 testes passaram, incluindo integração com runtime R2 local: ida/volta das amostras PDF/DOCX/PPTX/HTML, bytes/checksum, permissões, Lixeira e restauração. Nenhum acesso remoto ao R2 nos testes locais.
- Próximo passo externo: criar/confirmar na mesma conta Cloudflare o bucket R2 `ceb-materiais`, privado, sem acesso público r2.dev ou domínio personalizado. Binding já declarado em Wrangler; publicação associará o bucket.
- Sem sessão Cloudflare autenticada utilizável pelo agente. Não publicar antes de confirmar bucket, validar backend isolado, migração aditiva e fluxos autenticados. Esquema da produção ainda preservado; upload real em produção ainda indisponível.

- Commit R2 do PR #3: `9aba425c38f19f5b094b451de13ad8068ac48468`. Os passos exatos do painel estão em `api-worker/CLOUD_LIBRARY_IMPLEMENTATION.md` na branch do PR. Não criar chaves S3.

## Regra vigente — despesa zero e prioridade Neon Storage
- A orientação de ativar R2 está SUSPENSA pela instrução posterior de William: não contratar, cadastrar cartão nem habilitar recursos com risco de cobrança sem autorização. Não seguir os passos antigos de ativação R2 enquanto conflitarem com essa regra.
- Verificados em 26/10/2026: organização no plano `free`, Neon Storage habilitado, bucket `ceb-materiais` privado; limites publicados confirmam 1 GB PostgreSQL e 5 GB Object Storage separados por projeto. Recursos gratuitos têm limites de consumo/transferência.
- A restrição técnica persiste: a credencial Neon é de armazenamento por branch e descendentes, sem limite por bucket. Não criar/reutilizar chave mais ampla sem aprovação específica.
- PR #3 preservado e atualizado documentalmente no commit `04e5362e93831d189187fb0afe008e9b8693c8dd`. Análise e alternativas em `api-worker/STORAGE_ZERO_COST_REVIEW.md` na branch do PR; nenhuma mudança funcional/produção nesta revisão.
- Caminhos a decidir antes de prosseguir: (a) aceitar explicitamente credencial storage-only na branch existente, hoje com somente `ceb-materiais`; (b) projeto Neon Free separado contendo apenas originais, aceitando a credencial por branch desse projeto isolado. Não equivale a suporte nativo a permissão por bucket.
- Não iniciar issue #4 antes da biblioteca online. Não tocar gerador HTML/modo de leitura; apresentações futuras exigem conferir o modelo exato aprovado.

## Armazenamento Neon isolado autorizado e criado — 26/10/2026
- William autorizou expressamente projeto Free exclusivo para originais e a credencial por branch nele, sem reutilizar chaves de outros projetos. Despesa zero permanece obrigatória; R2 suspenso.
- Criado `ceb-arquivos`, projeto `solitary-mountain-32451807`, branch `production`/`br-holy-lake-b5wmosos`, bucket privado único `ceb-materiais`. Organização Free reconfirmada após criação; sem cartão, assinatura ou upgrade.
- Neon gerou automaticamente credencial própria de armazenamento (`storage:read`, `storage:write`) do projeto novo. Só foram lidos metadados; nenhum segredo foi revelado. Não criar chaves adicionais sem necessidade nem alterar credenciais existentes.
- Upload/download reais via URLs temporárias passaram nas quatro amostras, com bytes idênticos e acesso anônimo 403. Ver `api-worker/STORAGE_CLOUD_VALIDATION.md` para limites desse teste.
- PR #3 adaptado para Neon isolado; 45 testes locais, build, identidade e dry-run passaram. `CEB_UPLOADS_ENABLED = "false"` mantém importação bloqueada na UI e backend até validação completa. R2 removido da configuração de publicação, testes anteriores preservados.
- Necessário copiar diretamente Neon Connect > Storage para dois segredos do Worker (`CEB_STORAGE_ACCESS_KEY_ID` / `CEB_STORAGE_SECRET_ACCESS_KEY`), sem valores na conversa. Procedimento em `api-worker/CLOUD_LIBRARY_IMPLEMENTATION.md` na branch do PR.
- Pendentes: autenticação do Worker com os segredos, testes remotos completos com usuários/dispositivos, migração aditiva e publicação. Produção original e bucket anterior intactos; lição reconferida com checksum original. Não iniciar issue #4, nem tocar HTML/leitura.

- Commit do PR #3: `82d662c2a0e03675d06d66e8a80a4a62f67e2f0a`. Credencial gerada automaticamente pelo Neon no projeto novo; NÃO foi revelada pelo agente. Próxima intervenção: copiar diretamente Neon → segredos Cloudflare, sem valores no chat. Não liberar `CEB_UPLOADS_ENABLED` ainda.


## Situação vigente — preparação concluída em 27/10/2026

Os parágrafos anteriores preservam o histórico da main; pendências antigas não substituem esta situação atual. PR #3: 26 verificações funcionais remotas aprovadas; segredos já configurados; uploads novamente bloqueados. Restauração dos estudos corrigida e contingência compatível preparada/testada; nenhuma migração ou publicação oficial executada. Materiais antigos exclusivamente locais da CEB podem ser descartados por autorização de William; não é necessário migrá-los nem exportá-los. Nenhum dado foi apagado. Neon, nuvem e lição preservados. Ver `PLANO_PUBLICACAO_BIBLIOTECA_20261027.md` e `api-worker/CONTINGENCY.md`. Tarefa #4, leitura, HTML e identidade permanecem fora desta etapa.

## Biblioteca — tarefa #4, etapa 1 preparada para revisão (27/10/2026)

Branch existente utilizada: `work/ceb-biblioteca-etapa1-20261027`; sem criar outra branch remota. Editar abre o material preenchido e mantém o mesmo ID, com bloqueio de salvamento duplicado e preservação de pastas/escopo/status. Cartões com dados e ações reais; leitura e prévia/download HTML ampliado/resumido diretamente na Biblioteca sem substituir rascunho. Material aplicado, Lixeira e restauração mantidos. Sem botão de compartilhamento fictício; edição de importados que criava cópia foi retirada, pois não há edição do original na API.

Validação local: build e identidade aprovados; 19 testes unitários, 20 layouts de apresentações + fluxo React, e 16 verificações de integração da Biblioteca com API simulada. Nenhum acesso de teste ao Neon/Worker real. Modelos HTML aprovados intactos. Relatório: `docs/BIBLIOTECA_ETAPA1_VALIDACAO.md`.

Pendência importante para etapa posterior: o backend atual autoriza mutações do proprietário, inclusive se for aluno. A interface limita ações administrativas, mas a proibição de exclusão de aluno por chamada direta requer ajuste separado do Worker, não autorizado nesta etapa. Compartilhamento e demais itens de #4 permanecem fora do escopo. Não publicar sem autorização expressa do responsável.

## Complemento de segurança do PR #6 — revisão, sem publicação

Autorizada a preparação da correção mínima: DELETE/restauração de estudos e arquivos exigem sessão administrativa válida e permissão existente sobre o documento. Aluno proprietário recebe 403; administradores não ganham acesso a particulares de terceiros. Leitura/download, PUT próprio, Material aplicado, autenticação e regras atuais de upload permanecem. Dois guardas nos handlers; sem migração ou mudança de credenciais/configurações. Foram aprovados 125 testes locais, incluindo 60 novos casos diretos de Worker com PostgreSQL/armazenamento simulados. Empacotamento com `--dry-run` concluído. Plano de reversão preservando dados e a restrição: `docs/SEGURANCA_EXCLUSAO_RESTAURACAO.md`. Não publicar sem autorização expressa; a versão ativa do Worker não foi alterada.
