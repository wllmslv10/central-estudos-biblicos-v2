import test from 'node:test';
import assert from 'node:assert/strict';
import { materialRoute, canAccessMaterial, validateOriginal, validApplicationDate } from '../materials.js';
import worker from '../worker.js';
import pg from 'pg';
const user={id:'00000000-0000-4000-8000-000000000001',app_role:'admin'};
const other='00000000-0000-4000-8000-000000000002';
const id='00000000-0000-4000-8000-000000000003';
const env={CEB_STORAGE_ENDPOINT:'https://branch.storage.neon.tech',CEB_STORAGE_ACCESS_KEY_ID:'test',CEB_STORAGE_SECRET_ACCESS_KEY:'test'};
const json=(body,status=200)=>Response.json(body,{status});
const invoke=(request,client,store)=>materialRoute(request,env,new URL(request.url),client,user,json,'https://wllmslv10.github.io',()=>store);
const pdf=()=>new File(['%PDF-1.7\nhello'], 'test.pdf', {type:'application/pdf'});
function uploadRequest(){const form=new FormData();form.set('file',pdf());form.set('metadata',JSON.stringify({title:'Teste',kind:'estudo',text:'Conteúdo',scope:'private'}));return new Request('https://api.test/library/materials',{method:'POST',body:form});}

test('materiais particulares de outra pessoa não são acessíveis nem ao admin',()=>{
 assert.equal(canAccessMaterial(user,{owner_user_id:other,scope:'private'}),false);
 assert.equal(canAccessMaterial(user,{owner_user_id:other,scope:'general'}),true);
 assert.equal(canAccessMaterial({...user,app_role:'user'},{owner_user_id:other,scope:'general'}),false);
});
test('datas reais, bissextos e formatos inválidos',()=>{
 assert.equal(validApplicationDate('2024-02-29'),true);
 for(const value of ['2026-02-29','2026-02-30','2026-13-01','26/10/2026']) assert.equal(validApplicationDate(value),false);
});
test('extensão e assinatura do original são verificadas',()=>{
 assert.equal(validateOriginal(pdf(),new TextEncoder().encode('%PDF-1.7')), 'application/pdf');
 assert.throws(()=>validateOriginal({name:'fake.pdf'},new TextEncoder().encode('<html>')));
 assert.throws(()=>validateOriginal({name:'virus.exe'},new Uint8Array([80,75,3,4])));
 assert.throws(()=>validateOriginal({name:'large.pdf'},new Uint8Array(20971521)));
});
test('sessão é obrigatória antes de consultar materiais ou iniciar upload',async()=>{
 const connect=pg.Client.prototype.connect,end=pg.Client.prototype.end;
 pg.Client.prototype.connect=async()=>{};pg.Client.prototype.end=async()=>{};
 try {
  for(const method of ['GET','POST']) {
   const r=await worker.fetch(new Request('https://api.test/library/materials',{method}),{HYPERDRIVE:{connectionString:'postgresql://test.invalid/db'}});
   assert.equal(r.status,401);
  }
 } finally {pg.Client.prototype.connect=connect;pg.Client.prototype.end=end;}
});
test('falha no upload não insere metadados nem retorna sucesso',async()=>{
 let writes=0;
 await assert.rejects(invoke(uploadRequest(),{query:async()=>{writes++;throw new Error('unexpected database write');}},{put:async()=>{throw new Error('Upload failed');}}),/Upload failed/);
 assert.equal(writes,0);
});
test('objeto recém-enviado é compensado quando insert falha e comprovadamente não existe registro',async()=>{
 let removed=0;
 const client={query:async sql=>{if(sql.startsWith('INSERT')) throw new Error('Database failed');if(sql==='SELECT id FROM public.ceb_materials WHERE id=$1') return {rowCount:0,rows:[]};throw new Error('Unexpected');}};
 await assert.rejects(invoke(uploadRequest(),client,{put:async()=>{},remove:async()=>{removed++;}}),/Database failed/);
 assert.equal(removed,1);
});
test('falha de leitura após commit nunca remove o original já registrado',async()=>{
 let removed=0;
 const client={query:async sql=>{if(sql.startsWith('INSERT')) return {rows:[{id}]};if(sql==='SELECT id FROM public.ceb_materials WHERE id=$1')return {rowCount:1,rows:[{id}]};throw new Error('Read failed');}};
 await assert.rejects(invoke(uploadRequest(),client,{put:async()=>{},remove:async()=>{removed++;}}),/Read failed/);
 assert.equal(removed,0);
});
test('upload completo só confirma depois do original e do registro',async()=>{
 const events=[];
 const client={query:async(sql,params)=>{if(sql.startsWith('INSERT')){events.push('metadata');assert.equal(params[11],'private');return {rows:[{id}]};}events.push('read');return {rows:[{id,title:'Teste'}]};}};
 const response=await invoke(uploadRequest(),client,{put:async()=>{events.push('original');}});
 assert.equal(response.status,201);assert.deepEqual(events,['original','metadata','read']);
});
for(const method of ['DELETE','PATCH'])test(`outro administrador não muda um original particular: ${method}`,async()=>{
 let touched=false;
 const client={query:async sql=>{if(sql==='BEGIN'||sql==='ROLLBACK')return {};if(sql.startsWith('SELECT *'))return {rows:[{id,owner_user_id:other,scope:'private'}]};touched=true;throw new Error('Unexpected write');}};
 const r=await invoke(new Request(`https://api.test/library/materials/${id}`,{method}),client,{});
 assert.equal(r.status,404);assert.equal(touched,false);
});
test('exclusão é lógica e preserva o original para recuperação',async()=>{
 const queries=[];let removed=false;
 const client={query:async sql=>{queries.push(sql);return sql.startsWith('SELECT')?{rows:[{id,owner_user_id:user.id,scope:'private'}]}:{};}};
 const r=await invoke(new Request(`https://api.test/library/materials/${id}`,{method:'DELETE'}),client,{remove:async()=>{removed=true;}});
 assert.equal(r.status,200);assert.equal(removed,false);assert.ok(queries.some(q=>q.startsWith('UPDATE')&&q.includes('deleted_at')));
});
test('restauração mantém o original e remove apenas a marca de lixeira',async()=>{
 const queries=[];
 const client={query:async sql=>{queries.push(sql);return sql.startsWith('SELECT')?{rows:[{id,owner_user_id:user.id,scope:'private',deleted_at:'2026-10-26'}]}:{};}};
 const r=await invoke(new Request(`https://api.test/library/materials/${id}/restore`,{method:'POST'}),client,{});
 assert.equal(r.status,200);assert.ok(queries.some(q=>q.includes('SET deleted_at=NULL')));
});
test('HTML baixado é anexo e não executa no domínio da API',async()=>{
 const client={query:async sql=>sql.startsWith('SELECT')?{rows:[{id,owner_user_id:user.id,scope:'private',filename:"a'b.html",object_key:'test'}]}:{}};
 const r=await invoke(new Request(`https://api.test/library/materials/${id}/download`),client,{get:async()=>new Response('<script>bad()</script>')});
 assert.equal(r.status,200);assert.match(r.headers.get('Content-Disposition'),/^attachment/);assert.equal(r.headers.get('Content-Type'),'application/octet-stream');assert.match(r.headers.get('Content-Security-Policy'),/sandbox/);
});
