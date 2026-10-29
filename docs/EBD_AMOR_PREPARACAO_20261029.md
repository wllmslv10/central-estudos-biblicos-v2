# O amor conhecido precisa ser vivido — preparação sem publicação

Fonte integral estruturada: `example` em prepare-explanatory-preview.mjs.
Não se presumiu que os slides fossem um estudo exaustivo: o estudo foi organizado
a partir da fonte, preservando introdução/contexto, três pontos com explicações,
aplicações, referências e conclusão. O título solicitado foi aplicado à lição.
Nenhuma nova exegese, detalhe histórico ou transcrição bíblica foi inventada.
A leitura bíblica integral não consta dessa fonte e não foi acrescentada.

## Destino existente

Biblioteca de Materiais → Estudos e Materiais da EBD → Cursos e Lições.
Metadados compatíveis: collection=ebd, ebdType=licao, kind=estudo,
ebdCourse=Lições avulsas (curso já existente, confirmado por SELECT), escopo privado.
Não criar pasta, área paralela, registro de importado ou esboço.

Consultas somente para leitura não localizaram duplicação pelos títulos
O amor conhecido precisa ser vivido / Misericórdia que se torna cuidado, nem pelo
texto-base de Lucas 10:25 na tabela de estudos. Também não houve correspondência
dos títulos/nomes de arquivo pesquisados na tabela de documentos importados.
Uma nova conferência será necessária imediatamente antes de eventual salvamento,
para evitar duplicação por alterações posteriores de outro usuário.

O estudo estruturado é suportado nesse caminho. Sua apresentação é gerada a partir
da mesma lição por Ver HTML/Gerar HTML. Não existe no modelo atual vínculo para
anexar à lição um arquivo HTML congelado/versionado. Os originais importados têm
outra persistência, sem study_id, e não serão utilizados para contrariar o destino
solicitado. Não foi adicionada estrutura para contornar essa limitação.

## Estado real do salvamento

Preparados dois arquivos offline: estudo integral legível e apresentação HTML.
Não foram criados registros na CEB nem enviados objetos ao armazenamento.
O POST /studies utiliza a identidade da sessão administrativa; essa sessão existe
no navegador local do usuário, não neste executor. Não se substituiu esse fluxo
por INSERT SQL, criação de sessão ou uso de credenciais.

Para conclusão na CEB: salvamento autenticado normal da lição no curso existente;
geração pelo Modo Explicativo após publicação autorizada. Se for indispensável
arquivar o HTML aprovado como anexo fixo da lição, isso exige uma capacidade hoje
ausente e deve ser tratado antes de qualquer mudança de estrutura. Nenhuma dessas
etapas é declarada concluída nesta preparação.

## Correção visual restrita

Usuário escolheu explicitamente “Somente o fundo” após ser informado de que o
fundo anterior é claro e a última prévia possui textos brancos/títulos claros.
Recuperados exatamente o gradiente da apresentação EBD aprovada de 23 slides e
o fundo externo #dceefa. Todas as demais cores e tamanhos foram mantidos conforme
essa escolha; o contraste requer a conferência visual do usuário. Não se realizou
mudança silenciosa de cores para melhorar o contraste.

Comparação direcionada: removendo apenas as duas regras novas de background, o
CSS é idêntico ao da última prévia. Capa, seções de slides, textos, referências,
ordem e runtime são idênticos, exceto a atualização autorizada do título da lição
no slide inicial. A apresentação EBD de 23 slides continua byte a byte intacta,
SHA-256 afbd4c815f4d91ebf09fa67e1f369f6f8ab47f3049843e297af2722fd551af9a.
Não foram repetidos os testes anteriores. Compilação e verificações direcionadas
de fundo, integridade dos textos e classificação realizadas, sem publicação.
