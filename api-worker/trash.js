import { objectStore } from './storage.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const state = row => row?.stamp === 'infinity' ? 'purged' : row?.stamp === '-infinity' ? 'pending' : row?.stamp ? 'trashed' : 'active';
const quizState = row => row?.definition?._libraryTrash?.state || 'active';
const allowed = (row,user,type) => !!row && (row.owner_user_id===user.id || (type==='material' ? row.scope==='general' : !['private','particular'].includes(row.content?.libraryScope)));
const fail = (message,status=409) => { const e=new Error(message);e.status=status;throw e; };
async function record(client,item,lock=false) {
 const suffix=lock?' FOR UPDATE':'';
 if(item.type==='material') return (await client.query('SELECT *,deleted_at::text AS stamp FROM public.ceb_materials WHERE id=$1'+suffix,[item.id])).rows[0];
 if(item.type==='study') return (await client.query('SELECT *,deleted_at::text AS stamp FROM public.ceb_studies WHERE id=$1'+suffix,[item.id])).rows[0];
 const q=(await client.query('SELECT study_id FROM public.ceb_quizzes WHERE id=$1',[item.id])).rows[0];
 if(!q)return null;
 const study=(await client.query('SELECT *,deleted_at::text AS stamp FROM public.ceb_studies WHERE id=$1'+suffix,[q.study_id])).rows[0];
 if(!study)return null;
 const quiz=(await client.query('SELECT * FROM public.ceb_quizzes WHERE id=$1'+suffix,[item.id])).rows[0];
 if(!quiz||quiz.study_id!==study.id)return null;
 return {...study,quiz};
}
async function items(client,user) {
 const studies=(await client.query(`SELECT id,title,content->>'collection' AS collection,content->>'ebdType' AS ebd_type,content->>'kind' AS kind
 FROM public.ceb_studies WHERE deleted_at IS NOT NULL AND deleted_at<>'infinity'::timestamptz
 AND (owner_user_id=$1 OR COALESCE(content->>'libraryScope','general') NOT IN ('private','particular')) ORDER BY updated_at DESC`,[user.id])).rows;
 const materials=(await client.query(`SELECT id,title,filename,COALESCE(to_jsonb(ceb_materials)->>'category',kind) AS category,deleted_at='-infinity'::timestamptz AS pending
 FROM public.ceb_materials WHERE deleted_at IS NOT NULL AND deleted_at<>'infinity'::timestamptz AND (owner_user_id=$1 OR scope='general') ORDER BY updated_at DESC`,[user.id])).rows;
 const quizzes=(await client.query(`SELECT q.id,s.title,q.study_id AS parent_id,s.deleted_at IS NOT NULL AS parent_trashed
 FROM public.ceb_quizzes q JOIN public.ceb_studies s ON s.id=q.study_id
 WHERE (q.definition#>>'{_libraryTrash,state}'='trashed' OR s.deleted_at IS NOT NULL)
 AND COALESCE(q.definition#>>'{_libraryTrash,state}','')<>'purged' AND s.deleted_at IS DISTINCT FROM 'infinity'::timestamptz
 AND (s.owner_user_id=$1 OR COALESCE(s.content->>'libraryScope','general') NOT IN ('private','particular')) ORDER BY q.updated_at DESC`,[user.id])).rows;
 return [...studies.map(s=>({type:'study',id:s.id,title:s.title,category:s.collection==='ebd'?(s.ebd_type||'Lição EBD'):s.kind||'estudo'})),...materials.map(m=>({type:'material',id:m.id,title:m.title,category:m.category,filename:m.filename,pending:m.pending})),...quizzes.map(q=>({type:'quiz',id:q.id,title:'Questionário — '+q.title,category:'questionário',parentId:q.parent_id,parentTrashed:q.parent_trashed}))];
}
export async function trashRoute(request,env,url,client,user,json,origin,storageFactory=objectStore) {
 const reply=(body,status=200)=>json(body,status,origin);
 if(user.app_role!=='admin'||user.must_change_password) return reply({error:'Lixeira restrita ao administrador autorizado.'},403);
 if(url.pathname!=='/library/trash')return reply({error:'Rota inválida.'},404);
 if(request.method==='GET')return reply({items:await items(client,user)});
 if(request.method!=='POST')return reply({error:'Método não permitido.'},405);
 let b;
 try { const reader=request.body?.getReader();let text='',size=0;if(!reader)throw Error();const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>20000){await reader.cancel();throw Error();}text+=decoder.decode(value,{stream:true});}b=JSON.parse(text+decoder.decode()); }catch{return reply({error:'Pedido inválido ou muito grande.'},400);}
 if(!['trash','restore','purge'].includes(b?.action)||!Array.isArray(b.items)||b.items.length<1||b.items.length>50||b.items.some(i=>!i||!['study','material','quiz'].includes(i.type)||!UUID.test(i.id))||new Set(b.items.map(i=>i.type+':'+i.id)).size!==b.items.length)return reply({error:'Selecione entre 1 e 50 itens válidos e distintos por lote.'},400);
 if(b.action==='purge'&&(b.confirmed!==true||b.confirmCount!==b.items.length))return reply({error:'Confirme a quantidade exata de materiais para excluir definitivamente.'},400);
 // Check the whole requested set before touching any record or object. Recheck under lock below.
 try {for(const item of b.items){const row=await record(client,item);if(!allowed(row,user,item.type))fail('Material indisponível ou sem permissão.',404);}}
 catch(e){return reply({error:e.status?e.message:'Não foi possível validar a seleção.'},e.status||503);}
 const rank=b.action==='purge'?{quiz:0,material:1,study:2}:{study:0,quiz:1,material:2};
 const selected=[...b.items].sort((a,c)=>rank[a.type]-rank[c.type]||a.id.localeCompare(c.id));const results=[];
 for(const item of selected) {
  let pending=false,key,storage;
  try {
   await client.query('BEGIN');
   const row=await record(client,item,true);if(!allowed(row,user,item.type))fail('Material indisponível ou sem permissão.',404);
   const current=item.type==='quiz'?quizState(row.quiz):state(row);
   if(current==='purged')fail('Material já excluído definitivamente. Não pode ser restaurado.');
   if(item.type==='quiz' && state(row)==='purged')fail('A lição vinculada foi excluída definitivamente.');
   if(b.action==='trash') {
    if(current==='pending')fail('Exclusão definitiva pendente; consulte a Lixeira.');
    if(item.type==='quiz') await client.query("UPDATE public.ceb_quizzes SET definition=jsonb_set(definition,'{_libraryTrash}',$1::jsonb),updated_at=now() WHERE id=$2",[JSON.stringify({state:'trashed',at:new Date().toISOString()}),item.id]);
    else await client.query(`UPDATE public.${item.type==='study'?'ceb_studies':'ceb_materials'} SET deleted_at=COALESCE(deleted_at,now()),updated_at=now() WHERE id=$1`,[item.id]);
   } else if(b.action==='restore') {
    if(current==='pending')fail('Original em exclusão definitiva. Conclua a exclusão; a restauração está bloqueada.');
    if(item.type==='quiz') {
     if(state(row)!=='active')fail('Restaure primeiro a lição vinculada.');
     await client.query("UPDATE public.ceb_quizzes SET definition=definition-'_libraryTrash',updated_at=now() WHERE id=$1",[item.id]);
    } else await client.query(`UPDATE public.${item.type==='study'?'ceb_studies':'ceb_materials'} SET deleted_at=NULL,updated_at=now() WHERE id=$1`,[item.id]);
   } else {
    if(current==='active' && !(item.type==='quiz'&&state(row)==='trashed'))fail('Envie o material para a Lixeira antes da exclusão definitiva.');
    if(item.type==='study') {
     const children=await client.query("SELECT id FROM public.ceb_quizzes WHERE study_id=$1 AND COALESCE(definition#>>'{_libraryTrash,state}','')<>'purged'",[item.id]);
     if(children.rows.length)fail('Selecione também o questionário vinculado para excluir a lição definitivamente.');
     // A terminal catalog tombstone retains FK anchors and immutable attempt/version history.
     await client.query("UPDATE public.ceb_studies SET deleted_at='infinity'::timestamptz,updated_at=now() WHERE id=$1",[item.id]);
    } else if(item.type==='quiz') {
     await client.query("UPDATE public.ceb_quizzes SET definition=jsonb_set(definition,'{_libraryTrash}',$1::jsonb),updated_at=now() WHERE id=$2",[JSON.stringify({state:'purged',at:new Date().toISOString()}),item.id]);
    } else {
     if(row.object_key!==`materials/${row.owner_user_id}/${row.id}/original`)fail('Chave do original incompatível; exclusão interrompida.');
     storage=storageFactory(env); // Validate configuration before entering the irreversible pending phase.
     // Durable pending phase: never restore a row while its object removal is ambiguous.
     await client.query("UPDATE public.ceb_materials SET deleted_at='-infinity'::timestamptz,updated_at=now() WHERE id=$1",[item.id]);pending=true;key=row.object_key;
    }
   }
   await client.query('COMMIT');
   if(pending) {
    await storage.remove(key); // Only this selected object's exact key. 404 is idempotent.
    const done=await client.query("UPDATE public.ceb_materials SET deleted_at='infinity'::timestamptz,updated_at=now() WHERE id=$1 AND deleted_at='-infinity'::timestamptz RETURNING id",[item.id]);
    if(!done.rows.length)throw Error('PURGE_FINALIZATION');
   }
   results.push({...item,ok:true});
  }catch(e){try{await client.query('ROLLBACK');}catch{}results.push({...item,ok:false,error:e.status?e.message:pending?'A exclusão do original não foi confirmada. Atualize a Lixeira; se houver pendência, conclua-a antes de restaurar.':'Não foi possível concluir este material. Nenhum outro item foi incluído na seleção.'});}
 }
 return reply({results});
}
