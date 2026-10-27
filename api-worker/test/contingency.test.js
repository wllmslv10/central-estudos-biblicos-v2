import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import worker from '../worker.js';
import { hashPassword } from '../auth.js';
import { materialRoute } from '../materials.js';
const id='00000000-0000-4000-8000-000000000001';
const env={CEB_WRITE_MODE:'read_only',CEB_UPLOADS_ENABLED:'true',HYPERDRIVE:{connectionString:'postgresql://test.invalid/db'}};
const req=(path,method='GET',body)=>new Request(`https://api.test${path}`,{method,headers:{Authorization:'Bearer technical',Origin:'https://wllmslv10.github.io','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
async function database(fn,query){const old={connect:pg.Client.prototype.connect,query:pg.Client.prototype.query,end:pg.Client.prototype.end};pg.Client.prototype.connect=async()=>{};pg.Client.prototype.end=async()=>{};pg.Client.prototype.query=query;try{await fn();}finally{Object.assign(pg.Client.prototype,old);}}
test('contingência bloqueia mutações antes de SQL e Storage, inclusive modo desconhecido',async()=>{
 let connections=0;const old=pg.Client.prototype.connect;pg.Client.prototype.connect=async()=>{connections++;throw Error('Must not connect');};
 try{for(const mode of ['read_only','typo'])for(const [method,path] of [
 ['POST','/studies'],['PUT',`/studies/${id}`],['PATCH',`/studies/${id}`],['DELETE',`/studies/${id}`],['POST',`/studies/${id}/restore`],
 ['POST','/library/materials'],['PATCH',`/library/materials/${id}`],['DELETE',`/library/materials/${id}`],['POST',`/library/materials/${id}/restore`],['POST','/library/folders'],
 ['POST','/admin/bootstrap'],['POST','/admin/users'],['PATCH',`/admin/users/${id}`],['DELETE',`/admin/users/${id}`],['POST',`/admin/users/${id}/reset-password`],['POST','/auth/change-password']]){
 const r=await worker.fetch(req(path,method),{...env,CEB_WRITE_MODE:mode});assert.equal(r.status,503,`${mode} ${method} ${path}`);assert.equal((await r.json()).code,'CEB_READ_ONLY');assert.equal(r.headers.get('Cache-Control'),'no-store');}
 assert.equal(connections,0);}finally{pg.Client.prototype.connect=old;}
});
test('contingência preserva autenticação, filtros da Lixeira e permissões, sem anunciar upload',async()=>{
 let authenticated=true;const queries=[];
 await database(async()=>{
 for(const path of ['/auth/me','/studies','/studies?trash=1','/library/materials','/library/folders'])assert.equal((await worker.fetch(req(path),env)).status,200,path);
 assert.equal((await(await worker.fetch(req('/library/capabilities'),env)).json()).uploads,false);
 assert.ok(queries.some(q=>q.includes('deleted_at IS NULL')));assert.ok(queries.some(q=>q.includes('deleted_at IS NOT NULL')));assert.ok(queries.some(q=>q.includes("NOT IN ('private','particular')")));
 assert.equal(queries.some(q=>/^(UPDATE|INSERT|DELETE)/.test(q.trim())),false);
 authenticated=false;for(const path of ['/studies','/library/materials'])assert.equal((await worker.fetch(req(path),env)).status,401);
 },async sql=>{queries.push(sql);if(sql.includes('FROM public.ceb_sessions'))return{rows:authenticated?[{id,app_role:'admin',must_change_password:false}]:[]};if(sql.includes('to_regclass'))return{rows:[{ready:true}]};return{rows:[]};});
});
test('contingência mantém login, limite de tentativas e revogação no logout',async()=>{
 const password_hash=await hashPassword('abc123');let attempts=0;const writes=[];
 await database(async()=>{
 assert.equal((await worker.fetch(req('/auth/login','POST',{username:'technical',password:'abc123'}),env)).status,200);
 attempts=8;assert.equal((await worker.fetch(req('/auth/login','POST',{username:'technical',password:'abc123'}),env)).status,429);
 assert.equal((await worker.fetch(req('/auth/logout','POST'),env)).status,200);
 assert.ok(writes.some(q=>q.includes('INSERT INTO public.ceb_sessions')));assert.ok(writes.some(q=>q.includes('revoked_at = NOW()')));assert.equal(writes.some(q=>/ceb_(studies|materials|folders)/.test(q)),false);
 },async sql=>{if(sql.includes('COUNT(*)'))return{rows:[{n:attempts}]};if(sql.includes('FROM public.ceb_users'))return{rows:[{id,username:'technical',password_hash,app_role:'admin',is_active:true}]};writes.push(sql);return{rows:[]};});
});
test('download em contingência mantém bytes e bloqueia particular de terceiro sem gravar',async()=>{
 const bytes=new TextEncoder().encode('technical original');
 for(const permitted of [true,false]){const queries=[];let reads=0;
 const r=await materialRoute(req(`/library/materials/${id}/download`),env,new URL(`https://api.test/library/materials/${id}/download`),{query:async sql=>{queries.push(sql);return{rows:sql.startsWith('SELECT')?[{id,owner_user_id:permitted?id:'other',scope:'private',filename:'test.pdf',object_key:'technical'}]:[]};}},{id,app_role:'admin'},(body,status=200)=>Response.json(body,{status}),'https://wllmslv10.github.io',()=>({get:async()=>{reads++;return new Response(bytes);}}));
 assert.equal(r.status,permitted?200:404);assert.equal(reads,permitted?1:0);if(permitted)assert.deepEqual(new Uint8Array(await r.arrayBuffer()),bytes);assert.equal(queries.some(q=>/^(UPDATE|INSERT|DELETE)/.test(q)),false);
 }
});

test('configuração de contingência conserva Worker, Hyperdrive e storage, com importação bloqueada',async()=>{
 const {readFile}=await import('node:fs/promises');
 const normal=await readFile(new URL('../wrangler.toml',import.meta.url),'utf8');
 const contingency=await readFile(new URL('../wrangler.contingency.toml',import.meta.url),'utf8');
 const normalize=s=>s.split('\n').filter(line=>!line.startsWith('#')).join('\n').replace('CEB_WRITE_MODE = "read_only"','CEB_WRITE_MODE = "normal"');
 assert.equal(normalize(contingency),normalize(normal));
 assert.match(contingency,/CEB_UPLOADS_ENABLED = "false"/);
 assert.match(contingency,/main = "worker.js"/);
});
