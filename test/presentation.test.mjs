import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSlides,createPresentationHtml,cleanPresentationInstructions,defaultPresentationMode,splitPresentationText,createPresentationHtmlFromSlides} from '../src/presentation.mjs';
const study = {title:'Teste CEB',passage:'Mateus 4:1–11',theme:'Uma decisão consciente.',introduction:'Introdução para a aula.',points:[{title:'PONTO 1: Uma escolha',explanation:'Pergunte à turma: Qual decisão honra a Deus? Ouça as respostas. Considere Mateus 4:4.',application:'Explique à turma: Reflita sobre as escolhas. Como aplicar isso hoje?'}],conclusion:'Conclusão da aula.'};
const normalized = s => s.replace(/\s+/gu,' ').trim();
for (const mode of ['ampliado','resumido']) {
 test(`${mode}: projeção não altera o estudo nem seus identificadores`,()=>{const input=structuredClone({...study,cloudId:'preserved'});const before=JSON.stringify(input);buildSlides(input,mode);createPresentationHtml(input,mode);assert.equal(JSON.stringify(input),before);});
 test(`${mode}: preserva perguntas, instruções e títulos sem reescrita`,()=>{const slides=buildSlides(study,mode),text=slides.flatMap(s=>[s.title,...s.body,s.note]).join(' ');assert.match(text,/Qual decisão honra a Deus\?/);assert.match(text,/Como aplicar isso hoje\?/);if(mode==='ampliado') assert.doesNotMatch(text,/Pergunte à turma|Ouça as respostas|Explique à turma/); else {assert.match(text,/Pergunte à turma/);assert.match(text,/Ouça as respostas/);assert.match(text,/Explique à turma/);}assert.ok(slides.every(s=>!s.kicker));});
 test(`${mode}: HTML escapa conteúdo ativo`,()=>{const html=createPresentationHtml({...study,title:'</script><script>alert(1)</script>',introduction:'<img src=x onerror=alert(1)>'},mode);assert.equal((html.match(/<script>/g)||[]).length,1);assert.ok(!html.includes('<img src=x'));assert.match(html,/&lt;img/);});
 test(`${mode}: pagina todos os campos sem perder conteúdo`,()=>{const long={...study,theme:'Tema extenso. '.repeat(150),introduction:'Introdução extensa Mt 4:4. '.repeat(150),points:[{title:'Título',explanation:'Explicação sem pontuação '.repeat(180),application:'Aplicação ao cotidiano. '.repeat(140)}],conclusion:'Conclusão completa. '.repeat(150)};const text=normalized(buildSlides(long,mode).flatMap(s=>s.body).join(' '));for(const v of [long.theme,long.introduction,long.points[0].explanation,long.points[0].application,long.conclusion])assert.ok(text.includes(normalized(v)));assert.ok(buildSlides(long,mode).length>10);});
}
test('ampliado é padrão na EBD; clássico nos demais estudos',()=>{assert.equal(defaultPresentationMode({collection:'ebd'}),'ampliado');assert.equal(defaultPresentationMode({}),'resumido');});
test('ampliado separa explicação e aplicação; clássico mantém ambos próximos',()=>{assert.ok(buildSlides(study,'ampliado').length>buildSlides(study,'resumido').length);});
test('instrução não consome a pergunta seguinte',()=>{assert.equal(cleanPresentationInstructions('Ouça as respostas: Qual o caminho?'),'Qual o caminho?');assert.equal(cleanPresentationInstructions('**Pergunte à turma:** Como agir?'),'Como agir?');});
test('referência não é dividida entre slides no limite de texto',()=>{const pieces=splitPresentationText('Palavra '.repeat(41)+'1 João 2:15–17 e Mateus 4:4',340);assert.ok(pieces.some(p=>normalized(p).includes('1 João 2:15–17')));});
test('repetições e seções de revisão não são eliminadas automaticamente',()=>{const slides=buildSlides({...study,legacySections:[{title:'Cópia',content:study.introduction},{title:'Extra',content:'Texto exclusivo.'},{title:'Extra 2',content:'Texto exclusivo.'}]},'ampliado');assert.equal(slides.filter(s=>s.body.includes('Texto exclusivo.')).length,2);assert.equal(slides.filter(s=>s.body.includes(study.introduction)).length,2);});
test('vazio não produz slides de introdução, pontos ou conclusão fictícios',()=>{assert.equal(buildSlides({title:'',passage:'',theme:'',introduction:'',points:[],conclusion:''},'ampliado').length,1);});

test('fonte explícita preserva ordem, títulos, perguntas e referências dos 30 slides',()=>{
 const slides=Array.from({length:30},(_,i)=>({kicker:'',title:`Título ${i+1}`,body:[`Texto integral ${i+1}. Pergunte à turma: Como agir?`,`Aplicação ${i+1}. Ouça as respostas.`],note:`Mateus 4:${i+1}`}));
 const before=JSON.stringify(slides), html=createPresentationHtmlFromSlides(slides,{title:'Fonte técnica',collection:'ebd'});
 assert.equal(JSON.stringify(slides),before);assert.equal((html.match(/data-source-slide=/g)||[]).length,30);
 let last=-1;for(const slide of slides){const at=html.indexOf(slide.title,last+1);assert.ok(at>last);last=at;for(const text of [...slide.body,slide.note])assert.ok(html.includes(cleanPresentationInstructions(text)));}
});
test('ampliado retira apenas orientações; clássico mantém o texto original',()=>{
 const value='Pergunte à turma: Como agir? Ouça as respostas e destaque a responsabilidade da igreja de unir verdade, misericórdia e auxílio prático.';
 const input={...study,introduction:value}; const before=JSON.stringify(input);
 const expanded=normalized(buildSlides(input,'ampliado').flatMap(s=>s.body).join(' '));
 assert.ok(expanded.includes('Como agir?'));assert.doesNotMatch(expanded,/Ouça as respostas|destaque a responsabilidade/);
 assert.ok(normalized(buildSlides(input,'resumido').flatMap(s=>s.body).join(' ')).includes(value));assert.equal(JSON.stringify(input),before);
});
test('imagens compartilhadas são embutidas uma vez, sem injeção de script',()=>{
 const slides=Array.from({length:30},(_,i)=>({kicker:'',title:`Slide ${i}`,body:['Texto.'],note:''}));
 const html=createPresentationHtmlFromSlides(slides,{title:'Teste'},'ampliado',{ceb:'data:image/png;base64,ASSET_UNICO',church:'</script><script>window.x=1</script>'});
 assert.equal((html.match(/ASSET_UNICO/g)||[]).length,1);
 assert.equal((html.match(/<script>/g)||[]).length,1);
});
