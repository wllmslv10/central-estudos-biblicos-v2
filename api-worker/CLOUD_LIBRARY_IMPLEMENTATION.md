# Biblioteca online — Neon Free isolado

## Arquitetura vigente

- `ceb-biblioteca`: PostgreSQL atual preservado, para estudos/esboços/EBD, usuários, sessões, pastas, permissões, texto, aplicação, Lixeira e metadados.
- `ceb-arquivos`: novo projeto na organização Free, exclusivo para originais. ID `solitary-mountain-32451807`; branch `production`, ID `br-holy-lake-b5wmosos`; bucket privado único `ceb-materiais`.
- Worker `ceb-biblioteca-api`: autoriza cada operação, usa o Hyperdrive atual para os metadados e assina requisições S3 ao novo Storage. Segredos exclusivamente no backend.
- O Neon cria um banco vazio por padrão no projeto novo; ele não recebe conteúdo estruturado da CEB nem é usado pela aplicação.
- R2 não é ativado nem configurado no Wrangler. Adaptador e testes R2 mantidos como trabalho anterior, com seleção explícita somente nos testes isolados.

## Custo e credencial

Organização confirmada no plano `free` antes da criação. Projeto novo criado nela sem cadastro de cartão, assinatura ou upgrade. Franquia publicada de Object Storage: 5 GB por projeto; sem promessa de uso ilimitado. Reconfirmar plano/limites antes de qualquer futura mudança que gere cobrança.

A criação do projeto gerou automaticamente uma `Default object storage credential`, exclusiva da branch do projeto `ceb-arquivos`, com `storage:read` e `storage:write`. Apenas metadados consultados; segredo não foi revelado, salvo no repositório ou enviado na conversa. Não foram reutilizadas/alteradas credenciais de outros projetos.

O escopo do provedor continua sendo branch/descendentes, conforme exceção expressamente autorizada por William para o projeto isolado. Somente um bucket foi criado nesse projeto. Não criar outros buckets/dados nele.

## Configuração manual segura necessária

Ainda não há sessão Cloudflare autenticada utilizável pelo agente. Para instalar os valores sem enviá-los à conversa:

1. No Neon, selecionar **ceb-arquivos**, branch **production**.
2. Abrir **Connect → Storage → Parameters only** e **Reveal credential**, conforme disponível. Usar a credencial desse projeto novo; não rotacionar nenhuma credencial.
3. No Cloudflare, abrir **Workers & Pages → ceb-biblioteca-api → Configurações → Variáveis e segredos**.
4. Adicionar os dois valores abaixo como **Segredo** (não variável pública):

| Campo do Neon | Nome do segredo no Worker |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | `CEB_STORAGE_ACCESS_KEY_ID` |
| `AWS_SECRET_ACCESS_KEY` | `CEB_STORAGE_SECRET_ACCESS_KEY` |

5. Salvar os segredos. Não copiar `DATABASE_URL`, não alterar Hyperdrive, não trocar código pelo painel, não enviar valores na conversa e não criar tokens S3/assinatura R2.
6. O endpoint não secreto, provedor e trava `CEB_UPLOADS_ENABLED = "false"` estão no Wrangler do PR. Não liberar a trava antes de testes reais completos.

## Validação concluída

- Criação/inspeção do projeto isolado e bucket privado.
- Upload/download real no novo bucket por URLs temporárias do conector, sem manipular chaves permanentes: quatro amostras técnicas PDF/DOCX/PPTX/HTML, HTTP 200, bytes idênticos; acesso sem assinatura HTTP 403.
- Estes testes de transporte não comprovam a integração autenticada do Worker nem extração/renderização real dos documentos na UI.
- 45 testes locais: os anteriores preservados, mais assinatura S3/endereço do projeto isolado, bloqueio de configuração incorreta e trava explícita de importação.
- Build/identidade visual e dry-run Wrangler devem passar antes de publicar esta etapa.
- Migração `003_cloud_materials.sql` já testada no projeto original em branch isolada `br-falling-thunder-b4saoifs`, incluindo operações com papel `ceb_api_user` e ROLLBACK dos dados de teste. Não aplicada na produção.

## Pendências antes da ativação

1. Instalar os dois segredos por mecanismo seguro.
2. Validar o Worker em ambiente isolado com metadados de teste, usando a credencial nova, e acesso por usuários diferentes: upload/download, pastas, aplicação, Lixeira, recuperação e reabertura em outro dispositivo.
3. Reconfirmar backup/segurança da migração aditiva antes de aplicá-la em produção.
4. Publicar backend/frontend em sequência, com upload ainda bloqueado.
5. Liberar `CEB_UPLOADS_ENABLED` somente após validar o fluxo completo na nuvem.

A Lixeira mantém os originais no bucket; exclusão definitiva não está disponibilizada nesta etapa. Compensação de objeto só ocorre para um upload novo cujo registro comprovadamente não foi gravado. Amostras de transporte privadas de poucos KB foram mantidas em `_validation/20261026/`; nenhum documento do usuário foi excluído. O bucket antigo permanece intacto.

Lição sobre a tentação de Jesus, identidade visual, gerador HTML e leitura preservados. Issue #4 continua bloqueada até a biblioteca online ser concluída.
