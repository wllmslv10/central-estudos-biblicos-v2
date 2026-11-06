# Operação da CEB oficial da IBNE

A CEB oficial usa o Worker `ceb` na conta Cloudflare IBNE. A produção atende em https://ceb.ibne.workers.dev. O banco oficial é o projeto Neon `ceb-v2-oficial-ibne`, branch `br-crimson-dust-bdnk3ldg`. O Worker usa o Hyperdrive e o armazenamento privado já configurados nessa conta.

## Desenvolvimento e validação

Trabalhe em `work/ceb-oficial-ibne`. O workflow `CEB oficial IBNE` compila a interface para a origem oficial, executa os testes de interface e API e prepara o Worker localmente. Mudanças de esquema precisam ser testadas em PostgreSQL local com dados sintéticos e aplicadas separadamente ao projeto oficial mediante autorização.

Para a migração 007, a implantação da IBNE marcou como principal a conta administrativa ativa `william`. Verifique se existe exatamente uma conta ativa com esse login antes de reproduzir a marcação em uma instalação oficial nova. A proteção do banco bloqueia exclusão, desativação e retirada do perfil administrativo dessa conta.

## Habilitação única da implantação pelo GitHub

1. Em **Settings → Environments**, crie `ibne-ceb-production`. Restrinja implantações à branch exata `deploy/ceb-oficial-ibne` e configure a aprovação de produção.
2. Cadastre no ambiente o secret `CEB_IBNE_WORKERS_TOKEN`, usando uma credencial da Cloudflare limitada à conta IBNE e à publicação de Workers. Insira o valor diretamente nas configurações do GitHub.
3. Em **Settings → Secrets and variables → Actions → Variables**, defina `CEB_OFFICIAL_CI_ENABLED=true` depois de configurar o ambiente.
4. Para publicar uma revisão autorizada, avance `deploy/ceb-oficial-ibne` até o commit aprovado. O workflow valida a revisão, prepara uma versão, compara os vínculos e as configurações com a versão ativa e verifica o HTML, o JavaScript e a saúde da API no endereço oficial.
5. Se a versão candidata já tiver sido ativada e a verificação falhar, o workflow restaura a versão anterior se a candidata ainda estiver ativa. Migrações são independentes e o rollback do Worker não reverte o banco.

A preparação do ambiente exige credenciais dos provedores e acesso às configurações do repositório. A publicação direta pelo conector Cloudflare continua disponível no Work. O app GitHub das conversas comuns oferece leitura conforme o plano e a superfície. Para editar e publicar código com a mesma conta do ChatGPT, use o Codex e autorize apenas este repositório. A capacidade efetiva depende das ferramentas e credenciais expostas nessa sessão.
