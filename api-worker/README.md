# API da Central de Estudos Bíblicos

Este diretório contém a versão preparada do Worker para testar a conexão real com o Neon por meio do binding Hyperdrive.

## Arquivos
- `worker.js`: rotas públicas `/` e `/health`; ainda não expõe nem sincroniza estudos.
- `package.json`: dependência PostgreSQL `pg`.
- `wrangler.toml`: configuração Wrangler, `nodejs_compat` e binding Hyperdrive.

## Implantação
O código ainda precisa ser implantado no serviço Cloudflare existente e testado em produção. Não publique a partir de outra conta ou crie um novo Worker. Confirme que o binding `HYPERDRIVE` permanece conectado à configuração `ceb-biblioteca-db`.

**Segurança:** não implemente rotas de leitura/escrita de estudos até configurar autenticação real, autorização por proprietário e validação de entrada. A API atual não sincroniza dados e não altera os estudos locais.
