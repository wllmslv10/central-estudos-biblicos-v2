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

## PWA OFICIAL — ENDEREÇOS E ROTEAMENTO (verificação do código em 06/11/2026)

**ALERTA PARA FUTURAS IAs: NÃO CONSIDERAR O PREFIXO `/central-estudos-biblicos-v2/` UM ERRO APENAS POR SER HERDADO DO GITHUB PAGES.** O Worker oficial utiliza esse prefixo intencionalmente. Não trocar `start_url`, `scope`, `base`, caminhos de ícones ou Service Worker por `/` sem auditar e testar a implantação completa.

- Endereço público de entrada: `https://ceb.ibne.workers.dev/`.
- Endereço efetivo da aplicação após redirecionamento: `https://ceb.ibne.workers.dev/central-estudos-biblicos-v2/`.
- Página prevista para instalação: `https://ceb.ibne.workers.dev/central-estudos-biblicos-v2/instalar.html`.
- Manifesto PWA: `https://ceb.ibne.workers.dev/central-estudos-biblicos-v2/manifest.webmanifest`.
- Service Worker: `https://ceb.ibne.workers.dev/central-estudos-biblicos-v2/sw.js`.
- O código `api-worker/official-worker.js` responde à raiz `/` com redirecionamento HTTP 302 para `/central-estudos-biblicos-v2/`. Requisições nesse prefixo são encaminhadas aos assets com remoção interna do prefixo.
- `vite.config.ts` define `base: '/central-estudos-biblicos-v2/'`.
- `index.html` referencia o manifesto e os ícones sob o prefixo.
- `public/manifest.webmanifest` usa `id`, `start_url` e `scope` como `/central-estudos-biblicos-v2/`; seus ícones são relativos ao manifesto.
- `public/sw.js` usa o mesmo prefixo para escopo lógico e cache do shell; `public/instalar.html` registra `./sw.js` e referencia `./manifest.webmanifest`.

**Conclusão da inspeção do código:** essas configurações são internamente coerentes com o roteamento do Worker oficial. A presença do prefixo, isoladamente, **não demonstra erro**. Esta inspeção NÃO equivale a teste de instalação em Android, iOS ou computador, nem garante que o cache de PWAs já instaladas esteja atualizado.

**Procedimento antes de propor correção:** (1) confirmar a versão atualmente publicada e as respostas HTTP reais da raiz, da página de instalação, do manifesto, do Service Worker e dos ícones; (2) verificar instalação, abertura pelo ícone, `start_url`, `scope`, atualização de cache e navegação em dispositivo real; (3) considerar usuários com PWA já instalada; (4) testar mudanças em ambiente isolado; (5) só alterar caminhos com justificativa comprovada e autorização. Preservar a identidade visual e os materiais.

**Compartilhamento futuro:** enviar links da CEB oficial e da instalação usando o domínio `ceb.ibne.workers.dev`. Não enviar URLs do GitHub Pages nem do laboratório como instalação oficial. O envio de um link por e-mail, WhatsApp ou outro canal **não concede acesso** a conteúdo restrito; manter autenticação e permissões individuais.

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
