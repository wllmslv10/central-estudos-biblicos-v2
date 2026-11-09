# Matriz de aceite do PR #33

| Área | Cenário | Evidência exigida | Resultado da auditoria |
| --- | --- | --- | --- |
| Referências | João abreviado, Jó, Êxodo, livros numerados e intervalos entre capítulos nas duas edições | Comparar o livro, a edição e o intervalo da URL gerada | Cobertura automatizada em `test/bible-translations.test.mjs`. Corrigida a colisão entre Jo e Jó. |
| Referências | Abrir a passagem na edição selecionada | Conferir o conteúdo que o provedor entrega ao navegador | A URL é testada localmente. Ainda falta confirmação do intervalo exato no provedor externo. |
| Paginação | Atividade extensa, ponte bíblica e contracapa | Comparar o texto original ao texto recuperado das páginas | Exercitado em `scripts/test-special-presentations-browser.mjs`. |
| Dinâmica | Revelar uma condição longa | Quadro sem transbordamento a cada clique e condição integral recuperável | Reproduzido antes da correção. O corpo tinha 677 px de área e 2433 px de conteúdo após revelar. Regressão incluída no Chromium. |
| Importações | HTML, PDF, DOCX e PPTX | Importar arquivos reais com texto conhecido, converter em slides e conferir os bytes dos originais | O teste existente cobre o fluxo de HTML original e a Biblioteca cobre texto previamente extraído. A extração de PDF, DOCX e PPTX por upload ainda precisa de evidência ponta a ponta. |
| Identidade visual | Sete layouts em computador e tablet | Capturas comparáveis ao modelo, conferência de geometria e controles | O teste Chromium gera as capturas. A comparação automatizada integral com o HTML-modelo ainda não está codificada. |
| Produção | Integração e implantação | Verificar o commit implantado, o endereço oficial e os critérios acima | Publicação condicionada à conclusão da matriz. |
