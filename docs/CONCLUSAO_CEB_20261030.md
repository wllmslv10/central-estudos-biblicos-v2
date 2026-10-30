# Conclusão da interface CEB — 30/10/2026

Destino preservado: https://wllmslv10.github.io/central-estudos-biblicos-v2/ e Worker `ceb-biblioteca-api`. Nenhum novo site, público, banco ou ambiente.

## Correções

- Menu de navegação disponível no computador. Antes, a única navegação completa era ocultada acima de 620 px, deixando Materiais Originais/Aplicados sem acesso direto no notebook.
- Busca em todas as áreas da biblioteca por título, tema, texto bíblico, curso, conteúdo e nome do arquivo, sem distinguir maiúsculas ou acentos. Consulta somente os registros já autorizados pela API.
- Busca própria de cartões originais; carregamento e ausência de resultados identificados.
- Referências já presentes na explicação/aplicação aparecem ao lado do tópico na leitura. Os prompts passam a solicitar livro, capítulo e versículos por ponto. Conteúdo salvo não é reescrito.
- Anexos originais permanecem sem conversão. Tela cheia usa o iframe do próprio cartão, evitando IDs repetidos. Novos cartões começam particulares.
- Configuração de upload alinhada ao valor ativo da produção (`true`), evitando regressão em nova implantação. Credenciais e vínculos existentes preservados.
- Testes antigos alinhados ao contrato vigente: consultas com lock e Lixeira restrita ao administrador; teste de interface usa seleção/restauração na Lixeira unificada. Nenhuma regra de acesso foi relaxada para satisfazer testes.

## Evidências antes da promoção

- Compilação TypeScript/Vite e identidade visual aprovadas.
- 62 verificações direcionadas de permissões e Materiais Originais aprovadas; busca validada em teste unitário.
- Navegador, com fixtures isoladas: menu do computador, busca por título+passagem sem acentos, abertura da leitura, referência junto ao tópico, abertura do HTML original e botão avançar funcionando.
- Worker empacotado com Wrangler em dry-run, sem banco ou credenciais locais.
- Produção anterior: `/health` confirmou API e banco online; `/studies` anônimo retornou 401; navegador exibiu login.

## Limite da validação

O login seguro de produção não foi concluído nesta sessão. Não declarar validados os fluxos autenticados de produção (upload, documentos pessoais e questionários) somente com simulações locais ou status de deploy. Não importar, recriar ou alterar materiais aprovados indisponíveis neste checkout.

A promoção deve manter o Worker primeiro e a interface em seguida, usando os mesmos destinos, com conferência do SHA remoto e do estado implantado. Versão de recuperação do Worker encontrada: `1ac0ad5f-5097-40b2-872b-c2c11c84188a`.
