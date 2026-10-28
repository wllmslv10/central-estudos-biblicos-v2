# Migração 006 e teste restrito do armazenamento — sem publicação

Base de preparação: `0c43063f10145a97607dd2e9106b84134b1b8a35`.
Execução autorizada por William: somente migração 006, integridade e teste técnico
privado. Ativação global e nova publicação continuam NÃO autorizadas.

## Backup e aplicação da migração

Antes da alteração, as 12 tabelas e seus 244 registros foram comparados por
contagem e hash integral com o mesmo snapshot do backup lógico de 28/10/2026,
18:29:54 de Brasília. Todos coincidiram: não foi necessário criar outra cópia.
Esse backup já havia sido restaurado em PostgreSQL 18/PGlite local vazio,
com comparação de dados, sequências e permissões. O backup antigo não foi tocado.

Foi aplicada exclusivamente `api-worker/migrations/006_material_classification.sql`,
com SET LOCAL lock_timeout=3s, SET LOCAL statement_timeout=15s e ALTER TABLE
ADD COLUMN, em transação única. SHA-256 do arquivo aplicado:
`d68b21a52ccee2e56064a76879fb3f900e8d5b5d71e5fdc8160416ce49386786`.

Verificação posterior: category existe como text nullable, com CHECK das seis
categorias. O papel ceb_api_user mantém SELECT/INSERT/UPDATE. As mesmas 12 tabelas
e 244 registros conservaram os hashes anteriores (desconsiderando somente a nova
coluna category no formato de linha de materiais). Nenhum dado foi atualizado,
removido ou movido pela migração; questionários e tentativas permaneceram intactos.

## Teste real restrito executado

O bucket existente `ceb-materiais`, no projeto Free separado `ceb-arquivos`,
foi reconfirmado privado. Quatro originais técnicos preparados foram enviados por
URLs S3 temporárias do conector Neon, sem revelar ou alterar chaves permanentes.
O prefixo foi confirmado vazio antes de enviar; os PUTs incluíram If-None-Match: *.

Prefixo exclusivo desta execução:
`_validation/20261028/import-finalization-c037408dfe274cca9f792e72e2fc0707/`

| Objeto técnico | Bytes | SHA-256 |
| --- | ---: | --- |
| ceb-teste-tecnico.pdf | 613 | b99ec3a831e1ef3fc541959d6671c09ca8fff06e93345915cbd0d9439f1f31df |
| ceb-teste-tecnico.docx | 789 | cbcb9e9cda1323ee5dd406f41180b489650ec8c33c09915f630ef213cb77c224 |
| ceb-teste-tecnico.pptx | 769 | dc2b858b6c47d05a8f3fde03bb4e1404efafdf6308f27c7eecbdd04cbcd8f466 |
| ceb-teste-tecnico.html | 166 | 2fe2c0d6050f2eb4f75c5d56b69a5e5e8d5e34216b3dc5103290987dfc147dca |

Os quatro downloads autenticados retornaram os bytes/checksums originais.
Acesso anônimo foi negado para cada objeto. Inventário remoto confirmou exatamente
quatro objetos, somando 2.337 bytes. Nenhum objeto existente foi substituído.
Não foram criados registros em ceb_materials, contas, pastas ou sessões de teste.
Os arquivos permanecem privados no armazenamento, fora da listagem da Biblioteca.
As URLs temporárias não foram registradas no Git/relatório e foram removidas do
arquivo local de transporte depois do teste.

## Remoção limitada aos técnicos

Cada chave removível é o prefixo exato acima mais um dos quatro nomes da tabela.
O manifesto de execução também registra tamanho e hash de cada objeto. A operação
individual de remoção está disponível no conector para esse projeto/bucket; não
é necessário excluir bucket, prefixo amplo, backup ou documento do usuário.

Nenhuma exclusão foi executada. Para uma futura limpeza autorizada, reconferir
as quatro chaves/tamanhos e remover individualmente apenas os objetos desse
manifesto. Não usar exclusão recursiva nem seleção por nome parcial. A capacidade
de exclusão não foi testada destrutivamente nesta etapa.

## Limite da evidência e pendência final

Este teste prova upload/download e privacidade no armazenamento REAL, não o
fluxo completo de importação pela API do Worker. As URLs temporárias do conector
não comprovam o par de segredos instalado no Worker nem sua assinatura S3.

O Worker oficial permanece `6837e3db-ac5f-40ba-8b20-d09e9806aaca`, 100% do tráfego,
com CEB_UPLOADS_ENABLED=false. A versão publicada recusa todo upload antes de
acessar banco/Storage, sem exceção administrativa. Essa trava não foi contornada.
Não houve alteração de variável, credencial, plano, Hyperdrive ou versão.

Portanto, ainda NÃO há evidência suficiente para autorizar a liberação global.
Falta um teste autenticado da rota real do Worker com acesso de validação restrito,
seguido de comparação dos quatro originais e dos metadados/permissões. Uma exceção
segura exigiria preparar e autorizar explicitamente a publicação de código restrito;
a publicação de nova versão foi vedada nesta etapa. Não habilitar a flag global
como atalho nem representar o teste direto do Storage como teste do Worker.

A versão oficial foi preservada. Nenhuma nova branch/ambiente foi criada, nenhum
backup foi eliminado e nenhuma bateria funcional anteriormente aprovada foi repetida.
