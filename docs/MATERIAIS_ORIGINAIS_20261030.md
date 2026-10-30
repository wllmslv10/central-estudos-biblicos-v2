# Materiais Originais e Materiais Aplicados — 30/10/2026

Branch: `work/ceb-materiais-originais-20261030`.
Base: `ab8c1f722791bde34174bb1a394a34f9cc6289bd` (main).
Implementação sem publicação, migração ou gravação em produção.

## Funcionalidades

- Nova seção Materiais Originais no menu: reúne PDF, Word DOCX e HTML no mesmo cartão. Até 12 anexos, respeitando o limite existente de 20 MB por arquivo.
- Seleção de originais já importados ou upload de arquivos novos pelo armazenamento privado atual. Uploads são sequenciais; os concluídos ficam disponíveis mesmo se o salvamento do cartão falhar.
- Visualização de PDF e HTML. O HTML é entregue diretamente ao iframe isolado, sem passar pelo gerador de apresentações ou extração de texto. DOCX abre no aplicativo compatível por download.
- Download e envio do arquivo original pelo compartilhamento nativo. O usuário prepara o arquivo e depois toca em compartilhar, preservando o gesto exigido pelos navegadores. A chamada contém arquivo e título, sem URL. Se o recurso não estiver disponível, baixa para anexação manual ao WhatsApp.
- Edição de título, identificação, visibilidade e anexos; lixeira lógica do cartão, sem exclusão de originais ou resultados.
- Questionários usam TeacherQuiz/StudentQuiz e as rotas atuais: editor, correção no servidor, resultados e histórico. Não foi criado um motor paralelo de notas.
- Compartilhamento interno usa a janela e a rota existentes: todos os alunos ou seleção de alunos ativos, permissão de download e liberação de questionário revisado. O servidor preserva permissões durante a edição de conteúdo.
- Material aplicado e data no cartão. Nova seção Materiais Aplicados consulta apenas id, título, identificação, data e origem, por projeção SQL, sem conteúdo, texto extraído ou objetos. Inclui estudos CEB e documentos importados, permite corrigir a data e desmarcar.

## Integração e proteção

`originalBundle` é um campo aditivo no JSON de `ceb_studies`, referenciando IDs de `ceb_materials`. Não requer novas tabelas, migrações ou credenciais.

O servidor valida os anexos em POST/PUT de estudos: propriedade ou acesso administrativo à biblioteca geral, existência, estado fora da lixeira e limites. Nome e MIME são recuperados do banco, sem confiar nesses dados do cliente.

As rotas `/library/originals/:studyId/files/:fileId/view|download` conferem o vínculo e as permissões atuais a cada requisição, inclusive após revogação. Anexos ou cartões na lixeira ficam indisponíveis. Um administrador não obtém acesso a um cartão particular de terceiro apenas por seu papel. Word exige permissão de download também na rota de visualização.

HTML não executa na origem da API. A resposta é attachment, octet-stream, no-store e CSP sandbox. O cliente o exibe em iframe sem allow-same-origin, sem modificar sua marcação. Os bytes armazenados e baixados não são reescritos.

Nenhum arquivo dos materiais aprovados, logomarcas, geradores de apresentação, CSS existente ou apresentações foi editado. O novo código apenas acrescenta seções e integração na área do aluno.

## Verificação direcionada

- `npm run build`: TypeScript e build aprovados. Permanece o aviso de tamanho do bundle; não foi feita otimização fora do escopo.
- `node --test api-worker/test/originals-new.test.js`: verificações novas com Postgres local PGlite e armazenamento técnico; bytes iguais, seleção/todos, download, revogação, privacidade, lixeira, metadados leves e validação de vínculo.
- O segundo cenário cria um cartão original e seu questionário pelo Worker real com banco local, compartilha com aluno selecionado, entrega uma resposta e confirma 100%. Depois edita as informações do cartão e verifica a preservação integral da entrega, nota e permissões.
- `node scripts/test-originals-ui.mjs`: fluxo novo em Chromium, API interceptada e dados fictícios; criação do cartão, HTML técnico com cor e dinâmica, compartilhamento nativo simulado recebendo somente arquivo/título, download alternativo, edição/desmarcação em aplicados sem consultas de conteúdo e ausência de erros de página. Permite `CEB_TEST_CHROMIUM` para indicar um executável local.
- Nenhuma suíte antiga foi executada. As falhas encontradas ao preparar o cenário local de questionário foram corrigidas no fixture (migração de usuários e rowCount do adaptador PGlite), sem mudança nas funcionalidades antigas.
- Nenhuma escrita em Neon, Storage de produção, usuários, questionários ou permissões existentes.

## Limitações e publicação pendente

1. O arquivo específico da apresentação aprovada de 28 slides não está versionado como HTML neste checkout. Seu conteúdo não foi acessado nem alterado. A verificação de estilo/interação utilizou HTML técnico; não substitui a conferência visual desse arquivo exato em dispositivo de uso.
2. Recursos relativos de um HTML (imagens, CSS e scripts em arquivos separados) exigem recursos incorporados ou URLs absolutas. O iframe isolado pode limitar armazenamento local, navegação de página inteira ou outras APIs do documento; não se promete compatibilidade irrestrita com qualquer HTML. O original baixado continua intacto.
3. Compartilhamento nativo e download foram testados com interceptação em navegador, sem envio real a pessoas. A disponibilidade do WhatsApp e a aceitação de cada formato dependem do dispositivo. Não há compartilhamento por links.
4. Word antigo .doc não é aceito pelo importador existente. DOCX depende de aplicativo compatível para leitura.
5. Visualização de conteúdo não é DRM; a permissão controla o botão e a rota de download, sem tornar impossível copiar conteúdo já exibido ou arquivos já recebidos.
6. Marcar um cartão original não marca automaticamente os anexos individuais. A exclusão do cartão é lógica; os originais continuam na área de importação e na infraestrutura de recuperação existente.
7. Para publicação: conferir o HTML exato de 28 slides e o envio no celular; revisar esta branch e promover o Worker e a interface de forma coordenada. A interface nova depende das rotas novas. Não publicar somente o frontend contra o Worker antigo.
8. O workflow protegido atual do Worker aceita somente `work/ceb-biblioteca-etapa1-20261027`; esta branch não pode ser implantada por ele sem posterior preparação da promoção autorizada. Nenhum workflow foi modificado.

## Isolamento da branch

Consulta somente de leitura aos gatilhos atuais da Cloudflare confirmou: Worker oficial ligado a `feature/sincronizacao-nuvem-ceb`; Worker de validação ligado a `work/biblioteca-nuvem-20261026`. A nova branch não corresponde a esses gatilhos. GitHub Pages é publicado por push em main; esta branch não aciona esse workflow. Não foi aberta PR para evitar disparar as suítes antigas configuradas para pull_request.
