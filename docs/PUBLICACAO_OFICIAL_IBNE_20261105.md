# Publicação oficial CEB V2 — IBNE

Aplicação completa publicada em 05/11/2026, a partir da revisão aprovada `80791f157150a6846f8b2dbc8e90471e5c7f8987` da PR #28, mais a configuração de implantação oficial nesta branch. Sem merge das branches empilhadas para main, pois isso acionaria publicações nos ambientes antigos.

## Recursos independentes

- Origem: https://ceb.ibne.workers.dev (redireciona para `/central-estudos-biblicos-v2/`).
- Cloudflare: conta IBNE `f56673173860a1b8427a494fc91d0ee3`, Worker `ceb`.
- Implantação inicial: `06bd2d7ef3454cad92066d15c1a3ed83`.
- Implantação final com tratamento explícito de caminhos HTML: `d20e3152a7fd400caa9e027995c0fb46`.
- Neon: `ceb-v2-oficial-ibne`, projeto `weathered-snow-72249145`, branch `br-crimson-dust-bdnk3ldg`, banco `neondb`, região `aws-us-east-2`.
- Hyperdrive exclusivo `b586f9e7837140b5942b8f70b8210c50`, cache desativado, papel de execução `ceb_worker` limitado à leitura e escrita no esquema public; não utiliza neondb_owner.
- Bucket privado novo `ceb-materiais` no próprio projeto novo. Secrets de armazenamento exclusivos do Worker oficial.
- Compute limitado a 0,25 CU. O intervalo de suspensão é controlado pelo plano da conta; a API não permite modificá-lo.
- Administrador `william`, troca obrigatória da senha temporária no primeiro acesso. Nenhum bootstrap público habilitado.
- Workers AI preservado com limites gratuitos e sem fallback pago.

Nenhum material, conta ou histórico foi migrado. Os recursos do laboratório, CEB antiga e Escala não foram modificados. A conta antiga conserva seu subdomínio. A biblioteca nova começa vazia, exceto pelo administrador inicial.

## Construção e publicação

`VITE_CEB_API_BASE=https://ceb.ibne.workers.dev npm run build`

`api-worker/wrangler.official.toml` é a configuração exclusiva desta implantação. Não usar `wrangler.toml` nem `wrangler.validation.toml` para publicar na conta IBNE. A configuração permite a mesma interface e PWA na rota existente e serve a API na mesma origem.

O esquema inicial novo foi criado com `api-worker/setup/fresh-install.sql`, seguido das migrações 001–006, transacionalmente. O arquivo fresh-install é exclusivo de banco novo vazio, não é migração para bancos existentes. As instruções de GRANT das migrações usam o papel ceb_api_user sem login; o Worker usa o papel limitado ceb_worker.

Os assets foram enviados pela API de upload direto da Cloudflare, e a API compilada por Wrangler foi publicada com os mesmos bindings da configuração oficial. Nenhum token de conta ou segredo está neste repositório. Para futuras publicações com Wrangler, usar credenciais próprias da conta IBNE, mantendo os secrets existentes.

## Verificações

- Compilação TypeScript/Vite e dry-run Wrangler aprovados.
- 44 testes frontend e 212 testes de API preexistentes aprovados.
- 3 testes novos: roteamento da aplicação/PWA, origem oficial restrita ao runtime correto e isolamento do armazenamento com bytes preservados.
- Identidade visual aprovada pelo verificador do repositório.
- Health remoto: banco conectado e quatro tabelas básicas disponíveis.
- Login administrativo real por API, listagens inicialmente vazias, criação e consulta persistida de estudo.
- Capabilities remotas: categorias e upload habilitados, máximo de 20 MB.
- Upload HTML e download remoto comparados byte a byte com sucesso.
- Manifesto, service worker e dois ícones remotos disponíveis.
- JavaScript e CSS publicados comparados com os bundles locais, byte a byte. Tratamento de HTML configurado como none para preservar a rota de instalação sob o prefixo da aplicação.
- Tela de login real renderizada no navegador, com instruções de instalação PWA.

A validação autenticada desta publicação foi pela API; não foi concluída nova navegação autenticada no navegador. Os controles de leitura são os da versão aprovada e cobertos pelos testes existentes; a instalação física no celular fica para o teste do usuário. A observação da PR #28 sobre possível tela branca no questionário não foi reproduzida nem declarada resolvida nesta publicação.

Os materiais sintéticos utilizados na verificação são removidos antes da entrega. Nenhum conteúdo real foi utilizado para esse teste. Senhas e tokens temporários não devem ser incluídos nesta documentação.
