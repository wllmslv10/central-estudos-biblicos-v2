# Padrão central de apresentações — preparação para aprovação visual

Base oficial integrada: 3339eddcab4fde9197ab29744e7f25eaa0f7b4e7.
Alterações limitadas ao gerador central e aos controles de apresentação.
Sem implantação, migração, modificação de questionários ou gravação na Biblioteca.

## Padrão permanente

`src/presentation.mjs` continua sendo o renderizador comum aos estudos, esboços
e materiais EBD, tanto na prévia como no HTML baixado. Mantém canvas 1600×900,
proporção 16:9, textos/logotipos/cores existentes e paginação textual legível.
Agora aproveita toda a altura disponível, inclusive em tela cheia, sem reservar
uma faixa permanente para navegação. Controles sobrepostos desaparecem após
inatividade, reaparecem com mouse, toque, teclado ou botão discreto; foco visível
de teclado permanece acessível. Slides inativos são inert, impedindo tabulação
acidental em referências de outros slides. Impressão continua separando slides
e ocultando controles. Tela cheia informa a saída e a indisponibilidade da API.

O visualizador de apresentação ocupa uma única janela e distribui o espaço
restante ao iframe, evitando duas áreas roláveis. Não altera o catálogo da
Biblioteca nem suas ações, permissões, arquivos, pastas ou registros.

## Capa

A imagem aprovada de 28/10 foi preservada byte a byte em
`src/ebd-presentation-cover.png`. É 4:3: fica integral, centralizada e sem
distorção no slide 16:9, com preenchimento lateral. Não é recortada para esticar
o fundo e não recebe sobreposição de logotipos ou textos.

EBD recebe essa capa por padrão. Nas três modalidades o professor pode escolher
PNG/JPEG/WebP de até 5 MB ou retirar a capa nos controles da apresentação.
Essa configuração é exclusivamente da prévia/HTML baixado: não é apresentada
como alteração salva no documento da Biblioteca. Troca de documento redefine
essa preferência local. Imagem inválida mantém a capa anterior.

`PresentationOptions` permite capa opcional. A rota de slides explícitos aceita
`preserveSource` para não filtrar, reescrever ou repaginar um roteiro aprovado.
Esse caminho não resume nem converte HTML arbitrário; a fonte deve ser estruturada.

## Apresentação real da EBD

Consulta SELECT somente à lição existente A Postura do Cristão Diante das Ofertas
do Mundo, sem credenciais nem conteúdo da lição em logs/commits. O gerador da
versão oficial anterior produz 39 slides de origem com esse conteúdo.
A prévia nova acrescenta a capa como slide 1. Comparados os 39 blocos HTML de
slides antes/depois: idênticos, incluindo marcação, títulos, referências e
elementos visuais, na mesma ordem. O corpo do material e o arquivo original
da capa não foram reescritos. A fonte privada e a prévia ficam fora do repositório.

## Verificações novas

- `node --test test/presentation-standard.test.mjs`: seis verificações direcionadas
  ao padrão nas três coleções, inserção sem alteração da sequência, fonte explícita
  de 39 slides, segurança/escape da capa e sintaxe do runtime exportado.
- Runtime exportado executado em DOM técnico mínimo em memória: temporizador,
  reexibição, teclado, toque, slides inativos, chamada/retorno de tela cheia e
  impressão. Não é validação de layout nem teste físico da API Fullscreen.
- Compilação TypeScript/Vite aprovada; aviso de tamanho do bundle permanece.
- Comparação literal dos 39 blocos da lição real, com o gerador oficial anterior.
- Nenhuma bateria de importação, Lixeira, questionários ou IA repetida.

## Aprovação visual pendente

O navegador técnico não permitiu abrir o arquivo local. Não se contornou essa
restrição e não se declara validação visual automatizada de layout, sobreposições,
tela cheia ou impressão. Entregar HTML autocontido para revisão offline no Windows:
capa, sequência 2–40, ocultação/retorno dos controles, teclado/toque, tela cheia e
prévia de impressão. Não publicar até essa verificação ser satisfatória.

Nenhuma alteração no Worker é necessária: esta melhoria é da interface/gerador.
Main e produção permanecem na versão oficial anterior durante a aprovação.

## Revisão posterior do acionamento dos controles

A regra de revelar controles por qualquer movimento ou tecla foi substituída
pela faixa inferior exclusiva. Ver APRESENTACOES_EBD_AJUSTES_20261029.md para
a reorganização autorizada de 40 para 23 slides e os testes direcionados.
