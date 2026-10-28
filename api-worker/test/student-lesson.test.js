import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import worker from '../worker.js';
import { studentLessonText, studentStudy } from '../student-lesson.js';
const id='20000000-0000-4000-8000-000000000001';
const lesson={id,title:'Lição',content:{introduction:'Jesus foi tentado (Mateus 4:1–11).',points:[{title:'Fidelidade',explanation:'Jesus recusou a idolatria.',application:'Não aceite fraude.'}],conclusion:'Conclusão\nJesus foi fiel.\nDINÂMICA EM GRUPO (15 minutos)\nDivida a turma em três grupos.\n**Grupo 1 — Trabalho:** recuse falsificar o relatório.\n**Grupo 2 — Amizades:** preserve a consciência.\n**Grupo 3 — Finanças:** não omita informações.\nCada grupo deve responder:\n1. Qual princípio bíblico orienta a decisão?\nReferências sugeridas: Mateus 4:10.\nCRONOGRAMA — 60 MINUTOS\n- 0–10 min: leitura.\n- 40–55 min: dinâmica em grupo.\nREFERÊNCIAS COMPLEMENTARES\nTiago 4:7.',sharing:{enabled:true,allowDownload:true,quizEnabled:true,audience:'all'},questions:[{question:'Questão existente',options:['A','B','C','D'],answer:0}]}};
test('student projection preserves teaching, three individual cases, questions and original',()=>{
 const before=structuredClone(lesson),result=studentStudy(lesson),text=JSON.stringify(result);
 assert.deepEqual(lesson,before);assert.deepEqual(result.content.points,lesson.content.points);assert.deepEqual(result.content.questions,lesson.content.questions);assert.deepEqual(result.content.sharing,lesson.content.sharing);
 assert.doesNotMatch(text,/cronograma|60 MINUTOS|15 minutos|Divida a turma|Grupo [123]|Cada grupo|0–10/iu);
 for(const phrase of ['Jesus foi fiel.','Reflexão 1 — Trabalho','Reflexão 2 — Amizades','Reflexão 3 — Finanças','Qual princípio bíblico','Mateus 4:10','Tiago 4:7'])assert.ok(text.includes(phrase),phrase);
 assert.deepEqual(studentStudy(result),result);
});
test('section metadata and directives hidden without removing legitimate applications',()=>{
 const result=studentStudy({content:{legacySections:[{title:'Orientações ao professor',content:'Divida a turma.'},{title:'Cronograma',content:'60 minutos'},{title:'Dinâmica em grupo',content:'Grupo 1: Seu chefe pede uma mentira.\nCada grupo deve responder:\nComo agir com fidelidade?'},{title:'Referências bíblicas',content:'Efésios 4:25'}],conclusion:'INTRODUÇÃO (10 minutos)\nPergunta à turma: Como resistir à tentação?\nUma família enfrenta dificuldades: como agir com fidelidade?'}});
 assert.equal(result.content.legacySections.length,2);assert.match(result.content.legacySections[0].content,/Reflexão 1: Seu chefe/);assert.match(result.content.conclusion,/Como resistir/);assert.match(result.content.conclusion,/Uma família enfrenta/);assert.doesNotMatch(JSON.stringify(result),/minutos|turma|professor|Cada grupo/iu);
 assert.equal(studentLessonText('Jesus reuniu um grupo de discípulos (Mateus 4:18–22).'),'Jesus reuniu um grupo de discípulos (Mateus 4:18–22).');
});
test('actual Worker read and download project only student responses; no database writes',async()=>{
 const originals={connect:pg.Client.prototype.connect,query:pg.Client.prototype.query,end:pg.Client.prototype.end};let role='user',allowed=true;const sqls=[];
 pg.Client.prototype.connect=async()=>{};pg.Client.prototype.end=async()=>{};
 pg.Client.prototype.query=async(sql)=>{sqls.push(sql);if(sql.includes('FROM public.ceb_sessions'))return {rows:[{id:'10000000-0000-4000-8000-000000000001',app_role:role,must_change_password:false}]};if(sql.includes('FROM public.ceb_studies'))return {rows:allowed?[lesson]:[]};throw Error('Unexpected SQL');};
 const get=async(path)=>{const r=await worker.fetch(new Request('https://api.test'+path,{headers:{Authorization:'Bearer technical'}}),{HYPERDRIVE:{connectionString:'postgresql://technical.invalid/db'}});return {status:r.status,body:await r.json()};};
 try{
  const list=await get('/studies'),download=await get(`/studies/${id}/download`);assert.equal(list.status,200);assert.deepEqual(list.body.studies[0],download.body.study);assert.deepEqual(download.body.study,studentStudy(lesson));
  role='admin';assert.deepEqual((await get('/studies')).body.studies[0],lesson);assert.deepEqual((await get(`/studies/${id}/download`)).body.study,lesson);
  role='user';allowed=false;assert.equal((await get(`/studies/${id}/download`)).status,404);
  assert.ok(sqls.every(sql=>/^SELECT/iu.test(sql.trim())));assert.ok(sqls.some(sql=>sql.includes("allowDownload' = 'true'")));
 }finally{Object.assign(pg.Client.prototype,originals);}
});
