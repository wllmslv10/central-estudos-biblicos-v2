# Validação e publicação da CEB V2 no laboratório — 05/11/2026

## Resultado
Versão da branch `work/ceb-modernizacao-visual-20261105`, incluindo as correções até `86254ae`, publicada exclusivamente no Worker `ceb-biblioteca-api-validacao`.
Revisão de implantação: `7a99f197a6234aa3b56de99bde148759a512db90`.
Versão Cloudflare: `31f69e5d-8633-43c0-87ac-6b28a1de134a`, 100% do tráfego desse Worker, em 05/11/2026 às 16h39 (Brasília).
Laboratório: https://ceb-biblioteca-api-validacao.wllmslv10.workers.dev/central-estudos-biblicos-v2/
A rota /visual/ também recebe a branch atual. A raiz do laboratório agora recebe a mesma versão atualizada, sem depender da antiga interface fixa.
Execução aprovada: https://github.com/wllmslv10/central-estudos-biblicos-v2/actions/runs/42095657780

## Correções necessárias nesta conclusão
- `404bfbc`: corrigida a trava do workflow que recusava as alterações já aprovadas em interactiveReading.mjs; preservada a trava para API, materiais, identidade visual, apresentação e referência da branch-base. Publicação da branch atual na raiz do laboratório e conferência do SHA, HTML e bytes JavaScript servidos.
- `7a99f1`: etapas de navegador separadas, com limites de tempo e escopo restrito à navegação, leitura, anexos e biblioteca. A execução anterior foi substituída e aparece cancelada, embora seus passos de publicação e comparação remota tenham passado.
- Nenhum novo ajuste no código funcional da interface ou da API foi necessário nesta etapa.
- A demora inicial foi identificada nos logs como instalação de fontes/dependências do navegador no runner GitHub.

## Evidências e limites dos testes
| Item | Validação realizada | Resultado |
| --- | --- | --- |
| Página principal | Navegador local com API simulada, 1366×768, 768×1024 e 390×844: sair da administração para Início, sessão mantida e retomada do rascunho | Aprovado |
| Navegação responsiva | test-visual-workspace.mjs: menu, editor, biblioteca, acervo, importação e administração nos três tamanhos | Aprovado; sem erro JavaScript ou transbordamento |
| Leitura Interativa | test-interactive-reading-browser.mjs: fonte, espaçamento, modo escuro, leitura limpa, referências e impressão nos três tamanhos | Aprovado |
| Anexos e originais | test-originals-ui.mjs: cartão, abertura, download e HTML sintético com estilo e interação preservados; testes unitários de extração e controles de arquivos | Aprovado |
| Permissões no servidor | 212 testes API, incluindo originals-new.test.js: arquivo teacher ou sem audiência explícita negado ao aluno antes de ler o objeto; professor proprietário autorizado; seleção, revogação e download verificados | Aprovado em banco local PGlite/rotas reais; não é login remoto com conta de aluno |
| Biblioteca | test-library-ui.mjs: 21 verificações de interface, incluindo leitura/importados, permissões de aluno e quatro tamanhos de tela | Aprovado com dados sintéticos |
| Originais aprovados | Diff sem alterações em materiais, public, identidade-visual e mecanismos de apresentação; check-visual-identity.mjs; comparação de bytes de original sintético na API | Preservados; materiais reais não foram editados nem regravados |
| Compilação e testes | 44 testes frontend, 212 API, TypeScript/Vite; cinco workflows da PR | Aprovados |
| Publicação real | Dry-run, deploy, duas URLs, laboratory-version.json, comparação de HTML e bytes de JavaScript com os bundles compilados | Aprovado no workflow |
| Disponibilidade real | /health: API, banco e armazenamento isolados disponíveis; rota de anexo sem sessão retorna 401; tela de login recarregada no navegador remoto | Aprovado |

O JavaScript servido na raiz também foi comparado independentemente com a compilação local da branch: SHA-256 `a042c5a482b902efb7f71d4f7abbd40e15185d0fef638c9eeeb255280e8b209b`.

Os testes de interface usam dados e autenticação simulados para evitar gravações em materiais. Não foi realizado novo login remoto autenticado de professor/aluno nesta sessão. A adaptação foi testada por emulação, sem aparelhos físicos.

## Pendência já combinada
A eventual tela branca do questionário permanece para conferência posterior do usuário. Não bloqueou a publicação e não motivou nova alteração no questionário.

## Proteções mantidas
Sem merge, publicação oficial, alteração de credenciais, alteração de banco de produção ou modificação de outros projetos. O Worker de laboratório continua sem Hyperdrive de produção. API e materiais existentes não foram alterados nesta etapa.
PR #28 mantida aberta em rascunho, na mesma branch e com a base existente.
