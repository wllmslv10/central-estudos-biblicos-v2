// New trash flows only. Real Worker + local in-memory PostgreSQL. No production or import tests.
import assert from 'node:assert/strict';
import {readFile,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';import {pathToFileURL} from 'node:url';
import {PGlite} from '../api-worker/node_modules/@electric-sql/pglite/dist/index.js';
import pg from '../api-worker/node_modules/pg/lib/index.js';
import worker from '../api-worker/worker.js';
import {hashSessionToken} from '../api-worker/auth.js';
const db=new PGlite(),old={connect:pg.Client.prototype.connect,query:pg.Client.prototype.query,end:pg.Client.prototype.end};
const admin='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',student='10000000-0000-4000-8000-000000000003';
let idCounter=100,failStorage=false,failFinalize=false;const objects=new Map(),removed=[];
const uuid=()=>`20000000-0000-4000-8000-${String(++idCounter).padStart(12,'0')}`;
const query=async(sql,args)=>{if(failFinalize&&sql.startsWith("UPDATE public.ceb_materials SET deleted_at='infinity'")){failFinalize=false;throw Error('synthetic finalization failure');}const r=await db.query(sql,args);return {...r,rowCount:r.command==='SELECT'?r.rows.length:(r.affectedRows??r.rows.length)};};
const env={HYPERDRIVE:{connectionString:'postgres://never.invalid/local'},CEB_UPLOADS_ENABLED:'false',CEB_STORAGE_PROVIDER:'r2',CEB_MATERIAIS:{put:async()=>{throw Error('No upload allowed in this test')},get:async key=>({body:objects.get(key)}),delete:async key=>{if(failStorage)throw Error('synthetic storage failure');removed.push(key);objects.delete(key)}}};
async function api(path,method='GET',body,role='admin') {const r=await worker.fetch(new Request('https://ceb-biblioteca-api.wllmslv10.workers.dev'+path,{method,headers:{Origin:'https://wllmslv10.github.io',...(role?{Authorization:'Bearer '+role+'-test'}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})}),env);return {status:r.status,body:await r.json()};}
const item=(type,id)=>({type,id}),op=(action,items,role='admin',extra={})=>api('/library/trash','POST',{action,items,...(action==='purge'?{confirmed:true,confirmCount:items.length}:{}),...extra},role);
const trash=()=>api('/library/trash');
async function study(title,content={},owner=admin){const id=uuid();await query("INSERT INTO public.ceb_studies(id,owner_user_id,title,content,visibility,status) VALUES($1,$2,$3,$4::jsonb,'shared','published')",[id,owner,title,JSON.stringify({libraryScope:'general',sharing:{enabled:true,quizEnabled:true,audience:'all',allowDownload:true},...content})]);return id;}
async function material(title,owner=admin,scope='general'){const id=uuid(),key=`materials/${owner}/${id}/original`;await query("INSERT INTO public.ceb_materials(id,owner_user_id,title,filename,mime_type,byte_size,object_key,sha256,extracted_text,kind,scope) VALUES($1,$2,$3,'original.html','text/html',8,$4,'test-checksum','original text','estudo',$5)",[id,owner,title,key,scope]);objects.set(key,new Uint8Array([1,2,3,4]));return id;}
try{
 await db.exec(`CREATE ROLE ceb_api_user;CREATE TABLE public.ceb_users(id uuid PRIMARY KEY,username text,display_name text,password_hash text,app_role text,is_active boolean DEFAULT true,must_change_password boolean DEFAULT false,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());CREATE TABLE public.ceb_studies(id uuid PRIMARY KEY,owner_user_id uuid,title text,content jsonb,visibility text,status text,deleted_at timestamptz,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now());CREATE TABLE public.ceb_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,token_hash text,expires_at timestamptz,revoked_at timestamptz);`);
 for(const f of ['003_cloud_materials.sql','004_quizzes.sql','005_students_ai.sql','006_material_classification.sql'])await db.exec(await readFile('api-worker/migrations/'+f,'utf8'));
 for(const [id,name,role]of [[admin,'admin','admin'],[other,'other','admin'],[student,'student','user']]){await query("INSERT INTO public.ceb_users(id,username,display_name,password_hash,app_role) VALUES($1,$2,$2,'unused',$3)",[id,name,role]);await query("INSERT INTO public.ceb_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 hour')",[id,await hashSessionToken(name+'-test')]);}
 pg.Client.prototype.connect=async()=>{};pg.Client.prototype.end=async()=>{};pg.Client.prototype.query=query;
 const s=await study('Lição com questionário'),s2=await study('Apresentação',{collection:'ebd',ebdType:'apresentacao'}),privateStudy=await study('Particular de outro',{libraryScope:'private'},other),m=await material('PDF técnico'),unselected=await material('Documento não selecionado'),privateMaterial=await material('Particular',other,'private');
 const definition={policy:'authorized',mode:'manual',showAnswers:false,questions:[{id:uuid(),question:'Pergunta bíblica de teste',options:['A','B','C','D'],answer:0,points:1,reference:'Mateus 4:4',explanation:'Explicação'}]};
 const quiz=(await query('INSERT INTO public.ceb_quizzes(study_id,definition,reviewed,revision) VALUES($1,$2::jsonb,TRUE,1) RETURNING id',[s,JSON.stringify(definition)])).rows[0].id;
 const version=(await query('INSERT INTO public.ceb_quiz_versions(quiz_id,revision,definition) VALUES($1,1,$2::jsonb) RETURNING id',[quiz,JSON.stringify(definition)])).rows[0].id;
 const attempt=(await query("INSERT INTO public.ceb_quiz_attempts(quiz_id,version_id,user_id,answers,submitted_at,score,maximum,percent,correct) VALUES($1,$2,$3,'[0]',now(),1,1,100,1) RETURNING id",[quiz,version,student])).rows[0].id;
 const beforeAttempt=(await query('SELECT * FROM public.ceb_quiz_attempts WHERE id=$1',[attempt])).rows[0],beforeVersion=(await query('SELECT * FROM public.ceb_quiz_versions WHERE id=$1',[version])).rows[0],beforeUnselected=(await query('SELECT * FROM public.ceb_materials WHERE id=$1',[unselected])).rows[0],beforeSharing=(await query('SELECT content FROM public.ceb_studies WHERE id=$1',[s])).rows[0].content.sharing;
 assert.equal((await api('/library/trash','GET',null,null)).status,401);
 assert.equal((await api('/library/trash','GET',null,'student')).status,403);
 assert.equal((await api('/studies?trash=1','GET',null,'student')).status,403);
 assert.equal((await api('/library/materials?trash=1','GET',null,'student')).status,403);
 assert.equal((await op('purge',[item('material',m)],'student')).status,403);
 assert.equal((await op('trash',[item('study',privateStudy)])).status,404);
 assert.equal((await op('trash',[item('material',m),item('material',privateMaterial)])).status,404);
 assert.equal((await query('SELECT deleted_at FROM public.ceb_materials WHERE id=$1',[m])).rows[0].deleted_at,null);
 assert.equal((await op('purge',[item('material',m)],'admin',{confirmed:false})).status,400);
 assert.equal((await op('purge',[item('material',m)],'admin',{confirmCount:2})).status,400);
 assert.equal((await op('purge',[item('material',m)])).body.results[0].ok,false);assert.equal(removed.length,0);
 console.log('PASS permissions, whole-selection preflight, confirmation and trash-before-purge');
 assert.equal((await api('/library/materials/'+m,'DELETE')).status,200);
 assert.equal(objects.size,3);assert.equal((await op('restore',[item('material',m)])).body.results[0].ok,true);
 assert.equal((await op('trash',[item('quiz',quiz)])).body.results[0].ok,true);
 assert.equal((await api('/studies/'+s+'/quiz','GET',null,'student')).status,404);
 assert.equal((await api('/studies/'+s+'/quiz/attempt','POST',{id:attempt,submit:true,answers:[0]},'student')).status,404);
 let listing=await api('/studies');assert.equal(listing.body.studies.find(x=>x.id===s).quiz_summary,null);assert.equal(listing.body.studies.find(x=>x.id===s).quiz_available,false);
 assert.equal((await op('restore',[item('quiz',quiz)])).body.results[0].ok,true);
 assert.deepEqual((await query('SELECT definition FROM public.ceb_quizzes WHERE id=$1',[quiz])).rows[0].definition,definition);
 assert.equal((await api('/studies/'+s+'/quiz','GET',null,'student')).status,200);
 console.log('PASS independent quiz trash/restore, summary visibility and submission revocation');
 await op('trash',[item('study',s),item('study',s2),item('material',m)]);
 const t=(await trash()).body.items;assert.ok(t.some(x=>x.type==='quiz'&&x.id===quiz&&x.parentTrashed));
 assert.equal((await op('purge',[item('study',s)])).body.results[0].ok,false);
 let restored=await op('restore',[item('quiz',quiz),item('study',s)]);assert.ok(restored.body.results.every(r=>r.ok));
 assert.deepEqual((await query('SELECT content FROM public.ceb_studies WHERE id=$1',[s])).rows[0].content.sharing,beforeSharing);
 await op('trash',[item('study',s)]);
 const all=(await trash()).body.items;const purged=await op('purge',all.map(x=>item(x.type,x.id)));assert.ok(purged.body.results.every(r=>r.ok),JSON.stringify(purged.body));
 assert.equal((await trash()).body.items.length,0);assert.equal(objects.size,2);
 assert.equal((await api('/studies/'+s+'/restore','POST',{})).status,409);
 assert.equal((await api('/library/materials/'+m+'/restore','POST',{})).status,409);
 assert.equal((await api('/studies?trash=1')).body.studies.some(x=>x.id===s),false);
 assert.equal((await api('/library/materials?trash=1')).body.materials.some(x=>x.id===m),false);
 assert.equal((await api('/library/materials/'+m+'/download')).status,409);
 assert.deepEqual((await query('SELECT * FROM public.ceb_quiz_attempts WHERE id=$1',[attempt])).rows[0],beforeAttempt);
 assert.deepEqual((await query('SELECT * FROM public.ceb_quiz_versions WHERE id=$1',[version])).rows[0],beforeVersion);
 assert.deepEqual((await query('SELECT * FROM public.ceb_materials WHERE id=$1',[unselected])).rows[0],beforeUnselected);
 console.log('PASS all-selection, dependency order, terminal deletion, histories and unselected objects preserved');
 const pending=await material('Falha controlada');await op('trash',[item('material',pending)]);failStorage=true;
 assert.equal((await op('purge',[item('material',pending)])).body.results[0].ok,false);
 assert.equal((await trash()).body.items.find(x=>x.id===pending).pending,true);
 assert.equal((await api('/library/materials/'+pending+'/restore','POST',{})).status,409);
 assert.equal((await op('restore',[item('material',pending)])).body.results[0].ok,false);
 failStorage=false;failFinalize=true;assert.equal((await op('purge',[item('material',pending)])).body.results[0].ok,false);
 assert.equal((await trash()).body.items.find(x=>x.id===pending).pending,true);
 assert.equal((await op('purge',[item('material',pending)])).body.results[0].ok,true);
 assert.equal((await trash()).body.items.some(x=>x.id===pending),false);

 const noStorage=await material('Configuração indisponível');await op('trash',[item('material',noStorage)]);
 const bucket=env.CEB_MATERIAIS;env.CEB_MATERIAIS=null;
 assert.equal((await op('purge',[item('material',noStorage)])).body.results[0].ok,false);
 env.CEB_MATERIAIS=bucket;
 assert.notEqual((await query('SELECT deleted_at::text AS stamp FROM public.ceb_materials WHERE id=$1',[noStorage])).rows[0].stamp,'-infinity');
 assert.equal((await op('restore',[item('material',noStorage)])).body.results[0].ok,true);
 console.log('PASS durable removal state, storage/finalization failures, blocked unsafe restore and idempotent completion');
 // A new valid edition may be authored after deleting a quiz; old history remains untouched.
 const s3=await study('Nova edição');const q3=(await query('INSERT INTO public.ceb_quizzes(study_id,definition,reviewed,revision) VALUES($1,$2::jsonb,TRUE,1) RETURNING id',[s3,JSON.stringify(definition)])).rows[0].id;
 await query('INSERT INTO public.ceb_quiz_versions(quiz_id,revision,definition) VALUES($1,1,$2::jsonb)',[q3,JSON.stringify(definition)]);
 await op('trash',[item('quiz',q3)]);await op('purge',[item('quiz',q3)]);
 assert.equal((await api('/studies/'+s3+'/quiz')).body.quiz,null);
 const save=await api('/studies/'+s3+'/quiz','PUT',{...definition,revision:0,reviewed:true});assert.equal(save.status,200);assert.equal(save.body.quiz.revision,2);
 assert.equal((await query('SELECT id FROM public.ceb_quiz_versions WHERE quiz_id=$1',[q3])).rows.length,2);
 console.log('PASS authoring a new edition does not erase immutable historical versions');
 const recovery=JSON.parse(execFileSync('node',['scripts/prepare-library-safe-recovery.mjs'],{encoding:'utf8'}));
 try {
  const recoveryWorker=(await import(pathToFileURL(recovery.destination+'/worker.js'))).default;
  const recoveryApi=async(path,method='GET',role='admin')=>{const r=await recoveryWorker.fetch(new Request('https://ceb-biblioteca-api.wllmslv10.workers.dev'+path,{method,headers:{Authorization:'Bearer '+role+'-test',Origin:'https://wllmslv10.github.io'}}),env);return {status:r.status,body:await r.json()};};
  assert.equal((await recoveryApi('/studies/'+s+'/restore','POST')).status,409);
  assert.equal((await recoveryApi('/library/materials/'+m+'/restore','POST')).status,409);
  assert.equal((await recoveryApi('/library/trash')).status,404);
  assert.equal((await recoveryApi('/studies?trash=1')).body.studies.some(x=>x.id===s),false);
  assert.equal((await recoveryApi('/library/materials?trash=1')).body.materials.some(x=>x.id===m),false);
  await op('trash',[item('quiz',q3)]);await op('purge',[item('quiz',q3)]);
  assert.equal((await recoveryApi('/studies/'+s3+'/quiz','GET','student')).status,404);
  assert.equal((await recoveryApi('/studies/'+s3+'/quiz')).body.quiz,null);
  console.log('PASS compatible recovery: no bulk deletion route, terminal rows cannot be restored, purged quizzes unavailable to students.');
 } finally {await rm(recovery.destination,{recursive:true,force:true});}

}finally{Object.assign(pg.Client.prototype,old);await db.close();}
