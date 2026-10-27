import test from 'node:test';
import assert from 'node:assert/strict';
import { neonObjectStore, neonStorageReady, NEON_FILES_ENDPOINT } from '../neon-storage.js';
import { storageReady, objectStore } from '../storage.js';
const key='materials/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000004/original';
// Synthetic signing values used only in tests; never real credentials.
const env={CEB_STORAGE_PROVIDER:'neon',CEB_STORAGE_ENDPOINT:NEON_FILES_ENDPOINT,CEB_STORAGE_ACCESS_KEY_ID:'synthetic-key',CEB_STORAGE_SECRET_ACCESS_KEY:'synthetic-secret'};
test('Neon exige configuração completa no backend',()=>{
 assert.equal(neonStorageReady(env),true);
 for(const field of ['CEB_STORAGE_ACCESS_KEY_ID','CEB_STORAGE_SECRET_ACCESS_KEY','CEB_STORAGE_ENDPOINT']){
  const invalid={...env,[field]:''};assert.equal(neonStorageReady(invalid),false);assert.throws(()=>neonObjectStore(invalid),/STORAGE_NOT_CONFIGURED/);
 }
});
test('Neon recusa endpoint de outro projeto ou do banco atual',()=>{
 for(const endpoint of ['https://br-crimson-flower-b4m0g7mh.storage.c-6.us-east-2.aws.neon.tech','https://example.test',NEON_FILES_ENDPOINT+'/other']){
  assert.equal(neonStorageReady({...env,CEB_STORAGE_ENDPOINT:endpoint}),false);
 }
});
test('binding R2 não serve como fallback quando Neon está indisponível',()=>{
 const invalid={CEB_STORAGE_PROVIDER:'neon',CEB_MATERIAIS:{put(){},get(){},delete(){}}};
 assert.equal(storageReady(invalid),false);assert.throws(()=>objectStore(invalid),/STORAGE_NOT_CONFIGURED/);
});
test('upload assinado aponta apenas para projeto isolado e bucket fixo',async()=>{
 let seen;
 const storage=neonObjectStore(env,async request=>{seen=request;return new Response(null,{status:200});});
 const bytes=new Uint8Array([0,255,13,10]);await storage.put(key,bytes);
 assert.equal(seen.method,'PUT');assert.equal(seen.url,`${NEON_FILES_ENDPOINT}/ceb-materiais/${key}`);
 assert.match(seen.headers.get('Authorization'),/^AWS4-HMAC-SHA256 /);
 assert.deepEqual(new Uint8Array(await seen.arrayBuffer()),bytes);
});
test('caminhos arbitrários são recusados antes do acesso à rede',async()=>{
 let called=false;const storage=neonObjectStore(env,async()=>{called=true;return new Response();});
 for(const bad of ['../other','another-bucket/path','https://example.test/file'])await assert.rejects(storage.put(bad,new Uint8Array([1])),/INVALID_STORAGE_KEY/);
 assert.equal(called,false);
});
test('falha HTTP de upload não é confirmada como sucesso',async()=>{
 const storage=neonObjectStore(env,async()=>new Response(null,{status:403}));
 await assert.rejects(storage.put(key,new Uint8Array([1])),/STORAGE_UPLOAD_FAILED/);
});
test('download entrega os bytes e recusa objeto indisponível',async()=>{
 const bytes=new Uint8Array([0,255,200]);
 const storage=neonObjectStore(env,async request=>{assert.equal(request.method,'GET');return new Response(bytes);});
 assert.deepEqual(new Uint8Array(await (await storage.get(key)).arrayBuffer()),bytes);
 await assert.rejects(neonObjectStore(env,async()=>new Response(null,{status:404})).get(key),/STORAGE_DOWNLOAD_FAILED/);
});
test('compensação aceita objeto já ausente e propaga falhas de exclusão',async()=>{
 await neonObjectStore(env,async request=>{assert.equal(request.method,'DELETE');return new Response(null,{status:404});}).remove(key);
 await assert.rejects(neonObjectStore(env,async()=>new Response(null,{status:403})).remove(key),/STORAGE_DELETE_FAILED/);
});
