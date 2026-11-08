const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export async function teacherNotesRoute(request, url, client, user, json, origin) {
 const reply=(data,status=200)=>json(data,status,origin);
 // Current CEB grants teaching/management to admins, students have role user.
 if(user.app_role!=='admin'||user.must_change_password||url.searchParams.get('view')==='student')return reply({error:'Anotações reservadas ao professor.'},403);
 const key=decodeURIComponent(url.pathname.slice('/library/teacher-notes/'.length));
 const match=key.match(new RegExp(`^(study|material):(${UUID})(?::(${UUID}))?$`,'i'));
 if(!match)return reply({error:'Material inválido. Salve o material antes de criar anotações.'},400);
 const [,kind,id,fileId]=match;
 const accessible=kind==='study'
  ? await client.query("SELECT id FROM public.ceb_studies WHERE id=$1 AND deleted_at IS NULL AND (owner_user_id=$2 OR COALESCE(content->>'libraryScope','general') NOT IN ('private','particular')) AND ($3::text IS NULL OR EXISTS (SELECT 1 FROM jsonb_array_elements(content->'originalBundle'->'files') f WHERE f->>'id'=$3))",[id,user.id,fileId||null])
  : await client.query("SELECT id FROM public.ceb_materials WHERE id=$1 AND deleted_at IS NULL AND (owner_user_id=$2 OR scope='general')",[id,user.id]);
 if(!accessible.rows.length)return reply({error:'Material indisponível ou sem permissão.'},404);
 if(request.method==='GET'){
  const r=await client.query('SELECT notes,revision FROM public.ceb_teacher_notes WHERE user_id=$1 AND resource_key=$2',[user.id,key]);
  return reply(r.rows[0]||{notes:{},revision:0});
 }
 if(request.method!=='PUT')return reply({error:'Método não permitido.'},405);
 let body;
 try {
  // Bound streamed input, including requests without Content-Length.
  const reader=request.body?.getReader();let size=0;const chunks=[];
  if(reader)while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>524288){await reader.cancel();throw Error();}chunks.push(value);}
  body=JSON.parse(await new Blob(chunks).text());
  if(!Number.isInteger(body.revision)||body.revision<0||!body.notes||typeof body.notes!=='object'||Array.isArray(body.notes)||Object.keys(body.notes).length>2000)throw Error();
  for(const [k,v]of Object.entries(body.notes))if(!/^[\w:. -]{1,160}$/.test(k)||typeof v!=='string'||v.length>60000)throw Error();
 }catch{return reply({error:'Anotações inválidas ou acima do limite (512 KB).'},400);}
 const r=body.revision===0
  ?await client.query('INSERT INTO public.ceb_teacher_notes(user_id,resource_key,notes) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING RETURNING revision',[user.id,key,JSON.stringify(body.notes)])
  :await client.query('UPDATE public.ceb_teacher_notes SET notes=$3::jsonb,revision=revision+1,updated_at=now() WHERE user_id=$1 AND resource_key=$2 AND revision=$4 RETURNING revision',[user.id,key,JSON.stringify(body.notes),body.revision]);
 if(!r.rows.length)return reply({error:'As anotações foram atualizadas em outra janela. Copie seu texto e reabra o material antes de salvar.'},409);
 return reply({revision:r.rows[0].revision});
}
