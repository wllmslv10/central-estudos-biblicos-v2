# Preparação do teste administrativo Windows — nenhuma publicação

A branch incorporou a main 796d89fbd79bcba5cb856b17a528c67b98e5d428 mediante merge
2620af98abe8ac8e01f861016cd82b1bdc3e3f46; os cinco commits oficiais são ancestrais.

## Execução proposta

Windows PowerShell 5.1 (Windows 10/11) ou PowerShell 7, sem Node, módulos extras,
permissão administrativa do Windows ou alteração permanente de ExecutionPolicy.
Extrair scripts/upload-probe com seus seis arquivos na mesma pasta e executar:

    powershell.exe -NoProfile -File .\Testar-CEB.ps1 -RunId UUID_DA_EXECUCAO

O UUID público será definido somente após autorização e publicação restrita.
Se a política local impedir scripts não assinados, não alterá-la automaticamente;
parar e avaliar a restrição antes da execução. Não orientar desbloqueio global.
O executor não deve ser iniciado dentro de sessão com transcrição/depuração ativa.
Ambos os campos são Read-Host -AsSecureString. Valores só são convertidos em memória
para o login HTTPS normal. Não imprimir exceções, corpos de resposta ou tokens.
O processo não é capaz de garantir apagamento físico imediato de strings no heap
.NET; encerrá-lo após o uso. Não há arquivos de credenciais, variáveis de ambiente,
argumentos de senha, histórico contendo senha ou exportação de sessão.

Autenticação: POST /auth/login e GET /auth/me; exigir role=admin e ausência de
must_change_password. Falhar antes de qualquer PUT se não houver confirmação.
Finalmente POST /auth/logout para revogar a própria sessão normal de teste.
Não há credencial nova ou personificação de conta. O login/logout produzem apenas
os registros normais existentes de sessão/autenticação aceitos pelo usuário.

## Exceção proposta

CEB_UPLOADS_ENABLED permanece literalmente false. Novo CEB_UPLOAD_PROBE ausente
por padrão: fail closed. Config temporária contém run (UUIDv4), start/end UTC,
intervalo máximo 30 minutos. Não é segredo e não substitui autenticação.
A rota /library/_upload-probe/{run}/{pdf,docx,pptx,html} fica depois da autenticação
normal do Worker; verifica novamente admin e troca de senha pendente.
Somente PUT e GET, bytes/sha256 exatos, chave fixa por execução/formato, limite
menor que 1 KB por arquivo; If-None-Match:* assinado impede sobrescrita atômica.
Sem DELETE, SQL de gravação, registro de material, pasta ou alteração de permissão.
Os objetos ficam privados e fora da Biblioteca. O teste confirma download exato,
negativa anônima e negativa de segunda escrita. Não há retries automáticos.

Os originais somam 2.337 bytes; nomes, tamanhos, hashes em files.json e no manifesto
do Worker. Somente estes quatro conteúdos são permitidos. Não há IA/serviço novo.

## Publicação restrita futura — depende de autorização

Não publicar o Worker inteiro da branch, pois contém mudanças de importação ainda
não liberadas. scripts/prepare-restricted-upload-worker.mjs gera staging LOCAL da
base oficial fixada e injeta exclusivamente hook, módulo de teste e método aditivo
de escrita condicional. Se origin/main mudou, interrompe para nova revisão.
Preservar bindings, secrets, Hyperdrive, flag global, build guard e runtime.
Registrar versão anterior, SHA completo do overlay e janela real de execução.

Depois de o usuário executar o script e informar somente o resultado não sensível:
restaurar a versão oficial anterior, remover configuração temporária e confirmar
100% do tráfego original. Confirmar negação da rota e também expiração da versão
restrita, inclusive em eventual URL histórica; rollback sozinho não comprova isso.
Não declarar teste encerrado antes dessas verificações. Nenhuma ativação global
nem publicação Pages está autorizada nesta etapa.

## Evidência desta preparação

Três testes novos direcionados passaram: permissões/expiração/configuração;
roundtrip local dos quatro originais com rejeição de alterações/sobrescrita;
assinatura real aws4fetch do cabeçalho condicional com resposta Storage simulada.
Nenhum teste antigo foi repetido. Estes testes NÃO comprovam acesso ao Storage
real pelo Worker; a execução autenticada continua pendente. Sintaxe JS e diff
verificados; staging restrito preparado sem publicar. Executor revisado para a
sintaxe PowerShell 5.1, porém ainda não executado em Windows neste ambiente.
