// Only the new temporary panel. Fake account/storage, no production calls.
import assert from 'node:assert/strict';
import {readFile,writeFile,rm} from 'node:fs/promises';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {uploadProbe} from '../api-worker/upload-probe.js';
const entry='ceb-probe-validation.tsx',html='ceb-probe-validation.html';let vite,browser,htmlCreated=false,entryCreated=false;
const run='8b286c61-f0e5-4ea2-a79c-974d4a041580',now=Date.now();
const env={CEB_UPLOADS_ENABLED:'false',CEB_UPLOAD_PROBE:JSON.stringify({run,start:new Date(now-1000).toISOString(),end:new Date(now+600000).toISOString()})};
let mode='success',puts=0;const objects=new Map();
const store=()=>({putIfAbsent:async(k,b)=>{if(mode==='failure')throw Error('fake');if(objects.has(k))return false;objects.set(k,b);return true},get:async k=>new Response(objects.get(k))});
try{
 await writeFile(html,'<div id="root"></div><script type="module" src="/'+entry+'"></script>',{flag:'wx'});htmlCreated=true;
 await writeFile(entry,"import React from 'react';import{createRoot}from'react-dom/client';import Admin from './src/CebAdmin';createRoot(document.getElementById('root')!).render(<Admin token='LOCAL_TEST_TOKEN' ownId='local-test-admin'/>);",{flag:'wx'});entryCreated=true;
 vite=await createServer({server:{host:'127.0.0.1',port:0}});await vite.listen();
 browser=await chromium.launch({headless:true});const page=await browser.newPage();
 await page.route('https://ceb-biblioteca-api.wllmslv10.workers.dev/**',async route=>{
 const req=route.request(),url=new URL(req.url());
 if(url.pathname==='/admin/users') return route.fulfill({json:{users:[]}});
 if(url.pathname==='/auth/me') return route.fulfill({json:{user:{role:mode==='student'?'user':'admin',must_change_password:false}}});
 assert.ok(url.pathname.startsWith('/library/_upload-probe'));
 const headers=await req.allHeaders();const authorized=headers.authorization==='Bearer LOCAL_TEST_TOKEN';
 if(!authorized) return route.fulfill({status:401,json:{error:'unauthorized'}});
 const bytes=req.postDataBuffer();if(req.method()==='PUT')puts++;
 const response=await uploadProbe(new Request(req.url(),{method:req.method(),headers,...(bytes?{body:bytes}:{})}),mode==='expired'?{...env,CEB_UPLOAD_PROBE:undefined}:env,url,{app_role:'admin'},(b,s=200)=>Response.json(b,{status:s}),'https://wllmslv10.github.io',store);
 await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
 });
 const open=async()=>{await page.goto(vite.resolvedUrls.local[0]+html);await page.getByRole('button',{name:'🧪 Teste administrativo temporário de importação'}).click()};
 for(const scenario of ['student','expired','failure','success']){
 mode=scenario;puts=0;objects.clear();await open();
 await page.getByRole('button',{name:'Executar teste dos quatro arquivos',exact:true}).click();
 if(scenario==='success') {await page.getByText('Teste concluído.',{exact:false}).waitFor();assert.equal(puts,8);assert.equal(objects.size,4)}
 else {await page.getByText('Teste interrompido na etapa:',{exact:false}).waitFor();assert.equal(puts,scenario==='failure'?1:0)}
 assert.equal(await page.getByRole('button',{name:'Execução encerrada',exact:true}).isEnabled(),false);
 assert.equal(await page.getByRole('textbox').count(),0);
 assert.equal(await page.getByRole('status').innerText().then(t=>t.includes('LOCAL_TEST_TOKEN')),false);
 }
 const app=await readFile('src/App.tsx','utf8');assert.match(app,/user.role === 'admin'\s*\? adminOpen \? <CebAdmin/);
 console.log('PASS: painel real; perfil não admin, janela fechada, falha e sucesso; quatro hashes; sobrescrita/anônimo; bloqueio de nova execução; sem senha/token na tela; montagem exclusiva na Administração.');
}finally{await browser?.close();await vite?.close();if(entryCreated)await rm(entry,{force:true});if(htmlCreated)await rm(html,{force:true});}
