> **ATUALIZAÇÃO OBRIGATÓRIA — DESPESA ZERO:** a orientação abaixo de ativar/criar R2 está suspensa. Antes de qualquer provisionamento/publicação, ler `STORAGE_ZERO_COST_REVIEW.md`. Prioridade: avaliar o Neon Storage existente. O adaptador R2 e seus testes são preservados, mas não há autorização para ativar assinatura/cartão/cobrança ou criar chave Neon mais ampla que o escopo autorizado.

# Biblioteca na nuvem — R2 binding direto

## Arquitetura

- Neon PostgreSQL: estudos, esboços, EBD, usuários, sessões, pastas, permissões, texto e metadados dos arquivos.
- Cloudflare R2 privado: somente arquivos originais.
- Worker `ceb-biblioteca-api`: autenticação, autorização, upload e download; binding `CEB_MATERIAIS` aponta exclusivamente para o bucket `ceb-materiais`.
- Hyperdrive existente preservado. Não são necessárias chaves S3 ou novas credenciais para o binding.

## Estado e implantação

A reconciliação das permissões fornecidas do Worker está em `main` no commit `c180ad1`, com publicação Pages bem-sucedida na execução `40419318845`.

O PR #3 contém a biblioteca preparada, ainda não publicada em produção. Antes de integrar:

1. Criar/confirmar o bucket R2 privado `ceb-materiais` na mesma conta do Worker. Acesso público `r2.dev` e domínios personalizados devem permanecer desativados. O binding já está no `wrangler.toml`; a publicação o associará ao Worker. Nenhuma credencial S3 é solicitada.
2. Validar Worker/bucket em ambiente isolado com sessões e banco de teste, antes de usar a produção. Os testes locais cobrem o runtime R2 local; não comprovam a configuração da conta Cloudflare.
3. Aplicar a migração aditiva `003_cloud_materials.sql` na produção somente após validação. Já foi testada na branch Neon `dev-ceb-cloud-materials-20261026` (`br-falling-thunder-b4saoifs`); a produção ainda não recebeu a migração.
4. Publicar o Worker na branch acompanhada pelo Cloudflare, preservando Hyperdrive e segredos existentes, e validar backend. Só então publicar o frontend.
5. Conferir arquivos reais nos quatro formatos, comparação dos bytes originais, falhas e reabertura com dois usuários/dispositivos. Testes manuais da UI ainda pendentes.

## Comportamento preparado

- Arquivos de até 20 MB: upload autenticado via API para o bucket privado, com metadados, SHA-256 e texto no PostgreSQL.
- Arquivos e pastas particulares por padrão; biblioteca geral somente para administradores autorizados. Alunos acessam apenas seus próprios materiais.
- Download autorizado e como anexo; HTML não executa na origem da API.
- Confirmação de sucesso somente após objeto e registro. Falha de leitura após insert não remove o original já registrado.
- Pastas na nuvem; criação/seleção na importação.
- Excluir move para Lixeira e preserva o objeto R2. Restauração disponível. Expurgo definitivo não disponibilizado: exige autorização destrutiva.
- Aplicação e data opcionais para importados, estudos e EBD, sincronizadas no PostgreSQL.
- Interface depende da disponibilidade do binding e do esquema: sem eles, não habilita upload.
- Originais antigos no navegador não são apagados, migrados nem reinseridos automaticamente.

## Validações

- Identidade visual automatizada e build TypeScript/Vite.
- 27 testes anteriores da API: autenticação, permissões, falhas, Lixeira e download.
- 9 testes adicionais (incluindo subtestes): binding ausente, caminhos inválidos, falhas do R2 e integração em runtime R2 local com amostras PDF/DOCX/PPTX/HTML, bytes/checksum, papéis distintos, Lixeira e recuperação.
- O teste R2 é efêmero e local: não usa segredos nem binding remoto. Amostras são técnicas, não substituem a validação de renderização/extração na interface com arquivos reais.
- Migração e operações de dados reais validadas na branch Neon isolada com `ceb_api_user`; os dados do teste foram revertidos com ROLLBACK.
- Lição `35ebc974-6f34-4222-827d-05d747b40de1` preservada; checksum `5a39fbb0b1723009162bfb1d1ed208bd`.

## Procedimento no painel Cloudflare

1. Na mesma conta do Worker, abrir **R2 Object Storage / Armazenamento de objetos R2 → Overview / Visão geral → Create bucket / Criar bucket**.
2. Nome: `ceb-materiais`; localização automática; classe **Standard / Padrão**.
3. Criar e abrir as configurações do bucket. Confirmar **Public Development URL / r2.dev desativado**, sem domínio público personalizado.
4. Confirmar que o bucket existe. Não criar tokens S3 nem alterar Hyperdrive ou segredos existentes. O vínculo `CEB_MATERIAIS` será aplicado pela configuração Wrangler após a validação e publicação autorizada.

## Pendências

Acesso autenticado ao Cloudflare/criação do bucket, testes no ambiente remoto e dois dispositivos, migração de produção e publicação. Não anunciar upload como operacional antes disso. Migração/eliminação de restos locais, expurgo, PDF gerado e compartilhamento com alunos continuam pendentes. A branch Neon de teste permanece para continuidade.
