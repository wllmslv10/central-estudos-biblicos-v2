import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import worker from '../worker.js';
const admin='10000000-0000-4000-8000-000000000001',student='10000000-0000-4000-8000-000000000002',id='20000000-0000-4000-8000-000000000001';
async function invoke({role='admin',path=`/studies/${id}/sharing`,method='PUT',body,found=true,valid=true,sharing}={}) {
 const original={connect:pg.Client.prototype.connect,query:pg.Client.prototype.query,end:pg.Client.prototype.end},queries=[];
 pg.Client.prototype.connect=async()=>{};pg.Client.prototype.end=async()=>{};
 pg.Client.prototype.query=async(sql,params=[])=>{
  queries.push({sql,params});
  if(sql.includes('FROM public.ceb_sessions'))return {rows:[{id:role==='admin'?admin:student,app_role:role,must_change_password:false}]};
  if(sql.includes('SELECT id FROM public.ceb_users'))return {rows:[],rowCount:valid?params[0].length:0};
  if(sql.includes('SELECT owner_user_id, content'))return {rows:[{owner_user_id:admin,content:{libraryScope:'general',sharing}}],rowCount:1};
  if(sql.includes('SELECT id, title, content'))return {rows:found?[{id,title:'Technical',content:{}}]:[]};
  if(sql.includes('jsonb_set'))return {rows:found?[{id,content:{sharing:JSON.parse(params[0])}}]:[],rowCount:found?1:0};
  if(sql.includes('UPDATE public.ceb_studies')||sql.includes('INSERT INTO public.ceb_studies'))return {rows:[{id,content:JSON.parse(params[sql.includes('UPDATE')?1:2])}],rowCount:1};
  throw new Error('Unexpected SQL');
 };
 try {const response=await worker.fetch(new Request('https://api.test'+path,{method,headers:{Authorization:'Bearer technical','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),{HYPERDRIVE:{connectionString:'postgresql://never-connect.invalid/test'}});return {status:response.status,payload:await response.json(),queries};}
 finally {Object.assign(pg.Client.prototype,original);}
}
const config={enabled:true,audience:'selected',userIds:[student],allowDownload:false};
for(const enabled of [true,false])test(`admin compartilha/revoga: enabled=${enabled}`,async()=>{const r=await invoke({body:{...config,enabled}});assert.equal(r.status,200);assert.equal(r.payload.study.content.sharing.enabled,enabled);const q=r.queries.find(q=>q.sql.includes('jsonb_set'));assert.match(q.sql,/deleted_at IS NULL AND owner_user_id = \$4/);assert.deepEqual(q.params.slice(2),[id,admin]);if(enabled)assert.match(r.queries.find(q=>q.sql.includes('SELECT id FROM public.ceb_users')).sql,/app_role = 'user' AND is_active = TRUE/);});
for(const body of [{...config,userIds:[]},{...config,userIds:['invalid']},{...config,allowDownload:'true'},{...config,audience:'invalid'}])test('configuração inválida não grava',async()=>{const r=await invoke({body});assert.equal(r.status,400);assert.equal(r.queries.some(q=>q.sql.startsWith('UPDATE')),false);});
test('aluno não compartilha com papel forjado',async()=>{assert.equal((await invoke({role:'user',body:{...config,app_role:'admin'}})).status,403);});
test('seleção inativa ou inválida rejeitada',async()=>{assert.equal((await invoke({body:config,valid:false})).status,400);});
test('material alheio/inexistente não compartilha',async()=>{assert.equal((await invoke({body:config,found:false})).status,404);});
test('criação ignora permissões embutidas',async()=>{const r=await invoke({path:'/studies',method:'POST',body:{title:'Technical',content:{sharing:config}}});assert.equal(r.status,201);assert.equal(r.payload.study.content.sharing,undefined);});
for(const sharing of [undefined,config])test('edição preserva permissões persistidas',async()=>{const r=await invoke({path:`/studies/${id}`,body:{title:'Technical',content:{sharing:{...config,audience:'all',allowDownload:true}}},sharing});assert.equal(r.status,200);assert.deepEqual(r.payload.study.content.sharing,sharing);assert.match(r.queries.find(q=>q.sql.includes('UPDATE public.ceb_studies')).sql,/jsonb_build_object/);});
for(const found of [true,false])test(`download revalida autorização: resultado=${found}`,async()=>{const r=await invoke({role:'user',path:`/studies/${id}/download`,method:'GET',found});assert.equal(r.status,found?200:404);if(!found)assert.equal(r.payload.study,undefined);const q=r.queries.find(q=>q.sql.includes('SELECT id, title, content'));for(const pattern of [/deleted_at IS NULL/,/status = 'published'/,/visibility = 'shared'/,/sharing'->>'enabled' = 'true'/,/sharing'->>'allowDownload' = 'true'/,/audience' = 'selected'/,/userIds' \? \(\$2::text\)/])assert.match(q.sql,pattern);assert.deepEqual(q.params,[id,student,false]);});
test('revogação funciona mesmo se alunos anteriores ficaram inativos',async()=>{const r=await invoke({body:{...config,enabled:false},valid:false});assert.equal(r.status,200);assert.equal(r.payload.study.content.sharing.enabled,false);});
