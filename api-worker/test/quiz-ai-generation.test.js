import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {decodeGeneratedOutput,generateForStudy,normalizeGenerated,QUIZ_AI_MODEL} from '../quiz-ai.js';
import {validateQuiz,studentDefinition,grade} from '../quizzes.js';
const source='O bom samaritano — Lucas 10:25–37. Um samaritano viu o homem ferido e teve compaixão. Ele cuidou das feridas com azeite e vinho. A lição chama esse cuidado de “amor ao próximo”. Jesus orientou o interlocutor a agir com misericórdia.';
const references=['Lucas 10:25–37'];
const q={question:'O que a lição chama de "amor ao próximo"?',options:['O cuidado com quem precisa','A indiferença','A vingança','O abandono'],answer:0,explanation:'Conforme Lucas 10:25-37, o cuidado demonstra amor.',referenceIndex:0,evidence:'ele cuidou das feridas com azeite e vinho'};
const valid={questions:[q]};
const normalize=(obj=valid,n=1)=>normalizeGenerated(obj,n,source,references,validateQuiz);
const category=(fn,c)=>assert.throws(fn,e=>e.category===c);
test('accepts structured objects, JSON text, complete JSON fences and chat-completion envelopes',()=>{
 for(const output of [{response:valid},{response:JSON.stringify(valid)},{response:'```json\n'+JSON.stringify(valid)+'\n```'},{choices:[{message:{content:JSON.stringify(valid)},finish_reason:'stop'}]},valid])assert.equal(normalize(decodeGeneratedOutput(output)).length,1);
 category(()=>decodeGeneratedOutput({usage:{}}),'response_format');category(()=>decodeGeneratedOutput({choices:[{finish_reason:'length'}]}),'model_truncated');category(()=>normalize('{invalid}'),'json_parse');
});
test('typography and case do not invalidate source evidence, verified quotes or the same verse reference',()=>{
 const [result]=normalize();assert.equal(result.evidence,'Ele cuidou das feridas com azeite e vinho');assert.equal(result.reference,references[0]);assert.ok(source.includes(result.evidence));assert.equal(result.options.length,4);assert.equal(grade([result],[0]).percent,100);assert.equal('answer' in studentDefinition({questions:[result]}).questions[0],false);
});
test('still rejects invented/paraphrased evidence, invented quotes and unapproved Bible references',()=>{
 for(const evidence of ['Ele abandonou o homem ferido','Ele cuidou com vinho das feridas','cuidou feridas vinho'])category(()=>normalize({questions:[{...q,evidence}]}),'evidence');
 category(()=>normalize({questions:[{...q,question:'O que significa "texto inventado"?'}]}),'quotation');
 category(()=>normalize({questions:[{...q,explanation:'Conforme Lucas 99:99'}]}),'reference');category(()=>normalize({questions:[{...q,referenceIndex:9}]}),'reference');
});
test('enforces requested count, four distinct options and one valid correct-answer index',()=>{
 category(()=>normalize(valid,3),'question_count');for(const patch of [{options:['a','b','c']},{options:['a','a','b','c']},{answer:4},{answer:[0,1]},{answer:'A'}])category(()=>normalize({questions:[{...q,...patch}]}),'question_validation');
});
const saved={questions:[{question:'Já salva'}],revision:7};
async function generate(provider){
 const before=structuredClone(saved),queries=[],logs=[];const original=console.warn;
 const client={query:async(sql,args)=>{queries.push(sql);if(sql.startsWith('SELECT id,title'))return {rows:[{title:'Lição técnica',content:{introduction:source},owner_user_id:'technical-admin'}]};if(sql.includes('AS total'))return {rows:[{total:0,own:0,last:null}]};if(sql.startsWith('INSERT'))return {rows:[{id:'technical-reservation'}]};return {rows:[]};}};
 console.warn=(...args)=>logs.push(args);
 let r;try{r=await generateForStudy(new Request('https://api.test/',{method:'POST',body:'{"count":1}'}),new URL('https://api.test/'),client,{id:'technical-admin',app_role:'admin'}, {CEB_AI_FREE_CONFIRMED:'true',AI:{run:provider}},(body,status)=>({body,status}),'','technical-lesson',validateQuiz);}finally{console.warn=original;}
 assert.deepEqual(saved,before);assert.equal(queries.some(sql=>/ceb_quizzes|ceb_quiz_attempts|ceb_users/.test(sql)),false);return {...r,queries,logs};
}
test('model failures log only a fixed category and preserve previously saved quizzes',async()=>{
 const r=await generate(async()=>{throw Error('SECRET private lesson personal information');});assert.equal(r.status,503);assert.deepEqual(r.logs,[['CEB_QUIZ_AI_FAILURE',{category:'model_call'}]]);assert.equal(JSON.stringify(r).includes('SECRET'),false);assert.ok(r.queries.some(s=>s.includes("status='failed'")));
});
test('JSON/validation failures have separate private-safe categories and never overwrite saved questions',async()=>{
 for(const [response,c]of [['not json','json_parse'],[{questions:[{...q,evidence:'Inexistente no conteúdo'}]},'evidence'],[{questions:[]},'question_count']]){const r=await generate(async()=>({response,usage:{prompt_tokens:123,completion_tokens:45}}));assert.equal(r.status,503);assert.deepEqual(r.logs,[['CEB_QUIZ_AI_FAILURE',{category:c}]]);}
 const r=await generate(async()=>({usage:{}}));assert.deepEqual(r.logs,[['CEB_QUIZ_AI_FAILURE',{category:'response_format'}]]);
});
test('valid provider draft reaches the existing success path without saving or publishing a quiz',async()=>{
 const r=await generate(async(model)=>{assert.equal(model,QUIZ_AI_MODEL);return {response:valid,usage:{prompt_tokens:123,completion_tokens:45}};});assert.equal(r.status,200);assert.equal(r.body.reviewRequired,true);assert.equal(r.logs.length,0);assert.ok(r.queries.some(s=>s.includes("status='succeeded'")));
});
test('previous real model fixture still passes automatic and mixed validation',async()=>{
 const f=JSON.parse(await readFile(new URL('./fixtures/workers-ai-real-20261028.json',import.meta.url),'utf8'));const questions=normalizeGenerated(f.response,10,f.source,f.references,validateQuiz);for(const mode of ['automatic','mixed'])assert.equal(validateQuiz({mode,policy:'single',showAnswers:false,reviewed:true,questions}).questions.length,10);
});
test('real three-question response with a quoted source phrase passes without weakening grounding',async()=>{
 const f=JSON.parse(await readFile(new URL('./fixtures/workers-ai-fix-real-20261028.json',import.meta.url),'utf8'));const questions=normalizeGenerated(decodeGeneratedOutput({response:f.response}),3,f.source,f.references,validateQuiz);assert.equal(questions.length,3);assert.ok(questions.every(q=>q.options.length===4&&f.source.includes(q.evidence)));assert.equal(grade(questions,questions.map(q=>q.answer)).percent,100);
});
