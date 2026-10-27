# Validação dos modelos HTML — PR #5

27/10/2026. Preparado para aprovação; **não publicado na CEB oficial**.

## Resultado

Dois modelos sobre os mesmos dados existentes. Ampliado é o padrão ao entrar na EBD e ao abrir para edição um material EBD salvo. Resumido conserva o estilo clássico claro e a organização compacta; pode ser selecionado no mesmo editor. A escolha é estado da apresentação, não cria registro, não altera conteúdo, IDs ou metadados do estudo e não dispara salvamento na nuvem.

Referência visual localizada e conferida: `EBD_Postura_do_Cristao_Slides_Roteiro_Ampliado.html`, SHA256 `415a84ab2c50898e50d8928054fb240866967776e3167ca631ed0fe67b360572`. O ampliado segue azul-marinho `#07182f`/`#102a49`, títulos dourados `#efc875`, contraste alto e organização de leitura. Identidades CEB/IBNE são as imagens originais protegidas do repositório, incorporadas ao HTML, sem redesenho, corte ou dependência de rede para exibir logomarcas.

## Correções

- Paginação de tema, introdução, pontos, aplicações e conclusão; seções adicionais projetadas sem duplicar conteúdo idêntico.
- Texto completo preservado, com mais páginas quando necessário. Parágrafos e referências não são cortados deliberadamente para caber. Não há resumo por IA, citação inventada ou modificação dos registros.
- Canvas lógico 1600×900 (16:9), escalado proporcionalmente. Medição de conteúdo após carregar fontes e estilizar referências; margem de segurança para arredondamento. Quebras adicionais preservam os caracteres, sem diminuir a fonte e sem rolagem dentro dos slides.
- Cabeçalho limpo nos dois modelos; sem etiquetas de ponto/desenvolvimento/pergunta. Remove instruções ao professor apenas na projeção, mantendo as perguntas e explicações que as seguem.
- Rodapé em espaço próprio, separado do texto; controles fora da área do slide.
- Referências preparadas em todos os slides; regex preservada na serialização do JS. Consulta mantém a fonte/atribuição existente e oferece alternativa online em falha. A consulta dos versículos depende de internet; apresentação e logos funcionam sem ela.
- Prévia interativa usa o mesmo gerador do download, dentro de iframe isolado. Navegação por botões, teclado, gestos horizontais, tela cheia e estilos de impressão preservados.
- No teste de estresse foi encontrado e corrigido overflow após transformação das referências em botões. Medição final e margem evitam sobreposição subpixel.

## Evidência

Código testado: `5db17eff96c5a6c41e19b81cee7b800b22bcf8e5`.

CI concluída com sucesso: https://github.com/wllmslv10/central-estudos-biblicos-v2/actions/runs/40582069934

Artefato com HTMLs, capturas e relatório: https://github.com/wllmslv10/central-estudos-biblicos-v2/actions/runs/40582069934/artifacts/12770476735

| Verificação | Resultado |
| --- | --- |
| Testes de projeção, limpeza de instruções, texto integral, não mutação e escape HTML | 14 aprovados |
| Dois modelos × amostra comum/estresse × cinco telas | 20 cenários aprovados |
| Telas Chromium | 1920×1080, 1366×768, 1280×800, 1024×768, 768×1024 |
| Cortes, sobreposição de conteúdo, proporção e rolagem de slides | Nenhuma falha nos cenários finais |
| Imagens originais incorporadas | Carregadas nos dois modelos |
| Referências clicáveis em slides posteriores | Aprovado com resposta técnica simulada |
| Botões, teclado, tela cheia, gestos simulados e CSS de impressão | Aprovados |
| Bundle React real: editor EBD, padrão ampliado, prévia e troca para resumido | Aprovado |
| Troca de modelos: rascunho antes/depois e escritas no backend | Rascunho idêntico, zero escritas |
| Build TypeScript/Vite e identidade protegida | Aprovados |
| Bloco do modo de leitura comparado à main | Idêntico, SHA256 `f8d8b2aa72ce5a9e6013d6a00f822fdd30366b31097f8e2b288ddc9c4ed73189` |

## Limites e preservação

Os testes usam dados técnicos e respostas de API simuladas; não consultam nem alteram Neon, Worker, credenciais ou materiais reais. Os testes de tela são em Chromium com dimensões de computador/tablet, não um ensaio em tablets físicos ou Safari. Impressão foi conferida por CSS, não em impressora física. Fonte de corpo no canvas: 34 px no ampliado e 38 px no clássico; escala proporcional, sem fonte progressivamente reduzida para encaixar conteúdo.

A main continua no commit `b2f73276f84f4cbfb6eb581adec40c1c7785ece1`. Nenhum merge, publicação oficial ou recurso pago ativado nesta tarefa. Imports continuam bloqueados por configuração existente, sem alteração. Não foram alterados arquivos da biblioteca/backend, imagens protegidas, CSS global, modo de leitura ou demais decisões da tarefa #4.

Os checks Cloudflare do Worker de validação podem rejeitar esta branch porque seu guard exige `work/biblioteca-nuvem-20261026`; essa proteção não deve ser removida para testar apresentações. A CI de apresentação é independente e não executa deploy.

Próximo passo: William avaliar as duas amostras de demonstração e autorizar eventual integração. Não há autorização implícita para publicar este PR.

## Ajuste visual posterior autorizado — 27/10/2026

William solicitou substituir o fundo azul-marinho do ampliado pelo mesmo fundo claro do resumido e usar moldura circular na logo da igreja. Esta orientação substitui apenas a paleta anterior do ampliado; conteúdo, fonte, organização e comportamento continuam iguais.

- Ampliado e resumido compartilham agora o mesmo gradiente claro, textos azul-escuro e títulos dourados escuros. O ampliado mantém fonte de corpo de 34 px no canvas lógico; o resumido continua com 38 px.
- Apenas o ampliado recebe moldura circular de 72×72 px para a logo da igreja. A imagem original fica inteira, com object-fit:contain e margem suficiente para que seus quatro cantos caibam dentro do círculo. Não há overflow:hidden, máscara, deformação, edição do PNG ou corte.
- Confirmado por comparação de código: construtor de slides, limpeza do texto, paginação, referências e runtime de navegação idênticos aos da versão anterior. Alterações restritas à marcação da moldura e estilos visuais.
- CI do código `81c2965ba5568928040bf80732036de0d0baad6e`: execução https://github.com/wllmslv10/central-estudos-biblicos-v2/actions/runs/40584148188 concluída com sucesso. Os 14 testes, 20 cenários de tela e teste do editor compilado passaram novamente. Verificações adicionais de navegador confirmam igualdade do fundo/cores, fonte ampliada preservada e logo inteira dentro da moldura circular.
- Nova amostra independente de demonstração: `CEB_modelo_ampliado_fundo_claro_validacao.html`. Não contém dados do Neon. Não foi publicada na CEB oficial; aguarda avaliação de William.

## Revisão de integridade e amostras integrais — 27/10/2026

A demonstração anterior de sete slides era uma fixture técnica, não a lição aprovada. As novas amostras são geradas explicitamente do HTML aprovado `EBD_Postura_do_Cristao_Slides_Roteiro_Ampliado.html` (SHA-256 `415a84ab2c50898e50d8928054fb240866967776e3167ca631ed0fe67b360572`), mantido fora do repositório. Não há substituição automática do estudo salvo pelo roteiro de apresentação.

- Fonte: 30 slides, 60 parágrafos. Conferência de título, corpo e referências, em sequência, com hashes por slide no relatório privado.
- A prioridade atual de preservar literalmente o conteúdo substitui a remoção anterior de instruções. O gerador não aplica mais filtros de instruções nem deduplicação de trechos. Repetições pedagógicas são conservadas.
- Cabeçalhos seguem sem etiquetas; o rodapé antigo com data e numeração fixa é substituído pela numeração dinâmica. Textos de títulos, explicações, aplicações, perguntas, referências e conclusões permanecem integrais.
- Comparação somente por SELECT confirmou que o HTML aprovado e o estudo salvo têm redações e desenvolvimentos diferentes. Exemplos adicionais no HTML: batismo e declaração do Pai; provação versus tentação com Tiago 1:13; auxílio da igreja a necessitados; Massá; diferentes sentidos de “mundo”; fragilidades; Cristo como Salvador e sumo sacerdote misericordioso. O estudo salvo possui seu próprio cronograma e referências complementares. Nenhuma fusão foi feita.
- MD5 do conteúdo oficial consultado: `5a39fbb0b1723009162bfb1d1ed208bd`. Nenhuma gravação, migração ou configuração Neon/Worker.
- Foi usado o arquivo circular original `identidade-visual/logo-circular-azul-2.png` em vez do ícone quadrado dentro de uma moldura. Os arquivos originais e suas verificações de identidade permanecem intactos. Azul original é o padrão do código; filtros ligeiramente claro e suave existem somente nas amostras de comparação.
- Fundo ampliado mantém exatamente o gradiente claro já compartilhado com o resumido.
- Imagens originais são embutidas uma única vez no HTML e reutilizadas nos slides, evitando multiplicar o tamanho do arquivo.
- `createPresentationHtmlFromSlides` permite fonte explicitamente ordenada, sem reescrever o estudo. O aplicativo continua apresentando os campos do próprio estudo; não insere silenciosamente o texto adicional do roteiro.
- Ferramenta local reproduzível: `node scripts/validate-approved-presentation.mjs ORIGINAL.html SAVED-STUDY.json OUTPUT-DIR`. Não comitar a exportação do banco ou a fonte particular. A ferramenta rejeita conteúdo HTML não reconhecido em vez de omiti-lo.
- Os 17 testes unitários verificam preservação dos campos suportados, instruções, repetições, títulos, conteúdo extenso, perguntas, referências, fonte explícita de 30 slides e ausência de mutação. A preservação aplica-se aos campos textuais do formato Study, não a campos estruturais de pastas, permissões ou identificadores.
- Não houve publicação, ativação de importações ou tarefa #4. Amostras e relatório aguardam avaliação do usuário.

Resultado da revisão integral: 12 layouts aprovados (três azuis × quatro resoluções), todos com 30 slides e 60 parágrafos preservados; nenhum corte/rolagem. Testes gerais: 20 layouts dos dois modelos mais o fluxo React compilado, sem gravações no backend. Build e identidade visual aprovados. Tablet foi emulado em Chromium; não houve ensaio físico em iPad/projetor.
