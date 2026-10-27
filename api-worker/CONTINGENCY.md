# Contingência compatível da biblioteca

Preparada em 27/10/2026; não publicada. Configuração: `wrangler.contingency.toml`. A versão normal continua em `wrangler.toml`. Ambas usam o mesmo Worker oficial, Hyperdrive e endpoint privado Neon, sem valores de segredos no repositório. Nenhum novo recurso, produto ou ambiente é criado.

## Comportamento validado

`CEB_WRITE_MODE=read_only` bloqueia POST/PUT/PATCH/DELETE e outros métodos de alteração antes de SQL/Storage. Retorna 503 com `code:CEB_READ_ONLY`, `Retry-After:300` e `Cache-Control:no-store`. Isso abrange estudos, pastas, arquivos, Lixeira/restauração, usuários, bootstrap e troca de senha. Modo explícito desconhecido também bloqueia. Ausência da variável mantém compatibilidade anterior; `normal` permite operações habituais.

Exceções: POST `/auth/login` e `/auth/logout` continuam com validação de senha, limites de tentativas e criação/revogação de sessões. Essas escritas de autenticação são intencionais. Usuário com troca obrigatória de senha permanece impedido de acessar materiais até sair da contingência; não se contorna essa restrição.

GET continua usando as mesmas verificações de sessão, papéis e propriedade, inclusive download e filtros de `deleted_at`. Materiais novos permanecem no banco e no storage. Arquivos particulares não se tornam públicos. `/library/capabilities` informa uploads:false mesmo se outra configuração indicar true. `/health` informa `writes_blocked:true` quando o banco responde. A interface recebe erro claro ao tentar salvar; o modo não promete acesso offline nem recuperação de alterações ainda não salvas.

## Preparação sem publicação

Na pasta `api-worker`:

```sh
npm ci
npm test
npx wrangler deploy --config wrangler.contingency.toml --dry-run
```

O dry-run empacota localmente e não publica. Não adicionar segredos a arquivos, logs ou comandos. A CI executa esse mesmo dry-run.

## Ativação futura — somente com autorização de publicação

1. Registrar o SHA aprovado, plano Free, UUID ativo e bindings atuais. Não alterar Hyperdrive/segredos.
2. Após migração 003 autorizada e conferida, publicar **o SHA aprovado** com esta configuração como primeiro checkpoint compatível. Não usar este backend antes de 003: suas consultas dependem de `deleted_at`/tabelas novas.
3. No painel, confirmar `CEB_WRITE_MODE=read_only` e `CEB_UPLOADS_ENABLED=false`. Registrar o novo UUID, conferir health/writes_blocked:true, login, leitura e permissões. Essa verificação da configuração é necessária também em rollback de versão: não presumir que todo valor ambiental foi revertido automaticamente.
4. Publicar a configuração normal do mesmo SHA somente depois da checagem anterior. Guardar o UUID compatível de contingência.
5. Diante de falha, selecionar no Cloudflare esse UUID compatível e conferir as variáveis; alternativamente publicar o SHA aprovado com `npx wrangler deploy --config wrangler.contingency.toml`, se a sessão/CLI autorizada estiver disponível. Não usar o Worker histórico que ignora Lixeira e contém DELETE físico.
6. Confirmar bloqueio, leitura e integridade dos IDs/novos materiais. Corrigir para a frente. Para retomar, publicar a configuração normal do SHA corrigido e revisado, uploads ainda false.

Não restaurar o banco inteiro a um ponto antigo após novas gravações. Não apagar tabelas/coluna, objetos, sessões de terceiros ou materiais. A contingência impede novas operações de domínio; requisições que já estavam em execução precisam terminar antes de aferir o estado, pois não há cancelamento transacional de requisições anteriores ao deploy. Não prometer congelamento instantâneo de tráfego em curso.

## Evidência e limites

Testes locais exercitam o entry point real do Worker com SQL simulado, além do roteador de download com objetos sintéticos. Cobrem tentativas de alteração em 16 rotas/métodos, modo inválido, autenticação, limite de login, logout, leitura/Lixeira, importação bloqueada, propriedade privada e bytes. Não constituem publicação real da contingência nem teste visual. As 26 verificações remotas anteriores continuam registradas em `RELATORIO_TESTES_FUNCIONAIS_20261027.md` e não foram repetidas com uploads habilitados nesta preparação.

Preparação local concluída: **65 testes aprovados**, build Vite/TypeScript e verificação de identidade aprovados, três dry-runs aprovados (normal, validação e contingência). Nenhum comando de deploy sem `--dry-run` foi executado. Nenhuma escrita SQL nesta etapa. A CI do SHA publicado na branch deve confirmar esses resultados antes de executar a sequência oficial.
