import { hashPassword } from './auth.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const enrolled = "(app_role='user' OR password_admin_managed)";
const fields = 'id,username,display_name,app_role,is_active,given_name,surname,date_of_birth,phone,sex,profile_revision,password_admin_managed,must_change_password,is_primary_admin';
const linkedMessage = 'Esta matrícula possui vínculos com materiais, questionários ou históricos. Desative a conta para preservar essas informações.';

export function validStudentPassword(value) {
  return typeof value === 'string' && /^\d{6}$/.test(value);
}

export function validateStudent(body, creating = false) {
  if (!body || typeof body.given_name !== 'string' || !body.given_name.trim() || body.given_name.trim().length > 120) throw Error('Informe o nome do aluno (até 120 caracteres).');
  if (typeof body.surname !== 'string' || body.surname.trim().length > 80) throw Error('Sobrenome inválido.');
  if (typeof body.username !== 'string' || !/^[A-Za-z0-9._-]{3,32}$/.test(body.username.trim())) throw Error('Login: 3–32 letras, números, ponto, hífen ou sublinhado.');
  if (typeof body.is_active !== 'boolean' || (!creating && !Number.isInteger(body.profile_revision))) throw Error('Situação ou revisão inválida.');
  if (body.password !== undefined && !validStudentPassword(body.password)) throw Error('A senha definitiva deve ter exatamente seis números.');
  if (creating && body.password === undefined) throw Error('O administrador deve definir a senha.');
  if (body.administrator !== undefined && typeof body.administrator !== 'boolean') throw Error('Permissão administrativa inválida.');
  if (body.phone != null && (typeof body.phone !== 'string' || !/^[0-9+(). -]{0,32}$/.test(body.phone.trim()))) throw Error('Telefone inválido.');
  if (body.sex != null && !['female', 'male', 'unspecified'].includes(body.sex)) throw Error('Sexo inválido.');
  let birth = null;
  if (body.date_of_birth != null && body.date_of_birth !== '') {
    if (typeof body.date_of_birth !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date_of_birth)) throw Error('Data de nascimento inválida.');
    const d = new Date(body.date_of_birth + 'T00:00:00Z');
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0,10) !== body.date_of_birth || body.date_of_birth < '1900-01-01' || body.date_of_birth > new Date().toISOString().slice(0,10)) throw Error('Informe uma data de nascimento válida, sem data futura.');
    birth = body.date_of_birth;
  }
  const given = body.given_name.trim();
  const surname = body.surname.trim();
  const display = [given, surname].filter(Boolean).join(' ');
  if (display.length > 120) throw Error('Nome completo deve ter até 120 caracteres.');
  return { given, surname, display, birth, username: body.username.trim(), active: body.is_active, phone: body.phone?.trim() || null, sex: body.sex ?? null };
}

function birthPassword(birth) {
  return birth ? birth.slice(8,10) + birth.slice(5,7) + birth.slice(2,4) : null;
}

export async function studentsRoute(request, url, client, admin, json, origin) {
  const error = (message, status) => json({ error: message }, status, origin);
  if (admin.app_role !== 'admin' || admin.must_change_password) return error('Acesso restrito ao administrador autorizado.', 403);
  const match = url.pathname.match(/^\/admin\/students(?:\/([^/]+)(?:\/(deactivate|permanent))?)?$/);
  if (!match) return error('Rota inválida.', 404);
  const [, id, action] = match;
  if (id && !UUID.test(id)) return error('Aluno inválido.', 400);
  if (request.method === 'GET' && !id) {
    const result = await client.query(`SELECT ${fields} FROM public.ceb_users WHERE ${enrolled} AND username IS NOT NULL ORDER BY display_name`);
    return json({ students: result.rows }, 200, origin);
  }
  const creating = !id && request.method === 'POST';
  const editing = id && !action && request.method === 'PUT';
  const deactivating = id && ((!action && request.method === 'DELETE') || (action === 'deactivate' && request.method === 'POST'));
  const deleting = id && action === 'permanent' && request.method === 'DELETE';
  if (!creating && !editing && !deactivating && !deleting) return error('Método não permitido.', 405);

  let body = {};
  if (!deactivating) {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 12000) return error('Formulário muito grande.', 413);
    try { body = JSON.parse(raw); } catch { return error('JSON inválido.', 400); }
  }
  let data;
  if (creating || editing) {
    try { data = validateStudent(body, creating); } catch (e) { return error(e.message, 400); }
  }
  if (deleting && body?.confirmation !== id) return error('Confirme explicitamente a exclusão definitiva.', 400);
  const passwordHash = data && body.password !== undefined ? await hashPassword(body.password) : null;

  await client.query('BEGIN');
  const reject = async (message, status) => {
    await client.query('ROLLBACK');
    return error(message, status);
  };
  try {
    const locked = (await client.query(`SELECT ${fields} FROM public.ceb_users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE`, [id ? [admin.id, id] : [admin.id]])).rows;
    const actor = locked.find(row => row.id === admin.id);
    if (actor?.app_role !== 'admin' || !actor.is_active || actor.must_change_password) return await reject('Acesso restrito ao administrador autorizado.', 403);
    const before = locked.find(row => row.id === id);
    if (id && (!before || (before.app_role !== 'user' && !before.password_admin_managed))) return await reject('Aluno não encontrado.', 404);
    if (before?.is_primary_admin) return await reject('A conta administrativa principal é protegida.', 403);
    if (editing && before.profile_revision !== body.profile_revision) return await reject('Matrícula alterada em outra janela. Reabra antes de salvar.', 409);
    const administrator = body.administrator ?? (before?.app_role === 'admin');
    const role = administrator ? 'admin' : 'user';
    const promoting = administrator && before?.app_role !== 'admin';
    if (id === admin.id && (deactivating || deleting || !data?.active || !administrator || passwordHash)) {
      return await reject('Peça a outro administrador para alterar seu acesso ou redefinir sua senha.', 403);
    }
    if (promoting && !passwordHash) return await reject('Defina uma nova senha de seis números para conceder acesso de administrador.', 400);
    if (administrator && passwordHash && body.password === birthPassword(data.birth)) return await reject('Para conceder ou manter acesso de administrador, escolha uma senha diferente da data de nascimento.', 400);

    if (deleting) {
      const sharing = await client.query("SELECT 1 FROM public.ceb_studies WHERE content->'sharing'->>'enabled'='true' AND content->'sharing'->'userIds' ? ($1::text) LIMIT 1", [id]);
      if (sharing.rows.length) return await reject(linkedMessage, 409);
      await client.query('DELETE FROM public.ceb_users WHERE id=$1', [id]);
      await client.query("INSERT INTO public.ceb_student_audit(student_id,actor_id,action,changed_fields) VALUES($1,$2,'delete','[]'::jsonb)", [id, admin.id]);
      await client.query('COMMIT');
      return json({ deleted: id }, 200, origin);
    }

    let student;
    if (creating) {
      student = (await client.query(`INSERT INTO public.ceb_users(username,display_name,given_name,surname,date_of_birth,phone,sex,password_hash,app_role,is_active,must_change_password,password_admin_managed) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,FALSE,TRUE) RETURNING ${fields}`,
        [data.username,data.display,data.given,data.surname,data.birth,data.phone,data.sex,passwordHash,role,data.active])).rows[0];
    } else if (deactivating) {
      student = (await client.query(`UPDATE public.ceb_users SET is_active=FALSE,profile_revision=profile_revision+1,updated_at=now() WHERE id=$1 RETURNING ${fields}`, [id])).rows[0];
    } else {
      student = (await client.query(`UPDATE public.ceb_users SET username=$1,display_name=$2,given_name=$3,surname=$4,date_of_birth=$5,phone=$6,sex=$7,is_active=$8,app_role=$9,profile_revision=profile_revision+1,updated_at=now(),password_hash=COALESCE($10,password_hash),must_change_password=CASE WHEN $10::text IS NOT NULL THEN FALSE ELSE must_change_password END,password_admin_managed=CASE WHEN $10::text IS NOT NULL THEN TRUE ELSE password_admin_managed END WHERE id=$11 RETURNING ${fields}`,
        [data.username,data.display,data.given,data.surname,data.birth,data.phone,data.sex,data.active,role,passwordHash,id])).rows[0];
    }

    const permissionChanged = before && before.app_role !== student.app_role;
    if (before && (passwordHash || permissionChanged || before.username !== student.username || !student.is_active)) {
      await client.query('UPDATE public.ceb_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [id]);
    }
    const changed = deactivating ? ['is_active'] : ['given_name','surname','username','date_of_birth','phone','sex','is_active',...(passwordHash ? ['password'] : []),...(permissionChanged || (creating && administrator) ? ['app_role'] : [])];
    await client.query('INSERT INTO public.ceb_student_audit(student_id,actor_id,action,changed_fields) VALUES($1,$2,$3,$4::jsonb)',
      [student.id,admin.id,creating ? 'create' : deactivating ? 'deactivate' : passwordHash ? 'password_reset' : 'update',JSON.stringify(changed)]);
    await client.query('COMMIT');
    return json({ student }, creating ? 201 : 200, origin);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return error('Este nome de usuário já está em uso.', 409);
    if (deleting && e.code === '23503') return error(linkedMessage, 409);
    throw e;
  }
}
