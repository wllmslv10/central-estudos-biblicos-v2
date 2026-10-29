# Biblioteca — exclusão e Lixeira unificada (29/10/2026)

Preparação na branch work/ceb-biblioteca-etapa1-20261027, a partir de
be1b17cbeb2e3c43469fedaa7774d9da295c00ec. Sem publicação, migração, acesso ao Neon
ou alteração de main/credenciais/serviços. Importação e seus testes aprovados
foram aproveitados, não refeitos.

## O que existia e o que foi acrescentado

A Biblioteca já movia estudos (inclusive EBD/apresentações) e originais importados
para deleted_at, com restauração individual. Foram reaproveitados esses caminhos.
Agora o painel UnifiedTrash reúne esses itens e os questionários vinculados.
Oferece checkboxes individuais, seleção múltipla/todos, Restaurar selecionados,
Excluir definitivamente selecionados, Restaurar todos e Limpar Lixeira.
Confirmações destrutivas informam a quantidade exata, com aviso de irreversibilidade
e preservação dos históricos. Cancelar não envia requisição. Cliques concorrentes
ficam bloqueados. A seleção é congelada antes do envio, dividida em lotes de 25
itens explícitos; materiais que chegarem depois não entram na operação.

Todos os cartões de materiais salvos mantêm Excluir (apenas Lixeira). No painel
Questionário do professor, Excluir questionário move sua definição salva para a
mesma Lixeira, independentemente da lição. Uma definição em rascunho já salva
pode ser excluída; perguntas ainda não salvas permanecem rascunho do editor.
Questionários existentes continuam acessíveis ao professor mesmo se a lição não
possuir texto suficiente para geração automática.

## Permissões e vínculos

/library/trash exige sessão administrativa válida no servidor. Não aceita papel
informado pelo cliente. Respeita propriedade, pastas particulares e Biblioteca
geral. A seleção inteira é autorizada antes de qualquer mutação; cada item é
novamente conferido sob bloqueio antes da operação. Rotas legadas de Lixeira
não dão acesso aos alunos. Nenhum gabarito é incluído na listagem da Lixeira.

Excluir uma lição oculta seu questionário vinculado sem alterar definição,
compartilhamento, notas ou tentativas. Na Lixeira, o questionário aparece identificado
com sua lição. Restaurar conserva os vínculos e permissões originais; restauração
em lote processa primeiro as lições. Para remover definitivamente uma lição com
questionário ainda existente, selecionar também o questionário: um item não
selecionado não é eliminado implicitamente. A exclusão definitiva processa os
questionários antes das lições. Em falha parcial, os itens não concluídos ficam
identificados; não é apresentado sucesso global indevido.

Aluno deixa de receber o botão Responder questionário para definição na Lixeira;
o Worker também bloqueia consulta, início e envio, inclusive a partir de tela já
aberta. As mesmas regras de acesso e tentativas continuam válidas após restaurar.
Uma nova edição válida pode ser criada após a exclusão definitiva do questionário,
sem sobrescrever suas versões históricas ou recalcular resultados anteriores.

## Significado da exclusão definitiva e retenção de histórico

A exclusão é definitiva no catálogo da Biblioteca e da Lixeira: o item deixa de
ser listado e nenhuma rota de restauração pode recuperá-lo. NÃO é um mecanismo
de expurgo físico de todo o banco. Registros internos são retidos para integridade,
auditoria e referências existentes. Versões de questionários e tentativas continuam
imutáveis e não são apagadas. Não se removeram triggers, FKs ou proteções existentes.

Sem criar colunas/tabelas: deleted_at finito continua sendo Lixeira; infinity é
um estado terminal do catálogo; -infinity identifica exclusivamente a remoção de
original ainda pendente. Questionários usam marcador interno controlado pelo
servidor em definition._libraryTrash, fora do conteúdo entregue ao aluno e das
versões históricas. Nenhum desses valores é controlável pelo formulário público.

Para documentos importados, a exclusão definitiva também remove o objeto original
do Storage, somente pela chave exata materials/{owner}/{id}/original. Não há
remoção de prefixo, bucket ou chave fornecida pelo navegador. Estado pendente é
persistido antes da remoção externa; restauração e download ficam bloqueados.
Só após sucesso da remoção o catálogo passa ao estado terminal. Se Storage ou
finalização SQL falhar, a Lixeira informa pendência e permite concluir posteriormente,
sem restaurar um registro sem arquivo. Remoção repetida de objeto já ausente é
idempotente. Configuração de Storage é validada antes de iniciar essa fase.

Documentos não selecionados, dados de matrícula, pastas, permissões e resultados
não são atualizados. Nenhuma exclusão real em produção foi executada nesta etapa.

## Verificações direcionadas novas

- scripts/test-unified-trash.mjs: Worker real, Postgres/PGlite local e Storage
  em memória; autenticação/perfis, seleção inteira e privacidade, confirmação da
  quantidade, exigência de Lixeira antes da remoção, restauração simples e em lote,
  questionário independente, revogação de acesso/envio do aluno, seleção de todos,
  dependências, bloqueio das rotas legadas após remoção terminal, preservação exata
  de versões/notas/respostas e de documento não selecionado, falhas de Storage e
  finalização, restauração insegura bloqueada, conclusão idempotente, configuração
  ausente e criação de nova edição mantendo as versões anteriores. A flag de
  upload fica false e o teste não chama a importação.
- scripts/test-unified-trash-selection.mjs: helpers efetivamente usados pelo painel;
  seleção individual/múltipla/todos, cancelamento/confirmação com quantidade,
  snapshot, deduplicação, lotes limitados e ordem de dependências.
- Recuperação compatível: montagem local sem a rota de exclusão em lote, com
  bloqueios para estados terminais e questionários removidos; o Worker recuperado
  foi exercitado no mesmo banco local, negando restauração/acesso indevidos.
- TypeScript/Vite compilados com sucesso; sintaxe e whitespace verificados.
- Worker candidato e recuperação compatível empacotados com Wrangler --dry-run,
  ambos mantendo a flag de uploads false, sem implantação.
- scripts/build-trash-offline-preview.mjs gera HTML autocontido do componente real
  para revisão visual em Windows, sem instalação, dados pessoais ou rede (CSP
  connect-src none), com respostas explicitamente simuladas. Não é teste real.
- Testes de importação, IA e a bateria anterior não foram repetidos. Não se declara
  teste visual em navegador nem exclusão real no Storage a partir desses testes locais.

## Publicação futura

Depende de aprovação do novo SHA, integração e autorização específica para Worker,
interface e liberação de uploads. A main, Neon e produção permanecem intactos e a
flag continua false. Nenhuma migração nova é necessária para a Lixeira. A migração
006 da importação já aplicada não deve ser repetida. A cópia oficial e o mecanismo
de recuperação no histórico são preservados. Após o uso da exclusão definitiva, NÃO restaurar cegamente o Worker antigo
6837e3db, pois ele não conhece os novos estados terminais. O script
`prepare-library-safe-recovery.mjs` prepara a API anterior com esses bloqueios,
sem a nova exclusão em lote e com uploads false. Antes da publicação definitiva
autorizada, empacotar e registrar essa versão de recuperação na Cloudflare,
preservando bindings e fixando explicitamente uploads false; não herdar a flag
true de uma versão a ser revertida. A interface pode voltar ao artefato exato
original, atendida por esse Worker compatível. Não desfazer o esquema nem
restaurar banco sobre dados atuais. Nenhuma versão de recuperação foi publicada
nesta preparação.
