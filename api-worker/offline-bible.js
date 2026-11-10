// Leitor isolado da Almeida Recebida. Não altera o validador existente.
// Recebe um índice local no formato {"1": {"1": {"1": "texto"}}}.
import { parseBibleReferences } from './bible-references.js';

export function lookupOfflineVerses(reference, books) {
  if (typeof reference !== 'string' || !books || typeof books !== 'object') return [];
  const parsed = parseBibleReferences(reference);
  if (parsed.references.length !== 1 || !parsed.references[0].valid) return [];
  const r = parsed.references[0];
  if (r.chapter !== r.endChapter) return []; // intervalos entre capítulos exigem limites validados
  const bookNames = ['Gênesis','Êxodo','Levítico','Números','Deuteronômio','Josué','Juízes','Rute','1 Samuel','2 Samuel','1 Reis','2 Reis','1 Crônicas','2 Crônicas','Esdras','Neemias','Ester','Jó','Salmos','Provérbios','Eclesiastes','Cantares','Isaías','Jeremias','Lamentações','Ezequiel','Daniel','Oseias','Joel','Amós','Obadias','Jonas','Miqueias','Naum','Habacuque','Sofonias','Ageu','Zacarias','Malaquias','Mateus','Marcos','Lucas','João','Atos','Romanos','1 Coríntios','2 Coríntios','Gálatas','Efésios','Filipenses','Colossenses','1 Tessalonicenses','2 Tessalonicenses','1 Timóteo','2 Timóteo','Tito','Filemom','Hebreus','Tiago','1 Pedro','2 Pedro','1 João','2 João','3 João','Judas','Apocalipse'];
  const bookId = bookNames.indexOf(r.book) + 1;
  if (!bookId || r.to-r.from>200) return [];
  const chapter = books[String(bookId)]?.[String(r.chapter)];
  if (!chapter) return [];
  const verses = [];
  for (let v=r.from;v<=r.to;v++) {
    const text=chapter[String(v)];
    if (typeof text !== 'string' || !text.trim()) return [];
    verses.push({book:r.book,chapter:r.chapter,verse:v,text});
  }
  return verses;
}
