// New runner only, in-process Worker route, fake users and Storage. No remote I/O.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
import {uploadProbe} from '../api-worker/upload-probe.js';
const fixtures=JSON.parse(await readFile('src/uploadProbeFixtures.json','utf8'));
const source=(await readFile('src/uploadProbeRunner.ts','utf8')).replace("import fixtures from './uploadProbeFixtures.json'",'const fixtures = '+JSON.stringify(fixtures));
const js=stripTypeScriptTypes(source);
const {runUploadProbe}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const run='8b286c61-f0e5-4ea2-a79c-974d4a041580',now=Date.now();
const env={CEB_UPLOADS_ENABLED:'false',CEB_UPLOAD_PROBE:JSON.stringify({run,start:new Date(now-1000).toISOString(),end:new Date(now+600000).toISOString()})};
for(const mode of ['student','expired','failure','success']){
 let puts=0,calls=0;const objects=new Map(),messages=[];
 const store=()=>({putIfAbsent:async(k,b)=>{if(mode==='failure')throw Error('fake');if(objects.has(k))return false;objects.set(k,b);return true},get:async k=>new Response(objects.get(k))});
 const transport=async(input,init)=>{
 const url=new URL(input);calls++;assert.equal(url.origin,'https://ceb-biblioteca-api.wllmslv10.workers.dev');assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');
 if(url.pathname==='/auth/me')return Response.json({user:{role:mode==='student'?'user':'admin',must_change_password:false}});
 assert.ok(url.pathname.startsWith('/library/_upload-probe'));
 if(!init.headers.Authorization)return Response.json({error:'no session'},{status:401});
 const body=init.body;if(init.method==='PUT')puts++;
 return uploadProbe(new Request(input,{...init,...(body?{headers:{...init.headers,'Content-Length':String(body.length)}}:{})}),mode==='expired'?{...env,CEB_UPLOAD_PROBE:undefined}:env,url,{app_role:'admin'},(b,s=200)=>Response.json(b,{status:s}),'https://wllmslv10.github.io',store);
 };
 assert.equal(await runUploadProbe('LOCAL_TEST_TOKEN',m=>messages.push(m),transport),mode==='success');
 assert.equal(puts,mode==='success'?8:mode==='failure'?1:0);
 if(mode==='student')assert.equal(calls,1);
 if(mode==='success'){assert.equal(objects.size,4);assert.equal(messages.filter(m=>m.includes('aprovados')).length,4)}
 assert.ok(!messages.join().includes('LOCAL_TEST_TOKEN'));
 console.log('PASS runner '+mode);
}
// New route additions: discovery and CORS, without repeating previous tests.
const user={app_role:'admin'},root='/library/_upload-probe',json=(b,s=200)=>Response.json(b,{status:s});
const status=await uploadProbe(new Request('https://x'+root),env,new URL('https://x'+root),user,json,'https://wllmslv10.github.io');assert.equal(status.status,200);
for(const origin of ['https://wllmslv10.github.io','https://untrusted.invalid']){
const path=root+'/'+run+'/pdf';const response=await uploadProbe(new Request('https://x'+path),env,new URL('https://x'+path),user,json,origin,()=>({get:async()=>new Response('fixture')}));
assert.equal(response.headers.get('Access-Control-Allow-Origin'),origin==='https://wllmslv10.github.io'?origin:null);
}
console.log('PASS new discovery and download CORS');
