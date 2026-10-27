# Resultado dos testes funcionais — CEB V2 — 27/10/2026

## Resultado

**26 verificações funcionais remotas aprovadas**, em 109 chamadas ao Worker de validação (mais consultas anônimas diretas ao Storage). Execução aprovada:

https://github.com/wllmslv10/central-estudos-biblicos-v2/actions/runs/40507655155

Relatório JSON sanitizado, com retenção de 7 dias:

https://github.com/wllmslv10/central-estudos-biblicos-v2/actions/runs/40507655155/artifacts/12735907898

Commit testado: `00407bb0117c6053f0f6abe6dce5ba8b7f266090`. Worker: `ceb-biblioteca-api-validacao`. SQL: branch `br-falling-thunder-b4saoifs`. Storage: bucket privado `ceb-materiais` no projeto exclusivo `ceb-arquivos`. Nenhuma chamada de teste foi dirigida ao Worker oficial.

## Funcionalidades aprovadas

| Teste real | Resultado |
| --- | --- |
| Sessões de dois administradores e um aluno | Identidades distintas; aluno sem acesso à administração |
| Pastas | Criação própria, repetição sem duplicar, privacidade e associação do material à pasta correta |
| PDF/DOCX/PPTX/HTML | Upload 201 e download 200 com SHA-256 idêntico |
| Particular | Outro administrador e aluno recebem 404 ao baixar, mover à Lixeira ou recuperar; sem sessão, 401 |
| Bucket privado | Download direto anônimo negado com 403 nos quatro formatos |
| HTML | Download como anexo, CSP sandbox e nosniff |
| Material aplicado/data | Gravado e relido nos quatro formatos |
| Lixeira | Material desaparece dos ativos, aparece na Lixeira e não pode ser baixado enquanto excluído logicamente |
| Recuperação | Mesmo material volta à lista ativa; original preservado e checksum idêntico |
| Aluno importando original próprio | Material permanece particular mesmo se o cliente pedir escopo geral |
| Pasta particular/publicação geral | Combinação incompatível recusada com 400 antes de gravar arquivo |
| Material geral | Outro administrador autorizado; aluno negado, conforme regras atuais |
| Persistência entre sessões | Novo login emite token diferente e reencontra os mesmos IDs/metadados |
| Logout | Tokens de sessão deixam de acessar `/auth/me` |
| Preparação técnica | Pedido sem identidade temporária é negado; assinatura, repo, branch e workflow são exigidos |

## Integridade dos originais

| Formato | Bytes | SHA-256 antes e depois do download/restauração |
| --- | ---: | --- |
| PDF | 1.385 | `819490674d551389e721dc17c22ff6a3066bea3f716113e540ed07b03c6dbbf6` |
| DOCX | 36.654 | `bd47d3c30c32ebc6fa6f4ca03898682140399c490a648a22d176b4f0548adec3` |
| PPTX | 28.246 | `3b2f10d4b6152fad0ad6cf3587e8b05ac44b71da88ddd784e9c2173b350c1c75` |
| HTML | 183 | `1168badf60ccdcd96431038fc4eaaf4d1f275d0e7072cf5d41a3e1e9531783b5` |

Os seis objetos da rodada totalizam 69.238 bytes: os quatro formatos acima e dois PDFs técnicos adicionais (particular do aluno e geral). Nada foi sobrescrito. Originais, metadados e contas técnicas inativas foram mantidos para auditoria; não ocorreu exclusão definitiva.

## Encerramento e preservação

- Consulta posterior somente leitura confirmou **zero contas técnicas ativas**, **zero sessões técnicas não revogadas**, seis materiais técnicos e nenhum ainda na Lixeira nessa rodada.
- A conta técnica criada na tentativa anterior também foi desativada. Não houve modificação de contas anteriores do usuário.
- O commit de encerramento volta `CEB_UPLOADS_ENABLED=false` na configuração de validação e bloqueia também `/validation/fixtures`; usa `[skip functional]` para não iniciar outra rodada.
- `api-worker/wrangler.toml` de produção não foi alterado e continua com upload `false`. Hyperdrive e segredos existentes não foram alterados. Não houve migração/escrita no banco principal.
- Lição `35ebc974-6f34-4222-827d-05d747b40de1` reconferida por leitura na produção: MD5 `5a39fbb0b1723009162bfb1d1ed208bd`, 7.359 caracteres, igual ao início.
- Nenhuma credencial SQL/S3/Cloudflare foi transferida para o GitHub. A autorização OIDC é temporária; senhas aleatórias das contas de teste existiram somente na memória do runner, e o banco recebeu hashes.

## Falhas encontradas e corrigidas durante a preparação

1. A consulta das chaves públicas OIDC precisava de redirecionamento manual compatível com o runtime do Worker. O verificador permaneceu fechado a identidades inválidas durante o ajuste.
2. O banco exige `auth_subject` único: os três usuários técnicos agora recebem identificadores próprios. Não foi necessário alterar o schema. A tentativa que criou uma conta encerrou-a e revogou sua sessão.

Não houve falha nos 26 testes da rodada final. Os resultados não são inferidos de mocks: os requests partiram do runner GitHub e atingiram as rotas HTTP públicas do Worker, com PostgreSQL e Storage reais.

## Custo e limitações

Organização Neon reconfirmada como **Free** ao final. Nenhum upgrade, assinatura, cartão ou produto pago foi ativado. Os testes utilizaram o Worker/Storage já configurados e Actions em repositório público. O agente não possui acesso ao faturamento Cloudflare; o plano/consumo restante da conta não pode ser certificado por essa execução. Não existe promessa de uso ilimitado.

Ainda faltam testes visuais na interface completa e em dispositivos reais (PC/tablet/celular), extração/leitura dos formatos, eventuais arquivos grandes, e revisão da sequência segura de migração/publicação da produção. A verificação entre sessões HTTP comprova persistência no servidor, mas não substitui o teste visual em dois dispositivos. Organização foi validada por associação à pasta na importação; não foram testados mover/renomear pastas ou materiais.

PR #3 permanece sem publicação em produção. A reorganização da tarefa #4, o gerador HTML aprovado e o modo de leitura não foram modificados. Qualquer publicação em produção exige nova confirmação expressa de William após os resultados e a revisão final.
