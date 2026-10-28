# Validação da biblioteca e compartilhamento — 27/10/2026

Repositório: wllmslv10/central-estudos-biblicos-v2
Branch: work/ceb-biblioteca-etapa1-20261027
Base anterior: 13ec5724b0d232ced77e6de84f3eb1347baaa45b

## Resultado informado pelo Work

Validação local com dados técnicos simulados, sem conexão ao Neon ou implantação de produção:

- Compilação TypeScript/Vite: aprovada; aviso de bundle acima de 500 kB.
- Worker: 140 testes aprovados, nenhuma falha.
- Apresentação: 19 testes aprovados.
- Verificações no navegador: 42 aprovadas.
- Identidade visual e empacotamento do Worker em modo dry-run: aprovados.
- Exportação PDF pelo mecanismo de impressão do Chromium: validada.

## Correções transferidas à branch

- Criação comum de material não pode incorporar permissões de compartilhamento enviadas pelo cliente.
- Edição comum preserva as permissões persistidas, inclusive em atualizações concorrentes.
- Escolha explícita de destinatários (todos ou alunos selecionados).
- Download do aluno consulta novamente o Worker, que verifica sessão, publicação, permissão atual, exclusão e destinatários.
- Revogação de compartilhamento funciona mesmo quando não há aluno ativo selecionado.
- Arquivos externos já compartilhados não podem ser revogados retroativamente.

## Limitações

Os testes anteriores do Work usaram banco e API simulados, não o banco real. O material original do patch incluía teste de download, compartilhamento e revogação. Esta transposição para o GitHub foi feita com commits separados, e os testes não foram executados novamente.

A proteção de download não impede cópias de conteúdo já visível ou capturas de tela. O compartilhamento individual de arquivos originais importados não faz parte desta etapa. PDF depende do diálogo de impressão do navegador. Publicações de interface e Worker devem ocorrer de maneira coordenada, após autorização.

Nenhuma alteração no Neon ou nas credenciais foi realizada nesta transposição.