import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
const vite=await createServer({server:{host:'127.0.0.1',port:0}});
await vite.listen();
let browser;
try {
 browser=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
 const base=vite.resolvedUrls.local[0];
 const context=await browser.newContext({acceptDownloads:true,serviceWorkers:'block'});
 const studies=[];
 let role='admin', uploads=0;
 await context.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url()),path=u.pathname;
  if(u.origin===new URL(base).origin) return route.continue();
  if(!u.hostname.endsWith('workers.dev')) return route.abort();
  if(path==='/auth/login'||path==='/auth/me') return route.fulfill({json:{user:{id:'test',role,username:role,display_name:'Conta técnica',must_change_password:false},access_token:'test',expires_at:'2099-01-01T00:00:00Z'}});
  if(path==='/library/materials'&&req.method()==='POST'){
   assert.match(req.postDataBuffer().toString('utf8'), /private/);
   return route.fulfill({json:{material:{id:'file-'+(++uploads),filename:'fixture.html',mime_type:'text/html',byte_size:100}}});
  }
  if(path==='/studies'&&req.method()==='POST'){
   const body=req.postDataJSON();console.log('POST /studies',body.content.readyMaterialArea);assert.equal(body.status,'published');assert.equal(body.content.libraryScope,'private');assert.ok(body.content.originalBundle.files.every(f=>f.audience==='teacher'));
   const study={...body,id:'study-'+studies.length,visibility:'private',owner_user_id:'test',created_at:'2026-11-12',updated_at:'2026-11-12'};
   studies.push(study);return route.fulfill({json:{study}});
  }
  return route.fulfill({json:{uploads:true,materials:[],studies,folders:[],students:[],quizzes:[],ok:true}});
 });
 const page=await context.newPage();
 page.on('pageerror',e=>console.error(e.message));
 await page.goto(base);
 async function login(page){
  await page.getByLabel('Usuário',{exact:true}).fill(role);
  await page.getByLabel('Senha',{exact:true}).fill('technical');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.locator('.ceb-session-strip').waitFor();
 }
 await login(page);
 const download=page.waitForEvent('download');
 await page.getByRole('link',{name:/Baixar Gerador IBNE/}).click();
 assert.deepEqual(await readFile(await (await download).path()),await readFile('public/gerador-ibne/Gerador_IBNE_Questionario_Corrigido.zip'));
 for(const area of ['ebd','sermon']){
  const popup=page.waitForEvent('popup');
  await page.getByRole('button',{name:/Abrir Gerador IBNE/}).click();
  const gerador=await popup;
  gerador.on('pageerror',e=>console.error(e.message));
  if(area==='sermon') {
   await gerador.locator('#modeSermon').click();
   assert.equal(await gerador.locator('#modeSermon').getAttribute('aria-pressed'),'true');
  }
  await gerador.locator('#theme').fill('Oração em comunidade');
  await gerador.locator('#study').fill('# Oração em comunidade\n\n## Introdução\n\nOrem uns pelos outros.\n\n## Conclusão\n\nOrem em comunidade.');
  await gerador.locator('#approve').click();
  await gerador.getByRole('button',{name:'Salvar na Biblioteca IBNE'}).click();
  console.log(area,await gerador.locator('#cebExportStatus').textContent());
  await page.getByText('O material será salvo como definitivo e privado.',{exact:false}).waitFor();
  const save=page.getByRole('button',{name:'Salvar na Biblioteca IBNE'});
  assert.equal(await save.isDisabled(),true);
  await page.getByLabel(/Conferi os arquivos/).check();
  await save.click();
  await page.getByText(/Cartão salvo; arquivos originais preservados/).waitFor();
  assert.equal(studies.length,area==='ebd'?1:2);
  assert.equal(studies.at(-1)?.content.readyMaterialArea,area);
  await gerador.close();
  await page.getByRole('button',{name:'Início',exact:true}).click();
 }
 console.log('OK',studies.length,uploads);
} finally {await browser?.close();await vite.close();}
