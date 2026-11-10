# Pacote IBNE v1

Um ZIP comum com todos os arquivos na raiz e um manifesto UTF-8 chamado
`manifest.json`. Os nomes devem conter apenas letras ASCII, números, ponto,
hífen e sublinhado, começando por letra ou número. A comparação de duplicatas
ignora maiúsculas. Não inclua pastas, caminhos, links simbólicos, entradas
criptografadas ou arquivos que não estejam declarados no manifesto.

```json
{
  "version": 1,
  "title": "A Palavra na prática",
  "theme": "Ouvir e praticar a Palavra",
  "references": "Tiago 1:22",
  "description": "Material para EBD",
  "files": {
    "presentation": "presentation.html",
    "reading": "reading.html",
    "pdf": "reading.pdf",
    "quizHtml": "quiz.html",
    "quizData": "quiz.json"
  }
}
```

O título é obrigatório (240 caracteres). Tema e referências têm limite de
1.000 caracteres cada, e descrição de 2.000. Os papéis dos arquivos são
opcionais individualmente. Inclua ao menos um HTML ou PDF. HTML começa com
`<!doctype html>` ou `<html>`, e PDF com `%PDF-`. Use HTML autônomo para que
recursos relativos a outros arquivos do ZIP não se percam após a importação.
Limites de 40 MiB por ZIP e pelo total expandido, 20 MiB por anexo, 32 KiB
para o manifesto e 256 KiB para o JSON de questões.

Para integrar um questionário à Área do Aluno, inclua `quizData` com o
formato de importação do editor existente. O HTML é um anexo privado por
padrão. A atividade que registra respostas e notas é criada pelo JSON.

```json
{
  "questions": [{
    "question": "O que Tiago 1:22 ensina?",
    "options": ["Praticar a Palavra", "Apenas escutar", "Evitar toda conversa", "Buscar aplausos"],
    "answer": "A",
    "reference": "Tiago 1:22"
  }]
}
```

Aceita de 1 a 30 questões, quatro alternativas distintas, resposta A–D ou
índice inteiro de 0 a 3, referência e explicação opcionais. Cada questão
importada começa valendo um ponto.

Na CEB, selecione a seção de Estudos EBD ou Esboços, abra o formulário e
importe o ZIP. Confira e corrija os metadados, revise os arquivos e confirme
a revisão. Salve como rascunho. Os anexos começam reservados ao professor.
Revise o questionário no editor e use o compartilhamento existente para
disponibilizar somente os itens autorizados. O ZIP não define permissões
nem seleciona alunos e sempre inicia um cadastro novo.
