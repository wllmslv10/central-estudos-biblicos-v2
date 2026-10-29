import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import {uploadProbe} from '../upload-probe.js';
import {neonObjectStore,NEON_FILES_ENDPOINT} from '../neon-storage.js';
if(!globalThis.crypto) globalThis.crypto=webcrypto;
const files=JSON.parse(await readFile(new URL('../upload-probe-manifest.json',import.meta.url)));
const run='8b286c61-f0e5-4ea2-a79c-974d4a041580',now=Date.now(),root='/library/_upload-probe/'+run;
const env={CEB_UPLOADS_ENABLED:'false',CEB_UPLOAD_PROBE:JSON.stringify({run,start:new Date(now-1000).toISOString(),end:new Date(now+60000).toISOString()})};
const admin={app_role:'admin'},json=(b,s=200)=>Response.json(b,{status:s});
let calls=0;const objects=new Map(),factory=()=>({putIfAbsent:async(k,b)=>{calls++;if(objects.has(k))return false;objects.set(k,b);return true},get:async(k)=>{calls++;return new Response(objects.get(k))}});
const invoke=(method,path=root,user=admin,e=env,bytes,headers={})=>uploadProbe(new Request('https://example.test'+path,{method,...(bytes?{body:bytes,headers:{'Content-Length':String(bytes.length),...headers}}:{})}),e,new URL('https://example.test'+path),user,json,null,factory,now);
test('admin only, disabled by default, bounded expiry and global flag fail closed',async()=>{
 for(const user of [null,{app_role:'user'},{app_role:'teacher'},{...admin,must_change_password:true}]) assert.equal((await invoke('GET',root,user)).status,403);
 for(const e of [{}, {...env,CEB_UPLOADS_ENABLED:'true'},{...env,CEB_UPLOAD_PROBE:'broken'}, {...env,CEB_UPLOAD_PROBE:JSON.stringify({run,start:new Date(now-3600000).toISOString(),end:new Date(now+1000).toISOString()})},{...env,CEB_UPLOAD_PROBE:JSON.stringify({run,start:new Date(now-5000).toISOString(),end:new Date(now-1).toISOString()})}]) assert.equal((await invoke('GET',root,admin,e)).status,404);
 assert.equal(calls,0);
});
test('four originals roundtrip, duplicates and arbitrary bodies/destinations denied',async()=>{
 assert.equal((await invoke('GET')).status,200);
 for(const f of files){const bytes=await readFile(new URL('../../scripts/upload-probe/'+f.name,import.meta.url));
 assert.equal((await invoke('PUT',root+'/'+f.format,admin,env,bytes,{'Content-Length':'99999'})).status,400);
 const bad=Buffer.from(bytes);bad[0]^=1;assert.equal((await invoke('PUT',root+'/'+f.format,admin,env,bad)).status,400);
 assert.equal((await invoke('PUT',root+'/'+f.format,admin,env,bytes)).status,201);
 assert.equal((await invoke('PUT',root+'/'+f.format,admin,env,bytes)).status,409);
 assert.deepEqual(Buffer.from(await(await invoke('GET',root+'/'+f.format)).arrayBuffer()),bytes);
 assert.equal((await invoke('DELETE',root+'/'+f.format)).status,405);
 }
 assert.equal(objects.size,4);assert.equal((await invoke('PUT',root+'/other',admin,env,Buffer.from('x'))).status,404);
});
test('conditional write signs If-None-Match; conflict never overwrites',async()=>{
 const e={CEB_STORAGE_ENDPOINT:NEON_FILES_ENDPOINT,CEB_STORAGE_ACCESS_KEY_ID:'fake-test-key',CEB_STORAGE_SECRET_ACCESS_KEY:'fake-test-secret'};
 const store=neonObjectStore(e,async request=>{assert.equal(request.headers.get('If-None-Match'),'*');assert.match(request.headers.get('Authorization'),/SignedHeaders=.*if-none-match/);return new Response(null,{status:412})});
 assert.equal(await store.putIfAbsent('materials/'+run+'/'+files[0].id+'/original',new Uint8Array([1])),false);
});
