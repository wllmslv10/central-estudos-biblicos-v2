# Biblioteca de Materiais — etapa 1 da tarefa #4

Branch única: `work/ceb-biblioteca-etapa1-20261027`. Base conferida: `f7e9622aee0971e84f6ac87b86543786cf2bfe0b`, que já integra o PR #5. Nenhuma publicação em produção autorizada ou executada nesta etapa.

## Resultado

- Editar abre diretamente o modo manual com todos os campos existentes. Não passa pela escolha de preparação, que antes zerava a lição ao selecionar manual.
- O mesmo `cloudId` é utilizado no PUT. Pasta (`folderPath` e demais campos originais), escopo, propriedade do registro e status de publicação são preservados. Não há fallback para POST em caso de falha. Cliques repetidos durante o salvamento são bloqueados; a falha preserva o rascunho para tentar novamente.
- Após confirmar a resposta do servidor com o mesmo identificador, a edição retorna à seção da Biblioteca de origem. A resposta de um salvamento anterior não deve substituir um novo editor aberto durante a requisição.
- Cartões dos estudos, esboços e materiais EBD mostram tipo, título, texto bíblico, tema, curso quando aplicável, quantidade de pontos e data de atualização disponível. A faixa agrupa Ler, Ver HTML, Gerar HTML, Editar e Excluir, respeitando as capacidades disponíveis. Material aplicado e data opcional permanecem.
- Ver HTML abre uma janela diretamente na Biblioteca, com escolha Ampliado/Resumido e download do modelo selecionado. Gerar HTML no cartão baixa o modelo padrão do documento (ampliado na EBD). Leitura e apresentação têm seleção independente do rascunho do editor e não gravam nem duplicam materiais.
- A apresentação é gerada a partir do conteúdo do registro salvo. O roteiro aprovado de 25 slides, mantido como amostra separada, não é injetado silenciosamente na lição do banco: anteriormente foi verificado que as duas fontes possuem redações diferentes. Este PR mantém exatamente o gerador aprovado, não modifica nem funde fontes.
- Importados oferecem leitura, download do original e HTML do texto extraído quando existe texto. Esses HTMLs não prometem reproduzir a paginação/layout do PDF/Word original. Foi retirada a opção antiga de editar uma cópia: a API atual não oferece edição do arquivo original no lugar. Não há botão Editar de importados que crie outro estudo implicitamente.
- Compartilhar não é exibido nem simulado. Compartilhamento/revogação, permissões PDF e distribuição na pasta Lições dos alunos exigem etapa própria de frontend e servidor.
- Excluir aparece somente na interface administrativa, exige confirmação e usa a rota atual de exclusão lógica/Lixeira. Não há nova rota de remoção permanente. Restauração existente preservada.

## Limite de segurança preexistente — pendência da API

Esta etapa **não altera o Worker**, conforme instrução expressa. A inspeção de `api-worker/worker.js` mostrou que a autorização atual de mutações em estudos aceita proprietário ou administrador autorizado; `api-worker/materials.js` também aceita proprietário para seus arquivos. Portanto um aluno proprietário ainda pode ser autorizado por essas rotas, embora a interface de aluno não ofereça Editar/Excluir.

A regra da tarefa #4 de impedir exclusão de aluno **também por chamada direta à API** não pode ser declarada concluída com uma mudança apenas de interface. É necessário ajuste e teste do Worker em uma etapa explicitamente autorizada, antes de declarar essa política administrativa integralmente aplicada e antes do compartilhamento com alunos. Nenhuma chamada real foi feita para explorar essa condição.

A propriedade e o controle de acesso existentes não foram ampliados por este PR. Os controles administrativos dos cartões verificam os metadados retornados pelo servidor. A Área do Aluno e o menu superior permanecem como estão.

## Validação realizada

Todos os testes funcionais abaixo usam apenas contas/documentos técnicos e **API simulada**, com bloqueio de requisições reais ao backend. O título da lição preservada é usado em uma fixture com texto técnico, nunca seu conteúdo ou identificador real.

- Build TypeScript/Vite: aprovado. Continua o aviso de tamanho do bundle já existente; não é erro de compilação.
- Proteção de identidade visual: aprovada; nenhum arquivo de imagem ou logomarca foi alterado.
- 19 testes unitários do gerador: aprovados.
- Regressão existente de apresentações: 20 layouts dos dois modelos + fluxo React compilado, todos aprovados.
- 16 verificações de integração da Biblioteca: aprovadas, executadas pelo script `node scripts/test-library-ui.mjs` contra o aplicativo compilado.
- Editar EBD, estudo e esboço diretamente; reabrir os campos completos; PUT no mesmo ID; nenhum POST para edição; duplo clique não duplica; escopo privado, status publicado, pastas e seções adicionais conservados.
- Falha simulada HTTP 503: não anuncia sucesso, mantém os campos e não cria registro; a nova tentativa usa o mesmo ID.
- Leitura e prévia dos dois modelos não substituem o rascunho. Download HTML corresponde ao documento e ao modelo selecionados.
- Material aplicado/data via PATCH; cancelamento de exclusão sem requisição; confirmação envia à Lixeira; restauração sem duplicar.
- Importados sem edição implícita de cópia e com prévia do texto extraído.
- Cartões e janela HTML em 1366×900, 1024×768, 768×1024 e 390×844, sem transbordamento horizontal. Chromium emulado; não houve ensaio físico em tablet.
- Conta aluno permanece na Área do Aluno, sem botões Editar, Excluir ou Compartilhar. Isso valida a interface, não substitui a pendência de autorização na API acima.

A estrutura do modo de leitura foi comparada com a base e permanece igual, exceto a variável de origem dos dados selecionados. `src/presentation.mjs` e `src/presentation.d.mts` permanecem idênticos à base. Nenhuma alteração em `src/cebApi.ts`, `src/CebAluno.tsx`, `api-worker/`, credenciais, Neon ou configurações de importação.

## Próximas etapas, fora deste PR

- Compartilhamento real com alunos/administradores e revogação; PDF opcional aplicado pelo servidor; política administrativa de edição/exclusão nas rotas.
- Edição de arquivos importados no lugar, quando existir suporte do backend.
- Demais itens de #4 (reorganização de categorias, somente Salvar nas áreas de criação, encaminhamento automático de novos conteúdos e ampliação de categorias importadas) devem ser tratados separadamente. Não fechar a tarefa #4 com este PR.
- Avaliação e autorização do responsável antes de integrar ou publicar a interface oficial. Nenhum serviço pago ou nova infraestrutura foi criado.
