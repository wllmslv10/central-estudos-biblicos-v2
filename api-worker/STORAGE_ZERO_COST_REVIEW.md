# Armazenamento da CEB — revisão de despesa zero

Verificado em 26/10/2026. Esta decisão posterior suspende a orientação de ativar o Cloudflare R2. Não habilitar R2, informar cartão, aceitar assinatura, contratar plano ou criar credencial mais ampla sem nova autorização específica.

## Fatos confirmados

- Organização Neon de William: plano `free`, verificado pelo conector (somente metadados).
- Projeto existente: `ceb-biblioteca`; Object Storage habilitado em Ohio.
- Bucket existente `ceb-materiais`: privado.
- Plano Free publicado: 1 GB de PostgreSQL por projeto; 5 GB de Object Storage por projeto, separados; 5 GB de transferência pública por projeto/mês e 100 CU-horas de PostgreSQL por projeto/mês. Existem limites de uso e disponibilidade: gratuito não significa ilimitado.
- A franquia de Object Storage soma o armazenamento das branches do projeto; não há uma nova franquia de 5 GB para cada branch/bucket.
- Plano Free não requer cartão. A documentação informa que não cobra excedentes do Free; limites podem bloquear/suspender operações. Manter o plano Free e nunca habilitar upgrade automático/pago.
- R2 possui franquia gratuita, mas é um serviço com assinatura e cobrança por uso além da franquia; não foi confirmado como uma solução que atenda à exigência de não assumir risco de cobrança. Não ativar.

## Segurança e impedimento atual

A API Neon emite credenciais de armazenamento ancoradas em uma branch e válidas também nas descendentes. Não há campo para restringi-las a `ceb-materiais`. `storage:write` inclui leitura e operações de objetos; não é uma credencial PostgreSQL ou administrativa de outros projetos.

A autorização anterior exigiu limitar a credencial ao bucket. Não criar nem reutilizar/extrair uma chave de escopo maior como forma de contornar essa condição. Nome fixo de bucket no código, URL assinada e injeção automática de segredo em outra função não reduzem o escopo da credencial subjacente.

Não foram criadas, alteradas ou revogadas credenciais, nem aplicadas migrações em produção nesta revisão.

## Alternativas que exigem decisão antes de produção

1. **Neon atual:** aceitar explicitamente a credencial dedicada de armazenamento por branch (limite real do provedor), na branch da CEB que atualmente contém apenas o bucket `ceb-materiais`. Menor mudança e uso do bucket já existente. Continua podendo alcançar outros buckets que futuramente sejam criados nessa branch/descendentes; não equivale à restrição por bucket.
2. **Neon isolado:** projeto Free separado, dedicado exclusivamente aos originais, contendo apenas o bucket de materiais. PostgreSQL, usuários e metadados continuam no projeto atual. A credencial continua sendo por branch no projeto isolado; o isolamento reduz seu alcance sem afirmar um limite por bucket inexistente. Não criar o projeto/chave sem autorização, pois altera a arquitetura e requer aceitar explicitamente esse limite de escopo.

A segunda alternativa é uma proposta técnica baseada nos limites publicados, ainda não provisionada/validada. Não é garantia de disponibilidade futura da franquia nem de configuração já operacional.

## Continuidade e critérios

- Preservar integralmente o trabalho do PR #3 e os testes existentes. O adaptador R2 permanece preparado na branch, mas não deve ser publicado/ativado por enquanto.
- Confirmado PR #3 ainda rascunho, com head `9aba425c38f19f5b094b451de13ad8068ac48468` antes desta atualização documental. Testes anteriores não comprovam armazenamento real na nuvem.
- Após decisão: adaptar somente o armazenamento, configurar segredos por mecanismo seguro, testar em ambiente isolado e só depois migrar/deploy em produção.
- Verificar upload/download real dos quatro formatos, bytes, autorização de usuários diferentes, pastas, Material aplicado, Lixeira, recuperação e reabertura em outro dispositivo.
- Importação continua desabilitada até validar a nuvem. Não modificar gerador HTML, modo de leitura nem iniciar issue #4 antes de concluir a biblioteca.
- Preservar a lição sobre a tentação de Jesus e identidade visual aprovada.

## Fontes oficiais

- https://neon.com/pricing
- https://neon.com/docs/storage/overview
- https://neon.com/faqs/free-plan-limits-and-quotas
- https://neon.com/docs/storage/authentication
- https://api-docs.neon.tech/reference/createcredential
- https://developers.cloudflare.com/r2/pricing/
- https://developers.cloudflare.com/r2/get-started/

## Decisão posterior autorizada e executada

William autorizou explicitamente criar `ceb-arquivos` no plano Free e aceitar a credencial de armazenamento por branch nesse projeto isolado. Projeto `solitary-mountain-32451807`, branch `br-holy-lake-b5wmosos`, bucket privado único `ceb-materiais` criados. Não houve cartão, upgrade ou ativação R2. Dados estruturados permanecem em `ceb-biblioteca`; o bucket anterior não foi excluído.

A credencial de armazenamento foi gerada automaticamente pelo Neon com o projeto; apenas seus metadados foram consultados. A instalação no Worker exige copiar diretamente do painel Neon para os segredos Cloudflare, sem passar pela conversa. Procedimento atualizado em `CLOUD_LIBRARY_IMPLEMENTATION.md`.
