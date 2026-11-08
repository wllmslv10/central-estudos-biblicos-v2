# Modo Professor — CEB V2

Alvo exclusivo: https://ceb.ibne.workers.dev — Worker `ceb`, conta IBNE.
Base publicada preservada: commit 8150b20a8930b942edc309d99f848081e72716e1,
versão a8e713cd-be5a-4e6f-8f15-287562c5f0b1,
deployment b51038c6-64d0-4a2b-aadb-fe1a8b81e00a.
Branch: work/modo-professor-20261108.

## Uso

1. Abra o material na Biblioteca ou nos Materiais Originais.
2. Escolha Modo Professor; na área de apresentação, clique em
   **👨‍🏫 Abrir Modo Professor** para abrir a janela independente.
3. No Windows, use **Estender**; deixe o professor no notebook e mova a
   apresentação para o datashow. O botão Tela cheia amplia apenas o original.
4. Use Voltar/Avançar em qualquer janela nos HTMLs compatíveis.
5. Clique em Editar anotações. Escreva explicações, contexto, perguntas,
   respostas, exemplos, aplicações e transições; depois clique em Salvar.
6. Textos longos são divididos em páginas de leitura. Nenhum trecho é removido.
7. A faixa Consultar conteúdo do slide (opcional) começa recolhida e usa fonte
   ampliada. Sua leitura também é paginada.
8. Permita pop-ups da CEB se o navegador bloquear a janela.

## Compatibilidade e limites

- Estudos, EBD, sermões e esboços salvos: integração com as apresentações existentes.
- HTML original: detecção de slides ativos e controles nativos usuais; navegação
  em duas direções. HTML com seções: acompanhamento por seção.
- HTML arbitrário pode usar estruturas ou controles próprios não reconhecidos;
  valide a sincronização antes da aula. O arquivo permanece intacto.
- PDF: visualizador original do navegador preservado; acompanhamento manual de
  páginas na janela do professor. Não se promete sincronização do visualizador nativo.
- Word e PowerPoint: abrir/baixar o original no aplicativo apropriado;
  acompanhamento manual de páginas ou tópicos. Nenhuma conversão destrutiva.
- Notas existentes no contrato JSON do HTML de duas janelas aprovado são lidas
  sem executar o código importado. Revise e salve para persistir as alterações.
- Materiais sem anotações continuam abrindo. Há roteiro editável, sem dependência
  ou geração por IA. Não são inventadas explicações bíblicas automaticamente.
- Notas de slides são separadas por modalidade de apresentação, evitando associar
  o mesmo número de slide a textos diferentes nas modalidades Simples/Média/Completa.
  Alterações na ordem do material exigem revisão do vínculo das anotações.
- Em telas pequenas, a leitura permanece paginada; a área de edição pode rolar.
- A sessão autenticada principal deve permanecer aberta durante a aula.

## Segurança e preservação

Anotações novas são armazenadas em tabela própria, por usuário e recurso.
A API verifica sessão, troca obrigatória de senha, papel administrativo e acesso
ao material. Alunos são recusados inclusive por chamada direta à API.
A sincronização recebe somente índice, título e texto público; notas e credenciais
não são enviadas ao iframe do datashow. Origem por referência de janela e canal
aleatório são verificados. Conteúdo importado continua em iframe isolado.

Arquivos originais, estilos, fundos, fontes, logomarcas, controles e dados de
produção existentes não são reescritos. HTMLs mistos antigos que já embutem notas
em seus próprios scripts devem ser revisados antes de ser liberados aos alunos;
a camada adicional não remove silenciosamente scripts ou conteúdo do original.

Migração 008 é aditiva. A reversão do aplicativo usa a versão anterior do Worker;
não remover a tabela de notas, preservando o trabalho criado pelos professores.
Nenhum serviço pago foi acrescentado.

## Evidências e validação

- Compilação TypeScript/Vite e verificação de identidade visual.
- 47 testes de interface/conteúdo e 222 testes de backend, incluindo novos testes
  de permissões, validação de notas e isolamento por professor/material.
- Migração aplicada e testada primeiro na branch Neon
  work-modo-professor-20261108, isolada do banco oficial.
- Verificações SQL reais: criar, consultar, editar e recusar revisão desatualizada;
  registros técnicos revertidos na transação de teste.
- Teste Chromium em GitHub Actions: janela independente, navegação bidirecional,
  reabertura no slide atual, persistência na API simulada após reload, paginação
  integral, painel opcional, viewport 800×600 e comparação pixel a pixel.
- Fixtures PDF e Word verificam os caminhos de acompanhamento manual e preservação
  da entrega do original; não equivalem a teste físico no Office ou datashow.
- Autenticação real no navegador oficial e equipamento físico em modo Estender
  dependem de sessão/equipamento disponíveis. Não afirmar que foram realizados.

Os resultados e capturas da execução ficam em GitHub Actions, workflow
**Modo Professor — testes funcionais**, artefato teacher-mode-browser.
