# Painel administrativo temporário — preparação, sem autorização de publicação

## Preparado

- UploadProbePanel: seção recolhível somente no componente CebAdmin, que App monta
  exclusivamente para role=admin. Não solicita nem mostra credenciais.
- Usa o token que a aplicação já possui em memória. Não lê localStorage, não
  exporta sessão, não faz novo login/logout e não interfere na sessão do usuário.
- GET /auth/me antes de qualquer envio; role=admin e must_change_password=false.
- Consulta configuração temporária no Worker, confere manifesto inteiro e SHA-256
  dos quatro originais antes do primeiro PUT. Sem seletor de arquivo arbitrário.
- Um clique por montagem, ref síncrona contra duplo clique, sem repetição automática,
  etapas técnicas de sucesso/falha e nenhuma mensagem recebida do servidor exibida.
- Rota administrativa normal do Worker reaproveitada; download com CORS limitado
  à origem oficial; upload geral permanece false. Proteções previamente preparadas:
  janela máxima de 30 minutos, objetos novos com destinos fixos, tamanho/digest
  exatos, escrita condicional assinada If-None-Match:*. Sem SQL de gravação.

O script PowerShell não é necessário para este caminho e não será distribuído
como procedimento recomendado. Não alterar a autenticação para carregar o painel.

## Base oficial preservada e implantação mínima

A main 796d89fbd79bcba5cb856b17a528c67b98e5d428 é ancestral do merge local
2620af98abe8ac8e01f861016cd82b1bdc3e3f46. Cinco commits oficiais foram incorporados
sem conflitos, sem nova branch. A preparação temporária NÃO usa o pacote completo
da branch de importação. Os dois scripts prepare-restricted-upload-* montam
fontes locais da base oficial fixada, aplicando somente painel/runner/fixtures
na interface e hook/rota/escrita condicional no Worker. Se main mudar, bloqueiam.
Não alteram cloud, banco, credenciais ou plano.

A compilação TypeScript/Vite da interface restrita foi aprovada. A compilação
normal da branch também passou, mas seu resultado NÃO deve ser publicado nesta
etapa. A montagem restrita conserva os demais arquivos oficiais literalmente.

## Verificações novas executadas

scripts/test-upload-probe-runner.mjs: perfil não administrativo interrompe antes
da descoberta/envio; configuração ausente interrompe; falha de Storage interrompe;
quatro originais passam pelo módulo real da rota, com Storage em memória, checksums,
negação anônima e rejeição de sobrescrita; mensagens não expõem token; descoberta
administrativa e CORS de download limitados à origem oficial. Todos aprovados.
São verificações locais, não evidência de upload real no Worker publicado.

scripts/test-upload-probe-panel.mjs preparado para navegador local: não executou
as verificações visuais porque Chromium não está disponível. A instalação pelo
download oficial falhou por arquivo inválido. NÃO declarar essa validação aprovada.
Nenhuma bateria antiga repetida. Nenhuma publicação feita.

## Sessão atual do William — limitação importante

App mantém token em useState, sem persistência. Publicar assets não modifica a
página já carregada: para obter o painel é preciso recarregar, o que perde esse
estado e pode exigir entrar novamente pela tela normal da CEB. Confirmar que o
usuário consegue refazer o login normal (por exemplo com credencial salva no
navegador), sem informar segredos na conversa. Não prometer aproveitamento da
sessão atualmente aberta após atualização. Não extrair token de estruturas React.

## Plano de publicação/removal — somente após autorização futura

1. Resolver a pendência de verificação visual do painel; confirmar nova entrada
   normal caso a atualização peça login. Nenhuma garantia absoluta de ausência de
   regressões é possível somente com compilação.
2. Reconsultar main e estado real do Worker/Pages imediatamente antes da publicação.
   Registrar versões/artefato íntegro da interface e ID do Worker oficial para rollback.
   Os IDs antigos do relatório anterior não substituem essa conferência atual.
3. Guardar artefato anterior da interface e empacotar exclusivamente os overlays
   restritos; inspecionar diff permitido. Preservar bindings/segredos/Hyperdrive,
   plano e proteção Workers Builds. Não acionar o workflow que publica a branch inteira.
4. Publicar Worker restrito (flag false) e, após checagens mínimas, interface restrita;
   configurar run UUIDv4 novo e start/end UTC, máximo 30 minutos, somente durante
   a janela coordenada. Configuração ausente/expirada bloqueia tudo.
5. William atualiza, entra normalmente se necessário e abre Administração > Teste
   administrativo temporário de importação > Executar teste dos quatro arquivos.
   Envia somente mensagens técnicas de resultado. Nenhum token/captura de rede.
6. Em falha relevante, restaurar imediatamente o Worker e a interface anteriores;
   não repetir escritas automaticamente. Não habilitar upload geral.
7. Em sucesso, igualmente restaurar os dois artefatos oficiais anteriores, remover
   CEB_UPLOAD_PROBE e confirmar Worker com 100% tráfego e upload geral false.
   Remover integralmente os hooks/módulos do pacote oficial e da branch após revisão;
   os commits auditáveis permanecem no histórico Git. Não deixar painel escondido
   como mecanismo permanente de acesso.
8. Verificar rota indisponível na versão corrente e, ao vencer a janela original,
   também em qualquer URL histórica da versão restrita. Rollback sozinho não revoga
   configurações de uma versão antiga. Só declarar encerrado após essas negativas.

Os quatro objetos novos permanecem privados, fora da Biblioteca. Não apagar objetos
anteriores. Caso se deseje removê-los, validar as quatro chaves exatas e sua autorização
específica; não usar exclusão recursiva nem adicionar DELETE ao painel.

## Estado

Preparação local concluída; verificação visual pendente; teste real e publicação
pendentes. Nenhum Worker/Pages novo, upload geral ou alteração no Neon nesta etapa.
O push Git anterior falhou por ausência de autenticação HTTPS no terminal; os commits
locais não devem ser apresentados como já enviados ao GitHub.
