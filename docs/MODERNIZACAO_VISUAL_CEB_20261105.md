# Modernização visual da CEB — 05/11/2026

Branch: `work/ceb-modernizacao-visual-20261105`.
PR: https://github.com/wllmslv10/central-estudos-biblicos-v2/pull/28
Base de segurança: `2b7330e0f71de24570fc6934d4cfc4f32b18025b`, posterior ao início da auditoria do PR #27. Inclui o bloqueio de todas as rotas administrativas antes da troca obrigatória de senha.

## Escopo e componentes

A mudança utiliza a aplicação React existente. Não cria outro sistema de estudos, outro cadastro ou outro mecanismo de apresentações.

- `src/WorkspaceNavigation.tsx`: menu lateral único. Computador acima de 1024 px: expandido ou recolhido, com preferência guardada no navegador. Tablet/celular: gaveta com botão Menu, fundo de fechamento, Escape, foco contido e retorno ao botão de abertura. A seção ativa tem indicação visual e `aria-current`.
- `src/TeacherDashboard.tsx`: acessos para preparação, retomada de rascunho, EBD, importação e biblioteca. Materiais recentes vêm dos registros já autorizados e são ordenados por `updated_at`. Não há contadores inventados. Sem documentos: mensagem e ação para importar. Sem rascunho: continuação desabilitada com explicação.
- `src/App.tsx`: integra os componentes sem mudar as rotas de API. Abrir/recolher menu não invoca a mudança de seção nem recria o editor. Ao retomar documento salvo utiliza o mesmo vínculo de edição. Administração permanece no mesmo espaço de trabalho, conservando o estado anterior ao voltar.
- `src/workspace.css`: camada visual após os estilos existentes. Mantém azul IBNE #2563A6, marinho, detalhes dourados, fundos claros, imagens originais e tipografia existente. Reorganiza a página inicial, formulários, cartões, botões e diálogos. O grupo único de ferramentas fica antes dos campos; no computador permanece acessível durante a rolagem, com Salvar destacado. As regras principais ficam limitadas ao espaço do professor; login e diálogos recebem ajustes visuais compatíveis.
- `src/CebAdmin.tsx`: somente semântica do contêiner (`section`) para evitar um `main` aninhado; nenhuma operação administrativa foi modificada.
- `src/main.tsx`: importa a camada visual e identifica o aviso de laboratório para que ele não fique atrás do menu lateral.

A Leitura Interativa, a extração, o paginador, as três modalidades, o conteúdo de slides e os HTML aprovados não foram reescritos. O estilo do documento HTML portátil gerado permanece no mecanismo validado.

## Comparação visual

O estado anterior foi registrado sem modificar a branch de referência: login, início, biblioteca, formulário e administração, nas resoluções 1366×768, 768×1024 e 390×844. Depois foram registrados os mesmos estados e também acervo, importação e menu recolhido/aberto.

Principais diferenças:

| Antes | Agora |
|---|---|
| Opções de trabalho distribuídas em navegação horizontal e barra móvel | Menu lateral único, recolhível no computador e em gaveta nas telas menores |
| Banner ocupando grande parte do início | Apresentação mais compacta, com a mensagem e a identidade preservadas |
| Início concentrado na apresentação institucional | Ações de preparação, retomada, EBD, importação e documentos recentes |
| Botões de cadastro/consulta com hierarquia visual variável | Ações, campos e cartões com espaçamento e cores consistentes |
| Administração fora do contexto da área de trabalho | Administração integrada ao mesmo menu e área central |

## Publicação com comparação e retorno

- Interface validada: https://ceb-biblioteca-api-validacao.wllmslv10.workers.dev/central-estudos-biblicos-v2/
- Prévia visual: https://ceb-biblioteca-api-validacao.wllmslv10.workers.dev/central-estudos-biblicos-v2/visual/

O workflow `preview-ceb-visual.yml` compila a interface anterior a partir do SHA fixo da base e a mantém no endereço original. Compila a nova com base `/central-estudos-biblicos-v2/visual/` e inclui os dois conjuntos de assets no mesmo Worker de validação.

Antes de publicar, verifica duas vezes se a branch de referência ainda aponta para `2b7330e`. Se ela avançar, o deploy é bloqueado: primeiro incorporar e validar a atualização; não substituir silenciosamente código mais recente. Verifica também que API, geração de slides, leitura HTML e cliente da API continuam sem diferenças da base.

Os dois layouts usam a mesma API e os mesmos dados do laboratório autorizado. A separação é visual; não são dois bancos independentes. Um material salvo ou editado em um layout é o mesmo material no outro. Rascunhos e preferências já existentes no navegador continuam sujeitos ao armazenamento local da CEB. Não usar as duas interfaces simultaneamente para editar o mesmo documento.

Para comparar ou voltar ao layout anterior, basta abrir o endereço sem `/visual/`. O novo layout não é publicado no GitHub Pages oficial. Não há merge automático, migração de banco, alteração de credenciais, troca de senha ou reinicialização de contas nesta etapa.

## Validação

- Frontend: 44 testes existentes aprovados.
- API: 212 testes existentes aprovados; o código da API permanece idêntico à base.
- TypeScript/Vite, verificação de identidade por hashes e `git diff --check`: aprovados.
- `test-visual-workspace.mjs`: estados visuais, navegação, formulário preservado ao fechar/abrir menu, retomada do rascunho, acesso à biblioteca/acervo/importação/administração, retorno pelo logotipo, três resoluções, ausência de erro JavaScript e ausência de gravação no backend. Usa respostas sintéticas da API.
- Regressões existentes de biblioteca, leitura e três modalidades, originais, questionários, alunos e indicadores dos questionários passaram localmente. O roteiro antigo da biblioteca passou a procurar o nome do menu lateral único, mantendo as verificações de autorização, edição e exclusão.
- O workflow também executa as regressões de navegador e preserva capturas e resultados como artefatos por 14 dias.
- `test-visual-live.mjs`: verificação autenticada e somente de leitura no laboratório publicado. Bloqueia chamadas à API oficial e qualquer método de escrita que não seja login/logout. Encerra somente suas próprias sessões técnicas.

Publicação confirmada pelo workflow https://github.com/wllmslv10/central-estudos-biblicos-v2/actions/runs/42064442457, no commit de interface `6aa8fe579355cd748199885b1f93562ce54132dc`. Os dois endereços responderam após a publicação. Todas as regressões incluídas no workflow passaram.

Verificação remota autenticada concluída em 05/11/2026 às 13:28 (Brasília), em 1366×768, 768×1024 e 390×844: navegação, biblioteca e administração aprovadas; sem erro JavaScript, transbordamento horizontal, chamada à API oficial ou gravação nos dados. Apenas login/logout da própria conta técnica de teste; `william` não foi utilizado nem modificado. A interface anterior foi aberta e conferida no mesmo teste. A aceitação da CA do proxy ocorreu somente no contexto de verificação deste ambiente; nenhuma política TLS da CEB foi alterada.

Evidências: [navegação local](visual-ceb-20261105/navegacao.json) e [laboratório autenticado](visual-ceb-20261105/laboratorio.json).

| Resolução | Antes (registro controlado) | Prévia publicada (conta técnica) |
|---|---|---|
| Computador — 1366×768 | [Antes](visual-ceb-20261105/antes-desktop.png) | [Agora](visual-ceb-20261105/desktop.png) |
| Tablet — 768×1024 | [Antes](visual-ceb-20261105/antes-tablet.png) | [Agora](visual-ceb-20261105/tablet.png) |
| Celular — 390×844 | [Antes](visual-ceb-20261105/antes-celular.png) | [Agora](visual-ceb-20261105/celular.png) |

Capturas adicionais: [menu no celular](visual-ceb-20261105/menu-celular.png) e [editor com ferramentas acima dos campos — dados sintéticos](visual-ceb-20261105/editor-desktop.png). O registro completo de login, biblioteca, formulário, acervo, importação e administração está nos artefatos do workflow.

Commits de interface: `0529d21`, `a581488` e `6aa8fe5`. A documentação e capturas são mantidas em commit separado, sem novo deploy ou alteração de dados. PR #28 permanece aberto em rascunho para avaliação de William.

## Limitações preservadas

Aparelhos físicos, compartilhamento nativo pelo WhatsApp e preferências pessoais de conforto ainda precisam da avaliação de William. Os testes emulam computador, tablet e celular.

Permanecem as limitações já documentadas na auditoria: bundle elevado devido a imagens incorporadas, extração sem fidelidade integral de PDF/Word, fornecedores bíblicos externos e ausência de novo binding de IA no laboratório. Esta etapa visual não altera essas implementações.

## Roteiro de avaliação

1. Entrar com a própria conta `william` na prévia, usando a senha pessoal já escolhida. Se ainda não concluiu o primeiro acesso, usar o fluxo de troca obrigatória existente. Não enviar a senha ao Work.
2. Recolher e expandir o menu no computador. No tablet/celular, abrir Menu e fechar com X, Escape ou o fundo.
3. Preparar um rascunho, digitar alguns campos e abrir/fechar o menu; os campos devem permanecer. Voltar ao início e usar Continuar edição.
4. Abrir biblioteca, acervo, importação e administração. Conferir busca, cartões e legibilidade das ações.
5. Abrir um material existente para ler e apresentar. Comparar Simples, Média e Completa; conferir as referências e os controles de leitura.
6. Conferir questionário e resultados; a proteção de professor/aluno continua a mesma.
7. Comparar com o endereço anterior. Esta avaliação não constitui autorização para merge ou publicação oficial.
