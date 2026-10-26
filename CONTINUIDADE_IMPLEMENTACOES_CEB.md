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
