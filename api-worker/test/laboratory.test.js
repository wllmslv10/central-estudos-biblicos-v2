import test from 'node:test';
import assert from 'node:assert/strict';
import {laboratorySql,LAB_SCHEMA} from '../laboratory-sql.js';
import validation from '../validation-worker.js';
import worker from '../worker.js';
import {studentStudy} from '../student-lesson.js';
import {neonObjectStore,NEON_FILES_ENDPOINT} from '../neon-storage.js';
test('laboratory SQL cannot fall back to public or select an arbitrary schema',()=>{
 const sql="SELECT * FROM public.ceb_users WHERE EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public')";
 assert.equal(laboratorySql(sql,{}),sql);
 const result=laboratorySql(sql,{CEB_RUNTIME:'validation',CEB_DB_SCHEMA:LAB_SCHEMA});
 assert.doesNotMatch(result,/public/);assert.match(result,/ceb_lab_20261105/);
 for(const env of [{CEB_DB_SCHEMA:LAB_SCHEMA},{CEB_RUNTIME:'validation',CEB_DB_SCHEMA:'public'}])assert.throws(()=>laboratorySql(sql,env));
});
test('laboratory frontend routes use isolated assets and reject production',async()=>{
 let served='';const env={CEB_RUNTIME:'validation',ASSETS:{fetch:async r=>{served=new URL(r.url).pathname;return new Response('test frontend')}}};
 const base='https://ceb-biblioteca-api-validacao.wllmslv10.workers.dev';
 assert.equal((await validation.fetch(new Request(base+'/'),env)).status,302);
 assert.equal(await (await validation.fetch(new Request(base+'/central-estudos-biblicos-v2/assets/test.js'),env)).text(),'test frontend');
 assert.equal(served,'/assets/test.js');
 assert.equal((await validation.fetch(new Request('https://ceb-biblioteca-api.wllmslv10.workers.dev/central-estudos-biblicos-v2/'),env)).status,503);
});
test('same-origin CORS exception is exclusive to the validation host and runtime',async()=>{
 const lab='https://ceb-biblioteca-api-validacao.wllmslv10.workers.dev';
 for(const [host,env,status] of [[lab,{CEB_RUNTIME:'validation'},204],[lab,{},403],['https://evil.test',{CEB_RUNTIME:'validation'},403]]){
 const response=await worker.fetch(new Request(host+'/auth/login',{method:'OPTIONS',headers:{Origin:host}}),env);assert.equal(response.status,status);
 }
});
test('unreviewed legacy shares cannot leak arbitrary teacher prose',()=>{
 const source={title:'Legado',content:{introduction:'SECRET-UNLABELED',conclusion:'SECRET-ANSWER',sharing:{enabled:true},originalBundle:{description:'SECRET-DESCRIPTION',files:[]}}};
 const before=structuredClone(source);const projected=studentStudy(source);
 assert.doesNotMatch(JSON.stringify(projected),/SECRET/);assert.match(projected.content.introduction,/revisão/);assert.deepEqual(source,before);
});
test('all validation object operations stay under a dedicated prefix',async()=>{
 const requests=[];
 const store=neonObjectStore({CEB_RUNTIME:'validation',CEB_STORAGE_ENDPOINT:NEON_FILES_ENDPOINT,CEB_STORAGE_ACCESS_KEY_ID:'technical',CEB_STORAGE_SECRET_ACCESS_KEY:'technical'},async r=>{requests.push(r.url);return new Response('ok')});
 const key='materials/10000000-0000-4000-8000-000000000001/20000000-0000-4000-8000-000000000001/original';
 await store.put(key,new Uint8Array([1]));await store.get(key);await store.remove(key);
 assert.equal(requests.length,3);assert.ok(requests.every(url=>new URL(url).pathname.startsWith('/ceb-materiais/validation-20261105/materials/')));
});
