# Matrícula e geração de questionários — liberação em 28/10/2026

## Verificações para publicação

O titular confirmou Workers Free e autorizou a ativação sem contratação de serviços pagos. Backup Neon `backup-ceb-pre-matricula-ia-20261028`, `br-late-credit-b4fc1t2v`, conferido como filho de produção `br-crimson-flower-b4m0g7mh`, ponto de origem `2026-10-28T11:29:40Z`.

Migração 005 validada sobre o backup em transação revertida: as 5 contas, 1 material e histórico de tentativas permaneceram idênticos; hashes e dados antigos comparados internamente, sem exposição. Colunas e tabelas novas não persistiram no backup. Compute mínimo necessário no backup foi suspenso após a verificação. Não foi criada branch nova.

O teste real detectou que o modelo fp8 inicialmente preparado rejeita JSON Schema. Corrigido para `@cf/meta/llama-3.3-70b-instruct-fp8-fast`, com suporte a JSON Schema e resposta estruturada em objeto. Foram geradas e validadas 3 e 10 questões sobre uma lição técnica do bom samaritano, sem dados pessoais; evidências, alternativas, referência e correção passaram pelo código do Worker. O rascunho continua exigindo revisão do professor. Respostas reais sem dados pessoais registradas como fixture de regressão. Nenhuma cobrança/plano/secreto foi alterado.

Ordem de liberação: migração 005 atômica com timeout; upload de versão do Worker preservando Secrets e bindings; implantação e verificação técnica; integração do PR #9 para publicação da interface existente no GitHub Pages. Em falha, restaurar Worker `388d74c6-4edb-46e2-9fc9-e69f5404a24a` e manter estruturas aditivas e dados. SHA oficial anterior `75322dceb5d3103ae6c1e6d5bf1c4f317dd5da56`.

A proteção contra implantação da branch antiga deve permanecer ativa. Não remover colunas/tabelas novas durante recuperação.

## Registro da preparação anterior (superado pelas verificações acima)

# Matrícula e geração de questionários — preparação em 28/10/2026

## Estado e recuperação

Versão oficial conferida antes das alterações: main `75322dceb5d3103ae6c1e6d5bf1c4f317dd5da56`; Worker `388d74c6-4edb-46e2-9fc9-e69f5404a24a`, 100% do tráfego. A branch existente `work/ceb-biblioteca-etapa1-20261027` é reutilizada. Nenhuma branch ou ambiente de nuvem novo foi criado.

**Publicação e migração de produção bloqueadas neste preparo.** A leitura do plano/subscrição Cloudflare retornou HTTP 403: o OAuth disponível não cobre Billing Read. O painel não carregou para confirmar o plano. Não se presume que a conta seja Free, não se habilita cobrança nem se executa inferência real nessas condições. A configuração preparada mantém `CEB_AI_FREE_CONFIRMED=false`; os testes da integração usam provedor simulado.

A tentativa de criar snapshot `ceb-before-enrollment-ai-20261028` retornou `snapshots limit exceeded`. O snapshot já existente `snap-round-cloud-b4asdjr3` é anterior aos questionários e não foi excluído/substituído. A migração 005 foi testada somente em PostgreSQL local, com dados técnicos, sem ser aplicada à produção ou à branch Neon de desenvolvimento nesta etapa. É necessário obter backup apropriado e recente antes da migração real.

Os identificadores acima permitem recuperar código e Worker; a reversão de publicação deve preservar as estruturas e históricos aditivos. Não executar exclusão de materiais, tentativas, notas, contas ou backups para liberar espaço automaticamente.

## Implementação preparada

- Gestão de Alunos dentro da Administração, usando `ceb_users` e a Área do Aluno existente. Sem cadastro paralelo. Nome obrigatório, sobrenome opcional, login único, nascimento opcional, ativo/inativo e senha definida pelo administrador.
- Novos campos aditivos de perfil e controle de revisão. Edição sem redefinição explícita preserva a senha. Contas criadas/resetadas pela matrícula recebem senha definitiva e `must_change_password=false`. A política nova exige 8–128 caracteres, rejeita controles e senha só de espaços; a sugestão DDMMAAAA permanece editável, com aviso de previsibilidade. O hash PBKDF2/salt existente e os logins antigos são preservados.
- Matrículas novas têm senha administrada exclusivamente pelo administrador. O endpoint de troca pessoal e os fluxos legados de reset/exclusão não podem contornar essa política. Contas antigas com senha temporária continuam compatíveis até uma redefinição administrativa explícita; editar só o perfil não limpa uma exigência de segurança anterior.
- Desativação é lógica, revoga sessões e preserva o ID, as respostas, as notas, as permissões e os dados locais vinculados ao ID. Reativação usa a mesma conta. A seção não altera nem exclui contas administrativas. Auditoria registra ator, operação e nomes dos campos, nunca senhas ou hashes.
- Integração preparada para `@cf/meta/llama-3.1-8b-instruct-fp8`, confirmado no catálogo/model schema oficial da Cloudflare. Usa binding Workers AI, sem nova chave nem provedor pago alternativo. A declaração do binding existe apenas na configuração da branch; nenhuma alteração no Worker publicado foi feita.
- Automático gera a quantidade escolhida; Misto acrescenta/substitui questões e permite edição manual. Gerar produz um rascunho, sem salvar/publicar automaticamente ou alterar questionários/tentativas anteriores. Revisão do professor é obrigatória antes da liberação.
- Fonte da geração vem do material salvo e autorizado no banco, nunca de um texto de lição arbitrário enviado pelo navegador. Validação exige 1–30 questões, quatro alternativas distintas, resposta única e evidência textual presente na fonte. Só são aceitas referências presentes na lição; referências novas, citações literais não verificadas e saída inválida são rejeitadas. A verificação não substitui a revisão bíblica e pedagógica do professor.
- Limites de 8 solicitações/dia na CEB, 3 por professor/dia e intervalo mínimo de um minuto, controlados por transação/reserva no banco. Falhas também consomem reserva, evitando tentativas ilimitadas. Nenhuma estimativa é apresentada como consumo real. A Administração mostra solicitações e tokens efetivamente informados pelo provedor; neurônios da conta ficam explicitamente indisponíveis quando não há acesso a esses dados.

## Migração 005

Adiciona campos em `ceb_users`, tabela de auditoria e tabela de uso da IA, índices e gatilho de auditoria nas tabelas novas. Não altera hashes, contas, roles, materiais, configurações de conexão, compartilhamentos ou resultados existentes. A migração é idempotente e deve ser executada atomicamente, com timeout de bloqueio, após backup e revisão de recuperação.

## Validação

Testes de PostgreSQL local e Worker real com conexões substituídas por banco técnico cobrem cadastro, unicidade, perfil, senha definitiva, compatibilidade de login antigo, alteração de senha só por administrador, revogação de sessões, desativação/reativação com histórico, integração com notas, validação da saída da IA e limites. Nenhum teste usou credenciais ou contas reais de produção.

O teste Chromium usa a interface compilada, o Worker e PostgreSQL local; apenas a inferência é simulada. Exercita matrícula, login na Área do Aluno existente, edição sem reset, geração automática e mista, revisão, compartilhamento, resposta, notas, resultados e desativação com preservação. A regressão dos questionários manuais continua no workflow `Validate CEB quizzes`.

## Pendências indispensáveis para liberação

1. Confirmar o plano/franquia Workers AI por acesso autorizado à informação de cobrança, garantindo que não haja cobrança adicional; depois ativar e testar a inferência real do modelo. Não contratar plano nem aceitar termos novos automaticamente.
2. Obter backup recente apropriado sem destruir os backups existentes; revisar a recuperação antes da migração 005.
3. Aplicar/testar a migração aditiva no fluxo seguro existente, conferir preservação e permissões, e só então integrar e publicar coordenadamente Worker/interface.

Documentação oficial consultada: https://developers.cloudflare.com/workers-ai/platform/pricing/ e https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct-fp8/ .
