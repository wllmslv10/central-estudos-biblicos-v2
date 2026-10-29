# Modo Explicativo — preparação, sem publicação

Base aprovada preservada: e8be4bf1c7d4329be53609715a850d9ac5a9dfc5.
Nenhum acesso ao Neon, Worker, credenciais ou serviços de IA nesta implementação.

## Organização do conteúdo

O gerador central aceita `explicativo` e o usa por padrão em novas apresentações.
Não cria explicações por conta própria: conserva o texto fornecido integralmente,
sem resumi-lo nem trocar frases por palavras-chave. Cada ponto reúne explicação
e aplicação com subtítulo, mantendo assuntos diferentes em grupos distintos.
Introdução, conclusão e seções adicionais preservam sua ordem e suas informações.
Não há limite fixo de caracteres ou número de slides no novo modo.

`src/explanatory.mjs` segmenta frases em português com Intl.Segmenter, protegendo
abreviações, subtítulos, negrito e referências junto da explicação correspondente.
Na ausência de Segmenter, conserva o parágrafo inteiro para revisão: não recorre
à divisão arbitrária de palavras. Abreviações convencionais de livros bíblicos
podem ser usadas nos títulos quando a medição indicar mais de uma linha; números
de capítulos e versículos não são alterados. Nenhuma referência é inventada.

## Medição no navegador

Depois de fontes, logotipos e capa estarem carregados, o runtime mede título,
texto, referência e área útil do slide. Move nós de frases inteiras para uma
continuação até o conteúdo caber. Não quebra palavras/frases entre slides,
não encolhe fontes e não usa reticências ou rolagem interna para ocultar excesso.
Os mesmos nós devem permanecer exatamente na mesma ordem após a distribuição;
uma divergência interrompe a preparação. O número final depende do conteúdo,
das fontes disponíveis e da medição no navegador.

Uma frase individual ou um título que exceda sozinho o espaço constitui uma
limitação real: o runtime sinaliza revisão necessária e não exibe uma apresentação
cortada como se estivesse pronta. O texto permanece no HTML e na fonte; o professor
precisa revisar essa fonte. Também não é possível produzir explicações completas
a partir de meras palavras-chave sem fornecer conteúdo adicional.

Slides com baixa ocupação são identificados pela medição. Na prévia de revisão
recebem um aviso discreto, sem impedir a navegação e sem unir assuntos distintos.
Esse aviso é desligado no download normal; falhas de encaixe continuam sinalizadas.

## Identidade e compatibilidade

Reutilizado o fundo azul-marinho e dourado já definido no template-base, sem nova
paleta, ilustrações ou redesenho. Títulos permanecem 56 px; textos mantêm 34 px
na EBD e 38 px nos estudos/esboços, conforme os tamanhos dos modelos correspondentes.
O Modo Explicativo nunca aplica o ajuste de fonte dos títulos do roteiro legado.
Mantidos margens, espaçamentos, cabeçalho, rodapé, logotipos originais a 72 px,
enquadramento integral da capa e proporção 16:9. Controles da faixa inferior,
atalhos, toque, tela cheia, consulta bíblica e impressão não foram alterados.

Novos materiais recebem o marcador opcional `presentationLayoutVersion` no próprio
conteúdo existente. Não há tabela, coluna, migração ou gravação retroativa; a
persistência futura utiliza o salvamento normal já existente. Materiais sem esse
marcador continuam selecionando o modelo anterior. A escolha manual de Explicativo
para um material antigo produz uma nova apresentação sem substituir o original.
O catálogo, as permissões e os fluxos da Biblioteca não são modificados.

O HTML EBD aprovado de 23 slides não foi regenerado nem substituído. Seu SHA-256
permanece afbd4c815f4d91ebf09fa67e1f369f6f8ab47f3049843e297af2722fd551af9a.

## Prévia e verificações novas

`scripts/prepare-explanatory-preview.mjs` prepara uma nova exposição de Lucas
10:25–37: Misericórdia que se torna cuidado. Contém contexto, explicações,
aplicações e referências, com paráfrases explicitamente diferenciadas de citações
literais. Não usa o texto nem o roteiro da EBD anteriormente aprovada.

Sete testes direcionados em `test/explanatory.test.mjs`: padrão/versão nova e
preservação das fontes antigas; frases/subtítulos/referências/negrito; distribuição
de 121 frases em 61 páginas de capacidade técnica, sem limite artificial e com
integridade dos nós; agrupamento sem mistura de assuntos; rejeição segura de frase
impossível; escape HTML e avisos limitados à revisão; manutenção do aviso e bloqueio de impressão/navegação quando o encaixe exige revisão. O DOM técnico verifica o
algoritmo com capacidade controlada, não simula uma aprovação visual do navegador.
Compilação TypeScript/Vite e whitespace aprovados. Baterias antigas não repetidas.

Revisão visual no Windows pendente. As medições reais são realizadas pelo HTML ao
abri-lo nesse navegador. Não se declara ensaio físico de projetor, tela cheia ou
impressão. Main e produção permanecem intactas até aprovação visual e publicação
autorizada. Nenhum ambiente, branch, dependência ou serviço pago novo foi criado.
