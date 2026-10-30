# Continuidade CEB V2 — Materiais Originais (30/10/2026)

## Estado verificável
- Repositório: `wllmslv10/central-estudos-biblicos-v2`.
- Branch de trabalho: `work/ceb-materiais-originais-20261030`.
- Pull request para `main`: https://github.com/wllmslv10/central-estudos-biblicos-v2/pull/12 (criado como rascunho).
- Implementação base: commit `33e9d147d464872da0a75aa776928883407fda8a`.
- Complementos: `bc5ff21325f0ed35d448166e4f837eeefa28f7e5`, `8cab05b825a2d1bf5a5d389886367caae68172a8`, `3385f0bb62812346369140eeb133574d32a46b5f`.
- Ajuste de workflow: `448d0df4b3fa42f8c9cc06a6a9b577bf41fd9d82`. O arquivo `.github/workflows/deploy-ceb-api.yml` agora admite a branch de Materiais Originais, além da antiga, mas ainda exige SHA exato, execução manual, testes e dry-run.
- Documentação original: `docs/MATERIAIS_ORIGINAIS_20261030.md`.
- **Nenhum deploy de produção foi executado nesta etapa.**

## Prioridades para o Work
1. Preservar todos os materiais e funcionalidades já aprovados. Não recriar, reescrever nem converter automaticamente anexos de Materiais Originais.
2. Verificar a compilação TypeScript/Vite após as alterações em `src/Quiz.tsx` e `src/OriginalMaterials.tsx`. Corrigir apenas problemas efetivamente encontrados. Evitar repetir as grandes baterias de testes antigas.
3. Conferir o contrato do Worker em `api-worker/originals.js`, `api-worker/worker.js` e `src/cebApi.ts`, incluindo upload, leitura e download dos anexos, compartilhamento e permissões.
4. Conferir a segurança do workflow e o estado real dos deployments. Para produção, realizar primeiro implantação protegida do Worker com SHA integral verificado, seguida da publicação coordenada da interface, sem mexer em Neon, segredos ou outros projetos desnecessariamente.
5. Verificar o funcionamento real na CEB oficial e só então declarar concluído. Não confundir commit, PR e deploy.
6. Importar no cartão da aula os materiais originais aprovados, caso seus arquivos estejam disponíveis: PDF `Estudo_Professor_EBD_V2.pdf`, DOCX `CEB-Estudo-Professor-Postura-do-Cristao-V2-Dinamica-Alinhada.docx`, HTML original `CEB-EBD-28-slides-contraste-melhorado-para-aprovacao.html` e questionário de dez questões com gabarito A B C D B A C D B A. Não afirmar que os arquivos foram importados sem verificar o upload efetivo.

## Cuidados
- A funcionalidade de importar questionário JSON deve ficar restrita a Materiais Originais (prop `allowOriginalImport`).
- Manter o HTML de 28 slides em seus bytes originais; não substituir por PPTX ou apresentação recriada.
- Preservar funcionamento das bibliotecas tradicionais e as opções de material aplicado.
- Workflow de Pages em `.github/workflows/deploy.yml` publica automaticamente após push na `main`. Portanto, planejar a ordem Worker → interface.
- O usuário deseja execução autônoma, com mínimo de testes necessários e sem repetição de perguntas.
