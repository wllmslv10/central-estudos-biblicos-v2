import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import worker from '../worker.js';
test('temporary-password administrator cannot use any authenticated admin route',async()=>{
 const old={connect:pg.Client.prototype.connect,query:pg.Client.prototype.query,end:pg.Client.prototype.end};
 const queries=[];pg.Client.prototype.connect=async()=>{};pg.Client.prototype.end=async()=>{};
 pg.Client.prototype.query=async sql=>{queries.push(sql);assert.match(sql,/FROM public.ceb_sessions/);return {rows:[{id:'10000000-0000-4000-8000-000000000001',app_role:'admin',must_change_password:true}]}};
 try{
  for(const [path,method] of [['/admin/users','GET'],['/admin/users','POST'],['/admin/users/10000000-0000-4000-8000-000000000002','PATCH'],['/admin/users/10000000-0000-4000-8000-000000000002','DELETE'],['/admin/users/10000000-0000-4000-8000-000000000002/reset-password','POST'],['/admin/students','GET'],['/admin/ai-usage','GET']]){
   const response=await worker.fetch(new Request('https://api.test'+path,{method,headers:{Authorization:'Bearer technical'}}),{HYPERDRIVE:{connectionString:'postgresql://never.invalid/test'}});
   assert.equal(response.status,403,path);assert.match((await response.json()).error,/Troque sua senha/);
  }
  assert.equal(queries.length,7);
 }finally{Object.assign(pg.Client.prototype,old)}
});
