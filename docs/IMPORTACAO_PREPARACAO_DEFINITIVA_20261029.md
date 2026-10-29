# Importação definitiva — preparação em 29/10/2026, sem publicação

Atualização posterior desta preparação: requisito de Lixeira unificada implementado
na mesma branch; ver `LIXEIRA_UNIFICADA_20261029.md`, inclusive a recuperação
compatível necessária após exclusões definitivas. Esse plano posterior substitui
o retorno direto ao Worker antigo após uso da nova Lixeira. A publicação segue
não autorizada.

## Encerramento do teste controlado

William confirmou execução real dos quatro originais técnicos no navegador:
PDF, DOCX, PPTX e HTML, com perfil admin confirmado pelo Worker, envio, recuperação,
checksums e bloqueios aprovados. Não repetir esse teste nem a bateria anterior.
Preparação: run 40810683297 (#134); publicação temporária: 40811665357;
restauração da interface: 40813862567, com sucesso. Os 14 arquivos oficiais
foram conferidos por hash após a restauração.

Cloudflare, consulta de 29/10/2026 10:34:52 UTC (07:34:52 Brasília):
- Worker oficial 6837e3db-ac5f-40ba-8b20-d09e9806aaca, tráfego 100%;
- CEB_UPLOADS_ENABLED=false e CEB_UPLOAD_PROBE ausente na versão ativa;
- versão histórica 2fe7ad0b-f1c2-4cab-b7cc-6c3a0db97da5 possui fim fixo
  2026-10-29T03:56:06.050Z (00:56:06 Brasília), já ultrapassado;
- o código dessa versão recusa o teste a partir de now >= end, inclusive em
  URL de versão antiga. A janela não se renova por rollback nem por recarregar.

A evidência é a configuração/versão real da Cloudflare e a condição de expiração
no código histórico, não uma nova chamada autenticada à URL antiga. O cliente
HTTP técnico deste ambiente recebeu bloqueio de borda 1010 anteriormente; não
atribuir um status HTTP 404 autenticado a uma chamada que não foi executada.
Nenhuma alteração de previews, credenciais ou configurações adicionais foi feita.

## Limpeza somente na branch existente

- Retirados painel, runner, fixtures, rota de teste, manifesto, testes específicos,
  executor PowerShell e empacotadores temporários.
- CebAdmin, worker.js e neon-storage.js voltam exatamente aos bytes oficiais da
  base 796d89f. Nenhuma alteração em Gestão de Alunos, login, AI, questionários,
  compartilhamento ou apresentações.
- O workflow de Pages volta, somente nesta branch, à rotina oficial anterior,
  sem operações temporárias. A main NÃO é alterada nesta preparação. Essa retirada
  será integrada apenas na publicação definitiva autorizada.
- Mantidos relatórios históricos, backup versionado ops/recovery e todos os commits
  originais (incluindo 2b6cda1 e e155399). Remover arquivos na versão corrente não
  apaga seus conteúdos do histórico nem os objetos técnicos privados no Storage.
- Os quatro objetos técnicos não foram excluídos, documentos existentes não foram
  alterados e nenhuma consulta/escrita no Neon foi executada nesta preparação.

## Candidato definitivo preservado

Diff funcional limitado a api-worker/materials.js, src/App.tsx e src/cebApi.ts,
mais a migração 006 já aplicada, documentação e verificações existentes.
Mantém as seis categorias reutilizadas, pasta existente por ID, criação de pasta,
visibilidade particular/geral, caminho antes de salvar, prévia/confirmar, texto
extraído integral e original PDF/Word/PowerPoint/HTML. Não converte documentos em
lição estruturada, não move materiais antigos e não toca nas apresentações HTML.

Migração 006/recuperação, permissões, classificação/pastas/formatos e editor já
foram verificados nas etapas anteriores. Hoje não se executa migração nem se
repete teste funcional. As verificações de limpeza comparam bytes oficiais,
confirmam ausência dos módulos/hooks e conferem escopo do diff/sintaxe.

## Sequência para autorização definitiva futura

1. Conferir refs atuais antes da integração e registrar a fonte candidata completa.
   Não criar branch; usar work/ceb-biblioteca-etapa1-20261027 existente. Evitar abrir
   PR que dispare novamente as baterias já aprovadas sem necessidade.
2. Reconfirmar Worker oficial e artefato de recuperação preservados. A cópia ZIP
   oficial em ops/recovery tem SHA-256
   9151673de1e2a9dea3aa0edc679f909a7467b4971e9279a4df2f24cea9f347a6.
   A main atual be98bc2 também conserva o mecanismo manual de recuperação ainda não
   alterado. Se necessário, a execução de restauração 40813862567 possui job
   probe-pages 123250279990, reexecutável com seus mesmos parâmetros e pacote
   preservado. Não disparar recuperação ou publicação nesta preparação.
3. Após autorização específica, publicar somente o Worker final com bindings,
   compatibilidade, credenciais e Hyperdrive preservados. Alterar a flag de upload
   para true somente se incluída expressamente na autorização. Não usar a exceção
   histórica nem reabrir janela de teste. Não reaplicar migração 006.
4. Confirmar a versão/capacidades; então integrar a branch em main preservando a
   ancestralidade oficial. O push/merge em main publica a interface pelo workflow
   normal. Não usar publish-upload-probe, prepare-upload-probe ou restore-official
   para a publicação definitiva.
5. Conferir os identificadores e o funcionamento básico da versão publicada, sem
   recriar o teste dos quatro arquivos nem materiais de usuários. Em falha relevante,
   retornar ao Worker oficial com flag false e à interface oficial preservada;
   não desfazer a migração aditiva nem restaurar um banco sobre dados atuais.

Nenhuma ação do William no GitHub é necessária para esta limpeza/preparação.
O conector permite registrar commits na branch existente preservando os ancestrais.
Se uma regra de integração/permissão do repositório exigir intervenção no momento
futuro da publicação, informar a ação concreta; não pedir credenciais pela conversa.
Não há publicação definitiva nem liberação de upload autorizada nesta etapa.
