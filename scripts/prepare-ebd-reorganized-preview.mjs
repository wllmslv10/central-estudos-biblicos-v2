// Offline only. Input is the original 40-slide preview from 584d979.
// No database, Library, authentication or deployment calls.
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createPresentationHtmlFromSlides} from '../src/presentation.mjs';

export const groups = [[2],[3],[4],[5],[6],[7,8,9],[10],[11],[12],[13,14],[15],[16,17],[18,19],[20],[21],[22],[23,24],[25],[26],[27,28],[29,30],[40]];
const decode = s => s.replace(/&(amp|lt|gt|quot|#39);/g,(_,x)=>({'amp':'&','lt':'<','gt':'>','quot':'"','#39':"'"}[x]));
const text = s => {
  assert.doesNotMatch(s,/<(?!\/?strong\b)[^>]*>/i,'Unexpected original markup; do not discard it.');
  return decode(s.replace(/<strong>([\s\S]*?)<\/strong>/g,'**$1**'));
};
export function parseOriginal(html) {
  assert.match(html,/data-presentation-standard="2"/);
  const sections=html.match(/<section\b[\s\S]*?<\/section>/g)||[];
  assert.equal(sections.length,40,'Expected the exact original 40-slide preview.');
  assert.match(sections[0],/class="slide cover-slide"/);
  const src=decode(sections[0].match(/src="([^"]+)"/)[1]);
  const alt=decode(sections[0].match(/alt="([^"]*)"/)[1]);
  const slides=sections.slice(1).map((section,i)=>{
    const title=section.match(/<h1>([\s\S]*?)<\/h1>/),reading=section.match(/<div class="reading">([\s\S]*?)<\/div>/),note=section.match(/<aside>([\s\S]*?)<\/aside>/);
    assert.ok(title&&reading&&note,`Missing structure on original slide ${i+2}`);
    const paragraphs=[...reading[1].matchAll(/<p(?: class="question")?>([\s\S]*?)<\/p>/g)];
    assert.equal(reading[1].replace(/<p(?: class="question")?>[\s\S]*?<\/p>/g,''),'','Unsupported content in reading area');
    return {kicker:'',title:text(title[1]),body:paragraphs.map(p=>text(p[1])),note:text(note[1])};
  });
  const script=html.match(/<script>([\s\S]*)<\/script>/)[1];
  const args=script.slice(script.lastIndexOf('})(')+3,-2);
  const [logos]=JSON.parse('['+args+']');
  return {slides,cover:{src,alt},logos};
}
export function reorganize(original) {
  assert.equal(original.length,39);
  const source=structuredClone(original);
  // Original 3 -> 4: move the dangling subject as a complete phrase.
  assert.match(source[1].body.at(-1),/ O texto$/u);
  source[1].body[source[1].body.length-1]=source[1].body.at(-1).replace(/ O texto$/u,'');
  source[2].body[0]='O texto '+source[2].body[0];
  return groups.map(numbers=>{
    const first=source[numbers[0]-2],body=[...first.body];
    for(const n of numbers.slice(1)) {
      const paragraphs=source[n-2].body;
      for(const paragraph of paragraphs) {
        // Rejoin only the two source fragments that actually split a sentence.
        if((numbers[0]===7&&n===8)||(numbers[0]===27&&n===28))body[body.length-1]+=' '+paragraph;
        else body.push(paragraph);
      }
    }
    const titleLines=[7,10,11,12,13,15,18].includes(numbers[0])?1:undefined;
    const title=titleLines?first.title.replace(/Mateus[\s\u00a0]+/gu,'Mt\u00a0'):first.title;
    return {...first,title,body,note:[...new Set(numbers.map(n=>source[n-2].note).filter(Boolean))].join(' · '),...(titleLines?{titleLines}:{} )};
  });
}
export async function prepare(input,output) {
  assert.notEqual(resolve(input),resolve(output),'Never overwrite the original.');
  const html=await readFile(input,'utf8');
  assert.equal(createHash('sha256').update(html).digest('hex'),'0966c192a9d8ddabe243f3ecc1737fc98a8fce3dabc7c9f474f44572cb520885','Source differs from approved preview 584d979; stop before changing its content.');
  const {slides,cover,logos}=parseOriginal(html);
  const reorganized=reorganize(slides);
  assert.equal(reorganized.length+1,23);
  const result=createPresentationHtmlFromSlides(reorganized,{title:slides[0].title,collection:'ebd'},'ampliado',logos,{cover,preserveSource:true});
  assert.equal((result.match(/<section\b/g)||[]).length,23);
  const manifest={source_sha256:createHash('sha256').update(html).digest('hex'),output_sha256:createHash('sha256').update(result).digest('hex'),count:23,mapping:[{final:1,original:[1]},...groups.map((original,i)=>({final:i+2,original}))],removed_sources:[8,9,14,17,19,24,28,30],deleted:[31,32,33,34,35,36,37,38,39],original40Preserved:true};
  // Keep a separate, byte-identical recovery copy; never replace an existing one.
  try{await copyFile(input,output+'.original-40.html',1)}catch(e){if(e.code!=='EEXIST')throw e;assert.equal(await readFile(output+'.original-40.html','utf8'),html)}
  await writeFile(output,result);await writeFile(output+'.integrity.json',JSON.stringify(manifest,null,2));
  return manifest;
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
  const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Provide original 40-slide HTML and a new output path.');
  console.log(JSON.stringify(await prepare(input,output),null,2));
}
