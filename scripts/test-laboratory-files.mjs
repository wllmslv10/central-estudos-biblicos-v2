// Real uploads and extraction on the guarded laboratory; synthetic files only.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const base='https://ceb-biblioteca-api-validacao.wllmslv10.workers.dev';
const password=process.env.CEB_LAB_PASSWORD||JSON.parse(await readFile(process.env.CEB_LAB_CREDENTIALS_FILE,'utf8')).password;
const out='interactive-reading-validation';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CEB_TEST_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
const report={checkedAt:new Date().toISOString(),files:[]};
try{
 const page=await browser.newPage({ignoreHTTPSErrors:true});
 await page.setContent('<h1>PDF-LEITURA-TESTE</h1><p>Arquivo sintético para conferir extração e preservação do original.</p>');
 await page.pdf({path:out+'/teste.pdf',format:'A4'});
 await writeFile(out+'/teste.html','<!doctype html><html><body><main><h1>HTML-LEITURA-TESTE</h1><p>Texto completo do arquivo sintético.</p></main><script>window.testOnly=true</script></body></html>');
 execFileSync('python3',['-c',`import zipfile
with zipfile.ZipFile('${out}/teste.docx','w') as z:
 z.writestr('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
 z.writestr('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
 z.writestr('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>WORD-LEITURA-TESTE</w:t></w:r></w:p><w:p><w:r><w:t>Texto completo do documento sintético.</w:t></w:r></w:p></w:body></w:document>')`]);
 const login=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'williamlab',password})});assert.equal(login.status,200);const auth=await login.json();const headers={Authorization:'Bearer '+auth.access_token};
 const files=[];
 for(const ext of ['pdf','docx','html']){
  const bytes=await readFile(out+'/teste.'+ext);const form=new FormData();form.append('file',new Blob([bytes]),'teste.'+ext);form.append('metadata',JSON.stringify({title:'[TESTE] Arquivo '+ext,kind:'estudo',category:'estudo',scope:'private',text:'Texto de teste extraído: '+ext}));
  const r=await fetch(base+'/library/materials',{method:'POST',headers,body:form});const data=await r.json();assert.equal(r.status,201,JSON.stringify(data));
  files.push({id:data.material.id,filename:data.material.filename,mime:data.material.mime_type,audience:ext==='docx'?'teacher':'student'});
 }
 const r=await fetch(base+'/studies',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({title:'[TESTE PRÁTICO] Arquivos PDF, Word e HTML',content:{contentVersion:1,collection:'originals',kind:'estudo',title:'[TESTE PRÁTICO] Arquivos PDF, Word e HTML',originalBundle:{version:1,description:'Arquivos sintéticos. Word reservado ao professor; PDF e HTML liberáveis ao aluno.',files}},status:'published'})});
 const data=await r.json();assert.equal(r.status,201,JSON.stringify(data));report.studyId=data.study.id;
 for(const f of files){const original=await fetch(`${base}/library/originals/${data.study.id}/files/${f.id}/download`,{headers});assert.equal(original.status,200);assert.deepEqual(Buffer.from(await original.arrayBuffer()),await readFile(out+'/'+f.filename));}
 await page.goto(base+'/central-estudos-biblicos-v2/');await page.getByLabel('Usuário',{exact:true}).fill('williamlab');await page.getByLabel('Senha',{exact:true}).fill(password);await page.getByRole('button',{name:'Entrar',exact:true}).click();
 await page.getByRole('button',{name:/Acervo de Materiais Didáticos Importados/}).first().click();
 const card=page.getByRole('article',{name:'[TESTE PRÁTICO] Arquivos PDF, Word e HTML',exact:true});await card.locator('summary').first().click();
 for(const f of files){
  const row=card.locator('.original-files>.import-actions').filter({has:page.getByText(f.filename,{exact:true})});
  await row.getByRole('button',{name:'📖 Leitura Interativa',exact:true}).click();
  const frame=page.frameLocator('iframe[title="Leitura Interativa do estudo completo"]');
  const marker=f.filename.endsWith('pdf')?'PDF-LEITURA-TESTE':f.filename.endsWith('docx')?'WORD-LEITURA-TESTE':'HTML-LEITURA-TESTE';
  await frame.getByText(marker,{exact:false}).waitFor({timeout:45000});
  assert.match(await frame.locator('body').innerText(),/imagens, tabelas e diagramação/);
  await page.getByRole('button',{name:'Fechar ×',exact:true}).click();report.files.push({filename:f.filename,originalBytesPreserved:true,textExtraction:true});
 }
 await writeFile(out+'/laboratory-files.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
