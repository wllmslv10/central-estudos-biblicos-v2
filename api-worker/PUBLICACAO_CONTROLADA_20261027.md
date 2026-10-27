# Publicação controlada — CEB V2 — 27/10/2026

Autorização expressa recebida de William para migrar somente 003 e publicar backend/interface, mantendo importações bloqueadas. Sem tarefa #4, sem novo ambiente visual, sem contratação.

## Antes da execução
- Worker ativo informado pelo titular no painel: `53687edf-f915-4c41-96d0-f095c34960ba`, tráfego 100%.
- Main/Pages: `da144968e95682b260faffaf87c8d0bec8663b2b`.
- Branch oficial Workers Builds: `feature/sincronizacao-nuvem-ceb`, antes `72c223d1dfd4c5cf502513c516e2978761f1a2d9`; comando conhecido npx wrangler deploy, diretório /api-worker.
- Código aprovado do PR #3: `35b3d701fc663e2d7fd0a5787e946db2c2cef4c9`; CI concluída sem falhas (teste funcional intencionalmente skipped, upload fechado).
- Backup Neon: `br-late-tooth-b4g3b04j`, ready, sem compute. Ponto 27/10/2026 10:20:20 Brasília, LSN `0/23C7738`.
- Produção revalidada: 1 estudo, 5 usuários, 52 sessões. Fingerprint estudos `72147daa994d197645e73d01e5334b15`.
- Lição preservada: `35ebc974-6f34-4222-827d-05d747b40de1`, “A Postura do Cristão Diante das Ofertas do Mundo”, MD5 `5a39fbb0b1723009162bfb1d1ed208bd`.
- Antes: sem ceb_folders/ceb_materials/deleted_at. Nenhuma DML planejada na migração.
- Neon ceb-biblioteca e ceb-arquivos reconfirmados free_v3. Limites Cloudflare informados no painel pelo titular (100k requests/dia, 200k logs/dia, 3000 minutos builds/mês) correspondem ao Workers Free publicado. Não alterar plano, cartão, assinatura ou recursos. Nenhuma ativação R2/KV/D1/outro produto.
- Hyperdrive preservado `48d8b2d8d2a048a1a90219030f4b9329`. Segredos existentes não lidos nem substituídos.

## Primeiro checkpoint de backend

Este commit integra SOMENTE runtime, dependências, migração/documentação da API. Frontend/identidade da branch oficial preservados. wrangler.toml está read_only e uploads:false; o push dispara apenas a publicação desse backend de contingência. Não usa configuração/entrada/SQL de validação.

Registrar o UUID retornado pelo Workers Builds e conferir saúde/contingência antes do próximo passo. Em erro inesperado, parar sem publicar interface e sem desfazer tabelas/coluna/dados. Rollback posterior usa backend compatível, nunca reset global do banco ou Worker histórico com DELETE físico.

## Execução confirmada

- Backup FINAL imediatamente antes da migração: `br-muddy-water-b4noco4g`, `backup-final-ceb-publicacao-20261027`, ready, sem compute; ponto 27/10/2026 12:52:55 Brasília, LSN `0/2454418`. Backup anterior preservado. Seis branches dentro do limite Free de dez.
- Migração 003 executada em transação via conexão direta Neon, com lock_timeout 3s, statement_timeout 30s, pré-condições de schema e pós-condições da lição/inventário. Sem DML, exclusão ou sobrescrita.
- Pós-migração: 1 estudo, MD5 original, 0 materiais, 0 pastas, 0 estudos na Lixeira. Acesso às tabelas verificado com role ceb_api_user.
- Primeiro backend: commit `9688a5ed86433f31a4f26a29b7d87249af25edb2`, build `0654de88-0ceb-4630-a964-b2159d4e8ae4` aprovado. UUID compatível de contingência **`a230f532-19f7-4fa3-b8cb-67d911a55a90`**.
- HTTP real oficial: /health banco conectado e writes_blocked:true; /library/materials sem sessão retorna Sessão inválida ou expirada. Acesso anônimo não libera os materiais.
- Próximo checkpoint usa exatamente a mesma API com CEB_WRITE_MODE=normal e CEB_UPLOADS_ENABLED=false. Nenhuma mudança de Hyperdrive, segredo, endpoint de arquivos, autenticação ou interface.

## Estado final desta execução — interface ainda NÃO publicada

- Segundo backend oficial aprovado: commit `5fa8f36d532b93e2eafd892f65164c3860e2aadc`, build `efe40112-6a23-4230-8c7b-c3212bafca1e`, UUID **`4b36fe35-429d-4e14-a59a-e64ffc1ebda9`**.
- HTTP oficial após deploy: /health banco conectado, writes_blocked:false; /library/materials sem sessão continua negado. Uploads:false no config publicado, sem alteração das credenciais. Nenhum upload foi realizado ou autorizado.
- CI de API e frontend da branch oficial aprovadas. Contudo, o Cloudflare acionou adicionalmente o Worker de validação sobre a branch feature, e esse check terminou failure: build **`1de03684-de53-4e3a-825d-4bd1a468dd69`**, check `122301387084`.
- A configuração anterior restringe o Worker de validação à branch work/biblioteca-nuvem-20261026 por WORKERS_CI_BRANCH. Isso pode explicar a rejeição da branch feature, mas a saída GitHub não contém logs nem motivo; não declarar essa hipótese como causa confirmada.
- Em cumprimento à regra de interromper em erro inesperado, a sequência foi interrompida ANTES do merge/publicação da interface. Main permanece da144968e95682b260faffaf87c8d0bec8663b2b. PR #3 não foi integrado. Não reverter migração aditiva nem banco. Backend oficial saudável e compatível com app atual.
- Falta consultar apenas a mensagem de erro do build de validação no painel Cloudflare já autenticado do titular; sem novas credenciais, sem repetir segredos, sem tentativa de login Work. Se for somente o bloqueio esperado da branch, documentar a evidência e retomar a sequência já autorizada; se outro erro, avaliar antes de alterar produção.
- Backup do bundle Pages anterior preservado fora da retenção curta da CI: artifact original 12704655531, SHA256 `8b62867554b4ad19ab67bb9cb83517404eaa9cd1ba25c8e827ced0d07d334b5c`, ZIP 528659 bytes, `CEB_Pages_antes_biblioteca_da144968.zip`. Identidade persistente `libfile_08d0774fab8c8191af249ee4b1fd637b`.
- Integridade reconferida após a interrupção: estudo e lição preservados; nenhuma inserção de usuários/sessões/material/pasta feita por este procedimento. Nenhuma alteração de identidade, gerador HTML, leitura ou tarefa #4; nenhum dado local apagado. Nenhum plano/produto pago ativado.
