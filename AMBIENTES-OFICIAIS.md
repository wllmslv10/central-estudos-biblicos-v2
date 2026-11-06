# AMBIENTES OFICIAIS — IBNE
Atualizado em 2026-11-06. Documento de referência operacional; sempre verificar o estado real antes de alterações.

## CEB V2 — PRODUÇÃO ATUAL
- Aplicativo: Central de Estudos Bíblicos — Igreja Batista Nova Esperança.
- Endereço oficial: https://ceb.ibne.workers.dev
- Cloudflare: conta **IBNE**, subdomínio workers.dev **ibne**, Worker **ceb**.
- Confirmado via API Cloudflare em 2026-11-06: Worker ceb implantado; configuração CEB_RUNTIME=official-ibne, ASSETS, Hyperdrive e armazenamento Neon.
- Banco: conexão Hyperdrive do ambiente oficial; não registrar credenciais ou IDs sensíveis neste documento.
- Repositório de referência: wllmslv10/central-estudos-biblicos-v2.
- **ORIGEM IDENTIFICADA (2026-11-06):** Worker `ceb` versão 16, deployment Cloudflare `18b73a40-b855-4e7a-941d-88bb6f2bb68d`, versão `290c60ee-f808-4732-99e6-206b7c9c1093`, anotação `CEB IBNE 5ba91d189e687f6206cb8e3efeaa3397544ea206`. Commit GitHub `5ba91d189e687f6206cb8e3efeaa3397544ea206` confirmado por leitura no ref. Implantação via Wrangler em 2026-11-06 03:43:46 UTC (00:43 Brasília). **Não presumir que a branch main atual é idêntica ao commit publicado**; na comparação realizada, os históricos divergiam. Validar novamente antes de modificar.
- Site legado GitHub Pages: https://wllmslv10.github.io/central-estudos-biblicos-v2/ — NÃO usar como alvo de mudanças destinadas à CEB oficial sem autorização expressa.
- Não alterar contas Cloudflare pessoais, bancos de laboratório, outras aplicações ou ambientes por inferência.

## ESCALA DE MÍDIA IBNE 2.0 — LABORATÓRIO
- Repositório: wllmslv10/escala-midia-ibne.
- Branch de trabalho histórica: work/escala-midia-2-interface-servo.
- Worker de testes: https://ibne-escala-midia-v2-testes.wllmslv10.workers.dev
- Neon de testes histórico: projeto gentle-hall-50786748, branch branch-de-testes.
- Estas referências são históricas: validar novamente antes de trabalhar. Não considerar laboratório como produção.

## PROTOCOLO OBRIGATÓRIO ANTES DE MODIFICAR OU PUBLICAR
1. Identificar explicitamente aplicativo, ambiente (produção/laboratório), conta Cloudflare, Worker, URL e banco associado.
2. Consultar o estado atual no GitHub e na Cloudflare, incluindo deployments, bindings sem expor segredos e origem do build.
3. Correlacionar o commit/branch exatos com os artefatos implantados; se não for possível, parar e informar a lacuna antes de editar.
4. Preservar usuários, arquivos, históricos, permissões, banco e instalações PWA existentes.
5. Desenvolver e testar mudanças isoladamente; não publicar em produção sem validação e autorização do usuário para a publicação específica.
6. Antes de executar ações de escrita, informar quais recursos serão alterados. Nunca tratar GitHub Pages antigo como sinônimo da CEB no Cloudflare.
7. Após publicar, verificar o endereço oficial e registrar commit, versão/deployment e testes.
8. Nunca armazenar senhas, tokens, chaves, strings de conexão ou dados pessoais neste arquivo.

## TAREFA EM DISCUSSÃO (AINDA NÃO IMPLEMENTADA)
Melhorar o compartilhamento do convite de **instalação da CEB PWA** para alunos, professores e administradores, aproveitando o WhatsApp já existente e avaliando e-mail, copiar link, compartilhamento nativo e QR Code. Não confundir com compartilhamento de materiais ou questionários. Examinar primeiro o código exato da versão Cloudflare oficial.

## NOTA
Este arquivo documenta o procedimento, mas não impõe automaticamente regras a ferramentas ou assistentes. Sua leitura e verificação explícitas continuam necessárias a cada operação.
