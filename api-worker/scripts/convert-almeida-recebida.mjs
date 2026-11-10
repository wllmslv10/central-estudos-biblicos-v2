// Converter o dump SQL da Almeida Recebida em JSON para uso local.
// Uso: node scripts/convert-almeida-recebida.mjs entrada.sql saida.json
// Não conecta a banco nem modifica arquivos do aplicativo.
import {readFile,writeFile} from 'node:fs/promises';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw new Error('Informe arquivo SQL de entrada e JSON de saída');
const sql=await readFile(input,'utf8');
const books=Object.create(null);let count=0;
for(const line of sql.split(/\r?\n/)){
 if(!/^\(\d+,\s*\d+,\s*\d+,\s*\d+,\s*'/.test(line))continue;
 const m=line.match(/^\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*'(.*)'\)[,;]?$/);
 if(!m)throw new Error('Linha SQL inválida: '+line.slice(0,100));
 const [,id,b,c,v,raw]=m;
 const text=raw.replace(/\\'/g,"'").replace(/\\\\/g,'\\');
 if(!text.trim())throw new Error('Versículo vazio: '+id);
 const chapter=(books[b]??={})[c]??={};
 if(chapter[v]!==undefined)throw new Error('Versículo duplicado: '+b+':'+c+':'+v);
 chapter[v]=text;count++;
}
if(count!==31102||Object.keys(books).length!==66)throw new Error('Contagem inesperada: '+count);
await writeFile(output,JSON.stringify(books));
console.log('Convertidos',count,'versículos em',Object.keys(books).length,'livros');
