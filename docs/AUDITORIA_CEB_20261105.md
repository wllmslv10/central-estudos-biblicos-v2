# Auditoria e evolução CEB — 05/11/2026

Branch: work/ceb-auditoria-leitura-20261105. Sem publicação ou acesso ao banco real.

## Levantamento anterior à implementação

- App.tsx: criação, edição, biblioteca, importados e aplicados; leitura com fonte/espaçamento/temas e referências, mas sem HTML de leitura portátil. Importados têm dois botões de HTML que geram slides, confundindo leitura e apresentação.
- LibraryPresentation: reutiliza presentation.mjs. Há três nomes técnicos; resumido e ampliado preservam praticamente o mesmo texto. Não equivalem a três níveis de desenvolvimento.
- presentation.mjs: resumido/ampliado dividem palavras inclusive no runtime; explicativo já mede frases e bloqueia impressão se uma frase inteira não couber. Reutilizar este último para as novas modalidades; manter rotas antigas compatíveis.
- OriginalFiles: PDF/Word/HTML extraídos com perda de diagramação; HTML perde estrutura e inclui controles. Há regex de extensão com barra duplicada e PDF junta linhas com caracteres literais de escape. Falta exportação da leitura e referências neste caminho.
- CebAluno: leitura própria, distinta da biblioteca, sem referências acionáveis. Originais são autorizados por cartão, sem classificação por anexo.
- student-lesson.js: filtros textuais removem algumas instruções, mas espalham campos desconhecidos e mantêm questões com answer. Isto não é uma fronteira segura para conteúdo estruturado.
- originalRoute: verifica sessão/compartilhamento, porém não distingue anexo do professor de anexo do aluno.
- Identidade: validação por hashes existente. Preservar imagens e apresentações aprovadas.
- Testes iniciais: 41 testes frontend aprovados. API em execução; resultados finais devem ser registrados ao concluir.

## Plano sem duplicações

1. Conteúdo novo com blocos explicitamente classificados; projeção do aluno no servidor por lista de campos permitidos. Conteúdo legado mantém compatibilidade, sem promover filtros textuais a garantia de sigilo.
2. Simples/Média/Completa reutilizam o paginador por frases do explicativo. Fonte e anexos não são regravados.
3. Um gerador de Leitura Interativa, portátil, compartilhado entre biblioteca, importados, originais e aluno. HTML escapado; extração preserva o original e informa perda de imagens/diagramação.
4. Estudo experimental local, sem gravar no acervo oficial. Validação automatizada de conteúdo, segurança, build e navegador em desktop/tablet/celular.
5. Entrega em branch/PR para revisão, sem merge/deploy.

## Limites do levantamento

A presença de código não prova operação real. Testes com API simulada não validam persistência, fornecedores bíblicos, permissões ou exportação em produção. Nenhuma auditoria completa da interface autenticada oficial foi concluída neste levantamento.

## Implementado nesta branch

- Gerador compartilhado de Leitura Interativa com HTML portátil, fonte, espaçamento, claro/escuro, leitura limpa e impressão/PDF pelo navegador. Disponível no editor, biblioteca, importados, anexos e área do aluno.
- Simples, Média e Completa selecionam respectivamente uma, até três e todas as frases por tópico da fonte revisada; reutilizam medição e bloqueio de revisão do explicativo. Não inventam conteúdo nem reescrevem os HTML aprovados. Textos importados/legados exigem revisão explícita antes destas novas projeções.
- Campo independente de orientações reservadas ao professor nos novos estudos. Projeção estrutural por destinatário; respostas e campos desconhecidos são excluídos da resposta ao aluno na API.
- Cada anexo pode ser classificado como reservado ao professor ou revisado para o aluno. Servidor aplica a regra antes de buscar os bytes. Sem classificação: reservado. Os arquivos antigos não são regravados, mas seu compartilhamento requer classificação prévia antes de usar esta versão.
- Correções de detecção de extensão e quebra de linha de PDF; limpeza de controles/scripts na extração HTML. Não há garantia de fidelidade de imagens, tabelas e títulos extraídos: a leitura informa a limitação e preserva a visualização/download original.
- Botões de leitura e slides distintos, ações responsivas e modal compartilhado. Modernização incremental; não houve redesenho completo da aplicação.
- Estudo sintético `[TESTE] Ouvir e praticar a Palavra`, em test/fixtures/ebd-experimental.mjs. Nunca cadastrado em produção.

## Resultados locais

- Antes: frontend 41/41; API 205/205.
- Depois: frontend 44/44; API 205/205 (inclui execução real de SQL em PGlite para impedir anexo reservado/sem classificação).
- TypeScript e build Vite aprovados; verificação de identidade visual aprovada; git diff --check aprovado.
- Bundle principal permanece grande (~5,26 MB, aviso do build). Separar imagens incorporadas/código é pendência de desempenho.
- Navegador 1.62.1 não foi baixado (distribuição indisponível). Chromium 141 foi obtido, mas inicialização local foi bloqueada pelo ambiente (`socket() failed: Operation not permitted`). Portanto, layout e exportação visual não são considerados aprovados localmente.
- scripts/validate-approved-presentation.mjs exige arquivos de comparação em argumentos; não executado com sucesso nesta auditoria. Os testes existentes verificam fontes aprovadas e a branch não altera materiais/ nem imagens.

## Validações adicionais e limites

Workflow validate-interactive-reading.yml executa testes e navegador sem produção. Artefatos: HTML de aluno/professor, três modalidades, screenshots e results.json. Nenhum endereço público de preview foi publicado.

A auditoria autenticada completa e o teste com arquivos reais em ambiente isolado permanecem pendentes. Não houve acesso ao banco oficial. PDF depende da impressão do navegador. ACF/ARA/NVI usam consulta externa na tradução escolhida; texto em modal somente para Bíblia Livre quando o fornecedor responde, sem trocar silenciosamente a tradução. Disponibilidade/termos do fornecedor bíblico não foram auditados. Materiais legados mistos exigem revisão humana: regex não constitui garantia de sigilo. O esquema novo mantém orientações separadas; classificar um arquivo como aluno pressupõe revisar o arquivo inteiro.

Não publicar nem mesclar sem autorização de William e conclusão da revisão funcional.

## Atualização de validação — encerramento técnico

O bloqueio local de navegador foi superado usando Chromium Headless Shell 141, sem alterar permissões do ambiente. A execução completa de scripts/test-interactive-reading-browser.mjs passou localmente:

| Verificação | Resultado |
|---|---|
| Leitura contínua e sem transbordamento | 1366×768, 768×1024, 390×844 aprovados |
| Simples, Média e Completa | Slides medidos em todos esses tamanhos, sem corte |
| Campo do professor | Presente na leitura do professor; ausente dos bytes/DOM do aluno e dos slides |
| Fonte, espaçamento, claro/escuro e leitura limpa | Aprovados |
| Referências | Versão escolhida respeitada; consulta livre simulada; indisponibilidade tratada |
| Impressão e PDF | PDFs gerados em três tamanhos, CSS de impressão verificado |
| Editor real React | Leitura, três modalidades e ausência de gravação automática aprovadas |
| Acervo com API simulada | Cadastro, classificação do anexo, HTML original com estilo/script, compartilhamento e aplicados aprovados |

Screenshots de leitura desktop/celular e slide completo foram inspecionados. Corrigida numeração duplicada em títulos já numerados. O roteiro antigo de teste do acervo foi atualizado para abrir os painéis recolhidos e usar o seletor atual do iframe; o teste agora passa, sem alterar o HTML original.

No GitHub, no commit e1d9083, passaram frontend, API, autenticação, biblioteca, questionários, importação de PDF, modelos de slides e interface da biblioteca. O teste novo ainda falhava por seletor exato de rótulo no roteiro; o seletor foi corrigido e a execução local passou. A última execução de CI deve ser consultada no PR antes de aprovar publicação.

### O que fica pendente para homologação

- Navegação autenticada com dados reais em ambiente separado e revisão humana de anexos legados compartilhados. Os testes de interface usaram API simulada; não acessaram o banco oficial.
- A disponibilidade real/licença dos fornecedores bíblicos não foi validada; ACF/ARA/NVI abrem consulta externa, sem apresentar outra tradução como se fosse a escolhida.
- Extração PDF/Word não é conversão fiel de diagramação, tabelas ou imagens; PDFs digitalizados exigem texto extraível/OCR externo. Originais preservados.
- A modernização foi incremental (leitura contínua, controles e ações organizadas). Um redesenho geral de todas as telas não foi concluído.
- As modalidades são extrativas; não desenvolvem ideias ausentes do texto. Uma frase individual longa demais exige revisão, em vez de ser cortada.
- Desempenho do bundle e compatibilidade em aparelhos físicos/Android devem ser avaliados na homologação.

Branch: work/ceb-auditoria-leitura-20261105. PR de revisão: https://github.com/wllmslv10/central-estudos-biblicos-v2/pull/27. Nenhum merge ou deploy. Não há endereço público novo de testes; o workflow disponibiliza artefatos de teste para download.

## Entrega do laboratório para testes práticos — 05/11/2026

Esta seção substitui os estados anteriores de “sem laboratório” e as contagens antigas de testes. A versão oficial permanece preservada. A branch obrigatória e o PR #27 foram mantidos; nenhum merge foi executado.

### Acesso e isolamento

Laboratório: https://ceb-biblioteca-api-validacao.wllmslv10.workers.dev/central-estudos-biblicos-v2/

- Reutilizado exclusivamente o Worker de validação já existente. Não foi criado serviço pago nem alterada assinatura.
- Banco: projeto `green-resonance-36660365`, branch existente `br-falling-thunder-b4saoifs` (`dev-ceb-cloud-materials-20261026`), endpoint fixo `ep-falling-fog-b4uyuofc`. Nenhuma conexão ao banco oficial foi utilizada.
- Criado o esquema vazio `ceb_lab_20261105`: somente estrutura, índices, relações e proteções; nenhum cadastro, material ou sessão real foi copiado para esse esquema. As cópias antigas existentes em `public` da branch de validação ficam fora da aplicação. As chaves estrangeiras foram conferidas: referenciam exclusivamente o esquema do laboratório.
- O adaptador redireciona o SQL estático para esse nome fixo somente no runtime de validação. Não aceita esquema arbitrário nem fallback para produção. O wrapper valida host, banco, usuário e TLS antes de abrir a conexão; recusa Hyperdrive de produção.
- Originais de teste usam o prefixo obrigatório `validation-20261105/` no armazenamento já autorizado. GET, PUT e DELETE desse runtime não alcançam as chaves dos originais oficiais.
- Frontend compilado para a API de validação; configuração de laboratório apontando para a API oficial bloqueia a inicialização. Banner de laboratório presente. Service worker e convite de instalação desativados somente nessa compilação.
- Contas novas: `williamlab` (professor/administrador) e `alunolab` (aluno). Senha fornecida diretamente a William, nunca incluída no repositório, no bundle ou nos relatórios. Não usar senhas da versão oficial.
- Restaram dois cartões de teste ativos: uma lição com questionário e um cartão com arquivos PDF, Word e HTML. Repetições técnicas foram movidas reversivelmente à Lixeira do laboratório; respostas e históricos foram preservados.

### Classificação final dos itens auditados

| Item | Classificação | Evidência ou tratamento |
|---|---|---|
| Leitura Interativa em editor, estudos, esboços, EBD, biblioteca e importados | Resolvido e validado | Testes compartilhados, editor React, biblioteca e navegador em três resoluções; fonte, espaçamento, tema e PDF |
| Materiais Originais e Área do Aluno | Resolvido e validado | Arquivos reais sintéticos enviados ao laboratório; leitura adaptada e autorização por anexo |
| Modalidades Simples, Média e Completa | Resolvido e validado | Organização por campos pedagógicos implementada nos commits 4456f4f/98521a2/8f91985; regressões de seleção, integridade e paginação aprovadas |
| Revisão e prévia antes de apresentar/exportar | Resolvido e validado | Modal existente preservado; textos legados exigem confirmação; frase que não cabe bloqueia impressão e exige revisão |
| Gabaritos e orientações reservadas | Resolvido e validado | Projeção por campos permitidos; exclusão de campos aninhados desconhecidos e destinatários privados; nenhuma resposta correta antes da entrega |
| Materiais legados mistos antes de compartilhar | Resolvido e validado | Revisão explícita obrigatória no servidor e na interface; entrega antiga não revisada recebe aviso sem o texto; edição invalida a revisão anterior |
| Revisão do conteúdo de cada anexo antigo | Pendente apenas de teste prático | Requer professor: sem classificação o arquivo permanece reservado; não foi feita classificação automática por palavras ou nome de arquivo |
| Cadastro, edição, permissões, download e histórico | Resolvido e validado | API real no banco isolado, testes SQL/PGlite e interface da biblioteca |
| Questionário interativo, correção e notas | Resolvido e validado | Entrega real no laboratório com 100%, histórico do professor, rascunho/retomada e novas tentativas em regressões locais |
| Proteção por anexo | Resolvido e validado | Aluno baixa PDF/HTML liberados; Word reservado responde 404 e não aparece no payload do aluno |
| Extração textual PDF, Word e HTML | Resolvido e validado | Três uploads, downloads byte a byte idênticos e extração no navegador publicado; PDF.js e Mammoth efetivamente executados |
| Fidelidade visual de PDF/Word e arquivos sem texto | Parcialmente resolvido | Extração não promete imagens/tabelas/diagramação; aviso e original preservado; documento sem texto orienta usar o original. OCR não implementado |
| Referências bíblicas clicáveis | Parcialmente resolvido | Navegação e falha do fornecedor testadas; ACF/ARA/NVI abrem consulta externa. Disponibilidade/licenciamento do fornecedor não são garantidos |
| Homologação autenticada isolada | Resolvido e validado | Login real, persistência, autorização, questionário e arquivos no ambiente publicado; dados exclusivamente sintéticos |
| Responsividade | Resolvido e validado | 1366×768, 768×1024 e 390×844; biblioteca também 1024×768. Corrigido transbordamento dos botões no cabeçalho do questionário |
| Compatibilidade em aparelhos físicos | Pendente apenas de teste prático | Emulação não substitui os aparelhos de William nem comprova o compartilhamento nativo pelo WhatsApp |
| Tamanho do bundle | Pendente de implementação | Cerca de 5,26 MB no JS principal (~3,76 MB gzip), com imagens incorporadas para HTML portátil. Não houve compressão destrutiva nem substituição das imagens aprovadas |
| Modernização geral de interfaces | Parcialmente resolvido | Leitura, ações e responsividade melhoradas. Redesenho integral de telas funcionais não foi realizado |
| Geração de questionários com IA no laboratório | Parcialmente resolvido | Modos automático/misto aprovados com fornecedor simulado e SQL real local. Laboratório não recebeu novo binding de IA nem promessa de inferência externa; elaboração manual disponível |

### Correções adicionais desta entrega

1. API configurável na compilação, com bloqueio de configuração insegura no laboratório.
2. Hospedagem do frontend junto à API de validação, autenticação na mesma origem e exceção CORS limitada ao host de laboratório.
3. Esquema sem dados reais e prefixo separado para arquivos; desativado o provisionamento temporário antigo por OIDC.
4. Compartilhamento interno e envio externo de HTML exigem confirmação humana. Edição de legado invalida a revisão anterior sem apagar o original ou a configuração de destinatários.
5. Descrição livre de anexos não é entregue automaticamente ao aluno. Campos extras em materiais de apoio/opções de perguntas não passam pela projeção; lista privada de destinatários também é removida.
6. Cabeçalho do questionário quebra linhas no celular. Convite de instalação não encobre a navegação no laboratório.
7. Roteiros antigos foram atualizados para confirmar a nova revisão, mantendo as verificações de permissões e persistência.
8. Verificação de publicação aguarda propagação dos assets, inclusive respostas HTTP temporárias de erro; não trata apenas o retorno do comando de deploy como comprovação.

### Evidências e resultados

- Frontend: **44/44** testes aprovados.
- API: **211/211** testes aprovados na execução final, incluindo seis regressões específicas de isolamento e projeção.
- TypeScript, Vite, identidade visual e `git diff --check`: aprovados.
- `scripts/test-interactive-reading-browser.mjs`: leitura, três modalidades, referências com resposta controlada/falha, impressão/PDF, editor e ausência de gravação automática; três resoluções aprovadas.
- `scripts/test-originals-ui.mjs`: cadastro/classificação, HTML original com CSS/script preservado, compartilhamento e aplicados; aprovado com API simulada.
- `scripts/test-library-ui.mjs`: busca, edição no mesmo ID, duplo clique, compartilhamento/revogação, Lixeira/restauração, importados e quatro resoluções; aprovado com API simulada.
- `scripts/test-quiz-ui.mjs`: questionário manual, rascunho/retomada, revisão, correção, bloqueio/autorização de tentativas e responsividade; aprovado com SQL/PGlite.
- `scripts/test-students-ai-ui.mjs`: matrícula, edição, preservação de senha, fornecedor simulado, modos automático/misto, respostas/nota e desativação; aprovado com Worker real e PGlite, sem inferência externa.
- `scripts/test-library-quiz-status.mjs`: cinco estados, contagem, atualização após salvar/compartilhar, aluno sem metadados do professor e questionário preservado; aprovado com Worker real e PGlite.
- `scripts/test-laboratory-live.mjs`: API e navegador publicados, autenticação real e banco isolado. Resultado sanitizado em `docs/evidencias/CEB_LAB_AUTENTICADO_20261105.json`.
- `scripts/test-laboratory-files.mjs`: três arquivos sintéticos enviados, originais comparados byte a byte e extração real no navegador publicado. Conferência adicional das permissões por anexo registrada em `docs/evidencias/CEB_LAB_ARQUIVOS_20261105.json`.
- Screenshots desktop/celular e leitura/slides foram inspecionados. As resoluções emuladas não equivalem a uma certificação de aparelhos físicos.
- Os testes de navegador remoto utilizaram o proxy deste ambiente; sua CA foi aceita somente no contexto de testes. A aplicação não desativa verificação TLS nem altera a política TLS do banco.

### Roteiro de teste para William

1. Abrir o endereço do laboratório e entrar com `williamlab`. Conferir a faixa “Laboratório CEB”.
2. Na Biblioteca/EBD, abrir `[TESTE PRÁTICO] Ouvir e praticar — laboratório`. Experimentar Leitura Interativa, fonte, espaçamento e claro/escuro.
3. Abrir a apresentação e comparar Simples, Média e Completa; navegar, usar tela cheia e baixar HTML/imprimir PDF. Revisar o resultado antes de utilizá-lo.
4. No Acervo de Materiais Didáticos Importados, abrir `[TESTE PRÁTICO] Arquivos PDF, Word e HTML`. Comparar o original e a leitura adaptada de cada arquivo.
5. Sair e entrar com `alunolab`, preferencialmente em janela privada. Abrir as lições, responder ao questionário e conferir a nota/histórico. O Word do professor não deve aparecer; PDF e HTML liberados podem ser acessados.
6. Voltar como professor para consultar os resultados. Confirmar também o pedido de revisão antes de compartilhar e a separação dos anexos.
7. Repetir no tablet e no celular, incluindo rolagem, orientação da tela, tamanho de fonte, navegação e tentativa de compartilhamento nativo de arquivo.

Não importar dados pessoais ou senhas da CEB oficial durante essa rodada. Materiais antigos mistos devem ser revisados pelo professor antes de qualquer liberação futura. A produção só poderá receber a branch após aprovação expressa de William.
