# Matriz de aceite do PR #33

| Área | Cenário | Evidência exigida | Resultado da auditoria |
| --- | --- | --- | --- |
| Referências | João abreviado, Jó, Êxodo, livros numerados e intervalos entre capítulos nas duas edições | Comparar o livro, a edição e o intervalo da URL gerada | Cobertura automatizada em `test/bible-translations.test.mjs`. Corrigida a colisão entre Jo e Jó. |
| Referências | Abrir a passagem na edição selecionada | Conferir o conteúdo que o provedor entrega ao navegador | A URL é testada localmente. Ainda falta confirmação do intervalo exato no provedor externo. |
| Paginação | Atividade extensa, ponte bíblica e contracapa | Comparar o texto original ao texto recuperado das páginas | Exercitado em `scripts/test-special-presentations-browser.mjs`. |
| Dinâmica | Revelar uma condição longa | Quadro sem transbordamento a cada clique e condição integral recuperável | Reproduzido antes da correção. O corpo tinha 677 px de área e 2433 px de conteúdo após revelar. Regressão incluída no Chromium. |
| Importações | HTML, PDF, DOCX e PPTX | Importar arquivos reais com texto conhecido, converter em slides e conferir os bytes dos originais | PDF, DOCX e PPTX reais extraídos, enviados, baixados com bytes idênticos e convertidos em slides no Chromium. API e armazenamento isolados, com bibliotecas de extração reais nas mesmas versões do aplicativo. |
| Identidade visual | Sete layouts em computador e tablet | Capturas comparáveis ao modelo, conferência de geometria e controles | Comparação de propriedades computadas e capturas dos sete layouts executada em 1366×768 e 1024×768 com o HTML aprovado. O texto do modelo e o texto de teste são diferentes, portanto a comparação não é uma igualdade de pixels. |
| Produção | Integração e implantação | Verificar o commit implantado, o endereço oficial e os critérios acima | Publicação condicionada à conclusão da matriz. |


## Reproduzir

- Visual: execute `scripts/test-special-presentations-browser.mjs` com `CEB_HTML_MODEL` apontando para o HTML aprovado.
- Importação: execute `scripts/test-imported-formats-browser.mjs` após o build. Aponte `CEB_IMPORT_TEST_NODE_MODULES` para as versões pdfjs-dist 4.10.38, mammoth 1.9.0 e jszip 3.10.1. Aponte `CEB_IMPORT_TEST_FIXTURES` para uma pasta com `auditoria.pdf`, `auditoria.docx` e `auditoria.pptx`, todos contendo a frase “O texto completo deve aparecer nos slides.”.
- O STEP Bible serviu Mateus 4 nas duas edições por URLs de capítulo. O verificador externo não confirmou a renderização da URL exata de intervalo gerada pelo aplicativo.
