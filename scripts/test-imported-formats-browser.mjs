import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const deps=process.env.CEB_IMPORT_TEST_NODE_MODULES;
const fixtures=process.env.CEB_IMPORT_TEST_FIXTURES;
if(!deps||!fixtures)throw new Error('Defina CEB_IMPORT_TEST_NODE_MODULES e CEB_IMPORT_TEST_FIXTURES.');
const fixture=name=>resolve(fixtures,name);
const server=createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname.replace(/^\/central-estudos-biblicos-v2\//,'');
 try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/html');res.end(await readFile(resolve('dist',path||'index.html')));}catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port+'/central-estudos-biblicos-v2/';
const browser=await chromium.launch({executablePath:process.env.CEB_TEST_CHROMIUM,args:['--no-sandbox','--disable-gpu']});
try {
 const page=await browser.newPage();
 const materials=[],files=new Map();
 let upload;
 await page.exposeBinding('auditUpload',(_,value)=>{upload=value});
 await page.addInitScript(()=>{
  const original=window.fetch;
  window.fetch=async (url,options)=>{
   if(options?.body instanceof FormData&&options.body.has('file')){
    const file=options.body.get('file');
    await window.auditUpload({name:file.name,type:file.type,bytes:[...new Uint8Array(await file.arrayBuffer())],metadata:options.body.get('metadata')});
   }
   return original(url,options);
  };
 });
 await page.route('**/*',async r=>{
  const request=r.request(),u=new URL(request.url());
  if(u.origin===new URL(base).origin)return r.continue();
  const headers={'access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'};
  if(request.method()==='OPTIONS')return r.fulfill({status:204,headers});
  if(u.hostname==='esm.sh'){
   const name=u.pathname.includes('mammoth')?'mammoth':'jszip',global=name==='mammoth'?'mammoth':'JSZip';
   const path=name==='mammoth'?'/mammoth/mammoth.browser.min.js':'/jszip/dist/jszip.min.js';
   const body='const module={exports:{}};const exports=module.exports;\n'+await readFile(deps+path,'utf8')+'\nexport default module.exports;';
   return r.fulfill({body,contentType:'text/javascript',headers});
  }
  if(u.hostname==='cdnjs.cloudflare.com')return r.fulfill({body:await readFile(deps+'/pdfjs-dist/build/'+u.pathname.split('/').at(-1)),contentType:'text/javascript',headers});
  if(u.hostname!=='ceb-biblioteca-api.wllmslv10.workers.dev')return r.abort();
  const json=data=>r.fulfill({json:data,headers});
  if(u.pathname==='/auth/login')return json({user:{id:'audit',role:'admin',username:'technical',display_name:'Conta técnica',must_change_password:false},access_token:'mock-only',expires_at:'2099-01-01T00:00:00Z'});
  if(u.pathname==='/library/capabilities')return json({uploads:true,material_categories:true});
  if(u.pathname==='/library/folders')return json({folders:[]});
  if(u.pathname==='/studies')return json({studies:[]});
  if(u.pathname==='/library/materials'){
   if(request.method()==='GET')return json({materials});
   const file=upload,metadata=JSON.parse(upload.metadata);
   const bytes=Buffer.from(upload.bytes);
   assert.deepEqual(bytes,await readFile(fixture(file.name)));
   const material={id:String(materials.length+1),owner_user_id:'audit',title:metadata.title,filename:file.name,mime_type:file.type,byte_size:bytes.length,extracted_text:metadata.text,kind:'estudo',scope:'private',created_at:'2026-11-09'};
   materials.push(material);files.set(material.id,bytes);
   return json({material});
  }
  const download=u.pathname.match(/^\/library\/materials\/([^/]+)\/download$/);
  if(download)return r.fulfill({body:files.get(download[1]),headers});
  return json({});
 });
 await page.goto(base);
 await page.getByLabel('Usuário',{exact:true}).fill('technical');await page.getByLabel('Senha',{exact:true}).fill('abc123');await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('button',{name:/Importar/}).first().click();
 for(const ext of ['pdf','docx','pptx']){
  const name='auditoria.'+ext;
  await page.locator('input[type=file]').setInputFiles(fixture(name));
  await page.locator('.import-preview pre').getByText(/O texto completo deve aparecer nos slides/).waitFor({timeout:10000});
  await page.getByRole('button',{name:/Salvar original na nuvem/}).click();
  const card=page.locator('.library-item').filter({hasText:name});
  await card.waitFor();
  const [download]=await Promise.all([page.waitForEvent('download'),card.getByRole('button',{name:'Baixar original',exact:true}).click()]);
  assert.deepEqual(await readFile(await download.path()),await readFile(fixture(name)));
  console.log(ext+' extraído, enviado e baixado com bytes idênticos');
 }
 await page.getByRole('button',{name:/Voltar à Biblioteca/}).click();
 await page.getByRole('button',{name:/Materiais importados.*Explorar importados/s}).click();
 await page.getByRole('button',{name:/Estudos bíblicos importados/}).click();
 for(const ext of ['pdf','docx','pptx']){
  await page.locator('.library-item').filter({hasText:'auditoria.'+ext}).getByRole('button',{name:'Slides Simples / Média / Completa',exact:true}).click();
  await page.getByRole('dialog').getByRole('checkbox').check();
  const frame=page.frameLocator('iframe[title="Apresentação HTML do material salvo"]');
  await frame.locator('html[data-presentation-ready="true"]').waitFor();
  assert.match((await frame.locator('.reading').allTextContents()).join(' '),/O texto completo deve aparecer nos slides/);
  await page.keyboard.press('Escape');
  console.log(ext+' convertido em slides');
 }
}finally{await browser.close();server.close();}
