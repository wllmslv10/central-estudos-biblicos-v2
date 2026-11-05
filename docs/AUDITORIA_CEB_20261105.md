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
