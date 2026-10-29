import test from 'node:test';
import assert from 'node:assert/strict';
import {groups,reorganize} from '../scripts/prepare-ebd-reorganized-preview.mjs';
import {createPresentationHtmlFromSlides} from '../src/presentation.mjs';
const fixture=()=>Array.from({length:39},(_,i)=>({kicker:'',title:`Título original ${i+2} (Mateus 4:3–4)`,body:[`Texto exclusivo ${i+2}.`,...(i===1?['Introdução. O texto']:[])],note:`Referência preservada ${i+2}`}));
const normalize=s=>s.replace(/\s+/gu,' ').trim();
test('reorganização: 22 slides de conteúdo e uma capa, sem origens duplicadas ou vazias',()=>{
 const source=fixture(),before=JSON.stringify(source),result=reorganize(source);
 assert.equal(result.length,22);assert.equal(JSON.stringify(source),before);
 assert.deepEqual(groups.filter(g=>g.length>1),[[7,8,9],[13,14],[16,17],[18,19],[23,24],[27,28],[29,30]]);
 const kept=source.filter((_,i)=>i+2<31||i+2===40);
 assert.equal(normalize(result.flatMap(s=>s.body).join(' ')),normalize(kept.flatMap(s=>s.body).join(' ')),'Every retained body/subtitle must remain exactly once and in order');
 for(let n=31;n<=39;n++)assert.ok(!result.flatMap(s=>s.body).join(' ').includes(`Texto exclusivo ${n}.`));
 for(let i=0;i<groups.length;i++){
  const g=groups[i],s=result[i];assert.ok(s.body.length&&s.body.every(Boolean));
  assert.equal(s.title,source[g[0]-2].title.replace(/Mateus /u,s.titleLines?'Mt\u00a0':'Mateus '));
  for(const original of g)assert.ok(s.note.includes(source[original-2].note));
 }
 assert.equal(result.at(-1).body[0],source.at(-1).body[0]);
 const html=createPresentationHtmlFromSlides(result,{title:'Teste de organização'},'ampliado',{}, {preserveSource:true});
 assert.equal((html.match(/data-source-slide=/g)||[]).length,22);assert.match(html,/"preserveSource":true/);
});
test('continuidade: sujeito transferido ao slide 4 e fragmentos 7–8 e 27–28 reunidos',()=>{
 const source=fixture();source[2].body=['mostra a continuação.'];source[5].body=['No contexto, Israel'];source[6].body=['precisava aprender dependência.'];source[25].body=['pelo que exigem de'];source[26].body=['nossa consciência.'];
 const result=reorganize(source);
 assert.equal(result[1].body.at(-1),'Introdução.');assert.equal(result[2].body[0],'O texto mostra a continuação.');
 assert.equal(result[5].body[0],'No contexto, Israel precisava aprender dependência.');
 assert.equal(result[19].body[0],'pelo que exigem de nossa consciência.');
});
test('títulos: somente os solicitados recebem uma linha e abreviação da referência',()=>{
 const source=fixture(),result=reorganize(source);
 assert.deepEqual(groups.filter((_,i)=>result[i].titleLines===1).map(g=>g[0]),[7,10,11,12,13,15,18]);
 assert.ok(result.every((s,i)=>s.titleLines||s.title===source[groups[i][0]-2].title));
});
