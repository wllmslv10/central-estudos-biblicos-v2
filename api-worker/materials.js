import { objectStore, storageReady } from './storage.js';
const MAX_FILE = 20 * 1024 * 1024;
const MAX_REQUEST = MAX_FILE + 1100000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const columns = 'm.id, m.owner_user_id, m.title, m.filename, m.mime_type, m.byte_size, m.extracted_text, m.kind, m.scope, m.applied, m.applied_date::text AS applied_date, m.deleted_at, m.created_at, m.updated_at, f.name AS folder';
const access = "(m.owner_user_id = $1 OR ($2::boolean AND m.scope = 'general'))";
export const canAccessMaterial = (user, row) => row.owner_user_id === user.id || (user.app_role === 'admin' && row.scope === 'general');
export function validApplicationDate(value) {
  return value === '' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value);
}
export function validateOriginal(file, bytes) {
  if (!file || typeof file.name !== 'string' || !bytes.byteLength || bytes.byteLength > MAX_FILE) throw new Error('Arquivo vazio ou acima do limite de 20 MB.');
  const ext = file.name.toLowerCase().split('.').pop();
  if (!['pdf','docx','pptx','html','htm'].includes(ext)) throw new Error('Formato não permitido.');
  if (ext === 'pdf' && new TextDecoder().decode(bytes.slice(0,5)) !== '%PDF-') throw new Error('O arquivo não contém um PDF válido.');
  if (['docx','pptx'].includes(ext) && !(bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4)) throw new Error('O documento Office não contém um arquivo ZIP válido.');
  return ({ pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', html: 'text/html', htm: 'text/html' })[ext];
}
async function boundedRequest(request, limit) {
  if (Number(request.headers.get('Content-Length') || 0) > limit) throw new Error('Arquivo ou metadados acima do limite permitido.');
  const reader = request.body?.getReader();
  const chunks = []; let size = 0;
  if (reader) while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); throw new Error('Arquivo ou metadados acima do limite permitido.'); }
    chunks.push(value);
  }
  return new Response(new Blob(chunks), { headers: { 'Content-Type': request.headers.get('Content-Type') || '' } });
}
export async function materialRoute(request, env, url, client, user, json, origin, storageFactory = objectStore) {
  const reply = (data,status = 200) => json(data,status,origin);
  const path = url.pathname;
  const isAdmin = user.app_role === 'admin';
  if (path === '/library/capabilities' && request.method === 'GET') {
    const check = await client.query("SELECT to_regclass('public.ceb_materials') IS NOT NULL AS ready");
    return reply({ uploads: env.CEB_UPLOADS_ENABLED === 'true' && storageReady(env) && check.rows[0]?.ready === true, max_file_bytes: MAX_FILE });
  }
  if (path === '/library/folders' && request.method === 'GET') {
    const result = await client.query("SELECT id, name, scope, owner_user_id FROM public.ceb_folders WHERE owner_user_id = $1 OR ($2::boolean AND scope = 'general') ORDER BY name",[user.id,isAdmin]);
    return reply({ folders: result.rows });
  }
  if (path === '/library/folders' && request.method === 'POST') {
    let body;
    try { body = await (await boundedRequest(request,4096)).json(); } catch { return reply({ error:'Nome da pasta inválido.' },400); }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 80 || /[\x00-\x1f\\/]/.test(name)) return reply({ error:'Informe um nome de pasta com até 80 caracteres, sem barras.' },400);
    const scope = isAdmin && body.scope === 'general' ? 'general' : 'private';
    const result = await client.query(`INSERT INTO public.ceb_folders(owner_user_id,name,scope) VALUES($1,$2,$3)
      ON CONFLICT(owner_user_id,name) DO UPDATE SET name=EXCLUDED.name RETURNING id,name,scope,owner_user_id`,[user.id,name,scope]);
    return reply({ folder: result.rows[0] },201);
  }
  if (path === '/library/materials' && request.method === 'GET') {
    const trash = url.searchParams.get('trash') === '1';
    const result = await client.query(`SELECT ${columns} FROM public.ceb_materials m LEFT JOIN public.ceb_folders f ON f.id=m.folder_id WHERE ${access} AND m.deleted_at IS ${trash ? 'NOT ' : ''}NULL ORDER BY m.updated_at DESC`,[user.id,isAdmin]);
    return reply({ materials: result.rows });
  }
  if (path === '/library/materials' && request.method === 'POST') {
    if (env.CEB_UPLOADS_ENABLED !== 'true') return reply({ error:'A importação aguarda validação do armazenamento na nuvem. Nenhum material foi salvo.' },503);
    if (env.CEB_RUNTIME === 'validation' && !/^cebtest_[0-9]{1,14}_[0-9]{1,3}_(a1|a2|s1)$/.test(user.username || '')) {
      return reply({ error:'Somente contas técnicas podem importar no ambiente de validação.' },403);
    }
    if (!storageReady(env)) return reply({ error:'O armazenamento privado ainda não está configurado. Nenhum material foi salvo.' },503);
    let data, file, bytes, meta, mime;
    try {
      data = await (await boundedRequest(request,MAX_REQUEST)).formData();
      file = data.get('file');
      if (!file || typeof file.arrayBuffer !== 'function') throw new Error('Selecione o arquivo original.');
      bytes = new Uint8Array(await file.arrayBuffer()); mime = validateOriginal(file,bytes);
      const raw = data.get('metadata');
      if (typeof raw !== 'string' || raw.length > 1000000) throw new Error('Metadados inválidos ou muito grandes.');
      meta = JSON.parse(raw);
      if (!meta || typeof meta !== 'object' || typeof meta.title !== 'string' || !meta.title.trim() || meta.title.length > 240 || !['estudo','esboco'].includes(meta.kind) || typeof meta.text !== 'string' || meta.text.length > 900000) throw new Error('Título, categoria ou texto inválidos.');
    } catch (error) { return reply({ error:error.message || 'Não foi possível ler o arquivo.' },400); }
    const scope = isAdmin && meta.scope === 'general' ? 'general' : 'private';
    let folderId = null;
    if (meta.folder) {
      const f = await client.query('SELECT id, scope FROM public.ceb_folders WHERE owner_user_id=$1 AND name=$2',[user.id,meta.folder]);
      if (!f.rowCount || (f.rows[0].scope === 'private' && scope === 'general')) return reply({ error:'Selecione uma pasta própria compatível com a privacidade do material.' },400);
      folderId = f.rows[0].id;
    }
    const id = crypto.randomUUID(); const key = `materials/${user.id}/${id}/original`;
    const checksum = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
    const filename = file.name.replace(/[\x00-\x1f\x7f\\/]/g,'_').slice(0,240);
    const storage = storageFactory(env);
    await storage.put(key,bytes);
    try {
      const result = await client.query(`INSERT INTO public.ceb_materials(id,owner_user_id,folder_id,title,filename,mime_type,byte_size,object_key,sha256,extracted_text,kind,scope)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,[id,user.id,folderId,meta.title.trim(),filename,mime,bytes.byteLength,key,checksum,meta.text,meta.kind,scope]);
      const created = await client.query(`SELECT ${columns} FROM public.ceb_materials m LEFT JOIN public.ceb_folders f ON f.id=m.folder_id WHERE m.id=$1`,[result.rows[0].id]);
      return reply({ material:created.rows[0] },201);
    } catch(error) {
      // A committed insert must never lose its original because a later SELECT failed.
      const exists = await client.query('SELECT id FROM public.ceb_materials WHERE id=$1',[id]).catch(()=>null);
      if (exists && !exists.rowCount) await storage.remove(key).catch(()=>console.error('CEB: objeto órfão pendente de limpeza',id));
      throw error;
    }
  }
  const match = path.match(/^\/library\/materials\/([^/]+)(?:\/(download|restore))?$/);
  if (!match || !UUID.test(match[1])) return reply({ error:'Rota ou identificador inválido.' },404);
  const [,id,action] = match;
  // Lock while deciding and changing permissions/state: another admin cannot race the check.
  await client.query('BEGIN');
  try {
    const result = await client.query('SELECT * FROM public.ceb_materials WHERE id=$1 FOR UPDATE',[id]);
    const row = result.rows[0];
    if (!row || !canAccessMaterial(user,row)) { await client.query('ROLLBACK'); return reply({ error:'Material não encontrado ou acesso negado.' },404); }
    if (action === 'download' && request.method === 'GET' && !row.deleted_at) {
      const original = await storageFactory(env).get(row.object_key);
      await client.query('COMMIT');
      // HTML is always an attachment, never an executable page on the API origin.
      return new Response(original.body,{ headers:{
        'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="material"; filename*=UTF-8''${encodeURIComponent(row.filename).replace(/'/g,'%27')}`,
        'Content-Security-Policy':"sandbox; default-src 'none'",'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store',
        ...(origin === 'https://wllmslv10.github.io' ? { 'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Expose-Headers':'Content-Disposition' } : {}),
      }});
    }
    if (!action && request.method === 'DELETE') {
      await client.query('UPDATE public.ceb_materials SET deleted_at=COALESCE(deleted_at,NOW()),updated_at=NOW() WHERE id=$1',[id]);
      await client.query('COMMIT'); return reply({ ok:true });
    }
    if (action === 'restore' && request.method === 'POST') {
      await client.query('UPDATE public.ceb_materials SET deleted_at=NULL,updated_at=NOW() WHERE id=$1',[id]);
      await client.query('COMMIT'); return reply({ ok:true });
    }
    if (!action && request.method === 'PATCH' && !row.deleted_at) {
      let body;
      try { body = await (await boundedRequest(request,4096)).json(); } catch { await client.query('ROLLBACK'); return reply({ error:'Dados inválidos.' },400); }
      if (typeof body.applied !== 'boolean' || !validApplicationDate(body.applied_date || '')) { await client.query('ROLLBACK'); return reply({ error:'Marcação ou data inválida.' },400); }
      await client.query('UPDATE public.ceb_materials SET applied=$1,applied_date=$2,updated_at=NOW() WHERE id=$3',[body.applied,body.applied ? body.applied_date || null : null,id]);
      await client.query('COMMIT'); return reply({ ok:true });
    }
    await client.query('ROLLBACK'); return reply({ error:'Operação não disponível.' },405);
  } catch(error) { await client.query('ROLLBACK').catch(()=>{}); throw error; }
}
