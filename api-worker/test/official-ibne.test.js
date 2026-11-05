import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../official-worker.js';
import api from '../worker.js';
import {neonStorageReady,neonObjectStore,IBNE_FILES_ENDPOINT,NEON_FILES_ENDPOINT} from '../neon-storage.js';
test('official host redirects to complete application and forwards static assets',async()=>{
 const env={CEB_RUNTIME:'official-ibne',ASSETS:{fetch:r=>new Response(new URL(r.url).pathname)}};
 assert.equal((await worker.fetch(new Request('https://ceb.ibne.workers.dev/'),env)).headers.get('Location'),'https://ceb.ibne.workers.dev/central-estudos-biblicos-v2/');
 assert.equal(await (await worker.fetch(new Request('https://ceb.ibne.workers.dev/central-estudos-biblicos-v2/sw.js'),env)).text(),'/sw.js');
 assert.equal((await worker.fetch(new Request('https://other.invalid/'),env)).status,503);
 const redirectEnv={...env,ASSETS:{fetch:()=>new Response(null,{status:307,headers:{Location:'/instalar'}})}};
 assert.equal((await worker.fetch(new Request('https://ceb.ibne.workers.dev/central-estudos-biblicos-v2/instalar.html'),redirectEnv)).headers.get('Location'),'https://ceb.ibne.workers.dev/central-estudos-biblicos-v2/instalar');
});
test('official origin is accepted only in official runtime',async()=>{
 const r=()=>new Request('https://ceb.ibne.workers.dev/health',{method:'OPTIONS',headers:{Origin:'https://ceb.ibne.workers.dev'}});
 assert.equal((await api.fetch(r(),{CEB_RUNTIME:'official-ibne'})).status,204);
 assert.equal((await api.fetch(r(),{CEB_RUNTIME:'validation'})).status,403);
});
test('official storage cannot use old endpoint and preserves bytes',async()=>{
 const env={CEB_RUNTIME:'official-ibne',CEB_STORAGE_ENDPOINT:IBNE_FILES_ENDPOINT,CEB_STORAGE_ACCESS_KEY_ID:'test',CEB_STORAGE_SECRET_ACCESS_KEY:'test'};
 assert.equal(neonStorageReady(env),true);
 assert.equal(neonStorageReady({...env,CEB_STORAGE_ENDPOINT:NEON_FILES_ENDPOINT}),false);
 await neonObjectStore(env,async r=>{assert.equal(new URL(r.url).origin,IBNE_FILES_ENDPOINT);assert.equal(await r.text(),'original bytes');return new Response('',{status:200});}).put('materials/00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002/original','original bytes');
});
