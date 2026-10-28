import { hashPassword } from './auth.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fields='id,username,display_name,app_role,is_active,given_name,surname,date_of_birth,profile_revision,password_admin_managed,must_change_password';
export function validStudentPassword(value) { return typeof value==='string' && value.length>=8 && value.length<=128 && /\S/u.test(value) && !/[\x00-\x1f\x7f]/.test(value); }
export function validateStudent(body,creating=false) {
 if(!body||typeof body.given_name!=='string'||!body.given_name.trim()||body.given_name.trim().length>120)throw Error('Informe o nome do aluno (até 120 caracteres).');
 if(typeof body.surname!=='string'||body.surname.trim().length>80)throw Error('Sobrenome inválido.');
 if(typeof body.username!=='string'||!/^[A-Za-z0-9._-]{3,32}$/.test(body.username.trim()))throw Error('Login: 3–32 letras, números, ponto, hífen ou sublinhado.');
 if(typeof body.is_active!=='boolean'||(!creating&&!Number.isInteger(body.profile_revision)))throw Error('Situação ou revisão inválida.');
 if(body.password!==undefined && !validStudentPassword(body.password))throw Error('A senha definitiva deve ter entre 8 e 128 caracteres, sem caracteres de controle.');
 if(creating && body.password===undefined)throw Error('O administrador deve definir a senha.');
 let birth=null;
 if(body.date_of_birth!==null && body.date_of_birth!==undefined && body.date_of_birth!=='') {
  if(typeof body.date_of_birth!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.date_of_birth))throw Error('Data de nascimento inválida.');
  const d=new Date(body.date_of_birth+'T00:00:00Z');
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==body.date_of_birth||body.date_of_birth<'1900-01-01'||body.date_of_birth>new Date().toISOString().slice(0,10))throw Error('Informe uma data de nascimento válida, sem data futura.');
  birth=body.date_of_birth;
 }
 const given=body.given_name.trim(),surname=body.surname.trim(),display=[given,surname].filter(Boolean).join(' ');
 if(display.length>120)throw Error('Nome completo deve ter até 120 caracteres.');
 return {given,surname,display,birth,username:body.username.trim(),active:body.is_active};
}
export async function studentsRoute(request,url,client,admin,json,origin) {
 if(admin.app_role!=='admin'||admin.must_change_password)return json({error:'Acesso restrito ao administrador autorizado.'},403,origin);
 const match=url.pathname.match(/^\/admin\/students(?:\/([^/]+))?$/);if(!match)return json({error:'Rota inválida.'},404,origin);
 const id=match[1];if(id&&!UUID.test(id))return json({error:'Aluno inválido.'},400,origin);
 if(request.method==='GET'&&!id) {
  const r=await client.query(`SELECT ${fields} FROM public.ceb_users WHERE app_role='user' AND username IS NOT NULL ORDER BY display_name`);
  return json({students:r.rows},200,origin);
 }
 const creating=!id&&request.method==='POST',deactivate=!!id&&request.method==='DELETE';
 if(!creating&&!deactivate&&!(id&&request.method==='PUT'))return json({error:'Método não permitido.'},405,origin);
 let body={};
 if(!deactivate) {const raw=await request.text();if(new TextEncoder().encode(raw).length>12000)return json({error:'Formulário muito grande.'},413,origin);try{body=JSON.parse(raw);}catch{return json({error:'JSON inválido.'},400,origin);}}
 let data;
 if(!deactivate)try{data=validateStudent(body,creating);}catch(e){return json({error:e.message},400,origin);}
 const passwordHash=body.password!==undefined?await hashPassword(body.password):null;
 await client.query('BEGIN');
 try {
  let before;
  if(id) {before=(await client.query(`SELECT ${fields} FROM public.ceb_users WHERE id=$1 AND app_role='user' FOR UPDATE`,[id])).rows[0];if(!before){await client.query('ROLLBACK');return json({error:'Aluno não encontrado. Contas administrativas não podem ser modificadas nesta seção.'},404,origin);}}
  if(before&&!deactivate&&before.profile_revision!==body.profile_revision){await client.query('ROLLBACK');return json({error:'Matrícula alterada em outra janela. Reabra antes de salvar.'},409,origin);}
  let student;
  if(creating)student=(await client.query(`INSERT INTO public.ceb_users(username,display_name,given_name,surname,date_of_birth,password_hash,app_role,is_active,must_change_password,password_admin_managed) VALUES($1,$2,$3,$4,$5,$6,'user',$7,FALSE,TRUE) RETURNING ${fields}`,[data.username,data.display,data.given,data.surname,data.birth,passwordHash,data.active])).rows[0];
  else if(deactivate)student=(await client.query(`UPDATE public.ceb_users SET is_active=FALSE,profile_revision=profile_revision+1,updated_at=now() WHERE id=$1 AND app_role='user' RETURNING ${fields}`,[id])).rows[0];
  else student=(await client.query(`UPDATE public.ceb_users SET username=$1,display_name=$2,given_name=$3,surname=$4,date_of_birth=$5,is_active=$6,profile_revision=profile_revision+1,updated_at=now(),password_hash=COALESCE($7,password_hash),must_change_password=CASE WHEN $7::text IS NOT NULL THEN FALSE ELSE must_change_password END,password_admin_managed=CASE WHEN $7::text IS NOT NULL THEN TRUE ELSE password_admin_managed END WHERE id=$8 AND app_role='user' RETURNING ${fields}`,[data.username,data.display,data.given,data.surname,data.birth,data.active,passwordHash,id])).rows[0];
  // Deactivation, reset and login changes revoke sessions; the account ID/history stays.
  if(id&&(deactivate||passwordHash||before.username!==student.username||!student.is_active))await client.query('UPDATE public.ceb_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[id]);
  const changed=deactivate?['is_active']:['given_name','surname','username','date_of_birth','is_active',...(passwordHash?['password']:[])];
  await client.query('INSERT INTO public.ceb_student_audit(student_id,actor_id,action,changed_fields) VALUES($1,$2,$3,$4::jsonb)',[student.id,admin.id,creating?'create':deactivate?'deactivate':passwordHash?'password_reset':'update',JSON.stringify(changed)]);
  await client.query('COMMIT');return json({student},creating?201:200,origin);
 }catch(e){await client.query('ROLLBACK');if(e.code==='23505')return json({error:'Este nome de usuário já está em uso.'},409,origin);throw e;}
}
