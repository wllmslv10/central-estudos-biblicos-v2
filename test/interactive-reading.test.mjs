import test from 'node:test';
import assert from 'node:assert/strict';
import {createReadingHtml} from '../src/interactiveReading.mjs';
import {buildSlides,createPresentationHtml} from '../src/presentation.mjs';
import {audienceContent} from '../src/contentAccess.mjs';
import {studentStudy} from '../api-worker/student-lesson.js';
import {experimentalStudy as source} from './fixtures/ebd-experimental.mjs';

test('three new modalities select complete sentences, grow in depth, and never mutate source',()=>{
 const before=structuredClone(source);let previous=0;
 for(const mode of ['simples','media','completa']){
  const slides=buildSlides(source,mode),text=slides.flatMap(s=>s.body).join(' ');
  assert.doesNotMatch(text,/SEGREDO-TESTE|gabarito/);assert.ok(text.length>previous);previous=text.length;
  assert.ok(slides.every(s=>s.body.every(p=>/[.!?][”"')]*\s*$/u.test(p))));
  const html=createPresentationHtml(source,mode);assert.match(html,/data-explanatory-unit/);assert.match(html,/"explanatory":true/);assert.doesNotThrow(()=>new Function(html.match(/<script>([\s\S]*)<\/script>/)[1]));
 }
 assert.deepEqual(source,before);
 assert.throws(()=>buildSlides({...source,contentVersion:undefined},'simples'),/Revise/);
});
test('full reading preserves complete teaching while teacher notes stay outside student bytes',()=>{
 const teacher=createReadingHtml(source,{audience:'teacher'}),student=createReadingHtml(source,{audience:'student'});
 assert.match(teacher,/SEGREDO-TESTE/);assert.doesNotMatch(student,/SEGREDO-TESTE|gabarito reservado/);
 for(const value of [source.introduction,...source.points.flatMap(p=>[p.explanation,p.application]),source.conclusion]) assert.ok(student.includes(value));
 for(const term of ['CEB — Central de Estudos Bíblicos','Igreja Batista Nova Esperança — IBNE','Imprimir / PDF','Leitura limpa','ACF','ARA','NVI'])assert.ok(student.includes(term));
 const script=student.match(/<script>([\s\S]*)<\/script>/)[1];assert.doesNotThrow(()=>new Function(script));
 assert.doesNotMatch(createReadingHtml({...source,title:'</title><script>alert(1)</script>',introduction:'<img src=x onerror=alert(1)>'}),/<img src=x|<script>alert/);
});
test('structured visibility and API allowlist remove hidden blocks, answer keys and unknown fields',()=>{
 const content={...source,blocks:[{title:'Público',text:'Ensino completo.',audience:'student'},{title:'Reservado',text:'SEGREDO-TESTE',audience:'teacher'},{title:'Sem classificação',text:'SEGREDO-INDEFINIDO'}],internal:{secret:'SEGREDO-INTERNO'},questions:[{question:'Como aplicar?',options:['A','B'],answer:1,explanation:'SEGREDO-GABARITO'}]};
 const before=structuredClone(content),delivered=studentStudy({content}).content;
 assert.doesNotMatch(JSON.stringify(delivered),/SEGREDO|answer|internal|teacherNotes/);assert.equal(delivered.legacySections.length,1);
 assert.deepEqual(studentStudy({content:delivered}).content,delivered);assert.deepEqual(content,before);
 assert.equal(audienceContent(content,'teacher').legacySections.length,4);
});
