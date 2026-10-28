// Canonical identity and source coverage, not a whitelist of literal spellings.
// No verse is authorized merely because its book/chapter is mentioned.
const BOOKS=[
 ['Gênesis','Gn Gen'],['Êxodo','Ex Exo'],['Levítico','Lv Lev'],['Números','Nm Num'],['Deuteronômio','Dt Deut'],['Josué','Js Jos'],['Juízes','Jz Juiz'],['Rute','Rt Rut'],
 ['1 Samuel','1Sm 1Sam'],['2 Samuel','2Sm 2Sam'],['1 Reis','1Rs 1Re'],['2 Reis','2Rs 2Re'],['1 Crônicas','1Cr 1Cron'],['2 Crônicas','2Cr 2Cron'],['Esdras','Ed Esd'],['Neemias','Ne Nee'],['Ester','Et Est'],['Jó','Job'],['Salmos','Sl Sal Salmo'],['Provérbios','Pv Prov'],['Eclesiastes','Ec Ecl'],['Cantares','Ct Cant', 'Cântico dos Cânticos','Cânticos','Cantares de Salomão'],
 ['Isaías','Is Isa'],['Jeremias','Jr Jer'],['Lamentações','Lm Lam'],['Ezequiel','Ez Ezeq'],['Daniel','Dn Dan'],['Oseias','Os Oséias'],['Joel','Jl'],['Amós','Am'],['Obadias','Ob'],['Jonas','Jn Jon'],['Miqueias','Mq Miq Miquéias'],['Naum','Na'],['Habacuque','Hc Hab'],['Sofonias','Sf Sof'],['Ageu','Ag'],['Zacarias','Zc Zac'],['Malaquias','Ml Mal'],
 ['Mateus','Mt Mat'],['Marcos','Mc Marc'],['Lucas','Lc Luc'],['João','Jo Joao'],['Atos','At'],['Romanos','Rm Rom'],['1 Coríntios','1Co 1Cor'],['2 Coríntios','2Co 2Cor'],['Gálatas','Gl Gal'],['Efésios','Ef Efe'],['Filipenses','Fp Fil'],['Colossenses','Cl Col'],['1 Tessalonicenses','1Ts 1Tess'],['2 Tessalonicenses','2Ts 2Tess'],['1 Timóteo','1Tm 1Tim'],['2 Timóteo','2Tm 2Tim'],['Tito','Tt Tit'],['Filemom','Fm Flm Filemon'],['Hebreus','Hb Heb'],['Tiago','Tg Tiag'],['1 Pedro','1Pe 1Ped'],['2 Pedro','2Pe 2Ped'],['1 João','1Jo 1Joao'],['2 João','2Jo 2Joao'],['3 João','3Jo 3Joao'],['Judas','Jd Jud'],['Apocalipse','Ap Apoc']
];
const fold=s=>s.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const aliasKey=s=>fold(s).replace(/[\s.ºª]/g,'');
const aliases=new Map(),patterns=[];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const accent={a:'[aáàâãä]',e:'[eéèêë]',i:'[iíìîï]',o:'[oóòôõö]',u:'[uúùûü]',c:'[cç]'};
function pattern(alias){
 if(alias==='Jó')return 'Jó';
 let p='';for(const c of fold(alias))p+=c===' '?'\\s*':accent[c]||escape(c);
 return p;
}
for(const [book,short,...extra]of BOOKS){
 for(const name of [book,...short.split(' '),...extra]){
  const numbered=name.match(/^([1-3])\s*(.+)$/u);
  if(numbered){
   const [,n,rest]=numbered,roman=['','I','II','III'][Number(n)];
   aliases.set(aliasKey(n+rest),book);aliases.set(aliasKey(roman+rest),book);
   patterns.push({length:name.length+4,value:`(?:${n}[.ºª]*|${roman}\\.?)\\s*${pattern(rest)}`});
  }else{aliases.set(aliasKey(name),book);patterns.push({length:name.length,value:pattern(name)});}
 }
}
// Jo is the established abbreviation for João; Jó remains a distinct book.
function bookIdentity(raw){return raw.replace(/\./g,'').trim().toLowerCase()==='jó'?'Jó':aliases.get(aliasKey(raw));}
const booksPattern=patterns.sort((a,b)=>b.length-a.length).map(x=>x.value).join('|');
const startPattern=()=>new RegExp(`(?<![\\p{L}\\p{N}])(${booksPattern})\\.?\\s*(\\d{1,3})\\s*[:.]\\s*(\\d{1,3})(?!\\d)`,'giu');
const RANGE=/^\s*(?:[-‐‑‒–—−]|a\b|até\b)\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3}))?(?!\d)/iu;
const CHAPTER=/^\s*[,;]\s*(\d{1,3})\s*[:.]\s*(\d{1,3})(?!\d)/u;
const VERSE=/^\s*,\s*(\d{1,3})(?![\d\p{L}]|\s*[:.])/u;
function interval(text,pos,book,chapter,verse){
 let endChapter=chapter,to=verse,end=pos;
 const r=text.slice(pos).match(RANGE);if(r){end+=r[0].length;if(r[2]!==undefined){endChapter=Number(r[1]);to=Number(r[2]);}else to=Number(r[1]);}
 const valid=chapter>0&&verse>0&&to>0&&(endChapter>chapter||endChapter===chapter&&to>=verse);
 return {book,chapter,from:verse,endChapter,to,end,valid};
}
export function parseBibleReferences(input){
 const text=input.replace(/\b([1-3])\s*\.?\s*[ºª]/gu,'$1').normalize('NFKC'),spans=[],references=[],regex=startPattern();let m;
 while((m=regex.exec(text))){
  const book=bookIdentity(m[1]);if(!book)continue;
  const unsupportedPrefix=/(?:\b[IVX]+|\b\d+)[.ºª]*\s+$/iu.test(text.slice(0,m.index));
  const refs=[],start=m.index;let chapter=Number(m[2]),next=interval(text,regex.lastIndex,book,chapter,Number(m[3]));if(unsupportedPrefix)next.valid=false;refs.push(next);let end=next.end;
  while(true){
   const rest=text.slice(end),ch=rest.match(CHAPTER),v=!ch&&rest.match(VERSE);if(!ch&&!v)break;
   const prefix=ch||v;if(ch)chapter=Number(ch[1]);
   next=interval(text,end+prefix[0].length,book,chapter,Number(ch?ch[2]:v[1]));if(unsupportedPrefix)next.valid=false;refs.push(next);end=next.end;
  }
  spans.push({start,end});references.push(...refs);regex.lastIndex=end;
 }
 return {text,spans,references};
}
export const formatBibleReference=r=>`${r.book} ${r.chapter}:${r.from}${r.endChapter!==r.chapter?`–${r.endChapter}:${r.to}`:r.to!==r.from?`–${r.to}`:''}`;
export function lessonReferences(source){return [...new Set(parseBibleReferences(source).references.filter(r=>r.valid).map(formatBibleReference))];}
export function isReferenceCovered(ref,sourceRefs){
 if(!ref.valid)return false;
 if(ref.chapter!==ref.endChapter)return sourceRefs.some(s=>s.valid&&s.book===ref.book&&s.chapter===ref.chapter&&s.from===ref.from&&s.endChapter===ref.endChapter&&s.to===ref.to);
 // Merge only explicit, same-chapter verse coverage; never infer a whole chapter
 // or missing verses. Cross-chapter ranges require explicit equal endpoints.
 const ranges=sourceRefs.filter(s=>s.valid&&s.book===ref.book&&s.chapter===ref.chapter&&s.endChapter===ref.chapter).sort((a,b)=>a.from-b.from);
 let next=ref.from;for(const r of ranges){if(r.to<next)continue;if(r.from>next)return false;next=Math.max(next,r.to+1);if(next>ref.to)return true;}return false;
}
export function referencesGrounded(text,sourceRefs){
 const parsed=parseBibleReferences(text);if(parsed.references.some(r=>!isReferenceCovered(r,sourceRefs)))return false;
 let residue='',end=0;for(const span of parsed.spans){residue+=parsed.text.slice(end,span.start);end=span.end;}residue+=parsed.text.slice(end);
 // A numeric chapter:verse left over has an unknown/ambiguous book or syntax.
 return !/\d{1,3}\s*:\s*\d{1,3}/u.test(residue);
}
