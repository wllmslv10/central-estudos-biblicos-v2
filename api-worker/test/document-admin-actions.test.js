import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import worker from '../worker.js';
const ownerId='10000000-0000-4000-8000-000000000001',otherId='10000000-0000-4000-8000-000000000002',id='20000000-0000-4000-8000-000000000001';
// Direct real Worker handler calls; all database/storage operations are doubles. No network.
async function invoke({family='studies',role='admin',owner=true,scope='private',action='trash',authenticated=true,passwordChange=false,body,forged=false}={}){
 const original={connect:pg.Client.prototype.connect,query:pg.Client.prototype.query,end:pg.Client.prototype.end};const queries=[];let gets=0,removes=0;
 const user={id:owner?ownerId:otherId,app_role:role,must_change_password:passwordChange};
 const row={id,owner_user_id:ownerId,content:{libraryScope:scope},scope,object_key:`materials/${ownerId}/${id}/original`,filename:'technical.pdf',deleted_at:action==='restore'?'2026-10-27T00:00:00Z':null};
 pg.Client.prototype.connect=async()=>{};pg.Client.prototype.end=async()=>{};
 pg.Client.prototype.query=async(sql,params=[])=>{queries.push({sql,params});
  if(sql.includes('FROM public.ceb_sessions'))return {rows:authenticated?[user]:[]};
  if(sql.includes('SELECT owner_user_id, content')||sql.startsWith('SELECT * FROM public.ceb_materials'))return {rows:[row],rowCount:1};
  if(['BEGIN','COMMIT','ROLLBACK'].includes(sql))return {};
  if(sql.startsWith('SELECT')&&/FROM public.ceb_(studies|materials)/.test(sql))return {rows:[],rowCount:0};
  if(sql.startsWith('UPDATE'))return {rows:[{id}],rowCount:1};
  throw new Error('Unexpected SQL in isolated test: '+sql);
 };
 try{
  const path=action==='list'?`/${family}`:action==='list-trash'?`/${family}?trash=1`:`/${family}/${id}${action==='restore'?'/restore':action==='download'?'/download':''}`;
  const method=action==='trash'?'DELETE':action==='restore'?'POST':action==='apply'?'PATCH':action==='edit'?'PUT':'GET';
  const payload=body||(action==='apply'?{applied:true,applied_date:'2026-10-27'}:action==='edit'?{title:'Technical',content:{libraryScope:scope}}:undefined);
  const response=await worker.fetch(new Request('https://api.test'+path,{method,headers:{Authorization:'Bearer mock-test-session',Origin:'https://wllmslv10.github.io','Content-Type':'application/json',...(forged?{'X-Role':'admin','X-User-Role':'admin'}:{})},...(payload?{body:JSON.stringify(payload)}:{})}),{
   HYPERDRIVE:{connectionString:'postgresql://technical.invalid/test'},CEB_STORAGE_PROVIDER:'r2',CEB_UPLOADS_ENABLED:'false',CEB_MATERIAIS:{get:async()=>{gets++;return {body:new TextEncoder().encode('%PDF-technical-original')};},delete:async()=>{removes++;},put:async()=>{throw new Error('Unexpected upload');}},
  });return {status:response.status,text:await response.text(),queries,gets,removes};
 }finally{Object.assign(pg.Client.prototype,original);}
}
for(const family of ['studies','library/materials'])for(const action of ['trash','restore']){
 for(const owner of [true,false])for(const scope of ['private','general'])test(`${family} ${action}: aluno ${owner?'proprietário':'terceiro'} ${scope}: 403 sem mutação`,async()=>{
  const r=await invoke({family,action,role:'user',owner,scope});assert.equal(r.status,403);assert.equal(r.queries.some(q=>/^(UPDATE|INSERT|DELETE|BEGIN)/.test(q.sql)),false);assert.equal(r.gets+r.removes,0);
 });
 for(const [owner,scope,allowed]of [[true,'private',true],[true,'general',true],[false,'general',true],[false,'private',false]])test(`${family} ${action}: admin ${owner?'proprietário':'terceiro'} ${scope}`,async()=>{
  const r=await invoke({family,action,owner,scope});assert.equal(r.status,allowed?200:family==='studies'?403:404);const writes=r.queries.filter(q=>/^UPDATE/.test(q.sql));assert.equal(writes.length,allowed?1:0);if(allowed){assert.match(writes[0].sql,/deleted_at/);assert.doesNotMatch(writes[0].sql,/SET\s+(content|scope|owner_user_id)/i);}assert.equal(r.removes,0);assert.equal(r.queries.some(q=>/^DELETE FROM/.test(q.sql)),false);
 });
 for(const passwordChange of [false,true])test(`${family} ${action}: ${passwordChange?'senha pendente':'sessão inválida'} bloqueada`,async()=>{
  const r=await invoke({family,action,authenticated:passwordChange,passwordChange});assert.equal(r.status,passwordChange?403:401);assert.equal(r.queries.some(q=>/^(UPDATE|INSERT|DELETE|BEGIN)/.test(q.sql)),false);
 });
 test(`${family} ${action}: corpo/cabeçalhos não promovem aluno`,async()=>{const r=await invoke({family,action,role:'user',forged:true,body:{role:'admin',app_role:'admin',owner_user_id:otherId}});assert.equal(r.status,403);assert.equal(r.queries.some(q=>/^UPDATE/.test(q.sql)),false);});
}
for(const family of ['studies','library/materials'])for(const role of ['admin','user'])for(const action of ['list','list-trash','apply'])test(`${family} ${action}: acesso legítimo ${role} preservado`,async()=>{
 const r=await invoke({family,role,action});assert.equal(r.status,200);
 if(action==='apply')assert.equal(r.queries.filter(q=>/^UPDATE/.test(q.sql)).length,1);
 else{assert.equal(r.queries.some(q=>/^UPDATE/.test(q.sql)),false);const q=r.queries.find(q=>q.sql.includes(family==='studies'?'FROM public.ceb_studies':'FROM public.ceb_materials'));assert.deepEqual(q.params,[ownerId,role==='admin']);assert.match(q.sql,action==='list-trash'?/deleted_at IS NOT NULL/:/deleted_at IS NULL/);}
});
for(const role of ['admin','user'])test(`download legítimo ${role} mantém bytes`,async()=>{const r=await invoke({family:'library/materials',role,action:'download'});assert.equal(r.status,200);assert.equal(r.text,'%PDF-technical-original');assert.equal(r.gets,1);assert.equal(r.removes,0);});
test('aluno não baixa particular de terceiro',async()=>{const r=await invoke({family:'library/materials',role:'user',owner:false,action:'download'});assert.equal(r.status,404);assert.equal(r.gets,0);});
test('edição própria de aluno não é bloqueada por esta correção mínima',async()=>{const r=await invoke({role:'user',action:'edit'});assert.equal(r.status,200);});
