# Publicação temporária e reversão — mecanismo preparado, NÃO acionado

## Preservação

O commit 2b6cda1e0735e5295a1786f8254a763be9ccc30c e seus ancestrais são
preservados. A interface oficial é a publicada do SHA
796d89fbd79bcba5cb856b17a528c67b98e5d428, execução Pages 40758504979.
O artefato original 12847875501 foi baixado e verificado por SHA-256:
9151673de1e2a9dea3aa0edc679f909a7467b4971e9279a4df2f24cea9f347a6.
A cópia exata fica em ops/recovery/pages-official-796d89f.zip, sem dados de
sessão, banco ou credenciais. O tar interno tem SHA-256
8240638df35f2e385ae4f869493152d862a9978796a04c0e41b3b8ac4e8b4210.
A cópia versionada elimina a dependência da expiração do artefato antigo.

Worker oficial de retorno: 6837e3db-ac5f-40ba-8b20-d09e9806aaca,
implantação a85fb6ec-1a35-4137-8969-f2acb47d31e2. Antes de qualquer
publicação, reconfirmar que ainda recebe 100% do tráfego, flag global false,
configuração CEB_UPLOAD_PROBE ausente e bindings/compatibilidade intactos.

## Rotina manual existente, ampliada sem publicar interface

Apenas .github/workflows/deploy.yml é registrado na main para habilitar as
operações no workflow já existente e usar o ambiente github-pages existente.
Esse caminho já é excluído dos gatilhos de publicação por push; commit de
preparação também contém [skip ci]. Nenhum arquivo da aplicação oficial é
alterado nessa atualização da main. O comportamento de publicação normal é
preservado. A fila Pages deixa de cancelar execuções em curso.

Operações novas somente workflow_dispatch, executado na main:

- prepare-upload-probe: checkout do SHA completo da branch existente; instala
  ferramentas já usadas e empacota, sem rodar testes funcionais nem publicar.
  Produz ceb-upload-probe-packages com manifest e dois diretórios: official e
  restricted. Nenhuma permissão Pages/OIDC no job de preparação.
- publish-upload-probe: exige SHA completo, ID de preparação bem-sucedida e
  confirmação CEB_TEMPORARY_PANEL_ONLY. Verifica cada hash, origem do workflow
  e manifesto; publica somente restricted no Pages oficial.
- restore-official: mesmos controles, confirmação CEB_RESTORE_OFFICIAL;
  publica official, o conteúdo byte a byte do artefato oficial preservado.

A ferramenta GitHub atualmente conectada não expõe workflow_dispatch. Portanto,
se isso não mudar, o acionamento terá de ser feito pelo botão Run workflow do
GitHub, pelo William em sua sessão normal. Não se deve contornar isso por replay
arbitrário, credenciais novas, comandos com tokens ou publicação automática por push.
Preparação local verificada não será apresentada como execução bem-sucedida no Actions.

## Pacote mínimo

scripts/package-upload-probe-release.mjs verifica SHA do backup, extrai somente
entradas seguras, monta a base oficial com os três arquivos do painel e a montagem
em CebAdmin, compila essa fonte restrita e sobrepõe apenas index.html e assets.
Todos os demais bytes oficiais, inclusive /preview/, são preservados. Os assets
antigos também permanecem para abas ainda abertas. Migrações e a interface completa
de importação não entram no pacote. A verificação recusa qualquer fonte revisada
do teste alterada em relação ao 2b6cda1 ou qualquer mudança oficial de aplicação.
A exceção à comparação com main é somente o workflow de implantação.

O Worker é montado por scripts/prepare-restricted-upload-worker.mjs da mesma base
oficial, com hook e módulo restrito e escrita condicional. Foi empacotado com
Wrangler --dry-run; não ocorreu publicação. O upload e o deploy futuros serão
feitos pelo conector Cloudflare com herança de todos os bindings existentes,
compatibility_date/flags preservados e apenas CEB_UPLOAD_PROBE adicional.
Não usar o workflow que publica o Worker inteiro da branch.

## Sequência autorizável, ainda NÃO executada

1. Executar prepare-upload-probe na main com o SHA completo do mecanismo na branch
   de trabalho. Conferir sucesso e registrar o ID. Esse passo não publica.
2. Após autorização específica, reconfirmar baseline oficial e rollback.
3. Publicar somente Worker restrito, global false, UUIDv4 novo e janela UTC de no
   máximo 30 minutos. Registrar ID dessa versão e a URL histórica, se habilitada.
4. Executar publish-upload-probe com o SHA/ID de preparo e a confirmação exigida.
   Conferir Pages concluído. Em qualquer falha, restaurar Worker e interface.
5. William atualiza a CEB, faz login normal se necessário e vai a Administração >
   Teste administrativo temporário de importação > Executar teste dos quatro arquivos.
   Não pedir senha/token na conversa; aguardar o resultado, sem simular o teste real.
6. Após sucesso OU falha, retornar o tráfego do Worker à versão oficial anterior e
   retirar a configuração temporária. Executar restore-official com o mesmo pacote
   preservado. Não alterar configurações do Neon ou credenciais.
7. Conferir ausência do painel após recarregar a CEB, hash do index oficial,
   Worker oficial a 100%, flag false e rota indisponível. Ao vencer a janela,
   verificar também a negativa na URL histórica da versão temporária. Só então
   declarar encerrado. Versões antigas têm configurações próprias; rollback
   isolado não comprova a revogação histórica.
8. Remover os hooks/módulos temporários do código corrente da branch após revisão;
   conservar histórico Git e backup. Os quatro objetos técnicos novos continuam
   privados fora da Biblioteca; não apagar objetos sem conferir as chaves exatas
   e a autorização. Nenhuma exclusão de material existente faz parte do processo.

## Verificações desta preparação

- Integridade ZIP, tar e fonte oficial confirmados.
- Empacotamento restrito e comparação de todos os arquivos fora dos novos assets
  e index; diretório official preserva byte a byte a versão publicada.
- Manifesto de hashes verificado; alvo e SHA de empacotamento conferidos.
- YAML analisado: operações temporárias manuais, main-only, confirmações exatas;
  job de preparação não contém deploy; não cria ambiente novo.
- Dry-run do Worker restrito sem implantação.
- Nenhum teste funcional anterior repetido; inspeção visual básica Windows v2
  já aprovada pelo William. Não se afirma teste real de Storage/Worker concluído.

Nada nesta preparação libera upload geral, publica a interface completa de
importação, grava no banco, altera secrets, AI, questionários ou matrículas.
