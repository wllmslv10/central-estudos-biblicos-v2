# ESTADO ATUAL DA CEB V2 — REFERÊNCIA OPERACIONAL

> **LEITURA OBRIGATÓRIA ANTES DE QUALQUER MODIFICAÇÃO.** Este documento descreve a implantação oficial atual da Central de Estudos Bíblicos da Igreja Batista Nova Esperança (IBNE). A documentação antiga no README e em outras branches pode estar desatualizada. **Confirmar sempre com o código e os deployments atuais.**

## Identificação oficial (verificada no código em 06/11/2026)

- Repositório: `wllmslv10/central-estudos-biblicos-v2`
- Branch de implantação da CEB oficial: `deploy/ceb-oficial-ibne`
- Endereço de produção: https://ceb.ibne.workers.dev
- Workflow: `.github/workflows/ceb-oficial-ibne.yml`
- Aprovação exigida antes do deploy: GitHub Environment `ibne-ceb-production`
- Aplicativo: React + TypeScript + Vite; API publicada em Cloudflare Workers.
- API configurada no workflow: `VITE_CEB_API_BASE=https://ceb.ibne.workers.dev`.
- O workflow valida build, testes e identidade visual antes de publicar; o script de publicação é `ops/publish-ceb-official.sh`.
- Dados de produção: verificar a configuração do Worker e as ligações de banco/armazenamento, **sem expor segredos nem modificar dados**. Não inferir IDs de projetos ou bindings apenas pelo nome.

## Ambientes que NÃO são a CEB oficial atual

- `main` e o endereço https://wllmslv10.github.io/central-estudos-biblicos-v2/ pertencem à trajetória anterior da CEB e **não devem ser escolhidos automaticamente para novas implementações oficiais**.
- Workers sob `wllmslv10.workers.dev`, inclusive laboratórios de validação, não são o endereço oficial `ceb.ibne.workers.dev`.
- O repositório `wllmslv10/escala-midia-ibne` é **outro projeto**. Não alterar.
- Não confundir a branch de trabalho `work/ceb-oficial-ibne` com a branch de implantação `deploy/ceb-oficial-ibne`.

## Funcionalidades e decisões recentes

- CEB V2 oferece biblioteca de estudos, esboços, aulas EBD, materiais originais/importados, área do aluno, administração e questionários interativos.
- O compartilhamento interno é administrado em uma janela centralizada: destinatários (todos os alunos ativos ou selecionados), permissões individuais dos arquivos, disponibilização de questionário, permissão de download e confirmação de revisão.
- Cada anexo tem audiência própria: `teacher` (somente professor) ou `student` (alunos autorizados). PDFs com gabarito e materiais exclusivos do professor não devem ser liberados sem revisão expressa.
- Questionário interativo não é um PDF anexo: é uma funcionalidade separada. O painel de compartilhamento mostra a existência, quantidade de questões e revisão do questionário e oferece criar/editar. Não presumir que exista questionário apenas porque há checkbox de compartilhamento.
- Os arquivos originais têm gestão individual, inclusive exclusão de anexo, sem precisar apagar a lição.
- Alterações recentes do painel de permissões estão em `src/App.tsx`, da biblioteca original em `src/OriginalMaterials.tsx` e das integrações em `src/cebApi.ts`.
- Última mudança do painel de questionários: commit `5ba91d189e687f6206cb8e3efeaa3397544ea206`. **Confirmar execução de publicação e estado atual antes de declarar deploy concluído.**
- Solicitação pendente: melhorar a **distribuição do acesso** a materiais, questionários e instalação/abertura da CEB por e-mail, WhatsApp e outros canais, sem duplicar mecanismos já existentes. **Investigar primeiro o fluxo de compartilhamento real**. Não confundir distribuição do link com liberação de permissões; o acesso deve continuar sujeito à autenticação e à autorização do aluno.

## Procedimento obrigatório para novas conversas e agentes

1. Ler **este arquivo na branch `deploy/ceb-oficial-ibne`** e conferir o README; em caso de divergência, privilegiar código, workflow e implantação efetiva, atualizando a documentação.
2. Examinar a branch, os arquivos envolvidos, as rotas e o comportamento existente antes de propor implementação. Comparar com o que já foi entregue para não duplicar recursos.
3. Conferir o estado das execuções GitHub Actions e, quando necessário, a configuração real do Worker; distinguir claramente **código salvo**, **testes aprovados**, **aguardando autorização**, **publicado** e **validado no aplicativo**.
4. Preservar identidade visual, conteúdos, permissões, materiais, questionários, contas e dados existentes. Não apagar, migrar nem reinicializar banco ou armazenamento sem autorização específica.
5. Fazer mudanças pequenas e verificáveis, com testes e checagens de segurança. Não alterar outros projetos, branches ou Workers.
6. A publicação oficial exige aprovação do ambiente `ibne-ceb-production`; não presumir autorização automática. Comunicar o link da execução e o que precisa ser aprovado.
7. Se não houver acesso ao código ou à implantação atual, declarar a limitação e **não implementar por suposição**.
8. Atualizar este documento após mudanças relevantes, registrando a data, commit e estado da publicação.

## Orientação para quem abrir outra conversa

> Antes de qualquer alteração na CEB V2 da IBNE, leia `ESTADO_ATUAL_CEB_V2.md` na branch `deploy/ceb-oficial-ibne` do repositório `wllmslv10/central-estudos-biblicos-v2`. Confira código, workflow e implantação do Cloudflare. Não use a versão antiga no GitHub Pages como produção. Preserve a CEB funcional e solicite aprovação para publicar.
