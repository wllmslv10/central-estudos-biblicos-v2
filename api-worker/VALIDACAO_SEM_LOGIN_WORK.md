# Validação do PR #3 sem login do agente no Cloudflare

## Decisão e estado

Preparar um segundo Worker, `ceb-biblioteca-api-validacao`, pela integração GitHub/Workers Builds que já é usada no projeto. Não mudar a integração do Worker `ceb-biblioteca-api`, sua branch de publicação, Hyperdrive, segredos ou domínio. Nenhuma publicação remota de teste ou produção foi feita ao preparar estes arquivos.

A integração existente com o Worker atual não concede ao agente acesso ao painel nem copia segredos para outro Worker. A configuração inicial do Worker separado exige intervenção do titular no painel, em uma sessão de configuração; não é um único clique. Após isso, pushes na branch do PR podem atualizar somente esse Worker de teste.

Não usar o workflow manual `Deploy CEB API to Cloudflare`: ele publica com a configuração de produção. Não colocar tokens Cloudflare, senhas Neon ou chaves S3 em código ou variáveis de build.

## Recursos e limites de isolamento

| Componente | Validação | Produção |
| --- | --- | --- |
| Worker | novo `ceb-biblioteca-api-validacao` | `ceb-biblioteca-api` intocado |
| Entrada | `validation-worker.js` | `worker.js` intocado |
| Configuração | `wrangler.validation.toml` | `wrangler.toml` intocado |
| PostgreSQL | branch existente `dev-ceb-cloud-materials-20261026`, ID `br-falling-thunder-b4saoifs` | branch `br-crimson-flower-b4m0g7mh` intocada |
| Host SQL | `ep-falling-fog-b4uyuofc.c-6.us-east-2.aws.neon.tech` | qualquer outro host é recusado pelo wrapper de validação |
| Papel SQL | `ceb_api_user`, banco `neondb`, TLS `verify-full` | sem alteração de papel/senha |
| Hyperdrive | nenhum: conexão direta segura ao Neon de testes | binding e configuração atuais intactos |
| Originais | bucket privado `ceb-materiais` no projeto exclusivo `ceb-arquivos` | bucket antigo no `ceb-biblioteca` intocado |
| Importação | `CEB_UPLOADS_ENABLED=false` inicialmente | não alterar |

A branch SQL de teste já existe e contém as tabelas da migração 003 (reconfirmadas somente por leitura). Ela é uma cópia anterior: pode conter estudos e usuários copiados, mas as escritas nela não são replicadas para a branch principal. Não alterar os materiais copiados; usar apenas contas e materiais técnicos identificados para testes.

**O Storage do projeto novo é compartilhado entre esta configuração de validação e a futura biblioteca. Não há isolamento por branch de Storage nesta proposta.** Ainda não há materiais de usuário importados pela nova API; existem amostras técnicas privadas. Antes de qualquer teste de escrita, confirmar novamente esse estado e que as tabelas `ceb_materials` da branch de teste não apontam para documentos de usuário. Usar apenas objetos novos com UUID; nenhum teste pode sobrescrever objetos existentes ou executar exclusão definitiva de documentos. A Lixeira é lógica. Se surgirem originais de usuário no projeto novo ou referências compartilhadas, isolar também uma branch de Storage antes dos testes, adaptando a lista de endpoints permitidos e sem alterar credenciais existentes.

O wrapper recusa um Hyperdrive anexado, qualquer outro host SQL, banco/papel diferente, TLS inseguro, opções SQL adicionais e o hostname do Worker de produção. Configuração ausente/inválida retorna 503 sem registrar credenciais. Não existe fallback para o banco principal.

## Configuração inicial pelo titular, no próprio navegador

1. Confirmar que a conta continua em **Workers Free** e a organização Neon em **Free**. Não aceitar assinatura, upgrade, cartão ou produto pago. O agente confirmou o Neon Free; o plano Cloudflare e a franquia restante precisam ser conferidos no painel, ao qual ele não tem acesso. A documentação informa Workers Free e 3.000 minutos/mês gratuitos de Builds; consumo compartilha as franquias da conta. Parar se a tela exigir pagamento.
2. Em **Workers & Pages**, escolher criar **outro Worker** por **Import repository / Connect GitHub**. Selecionar `wllmslv10/central-estudos-biblicos-v2`. Não editar o Worker existente.
3. Configurar:

   | Campo | Valor |
   | --- | --- |
   | Nome | `ceb-biblioteca-api-validacao` |
   | Branch de deploy | `work/biblioteca-nuvem-20261026` |
   | Root directory | `api-worker` |
   | Build command | `npm ci && npm test` |
   | Deploy command | `npx wrangler deploy --config wrangler.validation.toml` |

   Desabilitar builds de outras branches neste Worker de teste. Se a interface tentar usar a configuração padrão `wrangler.toml`, não publicar: o comando deve selecionar explicitamente `wrangler.validation.toml` e o nome deve ser o de validação. Não adicionar domínio/rota de produção. A integração pode gerenciar sua própria autorização de build no Cloudflare; não exportar tokens para o GitHub e não editar tokens existentes.
4. Publicar somente esse Worker separado. Ele deve retornar **503** até receber a configuração SQL de testes; isso é uma trava intencional, não motivo para anexar o Hyperdrive de produção.
5. Nesse **novo Worker**, abrir **Settings → Variables and Secrets** e adicionar três segredos de runtime, nunca variáveis públicas ou segredos de build:

   | Nome | Origem segura do valor |
   | --- | --- |
   | `CEB_VALIDATION_DATABASE_URL` | Neon → projeto `ceb-biblioteca` → branch `dev-ceb-cloud-materials-20261026` → Connect → banco `neondb`, papel `ceb_api_user`, conexão direta não pooled; conferir host da tabela acima e ajustar apenas o parâmetro para `sslmode=verify-full` |
   | `CEB_STORAGE_ACCESS_KEY_ID` | Neon → projeto `ceb-arquivos` → Connect → Storage → credencial já existente desse projeto |
   | `CEB_STORAGE_SECRET_ACCESS_KEY` | mesmo local; Reveal, nunca Rotate |

   Copiar diretamente dos painéis, sem enviar valores na conversa. Não ler/exportar os segredos do Worker de produção. Se a credencial SQL não estiver disponível, parar: não redefinir senha de papel, pois isso pode afetar a produção. Não copiar `CEB_BOOTSTRAP_SECRET`; o ambiente de teste pode usar contas já copiadas ou contas técnicas preparadas separadamente depois.
6. Manter `CEB_UPLOADS_ENABLED=false`. Compartilhar somente a **URL pública do Worker de validação** e o resultado de `/health`, sem cabeçalhos de sessão, chaves, strings de conexão ou screenshots com valores revelados.

## Portas de validação

1. CI: testes preservados, testes novos de isolamento, build/identidade visual e dry-run dos dois arquivos Wrangler.
2. Remoto inicial: `/health` confirma SQL de teste; configuração errada deve retornar 503; `/library/capabilities` deve exigir sessão. Ainda não comprova S3.
3. Confirmar inventário de metadados de teste e criar/selecionar usuários técnicos distintos somente na branch isolada. Validar leitura, permissões e trava de upload pelo Worker. Não coletar senhas/tokens na conversa.
4. Para testar upload real será necessário habilitá-lo **apenas no Worker de validação** depois da conferência de isolamento; enquanto isso não for feito, não é possível declarar upload completo validado. A importação de produção permanece bloqueada. A configuração versionada continua `false`, para que um próximo deploy volte a bloquear.
5. Testar PDF/DOCX/PPTX/HTML: upload, bytes no download, proprietário/outro admin/aluno, acesso anônimo negado, pastas, aplicado/data, Lixeira, restauração e reabertura em outro dispositivo. Testes S3 antigos e mocks não substituem essa etapa.
6. Apresentar resultados e limitações. Somente depois pedir confirmação específica de publicação em produção; não executar migração ou publicação de produção automaticamente.

## Fontes oficiais verificadas

- https://developers.cloudflare.com/workers/ci-cd/builds/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/
- https://developers.cloudflare.com/workers/platform/pricing/

Não habilitar R2, Functions, serviços de pagamento ou qualquer plano pago como parte desta alternativa.
