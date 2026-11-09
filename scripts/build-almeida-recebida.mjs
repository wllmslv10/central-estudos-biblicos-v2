// Convert the official Almeida Recebida v1.7 SQL dump to a compact JSON asset.
// Usage: node scripts/build-almeida-recebida.mjs path/to/pt_nar.sql public/almeida-recebida-v1.7.json
// The SQL file is provided by the Almeida Recebida project. Never silently substitute another translation.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';

export function parseAlmeidaRecebida(sql) {
  const verses = {};
  const pattern = /^\((\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*'((?:\\.|''|[^'\\])*)'\)[,;]?\s*$/gm;
  for (const match of sql.matchAll(pattern)) {
    const [, ,book,chapter,verse,raw] = match;
    const value=raw.replace(/''/g,"'").replace(/\\'/g,"'").replace(/\\\\/g,'\\');
    const key=`${book}.${chapter}.${verse}`;
    if (Object.hasOwn(verses,key)) throw Error('Duplicate verse: '+key);
    verses[key]=value;
  }
  if(Object.keys(verses).length!==31102) throw Error('Expected 31102 verses, found '+Object.keys(verses).length);
  return {edition:'Almeida Recebida',version:'1.7',source:'almeidarecebida.org',verses};
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href){
  const [, ,source,destination]=process.argv;
  if(!source||!destination) throw Error('Provide source SQL and output JSON paths');
  const output=JSON.stringify(parseAlmeidaRecebida(await readFile(source,'utf8')));
  await mkdir(dirname(destination),{recursive:true});
  await writeFile(destination,output,'utf8');
  process.stdout.write('Wrote '+destination+'\n');
}
