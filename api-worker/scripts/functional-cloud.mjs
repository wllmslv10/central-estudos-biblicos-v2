// Only synthetic credentials, in process memory; never log responses, cookies or tokens.
import { randomBytes, createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashPassword } from '../auth.js';
const BASE='https://ceb-biblioteca-api-validacao.wllmslv10.workers.dev';
const STORAGE='https://br-holy-lake-b5wmosos.storage.c-7.us-east-2.aws.neon.tech/ceb-materiais';
const report={ environment:BASE,run:process.env.GITHUB_RUN_ID,checks:[],originals:[],requests:0 };
const actors=[]; let identity;
function check(name,fn) { return (async()=>{await fn();report.checks.push({name,result:'passed'});console.log('PASS '+name);})(); }
async function raw(path,{token,body,method='GET',headers={}}={}) {
  assert.ok(path.startsWith('/') && !path.startsWith('//'));
  report.requests++;
  return fetch(BASE+path,{method,headers:{...headers,...(token?{Authorization:'Bearer '+token}:{})},body,redirect:'error',signal:AbortSignal.timeout(25000)});
}
async function json(path,options,expected=200) {
  const response=await raw(path,options);
  if(response.status!==expected) {
    const failure=await response.json().catch(()=>({}));
    const code=/^[A-Z_]{1,80}$/.test(failure.code||'')?' '+failure.code:'';
    assert.fail(`${options?.method||'GET'} ${path}: expected ${expected}, received ${response.status}${code}`);
  }
  return response.json();
}
const payload=(method,value,token)=>({method,token,headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const run=`${process.env.GITHUB_RUN_ID}_${process.env.GITHUB_RUN_ATTEMPT}`;
const folder=`CEB teste ${run}`;
async function fixture(action,extra={}) { return json('/validation/fixtures',payload('POST',{action,...extra},identity),action==='seed'?201:200); }
async function upload(actor,ext,{scope='private',targetFolder=folder,expected=201}={}) {
  const bytes=Buffer.from(originals[ext],'base64');
  const form=new FormData();form.append('file',new Blob([bytes]),`ceb-tecnico.${ext}`);
  form.append('metadata',JSON.stringify({title:`CEB técnico ${run} ${ext}`,kind:'estudo',scope,folder:targetFolder,text:'Conteúdo sintético para testes de armazenamento.'}));
  const response=await raw('/library/materials',{method:'POST',token:actor.token,body:form});
  assert.equal(response.status,expected,`upload ${ext}: expected ${expected}, received ${response.status}`);
  const result=await response.json();return expected===201?result.material:result;
}
async function identical(actor,material,ext) {
  const response=await raw(`/library/materials/${material.id}/download`,{token:actor.token});
  assert.equal(response.status,200,`download ${ext}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.equal(sha(bytes),sha(Buffer.from(originals[ext],'base64')),`checksum ${ext}`);
  assert.match(response.headers.get('Content-Disposition')||'',/^attachment;/);
  if(ext==='html') {assert.match(response.headers.get('Content-Security-Policy')||'',/sandbox/);assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');}
}
let originals;
try {
  assert.equal(process.env.GITHUB_REPOSITORY,'wllmslv10/central-estudos-biblicos-v2');
  assert.equal(process.env.GITHUB_REF,'refs/heads/work/biblioteca-nuvem-20261026');
  assert.match(run,/^[0-9]+_[0-9]+$/);
  // Wait for this push's Cloudflare build. No retries of writes or logins.
  let healthy=false;
  for(let attempt=0;attempt<24;attempt++) {
    try {
      const r=await raw('/health');const h=await r.json();
      if(r.ok&&h.functional_tests==='oidc-v4'&&h.runtime==='validation'&&h.isolated_database===true&&h.uploads_enabled===true&&h.storage?.reachable===true) {healthy=true;break;}
    } catch {}
    await new Promise(resolve=>setTimeout(resolve,10000));
  }
  assert.ok(healthy,'Isolated backend not ready; no technical accounts or files were created');
  report.checks.push({name:'Banco isolado, bucket autenticado e upload restrito a contas técnicas',result:'passed'});
  originals=JSON.parse(await readFile(new URL('../test/functional-originals.json',import.meta.url),'utf8'));
  identity=process.env.CEB_FUNCTIONAL_OIDC;
  assert.ok(typeof identity==='string'&&identity.split('.').length===3,'Temporary GitHub identity unavailable');
  await check('Preparação sem autorização é negada',async()=>{const r=await raw('/validation/fixtures',payload('POST',{}));assert.equal(r.status,401);});
  for(const slot of ['a1','a2','s1']) {
    const password=randomBytes(24).toString('base64url');
    const seeded=await fixture('seed',{slot,password_hash:await hashPassword(password)});
    const authenticated=await json('/auth/login',payload('POST',{username:seeded.user.username,password}));
    assert.equal(authenticated.user.role,slot==='s1'?'user':'admin');
    actors.push({slot,id:seeded.user.id,username:seeded.user.username,password,token:authenticated.access_token});
  }
  const [admin,other,student]=actors;
  await check('Sessões distintas de dois administradores e um aluno',async()=>{
    assert.equal(new Set(actors.map(a=>a.token)).size,3);
    for(const actor of actors){const me=await json('/auth/me',{token:actor.token});assert.equal(me.user.id,actor.id);}
    const r=await raw('/admin/users',{token:student.token});assert.equal(r.status,403);
  });
  await check('Biblioteca anônima é negada',async()=>{assert.equal((await raw('/library/materials')).status,401);});
  await check('Pastas próprias e repetição sem duplicação',async()=>{
    for(const actor of [admin,student]) {
      const a=await json('/library/folders',payload('POST',{name:folder},actor.token),201);
      const b=await json('/library/folders',payload('POST',{name:folder},actor.token),201);
      assert.equal(a.folder.id,b.folder.id);assert.equal(a.folder.scope,'private');
    }
    const outsider=await json('/library/folders',{token:other.token});assert.ok(!outsider.folders.some(f=>f.name===folder));
  });
  for(const ext of ['pdf','docx','pptx','html']) {
    const material=await upload(admin,ext);
    await check(`Upload/download ${ext.toUpperCase()} e bytes idênticos`,async()=>{assert.equal(material.folder,folder);await identical(admin,material,ext);});
    report.originals.push({format:ext,bytes:Buffer.from(originals[ext],'base64').length,sha256:sha(Buffer.from(originals[ext],'base64')),material_id:material.id});
    await check(`Privacidade ${ext}: outro administrador, aluno e anônimo negados`,async()=>{
      for(const actor of [other,student]) {
        assert.equal((await raw(`/library/materials/${material.id}/download`,{token:actor.token})).status,404);
        assert.equal((await raw(`/library/materials/${material.id}`,{method:'DELETE',token:actor.token})).status,404);
        assert.equal((await raw(`/library/materials/${material.id}/restore`,{method:'POST',token:actor.token})).status,404);
      }
      assert.equal((await raw(`/library/materials/${material.id}/download`)).status,401);
      const anon=await fetch(`${STORAGE}/materials/${admin.id}/${material.id}/original`,{redirect:'error'});
      assert.equal(anon.status,403);
    });
    await check(`Material aplicado e data ${ext}`,async()=>{
      await json(`/library/materials/${material.id}`,payload('PATCH',{applied:true,applied_date:'2026-10-27'},admin.token));
      const list=await json('/library/materials',{token:admin.token});const found=list.materials.find(m=>m.id===material.id);
      assert.equal(found.applied,true);assert.equal(found.applied_date,'2026-10-27');
    });
    await check(`Lixeira, recuperação e integridade ${ext}`,async()=>{
      await json(`/library/materials/${material.id}`,{method:'DELETE',token:admin.token});
      assert.ok(!(await json('/library/materials',{token:admin.token})).materials.some(m=>m.id===material.id));
      assert.ok((await json('/library/materials?trash=1',{token:admin.token})).materials.some(m=>m.id===material.id));
      assert.equal((await raw(`/library/materials/${material.id}/download`,{token:admin.token})).status,405);
      await json(`/library/materials/${material.id}/restore`,{method:'POST',token:admin.token});
      assert.ok((await json('/library/materials',{token:admin.token})).materials.some(m=>m.id===material.id));
      await identical(admin,material,ext);
    });
  }
  await check('Aluno envia original próprio e não consegue torná-lo geral',async()=>{
    const m=await upload(student,'pdf',{scope:'general'});assert.equal(m.scope,'private');await identical(student,m,'pdf');
    assert.equal((await raw(`/library/materials/${m.id}/download`,{token:admin.token})).status,404);
  });
  await check('Pasta particular não permite publicação geral',async()=>{await upload(admin,'pdf',{scope:'general',expected:400});});
  await check('Geral é acessível a outro admin e negado ao aluno',async()=>{
    const name=folder+' geral';await json('/library/folders',payload('POST',{name,scope:'general'},admin.token),201);
    const m=await upload(admin,'pdf',{scope:'general',targetFolder:name});assert.equal(m.scope,'general');
    await identical(other,m,'pdf');assert.equal((await raw(`/library/materials/${m.id}/download`,{token:student.token})).status,404);
  });
  await check('Sessão HTTP independente reencontra metadados persistidos',async()=>{
    const reopened=await json('/auth/login',payload('POST',{username:admin.username,password:admin.password}));
    assert.ok(reopened.access_token!==admin.token,'Independent login must issue a different session');
    admin.token=reopened.access_token;
    const rows=await json('/library/materials',{token:admin.token});
    for(const m of report.originals)assert.ok(rows.materials.some(row=>row.id===m.material_id));
  });
  await check('Logout revoga as sessões técnicas',async()=>{
    for(const actor of actors){await json('/auth/logout',{method:'POST',token:actor.token});assert.equal((await raw('/auth/me',{token:actor.token})).status,401);}
  });
  report.result='passed';
} catch(error) {
  // Only controlled assertion messages; no response bodies/credentials are printed.
  report.result='failed';report.failure=String(error.message).split('\n')[0];console.error(report.failure);process.exitCode=1;
} finally {
  if(identity) {
    try {const closed=await fixture('close');report.technical_accounts_closed=closed.closed;}
    catch {report.cleanup='pending: technical accounts only';process.exitCode=1;}
  }
  await writeFile('ceb-functional-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({result:report.result,passed:report.checks.length,requests:report.requests,technical_accounts_closed:report.technical_accounts_closed}));
}
