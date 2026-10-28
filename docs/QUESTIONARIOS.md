# Questionários de múltipla escolha — CEB V2

## Uso

Na Biblioteca, abra um estudo, esboço ou material EBD salvo na nuvem com conteúdo e clique em **📝 Questionário**. O professor pode elaborar 1–30 questões, cada uma com quatro alternativas distintas, uma resposta correta e pontuação individual (padrão 1). As referências bíblicas e explicações são opcionais e devem ser conferidas pelo professor. Use **Visualizar e revisar**, marque a confirmação de revisão e salve. Sem revisão, o questionário permanece indisponível ao aluno.

Em **📤 Compartilhar**, habilite **Disponibilizar questionário aos alunos autorizados**. Essa opção independe de baixar a lição. O servidor exige que o questionário esteja salvo/revisado e reaplica o acesso da lição a cada consulta, início, gravação e entrega. Revogar a lição ou a opção do questionário impede novos acessos e envios. Cópias já recebidas e respostas anteriormente reveladas não podem ser retiradas da memória do destinatário.

Na Área do Aluno, abra a lição e **📝 Responder questionário**. As respostas são sincronizadas no servidor e há uma cópia de recuperação no navegador, separada por usuário/tentativa. Se houver falha de rede, não há anúncio de entrega sem confirmação do servidor. Antes de entregar, o aluno revisa as respostas e confirma. A nota é calculada exclusivamente no Worker. O gabarito e as explicações não fazem parte da resposta da API antes de uma entrega válida; após a entrega, só são enviados se habilitados pelo professor.

**📊 Resultados dos alunos** mostra autorizados, pendentes, iniciados/concluídos, tentativas, acertos, pontos, percentual, datas/horários de Brasília e respostas individuais. A maior nota é comparada pelo percentual, para manter comparabilidade quando o professor altera a pontuação em uma versão posterior. A média utiliza o melhor percentual de cada aluno autorizado que já entregou. O histórico de alunos cujo acesso foi revogado permanece disponível ao professor.

Políticas: uma tentativa; várias tentativas, mantendo a melhor; ou uma inicial com novas tentativas autorizadas individualmente. Uma autorização pendente é idempotente e libera apenas uma tentativa. Reabrir uma tentativa iniciada não cria outra. Entregas repetidas retornam o resultado já registrado, sem reavaliar nem duplicar o histórico.

## Geração automática

Não há serviço de IA configurado no Worker atual. Automático/Misto aparecem com aviso explícito de indisponibilidade e retorno ao modo manual; não há perguntas fabricadas, chamada simulada de IA, alteração de credenciais ou novo serviço pago. O endpoint de geração retorna 503 para o professor autorizado. Esta é uma limitação explícita, e não uma implementação de IA.

## Persistência e segurança

Migração `api-worker/migrations/004_quizzes.sql`: somente quatro tabelas novas, índices, funções/gatilhos nas tabelas novas e permissões para o papel existente. Nenhuma tabela/coluna anterior é removida ou alterada, nenhuma conta/material anterior é atualizado. O Hyperdrive e as credenciais permanecem iguais.

Cada salvamento guarda uma versão independente. Tentativas apontam para a versão original, preservando enunciado, alternativas, gabarito, pesos e resultado mesmo após edição pelo professor. Gatilhos nas novas tabelas impedem alteração/exclusão de versões e de entregas concluídas, além de exclusão de tentativas. Não há rotas para apagar resultados.

As rotas passam pela sessão e verificação de troca obrigatória de senha existentes. Consultas são parametrizadas; acesso administrativo é limitado a materiais gerais autorizados ou particulares próprios. Transações e bloqueios de estudo/questionário serializam início, envio e revogação. Índice único impede duas tentativas abertas do mesmo aluno/questionário. Revisões de edição e rascunho impedem sobrescrita silenciosa entre janelas. O estado de contingência existente continua bloqueando mutações.

## Recuperação e validação

- Projeto confirmado pelo host do Hyperdrive: `green-resonance-36660365`, banco `neondb`, produção `br-crimson-flower-b4m0g7mh`.
- Retenção de recuperação consultada: 21600 segundos. Snapshot anterior à migração: `snap-round-cloud-b4asdjr3` (`ceb-before-quizzes-20261028`), fonte produção e tamanho integral confirmados. Não foi executada restauração destrutiva nem criada branch para testar restauração.
- A migração foi validada em PostgreSQL local (PGlite), inclusive reaplicação idempotente, preservação das tabelas anteriores e gatilhos de histórico, e aplicada com sucesso na branch de desenvolvimento já existente `br-falling-thunder-b4saoifs`.
- Testes específicos: validação de questões, três políticas, snapshots de questões, cálculo no servidor, gabarito protegido, autorização selecionada/todos, revogação, edição concorrente por revisão, isolamento de tentativas e regressão do compartilhamento.
- Integração Chromium com API real dos questionários e PostgreSQL local: elaboração manual/revisão, limitação de IA, liberação independente de download, resposta/rascunho/entrega, resultados, autorização individual e layouts 390×844, 768×1024, 1366×900. Nenhum teste de aluno criou ou alterou dados reais de produção.
- Workflow `Validate CEB quizzes` mantém essas verificações no GitHub.

Recuperação de publicação: restaurar o Worker anterior e a interface anterior; manter as tabelas aditivas e todos os resultados. Não executar `DROP`, `TRUNCATE` ou exclusão de tentativas. Restaurar um snapshot antigo do banco pode descartar gravações posteriores e não é a primeira opção de reversão.
