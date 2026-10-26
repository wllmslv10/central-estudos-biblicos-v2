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
