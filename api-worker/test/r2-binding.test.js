import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { objectStore, storageReady } from '../storage.js';
import { materialRoute } from '../materials.js';
const owner = { id:'00000000-0000-4000-8000-000000000001', app_role:'admin' };
const second = { id:'00000000-0000-4000-8000-000000000002', app_role:'admin' };
const student = { id:'00000000-0000-4000-8000-000000000003', app_role:'user' };
const json=(data,status=200)=>Response.json(data,{status});
const sampleKey='materials/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000004/original';
test('sem binding completo, upload continua indisponível',()=>{
 for(const env of [{},{CEB_MATERIAIS:{}},{CEB_MATERIAIS:{put(){},get(){}}}]) {
  assert.equal(storageReady(env),false);
  assert.throws(()=>objectStore(env),/STORAGE_NOT_CONFIGURED/);
 }
});
test('binding não aceita seleção de outro bucket ou caminho arbitrário',async()=>{
 let calls=0;
 const env={CEB_MATERIAIS:{put:async()=>{calls++;return {};},get:async()=>{calls++;return null;},delete:async()=>{calls++;}}};
 const store=objectStore(env);
 for(const key of ['../other/file','https://other.invalid/file','other-bucket/key','materials/../../private','']) {
  await assert.rejects(store.put(key,new Uint8Array([1])),/INVALID_STORAGE_KEY/);
  await assert.rejects(store.get(key),/INVALID_STORAGE_KEY/);
  await assert.rejects(store.remove(key),/INVALID_STORAGE_KEY/);
 }
 assert.equal(calls,0);
});
test('falha do R2 não é confirmada como upload concluído',async()=>{
 const store=objectStore({CEB_MATERIAIS:{put:async()=>null,get:async()=>null,delete:async()=>{}}});
 await assert.rejects(store.put(sampleKey,new Uint8Array([1])),/STORAGE_UPLOAD_FAILED/);
 await assert.rejects(store.get(sampleKey),/STORAGE_DOWNLOAD_FAILED/);
});
test('R2 local: upload, bytes, permissões, Lixeira e restauração',async t=>{
 // Entire R2 runtime is ephemeral/local. No remote binding or cloud credentials.
 const mf=new Miniflare(convertV4MiniflareOptions({modules:true,script:'export default {fetch(){ return new Response("local-test"); }}',compatibilityDate:'2026-10-24',r2Buckets:{CEB_MATERIAIS:'ceb-materiais-tests'}}));
 try {
  const bucket=await mf.getR2Bucket('CEB_MATERIAIS');
  const env={CEB_MATERIAIS:bucket};
  assert.equal(storageReady(env),true);
  const samples=JSON.parse(await readFile(new URL('./original-samples.json',import.meta.url),'utf8'));
  const records=new Map();
  const client={query:async(sql,p=[])=>{
   if(['BEGIN','COMMIT','ROLLBACK'].includes(sql)) return {};
   if(sql.startsWith('INSERT INTO public.ceb_materials')) {
    const row={id:p[0],owner_user_id:p[1],title:p[3],filename:p[4],mime_type:p[5],byte_size:p[6],object_key:p[7],sha256:p[8],extracted_text:p[9],kind:p[10],scope:p[11],deleted_at:null};
    records.set(row.id,row);return {rows:[{id:row.id}],rowCount:1};
   }
   const row=records.get(p[0]);
   if(sql.startsWith('SELECT')) return {rows:row?[{...row}]:[],rowCount:row?1:0};
   if(sql.startsWith('UPDATE public.ceb_materials SET deleted_at=COALESCE')) {row.deleted_at=new Date().toISOString();return {rowCount:1};}
   if(sql.startsWith('UPDATE public.ceb_materials SET deleted_at=NULL')) {row.deleted_at=null;return {rowCount:1};}
   throw new Error('Unexpected SQL in local integration');
  }};
  const route=(request,user=owner)=>materialRoute(request,env,new URL(request.url),client,user,json,'https://wllmslv10.github.io');
  for(const [extension,encoded] of Object.entries(samples)) await t.test(`original .${extension}`,async()=>{
   const bytes=new Uint8Array(Buffer.from(encoded,'base64'));
   const form=new FormData();form.set('file',new File([bytes],`original.${extension}`));form.set('metadata',JSON.stringify({title:`Amostra ${extension}`,text:'Conteúdo de teste',kind:'estudo',scope:'private'}));
   const upload=await route(new Request('https://api.test/library/materials',{method:'POST',body:form}));
   assert.equal(upload.status,201);
   const {material}=await upload.json();const row=records.get(material.id);
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
   assert.equal(row.sha256,digest);
   const original=()=>route(new Request(`https://api.test/library/materials/${row.id}/download`));
   const downloaded=await original();assert.equal(downloaded.status,200);assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()),bytes);
   for(const unauthorized of [second,student]) {
    const denied=await route(new Request(`https://api.test/library/materials/${row.id}/download`),unauthorized);assert.equal(denied.status,404);
   }
   const trashed=await route(new Request(`https://api.test/library/materials/${row.id}`,{method:'DELETE'}));assert.equal(trashed.status,200);
   assert.notEqual((await original()).status,200);
   assert.ok(await bucket.head(row.object_key),'Original preserved in R2 while in trash');
   const restored=await route(new Request(`https://api.test/library/materials/${row.id}/restore`,{method:'POST'}));assert.equal(restored.status,200);
   const recovered=await original();assert.equal(recovered.status,200);assert.deepEqual(new Uint8Array(await recovered.arrayBuffer()),bytes);
   // Test-only cleanup, in ephemeral local runtime. No user originals are touched.
   await objectStore(env).remove(row.object_key);assert.equal(await bucket.head(row.object_key),null);
  });
  await t.test('material geral acessível a outro admin, negado ao aluno',async()=>{
   const form=new FormData();form.set('file',new File([Buffer.from(samples.pdf,'base64')],'geral.pdf'));form.set('metadata',JSON.stringify({title:'Geral',text:'Teste',kind:'estudo',scope:'general'}));
   const uploaded=await route(new Request('https://api.test/library/materials',{method:'POST',body:form}));const {material}=await uploaded.json();
   for(const [user,status] of [[second,200],[student,404]]) {
    const r=await route(new Request(`https://api.test/library/materials/${material.id}/download`),user);assert.equal(r.status,status);await r.arrayBuffer();
   }
  });
 } finally {await mf.dispose();}
});
