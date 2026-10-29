# Ajustes finais da prévia EBD — sem publicação

Referência preservada: 584d979f7c876c31ea3ba01e4748a1da91b81728.
Fonte: prévia offline original de 40 slides, SHA-256
0966c192a9d8ddabe243f3ecc1737fc98a8fce3dabc7c9f474f44572cb520885.
A fonte original continua intacta; o preparador cria também uma cópia de recuperação
byte a byte, recusando sobrescrever uma cópia diferente.

## Organização autorizada

23 slides finais: capa + 22 slides de conteúdo.
Mapeamento (numeração original, sempre antes de quaisquer exclusões):

| Final | Originais |
| --- | --- |
| 1–6 | 1–6, respectivamente |
| 7 | 7 + 8 + 9 |
| 8–10 | 10–12, respectivamente |
| 11 | 13 + 14 |
| 12 | 15 |
| 13 | 16 + 17 |
| 14 | 18 + 19 |
| 15–17 | 20–22, respectivamente |
| 18 | 23 + 24 |
| 19–20 | 25–26, respectivamente |
| 21 | 27 + 28 |
| 22 | 29 + 30 |
| 23 | 40 |

Origens incorporadas removidas como slides autônomos: 8, 9, 14, 17, 19, 24, 28, 30.
Excluídos inteiramente, conforme solicitação: 31–39. Original 40 integralmente mantido.
Somente o primeiro título principal de cada grupo é utilizado. Subtítulos em negrito,
textos e referências são conservados. Junções 7–8 e 27–28 recompõem frases; o sujeito
“O texto” sai do fim do original 3 e inicia o original 4. Nenhum resumo é criado.

Os títulos dos originais 7, 10, 11, 12, 13, 15 e 18 usam a referência abreviada Mt
e estilo de uma linha com fonte inicial 44 px. O runtime mede o título depois do
carregamento das fontes e, se necessário, ajusta até 36 px. Fontes substitutas
excepcionalmente largas podem voltar a duas linhas para nunca cortar o título.
Textos do corpo permanecem a 34 px. A capa 4:3 fica inteira, centralizada em 16:9,
sem deformação nem recorte de informações; não foi reprocessada.

O preparador `scripts/prepare-ebd-reorganized-preview.mjs` usa exclusivamente a
prévia HTML original, sem consultar ou modificar banco, Biblioteca ou arquivo salvo.
Recusa fonte diferente da referência e estruturas que não reconheça. Produz HTML
autocontido e manifesto de integridade com mapeamento/hashes, fora do repositório.
É uma reorganização explícita deste roteiro, não uma regra para excluir conteúdos
de outras lições. `preserveSource` impede recriar os slides já incorporados por
repaginação automática.

## Navegação permanente no gerador central

`src/presentation.mjs`: controles ocultos inicialmente. Somente a faixa inferior de
84 px (mais área segura do dispositivo) recebe eventos para revelar a navegação.
Mouse fora dessa faixa, clique na leitura, setas, PageUp/PageDown, Home/End e entrada
em tela cheia por atalho não revelam os controles. Saída da faixa oculta após 450 ms,
preservando foco de teclado. Toque na faixa mostra os botões temporariamente;
Tab permite acessá-los sem mouse. Não se altera a navegação dos slides, impressão,
consulta de referências ou chamadas existentes à API Fullscreen.

## Verificações direcionadas

- Quatro testes novos/afetados: mapa e contagem; integridade de todos os textos e
  referências mantidos; remoção de origens e preservação do original 40; continuidade;
  títulos solicitados; runtime real exportado em DOM técnico mínimo para mouse,
  foco, toque, setas e botões. Os testes antigos não afetados não foram repetidos.
- Comparação da lição real: sequência de todos os corpos/subtítulos mantidos idêntica
  após normalização apenas dos espaços entre blocos; referências preservadas por grupo;
  nenhum título principal incorporado duplicado; 23 seções no HTML final.
- Métricas estáticas conservadoras com Nimbus Sans (substituta de Arial), medindo todos
  os parágrafos como negrito: os 22 slides de conteúdo cabem na área estimada; menor
  folga de 60,7 px antes da reserva interna de 32 px. Títulos solicitados cabem em
  uma linha. Não equivale a renderização no navegador Windows.
- Compilação TypeScript/Vite e whitespace verificados. Mantido o aviso conhecido
  de tamanho do bundle, sem alterações em dependências.

A revisão visual final do HTML offline no Windows permanece necessária. Não se
declara teste físico de tela cheia, impressão ou ausência de sobreposição no navegador.
Nenhuma publicação, alteração da main, Worker, Neon, credenciais, Biblioteca ou
questionários. Nenhum novo ambiente ou branch.
