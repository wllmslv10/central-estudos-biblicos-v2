import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {experimentalStudy} from '../test/fixtures/ebd-experimental.mjs';
const base='https://ceb-biblioteca-api-validacao.wllmslv10.workers.dev';
const password=process.env.CEB_LAB_PASSWORD || JSON.parse(await readFile(process.env.CEB_LAB_CREDENTIALS_FILE,'utf8')).password;
const report={environment:base,checkedAt:new Date().toISOString(),checks:[]};
async function api(path,token,method='GET',body,expected=200){
 const response=await fetch(base+path,{method,headers:{Origin:base,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(30000)});
 const payload=await response.json();assert.equal(response.status,expected,path+': '+JSON.stringify(payload));return payload;
}
const admin=await api('/auth/login',null,'POST',{username:'williamlab',password});
const student=await api('/auth/login',null,'POST',{username:'alunolab',password});
const at=admin.access_token,st=student.access_token;
assert.equal(admin.user.role,'admin');assert.equal(student.user.role,'user');
report.checks.push('Login real de professor e aluno, com origem do laboratório');
const users=await api('/admin/users',at);assert.ok(users.users.every(u=>['williamlab','alunolab'].includes(u.username)));
await api('/admin/users',st,'GET',undefined,403);
report.checks.push('Cadastros isolados; aluno sem acesso administrativo');
const content={...experimentalStudy,teacherNotes:'LAB-RESERVADO-PROFESSOR',libraryScope:'general'};
const created=await api('/studies',at,'POST',{title:'[TESTE PRÁTICO] Ouvir e praticar — laboratório',content,status:'published'},201);
const id=created.study.id;report.studyId=id;
await api(`/studies/${id}/quiz`,at,'PUT',{policy:'multiple',mode:'manual',showAnswers:true,reviewed:true,revision:0,questions:[{id:crypto.randomUUID(),question:'Neste estudo de teste, qual é a atitude proposta?',options:['Ouvir e praticar','Ignorar o ensino','Somente discutir','Adiar sempre'],answer:0,points:1,reference:'Tiago 1:22',explanation:'LAB-GABARITO: o estudo associa ouvir e praticar.'}]});
const permissions={enabled:true,audience:'selected',userIds:[student.user.id],allowDownload:true,quizEnabled:true};
await api(`/studies/${id}/sharing`,at,'PUT',permissions,400);
await api(`/studies/${id}/sharing`,at,'PUT',{...permissions,studentReviewed:true});
const delivered=await api('/studies',st);assert.doesNotMatch(JSON.stringify(delivered),/LAB-RESERVADO|LAB-GABARITO|teacherNotes/);
assert.ok(delivered.studies.some(s=>s.id===id));
const definition=await api(`/studies/${id}/quiz`,st);assert.doesNotMatch(JSON.stringify(definition),/LAB-GABARITO|"answer":/);
const started=await api(`/studies/${id}/quiz/start`,st,'POST',{});
assert.doesNotMatch(JSON.stringify(started),/LAB-GABARITO|"answer":/);
const a=started.attempt;
const submitted=await api(`/studies/${id}/quiz/attempt`,st,'POST',{id:a.id,answers:[0],draftRevision:a.draft_revision,submit:true});
assert.equal(submitted.attempt.percent,100);
const results=await api(`/studies/${id}/quiz/results`,at);assert.match(JSON.stringify(results),/alunolab|Aluno/);
await api(`/studies/${id}/download`,st);
report.checks.push('Cadastro e persistência; revisão obrigatória; questionário sem gabarito antes da entrega; correção 100%; histórico do professor; download autorizado');
// A legacy share cannot deliver arbitrary mixed teacher text.
const legacy=await api('/studies',at,'POST',{title:'[TESTE] Legado aguardando revisão',content:{introduction:'LAB-LEGADO-RESERVADO',points:[],conclusion:'',kind:'estudo'},status:'published'},201);
await api(`/studies/${legacy.study.id}/sharing`,at,'PUT',{...permissions,quizEnabled:false,studentReviewed:true});
await api(`/studies/${legacy.study.id}`,at,'PUT',{title:legacy.study.title,content:{...legacy.study.content,introduction:'LAB-LEGADO-EDITADO'},status:'published'});
assert.doesNotMatch(JSON.stringify(await api('/studies',st)),/LAB-LEGADO/);
report.checks.push('Edição invalida revisão anterior de material legado');
await mkdir('interactive-reading-validation',{recursive:true});
await writeFile('interactive-reading-validation/laboratory-api.json',JSON.stringify(report,null,2));
const browser=await chromium.launch({headless:true,executablePath:process.env.CEB_TEST_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage'],...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
try{
 for(const [width,height] of [[1366,768],[768,1024],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},ignoreHTTPSErrors:true}),errors=[],forbidden=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://ceb-biblioteca-api.wllmslv10.workers.dev/**',r=>{forbidden.push(r.request().url());return r.abort()});
  await page.goto(base+'/central-estudos-biblicos-v2/');
  await page.getByLabel('Usuário',{exact:true}).fill('williamlab');await page.getByLabel('Senha',{exact:true}).fill(password);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByRole('button',{name:/Biblioteca/}).first().waitFor();
  assert.match(await page.locator('body').innerText(),/Laboratório CEB/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`interactive-reading-validation/laboratorio-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(forbidden,[]);await page.close();
  report.checks.push(`Navegador publicado autenticado ${width}×${height}, sem transbordamento ou chamada à API oficial`);
 }
}finally{await browser.close();await api('/auth/logout',at,'POST');await api('/auth/logout',st,'POST');}
await writeFile('interactive-reading-validation/laboratory-live.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
