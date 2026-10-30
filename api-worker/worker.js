import { originalRoute, validateBundle } from './originals.js';
import { trashRoute } from './trash.js';
import { readOnly, permitsRequest } from "./contingency.js";
import { studentStudy } from './student-lesson.js';
import { validApplicationDate, materialRoute } from "./materials.js";
import pg from "pg";
import { quizRoute } from "./quizzes.js";
import { studentsRoute } from "./students.js";
import { aiUsageStatus } from "./quiz-ai.js";
import {
  hashPassword,
  verifyPassword,
  newSessionToken,
  hashSessionToken,
  sessionExpiry,
} from "./auth.js";

const { Client } = pg;
const ALLOWED_ORIGIN = "https://wllmslv10.github.io";
const SESSION_COOKIE = "ceb_session";
const MAX_BODY_BYTES = 16_384;
const LOGIN_WINDOW_MINUTES = 15;
const MAX_LOGIN_ATTEMPTS = 8;

function json(data, status = 200, origin = "", extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  };
  if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Vary"] = "Origin";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function cookie(token, maxAge) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=${maxAge}`;
}

function clearCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`;
}

function getToken(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  if (match) return match[1];
  const auth = request.headers.get("Authorization") || "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
}

async function readBody(request) {
  const declared = Number(request.headers.get("Content-Length") || 0);
  if (declared > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  try { return JSON.parse(text); } catch { throw new Error("INVALID_JSON"); }
}

function validUsername(username) {
  return typeof username === "string" && /^[A-Za-z0-9._-]{3,32}$/.test(username);
}

function validPassword(password) {
  return typeof password === "string" && /^[a-z0-9]{6}$/.test(password);
}

async function db(env) {
  if (!env.HYPERDRIVE?.connectionString) throw new Error("DATABASE_NOT_CONFIGURED");
  const client = new Client({
    connectionString: env.HYPERDRIVE.connectionString,
    connectionTimeoutMillis: 5000,
    query_timeout: 8000,
    application_name: "ceb-biblioteca-api",
  });
  await client.connect();
  return client;
}

async function currentUser(client, request) {
  const token = getToken(request);
  if (!token || token.length > 200) return null;
  const tokenHash = await hashSessionToken(token);
  const result = await client.query(
    `SELECT u.id, u.username, u.display_name, u.app_role, u.must_change_password, u.password_admin_managed, u.password_hash
       FROM public.ceb_sessions s
       JOIN public.ceb_users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > NOW()
        AND u.is_active = TRUE
      LIMIT 1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.app_role,
    must_change_password: user.must_change_password,
    password_admin_managed: !!user.password_admin_managed,
  };
}

async function route(request, env, origin, url) {
  if (url.pathname === "/" && request.method === "GET") {
    return json({ api: "CEB - Central de Estudos Bíblicos", status: "online", version: "0.3.0-auth" }, 200, origin);
  }

  if (url.pathname === "/health" && request.method === "GET") {
    let client;
    try {
      client = await db(env);
      const result = await client.query(`
        SELECT NOW() AS horario,
          to_regclass('public.ceb_users') IS NOT NULL AS tabela_usuarios,
          to_regclass('public.ceb_studies') IS NOT NULL AS tabela_estudos,
          to_regclass('public.ceb_sessions') IS NOT NULL AS tabela_sessoes,
          to_regclass('public.ceb_login_attempts') IS NOT NULL AS tabela_tentativas
      `);
      const row = result.rows[0];
      return json({
        api: "online", database: "conectado",
        writes_blocked: readOnly(env),
        tabelas: {
          usuarios: row.tabela_usuarios, estudos: row.tabela_estudos,
          sessoes: row.tabela_sessoes, tentativas_login: row.tabela_tentativas,
        },
        horario: row.horario,
      }, 200, origin);
    } catch (error) {
      console.error("Health check falhou:", error.message);
      return json({ api: "online", database: "indisponível", error: "Banco ou migrações indisponíveis." }, 503, origin);
    } finally {
      if (client) try { await client.end(); } catch {}
    }
  }

  // Permitir que as rotas administrativas abaixo alcancem suas verificações de sessão e papel.
  const authRoute = url.pathname.startsWith("/auth/");
  const adminRoute = url.pathname.startsWith("/admin/students") || url.pathname === "/admin/ai-usage" || url.pathname === "/admin/bootstrap" || url.pathname === "/admin/users" || url.pathname.startsWith("/admin/users/");
  const libraryRoute = url.pathname.startsWith("/library/");
  const studyRoute = url.pathname === "/studies" || url.pathname.startsWith("/studies/");
  if (!authRoute && !adminRoute && !studyRoute && !libraryRoute) return json({ error: "Rota não encontrada." }, 404, origin);

  let client;
  try {
    client = await db(env);


    if (url.pathname.startsWith('/admin/students') || url.pathname === '/admin/ai-usage') {
      const admin = await currentUser(client, request);
      if (!admin) return json({error:'Sessão inválida ou expirada.'},401,origin);
      if (admin.app_role !== 'admin' || admin.must_change_password) return json({error:'Acesso restrito ao administrador.'},403,origin);
      if (url.pathname === '/admin/ai-usage') {
        if (request.method !== 'GET') return json({error:'Método não permitido.'},405,origin);
        return json(await aiUsageStatus(client,env),200,origin);
      }
      return await studentsRoute(request,url,client,admin,json,origin);
    }
    if (libraryRoute) {
      const user = await currentUser(client, request);
      if (!user) return json({ error: "Sessão inválida ou expirada." }, 401, origin);
      if (user.must_change_password) return json({ error: "Troque sua senha antes de acessar a biblioteca." }, 403, origin);
      if (url.pathname === '/library/applied' || url.pathname.startsWith('/library/originals/')) return await originalRoute(request,env,url,client,user,json,origin);
      if (url.pathname === '/library/trash') return await trashRoute(request,env,url,client,user,json,origin);
      return await materialRoute(request, env, url, client, user, json, origin);
    }

    if (studyRoute) {
      const user = await currentUser(client, request);
      if (!user) return json({ error: "Sessão inválida ou expirada." }, 401, origin);
      if (user.must_change_password) return json({ error: "Troque sua senha antes de acessar os estudos." }, 403, origin);
      if (/^\/studies\/[^/]+\/quiz(?:\/|$)/.test(url.pathname)) {
        return await quizRoute(request, env, url, client, user, json, origin);
      }
      // CEB: admins see all general materials; private folders remain owner-only.
      // Students retain access to their own materials; trash/restore require an authorized admin.
      const isAdmin = user.app_role === "admin";
      const privateFolder = (content) => content?.libraryScope === "private" || content?.libraryScope === "particular";
      if (url.pathname === "/studies" && request.method === "GET") {
        if (url.searchParams.get("trash") === "1" && !isAdmin) return json({error:"Lixeira restrita ao administrador."},403,origin);
        const result = await client.query(
          `SELECT id, owner_user_id, title, content, visibility, status, created_at, updated_at,
             EXISTS (SELECT 1 FROM public.ceb_quizzes available WHERE available.study_id=ceb_studies.id AND available.reviewed=TRUE AND NOT (available.definition ? '_libraryTrash')) AS quiz_available,
             CASE WHEN $2::boolean THEN
               (SELECT jsonb_build_object('reviewed', q.reviewed, 'questionCount', jsonb_array_length(q.definition->'questions'))
                  FROM public.ceb_quizzes q WHERE q.study_id = ceb_studies.id AND NOT (q.definition ? '_libraryTrash'))
             ELSE NULL END AS quiz_summary
             FROM public.ceb_studies
            WHERE deleted_at IS ${url.searchParams.get('trash') === '1' ? 'NOT ' : ''}NULL AND deleted_at IS DISTINCT FROM 'infinity'::timestamptz AND
             (($2::boolean AND (owner_user_id = $1 OR COALESCE(content->>'libraryScope', 'general') NOT IN ('private','particular')))
               OR (NOT $2::boolean AND (owner_user_id = $1 OR
                  (visibility = 'shared' AND status = 'published' AND
                   COALESCE(content->'sharing'->>'enabled','false') = 'true' AND
                   (COALESCE(content->'sharing'->>'audience','') = 'all' OR
                    (content->'sharing'->>'audience' = 'selected' AND content->'sharing'->'userIds' ? ($1::text)))))))
            ORDER BY updated_at DESC`,
          [user.id, isAdmin]
        );
        return json({ studies: isAdmin ? result.rows : result.rows.map(({quiz_summary, ...study}) => studentStudy(study)) }, 200, origin);
      }
      if (url.pathname === "/studies" && request.method === "POST") {
        const body = await readBody(request);
        const title = typeof body.title === "string" ? body.title.trim() : "";
        const content = body.content && typeof body.content === "object" && !Array.isArray(body.content) ? body.content : null;
        if (!title || title.length > 240 || !content) return json({ error: "Título e conteúdo válido são obrigatórios." }, 400, origin);
        const scope = isAdmin && !privateFolder(content) ? "general" : "private";
        try { await validateBundle(client,content,user); } catch(error) { return json({error:error.message},400,origin); }
        const savedContent = { ...content, libraryScope: scope };
        delete savedContent.sharing;
        const visibility = scope === "general" ? "shared" : "private";
        const status = body.status === "published" && isAdmin && scope === "general" ? "published" : "draft";
        const result = await client.query(
          `INSERT INTO public.ceb_studies (owner_user_id, title, content, visibility, status)
           VALUES ($1, $2, $3::jsonb, $4, $5)
           RETURNING id, owner_user_id, title, content, visibility, status, created_at, updated_at`,
          [user.id, title, JSON.stringify(savedContent), visibility, status]
        );
        return json({ study: result.rows[0] }, 201, origin);
      }
      const downloadMatch = url.pathname.match(/^\/studies\/([0-9a-f-]{36})\/download$/i);
      if (downloadMatch && request.method === "GET") {
        // Recheck current permissions on every download, including after revocation.
        const result = await client.query(`SELECT id, title, content FROM public.ceb_studies
          WHERE id = $1 AND deleted_at IS NULL AND
            (owner_user_id = $2 OR ($3::boolean AND COALESCE(content->>'libraryScope','general') NOT IN ('private','particular')) OR
             (visibility = 'shared' AND status = 'published' AND
              content->'sharing'->>'enabled' = 'true' AND content->'sharing'->>'allowDownload' = 'true' AND
              (content->'sharing'->>'audience' = 'all' OR
               (content->'sharing'->>'audience' = 'selected' AND content->'sharing'->'userIds' ? ($2::text)))))`,
          [downloadMatch[1], user.id, isAdmin]);
        return result.rows.length ? json({ study: isAdmin ? result.rows[0] : studentStudy(result.rows[0]) }, 200, origin)
          : json({ error: "Material indisponível ou download não autorizado." }, 404, origin);
      }
      // Compartilhamento administrado no servidor: não aceita permissões do cliente sem validação.
      const sharingMatch = url.pathname.match(/^\/studies\/([0-9a-f-]{36})\/sharing$/i);
      if (sharingMatch && request.method === "PUT") {
        if (!isAdmin) return json({ error: "Somente administradores podem compartilhar materiais." }, 403, origin);
        const body = await readBody(request);
        const audience = body.audience;
        const ids = body.userIds;
        if (typeof body.enabled !== "boolean" || !["all","selected"].includes(audience) ||
            !Array.isArray(ids) || ids.length > 200 ||
            ids.some(id => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))) {
          return json({ error: "Configuração de compartilhamento inválida." }, 400, origin);
        }
        if (typeof body.allowDownload !== "boolean") return json({ error: "Permissão de download inválida." }, 400, origin);
        const uniqueIds = [...new Set(ids)];
        if (body.enabled && audience === "selected" && !uniqueIds.length) return json({ error: "Selecione pelo menos um aluno." }, 400, origin);
        const validUsers = body.enabled && audience === "selected"
          ? await client.query("SELECT id FROM public.ceb_users WHERE id::text = ANY($1::text[]) AND app_role = 'user' AND is_active = TRUE", [uniqueIds])
          : { rowCount: uniqueIds.length };
        if (validUsers.rowCount !== uniqueIds.length) return json({ error: "Há alunos inválidos ou inativos na seleção." }, 400, origin);
        if (body.quizEnabled !== undefined && typeof body.quizEnabled !== "boolean") return json({error:"Permissão de questionário inválida."},400,origin);
        if (body.enabled && body.quizEnabled === true) {
          const ready = await client.query("SELECT id FROM public.ceb_quizzes WHERE study_id=$1 AND reviewed=TRUE AND NOT (definition ? '_libraryTrash')", [sharingMatch[1]]);
          if (!ready.rows.length) return json({error:"Salve e revise o questionário antes de disponibilizá-lo."},400,origin);
        }
        const sharing = { ...(body.quizEnabled === undefined ? {} : {quizEnabled:body.quizEnabled}), enabled: body.enabled, audience, userIds: audience === "selected" ? uniqueIds : [], allowDownload: body.allowDownload };
        const updated = await client.query(
          `UPDATE public.ceb_studies SET content = jsonb_set(content, '{sharing}', COALESCE(content->'sharing','{}'::jsonb) || $1::jsonb, true),
             visibility = CASE WHEN $2::boolean THEN 'shared' ELSE visibility END,
             status = CASE WHEN $2::boolean THEN 'published' ELSE status END,
             updated_at = NOW()
           WHERE id = $3 AND deleted_at IS NULL AND owner_user_id = $4
           RETURNING id, content, visibility, status`,
          [JSON.stringify(sharing), body.enabled, sharingMatch[1], user.id]
        );
        return json(updated.rowCount ? { study: updated.rows[0] } : { error: "Material inexistente ou não pertence a este administrador." }, updated.rowCount ? 200 : 404, origin);
      }
      const restoring = request.method === "POST" && url.pathname.endsWith("/restore");
      const id = url.pathname.startsWith("/studies/") ? url.pathname.slice("/studies/".length).replace(/\/restore$/, "") : "";
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Identificador inválido." }, 400, origin);
      // Role comes from the authenticated session, never the request body.
      if ((request.method === "DELETE" || restoring) && !isAdmin) {
        return json({ error: "Exclusão e restauração são restritas ao administrador autorizado." }, 403, origin);
      }
      if (request.method === "PUT" || request.method === "PATCH" || request.method === "DELETE" || restoring) {
        const existing = await client.query(
          "SELECT owner_user_id, content, deleted_at, deleted_at::text AS trash_stamp FROM public.ceb_studies WHERE id = $1", [id]
        );
        if (!existing.rowCount) return json({ error: "Estudo não encontrado." }, 404, origin);
        const record = existing.rows[0];
        const owner = record.owner_user_id === user.id;
        const allowed = owner || (isAdmin && !privateFolder(record.content));
        if (!allowed) return json({ error: "Acesso negado a material particular." }, 403, origin);
        if (['infinity','-infinity'].includes(record.trash_stamp)) return json({error:'Material excluído definitivamente ou em exclusão. Restauração bloqueada.'},409,origin);
        if (request.method === "PATCH") {
          const body = await readBody(request);
          if (typeof body.applied !== "boolean" || !validApplicationDate(body.applied_date || "")) return json({ error: "Marcação ou data inválida." }, 400, origin);
          const result = await client.query(`UPDATE public.ceb_studies SET content = content || $1::jsonb, updated_at = NOW()
            WHERE id = $2 AND deleted_at IS NULL AND (owner_user_id = $3 OR ($4::boolean AND COALESCE(content->>'libraryScope','general') NOT IN ('private','particular'))) RETURNING id`,
            [JSON.stringify({ applied: body.applied, appliedDate: body.applied ? body.applied_date || "" : "" }), id, user.id, isAdmin]);
          return json(result.rowCount ? { ok: true } : { error: "Material indisponível." }, result.rowCount ? 200 : 404, origin);
        }
        if (restoring) {
          const restored = await client.query("UPDATE public.ceb_studies SET deleted_at = NULL, updated_at = NOW() WHERE id = $1 AND deleted_at IS DISTINCT FROM 'infinity'::timestamptz AND deleted_at IS DISTINCT FROM '-infinity'::timestamptz AND (owner_user_id = $2 OR ($3::boolean AND COALESCE(content->>'libraryScope','general') NOT IN ('private','particular'))) RETURNING id", [id,user.id,isAdmin]);
          return json(restored.rowCount ? { ok: true } : { error: "Material indisponível ou sem permissão." }, restored.rowCount ? 200 : 404, origin);
        }
        if (request.method === "DELETE") {
          const deleted = await client.query("UPDATE public.ceb_studies SET deleted_at = COALESCE(deleted_at,NOW()), updated_at = NOW() WHERE id = $1 AND deleted_at IS DISTINCT FROM 'infinity'::timestamptz AND deleted_at IS DISTINCT FROM '-infinity'::timestamptz AND (owner_user_id = $2 OR ($3::boolean AND COALESCE(content->>'libraryScope','general') NOT IN ('private','particular'))) RETURNING id", [id,user.id,isAdmin]);
          return json({ ok: deleted.rowCount > 0 }, 200, origin);
        }
        const body = await readBody(request);
        const title = typeof body.title === "string" ? body.title.trim() : "";
        const content = body.content && typeof body.content === "object" && !Array.isArray(body.content) ? body.content : null;
        if (!title || title.length > 240 || !content) return json({ error: "Título e conteúdo válido são obrigatórios." }, 400, origin);
        const scope = isAdmin && !privateFolder(content) ? "general" : "private";
        // Only the owner may change a material's privacy classification.
        if (!owner && scope !== "general") return json({ error: "Só o proprietário pode tornar o material particular." }, 403, origin);
        try { await validateBundle(client,content,user); } catch(error) { return json({error:error.message},400,origin); }
        const savedContent = { ...content, libraryScope: scope };
        // Content edits cannot grant, revoke or overwrite sharing permissions.
        delete savedContent.sharing;
        if (record.content?.sharing !== undefined) savedContent.sharing = record.content.sharing;
        const visibility = scope === "general" ? "shared" : "private";
        const status = body.status === "published" && isAdmin && scope === "general" ? "published" : "draft";
        const updated = await client.query(
          `UPDATE public.ceb_studies
              SET title = $1, content = ($2::jsonb - 'sharing') ||
                  CASE WHEN content ? 'sharing' THEN jsonb_build_object('sharing', content->'sharing') ELSE '{}'::jsonb END,
                  visibility = $3, status = $4, updated_at = NOW()
            WHERE id = $5 AND deleted_at IS NULL AND (owner_user_id = $6 OR ($7::boolean AND COALESCE(content->>'libraryScope','general') NOT IN ('private','particular')))
            RETURNING id, owner_user_id, title, content, visibility, status, created_at, updated_at`,
          [title, JSON.stringify(savedContent), visibility, status, id, user.id, isAdmin]
        );
        return updated.rowCount ? json({ study: updated.rows[0] }, 200, origin) : json({ error: "Material indisponível ou sem permissão." }, 404, origin);
      }
    }
    if (url.pathname === "/auth/login" && request.method === "POST") {
      const body = await readBody(request);
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      if (!validUsername(username) || password.length < 1 || password.length > 200) {
        return json({ error: "Usuário ou senha inválidos." }, 400, origin);
      }
      const normalized = username.toLowerCase();
      const attempts = await client.query(
        `SELECT COUNT(*)::int AS n FROM public.ceb_login_attempts
          WHERE username_normalized = $1 AND attempted_at > NOW() - ($2 * INTERVAL '1 minute') AND succeeded = FALSE`,
        [normalized, LOGIN_WINDOW_MINUTES]
      );
      if (attempts.rows[0].n >= MAX_LOGIN_ATTEMPTS) {
        return json({ error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." }, 429, origin);
      }

      const found = await client.query(
        `SELECT id, username, password_hash, display_name, app_role, is_active, must_change_password, password_admin_managed
           FROM public.ceb_users WHERE LOWER(username) = $1 LIMIT 1`,
        [normalized]
      );
      const user = found.rows[0];
      const verified = Boolean(user && user.is_active && user.password_hash && await verifyPassword(password, user.password_hash));
      if (!verified) {
        // Diagnostico sem dados pessoais, senhas ou hashes.
        const reason = !user ? "user_not_found" : !user.is_active ? "user_inactive" : !user.password_hash ? "hash_missing" : "password_mismatch";
        console.warn("CEB_AUTH_LOGIN_REJECTED", { reason });
      }
      await client.query(
        "INSERT INTO public.ceb_login_attempts (username_normalized, succeeded) VALUES ($1, $2)",
        [normalized, verified]
      );
      if (!verified) return json({ error: "Usuário ou senha inválidos." }, 401, origin);

      const token = await newSessionToken();
      const expiry = sessionExpiry();
      await client.query(
        "INSERT INTO public.ceb_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        [user.id, await hashSessionToken(token), expiry]
      );
      const maxAge = Math.floor((expiry.getTime() - Date.now()) / 1000);
      return json({ user: publicUser(user), expires_at: expiry.toISOString(), access_token: token, token_type: "Bearer" }, 200, origin, {
        "Set-Cookie": cookie(token, maxAge),
      });
    }

    if (url.pathname === "/auth/me" && request.method === "GET") {
      const user = await currentUser(client, request);
      if (!user) return json({ error: "Sessão inválida ou expirada." }, 401, origin, { "Set-Cookie": clearCookie() });
      return json({ user: publicUser(user) }, 200, origin);
    }

    if (url.pathname === "/auth/logout" && request.method === "POST") {
      const token = getToken(request);
      if (token) {
        await client.query(
          "UPDATE public.ceb_sessions SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL",
          [await hashSessionToken(token)]
        );
      }
      return json({ ok: true }, 200, origin, { "Set-Cookie": clearCookie() });
    }

    if (url.pathname === "/auth/change-password" && request.method === "POST") {
      const user = await currentUser(client, request);
      if (!user) return json({ error: "Sessão inválida ou expirada." }, 401, origin);
      if (user.password_admin_managed) return json({error:'A senha desta matrícula é administrada exclusivamente pelo administrador.'},403,origin);
      const body = await readBody(request);
      if (typeof body.current_password !== "string" || body.current_password.length < 1 || body.current_password.length > 200) {
        return json({ error: "Informe sua senha atual." }, 400, origin);
      }
      if (!(await verifyPassword(body.current_password, user.password_hash))) {
        return json({ error: "A senha atual está incorreta." }, 403, origin);
      }
      if (!validPassword(body.new_password)) {
        return json({ error: "A nova senha deve ter exatamente 6 letras minúsculas ou números." }, 400, origin);
      }
      if (body.current_password === body.new_password) {
        return json({ error: "A nova senha deve ser diferente da senha atual." }, 400, origin);
      }
      const token = getToken(request);
      const newHash = await hashPassword(body.new_password);
      await client.query("BEGIN");
      try {
        await client.query(
          "UPDATE public.ceb_users SET password_hash = $1, must_change_password = FALSE, updated_at = NOW() WHERE id = $2",
          [newHash, user.id]
        );
        await client.query(
          "UPDATE public.ceb_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL AND token_hash <> $2",
          [user.id, await hashSessionToken(token)]
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      return json({ ok: true, user: { ...publicUser(user), must_change_password: false } }, 200, origin);
    }

    // Bootstrap único: exige secret configurado no Worker e só funciona enquanto não houver administrador com username.
    if (url.pathname === "/admin/bootstrap" && request.method === "POST") {
      const configuredSecret = env.CEB_BOOTSTRAP_SECRET;
      const suppliedSecret = request.headers.get("X-CEB-Bootstrap-Secret") || "";
      if (!configuredSecret || suppliedSecret.length !== configuredSecret.length ||
          !crypto.subtle || suppliedSecret !== configuredSecret) {
        return json({ error: "Bootstrap não autorizado ou desativado." }, 403, origin);
      }
      const existingAdmin = await client.query(
        "SELECT 1 FROM public.ceb_users WHERE app_role = 'admin' AND username IS NOT NULL LIMIT 1"
      );
      if (existingAdmin.rowCount > 0) {
        return json({ error: "O administrador inicial já foi criado. Desative CEB_BOOTSTRAP_SECRET." }, 409, origin);
      }
      const body = await readBody(request);
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
      const password = body.password;
      if (!validUsername(username) || !displayName || displayName.length > 120 || !validPassword(password)) {
        return json({ error: "Informe usuário válido, nome e senha com exatamente 6 letras minúsculas ou números." }, 400, origin);
      }
      const passwordHash = await hashPassword(password);
      const created = await client.query(
        `INSERT INTO public.ceb_users (username, display_name, password_hash, app_role, is_active, must_change_password)
         VALUES ($1, $2, $3, 'admin', TRUE, FALSE)
         RETURNING id, username, display_name, app_role, is_active, must_change_password, created_at`,
        [username, displayName, passwordHash]
      );
      return json({ user: created.rows[0], message: "Administrador inicial criado. Remova imediatamente o secret CEB_BOOTSTRAP_SECRET das variáveis do Worker." }, 201, origin);
    }

    if (url.pathname === "/admin/users" && request.method === "POST") {
      const admin = await currentUser(client, request);
      if (!admin) return json({ error: "Sessão inválida ou expirada." }, 401, origin);
      if (admin.app_role !== "admin") return json({ error: "Acesso restrito ao administrador." }, 403, origin);
      const body = await readBody(request);
      const username = typeof body.username === "string" ? body.username.trim() : "";
      const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
      const temporaryPassword = body.temporary_password;
      const role = body.role === "admin" ? "admin" : "user";
      if (!validUsername(username) || !displayName || displayName.length > 120 || !validPassword(temporaryPassword)) {
        return json({ error: "Informe usuário válido, nome e senha temporária com exatamente 6 letras minúsculas ou números." }, 400, origin);
      }
      const passwordHash = await hashPassword(temporaryPassword);
      const created = await client.query(
        `INSERT INTO public.ceb_users (username, display_name, password_hash, app_role, is_active, must_change_password)
         VALUES ($1, $2, $3, $4, TRUE, TRUE)
         RETURNING id, username, display_name, app_role, is_active, must_change_password, created_at`,
        [username, displayName, passwordHash, role]
      );
      return json({ user: created.rows[0] }, 201, origin);
    }

    if (url.pathname === "/admin/users" && request.method === "GET") {
      const admin = await currentUser(client, request);
      if (!admin) return json({ error: "Sessão inválida ou expirada." }, 401, origin);
      if (admin.app_role !== "admin") return json({ error: "Acesso restrito ao administrador." }, 403, origin);
      const result = await client.query(
        "SELECT id, username, display_name, app_role, is_active, must_change_password, password_admin_managed, created_at FROM public.ceb_users WHERE username IS NOT NULL ORDER BY display_name"
      );
      return json({ users: result.rows }, 200, origin);
    }

    if (url.pathname.startsWith("/admin/users/") && request.method === "PATCH") {
      const admin = await currentUser(client, request);
      if (!admin) return json({ error: "Sessão inválida ou expirada." }, 401, origin);
      if (admin.app_role !== "admin") return json({ error: "Acesso restrito ao administrador." }, 403, origin);
      const id = url.pathname.slice("/admin/users/".length);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Identificador inválido." }, 400, origin);
      const body = await readBody(request);
      const changes = [];
      const values = [];
      if (Object.hasOwn(body, "display_name")) {
        if (typeof body.display_name !== "string" || !body.display_name.trim() || body.display_name.trim().length > 120) return json({ error: "Nome de exibição inválido." }, 400, origin);
        values.push(body.display_name.trim()); changes.push(`display_name = $${values.length}`);
      }
      if (Object.hasOwn(body, "username")) {
        if (typeof body.username !== "string" || !/^[A-Za-z0-9._-]{3,32}$/.test(body.username.trim())) return json({ error: "Nome de usuário inválido." }, 400, origin);
        values.push(body.username.trim()); changes.push(`username = $${values.length}`);
      }
      if (Object.hasOwn(body, "role")) {
        if (!["admin", "user"].includes(body.role)) return json({ error: "Permissão inválida." }, 400, origin);
        if (id === admin.id && body.role !== "admin") return json({ error: "Não é permitido remover sua própria permissão de administrador." }, 400, origin);
        values.push(body.role); changes.push(`app_role = $${values.length}`);
      }
      if (Object.hasOwn(body, "is_active")) {
        if (typeof body.is_active !== "boolean") return json({ error: "Informe is_active como verdadeiro ou falso." }, 400, origin);
        if (id === admin.id && !body.is_active) return json({ error: "Não é permitido desativar a própria conta." }, 400, origin);
        values.push(body.is_active); changes.push(`is_active = $${values.length}`);
      }
      if (!changes.length) return json({ error: "Nenhuma alteração informada." }, 400, origin);
      values.push(id);
      let result;
      try {
        result = await client.query(
          `UPDATE public.ceb_users SET ${changes.join(", ")}, updated_at = NOW() WHERE id = $${values.length} AND username IS NOT NULL AND password_admin_managed=FALSE RETURNING id, username, display_name, app_role, is_active, must_change_password`,
          values
        );
      } catch (error) {
        if (error?.code === "23505") return json({ error: "Este nome de usuário já está em uso." }, 409, origin);
        throw error;
      }
      if (!result.rowCount) return json({ error: "Usuário não encontrado." }, 404, origin);
      if (body.is_active === false || Object.hasOwn(body, "role")) await client.query("UPDATE public.ceb_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL", [id]);
      return json({ user: result.rows[0] }, 200, origin);
    }

    if (url.pathname.startsWith("/admin/users/") && url.pathname.endsWith("/reset-password") && request.method === "POST") {
      const admin = await currentUser(client, request);
      if (!admin) return json({ error: "Sessão inválida ou expirada." }, 401, origin);
      if (admin.app_role !== "admin" || admin.must_change_password) return json({ error: "Acesso restrito ao administrador." }, 403, origin);
      const id = url.pathname.slice("/admin/users/".length, -"/reset-password".length);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Identificador inválido." }, 400, origin);
      const body = await readBody(request);
      if (typeof body.temporary_password !== "string" || !/^[a-z0-9]{6}$/.test(body.temporary_password)) return json({ error: "A senha temporária deve ter exatamente 6 letras minúsculas ou números." }, 400, origin);
      if (id === admin.id) return json({ error: "Para alterar sua própria senha, use a opção de alteração de senha da conta." }, 400, origin);
      const passwordHash = await hashPassword(body.temporary_password);
      const result = await client.query(
        "UPDATE public.ceb_users SET password_hash = $1, must_change_password = TRUE, updated_at = NOW() WHERE id = $2 AND username IS NOT NULL AND password_admin_managed=FALSE RETURNING id",
        [passwordHash, id]
      );
      if (!result.rowCount) return json({ error: "Usuário não encontrado." }, 404, origin);
      await client.query("UPDATE public.ceb_sessions SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL", [id]);
      return json({ ok: true }, 200, origin);
    }

    if (url.pathname.startsWith("/admin/users/") && request.method === "DELETE") {
      const admin = await currentUser(client, request);
      if (!admin) return json({ error: "Sessão inválida ou expirada." }, 401, origin);
      if (admin.app_role !== "admin") return json({ error: "Acesso restrito ao administrador." }, 403, origin);
      const id = url.pathname.slice("/admin/users/".length);
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Identificador inválido." }, 400, origin);
      if (id === admin.id) return json({ error: "Não é permitido excluir sua própria conta." }, 400, origin);
      const studies = await client.query("SELECT 1 FROM public.ceb_studies WHERE owner_user_id = $1 LIMIT 1", [id]);
      if (studies.rowCount) return json({ error: "Este usuário possui estudos vinculados. Preserve os estudos e desative a conta em vez de excluí-la." }, 409, origin);
      const materials = await client.query("SELECT 1 FROM public.ceb_materials WHERE owner_user_id=$1 UNION ALL SELECT 1 FROM public.ceb_folders WHERE owner_user_id=$1 LIMIT 1", [id]);
      if (materials.rowCount) return json({ error: "Este usuário possui materiais ou pastas na nuvem. Desative a conta para preservar a biblioteca." }, 409, origin);
      const result = await client.query("DELETE FROM public.ceb_users WHERE id = $1 AND username IS NOT NULL AND password_admin_managed=FALSE RETURNING id", [id]);
      if (!result.rowCount) return json({ error: "Usuário não encontrado." }, 404, origin);
      return json({ ok: true }, 200, origin);
    }

    return json({ error: "Rota não encontrada." }, 404, origin);
  } catch (error) {
    if (error.message === "BODY_TOO_LARGE") return json({ error: "Requisição muito grande." }, 413, origin);
    if (error.message === "INVALID_JSON") return json({ error: "JSON inválido." }, 400, origin);
    if (error.code === "23505") return json({ error: "Já existe uma conta com esse nome de usuário." }, 409, origin);
    console.error("Erro na API CEB:", error.message);
    return json({ error: "Erro interno da API. Confira se as migrações necessárias foram aplicadas." }, 500, origin);
  } finally {
    if (client) try { await client.end(); } catch {}
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const url = new URL(request.url);

    if (origin && origin !== ALLOWED_ORIGIN) {
      return json({ error: "Origem não autorizada." }, 403);
    }
    if (request.method === "OPTIONS") {
      if (origin !== ALLOWED_ORIGIN) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CEB-Bootstrap-Secret",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin",
        },
      });
    }
    if (!permitsRequest(request, env)) {
      return json({ error: "Biblioteca temporariamente em modo de leitura. Nenhuma alteração foi salva.", code: "CEB_READ_ONLY" }, 503, origin, { "Retry-After": "300" });
    }
    try {
      return await route(request, env, origin, url);
    } catch (error) {
      console.error("Falha inesperada na API:", error.message);
      return json({ error: "Erro interno da API." }, 500, origin);
    }
  },
};
