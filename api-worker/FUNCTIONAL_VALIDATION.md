# Testes funcionais isolados — 27/10/2026

Autorização: William autorizou testes autônomos com contas/arquivos técnicos e habilitação temporária de uploads somente em `ceb-biblioteca-api-validacao`. Produção não é publicada ou migrada.

## Execução sem novos segredos

O workflow `.github/workflows/functional-library.yml` utiliza OIDC do GitHub com validade curta. O backend verifica assinatura RSA nas chaves oficiais do emissor, audience exata do Worker de validação, ID/repositório, branch, evento push, runner GitHub e arquivo exato do workflow. Tokens, cookies e senhas não são impressos, gravados em arquivos ou incluídos no relatório. Nenhuma credencial Cloudflare/S3/SQL é copiada para o GitHub.

Somente `/validation/fixtures`, importado pelo ponto de entrada isolado, aceita essa identidade para preparar três contas sintéticas (dois administradores e um aluno). Papéis e nomes são impostos pelo servidor, vinculados ao ID/tentativa da execução. Contas são inseridas sem sobrescrever registros existentes. Ao terminar, somente essas contas são desativadas e suas sessões revogadas; originais e metadados de teste são preservados.

Depois da preparação, o runner usa os endpoints HTTP normais de login, pastas, materiais, download, aplicação, Lixeira, restauração e logout. O token OIDC não substitui a sessão normal de administrador/aluno. Senhas técnicas aleatórias existem apenas na memória do runner; o backend armazena seus hashes.

Uploads são temporariamente habilitados apenas em `wrangler.validation.toml`, com bloqueio adicional para qualquer usuário cujo nome não seja o de uma conta técnica da execução. `wrangler.toml` mantém upload desabilitado e não é modificado. Após os testes, voltar o arquivo de validação para `false` em commit `[skip functional]`, para não disparar uma nova rodada.

O bucket continua privado em `ceb-arquivos`. Foram consultados somente contadores no banco de testes antes da rodada: zero materiais existentes. Cada upload cria UUID novo. Não há exclusão definitiva nem alteração de materiais anteriores. As poucas amostras técnicas antigas do Storage são preservadas.

## Cobertura e limites

- Sessões reais de dois administradores e um aluno, identidade e logout.
- PDF/DOCX/PPTX/HTML sintéticos, bytes e SHA-256 no download e depois da restauração.
- Pastas próprias, deduplicação de nome e compatibilidade com privacidade.
- Particular negado ao outro administrador/aluno/anônimo; Storage sem assinatura negado.
- Material geral acessível a outro administrador e negado ao aluno, conforme regras atuais.
- Material aplicado/data, Lixeira e recuperação.
- Nova sessão HTTP reencontra os metadados persistidos.

A sessão HTTP independente não substitui teste visual em computador/tablet/celular. Também não testa extração de texto, renderização dos documentos ou interface completa. Os arquivos Office são gerados por bibliotecas próprias dos formatos; nenhum conteúdo de usuário é utilizado.

Resultados sanitizados ficam no artefato `ceb-functional-validation-<run_id>` e nos logs de PASS/FAIL. Uma compilação bem-sucedida não significa que os testes funcionais passaram: conferir o job funcional e o relatório. Nenhum upgrade, assinatura, cartão, R2 ou serviço pago é utilizado. Franquias da conta continuam aplicáveis. Plano Neon Free deve ser reconfirmado por leitura; plano Cloudflare não pode ser inspecionado pelo agente sem acesso ao painel.

## Fonte oficial

https://docs.github.com/en/actions/reference/security/oidc

O uso de OIDC foi escolhido porque este ambiente recebe HTTP 403/1010 ao chamar diretamente o Worker; testes HTTP devem partir do runner GitHub, sem repetir o login Cloudflare no navegador do Work.
