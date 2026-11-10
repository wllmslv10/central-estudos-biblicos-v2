// Verificação independente do JSON antes de qualquer publicação.
// Uso: node scripts/verify-almeida-recebida.mjs arquivo.json
import {readFile} from 'node:fs/promises';
const file=process.argv[2];
if(!file)throw new Error('Informe o JSON a verificar');
const books=JSON.parse(await readFile(file,'utf8'));
const chapterCounts=[50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];
if(Object.keys(books).length!==66)throw new Error('Quantidade de livros incorreta');
let chapters=0,verses=0;
for(let b=1;b<=66;b++){
 const book=books[b];if(!book||Object.keys(book).length!==chapterCounts[b-1])throw new Error('Capítulos inválidos no livro '+b);
 for(let c=1;c<=chapterCounts[b-1];c++){
  const chapter=book[c];if(!chapter)throw new Error('Capítulo ausente '+b+':'+c);
  const ids=Object.keys(chapter).map(Number).sort((a,z)=>a-z);
  if(!ids.length||ids.some((v,i)=>v!==i+1))throw new Error('Sequência de versículos inválida '+b+':'+c);
  if(ids.some(v=>typeof chapter[v]!=='string'||!chapter[v].trim()))throw new Error('Versículo vazio '+b+':'+c);
  verses+=ids.length;chapters++;
 }
}
if(chapters!==1189||verses!==31102)throw new Error('Contagem inválida: '+chapters+' capítulos, '+verses+' versículos');
console.log('Base validada: 66 livros, 1189 capítulos, 31102 versículos');
