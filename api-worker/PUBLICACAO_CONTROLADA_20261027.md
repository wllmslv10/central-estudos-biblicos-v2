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
